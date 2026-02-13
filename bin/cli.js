#!/usr/bin/env node

/**
 * CLI Entry Point
 *
 * This is the main entry point for the Meldoc MCP CLI.
 * All command handlers are in lib/cli/commands.js
 * All formatters are in lib/cli/formatters.js
 */

// Import command handlers
const {
  handleAuthLogin,
  handleAuthStatus,
  handleAuthLogout,
  handleConfigSetWorkspace,
  handleConfigGetWorkspace,
  handleConfigListWorkspaces,
  handleInstall,
  handleUninstall
} = require('../lib/cli/commands');

// Import formatters
const {
  handleHelp,
  showUsageHints,
  showUnknownCommandError,
  showUnknownAuthCommandError,
  showUnknownConfigCommandError
} = require('../lib/cli/formatters');

const logger = require('../lib/core/logger');

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
      showUnknownAuthCommandError(subcommand);
    }
  } else if (command === 'config') {
    if (subcommand === 'set-workspace') {
      handleConfigSetWorkspace(value);
    } else if (subcommand === 'get-workspace') {
      handleConfigGetWorkspace();
    } else if (subcommand === 'list-workspaces') {
      await handleConfigListWorkspaces();
    } else {
      showUnknownConfigCommandError(subcommand);
    }
  } else {
    // Unknown command
    showUnknownCommandError(command);
  }
}

// Run main when this file is required (called from main proxy)
// main() will handle commands and exit, so this is safe to call
main().catch((error) => {
  logger.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
