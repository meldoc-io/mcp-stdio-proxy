---
alias: authentication
title: Authentication
---
Authentication is required for Claude to access your Meldoc account. The tool provides multiple authentication methods.

## Method 1: Interactive Login (Recommended) ✨

The easiest and most secure way to authenticate:

```bash
npx @meldoc/mcp@latest auth login
```

### What Happens

1. Terminal displays a URL and verification code
2. Open the URL in your browser
3. Enter the code on the Meldoc website
4. Credentials are automatically saved locally

### Benefits

- ✅ No manual token copying
- ✅ Automatic token refresh
- ✅ Secure local storage
- ✅ User-friendly process

## Method 2: Token-Based Authentication

For CI/CD pipelines or automated systems, you can use a token directly.

### Option A: Via Claude Desktop Configuration

```json
{
  "mcpServers": {
    "meldoc": {
      "command": "npx",
      "args": ["-y", "@meldocio/mcp-stdio-proxy@latest"],
      "env": {
        "MELDOC_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Option B: Via Environment Variable

```bash
export MELDOC_ACCESS_TOKEN=your_token_here
```

## Check Authentication Status

Verify if you're logged in:

```bash
npx @meldoc/mcp@latest auth status
```

**Expected output:**

```
✅ Authenticated
User: your-email@example.com
Token expires: 2024-01-15T10:30:00Z
```

## Logout

To log out and clear saved credentials:

```bash
npx @meldoc/mcp@latest auth logout
```

This will:

- Remove saved tokens
- Clear user information
- Require re-authentication for future use

## Automatic Token Refresh

When using `auth login`, tokens are automatically refreshed **5 minutes before expiration**. You don't need to do anything - the system handles it automatically!

### How It Works

- Tokens are stored in `~/.meldoc/credentials.json`
- Background refresh happens seamlessly
- No interruption to your workflow

## Related

- [Commands Reference](commands.meldoc.md) - Complete list of authentication commands
- [Troubleshooting](troubleshooting.meldoc.md) - Fix authentication issues
- [Advanced Usage](advanced.meldoc.md) - Configuration files and security
