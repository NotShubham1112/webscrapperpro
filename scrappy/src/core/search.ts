/**
 * Scrappy - Web Search
 * Company: Cosmic
 *
 * Implements search_web(query) using DuckDuckGo HTML scraping.
 * No API key required.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  timestamp: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Search DuckDuckGo (HTML endpoint, no API key).
 */
export async function searchWeb(query: string, maxResults = 10): Promise<SearchResponse> {
  const results: SearchResult[] = [];

  try {
    // DuckDuckGo LITE search (more robust for scraping)
    const resp = await axios.get('https://duckduckgo.com/lite/', {
      params: { q: query, kl: 'us-en' },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(resp.data);

    // Parse DuckDuckGo LITE result cards
    $('.result-link').each((_, el) => {
      if (results.length >= maxResults) return;

      const titleLink = $(el);
      const title = titleLink.text().trim();
      let url = titleLink.attr('href') ?? '';

      // The snippet is usually in the next TR or a sibling div
      // In Lite, it follows the title link
      const snippet = $(el).closest('tr').next().find('.result-snippet').text().trim();

      // Clean DDG redirect links
      if (url.startsWith('//duckduckgo.com/l/?') || url.startsWith('/l/?')) {
        try {
          const uStr = url.startsWith('//') ? 'https:' + url : 'https://duckduckgo.com' + url;
          const u = new URL(uStr);
          url = decodeURIComponent(u.searchParams.get('uddg') ?? url);
        } catch { /* keep */ }
      }

      if (title && url) {
        results.push({ title, url: url.startsWith('/') ? 'https://duckduckgo.com' + url : url, snippet });
      }
    });

    // Fallback: search for any viable link (classic)
    if (results.length === 0) {
      $('a[href]').each((_, el) => {
        if (results.length >= maxResults) return;
        const href = $(el).attr('href') ?? '';
        const text = $(el).text().trim();
        if (href.startsWith('http') && text.length > 20 && !href.includes('duckduckgo')) {
          results.push({ title: text.slice(0, 100), url: href, snippet: '' });
        }
      });
    }
  } catch (err: any) {
    throw new Error(`Search failed: ${err.message}`);
  }

  return {
    query,
    results: results.slice(0, maxResults),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fetch a URL and answer a specific question about its content
 * using text extraction (no LLM needed for this tool — caller passes to LLM)
 */
export async function fetchAndExtract(url: string): Promise<{ text: string; title: string }> {
  const resp = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: 20000,
  });

  const $ = cheerio.load(resp.data);
  $('script, style, nav, footer, header, aside').remove();

  const title = $('title').first().text().trim() || $('h1').first().text().trim();
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);

  return { text, title };
}
