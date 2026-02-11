#!/usr/bin/env node

const { deviceFlowLogin } = require('../lib/device-flow');
const { readCredentials, deleteCredentials } = require('../lib/credentials');
const { getAuthStatus } = require('../lib/auth');
const { setWorkspaceAlias, getWorkspaceAlias } = require('../lib/config');
const { getAccessToken } = require('../lib/auth');
const { getApiUrl, getAppUrl } = require('../lib/constants');
const axios = require('axios');
const https = require('https');
const chalk = require('chalk');
const logger = require('../lib/logger');
const fs = require('fs');
const path = require('path');
const os = require('os');

const API_URL = getApiUrl();
const APP_URL = getAppUrl();

// Support localhost testing
if (process.env.MELDOC_API_URL) {
  logger.debug(`Using API URL: ${process.env.MELDOC_API_URL}`);
}
if (process.env.MELDOC_APP_URL) {
  logger.debug(`Using App URL: ${process.env.MELDOC_APP_URL}`);
}

/**
 * Handle auth login command
 */
async function handleAuthLogin() {
  try {
    logger.section('🔐 Authentication');
    await deviceFlowLogin(
      (url, code) => {
        console.log('\n' + logger.label('Visit this URL:'));
        console.log('  ' + logger.url(url));
        console.log('\n' + logger.label('Enter this code:'));
        console.log('  ' + logger.code(code) + '\n');
        logger.info('Waiting for authentication...');
      },
      (status) => {
        if (status === 'denied') {
          logger.error('Login denied by user');
          process.exit(1);
        } else if (status === 'expired') {
          logger.error('Authentication code expired');
          process.exit(1);
        }
      },
      API_URL,
      APP_URL
    );
    logger.success('Login successful!');
    process.exit(0);
  } catch (error) {
    logger.error(`Login failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle auth status command
 */
async function handleAuthStatus() {
  const status = await getAuthStatus();
  if (!status || !status.authenticated) {
    logger.error('Not authenticated');
    console.log('\n' + logger.label('To authenticate, run:'));
    console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login') + '\n');
    process.exit(1);
  }
  
  logger.section('🔑 Authentication Status');
  
  if (status.type === 'user_session' && status.user) {
    logger.item('Email', logger.value(status.user.email));
    if (status.expiresAt) {
      logger.item('Token expires', logger.value(new Date(status.expiresAt).toLocaleString()));
    }
  } else {
    logger.item('Type', logger.value(status.type));
  }
  
  console.log();
  process.exit(0);
}

/**
 * Handle auth logout command
 */
async function handleAuthLogout() {
  deleteCredentials();
  logger.success('Logged out successfully');
  process.exit(0);
}

/**
 * Handle config set-workspace command
 */
function handleConfigSetWorkspace(alias) {
  if (!alias) {
    logger.error('Workspace alias is required');
    console.log('\n' + logger.label('Usage:'));
    console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy config set-workspace <alias>') + '\n');
    process.exit(1);
  }
  
  try {
    setWorkspaceAlias(alias);
    logger.success(`Workspace set to: ${logger.highlight(alias)}`);
    process.exit(0);
  } catch (error) {
    logger.error(`Failed to set workspace: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle config get-workspace command
 */
function handleConfigGetWorkspace() {
  const alias = getWorkspaceAlias();
  if (alias) {
    console.log(logger.highlight(alias));
  }
  process.exit(0);
}

/**
 * Handle config list-workspaces command
 */
async function handleConfigListWorkspaces() {
  try {
    const tokenInfo = await getAccessToken();
    if (!tokenInfo) {
      logger.error('Not authenticated');
      console.log('\n' + logger.label('To authenticate, run:'));
      console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login') + '\n');
      process.exit(1);
    }
    
    // Call MCP tool meldoc.list_workspaces via POST /mcp/v1/rpc
    const response = await axios.post(`${API_URL}/mcp/v1/rpc`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'meldoc.list_workspaces',
        arguments: {}
      }
    }, {
      headers: {
        'Authorization': `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      httpsAgent: new https.Agent({ keepAlive: true })
    });
    
    if (response.data.error) {
      logger.error(`Error: ${response.data.error.message}`);
      process.exit(1);
    }
    
    const workspaces = response.data.result?.workspaces || [];
    if (workspaces.length === 0) {
      logger.info('No workspaces available');
      process.exit(0);
    }
    
    logger.section('📁 Available Workspaces');
    for (const ws of workspaces) {
      const role = ws.role || 'member';
      const roleColor = role === 'owner' ? chalk.red : role === 'admin' ? chalk.yellow : chalk.gray;
      logger.item(
        `${logger.highlight(ws.alias)} ${chalk.gray('(' + ws.name + ')')}`,
        roleColor(`[${role}]`)
      );
    }
    console.log();
    
    process.exit(0);
  } catch (error) {
    if (error.response?.data?.error) {
      const errorData = error.response.data.error;
      if (errorData.code === 'AUTH_REQUIRED' || errorData.data?.code === 'AUTH_REQUIRED') {
        logger.error('Not authenticated');
        console.log('\n' + logger.label('To authenticate, run:'));
        console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login') + '\n');
        process.exit(1);
      }
      logger.error(`Error: ${errorData.message || error.message}`);
    } else {
      logger.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * Get Claude Desktop config file path based on OS
 */
function getClaudeDesktopConfigPath() {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  if (platform === 'darwin') {
    // macOS
    return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    // Windows
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  } else {
    // Linux and others
    return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
  }
}

/**
 * Get Cursor config file path (project-specific)
 */
function getCursorProjectConfigPath() {
  const cwd = process.cwd();
  return path.join(cwd, '.cursor', 'mcp.json');
}

/**
 * Get Cursor global config file path
 */
function getCursorGlobalConfigPath() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.cursor', 'mcp.json');
}

/**
 * Get local mcp.json path (in current directory)
 */
function getLocalMcpJsonPath() {
  return path.join(process.cwd(), 'mcp.json');
}

/**
 * Get Claude Code project config path (.mcp.json)
 */
function getClaudeCodeProjectConfigPath() {
  return path.join(process.cwd(), '.mcp.json');
}

/**
 * Get Claude Code user config path (~/.claude.json)
 */
function getClaudeCodeUserConfigPath() {
  return path.join(os.homedir(), '.claude.json');
}

/**
 * Get Claude Code local config path (~/.claude.json in project path)
 * Note: Local scope uses ~/.claude.json but stores project-specific paths
 */
function getClaudeCodeLocalConfigPath() {
  // For local scope, Claude Code uses ~/.claude.json with project-specific paths
  // This is the same file as user scope, but with different path context
  return path.join(os.homedir(), '.claude.json');
}

/**
 * Get expected Meldoc MCP configuration for Claude Desktop
 */
function getExpectedMeldocConfig() {
  return {
    command: 'npx',
    args: ['-y', '@meldocio/mcp-stdio-proxy@latest']
  };
}

/**
 * Get expected Meldoc MCP configuration for Cursor (stdio)
 */
function getExpectedMeldocConfigForCursor() {
  return {
    command: 'npx',
    args: ['-y', '@meldocio/mcp-stdio-proxy@latest']
  };
}

/**
 * Get expected Meldoc MCP configuration for Claude Code (stdio)
 */
function getExpectedMeldocConfigForClaudeCode() {
  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@meldocio/mcp-stdio-proxy@latest']
  };
}

/**
 * Check if two configurations are equal (deep comparison)
 */
function configsEqual(config1, config2) {
  if (!config1 || !config2) return false;
  if (config1.command !== config2.command) return false;
  if (!Array.isArray(config1.args) || !Array.isArray(config2.args)) return false;
  if (config1.args.length !== config2.args.length) return false;
  return config1.args.every((arg, i) => arg === config2.args[i]);
}

/**
 * Merge MCP server configurations (preserve existing, add new)
 */
function mergeMcpServers(existing, newServer) {
  const merged = { ...existing };
  if (!merged.meldoc) {
    merged.meldoc = newServer;
  } else {
    // Check if it's the same config
    if (configsEqual(merged.meldoc, newServer)) {
      return { merged, changed: false };
    }
    // Update if different
    merged.meldoc = newServer;
  }
  return { merged, changed: true };
}

/**
 * Install for Claude Desktop
 */
function installClaudeDesktop() {
  try {
    logger.section('🚀 Installing Meldoc MCP for Claude Desktop');
    console.log();
    
    const configPath = getClaudeDesktopConfigPath();
    const configDir = path.dirname(configPath);
    const expectedConfig = getExpectedMeldocConfig();
    
    logger.info(`Config file location: ${logger.highlight(configPath)}`);
    console.log();
    
    // Read existing config or create new one
    let config = {};
    let configExists = false;
    
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(content);
        configExists = true;
        logger.info('Found existing Claude Desktop configuration');
      } catch (error) {
        logger.warn(`Failed to parse existing config: ${error.message}`);
        logger.info('Will create a new configuration file');
      }
    } else {
      logger.info('Configuration file does not exist, will create it');
    }
    
    // Ensure mcpServers object exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    
    // Check if meldoc is already configured
    if (config.mcpServers.meldoc) {
      const existingConfig = config.mcpServers.meldoc;
      const isEqual = configsEqual(existingConfig, expectedConfig);
      
      if (isEqual) {
        logger.success('Meldoc MCP is already configured correctly!');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        logger.info('No changes needed. Next steps:');
        console.log('  1. Restart Claude Desktop (if you haven\'t already)');
        console.log('  2. Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
        console.log();
        process.exit(0);
      } else {
        logger.warn('Meldoc MCP is already configured, but with different settings');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        logger.info('Expected configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(expectedConfig, null, 2)));
        console.log();
        logger.info('To update the configuration, run:');
        console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy uninstall'));
        console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy install'));
        console.log();
        process.exit(0);
      }
    }
    
    // Add meldoc configuration
    config.mcpServers.meldoc = expectedConfig;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      logger.info(`Creating directory: ${configDir}`);
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write config file
    const configContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, configContent, 'utf8');
    
    logger.success('Configuration added successfully!');
    console.log();
    
    // Show what was added
    logger.info('Added MCP server configuration:');
    console.log('  ' + logger.highlight(JSON.stringify(config.mcpServers.meldoc, null, 2)));
    console.log();
    
    // Count other MCP servers
    const otherServers = Object.keys(config.mcpServers).filter(key => key !== 'meldoc');
    if (otherServers.length > 0) {
      logger.info(`Found ${otherServers.length} other MCP server(s): ${otherServers.join(', ')}`);
      console.log();
    }
    
    // Next steps
    logger.section('✅ Installation Complete!');
    console.log();
    logger.info('Next steps:');
    console.log();
    console.log('  1. ' + logger.label('Restart Claude Desktop'));
    console.log('     Completely close and reopen Claude Desktop for changes to take effect.');
    console.log();
    console.log('  2. ' + logger.label('Authenticate with Meldoc'));
    console.log('     Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
    console.log();
    console.log('  3. ' + logger.label('Start using Claude with Meldoc!'));
    console.log('     Ask Claude to read, search, or update your documentation.');
    console.log();
    
    process.exit(0);
  } catch (error) {
    logger.error(`Installation failed: ${error.message}`);
    console.log();
    logger.info('You can manually configure Claude Desktop by:');
    console.log('  1. Opening the config file: ' + logger.highlight(getClaudeDesktopConfigPath()));
    console.log('  2. Adding this configuration:');
    console.log('     ' + logger.highlight(JSON.stringify({
      mcpServers: {
        meldoc: getExpectedMeldocConfig()
      }
    }, null, 2)));
    console.log();
    process.exit(1);
  }
}

/**
 * Install for Cursor (project or global)
 */
function installCursor(isGlobal = false) {
  try {
    const configPath = isGlobal ? getCursorGlobalConfigPath() : getCursorProjectConfigPath();
    const configDir = path.dirname(configPath);
    const expectedConfig = getExpectedMeldocConfigForCursor();
    
    logger.section(`🚀 Installing Meldoc MCP for Cursor (${isGlobal ? 'global' : 'project'})`);
    console.log();
    
    logger.info(`Config file location: ${logger.highlight(configPath)}`);
    console.log();
    
    // Read existing config or create new one
    let config = {};
    let configExists = false;
    
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(content);
        configExists = true;
        logger.info('Found existing Cursor MCP configuration');
      } catch (error) {
        logger.warn(`Failed to parse existing config: ${error.message}`);
        logger.info('Will create a new configuration file');
      }
    } else {
      logger.info('Configuration file does not exist, will create it');
    }
    
    // Ensure mcpServers object exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    
    // Check if meldoc is already configured
    if (config.mcpServers.meldoc) {
      const existingConfig = config.mcpServers.meldoc;
      const isEqual = configsEqual(existingConfig, expectedConfig);
      
      if (isEqual) {
        logger.success('Meldoc MCP is already configured correctly!');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        logger.info('No changes needed. Next steps:');
        console.log('  1. Restart Cursor (if you haven\'t already)');
        console.log('  2. Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
        console.log();
        process.exit(0);
      } else {
        logger.warn('Meldoc MCP is already configured, but with different settings');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        logger.info('Expected configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(expectedConfig, null, 2)));
        console.log();
        logger.info('To update the configuration, run:');
        console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy install cursor'));
        console.log();
        process.exit(0);
      }
    }
    
    // Add meldoc configuration
    config.mcpServers.meldoc = expectedConfig;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      logger.info(`Creating directory: ${configDir}`);
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write config file
    const configContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, configContent, 'utf8');
    
    logger.success('Configuration added successfully!');
    console.log();
    
    // Show what was added
    logger.info('Added MCP server configuration:');
    console.log('  ' + logger.highlight(JSON.stringify(config.mcpServers.meldoc, null, 2)));
    console.log();
    
    // Count other MCP servers
    const otherServers = Object.keys(config.mcpServers).filter(key => key !== 'meldoc');
    if (otherServers.length > 0) {
      logger.info(`Found ${otherServers.length} other MCP server(s): ${otherServers.join(', ')}`);
      console.log();
    }
    
    // Next steps
    logger.section('✅ Installation Complete!');
    console.log();
    logger.info('Next steps:');
    console.log();
    console.log('  1. ' + logger.label('Restart Cursor'));
    console.log('     Completely close and reopen Cursor for changes to take effect.');
    console.log();
    console.log('  2. ' + logger.label('Authenticate with Meldoc'));
    console.log('     Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
    console.log();
    console.log('  3. ' + logger.label('Start using Cursor with Meldoc!'));
    console.log('     Ask Cursor to read, search, or update your documentation.');
    console.log();
    
    process.exit(0);
  } catch (error) {
    const configPath = isGlobal ? getCursorGlobalConfigPath() : getCursorProjectConfigPath();
    logger.error(`Installation failed: ${error.message}`);
    console.log();
    logger.info('You can manually configure Cursor by:');
    console.log('  1. Opening the config file: ' + logger.highlight(configPath));
    console.log('  2. Adding this configuration:');
    console.log('     ' + logger.highlight(JSON.stringify({
      mcpServers: {
        meldoc: getExpectedMeldocConfigForCursor()
      }
    }, null, 2)));
    console.log();
    process.exit(1);
  }
}

/**
 * Install local mcp.json file
 */
function installLocal() {
  try {
    logger.section('🚀 Installing Meldoc MCP (Local mcp.json)');
    console.log();
    
    const configPath = getLocalMcpJsonPath();
    const expectedConfig = getExpectedMeldocConfig();
    
    logger.info(`Config file location: ${logger.highlight(configPath)}`);
    console.log();
    
    // Read existing config or create new one
    let config = {};
    let configExists = false;
    
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(content);
        configExists = true;
        logger.info('Found existing mcp.json configuration');
      } catch (error) {
        logger.warn(`Failed to parse existing config: ${error.message}`);
        logger.info('Will create a new configuration file');
      }
    } else {
      logger.info('Configuration file does not exist, will create it');
    }
    
    // Ensure mcpServers object exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    
    // Check if meldoc is already configured
    if (config.mcpServers.meldoc) {
      const existingConfig = config.mcpServers.meldoc;
      const isEqual = configsEqual(existingConfig, expectedConfig);
      
      if (isEqual) {
        logger.success('Meldoc MCP is already configured correctly!');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        logger.info('No changes needed. Next steps:');
        console.log('  1. Restart your MCP client (if needed)');
        console.log('  2. Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
        console.log();
        process.exit(0);
      } else {
        logger.warn('Meldoc MCP is already configured, but with different settings');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        logger.info('Expected configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(expectedConfig, null, 2)));
        console.log();
        logger.info('Updating configuration...');
        console.log();
      }
    }
    
    // Add/update meldoc configuration
    config.mcpServers.meldoc = expectedConfig;
    
    // Write config file
    const configContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, configContent, 'utf8');
    
    logger.success('Configuration ' + (configExists && config.mcpServers.meldoc ? 'updated' : 'added') + ' successfully!');
    console.log();
    
    // Show what was added
    logger.info('MCP server configuration:');
    console.log('  ' + logger.highlight(JSON.stringify(config.mcpServers.meldoc, null, 2)));
    console.log();
    
    // Count other MCP servers
    const otherServers = Object.keys(config.mcpServers).filter(key => key !== 'meldoc');
    if (otherServers.length > 0) {
      logger.info(`Found ${otherServers.length} other MCP server(s): ${otherServers.join(', ')}`);
      console.log();
    }
    
    // Next steps
    logger.section('✅ Installation Complete!');
    console.log();
    logger.info('Next steps:');
    console.log();
    console.log('  1. ' + logger.label('Use this mcp.json with your MCP client'));
    console.log('     This file can be imported or referenced by MCP clients that support JSON configuration.');
    console.log();
    console.log('  2. ' + logger.label('Authenticate with Meldoc'));
    console.log('     Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
    console.log();
    
    process.exit(0);
  } catch (error) {
    logger.error(`Installation failed: ${error.message}`);
    console.log();
    logger.info('You can manually create mcp.json with this configuration:');
    console.log('     ' + logger.highlight(JSON.stringify({
      mcpServers: {
        meldoc: getExpectedMeldocConfig()
      }
    }, null, 2)));
    console.log();
    process.exit(1);
  }
}

/**
 * Install for Claude Code (project, user, or local scope)
 */
function installClaudeCode(scope = 'project') {
  try {
    let configPath;
    if (scope === 'project') {
      configPath = getClaudeCodeProjectConfigPath();
    } else if (scope === 'user') {
      configPath = getClaudeCodeUserConfigPath();
    } else {
      // local scope
      configPath = getClaudeCodeLocalConfigPath();
    }
    const configDir = path.dirname(configPath);
    const expectedConfig = getExpectedMeldocConfigForClaudeCode();
    
    logger.section(`🚀 Installing Meldoc MCP for Claude Code (${scope} scope)`);
    console.log();
    
    logger.info(`Config file location: ${logger.highlight(configPath)}`);
    console.log();
    
    // Read existing config or create new one
    let config = {};
    let configExists = false;
    
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(content);
        configExists = true;
        logger.info('Found existing Claude Code MCP configuration');
      } catch (error) {
        logger.warn(`Failed to parse existing config: ${error.message}`);
        logger.info('Will create a new configuration file');
      }
    } else {
      logger.info('Configuration file does not exist, will create it');
    }
    
    // Ensure mcpServers object exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    
    // Check if meldoc is already configured
    if (config.mcpServers.meldoc) {
      const existingConfig = config.mcpServers.meldoc;
      // For Claude Code, compare type, command, and args
      const isEqual = existingConfig.type === expectedConfig.type &&
                      existingConfig.command === expectedConfig.command &&
                      Array.isArray(existingConfig.args) &&
                      Array.isArray(expectedConfig.args) &&
                      existingConfig.args.length === expectedConfig.args.length &&
                      existingConfig.args.every((arg, i) => arg === expectedConfig.args[i]);
      
      if (isEqual) {
        logger.success('Meldoc MCP is already configured correctly!');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        logger.info('No changes needed. Next steps:');
        console.log('  1. Restart Claude Code (if you haven\'t already)');
        console.log('  2. Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
        console.log();
        process.exit(0);
      } else {
        logger.warn('Meldoc MCP is already configured, but with different settings');
        console.log();
        logger.info('Current configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(existingConfig, null, 2)));
        console.log();
        logger.info('Expected configuration:');
        console.log('  ' + logger.highlight(JSON.stringify(expectedConfig, null, 2)));
        console.log();
        logger.info('Updating configuration...');
        console.log();
      }
    }
    
    // Add/update meldoc configuration
    config.mcpServers.meldoc = expectedConfig;
    
    // Create directory if it doesn't exist (for user/local scope)
    if (scope !== 'project' && !fs.existsSync(configDir)) {
      logger.info(`Creating directory: ${configDir}`);
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write config file
    const configContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, configContent, 'utf8');
    
    logger.success('Configuration ' + (configExists && config.mcpServers.meldoc ? 'updated' : 'added') + ' successfully!');
    console.log();
    
    // Show what was added
    logger.info('MCP server configuration:');
    console.log('  ' + logger.highlight(JSON.stringify(config.mcpServers.meldoc, null, 2)));
    console.log();
    
    // Count other MCP servers
    const otherServers = Object.keys(config.mcpServers).filter(key => key !== 'meldoc');
    if (otherServers.length > 0) {
      logger.info(`Found ${otherServers.length} other MCP server(s): ${otherServers.join(', ')}`);
      console.log();
    }
    
    // Next steps
    logger.section('✅ Installation Complete!');
    console.log();
    logger.info('Next steps:');
    console.log();
    console.log('  1. ' + logger.label('Restart Claude Code'));
    console.log('     Completely close and reopen Claude Code for changes to take effect.');
    console.log();
    console.log('  2. ' + logger.label('Authenticate with Meldoc'));
    console.log('     Run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
    console.log();
    console.log('  3. ' + logger.label('Start using Claude Code with Meldoc!'));
    console.log('     Ask Claude Code to read, search, or update your documentation.');
    console.log();
    
    process.exit(0);
  } catch (error) {
    const configPath = scope === 'project' ? getClaudeCodeProjectConfigPath() : getClaudeCodeUserConfigPath();
    logger.error(`Installation failed: ${error.message}`);
    console.log();
    logger.info('You can manually configure Claude Code by:');
    console.log('  1. Opening the config file: ' + logger.highlight(configPath));
    console.log('  2. Adding this configuration:');
    console.log('     ' + logger.highlight(JSON.stringify({
      mcpServers: {
        meldoc: getExpectedMeldocConfigForClaudeCode()
      }
    }, null, 2)));
    console.log();
    logger.info('Or use the CLI command:');
    console.log('  ' + logger.highlight(`claude mcp add --transport stdio meldoc -- npx -y @meldocio/mcp-stdio-proxy@latest --scope ${scope}`));
    console.log();
    process.exit(1);
  }
}

/**
 * Handle install command - automatically configure MCP client
 */
function handleInstall(consumer, isLocal) {
  if (isLocal) {
    installLocal();
    return;
  }
  
  const consumerLower = (consumer || 'claude-desktop').toLowerCase();
  
  switch (consumerLower) {
    case 'claude-desktop':
    case 'claude':
      installClaudeDesktop();
      break;
    case 'cursor':
      installCursor(false); // Project-specific by default
      break;
    case 'cursor-global':
      installCursor(true);
      break;
    case 'claude-code':
      installClaudeCode('project'); // Project scope by default
      break;
    case 'claude-code-user':
      installClaudeCode('user');
      break;
    case 'claude-code-local':
      installClaudeCode('local');
      break;
    default:
      logger.error(`Unknown consumer: ${consumer}`);
      console.log();
      logger.info('Supported consumers:');
      console.log('  ' + logger.highlight('claude-desktop') + ' (or claude) - Claude Desktop');
      console.log('  ' + logger.highlight('cursor') + ' - Cursor IDE (project-specific)');
      console.log('  ' + logger.highlight('cursor-global') + ' - Cursor IDE (global)');
      console.log('  ' + logger.highlight('claude-code') + ' - Claude Code (project scope)');
      console.log('  ' + logger.highlight('claude-code-user') + ' - Claude Code (user scope)');
      console.log('  ' + logger.highlight('claude-code-local') + ' - Claude Code (local scope)');
      console.log();
      logger.info('Or use ' + logger.highlight('--local') + ' flag to create local mcp.json');
      console.log();
      process.exit(1);
  }
}

/**
 * Handle uninstall command - remove Meldoc MCP configuration from Claude Desktop
 */
function handleUninstall() {
  try {
    logger.section('🗑️  Uninstalling Meldoc MCP from Claude Desktop');
    console.log();
    
    const configPath = getClaudeDesktopConfigPath();
    
    logger.info(`Config file location: ${logger.highlight(configPath)}`);
    console.log();
    
    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      logger.warn('Claude Desktop configuration file not found');
      logger.info('Meldoc MCP is not configured (nothing to remove)');
      console.log();
      process.exit(0);
    }
    
    // Read existing config
    let config = {};
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to read config file: ${error.message}`);
      process.exit(1);
    }
    
    // Check if meldoc is configured
    if (!config.mcpServers || !config.mcpServers.meldoc) {
      logger.warn('Meldoc MCP is not configured in Claude Desktop');
      logger.info('Nothing to remove');
      console.log();
      process.exit(0);
    }
    
    // Show what will be removed
    logger.info('Current Meldoc configuration:');
    console.log('  ' + logger.highlight(JSON.stringify(config.mcpServers.meldoc, null, 2)));
    console.log();
    
    // Remove meldoc configuration
    delete config.mcpServers.meldoc;
    
    // If mcpServers is now empty, remove it too
    if (Object.keys(config.mcpServers).length === 0) {
      delete config.mcpServers;
    }
    
    // Write config file back
    const configContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, configContent, 'utf8');
    
    logger.success('Meldoc MCP configuration removed successfully!');
    console.log();
    
    // Count remaining MCP servers
    if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
      const remainingServers = Object.keys(config.mcpServers);
      logger.info(`Remaining MCP server(s): ${remainingServers.join(', ')}`);
      console.log();
    } else {
      logger.info('No other MCP servers configured');
      console.log();
    }
    
    // Next steps
    logger.section('✅ Uninstallation Complete!');
    console.log();
    logger.info('Next steps:');
    console.log('  1. Restart Claude Desktop for changes to take effect');
    console.log('  2. To reinstall, run: ' + logger.highlight('npx @meldocio/mcp-stdio-proxy install'));
    console.log();
    
    process.exit(0);
  } catch (error) {
    logger.error(`Uninstallation failed: ${error.message}`);
    console.log();
    logger.info('You can manually remove Meldoc MCP by:');
    console.log('  1. Opening the config file: ' + logger.highlight(getClaudeDesktopConfigPath()));
    console.log('  2. Removing the "meldoc" entry from "mcpServers" object');
    console.log();
    process.exit(1);
  }
}

/**
 * Handle help command
 */
function handleHelp() {
  console.log('\n' + logger.section('📖 Meldoc MCP CLI Help'));
  console.log();
  
  console.log(logger.label('Available Commands:'));
  console.log();
  
  console.log('  ' + logger.highlight('auth login'));
  console.log('    Authenticate with Meldoc using device flow');
  console.log();
  
  console.log('  ' + logger.highlight('auth status'));
  console.log('    Check authentication status');
  console.log();
  
  console.log('  ' + logger.highlight('auth logout'));
  console.log('    Log out and clear credentials');
  console.log();
  
  console.log('  ' + logger.highlight('config set-workspace <alias>'));
  console.log('    Set the active workspace alias');
  console.log();
  
  console.log('  ' + logger.highlight('config get-workspace'));
  console.log('    Get the current workspace alias');
  console.log();
  
  console.log('  ' + logger.highlight('config list-workspaces'));
  console.log('    List all available workspaces');
  console.log();
  
  console.log('  ' + logger.highlight('install [consumer] [--local]'));
  console.log('    Automatically configure MCP client for Meldoc MCP');
  console.log('    Consumers: claude-desktop (default), cursor, cursor-global, claude-code');
  console.log('    Use --local flag to create local mcp.json file');
  console.log();
  
  console.log('  ' + logger.highlight('uninstall'));
  console.log('    Remove Meldoc MCP configuration from Claude Desktop');
  console.log();
  
  console.log('  ' + logger.highlight('help'));
  console.log('    Show this help message');
  console.log();
  
  console.log(logger.label('Examples:'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy install'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy install claude-desktop'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy install cursor'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy install claude-code'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy install --local'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy uninstall'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth login'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy config set-workspace my-workspace'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy config list-workspaces'));
  console.log();
  
  process.exit(0);
}

/**
 * Show usage hints when no arguments provided
 */
function showUsageHints() {
  console.log('\n' + logger.section('🔧 Meldoc MCP CLI'));
  console.log();
  console.log(logger.label('Available commands:'));
  console.log('  ' + logger.highlight('auth login') + '        - Authenticate with Meldoc');
  console.log('  ' + logger.highlight('auth status') + '       - Check authentication status');
  console.log('  ' + logger.highlight('auth logout') + '       - Log out');
  console.log('  ' + logger.highlight('config set-workspace') + ' - Set workspace alias');
  console.log('  ' + logger.highlight('config get-workspace') + ' - Get current workspace');
  console.log('  ' + logger.highlight('config list-workspaces') + ' - List workspaces');
  console.log('  ' + logger.highlight('install [consumer]') + ' - Configure MCP client');
  console.log('  ' + logger.highlight('uninstall') + '          - Remove configuration');
  console.log('  ' + logger.highlight('help') + '              - Show detailed help');
  console.log();
  console.log(logger.label('For more information, run:'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy help') + '\n');
  process.exit(0);
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // No arguments - show usage hints
    showUsageHints();
    return;
  }
  
  const command = args[0];
  const subcommand = args[1];
  const value = args[2];
  
  if (command === 'help' || command === '--help' || command === '-h') {
    handleHelp();
  } else if (command === 'install') {
    // Parse install arguments
    let consumer = null;
    let isLocal = false;
    
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--local' || args[i] === '-l') {
        isLocal = true;
      } else if (!args[i].startsWith('--') && !args[i].startsWith('-')) {
        consumer = args[i];
      }
    }
    
    handleInstall(consumer, isLocal);
  } else if (command === 'uninstall') {
    handleUninstall();
  } else if (command === 'auth') {
    if (subcommand === 'login') {
      await handleAuthLogin();
    } else if (subcommand === 'status') {
      await handleAuthStatus();
    } else if (subcommand === 'logout') {
      handleAuthLogout();
    } else {
      logger.error(`Unknown auth command: ${subcommand}`);
      console.log('\n' + logger.label('Usage:'));
      console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth <login|status|logout>') + '\n');
      process.exit(1);
    }
  } else if (command === 'config') {
    if (subcommand === 'set-workspace') {
      handleConfigSetWorkspace(value);
    } else if (subcommand === 'get-workspace') {
      handleConfigGetWorkspace();
    } else if (subcommand === 'list-workspaces') {
      await handleConfigListWorkspaces();
    } else {
      logger.error(`Unknown config command: ${subcommand}`);
      console.log('\n' + logger.label('Usage:'));
      console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy config <set-workspace|get-workspace|list-workspaces>') + '\n');
      process.exit(1);
    }
  } else {
    // Unknown command
    logger.error(`Unknown command: ${command}`);
    console.log('\n' + logger.label('Available commands:'));
    console.log('  ' + logger.highlight('install') + '        - Configure Claude Desktop');
    console.log('  ' + logger.highlight('uninstall') + '      - Remove configuration');
    console.log('  ' + logger.highlight('auth') + ' <cmd>      - Authentication commands');
    console.log('  ' + logger.highlight('config') + ' <cmd>    - Configuration commands');
    console.log('  ' + logger.highlight('help') + '           - Show help');
    console.log();
    console.log(logger.label('Run') + ' ' + logger.highlight('npx @meldocio/mcp-stdio-proxy help') + ' ' + logger.label('for more information'));
    console.log();
    process.exit(1);
  }
}

// Run main when this file is required (called from main proxy)
// main() will handle commands and exit, so this is safe to call
main().catch((error) => {
  logger.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});

module.exports = {
  handleAuthLogin,
  handleAuthStatus,
  handleAuthLogout,
  handleConfigSetWorkspace,
  handleConfigGetWorkspace,
  handleConfigListWorkspaces,
  handleInstall,
  handleUninstall,
  installClaudeDesktop,
  installCursor,
  installClaudeCode,
  installLocal
};
