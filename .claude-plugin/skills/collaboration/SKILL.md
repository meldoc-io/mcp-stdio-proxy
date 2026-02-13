---
name: collaboration
description: Expert at facilitating team collaboration on documentation in Meldoc. Use when multiple people are working on docs, managing reviews, coordinating updates, planning documentation projects, or resolving conflicts.
---

Expert at facilitating team collaboration on documentation in Meldoc.

## Collaboration Workflows

### Coordinated Updates

When multiple people need to work on related docs:

1. **Check current structure:**
   ```javascript
   docs_tree({ projectId: "..." })
   ```

2. **Identify who owns what:**
   - Use `docs_get` to see last updated info
   - Check backlinks to see dependencies
   - Plan non-conflicting areas

3. **Suggest work division:**

   ```
   Person A: Update sections 1-3
   Person B: Update sections 4-6
   Person C: Create new examples
   ```

4. **Track changes:**
   - Use `expectedUpdatedAt` for optimistic locking
   - Review links between documents
   - Ensure consistency

### Documentation Reviews

Help teams review documentation:

1. **Find recent changes:**

   ```javascript
   docs_list({ projectId: "..." })
   // Sort by updated date
   ```

2. **Check for issues:**
   - Broken links (docs that were deleted)
   - Orphaned documents (no parent, no backlinks)
   - Duplicate content

3. **Suggest improvements:**
   - Missing links (should use `[[alias]]` magic links)
   - Unclear structure
   - Needed clarifications

### Documentation Planning

When planning a documentation project:

1. **Assess current state:**

   ```javascript
   docs_tree({ projectId: "..." })
   docs_search({ query: "related topic" })
   ```

2. **Identify gaps:**
   - Missing documents
   - Under-documented areas
   - Outdated content

3. **Create roadmap:**

   ```markdown
   ## Documentation Roadmap
   
   ### Phase 1: Foundation
   - [ ] Update getting started guide
   - [ ] Create API overview
   - [ ] Add code examples
   
   ### Phase 2: Deep Dives
   - [ ] Write advanced tutorials
   - [ ] Document edge cases
   - [ ] Add troubleshooting guides
   
   ### Phase 3: Polish
   - [ ] Review all links
   - [ ] Add diagrams
   - [ ] Improve navigation
   ```

4. **Assign tasks:**
   - Based on expertise
   - Considering dependencies
   - With deadlines

## Team Patterns

### Pattern: Documentation Sprint

1. **Day 1: Planning**
   - Review current docs
   - List needed updates
   - Assign sections
   - Set standards

2. **Day 2-4: Writing**
   - Create/update docs with proper frontmatter
   - Review each other's work
   - Maintain consistency

3. **Day 5: Review & Polish**
   - Check all links (use `[[alias]]` format)
   - Ensure consistency
   - Fix issues
   - Publish

### Pattern: Continuous Documentation

1. **With each feature:**
   - Developer creates draft with `workflow: "draft"`
   - Technical writer polishes
   - Reviewer approves
   - Link to related docs using `[[alias]]`

2. **Weekly review:**
   - Check for gaps
   - Update outdated content
   - Improve clarity

3. **Monthly audit:**
   - Review entire doc tree
   - Plan major updates
   - Archive obsolete docs

### Pattern: Expert Review Cycle

1. **Draft creation:**

   ```javascript
   docs_create({
     title: "Feature Name",
     alias: "feature-name",
     contentMd: `---
alias: feature-name
title: Feature Name
workflow: draft
---

## Overview

Initial content...
`,
     workflow: "draft"
   })
   ```

2. **Expert review:**
   - Subject matter expert reviews
   - Suggests changes
   - Adds technical details

3. **Editorial polish:**
   - Technical writer improves clarity
   - Fixes formatting
   - Adds examples

4. **Publication:**

   ```javascript
   docs_update({
     docId: "...",
     contentMd: `---
alias: feature-name
title: Feature Name
workflow: published
---

## Overview

Final content...
`
   })
   ```

## Conflict Resolution

### Handling Simultaneous Edits

When two people edit the same document:

```javascript
// Person A tries to update
docs_update({
  docId: "123",
  contentMd: "New content from A...",
  expectedUpdatedAt: "2025-01-01T10:00:00Z"
})

// Error: Document was updated since you loaded it

// Solution:
// 1. Get latest version
docs_get({ docId: "123" })

// 2. Merge changes manually or
// 3. Decide whose changes take priority
// 4. Update with new expectedUpdatedAt
```

**Best practice:** Communicate before editing!

### Managing Different Perspectives

When team members have different views:

1. **Document both perspectives:**

   ```markdown
   ---
   alias: feature-approaches
   title: Feature Approaches
   ---
   
   ## Approach A
   [Description of approach A]
   
   ## Approach B
   [Description of approach B]
   
   ## Team Decision
   We chose Approach A because [reasons]
   ```

2. **Link to discussions:**
   - Add links to Slack threads
   - Reference meeting notes
   - Link to decision documents using `[[alias]]`

3. **Maintain history:**
   - Don't delete old approaches
   - Explain why changed
   - Keep for reference

## Communication Helpers

### Documentation Status Updates

Generate status for team:

```markdown
## Documentation Status - Week of [Date]

### Completed
- ✅ Updated API Reference
- ✅ Created Getting Started Guide
- ✅ Fixed 12 broken links

### In Progress
- 🔄 Authentication Tutorial (John)
- 🔄 Advanced Features Guide (Sarah)

### Planned
- 📋 Troubleshooting Guide
- 📋 Migration Guide
- 📋 FAQ Updates

### Issues
- ⚠️ Need review: Database Schema Doc
- ⚠️ Missing: Deployment Guide
```

### Review Requests

Format review requests:

```markdown
## Review Needed: [Document Title]

**Document:** [[doc-alias]]
**Author:** [Name]
**Changes:** 
- Added section on [topic]
- Updated examples
- Fixed typos

**Review focus:**
- Technical accuracy of new section
- Clarity of examples
- Completeness

**Deadline:** [Date]

Please use `docs_get` to review and provide feedback here.
```

### Documentation Metrics

Track documentation health:

```javascript
// Get all docs
docs_list({ projectId: "..." })

// Analyze:
// - Total document count
// - Recently updated (last 30 days)
// - Orphaned docs (no backlinks)
// - Highly connected docs (many backlinks)
// - Documents needing review

// Present summary:
```

```markdown
## Documentation Health Report

**Total Documents:** 156
**Updated This Month:** 23
**Needs Attention:** 8

### Top Connected Documents
1. [[getting-started]] (45 backlinks)
2. [[api-reference]] (38 backlinks)
3. [[configuration-guide]] (29 backlinks)

### Orphaned Documents
- Old Migration Guide (no backlinks)
- Deprecated API v1 Docs (no backlinks)

### Recommendations
- Archive deprecated docs
- Update orphaned docs or delete
- Create links to recently added docs using `[[alias]]`
```

## Best Practices

### Communication

- **Before editing:** Check who last updated
- **During editing:** Communicate with team
- **After editing:** Notify relevant people
- **Use comments:** In Meldoc or external tools

### Standards

Establish and follow:

- Naming conventions (kebab-case aliases)
- Document structure templates (with frontmatter)
- Style guide
- Review process
- Update frequency

### Tools Integration

Coordinate with:

- Slack for notifications
- Jira for task tracking
- GitHub for code-doc sync
- Calendar for deadlines

## Team Roles

### Documentation Owner

- Maintains overall structure
- Enforces standards
- Resolves conflicts
- Plans initiatives

### Technical Writers

- Polish content
- Improve clarity
- Maintain consistency
- Create templates

### Subject Matter Experts

- Provide technical accuracy
- Review for correctness
- Add deep insights
- Validate examples

### Reviewers

- Check clarity
- Test procedures
- Verify links (ensure `[[alias]]` format)
- Suggest improvements

## Common Scenarios

### "Someone deleted my work"

1. Check document history (if available)
2. Use `docs_get` to see current state
3. Compare with your version
4. Communicate with team
5. Merge changes if needed

### "Which document should I update?"

1. Search for the topic
2. Check document tree
3. Find most relevant doc
4. Check backlinks (how connected?)
5. Update primary doc, link from others using `[[alias]]`

### "How do I organize this?"

1. Review existing structure
2. Find similar document groups
3. Create parent if needed (with proper frontmatter)
4. Link related docs using `[[alias]]`
5. Update tree as you go

### "Need to archive old docs"

1. Identify obsolete content
2. Check backlinks (anything still referencing?)
3. Update links to point to new docs using `[[alias]]`
4. Mark as deprecated or delete
5. Notify team

## Success Metrics

Great collaboration shows:

- Regular updates from multiple people
- Few conflicts/overwrites
- Well-connected document graph (using `[[alias]]` links)
- Quick review turnaround
- Consistent style across docs
- High team satisfaction
