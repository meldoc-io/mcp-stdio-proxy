/**
 * MCP Protocol Method Handlers
 *
 * Handles MCP protocol methods (initialize, ping, tools/list, etc.)
 * These are handled locally and not proxied to the backend.
 */

const { sendResponse, sendError } = require('../protocol/json-rpc');
const { getToolsList } = require('../protocol/tools-schema');
const { JSON_RPC_ERROR_CODES } = require('../protocol/error-codes');
const { LOG_LEVELS, MCP_PROTOCOL_VERSION, SERVER_CAPABILITIES } = require('../core/constants');

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
 * Get package info
 */
function getPackageInfo() {
  try {
    const pkg = require('../../package.json');
    return { name: pkg.name, version: pkg.version };
  } catch (error) {
    return { name: '@meldocio/mcp-stdio-proxy', version: '1.0.0' };
  }
}

/**
 * Handle MCP initialize method
 * @param {Object} request - JSON-RPC request
 */
function handleInitialize(request) {
  const pkg = getPackageInfo();

  const result = {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {
      tools: SERVER_CAPABILITIES.TOOLS ? {} : undefined,
      resources: SERVER_CAPABILITIES.RESOURCES ? {} : undefined,
      prompts: SERVER_CAPABILITIES.PROMPTS ? {} : undefined,
      logging: SERVER_CAPABILITIES.LOGGING ? {} : undefined
    },
    serverInfo: {
      name: pkg.name,
      version: pkg.version
    }
  };

  // Remove undefined capabilities
  Object.keys(result.capabilities).forEach(key => {
    if (result.capabilities[key] === undefined) {
      delete result.capabilities[key];
    }
  });

  log(LOG_LEVELS.DEBUG, 'Initialize request received');
  sendResponse(request.id, result);
}

/**
 * Handle MCP ping method (keep-alive)
 * @param {Object} request - JSON-RPC request
 */
function handlePing(request) {
  sendResponse(request.id, {});
}

/**
 * Handle resources/list method
 * Returns empty list as resources are not supported yet
 * @param {Object} request - JSON-RPC request
 */
function handleResourcesList(request) {
  sendResponse(request.id, {
    resources: []
  });
}

/**
 * Handle tools/list method
 * Always returns static list locally, never proxies to backend
 * @param {Object} request - JSON-RPC request
 */
function handleToolsList(request) {
  try {
    const tools = getToolsList();

    // Log tool names for debugging
    const toolNames = tools.map(t => t.name).join(', ');
    log(LOG_LEVELS.INFO, `Returning ${tools.length} tools locally: ${toolNames}`);

    sendResponse(request.id, {
      tools: tools
    });
  } catch (error) {
    // This should never happen, but if it does, send error response
    log(LOG_LEVELS.ERROR, `Unexpected error in handleToolsList: ${error.message || 'Unknown error'}`);
    log(LOG_LEVELS.DEBUG, `Error stack: ${error.stack || 'No stack trace'}`);

    sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
              `Failed to get tools list: ${error.message || 'Unknown error'}`, {
                code: 'INTERNAL_ERROR'
              });
  }
}

/**
 * Check if a method should be handled locally
 * @param {string} method - Method name
 * @returns {boolean} True if should be handled locally
 */
function isLocalMethod(method) {
  const localMethods = [
    'initialize',
    'initialized',
    'notifications/initialized',
    'notifications/cancelled',
    'ping',
    'resources/list',
    'tools/list'
  ];
  return localMethods.includes(method);
}

/**
 * Route request to appropriate local handler
 * @param {Object} request - JSON-RPC request
 * @returns {boolean} True if handled, false if should be proxied
 */
function handleLocalMethod(request) {
  const method = request.method;

  switch (method) {
    case 'initialize':
      handleInitialize(request);
      return true;

    case 'initialized':
    case 'notifications/initialized':
    case 'notifications/cancelled':
      // Notifications - no response needed
      return true;

    case 'ping':
      handlePing(request);
      return true;

    case 'resources/list':
      handleResourcesList(request);
      return true;

    case 'tools/list':
      handleToolsList(request);
      return true;

    default:
      return false; // Not a local method
  }
}

module.exports = {
  handleInitialize,
  handlePing,
  handleResourcesList,
  handleToolsList,
  isLocalMethod,
  handleLocalMethod
};
