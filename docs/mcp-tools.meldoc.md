---
alias: mcp-tools
title: MCP Tools Reference
---
Once configured, your MCP client gains access to powerful Meldoc capabilities through MCP tools.

## Available MCP Tools

### Document Operations

#### `docs_list`

Lists all documents available in a workspace or project. Returns a comprehensive list with document titles, unique identifiers, and basic metadata. Perfect for getting an overview of your documentation structure or finding a specific document by browsing. You can filter results by project to focus on a particular area of your documentation.

#### `docs_get`

Retrieves the complete content of a specific document, including all markdown text, frontmatter metadata, and document structure. Use this when you need to read the full content of a document, analyze its structure, or work with its content. Returns everything you need to understand what the document contains and how it's organized.

#### `docs_tree`

Displays the hierarchical structure of documents in a project, showing how documents are organized with parent-child relationships. This visual tree representation helps you understand the documentation architecture, navigate complex document structures, and see how different documents relate to each other. Essential for understanding the organization of large documentation sets.

#### `docs_search`

Searches through all documents using full-text search to find relevant content. Returns documents that match your search query, along with context showing where the matches were found. This is the primary way to discover information when you don't know which specific document contains what you're looking for. The search is intelligent and returns the most relevant results first.

#### `docs_create`

Creates a new document in your Meldoc workspace. You can specify the document title, content in markdown format, and optionally set its position in the document hierarchy. The document is created with the content you provide and can be immediately accessed. Requires write permissions to your workspace.

#### `docs_update`

Updates an existing document's content, title, or metadata. You can modify the markdown content, change the document title, update its position in the hierarchy, or adjust visibility settings. The update preserves the document's structure and relationships while allowing you to refine the content. Requires write permissions to your workspace.

#### `docs_delete`

Permanently removes a document from your workspace. This action cannot be undone, so use it carefully. The document and all its content will be deleted, though links to it from other documents may remain. Requires write permissions to your workspace.

#### `docs_links`

Shows all outgoing links from a document - both internal links to other Meldoc documents and external links to websites or resources. This helps you understand what a document references and navigate to related content. Useful for exploring documentation networks and understanding how documents connect to each other.

#### `docs_backlinks`

Finds all documents that link to a specific document. This reverse link analysis shows you which other documents reference the current one, helping you understand document relationships and dependencies. Essential for understanding how your documentation is interconnected and which documents depend on others.

### Project Operations

#### `projects_list`

Lists all projects available in your workspace. Returns project names, identifiers, and workspace information. Use this to discover what projects you have access to, understand your workspace structure, or find the right project before working with documents. Essential for navigating multi-project workspaces.

### Management Operations

#### `server_info`

Provides comprehensive information about your Meldoc account, including user details, available permissions, and server capabilities. This helps you understand what actions you can perform and what resources are available to you. Useful for troubleshooting access issues or understanding your account status.

#### `list_workspaces`

Shows all workspaces you have access to, including workspace names, aliases, and your access level in each. This is helpful when you work with multiple workspaces and need to see what's available or switch between different organizational contexts. Essential for managing access across different teams or projects.

#### `set_workspace`

Sets the default workspace that will be used for all subsequent operations. This preference persists across sessions, so once set, your AI assistant will automatically use this workspace unless you specify otherwise. Useful when you primarily work in one workspace and want to avoid specifying it each time.

#### `get_workspace`

Retrieves information about the currently active workspace, showing which workspace is being used for operations. This helps you confirm that you're working in the right workspace or understand the current context. The workspace is determined automatically based on your configuration or can be explicitly set.

#### `auth_status`

Checks your current authentication status, verifying whether you're logged in and showing token expiration information. This helps you understand if you need to re-authenticate or if your session is still valid. Useful for troubleshooting authentication issues or confirming your login state.

## Using with Your AI Assistant

Simply ask your AI assistant naturally! For example:

> "Show me all documents in the API project"
> "Find information about authentication"
> "Create a new document about our deployment process"
> "Which documents link to the database schema?"
> "Search for information about error handling"
> "Show me the document tree for the frontend project"

Your AI assistant will automatically:

- Select the appropriate tool
- Handle authentication
- Format the results nicely
- Provide context and explanations

## Related

- [[getting-started]] - Initial setup
- [[authentication]] - Authentication setup
- [[workspaces]] - Workspace management
