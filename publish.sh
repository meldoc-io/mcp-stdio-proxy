#!/bin/bash

# Script for publishing @meldocio/mcp-stdio-proxy

# Check that we're in the correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run the script from the project root."
  exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "🚀 Publishing @meldocio/mcp-stdio-proxy v${VERSION}"
echo ""

# Update versions in .claude-plugin files
echo "🔄 Updating versions in .claude-plugin files..."

if [ ! -f ".claude-plugin/marketplace.json" ]; then
  echo "⚠️  Warning: .claude-plugin/marketplace.json not found. Skipping version update."
else
  node -e "
    const fs = require('fs');
    const marketplace = JSON.parse(fs.readFileSync('.claude-plugin/marketplace.json', 'utf8'));
    marketplace.plugins[0].version = '${VERSION}';
    fs.writeFileSync('.claude-plugin/marketplace.json', JSON.stringify(marketplace, null, 2) + '\n');
  "
  echo "✅ Updated .claude-plugin/marketplace.json"
fi

if [ ! -f ".claude-plugin/plugin.json" ]; then
  echo "⚠️  Warning: .claude-plugin/plugin.json not found. Skipping version update."
else
  node -e "
    const fs = require('fs');
    const plugin = JSON.parse(fs.readFileSync('.claude-plugin/plugin.json', 'utf8'));
    plugin.version = '${VERSION}';
    fs.writeFileSync('.claude-plugin/plugin.json', JSON.stringify(plugin, null, 2) + '\n');
  "
  echo "✅ Updated .claude-plugin/plugin.json"
fi

echo ""

# Authentication check
echo "📋 Checking npm authentication..."
if ! npm whoami &>/dev/null; then
  echo "⚠️  You are not logged in to npm."
  echo "   Run: npm login"
  echo "   Or add token to ~/.npmrc:"
  echo "   //registry.npmjs.org/:_authToken=YOUR_TOKEN"
  exit 1
fi

echo "✅ Authentication OK: $(npm whoami)"
echo ""

# Running tests
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Fix errors before publishing."
  exit 1
fi

echo ""
echo "📦 Publishing package..."
npm publish --access public

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Package published successfully!"
  echo "   Version: v${VERSION}"
  echo "   Install: npx @meldocio/mcp-stdio-proxy@${VERSION}"
  echo ""
else
  echo ""
  echo "❌ Error publishing. Check the logs above."
  exit 1
fi
