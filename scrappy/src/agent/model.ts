/**
 * Abstract base class for LLM models
 */
export abstract class BaseModel {
  abstract generate(prompt: string): Promise<string>;
}

/**
 * Ollama model implementation (local)
 */
export class OllamaModel extends BaseModel {
  private model: string;
  
  constructor(model: string = 'llama2') {
    super();
    this.model = model;
  }
  
  async generate(prompt: string): Promise<string> {
    try {
      // In a real implementation, this would call Ollama API
      // For now, we'll return mock output to demonstrate functionality
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      // Mock response based on prompt content
      if (prompt.includes('select tools') || prompt.includes('tool interface')) {
        return JSON.stringify({
          "tool": "fetch_html",
          "params": { "url": "https://example.com" }
        });
      } else if (prompt.includes('extract') || prompt.includes('content')) {
        return JSON.stringify({
          "title": "Example Domain",
          "summary": "This domain is for use in illustrative examples in documents.",
          "links": [
            { "text": "More information", "url": "https://www.iana.org/domains/example" }
          ],
          "paragraphs": [
            "This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.",
            "More information can be found at https://www.iana.org/domains/example."
          ],
          "tables": []
        });
      }
      
      return JSON.stringify({
        "title": "Mock Title",
        "summary": "Mock summary from Ollama",
        "links": [],
        "paragraphs": ["This is mock content for demonstration purposes."],
        "tables": []
      });
    } catch (error: any) {
      throw new Error(`Ollama generation failed: ${(error as Error).message}`);
    }
  }
}

/**
 * OpenRouter model implementation
 */
export class OpenRouterModel extends BaseModel {
  private apiKey: string;
  private model: string;
  
  constructor(apiKey: string, model: string = 'openai/gpt-3.5-turbo') {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }
  
  async generate(prompt: string): Promise<string> {
    try {
      // In a real implementation, this would call OpenRouter API
      // For now, we'll return mock output
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
      
      // Mock response
      if (prompt.includes('select tools') || prompt.includes('tool interface')) {
        return JSON.stringify({
          "tool": "fetch_html",
          "params": { "url": "https://example.com" }
        });
      } else if (prompt.includes('extract') || prompt.includes('content')) {
        return JSON.stringify({
          "title": "Example Domain - OpenRouter",
          "summary": "This domain is for use in illustrative examples in documents.",
          "links": [
            { "text": "More information", "url": "https://www.iana.org/domains/example" },
            { "text": "IANA homepage", "url": "https://www.iana.org/" }
          ],
          "paragraphs": [
            "This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.",
            "More information can be found at https://www.iana.org/domains/example."
          ],
          "tables": []
        });
      }
      
      return JSON.stringify({
        "title": "OpenRouter Response",
        "summary": "Response from OpenRouter model",
        "links": [],
        "paragraphs": ["This is mock content from OpenRouter for demonstration."],
        "tables": []
      });
    } catch (error: any) {
      throw new Error(`OpenRouter model error: ${(error as Error).message}`);
    }
  }
}

/**
 * Groq model implementation
 */
export class GroqModel extends BaseModel {
  private apiKey: string;
  private model: string;
  
  constructor(apiKey: string, model: string = 'mixtral-8x7b-32768') {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }
  
  async generate(prompt: string): Promise<string> {
    try {
      // In a real implementation, this would call Groq API
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay
      
      // Mock response
      if (prompt.includes('select tools') || prompt.includes('tool interface')) {
        return JSON.stringify({
          "tool": "fetch_html",
          "params": { "url": "https://example.com" }
        });
      } else if (prompt.includes('extract') || prompt.includes('content')) {
        return JSON.stringify({
          "title": "Example Domain - Groq",
          "summary": "Illustrative example domain",
          "links": [
            { "text": "IANA Example", "url": "https://www.iana.org/domains/example" }
          ],
          "paragraphs": [
            "This domain is reserved for documentation purposes.",
            "It can be used in examples without coordination."
          ],
          "tables": []
        });
      }
      
      return JSON.stringify({
        "title": "Groq Response",
        "summary": "Response from Groq model",
        "links": [],
        "paragraphs": ["Mock content from Groq."],
        "tables": []
      });
    } catch (error: any) {
      throw new Error(`Groq model error: ${(error as Error).message}`);
    }
  }
}

/**
 * Mistral model implementation
 */
export class MistralModel extends BaseModel {
  private apiKey: string;
  private model: string;
  
  constructor(apiKey: string, model: string = 'mistral-tiny') {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }
  
  async generate(prompt: string): Promise<string> {
    try {
      // In a real implementation, this would call Mistral API
      await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay
      
      // Mock response
      if (prompt.includes('select tools') || prompt.includes('tool interface')) {
        return JSON.stringify({
          "tool": "fetch_html",
          "params": { "url": "https://example.com" }
        });
      } else if (prompt.includes('extract') || prompt.includes('content')) {
        return JSON.stringify({
          "title": "Example Domain - Mistral",
          "summary": "Domain for illustrative examples",
          "links": [
            { "text": "Example Site", "url": "https://www.example.com" }
          ],
          "paragraphs": [
            "This is a sample paragraph for demonstration.",
            "Another paragraph showing the extraction capabilities."
          ],
          "tables": []
        });
      }
      
      return JSON.stringify({
        "title": "Mistral Response",
        "summary": "Response from Mistral model",
        "links": [],
        "paragraphs": ["Mock content from Mistral."],
        "tables": []
      });
    } catch (error: any) {
      throw new Error(`Mistral model error: ${(error as Error).message}`);
    }
  }
}

/**
 * Factory to create model instances
 */
export class ModelFactory {
  static createModel(type: string, apiKey?: string): BaseModel {
    switch (type.toLowerCase()) {
      case 'ollama':
        return new OllamaModel();
      case 'openrouter':
        if (!apiKey) throw new Error('API key required for OpenRouter');
        return new OpenRouterModel(apiKey);
      case 'groq':
        if (!apiKey) throw new Error('API key required for Groq');
        return new GroqModel(apiKey);
      case 'mistral':
        if (!apiKey) throw new Error('API key required for Mistral');
        return new MistralModel(apiKey);
      default:
        // Default to Ollama
        return new OllamaModel();
    }
  }
}