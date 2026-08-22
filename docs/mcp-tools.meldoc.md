---
alias: mcp-tools
title: MCP Tools Reference
---
Once configured, your MCP client gains access to powerful Meldoc capabilities through MCP tools.

This reference groups the tools by area and describes what each one is for. It intentionally does not repeat the full argument schemas — your AI assistant sees those directly through the MCP protocol, and `server_info` advertises the server's current capabilities (filter vocabulary, write operations, search enrichments).

## Document Operations

### `docs_list`

Lists documents in a workspace or project, optionally filtered by exact criteria and sorted. This is the tool for "which documents have property X" questions — use `docs_search` for "where is X discussed" and `docs_tree` for the hierarchy.

Filters support built-in targets (`name`, `workflow`, `updatedAt`, `parentId`, …) and custom fields via `cf.KEY` (custom-field filters are project-scoped and require a `projectId`). The full filter vocabulary with valid operators per target is advertised by `server_info.filters`. Results are paginated with a cursor; `total` is the real match count.

### `docs_get`

Reads one document by UUID or alias (`docId`/`id`), or up to 10 in a batch (`docIds[]`). Aliases resolve across all accessible projects in the workspace; pass a project when an alias exists in more than one.

Partial reads keep responses small: `headings_only: true` returns just the heading outline, `sections: [...]` returns only matching H2 sections, `max_chars` truncates content at a paragraph boundary, and `include: [...]` whitelists optional metadata (glossary terms, parent, assets). A typical multi-document orientation pull is several times cheaper with these projections.

### `docs_tree`

Shows the hierarchical structure of documents in a project — parent-child relationships, ordering, and aliases. Each node carries its id, path, type, and position among siblings. UI folders appear as `type: "folder"` nodes; folders have no alias, so reference them by id when moving or creating documents under them. This is the canonical input for reordering documents via `docs_update`.

### `docs_create`

Creates a new document in a project. You provide the title and markdown content; the alias is auto-generated from the title unless you specify one. Wiki-links in content use double-bracket syntax around a document alias; to link into another project in the same workspace, prefix the alias with `projectAlias::` inside the brackets. Placement is controlled by `parentAlias`/`parentId` (omit both for project root); the new document is appended at the end of the parent's children. Requires write permissions.

### `docs_update`

Updates a document's content, metadata, and/or its place in the tree. Beyond full-content rewrites, it supports partial edits: `sections[]` operations (replace, delete, insert before/after/at start/at end of an H2 section) and `replacements[]` (find-and-replace). Partial patches are preferred when only part of a document changes — cheaper and less risky than resending the whole body.

The same tool moves and reorders documents: `parentId`/`parentAlias` re-parents a document (an empty value moves it to project root), and `order` sets its position among siblings. Moving a document moves its whole subtree. Requires write permissions.

### `docs_delete`

Soft-deletes a document: it disappears from listings, search, and embeddings, but stays in the database and can be restored by an admin via the workspace UI. The whole subtree is deleted as a unit — to keep children, move them out first with `docs_update`. Works on UI folders too (by UUID). This is not a hard delete; permanent removal happens through workspace admin tools. Requires delete permissions.

### `docs_history`

Reads a document's revision history: who changed what, when, and how the text actually differed. Revisions are captured per edit session (a burst of writes by one actor), not per keystroke.

Three views match different tasks: `list` (default) is a cheap paginated timeline of revisions; `content` returns the full snapshot of one revision, supporting the same projections as `docs_get`; `diff` returns a unified diff between two states — usually the cheapest answer to "what changed here?". The tool is read-only (there is no rollback); to revert, read the old state and write it back with `docs_update`. Available to workspace members only.

## Search, Graph & Audit

### `docs_search`

Finds documents by text query — the front door for any "where is X discussed?" question. Natural-language queries work: three or more keywords are OR-expanded and ranked by match density, one or two keywords match strictly, quoted phrases match exactly, and `-word` excludes.

Useful options: `include_content: true` attaches a content snippet to each result (saving a follow-up `docs_get`), and `group_by_project: true` buckets results per project for workspace-wide survey queries. Results carry graph signals — highly-connected "hub" documents are flagged so you can read the most contextful ones first. Opt-in enrichments (e.g. `duplicates`) add search-time analysis; `server_info` lists what the server supports.

### `docs_related`

Gets a document's relationships in the knowledge graph: outgoing wiki-links, backlinks, parent and children, semantic neighbors, and a ranked "read next" path. One call replaces what used to take separate links / backlinks / tree lookups.

The `view` parameter narrows the projection: `outgoing` returns only documents this one links to, `incoming` returns only backlinks (useful before refactoring or moving a document), and `suggest-links` returns semantic neighbors that are not yet linked — link candidates when authoring or editing. Omit `view` for the full neighborhood with the ranked navigation path.

### `docs_graph`

Returns a structural map of how documents relate (wiki-links plus hierarchy). Not a search replacement — use it after `docs_search` when you need to understand the shape of a project or area rather than to find documents by topic.

Three zoom levels, auto-detected from arguments: a `projectId` yields a project graph (documents as nodes, links and parent-child as edges), a `docId` yields a 1–3 hop subgraph around one document, and no arguments yield a workspace overview with projects as nodes.

### `docs_audit`

Runs a project-wide audit for documentation quality signals. Supported kinds: `duplicates` flags clusters of near-duplicate documents (by embedding similarity), `broken_links` lists documents whose internal wiki-link references don't resolve, and `search_gaps` surfaces repeated searches that came back empty — the holes in the knowledge base, ranked by how often people fall into them.

Use it for explicit "clean up our docs" tasks. It reads every document in the project, so cost scales with project size; for ad-hoc work the `duplicates` enrichment inside `docs_search` is cheaper and on-path.

## Custom Fields

Custom fields are project-scoped: every document in a project shares the same field schema.

### `fields_list`

Lists the custom-field definitions for a project, ordered by display order — the starting point before filtering by `cf.*` targets in `docs_list` or setting values on documents.

### `fields_define`

Defines a new custom field on a project. The stable key is derived from the label, and the field is appended to the end of the display order. Requires project write access.

### `fields_update`

Updates a custom field's label, required flag, order, default value, or (for select fields) its options. The field's type and key are immutable — delete and recreate to change a type. Requires project write access.

### `fields_delete`

Deletes a custom field from a project. The definition is soft-deleted and all stored values across documents are removed. Requires project write access.

### `doc_fields_set`

Sets a custom-field value on one document. Three distinct intents: omit the value entirely to reset the document to the field's project default, pass an explicit `null` to store an explicitly empty value that overrides any inherited default, or pass a typed value to set it. Requires project write access.

## Comments

Comment tools work with inline comment threads on documents and are available to internal tokens only.

### `comments_list`

Lists comment threads on a document: thread status, anchor state and quoted span for anchored threads, authors, and the comments themselves. Filter by `status`: `open` (default), `resolved`, or `all`.

### `comments_create`

Starts a new doc-level comment thread on a document (no text anchor). To continue an existing discussion, use `comments_reply` instead. Requires update permission.

### `comments_reply`

Appends a reply to an existing thread. Replying to a resolved thread is allowed and does not reopen it. Requires update permission.

### `comments_update`

Edits the body of a comment. Only the comment's own author may edit it. Requires update permission.

### `comments_resolve`

Marks a thread as resolved. Any workspace member may resolve; resolving an already-resolved thread is a no-op. Requires update permission.

### `comments_reopen`

Reopens a resolved thread. Idempotent, like resolve. Requires update permission.

## Glossary

### `glossary_list`

Lists glossary terms in the workspace with names, definitions, and aliases. Pass `brief: true` to get only names and aliases without definitions.

### `glossary_get`

Gets glossary terms by name — a single term or a batch of up to 10.

### `glossary_add`

Adds glossary terms, singly or in a batch of up to 10. Requires write permission and glossary write access.

### `glossary_update`

Updates glossary terms (single or batch). Only the fields you provide are changed.

### `glossary_delete`

Deletes glossary terms (single or batch). Requires maintain permission and glossary write access.

## Assets

### `assets_list`

Lists assets in the workspace with metadata for each: name, type, size, and content hash. A query parameter filters by file name.

### `asset_get`

Gets an asset's metadata and usage, including which documents use it. For text files under 50KB it also returns the file content. Accepts a UUID or SHA256 hash as the identifier.

### `asset_attach`

Attaches an existing asset to a document, optionally inserting markdown image/link syntax into the document content. Requires write permission.

## Projects & Workspaces

### `projects_list`

Lists all projects accessible with the current token — project names, identifiers, and workspace information. Essential for navigating multi-project workspaces.

### `projects_create`

Creates a new project in the workspace. Any workspace member may create projects, but this requires user (OAuth) authorization — integration tokens cannot create projects. The authorizing user becomes the project's admin.

### `project_contributors_list`

Lists a project's contributors with their roles. Call it before `project_contributors_add` to see who already has access.

### `project_contributors_add`

Adds an existing workspace member to a project as a contributor, addressed by email, with a role of `write`, `maintain`, or `admin`. The member must already belong to the workspace — this tool never sends invitations. Requires project admin rights for the authorizing user.

### `list_workspaces`

Shows all workspaces you have access to, including names, aliases, and your access level in each. Helpful when you work across multiple teams or organizational contexts.

### `get_workspace`

Retrieves the currently active workspace, so you can confirm you're working in the right context. Locally it reads your CLI configuration (repo config or global config); on a hosted server it reports the workspace the session is operating in.

### `set_workspace`

Sets the default workspace for all subsequent operations. The preference persists across sessions in `~/.meldoc/config.json`, so your AI assistant uses it automatically unless you specify otherwise.

## Service Tools

### `server_info`

Provides information about the MCP server's configuration, capabilities, and your accessible projects — including the filter vocabulary for `docs_list`, supported write operations for `docs_update`, and available search enrichments. Works even without authentication (with reduced info). Useful for troubleshooting access issues or checking what a given deployment supports.

### `auth_status`

Checks your current authentication status: whether you're logged in and token details. Useful for troubleshooting authentication issues or confirming your login state. (Handled locally by the proxy.)

### `auth_login_instructions`

Provides step-by-step instructions for authenticating with your Meldoc account — the command to run in your terminal to complete the browser-based login. Once authenticated, credentials are securely stored and automatically refreshed.

## Using with Your AI Assistant

Simply ask your AI assistant naturally! For example:

> "Show me all documents in the API project"
> "Find information about authentication"
> "Create a new document about our deployment process"
> "Which documents link to the database schema?"
> "Show me what changed in this document last week"
> "Are there duplicate documents in this project?"

Your AI assistant will automatically:

- Select the appropriate tool
- Handle authentication
- Format the results nicely
- Provide context and explanations

## Related

- [[getting-started]] - Initial setup
- [[authentication]] - Authentication setup
- [[workspaces]] - Workspace management
