#!/usr/bin/env node

const axios = require('axios');
const https = require('https');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');

// Get package info - try multiple paths for different installation scenarios
let pkg;
try {
  // Try relative path first (development)
  pkg = require('../package.json');
} catch (e) {
  try {
    // Try from node_modules (when installed)
    pkg = require(path.join(__dirname, '../../package.json'));
  } catch (e2) {
    // Fallback to hardcoded values
    pkg = {
      name: '@meldocio/mcp-stdio-proxy',
      version: '1.0.5'
    };
  }
}

// JSON-RPC error codes
const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000
};

// Custom error codes
const CUSTOM_ERROR_CODES = {
  AUTH_REQUIRED: -32001,
  NOT_FOUND: -32002,
  RATE_LIMIT: -32003
};

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Get token from environment or config file
// Priority: 1) MELDOC_TOKEN env var, 2) ~/.meldoc/config.json
function getToken() {
  // First, try environment variable (recommended)
  if (process.env.MELDOC_TOKEN) {
    return process.env.MELDOC_TOKEN;
  }
  
  // Fallback: try MELDOC_MCP_TOKEN for backward compatibility
  if (process.env.MELDOC_MCP_TOKEN) {
    return process.env.MELDOC_MCP_TOKEN;
  }
  
  // Then, try config file
  try {
    const os = require('os');
    const configPath = path.join(os.homedir(), '.meldoc', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.token) {
        return config.token;
      }
    }
  } catch (e) {
    // Silently ignore config file errors
  }
  
  return null;
}

// Configuration
const token = getToken();
const apiUrl = process.env.MELDOC_API_URL || 'https://api.meldoc.io';
const rpcEndpoint = `${apiUrl}/mcp/v1/rpc`;
const REQUEST_TIMEOUT = 25000; // 25 seconds (less than Claude Desktop's 30s timeout)
const LOG_LEVEL = getLogLevel(process.env.LOG_LEVEL || 'ERROR');

// Get log level from environment
function getLogLevel(level) {
  const upper = (level || '').toUpperCase();
  return LOG_LEVELS[upper] !== undefined ? LOG_LEVELS[upper] : LOG_LEVELS.ERROR;
}

// Logging function - all logs go to stderr
function log(level, message, ...args) {
  if (LOG_LEVEL >= level) {
    const prefix = `[${Object.keys(LOG_LEVELS)[level]}]`;
    process.stderr.write(`${prefix} ${message}\n`);
    if (args.length > 0 && LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      process.stderr.write(JSON.stringify(args, null, 2) + '\n');
    }
  }
}

// Buffer for incomplete lines
let buffer = '';

// Set stdin encoding
process.stdin.setEncoding('utf8');

// Handle stdin data
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  // Keep the last incomplete line in buffer
  buffer = lines.pop() || '';
  
  // Process complete lines
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines but don't exit
    if (trimmed) {
      handleLine(trimmed);
    }
  }
});

// Handle end of input
process.stdin.on('end', () => {
  // Process any remaining buffer
  if (buffer.trim()) {
    handleLine(buffer.trim());
  }
  // Don't exit - Claude Desktop may reconnect
  // The process will be terminated by Claude Desktop when needed
});

// Handle errors - don't exit, just log
process.stdin.on('error', (error) => {
  // Log to stderr but don't exit - Claude Desktop may close stdin
  // Silently handle stdin errors - they're normal when Claude Desktop closes the connection
});

// Handle stdout errors
process.stdout.on('error', (error) => {
  // If stdout is closed (e.g., Claude Desktop disconnected), exit gracefully
  if (error.code === 'EPIPE') {
    process.exit(0);
  }
});

// Handle SIGINT/SIGTERM for graceful shutdown
let isShuttingDown = false;
function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  log(LOG_LEVELS.INFO, `Received ${signal}, shutting down gracefully...`);
  // Give a moment for any pending requests to complete
  setTimeout(() => {
    process.exit(0);
  }, 100);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Handle a single line from stdin
 */
function handleLine(line) {
  // Skip empty lines
  if (!line || !line.trim()) {
    return;
  }
  
  try {
    const request = JSON.parse(line);
    handleRequest(request);
  } catch (parseError) {
    // Invalid JSON - try to extract id from the raw line if possible
    // For parse errors, we can't reliably get the id, so we skip the response
    // to avoid Zod validation errors in Claude Desktop (it doesn't accept id: null)
    // This is acceptable per JSON-RPC spec - parse errors can be ignored if id is unknown
    log(LOG_LEVELS.ERROR, `Parse error: ${parseError.message}`);
  }
}

/**
 * Validate JSON-RPC request
 */
function validateRequest(request) {
  if (!request || typeof request !== 'object') {
    return { valid: false, error: 'Request must be an object' };
  }
  
  // Allow requests without jsonrpc for compatibility (some MCP clients may omit it)
  if (request.jsonrpc && request.jsonrpc !== '2.0') {
    return { valid: false, error: 'jsonrpc must be "2.0"' };
  }
  
  // Allow requests without method if they're notifications (id is null/undefined)
  // But batch requests must be arrays
  if (!request.method && !Array.isArray(request) && request.id !== null && request.id !== undefined) {
    return { valid: false, error: 'Request must have a method or be a batch array' };
  }
  
  return { valid: true };
}

/**
 * Handle a JSON-RPC request
 */
async function handleRequest(request) {
  // Handle null/undefined requests
  if (!request) {
    return;
  }
  
  // Handle batch requests (array of requests)
  if (Array.isArray(request)) {
    // Process batch requests sequentially
    for (const req of request) {
      if (req) {
        // Check if this is a protocol method that should be handled locally
        const method = req.method;
        if (method === 'initialize') {
          handleInitialize(req);
        } else if (method === 'initialized' || method === 'notifications/initialized') {
          // Notification - no response needed
          continue;
        } else if (method === 'notifications/cancelled') {
          // Notification - no response needed
          continue;
        } else if (method === 'ping') {
          handlePing(req);
        } else if (method === 'resources/list') {
          handleResourcesList(req);
        } else {
          // Forward to backend
          await processSingleRequest(req);
        }
      }
    }
    return;
  }
  
  // Validate single request
  const validation = validateRequest(request);
  if (!validation.valid) {
    sendError(request.id, JSON_RPC_ERROR_CODES.INVALID_REQUEST, validation.error);
    return;
  }
  
  // Handle MCP protocol methods locally (not forwarded to backend)
  const method = request.method;
  if (method === 'initialize') {
    handleInitialize(request);
    return;
  } else if (method === 'initialized' || method === 'notifications/initialized') {
    // Notification - no response needed per MCP spec
    return;
  } else if (method === 'notifications/cancelled') {
    // Notification - no response needed
    return;
  } else if (method === 'ping') {
    handlePing(request);
    return;
  } else if (method === 'resources/list') {
    // Return empty resources list (resources not supported yet)
    handleResourcesList(request);
    return;
  }
  
  // All other methods (tools/*, etc.) are forwarded to backend
  await processSingleRequest(request);
}

/**
 * Handle MCP initialize method
 * This is called by Claude Desktop to establish the connection
 */
function handleInitialize(request) {
  const response = {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: {},
        resources: {}
      },
      serverInfo: {
        name: pkg.name,
        version: pkg.version
      }
    }
  };
  
  log(LOG_LEVELS.DEBUG, 'Initialize request received');
  process.stdout.write(JSON.stringify(response) + '\n');
  if (process.stdout.isTTY) {
    process.stdout.flush();
  }
}

/**
 * Handle MCP ping method (keep-alive)
 */
function handlePing(request) {
  const response = {
    jsonrpc: '2.0',
    id: request.id,
    result: {}
  };
  
  process.stdout.write(JSON.stringify(response) + '\n');
  if (process.stdout.isTTY) {
    process.stdout.flush();
  }
}

/**
 * Handle resources/list method
 * Returns empty list as resources are not supported yet
 */
function handleResourcesList(request) {
  const response = {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      resources: []
    }
  };
  
  process.stdout.write(JSON.stringify(response) + '\n');
  if (process.stdout.isTTY) {
    process.stdout.flush();
  }
}

/**
 * Process a single JSON-RPC request
 * Forwards the request to the backend MCP API
 */
async function processSingleRequest(request) {
  // Check token before making request
  if (!token) {
    sendError(request.id, CUSTOM_ERROR_CODES.AUTH_REQUIRED, 
              'Meldoc token not found. Set MELDOC_TOKEN environment variable or run: meldoc auth login');
    return;
  }
  
  try {
    // Ensure request has jsonrpc field
    const requestWithJsonRpc = {
      ...request,
      jsonrpc: request.jsonrpc || '2.0'
    };
    
    log(LOG_LEVELS.DEBUG, `Forwarding request: ${request.method || 'unknown'}`);
    
    // Make HTTP request to MCP API
    const response = await axios.post(rpcEndpoint, requestWithJsonRpc, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': `${pkg.name}/${pkg.version}`
      },
      timeout: REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      // Keep connection alive for better performance
      httpsAgent: new https.Agent({ keepAlive: true, keepAliveMsecs: 1000 })
    });
    
    // Handle successful response
    if (response.status >= 200 && response.status < 300) {
      const responseData = response.data;
      
      // Ensure response has jsonrpc and id if original request had id
      if (responseData && typeof responseData === 'object') {
        if (!responseData.jsonrpc) {
          responseData.jsonrpc = '2.0';
        }
        if (request.id !== undefined && responseData.id === undefined) {
          responseData.id = request.id;
        }
      }
      
      // Ensure stdout is flushed immediately
      process.stdout.write(JSON.stringify(responseData) + '\n');
      // Flush stdout to ensure data is sent immediately
      if (process.stdout.isTTY) {
        process.stdout.flush();
      }
    } else {
      // HTTP error status
      const errorMessage = response.data?.error?.message || 
                          response.data?.message || 
                          `HTTP ${response.status}: ${response.statusText}`;
      sendError(request.id, JSON_RPC_ERROR_CODES.SERVER_ERROR, errorMessage);
    }
  } catch (error) {
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const errorData = error.response.data;
      const errorMessage = errorData?.error?.message || 
                          errorData?.message || 
                          `HTTP ${status}: ${error.response.statusText}`;
      
      let errorCode = JSON_RPC_ERROR_CODES.SERVER_ERROR;
      if (status === 401) {
        errorCode = CUSTOM_ERROR_CODES.AUTH_REQUIRED;
      } else if (status === 404) {
        errorCode = CUSTOM_ERROR_CODES.NOT_FOUND;
      } else if (status === 429) {
        errorCode = CUSTOM_ERROR_CODES.RATE_LIMIT;
      }
      
      log(LOG_LEVELS.WARN, `HTTP error ${status}: ${errorMessage}`);
      sendError(request.id, errorCode, errorMessage, {
        status,
        code: errorData?.error?.code || `HTTP_${status}`
      });
    } else if (error.request) {
      // Request was made but no response received
      log(LOG_LEVELS.ERROR, `Network error: ${error.message || 'No response from server'}`);
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Network error: ${error.message || 'No response from server'}`, {
                  code: 'NETWORK_ERROR'
                });
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      log(LOG_LEVELS.WARN, `Request timeout after ${REQUEST_TIMEOUT}ms`);
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Request timeout after ${REQUEST_TIMEOUT}ms`, {
                  code: 'TIMEOUT'
                });
    } else {
      // Other errors
      log(LOG_LEVELS.ERROR, `Internal error: ${error.message || 'Unknown error'}`);
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Internal error: ${error.message || 'Unknown error'}`, {
                  code: 'INTERNAL_ERROR'
                });
    }
  }
}

/**
 * Send JSON-RPC error response
 */
function sendError(id, code, message, details) {
  // Only send error response if id is defined (not for notifications)
  // Claude Desktop's Zod schema doesn't accept null for id
  if (id === undefined || id === null) {
    // For notifications or parse errors without id, don't send response
    // or send without id field
    return;
  }
  
  const errorResponse = {
    jsonrpc: '2.0',
    id: id,
    error: {
      code: code,
      message: message
    }
  };
  
  // Add details if provided (for debugging)
  if (details && LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    errorResponse.error.data = details;
  }
  
  process.stdout.write(JSON.stringify(errorResponse) + '\n');
  // Flush stdout to ensure data is sent immediately
  if (process.stdout.isTTY) {
    process.stdout.flush();
  }
}
