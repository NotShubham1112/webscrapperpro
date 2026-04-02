/**
 * Scrappy CLI - Color Palette
 * Company: Cosmic
 * Theme: Bright Blue (#3B82F6), White, Black
 */

import chalk from 'chalk';

export const colors = {
  // Primary theme colors
  primary:    chalk.hex('#3B82F6'),       // Bright Blue
  primaryBold:chalk.hex('#3B82F6').bold,
  secondary:  chalk.hex('#FFFFFF'),       // Pure White
  accent:     chalk.hex('#60A5FA'),       // Lighter blue
  highlight:  chalk.hex('#93C5FD'),       // Pastel blue
  cosmic:     chalk.hex('#818CF8'),       // Cosmic purple-blue

  // Status colors
  success:    chalk.hex('#4ADE80'),       // Green
  warning:    chalk.hex('#FACC15'),       // Yellow
  error:      chalk.hex('#F87171'),       // Red
  info:       chalk.hex('#38BDF8'),       // Sky blue
  muted:      chalk.hex('#6B7280'),       // Gray

  // Terminal standard fallbacks
  blue:       chalk.blueBright,
  white:      chalk.whiteBright,
  black:      chalk.black,
  cyan:       chalk.cyanBright,
  gray:       chalk.gray,
  green:      chalk.greenBright,
  red:        chalk.redBright,
  yellow:     chalk.yellowBright,
  magenta:    chalk.magentaBright,
  dim:        chalk.dim,
  bold:       chalk.bold,
  italic:     chalk.italic,
};

/** Gradient-like effect: alternate chars between blue shades */
export function cosmicText(text: string): string {
  return colors.primaryBold(text);
}

/** Box drawing chars */
export const box = {
  tl: '╔', tr: '╗', bl: '╚', br: '╝',
  h: '═', v: '║',
  ml: '╠', mr: '╣',
  single: {
    tl: '┌', tr: '┐', bl: '└', br: '┘',
    h: '─', v: '│', ml: '├', mr: '┤'
  }
};
