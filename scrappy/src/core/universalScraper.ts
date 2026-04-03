/**
 * UniversalScraper - Auto-fallback scraping system
 * Company: Cosmic
 *
 * Implements 4 modes:
 * 1. FAST MODE - Direct HTML scraping with axios
 * 2. JS MODE - Headless browser rendering with Playwright
 * 3. API MODE - Network call interception to discover APIs
 * 4. ANTI-BOT MODE - Proxy rotation and header randomization
 */

import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';

// Playwright types - will be imported dynamically
interface PlaywrightPage {
  goto(url: string, options?: { timeout?: number; waitUntil?: string }): Promise<void>;
  content(): Promise<string>;
  waitForTimeout(ms: number): Promise<void>;
}

interface PlaywrightContext {
  newPage(): Promise<PlaywrightPage>;
  route(pattern: string, handler: (route: any, request: any) => Promise<void>): Promise<void>;
}

interface PlaywrightBrowser {
  newContext(options?: any): Promise<PlaywrightContext>;
  close(): Promise<void>;
}

interface ScrapingResult {
  mode: 'fast' | 'js' | 'api' | 'error';
  data?: any;
  html?: string;
  apiEndpoints?: string[];
  error?: string;
  logs: string[];
}

export class UniversalScraper {
  private headers: Record<string, string>;
  private userAgentPool: string[];
  private timeout: number;
  private maxRetries: number;

  constructor(timeout: number = 30000) {
    this.timeout = timeout;
    this.maxRetries = 2;

    // Rotating user agents for anti-bot evasion
    this.userAgentPool = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
    ];

    this.headers = this.getRandomHeaders();
  }

  /**
   * Get random headers from the user agent pool
   */
  private getRandomHeaders(): Record<string, string> {
    const userAgent = this.userAgentPool[Math.floor(Math.random() * this.userAgentPool.length)];
    return {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    };
  }

  /**
   * Add random delay to avoid rate limiting (1.2-2.7 seconds)
   */
  private async delay(): Promise<void> {
    const ms = Math.floor(Math.random() * 1500) + 1200;
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if HTML contains meaningful content or is just a JS placeholder
   */
  private hasMeaningfulContent(html: string): boolean {
    // Check for common JS-framework placeholders
    const emptyPatterns = [
      /<div id="root"><\/div>/i,
      /<div id="app"><\/div>/i,
      /<div id="__next"><\/div>/i,
      /<div id="__nuxt"><\/div>/i,
      /window\.__INITIAL_STATE__\s*=\s*\{\}/i,
      /<script[^>]*>[^<]*React[^<]*<\/script>/i,
      /<script[^>]*>[^<]*Vue[^<]*<\/script>/i,
      /<script[^>]*>[^<]*Angular[^<]*<\/script>/i,
    ];

    // If we find heavy React/Vue/Angular patterns with empty body, it's likely JS-rendered
    const hasEmptyRoot = emptyPatterns.some(pattern => pattern.test(html));

    // Check for actual content
    const $ = cheerio.load(html);
    const textContent = $.text().trim();
    const hasTables = $('table').length > 0;
    const hasLists = $('ul, ol').length > 0;
    const hasParagraphs = $('p').length > 3;
    const hasDivs = $('div').length > 5;

    // If text is very short and we see script loaders, probably needs JS
    const hasRealContent = textContent.length > 500 || hasTables || hasLists || hasParagraphs;

    return hasRealContent && !hasEmptyRoot;
  }

  /**
   * Detect if page requires JavaScript rendering
   */
  private isJSRendered(html: string): boolean {
    const jsIndicators = [
      /<script[^>]*src="[^"]*react[^"]*"[^>]*>/i,
      /<script[^>]*src="[^"]*vue[^"]*"[^>]*>/i,
      /<script[^>]*src="[^"]*angular[^"]*"[^>]*>/i,
      /<script[^>]*>[^<]*"react"[^<]*<\/script>/i,
      /<script[^>]*>[^<]*"vue"[^<]*<\/script>/i,
      /data-reactroot/i,
      /data-v-/i,
      /ng-app/i,
      /<div[^>]*id="root"[^>]*>/i,
      /<div[^>]*id="app"[^>]*>/i,
      /<div[^>]*id="__next"[^>]*>/i,
      /<div[^>]*id="__nuxt"[^>]*>/i,
    ];

    return jsIndicators.some(pattern => pattern.test(html));
  }

  /**
   * Check if response indicates Cloudflare or anti-bot protection
   */
  private isAntiBotBlocked(html: string, statusCode?: number): boolean {
    const cloudflarePatterns = [
      /cloudflare/i,
      /cf-browser-verification/i,
      /cf-ray/i,
      /checking your browser/i,
      /please wait.*loading/i,
      /ddos protection/i,
      /access denied/i,
      /captcha/i,
      /turnstile/i,
    ];

    return (
      statusCode === 403 ||
      statusCode === 429 ||
      cloudflarePatterns.some(pattern => pattern.test(html))
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 1: FAST MODE - Direct HTML scraping
  // ═══════════════════════════════════════════════════════════════════════════

  async fastScrape(url: string, retryCount: number = 0): Promise<{ success: boolean; html?: string; logs: string[] }> {
    const logs: string[] = [];
    logs.push(`[FAST MODE] Attempting direct HTTP fetch (retry: ${retryCount})...`);

    try {
      // Random delay for anti-bot evasion
      if (retryCount > 0) {
        await this.delay();
      }

      // Rotate headers on retry
      const headers = retryCount > 0 ? this.getRandomHeaders() : this.headers;

      const response = await axios.get(url, {
        timeout: this.timeout,
        headers,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      const html = response.data;

      // Check for anti-bot protection
      if (this.isAntiBotBlocked(html, response.status)) {
        logs.push(`[FAST MODE] Anti-bot protection detected (status: ${response.status})`);
        return { success: false, logs };
      }

      // Check for JS-rendered content
      if (!this.hasMeaningfulContent(html) && this.isJSRendered(html)) {
        logs.push('[FAST MODE] JS-rendered website detected, needs headless browser');
        return { success: false, html, logs };
      }

      // Check if content is empty or just placeholders
      if (!this.hasMeaningfulContent(html)) {
        logs.push('[FAST MODE] No meaningful content found in HTML');
        return { success: false, html, logs };
      }

      logs.push(`[FAST MODE] Success! Fetched ${html.length} bytes`);
      return { success: true, html, logs };

    } catch (error) {
      const axiosError = error as AxiosError;
      logs.push(`[FAST MODE] Error: ${axiosError.message}`);

      // Retry on specific errors
      if (retryCount < this.maxRetries && axiosError.response?.status === 429) {
        logs.push('[FAST MODE] Rate limited, retrying with different headers...');
        return this.fastScrape(url, retryCount + 1);
      }

      return { success: false, logs };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2: JS MODE - Headless browser rendering
  // ═══════════════════════════════════════════════════════════════════════════

  async jsScrape(url: string): Promise<{ success: boolean; html?: string; logs: string[] }> {
    const logs: string[] = [];
    logs.push('[JS MODE] Launching headless browser with Playwright...');

    try {
      // Dynamically import playwright to avoid issues if not installed
      const { chromium } = await import('playwright');

      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
      });

      const context = await browser.newContext({
        userAgent: this.userAgentPool[Math.floor(Math.random() * this.userAgentPool.length)],
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
      });

      const page = await context.newPage();

      // Navigate with extended timeout
      await page.goto(url, {
        timeout: 60000,
        waitUntil: 'networkidle',
      });

      // Wait for hydration (React/Vue/Angular to finish rendering)
      logs.push('[JS MODE] Waiting for JavaScript hydration (3s)...');
      await page.waitForTimeout(3000);

      // Additional wait for dynamic content
      await page.waitForTimeout(1000);

      // Get the rendered HTML
      const html = await page.content();

      await browser.close();

      // Validate content
      if (!this.hasMeaningfulContent(html)) {
        logs.push('[JS MODE] Rendered DOM still lacks meaningful content');
        return { success: false, html, logs };
      }

      logs.push(`[JS MODE] Success! Rendered ${html.length} bytes`);
      return { success: true, html, logs };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logs.push(`[JS MODE] Error: ${errorMessage}`);

      if (errorMessage.includes('playwright') || errorMessage.includes('Cannot find module')) {
        logs.push('[JS MODE] Playwright not installed. Run: npm install playwright');
      }

      return { success: false, logs };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 3: API MODE - Discover network calls
  // ═══════════════════════════════════════════════════════════════════════════

  async apiDiscovery(url: string): Promise<{ success: boolean; endpoints: string[]; logs: string[] }> {
    const logs: string[] = [];
    const endpoints: string[] = [];

    logs.push('[API MODE] Intercepting network calls to find API endpoints...');

    try {
      const { chromium } = await import('playwright');

      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      // Intercept all network requests
      await context.route('**/*', async (route: any, request: any) => {
        const requestUrl = request.url();
        const resourceType = request.resourceType();

        // Capture API-like requests
        const apiPatterns = [
          /\/api\//i,
          /\/v\d+\//i,
          /\/graphql/i,
          /\.json$/i,
          /\/search/i,
          /\/scan/i,
          /\/fetch/i,
          /\/data/i,
          /application\/json/i,
        ];

        const isApiRequest = apiPatterns.some(pattern => pattern.test(requestUrl)) ||
          resourceType === 'xhr' ||
          resourceType === 'fetch';

        if (isApiRequest && !endpoints.some(e => e === requestUrl)) {
          endpoints.push(requestUrl);
          logs.push(`[API MODE] Found endpoint: ${requestUrl.substring(0, 100)}...`);
        }

        await route.continue();
      });

      // Navigate to page
      await page.goto(url, { timeout: 60000, waitUntil: 'networkidle' });

      // Wait for API calls to complete
      await page.waitForTimeout(5000);

      await browser.close();

      if (endpoints.length === 0) {
        logs.push('[API MODE] No API endpoints discovered');
        return { success: false, endpoints: [], logs };
      }

      logs.push(`[API MODE] Discovered ${endpoints.length} API endpoints`);
      return { success: true, endpoints, logs };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logs.push(`[API MODE] Error: ${errorMessage}`);
      return { success: false, endpoints: [], logs };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SCRAPE METHOD - Auto-fallback chain
  // ═══════════════════════════════════════════════════════════════════════════

  async scrape(url: string): Promise<ScrapingResult> {
    const allLogs: string[] = [];

    // Step 1: Try FAST MODE
    const fastResult = await this.fastScrape(url);
    allLogs.push(...fastResult.logs);

    if (fastResult.success && fastResult.html) {
      return {
        mode: 'fast',
        html: fastResult.html,
        logs: allLogs,
      };
    }

    // Step 2: Try JS MODE if fast mode failed
    const jsResult = await this.jsScrape(url);
    allLogs.push(...jsResult.logs);

    if (jsResult.success && jsResult.html) {
      return {
        mode: 'js',
        html: jsResult.html,
        logs: allLogs,
      };
    }

    // Step 3: Try API MODE if JS mode failed
    const apiResult = await this.apiDiscovery(url);
    allLogs.push(...apiResult.logs);

    if (apiResult.success && apiResult.endpoints.length > 0) {
      return {
        mode: 'api',
        apiEndpoints: apiResult.endpoints,
        logs: allLogs,
      };
    }

    // Step 4: All modes failed
    return {
      mode: 'error',
      error: 'Unable to scrape using any mode (FAST/JS/API)',
      logs: allLogs,
    };
  }

  /**
   * Quick scrape method that returns just the HTML (for backward compatibility)
   */
  async fetchHtml(url: string): Promise<string> {
    const result = await this.scrape(url);

    if (result.mode === 'error') {
      throw new Error(result.error || 'Scraping failed');
    }

    if (result.mode === 'api' && result.apiEndpoints) {
      // For API mode, try to fetch the first endpoint
      if (result.apiEndpoints.length > 0) {
        try {
          const apiResponse = await axios.get(result.apiEndpoints[0], {
            timeout: this.timeout,
            headers: this.headers,
          });
          return JSON.stringify(apiResponse.data, null, 2);
        } catch (e) {
          // Return the endpoints as HTML if fetch fails
          return `<html><body><h1>API Endpoints Discovered</h1><ul>${result.apiEndpoints.map(e => `<li>${e}</li>`).join('')}</ul></body></html>`;
        }
      }
    }

    return result.html || '';
  }

  /**
   * Scrape and extract structured data with CSS selectors
   */
  async scrapeWithSelectors(url: string, selectors: Record<string, string>): Promise<ScrapingResult & { extracted?: Record<string, any> }> {
    const result = await this.scrape(url);

    if (result.html) {
      const $ = cheerio.load(result.html);
      const extracted: Record<string, any> = {};

      for (const [key, selector] of Object.entries(selectors)) {
        const elements = $(selector);
        if (elements.length === 1) {
          extracted[key] = elements.text().trim();
        } else if (elements.length > 1) {
          extracted[key] = elements.map((_, el) => $(el).text().trim()).get();
        } else {
          extracted[key] = null;
        }
      }

      return { ...result, extracted };
    }

    return result;
  }
}

export default UniversalScraper;
