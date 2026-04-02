import chalk from 'chalk';

/**
 * Logger utility for the Scrappy CLI
 * Provides colored and formatted logging
 */
export class Logger {
  private debugEnabled: boolean;
  
  constructor(debugEnabled: boolean = false) {
    this.debugEnabled = debugEnabled;
  }
  
  /**
   * Log an info message
   */
  info(message: string) {
    console.log(chalk.blue(`ℹ ${message}`));
  }
  
  /**
   * Log a success message
   */
  success(message: string) {
    console.log(chalk.green(`✓ ${message}`));
  }
  
  /**
   * Log a warning message
   */
  warn(message: string) {
    console.log(chalk.yellow(`⚠ ${message}`));
  }
  
  /**
   * Log an error message
   */
  error(message: string) {
    console.log(chalk.red(`✗ ${message}`));
  }
  
  /**
   * Log a debug message (only if debug is enabled)
   */
  debug(message: string) {
    if (this.debugEnabled) {
      console.log(chalk.gray(`🔧 ${message}`));
    }
  }
  
  /**
   * Enable debug mode
   */
  enableDebug() {
    this.debugEnabled = true;
  }
}

// Default logger instance
export const logger = new Logger(process.env.DEBUG === 'true');