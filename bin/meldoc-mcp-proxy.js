#!/usr/bin/env node

/**
 * Meldoc MCP Stdio Proxy
 *
 * Thin proxy that handles MCP protocol and forwards requests to Meldoc API.
 * Most logic has been extracted to lib/ modules for better maintainability.
 */

const { validateRequest } = require('../lib/protocol/json-rpc');
const { sendError } = require('../lib/protocol/json-rpc');
const { JSON_RPC_ERROR_CODES } = require('../lib/protocol/error-codes');
const { handleLocalMethod } = require('../lib/mcp/handlers');
const { handleToolsCall } = require('../lib/mcp/tools-call');
const { makeBackendRequest } = require('../lib/http/client');
const { handleBackendResponse } = require('../lib/http/error-handler');
const { LOG_LEVELS } = require('../lib/core/constants');

// Check for CLI commands first
const args = process.argv.slice(2);
if (args.length > 0) {
  const command = args[0];
  if (command === 'auth' || command === 'config' || command === 'install' ||
      command === 'uninstall' || command === 'help' || command === '--help' || command === '-h') {
    require('./cli');
    return;
  }
}

/**
 * Get log level from environment
 */
function getLogLevel() {
  const level = (process.env.LOG_LEVEL || 'ERROR').toUpperCase();
  return LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : LOG_LEVELS.ERROR;
}

const LOG_LEVEL = getLogLevel();

/**
 * Log message to stderr
 */
function log(level, message) {
  if (LOG_LEVEL >= level) {
    const levelName = Object.keys(LOG_LEVELS)[level] || 'UNKNOWN';
    process.stderr.write(`[${levelName}] ${message}\n`);
  }
}

/**
 * Process single request to backend
 */
async function processSingleRequest(request) {
  try {
    const response = await makeBackendRequest(request);
    handleBackendResponse(response, request);
  } catch (error) {
    // Handle request errors (network, timeout, etc.)
    if (error.code === 'ECONNABORTED') {
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
                `Request timeout after ${error.timeout || 25000}ms`, {
                  code: 'TIMEOUT'
                });
    } else {
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
                `Failed to communicate with backend: ${error.message}`, {
                  code: 'BACKEND_ERROR'
                });
    }
  }
}

/**
 * Handle a JSON-RPC request
 */
async function handleRequest(request) {
  if (!request) return;

  try {
    // Handle batch requests
    if (Array.isArray(request)) {
      for (const req of request) {
        if (req) {
          try {
            await handleSingleRequest(req);
          } catch (error) {
            log(LOG_LEVELS.ERROR, `Error processing batch request: ${error.message || 'Unknown error'}`);
            if (req && req.id !== undefined && req.id !== null) {
              sendError(req.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
                        `Error processing request: ${error.message || 'Unknown error'}`, {
                          code: 'INTERNAL_ERROR'
                        });
            }
          }
        }
      }
      return;
    }

    // Handle single request
    await handleSingleRequest(request);
  } catch (error) {
    log(LOG_LEVELS.ERROR, `Unexpected error in handleRequest: ${error.message || 'Unknown error'}`);
    if (request && request.id !== undefined && request.id !== null) {
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
                `Error processing request: ${error.message || 'Unknown error'}`, {
                  code: 'INTERNAL_ERROR'
                });
    }
  }
}

/**
 * Handle a single JSON-RPC request
 */
async function handleSingleRequest(request) {
  // Validate request
  const validation = validateRequest(request);
  if (!validation.valid) {
    sendError(request.id, JSON_RPC_ERROR_CODES.INVALID_REQUEST, validation.error);
    return;
  }

  const method = request.method;

  // Handle local MCP methods (initialize, ping, tools/list, etc.)
  if (handleLocalMethod(request)) {
    return; // Handled locally
  }

  // Handle tools/call (may be local or proxied)
  if (method === 'tools/call') {
    const handled = await handleToolsCall(request);
    if (handled) {
      return; // Handled locally
    }
    // Fall through to proxy to backend
  }

  // Forward all other methods to backend
  await processSingleRequest(request);
}

/**
 * Handle a single line from stdin
 */
function handleLine(line) {
  if (!line || !line.trim()) return;

  try {
    const request = JSON.parse(line);
    handleRequest(request);
  } catch (parseError) {
    log(LOG_LEVELS.ERROR, `Parse error: ${parseError.message}`);
  }
}

/**
 * Setup stdin/stdout handling
 */
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      handleLine(trimmed);
    }
  }
});

process.stdin.on('end', () => {
  if (buffer.trim()) {
    handleLine(buffer.trim());
  }
});

process.stdin.on('error', (error) => {
  // Silently handle stdin errors - normal when Claude Desktop closes connection
});

process.stdout.on('error', (error) => {
  // Exit gracefully on EPIPE (stdout closed)
  if (error.code === 'EPIPE') {
    process.exit(0);
  }
});

/**
 * Graceful shutdown handling
 */
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log(LOG_LEVELS.INFO, `Received ${signal}, shutting down gracefully...`);
  setTimeout(() => process.exit(0), 100);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start message
log(LOG_LEVELS.DEBUG, 'Meldoc MCP Stdio Proxy started');
