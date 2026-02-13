const chalk = require('chalk');

/**
 * Beautiful console logger with colors and emojis
 */
const logger = {
  /**
   * Success message (green)
   */
  success: (message) => {
    console.log(chalk.green('✓'), chalk.greenBright(message));
  },

  /**
   * Error message (red)
   */
  error: (message) => {
    console.error(chalk.red('✗'), chalk.redBright(message));
  },

  /**
   * Warning message (yellow)
   */
  warn: (message) => {
    console.warn(chalk.yellow('⚠'), chalk.yellowBright(message));
  },

  /**
   * Info message (blue)
   */
  info: (message) => {
    console.log(chalk.blue('ℹ'), chalk.blueBright(message));
  },

  /**
   * Debug message (gray)
   */
  debug: (message) => {
    console.error(chalk.gray('🔍'), chalk.gray(message));
  },

  /**
   * Log message with custom prefix
   */
  log: (message) => {
    console.log(message);
  },

  /**
   * Highlighted text (cyan)
   */
  highlight: (text) => {
    return chalk.cyan.bold(text);
  },

  /**
   * URL formatting
   */
  url: (url) => {
    return chalk.cyan.underline(url);
  },

  /**
   * Code formatting
   */
  code: (code) => {
    return chalk.bgGray.white.bold(` ${code} `);
  },

  /**
   * Label formatting
   */
  label: (label) => {
    return chalk.gray(label);
  },

  /**
   * Value formatting
   */
  value: (value) => {
    return chalk.white.bold(value);
  },

  /**
   * Section header
   */
  section: (title) => {
    console.log('\n' + chalk.bold.cyan('━'.repeat(50)));
    console.log(chalk.bold.cyan('  ' + title));
    console.log(chalk.bold.cyan('━'.repeat(50)) + '\n');
  },

  /**
   * List item
   */
  item: (text, value = null) => {
    if (value !== null) {
      console.log(chalk.gray('  •'), chalk.white(text), chalk.gray('→'), logger.value(value));
    } else {
      console.log(chalk.gray('  •'), chalk.white(text));
    }
  }
};

module.exports = logger;
