---
alias: authentication
title: Authentication
---
Authentication is required for Claude to access your Meldoc account. The tool provides multiple authentication methods.

## Method 1: Browser Login with PKCE (Recommended) ✨

The most secure way to authenticate — opens your browser automatically:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login --pkce
```

### What Happens

1. A local callback server starts on a random port
2. Your browser opens the Meldoc authorization page automatically
3. You log in and approve access
4. The browser redirects back to localhost — credentials are saved automatically

### Benefits

- ✅ OAuth 2.1 PKCE — industry-standard security
- ✅ Automatic token refresh with rotation
- ✅ No manual code entry
- ✅ Secure local storage

## Method 2: Device Flow Login

Classic device flow — displays a verification code you enter in your browser:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

### What Happens

1. Terminal displays a URL and verification code
2. Open the URL in your browser
3. Enter the code on the Meldoc website
4. Credentials are automatically saved locally

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
npx @meldocio/mcp-stdio-proxy@latest auth status
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
npx @meldocio/mcp-stdio-proxy@latest auth logout
```

This will:

- Remove saved tokens
- Clear user information
- Require re-authentication for future use

## Method 3: Token-Based Authentication

For CI/CD pipelines or automated systems.

## Automatic Token Refresh

When using `auth login` or `auth login --pkce`, tokens are automatically refreshed **5 minutes before expiration**. You don't need to do anything — the system handles it automatically!

### How It Works

- Tokens are stored in `~/.meldoc/credentials.json`
- PKCE sessions use refresh token rotation (server issues a new refresh token on each use)
- Device flow sessions use standard refresh endpoint
- Refresh happens seamlessly with no interruption to your workflow

## Related

- [[commands]] - Complete list of authentication commands
- [[troubleshooting]] - Fix authentication issues
- [[advanced]] - Configuration files and security
