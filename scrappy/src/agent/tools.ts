/**
 * Tool interface for the agentic web scraper
 * Defines the JSON schema for tool calling
 */

/**
 * Fetch HTML content from a URL
 */
export interface FetchHtmlTool {
  tool: 'fetch_html';
  params: {
    url: string;
  };
}

/**
 * Extract text content from HTML
 */
export interface ExtractTextTool {
  tool: 'extract_text';
  params: {
    html: string;
  };
}

/**
 * Extract links from HTML
 */
export interface ExtractLinksTool {
  tool: 'extract_links';
  params: {
    html: string;
  };
}

/**
 * Extract tables from HTML
 */
export interface ExtractTablesTool {
  tool: 'extract_tables';
  params: {
    html: string;
  };
}

/**
 * Union of all tool types
 */
export type ScraperTool =
  | FetchHtmlTool
  | ExtractTextTool
  | ExtractLinksTool
  | ExtractTablesTool;

/**
 * Tool result interface
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute a tool based on its type
 */
export async function executeTool(
  tool: ScraperTool,
  scraper: any, // Would be Scraper instance in real implementation
  extractor: any // Would be Extractor instance in real implementation
): Promise<ToolResult> {
  try {
    switch (tool.tool) {
      case 'fetch_html':
        const html = await scraper.fetchHtml(tool.params.url);
        return { success: true, data: html };
      
      case 'extract_text':
        const text = extractor.extractText(tool.params.html);
        return { success: true, data: text };
      
      case 'extract_links':
        const links = extractor.extractLinks(tool.params.html);
        return { success: true, data: links };
      
      case 'extract_tables':
        const tables = extractor.extractTables(tool.params.html);
        return { success: true, data: tables };
      
      default:
        return { success: false, error: `Unknown tool` };
    }
  } catch (error: any) {
    return { success: false, error: (error as Error).message };
  }
}