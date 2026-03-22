# CLAUDE.md

**Mandatory rules and guidelines for AI agents and developers working on this codebase.**

If these rules conflict with general AI defaults — **follow this file**.

---

## Project Overview

**@meldocio/mcp-stdio-proxy** is an MCP (Model Context Protocol) stdio proxy that connects Claude Desktop and Claude Code to the Meldoc API.

### Purpose

- Provides MCP-compliant interface to Meldoc documentation platform
- Handles authentication, workspace management, and tool routing
- Enables Claude Desktop/Code to interact with Meldoc documents

### Key Features

- 🔌 MCP protocol implementation (v2025-06-18), Streamable HTTP transport (spec 2025-03-26)
- 🔐 OAuth2 device flow + OAuth 2.1 PKCE authentication (browser-based)
- 🔄 Automatic token refresh with PKCE rotation support
- 📁 Multi-workspace support with automatic workspace caching
- 🛠️ MCP tools for document management (local + server-side)
- 🎯 Local tools (auth, workspace) + proxied tools (all others forwarded to server)
- 💾 Smart workspace caching - remembers your last used workspace

---

## Architecture

### High-Level Structure

```
┌─────────────────────┐
│  Claude Desktop/    │
│  Claude Code        │
└──────────┬──────────┘
           │ stdin/stdout (MCP stdio transport)
           ↓
┌──────────────────────────────────┐
│  meldoc-mcp-proxy (~255 loc)     │
│  - initialize (local fast reply) │
│  - ping / notifications (local)  │
│  - local tools routing           │
│  - tools/list (inject local)     │
│  - everything else → proxy       │
└──────────┬───────────────────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
┌───────────┐  ┌──────────────────────────────┐
│ Local     │  │ StreamableHTTPProxy           │
│ Tools     │  │ (lib/http/proxy.js)           │
│ - auth_*  │  │  POST /mcp (Mcp-Session-Id)  │
│ - *_work- │  │  handles SSE + JSON          │
│   space   │  │  auto re-init on 404         │
└───────────┘  └──────────────┬───────────────┘
                              │ HTTPS (Streamable HTTP)
                              ↓
                    ┌─────────────────┐
                    │  Meldoc API     │
                    │  /mcp endpoint  │
                    └─────────────────┘
```

### Module Organization

The codebase is organized into focused, testable modules:

```
lib/
├── protocol/       # MCP protocol implementation
│   ├── json-rpc.js       # JSON-RPC utilities (sendResponse, sendError)
│   ├── error-codes.js    # Error code constants and helpers
│   └── tools-schema.js   # Local MCP tool definitions (auth, workspace tools)
│
├── http/           # Backend communication
│   ├── proxy.js          # StreamableHTTPProxy — Streamable HTTP transport (2025-03-26)
│   ├── client.js         # HTTP client (used by CLI commands)
│   └── error-handler.js  # Workspace/auth error handling
│
├── mcp/            # MCP method handlers
│   ├── handlers.js       # Minimal: ping + isNotification only
│   └── tools-call.js     # Local tool routing (set_workspace, auth_status, etc.)
│
├── install/        # Installation and configuration
│   ├── config-paths.js   # Platform-specific config paths
│   ├── templates.js      # Config templates for each client
│   ├── config-manager.js # Safe config file operations
│   └── installers.js     # Unified Installer class
│
├── cli/            # CLI command handling
│   ├── commands.js       # Command implementations (auth login --pkce support)
│   └── formatters.js     # Help and usage formatting
│
└── core/           # Core utilities
    ├── auth.js           # Token resolution + refresh (device flow + PKCE)
    ├── config.js         # Config file management
    ├── constants.js      # Constants (URLs, timeouts, versions)
    ├── credentials.js    # Credential storage
    ├── device-flow.js    # OAuth2 device flow implementation
    ├── oauth-pkce.js     # OAuth 2.1 PKCE flow (browser-based, loopback redirect)
    ├── logger.js         # Colored logging to stderr
    └── workspace.js      # Workspace resolution
```

### Key Design Principles

1. **Separation of Concerns**: Protocol, HTTP, business logic are separate
2. **Testability**: All modules are independently testable
3. **Minimal Main Files**: Entry points (`bin/*.js`) are thin routers (~255 lines)
4. **No Code Duplication**: Shared logic extracted to reusable modules
5. **Clear Dependencies**: Modules have explicit, minimal dependencies
6. **Thin Proxy**: Main proxy delegates almost everything to `StreamableHTTPProxy`; only `ping`, notifications, `initialize`, `tools/list` (injection), and 4 local tools are handled locally

### Workspace Management

The proxy implements smart workspace resolution with automatic caching:

**Resolution Priority** (highest to lowest):

1. **Explicit in tool arguments** - `workspaceAlias` parameter in tool call (highest priority)
2. **Repo config** (`meldoc.config.yml`) - Project-specific workspace
3. **Global config** (`~/.meldoc/config.json`) - Cached default workspace
4. **No workspace** - Server auto-selects (if user has only one workspace)

**Automatic Workspace Caching:**

When a user explicitly provides `workspaceAlias` in any tool call:

```javascript
// Example: User calls docs_list with explicit workspace
{
  "method": "tools/call",
  "params": {
    "name": "docs_list",
    "arguments": {
      "workspaceAlias": "my-workspace",  // ← Uses this workspace
      "projectId": "some-project"
    }
  }
}
```

The proxy will:
- ✅ **Always use** `my-workspace` for this request (overriding repo/global config)
- ✅ **Cache it** to `~/.meldoc/config.json` **ONLY if no repo config exists**
- ✅ **Don't cache** if repo config exists (explicit is one-time override)

**Why this behavior?**
- If project has `meldoc.config.yml`, it's project-bound to a workspace
- Explicit workspace is a temporary override, shouldn't break project binding
- Without repo config, explicit choice becomes your new default

**How to Override Cached Workspace:**

There are three ways to override the cached workspace:

1. **Per-call override** - Explicitly specify `workspaceAlias` in tool arguments:
   ```javascript
   // This call uses "different-workspace" and caches it
   {
     "method": "tools/call",
     "params": {
       "name": "docs_list",
       "arguments": {
         "workspaceAlias": "different-workspace"
       }
     }
   }
   ```

2. **Per-project override** - Create `meldoc.config.yml` in project root:
   ```yaml
   workspaceAlias: project-specific-workspace
   ```
   This workspace will be used for all calls in this project directory, but won't be cached globally.

3. **Global override** - Use `set_workspace` tool or edit `~/.meldoc/config.json`:
   ```javascript
   // Via tool
   {
     "method": "tools/call",
     "params": {
       "name": "set_workspace",
       "arguments": {
         "alias": "new-default-workspace"
       }
     }
   }

   // Or manually edit ~/.meldoc/config.json:
   {
     "workspaceAlias": "new-default-workspace"
   }
   ```

**Example Scenarios:**

```javascript
// Scenario 1: No repo config, first use
docs_list({ workspaceAlias: "work" })  // → uses "work", caches it ✅
docs_list({})                          // → uses cached "work" ✅

// Scenario 2: No repo config, switch workspace
docs_list({})                          // → uses cached "work"
docs_list({ workspaceAlias: "home" })  // → uses "home", re-caches ✅
docs_list({})                          // → now uses cached "home" ✅

// Scenario 3: WITH repo config (meldoc.config.yml: workspaceAlias: "project")
docs_list({})                          // → uses repo "project" ✅
docs_list({ workspaceAlias: "temp" })  // → uses "temp", NOT cached ⚠️
docs_list({})                          // → back to repo "project" ✅

// Scenario 4: Repo config protects project binding
// In project with meldoc.config.yml
docs_list({ workspaceAlias: "work" })  // → uses "work", NOT cached
cd ~/other-project                     // (no meldoc.config.yml)
docs_list({})                          // → uses previous cache (NOT "work")
```

**Implementation:** See `lib/http/client.js:35-58` for caching logic with repo config check.

---

## Development Guidelines

### Code Style

- **Language**: All code in English
- **Formatting**: 2-space indentation, no semicolons required
- **Naming**:
  - Functions: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Files: `kebab-case.js`
  - Classes: `PascalCase`

### Module Guidelines

**When creating new modules:**

1. **Single Responsibility**: Each module does one thing well
2. **Exports**: Export only what's needed, keep internals private
3. **Documentation**: JSDoc comments for public functions
4. **Error Handling**: Always handle errors, never throw unhandled exceptions
5. **Logging**: Use `logger` module, respect LOG_LEVEL

**File Size Limits** (soft limits, not strict):

- Entry points: ~200 lines
- Modules: ~300 lines
- If larger, consider splitting

### Adding New MCP Tools

To add a new tool:

1. **Define tool schema** in `lib/protocol/tools-schema.js`:

   ```javascript
   {
     name: 'tool_name',
     description: 'Clear description',
     inputSchema: {
       type: 'object',
       required: ['param1'],
       properties: {
         param1: { type: 'string', description: '...' }
       }
     }
   }
   ```

2. **Determine routing**:
   - **Local tool** (no backend needed): Add to `lib/mcp/tools-call.js`
   - **Backend tool** (needs API call): Automatically proxied

3. **Add tests** in `__tests__/mcp/tools-call.test.js`

### Making Changes

**Before making changes:**

1. **Read relevant code** - Don't modify without understanding
2. **Check tests** - Understand what's being tested
3. **Consider impact** - Single file or multi-file change?
4. **Run tests first** - Ensure baseline is green

**After making changes:**

1. **Run tests**: `npm test`
2. **Test manually**: Use stdin/stdout or CLI commands
3. **Check line count**: Main files should stay small
4. **Update documentation**: If behavior changed

---

## Testing

### Test Structure

```
__tests__/
├── protocol/          # Protocol module tests
├── http/              # HTTP module tests (client, error-handler)
├── mcp/               # MCP handler tests
├── install/           # Installation tests
├── scripts/           # Script tests (postinstall, etc.)
├── cli/               # CLI tests (if added)
├── auth.test.js       # Core module tests
├── config.test.js
├── credentials.test.js
├── workspace.test.js
└── proxy.test.js      # Integration tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx jest __tests__/protocol/json-rpc.test.js

# Run tests with coverage
npx jest --coverage
```

### Writing Tests

**Test Guidelines:**

1. **Arrange-Act-Assert**: Clear three-part structure
2. **Mock I/O**: Mock `process.stdout.write`, `fs`, `axios`
3. **Descriptive Names**: Test names should explain what they test
4. **One Assertion Focus**: Each test should verify one thing
5. **Clean Up**: Use `beforeEach`/`afterEach` to reset state

**Example test structure:**

```javascript
describe('ModuleName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('functionName', () => {
    it('should do expected behavior when condition', () => {
      // Arrange
      const input = {...};

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

### Test Coverage Goals

- **Critical paths**: 100% (protocol, auth, tools routing)
- **Modules**: 80%+ coverage
- **Entry points**: Integration tests cover main flows
- **Current**: 147 tests, all passing ✅

---

## Common Tasks

### Adding a New Installation Target

1. **Add config path** to `lib/install/config-paths.js`
2. **Add config template** to `lib/install/templates.js`
3. **Add merge logic** if needed
4. **Update CLI** in `lib/cli/commands.js` for new option
5. **Add tests** in `__tests__/install/`

### Debugging Issues

**Enable debug logging:**

```bash
LOG_LEVEL=DEBUG node bin/meldoc-mcp-proxy.js
```

**Log levels**: ERROR (0), WARN (1), INFO (2), DEBUG (3)

**Common issues:**

- **Tool not found**: Check `tools-schema.js`, tool name must match exactly
- **Auth errors**: Run `node bin/cli.js auth status`
- **Workspace errors**: Run `node bin/cli.js config list-workspaces`
- **Parse errors**: Check stdin format, must be valid JSON-RPC 2.0

### Manual Testing

**Test MCP protocol:**

```bash
# Test tools/list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node bin/meldoc-mcp-proxy.js

# Test initialize
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node bin/meldoc-mcp-proxy.js

# Test local tool
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"auth_status","arguments":{}}}' | node bin/meldoc-mcp-proxy.js
```

**Test CLI:**

```bash
# Test help
node bin/cli.js help

# Test install
node bin/cli.js install

# Test auth
node bin/cli.js auth status
```

### Making a Release

1. **Update version**: `npm run version:patch` or `version:minor`
2. **Run tests**: `npm test`
3. **Commit changes**: `git commit -am "vX.X.X"`
4. **Tag release**: `git tag vX.X.X`
5. **Push**: `git push && git push --tags`
6. **Publish**: `npm run publish:patch` or `publish:minor`

---

## Important Files

### Entry Points

- **`bin/meldoc-mcp-proxy.js`** (210 lines)
  - Main MCP proxy entry point
  - Handles stdin/stdout MCP protocol
  - Routes to local handlers or backend

- **`bin/cli.js`** (99 lines)
  - CLI command router
  - Delegates to `lib/cli/commands.js`

### Configuration Files

- **`.mcp.json`**: Claude Code plugin config
- **`.claude-plugin/`**: Plugin metadata for marketplace
- **`package.json`**: NPM package config
- **`jest.config.js`**: Test configuration

### Critical Modules

- **`lib/http/proxy.js`**: `StreamableHTTPProxy` — Streamable HTTP transport, session management, SSE streaming
- **`lib/protocol/tools-schema.js`**: Local tool definitions (auth + workspace tools)
- **`lib/mcp/handlers.js`**: Minimal local handlers — `ping` + `isNotification` only
- **`lib/mcp/tools-call.js`**: Local tool routing (4 tools: auth_status, auth_login_instructions, set_workspace, get_workspace)
- **`lib/http/client.js`**: HTTP client used by CLI commands
- **`lib/core/auth.js`**: Token resolution + refresh (supports device flow and PKCE)
- **`lib/core/oauth-pkce.js`**: OAuth 2.1 PKCE flow (browser loopback, dynamic client registration)
- **`lib/core/workspace.js`**: Workspace resolution (repo → global → none)

### Scripts

- **`scripts/postinstall.js`**: Automatic installation script
  - Runs after `npm install` from marketplace
  - Automatically installs Claude Desktop configuration
  - Skips in development mode (when .git exists or CI=true)
  - Handles errors gracefully without breaking installation

---

## Security Considerations

### Authentication

- **OAuth2 Device Flow**: Original auth method (`auth login`)
- **OAuth 2.1 PKCE**: Browser-based auth with loopback redirect (`auth login --pkce`); dynamic client registration, CSRF state check
- **Token refresh**: Automatic — device flow via `/api/auth/refresh`, PKCE via refresh token rotation (`/mcp/oauth/token`)
- **Tokens stored locally**: `~/.meldoc/credentials.json` (mode 600)
- **Never log tokens**: Credentials excluded from logs

### Configuration Files

- **Sensitive data**: Never commit credentials or tokens
- **File permissions**: Config files should be user-readable only
- **Validation**: Always validate config before writing

### MCP Protocol

- **Input validation**: All JSON-RPC requests validated
- **Error handling**: Errors never expose sensitive info
- **Injection prevention**: No eval, no command injection

---

## Troubleshooting

### Tests Failing

1. Check if all dependencies installed: `npm install`
2. Clear jest cache: `npx jest --clearCache`
3. Check Node version: `node --version` (need >= 18.0.0)
4. Run specific test: `npx jest <test-file>`

### Installation Issues

1. Check config paths: `node bin/cli.js install`
2. Verify file permissions on config files
3. Check platform: `os.platform()` should be darwin/win32/linux

### Runtime Errors

1. Enable debug logging: `LOG_LEVEL=DEBUG`
2. Check stderr output (all logs go to stderr)
3. Verify stdin/stdout not blocked
4. Test with simple JSON-RPC request

---

## Quick Reference

### Environment Variables

- `LOG_LEVEL`: ERROR | WARN | INFO | DEBUG (default: ERROR)
- `MELDOC_API_URL`: Override API URL (default: <https://api.meldoc.io>)
- `MELDOC_APP_URL`: Override app URL (default: <https://app.meldoc.io>)

### NPM Scripts

- `npm test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:local`: Run tests against localhost
- `npm run version:patch`: Bump patch version
- `npm run publish:patch`: Publish patch release
- `postinstall`: Auto-runs after install to setup Claude Desktop (skipped in dev mode)

### File Locations

- **Credentials**: `~/.meldoc/credentials.json`
- **Global config**: `~/.meldoc/config.json`
- **Claude Desktop config**: Platform-specific (see `lib/install/config-paths.js`)

---

## Core Principles

1. **Keep main files small**: Entry points should be thin routers
2. **Test everything**: All new code needs tests
3. **No duplication**: Extract shared logic to modules
4. **Clear separation**: Protocol, HTTP, business logic are separate
5. **Safety first**: Validate inputs, handle errors, never crash

---

## Getting Help

- **Tests**: Look at `__tests__/` for examples
- **Modules**: Check module comments and JSDoc
- **This file**: Re-read this file when in doubt
- **Git history**: Check recent commits for patterns

**When in doubt, ask the user before making destructive changes.**

---

*Last updated: 2026 (after architecture optimization)*
