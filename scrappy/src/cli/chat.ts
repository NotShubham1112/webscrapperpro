/**
 * Scrappy - Chat Loop
 * Company: Cosmic
 *
 * The interactive chat session:
 *  - Reads user input line-by-line (readline)
 *  - Maintains conversation history
 *  - Routes to the ScrappyAgent
 *  - Renders responses with typing animation
 *  - Handles special commands: exit, clear, history, help, save
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  c,
  displayLogo,
  printChatHeader,
  printInfo,
  printSuccess,
  printError,
  printWarn,
  printFileSaved,
  printSearchResults,
  printLinks,
  printDivider,
  startSpinner,
  stopSpinner,
  updateSpinner,
  isSpinnerActive,
  typingAnimation,
  fastType,
  getPromptString,
  sleep,
  startResponse,
  endResponse,
  printResponseLine,
  printScrappyResponse,
  startLiveResponse,
  printLiveChunk,
  endLiveResponse,
} from './ui';

import { ScrappyAgent, AgentResponse } from '../agent/agent';
import { ChatMessage } from '../agent/llm';
import { loadConfig } from '../utils/config';
import { ensureScrappyDirs, getOutputPath, getScrappyDir } from '../utils/paths';

// ─── Help text ───────────────────────────────────────────────────────────────

const HELP_TEXT = `
${c.blueBold('  SCRAPPY COMMANDS')}
  ${c.blue('─'.repeat(50))}
  ${c.lightBlue('help')}            Show this help message
  ${c.lightBlue('clear')}           Clear the terminal screen
  ${c.lightBlue('history')}         Show conversation history
  ${c.lightBlue('save history')}    Export full conversation to ~/.scrappy/output/
  ${c.lightBlue('exit / quit')}     Exit Scrappy

  ${c.blueBold('EXAMPLE QUERIES')}
  ${c.blue('─'.repeat(50))}
  ${c.gray('  "Scrape https://example.com and summarize it"')}
  ${c.gray('  "Search latest research on quantum computing"')}
  ${c.gray('  "Extract all links from https://news.ycombinator.com"')}
  ${c.gray('  "Extract all tables from https://en.wikipedia.org/wiki/Python_(programming_language)"')}
  ${c.gray('  "Create a README about this project"')}
  ${c.gray('  "Export the last answer to a docx"')}
  ${c.gray('  "Explain the content of https://openai.com"')}
  ${c.gray('  "Search AI trends and save results to excel"')}
`;

// ─── Chat session state ───────────────────────────────────────────────────────

interface SessionState {
  history: ChatMessage[];
  turnCount: number;
  lastResponse?: AgentResponse;
}

// ─── Main chat runner ────────────────────────────────────────────────────────

export async function runChat(): Promise<void> {
  const agent = new ScrappyAgent();
  ensureScrappyDirs();

  const state: SessionState = {
    history: [],
    turnCount: 0,
  };

  displayLogo();
  await sleep(200);

  // Show config info
  try {
    const cfg = loadConfig();
    const { getOutputDir } = await import('../utils/paths');
    printInfo(`Using ${c.blueBold(cfg.provider)} › ${c.white(cfg.model)}`);
    printInfo(`Output folder: ${c.lightBlue(getOutputDir())}`);
  } catch {
    printWarn('No config found. Run `scrappy setup` to configure your model.');
  }

  printChatHeader();

  // Setup readline
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: getPromptString(),
    terminal: true,
  });

  // ── Tool Interception Logic ──────────────────────────────────────────
  agent.beforeToolExecute = async (tool, args): Promise<{ proceed: boolean; args?: any }> => {
    const isFileTool = tool.startsWith('create_') || tool.startsWith('save_');
    if (!isFileTool) return { proceed: true };

    if (isSpinnerActive()) stopSpinner();
    console.log();
    console.log(c.yellow(c.bold('  ⚠️  PERMISSION REQUIRED')));
    console.log(c.gray(`  Scrappy wants to use tool: `) + c.blueBold(tool));
    
    // 1. Permission
    const confirm = await new Promise<string>(resolve => {
      rl.question(c.white('  Confirm action? (Y/n): '), resolve);
    });
    if (confirm.toLowerCase() === 'n') {
      console.log(c.red('  Action cancelled by user.'));
      return { proceed: false };
    }

    // 2. Path
    const defaultDir = path.join(process.cwd(), 'scrappy_output');
    const userPath = await new Promise<string>(resolve => {
      rl.question(c.white(`  Where to save? [Enter for ${c.blue(defaultDir)}]: `), resolve);
    });

    const finalDir = userPath.trim() || defaultDir;
    console.log(c.green(`  Using path: ${finalDir}`));
    
    // Update args with finalDir
    const newArgs = { ...args, folderName: finalDir };

    // Resume spinner since process() is still running
    startSpinner('Scrappy is working…');
    return { proceed: true, args: newArgs };
  };

  rl.prompt();

  let inputBuffer = '';
  let inputTimeout: NodeJS.Timeout | null = null;

  rl.on('line', async (line: string) => {
    // If it's a very fast sequence of lines, it's a paste
    inputBuffer += (inputBuffer ? '\n' : '') + line;

    if (inputBuffer.length > 500 && !isSpinnerActive()) {
      updateSpinner(`📥 Processing large input (${inputBuffer.length} chars)...`);
      if (!isSpinnerActive()) startSpinner('Processing large input...');
    }

    if (inputTimeout) clearTimeout(inputTimeout);

    inputTimeout = setTimeout(async () => {
      const input = inputBuffer.trim();
      inputBuffer = '';
      if (isSpinnerActive()) stopSpinner();

      if (!input) {
        rl.prompt();
        return;
      }

      rl.pause();

      // ── Built-in commands ────────────────────────────────────────────────

      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        console.log();
        console.log(c.blue('  👋 Goodbye from Scrappy & the Cosmic team!'));
        console.log(c.gray('  Your output files are in ~/.scrappy/output/'));
        console.log();
        rl.close();
        process.exit(0);
      }

      if (input.toLowerCase() === 'help') {
        console.log(HELP_TEXT);
        rl.resume();
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'clear') {
        console.clear();
        displayLogo();
        printChatHeader();
        rl.resume();
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'history') {
        if (state.history.length === 0) {
          printInfo('No conversation history yet.');
        } else {
          printDivider();
          console.log(c.blueBold('  Conversation History'));
          printDivider();
          state.history.forEach(m => {
            const label = m.role === 'user'
              ? c.yellow('  YOU     ')
              : c.blue('  SCRAPPY ');
            console.log(`${label}${c.gray(m.content.slice(0, 120))}`);
          });
        }
        rl.resume();
        rl.prompt();
        return;
      }

      if (input.toLowerCase().startsWith('save history')) {
        await saveHistory(state.history);
        rl.resume();
        rl.prompt();
        return;
      }

      // ── Agent turn ───────────────────────────────────────────────────────

      state.turnCount++;

      // Add user message to history
      state.history.push({ role: 'user', content: input });

      // Show spinner while processing
      startSpinner('Scrappy is thinking…');

      let response: AgentResponse;
      try {
        response = await agent.process(input, state.history);

        if (response.stream) {
          let fullText = '';
          let currentThoughtTotal = 0;

          startLiveResponse();

          for await (const chunk of response.stream) {
            if (chunk.type === 'thought') {
              currentThoughtTotal = chunk.thoughtTotal || currentThoughtTotal;
              updateSpinner(`🧠 Thinking… [${currentThoughtTotal} tokens]`);
            } else if (chunk.type === 'content') {
              if (isSpinnerActive()) stopSpinner();
              
              if (chunk.text) {
                fullText += chunk.text;
                printLiveChunk(chunk.text);
              }
            }
          }
          
          endLiveResponse();

          response.text = fullText;
        } else if (response.text) {
          stopSpinner();
          printScrappyResponse(response.text);
        } else {
          stopSpinner();
        }
      } catch (err: any) {
        stopSpinner(undefined, `Error: ${err?.message ?? String(err)}`);
        printError(`Something went wrong: ${err?.message}`);
        rl.resume();
        rl.prompt();
        return;
      }

      // Add assistant response to history
      state.history.push({ role: 'assistant', content: response.text || '' });
      state.lastResponse = response;

      // ── Render non-text results (files, searches) ────────────────────────
      await renderMetadata(response);

      // ── Keep history manageable ─────────────────────────────────────────
      if (state.history.length > 40) {
        state.history = state.history.slice(-30);
      }

      rl.resume();
      rl.prompt();
    }, 200); // Paste buffer timeout (increased for reliability)
  });

  rl.on('close', () => {
    console.log();
    console.log(c.blue('  Session ended.'));
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    rl.pause();
    if (isSpinnerActive()) stopSpinner();
    console.log();
    console.log(c.blue('  🌌 Cosmic adventure paused. Goodbye!'));
    console.log();
    process.exit(0);
  });
}

// ─── Response renderer ───────────────────────────────────────────────────────

async function renderMetadata(response: AgentResponse): Promise<void> {
  const { toolUsed, data, fileSaved } = response;

  if (fileSaved) {
    printFileSaved(fileSaved);
  }

  if (toolUsed === 'search_web' && data?.results?.length) {
    printSearchResults(data.results);
  }

  if (toolUsed === 'extract_links' && Array.isArray(data)) {
    printLinks(data);
  }

  if (toolUsed && toolUsed !== 'answer_directly') {
    console.log(c.dim(`  ⚙  Tool: ${toolUsed}`));
  }
}

// ─── Save history ─────────────────────────────────────────────────────────────

async function saveHistory(history: ChatMessage[]): Promise<void> {
  if (history.length === 0) {
    printWarn('No history to save.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `conversation_${timestamp}.txt`;
  const filePath = getOutputPath(filename);

  const lines = history.map(m =>
    `[${m.role.toUpperCase()}]\n${m.content}\n${'─'.repeat(60)}\n`
  );

  const content =
    `SCRAPPY CONVERSATION EXPORT\n` +
    `Generated: ${new Date().toLocaleString()}\n` +
    `${'═'.repeat(60)}\n\n` +
    lines.join('\n');

  fs.writeFileSync(filePath, content, 'utf-8');
  printSuccess(`Conversation saved to:`);
  printFileSaved(filePath);
}
