# Meldoc MCP Documentation

**Meldoc MCP** is a powerful bridge that connects Claude Desktop to your Meldoc account, enabling seamless access to your documentation directly within Claude conversations.

## Overview

Meldoc MCP allows Claude Desktop to interact with your Meldoc documentation through the Model Context Protocol (MCP). Once configured, you can ask Claude to read, search, create, and update your documentation naturally.

### Key Features

- 🔗 **Seamless Integration** - Works directly with Claude Desktop via MCP
- 📖 **Document Access** - Read, search, create, and update your Meldoc documentation
- 🔍 **Smart Search** - Find information across all your documents instantly
- 🏢 **Multi-Workspace Support** - Work with multiple workspaces and projects
- 🔐 **Secure Authentication** - Automatic token management with device flow
- ⚡ **Zero Installation** - Everything works through `npx`, no local installation needed

### How It Works

When you interact with Claude Desktop:

1. **Claude sends a request** through MCP (Model Context Protocol)
2. **MCP Proxy receives** the request and adds your authentication token
3. **Request is forwarded** to the Meldoc API server
4. **Response is returned** to Claude Desktop
5. **You see the results** in your conversation

Everything happens automatically in the background - you just ask Claude naturally!

## Quick Navigation

- [Getting Started](getting-started.meldoc.md) - Set up Meldoc MCP in 4 simple steps
- [Authentication](authentication.meldoc.md) - Learn how to log in and manage credentials
- [Workspaces](workspaces.meldoc.md) - Understand and manage workspaces
- [Commands](commands.meldoc.md) - Complete CLI command reference
- [Claude Integration](claude-integration.meldoc.md) - Available MCP tools and capabilities
- [Troubleshooting](troubleshooting.meldoc.md) - Common issues and solutions
- [Advanced Usage](advanced.meldoc.md) - Configuration files, environment variables, and best practices
- [Requirements](requirements.meldoc.md) - System and account requirements

## Support

- **GitHub Issues:** <https://github.com/meldoc/mcp-stdio-proxy/issues>
- **Documentation:** <https://docs.meldoc.io>
- **Meldoc Website:** <https://app.meldoc.io>

## Related Documentation

- [Meldoc MCP Documentation](https://docs.meldoc.io/integrations/mcp)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

**Happy documenting! 📚✨**
