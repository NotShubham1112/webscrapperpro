import { BaseModel } from './model';
import { ModelFactory } from './model';
import { 
  ScraperTool,
  FetchHtmlTool,
  ExtractTextTool,
  ExtractLinksTool,
  ExtractTablesTool
} from './tools';
import { Scraper } from '../core/scraper';
import { Extractor } from '../core/extractor';
import { logger } from '../utils/logger';
import { showThinkingAnimation, printInfo } from '../cli/ui';

/**
 * Agentic workflow for web scraping
 * Implements the ReAct pattern: Reasoning + Acting
 */
export class ScrappyAgent {
  private model: BaseModel;
  private maxIterations: number;
  
  constructor(modelType: string = 'ollama', apiKey?: string) {
    this.model = ModelFactory.createModel(modelType, apiKey);
    this.maxIterations = 5; // Default for now
    logger.info(`Agent initialized with model: ${modelType}`);
  }
  
  /**
   * Main scraping method
   */
  async scrape(url: string): Promise<any> {
    // Show boot animation
    await showThinkingAnimation('Initializing agent...', 1000);
    
    // Show info
    printInfo(`Starting scraping workflow for: ${url}`);
    
    // Initialize state
    let htmlContent: string = '';
    let iterations = 0;
    const result = {
      title: '',
      summary: '',
      links: [] as Array<{text: string; url: string}>,
      paragraphs: [] as string[],
      tables: [] as Array<any>
    };
    
    // Agent loop: Reason -> Act -> Observe
    while (iterations < this.maxIterations) {
      iterations++;
      logger.debug(`Iteration ${iterations}`);
      
      // Reason: Determine what tool to use next
      const tool = await this.reason(url, htmlContent, result, iterations);
      
      // Act: Execute the tool
      const toolResult = await this.act(tool);
      
      // Observe: Update state based on tool result
      this.observe(toolResult, result);
      
      // Check if we have enough information
      if (this.isComplete(result)) {
        logger.info(`Scraping completed in ${iterations} iterations`);
        break;
      }
    }
    
    return result;
  }
  
  /**
   * Reasoning step: Determine what tool to use based on current state
   */
  private async reason(
    url: string, 
    htmlContent: string, 
    result: any, 
    iteration: number
  ): Promise<ScraperTool> {
    // Construct prompt for the LLM
    const prompt = this.buildReasoningPrompt(url, htmlContent, result, iteration);
    
    // Get response from model
    const response = await this.model.generate(prompt);
    
    // Parse the response as a tool call
    try {
      const toolCall = JSON.parse(response) as ScraperTool;
      logger.debug(`Selected tool: ${toolCall.tool}`);
      return toolCall;
    } catch (error: any) {
      logger.warn(`Failed to parse tool call: ${(error as Error).message}`);
      // Fallback: if we don't have HTML, fetch it; otherwise extract content
      if (!htmlContent) {
        return { tool: 'fetch_html', params: { url } };
      } else if (!result.title || !result.summary) {
        return { tool: 'extract_text', params: { html: htmlContent } };
      } else {
        // Default to extracting links
        return { tool: 'extract_links', params: { html: htmlContent } };
      }
    }
  }
  
  /**
   * Build the reasoning prompt for the LLM
   */
  private buildReasoningPrompt(
    url: string, 
    htmlContent: string, 
    result: any, 
    iteration: number
  ): string {
    return `
You are an agentic web scraper. Your goal is to extract structured data from a website.
Current iteration: ${iteration}/${this.maxIterations}

Available tools:
1. fetch_html: Fetch HTML content from a URL
   - Parameters: { url: string }
2. extract_text: Extract text content from HTML
   - Parameters: { html: string }
3. extract_links: Extract links from HTML
   - Parameters: { html: string }
4. extract_tables: Extract tables from HTML
   - Parameters: { html: string }

Current state:
- URL: ${url}
- HTML fetched: ${htmlContent ? 'Yes' : 'No'}
- HTML length: ${htmlContent?.length || 0} characters
- Extracted title: "${result.title || ''}"
- Extracted summary: "${result.summary || ''}"
- Links found: ${result.links.length}
- Paragraphs found: ${result.paragraphs.length}
- Tables found: ${result.tables.length}

Target output format:
{
  "title": "",
  "summary": "",
  "links": [],
  "paragraphs": [],
  "tables": []
}

Based on the current state, select the next tool to use.
Respond ONLY with a valid JSON object matching one of the tool interfaces.
Do not include any explanations or additional text.
`;
  }
  
  /**
   * Acting step: Execute the selected tool
   */
  private async act(tool: ScraperTool): Promise<any> {
    logger.debug(`Executing tool: ${tool.tool}`);
    
    // In a real implementation, we would inject scraper and extractor instances
    // For this demo, we'll simulate the tool execution
    
    // Simulate tool execution delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return mock results based on tool type
    switch (tool.tool) {
      case 'fetch_html':
        return {
          success: true,
          data: `<!doctype html>
<html>
<head>
    <title>Example Domain</title>
    <meta charset="utf-8" />
    <meta http-equiv="Content-type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type="text/css">
    body {
        background-color: #f0f0f2;
        margin: 0;
        padding: 0;
        font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
        
    }
    div {
        width: 600px;
        margin: 5em auto;
        padding: 2em;
        background-color: #fdfdff;
        border-radius: 0.5em;
        box-shadow: 2px 3px 7px 2px rgba(0,0,0,0.02);
    }
    a:link, a:visited {
        color: #38488f;
        text-decoration: none;
    }
    @media (max-width: 700px) {
        div {
            margin: 0 auto;
            width: auto;
        }
    }
    </style>
    </head>
    
<body>
<div>
    <h1>Example Domain</h1>
    <p>This domain is for use in illustrative examples in documents. You may use this
    domain in literature without prior coordination or asking for permission.
    </p>
    <p><a href="https://www.iana.org/domains/example">More information...</a></p>
</div>
</body>
</html>`
        };
      
      case 'extract_text':
        // Simulate extracting text from HTML
        return {
          success: true,
          data: {
            title: 'Example Domain',
            summary: 'This domain is for use in illustrative examples in documents.',
            paragraphs: [
              'This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.',
              'More information can be found at https://www.iana.org/domains/example.'
            ]
          }
        };
      
      case 'extract_links':
        // Simulate extracting links from HTML
        return {
          success: true,
          data: [
            { text: 'More information', url: 'https://www.iana.org/domains/example' }
          ]
        };
      
      case 'extract_tables':
        // Simulate extracting tables from HTML (no tables in example)
        return {
          success: true,
          data: []
        };
      
      default:
        return { success: false, error: `Unknown tool` };
    }
  }
  
  /**
   * Observe step: Update internal state based on tool result
   */
  private observe(toolResult: any, result: any): void {
    if (!toolResult.success) {
      logger.warn(`Tool failed: ${toolResult.error}`);
      return;
    }
    
    const data = toolResult.data;
    
    // Update result based on tool type
    if (data.title !== undefined && data.summary !== undefined) {
      // This is from extract_text tool
      result.title = data.title || result.title;
      result.summary = data.summary || result.summary;
      if (data.paragraphs && Array.isArray(data.paragraphs)) {
        result.paragraphs = [...new Set([...result.paragraphs, ...data.paragraphs])];
      }
    } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'text' in data[0]) {
      // This is from extract_links tool
      const newLinks = data.map((item: any) => ({
        text: item.text || '',
        url: item.url || ''
      }));
      
      // Basic deduplication by URL
      const allLinks = [...result.links, ...newLinks];
      result.links = allLinks.filter((link, index, self) => 
        index === self.findIndex(l => l.url === link.url)
      );
    } else if (Array.isArray(data)) {
      // This could be tables or other arrays
      result.tables = [...result.tables, ...data];
    }
  }
  
  /**
   * Check if we have enough information to stop
   */
  private isComplete(result: any): boolean {
    // We consider it complete if we have at least a title and some content
    return !!result.title && 
           (result.summary.length > 0 || 
            result.paragraphs.length > 0 || 
            result.links.length > 0);
  }
}