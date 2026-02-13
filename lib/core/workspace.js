const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { getWorkspaceAlias: getConfigWorkspaceAlias } = require('./config');

/**
 * Find meldoc.config.yml file in current directory or parent directories
 * @param {string} startDir - Starting directory
 * @returns {string|null} Path to meldoc.config.yml or null if not found
 */
function findRepoConfig(startDir = process.cwd()) {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    const configPath = path.join(currentDir, 'meldoc.config.yml');
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
}

/**
 * Read workspace alias from meldoc.config.yml
 * @param {string} configPath - Path to meldoc.config.yml
 * @returns {string|null} Workspace alias or null
 */
function readRepoConfig(configPath) {
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(content);
    return config?.workspaceAlias || null;
  } catch (error) {
    return null;
  }
}

/**
 * Resolve workspace alias for request
 * Priority:
 * 1. Repo config (meldoc.config.yml) - optional, can be skipped
 * 2. Global config (~/.meldoc/config.json)
 * 3. No header (let server choose automatically)
 * @param {boolean} useRepoConfig - Whether to check repo config (optional)
 * @returns {string|null} Workspace alias or null
 */
function resolveWorkspaceAlias(useRepoConfig = true) {
  // Step 1: Repo config (optional)
  if (useRepoConfig) {
    const repoConfigPath = findRepoConfig();
    if (repoConfigPath) {
      const repoWorkspace = readRepoConfig(repoConfigPath);
      if (repoWorkspace) {
        return repoWorkspace;
      }
    }
  }
  
  // Step 2: Global config
  const configWorkspace = getConfigWorkspaceAlias();
  if (configWorkspace) {
    return configWorkspace;
  }
  
  // Step 3: No workspace alias
  return null;
}

module.exports = {
  findRepoConfig,
  readRepoConfig,
  resolveWorkspaceAlias
};
