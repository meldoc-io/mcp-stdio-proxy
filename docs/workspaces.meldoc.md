---
alias: workspaces
title: Workspace Management
---
Workspaces are organizational units in Meldoc. If you have multiple workspaces, you need to specify which one to use.

## Understanding Workspace Selection

The system selects a workspace in this priority order:

1. **Explicitly specified** - If you provide `workspaceAlias` or `workspaceId` in a request
2. **Project configuration** - If a `meldoc.config.yml` file exists in your project root (or git repository directory)
3. **Global default** - If you've set a default workspace via CLI
4. **Automatic** - If you only have one workspace, it's selected automatically

**Note:** When MCP is used in a git project or directory (e.g., Claude Desktop terminal or any other LLM), the workspace is automatically taken from the `meldoc.config.yml` configuration file if it exists.

## Request Workspace in Natural Language

You can ask the AI assistant to work with a specific workspace using natural language. Simply mention the workspace name in your request, and the AI will automatically use it.

**Examples:**

> "Use the 'company-workspace' workspace for this task"
> "Switch to workspace 'project-alpha'"
> "Work in the 'my-personal-workspace' workspace"
> "Please use workspace 'team-docs' for this operation"

The AI will understand your request and automatically select the specified workspace for subsequent operations.

## List Available Workspaces

See all workspaces you have access to:

```bash
npx @meldocio/mcp-stdio-proxy@latest config list-workspaces
```

**Example output:**

```text
Available workspaces:
  - my-personal-workspace
  - company-workspace
  - project-alpha
```

## Set Default Workspace

Set a workspace as your default:

```bash
npx @meldocio/mcp-stdio-proxy@latest config set-workspace workspace-name
```

After setting a default, Claude will automatically use this workspace for all requests.

## Get Current Workspace

Check which workspace is currently active:

```bash
npx @meldocio/mcp-stdio-proxy@latest config get-workspace
```

## Project-Specific Workspace

To use different workspaces for different projects, create a `meldoc.config.yml` file in your project root:

```yaml
workspaceAlias: workspace-name-for-this-project
```

When working from this project directory (or when MCP is used in a git repository), the specified workspace will be used automatically.

## Related

- [[commands]] - Workspace management commands
- [[troubleshooting]] - Fix workspace selection issues
- [[advanced]] - Configuration files
