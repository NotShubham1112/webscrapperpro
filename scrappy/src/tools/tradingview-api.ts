/**
 * TradingView API Scraper
 * Extracts stock data directly from TradingView's internal API
 * NO HTML scraping - only API calls
 */

import { chromium } from 'playwright';
import axios from 'axios';

export interface TradingViewStock {
  name: string;
  symbol: string;
  tvSymbol: string;
  url: string;
  price?: number;
  dayHigh?: number;
  dayLow?: number;
  changePercent?: number;
  volume?: number;
  week52High?: number;
  week52Low?: number;
}

/**
 * Intercept network requests to find TradingView data APIs
 */
export async function detectTradingViewAPIs(url: string = 'https://www.tradingview.com/markets/#stocks'): Promise<string[]> {
  const apiEndpoints: string[] = [];

  console.log('[API DETECTION] Launching browser to intercept network calls...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.36',
  });

  const page = await context.newPage();

  // Intercept ALL network requests
  await context.route('**/*', async (route, request) => {
    const requestUrl = request.url();
    const resourceType = request.resourceType();
    const headers = request.headers();

    // Look for TradingView API patterns
    const isApiRequest =
      requestUrl.includes('tradingview.com') && (
        requestUrl.includes('/api/') ||
        requestUrl.includes('/scan/') ||
        requestUrl.includes('/symbols/') ||
        requestUrl.includes('/symbol_search/') ||
        requestUrl.includes('/quote/') ||
        requestUrl.includes('/data/') ||
        requestUrl.includes('/lists/') ||
        resourceType === 'xhr' ||
        resourceType === 'fetch'
      );

    if (isApiRequest && !apiEndpoints.includes(requestUrl)) {
      apiEndpoints.push(requestUrl);
      console.log(`[API DETECTED] ${requestUrl.substring(0, 120)}...`);
    }

    await route.continue();
  });

  // Navigate to the page
  await page.goto(url, { timeout: 60000, waitUntil: 'networkidle' });

  // Wait for API calls to complete
  await page.waitForTimeout(5000);

  await browser.close();

  return apiEndpoints;
}

/**
 * Fetch stock data via Playwright (bypasses 403 by using real browser)
 */
export async function fetchTradingViewStocks(limit: number = 20): Promise<TradingViewStock[]> {
  const stocks: TradingViewStock[] = [];

  console.log(`[API FETCH] Getting top ${limit} stocks from TradingView via browser...`);

  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // Store API responses
  let scanData: any = null;

  // Intercept the scan API response
  await context.route('**/america/scan', async (route, request) => {
    console.log('[BROWSER] Intercepting scan API...');
    const response = await route.fetch();
    const data = await response.json();
    scanData = data;
    await route.continue();
  });

  // Navigate to TradingView markets page
  await page.goto('https://www.tradingview.com/markets/#stocks', {
    timeout: 60000,
    waitUntil: 'networkidle',
  });

  // Wait a bit for data to load
  await page.waitForTimeout(5000);

  // Execute API call directly in browser context
  const data = await page.evaluate(async (limitCount): Promise<any> => {
    const response = await fetch('https://scanner.tradingview.com/america/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        columns: [
          'name',
          'description',
          'close',
          'change',
          'volume',
          'high',
          'low',
          'high_52_week',
          'low_52_week',
          'open',
          'market_cap_basic',
          'exchange',
          'currency',
        ],
        range: [0, limitCount],
        sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
        symbols: {},
      }),
    });
    return response.json();
  }, limit) as any;

  await browser.close();

  if (data?.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      const symbol = item.s;
      const values = item.d;

      if (symbol && values) {
        stocks.push({
          name: values[1] || values[0],
          symbol: symbol.split(':')[1],
          tvSymbol: symbol,
          url: `https://www.tradingview.com/symbols/${symbol.replace(':', '-')}/`,
          price: values[2],
          dayHigh: values[5],
          dayLow: values[6],
          changePercent: values[3],
          volume: values[4],
          week52High: values[7],
          week52Low: values[8],
        });
      }
    }
  }

  console.log(`[API FETCH] Retrieved ${stocks.length} stocks`);
  return stocks.slice(0, limit);
}

/**
 * Alternative: Search API for specific stock queries
 */
export async function searchTradingViewSymbols(query: string = 'stock', limit: number = 20): Promise<TradingViewStock[]> {
  const searchUrl = 'https://symbol-search.tradingview.com/symbol_search/';

  console.log(`[SEARCH API] Searching for "${query}"...`);

  try {
    const response = await axios.get(searchUrl, {
      params: {
        text: query,
        hl: 1,
        type: 'stock',
        exchange: '',
        lang: 'en',
        domain: 'production',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.tradingview.com/',
      },
      timeout: 30000,
    });

    const results = response.data;
    const stocks: TradingViewStock[] = [];

    if (Array.isArray(results)) {
      for (const item of results.slice(0, limit)) {
        stocks.push({
          name: item.description || item.symbol,
          symbol: item.symbol,
          tvSymbol: `${item.exchange}:${item.symbol}`,
          url: `https://www.tradingview.com/symbols/${item.exchange}-${item.symbol}/`,
        });
      }
    }

    return stocks;
  } catch (error: any) {
    console.error(`[SEARCH API] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get detailed stock data from TradingView using quote API
 */
export async function getTradingViewStockDetails(tvSymbol: string): Promise<Partial<TradingViewStock>> {
  try {
    // TradingView quote endpoint
    const quoteUrl = `https://quote-api.tradingview.com/watchlist/news/headlines`;

    const response = await axios.get(quoteUrl, {
      params: { symbols: tvSymbol },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.tradingview.com/',
      },
      timeout: 15000,
    });

    return response.data || {};
  } catch {
    return {};
  }
}

/**
 * Main function: Get TradingView stocks with full data
 */
export async function getTradingViewMarketsData(limit: number = 20): Promise<{
  stocks: TradingViewStock[];
  source: string;
  timestamp: string;
}> {
  console.log('='.repeat(60));
  console.log('TRADINGVIEW API SCRAPER - NO HTML, NO CRAWLING');
  console.log('='.repeat(60));

  // Fetch directly from TradingView scan API
  const stocks = await fetchTradingViewStocks(limit);

  return {
    stocks,
    source: 'https://scanner.tradingview.com/america/scan',
    timestamp: new Date().toISOString(),
  };
}

// CLI usage
if (require.main === module) {
  getTradingViewMarketsData(20)
    .then((result) => {
      console.log('\n' + '='.repeat(60));
      console.log('RESULTS:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
