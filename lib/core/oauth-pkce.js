/**
 * OAuth 2.1 PKCE Authentication Flow
 *
 * Implements OAuth 2.1 authorization code flow with PKCE for agent authentication.
 * Uses a loopback redirect URI per RFC 8252.
 *
 * Server endpoints:
 *   POST /mcp/oauth/register  - dynamic client registration
 *   GET  /mcp/oauth/authorize - authorization page (in browser)
 *   POST /mcp/oauth/token     - code exchange + refresh token rotation
 */

const crypto = require('crypto')
const http = require('http')
const axios = require('axios')
const https = require('https')
const { URL, URLSearchParams } = require('url')
const { writeCredentials } = require('./credentials')
const { getApiUrl, getAppUrl } = require('./constants')
const { exec } = require('child_process')

/**
 * Generate a cryptographically random PKCE code verifier (base64url, 43-128 chars).
 * @returns {string}
 */
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Derive code challenge from verifier using S256 method.
 * @param {string} verifier
 * @returns {string} Base64url-encoded SHA-256 hash
 */
function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

/**
 * Start a local HTTP server on a random loopback port to receive the OAuth redirect.
 * @returns {Promise<{server, port, getCode}>}
 */
function startCallbackServer() {
  return new Promise((resolve, reject) => {
    let resolveCode
    const codePromise = new Promise((res) => { resolveCode = res })

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1')
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      if (error) {
        res.end('<html><body><h2>Authentication failed: ' + error + '</h2><p>You can close this tab.</p></body></html>')
      } else {
        res.end('<html><body><h2>Authentication successful!</h2><p>You can close this tab and return to the terminal.</p></body></html>')
      }

      resolveCode({ code, state, error })
    })

    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        port: server.address().port,
        getCode: () => codePromise
      })
    })

    server.on('error', reject)
  })
}

/**
 * Open a URL in the default browser (best-effort, ignores errors).
 * @param {string} url
 */
function openBrowser(url) {
  let command
  if (process.platform === 'darwin') {
    command = `open "${url}"`
  } else if (process.platform === 'win32') {
    command = `start "" "${url}"`
  } else {
    command = `xdg-open "${url}"`
  }
  exec(command, () => {}) // Ignore errors
}

/**
 * Register a new OAuth client with the server (dynamic client registration).
 * @param {string} apiBaseUrl
 * @param {string} redirectUri
 * @returns {Promise<string>} client_id
 */
async function registerClient(apiBaseUrl, redirectUri) {
  const response = await axios.post(`${apiBaseUrl}/mcp/oauth/register`, {
    redirect_uris: [redirectUri],
    client_name: 'meldoc-mcp-proxy'
  }, {
    timeout: 10000,
    httpsAgent: new https.Agent({ keepAlive: true })
  })

  if (!response.data.client_id) {
    throw new Error('OAuth registration failed: no client_id in response')
  }

  return response.data.client_id
}

/**
 * Exchange an authorization code for access + refresh tokens.
 * @param {string} apiBaseUrl
 * @param {string} code
 * @param {string} codeVerifier
 * @param {string} clientId
 * @param {string} redirectUri
 * @returns {Promise<{accessToken, refreshToken, expiresAt}>}
 */
async function exchangeCode(apiBaseUrl, code, codeVerifier, clientId, redirectUri) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    redirect_uri: redirectUri
  })

  const response = await axios.post(`${apiBaseUrl}/mcp/oauth/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
    httpsAgent: new https.Agent({ keepAlive: true })
  })

  const data = response.data
  if (!data.access_token) {
    throw new Error('Token exchange failed: no access_token in response')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
  }
}

/**
 * Refresh tokens using OAuth 2.1 refresh token rotation.
 * The server issues a new refresh token on each use (old token is revoked).
 * @param {string} apiBaseUrl
 * @param {string} refreshToken
 * @param {string} clientId
 * @returns {Promise<{accessToken, refreshToken, expiresAt}>}
 */
async function refreshOAuthToken(apiBaseUrl, refreshToken, clientId) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId
  })

  const response = await axios.post(`${apiBaseUrl}/mcp/oauth/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
    httpsAgent: new https.Agent({ keepAlive: true })
  })

  const data = response.data
  if (!data.access_token) {
    throw new Error('Token refresh failed: no access_token in response')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Server rotates the token
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
  }
}

/**
 * Perform interactive OAuth 2.1 PKCE login.
 * Opens browser, starts loopback callback server, exchanges code for tokens.
 * @param {Object} options
 * @param {string} [options.apiBaseUrl]
 * @param {string} [options.appUrl]
 * @param {number} [options.timeout=120000]
 * @returns {Promise<Object>} Credentials object
 */
async function pkceLogin(options = {}) {
  const {
    apiBaseUrl = null,
    appUrl = null,
    timeout = 120000
  } = options

  const apiUrl = apiBaseUrl || getApiUrl()
  const frontendUrl = appUrl || getAppUrl()

  const { server, port, getCode } = await startCallbackServer()
  const redirectUri = `http://127.0.0.1:${port}/callback`

  try {
    process.stderr.write('Registering OAuth client...\n')
    const clientId = await registerClient(apiUrl, redirectUri)

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state = crypto.randomBytes(16).toString('hex')

    const authParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      response_type: 'code'
    })

    const authUrl = `${frontendUrl}/mcp/oauth/authorize?${authParams.toString()}`

    process.stderr.write('\n╔═══════════════════════════════════════════════════════╗\n')
    process.stderr.write('║                                                       ║\n')
    process.stderr.write('║   🔐 Meldoc Authentication Required                  ║\n')
    process.stderr.write('║                                                       ║\n')
    process.stderr.write('╚═══════════════════════════════════════════════════════╝\n\n')
    process.stderr.write(`🌐 Visit: ${authUrl}\n\n`)
    process.stderr.write('🚀 Opening browser automatically...\n\n')

    openBrowser(authUrl)

    process.stderr.write('⏳ Waiting for authorization...\n\n')

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Authentication timeout. Please try again.')), timeout)
    )

    const { code, state: returnedState, error: callbackError } = await Promise.race([
      getCode(),
      timeoutPromise
    ])

    if (callbackError) throw new Error('OAuth error: ' + callbackError)
    if (returnedState !== state) throw new Error('OAuth state mismatch - possible CSRF attack')
    if (!code) throw new Error('No authorization code received')

    const tokens = await exchangeCode(apiUrl, code, codeVerifier, clientId, redirectUri)

    const credentials = {
      type: 'user_session',
      auth_method: 'pkce',
      client_id: clientId,
      apiBaseUrl: apiUrl,
      tokens: {
        accessToken: tokens.accessToken,
        accessExpiresAt: tokens.expiresAt,
        refreshToken: tokens.refreshToken
      },
      updatedAt: new Date().toISOString()
    }

    writeCredentials(credentials)

    process.stderr.write('\n✅ Successfully authenticated!\n\n')

    return credentials
  } finally {
    server.close()
  }
}

module.exports = {
  pkceLogin,
  refreshOAuthToken,
  generateCodeVerifier,
  generateCodeChallenge
}
