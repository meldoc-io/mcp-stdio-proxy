/**
 * HTTP Client for MCP Backend Communication
 *
 * Handles HTTP requests to the Meldoc API backend.
 */

const axios = require('axios');
const https = require('https');
const { getApiUrl, REQUEST_TIMEOUT } = require('../core/constants');
const { getAccessToken } = require('../core/auth');
const { resolveWorkspaceAlias, findRepoConfig, readRepoConfig } = require('../core/workspace');
const { setWorkspaceAlias } = require('../core/config');

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

  // Determine workspace to use with correct priority:
  // 1. Explicitly provided in tool arguments (highest priority)
  // 2. Resolved from repo config → global config → none
  const params = request.params || {};
  const args = params.arguments || params.args || {};

  let workspaceAlias = null;

  if (args.workspaceAlias && typeof args.workspaceAlias === 'string') {
    // User explicitly specified a workspace - use it
    workspaceAlias = args.workspaceAlias;

    // Cache only if no repo config exists
    // If repo config exists, explicit workspace is a one-time override
    const repoConfigPath = findRepoConfig();
    const hasRepoConfig = repoConfigPath && readRepoConfig(repoConfigPath);

    if (!hasRepoConfig) {
      setWorkspaceAlias(args.workspaceAlias);
    }
  } else {
    // No explicit workspace - resolve from config hierarchy
    workspaceAlias = await resolveWorkspaceAlias();
  }

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
