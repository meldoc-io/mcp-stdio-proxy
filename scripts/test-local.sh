#!/bin/bash

# Script for local testing with http://localhost:4200

echo "Setting up local testing environment..."
echo "API URL: http://localhost:4200"
echo ""

export MELDOC_API_URL="http://localhost:4200"

echo "Available commands:"
echo "  npm test                    - Run all tests"
echo "  npm run test:local          - Run tests with localhost:4200"
echo ""
echo "CLI commands:"
echo "  MELDOC_API_URL=http://localhost:4200 node bin/cli.js auth login"
echo "  MELDOC_API_URL=http://localhost:4200 node bin/cli.js auth status"
echo "  MELDOC_API_URL=http://localhost:4200 node bin/cli.js config list-workspaces"
echo ""
echo "MCP Proxy:"
echo "  MELDOC_API_URL=http://localhost:4200 node bin/meldoc-mcp-proxy.js"
echo ""

# Run tests if requested
if [ "$1" = "test" ]; then
  echo "Running tests with localhost:4200..."
  npm test
fi
