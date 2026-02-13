---
alias: workspaces
title: Workspace Management
---
Workspaces are organizational units in Meldoc. If you have multiple workspaces, you need to specify which one to use.

## Understanding Workspace Selection

The system selects a workspace in this priority order:

1. **Explicitly specified** - If you provide `workspaceAlias` or `workspaceId` in a request
2. **Project configuration** - If a `meldoc.config.yml` file exists in your project root (or git repository directory)
3. **Global default** - If you've set a default workspace via CLI or it was auto-cached
4. **Automatic** - If you only have one workspace, it's selected automatically

**Note:** When MCP is used in a git project or directory (e.g., Claude Desktop terminal or any other LLM), the workspace is automatically taken from the `meldoc.config.yml` configuration file if it exists.

## Automatic Workspace Caching

**The proxy automatically remembers your workspace choice!**

When you explicitly specify a workspace in any request (via natural language or tool parameters), the system automatically caches it as your default for future requests.

**How it works:**

- ✅ **Use a workspace once** → It becomes your default
- ✅ **Switch workspaces** → New choice becomes default
- ✅ **Works across sessions** → Preference is remembered
- ⚠️ **Project config protects** → If `meldoc.config.yml` exists, explicit workspace is used but NOT cached (project binding is preserved)

**Example:**

```text
# First time - no default set
You: "List documents in work-workspace"
→ Uses work-workspace, caches it as default

# Later - default is remembered
You: "Search for API docs"
→ Automatically uses work-workspace (cached)

# Switch workspace
You: "List documents in personal-workspace"
→ Uses personal-workspace, caches it as new default

# Without workspace context
You: "Show me recent documents"
→ Now uses personal-workspace (new cached default)
```

**With Project Config:**

If your project has `meldoc.config.yml`:

```yaml
workspaceAlias: project-workspace
```

Then:
- ✅ Default requests use `project-workspace` (from repo config)
- ✅ You can override: "Use temp-workspace for this" (used, but NOT cached)
- ✅ Next request back to `project-workspace` (repo config preserved)

This ensures project-specific workspace binding isn't accidentally overwritten.

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

There are two ways to set a default workspace:

### Option 1: Automatic (Recommended)

Simply use the workspace once in natural language:

```text
You: "List documents in my-workspace"
```

The workspace is automatically cached and becomes your default!

### Option 2: Explicit via CLI

Set a workspace as your default manually:

```bash
npx @meldocio/mcp-stdio-proxy@latest config set-workspace workspace-name
```

After setting a default (either way), Claude will automatically use this workspace for all requests.

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
