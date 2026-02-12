# CLAUDE.md

This file defines mandatory rules for AI agents (Claude, IDE agents, MCP-based tools) working in this repository.

If these rules conflict with general AI defaults — **follow this file**.

<!-- meldoc:begin -->
## Meldoc Documentation

This repository uses **Meldoc** for living, code-adjacent documentation.

- Documentation lives in `*.meldoc.md` files next to the code.
- Only documentation and metadata are synchronized.
- **Source code is never uploaded or modified automatically.**

Official Meldoc documentation:
<https://public.meldoc.io/meldoc>

Meldoc documentation is treated as **infrastructure**, not prose.

---

## Sources of truth (priority order)

1. `*.meldoc.md` files in this repository
2. MCP tools provided by `meldoc mcp serve`
3. This file
4. Public Meldoc docs (concepts only)

Do **not** guess structure or intent.

---

## Think before acting

Before any change, determine:

1. Text-only vs structural change
2. Single-file vs multi-file impact
3. Identifier / hierarchy / visibility changes

If unclear — **stop and ask**.

---

## Absolute rules

### Always

- Treat `alias` as a **stable identifier**, not a slug.
- Prefer **small, local, incremental changes**.
- Preserve existing structure and intent.
- Use MCP tools to inspect state before acting:
  - `docs_search`, `docs_get`
  - `cli_validate` before publishing

### Ask first

- Before touching multiple documents
- Before changing hierarchy or exposure
- Before renaming, moving, or deleting anything
- Before affecting published or public docs

### Never

- Never delete `*.meldoc.md` files
- Never invent frontmatter fields
- Never mass-rename aliases
- Never auto-resolve conflicts
- Never run destructive commands without dry-run

---

## File format rules

- Files **must** end with `*.meldoc.md`
- YAML frontmatter is mandatory and first

### Frontmatter

Required:

- `title`

Required for publish:

- `alias` (unique, kebab-case, stable)

Optional:

- `parentAlias` / `parent_alias`
- `workflow`: `draft | published`
- `visibility`: `visible | hidden`
- `exposure`: `inherit | private | unlisted | public`

Do not add other fields.

---

## Writing guidelines

- Clear, concise, factual
- No marketing or filler
- Explain intent and boundaries, not obvious code
- Prefer structure (headings, lists)

Bad documentation is worse than missing documentation.

---

## MCP tool usage

### Docs tools (read-only)

- Use `docs_search` to find context
- Use `docs_get` only when you know the document

### CLI tools (state-changing)

- Run `cli_scan` only for structural changes
- Always run `cli_validate` before publish
- Use `cli_publish` with `dryRun` unless told otherwise
- Treat publish/pull as **dangerous operations**

### Important: CLI Tools vs MCP Direct Tools

**CLI Tools** (`cli_publish`, `cli_pull`, `cli_migrate`):

- Metadata (title, alias, parentAlias, workflow, visibility, exposure) must be specified in **YAML frontmatter** of files
- Document title should **NOT** be included in markdown content (do not use H1 #)
- Title is specified via the `title` field in frontmatter

**MCP Direct Tools** (`docs_update`, `docs_create`, `docs_delete`):

- Metadata must be passed as **separate parameters**, NOT through frontmatter
- If `contentMd` is provided with frontmatter, parameters from args take priority over frontmatter values
- Document title should **NOT** be included in `contentMd` (do not use H1 #)
- Title is specified via the `title` parameter

If unsure — do not execute tools.

---

## Recommended workflows

### Text-only

```
edit `*.meldoc.md`
meldoc publish
```

### Structural / multi-file

```
edit files
meldoc scan
meldoc validate
meldoc publish
```

### Missing aliases

```
meldoc migrate
meldoc validate
meldoc publish
```

---

## Conflicts

- Never auto-resolve
- Stop and ask

---

## Core principle

Meldoc documentation is **code-adjacent infrastructure**.

Correctness and sync safety  
matter more than style or wording.
<!-- meldoc:end -->
