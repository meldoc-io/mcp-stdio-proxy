---
alias: introduction
title: Meldoc MCP
---
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

- [[getting-started]] - Set up Meldoc MCP in 4 simple steps
- [[authentication]] - Learn how to log in and manage credentials
- [[workspaces]] - Understand and manage workspaces
- [[commands]] - Complete CLI command reference
- [[claude-integration]] - Available MCP tools and capabilities
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
