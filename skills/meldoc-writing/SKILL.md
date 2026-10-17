---
name: meldoc-writing
description: >
  Use when writing, rewriting, expanding, splitting or restructuring the text
  of Meldoc documentation, either a `*.meldoc.md` file or a page written through
  the Meldoc MCP tools.
meldoc-skill-version: "1"
---

# Writing Meldoc documentation

This skill covers the text. For frontmatter, `order` and link syntax, use the
`meldoc-format` skill.

- **Keep it short.** Say a thing once, in the fewest words that stay correct.
  Drop the intro that repeats the title and the summary that repeats the page.
- **One page, one topic.** A page that needs a "part 2" is two pages under one
  parent.
- **Do not duplicate: link.** Before writing, look for an existing page on the
  topic (`docs_search`, or search the files) and extend it rather than writing
  a near copy. When a fact already lives on another page, link to it with
  `[[alias]]` (or `[[project::alias]]` for another project) instead of
  restating it.
- **Only facts you checked.** Describe what the product or the code actually
  does. Do not invent flags, fields, defaults or limits. When something is
  unknown, ask or leave it out.
- **Match the neighbours.** Use the language, terms and heading style of the
  sibling pages, and the project's template when one fits (`templates_list`).
