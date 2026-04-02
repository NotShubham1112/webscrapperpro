/**
 * Scrappy - Tool Router
 * Company: Cosmic
 *
 * Executes tools by name and returns structured results.
 * Called by the Agent after the LLM decides which tool to invoke.
 */

import { Scraper } from '../core/scraper';
import { Extractor } from '../core/extractor';
import { searchWeb, fetchAndExtract } from '../core/search';
import { createReadmeFromText } from '../core/filegen/readme';
import { createDocx as createDocxCore } from '../core/filegen/docx';
import { createExcel as createExcelCore } from '../core/filegen/excel';
import { getLLM } from './llm';
import { colors } from '../utils/colors';

// ── New tool imports ──────────────────────────────────────────────────────────
import {
  get_stock_quote,
  get_stock_history,
  stock_question_answer,
  search_stock,
} from './tools/stock';

import {
  create_output_folder,
  create_excel,
  create_markdown,
  create_docx,
} from './tools/filegen';

import { runResearch } from '../cli/research';
import { runStock } from '../cli/stock';
import { runReadme } from '../cli/readme';
import { runCrawl } from '../cli/crawl';
import { runRecipe } from '../cli/recipe';

export interface ToolResult {
  success: boolean;
  data?: any;
  filePath?: string;
  error?: string;
}

const scraper   = new Scraper();
const extractor = new Extractor();

const AVAILABLE_TOOLS = [
  'fetch_html',
  'extract_text',
  'extract_links',
  'extract_tables',
  'search_web',
  'read_url_and_answer_question',
  'answer_directly',
  'save_json',
  'save_text',
  // ── Stock tools ────────────────────────────────────────────────────────────
  'get_stock_quote',
  'get_stock_history',
  'stock_question_answer',
  'search_stock',
  // ── File generation tools ──────────────────────────────────────────────────
  'create_output_folder',
  'create_excel',
  'create_markdown',
  'create_docx',
  // ── Viral CLI Tools ─────────────────────────────────────────────────────────
  'run_research',
  'run_stock',
  'run_readme',
  'run_crawl',
  'run_recipe',
];

export { AVAILABLE_TOOLS };

/**
 * Execute a named tool with the given args.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolResult> {
  try {
    switch (toolName) {

      // ── Web scraping ─────────────────────────────────────────────────────

      case 'fetch_html': {
        const { url } = args;
        if (!url) return { success: false, error: 'Missing url argument' };
        const html = await scraper.fetchHtml(url);
        return { success: true, data: { html, length: html.length } };
      }

      case 'extract_text': {
        const { html, url } = args;
        if (!html && !url) return { success: false, error: 'Missing html or url argument' };
        let content = html;
        if (!content && url) content = await scraper.fetchHtml(url);
        const extracted = extractor.extractText(content);
        return { success: true, data: extracted };
      }

      case 'extract_links': {
        const { html, url } = args;
        if (!html && !url) return { success: false, error: 'Missing html or url argument' };
        let content = html;
        if (!content && url) content = await scraper.fetchHtml(url);
        const links = extractor.extractLinks(content);
        return { success: true, data: links };
      }

      case 'extract_tables': {
        const { html, url } = args;
        if (!html && !url) return { success: false, error: 'Missing html or url argument' };
        let content = html;
        if (!content && url) content = await scraper.fetchHtml(url);
        const tables = extractor.extractTables(content);
        return { success: true, data: tables };
      }

      // ── Search ───────────────────────────────────────────────────────────

      case 'search_web': {
        const { query } = args;
        if (!query) return { success: false, error: 'Missing query argument' };
        const results = await searchWeb(query, 10);
        return { success: true, data: results };
      }

      case 'read_url_and_answer_question': {
        const { url, question } = args;
        if (!url || !question) return { success: false, error: 'Missing url or question' };

        const { text, title } = await fetchAndExtract(url);
        const llm = getLLM();
        const answer = await llm.complete(
          `You are a helpful research assistant. Based only on the following text from "${title}", ` +
          `answer this question: "${question}"\n\nPage content:\n${text}`
        );
        return { success: true, data: { answer, source: url, title } };
      }

      // ── File saving (Simple) ─────────────────────────────────────────────

      case 'save_json': {
        const { data, filename } = args;
        if (!data) return { success: false, error: 'Missing data argument' };
        const { getOutputPath, ensureScrappyDirs } = await import('../utils/paths');
        ensureScrappyDirs();
        const fName = filename ?? `scrappy_${Date.now()}.json`;
        const filePath = getOutputPath(fName.endsWith('.json') ? fName : fName + '.json');
        const fs = await import('fs');
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true, filePath, data: { savedTo: filePath } };
      }

      case 'save_text': {
        const { content, filename } = args;
        if (!content) return { success: false, error: 'Missing content argument' };
        const { getOutputPath, ensureScrappyDirs } = await import('../utils/paths');
        ensureScrappyDirs();
        const fName = filename ?? `scrappy_${Date.now()}.txt`;
        const filePath = getOutputPath(fName.endsWith('.txt') ? fName : fName + '.txt');
        const fs = await import('fs');
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true, filePath, data: { savedTo: filePath } };
      }

      // ── Passthrough ──────────────────────────────────────────────────────

      case 'answer_directly': {
        return { success: true, data: { answer: args.answer ?? '' } };
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STOCK MARKET TOOLS
      // ═══════════════════════════════════════════════════════════════════════

      case 'get_stock_quote': {
        const { symbol } = args;
        if (!symbol) return { success: false, error: 'Missing symbol argument' };
        console.log(colors.info(`[router] get_stock_quote → ${symbol}`));
        return await get_stock_quote({ symbol });
      }

      case 'get_stock_history': {
        const { symbol, range } = args;
        if (!symbol) return { success: false, error: 'Missing symbol argument' };
        console.log(colors.info(`[router] get_stock_history → ${symbol} (${range ?? '1mo'})`));
        return await get_stock_history({ symbol, range });
      }

      case 'stock_question_answer': {
        const { symbol, question } = args;
        if (!symbol || !question) return { success: false, error: 'Missing symbol or question' };
        console.log(colors.info(`[router] stock_question_answer → ${symbol}`));
        return await stock_question_answer({ symbol, question });
      }

      case 'search_stock': {
        const { query } = args;
        if (!query) return { success: false, error: 'Missing query argument' };
        console.log(colors.info(`[router] search_stock → "${query}"`));
        return await search_stock({ query });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // FILE GENERATION TOOLS (Folder-based)
      // ═══════════════════════════════════════════════════════════════════════

      case 'create_output_folder': {
        const { folderName } = args;
        if (!folderName) return { success: false, error: 'Missing folderName argument' };
        console.log(colors.info(`[router] create_output_folder → "${folderName}"`));
        return await create_output_folder({ folderName });
      }

      case 'create_excel': {
        const { folderName, fileName, rows } = args;
        // Fallback for older args mapping
        const folder = folderName || 'Global';
        const file = fileName || args.filename || `scrappy_${Date.now()}`;
        const dataRows = rows || args.data || [];
        
        if (!dataRows || !Array.isArray(dataRows)) return { success: false, error: 'Missing or invalid rows[] argument' };
        console.log(colors.info(`[router] create_excel → ${folder}/${file}`));
        return await create_excel({ folderName: folder, fileName: file, rows: dataRows });
      }

      case 'create_markdown': {
        const { folderName, fileName, content } = args;
        const folder = folderName || 'Global';
        const file = fileName || args.filename || `scrappy_${Date.now()}`;
        const text = content || args.text || '';
        
        if (typeof text !== 'string') return { success: false, error: 'Missing or invalid content string' };
        console.log(colors.info(`[router] create_markdown → ${folder}/${file}`));
        return await create_markdown({ folderName: folder, fileName: file, content: text });
      }

      case 'create_docx': {
        const { folderName, fileName, content } = args;
        const folder = folderName || 'Global';
        const file = fileName || args.filename || `scrappy_${Date.now()}`;
        const text = content || args.text || '';

        if (typeof text !== 'string') return { success: false, error: 'Missing or invalid content string' };
        console.log(colors.info(`[router] create_docx → ${folder}/${file}`));
        return await create_docx({ folderName: folder, fileName: file, content: text });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // VIRAL CLI TOOLS (Full workflows)
      // ═══════════════════════════════════════════════════════════════════════

      case 'run_research': {
        const { query, folderName } = args;
        if (!query) return { success: false, error: 'Missing query argument' };
        await runResearch(query, folderName);
        return { success: true, data: { status: 'completed successfully' } };
      }

      case 'run_stock': {
        const { ticker, options } = args;
        if (!ticker) return { success: false, error: 'Missing ticker argument' };
        await runStock(ticker, options || { report: true });
        return { success: true, data: { status: 'completed successfully' } };
      }

      case 'run_readme': {
        const { targetPath } = args;
        await runReadme(targetPath || '.');
        return { success: true, data: { status: 'completed successfully' } };
      }

      case 'run_crawl': {
        const { url, depth, exportType } = args;
        if (!url) return { success: false, error: 'Missing url argument' };
        await runCrawl(url, depth || 1, exportType || 'json');
        return { success: true, data: { status: 'completed successfully' } };
      }

      case 'run_recipe': {
        const { name, recipeArgs } = args;
        if (!name) return { success: false, error: 'Missing name argument' };
        await runRecipe(name, recipeArgs || []);
        return { success: true, data: { status: 'completed successfully' } };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}
