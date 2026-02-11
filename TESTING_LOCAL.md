# Local Testing

This document describes how to test the MCP proxy with a local server.

## Setup

### Production (default)

- `MELDOC_API_URL=https://api.meldoc.io`
- `MELDOC_APP_URL=https://app.meldoc.io`

### Local Testing

Set the environment variables:

- `MELDOC_API_URL` - URL for API requests (locally: `http://localhost:8080`)
- `MELDOC_APP_URL` - URL for the frontend displayed in the console (locally: `http://localhost:4200`)

```bash
export MELDOC_API_URL="http://localhost:8080"
export MELDOC_APP_URL="http://localhost:4200"
```

Or use them for a specific command:

```bash
MELDOC_API_URL=http://localhost:8080 MELDOC_APP_URL=http://localhost:4200 node bin/cli.js auth login
```

**Important:** If `MELDOC_APP_URL` is not set, the `verificationUrl` from the server response will be used.

## Running Tests

### All Tests

```bash
npm test
```

### Tests with Local Server

```bash
npm run test:local
```

Or:

```bash
MELDOC_API_URL=http://localhost:8080 MELDOC_APP_URL=http://localhost:4200 npm test
```

### Tests in Watch Mode

```bash
npm run test:watch
```

## Testing CLI Commands

### Auth Login

```bash
MELDOC_API_URL=http://localhost:8080 MELDOC_APP_URL=http://localhost:4200 node bin/cli.js auth login
```

This will start the device flow and display a URL with a code for login. The URL in the console will use `MELDOC_APP_URL` (<http://localhost:4200>), and API requests will go to `MELDOC_API_URL` (<http://localhost:8080>).

### Auth Status

```bash
MELDOC_API_URL=http://localhost:8080 node bin/cli.js auth status
```

Checks authentication status.

### Auth Logout

```bash
node bin/cli.js auth logout
```

Deletes credentials.json.

### Config Set Workspace

```bash
node bin/cli.js config set-workspace my-workspace
```

Sets workspace alias.

### Config Get Workspace

```bash
node bin/cli.js config get-workspace
```

Gets the current workspace alias.

### Config List Workspaces

```bash
MELDOC_API_URL=http://localhost:8080 node bin/cli.js config list-workspaces
```

Gets the list of workspaces via MCP tool.

## Testing MCP Proxy

### Starting Proxy with Local Server

```bash
MELDOC_API_URL=http://localhost:8080 node bin/meldoc-mcp-proxy.js
```

Then send JSON-RPC requests via stdin:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
  MELDOC_API_URL=http://localhost:8080 node bin/meldoc-mcp-proxy.js
```

### Testing with Token

```bash
MELDOC_ACCESS_TOKEN=your-token \
MELDOC_API_URL=http://localhost:8080 \
node bin/meldoc-mcp-proxy.js
```

## MCP Configuration in Claude Desktop for Local Testing

To test with a local server in Claude Desktop, you need to properly configure it.

**Important:** In MCP configuration, you cannot use shell syntax `VAR=value command`. Environment variables must be specified in the `env` section.

### Correct Configuration

Add to the `claude_desktop_config.json` file:

**macOS:**

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**

```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**

```
~/.config/Claude/claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "test-mcp": {
      "command": "node",
      "args": [
        "/Users/eduardbalev/Documents/projects/onboarding_ai/mcp_lib/bin/meldoc-mcp-proxy.js"
      ],
      "env": {
        "MELDOC_API_URL": "http://localhost:8080",
        "MELDOC_APP_URL": "http://localhost:4200",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

**Important Points:**

1. **Use `meldoc-mcp-proxy.js`**, not `cli.js` - this is the main MCP server
2. **Full file path** - specify the absolute path to `meldoc-mcp-proxy.js`
3. **Environment variables in `env`** - do not use `VAR=value` in the command
4. **Path to `node`** - if `node` is not found, use the full path (e.g., `/opt/homebrew/opt/node@20/bin/node` or `/usr/local/bin/node`)

### Alternative: Using Full Path to node

If `node` is not found in PATH, use the full path:

```json
{
  "mcpServers": {
    "test-mcp": {
      "command": "/opt/homebrew/opt/node@20/bin/node",
      "args": [
        "/Users/eduardbalev/Documents/projects/onboarding_ai/mcp_lib/bin/meldoc-mcp-proxy.js"
      ],
      "env": {
        "MELDOC_API_URL": "http://localhost:8080",
        "MELDOC_APP_URL": "http://localhost:4200",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

### Checking Path to node

To find the full path to `node`, run:

```bash
which node
```

Or to check a specific version:

```bash
which node@20
```

## Test Structure

Tests are located in `__tests__/`:

- `credentials.test.js` - tests for working with credentials.json
- `config.test.js` - tests for working with config.json
- `auth.test.js` - tests for auth resolution and refresh
- `workspace.test.js` - tests for workspace resolution
- `proxy.test.js` - tests for the main proxy

## Debugging

For debugging, set `LOG_LEVEL=DEBUG`:

```bash
LOG_LEVEL=DEBUG \
MELDOC_API_URL=http://localhost:8080 \
MELDOC_APP_URL=http://localhost:4200 \
node bin/meldoc-mcp-proxy.js
```

All logs go to stderr, stdout contains only JSON-RPC responses.
