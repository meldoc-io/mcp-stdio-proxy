const fs = require('fs');
const path = require('path');
const os = require('os');

const CREDENTIALS_PATH = path.join(os.homedir(), '.meldoc', 'credentials.json');

/**
 * Read credentials from ~/.meldoc/credentials.json
 * @returns {Object|null} Credentials object or null if file doesn't exist
 */
function readCredentials() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Write credentials to ~/.meldoc/credentials.json
 * Sets file permissions to 0600 (read/write only for owner)
 * @param {Object} credentials - Credentials object
 */
function writeCredentials(credentials) {
  const dir = path.dirname(CREDENTIALS_PATH);
  
  // Create .meldoc directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  
  // Write credentials file
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2) + '\n', {
    encoding: 'utf8',
    mode: 0o600 // 0600 - read/write only for owner
  });
}

/**
 * Delete credentials file
 */
function deleteCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      fs.unlinkSync(CREDENTIALS_PATH);
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Check if access token is expired or expires soon (within 5 minutes)
 * @param {Object} credentials - Credentials object
 * @returns {boolean} True if token is expired or expires soon
 */
function isTokenExpiredOrExpiringSoon(credentials) {
  if (!credentials || !credentials.tokens || !credentials.tokens.accessExpiresAt) {
    return true;
  }
  
  const expiresAt = new Date(credentials.tokens.accessExpiresAt);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  return expiresAt.getTime() <= (now.getTime() + fiveMinutes);
}

/**
 * Check if access token is expired
 * @param {Object} credentials - Credentials object
 * @returns {boolean} True if token is expired
 */
function isTokenExpired(credentials) {
  if (!credentials || !credentials.tokens || !credentials.tokens.accessExpiresAt) {
    return true;
  }
  
  const expiresAt = new Date(credentials.tokens.accessExpiresAt);
  const now = new Date();
  
  return expiresAt.getTime() <= now.getTime();
}

module.exports = {
  readCredentials,
  writeCredentials,
  deleteCredentials,
  isTokenExpiredOrExpiringSoon,
  isTokenExpired,
  CREDENTIALS_PATH
};
