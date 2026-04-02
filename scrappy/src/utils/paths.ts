/**
 * Scrappy CLI - Paths Utility
 * Company: Cosmic
 * Description: Handles filesystem paths and directory operations
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

const HOME = os.homedir();

/** ~/.scrappy */
export function getScrappyDir(): string {
  return path.join(HOME, '.scrappy');
}

/** ~/.scrappy/config.json */
export function getConfigPath(): string {
  return path.join(getScrappyDir(), 'config.json');
}

/** ~/.scrappy/output/ */
export function getOutputDir(): string {
  return path.join(getScrappyDir(), 'output');
}

/** ~/.scrappy/output/<filename> */
export function getOutputPath(filename: string): string {
  return path.join(getOutputDir(), filename);
}

/** ~/.scrappy/history.json */
export function getHistoryPath(): string {
  return path.join(getScrappyDir(), 'history.json');
}

/** Ensure directory exists, creating recursively if needed */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** Ensure all Scrappy dirs exist */
export function ensureScrappyDirs(): void {
  ensureDir(getScrappyDir());
  ensureDir(getOutputDir());
}