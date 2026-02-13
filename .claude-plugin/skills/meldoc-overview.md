# Meldoc MCP Integration

Connect to your Meldoc documentation directly from Claude Desktop, Claude Code, and other MCP clients.

## Overview

Meldoc MCP provides seamless access to your Meldoc documentation workspace through the Model Context Protocol. Once configured, you can interact with your documentation naturally through AI conversations.

## Available Tools

### Document Operations

- **`docs_list`** - List all documents in a workspace or project
- **`docs_get`** - Get the complete content of a specific document
- **`docs_tree`** - Display the hierarchical structure of documents in a project
- **`docs_search`** - Search through all documents using full-text search
- **`docs_create`** - Create a new document (requires write permissions)
- **`docs_update`** - Update an existing document's content or metadata (requires write permissions)
- **`docs_delete`** - Delete a document (requires write permissions)
- **`docs_links`** - Show all outgoing links from a document
- **`docs_backlinks`** - Find all documents that link to a specific document

### Project Operations

- **`projects_list`** - List all projects available in your workspace

### Management Operations

- **`server_info`** - Get information about your account and access permissions
- **`list_workspaces`** - Show all workspaces you have access to
- **`set_workspace`** - Set the default workspace for operations
- **`get_workspace`** - Get information about the currently active workspace
- **`auth_status`** - Check your current authentication status

## Usage Examples

Simply ask Claude naturally! For example:

- "Show me all documents in the API project"
- "Find information about authentication"
- "Search for documents about error handling"
- "Create a new document about our deployment process"
- "Which documents link to the database schema?"
- "Show me the document tree for the frontend project"
- "Update the getting started guide with new information"

Your AI assistant will automatically:

- Select the appropriate tool
- Handle authentication
- Format the results nicely
- Provide context and explanations

## Authentication

Before using Meldoc MCP, you need to authenticate:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

This will open a browser flow for secure authentication. Your credentials are stored locally and automatically refreshed.

## Workspace Management

If you have multiple workspaces, you can:

1. List all workspaces: `npx @meldocio/mcp-stdio-proxy@latest config list-workspaces`
2. Set default workspace: `npx @meldocio/mcp-stdio-proxy@latest config set-workspace <name>`
3. Or specify workspace in requests directly

## Permissions

Some operations require write permissions to your workspace:

- Creating documents
- Updating documents
- Deleting documents

Read-only operations (list, get, search) work with any authenticated account.

## Meldoc Document Format

When creating or updating documents, remember:

- **File extension**: `*.meldoc.md`
- **YAML frontmatter required**: Every document must start with frontmatter containing `title` and `alias`
- **No H1 in content**: Title comes from frontmatter, content starts with H2
- **Magic links**: Use `[[alias]]` for internal document links
- **Hierarchy**: Use `parentAlias` to organize documents

See [[documentation-writing]] for detailed writing guidelines.
