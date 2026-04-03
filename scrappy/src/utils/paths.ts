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

/** ~/.scrappy/output/ - NOW DEPRECATED in favor of CWD */
export function getScrappyOutputDir(): string {
  return path.join(getScrappyDir(), 'output');
}

/** 
 * Returns the default output directory for the current session.
 * Defaults to ./scrappy_output in the current folder.
 */
export function getOutputDir(): string {
  const cwd = process.cwd();
  const defaultPath = path.join(cwd, 'scrappy_output');
  return defaultPath;
}

/** 
 * Resolves a filename or path against the output directory.
 * Handles absolute paths provided by the user.
 */
export function getOutputPath(filename: string, baseDir?: string): string {
  const targetDir = baseDir || getOutputDir();
  if (path.isAbsolute(filename)) return filename;
  return path.join(targetDir, filename);
}

/** ~/.scrappy/history.json */
export function getHistoryPath(): string {
  return path.join(getScrappyDir(), 'history.json');
}

/** Ensure directory exists, creating recursively if needed */
export function ensureDir(dirPath: string): void {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (err) {
      // Ignored for now
    }
  }
}

/** Ensure all Scrappy dirs exist */
export function ensureScrappyDirs(): void {
  ensureDir(getScrappyDir());
  // We don't force the output dir here, we'll do it on-demand
}