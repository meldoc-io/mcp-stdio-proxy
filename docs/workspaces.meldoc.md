---
alias: workspaces
title: Workspace Management
---
Workspaces are organizational units in Meldoc. If you have multiple workspaces, you need to specify which one to use.

## Understanding Workspace Selection

The system selects a workspace in this priority order:

1. **Explicitly specified** - If you provide `workspaceAlias` or `workspaceId` in a request
2. **Project configuration** - If a `.meldoc.yml` file exists in your project root
3. **Global default** - If you've set a default workspace via CLI
4. **Automatic** - If you only have one workspace, it's selected automatically

## List Available Workspaces

See all workspaces you have access to:

```bash
npx @meldoc/mcp@latest config list-workspaces
```

**Example output:**

```
Available workspaces:
  - my-personal-workspace
  - company-workspace
  - project-alpha
```

## Set Default Workspace

Set a workspace as your default:

```bash
npx @meldoc/mcp@latest config set-workspace workspace-name
```

After setting a default, Claude will automatically use this workspace for all requests.

## Get Current Workspace

Check which workspace is currently active:

```bash
npx @meldoc/mcp@latest config get-workspace
```

## Project-Specific Workspace

To use different workspaces for different projects, create a `.meldoc.yml` file in your project root:

```yaml
context:
  workspace: workspace-name-for-this-project
```

When working from this project directory, the specified workspace will be used automatically.

## Related

- [Commands Reference](commands.meldoc.md) - Workspace management commands
- [Troubleshooting](troubleshooting.meldoc.md) - Fix workspace selection issues
- [Advanced Usage](advanced.meldoc.md) - Configuration files
