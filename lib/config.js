const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.meldoc', 'config.json');

/**
 * Read config from ~/.meldoc/config.json
 * @returns {Object|null} Config object or null if file doesn't exist
 */
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Write config to ~/.meldoc/config.json
 * Sets file permissions to 0644 (read for all, write for owner)
 * @param {Object} config - Config object
 */
function writeConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  
  // Create .meldoc directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  
  // Write config file
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', {
    encoding: 'utf8',
    mode: 0o644 // 0644 - read for all, write for owner
  });
}

/**
 * Get workspace alias from config
 * @returns {string|null} Workspace alias or null
 */
function getWorkspaceAlias() {
  const config = readConfig();
  return config?.workspaceAlias || null;
}

/**
 * Set workspace alias in config
 * @param {string} alias - Workspace alias
 */
function setWorkspaceAlias(alias) {
  const config = readConfig() || {};
  config.workspaceAlias = alias;
  writeConfig(config);
}

module.exports = {
  readConfig,
  writeConfig,
  getWorkspaceAlias,
  setWorkspaceAlias,
  CONFIG_PATH
};
