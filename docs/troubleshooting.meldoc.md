---
alias: troubleshooting
title: Troubleshooting
---
Common issues and their solutions.

## Error: "AUTH_REQUIRED" - Token Not Found

**Problem:** Claude Desktop cannot authenticate with Meldoc.

**Solutions:**

1. **Check if you're logged in:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth status
   ```

2. **If not logged in, authenticate:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth login
   ```

3. **If using a token directly:**
   - Verify the token is correct in Claude Desktop config
   - Check that `MELDOC_ACCESS_TOKEN` environment variable is set
   - Ensure the token hasn't expired

4. **Check credentials file:**
   - Location: `~/.meldoc/credentials.json`
   - Verify file exists and is readable
   - Check file permissions (should be 600)

## Error: "WORKSPACE_REQUIRED" - Need to Select Workspace

**Problem:** You have multiple workspaces and none is selected.

**Solutions:**

1. **List available workspaces:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest config list-workspaces
   ```

2. **Set a default workspace:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest config set-workspace workspace-name
   ```

3. **Or create a project-specific config:**

   Create `meldoc.config.yml` in your project root:

   ```yaml
   workspaceAlias: your-workspace-name
   ```

## Error: "Invalid token" - Token is Invalid or Expired

**Problem:** Your authentication token is invalid or has expired.

**Solutions:**

1. **Re-authenticate:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth login
   ```

2. **Check token status:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth status
   ```

3. **If using manual token:**
   - Generate a new token in Meldoc settings
   - Update the token in Claude Desktop config
   - Or update the `MELDOC_ACCESS_TOKEN` environment variable

## Claude Desktop Won't Connect

**Problem:** Claude Desktop cannot establish connection to MCP server.

**Solutions:**

1. **Verify configuration file:**
   - Check JSON syntax (use jsonlint.com)
   - Verify file path is correct for your OS
   - Ensure file is saved properly

2. **Restart Claude Desktop:**
   - Completely quit the application
   - Wait a few seconds
   - Reopen Claude Desktop

3. **Check logs:**
   - Open Claude Desktop logs
   - Look for MCP-related errors
   - Check for connection timeouts

4. **Verify Node.js:**

   ```bash
   node --version  # Should be >= 18.0.0
   ```

5. **Test npx manually:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest
   ```

   Should not error (will wait for input, that's normal)

## Internet Connection Issues

**Problem:** Cannot reach Meldoc API servers.

**Solutions:**

1. **Check internet connection:**

   ```bash
   ping api.meldoc.io
   ```

2. **Verify API accessibility:**

   ```bash
   curl https://api.meldoc.io/health
   ```

3. **Check firewall/proxy:**
   - Ensure `api.meldoc.io` is not blocked
   - Configure proxy if needed
   - Check corporate firewall rules

4. **Test with verbose logging:**
   Set `DEBUG=1` environment variable for detailed logs

## Workspace Not Found

**Problem:** Specified workspace doesn't exist or you don't have access.

**Solutions:**

1. **List available workspaces:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest config list-workspaces
   ```

2. **Verify workspace name:**
   - Check spelling
   - Use exact alias (case-sensitive)
   - Verify you have access to the workspace

3. **Check permissions:**
   - Ensure you're a member of the workspace
   - Verify your role has necessary permissions

## Token Refresh Fails

**Problem:** Automatic token refresh is not working.

**Solutions:**

1. **Check credentials file:**

   ```bash
   cat ~/.meldoc/credentials.json
   ```

   Verify it contains refresh token

2. **Re-authenticate:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest auth logout
   npx @meldocio/mcp-stdio-proxy@latest auth login
   ```

3. **Check file permissions:**

   ```bash
   ls -la ~/.meldoc/credentials.json
   ```

   Should be readable/writable by you only (600)

## Commands Not Found

**Problem:** `npx @meldocio/mcp-stdio-proxy@latest` command not found.

**Solutions:**

1. **Verify Node.js is installed:**

   ```bash
   node --version
   npm --version
   ```

2. **Check npx availability:**

   ```bash
   npx --version
   ```

3. **Try with full package name:**

   ```bash
   npx @meldocio/mcp-stdio-proxy@latest
   ```

4. **Clear npx cache:**

   ```bash
   npm cache clean --force
   ```

## Getting More Help

If you're still experiencing issues:

1. **Check the logs:**
   - Claude Desktop logs
   - Terminal output when running commands
   - System logs for errors

2. **Verify requirements:**
   - Node.js >= 18.0.0
   - Claude Desktop installed and updated
   - Active internet connection

3. **Create an issue:**
   - GitHub: [GitHub Issues](https://github.com/meldoc/mcp-stdio-proxy/issues)
   - Include error messages
   - Provide system information
   - Describe steps to reproduce

## Related

- [[getting-started]] - Initial setup
- [[authentication]] - Authentication guide
- [[workspaces]] - Workspace management
