---
name: meldoc-overview
description: Overview of the Meldoc MCP integration, available tools, authentication, and workspace management. Use when users ask what Meldoc can do, how to authenticate, how to manage workspaces, or need a summary of available document operations.
---

This plugin connects Claude Code to the hosted Meldoc MCP server at `https://api.meldoc.io/mcp`.

## Available Tools

The server describes every tool itself; this is the map.

- **Documents** — `docs_list`, `docs_get`, `docs_tree`, `docs_search`, `docs_create`, `docs_update`, `docs_delete`, `docs_related`, `docs_graph`, `docs_history`, `docs_audit`
- **Projects** — `projects_list`, `projects_create`, `project_contributors_list`, `project_contributors_add`
- **Comments** — `comments_list`, `comments_create`, `comments_reply`, `comments_resolve`, `comments_reopen`, `comments_update`
- **Custom fields and document types** — `fields_list`, `fields_define`, `fields_update`, `fields_delete`, `doc_fields_set`, `templates_list`, `templates_get`
- **Glossary** — `glossary_list`, `glossary_get`, `glossary_add`, `glossary_update`, `glossary_delete`
- **Assets** — `assets_list`, `asset_get`, `asset_attach`
- **Account** — `server_info`, `list_workspaces`, `get_workspace`, `auth_login_instructions`

Read only what you need: `docs_get` takes `headings_only: true` for the outline, `sections: [...]` for chosen H2 sections, and `max_chars` to cap the text. Edit only what changes: `docs_update` takes `sections[]` (by heading path) and `replacements[]` instead of the whole `contentMd`.

Full reference: https://public.meldoc.io/meldoc/documentation/mcp-tools

## Authentication

Run `/mcp` in Claude Code, pick the Meldoc server and choose **Authenticate**. A browser window opens for sign-in; Claude Code keeps the session and renews it.

## Workspace Management

If your account belongs to several workspaces, `list_workspaces` shows them and `get_workspace` shows which one is in use. No tool sets a default: pass `workspaceAlias` on the call itself. Without it the server uses the workspace last named explicitly, or answers `WORKSPACE_REQUIRED`.

## Permissions

Reading works on every plan. Creating, updating and deleting documents need the Pro plan and a role that allows it; `server_info` reports what the current session may do.

## Meldoc Document Format

- Over MCP, pass a `title` and a Markdown body. A leading `# H1` in the body becomes the title, so don't send one when round-tripping.
- Link documents with `[[alias]]`.
- Files synced by the `meldoc` CLI are `*.meldoc.md` with YAML frontmatter (`title`, `alias`, `parentAlias`).

See the documentation-writing skill for writing guidelines.
