# @meldocio/mcp-stdio-proxy

MCP stdio proxy for meldoc - connects Claude Desktop to meldoc MCP API without requiring CLI installation.

## Description

This npm package provides a lightweight proxy that bridges JSON-RPC communication between Claude Desktop and the meldoc MCP API. It reads JSON-RPC requests from stdin and forwards them to the meldoc API over HTTP, then returns the responses via stdout.

The package follows MCP best practices:

- ✅ Pure stdio communication (no interactive prompts)
- ✅ All logs go to stderr (stdout is clean JSON-RPC only)
- ✅ No required arguments at startup
- ✅ Graceful error handling with proper JSON-RPC error codes
- ✅ Configurable logging levels

## Installation

### Using Claude Desktop MCP Command

```bash
claude mcp add meldoc npx @meldocio/mcp-stdio-proxy@latest
```

### Manual Configuration

Add the following configuration to your `claude_desktop_config.json` file:

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
    "meldoc": {
      "command": "npx",
      "args": ["-y", "@meldocio/mcp-stdio-proxy@latest"],
      "env": {
        "MELDOC_TOKEN": "your_token_here"
      }
    }
  }
}
```

After adding the configuration, restart Claude Desktop.

## Authentication

Meldoc MCP requires an access token. The token is checked in this order:

1. `MELDOC_TOKEN` environment variable (recommended)
2. `MELDOC_MCP_TOKEN` environment variable (backward compatibility)
3. `~/.meldoc/config.json` file
4. If none found, tools will return an authentication error

### Option 1: Environment variable (recommended)

Set the token as an environment variable:

```bash
export MELDOC_TOKEN=your_token_here
```

For permanent setup (macOS/Linux):

```bash
echo 'export MELDOC_TOKEN=your_token_here' >> ~/.zshrc  # or ~/.bashrc
source ~/.zshrc
```

For Claude Desktop, add it to your configuration:

```json
{
  "mcpServers": {
    "meldoc": {
      "command": "npx",
      "args": ["-y", "@meldocio/mcp-stdio-proxy@latest"],
      "env": {
        "MELDOC_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Option 2: Meldoc CLI

If you have the Meldoc CLI installed, run:

```bash
meldoc auth login
```

This will store the token in `~/.meldoc/config.json`, which the MCP proxy will automatically use.

### Option 3: Manual config file

Create `~/.meldoc/config.json` manually:

```json
{
  "token": "your_token_here"
}
```

### Environment Variables

- **MELDOC_TOKEN** (recommended): Your meldoc authentication token
- **MELDOC_MCP_TOKEN** (optional): Alternative token variable (for backward compatibility)
- **LOG_LEVEL** (optional): Logging level - `ERROR`, `WARN`, `INFO`, or `DEBUG` (default: `ERROR`)

### Command Line Testing

You can test the proxy directly from the command line:

```bash
# Test initialize (works without token)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
  npx @meldocio/mcp-stdio-proxy@latest

# Test tools/list (requires token)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  MELDOC_TOKEN=your_token_here npx @meldocio/mcp-stdio-proxy@latest

# Test with debug logging
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  MELDOC_TOKEN=your_token_here LOG_LEVEL=DEBUG npx @meldocio/mcp-stdio-proxy@latest
```

## How It Works

1. The proxy reads JSON-RPC requests from `stdin` (newline-delimited JSON)
2. Protocol methods (`initialize`, `ping`, `resources/list`) are handled locally
3. Tool requests are forwarded to `https://api.meldoc.io/mcp/v1/rpc`
4. The `Authorization: Bearer {token}` header is automatically added
5. Responses are written to `stdout` in JSON-RPC format (stdout is clean - only JSON-RPC)
6. All logs and diagnostics go to `stderr`
7. Errors are handled and returned as proper JSON-RPC error responses

### Supported Features

- ✅ JSON-RPC 2.0 protocol
- ✅ Single and batch requests
- ✅ Proper error handling with JSON-RPC error codes
- ✅ Custom error codes: `AUTH_REQUIRED`, `NOT_FOUND`, `RATE_LIMIT`
- ✅ Request timeout handling (25 seconds)
- ✅ Network error recovery
- ✅ Line-by-line processing for streaming
- ✅ Automatic support for all MCP tools (including `server_info`)
- ✅ Configurable logging levels (ERROR, WARN, INFO, DEBUG)
- ✅ Graceful shutdown on SIGINT/SIGTERM
- ✅ No required arguments at startup

## JSON-RPC Error Codes

The proxy uses standard JSON-RPC 2.0 error codes plus custom codes:

### Standard JSON-RPC 2.0 Codes

- `-32700`: Parse error (invalid JSON)
- `-32600`: Invalid Request (malformed JSON-RPC)
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error (network errors, timeouts, etc.)
- `-32000`: Server error (HTTP 4xx/5xx responses)

### Custom Error Codes

- `-32001`: Authentication required (`AUTH_REQUIRED`) - Token missing or invalid
- `-32002`: Not found (`NOT_FOUND`) - Resource not found
- `-32003`: Rate limit exceeded (`RATE_LIMIT`) - Too many requests

Error responses include:

- `code`: Error code
- `message`: Human-readable error message
- `data` (optional, DEBUG level only): Additional error details

## Available Tools

The proxy automatically supports all tools provided by the meldoc MCP API, including:

- **`server_info`** - Get information about the server configuration, available projects, and token capabilities
- **`docs_list`** - List available documentation
- **`docs_get`** - Get specific documentation content
- And other tools as provided by the API

### Example: Using `server_info`

You can get server information using the `server_info` tool:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"server_info","arguments":{}}}' | \
  MELDOC_MCP_TOKEN=your_token_here npx @meldocio/mcp-stdio-proxy
```

The response includes:

- Server name (from token)
- Token description (if provided)
- Available projects with IDs, names, and aliases
- Token capabilities (read, update, create, delete)
- Usage hints

### Response Metadata

All tool responses now include a `_meta` field with contextual information:

```json
{
  "items": [...],
  "_meta": {
    "server": "My Token",
    "projects": ["Frontend Docs", "Backend API"],
    "capabilities": ["read"],
    "hint": "Read permission required for this operation"
  }
}
```

This metadata helps AI assistants understand the context and limitations of the current token.

## Troubleshooting

### Error: AUTH_REQUIRED - Meldoc token not found

**Solution:** Set the `MELDOC_TOKEN` environment variable or run `meldoc auth login` to store the token in `~/.meldoc/config.json`. The token is checked when tools are called, not at startup.

### Connection timeout

**Solution:** Check your internet connection and verify that `https://api.meldoc.io` is accessible. You can test with:

```bash
curl https://api.meldoc.io/mcp/v1/rpc \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Invalid token error

**Solution:** Verify that your `MELDOC_MCP_TOKEN` is correct and hasn't expired. You can get a new token from the meldoc dashboard.

### Claude Desktop not connecting

**Solution:**

1. Verify the configuration JSON is valid (use a JSON validator)
2. Check that the file path is correct for your operating system
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for error messages

### Testing the proxy manually

To debug issues, you can test the proxy directly:

```bash
# Test initialize (works without token)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
  npx @meldocio/mcp-stdio-proxy@latest

# Test with a simple request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  MELDOC_TOKEN=your_token npx @meldocio/mcp-stdio-proxy@latest

# Test with debug logging
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  MELDOC_TOKEN=your_token \
  LOG_LEVEL=DEBUG \
  npx @meldocio/mcp-stdio-proxy@latest
```

## Development

### Prerequisites

- Node.js >= 14.0.0
- npm

### Setup

```bash
git clone https://github.com/meldoc/mcp-stdio-proxy.git
cd mcp-stdio-proxy
npm install
```

### Running Tests

```bash
npm test
```

### Building

No build step is required - the package uses plain JavaScript.

### Publishing

```bash
npm publish --access public
```

## Requirements

- Node.js >= 18.0.0
- Valid meldoc MCP token (required for tool calls, not for startup)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please visit:

- GitHub Issues: <https://github.com/meldoc/mcp-stdio-proxy/issues>
- Documentation: <https://docs.meldoc.io>

## Related

- [meldoc MCP Documentation](https://docs.meldoc.io/integrations/mcp)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
