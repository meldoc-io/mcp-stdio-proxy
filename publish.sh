#!/bin/bash

# Script for publishing @meldocio/mcp-stdio-proxy

echo "🚀 Publishing @meldocio/mcp-stdio-proxy v1.0.0"
echo ""

# Check that we're in the correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run the script from the project root."
  exit 1
fi

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
  echo "   Install: npx @meldocio/mcp-stdio-proxy"
else
  echo ""
  echo "❌ Error publishing. Check the logs above."
  exit 1
fi
