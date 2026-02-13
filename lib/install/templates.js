/**
 * MCP Configuration Templates
 *
 * Standard configuration templates for different MCP clients.
 * Includes comparison and merging utilities.
 */

/**
 * Get expected Meldoc MCP configuration for Claude Desktop
 * @returns {Object} Claude Desktop MCP configuration
 */
function getClaudeDesktopConfig() {
  return {
    command: 'npx',
    args: ['-y', '@meldocio/mcp-stdio-proxy@latest']
  };
}

/**
 * Get expected Meldoc MCP configuration for Cursor
 * @returns {Object} Cursor MCP configuration
 */
function getCursorConfig() {
  return {
    command: 'npx',
    args: ['-y', '@meldocio/mcp-stdio-proxy@latest']
  };
}

/**
 * Get expected Meldoc MCP configuration for Claude Code
 * @returns {Object} Claude Code MCP configuration
 */
function getClaudeCodeConfig() {
  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@meldocio/mcp-stdio-proxy@latest']
  };
}

/**
 * Get expected Meldoc MCP configuration for local (generic) installation
 * @returns {Object} Local MCP configuration
 */
function getLocalConfig() {
  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@meldocio/mcp-stdio-proxy@latest']
  };
}

/**
 * Get configuration template by client type
 * @param {string} client - Client type: 'claude-desktop', 'cursor', 'claude-code', 'local'
 * @returns {Object} Configuration template
 * @throws {Error} If client type is unknown
 */
function getConfigTemplate(client) {
  switch (client) {
    case 'claude-desktop':
      return getClaudeDesktopConfig();
    case 'cursor':
      return getCursorConfig();
    case 'claude-code':
      return getClaudeCodeConfig();
    case 'local':
      return getLocalConfig();
    default:
      throw new Error(`Unknown client type: ${client}`);
  }
}

/**
 * Deep equality comparison for configuration objects
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean} True if values are deeply equal
 */
function deepEqual(a, b) {
  // Handle null/undefined
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  // Handle non-objects
  if (typeof a !== 'object') return a === b;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  // Handle objects
  if (Array.isArray(a) || Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    return deepEqual(a[key], b[key]);
  });
}

/**
 * Check if two configurations are equal
 * @param {Object} config1 - First configuration
 * @param {Object} config2 - Second configuration
 * @returns {boolean} True if configurations are equal
 */
function configsEqual(config1, config2) {
  return deepEqual(config1, config2);
}

/**
 * Merge Meldoc server configuration into existing config
 * For Claude Desktop format (mcpServers.meldoc)
 * @param {Object} existingConfig - Existing configuration object
 * @param {Object} newServer - New Meldoc server configuration
 * @returns {Object} { merged: Object, changed: boolean }
 */
function mergeClaudeDesktopConfig(existingConfig, newServer) {
  const merged = { ...existingConfig };

  // Ensure mcpServers exists
  if (!merged.mcpServers) {
    merged.mcpServers = {};
  }

  // Check if meldoc server exists
  if (!merged.mcpServers.meldoc) {
    merged.mcpServers.meldoc = newServer;
    return { merged, changed: true };
  }

  // Check if configs are equal
  if (configsEqual(merged.mcpServers.meldoc, newServer)) {
    return { merged, changed: false };
  }

  // Update if different
  merged.mcpServers.meldoc = newServer;
  return { merged, changed: true };
}

/**
 * Merge Meldoc server configuration into existing config
 * For Cursor/Local format (mcpServers.meldoc)
 * @param {Object} existingConfig - Existing configuration object
 * @param {Object} newServer - New Meldoc server configuration
 * @returns {Object} { merged: Object, changed: boolean }
 */
function mergeCursorConfig(existingConfig, newServer) {
  const merged = { ...existingConfig };

  // Ensure mcpServers exists
  if (!merged.mcpServers) {
    merged.mcpServers = {};
  }

  // Check if meldoc server exists
  if (!merged.mcpServers.meldoc) {
    merged.mcpServers.meldoc = newServer;
    return { merged, changed: true };
  }

  // Check if configs are equal
  if (configsEqual(merged.mcpServers.meldoc, newServer)) {
    return { merged, changed: false };
  }

  // Update if different
  merged.mcpServers.meldoc = newServer;
  return { merged, changed: true };
}

/**
 * Merge Meldoc server configuration into existing config
 * For Claude Code format (mcpServers.meldoc-mcp)
 * @param {Object} existingConfig - Existing configuration object
 * @param {Object} newServer - New Meldoc server configuration
 * @returns {Object} { merged: Object, changed: boolean }
 */
function mergeClaudeCodeConfig(existingConfig, newServer) {
  const merged = { ...existingConfig };

  // Ensure mcpServers exists
  if (!merged.mcpServers) {
    merged.mcpServers = {};
  }

  // Check if meldoc-mcp server exists (Claude Code uses different key)
  if (!merged.mcpServers['meldoc-mcp']) {
    merged.mcpServers['meldoc-mcp'] = newServer;
    return { merged, changed: true };
  }

  // Check if configs are equal
  if (configsEqual(merged.mcpServers['meldoc-mcp'], newServer)) {
    return { merged, changed: false };
  }

  // Update if different
  merged.mcpServers['meldoc-mcp'] = newServer;
  return { merged, changed: true };
}

/**
 * Remove Meldoc server from configuration
 * For Claude Desktop/Cursor format
 * @param {Object} config - Configuration object
 * @returns {Object} { merged: Object, changed: boolean }
 */
function removeMeldocConfig(config) {
  const merged = { ...config };

  if (!merged.mcpServers || !merged.mcpServers.meldoc) {
    return { merged, changed: false };
  }

  delete merged.mcpServers.meldoc;
  return { merged, changed: true };
}

/**
 * Remove Meldoc server from Claude Code configuration
 * @param {Object} config - Configuration object
 * @returns {Object} { merged: Object, changed: boolean }
 */
function removeMeldocClaudeCodeConfig(config) {
  const merged = { ...config };

  if (!merged.mcpServers || !merged.mcpServers['meldoc-mcp']) {
    return { merged, changed: false };
  }

  delete merged.mcpServers['meldoc-mcp'];
  return { merged, changed: true };
}

module.exports = {
  // Template getters
  getClaudeDesktopConfig,
  getCursorConfig,
  getClaudeCodeConfig,
  getLocalConfig,
  getConfigTemplate,

  // Comparison utilities
  deepEqual,
  configsEqual,

  // Merge utilities
  mergeClaudeDesktopConfig,
  mergeCursorConfig,
  mergeClaudeCodeConfig,

  // Remove utilities
  removeMeldocConfig,
  removeMeldocClaudeCodeConfig
};
