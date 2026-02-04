#!/usr/bin/env node

const axios = require('axios');
const https = require('https');
const { URL } = require('url');

// JSON-RPC error codes
const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000
};

// Configuration
const token = process.env.MELDOC_MCP_TOKEN;
const apiUrl = process.env.MELDOC_API_URL || 'https://api.meldoc.io';
const rpcEndpoint = `${apiUrl}/mcp/v1/rpc`;
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Validate token
if (!token) {
  console.error('Error: MELDOC_MCP_TOKEN environment variable is required');
  process.exit(1);
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
    // Invalid JSON - send parse error
    sendError(null, JSON_RPC_ERROR_CODES.PARSE_ERROR, `Parse error: ${parseError.message}`);
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
        await processSingleRequest(req);
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
  
  await processSingleRequest(request);
}

/**
 * Process a single JSON-RPC request
 */
async function processSingleRequest(request) {
  try {
    // Ensure request has jsonrpc field
    const requestWithJsonRpc = {
      ...request,
      jsonrpc: request.jsonrpc || '2.0'
    };
    
    // Make HTTP request to MCP API
    const response = await axios.post(rpcEndpoint, requestWithJsonRpc, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': '@meldocio/mcp-stdio-proxy/1.0.0'
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
        errorCode = JSON_RPC_ERROR_CODES.INTERNAL_ERROR;
      } else if (status === 404) {
        errorCode = JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND;
      }
      
      sendError(request.id, errorCode, errorMessage);
    } else if (error.request) {
      // Request was made but no response received
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Network error: ${error.message || 'No response from server'}`);
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Request timeout after ${REQUEST_TIMEOUT}ms`);
    } else {
      // Other errors
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Internal error: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Send JSON-RPC error response
 */
function sendError(id, code, message) {
  const errorResponse = {
    jsonrpc: '2.0',
    id: id !== undefined ? id : null,
    error: {
      code: code,
      message: message
    }
  };
  
  process.stdout.write(JSON.stringify(errorResponse) + '\n');
  // Flush stdout to ensure data is sent immediately
  if (process.stdout.isTTY) {
    process.stdout.flush();
  }
}
