---
alias: claude-integration
title: Claude Desktop Integration
---
Once configured, Claude Desktop gains access to powerful Meldoc capabilities through MCP tools.

## Available MCP Tools

### Document Operations

#### `docs_list`

List all documents in a project.

- Shows document titles, IDs, and metadata
- Supports filtering by project

#### `docs_get`

Get full content of a specific document.

- Retrieves markdown content
- Includes metadata and structure

#### `docs_tree`

Show document hierarchy (tree structure).

- Visual representation of document organization
- Shows parent-child relationships

#### `docs_search`

Search documents by text content.

- Full-text search across all documents
- Returns relevant matches with context

#### `docs_create`

Create a new document.

- Requires write permissions
- Supports markdown content

#### `docs_update`

Update an existing document.

- Requires write permissions
- Preserves document structure

#### `docs_delete`

Delete a document.

- Requires write permissions
- Permanent action (use with caution)

#### `docs_links`

Show all links from a document.

- Lists internal and external links
- Useful for navigation

#### `docs_backlinks`

Show documents that link to this one.

- Reverse link analysis
- Helps understand document relationships

### Project Operations

#### `projects_list`

List all available projects.

- Shows project names and IDs
- Includes workspace information

### Management Operations

#### `server_info`

Get account and permission information.

- Shows user details
- Lists available permissions

#### `list_workspaces`

List all workspaces.

- Shows workspace aliases and IDs
- Includes access level

#### `set_workspace`

Set default workspace.

- Changes active workspace
- Persists across sessions

#### `get_workspace`

Get current workspace.

- Shows active workspace information

#### `auth_status`

Check authentication status.

- Verifies login state
- Shows token expiration

## Using with Claude

Simply ask Claude naturally! For example:

- "Show me all documents in the API project"
- "Find information about authentication"
- "Create a new document about our deployment process"
- "Which documents link to the database schema?"
- "Search for information about error handling"
- "Show me the document tree for the frontend project"

Claude will automatically:

- Select the appropriate tool
- Handle authentication
- Format the results nicely
- Provide context and explanations

## Related

- [Getting Started](getting-started.meldoc.md) - Initial setup
- [Authentication](authentication.meldoc.md) - Authentication setup
- [Workspaces](workspaces.meldoc.md) - Workspace management
