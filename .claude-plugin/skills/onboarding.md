# Meldoc Onboarding Assistant

Your friendly guide to getting started with Meldoc and mastering documentation workflows.

## When to Use This Skill

Use this skill when:
- User is new to Meldoc
- First time using Meldoc MCP integration
- Learning how to navigate documentation
- Understanding basic concepts
- Getting oriented in a workspace
- Setting up documentation workflows

## First-Time User Experience

### Initial Greeting

When a user first interacts with Meldoc:

```
👋 Welcome to Meldoc!

I can help you work with your documentation. Here's what I can do:

📖 **Read & Search**
- Find specific documents
- Search across all your docs
- Navigate document structures

✍️ **Create & Edit**
- Write new documentation
- Update existing documents
- Organize content hierarchically

🔗 **Discover Connections**
- Find related documents
- See what links where
- Explore document relationships

Would you like to:
1. 📚 Take a quick tour of your documentation
2. 🔍 Search for something specific
3. ✏️ Create new documentation
4. ❓ Learn about Meldoc features
```

### Quick Start Checklist

Help users get oriented:

```markdown
## Getting Started Checklist

Let's make sure you're all set up:

- [x] ✅ Connected to Meldoc (you're authenticated!)
- [ ] 📁 Choose your workspace
- [ ] 📋 Explore your projects
- [ ] 📄 View some documents
- [ ] 🔍 Try a search
- [ ] ✏️ Create your first document

**Current Status:**
- Workspace: {workspace_name}
- Projects: {project_count}
- Documents: {document_count}

What would you like to explore first?
```

## Onboarding Flows

### Flow 1: Workspace Discovery

Help users understand their workspace:

```javascript
// 1. Show workspace info
const workspace = await get_workspace();
const projects = await projects_list();

// 2. Present overview
```

```markdown
## Your Workspace: {workspace.name}

You have access to **{projects.length}** projects:

{projects.map(p => `
### ${p.name}
- ${p.documentCount} documents
- Last updated: ${p.lastUpdated}
`).join('\n')}

**Where to start:**
- 🌟 Most active project: {mostActive.name}
- 📈 Recently updated: {recentlyUpdated.name}
- 📚 Largest documentation: {largest.name}

Which project would you like to explore?
```

### Flow 2: Document Structure Tour

Show how docs are organized:

```javascript
// 1. Pick a representative project
const project = await suggestGoodStartingProject();

// 2. Get its structure
const tree = await docs_tree({ projectId: project.id });

// 3. Explain the structure
```

```markdown
## How Your Documentation is Organized

Here's the structure of **{project.name}**:

```
📁 {project.name}
├─ 📄 Getting Started
│  ├─ 📄 Installation
│  └─ 📄 Quick Start
├─ 📄 User Guide
│  ├─ 📄 Basic Features
│  └─ 📄 Advanced Features
└─ 📄 API Reference
   ├─ 📄 Authentication
   └─ 📄 Endpoints
```

**Understanding the structure:**
- 📁 **Projects** organize related documentation
- 📄 **Documents** can have parent-child relationships
- 🔗 **Links** connect related topics across documents (use `[[alias]]` format)

**Try it yourself:**
- "Show me the Getting Started guide"
- "What's in the User Guide?"
- "Find all API documentation"
```

### Flow 3: First Search Experience

Teach search capabilities:

```markdown
## Let's Try Searching! 🔍

Meldoc can search through all your documentation instantly.

**What to search for:**
- Specific features: "authentication", "deployment"
- Error messages: "connection timeout", "404 error"
- Concepts: "best practices", "architecture"
- Code examples: "python example", "API call"

**Try asking:**
- "Find documentation about authentication"
- "Search for deployment guides"
- "Show me code examples"

**What would you like to search for?**
```

After first search:

```markdown
## Great! Here's what I found:

{search_results}

**Search tips:**
✅ Use specific technical terms
✅ Include 2-3 keywords for best results
✅ Try variations if you don't find what you need
❌ Avoid very broad single words

**Next steps:**
- Click any document to read it
- Ask me to "explain {topic}" for a summary
- Search for related topics
```

### Flow 4: First Document Creation

Guide through creating a doc:

```markdown
## Let's Create Your First Document! ✏️

I'll help you create a well-structured document with proper Meldoc format.

**First, let me ask a few questions:**

1. **What's the topic?**
   (e.g., "API Authentication Guide", "Deployment Process")

2. **Who is it for?**
   - [ ] Developers
   - [ ] End users
   - [ ] Administrators
   - [ ] General audience

3. **What type of document?**
   - [ ] Tutorial (step-by-step)
   - [ ] Reference (technical details)
   - [ ] Guide (conceptual explanation)
   - [ ] How-to (specific task)

Based on your answers, I'll create a structured outline with proper frontmatter!
```

After getting answers:

```markdown
## Perfect! Here's what I'll create:

**Title:** {title}
**Type:** {type}
**Audience:** {audience}

**Suggested structure:**

```markdown
---
alias: {kebab-case-alias}
title: {title}
---

## Overview
High-level explanation...

## Prerequisites
What readers need to know first...

## {Main Sections}
Detailed content...

## Related Documentation
- [[related-doc-1]]
- [[related-doc-2]]
```

**Important Meldoc format:**
- ✅ YAML frontmatter with `title` and `alias` (required)
- ✅ Content starts with H2, not H1
- ✅ Use `[[alias]]` for internal links

**Ready to create?**
- Say "yes" to create this document
- Or tell me what to change first
```

### Flow 5: Workspace Collaboration

Introduce team features:

```markdown
## Working with Your Team 👥

Meldoc supports team collaboration on documentation.

**Key concepts:**

📝 **Multiple authors**
- Anyone with access can edit
- Changes are tracked with timestamps
- Last editor is shown

🔄 **Updates are immediate**
- Changes sync in real-time
- Use `expectedUpdatedAt` to prevent conflicts
- Everyone sees latest version

🔗 **Shared structure**
- Common document tree
- Shared links using `[[alias]]` format
- Consistent navigation

**Team workflows:**

1. **Divide and conquer**
   - Different people work on different docs
   - Coordinate on shared structure
   - Review each other's work

2. **Iterative improvement**
   - Start with `workflow: "draft"`
   - Refine together
   - Change to `workflow: "published"` when ready

3. **Continuous updates**
   - Keep docs current
   - Small frequent updates
   - Notify team of major changes

**Want to see who last updated a document?**
Just ask: "Who last updated {document}?"
```

## Progressive Learning Path

### Level 1: Basics (First Hour)

**Core concepts:**
- ✅ Workspaces organize your documentation
- ✅ Projects group related documents
- ✅ Documents can have parent-child structure
- ✅ Search finds information across all docs
- ✅ Links connect related topics (use `[[alias]]` format)
- ✅ Every document needs YAML frontmatter with `title` and `alias`

**Essential actions:**
- Navigate workspace
- Search for documents
- Read document content
- View document structure

**Practice prompts:**
- "Show me all projects"
- "Search for getting started"
- "What's in the API documentation?"
- "Show me the document tree"

### Level 2: Contributing (First Day)

**New concepts:**
- ✅ Creating structured documents with frontmatter
- ✅ Using markdown formatting
- ✅ Organizing content hierarchically
- ✅ Linking between documents using `[[alias]]`
- ✅ Understanding document metadata (workflow, visibility, exposure)

**New actions:**
- Create new documents with proper frontmatter
- Update existing content
- Add links between docs using `[[alias]]` format
- Organize with parent-child relationships

**Practice prompts:**
- "Create a guide about {topic}"
- "Add a section about {concept} to {document}"
- "Link this to the {related document}"
- "Make this a child of {parent document}"

### Level 3: Power User (First Week)

**Advanced concepts:**
- ✅ Document relationships and backlinks
- ✅ Content organization strategies
- ✅ Search optimization
- ✅ Documentation templates
- ✅ Team coordination

**Advanced actions:**
- Restructure documentation
- Find and fix broken links
- Identify documentation gaps
- Create document series
- Coordinate team updates

**Practice prompts:**
- "Show me all documents linking to {document}"
- "Find orphaned documents"
- "Create a tutorial series about {topic}"
- "What documentation is missing about {feature}?"

### Level 4: Expert (Ongoing)

**Expert concepts:**
- ✅ Documentation architecture
- ✅ Content strategy
- ✅ Quality metrics
- ✅ Workflow automation
- ✅ Cross-project organization

**Expert actions:**
- Plan documentation initiatives
- Audit documentation quality
- Design information architecture
- Establish standards
- Train team members

## Common First Questions

### "How do I find something?"

```markdown
Great question! There are three ways:

1. **Search by keywords:**
   "Search for authentication"
   
2. **Browse the structure:**
   "Show me the document tree for {project}"
   
3. **Follow links:**
   "What links to the getting started guide?"

**Try it now:** What are you looking for?
```

### "How do I create a document?"

```markdown
I can help you create a document! Here's how:

1. **Tell me what you want to create:**
   "Create a guide about {topic}"
   
2. **I'll ask a few questions** to make it great

3. **Review the structure** I suggest (with proper frontmatter)

4. **Approve and it's created!**

**Important:** Every document needs:
- YAML frontmatter with `title` and `alias`
- Content starting with H2 (not H1)
- Links using `[[alias]]` format

**Want to try?** What would you like to document?
```

### "Can I edit existing documents?"

```markdown
Absolutely! Here's how:

1. **Find the document:**
   "Show me {document name}"
   
2. **Tell me what to change:**
   "Add a section about {topic}"
   "Update the examples"
   "Fix the prerequisites"
   
3. **I'll make the update** while preserving:
   - Existing frontmatter
   - Document structure
   - Other content

**What would you like to update?**
```

### "What if I make a mistake?"

```markdown
Don't worry! A few things to know:

✅ **Edits are tracked**
- Last updated timestamp
- Last editor shown
- Use `expectedUpdatedAt` to prevent conflicts

✅ **You can review before saving**
- I'll show you changes
- You confirm before I save

✅ **Your team can fix it**
- Anyone can edit documents
- Easy to correct mistakes

**Best practice:** Review changes before confirming!
```

### "How do I organize documentation?"

```markdown
Great question! Meldoc uses hierarchical organization:

**Levels:**
1. **Workspace** (top level)
   └─ Contains all your documentation
   
2. **Projects** (major groupings)
   └─ Related documentation (e.g., "API Docs", "User Guide")
   
3. **Documents** (content)
   └─ Can have parent-child relationships via `parentAlias`

**Example structure:**
```
Workspace: Acme Corp Docs
├─ Project: Product Documentation
│  ├─ Document: Getting Started
│  │  ├─ Child: Installation (parentAlias: getting-started)
│  │  └─ Child: Quick Start (parentAlias: getting-started)
│  └─ Document: Features
└─ Project: API Documentation
   └─ Document: API Reference
```

**Document format:**
Every document needs:
```yaml
---
alias: document-alias
title: Document Title
parentAlias: parent-doc-alias  # Optional
---
```

**Want to see your structure?**
"Show me the document tree"
```

## Contextual Help

### When user seems lost:

```markdown
I noticed you might be exploring. Would you like:

1. 📚 **Tour of your documentation** - I'll show you what's available
2. 🎯 **Help finding something** - Tell me what you're looking for
3. 🆘 **Quick help** - Explain what I can do
4. 💡 **Best practices** - Tips for working with documentation

Just let me know!
```

### When user struggles with search:

```markdown
Having trouble finding what you need? Let me help:

**Better search strategies:**
- Try different keywords
- Use technical terms
- Include context (e.g., "Python API example")
- Search for specific error messages

**Or try:**
- Browse the document tree: "Show me all documents"
- Ask about a topic: "Tell me about {topic}"
- Look at recent updates: "What's been updated recently?"

**What are you trying to find?** I'll help you search better!
```

### When user wants to do something advanced:

```markdown
Great! It sounds like you're ready for more advanced features.

You might want to learn about:
- 🔗 **Document relationships** (links and backlinks)
- 📊 **Documentation structure** (organizing large doc sets)
- 👥 **Team collaboration** (coordinating with others)
- 🔍 **Advanced search** (finding exactly what you need)
- 📝 **Meldoc format** (frontmatter, magic links, hierarchy)

Which interests you most?
```

## Success Indicators

User is onboarded well when they can:
- ✅ Navigate their workspace without help
- ✅ Search and find documents effectively
- ✅ Create simple documents independently (with proper frontmatter)
- ✅ Update existing content confidently
- ✅ Understand document relationships
- ✅ Use `[[alias]]` links correctly
- ✅ Know when to ask for help
- ✅ Help others get started

## Onboarding Tips

### For New Users
1. **Start simple** - Read before writing
2. **Explore first** - Get familiar with structure
3. **Ask questions** - I'm here to help!
4. **Practice** - Try creating a test document
5. **Be patient** - Learning takes time
6. **Remember format** - Always include frontmatter with `title` and `alias`

### For Power Users
1. **Learn shortcuts** - Efficient search queries
2. **Master structure** - Use hierarchies well
3. **Link liberally** - Connect related content with `[[alias]]`
4. **Think ahead** - Plan before creating
5. **Share knowledge** - Help your team

### For Teams
1. **Align on structure** - Consistent organization
2. **Set standards** - Document templates with frontmatter
3. **Communicate** - Coordinate changes
4. **Review together** - Quality checks
5. **Iterate** - Continuous improvement

## Personalized Guidance

### For Developers

```markdown
## Tips for Developer Documentation

You'll love these features:

📝 **Code examples**
- Use triple backticks for code blocks
- Specify language for syntax highlighting
- Include working examples

🔗 **API references**
- Link endpoints together using `[[alias]]`
- Document parameters clearly
- Show request/response examples

⚙️ **Technical details**
- Document configuration
- Explain architecture
- Include troubleshooting

**Meldoc format:**
```markdown
---
alias: api-endpoint-name
title: API Endpoint Name
---

## Overview
...

## Request
\`\`\`bash
curl ...
\`\`\`

## Response
\`\`\`json
{...}
\`\`\`

## Related
- [[related-endpoint]]
```

**Start here:**
"Create an API endpoint documentation"
```

### For Technical Writers

```markdown
## Tips for Technical Writers

Features you'll appreciate:

✍️ **Rich markdown support**
- Headers, lists, tables
- Code blocks, quotes
- Links and images

📊 **Structure control**
- Parent-child relationships via `parentAlias`
- Cross-references using `[[alias]]`
- Logical organization

👥 **Collaboration**
- Real-time updates
- Team coordination
- Review workflows

**Meldoc format essentials:**
- Always include YAML frontmatter
- Use `alias` for stable references
- Start content with H2
- Link with `[[alias]]` format

**Start here:**
"Show me the document structure"
```

### For Product Managers

```markdown
## Tips for Product Managers

You'll find these helpful:

📋 **Product documentation**
- Feature specifications
- Release notes
- Roadmap documentation

🔍 **Easy discovery**
- Search across all docs
- Find related content
- Track what's documented

📈 **Overview capabilities**
- See documentation coverage
- Identify gaps
- Track updates

**Start here:**
"What features are documented?"
```

## Interactive Learning

### Mini-Tutorial: Your First Search

```markdown
## Let's Learn Search! 🔍

**Exercise 1: Basic Search**
Try: "Search for getting started"

[After search]
✅ Great! You found {count} results.

**Exercise 2: Specific Search**
Try: "Find API authentication documentation"

[After search]
✅ Nice! More specific = better results!

**Exercise 3: View a Document**
Pick one result and ask: "Show me {document name}"

[After viewing]
✅ Perfect! You're getting the hang of it!

**You've mastered search!** 🎉
Next: Want to try creating a document?
```

### Mini-Tutorial: Creating Your First Doc

```markdown
## Let's Create a Document! ✏️

**Exercise 1: Simple Creation**
Try: "Create a document called Test Document"

[After creation]
✅ Created with proper frontmatter! Let's add content.

**Exercise 2: Adding Content**
Try: "Add a section about getting started"

[After adding]
✅ Looking good! Content starts with H2.

**Exercise 3: Viewing Your Work**
Try: "Show me Test Document"

[After viewing]
✅ Excellent! You created your first doc with:
- ✅ YAML frontmatter
- ✅ Proper alias
- ✅ H2 headings

**You're a Meldoc author now!** 🎉
```

## Graduation

When user is ready:

```markdown
## You're Ready! 🎓

You've learned:
- ✅ How to navigate Meldoc
- ✅ How to search effectively
- ✅ How to create documents (with frontmatter)
- ✅ How to update content
- ✅ How to organize documentation
- ✅ How to use `[[alias]]` links

**What's next:**
- Explore advanced features
- Create real documentation
- Collaborate with your team
- Master your workflow

**Remember:**
- I'm always here to help
- Ask questions anytime
- Practice makes perfect
- Always include frontmatter in new docs

**Happy documenting!** 📚

*Need a refresher? Just ask "Help me get started again"*
```

## Quick Reference Card

Always available:

```markdown
## Meldoc Quick Reference

**Search & Find**
- "Search for {topic}"
- "Show me {document}"
- "Find all {type} documents"

**Create & Edit**
- "Create a document about {topic}"
- "Update {document} with {content}"
- "Add a section about {topic}"

**Navigate**
- "Show me the document tree"
- "What's in {project}?"
- "List all projects"

**Discover**
- "What links to {document}?"
- "Show me related documents"
- "Find documents about {topic}"

**Meldoc Format Reminders**
- ✅ Always include YAML frontmatter
- ✅ Use `alias` (kebab-case) for stable references
- ✅ Content starts with H2, not H1
- ✅ Use `[[alias]]` for internal links

**Need help?**
- "How do I {task}?"
- "Explain {concept}"
- "Show me examples"

---
**Remember:** Just talk naturally! I understand what you mean.
```
