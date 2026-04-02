/**
 * Scrappy - Stock Market Scraping Tools
 * Company: Cosmic
 *
 * Real stock data scraping from Yahoo Finance and Google Finance.
 * No API key required — pure HTML scraping with Cheerio.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { colors } from '../../utils/colors';
import { getLLM } from '../llm';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockQuote {
  symbol: string;
  price: number | null;
  currency: string;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  marketCap: number | null;
  week52High: number | null;
  week52Low: number | null;
  timestamp: string;
}

export interface StockRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const YAHOO_FINANCE_URL = 'https://finance.yahoo.com/quote';
const GOOGLE_FINANCE_URL = 'https://www.google.com/finance/quote';
const DDG_SEARCH_URL = 'https://html.duckduckgo.com/html/';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePrice(text: string | null): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.,+\-]/g, '').replace(',', '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseVolume(text: string | null): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return null;
  // Handle K/M/B suffixes
  if (text.includes('B')) return val * 1_000_000_000;
  if (text.includes('M')) return val * 1_000_000;
  if (text.includes('K')) return val * 1_000;
  return val;
}

function parseMarketCap(text: string | null): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return null;
  const upper = text.toUpperCase();
  if (upper.includes('T')) return val * 1_000_000_000_000;
  if (upper.includes('B')) return val * 1_000_000_000;
  if (upper.includes('M')) return val * 1_000_000;
  if (upper.includes('K')) return val * 1_000;
  return val;
}

async function fetchWithTimeout(url: string, timeout = 15000): Promise<string> {
  const resp = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout,
  });
  return resp.data as string;
}

// ─── Yahoo Finance Scrapers ─────────────────────────────────────────────────

async function scrapeYahooQuote(symbol: string): Promise<StockQuote | null> {
  const url = `${YAHOO_FINANCE_URL}/${symbol.toUpperCase()}`;
  let html: string;

  try {
    html = await fetchWithTimeout(url);
  } catch {
    return null;
  }

  const $ = cheerio.load(html);

  // Try live-price streaming span first (most current)
  const livePrice =
    parsePrice($('[data-testid="qsp-price"]').text().trim()) ??
    parsePrice($('.livePrice[data-realtime-data]').text().trim()) ??
    parsePrice($('fin-streamer[data-field="regularMarketPrice"]').text().trim()) ??
    parsePrice($('span[data-reactid*="price"]').first().text().trim()) ??
    parsePrice($('[class*="price"]').first().text().trim());

  const price = livePrice ?? parsePrice($('body').text().match(/[\$\u20ac\u00a3]?\d{1,6}(?:,\d{3})*(?:\.\d{2})?/)?.[0] ?? null);

  // Open: try table row first, fallback to generic scan
  let openEl = $('tr:contains("Open") td').last();
  if (!openEl.length) openEl = $('tr:contains("Open") td:last-child');
  const open = parsePrice(openEl.text().trim());

  // Day high / low — scan all table rows
  let high: number | null = null;
  let low: number | null = null;
  $('tr').each((_, el) => {
    const label = $(el).find('td').first().text().trim();
    if (label === 'Day Range' || label === 'Day range') {
      const cells = $(el).find('td');
      const rangeText = cells.last().text().trim();
      const parts = rangeText.split(' - ');
      if (parts.length === 2) {
        high = parsePrice(parts[1]);
        low = parsePrice(parts[0]);
      }
    }
  });

  // Volume
  const volumeText =
    $('[data-testid="qsp-volume"]').text().trim() ||
    $('tr:contains("Volume") td:last-child').first().text().trim() ||
    $('tr:contains("Avg Vol") td:last-child').first().text().trim();
  const volume = parseVolume(volumeText);

  // Market Cap
  const marketCapText =
    $('[data-testid="qsp-market-cap"]').text().trim() ||
    $('tr:contains("Market Cap") td:last-child').first().text().trim();
  const marketCap = parseMarketCap(marketCapText);

  // 52-week high / low
  let week52High: number | null = null;
  let week52Low: number | null = null;
  $('tr').each((_, el) => {
    const label = $(el).find('td').first().text().trim();
    if (label === '52 Week Range' || label === '52-week range') {
      const cells = $(el).find('td');
      const rangeText = cells.last().text().trim();
      const parts = rangeText.split(' - ');
      if (parts.length === 2) {
        week52High = parsePrice(parts[1]);
        week52Low = parsePrice(parts[0]);
      }
    }
  });

  return {
    symbol: symbol.toUpperCase(),
    price: livePrice ?? price,
    currency: 'USD',
    open,
    high,
    low,
    volume,
    marketCap,
    week52High,
    week52Low,
    timestamp: new Date().toISOString(),
  };
}

async function scrapeYahooHistory(symbol: string, range: string): Promise<StockRow[]> {
  const rangeParam: Record<string, string> = {
    '1d': '1d',
    '5d': '5d',
    '1mo': '1mo',
    '6mo': '6mo',
    '1y': '1y',
  };

  const period1 = Math.floor(Date.now() / 1000);
  const period2: Record<string, number> = {
    '1d': period1 - 86400,
    '5d': period1 - 86400 * 5,
    '1mo': period1 - 86400 * 30,
    '6mo': period1 - 86400 * 180,
    '1y': period1 - 86400 * 365,
  };

  const url =
    `https://finance.yahoo.com/quote/${symbol.toUpperCase()}/history` +
    `?period1=${period2[range] ?? period2['1mo']}&period2=${period1}&interval=1d&filter=history&frequency=1d`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const rows: StockRow[] = [];

  // Historical data is in a <table> with <tr> elements
  $('table tbody tr').each((_, el) => {
    const cells = $(el).find('td');
    if (cells.length < 6) return;

    const dateText = $(cells[0]).text().trim();
    const openText = $(cells[1]).text().trim();
    const highText = $(cells[2]).text().trim();
    const lowText = $(cells[3]).text().trim();
    const closeText = $(cells[4]).text().trim();
    const adjCloseText = $(cells[5]).text().trim();
    const volumeText = $(cells[6])?.text().trim() ?? '';

    // Skip dividers
    if (!dateText || dateText.includes('Date')) return;

    const open = parsePrice(openText);
    const high = parsePrice(highText);
    const low = parsePrice(lowText);
    const close = parsePrice(closeText);
    const adjClose = parsePrice(adjCloseText);
    const volume = parseVolume(volumeText);

    if (open === null || high === null || low === null || close === null) return;

    rows.push({
      date: dateText,
      open,
      high,
      low,
      close,
      adjClose: adjClose ?? close,
      volume: volume ?? 0,
    });
  });

  return rows;
}

// ─── Google Finance Fallback ────────────────────────────────────────────────

async function scrapeGoogleQuote(symbol: string): Promise<StockQuote | null> {
  const url = `${GOOGLE_FINANCE_URL}/${symbol.toUpperCase()}:${symbol.toUpperCase()}`;
  let html: string;

  try {
    html = await fetchWithTimeout(url);
  } catch {
    return null;
  }

  const $ = cheerio.load(html);

  const priceText = $('[data-testid="qsp-price"]').text().trim() ||
    $('[class*="price"]').first().text().trim();
  const price = parsePrice(priceText);

  let high: number | null = null;
  let low: number | null = null;
  $('[class*="range"]').each((_, el) => {
    const text = $(el).text();
    const parts = text.split(' - ');
    if (parts.length === 2) {
      high = parsePrice(parts[1]);
      low = parsePrice(parts[0]);
    }
  });

  return {
    symbol: symbol.toUpperCase(),
    price,
    currency: 'USD',
    open: null,
    high,
    low,
    volume: null,
    marketCap: null,
    week52High: null,
    week52Low: null,
    timestamp: new Date().toISOString(),
  };
}

// ─── Tool Implementations ────────────────────────────────────────────────────

/**
 * get_stock_quote — Fetch real-time quote for a stock symbol.
 * Tries Yahoo Finance first, falls back to Google Finance.
 */
export async function get_stock_quote(args: { symbol: string }): Promise<{
  success: boolean;
  data?: StockQuote;
  error?: string;
}> {
  const { symbol } = args;

  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    return { success: false, error: 'Symbol is required and must be a non-empty string.' };
  }

  const ticker = symbol.trim().toUpperCase();

  try {
    console.log(colors.muted(`[stock] Fetching quote for ${ticker} from Yahoo Finance...`));

    let quote = await scrapeYahooQuote(ticker);

    if (!quote || quote.price === null) {
      console.log(colors.muted(`[stock] Yahoo Finance returned no data — trying Google Finance...`));
      quote = await scrapeGoogleQuote(ticker);
    }

    if (!quote) {
      return { success: false, error: `Could not retrieve quote for ${ticker}. Check the symbol and try again.` };
    }

    if (quote.price === null) {
      return { success: false, error: `Retrieved page for ${ticker} but could not parse price data.` };
    }

    console.log(
      colors.success(`[stock] ${ticker}: $${quote.price}`) +
      colors.muted(` | Vol: ${quote.volume?.toLocaleString() ?? 'N/A'}`)
    );

    return { success: true, data: quote };
  } catch (err: any) {
    return { success: false, error: err?.message ?? `Unexpected error fetching quote for ${ticker}.` };
  }
}

/**
 * get_stock_history — Fetch historical OHLCV data for a stock.
 */
export async function get_stock_history(args: {
  symbol: string;
  range?: '1d' | '5d' | '1mo' | '6mo' | '1y';
}): Promise<{
  success: boolean;
  data?: { rows: StockRow[] };
  error?: string;
}> {
  const { symbol, range = '1mo' } = args;

  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    return { success: false, error: 'Symbol is required.' };
  }

  const validRanges = ['1d', '5d', '1mo', '6mo', '1y'];
  if (!validRanges.includes(range)) {
    return { success: false, error: `Invalid range '${range}'. Must be one of: ${validRanges.join(', ')}` };
  }

  const ticker = symbol.trim().toUpperCase();

  try {
    console.log(colors.muted(`[stock] Fetching ${range} history for ${ticker}...`));
    const rows = await scrapeYahooHistory(ticker, range);

    if (rows.length === 0) {
      return { success: false, error: `No historical data returned for ${ticker} over '${range}'.` };
    }

    console.log(colors.success(`[stock] Retrieved ${rows.length} rows for ${ticker}`));
    return { success: true, data: { rows } };
  } catch (err: any) {
    return { success: false, error: err?.message ?? `Unexpected error fetching history for ${ticker}.` };
  }
}

/**
 * stock_question_answer — Answer a question about a stock using scraped data + LLM.
 */
export async function stock_question_answer(args: {
  symbol: string;
  question: string;
}): Promise<{
  success: boolean;
  data?: { answer: string; source: string };
  error?: string;
}> {
  const { symbol, question } = args;

  if (!symbol || !question) {
    return { success: false, error: 'Both symbol and question are required.' };
  }

  const ticker = symbol.trim().toUpperCase();

  try {
    console.log(colors.muted(`[stock] Fetching quote + news for ${ticker} to answer: "${question}"`));

    // Fetch quote and the Yahoo summary page in parallel
    const [quoteResult, summaryResp] = await Promise.all([
      get_stock_quote({ symbol: ticker }),
      axios
        .get(`${YAHOO_FINANCE_URL}/${ticker}`, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 15000,
        })
        .catch(() => null),
    ]);

    const quote = quoteResult.success ? quoteResult.data : null;

    // Extract news snippets from summary page
    let newsSummary = '';
    if (summaryResp) {
      const $ = cheerio.load(summaryResp.data as string);
      $('script, style').remove();
      // Pull news headlines
      const headlines: string[] = [];
      $('[class*="news"] a, [class*="News"] a').each((_, el) => {
        const txt = $(el).text().trim();
        if (txt.length > 10) headlines.push(txt);
      });
      newsSummary = headlines.slice(0, 5).join('\n') || 'No recent news available.';
    }

    const llm = getLLM();

    const answer = await llm.complete(
      `You are a knowledgeable financial analyst. Answer the user's question based strictly on ` +
        `the provided data. If you don't have enough information, say so — do not hallucinate.\n\n` +
        `Stock Symbol: ${ticker}\n\n` +
        `Current Quote Data:\n` +
        JSON.stringify(quote, null, 2) +
        `\n\nRecent News Headlines:\n${newsSummary}\n\n` +
        `User Question: ${question}\n\n` +
        `Provide a clear, concise answer.`
    );

    console.log(colors.success(`[stock] LLM answered question for ${ticker}`));
    return {
      success: true,
      data: {
        answer,
        source: `Yahoo Finance (${ticker})`,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? `Unexpected error answering question for ${ticker}.` };
  }
}

/**
 * search_stock — Search for stocks matching a query using DuckDuckGo.
 */
export async function search_stock(args: {
  query: string;
}): Promise<{
  success: boolean;
  data?: { results: SearchResult[] };
  error?: string;
}> {
  const { query } = args;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return { success: false, error: 'A search query is required.' };
  }

  const stockQuery = `${query} stock site:google.com/finance OR site:finance.yahoo.com`;

  try {
    console.log(colors.muted(`[stock] Searching for: "${query}"`));

    const resp = await axios.get(DDG_SEARCH_URL, {
      params: { q: stockQuery, kl: 'us-en' },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000,
    });

    const $ = cheerio.load(resp.data);
    const results: SearchResult[] = [];

    $('.result').each((_, el) => {
      const titleEl = $(el).find('.result__title a');
      const snippetEl = $(el).find('.result__snippet');
      const title = titleEl.text().trim();
      let link = titleEl.attr('href') ?? '';

      // Decode DuckDuckGo redirect URLs
      if (link.startsWith('//duckduckgo.com/l/?')) {
        try {
          const u = new URL('https:' + link);
          link = decodeURIComponent(u.searchParams.get('uddg') ?? link);
        } catch { /* keep as-is */ }
      }

      const snippet = snippetEl.text().trim();

      if (title && link) {
        results.push({ title, link, snippet });
      }
    });

    if (results.length === 0) {
      // Fallback: grab any http links that look like finance results
      $('a[href]').each((_, el) => {
        if (results.length >= 5) return;
        const href = $(el).attr('href') ?? '';
        const text = $(el).text().trim();
        if (href.startsWith('http') && text.length > 15 &&
            (href.includes('finance') || href.includes('stock'))) {
          results.push({ title: text.slice(0, 80), link: href, snippet: '' });
        }
      });
    }

    console.log(colors.success(`[stock] Found ${results.length} results for "${query}"`));
    return { success: true, data: { results } };
  } catch (err: any) {
    return { success: false, error: err?.message ?? `Search failed for "${query}".` };
  }
}

export default {
  get_stock_quote,
  get_stock_history,
  stock_question_answer,
  search_stock,
};
