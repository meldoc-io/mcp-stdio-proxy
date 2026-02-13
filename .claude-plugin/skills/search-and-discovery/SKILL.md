---
name: search-and-discovery
description: Specialized in finding, exploring, and navigating Meldoc documentation effectively. Use when looking for specific information, exploring documentation structure, finding related documents, discovering connections between topics, or auditing documentation coverage.
---

Specialized in finding, exploring, and navigating Meldoc documentation effectively.

## Search Strategies

### Full-Text Search

**Use `docs_search` for:**

- Finding documents by content
- Locating code examples
- Searching for specific terms
- Discovering mentions of features

**Best practices:**

```javascript
// Good: Specific terms
docs_search({ query: "OAuth authentication" })

// Good: Technical terms
docs_search({ query: "API rate limiting" })

// Less effective: Too broad
docs_search({ query: "how to" })

// Less effective: Single common word
docs_search({ query: "user" })
```

**Tips:**

- Use 2-4 word queries for best results
- Include technical terms when possible
- Try variations if first search doesn't work
- Combine with `docs_tree` to understand context

### Document Tree Navigation

**Use `docs_tree` to:**

- Understand documentation hierarchy
- See parent-child relationships
- Find related documents by proximity
- Identify documentation gaps

**Example workflow:**

```javascript
// 1. Get overall structure
docs_tree({ projectId: "project-id" })

// 2. Identify section of interest
// 3. Get specific documents in that section
docs_get({ docId: "..." })
```

### Link-Based Discovery

**Use `docs_links` to:**

- See what a document references
- Follow documentation trails
- Understand dependencies

**Use `docs_backlinks` to:**

- Find what references a document
- See document importance (more backlinks = more central)
- Discover unexpected connections

**Example:**

```javascript
// Find what links TO a key document
docs_backlinks({ docId: "getting-started" })

// Find what a document links TO
docs_links({ docId: "api-reference" })
```

## Discovery Patterns

### Pattern 1: Topic Exploration

When user asks "tell me about X":

1. **Search for the topic:**

   ```javascript
   docs_search({ query: "X" })
   ```

2. **Get top results:**

   ```javascript
   docs_get({ docId: "result-1" })
   docs_get({ docId: "result-2" })
   ```

3. **Find related:**

   ```javascript
   docs_links({ docId: "result-1" })
   docs_backlinks({ docId: "result-1" })
   ```

4. **Synthesize and present** with links to all relevant docs using magic links: `[[doc-alias]]`

### Pattern 2: Documentation Audit

To check coverage of a topic:

1. **Search for the topic:**

   ```javascript
   docs_search({ query: "deployment" })
   ```

2. **Review results** - are there gaps?

3. **Check tree structure:**

   ```javascript
   docs_tree({ projectId: "..." })
   ```

4. **Identify missing documentation**

5. **Suggest new documents** to create

### Pattern 3: Onboarding Journey

Help new users navigate documentation:

1. **Start with overview:**

   ```javascript
   docs_get({ docId: "getting-started" })
   ```

2. **Show document tree** to visualize structure

3. **Find prerequisite documents** using backlinks

4. **Create reading path** with ordered links using `[[alias]]` format

5. **Highlight key documents** for their role

### Pattern 4: Troubleshooting Search

When user has a problem:

1. **Search error messages exactly:**

   ```javascript
   docs_search({ query: "exact error message" })
   ```

2. **Search related concepts:**

   ```javascript
   docs_search({ query: "feature-name troubleshooting" })
   ```

3. **Check FAQ documents**

4. **Find related configuration** documents

## Advanced Techniques

### Multi-Step Search

For complex queries, break into steps:

```javascript
// User: "How do I set up authentication with OAuth for mobile apps?"

// Step 1: Find authentication docs
docs_search({ query: "OAuth authentication" })

// Step 2: Find mobile-specific docs
docs_search({ query: "mobile app setup" })

// Step 3: Get both and synthesize
docs_get({ docId: "oauth-doc" })
docs_get({ docId: "mobile-doc" })

// Step 4: Create combined answer with references
```

### Search Refinement

If first search returns too many results:

1. Add more specific terms
2. Include technical keywords
3. Try exact phrases
4. Search within specific project

If first search returns nothing:

1. Try broader terms
2. Search for synonyms
3. Check spelling
4. Use related concepts

### Context-Aware Search

Consider user's current context:

```javascript
// If user is viewing a specific document
docs_get({ docId: "current-doc" })

// Find related content
docs_links({ docId: "current-doc" })
docs_backlinks({ docId: "current-doc" })

// Search within that domain
docs_search({ 
  query: "user's question",
  projectId: "same-project-as-current-doc"
})
```

## Search Result Presentation

### For Single Best Answer

```markdown
Based on the documentation, here's how to [do task]:

[Clear, synthesized answer]

**Source:** [[doc-alias]]

**Related:**
- [[related-doc-1]]
- [[related-doc-2]]
```

### For Multiple Relevant Results

```markdown
I found several documents about [topic]:

1. **[[doc-title-1]]** - Brief description
   - Key point from document
   
2. **[[doc-title-2]]** - Brief description
   - Key point from document

3. **[[doc-title-3]]** - Brief description
   - Key point from document

Which would you like to explore first?
```

### For No Results

```markdown
I couldn't find documentation specifically about [topic].

However, I found these related documents:
- [[related-doc-1]] - about [related topic]
- [[related-doc-2]] - about [related topic]

Would you like me to:
1. Create new documentation about [topic]?
2. Search using different terms?
3. Explore these related topics?
```

## Common Search Queries

### "How do I...?"

1. Search for task/action keywords
2. Look for tutorial-style documents
3. Find step-by-step guides
4. Check related examples

### "What is...?"

1. Search for the term
2. Look for overview/introduction docs
3. Check glossary or concepts docs
4. Find architectural documentation

### "Why does...?"

1. Search for the behavior/issue
2. Look for troubleshooting docs
3. Check FAQ documents
4. Find design decision documents

### "Where can I find...?"

1. Use docs_tree to see structure
2. Search for the resource type
3. Check reference documentation
4. Look for index/directory docs

## Performance Tips

### Efficient Search

```javascript
// Good: One search with good keywords
docs_search({ query: "JWT token validation" })

// Less efficient: Multiple vague searches
docs_search({ query: "tokens" })
docs_search({ query: "JWT" })
docs_search({ query: "validation" })
```

### Smart Caching

Remember recently accessed documents:

- Reference them in conversation
- Avoid re-fetching
- Build on previous context

### Batch Operations

When exploring a topic:

- Get tree structure once
- Note relevant doc IDs
- Fetch multiple docs
- Synthesize all at once

## User Assistance Patterns

### "I'm looking for..."

```
1. Clarify what they need
2. Search with refined terms
3. Present top 3-5 results with summaries
4. Ask which to explore deeper
```

### "Show me everything about..."

```
1. Search for the topic
2. Get document tree for structure
3. Find all related documents via links/backlinks
4. Present organized overview with all references using [[alias]] links
5. Offer to dive into specific areas
```

### "Is there documentation on...?"

```
1. Search for the topic
2. If found: Show it
3. If not found: 
   - Suggest related docs
   - Offer to create new documentation
   - Check if it's covered elsewhere under different name
```

## Quality Indicators

Good documentation is:

- **Findable** - Appears in relevant searches
- **Connected** - Has links to/from other docs (use `[[alias]]` magic links)
- **Complete** - Answers the question fully
- **Current** - Recently updated
- **Clear** - Easy to understand

When helping users find information, prioritize documents with these qualities.
