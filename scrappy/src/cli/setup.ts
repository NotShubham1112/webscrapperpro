/**
 * Scrappy CLI - Setup Wizard
 * Company: Cosmic
 *
 * Flow:
 * 1. Display welcome message
 * 2. Choose model provider (Ollama, OpenRouter, Groq, Mistral)
 * 3. If Ollama → detect installed models
 * 4. If cloud → select model from provider options
 * 5. If cloud → ask for API key
 * 6. Save configuration
 * 7. Display summary
 */

import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { saveConfig } from '../utils/config';
import {
  displayWelcome,
  showThinkingAnimation,
  showSavingAnimation,
  displayConfigSummary,
  printError,
  printSuccess,
  c,
} from './ui';

// ─── Model catalogue ─────────────────────────────────────────────────────────

const CLOUD_MODELS: Record<string, string[]> = {
  openrouter: [
    'mistralai/mistral-large',
    'meta-llama/llama-3-70b-instruct',
    'meta-llama/llama-3-8b-instruct',
    'qwen/qwen-2.5-72b-instruct',
    'google/gemini-flash-1.5',
    'anthropic/claude-3-haiku',
  ],
  groq: [
    'llama3-8b-groq',
    'mixtral-8x7b',
    'llama3-70b',
    'gemma-7b',
  ],
  mistral: [
    'mistral-small-latest',
    'mistral-large-latest',
    'open-mistral-nemo',
    'codestral-latest',
  ],
};

// ─── Detect Ollama ────────────────────────────────────────────────────────────

function detectOllamaModels(): string[] {
  try {
    const out = execSync('ollama list', { encoding: 'utf-8', timeout: 5000 });
    return out
      .trim()
      .split('\n')
      .slice(1) // skip header
      .map(line => line.trim().split(/\s+/)[0])
      .filter(name => name && name.length > 0);
  } catch {
    return [];
  }
}

// ─── Wizard steps ─────────────────────────────────────────────────────────────

async function selectProvider(): Promise<string> {
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: c.white('Choose your model provider:'),
      choices: [
        {
          name: c.blue('🖥  Local — Ollama (free, no API key, runs on your machine)'),
          value: 'ollama',
        },
        new inquirer.Separator(c.dim('─── Cloud Providers ──────────────────────')),
        {
          name: c.blue('🌐  OpenRouter  (100+ models, pay-per-use, recommended)'),
          value: 'openrouter',
        },
        {
          name: c.blue('⚡  Groq        (ultra-fast inference, free tier available)'),
          value: 'groq',
        },
        {
          name: c.blue('🔮  Mistral     (specialized models, API key required)'),
          value: 'mistral',
        },
      ],
      default: 'ollama',
    },
  ]);
  return provider;
}

async function selectModel(provider: string): Promise<string> {
  if (provider === 'ollama') {
    const installed = detectOllamaModels();

    if (installed.length === 0) {
      console.log(c.yellow('\n  ⚠ No Ollama models detected. Is Ollama running?'));
      console.log(c.gray('    Install: https://ollama.ai  |  Then: ollama pull llama3\n'));

      const { useDefault } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useDefault',
          message: c.white('Continue with default model "llama3"?'),
          default: true,
        },
      ]);

      if (!useDefault) process.exit(0);
      return 'llama3';
    }

    const { model } = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: c.white('Select an installed Ollama model:'),
        choices: installed,
        default: installed[0],
      },
    ]);
    return model;
  }

  // Cloud
  const available = CLOUD_MODELS[provider] ?? [];
  const { model } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: c.white(`Select a ${provider} model:`),
      choices: available,
      default: available[0],
    },
  ]);
  return model;
}

async function getApiKey(provider: string): Promise<string | null> {
  if (provider === 'ollama') return null;

  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: c.white(`Enter your ${c.blueBold(provider)} API key:`),
      mask: '•',
      validate: (input: string) =>
        input.trim().length > 0 || 'API key cannot be empty',
    },
  ]);
  return apiKey.trim();
}

async function confirmConfig(cfg: {
  provider: string;
  model: string;
  apiKey: string | null;
}): Promise<boolean> {
  console.log();
  displayConfigSummary(cfg);
  const { ok } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message: c.white('Save this configuration?'),
      default: true,
    },
  ]);
  return ok;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runSetup(): Promise<void> {
  try {
    displayWelcome();

    const provider = await selectProvider();
    console.log(c.blue(`\n  ✓ Provider: ${provider}\n`));

    await showThinkingAnimation('Detecting available models', 800);
    const model = await selectModel(provider);
    console.log(c.blue(`\n  ✓ Model: ${model}\n`));

    const apiKey = await getApiKey(provider);
    if (apiKey) console.log(c.blue('  ✓ API key received\n'));

    const config = { provider: provider as any, model, apiKey };

    const confirmed = await confirmConfig(config);
    if (!confirmed) {
      console.log(c.yellow('\n  Setup cancelled. Run "scrappy setup" to try again.\n'));
      return;
    }

    await showSavingAnimation(700);
    saveConfig(config);

    printSuccess('Setup complete! Starting Scrappy chat…');
    console.log();
  } catch (err: any) {
    printError(`Setup failed: ${err?.message ?? String(err)}`);
    process.exit(1);
  }
}