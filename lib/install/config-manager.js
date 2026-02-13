/**
 * Configuration File Manager
 *
 * Handles reading, writing, and validating MCP configuration files.
 * Provides safe file operations with error handling.
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if a file exists
 * @param {string} filePath - Path to file
 * @returns {boolean} True if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Read and parse JSON configuration file
 * @param {string} filePath - Path to config file
 * @returns {Object|null} Parsed configuration object, or null if file doesn't exist or parse fails
 */
function readConfig(filePath) {
  try {
    if (!fileExists(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    // Return null on any error (file not found, parse error, etc.)
    return null;
  }
}

/**
 * Write configuration object to JSON file
 * Creates parent directories if they don't exist
 * @param {string} filePath - Path to config file
 * @param {Object} config - Configuration object to write
 * @throws {Error} If write fails
 */
function writeConfig(filePath, config) {
  const dir = path.dirname(filePath);

  // Create directory if it doesn't exist
  if (!fileExists(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write config file with pretty formatting
  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Safely read configuration with fallback to empty object
 * @param {string} filePath - Path to config file
 * @returns {Object} Configuration object (empty if file doesn't exist or is invalid)
 */
function readConfigSafe(filePath) {
  const config = readConfig(filePath);
  return config || {};
}

/**
 * Backup configuration file before modification
 * @param {string} filePath - Path to config file
 * @returns {string|null} Path to backup file, or null if backup failed
 */
function backupConfig(filePath) {
  try {
    if (!fileExists(filePath)) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;

    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (error) {
    return null;
  }
}

/**
 * Validate that config is a valid JSON object
 * @param {any} config - Configuration to validate
 * @returns {boolean} True if valid
 */
function isValidConfig(config) {
  return config !== null && typeof config === 'object' && !Array.isArray(config);
}

/**
 * Get file modification time
 * @param {string} filePath - Path to file
 * @returns {Date|null} Modification time, or null if file doesn't exist
 */
function getFileModTime(filePath) {
  try {
    if (!fileExists(filePath)) {
      return null;
    }
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch (error) {
    return null;
  }
}

/**
 * Ensure parent directory exists for a file path
 * @param {string} filePath - Path to file
 */
function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fileExists(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Delete configuration file
 * @param {string} filePath - Path to config file
 * @returns {boolean} True if file was deleted, false if it didn't exist
 */
function deleteConfig(filePath) {
  try {
    if (!fileExists(filePath)) {
      return false;
    }
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete config file: ${error.message}`);
  }
}

/**
 * Read, modify, and write config in a single operation
 * @param {string} filePath - Path to config file
 * @param {Function} modifier - Function that takes config and returns modified config
 * @param {boolean} [createBackup=false] - Whether to create backup before writing
 * @returns {Object} { success: boolean, backupPath?: string, error?: string }
 */
function modifyConfig(filePath, modifier, createBackup = false) {
  try {
    // Read existing config
    const config = readConfigSafe(filePath);

    // Apply modifications
    const modifiedConfig = modifier(config);

    // Validate result
    if (!isValidConfig(modifiedConfig)) {
      return {
        success: false,
        error: 'Modified configuration is not a valid object'
      };
    }

    // Create backup if requested
    let backupPath = null;
    if (createBackup && fileExists(filePath)) {
      backupPath = backupConfig(filePath);
    }

    // Write modified config
    writeConfig(filePath, modifiedConfig);

    return {
      success: true,
      backupPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  fileExists,
  readConfig,
  writeConfig,
  readConfigSafe,
  backupConfig,
  isValidConfig,
  getFileModTime,
  ensureDirectoryExists,
  deleteConfig,
  modifyConfig
};
