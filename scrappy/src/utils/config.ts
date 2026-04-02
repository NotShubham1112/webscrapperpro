/**
 * Scrappy CLI - Config Utility
 * Company: Cosmic
 * Saves/loads ~/.scrappy/config.json
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ScrappyConfig {
  provider: 'ollama' | 'openrouter' | 'groq' | 'mistral';
  model: string;
  apiKey: string | null;
}

const HOME        = os.homedir();
const CONFIG_DIR  = path.join(HOME, '.scrappy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getConfigDir(): string  { return CONFIG_DIR; }
export function getConfigPath(): string { return CONFIG_FILE; }

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

export function loadConfig(): ScrappyConfig {
  if (process.env.SCRAPPY_LOCAL === 'true') {
    return { provider: 'ollama', model: 'llama3', apiKey: null };
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error('No config found. Run "scrappy setup" first.');
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as ScrappyConfig;
  } catch (e: any) {
    throw new Error(`Failed to load config: ${e.message}`);
  }
}

export function saveConfig(config: ScrappyConfig): void {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function deleteConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
}