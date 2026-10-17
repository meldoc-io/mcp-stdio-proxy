# Meldoc MCP stdio proxy

[![npm version](https://badge.fury.io/js/@meldocio%2Fmcp-stdio-proxy.svg)](https://www.npmjs.com/package/@meldocio/mcp-stdio-proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Most MCP clients don't need this package.** Meldoc runs a hosted MCP server at `https://api.meldoc.io/mcp` (Streamable HTTP, OAuth sign-in or a Bearer token). Claude.ai, Claude Desktop, Claude Code, Cursor, VS Code and Windsurf connect to it directly — see [Getting started with MCP](https://public.meldoc.io/meldoc/documentation/mcp-getting-started).

This package is a stdio bridge to that server, for a client that can only start a local process and cannot use [`mcp-remote`](https://www.npmjs.com/package/mcp-remote). It forwards every request to the hosted server, so the tools are the same — see the [MCP tools reference](https://public.meldoc.io/meldoc/documentation/mcp-tools).

## Claude Code plugin

This repository is also a Claude Code plugin marketplace. The plugin connects Claude Code to the hosted server directly, without this package:

```bash
claude plugin marketplace add meldoc-io/mcp-stdio-proxy
claude plugin install meldoc-mcp@meldoc-mcp
```

Then run `/mcp` in Claude Code, pick the Meldoc server and choose **Authenticate**.

## Setup

Requires Node.js 18 or newer.

Add the proxy to your client's MCP configuration:

```json
{
  "mcpServers": {
    "meldoc": {
      "command": "npx",
      "args": ["-y", "@meldocio/mcp-stdio-proxy@latest"]
    }
  }
}
```

Or let the installer write it: `npx @meldocio/mcp-stdio-proxy@latest install [claude-desktop|cursor|cursor-global|claude-code]` (`uninstall` removes it from Claude Desktop).

Then sign in once:

```bash
npx @meldocio/mcp-stdio-proxy@latest auth login
```

`auth login` shows a device code and opens the browser; `auth login --pkce` uses OAuth with PKCE instead. The session is stored in `~/.meldoc/credentials.json` and refreshed automatically. `auth status` and `auth logout` do what they say.

### Using a token instead

Create an integration token in Meldoc (**Integration Tokens → Create token**) and pass it in the environment:

```json
"env": { "MELDOC_ACCESS_TOKEN": "mdc_your_token" }
```

The proxy looks for a token in this order: `MELDOC_ACCESS_TOKEN`, the saved session, `MELDOC_MCP_TOKEN`.

## Workspaces

If your account belongs to several workspaces, the proxy pins one on every request, taken from:

1. `workspaceAlias` in a `meldoc.config.yml` in the current directory or a parent, then
2. the default set with `npx @meldocio/mcp-stdio-proxy@latest config set-workspace <alias>` (stored in `~/.meldoc/config.json`).

A `workspaceAlias` argument on a single tool call still overrides the pin. `config list-workspaces` lists what you can reach.

## Local tools

On top of the server's tools, the proxy answers these itself: `auth_status`, `auth_login_instructions`, `get_workspace` and `set_workspace` (the last two read and write the default above).

## Development

```bash
npm install
npm test
```

`npm run test:local` runs the suite against a local API (`localhost:8080`). `npm run publish:patch` (or `publish:minor`) bumps the version, runs the tests and publishes `package.json` as it is.

## License

MIT — see [LICENSE](LICENSE).

## Support

- Issues: <https://github.com/meldoc-io/mcp-stdio-proxy/issues>
- Documentation: <https://public.meldoc.io/meldoc/documentation/mcp>
