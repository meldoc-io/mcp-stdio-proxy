#!/usr/bin/env node

/**
 * Meldoc MCP Stdio Proxy
 *
 * Thin stdio ↔ Streamable HTTP proxy implementing MCP transport (spec 2025-03-26).
 * Forwards all MCP protocol messages to the server-side MCP at /mcp.
 * Handles a small set of local tools (auth_status, auth_login_instructions,
 * set_workspace, get_workspace) directly.
 */

// Check for CLI commands first (auth, config, install, etc.)
const args = process.argv.slice(2);
if (args.length > 0) {
  const cmd = args[0];
  if (cmd === 'auth' || cmd === 'config' || cmd === 'install' ||
      cmd === 'uninstall' || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    require('./cli');
    return;
  }
}

const { StreamableHTTPProxy } = require('../lib/http/proxy');
const { handleToolsCall, isLocalTool } = require('../lib/mcp/tools-call');
const { handlePing, isNotification } = require('../lib/mcp/handlers');
const { getLocalToolsList } = require('../lib/protocol/tools-schema');
const { getAccessToken } = require('../lib/core/auth');
const { getApiUrl, LOG_LEVELS } = require('../lib/core/constants');

let pkg;
try { pkg = require('../package.json'); } catch (e) { pkg = { name: '@meldocio/mcp-stdio-proxy', version: '1.0.0' }; }

// Log level
const LOG_LEVEL = (() => {
  const level = (process.env.LOG_LEVEL || 'ERROR').toUpperCase();
  return LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : LOG_LEVELS.ERROR;
})();

function log(level, message) {
  if (LOG_LEVEL >= level) {
    process.stderr.write(`[${Object.keys(LOG_LEVELS)[level] || 'UNKNOWN'}] ${message}\n`);
  }
}

// Create the Streamable HTTP proxy
const proxy = new StreamableHTTPProxy(
  getApiUrl() + '/mcp',
  async () => {
    const tokenInfo = await getAccessToken();
    return tokenInfo ? tokenInfo.token : null;
  }
)

/**
 * Inject local tools into a tools/list response from the server.
 * @param {string} responseText - Raw JSON-RPC response text from server
 * @returns {string} Modified response with local tools prepended
 */
function injectLocalTools(responseText) {
  try {
    const parsed = JSON.parse(responseText);
    if (parsed.result && Array.isArray(parsed.result.tools)) {
      const localTools = getLocalToolsList();
      const serverToolNames = new Set(parsed.result.tools.map(t => t.name));
      // Prepend local tools that aren't already in the server list
      const toInject = localTools.filter(t => !serverToolNames.has(t.name));
      parsed.result.tools = [...toInject, ...parsed.result.tools];
      return JSON.stringify(parsed);
    }
  } catch (e) {
    // If parsing fails, return original text unchanged
  }
  return responseText;
}

/**
 * Handle a single parsed JSON-RPC request.
 * @param {Object} request
 */
async function handleRequest(request) {
  if (!request || typeof request !== 'object') return;

  const { method, id } = request;

  // Basic validation: method is required
  if (!method) {
    if (id != null) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0', id,
        error: { code: -32600, message: 'Invalid Request: missing method' }
      }) + '\n');
    }
    return;
  }

  // Notifications require no response
  if (isNotification(method)) return;

  // ping is handled locally (fast keep-alive)
  if (method === 'ping') {
    handlePing(request);
    return;
  }

  // tools/call: check if it's a local tool first
  if (method === 'tools/call') {
    const toolName = request.params && request.params.name;
    if (isLocalTool(toolName)) {
      await handleToolsCall(request);
      return;
    }
  }

  // initialize: handled locally so Claude Desktop gets a fast response
  // even if the server is temporarily unavailable.
  // The server session is initialized lazily on the first forwarded request.
  if (method === 'initialize') {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: pkg.name, version: pkg.version }
      }
    }) + '\n');
    return;
  }

  // tools/list: forward to server and inject local tools
  if (method === 'tools/list') {
    // Intercept stdout temporarily to inject local tools
    const origWrite = process.stdout.write.bind(process.stdout);
    let captured = '';
    let done = false;

    process.stdout.write = (chunk) => {
      if (!done) {
        captured += chunk.toString();
        // Check if we have a complete line
        const lines = captured.split('\n');
        if (lines.length > 1) {
          done = true;
          process.stdout.write = origWrite;
          const modified = injectLocalTools(lines[0]);
          origWrite(modified + '\n');
          // Write any remaining lines
          for (let i = 1; i < lines.length - 1; i++) {
            if (lines[i]) origWrite(lines[i] + '\n');
          }
        }
      } else {
        origWrite(chunk);
      }
      return true;
    };

    try {
      await proxy.forwardAndWrite(request);
    } finally {
      if (!done) {
        process.stdout.write = origWrite;
        if (captured.trim()) {
          origWrite(injectLocalTools(captured.trim()) + '\n');
        }
      }
    }
    return;
  }

  // Everything else: forward to server
  await proxy.forwardAndWrite(request);
}

/**
 * Handle a raw JSON line from stdin.
 */
async function handleLine(line) {
  if (!line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
  } catch (e) {
    log(LOG_LEVELS.ERROR, 'Parse error: ' + e.message);
    return;
  }

  try {
    if (Array.isArray(request)) {
      // Batch requests
      for (const req of request) {
        try {
          await handleRequest(req);
        } catch (err) {
          log(LOG_LEVELS.ERROR, 'Batch request error: ' + err.message);
          if (req && req.id != null) {
            process.stdout.write(JSON.stringify({
              jsonrpc: '2.0', id: req.id,
              error: { code: -32603, message: err.message }
            }) + '\n');
          }
        }
      }
    } else {
      await handleRequest(request);
    }
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'Unexpected error: ' + err.message);
    if (request && request.id != null) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0', id: request.id,
        error: { code: -32603, message: err.message }
      }) + '\n');
    }
  }
}

// Stdin/stdout setup
let buffer = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (line.trim()) handleLine(line.trim());
  }
});

process.stdin.on('end', () => {
  if (buffer.trim()) handleLine(buffer.trim());
});

process.stdin.on('error', () => {});

process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
});

// Graceful shutdown
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(LOG_LEVELS.INFO, `Received ${signal}, shutting down`);
  setTimeout(() => process.exit(0), 100);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

log(LOG_LEVELS.DEBUG, 'Meldoc MCP Stdio Proxy started');
