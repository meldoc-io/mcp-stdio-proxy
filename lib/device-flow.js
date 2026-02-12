const axios = require('axios');
const https = require('https');
const { writeCredentials } = require('./credentials');
const { getApiUrl, getAppUrl } = require('./constants');
const logger = require('./logger');
const os = require('os');
const { exec } = require('child_process');

/**
 * Start device flow authentication
 * @param {string} apiBaseUrl - API base URL
 * @returns {Promise<Object>} Device flow response with deviceCode, userCode, verificationUrl, expiresIn, interval
 */
async function startDeviceFlow(apiBaseUrl = null) {
  const url = apiBaseUrl || getApiUrl();
  try {
    // Server may expect snake_case, but we'll send camelCase and let server handle it
    const response = await axios.post(`${url}/api/auth/device/start`, {
      client: 'mcp-stdio-proxy',
      client_version: '1.0.0'
    }, {
      timeout: 10000,
      httpsAgent: new https.Agent({ keepAlive: true })
    });
    
    const data = response.data;
    
    // Normalize response: support both camelCase and snake_case
    const normalized = {
      deviceCode: data.deviceCode || data.device_code,
      userCode: data.userCode || data.user_code,
      verificationUrl: data.verificationUrl || data.verification_url,
      expiresIn: data.expiresIn || data.expires_in,
      interval: data.interval
    };
    
    // Validate response
    if (!normalized.deviceCode || !normalized.userCode || !normalized.verificationUrl) {
      throw new Error(`Invalid response from server: missing required fields. Response: ${JSON.stringify(data)}`);
    }
    
    if (!normalized.expiresIn || !normalized.interval) {
      throw new Error(`Invalid response from server: missing expiresIn or interval. Response: ${JSON.stringify(data)}`);
    }
    
    return normalized;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const errorData = error.response.data;
      const errorMessage = errorData?.error?.message || errorData?.message || `HTTP ${status}: ${error.response.statusText}`;
      throw new Error(`Device flow start failed: ${errorMessage}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error(`Device flow start failed: No response from server at ${url}`);
    } else {
      // Other errors
      throw new Error(`Device flow start failed: ${error.message}`);
    }
  }
}

/**
 * Poll device flow for approval
 * @param {string} deviceCode - Device code from startDeviceFlow
 * @param {string} apiBaseUrl - API base URL
 * @returns {Promise<Object>} Poll response with status and tokens if approved
 */
async function pollDeviceFlow(deviceCode, apiBaseUrl = null) {
  const url = apiBaseUrl || getApiUrl();
  try {
    // Server expects snake_case: device_code
    const response = await axios.post(`${url}/api/auth/device/poll`, {
      device_code: deviceCode
    }, {
      timeout: 10000,
      httpsAgent: new https.Agent({ keepAlive: true })
    });
    
    const data = response.data;
    
    // Debug logging - only log if LOG_LEVEL is DEBUG
    if (process.env.LOG_LEVEL === 'DEBUG') {
      logger.debug(`Poll response keys: ${Object.keys(data).join(', ')}`);
      logger.debug(`Poll response: ${JSON.stringify(data, null, 2)}`);
    }
    
    // Validate response has status field
    if (!data.status) {
      throw new Error(`Invalid poll response: missing status field. Response: ${JSON.stringify(data)}`);
    }
    
    // Check if data is nested in auth_response (server format)
    const authData = data.auth_response || data.authResponse || data;
    
    // refresh_token can be in root or in auth_response
    const refreshToken = data.refresh_token || data.refreshToken || 
                        authData.refreshToken || authData.refresh_token || null;
    
    // Normalize response: support both camelCase and snake_case
    // Check all possible field name variations
    const normalized = {
      status: data.status,
      accessToken: authData.accessToken || authData.access_token || null,
      expiresAt: authData.expiresAt || authData.expires_at || null,
      refreshToken: refreshToken,
      user: authData.user || null
    };
    
    // Debug logging - only log if LOG_LEVEL is DEBUG
    if (process.env.LOG_LEVEL === 'DEBUG') {
      logger.debug(`Normalized response: ${JSON.stringify({
        ...normalized,
        accessToken: normalized.accessToken ? '[REDACTED]' : null
      }, null, 2)}`);
    }
    
    // Validate normalized response for approved status
    if (normalized.status === 'approved' && !normalized.accessToken) {
      throw new Error(`Invalid approved response: missing accessToken. Raw response: ${JSON.stringify(data)}, Normalized: ${JSON.stringify(normalized)}`);
    }
    
    return normalized;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const errorData = error.response.data;
      const errorMessage = errorData?.error?.message || errorData?.message || `HTTP ${status}: ${error.response.statusText}`;
      throw new Error(`Device flow poll failed: ${errorMessage}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error(`Device flow poll failed: No response from server at ${url}`);
    } else {
      // Other errors (including our validation errors)
      throw error;
    }
  }
}

/**
 * Perform device flow login
 * @param {Function} onCodeDisplay - Callback to display code to user (url, code)
 * @param {Function} onStatusChange - Optional callback for status changes
 * @param {string} apiBaseUrl - API base URL
 * @returns {Promise<Object>} Credentials object
 */
async function deviceFlowLogin(onCodeDisplay, onStatusChange = null, apiBaseUrl = null, appUrl = null) {
  const url = apiBaseUrl || getApiUrl();
  const frontendUrl = appUrl || getAppUrl();
  
  // Step 1: Start device flow (already normalized in startDeviceFlow)
  const startResponse = await startDeviceFlow(url);
  const { deviceCode, userCode, verificationUrl, expiresIn, interval } = startResponse;
  
  // Step 2: Display code to user
  // Use verificationUrl from server, but replace base URL if MELDOC_APP_URL is set
  let displayUrl = verificationUrl;
  
  // Check if verificationUrl already contains code in query parameter
  let urlHasCode = false;
  try {
    const urlObj = new URL(verificationUrl);
    if (urlObj.searchParams.has('code')) {
      urlHasCode = true;
    }
  } catch (e) {
    // URL parsing failed, continue
  }
  
  if (process.env.MELDOC_APP_URL || appUrl) {
    // Replace the base URL in verificationUrl with the configured app URL
    try {
      const urlObj = new URL(verificationUrl);
      const appUrlObj = new URL(frontendUrl);
      // Keep the path and query from verificationUrl, but use app URL origin
      displayUrl = `${appUrlObj.origin}${urlObj.pathname}${urlObj.search}`;
    } catch (e) {
      // If URL parsing fails, use verificationUrl as is
      displayUrl = verificationUrl;
    }
  }
  
  // If URL doesn't have code, add it as path parameter
  let fullUrl = displayUrl;
  if (!urlHasCode) {
    // Add code as path parameter (format: /device/CODE)
    if (displayUrl.endsWith('/')) {
      fullUrl = `${displayUrl}${userCode}`;
    } else {
      fullUrl = `${displayUrl}/${userCode}`;
    }
  }
  
  onCodeDisplay(fullUrl, userCode);
  
  // Step 3: Poll for approval
  const startTime = Date.now();
  const expiresAt = startTime + (expiresIn * 1000);
  
  while (Date.now() < expiresAt) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000));
    
    const pollResponse = await pollDeviceFlow(deviceCode, url);
    
    if (pollResponse.status === 'approved') {
      // Validate that we have required fields
      if (!pollResponse.accessToken) {
        throw new Error(`Invalid poll response: missing accessToken. Response: ${JSON.stringify(pollResponse)}`);
      }
      
      // Step 4: Save credentials
      // Note: refreshToken is optional - if server doesn't provide it, auto-refresh won't work
      const credentials = {
        type: 'user_session',
        apiBaseUrl: url,
        user: pollResponse.user,
        tokens: {
          accessToken: pollResponse.accessToken,
          accessExpiresAt: pollResponse.expiresAt || new Date(Date.now() + 3600000).toISOString(), // Default 1 hour if missing
          refreshToken: pollResponse.refreshToken || null // Optional - server may not provide refreshToken
        },
        updatedAt: new Date().toISOString()
      };
      
      // Note: refreshToken is optional, but if provided, auto-refresh will work
      
      // Debug logging
      if (process.env.LOG_LEVEL === 'DEBUG') {
        logger.debug(`Saving credentials: ${JSON.stringify({
          ...credentials,
          tokens: { ...credentials.tokens, accessToken: credentials.tokens.accessToken ? '[REDACTED]' : null }
        }, null, 2)}`);
      }
      
      writeCredentials(credentials);
      
      if (onStatusChange) {
        onStatusChange('approved');
      }
      
      return credentials;
    } else if (pollResponse.status === 'denied') {
      if (onStatusChange) {
        onStatusChange('denied');
      }
      throw new Error('Login denied by user');
    } else if (pollResponse.status === 'expired') {
      if (onStatusChange) {
        onStatusChange('expired');
      }
      throw new Error('Device code expired');
    }
    // status === 'pending' - continue polling
  }
  
  throw new Error('Device code expired');
}

/**
 * Check if browser can be opened automatically
 * @returns {boolean} True if browser can be opened
 */
function canOpenBrowser() {
  return process.stdout.isTTY && !process.env.CI && !process.env.NO_BROWSER;
}

/**
 * Open browser automatically
 * @param {string} url - URL to open
 * @returns {Promise<void>}
 */
async function openBrowser(url) {
  try {
    // Try using 'open' package first (cross-platform)
    const open = require('open');
    await open(url);
  } catch (error) {
    // Fallback to platform-specific commands
    try {
      const platform = os.platform();
      let command;
      
      if (platform === 'darwin') {
        command = `open "${url}"`;
      } else if (platform === 'win32') {
        command = `start "" "${url}"`;
      } else {
        command = `xdg-open "${url}"`;
      }
      
      exec(command, (err) => {
        if (err) {
          // Silent fail - browser opening is optional
        }
      });
    } catch (fallbackError) {
      // Silent fail - browser opening is optional
    }
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
  try {
    const clipboardy = require('clipboardy');
    await clipboardy.write(text);
  } catch (error) {
    // Silent fail - clipboard copy is optional
  }
}

/**
 * Show QR code for mobile authentication
 * @param {string} url - URL to encode in QR code
 */
function showQRCode(url) {
  try {
    const qrcode = require('qrcode-terminal');
    qrcode.generate(url, { small: true });
  } catch (error) {
    // Silent fail - QR code is optional
  }
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Poll for tokens with spinner and progress
 * @param {string} deviceCode - Device code
 * @param {number} interval - Polling interval in seconds
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} apiBaseUrl - API base URL
 * @returns {Promise<Object>} Credentials object
 */
async function pollForTokens({ deviceCode, interval, timeout, apiBaseUrl }) {
  const startTime = Date.now();
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinnerIndex = 0;
  let spinnerInterval = null;
  
  // Start spinner animation if stderr is TTY
  if (process.stderr.isTTY) {
    spinnerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stderr.write(
        `\r${spinner[spinnerIndex]} Waiting for authorization... (${elapsed}s)`
      );
      spinnerIndex = (spinnerIndex + 1) % spinner.length;
    }, 100);
  }
  
  try {
    while (true) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error('Authentication timeout. Please try again.');
      }
      
      try {
        // Poll for status
        const pollResponse = await pollDeviceFlow(deviceCode, apiBaseUrl);
        
        if (pollResponse.status === 'approved') {
          // Clear spinner
          if (spinnerInterval) {
            clearInterval(spinnerInterval);
            process.stderr.write('\r✅ Authorization confirmed!                    \n');
          }
          
          // Validate that we have required fields
          if (!pollResponse.accessToken) {
            throw new Error(`Invalid poll response: missing accessToken. Response: ${JSON.stringify(pollResponse)}`);
          }
          
          return pollResponse;
        }
        
        if (pollResponse.status === 'denied') {
          throw new Error('Authorization denied by user');
        }
        
        if (pollResponse.status === 'expired') {
          throw new Error('Device code expired');
        }
        
        // status === 'pending' - continue polling
        await sleep(interval * 1000);
        
      } catch (error) {
        // If network error, retry
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('No response')) {
          await sleep(interval * 1000);
          continue;
        }
        throw error;
      }
    }
  } finally {
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
      process.stderr.write('\r                                                \r');
    }
  }
}

/**
 * Interactive login with automatic browser opening and enhanced UX
 * @param {Object} options - Login options
 * @param {boolean} options.autoOpen - Automatically open browser (default: true)
 * @param {boolean} options.showQR - Show QR code (default: false)
 * @param {number} options.timeout - Timeout in milliseconds (default: 120000)
 * @param {string} options.apiBaseUrl - API base URL
 * @param {string} options.appUrl - App URL
 * @returns {Promise<Object>} Credentials object
 */
async function interactiveLogin(options = {}) {
  const {
    autoOpen = true,
    showQR = false,
    timeout = 120000,
    apiBaseUrl = null,
    appUrl = null
  } = options;
  
  const url = apiBaseUrl || getApiUrl();
  const frontendUrl = appUrl || getAppUrl();
  
  try {
    // Step 1: Get device code from server
    const startResponse = await startDeviceFlow(url);
    const { deviceCode, userCode, verificationUrl, expiresIn, interval } = startResponse;
    
    // Step 2: Build full URL
    let displayUrl = verificationUrl;
    
    // Check if verificationUrl already contains code in query parameter
    let urlHasCode = false;
    try {
      const urlObj = new URL(verificationUrl);
      if (urlObj.searchParams.has('code')) {
        urlHasCode = true;
      }
    } catch (e) {
      // URL parsing failed, continue
    }
    
    if (process.env.MELDOC_APP_URL || appUrl) {
      try {
        const urlObj = new URL(verificationUrl);
        const appUrlObj = new URL(frontendUrl);
        displayUrl = `${appUrlObj.origin}${urlObj.pathname}${urlObj.search}`;
      } catch (e) {
        displayUrl = verificationUrl;
      }
    }
    
    // If URL doesn't have code, add it as path parameter
    let fullUrl = displayUrl;
    if (!urlHasCode) {
      if (displayUrl.endsWith('/')) {
        fullUrl = `${displayUrl}${userCode}`;
      } else {
        fullUrl = `${displayUrl}/${userCode}`;
      }
    }
    
    // Step 3: Display authentication UI
    process.stderr.write('\n');
    process.stderr.write('╔═══════════════════════════════════════════════════════╗\n');
    process.stderr.write('║                                                       ║\n');
    process.stderr.write('║   🔐 Meldoc Authentication Required                  ║\n');
    process.stderr.write('║                                                       ║\n');
    process.stderr.write('╚═══════════════════════════════════════════════════════╝\n');
    process.stderr.write('\n');
    
    // Show QR code if requested
    if (showQR) {
      process.stderr.write('📱 Scan QR code with your phone:\n\n');
      showQRCode(fullUrl);
      process.stderr.write('\n');
    }
    
    // Show URL and code
    process.stderr.write(`🌐 Visit: ${fullUrl}\n`);
    process.stderr.write(`📝 Enter this code: ${userCode}\n\n`);
    process.stderr.write('───────────────────────────────────────────────────────\n\n');
    
    // Step 4: Automatically open browser if enabled
    const shouldOpenBrowser = autoOpen && canOpenBrowser();
    if (shouldOpenBrowser) {
      process.stderr.write('🚀 Opening browser automatically...\n\n');
      await openBrowser(fullUrl);
    } else if (!canOpenBrowser()) {
      process.stderr.write('⚠️  Please open the link manually in your browser\n\n');
    }
    
    // Step 5: Copy code to clipboard
    try {
      await copyToClipboard(userCode);
      process.stderr.write('✅ Code copied to clipboard!\n\n');
    } catch (error) {
      // Silent fail
    }
    
    // Step 6: Poll for authorization with spinner
    process.stderr.write('⏳ Waiting for authorization...\n\n');
    
    const pollResponse = await pollForTokens({
      deviceCode,
      interval,
      timeout,
      apiBaseUrl: url
    });
    
    // Step 7: Save credentials
    const credentials = {
      type: 'user_session',
      apiBaseUrl: url,
      user: pollResponse.user,
      tokens: {
        accessToken: pollResponse.accessToken,
        accessExpiresAt: pollResponse.expiresAt || new Date(Date.now() + 3600000).toISOString(),
        refreshToken: pollResponse.refreshToken || null
      },
      updatedAt: new Date().toISOString()
    };
    
    writeCredentials(credentials);
    
    process.stderr.write('\n✅ Successfully authenticated!\n\n');
    
    return credentials;
    
  } catch (error) {
    // Handle specific errors with helpful messages
    if (error.code === 'ECONNREFUSED' || error.message.includes('No response')) {
      process.stderr.write('\n❌ Cannot connect to Meldoc API\n');
      process.stderr.write('   Please check your internet connection\n\n');
    } else if (error.message.includes('timeout')) {
      process.stderr.write('\n⏱️  Authentication timed out\n');
      process.stderr.write('   Please try again or authenticate manually:\n');
      process.stderr.write('   npx @meldocio/mcp-stdio-proxy@latest auth login\n\n');
    } else if (error.message.includes('denied')) {
      process.stderr.write('\n🚫 Authentication was denied\n');
      process.stderr.write('   Please try again if this was a mistake\n\n');
    } else {
      process.stderr.write(`\n❌ Authentication failed: ${error.message}\n\n`);
      process.stderr.write('   Manual authentication:\n');
      process.stderr.write('   npx @meldocio/mcp-stdio-proxy@latest auth login\n\n');
    }
    
    throw error;
  }
}

module.exports = {
  startDeviceFlow,
  pollDeviceFlow,
  deviceFlowLogin,
  interactiveLogin,
  openBrowser,
  copyToClipboard,
  showQRCode,
  canOpenBrowser
};
