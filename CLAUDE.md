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

- 🔌 MCP protocol implementation (v2025-06-18)
- 🔐 OAuth2 device flow authentication
- 📁 Multi-workspace support
- 🛠️ 16 MCP tools for document management
- 🎯 Local tools (config, auth) + proxied tools (docs CRUD)

---

## Architecture

### High-Level Structure

```
┌─────────────────────┐
│  Claude Desktop/    │
│  Claude Code        │
└──────────┬──────────┘
           │ stdin/stdout (MCP protocol)
           ↓
┌──────────────────────────────┐
│  meldoc-mcp-proxy (210 loc)  │
│  - Protocol handling         │
│  - Request routing           │
└──────────┬───────────────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
┌───────────┐  ┌────────────────┐
│ Local     │  │ Meldoc API     │
│ Tools     │  │ (HTTP/JSON-RPC)│
│ - config  │  │ - docs_*       │
│ - auth    │  │ - projects_*   │
└───────────┘  └────────────────┘
```

### Module Organization

The codebase is organized into focused, testable modules:

```
lib/
├── protocol/       # MCP protocol implementation
│   ├── json-rpc.js       # JSON-RPC utilities (sendResponse, sendError)
│   ├── error-codes.js    # Error code constants and helpers
│   └── tools-schema.js   # MCP tool definitions (16 tools)
│
├── http/           # Backend communication
│   ├── client.js         # HTTP client with auth headers
│   └── error-handler.js  # Workspace/auth error handling
│
├── mcp/            # MCP method handlers
│   ├── handlers.js       # initialize, ping, tools/list, etc.
│   └── tools-call.js     # Local tool routing (set_workspace, etc.)
│
├── install/        # Installation and configuration
│   ├── config-paths.js   # Platform-specific config paths
│   ├── templates.js      # Config templates for each client
│   ├── config-manager.js # Safe config file operations
│   └── installers.js     # Unified Installer class
│
├── cli/            # CLI command handling
│   ├── commands.js       # Command implementations
│   └── formatters.js     # Help and usage formatting
│
└── core/           # Core utilities
    ├── auth.js           # Authentication (OAuth2 device flow)
    ├── config.js         # Config file management
    ├── constants.js      # Constants (URLs, timeouts, versions)
    ├── credentials.js    # Credential storage
    ├── device-flow.js    # OAuth2 device flow implementation
    ├── logger.js         # Colored logging to stderr
    └── workspace.js      # Workspace resolution
```

### Key Design Principles

1. **Separation of Concerns**: Protocol, HTTP, business logic are separate
2. **Testability**: All modules are independently testable (123 tests)
3. **Minimal Main Files**: Entry points (`bin/*.js`) are thin routers (~200 lines)
4. **No Code Duplication**: Shared logic extracted to reusable modules
5. **Clear Dependencies**: Modules have explicit, minimal dependencies

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
├── http/              # HTTP module tests (if added)
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
- **Current**: 133 tests, all passing ✅

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

- **`lib/protocol/tools-schema.js`**: All 16 tool definitions
- **`lib/mcp/handlers.js`**: Local MCP method handlers
- **`lib/mcp/tools-call.js`**: Local tool routing
- **`lib/http/client.js`**: Backend communication
- **`lib/core/auth.js`**: OAuth2 authentication

### Scripts

- **`scripts/postinstall.js`**: Automatic installation script
  - Runs after `npm install` from marketplace
  - Automatically installs Claude Desktop configuration
  - Skips in development mode (when .git exists or CI=true)
  - Handles errors gracefully without breaking installation

---

## Security Considerations

### Authentication

- **OAuth2 Device Flow**: Used for user authentication
- **Tokens stored locally**: `~/.meldoc/credentials.json` (mode 600)
- **Never log tokens**: Credentials excluded from logs
- **Token refresh**: Not implemented, user must re-login

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
