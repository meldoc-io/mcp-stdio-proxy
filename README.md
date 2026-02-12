# Meldoc MCP for Claude Desktop

[![npm version](https://badge.fury.io/js/@meldocio%2Fmcp-stdio-proxy.svg)](https://www.npmjs.com/package/@meldocio/mcp-stdio-proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This package allows you to connect Claude Desktop to your Meldoc account, so you can use all your documentation directly in Claude.

## 🚀 Quick Start - Install from Claude Marketplace

The easiest way to install Meldoc MCP is through the Claude Marketplace:

```bash
# Add the marketplace
claude plugin marketplace add meldoc-io/mcp-stdio-proxy

# Install the plugin
claude plugin install meldoc-mcp@meldoc-mcp
```

After installation:

1. Restart Claude Desktop (or your MCP client)
2. Run `npx @meldocio/mcp-stdio-proxy@latest auth login` to authenticate

Done! 🎉 Now you can ask Claude to work with your Meldoc documentation.

## What is this?

This is a bridge between Claude Desktop and Meldoc. After setup, Claude will be able to:

- 📖 Read your documentation from Meldoc
- 🔍 Search through documents
- ✏️ Create and update documents (if you have permissions)
- 📁 Work with projects and workspaces

**No additional installation required** - everything works automatically through Claude Desktop.

## Installation

### Via Claude Marketplace (Recommended) 🚀

See [Quick Start](#-quick-start---install-from-claude-marketplace) section above for the easiest installation method.

### Via NPM

You can also install directly via npm:

```bash
npm install -g @meldocio/mcp-stdio-proxy
```

Then add to your Claude Desktop config file (see Manual Installation below).

## Quick Setup

### Automatic Installation (Recommended) ✨

The easiest way to set up Meldoc MCP is using the automatic installer:

```bash
npx @meldocio/mcp-stdio-proxy@latest install
```

This command will:

- ✅ Automatically find your Claude Desktop configuration file
- ✅ Add Meldoc MCP configuration (preserving existing MCP servers)
- ✅ Create the config file and directory if needed
- ✅ Check if already installed (won't duplicate if already configured)
- ✅ Show you the next steps

After running `install`, you just need to:

1. Restart Claude Desktop
2. Run `npx @meldocio/mcp-stdio-proxy@latest auth login`

Done! 🎉

### Uninstalling

To remove Meldoc MCP from Claude Desktop:

```bash
npx @meldocio/mcp-stdio-proxy@latest uninstall
```

This will:

- ✅ Remove Meldoc MCP configuration from Claude Desktop
- ✅ Preserve other MCP servers
- ✅ Clean up empty `mcpServers` object if needed

After running `uninstall`, restart Claude Desktop for changes to take effect.

---

### Manual Installation

If you prefer to configure manually, follow these steps:

### Step 1: Find Claude Desktop configuration file

Open the configuration file depending on your operating system:

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

> 💡 **Tip:** If the file doesn't exist, create it. Make sure the folder exists.

### Step 2: Add Meldoc configuration

Open the file in any text editor and add the following:

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

> ⚠️ **Important:** If the file already has other MCP servers, simply add `"meldoc"` to the existing `mcpServers` object.

### Step 3: Restart Claude Desktop

Completely close and reopen Claude Desktop for the changes to take effect.

### Step 4: Log in to your Meldoc account

Open a terminal and run:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

Follow the on-screen instructions - you'll need to open a link in your browser and enter a code.

Done! Now Claude can work with your Meldoc documentation.

## Authentication (Logging in)

For Claude to work with your documentation, you need to log in to your Meldoc account. There are several ways to do this:

### Method 1: Interactive login (recommended) ✨

The easiest way is to use the login command:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

**What will happen:**

1. A link and code will appear in the terminal
2. Open the link in your browser
3. Enter the code on the Meldoc website
4. Done! Your data will be saved automatically

**Advantages:**

- ✅ No need to copy tokens manually
- ✅ Tokens are updated automatically
- ✅ Secure data storage

### Method 2: Using a token (for integrations)

If you're using a token for integration (e.g., for CI/CD), you can specify it directly.

**In Claude Desktop configuration:**

```json
{
  "mcpServers": {
    "meldoc": {
      "command": "npx",
      "args": ["-y", "@meldocio/mcp-stdio-proxy@latest"],
      "env": {
        "MELDOC_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Or via environment variable:**

```bash
export MELDOC_ACCESS_TOKEN=your_token_here
```

### Check login status

To check if you're logged in:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth status
```

### Logging out

To log out and remove saved data:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth logout
```

### Automatic token refresh

If you used `auth login`, tokens will be automatically refreshed 5 minutes before expiration. You don't need to do anything - everything works automatically!

## Frequently Asked Questions

### Do I need to install anything additional?

No! Everything works through `npx`, which automatically downloads the necessary files on first use.

### Is this secure?

Yes! Your tokens are stored locally on your computer with proper access permissions. Tokens are automatically refreshed so they don't expire.

### Can I use multiple accounts?

Yes, but you need to switch between them using the `auth logout` and `auth login` commands.

### What to do if something doesn't work?

1. Check that you're logged in: `npx @meldocio/mcp-stdio-proxy@latest auth status`
2. Check workspace: `npx @meldocio/mcp-stdio-proxy@latest config get-workspace`
3. See the "Troubleshooting" section above
4. If nothing helps, create an issue on GitHub

## How does it work?

When you ask Claude to do something with your documentation:

1. Claude sends a request through MCP (Model Context Protocol)
2. Our proxy receives the request and adds your authorization token
3. The request is sent to the Meldoc server
4. The response is returned back to Claude
5. Claude shows you the result

**Everything happens automatically** - you don't need to do anything manually!

### Features

- ✅ Automatic token refresh (no need to log in every time)
- ✅ Smart workspace selection (if there's only one, it's selected automatically)
- ✅ Secure data storage
- ✅ Works with multiple workspaces
- ✅ Support for projects and repositories

## Working Commands

### Installation commands

```bash
# Automatically configure Claude Desktop for Meldoc MCP
npx @meldocio/mcp-stdio-proxy@latest install

# Remove Meldoc MCP configuration from Claude Desktop
npx @meldocio/mcp-stdio-proxy@latest uninstall
```

### Authentication commands

```bash
# Log in to account (browser will open)
npx @meldocio/mcp-stdio-proxy@latest auth login

# Check if you're logged in
npx @meldocio/mcp-stdio-proxy@latest auth status

# Log out of account
npx @meldocio/mcp-stdio-proxy@latest auth logout
```

### Workspace management commands

If you have multiple workspaces, you can manage them:

```bash
# View all available workspaces
npx @meldocio/mcp-stdio-proxy@latest config list-workspaces

# Set default workspace
npx @meldocio/mcp-stdio-proxy@latest config set-workspace workspace-name

# View current workspace
npx @meldocio/mcp-stdio-proxy@latest config get-workspace
```

### Quick Installation Commands

```bash
# Automatically configure Claude Desktop
npx @meldocio/mcp-stdio-proxy@latest install

# Remove configuration
npx @meldocio/mcp-stdio-proxy@latest uninstall
```

### Help

```bash
# Show all available commands
npx @meldocio/mcp-stdio-proxy@latest help
```

## Working with Workspaces

If you have multiple workspaces in Meldoc, you need to specify which one to use.

### How is workspace selected?

The system selects a workspace in this order:

1. **Specified in request** - if you explicitly specified `workspaceAlias` or `workspaceId`
2. **Project file** - if there's a `meldoc.config.yml` file in the project folder (or git repository directory)
3. **Global setting** - if you set a default workspace
4. **Automatically** - if you only have one workspace, it will be selected automatically

**Note:** When MCP is used in a git project or directory (e.g., Claude Desktop terminal or any other LLM), the workspace is automatically taken from the `meldoc.config.yml` configuration file if it exists.

### Setting default workspace

If you have multiple workspaces, set one as default:

```bash
npx @meldocio/mcp-stdio-proxy@latest config set-workspace workspace-name
```

After this, Claude will automatically use this workspace.

### Workspace for a specific project

If you want different projects to use different workspaces, create a `meldoc.config.yml` file in the project root:

```yaml
workspaceAlias: workspace-name-for-this-project
```

Now when working from this folder (or when MCP is used in a git repository), the specified workspace will be used.

## What can Claude do with your documentation?

After setup, Claude gets access to the following capabilities:

### 📖 Working with documents

- **`docs_list`** - Show list of all documents in the project
- **`docs_get`** - Get content of a specific document
- **`docs_tree`** - Show document structure (tree)
- **`docs_search`** - Find documents by text
- **`docs_create`** - Create a new document (requires permissions)
- **`docs_update`** - Update a document (requires permissions)
- **`docs_delete`** - Delete a document (requires permissions)
- **`docs_links`** - Show all links from a document
- **`docs_backlinks`** - Show all documents that link to this one

### 📁 Working with projects

- **`projects_list`** - Show all available projects

### ⚙️ Management

- **`server_info`** - Information about your account and access permissions
- **`list_workspaces`** - Show all workspaces
- **`set_workspace`** - Set default workspace
- **`get_workspace`** - Get current workspace
- **`auth_status`** - Check login status

### How to use this?

Just ask Claude in a regular conversation! For example:

- "Show me all documents in the API project"
- "Find information about the authorization function"
- "Create a new document with API description"
- "Which documents link to the database document?"

Claude will automatically select the right tool and execute the request.

## Troubleshooting

### Error: "AUTH_REQUIRED" - token not found

**What to do:**

1. Run the login command:

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth login
   ```

2. Or check if you're logged in:

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth status
   ```

3. If using a token directly, make sure it's specified in Claude Desktop configuration

### Error: "WORKSPACE_REQUIRED" - need to select workspace

**What to do:**

If you have multiple workspaces, you need to specify which one to use:

1. View the list of available workspaces:

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest config list-workspaces
   ```

2. Set one as default:

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest config set-workspace workspace-name
   ```

### Error: "Invalid token" - invalid token

**What to do:**

1. If you used `auth login`, just log in again:

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth login
   ```

2. Check status:

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth status
   ```

3. If using a token manually, make sure it hasn't expired and is specified correctly

### Claude Desktop won't connect

**What to do:**

1. **Check the configuration file:**
   - Make sure the JSON is valid (you can check on jsonlint.com)
   - Verify that the file path is correct for your OS

2. **Restart Claude Desktop:**
   - Completely close the application
   - Open it again

3. **Check logs:**
   - Claude Desktop has a logs section - check if there are any errors there

### Internet connection issues

If you're experiencing connection errors:

1. Check your internet connection
2. Make sure the site `https://api.meldoc.io` is accessible
3. Check if a firewall or proxy is blocking requests

## Development

### Prerequisites

- Node.js >= 14.0.0
- npm

### Setup

```bash
git clone https://github.com/meldoc-io/mcp-stdio-proxy.git
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

## Configuration Files

The system uses several files to store settings. Usually you don't need to edit them manually - everything is done through commands.

### `~/.meldoc/credentials.json`

Created automatically when logging in via `auth login`. Contains:

- Access tokens
- User information
- Automatic refresh settings

**Do not edit this file manually!**

### `~/.meldoc/config.json`

Global settings:

- Default workspace
- Other settings

Can be edited manually or through CLI commands.

### `meldoc.config.yml` (optional)

Project-specific settings. Create in the project root if you need to use a different workspace for this project. When MCP is used in a git project or directory, the workspace is automatically taken from this configuration file if it exists.

## Requirements

- **Node.js 18.0.0 or newer** (usually already installed if Claude Desktop works)
- **Meldoc account** (can be created at [app.meldoc.io](https://app.meldoc.io))
- **Claude Desktop** installed and working

> 💡 **Checking Node.js:** Open a terminal and run `node --version`. If the command is not found, install Node.js from [nodejs.org](https://nodejs.org)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please visit:

- GitHub Issues: <https://github.com/meldoc-io/mcp-stdio-proxy/issues>
- Documentation: <https://docs.meldoc.io>

## Related

- [meldoc MCP Documentation](https://docs.meldoc.io/integrations/mcp)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
