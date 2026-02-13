# Meldoc Documentation Writing Assistant

Expert at creating, structuring, and maintaining technical documentation in Meldoc.

## When to Use This Skill

Use this skill when:

- Writing new documentation from scratch
- Structuring complex documentation projects
- Creating document templates
- Establishing documentation standards
- Converting existing content to Meldoc format

## Meldoc File Format Requirements

### File Extension

- Files must have extension: `*.meldoc.md` (configurable in `meldoc.config.yml`)

### YAML Frontmatter (MANDATORY)

Every Meldoc document MUST start with YAML frontmatter between `---` delimiters:

**Required fields:**

- `title`: Document display title (string)
- `alias`: Unique document identifier (string, kebab-case, stable) - required for publishing

**Optional fields:**

- `parentAlias` (or `parent_alias`): Parent document alias for hierarchy
- `workflow`: `draft` | `published` (default: `published`) - only add if draft
- `visibility`: `visible` | `hidden` (default: `visible`) - only add if hidden
- `exposure`: `inherit` | `private` | `unlisted` | `public` (default: `inherit`) - keep default unless explicitly requested

**Example frontmatter:**

```yaml
---
alias: getting-started-guide
title: Getting Started Guide
parentAlias: documentation
workflow: published
visibility: visible
---
```

## Best Practices

### Document Structure

**Good documentation has:**

- Clear, descriptive titles in frontmatter
- Logical hierarchy (H2 → H3 → H4) - **NO H1 in content** (title comes from frontmatter)
- Introduction explaining the purpose
- Step-by-step instructions with examples
- Links to related documents using magic links
- Code examples with syntax highlighting

**Example structure:**

```markdown
---
alias: feature-name
title: Feature Name
parentAlias: features
---

Brief description of what this feature does.

## Overview

High-level explanation...

## Prerequisites

What users need before starting...

## Step-by-Step Guide

1. First step with details
2. Second step with code example
3. Third step with screenshot

## Troubleshooting

Common issues and solutions...

## Related Documentation

- [[api-reference]]
- [[getting-started]]
```

### Creating Documents

When creating new documents, Claude should:

1. **Ask clarifying questions:**
   - What is the target audience? (developers, end-users, admins)
   - What level of detail is needed?
   - Are there existing related documents?

2. **Use `docs_tree` first** to understand the structure

3. **Create with proper frontmatter and metadata:**

   ```javascript
   // Example using docs_create
   {
     title: "Clear, Descriptive Title",
     alias: "clear-descriptive-title", // kebab-case, stable identifier
     contentMd: `---

alias: clear-descriptive-title
title: Clear, Descriptive Title
parentAlias: parent-doc-alias
---

## Overview

Content starts here with H2, not H1...
`,
     projectId: "project-uuid",
     parentAlias: "parent-doc-alias" // Optional
   }

   ```

4. **Link to related documents** using magic links: `[[doc-alias]]` or cross-project: `[[project-alias::doc-alias]]`

### Updating Documents

Before updating:

1. Use `docs_get` to read current content
2. Preserve existing frontmatter and structure unless requested otherwise
3. Use `expectedUpdatedAt` for optimistic locking
4. Explain what changed in the conversation

### Documentation Templates

**API Endpoint Documentation:**

```markdown
---
alias: api-endpoint-resource
title: GET /api/v1/resource
parentAlias: api-reference
---

Brief description of what this endpoint does.

## Request

**Method:** GET
**URL:** `/api/v1/resource`
**Authentication:** Required

### Parameters

| Name | Type | Required | Description |
|:-----|:-----|:----------|:------------|
| id   | string | Yes | Resource identifier |

### Example Request

\`\`\`bash
curl -X GET https://api.example.com/v1/resource/123 \
  -H "Authorization: Bearer TOKEN"
\`\`\`

## Response

### Success (200 OK)

\`\`\`json
{
  "id": "123",
  "data": "..."
}
\`\`\`

### Errors

- `400` - Bad Request
- `404` - Not Found
- `500` - Server Error

## Related Endpoints

- [[api-list-resources]]
- [[api-create-resource]]
```

**Feature Documentation:**

```markdown
---
alias: feature-name
title: Feature Name
parentAlias: features
---

One-line description of what this feature enables.

## What is [Feature]?

Explain the feature in simple terms...

## Why Use [Feature]?

Key benefits:
- Benefit 1
- Benefit 2
- Benefit 3

## How It Works

High-level overview of the mechanism...

## Quick Start

1. Step 1
2. Step 2
3. Step 3

## Examples

### Example 1: Common Use Case

Description and code...

\`\`\`javascript
// Example code
\`\`\`

### Example 2: Advanced Use Case

Description and code...

## Configuration

Available options...

## Troubleshooting

Common issues...

## FAQ

Frequently asked questions...
```

**Tutorial Documentation:**

```markdown
---
alias: how-to-accomplish-task
title: How to [Accomplish Task]
parentAlias: tutorials
---

Learn how to [accomplish task] in [estimated time].

## What You'll Build

Brief description and maybe a screenshot...

## Prerequisites

- Prerequisite 1
- Prerequisite 2

## Step 1: [First Step]

Detailed instructions...

\`\`\`javascript
// Example code
\`\`\`

## Step 2: [Second Step]

More instructions...

## Step 3: [Final Step]

Wrap up...

## Next Steps

- Try [[related-tutorial]]
- Learn about [[advanced-topic]]
- Explore [[related-feature]]
```

## Meldoc-Specific Features

### Internal Links (Magic Links)

**Preferred method** - Link to other documents using aliases:

```markdown
See the [[api-reference]] for details.

For cross-project links:
See [[other-project::setup-guide]] for details.
```

**Alternative methods:**

- Standard markdown: `[Link Text](./path/to/doc.meldoc.md)`
- External: `[Link Text](https://example.com)`
- Reference links: `[Link text][ref]` with `[ref]: https://example.com`

### Mermaid Diagrams

Meldoc supports Mermaid diagrams:

```markdown
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[Alternative]
\`\`\`

Supported types:
- graph, flowchart
- sequenceDiagram
- classDiagram
- stateDiagram
- erDiagram
- gantt
- pie
- mindmap
```

### Task Lists

Use task lists for checklists:

```markdown
- [ ] Unchecked task
- [x] Completed task
- [ ] Another task
```

### Backlinks

Check who references your document:

```javascript
// Use docs_backlinks to find
docs_backlinks({ docId: "your-doc-id" })
```

### Document Trees

Organize hierarchically:

```javascript
docs_create({
  title: "Child Document",
  alias: "child-document",
  contentMd: `---
alias: child-document
title: Child Document
parentAlias: parent-doc
---

## Content...
`,
  parentAlias: "parent-doc"
})
```

## Tips for AI-Assisted Writing

1. **Start with outline** - Use `docs_create` with basic structure first
2. **Iterate sections** - Update one section at a time
3. **Check existing docs** - Use `docs_search` to avoid duplication
4. **Link liberally** - Use `docs_links` to see connection opportunities
5. **Review tree** - Use `docs_tree` to ensure logical hierarchy
6. **Always include frontmatter** - Never create documents without YAML frontmatter
7. **Use magic links** - Prefer `[[alias]]` over relative paths when possible

## Common Patterns

### Creating Documentation Series

```javascript
// 1. Create parent document (overview)
docs_create({
  title: "User Authentication Guide",
  alias: "user-authentication-guide",
  contentMd: `---
alias: user-authentication-guide
title: User Authentication Guide
---

## Overview

Authentication overview...
`
})

// 2. Create child documents
docs_create({
  title: "OAuth Setup",
  alias: "oauth-setup",
  contentMd: `---
alias: oauth-setup
title: OAuth Setup
parentAlias: user-authentication-guide
---

## OAuth Setup

Detailed steps...
`,
  parentAlias: "user-authentication-guide"
})

docs_create({
  title: "Session Management",
  alias: "session-management",
  contentMd: `---
alias: session-management
title: Session Management
parentAlias: user-authentication-guide
---

## Sessions

How sessions work...
`,
  parentAlias: "user-authentication-guide"
})
```

### Refactoring Documentation

```javascript
// 1. Search for related content
docs_search({ query: "authentication" })

// 2. Review each document
docs_get({ docId: "..." })

// 3. Consolidate or split as needed
docs_update({ docId: "...", contentMd: "..." })

// 4. Update links using docs_links
```

### Migration from Other Platforms

When migrating content:

1. **Add frontmatter** - Every document needs YAML frontmatter
2. **Convert H1 to title** - Move H1 content to frontmatter `title` field
3. **Update headings** - Start content with H2, not H1
4. **Convert links** - Update to magic links `[[alias]]` format
5. **Add aliases** - Generate stable kebab-case aliases
6. **Create hierarchy** - Set up parent-child relationships
7. **Preserve structure** - Keep original organization initially

## Markdown Syntax Reference

### Headings

- Use H2 (`##`) as the first heading in content
- H1 is provided by frontmatter `title` field
- Hierarchy: H2 → H3 → H4 → H5 → H6

### Text Formatting

- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*` or `_text_`
- ~~Strikethrough~~: `~~text~~`
- Combined: `***bold italic***`, `**bold and _italic_**`

### Code

- Inline: `` `code` ``
- Blocks: ` ```language ` with syntax highlighting
- Supported languages: javascript, typescript, python, html, css, json, bash, etc.

### Lists

- Bullet: `-`, `*`, or `+`
- Numbered: `1. 2. 3.`
- Nested: indent with 2 spaces
- Task lists: `- [ ]` unchecked, `- [x]` checked

### Tables

```markdown
| Header 1 | Header 2 |
|:---------|:---------:|
| Left     | Center   |
| Aligned  | Aligned  |
```

Alignment:

- `:---` - left
- `:---:` - center
- `---:` - right

### Other Elements

- Blockquotes: `> quoted text`
- Horizontal rules: `---` or `***` or `___`
- Escape special chars: `\* \# \[ \]`

## Quality Checklist

Before finalizing documentation:

- [ ] YAML frontmatter is present and correct
- [ ] `alias` is set (kebab-case, stable)
- [ ] `title` is clear and searchable
- [ ] Content starts with H2, not H1
- [ ] Introduction explains purpose
- [ ] Prerequisites are listed
- [ ] Steps are numbered and detailed
- [ ] Code examples are tested
- [ ] Links use magic links `[[alias]]` format
- [ ] Images/diagrams included if helpful
- [ ] Troubleshooting section added
- [ ] Document is in correct project/hierarchy
- [ ] Spelling and grammar checked
- [ ] Related documents are linked

## Common Mistakes to Avoid

1. **Missing frontmatter** - Every document MUST have YAML frontmatter
2. **Using H1 in content** - Title comes from frontmatter, start with H2
3. **Missing alias** - Required for publishing, must be kebab-case
4. **Wrong link format** - Use `[[alias]]` for internal links, not `[text](doc-alias)`
5. **Inconsistent aliases** - Aliases should be stable, don't change them
6. **No parent hierarchy** - Use `parentAlias` to organize documents
7. **Forgetting workflow** - Set `workflow: draft` for work-in-progress docs
