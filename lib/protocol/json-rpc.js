/**
 * JSON-RPC 2.0 Protocol Utilities
 *
 * Handles JSON-RPC response formatting and sending.
 * Eliminates 8+ duplications of stdout write patterns throughout the codebase.
 */

const { LOG_LEVELS } = require('../core/constants');

/**
 * Get current log level from environment
 */
function getLogLevel() {
  const level = (process.env.LOG_LEVEL || 'ERROR').toUpperCase();
  return LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : LOG_LEVELS.ERROR;
}

const LOG_LEVEL = getLogLevel();

/**
 * Send JSON-RPC success response
 * @param {string|number} id - Request ID
 * @param {any} result - Result data
 */
function sendResponse(id, result) {
  if (id === undefined || id === null) {
    // Notification - no response needed
    return;
  }

  const response = {
    jsonrpc: '2.0',
    id: id,
    result: result
  };

  writeResponse(response);
}

/**
 * Send JSON-RPC error response
 * @param {string|number} id - Request ID
 * @param {number} code - Error code
 * @param {string} message - Error message
 * @param {Object} [details] - Optional error details
 */
function sendError(id, code, message, details) {
  // Only send error response if id is defined (not for notifications)
  // Claude Desktop's Zod schema doesn't accept null for id
  if (id === undefined || id === null) {
    // For notifications or parse errors without id, don't send response
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

  // Add details if provided and debug logging is enabled
  if (details && LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    errorResponse.error.data = details;
  }

  writeResponse(errorResponse);
}

/**
 * Write JSON-RPC response to stdout
 * Handles flushing and error cases
 * @param {Object} response - Response object to send
 */
function writeResponse(response) {
  try {
    const responseStr = JSON.stringify(response);
    process.stdout.write(responseStr + '\n');

    // Flush stdout to ensure data is sent immediately
    if (process.stdout.isTTY) {
      process.stdout.flush();
    }
  } catch (error) {
    // If stdout write fails, we can't do much - just log to stderr
    if (process.stderr) {
      process.stderr.write(`Failed to write response: ${error.message}\n`);
    }
  }
}

/**
 * Create a success response object (without sending)
 * @param {string|number} id - Request ID
 * @param {any} result - Result data
 * @returns {Object} Response object
 */
function createResponse(id, result) {
  return {
    jsonrpc: '2.0',
    id: id,
    result: result
  };
}

/**
 * Create an error response object (without sending)
 * @param {string|number} id - Request ID
 * @param {number} code - Error code
 * @param {string} message - Error message
 * @param {Object} [details] - Optional error details
 * @returns {Object} Error response object
 */
function createErrorResponse(id, code, message, details) {
  const errorResponse = {
    jsonrpc: '2.0',
    id: id,
    error: {
      code: code,
      message: message
    }
  };

  if (details && LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    errorResponse.error.data = details;
  }

  return errorResponse;
}

/**
 * Validate JSON-RPC request structure
 * @param {any} request - Request to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateRequest(request) {
  if (!request || typeof request !== 'object') {
    return { valid: false, error: 'Request must be an object' };
  }

  // Allow requests without jsonrpc for compatibility
  if (request.jsonrpc && request.jsonrpc !== '2.0') {
    return { valid: false, error: 'jsonrpc must be "2.0"' };
  }

  // Allow requests without method if they're notifications
  if (!request.method && !Array.isArray(request) && request.id !== null && request.id !== undefined) {
    return { valid: false, error: 'Request must have a method or be a batch array' };
  }

  return { valid: true };
}

/**
 * Check if a request is a notification (no id)
 * @param {Object} request - Request object
 * @returns {boolean} True if notification
 */
function isNotification(request) {
  return request.id === null || request.id === undefined;
}

/**
 * Extract method name from request
 * @param {Object} request - Request object
 * @returns {string|null} Method name or null
 */
function getMethodName(request) {
  return request && request.method ? request.method : null;
}

module.exports = {
  sendResponse,
  sendError,
  writeResponse,
  createResponse,
  createErrorResponse,
  validateRequest,
  isNotification,
  getMethodName
};
