#!/usr/bin/env node
/**
 * Scrappy CLI - Main Entry Point
 * Company: Cosmic
 *
 * Usage:
 *   scrappy              → starts interactive chat
 *   scrappy setup        → re-run setup wizard
 *   scrappy chat         → explicitly start chat
 *   scrappy research     → Full Research Mode
 *   scrappy stock        → Real-time stock mode
 *   scrappy readme       → Generate README
 *   scrappy crawl        → Web crawler
 *   scrappy recipe       → Pre-built automation
 *   scrappy plugins      → Plugin system
 */

import { Command } from 'commander';
import { runSetup } from '../cli/setup';
import { runChat } from '../cli/chat';
import { displayLogo } from '../cli/ui';
import { configExists } from '../utils/config';
import { ensureScrappyDirs } from '../utils/paths';
import { runResearch } from '../cli/research';
import { runStock } from '../cli/stock';
import { runReadme } from '../cli/readme';
import { runCrawl } from '../cli/crawl';
import { runRecipe } from '../cli/recipe';
import { runPlugins } from '../cli/plugins';

const program = new Command();

program
  .name('scrappy')
  .description('🌌 Scrappy — Agentic Web Intelligence CLI by Cosmic')
  .version('1.0.0', '-v, --version', 'Show version')
  .option('--local', 'Always force local LLM (Ollama)', false)
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.local) process.env.SCRAPPY_LOCAL = 'true';
    ensureScrappyDirs();
  });

// ─── scrappy setup ────────────────────────────────────────────────────────────

program
  .command('setup')
  .description('Configure AI model provider and API key')
  .action(async () => {
    displayLogo();
    await runSetup();
    process.exit(0);
  });

// ─── scrappy chat ─────────────────────────────────────────────────────────────

program
  .command('chat')
  .description('Start interactive chat session (default)')
  .action(async () => {
    if (!configExists() && process.env.SCRAPPY_LOCAL !== 'true') {
      displayLogo();
      console.log('');
      console.log('  No configuration found. Let\'s set up Scrappy first!\n');
      await runSetup();
    }
    await runChat();
  });

// ─── scrappy research ────────────────────────────────────────────────────────

program
  .command('research')
  .description('Full Research Mode — one command: web search → scrape → summarise → export')
  .argument('<query>', 'the research question or topic')
  .option('-o, --output <folder>', 'Output folder name (auto-generated if omitted)')
  .action(async (query: string, opts: { output?: string }) => {
    displayLogo();
    await runResearch(query, opts.output);
    process.exit(0);
  });

// ─── Viral Features ──────────────────────────────────────────────────────────

program
  .command('stock')
  .description('Real-Time Stock + Financial Scraper')
  .argument('<ticker>', 'Stock ticker symbol (e.g. AAPL, TSLA)')
  .option('--excel', 'Export to Excel')
  .option('--docx', 'Export to DOCX')
  .option('--report', 'Export all formats')
  .action(async (ticker: string, opts: any) => {
    await runStock(ticker, opts);
    process.exit(0);
  });

program
  .command('readme')
  .description('Automatic README Generator (for any Git repo)')
  .argument('[path]', 'Path to the directory', '.')
  .action(async (pathStr: string) => {
    await runReadme(pathStr);
    process.exit(0);
  });

program
  .command('crawl')
  .description('Recursive AI Web Crawler')
  .argument('<url>', 'Starting URL')
  .option('--depth <number>', 'Crawling depth', '1')
  .option('--export <type>', 'Export format (excel, json)', 'json')
  .action(async (url: string, opts: any) => {
    await runCrawl(url, parseInt(opts.depth, 10), opts.export);
    process.exit(0);
  });

program
  .command('recipe')
  .description('Pre-Built Automation Recipes')
  .argument('<name>', 'Recipe name (seo-audit, competitor-analysis, scam-check, tech-news)')
  .argument('[args...]', 'Parameters for the recipe')
  .action(async (name: string, args: string[]) => {
    await runRecipe(name, args);
    process.exit(0);
  });

program
  .command('plugins')
  .description('Scrappy Plugin System')
  .argument('<action>', 'Action (add, list)')
  .argument('[plugin]', 'Plugin name')
  .action(async (action: string, plugin?: string) => {
    await runPlugins(action, plugin);
    process.exit(0);
  });

// ─── Default action (no subcommand) ──────────────────────────────────────────

program
  .action(async () => {
    if (!configExists() && process.env.SCRAPPY_LOCAL !== 'true') {
      displayLogo();
      console.log('');
      console.log('  No configuration found. Let\'s set up Scrappy first!\n');
      await runSetup();
    }
    await runChat();
  });

program.parse(process.argv);