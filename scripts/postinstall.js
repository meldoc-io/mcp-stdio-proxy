#!/usr/bin/env node

/**
 * Post-installation script
 *
 * Automatically installs MCP configuration for Claude Desktop when
 * the package is installed from npm/marketplace (not in development mode).
 *
 * This runs after:
 * - npm install @meldocio/mcp-stdio-proxy
 * - Installing from Claude Code marketplace
 *
 * Skipped when:
 * - Running in development (git repo with .git directory)
 * - Running in CI environment
 */

const fs = require('fs');
const path = require('path');

// Determine if this is a development installation
function isDevInstall() {
  // Check if we're in a git repository (development mode)
  const gitDir = path.join(__dirname, '..', '.git');
  if (fs.existsSync(gitDir)) {
    return true;
  }

  // Check if running in CI environment
  if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
    return true;
  }

  // Check if npm_config_global is set (global install, should still install)
  // This is not a dev install indicator

  return false;
}

// Silent installer - runs without user interaction
function installClaudeDesktopSilent() {
  try {
    // Import installer module
    const { install } = require('../lib/install/installers');

    // Run installation for Claude Desktop
    const result = install('claude-desktop', 'global');

    // Check result
    if (result.result === 'success') {
      console.log('✅ Meldoc MCP installed for Claude Desktop');
      console.log('   Restart Claude Desktop and run: npx @meldocio/mcp-stdio-proxy auth login');
    } else if (result.result === 'already_configured') {
      // Already configured, no need to notify
      // Silent success
    } else {
      // Installation failed, but don't break the npm install
      console.log('⚠️  Could not auto-install for Claude Desktop');
      console.log('   Run manually: npx @meldocio/mcp-stdio-proxy install');
    }

  } catch (error) {
    // Don't break npm install on error
    // Just notify user to install manually
    console.log('⚠️  Auto-install skipped for Claude Desktop');
    console.log('   Run manually: npx @meldocio/mcp-stdio-proxy install');
  }
}

// Main execution
function main() {
  // Skip if development install
  if (isDevInstall()) {
    // Silent skip - no output in dev mode
    return;
  }

  // Run silent installation for Claude Desktop
  installClaudeDesktopSilent();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  isDevInstall,
  installClaudeDesktopSilent,
  main
};
