# @meldoc/mcp-stdio-proxy

MCP stdio proxy for meldoc - connects Claude Desktop to meldoc MCP API without requiring CLI installation.

## Description

This npm package provides a lightweight proxy that bridges JSON-RPC communication between Claude Desktop and the meldoc MCP API. It reads JSON-RPC requests from stdin and forwards them to the meldoc API over HTTP, then returns the responses via stdout.

## Installation

The package is designed to be used via `npx`, so no installation is required. However, if you want to install it globally:

```bash
npm install -g @meldoc/mcp-stdio-proxy
```

## Usage

### Claude Desktop Configuration

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
      "args": ["-y", "@meldoc/mcp-stdio-proxy"],
      "env": {
        "MELDOC_MCP_TOKEN": "your_token_here"
      }
    }
  }
}
```

After adding the configuration, restart Claude Desktop.

### Environment Variables

- **MELDOC_MCP_TOKEN** (required): Your meldoc MCP authentication token
- **MELDOC_API_URL** (optional): Base URL for the meldoc API. Defaults to `https://api.meldoc.io`

Example with custom API URL:

```json
{
  "mcpServers": {
    "meldoc": {
      "command": "npx",
      "args": ["-y", "@meldoc/mcp-stdio-proxy"],
      "env": {
        "MELDOC_MCP_TOKEN": "your_token_here",
        "MELDOC_API_URL": "https://custom.api.example.com"
      }
    }
  }
}
```

### Command Line Testing

You can test the proxy directly from the command line:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  MELDOC_MCP_TOKEN=your_token_here npx @meldoc/mcp-stdio-proxy
```

Or with a custom API URL:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  MELDOC_MCP_TOKEN=your_token_here \
  MELDOC_API_URL=https://custom.api.example.com \
  npx @meldoc/mcp-stdio-proxy
```

## How It Works

1. The proxy reads JSON-RPC requests from `stdin` (newline-delimited JSON)
2. Each request is forwarded to `https://api.meldoc.io/mcp/v1/rpc` (or custom URL)
3. The `Authorization: Bearer {token}` header is automatically added
4. Responses are written to `stdout` in JSON-RPC format
5. Errors are handled and returned as proper JSON-RPC error responses

### Supported Features

- ✅ JSON-RPC 2.0 protocol
- ✅ Single and batch requests
- ✅ Proper error handling with JSON-RPC error codes
- ✅ Request timeout handling (30 seconds)
- ✅ Network error recovery
- ✅ Line-by-line processing for streaming

## JSON-RPC Error Codes

The proxy uses standard JSON-RPC 2.0 error codes:

- `-32700`: Parse error (invalid JSON)
- `-32600`: Invalid Request (malformed JSON-RPC)
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error (network errors, timeouts, etc.)
- `-32000`: Server error (HTTP 4xx/5xx responses)

## Troubleshooting

### Error: MELDOC_MCP_TOKEN environment variable is required

**Solution:** Make sure you've set the `MELDOC_MCP_TOKEN` in the `env` section of your Claude Desktop configuration.

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
# Test with a simple request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  MELDOC_MCP_TOKEN=your_token npx @meldoc/mcp-stdio-proxy

# Test with verbose output (if needed)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  MELDOC_MCP_TOKEN=your_token \
  DEBUG=1 \
  npx @meldoc/mcp-stdio-proxy
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

- Node.js >= 14.0.0
- Valid meldoc MCP token

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please visit:
- GitHub Issues: https://github.com/meldoc/mcp-stdio-proxy/issues
- Documentation: https://docs.meldoc.io

## Related

- [meldoc MCP Documentation](https://docs.meldoc.io/integrations/mcp)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
