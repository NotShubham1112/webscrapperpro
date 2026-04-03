import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
import path from 'path';
import fs from 'fs';
import { c, printBox, printDivider, startSpinner, stopSpinner, sleep, startResponse, endResponse, printResponseLine, getLayoutWidth } from './ui';
import stripAnsi from 'strip-ansi';
import ExcelJS from 'exceljs';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { getLLM } from '../agent/llm';

export async function runStock(ticker: string, options: { excel?: boolean, docx?: boolean, report?: boolean }): Promise<void> {
  startResponse(true);
  
  let symbol = ticker.toUpperCase().trim();
  const lowerTicker = ticker.toLowerCase();

  // ── Market Ranking Detection (Screeners) ───────────────────────────────────
  const isGainers = lowerTicker.includes('gainer') || lowerTicker.includes('performing');
  const isLosers = lowerTicker.includes('loser') || lowerTicker.includes('declining');
  const isActive = lowerTicker.includes('active') || lowerTicker.includes('volume');
  const isTopX = lowerTicker.match(/top\s*(\d+)/);
  const count = isTopX ? parseInt(isTopX[1], 10) : 20;

  if (isGainers || isLosers || isActive) {
    const listType = isGainers ? 'day_gainers' : isLosers ? 'day_losers' : 'most_actives';
    const label = isGainers ? 'TOP GAINERS' : isLosers ? 'TOP LOSERS' : 'MOST ACTIVE';
    
    printResponseLine(c.blueBold(`📊 Market Ranking Mode: `) + c.white(`${label} (Top ${count})`));
    
    try {
      const screener = await (yahooFinance as any).screener(listType, { count });
      const quotes = screener.quotes;

      if (!quotes || quotes.length === 0) throw new Error(`No data found for ${listType}`);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const folder = process.cwd();

      // Exports
      let excelFile = '';
      if (options.excel || options.report) {
         const wb = new ExcelJS.Workbook();
         const ws = wb.addWorksheet(label);
         ws.columns = [
           { header: 'Symbol', key: 'symbol', width: 15 },
           { header: 'Name', key: 'name', width: 30 },
           { header: 'Price', key: 'price', width: 15 },
           { header: 'Change %', key: 'change', width: 15 },
           { header: 'Volume', key: 'volume', width: 20 }
         ];
         quotes.forEach(q => ws.addRow({
           symbol: q.symbol,
           name: q.shortName || q.longName,
           price: q.regularMarketPrice,
           change: q.regularMarketChangePercent,
           volume: q.regularMarketVolume
         }));
         excelFile = path.join(folder, `${listType}-${timestamp}.xlsx`);
         await wb.xlsx.writeFile(excelFile);
      }

      printResponseLine(c.green('  ✓ ') + c.white('Report Generated for ') + c.blueBold(`${quotes.length}`) + c.white(' stocks.'));
      if (excelFile) printResponseLine(c.green('  ✓ ') + c.white('Excel    : ') + c.gray(excelFile));
      
      endResponse();
      return;
    } catch (err: any) {
      console.error(c.red(`  ✗ Market ranking failed: ${err.message}`));
      throw err;
    }
  }

  // ── Original Single Ticker Logic ──────────────────────────────────────────
  let discoveredSymbol = '';

  // ── Symbol Discovery ────────────────────────────────────────────────────────
  if (symbol.includes(' ') || symbol.length > 10) {
    const search = await yahooFinance.search(ticker, { newsCount: 0, quotesCount: 5 });
    const topResult = search.quotes.find(q => q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'));
    if (topResult?.symbol) {
      discoveredSymbol = topResult.symbol as string;
      symbol = discoveredSymbol;
      printResponseLine(c.blueBold(`🔍 Discovered Ticker: `) + c.white(`${String(topResult.shortname || topResult.longname)} (${c.blueBold(symbol)})`));
    } else {
      stopSpinner();
      printResponseLine(c.red(`  ✗ Precise ticker for "${ticker}" not found. Try search_web instead.`));
      throw new Error(`Ticker for "${ticker}" not found.`);
    }
  }

  printResponseLine(c.whiteBold(`📈 Scrappy Stock Market Agent — ${symbol}`));
  printResponseLine(c.gray('Analyzing global financials and recent market shifts...'));
  console.log(c.blue('║') + '─'.repeat(getLayoutWidth() - 2) + c.blue('║'));

  try {
    const progress = async (msg: string, percent: number) => {
      const width = getLayoutWidth();
      const barLength = Math.max(10, Math.floor(width / 4));
      const filledLength = Math.round((barLength * percent) / 100);
      const bar = '■'.repeat(filledLength) + '□'.repeat(barLength - filledLength);
      const output = `${c.blue(`[${bar}]`)} ${c.gray(msg)}`;
      const stripped = stripAnsi(output);
      const padding = Math.max(0, width - 4 - stripped.length);
      process.stdout.write(`\r${c.blue('║ ')}${output}${' '.repeat(padding)}${c.blue(' ║')}`);
      await sleep(200);
      if (percent === 100) console.log(); 
    };

    await progress('Fetching Financial Info...', 10);
    let quote: any;
    try {
      quote = await yahooFinance.quote(symbol);
    } catch {
      // Second fallback search if direct quote fails for a single word
      const search = await yahooFinance.search(symbol, { newsCount: 0, quotesCount: 5 });
      const topResult = search.quotes.find(q => q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'));
      if (topResult?.symbol) {
        symbol = topResult.symbol as string;
        quote = await yahooFinance.quote(symbol);
      } else {
        throw new Error(`Quote not found for symbol: ${symbol}`);
      }
    }
    
    const modules: any = await yahooFinance.quoteSummary(symbol, { modules: ['assetProfile', 'financialData', 'defaultKeyStatistics'] });

    await progress('Fetching Latest News...', 40);
    const news: any = await yahooFinance.search(symbol, { newsCount: 5 });

    await progress('Analyzing data with LLM...', 70);
    
    // Fallback if modules aren't fully available
    const curPrice = quote.regularMarketPrice ?? 'N/A';
    const currency = quote.currency ?? 'USD';
    const profile = modules.assetProfile ?? {};
    const companyName = quote.longName || quote.shortName || symbol;
    const summary = profile.longBusinessSummary || 'No summary available.';

    const newsText = news.news.map(n => `- ${n.title}`).join('\n');

    const prompt = `You are an expert financial analyst. Please summarize the following company data for ${companyName} (${symbol}).
Company Summary: ${summary.substring(0, 1000)}...
Current Price: ${curPrice} ${currency}
Recent News:
${newsText}

Provide:
1. Executive Summary (1-2 paragraphs)
2. 5 Bullet Point Key Takeaways on recent status and what the firm does.

Format:
[SUMMARY]
...
[/SUMMARY]
[TAKEAWAYS]
- ...
[/TAKEAWAYS]
`;
    const llm = getLLM();
    const rawAnalysis = await llm.complete(prompt);

    const summaryMatch = rawAnalysis.match(/\[SUMMARY\]([\s\S]*?)\[\/SUMMARY\]/);
    const takeawaysMatch = rawAnalysis.match(/\[TAKEAWAYS\]([\s\S]*?)\[\/TAKEAWAYS\]/);
    
    const analysisSummary = summaryMatch ? summaryMatch[1].trim() : "Analysis failed to format.";
    const analysisTakeaways = takeawaysMatch ? takeawaysMatch[1].split('\n').filter(l=>l.trim().startsWith('-')).map(l=>l.replace(/^-\s*/, '').trim()) : [];

    await progress('Generating Exports...', 90);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const folder = process.cwd();
    
    // Markdown
    const mdContent = `# Stock Report: ${companyName} (${symbol})
Generated by Scrappy · ${new Date().toLocaleString()}

## Financial Overview
- **Price:** ${curPrice} ${currency}
- **52 Week High:** ${quote.fiftyTwoWeekHigh ?? 'N/A'}
- **52 Week Low:** ${quote.fiftyTwoWeekLow ?? 'N/A'}
- **Volume:** ${quote.regularMarketVolume ?? 'N/A'}
- **Market Cap:** ${quote.marketCap ?? 'N/A'}
- **Trailing P/E:** ${quote.trailingPE ?? 'N/A'}

## Executive Summary
${analysisSummary}

## Key Takeaways
${analysisTakeaways.map(t => `- ${t}`).join('\n')}

## Recent News
${news.news.map((n: any) => `- [${n.title}](${n.link})`).join('\n')}
`;
    const mdFile = path.join(folder, `${symbol}-Report-${timestamp}.md`);
    if (options.report || (!options.excel && !options.docx)) {
      fs.writeFileSync(mdFile, mdContent, 'utf-8');
    }

    // Excel
    let excelFile = '';
    if (options.excel) {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`${symbol} Summary`);
      ws.columns = [
        { header: 'Metric', key: 'metric', width: 25 },
        { header: 'Value', key: 'value', width: 25 }
      ];
      ws.addRows([
        { metric: 'Symbol', value: symbol },
        { metric: 'Name', value: companyName },
        { metric: 'Price', value: `${curPrice} ${currency}` },
        { metric: '52 Week High', value: quote.fiftyTwoWeekHigh },
        { metric: '52 Week Low', value: quote.fiftyTwoWeekLow },
        { metric: 'Volume', value: quote.regularMarketVolume },
        { metric: 'Market Cap', value: quote.marketCap },
      ]);
      excelFile = path.join(folder, `${symbol}-Data-${timestamp}.xlsx`);
      await wb.xlsx.writeFile(excelFile);
    }

    // DOCX
    let docxFile = '';
    if (options.docx || options.report) {
      const doc = new Document({
        creator: 'Scrappy',
        title: `${symbol} Report`,
        sections: [{
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: `Stock Report: ${companyName} (${symbol})`, bold: true, size: 36 })], heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
            new Paragraph({ text: `Price: ${curPrice} ${currency} | Market Cap: ${quote.marketCap ?? 'N/A'}`, spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: 'Executive Summary', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            new Paragraph({ text: analysisSummary, spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: 'Key Takeaways', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            ...analysisTakeaways.map(t => new Paragraph({ text: `- ${t}`, spacing: { after: 100 } })),
          ],
        }],
      });
      docxFile = path.join(folder, `${symbol}-Report-${timestamp}.docx`);
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(docxFile, buffer);
    }

    await progress('Completed', 100);
    console.log(c.blue('║') + '─'.repeat(getLayoutWidth() - 2) + c.blue('║'));
    printResponseLine(c.blueBold('📁 Generated Files:'));
    if (options.report || (!options.excel && !options.docx)) {
      printResponseLine(c.green('  ✓ ') + c.white('Markdown : ') + c.gray(mdFile));
    }
    if (docxFile) {
      printResponseLine(c.green('  ✓ ') + c.white('Word Doc : ') + c.gray(docxFile));
    }
    if (excelFile) {
      printResponseLine(c.green('  ✓ ') + c.white('Excel    : ') + c.gray(excelFile));
    }
    printDivider();
    printResponseLine(c.blue('  📊 RESEARCH COMPLETE') + c.gray(` — ${news.news.length} sources analysed`));
    printDivider();
    
    endResponse();

  } catch (err: any) {
    console.log();
    console.error(c.red(`  ✗ Stock fetch failed: ${err.message}`));
  }
}
