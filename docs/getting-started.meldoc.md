---
alias: getting-started
title: Getting Started
---
Get up and running with Meldoc MCP in just 2 steps!

## Quick Start (Automatic Installation) ✨

Choose the command that matches your MCP client:

**Claude Desktop** (default):

```bash
npx @meldocio/mcp-stdio-proxy@latest install
```

**Cursor IDE** - project-specific (recommended) or global:

```bash
npx @meldocio/mcp-stdio-proxy@latest install cursor          # Project-specific
npx @meldocio/mcp-stdio-proxy@latest install cursor-global   # Global
```

**Claude Code** - project, user, or local scope:

```bash
npx @meldocio/mcp-stdio-proxy@latest install claude-code         # Project scope (shared with team)
npx @meldocio/mcp-stdio-proxy@latest install claude-code-user    # User scope (all projects)
npx @meldocio/mcp-stdio-proxy@latest install claude-code-local  # Local scope (private to you)
```

**Any MCP client** - create local `mcp.json` file:

```bash
npx @meldocio/mcp-stdio-proxy@latest install --local
```

After installation, restart your MCP client and authenticate:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

### Example Output

When you run the install command, you'll see something like this:

```text
🚀 Installing Meldoc MCP for Claude Desktop

Config file location: ~/Library/Application Support/Claude/claude_desktop_config.json

Found existing Claude Desktop configuration
Configuration added successfully!

Added MCP server configuration:
  {
    "command": "npx",
    "args": ["-y", "@meldocio/mcp-stdio-proxy@latest"]
  }

✅ Installation Complete!

Next steps:

  1. Restart Claude Desktop
     Completely close and reopen Claude Desktop for changes to take effect.

  2. Authenticate with Meldoc
     Run: npx @meldocio/mcp-stdio-proxy auth login

  3. Start using Claude with Meldoc!
     Ask Claude to read, search, or update your documentation.
```

### Uninstalling

**Claude Desktop:**

```bash
npx @meldocio/mcp-stdio-proxy@latest uninstall
```

**Other clients:** Manually remove the `meldoc` entry from your MCP configuration file, then restart your client.

---

## Manual Installation

If you prefer to configure manually, add this configuration to your MCP client's config file:

**Claude Desktop** - `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Cursor IDE** - `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global)

**Claude Code** - `.mcp.json` (project), `~/.claude.json` (user/local)

**Configuration to add:**

```json
{
  "mcpServers": {
    "meldoc": {
      "command": "npx",
      "args": ["-y", "@meldocio/mcp-stdio-proxy@latest"]
    }
  }
}
```

> **Note:** For Claude Code, add `"type": "stdio"` to the configuration. If you already have other MCP servers, just add `"meldoc"` to the existing `mcpServers` object.

After adding the configuration, restart your MCP client.

## Authentication

After installation, authenticate with Meldoc:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

You'll see a URL and code in your terminal. Open the URL in your browser, enter the code, and you're done! Your credentials are saved automatically.

🎉 **That's it!** Your MCP client can now access your Meldoc documentation.

## Next Steps

- Learn about [[authentication]] methods
- Understand [[workspaces]] management
- Explore [[commands]]
- See what Claude can do with [[claude-integration]]

## Troubleshooting

If you encounter any issues during setup, check the [[troubleshooting]] guide.
