import { ResearchEngine } from '../core/research';
import { c, printBox, printDivider, startResponse, endResponse, printResponseLine } from './ui';

export async function runRecipe(recipeName: string, args: string[]) {
  startResponse(true);
  printResponseLine(c.whiteBold(`🍳 Scrappy Auto-Recipe: ${recipeName}`));
  printResponseLine(c.gray('Executing pre-built cosmic workflow...'));
  printResponseLine('─'.repeat(50));

  let query = '';

  switch (recipeName.toLowerCase()) {
    case 'seo-audit':
      query = `Perform a comprehensive SEO audit for ${args.join(' ')}. Identify meta tags, headers, performance metrics, and general SEO health.`;
      break;
    case 'competitor-analysis':
      query = `Conduct a competitor analysis for ${args.join(' ')}. Include market positioning, key features, pricing, and overall sentiment.`;
      break;
    case 'scam-check':
      query = `Investigate ${args.join(' ')} for potential scams, fraud reports, poor trustpilot reviews, or shady practices. Provide a trust score.`;
      break;
    case 'tech-news':
      query = `What are the most impactful tech news and AI advancements from the last 24-48 hours? Summarize key breakthroughs.`;
      break;
    default:
      console.log(c.yellow(`  ⚠ Unknown recipe "${recipeName}". Falling back to custom query.`));
      query = `${recipeName} ${args.join(' ')}`;
      break;
  }

  // We reuse the magnificent ResearchEngine for recipes!
  const engine = new ResearchEngine(query, `recipe-${recipeName}`);

  try {
    const result = await engine.run();

    // ── Final report card ──────────────────────────────────────────────────
    console.log();
    printDivider();
    console.log(c.blueBold('  📊 RECIPE COMPLETE') + c.gray(` — ${result.sources.length} sources analysed`));
    printDivider();

    // Summary box
    const summaryLines = result.summary
      .split('\n\n')
      .slice(0, 3)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => '  ' + c.white(l.slice(0, 80)));

    printBox('Summary', summaryLines);

    // Key insights
    if (result.keyInsights.length > 0) {
      console.log();
      console.log(c.blueBold('  🔍 Key Insights'));
      for (const insight of result.keyInsights.slice(0, 7)) {
        console.log(c.green('    • ') + c.white(insight));
      }
    }

    // Output files
    printResponseLine(c.blueBold('📁 Output Files'));
    printResponseLine(c.green('  📄 README.md    : ') + c.white(result.markdownReport));
    printResponseLine(c.green('  📊 report.docx  : ') + c.white(result.docxPath));
    if (result.excelPath) {
      printResponseLine(c.green('  📈 data.xlsx    : ') + c.white(result.excelPath));
    }

    printResponseLine('');
    printResponseLine(c.green('✅ All files saved to: ') + c.whiteBold(result.folderPath));
    
    endResponse();

  } catch (err: any) {
    console.error();
    console.error(c.red(`  ✗ Recipe failed: ${err?.message ?? String(err)}`));
    console.error();
    process.exit(1);
  }
}
