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

# Get absolute path to script directory (where package.json is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}" || exit 1

MARKETPLACE_FILE=".claude-plugin/marketplace.json"
PLUGIN_FILE=".claude-plugin/plugin.json"

# Update marketplace.json
if [ ! -f "${MARKETPLACE_FILE}" ]; then
  echo "⚠️  Warning: ${MARKETPLACE_FILE} not found. Skipping version update."
else
  # Use a temporary script file to avoid shell escaping issues
  TMP_SCRIPT=$(mktemp)
  cat > "${TMP_SCRIPT}" << EOF
const fs = require('fs');
const path = '${MARKETPLACE_FILE}';
const version = '${VERSION}';
try {
  const marketplace = JSON.parse(fs.readFileSync(path, 'utf8'));
  marketplace.plugins[0].version = version;
  fs.writeFileSync(path, JSON.stringify(marketplace, null, 2) + '\n');
  console.log('✅ Updated ${MARKETPLACE_FILE} to v' + version);
} catch (error) {
  console.error('❌ Error updating ${MARKETPLACE_FILE}:', error.message);
  process.exit(1);
}
EOF
  node "${TMP_SCRIPT}"
  NODE_EXIT=$?
  rm -f "${TMP_SCRIPT}"
  if [ $NODE_EXIT -ne 0 ]; then
    exit 1
  fi
  # Verify update
  UPDATED_VERSION=$(node -p "require('./${MARKETPLACE_FILE}').plugins[0].version" 2>/dev/null)
  if [ -z "${UPDATED_VERSION}" ] || [ "${UPDATED_VERSION}" != "${VERSION}" ]; then
    echo "❌ Error: Failed to update ${MARKETPLACE_FILE} version (expected ${VERSION}, got ${UPDATED_VERSION})"
    exit 1
  fi
fi

# Update plugin.json
if [ ! -f "${PLUGIN_FILE}" ]; then
  echo "⚠️  Warning: ${PLUGIN_FILE} not found. Skipping version update."
else
  # Use a temporary script file to avoid shell escaping issues
  TMP_SCRIPT=$(mktemp)
  cat > "${TMP_SCRIPT}" << EOF
const fs = require('fs');
const path = '${PLUGIN_FILE}';
const version = '${VERSION}';
try {
  const plugin = JSON.parse(fs.readFileSync(path, 'utf8'));
  plugin.version = version;
  fs.writeFileSync(path, JSON.stringify(plugin, null, 2) + '\n');
  console.log('✅ Updated ${PLUGIN_FILE} to v' + version);
} catch (error) {
  console.error('❌ Error updating ${PLUGIN_FILE}:', error.message);
  process.exit(1);
}
EOF
  node "${TMP_SCRIPT}"
  NODE_EXIT=$?
  rm -f "${TMP_SCRIPT}"
  if [ $NODE_EXIT -ne 0 ]; then
    exit 1
  fi
  # Verify update
  UPDATED_VERSION=$(node -p "require('./${PLUGIN_FILE}').version" 2>/dev/null)
  if [ -z "${UPDATED_VERSION}" ] || [ "${UPDATED_VERSION}" != "${VERSION}" ]; then
    echo "❌ Error: Failed to update ${PLUGIN_FILE} version (expected ${VERSION}, got ${UPDATED_VERSION})"
    exit 1
  fi
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
