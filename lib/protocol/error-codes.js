/**
 * JSON-RPC and Custom Error Codes
 *
 * This module centralizes all error code definitions and error message formatting
 * for the Meldoc MCP proxy.
 */

/**
 * Standard JSON-RPC 2.0 error codes
 * @see https://www.jsonrpc.org/specification#error_object
 */
const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,      // Invalid JSON was received by the server
  INVALID_REQUEST: -32600,  // The JSON sent is not a valid Request object
  METHOD_NOT_FOUND: -32601, // The method does not exist / is not available
  INVALID_PARAMS: -32602,   // Invalid method parameter(s)
  INTERNAL_ERROR: -32603,   // Internal JSON-RPC error
  SERVER_ERROR: -32000      // Generic server error (implementation-defined)
};

/**
 * Custom application error codes
 * Using the reserved range -32000 to -32099 for server errors
 */
const CUSTOM_ERROR_CODES = {
  AUTH_REQUIRED: -32001,  // Authentication required but not provided
  NOT_FOUND: -32002,      // Requested resource not found
  RATE_LIMIT: -32003      // Rate limit exceeded
};

/**
 * All error codes combined
 */
const ALL_ERROR_CODES = {
  ...JSON_RPC_ERROR_CODES,
  ...CUSTOM_ERROR_CODES
};

/**
 * HTTP status code mappings for common errors
 */
const HTTP_STATUS_CODES = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Get a human-readable error name from error code
 * @param {number} code - The error code
 * @returns {string} Error name or 'UNKNOWN_ERROR'
 */
function getErrorName(code) {
  const entry = Object.entries(ALL_ERROR_CODES).find(([_, value]) => value === code);
  return entry ? entry[0] : 'UNKNOWN_ERROR';
}

/**
 * Check if an error code represents an authentication error
 * @param {number} code - The error code
 * @returns {boolean} True if authentication error
 */
function isAuthError(code) {
  return code === CUSTOM_ERROR_CODES.AUTH_REQUIRED ||
         code === HTTP_STATUS_CODES.UNAUTHORIZED ||
         code === HTTP_STATUS_CODES.FORBIDDEN;
}

/**
 * Check if an error code represents a client error (4xx)
 * @param {number} code - The error code
 * @returns {boolean} True if client error
 */
function isClientError(code) {
  return code >= 400 && code < 500;
}

/**
 * Check if an error code represents a server error (5xx)
 * @param {number} code - The error code
 * @returns {boolean} True if server error
 */
function isServerError(code) {
  return code >= 500 && code < 600;
}

/**
 * Format error message with additional context
 * @param {string} message - Base error message
 * @param {Object} details - Additional error details
 * @returns {string} Formatted error message
 */
function formatErrorMessage(message, details = {}) {
  let formatted = message;

  if (details.code) {
    formatted += ` (code: ${details.code})`;
  }

  if (details.hint) {
    formatted += `\nHint: ${details.hint}`;
  }

  return formatted;
}

/**
 * Create standard error data object
 * @param {string} code - Error code identifier
 * @param {string} [hint] - Optional hint for resolving the error
 * @param {Object} [additional] - Additional error context
 * @returns {Object} Error data object
 */
function createErrorData(code, hint = null, additional = {}) {
  const data = {
    code,
    ...additional
  };

  if (hint) {
    data.hint = hint;
  }

  return data;
}

module.exports = {
  JSON_RPC_ERROR_CODES,
  CUSTOM_ERROR_CODES,
  ALL_ERROR_CODES,
  HTTP_STATUS_CODES,
  getErrorName,
  isAuthError,
  isClientError,
  isServerError,
  formatErrorMessage,
  createErrorData
};
