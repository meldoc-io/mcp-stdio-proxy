# Release Notes - Version 1.0.21

## Claude Code Support Added! 🎉

This release adds full support for **Claude Code** in addition to Claude Desktop.

## Changes

### New Files
- **`.mcp.json`** - MCP server configuration for Claude Code integration
  - Specifies how to run the MCP server via `npx`
  - Required for Claude Code to recognize and load the MCP tools

### Updated Files

1. **`package.json` & `package.publish.json`**
   - Version bumped to `1.0.21`
   - Description updated to mention Claude Code
   - Added `.claude-plugin/**` and `.mcp.json` to published files
   - Added `claude-code` keyword

2. **`.claude-plugin/plugin.json`**
   - Version bumped to `1.0.21`
   - Description updated to highlight Claude Code support

3. **`.claude-plugin/marketplace.json`**
   - Version bumped to `1.0.21`
   - Description updated to mention Claude Code
   - Added `claude-code` keyword

4. **`README.md`**
   - Title changed to "Meldoc MCP for Claude Desktop & Claude Code"
   - Updated all references to mention both Claude Desktop and Claude Code
   - Installation instructions now mention both platforms

## How MCP Integration Works

### Claude Desktop
Uses the existing `install` command that modifies `~/.config/Claude/claude_desktop_config.json`:
```bash
npx @meldocio/mcp-stdio-proxy@latest install
```

### Claude Code
Automatically recognizes the plugin when installed via marketplace due to:
1. `.mcp.json` file that specifies the server configuration
2. `.claude-plugin/` directory with plugin metadata

## Testing

### For Claude Code:
1. Install the plugin: `claude plugin install meldoc-mcp@meldoc-mcp`
2. Restart Claude Code (if running)
3. Authenticate: `npx @meldocio/mcp-stdio-proxy@latest auth login`
4. Test by asking Claude to search your Meldoc documentation

### For Claude Desktop:
1. Same as before - no changes to the installation flow
2. Use `npx @meldocio/mcp-stdio-proxy@latest install` or install via marketplace

## Publishing

After testing, publish the new version:

```bash
# Make sure all changes are committed
git add .
git commit -m "Add Claude Code support (v1.0.21)"

# Publish to npm
npm publish

# Or use the publish script if configured
npm run publish:patch
```

## Files Modified Summary

```
M .claude-plugin/marketplace.json  - Updated version and description
M .claude-plugin/plugin.json       - Updated version and description
M README.md                        - Added Claude Code references
M package.json                     - Updated version, description, and files list
M package.publish.json             - Updated version, description, and files list
A .mcp.json                        - New MCP server configuration for Claude Code
```

## Backward Compatibility

✅ Fully backward compatible - all existing Claude Desktop installations continue to work without changes.
