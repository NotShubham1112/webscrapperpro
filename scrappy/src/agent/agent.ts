/**
 * Scrappy - Agent
 * Company: Cosmic
 *
 * The Agent is the brain of Scrappy.
 */

import { getLLM, LLM, ChatMessage, ToolCallResult } from './llm';
import { executeTool, AVAILABLE_TOOLS, ToolResult } from './router';
import type { ScrappyConfig } from '../utils/config';

export interface AgentStreamChunk {
  type: 'thought' | 'content' | 'done';
  text?: string;
  thoughtTotal?: number;
}

export interface AgentResponse {
  text?: string;
  stream?: AsyncGenerator<AgentStreamChunk>;
  toolUsed?: string;
  toolArgs?: Record<string, any>;
  toolResult?: ToolResult;
  fileSaved?: string;
  data?: any;
}

export class ScrappyAgent {
  private systemPrompt: string;
  public beforeToolExecute?: (tool: string, args: any) => Promise<{ proceed: boolean; args?: any }>;

  constructor() {
    this.systemPrompt = `You are Scrappy, a powerful and friendly agentic AI assistant built by Cosmic.
You help users scrape websites, search the web, extract data, generate files (README, DOCX, Excel, JSON, TXT), and answer questions.

Your personality:
- Professional yet friendly
- Proactively suggest next steps
- Always confirm when files are saved with their path
- Format responses with clear sections when there is a lot of data
- Use bullet points, headings, and structure where appropriate

CRITICAL GUIDELINES:
1. USE CONTEXT FIRST: Before using 'search_web', check if the information exists in the conversation history or can be extracted from a URL already provided by the user. Only search if the information is missing.
2. BE CONCISE: Don't over-explain if a simple answer suffices.
3. TOOL USAGE: 
   - When the user mentions a URL → use fetch, extract, or read_url_and_answer_question tools.
   - For JavaScript-heavy websites (React, Vue, Angular) or when normal scraping fails → use fetch_html_advanced.
   - When the user asks to search → use search_web.
   - When the user asks to generate/export/save a file → use the appropriate create_* or save_* tool.
   - When the user asks for a comprehensive research report → use run_research.
   - When the user asks for financial data or a detailed stock report → use run_stock.
   - When the user asks for TradingView data → use get_tradingview_data.
   - When you can answer from memory or from previous turns → use answer_directly.

Available tools: ${AVAILABLE_TOOLS.join(', ')}

CHART RENDERING: When presenting structured numeric data (e.g., sales figures, stock prices, statistics), output it as a chart code block using this JSON format:

\`\`\`chart-bar
{"title": "Chart Title", "xKey": "label", "yKey": "value", "data": [{"label": "A", "value": 100}]}
\`\`\`

For multiple series, use yKey as an array:
\`\`\`chart-bar
{"title": "Revenue vs Costs", "xKey": "month", "yKey": ["revenue", "costs"], "data": [{"month": "Jan", "revenue": 100, "costs": 60}]}
\`\`\`

Always respond helpfully. If a tool fails, explain clearly and suggest an alternative.`;
  }

  async process(
    userMessage: string,
    history: ChatMessage[],
    config?: ScrappyConfig
  ): Promise<AgentResponse> {
    let llm: LLM;
    try {
      llm = getLLM(config);
    } catch {
      return { text: "No LLM configured. Open settings to configure your provider and model." };
    }

    let toolCall: ToolCallResult;
    try {
      toolCall = await llm.callTool(userMessage, AVAILABLE_TOOLS);
    } catch (err: any) {
      const reply = await this.fallbackChat(userMessage, history, llm);
      return { text: reply };
    }

    const { tool, args, reasoning } = toolCall;

    let toolResult: ToolResult | undefined;
    if (tool !== 'answer_directly') {
      let finalArgs = args ?? {};
      if (this.beforeToolExecute) {
        const intercept = await this.beforeToolExecute(tool, finalArgs);
        if (!intercept.proceed) {
          return {
            text: `Action cancelled by user: ${tool}`,
            toolUsed: tool,
            data: { status: 'cancelled' }
          };
        }
        if (intercept.args) finalArgs = intercept.args;
      }
      
      toolResult = await executeTool(tool, finalArgs);
    }

    const self = this;
    const stream = async function* (): AsyncGenerator<AgentStreamChunk> {
      if (tool === 'answer_directly') {
        yield { type: 'content', text: args?.answer ?? "I'm not sure." };
        yield { type: 'done' };
        return;
      }

      if (!toolResult) {
        yield { type: 'content', text: 'Error: No tool result.' };
        yield { type: 'done' };
        return;
      }

      if (!toolResult.success) {
        yield { type: 'content', text: `The tool "${tool}" failed: ${toolResult.error}` };
        yield { type: 'done' };
        return;
      }

      const resultSummary = JSON.stringify(toolResult.data, null, 2).slice(0, 5000);
      const messages: ChatMessage[] = [
        { role: 'system', content: self.systemPrompt },
        ...history.slice(-8), 
        { role: 'assistant', content: `[Tool: ${tool} | Reasoning: ${reasoning ?? 'N/A'}]` },
        { 
          role: 'user', 
          content: `Tool result:\n${resultSummary}\n\n` +
                   (toolResult.filePath ? `File saved to: ${toolResult.filePath}\n\n` : '') +
                   `Write a clear, friendly response to the user. Use Markdown (tables, bold, etc).` 
        },
      ];

      let isThinking = false;
      let thoughtCount = 0;
      let buffer = '';

      try {
        for await (const chunk of llm.streamChat(messages)) {
          buffer += chunk;
          
          if (buffer.includes('<think>') && !isThinking) {
            isThinking = true;
            yield { type: 'thought', text: '', thoughtTotal: 0 };
          }
          
          if (isThinking) {
            if (buffer.includes('</think>')) {
              isThinking = false;
              const parts = buffer.split('</think>');
              const src = parts[0].replace('<think>', '');
              thoughtCount += src.split(/\s+/).filter(Boolean).length;
              buffer = parts[1] || '';
              // Don't yield yet, Wait for next iteration to yield content
            } else {
              // Extract new tokens from chunk specifically for better granularity
              const thoughtPart = buffer.includes('<think>') ? buffer.split('<think>')[1] : chunk;
              const newTokens = thoughtPart.split(/\s+/).filter(Boolean).length;
              thoughtCount += newTokens > 0 ? newTokens : 1; // Ensure progress even for single chars
              yield { type: 'thought', thoughtTotal: thoughtCount };
              continue;
            }
          }

          if (buffer && !isThinking) {
            yield { type: 'content', text: buffer };
            buffer = '';
          }
        }
      } catch (err: any) {
        yield { type: 'content', text: `\n[Stream Error: ${err.message}]` };
      }
      
      yield { type: 'done' };
    };

    return {
      toolUsed: tool,
      toolArgs: args,
      toolResult,
      fileSaved: toolResult?.filePath,
      data: toolResult?.data,
      stream: stream(),
    };
  }

  private async fallbackChat(
    userMessage: string,
    history: ChatMessage[],
    llm: ReturnType<typeof getLLM>
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: userMessage },
    ];
    try {
      return await llm.chat(messages);
    } catch {
      return 'I encountered an error. Please check your configuration with `scrappy setup`.';
    }
  }
}
