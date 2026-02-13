const axios = require('axios');
const https = require('https');
const { readCredentials, writeCredentials, isTokenExpiredOrExpiringSoon, isTokenExpired } = require('./credentials');
const { getApiUrl } = require('./constants');

/**
 * Get access token with priority:
 * 1. MELDOC_ACCESS_TOKEN (environment variable)
 * 2. credentials.json (user session, with refresh if needed)
 * 3. MELDOC_MCP_TOKEN (integration token)
 * @returns {Promise<{token: string, type: 'env'|'user_session'|'integration'|null}>}
 */
async function getAccessToken() {
  // Priority 1: MELDOC_ACCESS_TOKEN environment variable
  if (process.env.MELDOC_ACCESS_TOKEN) {
    return {
      token: process.env.MELDOC_ACCESS_TOKEN,
      type: 'env'
    };
  }
  
  // Priority 2: credentials.json (user session)
  const credentials = readCredentials();
  if (credentials && credentials.type === 'user_session') {
    // Check if token needs refresh
    if (isTokenExpiredOrExpiringSoon(credentials)) {
      try {
        const refreshed = await refreshToken(credentials);
        if (refreshed) {
          return {
            token: refreshed.tokens.accessToken,
            type: 'user_session'
          };
        }
      } catch (error) {
        // Refresh failed - credentials might be invalid
        // Return null to fall back to next priority
      }
    } else {
      return {
        token: credentials.tokens.accessToken,
        type: 'user_session'
      };
    }
  }
  
  // Priority 3: MELDOC_MCP_TOKEN (integration token)
  if (process.env.MELDOC_MCP_TOKEN) {
    return {
      token: process.env.MELDOC_MCP_TOKEN,
      type: 'integration'
    };
  }
  
  // No token found
  return null;
}

/**
 * Refresh access token using refresh token
 * @param {Object} credentials - Current credentials object
 * @returns {Promise<Object|null>} Updated credentials or null if refresh failed
 */
async function refreshToken(credentials) {
  if (!credentials || !credentials.tokens || !credentials.tokens.refreshToken) {
    return null;
  }
  
  const apiBaseUrl = credentials.apiBaseUrl || getApiUrl();
  
  try {
    const response = await axios.post(`${apiBaseUrl}/api/auth/refresh`, {
      refreshToken: credentials.tokens.refreshToken
    }, {
      timeout: 10000,
      httpsAgent: new https.Agent({ keepAlive: true })
    });
    
    // Update credentials with new tokens
    const updatedCredentials = {
      ...credentials,
      tokens: {
        accessToken: response.data.accessToken,
        accessExpiresAt: response.data.expiresAt,
        refreshToken: response.data.refreshToken || credentials.tokens.refreshToken
      },
      updatedAt: new Date().toISOString()
    };
    
    writeCredentials(updatedCredentials);
    return updatedCredentials;
  } catch (error) {
    // Refresh failed - delete credentials
    const { deleteCredentials } = require('./credentials');
    deleteCredentials();
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
async function isAuthenticated() {
  const tokenInfo = await getAccessToken();
  return tokenInfo !== null;
}

/**
 * Get auth status information
 * @returns {Promise<Object|null>} Auth status with user info or null if not authenticated
 */
async function getAuthStatus() {
  const tokenInfo = await getAccessToken();
  if (!tokenInfo) {
    return null;
  }
  
  if (tokenInfo.type === 'user_session') {
    const credentials = readCredentials();
    if (credentials && credentials.user) {
      return {
        authenticated: true,
        type: 'user_session',
        user: credentials.user,
        expiresAt: credentials.tokens?.accessExpiresAt || null
      };
    }
  }
  
  return {
    authenticated: true,
    type: tokenInfo.type
  };
}

module.exports = {
  getAccessToken,
  refreshToken,
  isAuthenticated,
  getAuthStatus
};
