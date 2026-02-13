/**
 * Default configuration constants
 * Production values used when environment variables are not set
 */

// Production API URL
const DEFAULT_API_URL = 'https://api.meldoc.io';

// Production App URL (frontend)
const DEFAULT_APP_URL = 'https://app.meldoc.io';

/**
 * Request timeout configuration
 * 25 seconds - less than Claude Desktop's 30s timeout to allow for proper error handling
 */
const REQUEST_TIMEOUT = 25000;

/**
 * Log levels for severity filtering
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Default log level names mapped to numeric values
 */
const LOG_LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG'
};

/**
 * MCP protocol version
 */
const MCP_PROTOCOL_VERSION = '2024-11-05';

/**
 * Server capability flags
 */
const SERVER_CAPABILITIES = {
  TOOLS: true,
  PROMPTS: false,
  RESOURCES: false,
  LOGGING: false
};

/**
 * Get API URL from environment or use production default
 */
function getApiUrl() {
  return process.env.MELDOC_API_URL || DEFAULT_API_URL;
}

/**
 * Get App URL from environment or use production default
 */
function getAppUrl() {
  return process.env.MELDOC_APP_URL || DEFAULT_APP_URL;
}

/**
 * Get log level from environment variable
 * @param {string} [level] - Log level string (ERROR, WARN, INFO, DEBUG)
 * @returns {number} Numeric log level
 */
function getLogLevel(level) {
  const upper = (level || '').toUpperCase();
  return LOG_LEVELS[upper] !== undefined ? LOG_LEVELS[upper] : LOG_LEVELS.ERROR;
}

/**
 * Get log level name from numeric value
 * @param {number} level - Numeric log level
 * @returns {string} Log level name
 */
function getLogLevelName(level) {
  return LOG_LEVEL_NAMES[level] || 'UNKNOWN';
}

module.exports = {
  DEFAULT_API_URL,
  DEFAULT_APP_URL,
  REQUEST_TIMEOUT,
  LOG_LEVELS,
  LOG_LEVEL_NAMES,
  MCP_PROTOCOL_VERSION,
  SERVER_CAPABILITIES,
  getApiUrl,
  getAppUrl,
  getLogLevel,
  getLogLevelName
};
