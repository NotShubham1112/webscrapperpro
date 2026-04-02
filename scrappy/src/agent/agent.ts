/**
 * Scrappy - Agent
 * Company: Cosmic
 *
 * The Agent is the brain of Scrappy.
 */

import { getLLM, ChatMessage, ToolCallResult } from './llm';
import { executeTool, AVAILABLE_TOOLS, ToolResult } from './router';

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

  constructor() {
    this.systemPrompt = `You are Scrappy, a powerful and friendly agentic AI assistant built by Cosmic.
You help users scrape websites, search the web, extract data, generate files (README, DOCX, Excel, JSON, TXT), and answer questions.

Your personality:
- Professional yet friendly
- Proactively suggest next steps
- Always confirm when files are saved with their path
- Format responses with clear sections when there is a lot of data
- Use bullet points, headings, and structure where appropriate

When the user mentions a URL → use fetch, extract, or read_url_and_answer_question tools.
When the user asks to search → use search_web.
When the user asks to generate/export/save a file → use the appropriate create_* or save_* tool.
When the user asks for a comprehensive research report → use run_research.
When the user asks for stock info or financial data → use run_stock.
When the user asks to generate a README for a project/folder → use run_readme.
When the user asks to crawl a website deeply → use run_crawl.
When the user asks to run an automation recipe (like seo audit, scam check) → use run_recipe.
When you can answer from memory → use answer_directly.

Available tools: ${AVAILABLE_TOOLS.join(', ')}

Always respond helpfully. If a tool fails, explain clearly and suggest alternatives.`;
  }

  async process(
    userMessage: string,
    history: ChatMessage[]
  ): Promise<AgentResponse> {
    const llm = getLLM();

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
      toolResult = await executeTool(tool, args ?? {});
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
        ...history.slice(-8), // Take a bit more history, but it already includes the current user message
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
              // No yield for the brief transition to content unless buffer has stuff.
            } else {
              const newTokens = chunk.split(/\s+/).filter(Boolean).length;
              thoughtCount += newTokens;
              yield { type: 'thought', thoughtTotal: thoughtCount };
              continue;
            }
          }

          if (buffer) {
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

  /** @deprecated use streaming process */
  private formatResultFallback(tool: string, result: ToolResult): string {
    if (result.filePath) return `✅ File saved: ${result.filePath}`;
    return `✅ Done.\n\`\`\`json\n${JSON.stringify(result.data, null, 2).slice(0, 1000)}\n\`\`\``;
  }
}
