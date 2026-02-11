---
alias: getting-started
title: Getting Started
---
Get up and running with Meldoc MCP in just 2 steps!

## Quick Start (Automatic Installation) ✨

The easiest way to set up Meldoc MCP:

1. **Run the installer:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest install
   ```

2. **Restart Claude Desktop** (completely close and reopen)

3. **Authenticate:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth login
   ```

Done! 🎉 Claude can now access your Meldoc documentation.

### Uninstalling

To remove Meldoc MCP from Claude Desktop:

```bash
npx @meldocio/mcp-stdio-proxy@latest uninstall
```

After running `uninstall`, restart Claude Desktop for changes to take effect.

---

## Manual Installation

If you prefer to configure manually, follow these steps:

### Step 1: Configure Claude Desktop

Find and open your Claude Desktop configuration file:

**macOS:**

```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**

```text
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**

```text
~/.config/Claude/claude_desktop_config.json
```

> 💡 **Tip:** If the file doesn't exist, create it. Make sure the directory exists first.

## Step 2: Add Meldoc Configuration

Add this configuration to your `claude_desktop_config.json`:

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

> ⚠️ **Important:** If you already have other MCP servers configured, just add `"meldoc"` to the existing `mcpServers` object.

## Step 3: Restart Claude Desktop

**Completely close and reopen** Claude Desktop for the configuration to take effect.

## Step 4: Authenticate

Open your terminal and run:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

Follow the on-screen instructions:

1. A URL and code will appear in your terminal
2. Open the URL in your browser
3. Enter the code on the Meldoc website
4. Done! Your credentials are saved automatically

🎉 **Congratulations!** You're all set. Claude can now access your Meldoc documentation.

## Next Steps

- Learn about [authentication](authentication.meldoc.md) methods
- Understand [workspace management](workspaces.meldoc.md)
- Explore [available commands](commands.meldoc.md)
- See what Claude can do with [Claude integration](claude-integration.meldoc.md)

## Troubleshooting

If you encounter any issues during setup, check the [troubleshooting guide](troubleshooting.meldoc.md).
