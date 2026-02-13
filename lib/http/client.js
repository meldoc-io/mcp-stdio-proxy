/**
 * HTTP Client for MCP Backend Communication
 *
 * Handles HTTP requests to the Meldoc API backend.
 */

const axios = require('axios');
const https = require('https');
const { getApiUrl, REQUEST_TIMEOUT } = require('../constants');
const { getAccessToken } = require('../auth');
const { resolveWorkspaceAlias } = require('../workspace');

/**
 * Make an authenticated JSON-RPC request to the backend
 * @param {Object} request - JSON-RPC request object
 * @returns {Promise<Object>} Response data
 */
async function makeBackendRequest(request) {
  const apiUrl = getApiUrl();
  const rpcEndpoint = `${apiUrl}/mcp/v1/rpc`;

  // Get access token
  const tokenInfo = await getAccessToken();
  if (!tokenInfo) {
    throw new Error('Not authenticated');
  }

  // Ensure request has jsonrpc field
  const requestWithJsonRpc = {
    ...request,
    jsonrpc: request.jsonrpc || '2.0'
  };

  // Resolve workspace if not provided
  const workspaceAlias = await resolveWorkspaceAlias();

  // Build headers
  const headers = {
    'Authorization': `Bearer ${tokenInfo.token}`,
    'Content-Type': 'application/json'
  };

  // Add workspace header if available
  if (workspaceAlias) {
    headers['X-Workspace-Alias'] = workspaceAlias;
  }

  // Make request
  const response = await axios.post(rpcEndpoint, requestWithJsonRpc, {
    headers,
    timeout: REQUEST_TIMEOUT,
    httpsAgent: new https.Agent({ keepAlive: true }),
    validateStatus: () => true // Accept all status codes
  });

  return response;
}

module.exports = {
  makeBackendRequest
};
