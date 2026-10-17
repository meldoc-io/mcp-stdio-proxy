---
name: meldoc-format
description: >
  Use when creating, editing, moving or reordering a Meldoc document, either as
  a `*.meldoc.md` file or through the Meldoc MCP tools (`docs_create`,
  `docs_update`), and whenever setting its frontmatter or metadata: `title`,
  `alias`, `parentAlias`, `order`, `workflow`, `visibility`, `exposure`,
  `template`, `archived`, `replacedBy`, `fields`, or `[[alias]]` magic links.
meldoc-skill-version: "1"
---

# Meldoc document format

The rules for one Meldoc document, the same whether it is a file or a page
written through MCP.

## Where the document lives

Pick the route once, before writing:

- **The user named the route** ("in the repo", "straight on the server") → use it.
- **A `meldoc.config.yml` is in the working directory or a parent, and it
  covers the target project** — as its `projectAlias` (with `baseDir`), or as
  one of its `baseDirs` → the document is a `*.meldoc.md` file under that
  project's `baseDir`. The task is done when the
  files are written and `meldoc validate` passes (when the CLI is installed).
  Publishing files is the repository's own process, outside this task; the
  report ends with the list of changed files.
- **Otherwise** → the document lives on the server. Write it with the MCP tools
  (`docs_create`, `docs_update`, `doc_fields_set`).

## Frontmatter

```yaml
---
title: Rate limits     # required
alias: rate-limits     # required: kebab-case, unique in the project, never renamed
parentAlias: api       # omit for a top-level page
order: 2               # 0-based position among siblings, see Order
---
```

Optional keys. Write one only when its value differs from the default:

| Key | Values | When absent |
| --- | --- | --- |
| `workflow` | `draft`, `published` | `published` |
| `visibility` | `visible`, `hidden` | `visible` |
| `exposure` | `inherit`, `private`, `unlisted`, `public` | `inherit` |
| `template` | template alias (`templates_list`, `meldoc templates list`); `""` detaches | server's assignment kept |
| `archived` | `true`, `false` | server's state kept, **not** `false` |
| `replacedBy` | alias of the successor page | server's value kept |
| `fields` | map of custom-field keys from the project schema (`fields_list`) | nothing set |

- A bare `template:` (nothing after the colon) is YAML null and changes
  nothing. Detach with `template: ""`.
- Other keys are ignored by the server. Do not invent them, and do not delete
  a key you do not recognise: newer releases add keys.
- `id` is retired. `alias` is the identifier.
- A file with no `parentAlias` sits directly in the project's `baseDir` or is
  its folder's `index.meldoc.md` (a section page, with its children beside it).
  Anywhere else, `meldoc validate` reports it as an orphan.

## Body

- No `#` heading. `title` is the page's H1, so sections start at `##`.
- A link to another Meldoc page is a magic link: `[[alias]]`, `[[alias|label]]`,
  or `[[project::alias]]` for another project in the same workspace. Use
  ordinary Markdown links only for external URLs.
- Mermaid diagrams go in fenced ```` ```mermaid ```` blocks.

## Order

`order` is the page's **0-based position among its siblings**. Whenever a
parent's children change, the server renumbers them to 0, 1, 2, …, counting
**all** of them, archived pages included. Any other numbering (starting at 1,
leaving gaps, steps of 10) is rewritten on the server, and the files then
disagree with it.

In files:

- The siblings under one parent are exactly 0 … n-1: no gaps, no duplicates.
- **Insert at position k**: the new page gets `order: k`, and every sibling
  with `order` ≥ k gets +1 in the same change.
- **Remove a page, or move it to another parent**: every sibling after it
  gets -1.
- **Numbers that already have a gap are out of step.** Do not continue a gap.
  If the only top-level page has `order: 2`, the server holds it at 0, so a new
  page "after it" is `order: 1` and the old page becomes `order: 0`. When some
  siblings may exist only on the server, ask the user instead of guessing.
- Always write `order` explicitly. A numeric filename prefix
  (`01-intro.meldoc.md` → 1) is read only when the key is absent, and it counts
  from wherever the name says. Do not use one.
- `meldoc validate` warns when a parent's children are not 0 … n-1.

Through MCP:

- `docs_create` always appends at the end. Position the page afterwards with
  `docs_update(order: k)`. The server renumbers the siblings; do not touch them.
- k is the 0-based index in the sibling list returned by the **default
  `docs_tree`**, which hides archived siblings. `docs_update` skips them the
  same way, so do not count in `docs_tree(include_archived: true)`: an index
  counted there lands too late.
- "Right after X" → k = index(X) + 1. "Before X" → k = index(X).

## Frontmatter through MCP

| In a file | Through MCP |
| --- | --- |
| `title`, `alias`, `parentAlias`, `template`, body | `docs_create(title, alias, parentAlias, template, contentMd)` |
| `order` | `docs_update(order)` after the create |
| `workflow`, `visibility`, `exposure`, `archived`, `replacedBy` | `docs_update(…)` |
| `fields` | `doc_fields_set` |

A web-UI folder has no alias: target it with `parentId` from `docs_tree`.

## Before finishing

- [ ] `title` and `alias` set. The alias is kebab-case and unique, and existing aliases are unchanged.
- [ ] No `#` heading in the body.
- [ ] Every `[[alias]]` points at a page that exists.
- [ ] Every parent you touched has children numbered 0 … n-1 (files), or
      positions taken from the default `docs_tree` (MCP).
- [ ] Files: `meldoc validate` passes.
