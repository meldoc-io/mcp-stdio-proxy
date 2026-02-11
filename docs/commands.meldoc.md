# Commands Reference

Complete reference for all CLI commands available in Meldoc MCP.

## Authentication Commands

### `auth login`

Authenticate with Meldoc using device flow.

```bash
npx @meldoc/mcp@latest auth login
```

Opens a browser-based authentication flow. Credentials are saved automatically.

**See also:** [Authentication Guide](authentication.meldoc.md)

### `auth status`

Check your current authentication status.

```bash
npx @meldoc/mcp@latest auth status
```

**Shows:**

- Authentication status (✅ or ❌)
- User email
- Token expiration time

### `auth logout`

Log out and clear all saved credentials.

```bash
npx @meldoc/mcp@latest auth logout
```

## Configuration Commands

### `config set-workspace <alias>`

Set the default workspace alias.

```bash
npx @meldoc/mcp@latest config set-workspace my-workspace
```

**See also:** [Workspace Management](workspaces.meldoc.md)

### `config get-workspace`

Get the currently active workspace alias.

```bash
npx @meldoc/mcp@latest config get-workspace
```

### `config list-workspaces`

List all available workspaces.

```bash
npx @meldoc/mcp@latest config list-workspaces
```

## Help Command

### `help`

Show detailed help information.

```bash
npx @meldoc/mcp@latest help
```

## Related

- [Getting Started](getting-started.meldoc.md) - Initial setup
- [Authentication](authentication.meldoc.md) - Authentication methods
- [Workspaces](workspaces.meldoc.md) - Workspace management
