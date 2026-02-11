# Testing

## Quick Start

### Local Testing

**Production (default):**

- `MELDOC_API_URL=https://api.meldoc.io`
- `MELDOC_APP_URL=https://app.meldoc.io`

**Locally:**

- `MELDOC_API_URL=http://localhost:8080` (API server)
- `MELDOC_APP_URL=http://localhost:4200` (Frontend)

```bash
# Set environment variables for local testing
export MELDOC_API_URL="http://localhost:8080"
export MELDOC_APP_URL="http://localhost:4200"

# Run tests
npm run test:local

# Or for a single command
MELDOC_API_URL=http://localhost:8080 MELDOC_APP_URL=http://localhost:4200 npm test
```

**Note:** `MELDOC_APP_URL` is used for the URL displayed in the console during `auth login`. If not set, the `verificationUrl` from the server response is used.

## CLI Commands with localhost

```bash
# Auth login (locally: API on 8080, Frontend on 4200)
MELDOC_API_URL=http://localhost:8080 MELDOC_APP_URL=http://localhost:4200 node bin/cli.js auth login

# Auth status
MELDOC_API_URL=http://localhost:8080 node bin/cli.js auth status

# List workspaces
MELDOC_API_URL=http://localhost:8080 node bin/cli.js config list-workspaces
```

## MCP Proxy with localhost

```bash
# Start proxy (locally)
MELDOC_API_URL=http://localhost:8080 node bin/meldoc-mcp-proxy.js

# Test with JSON-RPC request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
  MELDOC_API_URL=http://localhost:8080 node bin/meldoc-mcp-proxy.js
```

## Available Scripts

- `npm test` - run all tests
- `npm run test:local` - run tests with localhost:4200
- `npm run test:watch` - run tests in watch mode

## Test Structure

- `__tests__/credentials.test.js` - tests for credentials.json
- `__tests__/config.test.js` - tests for config.json
- `__tests__/auth.test.js` - tests for auth resolution
- `__tests__/workspace.test.js` - tests for workspace resolution
- `__tests__/proxy.test.js` - tests for the main proxy

For more details, see [TESTING_LOCAL.md](TESTING_LOCAL.md)
