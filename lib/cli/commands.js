/**
 * CLI Command Handlers
 *
 * Handles all CLI commands for auth, config, and installation.
 */

const { interactiveLogin } = require('../device-flow');
const { deleteCredentials } = require('../credentials');
const { getAuthStatus, getAccessToken } = require('../auth');
const { setWorkspaceAlias, getWorkspaceAlias } = require('../config');
const { getApiUrl, getAppUrl } = require('../constants');
const { createInstaller } = require('../install/installers');
const axios = require('axios');
const https = require('https');
const chalk = require('chalk');
const logger = require('../logger');

const API_URL = getApiUrl();
const APP_URL = getAppUrl();

/**
 * Authentication Commands
 */

/**
 * Handle auth login command
 */
async function handleAuthLogin() {
  try {
    await interactiveLogin({
      autoOpen: true,
      showQR: false,
      timeout: 120000,
      apiBaseUrl: API_URL,
      appUrl: APP_URL
    });
    process.exit(0);
  } catch (error) {
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
 * Configuration Commands
 */

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
 * Installation Commands
 */

/**
 * Handle install command - automatically configure MCP client
 */
function handleInstall(consumer, isLocal) {
  if (isLocal) {
    const installer = createInstaller('local');
    const result = installer.install();
    process.exit(result.result === 'error' ? 1 : 0);
    return;
  }

  const consumerLower = (consumer || 'claude-desktop').toLowerCase();
  let client, scope;

  switch (consumerLower) {
    case 'claude-desktop':
    case 'claude':
      client = 'claude-desktop';
      scope = 'project';
      break;
    case 'cursor':
      client = 'cursor';
      scope = 'project';
      break;
    case 'cursor-global':
      client = 'cursor';
      scope = 'global';
      break;
    case 'claude-code':
      client = 'claude-code';
      scope = 'project';
      break;
    case 'claude-code-user':
      client = 'claude-code';
      scope = 'user';
      break;
    case 'claude-code-local':
      client = 'claude-code';
      scope = 'local';
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
      return;
  }

  // Use new unified installer
  const installer = createInstaller(client, scope);
  const result = installer.install();
  process.exit(result.result === 'error' ? 1 : 0);
}

/**
 * Handle uninstall command - remove Meldoc MCP configuration
 */
function handleUninstall() {
  // Default to Claude Desktop for backward compatibility
  const installer = createInstaller('claude-desktop');
  const result = installer.uninstall();
  process.exit(result.result === 'error' ? 1 : 0);
}

module.exports = {
  // Auth commands
  handleAuthLogin,
  handleAuthStatus,
  handleAuthLogout,

  // Config commands
  handleConfigSetWorkspace,
  handleConfigGetWorkspace,
  handleConfigListWorkspaces,

  // Installation commands
  handleInstall,
  handleUninstall
};
