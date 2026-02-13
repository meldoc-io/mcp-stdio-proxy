/**
 * HTTP Error Handler
 *
 * Handles workspace-required and authentication errors from backend.
 * Consolidates error handling logic that was duplicated 3+ times in proxy.js
 */

const { JSON_RPC_ERROR_CODES, CUSTOM_ERROR_CODES } = require('../protocol/error-codes');
const { sendError, writeResponse } = require('../protocol/json-rpc');
const { LOG_LEVELS } = require('../constants');

/**
 * Get current log level
 */
function getLogLevel() {
  const level = (process.env.LOG_LEVEL || 'ERROR').toUpperCase();
  return LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : LOG_LEVELS.ERROR;
}

const LOG_LEVEL = getLogLevel();

/**
 * Log message based on level
 */
function log(level, message) {
  if (LOG_LEVEL >= level) {
    const levelName = Object.keys(LOG_LEVELS)[level] || 'UNKNOWN';
    process.stderr.write(`[${levelName}] ${message}\n`);
  }
}

/**
 * Check if error indicates workspace is required
 * @param {Object} error - Error object from response
 * @returns {boolean} True if workspace required
 */
function isWorkspaceRequiredError(error) {
  if (!error) return false;

  const errorCode = error.code;
  const errorMessage = String(error.message || '');
  const errorData = error.data || {};

  // Check for explicit workspace required code
  if (errorCode === 'WORKSPACE_REQUIRED' || errorData.code === 'WORKSPACE_REQUIRED') {
    return true;
  }

  // Check for workspace message in error
  const hasWorkspaceMessage =
    errorMessage.includes('Multiple workspaces available') ||
    errorMessage.includes('Specify workspace');

  // Server error with workspace message
  if (errorCode === JSON_RPC_ERROR_CODES.SERVER_ERROR && hasWorkspaceMessage) {
    return true;
  }

  return false;
}

/**
 * Check if error indicates authentication is required
 * @param {Object} error - Error object from response
 * @returns {boolean} True if auth required
 */
function isAuthRequiredError(error) {
  if (!error) return false;

  const errorCode = error.code;
  const errorData = error.data || {};

  return errorCode === 'AUTH_REQUIRED' || errorData.code === 'AUTH_REQUIRED';
}

/**
 * Handle workspace required error
 * @param {string|number} requestId - Request ID
 * @param {string} [toolName] - Tool name being called
 */
function handleWorkspaceRequiredError(requestId, toolName) {
  log(LOG_LEVELS.DEBUG, `Detected WORKSPACE_REQUIRED error for tool: ${toolName || 'unknown'}`);

  // Special handling for list_workspaces tool
  if (toolName === 'list_workspaces') {
    const message = `Backend requires workspace selection even for ${toolName}. Please set a default workspace using set_workspace tool first, or contact support if this persists.`;
    sendError(requestId, JSON_RPC_ERROR_CODES.SERVER_ERROR, message, {
      code: 'WORKSPACE_REQUIRED',
      hint: 'Try setting a default workspace first using set_workspace tool, or specify workspaceAlias/workspaceId in the tool call arguments.'
    });
    return;
  }

  // General workspace required message
  const message = 'Multiple workspaces available. Use list_workspaces tool to get list, then use set_workspace to set default workspace, or specify workspaceAlias or workspaceId parameter in tool call.';
  sendError(requestId, JSON_RPC_ERROR_CODES.SERVER_ERROR, message, {
    code: 'WORKSPACE_REQUIRED',
    hint: 'Use list_workspaces tool to get available workspaces, then use set_workspace to set default, or specify workspaceAlias or workspaceId in tool call.'
  });
}

/**
 * Handle authentication required error
 * @param {string|number} requestId - Request ID
 */
function handleAuthRequiredError(requestId) {
  const message = 'Authentication required. Run: npx @meldocio/mcp-stdio-proxy@latest auth login';
  sendError(requestId, CUSTOM_ERROR_CODES.AUTH_REQUIRED, message, {
    code: 'AUTH_REQUIRED',
    hint: 'Use auth_login_instructions tool to get login command'
  });
}

/**
 * Process backend response and handle special errors
 * @param {Object} response - Axios response object
 * @param {Object} request - Original request
 * @returns {boolean} True if error was handled, false if should be forwarded
 */
function handleBackendResponse(response, request) {
  const responseData = response.data || {};

  // Successful HTTP response (200, 201, etc.)
  if (response.status >= 200 && response.status < 300) {
    // Ensure response has id
    if (responseData && !responseData.id && request.id !== undefined) {
      responseData.id = request.id;
    }

    // Check for error in response data
    if (responseData.error) {
      const error = responseData.error;
      const toolName = request.params?.name;

      log(LOG_LEVELS.DEBUG, `Error response: code=${error.code}, message="${error.message}", toolName=${toolName}`);

      // Check for workspace required
      if (isWorkspaceRequiredError(error)) {
        handleWorkspaceRequiredError(request.id, toolName);
        return true; // Handled
      }

      // Check for auth required
      if (isAuthRequiredError(error)) {
        handleAuthRequiredError(request.id);
        return true; // Handled
      }

      // Forward unhandled errors as-is
      log(LOG_LEVELS.DEBUG, `Forwarding unhandled error: ${JSON.stringify(error)}`);
      writeResponse(responseData);
      return true; // Handled (forwarded)
    }

    // Success response - forward as-is
    writeResponse(responseData);
    return true; // Handled
  }

  // HTTP error status (400, 401, 404, etc.)
  log(LOG_LEVELS.DEBUG, `HTTP error status ${response.status}`);

  const errorMessage = responseData.error?.message ||
                      responseData.message ||
                      `HTTP ${response.status}: ${response.statusText}`;

  // Check for workspace/auth errors in HTTP error responses
  const error = responseData.error || responseData;

  if (isWorkspaceRequiredError(error)) {
    const toolName = request.params?.name;
    handleWorkspaceRequiredError(request.id, toolName);
    return true;
  }

  if (isAuthRequiredError(error)) {
    handleAuthRequiredError(request.id);
    return true;
  }

  // Forward other HTTP errors
  sendError(request.id, JSON_RPC_ERROR_CODES.SERVER_ERROR, errorMessage, {
    httpStatus: response.status,
    code: error.code || 'HTTP_ERROR'
  });
  return true;
}

module.exports = {
  isWorkspaceRequiredError,
  isAuthRequiredError,
  handleWorkspaceRequiredError,
  handleAuthRequiredError,
  handleBackendResponse
};
