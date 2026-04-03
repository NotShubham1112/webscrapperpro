/**
 * Scrappy - Beautiful CLI UI
 * Company: Cosmic
 * Theme: Bright Blue (#3B82F6), White, Black
 *
 * Provides:
 *  - ASCII art banners (COSMIC + SCRAPPY)
 *  - Typing animation
 *  - Spinner (thinking...)
 *  - Chat bubble rendering
 *  - Boxed output for structured data
 *  - All color-coded with Cosmic theme
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { marked } from 'marked';
import stripAnsi from 'strip-ansi';

// @ts-ignore
const TerminalRenderer = require('marked-terminal').default || require('marked-terminal');

marked.setOptions({
  renderer: new TerminalRenderer({
    reflowText: true,
    showSectionPrefix: false,
    unescape: true,
    // Custom theme
    heading:     chalk.hex('#3B82F6').bold,
    strong:      chalk.hex('#3B82F6').bold,
    em:          chalk.italic,
    blockquote:  chalk.gray.italic,
    code:        chalk.cyan,
    codespan:    chalk.hex('#818CF8'),
    link:        chalk.blue,
    href:        chalk.blue.underline,
    table:       chalk.white,
    firstline:   chalk.hex('#3B82F6').bold,
  })
});

// ─── Color definitions ──────────────────────────────────────────────────────

export const c = {
  blue:       chalk.hex('#3B82F6'),
  blueBold:   chalk.hex('#3B82F6').bold,
  lightBlue:  chalk.hex('#93C5FD'),
  skyBlue:    chalk.hex('#38BDF8'),
  white:      chalk.whiteBright,
  whiteBold:  chalk.whiteBright.bold,
  gray:       chalk.hex('#9CA3AF'),
  dim:        chalk.dim,
  green:      chalk.hex('#4ADE80'),
  red:        chalk.hex('#F87171'),
  yellow:     chalk.hex('#FACC15'),
  cyan:       chalk.cyanBright,
  magenta:    chalk.hex('#818CF8'),
  bold:       chalk.bold,
  bgBlue:     chalk.bgHex('#3B82F6'),
  bgGreen:    chalk.bgHex('#4ADE80'),
  bgRed:      chalk.bgHex('#F87171'),
  bgYellow:   chalk.bgHex('#FACC15'),
};

// ─── ASCII Art ──────────────────────────────────────────────────────────────

const COSMIC_ASCII = `
  ██████╗ ██████╗ ███████╗███╗   ███╗██╗ ██████╗
 ██╔════╝██╔═══██╗██╔════╝████╗ ████║██║██╔════╝
 ██║     ██║   ██║███████╗██╔████╔██║██║██║
 ██║     ██║   ██║╚════██║██║╚██╔╝██║██║██║
 ╚██████╗╚██████╔╝███████║██║ ╚═╝ ██║██║╚██████╗
  ╚═════╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝ ╚═════╝`;

const SCRAPPY_ASCII = `
 ███████╗ ██████╗██████╗  █████╗ ██████╗ ██████╗ ██╗   ██╗
 ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗╚██╗ ██╔╝
 ███████╗██║     ██████╔╝███████║██████╔╝██████╔╝ ╚████╔╝
 ╚════██║██║     ██╔══██╗██╔══██║██╔═══╝ ██╔═══╝   ╚██╔╝
 ███████║╚██████╗██║  ██║██║  ██║██║     ██║        ██║
 ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝        ╚═╝`;

/**
 * Print the full Cosmic + Scrappy ASCII intro banner.
 */
export function displayLogo(): void {
  console.log();
  const width = getLayoutWidth();
  
  // COSMIC (Blue)
  console.log(c.blue(COSMIC_ASCII));
  // SCRAPPY (White)
  console.log(c.white(SCRAPPY_ASCII));
  
  const divider = c.blue('═'.repeat(width));
  console.log(divider);
  
  // Tagline centered
  const tagline = '✦ Agentic Web Intelligence · Powered by Cosmic ✦';
  const padding = Math.max(0, Math.floor((width - tagline.length) / 2));
  console.log(' '.repeat(padding) + c.lightBlue.bold(tagline));
  
  console.log(divider);
  console.log();
}

/**
 * Print a short one-line welcome header.
 */
export function displayWelcome(): void {
  console.log();
  printBox('Welcome to Scrappy Setup Wizard', [
    c.gray('  Configure your AI model and API settings below.'),
    c.gray('  Your config will be saved to ~/.scrappy/config.json'),
  ]);
  console.log();
}

const blockSpinner = {
  interval: 120,
  frames: [
    '[■□□□□□□□□□]',
    '[■■□□□□□□□□]',
    '[■■■□□□□□□□]',
    '[■■■■□□□□□□]',
    '[■■■■■□□□□□]',
    '[■■■■■■□□□□]',
    '[■■■■■■■□□□]',
    '[■■■■■■■■□□]',
    '[■■■■■■■■■□]',
    '[■■■■■■■■■■]',
    '[■■■■■■■■■□]',
    '[■■■■■■■■□□]',
    '[■■■■■■■□□□]',
    '[■■■■■■□□□□]',
    '[■■■■■□□□□□]',
    '[■■■■□□□□□□]',
    '[■■■□□□□□□□]',
    '[■■□□□□□□□□]',
  ]
};

let _spinner: Ora | null = null;

export function startSpinner(text: string = 'Thinking…'): void {
  _spinner = ora({
    text: c.blue(text),
    spinner: blockSpinner,
    color: 'blue',
  }).start();
}

export function stopSpinner(success?: string, fail?: string): void {
  if (!_spinner) return;
  if (success) {
    _spinner.succeed(c.green(success));
  } else if (fail) {
    _spinner.fail(c.red(fail));
  } else {
    _spinner.stop();
  }
  _spinner = null;
}

export function updateSpinner(text: string): void {
  if (_spinner) _spinner.text = c.blue(text);
}

export function isSpinnerActive(): boolean {
  return !!_spinner;
}

export function createSpinner(text: string): Ora {
  return ora({ text: c.blue(text), spinner: blockSpinner, color: 'blue' });
}

// ─── Typing animation ───────────────────────────────────────────────────────

/**
 * Print text one character at a time (streaming effect).
 * @param text    - Text to print
 * @param delayMs - Delay between characters (default 18ms)
 */
export async function typingAnimation(
  text: string,
  delayMs: number = 18,
  newline: boolean = true
): Promise<void> {
  return new Promise(resolve => {
    let i = 0;
    const interval = setInterval(() => {
      process.stdout.write(text[i]);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        if (newline) process.stdout.write('\n');
        resolve();
      }
    }, delayMs);
  });
}

/**
 * Fast typing – used for longer responses to avoid waiting too long.
 */
export async function fastType(text: string): Promise<void> {
  return typingAnimation(text, 8);
}

// ─── Chat bubbles ────────────────────────────────────────────────────────────

// ─── Layout Helpers ────────────────────────────────────────────────────────
/**
 * Detect current terminal width and return a safe layout width.
 */
export function getLayoutWidth(): number {
  const cols = process.stdout.columns || 100;
  return Math.min(cols - 4, 110); // Leave some margin
}

/**
 * Print a full-width header for Scrappy's response.
 */
export function startResponse(isTool: boolean = false): void {
  const width = getLayoutWidth();
  const label = isTool ? ' ⚙  TOOL EXECUTION ' : ' 🌌 COSMIC SCRAPPY ';
  
  // Create a beautiful gradient-like border
  const sideLength = Math.max(0, Math.floor((width - label.length - 2) / 2));
  const side = '═'.repeat(sideLength);
  const remaining = width - label.length - 2 - (sideLength * 2);
  const extra = remaining > 0 ? '═'.repeat(remaining) : '';

  console.log();
  console.log(c.blue(`╔${side}${c.blueBold(label)}${side}${extra}╗`));
}

/**
 * Print a full-width footer for Scrappy's response.
 */
export function endResponse(): void {
  const width = getLayoutWidth();
  console.log(c.blue(`╚${'═'.repeat(width - 2)}╝`));
  console.log();
}

/**
 * Print a single line within the Command Center frame.
 */
export function printResponseLine(text: string): void {
  const width = getLayoutWidth();
  const lines = text.split('\n');
  
  for (const rawLine of lines) {
    const wrappedLines = wrapText(rawLine, width - 4);
    for (const line of wrappedLines) {
      const stripped = stripAnsi(line);
      const padding = Math.max(0, width - 4 - stripped.length);
      process.stdout.write(c.blue('║ ') + line + ' '.repeat(padding) + c.blue(' ║\n'));
    }
  }
}

// ─── Live Streaming Mode ───────────────────────────────────────────────────

let currentLineLength = 0;
let isFirstChunkOfLine = true;

/**
 * Start a live-rendering response session.
 * Uses process.stdout.write directly to avoid newline buffering.
 */
export function startLiveResponse(isTool: boolean = false): void {
  startResponse(isTool);
  currentLineLength = 0;
  isFirstChunkOfLine = true;
}

/**
 * Print a chunk of text in real-time, handling wrapping and borders.
 */
export function printLiveChunk(chunk: string): void {
  const width = getLayoutWidth();
  const maxWidth = width - 4;

  const chars = Array.from(chunk);
  for (const char of chars) {
    if (isFirstChunkOfLine) {
      process.stdout.write(c.blue('║ '));
      isFirstChunkOfLine = false;
    }

    if (char === '\n') {
      const padding = Math.max(0, maxWidth - currentLineLength);
      process.stdout.write(' '.repeat(padding) + c.blue(' ║\n'));
      currentLineLength = 0;
      isFirstChunkOfLine = true;
      continue;
    }

    process.stdout.write(char);
    currentLineLength++;

    if (currentLineLength >= maxWidth) {
      process.stdout.write(c.blue(' ║\n'));
      currentLineLength = 0;
      isFirstChunkOfLine = true;
    }
  }
}

/**
 * Completes the live-rendering response session.
 * Closes the last line and the frame.
 */
export function endLiveResponse(): void {
  const width = getLayoutWidth();
  const maxWidth = width - 4;

  if (!isFirstChunkOfLine) {
    const padding = Math.max(0, maxWidth - currentLineLength);
    process.stdout.write(' '.repeat(padding) + c.blue(' ║\n'));
  }
  endResponse();
}

/**
 * Render Markdown to ANSI styled text using marked-terminal.
 */
export function renderMarkdown(markdown: string): string {
  try {
    const width = getLayoutWidth();
    marked.setOptions({
      renderer: new TerminalRenderer({
        width: width - 8,
        reflowText: true,
        showSectionPrefix: false,
        unescape: true,
        // Premium Theme
        heading:     chalk.hex('#60A5FA').bold, // Sky blue
        strong:      chalk.hex('#3B82F6').bold, // Bright blue
        em:          chalk.italic.hex('#93C5FD'),
        blockquote:  chalk.gray.italic,
        code:        chalk.hex('#818CF8'),      // Indigo
        codespan:    chalk.hex('#C084FC'),      // Purple
        link:        chalk.hex('#60A5FA').underline,
        href:        chalk.hex('#60A5FA').underline,
        table:       chalk.white,
        firstline:   chalk.hex('#3B82F6').bold,
      })
    });
    return marked.parse(markdown.trim()) as string;
  } catch (e) {
    return markdown;
  }
}

/**
 * Print a Scrappy response in the new Command Center layout.
 */
export function printScrappyResponse(text: string, markdown: boolean = true): void {
  const content = markdown ? renderMarkdown(text) : text;
  const lines = content.split('\n');
  
  startResponse();
  for (const line of lines) {
    printResponseLine(line);
  }
  endResponse();
}


/**
 * Print a simple info line (no bubble).
 */
export function printInfo(msg: string): void {
  console.log(c.blue('  ℹ ') + c.gray(msg));
}

export function printSuccess(msg: string): void {
  console.log(c.green('  ✓ ') + c.white(msg));
}

export function printError(msg: string): void {
  console.log(c.red('  ✗ ') + c.red(msg));
}

export function printWarn(msg: string): void {
  console.log(c.yellow('  ⚠ ') + c.yellow(msg));
}

export function printFileSaved(filePath: string): void {
  const width = getLayoutWidth();
  const label = ' 📁 FILE GENERATED ';
  const side = '─'.repeat(Math.floor((width - label.length - 12) / 2));
  
  console.log();
  console.log(c.green(`    ${side}${c.bold(label)}${side}`));
  console.log(c.white(`    Path: `) + c.lightBlue.underline(filePath));
  console.log(c.green(`    ${'─'.repeat(width - 12)}`));
  console.log();
}

// ─── Structured output box ───────────────────────────────────────────────────

/**
 * Print a titled section header with a coloured underline.
 * No box chars — clean flat layout.
 */
export function printBox(title: string, lines: string[]): void {
  console.log();
  console.log(c.blue.bold(`  ${title}`));
  console.log(c.blue('  ' + '─'.repeat(50)));
  for (const line of lines) {
    console.log(c.white(`  ${line}`));
  }
  console.log();
}

/**
 * Print a horizontal divider.
 */
export function printDivider(char: string = '─'): string {
  return c.gray('  ' + char.repeat(50));
}

// ─── Config summary ─────────────────────────────────────────────────────────

export function displayConfigSummary(config: {
  provider: string;
  model: string;
  apiKey: string | null;
}): void {
  printBox('Configuration Saved', [
    c.gray('  Provider : ') + c.blueBold(config.provider),
    c.gray('  Model    : ') + c.white(config.model),
    c.gray('  API Key  : ') + (config.apiKey ? c.green('Saved ✓') : c.gray('Not required')),
  ]);
}

export async function showThinkingAnimation(
  text: string = 'Thinking',
  duration: number = 1200
): Promise<void> {
  const sp = ora({ text: c.blue(text + '…'), spinner: 'dots12', color: 'blue' }).start();
  await sleep(duration);
  sp.stop();
}

export async function showSavingAnimation(duration: number = 800): Promise<void> {
  const sp = ora({ text: c.blue('Saving configuration…'), spinner: 'dots', color: 'blue' }).start();
  await sleep(duration);
  sp.succeed(c.green('✓ Configuration saved!'));
}

// ─── Chat prompt ─────────────────────────────────────────────────────────────

/**
 * Returns the styled prompt string for the chat input line.
 */
export function getPromptString(): string {
  return c.blueBold('  scrappy> ');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function wrapText(text: string, maxWidth: number): string[] {
  const stripped = stripAnsi(text);
  if (stripped.length <= maxWidth) return [text];
  
  const lines: string[] = [];
  let currentLine = '';
  
  // Simple word wrap that respects ANSI codes
  const segments = text.split(/(\s+)/);
  
  for (const seg of segments) {
    const segStripped = stripAnsi(seg);
    if (stripAnsi(currentLine).length + segStripped.length > maxWidth) {
      if (currentLine) lines.push(currentLine.trimEnd());
      currentLine = segStripped === ' ' ? '' : seg;
    } else {
      currentLine += seg;
    }
  }
  
  if (currentLine) lines.push(currentLine.trimEnd());
  return lines;
}

/**
 * Print the session header when entering chat mode.
 */
export function printChatHeader(): void {
  const width = getLayoutWidth();
  const title = ' 🌌 Scrappy Chat — Cosmic Agentic CLI ';
  const sideLength = Math.max(0, Math.floor((width - title.length - 2) / 2));
  const side = '═'.repeat(sideLength);
  const remaining = width - title.length - 2 - (sideLength * 2);
  const extra = remaining > 0 ? '═'.repeat(remaining) : '';

  console.log(c.blue(`╔${side}${c.blueBold(title)}${side}${extra}╗`));
  const instruction = `Type your query below. Type "exit" or "quit" to leave.`;
  const padding = Math.max(0, width - 4 - instruction.length);
  console.log(c.blue(`║ `) + c.gray(instruction) + ' '.repeat(padding) + c.blue(` ║`));
  console.log(c.blue(`╚${'═'.repeat(width - 2)}╝`));
  console.log();
}

/**
 * Print a formatted search result list.
 */
export function printSearchResults(results: Array<{ title: string; url: string; snippet: string }>): void {
  console.log();
  const width = getLayoutWidth();
  const label = ' 🔍 SEARCH RESULTS ';
  const side = '─'.repeat(Math.floor((width - label.length - 4) / 2));
  const extra = (width - label.length - 4) % 2 !== 0 ? '─' : '';
  
  console.log(c.blue(`  ${side}${c.blueBold(label)}${side}${extra}`));
  results.forEach((r, i) => {
    console.log(`\n  ${c.blue(`${i + 1}.`)} ${c.whiteBold(r.title)}`);
    console.log(`     ${c.lightBlue.underline(r.url)}`);
    if (r.snippet) {
      const wrapped = wrapText(r.snippet, width - 8);
      wrapped.forEach(line => console.log(`     ${c.gray(line)}`));
    }
  });
  console.log();
}

/**
 * Print a list of links in a styled way.
 */
export function printLinks(links: Array<{ text: string; url: string }>): void {
  console.log();
  const width = getLayoutWidth();
  const label = ' 🔗 EXTRACTED LINKS ';
  const side = '─'.repeat(Math.floor((width - label.length - 4) / 2));
  const extra = (width - label.length - 4) % 2 !== 0 ? '─' : '';

  console.log(c.blue(`  ${side}${c.blueBold(label)}${side}${extra}`));
  links.slice(0, 20).forEach((l, i) => {
    const linkText = l.text ? l.text.trim().slice(0, 50) : 'Untitled';
    console.log(`  ${c.blue(`${String(i + 1).padStart(2, ' ')}.`)} ${c.white(linkText)}`);
    console.log(`      ${c.gray(l.url)}`);
  });
  if (links.length > 20) {
    console.log(c.gray(`  … and ${links.length - 20} more`));
  }
  console.log();
}