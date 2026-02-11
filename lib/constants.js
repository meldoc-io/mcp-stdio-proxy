/**
 * Default configuration constants
 * Production values used when environment variables are not set
 */

// Production API URL
const DEFAULT_API_URL = 'https://api.meldoc.io';

// Production App URL (frontend)
const DEFAULT_APP_URL = 'https://app.meldoc.io';

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

module.exports = {
  DEFAULT_API_URL,
  DEFAULT_APP_URL,
  getApiUrl,
  getAppUrl
};
