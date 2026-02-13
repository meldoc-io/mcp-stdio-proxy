/**
 * MCP tools/call Handler
 *
 * Handles tools/call requests - routes to local tools or backend.
 * Local tools: set_workspace, get_workspace, auth_status, auth_login_instructions
 */

const { sendResponse, sendError } = require('../protocol/json-rpc');
const { JSON_RPC_ERROR_CODES } = require('../protocol/error-codes');
const { getAuthStatus } = require('../auth');
const { setWorkspaceAlias, getWorkspaceAlias } = require('../config');
const { LOG_LEVELS } = require('../constants');

/**
 * Get log level
 */
function getLogLevel() {
  const level = (process.env.LOG_LEVEL || 'ERROR').toUpperCase();
  return LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : LOG_LEVELS.ERROR;
}

const LOG_LEVEL = getLogLevel();

/**
 * Log message
 */
function log(level, message) {
  if (LOG_LEVEL >= level) {
    const levelName = Object.keys(LOG_LEVELS)[level] || 'UNKNOWN';
    process.stderr.write(`[${levelName}] ${message}\n`);
  }
}

/**
 * Create MCP tool response with text content
 * @param {string} text - Text content
 * @returns {Object} MCP result object
 */
function createToolResponse(text) {
  return {
    content: [
      {
        type: 'text',
        text: text
      }
    ]
  };
}

/**
 * Handle set_workspace tool
 * @param {Object} request - JSON-RPC request
 * @param {Object} arguments_ - Tool arguments
 */
function handleSetWorkspace(request, arguments_) {
  const alias = arguments_.alias;
  if (!alias || typeof alias !== 'string') {
    sendError(request.id, JSON_RPC_ERROR_CODES.INVALID_PARAMS, 'alias parameter is required and must be a string');
    return;
  }

  try {
    setWorkspaceAlias(alias);
    sendResponse(request.id, createToolResponse(`Workspace alias set to: ${alias}`));
  } catch (error) {
    sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, `Failed to set workspace alias: ${error.message}`);
  }
}

/**
 * Handle get_workspace tool
 * @param {Object} request - JSON-RPC request
 */
function handleGetWorkspace(request) {
  try {
    const workspaceAlias = getWorkspaceAlias();
    const result = {
      workspaceAlias: workspaceAlias || null,
      source: workspaceAlias ? 'config' : 'not_found',
      message: workspaceAlias ? `Current workspace: ${workspaceAlias}` : 'No workspace set in config'
    };
    sendResponse(request.id, createToolResponse(JSON.stringify(result, null, 2)));
  } catch (error) {
    sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, `Failed to get workspace: ${error.message}`);
  }
}

/**
 * Handle auth_status tool
 * @param {Object} request - JSON-RPC request
 */
async function handleAuthStatus(request) {
  try {
    const authStatus = await getAuthStatus();
    if (!authStatus) {
      const result = {
        authenticated: false,
        message: 'Not authenticated. Run: npx @meldocio/mcp-stdio-proxy@latest auth login'
      };
      sendResponse(request.id, createToolResponse(JSON.stringify(result, null, 2)));
      return;
    }

    sendResponse(request.id, createToolResponse(JSON.stringify(authStatus, null, 2)));
  } catch (error) {
    sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, `Failed to get auth status: ${error.message}`);
  }
}

/**
 * Handle auth_login_instructions tool
 * @param {Object} request - JSON-RPC request
 */
function handleAuthLoginInstructions(request) {
  const text = 'To authenticate, run the following command:\n\n```bash\nnpx @meldocio/mcp-stdio-proxy@latest auth login\n```';
  sendResponse(request.id, createToolResponse(text));
}

/**
 * Check if tool should be handled locally
 * @param {string} toolName - Tool name
 * @returns {boolean} True if local tool
 */
function isLocalTool(toolName) {
  const localTools = [
    'set_workspace',
    'get_workspace',
    'auth_status',
    'auth_login_instructions'
  ];
  return localTools.includes(toolName);
}

/**
 * Handle tools/call for local tools
 * @param {Object} request - JSON-RPC request
 * @returns {Promise<boolean>} True if handled locally, false if should be proxied
 */
async function handleToolsCall(request) {
  const toolName = request.params?.name;
  const arguments_ = request.params?.arguments || {};

  log(LOG_LEVELS.DEBUG, `handleToolsCall: toolName=${toolName}`);

  if (!isLocalTool(toolName)) {
    return false; // Not a local tool, should be proxied
  }

  // Handle local tools
  try {
    switch (toolName) {
      case 'set_workspace':
        handleSetWorkspace(request, arguments_);
        break;
      case 'get_workspace':
        handleGetWorkspace(request);
        break;
      case 'auth_status':
        await handleAuthStatus(request);
        break;
      case 'auth_login_instructions':
        handleAuthLoginInstructions(request);
        break;
    }
    return true; // Handled
  } catch (error) {
    log(LOG_LEVELS.ERROR, `Unexpected error in handleToolsCall: ${error.message || 'Unknown error'}`);
    sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
              `Error executing tool: ${error.message || 'Unknown error'}`, {
                code: 'INTERNAL_ERROR'
              });
    return true; // Error handled
  }
}

module.exports = {
  handleToolsCall,
  isLocalTool
};
