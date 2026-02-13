# Meldoc Advanced Workflows

Master-level patterns for power users and complex documentation scenarios.

## When to Use This Skill

Use this skill for:
- Complex documentation refactoring
- Large-scale migrations
- Automated documentation workflows
- Integration with development pipelines
- Custom documentation structures

## Advanced Patterns

### Pattern: Documentation as Code

Treat documentation like code:

```javascript
// 1. Plan structure programmatically
const structure = {
  "api-docs": {
    children: ["endpoints", "authentication", "errors"]
  },
  "guides": {
    children: ["quickstart", "tutorials", "advanced"]
  }
};

// 2. Create hierarchy
for (const [parent, config] of Object.entries(structure)) {
  // Create parent with proper frontmatter
  await docs_create({
    title: parent,
    alias: parent.replace(/\s+/g, '-').toLowerCase(),
    contentMd: `---
alias: ${parent.replace(/\s+/g, '-').toLowerCase()}
title: ${parent}
---

## Overview

Overview...
`
  });
  
  // Create children
  for (const child of config.children) {
    const childAlias = child.replace(/\s+/g, '-').toLowerCase();
    await docs_create({
      title: child,
      alias: childAlias,
      contentMd: `---
alias: ${childAlias}
title: ${child}
parentAlias: ${parent.replace(/\s+/g, '-').toLowerCase()}
---

## ${child}

Content...
`,
      parentAlias: parent.replace(/\s+/g, '-').toLowerCase()
    });
  }
}
```

### Pattern: Bulk Operations

When updating many documents:

```javascript
// 1. Get all documents in project
const allDocs = await docs_list({ projectId: "..." });

// 2. Filter by criteria
const needsUpdate = allDocs.filter(doc => 
  doc.title.includes("[OLD]") ||
  !doc.content.includes("## Prerequisites")
);

// 3. Update each with proper frontmatter
for (const doc of needsUpdate) {
  const current = await docs_get({ docId: doc.id });
  
  // Parse existing frontmatter
  const frontmatterMatch = current.contentMd.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
  
  // Add prerequisites section if missing
  const updated = addPrerequisitesSection(current.contentMd);
  
  await docs_update({
    docId: doc.id,
    contentMd: updated,
    expectedUpdatedAt: current.updatedAt
  });
}
```

### Pattern: Documentation Validation

Automated quality checks:

```javascript
async function validateDocumentation(projectId) {
  const docs = await docs_list({ projectId });
  const issues = [];
  
  for (const doc of docs) {
    const content = await docs_get({ docId: doc.id });
    
    // Check for frontmatter
    if (!content.contentMd.startsWith('---')) {
      issues.push(`${doc.title}: Missing YAML frontmatter`);
    }
    
    // Check for alias
    if (!content.contentMd.includes('alias:')) {
      issues.push(`${doc.title}: Missing alias in frontmatter`);
    }
    
    // Check for H2 (content should start with H2, not H1)
    if (!content.contentMd.match(/^---[\s\S]*?---\s*\n## /)) {
      issues.push(`${doc.title}: Content should start with H2, not H1`);
    }
    
    if (content.contentMd.length < 100) {
      issues.push(`${doc.title}: Very short content`);
    }
    
    // Check links (should use [[alias]] format)
    const links = await docs_links({ docId: doc.id });
    const contentLinks = content.contentMd.match(/\[\[([^\]]+)\]\]/g);
    if (links.length > 0 && !contentLinks) {
      issues.push(`${doc.title}: Links should use [[alias]] format`);
    }
    
    // Check backlinks
    const backlinks = await docs_backlinks({ docId: doc.id });
    if (backlinks.length === 0 && !doc.parentAlias) {
      issues.push(`${doc.title}: Orphaned document`);
    }
  }
  
  return issues;
}
```

### Pattern: Cross-Reference Analysis

Find documentation gaps:

```javascript
async function analyzeConnections(projectId) {
  const docs = await docs_list({ projectId });
  const graph = {};
  
  // Build connection graph
  for (const doc of docs) {
    const links = await docs_links({ docId: doc.id });
    graph[doc.id] = {
      title: doc.title,
      alias: doc.alias,
      outgoing: links.length,
      incoming: 0
    };
  }
  
  // Count incoming links
  for (const doc of docs) {
    const backlinks = await docs_backlinks({ docId: doc.id });
    if (graph[doc.id]) {
      graph[doc.id].incoming = backlinks.length;
    }
  }
  
  // Identify hubs (many links)
  const hubs = Object.entries(graph)
    .filter(([_, data]) => data.incoming > 10)
    .map(([id, data]) => ({ id, ...data }));
  
  // Identify orphans (no links)
  const orphans = Object.entries(graph)
    .filter(([_, data]) => data.incoming === 0 && data.outgoing === 0)
    .map(([id, data]) => ({ id, ...data }));
  
  return { hubs, orphans, graph };
}
```

### Pattern: Smart Content Migration

Migrate from another platform:

```javascript
async function migrateFromMarkdown(files, projectId) {
  // 1. Parse all files to build structure
  const structure = parseMarkdownFiles(files);
  
  // 2. Create documents in order (parents first) with frontmatter
  const created = {};
  
  for (const file of structure.sorted) {
    const parent = file.parent ? created[file.parent] : null;
    const alias = generateAlias(file.title);
    
    // Convert H1 to title, H2+ remain
    const content = convertMarkdown(file.content);
    const contentMd = `---
alias: ${alias}
title: ${file.title}
${parent ? `parentAlias: ${parent.alias}` : ''}
---

${content}`;
    
    const doc = await docs_create({
      title: file.title,
      alias: alias,
      contentMd: contentMd,
      projectId,
      parentAlias: parent?.alias
    });
    
    created[file.path] = doc;
  }
  
  // 3. Update internal links to [[alias]] format
  for (const [path, doc] of Object.entries(created)) {
    const content = await docs_get({ docId: doc.id });
    const updated = updateLinksToMagicFormat(content.contentMd, created);
    
    await docs_update({
      docId: doc.id,
      contentMd: updated
    });
  }
  
  return created;
}

function generateAlias(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

### Pattern: Documentation Search Index

Build custom search index:

```javascript
async function buildSearchIndex(projectId) {
  const docs = await docs_list({ projectId });
  const index = {};
  
  for (const doc of docs) {
    const content = await docs_get({ docId: doc.id });
    
    // Extract keywords from content (skip frontmatter)
    const contentBody = content.contentMd.replace(/^---[\s\S]*?---\s*\n/, '');
    const keywords = extractKeywords(contentBody);
    
    // Build reverse index
    for (const keyword of keywords) {
      if (!index[keyword]) {
        index[keyword] = [];
      }
      index[keyword].push({
        docId: doc.id,
        alias: doc.alias,
        title: doc.title,
        relevance: calculateRelevance(keyword, contentBody)
      });
    }
  }
  
  // Sort by relevance
  for (const keyword in index) {
    index[keyword].sort((a, b) => b.relevance - a.relevance);
  }
  
  return index;
}
```

## Integration Patterns

### CI/CD Documentation

Update docs automatically:

```javascript
// In your CI/CD pipeline
async function updateDocsFromCodegen(apiSpec) {
  // 1. Generate markdown from OpenAPI spec
  const markdown = generateApiDocs(apiSpec);
  
  // 2. Find or create API docs
  const results = await docs_search({ 
    query: "API Reference",
    projectId: "docs-project"
  });
  
  let docId;
  if (results.length > 0) {
    docId = results[0].id;
  } else {
    const doc = await docs_create({
      title: "API Reference",
      alias: "api-reference",
      contentMd: `---
alias: api-reference
title: API Reference
---

${markdown}`,
      projectId: "docs-project"
    });
    docId = doc.id;
  }
  
  // 3. Update with proper frontmatter
  const current = await docs_get({ docId });
  const updated = `---
alias: api-reference
title: API Reference
---

${markdown}`;
  
  await docs_update({
    docId,
    contentMd: updated,
    expectedUpdatedAt: current.updatedAt
  });
}
```

### Monitoring & Alerts

Track documentation health:

```javascript
async function checkDocumentationHealth() {
  const alerts = [];
  
  // Check for stale docs (not updated in 6 months)
  const docs = await docs_list({ projectId: "..." });
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  for (const doc of docs) {
    const updated = new Date(doc.updatedAt);
    if (updated < sixMonthsAgo) {
      alerts.push({
        type: "stale",
        docId: doc.id,
        alias: doc.alias,
        title: doc.title,
        lastUpdated: doc.updatedAt
      });
    }
    
    // Check for missing frontmatter
    const content = await docs_get({ docId: doc.id });
    if (!content.contentMd.startsWith('---')) {
      alerts.push({
        type: "missing_frontmatter",
        docId: doc.id,
        title: doc.title
      });
    }
  }
  
  return alerts;
}
```

### Multi-Workspace Operations

Work across workspaces:

```javascript
async function syncAcrossWorkspaces(sourceWs, targetWs, docId) {
  // 1. Get document from source
  set_workspace({ workspace: sourceWs });
  const sourceDoc = await docs_get({ docId });
  
  // 2. Extract frontmatter and content
  const frontmatterMatch = sourceDoc.contentMd.match(/^---\n([\s\S]*?)\n---/);
  const contentBody = sourceDoc.contentMd.replace(/^---[\s\S]*?---\s*\n/, '');
  
  // 3. Create in target with new alias
  set_workspace({ workspace: targetWs });
  const newAlias = `${sourceDoc.alias}-imported`;
  const targetDoc = await docs_create({
    title: `[From ${sourceWs}] ${sourceDoc.title}`,
    alias: newAlias,
    contentMd: `---
alias: ${newAlias}
title: [From ${sourceWs}] ${sourceDoc.title}
---

${contentBody}`,
    projectId: "imported-docs"
  });
  
  return targetDoc;
}
```

## Optimization Techniques

### Batch Processing

Process multiple documents efficiently:

```javascript
// Instead of this (slow):
for (const docId of docIds) {
  const doc = await docs_get({ docId });
  process(doc);
}

// Do this (faster):
const docs = await Promise.all(
  docIds.map(docId => docs_get({ docId }))
);
docs.forEach(process);
```

### Caching Strategy

Cache frequently accessed docs:

```javascript
const cache = new Map();

async function getCachedDoc(docId, maxAge = 5 * 60 * 1000) {
  const cached = cache.get(docId);
  
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.doc;
  }
  
  const doc = await docs_get({ docId });
  cache.set(docId, { doc, timestamp: Date.now() });
  
  return doc;
}
```

### Smart Polling

Monitor for changes:

```javascript
async function watchForChanges(projectId, callback) {
  let lastCheck = new Date();
  
  setInterval(async () => {
    const docs = await docs_list({ projectId });
    
    const updated = docs.filter(doc => 
      new Date(doc.updatedAt) > lastCheck
    );
    
    if (updated.length > 0) {
      callback(updated);
    }
    
    lastCheck = new Date();
  }, 60000); // Check every minute
}
```

## Complex Scenarios

### Scenario: Multi-Language Documentation

Maintain docs in multiple languages:

```javascript
const languages = ['en', 'es', 'fr', 'de'];

async function createMultiLangDoc(content, projectId) {
  const docs = {};
  
  // Create parent (language selector) with frontmatter
  const parent = await docs_create({
    title: content.title,
    alias: generateAlias(content.title),
    contentMd: `---
alias: ${generateAlias(content.title)}
title: ${content.title}
---

## Select Language

${languages.map(lang => `- [[${generateAlias(content.title)}-${lang}]]`).join('\n')}
`,
    projectId
  });
  
  // Create version for each language
  for (const lang of languages) {
    const translated = await translate(content.body, lang);
    const alias = `${generateAlias(content.title)}-${lang}`;
    
    docs[lang] = await docs_create({
      title: `${content.title} (${lang.toUpperCase()})`,
      alias: alias,
      contentMd: `---
alias: ${alias}
title: ${content.title} (${lang.toUpperCase()})
parentAlias: ${parent.alias}
---

${translated}`,
      parentAlias: parent.alias,
      projectId
    });
  }
  
  return { parent, docs };
}
```

### Scenario: Version-Specific Documentation

Maintain docs for different versions:

```javascript
async function createVersionedDocs(feature, versions, projectId) {
  // Create feature overview with frontmatter
  const overviewAlias = generateAlias(feature.name);
  const overview = await docs_create({
    title: feature.name,
    alias: overviewAlias,
    contentMd: `---
alias: ${overviewAlias}
title: ${feature.name}
---

## Overview

${feature.overview}
`,
    projectId
  });
  
  // Create version-specific docs
  for (const version of versions) {
    const alias = `${overviewAlias}-v${version}`;
    await docs_create({
      title: `${feature.name} (v${version})`,
      alias: alias,
      contentMd: `---
alias: ${alias}
title: ${feature.name} (v${version})
parentAlias: ${overviewAlias}
---

${feature.versionContent[version]}
`,
      parentAlias: overviewAlias,
      projectId
    });
  }
}
```

### Scenario: Auto-Generated Examples

Generate code examples:

```javascript
async function generateExamplesDoc(apiEndpoint, projectId) {
  const examples = [];
  
  // Generate examples in multiple languages
  for (const lang of ['curl', 'javascript', 'python']) {
    examples.push({
      language: lang,
      code: generateCodeExample(apiEndpoint, lang)
    });
  }
  
  const alias = generateAlias(`${apiEndpoint.name} Examples`);
  const markdown = examples.map(ex => `
### ${ex.language}

\`\`\`${ex.language}
${ex.code}
\`\`\`
`).join('\n');
  
  await docs_create({
    title: `${apiEndpoint.name} Examples`,
    alias: alias,
    contentMd: `---
alias: ${alias}
title: ${apiEndpoint.name} Examples
---

## Description
${apiEndpoint.description}

${markdown}
`,
    projectId
  });
}
```

## Power User Tips

1. **Use docs_tree first** - Understand structure before bulk operations
2. **Batch operations** - Process multiple docs in parallel when possible
3. **Cache aggressively** - Reduce API calls for frequently accessed docs
4. **Validate before updating** - Check `expectedUpdatedAt` to avoid conflicts
5. **Always include frontmatter** - Every document needs YAML frontmatter with `title` and `alias`
6. **Use magic links** - Prefer `[[alias]]` format for internal links
7. **Build tooling** - Create scripts for repetitive tasks
8. **Monitor metrics** - Track documentation health over time
9. **Automate quality** - Run validation checks regularly
10. **Version control** - Keep external backups of critical docs
11. **Test migrations** - Try on small subset before bulk operations
12. **Document your automations** - Others will need to maintain them

## API Best Practices

### Error Handling

```javascript
async function robustDocUpdate(docId, newContent) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const current = await docs_get({ docId });
      
      // Preserve frontmatter
      const frontmatterMatch = current.contentMd.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
      
      await docs_update({
        docId,
        contentMd: `---\n${frontmatter}\n---\n\n${newContent}`,
        expectedUpdatedAt: current.updatedAt
      });
      
      return true;
    } catch (error) {
      if (error.code === 'CONFLICT' && attempt < maxRetries - 1) {
        attempt++;
        await sleep(1000 * attempt); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

### Rate Limiting

```javascript
async function processWithRateLimit(items, processor, rateLimit = 10) {
  const chunks = chunkArray(items, rateLimit);
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(processor));
    await sleep(1000); // Wait 1 second between chunks
  }
}
```

## Advanced Use Cases

- **Documentation Analytics** - Track views, searches, popular docs
- **Custom Workflows** - Approval processes, review cycles
- **Integration Bridges** - Sync with other systems
- **Automated Testing** - Validate links, code examples, frontmatter
- **Content Generation** - AI-assisted documentation
- **Search Enhancement** - Custom ranking, filters
- **Access Control** - Additional permission layers
- **Audit Logging** - Track all changes for compliance

Each pattern can be customized for your specific needs!
