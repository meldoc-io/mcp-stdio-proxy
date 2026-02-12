---
alias: introduction
title: Meldoc MCP
---
**Meldoc MCP** is a powerful bridge that connects MCP-compatible clients to your Meldoc account, enabling seamless access to your documentation directly within AI conversations.

## 🚀 Quick Start - Install from Claude Marketplace

The easiest way to install Meldoc MCP is through the Claude Marketplace:

```bash
# Add the marketplace
claude plugin marketplace add meldoc-io/mcp-stdio-proxy

# Install the plugin
claude plugin install meldoc-mcp@meldoc-mcp
```

After installation, restart your MCP client and authenticate:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

Done! 🎉 Now you can ask Claude to work with your Meldoc documentation.

## Overview

Meldoc MCP allows AI assistants (Claude Desktop, Cursor IDE, Claude Code, and other MCP clients) to interact with your Meldoc documentation through the Model Context Protocol (MCP). Once configured, you can ask your AI assistant to read, search, create, and update your documentation naturally.

### Key Features

- 🔗 **Seamless Integration** - Works with Claude Desktop, Cursor IDE, Claude Code, and other MCP clients
- 📖 **Document Access** - Read, search, create, and update your Meldoc documentation
- 🔍 **Smart Search** - Find information across all your documents instantly
- 🏢 **Multi-Workspace Support** - Work with multiple workspaces and projects
- 🔐 **Secure Authentication** - Automatic token management with device flow
- ⚡ **Zero Installation** - Everything works through `npx`, no local installation needed

### Supported MCP Clients

Meldoc MCP works with any client that supports the Model Context Protocol:

- **Claude Desktop** - Official Anthropic desktop application
- **Cursor IDE** - AI-powered code editor with MCP support
- **Claude Code** - Terminal-based Claude integration
- **Other MCP Clients** - Any tool that implements the MCP standard

### How It Works

When you interact with your AI assistant:

1. **Your AI assistant sends a request** through MCP (Model Context Protocol)
2. **MCP Proxy receives** the request and adds your authentication token
3. **Request is forwarded** to the Meldoc API server
4. **Response is returned** to your AI assistant
5. **You see the results** in your conversation

Everything happens automatically in the background - you just ask your AI assistant naturally!

## Quick Navigation

- [[getting-started]] - Set up Meldoc MCP in 4 simple steps
- [[authentication]] - Learn how to log in and manage credentials
- [[workspaces]] - Understand and manage workspaces
- [[commands]] - Complete CLI command reference
- [[mcp-tools]] - Available MCP tools and capabilities
- [[troubleshooting]] - Common issues and solutions
- [[advanced]] - Configuration files, environment variables, and best practices
- [[requirements]] - System and account requirements

## Support

- **GitHub Issues:** [GitHub Issues](https://github.com/meldoc-io/mcp-stdio-proxy/issues)
- **Documentation:** [Meldoc Documentation](https://docs.meldoc.io)
- **Meldoc Website:** [Meldoc App](https://app.meldoc.io)

## Related Documentation

- [Meldoc MCP Documentation](https://docs.meldoc.io/integrations/mcp)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

**Happy documenting! 📚✨**
