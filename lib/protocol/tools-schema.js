/**
 * MCP Tools Schema Definitions
 *
 * Contains only the local tools handled by this proxy.
 * All other tools are provided by the server-side MCP via tools/list forwarding.
 */

/**
 * Local tools handled directly by this proxy (not forwarded to the server).
 * @returns {Array<Object>} Array of local tool definitions
 */
function getLocalToolsList() {
  return [
    {
      name: 'get_workspace',
      description: 'Get the current workspace alias from repo config or global config. Reads workspaceAlias from configuration files.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'set_workspace',
      description: 'Set the workspace alias in global config (~/.meldoc/config.json). This workspace will be used automatically if user has multiple workspaces.',
      inputSchema: {
        type: 'object',
        required: ['alias'],
        properties: {
          alias: { type: 'string', description: 'Workspace alias to set' }
        }
      }
    },
    {
      name: 'auth_status',
      description: 'Check authentication status. Returns whether user is logged in and authentication details.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'auth_login_instructions',
      description: 'Get instructions for logging in. Returns the command to run for authentication.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ];
}

/**
 * @deprecated Use getLocalToolsList() instead.
 * Kept for backward compatibility with any code that imports getToolsList.
 */
function getToolsList() {
  return getLocalToolsList();
}

/**
 * Check if a tool name exists in the schema
 * @param {string} toolName - The name of the tool to check
 * @returns {boolean} True if tool exists
 */
function isValidToolName(toolName) {
  const tools = getToolsList();
  return tools.some(tool => tool.name === toolName);
}

/**
 * Get a specific tool definition by name
 * @param {string} toolName - The name of the tool
 * @returns {Object|null} Tool definition or null if not found
 */
function getToolByName(toolName) {
  const tools = getToolsList();
  return tools.find(tool => tool.name === toolName) || null;
}

module.exports = {
  getLocalToolsList,
  getToolsList,       // backward compat alias for getLocalToolsList
  isValidToolName,
  getToolByName
};
