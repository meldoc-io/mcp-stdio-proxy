/**
 * CLI Output Formatters
 *
 * Handles help text, usage hints, and other formatted CLI output.
 */

const logger = require('../logger');

/**
 * Show detailed help message with all commands and examples
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
 * Show brief usage hints when no arguments provided
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
 * Show unknown command error with available commands
 */
function showUnknownCommandError(command) {
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

/**
 * Show unknown auth subcommand error
 */
function showUnknownAuthCommandError(subcommand) {
  logger.error(`Unknown auth command: ${subcommand}`);
  console.log('\n' + logger.label('Usage:'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy auth <login|status|logout>') + '\n');
  process.exit(1);
}

/**
 * Show unknown config subcommand error
 */
function showUnknownConfigCommandError(subcommand) {
  logger.error(`Unknown config command: ${subcommand}`);
  console.log('\n' + logger.label('Usage:'));
  console.log('  ' + logger.highlight('npx @meldocio/mcp-stdio-proxy config <set-workspace|get-workspace|list-workspaces>') + '\n');
  process.exit(1);
}

module.exports = {
  handleHelp,
  showUsageHints,
  showUnknownCommandError,
  showUnknownAuthCommandError,
  showUnknownConfigCommandError
};
