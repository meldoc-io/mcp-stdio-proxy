---
alias: commands
title: Commands Reference
---
Complete reference for all CLI commands available in Meldoc MCP.

## Authentication Commands

### `auth login`

Authenticate with Meldoc using device flow.

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

Opens a browser-based authentication flow. Credentials are saved automatically.

**See also:** [[authentication]]

### `auth status`

Check your current authentication status.

```bash
npx @meldocio/mcp-stdio-proxy@latest auth status
```

**Shows:**

- Authentication status (✅ or ❌)
- User email
- Token expiration time

### `auth logout`

Log out and clear all saved credentials.

```bash
npx @meldocio/mcp-stdio-proxy@latest auth logout
```

## Configuration Commands

### `config set-workspace <alias>`

Set the default workspace alias.

```bash
npx @meldocio/mcp-stdio-proxy@latest config set-workspace my-workspace
```

**See also:** [[workspaces]]

### `config get-workspace`

Get the currently active workspace alias.

```bash
npx @meldocio/mcp-stdio-proxy@latest config get-workspace
```

### `config list-workspaces`

List all available workspaces.

```bash
npx @meldocio/mcp-stdio-proxy@latest config list-workspaces
```

## Help Command

### `help`

Show detailed help information.

```bash
npx @meldocio/mcp-stdio-proxy@latest help
```

## Related

- [[getting-started]] - Initial setup
- [[authentication]] - Authentication methods
- [[workspaces]] - Workspace management
