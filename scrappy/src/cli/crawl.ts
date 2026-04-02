import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
import { c, printBox, startSpinner, stopSpinner, sleep, startResponse, endResponse, printResponseLine } from './ui';
import ExcelJS from 'exceljs';

export async function runCrawl(startUrl: string, depth: number, exportType: string) {
  startResponse(true);
  printResponseLine(c.whiteBold(`🕷️ Scrappy Web Crawler`));
  printResponseLine(c.gray(`Crawling ${startUrl} (depth: ${depth})...`));
  printResponseLine('─'.repeat(50));

  const visited = new Set<string>();
  const toVisit: { url: string; currentDepth: number }[] = [{ url: startUrl, currentDepth: 0 }];
  const results: { url: string; title: string; emails: string[]; linksCount: number; excerpt: string }[] = [];

  startSpinner('Crawling web pages...');

  const getHostname = (u: string) => { try { return new URL(u).hostname; } catch { return ''; } };
  const baseHostname = getHostname(startUrl);

  try {
    while (toVisit.length > 0) {
      const current = toVisit.shift()!;
      
      if (visited.has(current.url)) continue;
      visited.add(current.url);

      if (current.currentDepth > depth) continue;

      try {
        const resp = await axios.get(current.url, { timeout: 5000, headers: { 'User-Agent': 'Scrappy-Bot/1.0' } });
        const html = resp.data as string;
        const $ = cheerio.load(html);

        const title = $('title').text().trim() || 'No Title';
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        const excerpt = text.substring(0, 150) + '...';

        // Extract emails naively
        const emails = Array.from(new Set(text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || []));

        const links: string[] = [];
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            try {
              const fullUrl = new URL(href, current.url).href;
              links.push(fullUrl);
            } catch {}
          }
        });

        results.push({ url: current.url, title, emails, linksCount: links.length, excerpt });

        if (current.currentDepth < depth) {
          for (const link of links) {
            // Only follow same-origin links roughly
            if (getHostname(link) === baseHostname) {
              toVisit.push({ url: link, currentDepth: current.currentDepth + 1 });
            }
          }
        }
        
      } catch (e: any) {
        // failed to fetch, skip silently
      }
      
      // Prevent absolute hammering
      await sleep(100);
    }

    stopSpinner();

    printResponseLine(c.green('  ✓ ') + c.white(`Crawled ${visited.size} pages.`));
    
    // Exporting
    if (exportType === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Crawl Data`);
      ws.columns = [
        { header: 'URL', key: 'url', width: 40 },
        { header: 'Title', key: 'title', width: 40 },
        { header: 'Emails Found', key: 'emails', width: 30 },
        { header: 'Links Count', key: 'linksCount', width: 15 },
        { header: 'Excerpt', key: 'excerpt', width: 50 },
      ];
      ws.addRows(results.map(r => ({ ...r, emails: r.emails.join(', ') })));
      
      const fileName = `ScrappyCrawl-${baseHostname}-${Date.now()}.xlsx`;
      const outPath = path.join(process.cwd(), fileName);
      await wb.xlsx.writeFile(outPath);
      
      printResponseLine(c.green('  📁 Excel report saved as: ') + c.gray(outPath));
    } else {
      const fileName = `ScrappyCrawl-${baseHostname}-${Date.now()}.json`;
      const outPath = path.join(process.cwd(), fileName);
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
      printResponseLine(c.green('  📁 JSON report saved as: ') + c.gray(outPath));
    }

    endResponse();
  } catch (err: any) {
    stopSpinner();
    console.log();
    console.error(c.red(`  ✗ Crawl failed: ${err.message}`));
  }
}
