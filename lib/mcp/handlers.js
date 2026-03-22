/**
 * MCP Protocol Method Handlers
 *
 * Handles only the minimal set of MCP protocol methods that must be
 * processed locally (notifications and ping).
 * initialize, tools/list and all other methods are forwarded to the server.
 */

const { sendResponse } = require('../protocol/json-rpc');

/**
 * Handle MCP ping method (keep-alive).
 * @param {Object} request - JSON-RPC request
 */
function handlePing(request) {
  sendResponse(request.id, {});
}

/**
 * Check if a method is a notification that requires no response.
 * @param {string} method
 * @returns {boolean}
 */
function isNotification(method) {
  return (
    method === 'initialized' ||
    method === 'notifications/initialized' ||
    method === 'notifications/cancelled' ||
    method === 'notifications/progress'
  );
}

module.exports = {
  handlePing,
  isNotification
};
