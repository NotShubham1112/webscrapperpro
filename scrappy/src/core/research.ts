/**
 * Scrappy - Research Engine
 * Company: Cosmic
 *
 * "Full Research Mode" — one command to rule them all.
 *
 * Pipeline:
 *   1. Web search (DuckDuckGo) → top results
 *   2. Scrape each result (title, body, links, tables)
 *   3. LLM summarises + extracts key insights
 *   4. Detect structured data → Excel rows
 *   5. Generate README.md
 *   6. Generate report.docx
 *   7. Save everything into ~/.scrappy/output/{folderName}/
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import ExcelJS from 'exceljs';
import {
  Document, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Packer,
} from 'docx';
import { getLLM } from '../agent/llm';
import { colors } from '../utils/colors';
import { searchWeb } from './search';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResearchResult {
  query: string;
  folderName: string;
  folderPath: string;
  searchResults: SearchResult[];
  sources: SourceData[];
  summary: string;
  keyInsights: string[];
  excelRows: Record<string, any>[];
  markdownReport: string;
  docxPath: string;
  excelPath: string;
  timestamp: string;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SourceData {
  title: string;
  url: string;
  text: string;
  links: { text: string; url: string }[];
  tables: Record<string, string>[];
}

// ─── Progress step ───────────────────────────────────────────────────────────

type StepId = 'search' | 'scraping' | 'summarising' | 'structuring' | 'exporting';

const STEP_CHARS = ['🔍', '🌐', '🧠', '📊', '💾'];

function stepPrefix(step: StepId): string {
  const all: StepId[] = ['search', 'scraping', 'summarising', 'structuring', 'exporting'];
  const idx = all.indexOf(step);
  return colors.blue(`  ${STEP_CHARS[idx]} [${idx + 1}/${all.length}]`);
}

// ─── ResearchEngine ────────────────────────────────────────────────────────────

export class ResearchEngine {
  private query: string;
  private folderName: string;
  private folderPath: string;
  private llm = getLLM();

  constructor(query: string, folderName?: string) {
    this.query = query;
    this.folderName = folderName ?? this.query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
      + '-' + Date.now().toString(36);
    this.folderPath = '';
  }

  // ─── Public run ───────────────────────────────────────────────────────────

  async run(): Promise<ResearchResult> {
    this.ensureFolder();
    const allSteps: StepId[] = ['search', 'scraping', 'summarising', 'structuring', 'exporting'];

    // Step 1: Search
    this.logStep('search', 'Searching web for: ' + colors.primaryBold(`"${this.query}"`));
    const searchResults = await this.doSearch();
    console.log(colors.green(`  ✓ Found ${searchResults.length} sources\n`));

    // Step 2: Scrape
    this.logStep('scraping', `Scraping ${Math.min(searchResults.length, 5)} sources…`);
    const sources = await this.scrapeSources(searchResults.slice(0, 5));
    console.log(colors.green(`  ✓ Scraped ${sources.length} sources successfully\n`));

    // Step 3: Summarise
    this.logStep('summarising', 'Feeding sources to LLM for analysis…');
    const { summary, keyInsights } = await this.summarise(sources);
    console.log(colors.green(`  ✓ Analysis complete\n`));

    // Step 4: Structure
    this.logStep('structuring', 'Detecting tables & structured data…');
    const excelRows = this.extractExcelRows(sources);
    console.log(colors.green(`  ✓ Extracted ${excelRows.length} structured rows\n`));

    // Step 5: Export
    this.logStep('exporting', 'Generating output files…');
    const [markdownPath, docxPath, excelPath] = await Promise.all([
      this.saveMarkdown(summary, keyInsights, sources),
      this.saveDocx(summary, keyInsights, sources),
      excelRows.length > 0 ? this.saveExcel(excelRows) : Promise.resolve(''),
    ]);
    console.log(colors.green(`  ✓ All files saved\n`));

    return {
      query: this.query,
      folderName: this.folderName,
      folderPath: this.folderPath,
      searchResults,
      sources,
      summary,
      keyInsights,
      excelRows,
      markdownReport: markdownPath,
      docxPath,
      excelPath,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private ensureFolder(): void {
    const outputDir = path.join(os.homedir(), '.scrappy', 'output', this.folderName);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    this.folderPath = outputDir;
  }

  private async doSearch(): Promise<SearchResult[]> {
    try {
      const resp = await searchWeb(this.query, 8);
      return resp.results.map(r => ({
        title:   r.title,
        url:     r.url,
        snippet: r.snippet,
      }));
    } catch (err) {
      console.warn(colors.warning(`  ⚠ Search failed: ${(err as Error).message}`));
      return [];
    }
  }

  private async scrapeSources(results: SearchResult[]): Promise<SourceData[]> {
    const sources: SourceData[] = [];

    for (let i = 0; i < results.length; i++) {
      const { title, url, snippet } = results[i];
      process.stdout.write(
        colors.muted(`    [${i + 1}/${results.length}] Scraping: ${title.slice(0, 50)}… `)
      );

      try {
        const html = await this.fetchHTML(url);
        const $ = cheerio.load(html);

        $('script, style, nav, footer, header, aside, [role="navigation"]').remove();

        const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);

        const links: { text: string; url: string }[] = [];
        $('a[href]').each((_: number, el: any) => {
          const href = $(el).attr('href') ?? '';
          const linkText = $(el).text().trim();
          if (href.startsWith('http') && linkText.length > 10) {
            links.push({ text: linkText.slice(0, 80), url: href });
          }
        });

        const allRows: Record<string, string>[] = [];
        $('table').each((_: number, table: any) => {
          const headers: string[] = [];

          $(table).find('th').each((j: number, th: any) => {
            headers.push($(th).text().trim());
          });

          if (headers.length === 0) {
            $(table).find('tr').first().find('td').each((j: number, td: any) => {
              headers.push($(td).text().trim() || `Col${j + 1}`);
            });
          }

          $(table).find('tr').each((_: number, tr: any) => {
            const row: Record<string, string> = {};
            let hasData = false;
            $(tr).find('td').each((j: number, td: any) => {
              const key = headers[j] ?? `Col${j}`;
              const val = $(td).text().trim();
              row[key] = val;
              if (val) hasData = true;
            });
            if (hasData) allRows.push(row);
          });
        });

        sources.push({ title, url, text: text || snippet, links: links.slice(0, 10), tables: allRows });
        process.stdout.write(colors.green('✓\n'));
      } catch (err) {
        process.stdout.write(colors.warning(`⚠ skipped\n`));
        console.warn(colors.muted(`      ${(err as Error).message}`));
      }
    }

    return sources;
  }

  private async fetchHTML(url: string): Promise<string> {
    const resp = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    });
    return resp.data as string;
  }

  private async summarise(sources: SourceData[]): Promise<{
    summary: string;
    keyInsights: string[];
  }> {
    const sourceText = sources.map(s =>
      `## ${s.title}\nURL: ${s.url}\n${s.text.slice(0, 1500)}`
    ).join('\n\n');

    const prompt = `You are a research analyst. Given the following collected sources, produce:
1. A comprehensive but concise summary (3-5 paragraphs)
2. 5-7 bullet-point key insights

Format your response EXACTLY like this (use the literal markers):
[SUMMARY]
<your 3-5 paragraph summary>
[/SUMMARY]
[INSIGHTS]
- <insight 1>
- <insight 2>
...
[/INSIGHTS]

Sources:
${sourceText}`;

    const raw = await this.llm.complete(prompt);

    const summaryMatch = raw.match(/\[SUMMARY\]([\s\S]*?)\[\/SUMMARY\]/);
    const insightsMatch = raw.match(/\[INSIGHTS\]([\s\S]*?)\[\/INSIGHTS\]/);

    const summary = summaryMatch
      ? summaryMatch[1].trim()
      : raw.replace(/\[INSIGHTS\][\s\S]*/g, '').trim();

    const keyInsights = insightsMatch
      ? insightsMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim())
      : [];

    return { summary, keyInsights };
  }

  private extractExcelRows(sources: SourceData[]): Record<string, any>[] {
    const rows: Record<string, any>[] = [];

    for (const source of sources) {
      // source.tables is Record<string, string>[] — flat array of row objects
      for (const row of source.tables) {
        rows.push({ Source: source.title.slice(0, 40), URL: source.url, ...row });
      }
    }

    if (rows.length === 0) {
      for (const source of sources) {
        rows.push({ Title: source.title, URL: source.url, Summary: source.text.slice(0, 200) });
      }
    }

    return rows;
  }

  private async saveMarkdown(
    summary: string,
    keyInsights: string[],
    sources: SourceData[]
  ): Promise<string> {
    const timestamp = new Date().toLocaleString();

    const markdown = `# Research Report: ${this.query}

> **Generated by Scrappy** · ${timestamp} · ${sources.length} sources

---

## 📋 Summary

${summary}

---

## 🔍 Key Insights

${keyInsights.map(l => `- ${l}`).join('\n')}

---

## 🌐 Sources

${sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join('\n')}

---

*Report generated by Scrappy — Cosmic Agentic CLI · [cosmic.so](https://cosmic.so)*
`;

    const filePath = path.join(this.folderPath, 'README.md');
    fs.writeFileSync(filePath, markdown, 'utf-8');
    return filePath;
  }

  private async saveDocx(
    summary: string,
    keyInsights: string[],
    sources: SourceData[]
  ): Promise<string> {
    const titlePara = new Paragraph({
      children: [new TextRun({ text: `Research: ${this.query}`, bold: true, size: 40 })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 300 },
    });

    const metaPara = new Paragraph({
      children: [new TextRun({
        text: `Generated by Scrappy — Cosmic CLI · ${new Date().toLocaleString()} · ${sources.length} sources`,
        italics: true, color: '888888', size: 18,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 500 },
    });

    const summaryHeading = new Paragraph({
      children: [new TextRun({ text: 'Summary', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
    });

    const summaryParagraphs = summary
      .split('\n\n')
      .filter(Boolean)
      .map(block => new Paragraph({
        children: [new TextRun({ text: block.trim(), size: 22 })],
        spacing: { after: 150 },
      }));

    const insightsHeading = new Paragraph({
      children: [new TextRun({ text: 'Key Insights', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
    });

    const insightParagraphs = keyInsights.map(insight =>
      new Paragraph({
        children: [new TextRun({ text: `\u2022 ${insight}`, size: 22 })],
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );

    const sourcesHeading = new Paragraph({
      children: [new TextRun({ text: 'Sources', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
    });

    const sourceParagraphs = sources.map((s, i) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, size: 22 }),
          new TextRun({ text: s.title, size: 22 }),
          new TextRun({ text: ` \u2014 ${s.url}`, color: '3B82F6', size: 20 }),
        ],
        spacing: { after: 80 },
      })
    );

    const doc = new Document({
      creator: 'Scrappy — Cosmic CLI',
      title: `Research: ${this.query}`,
      sections: [{
        properties: {},
        children: [
          titlePara, metaPara,
          summaryHeading, ...summaryParagraphs,
          insightsHeading, ...insightParagraphs,
          sourcesHeading, ...sourceParagraphs,
        ],
      }],
    });

    const filePath = path.join(this.folderPath, 'report.docx');
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  private async saveExcel(rows: Record<string, any>[]): Promise<string> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Scrappy — Cosmic CLI';
    wb.created = new Date();

    const ws = wb.addWorksheet('Research Data');
    const headers = Object.keys(rows[0] ?? {});

    ws.columns = headers.map(h => ({
      header: h,
      key: h,
      width: Math.max(h.length + 3, 20),
    }));

    const hRow = ws.getRow(1);
    hRow.height = 22;
    hRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FF1E40AF' } },
        bottom: { style: 'thin', color: { argb: 'FF1E40AF' } },
        left:   { style: 'thin', color: { argb: 'FF1E40AF' } },
        right:  { style: 'thin', color: { argb: 'FF1E40AF' } },
      };
    });

    rows.forEach((rowData, i) => {
      const row = ws.addRow(rowData);
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: i % 2 === 0 ? 'FFFAFAFA' : 'FFEFF6FF' },
        };
        cell.border = {
          top:    { style: 'hair', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } },
          left:   { style: 'hair', color: { argb: 'FFD1D5DB' } },
          right:  { style: 'hair', color: { argb: 'FFD1D5DB' } },
        };
      });
    });

    const filePath = path.join(this.folderPath, 'research-data.xlsx');
    await wb.xlsx.writeFile(filePath);
    return filePath;
  }

  private logStep(step: StepId, msg: string): void {
    console.log();
    console.log(stepPrefix(step) + colors.primaryBold(` ${msg}`));
  }
}
