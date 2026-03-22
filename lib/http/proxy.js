/**
 * Streamable HTTP Proxy for MCP
 *
 * Implements MCP Streamable HTTP transport (spec 2025-03-26).
 * Mirrors the Go implementation in meldoc.cli/cli/internal/mcp/proxy.go
 */

const https = require('https')
const http = require('http')
const { URL } = require('url')

const REQUEST_TIMEOUT = 60000

/**
 * StreamableHTTPProxy forwards JSON-RPC requests from stdio to a remote MCP HTTP server.
 */
class StreamableHTTPProxy {
  /**
   * @param {string} remoteURL - Full URL of the MCP endpoint (e.g. https://api.meldoc.io/mcp)
   * @param {Function} getToken - Async function that returns the auth token string (or null)
   */
  constructor(remoteURL, getToken) {
    this.remoteURL = remoteURL
    this.getToken = getToken
    this.sessionId = null
  }

  /**
   * Send the initialize request and store the session ID.
   * @param {*} id - Request ID
   * @param {*} params - Initialize params (may be null)
   * @returns {Promise<Object>} Full JSON-RPC response object (not just result)
   */
  async initialize(id, params) {
    const body = { jsonrpc: '2.0', id, method: 'initialize' }
    if (params) body.params = params

    const { response, newSessionId } = await this._doRequest(body, '')

    if (newSessionId) this.sessionId = newSessionId

    const text = await this._readBody(response)
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      throw new Error('Failed to parse initialize response: ' + text)
    }

    if (parsed.error) {
      throw new Error(`Initialize error ${parsed.error.code}: ${parsed.error.message}`)
    }

    return parsed
  }

  /**
   * Forward a JSON-RPC request to the remote server and write all responses to stdout.
   * Handles session expiry (HTTP 404) by re-initializing and retrying once.
   * For SSE responses each event is written as a separate newline-delimited line.
   * @param {Object} request - JSON-RPC request object
   */
  async forwardAndWrite(request) {
    const body = {
      jsonrpc: request.jsonrpc || '2.0',
      id: request.id,
      method: request.method
    }
    if (request.params !== undefined) body.params = request.params

    let result
    try {
      result = await this._doRequest(body, this.sessionId || '')
    } catch (err) {
      if (err.statusCode === 404) {
        // Session expired — re-initialize and retry once
        try {
          await this.initialize(0, null)
        } catch (reinitErr) {
          this._writeError(request.id, -32603, 'Session re-initialization failed: ' + reinitErr.message)
          return
        }
        try {
          result = await this._doRequest(body, this.sessionId || '')
        } catch (retryErr) {
          this._writeError(request.id, -32603, retryErr.message)
          return
        }
      } else if (err.statusCode === 401 || err.statusCode === 403) {
        this._writeError(request.id, -32002, 'Authentication failed: ' + (err.body || 'unauthorized'))
        return
      } else {
        this._writeError(request.id, -32603, err.message)
        return
      }
    }

    const { response, newSessionId } = result
    if (newSessionId) this.sessionId = newSessionId

    const contentType = response.headers['content-type'] || ''
    if (contentType.includes('text/event-stream')) {
      await this._streamSSE(response)
    } else {
      const text = await this._readBody(response)
      if (text.trim()) process.stdout.write(text.trim() + '\n')
    }
  }

  /**
   * Perform the raw HTTP POST to the remote server.
   * @param {Object} body - JSON body to send
   * @param {string} sessionId - Session ID header value (empty string to omit)
   * @returns {Promise<{response: IncomingMessage, newSessionId: string}>}
   */
  async _doRequest(body, sessionId) {
    const token = await this.getToken()
    const data = JSON.stringify(body)
    const url = new URL(this.remoteURL)
    const isHttps = url.protocol === 'https:'
    const port = url.port ? parseInt(url.port) : (isHttps ? 443 : 80)

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(data)
    }

    if (token) headers['Authorization'] = 'Bearer ' + token
    if (sessionId) headers['Mcp-Session-Id'] = sessionId

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port,
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers,
        timeout: REQUEST_TIMEOUT
      }

      const mod = isHttps ? https : http
      const req = mod.request(options, (res) => {
        const newSessionId = res.headers['mcp-session-id'] || ''

        if (res.statusCode < 200 || res.statusCode >= 300) {
          let errBody = ''
          res.on('data', (chunk) => { errBody += chunk })
          res.on('end', () => {
            const err = new Error(`HTTP ${res.statusCode}: ${errBody.trim()}`)
            err.statusCode = res.statusCode
            err.body = errBody.trim()
            reject(err)
          })
          return
        }

        resolve({ response: res, newSessionId })
      })

      req.on('timeout', () => {
        req.destroy()
        const err = new Error('Request timeout')
        err.statusCode = 408
        reject(err)
      })

      req.on('error', reject)

      req.write(data)
      req.end()
    })
  }

  /**
   * Stream an SSE response, writing each data event as a line to stdout.
   * @param {IncomingMessage} response
   */
  _streamSSE(response) {
    return new Promise((resolve, reject) => {
      let buffer = ''

      response.on('data', (chunk) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() // Keep incomplete last line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data && data !== '[DONE]') process.stdout.write(data + '\n')
          }
        }
      })

      response.on('end', () => {
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6)
          if (data && data !== '[DONE]') process.stdout.write(data + '\n')
        }
        resolve()
      })

      response.on('error', reject)
    })
  }

  /**
   * Read full response body as a string.
   * @param {IncomingMessage} response
   * @returns {Promise<string>}
   */
  _readBody(response) {
    return new Promise((resolve, reject) => {
      let body = ''
      response.on('data', (chunk) => { body += chunk })
      response.on('end', () => resolve(body))
      response.on('error', reject)
    })
  }

  /**
   * Write a JSON-RPC error to stdout.
   */
  _writeError(id, code, message) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n')
  }
}

module.exports = { StreamableHTTPProxy }
