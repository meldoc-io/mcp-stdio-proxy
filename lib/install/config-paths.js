/**
 * Configuration Path Management
 *
 * Centralized configuration file path management for all MCP clients.
 * Supports Claude Desktop, Cursor, Claude Code, and local installations.
 */

const os = require('os');
const path = require('path');

/**
 * Platform detection utilities
 */
const PLATFORMS = {
  MAC: 'darwin',
  WINDOWS: 'win32',
  LINUX: 'linux'
};

function getPlatform() {
  return os.platform();
}

function isMac() {
  return getPlatform() === PLATFORMS.MAC;
}

function isWindows() {
  return getPlatform() === PLATFORMS.WINDOWS;
}

function isLinux() {
  return getPlatform() === PLATFORMS.LINUX;
}

/**
 * Get home directory
 */
function getHomeDir() {
  return os.homedir();
}

/**
 * Get current working directory
 */
function getCwd() {
  return process.cwd();
}

/**
 * Client configuration path resolvers
 * Each function returns the appropriate config file path for the target client
 */

/**
 * Get Claude Desktop config file path (platform-specific)
 * @returns {string} Path to claude_desktop_config.json
 */
function getClaudeDesktopConfigPath() {
  const homeDir = getHomeDir();

  if (isMac()) {
    return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }

  if (isWindows()) {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  }

  // Linux and others
  return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
}

/**
 * Get Cursor project config file path (.cursor/mcp.json in current directory)
 * @returns {string} Path to project-specific Cursor config
 */
function getCursorProjectConfigPath() {
  return path.join(getCwd(), '.cursor', 'mcp.json');
}

/**
 * Get Cursor global config file path (~/.cursor/mcp.json)
 * @returns {string} Path to global Cursor config
 */
function getCursorGlobalConfigPath() {
  return path.join(getHomeDir(), '.cursor', 'mcp.json');
}

/**
 * Get Claude Code project config path (.mcp.json in current directory)
 * @returns {string} Path to project-specific Claude Code config
 */
function getClaudeCodeProjectConfigPath() {
  return path.join(getCwd(), '.mcp.json');
}

/**
 * Get Claude Code user config path (~/.claude.json)
 * @returns {string} Path to user-level Claude Code config
 */
function getClaudeCodeUserConfigPath() {
  return path.join(getHomeDir(), '.claude.json');
}

/**
 * Get Claude Code local config path (same as user, but with project context)
 * Note: Local scope uses ~/.claude.json but stores project-specific paths
 * @returns {string} Path to local Claude Code config
 */
function getClaudeCodeLocalConfigPath() {
  return path.join(getHomeDir(), '.claude.json');
}

/**
 * Get local mcp.json path (in current directory)
 * @returns {string} Path to generic local MCP config
 */
function getLocalMcpJsonPath() {
  return path.join(getCwd(), 'mcp.json');
}

/**
 * Get config path by client type and scope
 * @param {string} client - Client type: 'claude-desktop', 'cursor', 'claude-code', 'local'
 * @param {string} [scope] - Installation scope: 'global', 'project', 'user', 'local'
 * @returns {string} Config file path
 * @throws {Error} If client type is unknown or scope is invalid
 */
function getConfigPath(client, scope = 'project') {
  switch (client) {
    case 'claude-desktop':
      return getClaudeDesktopConfigPath();

    case 'cursor':
      if (scope === 'global') {
        return getCursorGlobalConfigPath();
      }
      return getCursorProjectConfigPath();

    case 'claude-code':
      if (scope === 'user') {
        return getClaudeCodeUserConfigPath();
      }
      if (scope === 'local') {
        return getClaudeCodeLocalConfigPath();
      }
      return getClaudeCodeProjectConfigPath();

    case 'local':
      return getLocalMcpJsonPath();

    default:
      throw new Error(`Unknown client type: ${client}`);
  }
}

/**
 * Get friendly display name for client
 * @param {string} client - Client type
 * @returns {string} Display name
 */
function getClientDisplayName(client) {
  const names = {
    'claude-desktop': 'Claude Desktop',
    'cursor': 'Cursor',
    'claude-code': 'Claude Code',
    'local': 'Local MCP'
  };
  return names[client] || client;
}

module.exports = {
  // Platform utilities
  getPlatform,
  isMac,
  isWindows,
  isLinux,
  getHomeDir,
  getCwd,

  // Individual path getters (for backward compatibility)
  getClaudeDesktopConfigPath,
  getCursorProjectConfigPath,
  getCursorGlobalConfigPath,
  getClaudeCodeProjectConfigPath,
  getClaudeCodeUserConfigPath,
  getClaudeCodeLocalConfigPath,
  getLocalMcpJsonPath,

  // Unified interface
  getConfigPath,
  getClientDisplayName,

  // Constants
  PLATFORMS
};
