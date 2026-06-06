/**
 * Scrappy - Unified LLM Driver
 * Company: Cosmic
 *
 * Provides a single interface for:
 *  - Ollama (local, http://localhost:11434)
 *  - OpenRouter (cloud)
 *  - Groq (cloud)
 *  - Mistral (cloud)
 *
 * Methods:
 *   llm.complete(prompt)          → string
 *   llm.chat(messages)            → string
 *   llm.callTool(toolspec, ctx)   → ToolCallResult
 */

import { loadConfig, ScrappyConfig } from '../utils/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolCallResult {
  tool: string;
  args: Record<string, any>;
  reasoning?: string;
}

// ─── Provider base ─────────────────────────────────────────────────────────

abstract class LLMProvider {
  abstract complete(prompt: string): Promise<string>;
  abstract chat(messages: ChatMessage[]): Promise<string>;
  abstract streamChat(messages: ChatMessage[]): AsyncGenerator<string>;
}

// ─── Ollama ────────────────────────────────────────────────────────────────

class OllamaProvider extends LLMProvider {
  private base = 'http://localhost:11434';
  constructor(private model: string) { super(); }

  async complete(prompt: string): Promise<string> {
    const res = await fetch(`${this.base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    const data: any = await res.json();
    return data.response?.trim() ?? '';
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages, stream: false, options: { num_ctx: 16384 } }),
    });
    if (!res.ok) throw new Error(`Ollama chat error: ${res.status} ${res.statusText}`);
    const data: any = await res.json();
    return data.message?.content?.trim() ?? '';
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const res = await fetch(`${this.base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages, stream: true, options: { num_ctx: 16384 } }),
    });
    
    if (!res.ok || !res.body) throw new Error(`Ollama stream error: ${res.status}`);
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunks = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
      for (const chunk of chunks) {
        try {
          const json = JSON.parse(chunk);
          if (json.message?.content) {
            yield json.message.content;
          }
        } catch {}
      }
    }
  }
}

// ─── OpenRouter ────────────────────────────────────────────────────────────

class OpenRouterProvider extends LLMProvider {
  private base = 'https://openrouter.ai/api/v1';
  constructor(private model: string, private apiKey: string) { super(); }

  async complete(prompt: string): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }]);
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/cosmic/scrappy',
        'X-Title': 'Scrappy CLI',
      },
      body: JSON.stringify({ model: this.model, messages, stream: false }),
    });
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(`OpenRouter error: ${res.status} – ${err?.error?.message ?? res.statusText}`);
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const res = await fetch(`${this.base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/cosmic/scrappy',
        'X-Title': 'Scrappy CLI',
      },
      body: JSON.stringify({ model: this.model, messages, stream: true }),
    });
    
    if (!res.ok || !res.body) throw new Error(`OpenRouter stream error: ${res.status}`);
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunks = decoder.decode(value, { stream: true }).split('\n');
      for (let chunk of chunks) {
        chunk = chunk.trim();
        if (chunk.startsWith('data: ') && chunk !== 'data: [DONE]') {
          try {
            const json = JSON.parse(chunk.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {}
        }
      }
    }
  }
}

// ─── Groq ──────────────────────────────────────────────────────────────────

// Latest production-ready Groq model IDs (used directly when no map entry exists)
const GROQ_MODEL_MAP: Record<string, string> = {
  'mixtral-8x7b':     'mixtral-8x7b-32768',
  'gemma-7b':         'gemma-7b-it',
  'gemma2-9b':        'gemma2-9b-it',
};

class GroqProvider extends LLMProvider {
  private base = 'https://api.groq.com/openai/v1';
  constructor(private model: string, private apiKey: string) { super(); }

  async complete(prompt: string): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }]);
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const modelId = GROQ_MODEL_MAP[this.model] ?? this.model;
    const res = await fetch(`${this.base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: modelId, messages, stream: false }),
    });
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(`Groq error: ${res.status} – ${err?.error?.message ?? res.statusText}`);
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const modelId = GROQ_MODEL_MAP[this.model] ?? this.model;
    const res = await fetch(`${this.base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: modelId, messages, stream: true }),
    });
    
    if (!res.ok || !res.body) throw new Error(`Groq stream error: ${res.status}`);
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunks = decoder.decode(value, { stream: true }).split('\n');
      for (let chunk of chunks) {
        chunk = chunk.trim();
        if (chunk.startsWith('data: ') && chunk !== 'data: [DONE]') {
          try {
            const json = JSON.parse(chunk.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {}
        }
      }
    }
  }
}

// ─── Mistral ───────────────────────────────────────────────────────────────

class MistralProvider extends LLMProvider {
  private base = 'https://api.mistral.ai/v1';
  constructor(private model: string, private apiKey: string) { super(); }

  async complete(prompt: string): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }]);
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, messages, stream: false }),
    });
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(`Mistral error: ${res.status} – ${err?.error?.message ?? res.statusText}`);
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const res = await fetch(`${this.base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, messages, stream: true }),
    });
    
    if (!res.ok || !res.body) throw new Error(`Mistral stream error: ${res.status}`);
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunks = decoder.decode(value, { stream: true }).split('\n');
      for (let chunk of chunks) {
        chunk = chunk.trim();
        if (chunk.startsWith('data: ') && chunk !== 'data: [DONE]') {
          try {
            const json = JSON.parse(chunk.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {}
        }
      }
    }
  }
}

// ─── Public LLM facade ─────────────────────────────────────────────────────

export class LLM {
  private provider: LLMProvider;

  constructor(config?: ScrappyConfig) {
    const cfg = config ?? loadConfig();
    const key = cfg.apiKey ?? '';

    switch (cfg.provider) {
      case 'ollama':      this.provider = new OllamaProvider(cfg.model); break;
      case 'openrouter':  this.provider = new OpenRouterProvider(cfg.model, key); break;
      case 'groq':        this.provider = new GroqProvider(cfg.model, key); break;
      case 'mistral':     this.provider = new MistralProvider(cfg.model, key); break;
      default:            this.provider = new OllamaProvider(cfg.model);
    }
  }

  /** Single-turn completion */
  async complete(prompt: string): Promise<string> {
    return this.provider.complete(prompt);
  }

  /** Multi-turn chat */
  async chat(messages: ChatMessage[]): Promise<string> {
    return this.provider.chat(messages);
  }

  /** Real-time Streaming Multi-turn chat */
  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    for await (const chunk of this.provider.streamChat(messages)) {
      yield chunk;
    }
  }

  /**
   * Ask the LLM to decide which tool to call given a user query.
   * Returns structured { tool, args } JSON.
   */
  async callTool(userQuery: string, availableTools: string[]): Promise<ToolCallResult> {
    const systemPrompt = `You are Scrappy, an agentic web-scraping AI assistant by Cosmic.
Given the user's message, decide which tool to call. Respond ONLY with valid JSON — no markdown, no explanation.

Available tools:
${availableTools.map(t => `  - ${t}`).join('\n')}

Tool argument shapes:
  fetch_html(url: string)
  extract_text(html: string)
  extract_links(html: string)
  extract_tables(html: string)
  search_web(query: string)
  read_url_and_answer_question(url: string, question: string)
  create_readme(content: string, filename?: string)
  create_docx(folderName: string, fileName: string, content: string)
  create_excel(folderName: string, fileName: string, rows: object[])
  create_output_folder(folderName: string)
  get_stock_quote(symbol: string)
  get_stock_history(symbol: string, range?: "1d" | "5d" | "1mo" | "6mo" | "1y")
  stock_question_answer(symbol: string, question: string)
  search_stock(query: string)
  answer_directly(answer: string)
  save_json(data: object, filename?: string)
  save_text(content: string, filename?: string)
  run_research(query: string, folderName?: string)
  run_stock(ticker: string, options?: { excel?: boolean, docx?: boolean, report?: boolean })
  run_readme(targetPath?: string)
  run_crawl(url: string, depth?: number, exportType?: string)
  run_recipe(name: string, recipeArgs?: string[])

Respond with:
{
  "tool": "<tool_name>",
  "args": { ... },
  "reasoning": "<one sentence>"
}`;

    const raw = await this.provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ]);

    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    try {
      return JSON.parse(cleaned) as ToolCallResult;
    } catch {
      // Fallback: answer directly
      return { tool: 'answer_directly', args: { answer: raw }, reasoning: 'Could not parse tool call' };
    }
  }
}

/** Singleton factory — reuses the same instance per session */
let _llm: LLM | null = null;
export function getLLM(config?: ScrappyConfig): LLM {
  if (!_llm || config) _llm = new LLM(config);
  return _llm;
}
export function resetLLM(): void { _llm = null; }
