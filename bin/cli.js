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
    console.log('  ' + logger.highlight('npx @meldoc/mcp auth login') + '\n');
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
    console.log('  ' + logger.highlight('npx @meldoc/mcp config set-workspace <alias>') + '\n');
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
      console.log('  ' + logger.highlight('npx @meldoc/mcp auth login') + '\n');
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
        console.log('  ' + logger.highlight('npx @meldoc/mcp auth login') + '\n');
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
  
  console.log('  ' + logger.highlight('help'));
  console.log('    Show this help message');
  console.log();
  
  console.log(logger.label('Examples:'));
  console.log('  ' + logger.highlight('npx @meldoc/mcp auth login'));
  console.log('  ' + logger.highlight('npx @meldoc/mcp config set-workspace my-workspace'));
  console.log('  ' + logger.highlight('npx @meldoc/mcp config list-workspaces'));
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
  console.log('  ' + logger.highlight('help') + '              - Show detailed help');
  console.log();
  console.log(logger.label('For more information, run:'));
  console.log('  ' + logger.highlight('npx @meldoc/mcp help') + '\n');
  process.exit(0);
}

/**
 * Main CLI handler
 */
function main() {
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
  } else if (command === 'auth') {
    if (subcommand === 'login') {
      handleAuthLogin();
    } else if (subcommand === 'status') {
      handleAuthStatus();
    } else if (subcommand === 'logout') {
      handleAuthLogout();
    } else {
      logger.error(`Unknown auth command: ${subcommand}`);
      console.log('\n' + logger.label('Usage:'));
      console.log('  ' + logger.highlight('npx @meldoc/mcp auth <login|status|logout>') + '\n');
      process.exit(1);
    }
  } else if (command === 'config') {
    if (subcommand === 'set-workspace') {
      handleConfigSetWorkspace(value);
    } else if (subcommand === 'get-workspace') {
      handleConfigGetWorkspace();
    } else if (subcommand === 'list-workspaces') {
      handleConfigListWorkspaces();
    } else {
      logger.error(`Unknown config command: ${subcommand}`);
      console.log('\n' + logger.label('Usage:'));
      console.log('  ' + logger.highlight('npx @meldoc/mcp config <set-workspace|get-workspace|list-workspaces>') + '\n');
      process.exit(1);
    }
  } else {
    // Unknown command - might be for main proxy
    // Return control to main proxy handler
    return;
  }
}

// Run main when this file is required (called from main proxy)
// main() will handle commands and exit, so this is safe to call
main();

module.exports = {
  handleAuthLogin,
  handleAuthStatus,
  handleAuthLogout,
  handleConfigSetWorkspace,
  handleConfigGetWorkspace,
  handleConfigListWorkspaces
};
