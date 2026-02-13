/**
 * MCP Installation Orchestrator
 *
 * Unified installer for all MCP clients (Claude Desktop, Cursor, Claude Code, Local).
 * Consolidates installation logic to eliminate code duplication.
 */

const logger = require('../logger');
const { getConfigPath, getClientDisplayName } = require('./config-paths');
const { getConfigTemplate, configsEqual, mergeClaudeDesktopConfig, mergeCursorConfig, mergeClaudeCodeConfig, removeMeldocConfig, removeMeldocClaudeCodeConfig } = require('./templates');
const { readConfigSafe, writeConfig, fileExists } = require('./config-manager');
const path = require('path');

/**
 * Installation result codes
 */
const INSTALL_RESULTS = {
  SUCCESS: 'success',
  ALREADY_CONFIGURED: 'already_configured',
  UPDATED: 'updated',
  ERROR: 'error'
};

/**
 * Unified MCP Installer
 * Handles installation for all supported clients
 */
class Installer {
  /**
   * Create an installer for a specific client
   * @param {string} client - Client type: 'claude-desktop', 'cursor', 'claude-code', 'local'
   * @param {string} [scope='project'] - Installation scope: 'global', 'project', 'user', 'local'
   */
  constructor(client, scope = 'project') {
    this.client = client;
    this.scope = scope;
    this.clientName = getClientDisplayName(client);
    this.configPath = getConfigPath(client, scope);
    this.expectedConfig = getConfigTemplate(client);
  }

  /**
   * Get the server key name based on client type
   * @returns {string} Server key ('meldoc' or 'meldoc-mcp')
   */
  getServerKey() {
    return this.client === 'claude-code' ? 'meldoc-mcp' : 'meldoc';
  }

  /**
   * Check if Meldoc is already configured
   * @returns {Object} { configured: boolean, isEqual: boolean, existingConfig: Object|null }
   */
  checkExistingConfig() {
    const config = readConfigSafe(this.configPath);
    const serverKey = this.getServerKey();

    if (!config.mcpServers || !config.mcpServers[serverKey]) {
      return {
        configured: false,
        isEqual: false,
        existingConfig: null
      };
    }

    const existingConfig = config.mcpServers[serverKey];
    const isEqual = configsEqual(existingConfig, this.expectedConfig);

    return {
      configured: true,
      isEqual,
      existingConfig
    };
  }

  /**
   * Install Meldoc MCP configuration
   * @returns {Object} { result: string, message: string, configPath: string }
   */
  install() {
    try {
      logger.section(`🚀 Installing Meldoc MCP for ${this.clientName}`);
      console.log();

      logger.info(`Config file location: ${logger.highlight(this.configPath)}`);
      console.log();

      // Check existing configuration
      const { configured, isEqual, existingConfig } = this.checkExistingConfig();

      if (configured && isEqual) {
        logger.success('Meldoc MCP is already configured correctly!');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        this.printNextSteps();

        return {
          result: INSTALL_RESULTS.ALREADY_CONFIGURED,
          message: 'Configuration already exists and is correct',
          configPath: this.configPath
        };
      }

      if (configured && !isEqual) {
        logger.warn('Meldoc MCP is already configured, but with different settings');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        logger.info('Expected configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(this.expectedConfig, null, 2)));
        console.log();
        logger.info('To update the configuration, run:');
        console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy uninstall'));
        console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy install'));
        console.log();

        return {
          result: INSTALL_RESULTS.ALREADY_CONFIGURED,
          message: 'Configuration exists but differs from expected',
          configPath: this.configPath
        };
      }

      // Read existing config or create new
      const config = readConfigSafe(this.configPath);
      const configExists = fileExists(this.configPath);

      if (configExists) {
        logger.info('Found existing configuration file');
      } else {
        logger.info('Configuration file does not exist, will create it');
      }

      // Merge Meldoc configuration
      const { merged } = this.mergeConfig(config, this.expectedConfig);

      // Create directory if needed
      const configDir = path.dirname(this.configPath);
      if (!fileExists(configDir)) {
        logger.info(`Creating directory: ${configDir}`);
      }

      // Write config
      writeConfig(this.configPath, merged);

      logger.success('Configuration added successfully!');
      console.log();

      // Show what was added
      logger.info('Added configuration:');
      console.log('  ' + logger.highlight(JSON.stringify(this.expectedConfig, null, 2)));
      console.log();

      this.printNextSteps();

      return {
        result: INSTALL_RESULTS.SUCCESS,
        message: 'Configuration installed successfully',
        configPath: this.configPath
      };

    } catch (error) {
      logger.error(`Installation failed: ${error.message}`);
      return {
        result: INSTALL_RESULTS.ERROR,
        message: error.message,
        configPath: this.configPath
      };
    }
  }

  /**
   * Merge Meldoc config into existing config based on client type
   * @param {Object} config - Existing configuration
   * @param {Object} newServer - New Meldoc server configuration
   * @returns {Object} { merged: Object, changed: boolean }
   */
  mergeConfig(config, newServer) {
    switch (this.client) {
      case 'claude-desktop':
        return mergeClaudeDesktopConfig(config, newServer);
      case 'cursor':
        return mergeCursorConfig(config, newServer);
      case 'claude-code':
        return mergeClaudeCodeConfig(config, newServer);
      case 'local':
        return mergeCursorConfig(config, newServer); // Uses same format as Cursor
      default:
        throw new Error(`Unknown client type: ${this.client}`);
    }
  }

  /**
   * Uninstall Meldoc MCP configuration
   * @returns {Object} { result: string, message: string, configPath: string }
   */
  uninstall() {
    try {
      logger.section(`🗑️  Uninstalling Meldoc MCP from ${this.clientName}`);
      console.log();

      logger.info(`Config file location: ${logger.highlight(this.configPath)}`);
      console.log();

      // Check if config exists
      if (!fileExists(this.configPath)) {
        logger.info('Configuration file does not exist');
        logger.success('Nothing to uninstall');
        console.log();
        return {
          result: INSTALL_RESULTS.SUCCESS,
          message: 'No configuration found',
          configPath: this.configPath
        };
      }

      // Read config
      const config = readConfigSafe(this.configPath);
      const serverKey = this.getServerKey();

      // Check if Meldoc is configured
      if (!config.mcpServers || !config.mcpServers[serverKey]) {
        logger.info('Meldoc MCP is not configured');
        logger.success('Nothing to uninstall');
        console.log();
        return {
          result: INSTALL_RESULTS.SUCCESS,
          message: 'Meldoc not configured',
          configPath: this.configPath
        };
      }

      // Remove Meldoc configuration
      const { merged } = this.client === 'claude-code'
        ? removeMeldocClaudeCodeConfig(config)
        : removeMeldocConfig(config);

      // Write updated config
      writeConfig(this.configPath, merged);

      logger.success('Configuration removed successfully!');
      console.log();
      logger.info(`Remember to restart ${this.clientName} to apply changes`);
      console.log();

      return {
        result: INSTALL_RESULTS.SUCCESS,
        message: 'Configuration uninstalled successfully',
        configPath: this.configPath
      };

    } catch (error) {
      logger.error(`Uninstallation failed: ${error.message}`);
      return {
        result: INSTALL_RESULTS.ERROR,
        message: error.message,
        configPath: this.configPath
      };
    }
  }

  /**
   * Print next steps after installation
   */
  printNextSteps() {
    logger.info('✅ Next steps:');
    console.log();

    if (this.client === 'claude-desktop') {
      console.log('  1. Restart Claude Desktop (if you haven\'t already)');
      console.log('  2. Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
    } else if (this.client === 'cursor') {
      console.log(`  1. Restart Cursor (if you haven't already)`);
      console.log('  2. Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
    } else if (this.client === 'claude-code') {
      console.log('  1. Restart Claude Code (if you haven\'t already)');
      console.log('  2. Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
    } else {
      console.log('  1. Restart your MCP client');
      console.log('  2. Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
    }

    console.log();
  }
}

/**
 * Factory function to create installer
 * @param {string} client - Client type
 * @param {string} [scope='project'] - Installation scope
 * @returns {Installer} Installer instance
 */
function createInstaller(client, scope = 'project') {
  return new Installer(client, scope);
}

/**
 * Quick install function
 * @param {string} client - Client type
 * @param {string} [scope='project'] - Installation scope
 * @returns {Object} Installation result
 */
function install(client, scope = 'project') {
  const installer = createInstaller(client, scope);
  return installer.install();
}

/**
 * Quick uninstall function
 * @param {string} client - Client type
 * @param {string} [scope='project'] - Installation scope
 * @returns {Object} Uninstallation result
 */
function uninstall(client, scope = 'project') {
  const installer = createInstaller(client, scope);
  return installer.uninstall();
}

module.exports = {
  Installer,
  createInstaller,
  install,
  uninstall,
  INSTALL_RESULTS
};
