#!/usr/bin/env node

const axios = require('axios');
const https = require('https');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// Check for CLI commands first
const args = process.argv.slice(2);
if (args.length > 0) {
  const command = args[0];
  // Handle CLI commands - cli.js will handle and exit
  if (command === 'auth' || command === 'config' || command === 'install' || 
      command === 'uninstall' || command === 'help' || command === '--help' || command === '-h') {
    require('./cli');
    // Don't exit here - cli.js will handle process.exit() after async operations complete
    return;
  }
}

// Get package info - try multiple paths for different installation scenarios
let pkg;
try {
  // Try relative path first (development)
  pkg = require('../package.json');
} catch (e) {
  try {
    // Try from node_modules (when installed)
    pkg = require(path.join(__dirname, '../../package.json'));
  } catch (e2) {
    // Fallback to hardcoded values
    pkg = {
      name: '@meldocio/mcp-stdio-proxy',
      version: '1.0.5'
    };
  }
}

// JSON-RPC error codes
const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000
};

// Custom error codes
const CUSTOM_ERROR_CODES = {
  AUTH_REQUIRED: -32001,
  NOT_FOUND: -32002,
  RATE_LIMIT: -32003
};

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Import new auth and workspace modules
const { getAccessToken, getAuthStatus } = require('../lib/auth');
const { resolveWorkspaceAlias } = require('../lib/workspace');
const { getApiUrl } = require('../lib/constants');
const { setWorkspaceAlias, getWorkspaceAlias } = require('../lib/config');

// Configuration
const apiUrl = getApiUrl();
const rpcEndpoint = `${apiUrl}/mcp/v1/rpc`;
const REQUEST_TIMEOUT = 25000; // 25 seconds (less than Claude Desktop's 30s timeout)
const LOG_LEVEL = getLogLevel(process.env.LOG_LEVEL || 'ERROR');

// Get log level from environment
function getLogLevel(level) {
  const upper = (level || '').toUpperCase();
  return LOG_LEVELS[upper] !== undefined ? LOG_LEVELS[upper] : LOG_LEVELS.ERROR;
}

// Logging function - all logs go to stderr with beautiful colors
function log(level, message, ...args) {
  if (LOG_LEVEL >= level) {
    const levelName = Object.keys(LOG_LEVELS)[level];
    let prefix, colorFn;
    
    switch (level) {
      case LOG_LEVELS.ERROR:
        prefix = chalk.red('✗ [ERROR]');
        colorFn = chalk.redBright;
        break;
      case LOG_LEVELS.WARN:
        prefix = chalk.yellow('⚠ [WARN]');
        colorFn = chalk.yellowBright;
        break;
      case LOG_LEVELS.INFO:
        prefix = chalk.blue('ℹ [INFO]');
        colorFn = chalk.blueBright;
        break;
      case LOG_LEVELS.DEBUG:
        prefix = chalk.gray('🔍 [DEBUG]');
        colorFn = chalk.gray;
        break;
      default:
        prefix = `[${levelName}]`;
        colorFn = (text) => text;
    }
    
    process.stderr.write(`${prefix} ${colorFn(message)}\n`);
    if (args.length > 0 && LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      process.stderr.write(chalk.gray(JSON.stringify(args, null, 2)) + '\n');
    }
  }
}

// Buffer for incomplete lines
let buffer = '';

// Set stdin encoding
process.stdin.setEncoding('utf8');

// Handle stdin data
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  // Keep the last incomplete line in buffer
  buffer = lines.pop() || '';
  
  // Process complete lines
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines but don't exit
    if (trimmed) {
      handleLine(trimmed);
    }
  }
});

// Handle end of input
process.stdin.on('end', () => {
  // Process any remaining buffer
  if (buffer.trim()) {
    handleLine(buffer.trim());
  }
  // Don't exit - Claude Desktop may reconnect
  // The process will be terminated by Claude Desktop when needed
});

// Handle errors - don't exit, just log
process.stdin.on('error', (error) => {
  // Log to stderr but don't exit - Claude Desktop may close stdin
  // Silently handle stdin errors - they're normal when Claude Desktop closes the connection
});

// Handle stdout errors
process.stdout.on('error', (error) => {
  // If stdout is closed (e.g., Claude Desktop disconnected), exit gracefully
  if (error.code === 'EPIPE') {
    process.exit(0);
  }
});

// Handle SIGINT/SIGTERM for graceful shutdown
let isShuttingDown = false;
function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  log(LOG_LEVELS.INFO, `Received ${signal}, shutting down gracefully...`);
  // Give a moment for any pending requests to complete
  setTimeout(() => {
    process.exit(0);
  }, 100);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Handle a single line from stdin
 */
function handleLine(line) {
  // Skip empty lines
  if (!line || !line.trim()) {
    return;
  }
  
  try {
    const request = JSON.parse(line);
    handleRequest(request);
  } catch (parseError) {
    // Invalid JSON - try to extract id from the raw line if possible
    // For parse errors, we can't reliably get the id, so we skip the response
    // to avoid Zod validation errors in Claude Desktop (it doesn't accept id: null)
    // This is acceptable per JSON-RPC spec - parse errors can be ignored if id is unknown
    log(LOG_LEVELS.ERROR, `Parse error: ${parseError.message}`);
  }
}

/**
 * Validate JSON-RPC request
 */
function validateRequest(request) {
  if (!request || typeof request !== 'object') {
    return { valid: false, error: 'Request must be an object' };
  }
  
  // Allow requests without jsonrpc for compatibility (some MCP clients may omit it)
  if (request.jsonrpc && request.jsonrpc !== '2.0') {
    return { valid: false, error: 'jsonrpc must be "2.0"' };
  }
  
  // Allow requests without method if they're notifications (id is null/undefined)
  // But batch requests must be arrays
  if (!request.method && !Array.isArray(request) && request.id !== null && request.id !== undefined) {
    return { valid: false, error: 'Request must have a method or be a batch array' };
  }
  
  return { valid: true };
}

/**
 * Handle a JSON-RPC request
 * This function MUST always send a response for requests with id (except notifications)
 */
async function handleRequest(request) {
  // Handle null/undefined requests
  if (!request) {
    return;
  }
  
  // Wrap in try-catch to ensure we always handle errors gracefully
  try {
    // Handle batch requests (array of requests)
  if (Array.isArray(request)) {
    // Process batch requests sequentially
    for (const req of request) {
      if (req) {
        try {
          // Check if this is a protocol method that should be handled locally
          const method = req.method;
          if (method === 'initialize') {
            handleInitialize(req);
          } else if (method === 'initialized' || method === 'notifications/initialized') {
            // Notification - no response needed
            continue;
          } else if (method === 'notifications/cancelled') {
            // Notification - no response needed
            continue;
          } else if (method === 'ping') {
            handlePing(req);
          } else if (method === 'resources/list') {
            handleResourcesList(req);
          } else if (method === 'tools/list') {
            handleToolsList(req);
          } else if (method === 'tools/call') {
            await handleToolsCall(req);
          } else {
            // Forward to backend
            await processSingleRequest(req);
          }
        } catch (error) {
          // Catch any errors in batch request processing
          log(LOG_LEVELS.ERROR, `Error processing batch request: ${error.message || 'Unknown error'}`);
          log(LOG_LEVELS.DEBUG, `Error stack: ${error.stack || 'No stack trace'}`);
          // Send error response if request has id
          if (req && req.id !== undefined && req.id !== null) {
            sendError(req.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                      `Error processing request: ${error.message || 'Unknown error'}`, {
                        code: 'INTERNAL_ERROR'
                      });
          }
        }
      }
    }
    return;
  }
  
  // Validate single request
  const validation = validateRequest(request);
  if (!validation.valid) {
    sendError(request.id, JSON_RPC_ERROR_CODES.INVALID_REQUEST, validation.error);
    return;
  }
  
  // Handle MCP protocol methods locally (not forwarded to backend)
  const method = request.method;
  if (method === 'initialize') {
    handleInitialize(request);
    return;
  } else if (method === 'initialized' || method === 'notifications/initialized') {
    // Notification - no response needed per MCP spec
    return;
  } else if (method === 'notifications/cancelled') {
    // Notification - no response needed
    return;
  } else if (method === 'ping') {
    handlePing(request);
    return;
  } else if (method === 'resources/list') {
    // Return empty resources list (resources not supported yet)
    handleResourcesList(request);
    return;
  } else if (method === 'tools/list') {
    // Return static list of tools (never proxy to backend)
    handleToolsList(request);
    return;
  } else if (method === 'tools/call') {
    // Handle tools/call - check if it's a local tool first
    await handleToolsCall(request);
    return;
  }
  
  // All other methods are forwarded to backend
  await processSingleRequest(request);
  } catch (error) {
    // Catch any completely unexpected errors in handleRequest
    log(LOG_LEVELS.ERROR, `Unexpected error in handleRequest: ${error.message || 'Unknown error'}`);
    log(LOG_LEVELS.DEBUG, `Error stack: ${error.stack || 'No stack trace'}`);
    
    // Only send error if request has id (not for notifications)
    if (request && request.id !== undefined && request.id !== null) {
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Internal error: ${error.message || 'Unknown error'}`, {
                  code: 'INTERNAL_ERROR'
                });
    }
  }
}

/**
 * Handle MCP initialize method
 * This is called by Claude Desktop to establish the connection
 */
function handleInitialize(request) {
  const response = {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: {},
        resources: {}
      },
      serverInfo: {
        name: pkg.name,
        version: pkg.version
      }
    }
  };
  
  log(LOG_LEVELS.DEBUG, 'Initialize request received');
  process.stdout.write(JSON.stringify(response) + '\n');
  if (process.stdout.isTTY) {
    process.stdout.flush();
  }
}

/**
 * Handle MCP ping method (keep-alive)
 */
function handlePing(request) {
  const response = {
    jsonrpc: '2.0',
    id: request.id,
    result: {}
  };
  
  process.stdout.write(JSON.stringify(response) + '\n');
  if (process.stdout.isTTY) {
    process.stdout.flush();
  }
}

/**
 * Handle resources/list method
 * Returns empty list as resources are not supported yet
 */
function handleResourcesList(request) {
  const response = {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      resources: []
    }
  };
  
  process.stdout.write(JSON.stringify(response) + '\n');
  if (process.stdout.isTTY) {
    process.stdout.flush();
  }
}

/**
 * Get static list of all available tools
 * This is always returned locally, never proxied to backend
 */
function getToolsList() {
  return [
    {
      name: 'docs_list',
      description: 'List documents in workspace/project. For public tokens, only shows published public documents.',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' },
          projectId: { type: 'string', description: 'UUID of the project to list documents from' },
          cursor: { type: 'string', description: 'Pagination cursor' },
          limit: { type: 'integer', description: 'Maximum number of documents to return (default: 50, max: 100)' }
        }
      }
    },
    {
      name: 'docs_get',
      description: 'Get a specific document by ID or path. For public tokens, allows access to public and unlisted documents.',
      inputSchema: {
        type: 'object',
        required: ['docId'],
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' },
          docId: { type: 'string', description: 'UUID of the document (alias: id)' },
          id: { type: 'string', description: 'UUID of the document (alias for docId)' },
          path: { type: 'string', description: 'Path of the document (not yet implemented)' }
        }
      }
    },
    {
      name: 'docs_tree',
      description: 'Get the document tree structure for a project. For public tokens, only includes published public documents.',
      inputSchema: {
        type: 'object',
        required: ['projectId'],
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' },
          projectId: { type: 'string', description: 'UUID of the project' },
          project_alias: { type: 'string', description: 'Alias of the project (alternative to projectId)' }
        }
      }
    },
    {
      name: 'docs_search',
      description: 'Search documents by text query. For public tokens, only searches published public documents.',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' },
          query: { type: 'string', description: 'Search query text' },
          projectId: { type: 'string', description: 'UUID of the project to search in' },
          limit: { type: 'integer', description: 'Maximum number of results (default: 20, max: 50)' }
        }
      }
    },
    {
      name: 'docs_update',
      description: 'Update a document\'s content and/or metadata. Requires update permission (internal tokens only).',
      inputSchema: {
        type: 'object',
        required: ['docId'],
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' },
          docId: { type: 'string', description: 'UUID of the document to update' },
          contentMd: { type: 'string', description: 'New markdown content for the document (optional, can update individual fields without content)' },
          title: { type: 'string', description: 'New title for the document' },
          alias: { type: 'string', description: 'New alias for the document' },
          parentAlias: { type: 'string', description: 'Alias of the parent document (set to empty string to remove parent)' },
          workflow: { type: 'string', enum: ['published', 'draft'], description: 'Workflow status: \'published\' or \'draft\'' },
          visibility: { type: 'string', enum: ['visible', 'hidden'], description: 'Visibility: \'visible\' or \'hidden\'' },
          exposure: { type: 'string', enum: ['private', 'unlisted', 'public', 'inherit'], description: 'Exposure level: \'private\', \'unlisted\', \'public\', or \'inherit\'' },
          expectedUpdatedAt: { type: 'string', description: 'Expected updatedAt timestamp for optimistic locking (RFC3339 format)' }
        }
      }
    },
    {
      name: 'docs_create',
      description: 'Create a new document. Requires create permission (internal tokens only).',
      inputSchema: {
        type: 'object',
        required: ['projectId', 'title', 'contentMd'],
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' },
          projectId: { type: 'string', description: 'UUID of the project to create the document in' },
          title: { type: 'string', description: 'Title of the document' },
          contentMd: { type: 'string', description: 'Markdown content for the document' },
          alias: { type: 'string', description: 'Alias for the document (will be auto-generated from title if not provided)' },
          parentAlias: { type: 'string', description: 'Alias of the parent document' }
        }
      }
    },
    {
      name: 'docs_delete',
      description: 'Delete a document. Requires delete permission (internal tokens only).',
      inputSchema: {
        type: 'object',
        required: ['docId'],
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' },
          docId: { type: 'string', description: 'UUID of the document to delete' }
        }
      }
    },
    {
      name: 'docs_links',
      description: 'Get all outgoing links from a document (links that point from this document to other documents).',
      inputSchema: {
        type: 'object',
        required: ['docId'],
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' },
          docId: { type: 'string', description: 'UUID of the document' }
        }
      }
    },
    {
      name: 'docs_backlinks',
      description: 'Get all backlinks to a document (links from other documents that point to this document).',
      inputSchema: {
        type: 'object',
        required: ['docId'],
        properties: {
          docId: { type: 'string', description: 'UUID of the document' }
        }
      }
    },
    {
      name: 'projects_list',
      description: 'List projects accessible by this token. For public tokens, only shows public projects.',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' }
        }
      }
    },
    {
      name: 'server_info',
      description: 'Get information about this MCP server\'s configuration, capabilities, and accessible projects.',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceAlias: { type: 'string', description: 'Workspace alias (auto-selected if user has only one workspace)' },
          workspaceId: { type: 'string', description: 'Workspace UUID (auto-selected if user has only one workspace)' }
        }
      }
    },
    {
      name: 'list_workspaces',
      description: 'List all workspaces accessible by the current user or integration token. For integration tokens, returns the workspace from token scope. Works without workspace header via /mcp/v1/rpc endpoint.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_workspace',
      description: 'Get the current workspace alias from repo config or global config. Reads workspaceAlias from configuration files.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'set_workspace',
      description: 'Set the workspace alias in global config (~/.meldoc/config.json). This workspace will be used automatically if user has multiple workspaces.',
      inputSchema: {
        type: 'object',
        required: ['alias'],
        properties: {
          alias: { type: 'string', description: 'Workspace alias to set' }
        }
      }
    },
    {
      name: 'auth_status',
      description: 'Check authentication status. Returns whether user is logged in and authentication details.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'auth_login_instructions',
      description: 'Get instructions for logging in. Returns the command to run for authentication.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ];
}

/**
 * Handle tools/list method
 * Always returns static list locally, never proxies to backend
 * This function MUST always succeed and return a response
 */
function handleToolsList(request) {
  try {
    const tools = getToolsList();
    
    // Log tool names for debugging
    const toolNames = tools.map(t => t.name).join(', ');
    log(LOG_LEVELS.INFO, `Returning ${tools.length} tools locally: ${toolNames}`);
    
    const response = {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: tools
      }
    };
    
    // Always send response, even if there's an error writing
    try {
      const responseStr = JSON.stringify(response);
      process.stdout.write(responseStr + '\n');
      if (process.stdout.isTTY) {
        process.stdout.flush();
      }
      log(LOG_LEVELS.DEBUG, `Sent tools/list response (${responseStr.length} bytes)`);
    } catch (writeError) {
      // If stdout write fails, log but don't throw - we've already logged the response
      log(LOG_LEVELS.ERROR, `Failed to write tools/list response: ${writeError.message}`);
    }
  } catch (error) {
    // This should never happen, but if it does, send error response
    log(LOG_LEVELS.ERROR, `Unexpected error in handleToolsList: ${error.message || 'Unknown error'}`);
    log(LOG_LEVELS.DEBUG, `Error stack: ${error.stack || 'No stack trace'}`);
    
    // Send error response
    sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
              `Failed to get tools list: ${error.message || 'Unknown error'}`, {
                code: 'INTERNAL_ERROR'
              });
  }
}

/**
 * Handle tools/call method
 * Checks if it's a local tool first, otherwise forwards to backend
 */
async function handleToolsCall(request) {
  try {
    const toolName = request.params?.name;
    const arguments_ = request.params?.arguments || {};
    
    log(LOG_LEVELS.DEBUG, `handleToolsCall: toolName=${toolName}`);
    
    // Handle local tools
    if (toolName === 'set_workspace') {
      const alias = arguments_.alias;
      if (!alias || typeof alias !== 'string') {
        sendError(request.id, JSON_RPC_ERROR_CODES.INVALID_PARAMS, 'alias parameter is required and must be a string');
        return;
      }
      
      try {
        setWorkspaceAlias(alias);
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Workspace alias set to: ${alias}`
              }
            ]
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
        if (process.stdout.isTTY) {
          process.stdout.flush();
        }
      } catch (error) {
        sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, `Failed to set workspace alias: ${error.message}`);
      }
      return;
    }
  
    if (toolName === 'get_workspace') {
      try {
        const workspaceAlias = getWorkspaceAlias();
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  workspaceAlias: workspaceAlias || null,
                  source: workspaceAlias ? 'config' : 'not_found',
                  message: workspaceAlias ? `Current workspace: ${workspaceAlias}` : 'No workspace set in config'
                }, null, 2)
              }
            ]
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
        if (process.stdout.isTTY) {
          process.stdout.flush();
        }
      } catch (error) {
        sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, `Failed to get workspace: ${error.message}`);
      }
      return;
    }
  
  if (toolName === 'auth_status') {
    try {
      const authStatus = await getAuthStatus();
      if (!authStatus) {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  authenticated: false,
                  message: 'Not authenticated. Run: npx @meldocio/mcp-stdio-proxy@latest auth login'
                }, null, 2)
              }
            ]
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
        if (process.stdout.isTTY) {
          process.stdout.flush();
        }
        return;
      }
      
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(authStatus, null, 2)
            }
          ]
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      if (process.stdout.isTTY) {
        process.stdout.flush();
      }
    } catch (error) {
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, `Failed to get auth status: ${error.message}`);
    }
    return;
  }
  
  if (toolName === 'auth_login_instructions') {
    const response = {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [
          {
            type: 'text',
            text: 'To authenticate, run the following command:\n\nnpx @meldocio/mcp-stdio-proxy@latest auth login'
          }
        ]
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
    if (process.stdout.isTTY) {
      process.stdout.flush();
    }
    return;
  }
  
  // All other tools are forwarded to backend
  log(LOG_LEVELS.DEBUG, `Forwarding tool ${toolName} to backend (not a local tool)`);
  await processSingleRequest(request);
  } catch (error) {
    // Catch any unexpected errors in handleToolsCall
    log(LOG_LEVELS.ERROR, `Unexpected error in handleToolsCall: ${error.message || 'Unknown error'}`);
    log(LOG_LEVELS.DEBUG, `Error stack: ${error.stack || 'No stack trace'}`);
    sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
              `Internal error in tool handler: ${error.message || 'Unknown error'}`, {
                code: 'INTERNAL_ERROR',
                toolName: request.params?.name
              });
  }
}

/**
 * Process a single JSON-RPC request
 * Forwards the request to the backend MCP API
 */
async function processSingleRequest(request) {
  // Get access token with priority and auto-refresh
  const tokenInfo = await getAccessToken();
  if (!tokenInfo) {
    sendError(request.id, CUSTOM_ERROR_CODES.AUTH_REQUIRED, 
              'Meldoc token not found. Set MELDOC_ACCESS_TOKEN environment variable or run: npx @meldocio/mcp-stdio-proxy@latest auth login', {
                code: 'AUTH_REQUIRED',
                hint: 'Use meldoc.auth_login_instructions tool to get login command'
              });
    return;
  }
  
  try {
    // Ensure request has jsonrpc field
    const requestWithJsonRpc = {
      ...request,
      jsonrpc: request.jsonrpc || '2.0'
    };
    
    log(LOG_LEVELS.DEBUG, `Forwarding request: ${request.method || 'unknown'}`);
    
    // Prepare headers
    const headers = {
      'Authorization': `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
      'User-Agent': `${pkg.name}/${pkg.version}`
    };
    
    // For tools/call: special handling
    if (request.method === 'tools/call') {
      const toolName = request.params?.name;
      
      // For list_workspaces: NEVER add workspace header
      // This tool should work without workspace header
      // Backend middleware should handle this specially
      if (toolName === 'list_workspaces') {
        log(LOG_LEVELS.DEBUG, `Skipping workspace header for ${toolName} tool`);
        // Explicitly don't add workspace header - this tool must work without it
        // Do nothing - headers will not include X-Meldoc-Workspace
      } else {
        // For other tools/call: don't add workspace header automatically
        // Backend will auto-select if user has only one workspace
        // If multiple workspaces, backend will return WORKSPACE_REQUIRED error
        log(LOG_LEVELS.DEBUG, `Tool ${toolName} - not adding workspace header automatically`);
      }
    } else {
      // For other methods: add workspace header if available (for backward compatibility)
      const workspaceAlias = resolveWorkspaceAlias(true);
      if (workspaceAlias) {
        headers['X-Meldoc-Workspace'] = workspaceAlias;
        log(LOG_LEVELS.DEBUG, `Added workspace header: ${workspaceAlias}`);
      }
    }
    
    log(LOG_LEVELS.DEBUG, `Making request to ${rpcEndpoint}, method: ${request.method || 'unknown'}, headers: ${JSON.stringify(Object.keys(headers))}`);
    
    // Make HTTP request to MCP API
    log(LOG_LEVELS.DEBUG, `POST ${rpcEndpoint} with body: ${JSON.stringify({
      method: requestWithJsonRpc.method,
      params: requestWithJsonRpc.params ? {
        name: requestWithJsonRpc.params.name,
        arguments: requestWithJsonRpc.params.arguments
      } : undefined
    })}`);
    
    const response = await axios.post(rpcEndpoint, requestWithJsonRpc, {
      headers,
      timeout: REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      // Keep connection alive for better performance
      httpsAgent: new https.Agent({ keepAlive: true, keepAliveMsecs: 1000 })
    });
    
    log(LOG_LEVELS.DEBUG, `Response status: ${response.status}, data keys: ${JSON.stringify(Object.keys(response.data || {}))}`);
    log(LOG_LEVELS.DEBUG, `Full response data: ${JSON.stringify(response.data)}`);
    
    // Handle successful response
    if (response.status >= 200 && response.status < 300) {
      const responseData = response.data;
      
      // Ensure response has jsonrpc and id if original request had id
      if (responseData && typeof responseData === 'object') {
        if (!responseData.jsonrpc) {
          responseData.jsonrpc = '2.0';
        }
        if (request.id !== undefined && responseData.id === undefined) {
          responseData.id = request.id;
        }
      }
      
      // Check for WORKSPACE_REQUIRED error
      if (responseData.error) {
        const errorCode = responseData.error.code;
        const errorMessage = responseData.error.message || '';
        const errorData = responseData.error.data || {};
        
        // Get tool name from request (check both original and modified request)
        const toolName = request.params?.name || requestWithJsonRpc.params?.name;
        
        log(LOG_LEVELS.DEBUG, `Error response: code=${errorCode} (type: ${typeof errorCode}), message="${errorMessage}", toolName=${toolName}, errorData=${JSON.stringify(errorData)}`);
        log(LOG_LEVELS.DEBUG, `Full error response: ${JSON.stringify(responseData.error)}`);
        
        // Check if error message contains "Multiple workspaces available" (backend may return this with different error codes)
        // Backend may return code as number (-32000) or string ('WORKSPACE_REQUIRED')
        const errorMsgStr = String(errorMessage || '');
        const hasWorkspaceMessage = errorMsgStr.includes('Multiple workspaces available') || 
                                    errorMsgStr.includes('Specify workspace');
        
        const isWorkspaceRequired = errorCode === 'WORKSPACE_REQUIRED' || 
                                   errorData.code === 'WORKSPACE_REQUIRED' ||
                                   (errorCode === JSON_RPC_ERROR_CODES.SERVER_ERROR && hasWorkspaceMessage);
        
        log(LOG_LEVELS.DEBUG, `Workspace check: isWorkspaceRequired=${isWorkspaceRequired}, hasWorkspaceMessage=${hasWorkspaceMessage}, errorMsgStr="${errorMsgStr}"`);
        
        if (isWorkspaceRequired) {
          log(LOG_LEVELS.DEBUG, `Detected WORKSPACE_REQUIRED error for tool: ${toolName}`);
          
          // Special handling for tools that should work without workspace
          if (toolName === 'list_workspaces') {
            // This is a backend issue - this tool should work without workspace header
            // But we can still provide helpful message
            const message = `Backend requires workspace selection even for ${toolName}. Please set a default workspace using set_workspace tool first, or contact support if this persists.`;
            sendError(request.id, JSON_RPC_ERROR_CODES.SERVER_ERROR, message, {
              code: 'WORKSPACE_REQUIRED',
              hint: 'Try setting a default workspace first using set_workspace tool, or specify workspaceAlias/workspaceId in the tool call arguments.'
            });
            return;
          }
          
          const message = 'Multiple workspaces available. Use list_workspaces tool to get list, then use set_workspace to set default workspace, or specify workspaceAlias or workspaceId parameter in tool call.';
          sendError(request.id, JSON_RPC_ERROR_CODES.SERVER_ERROR, message, {
            code: 'WORKSPACE_REQUIRED',
            hint: 'Use list_workspaces tool to get available workspaces, then use set_workspace to set default, or specify workspaceAlias or workspaceId in tool call.'
          });
          return;
        }
        
        // Check for AUTH_REQUIRED error
        if (errorCode === 'AUTH_REQUIRED' || errorData.code === 'AUTH_REQUIRED') {
          const message = 'Authentication required. Run: npx @meldocio/mcp-stdio-proxy@latest auth login';
          sendError(request.id, CUSTOM_ERROR_CODES.AUTH_REQUIRED, message, {
            code: 'AUTH_REQUIRED',
            hint: 'Use auth_login_instructions tool to get login command'
          });
          return;
        }
        
        // If error was not handled above, forward it as-is
        log(LOG_LEVELS.DEBUG, `Forwarding unhandled error: ${JSON.stringify(responseData.error)}`);
        // Forward the error response as-is
        process.stdout.write(JSON.stringify(responseData) + '\n');
        if (process.stdout.isTTY) {
          process.stdout.flush();
        }
        return;
      }
      
      // If there's an error that we handled, we already sent a response, so return
      if (responseData.error) {
        return;
      }
      
      // Success response - ensure stdout is flushed immediately
      process.stdout.write(JSON.stringify(responseData) + '\n');
      // Flush stdout to ensure data is sent immediately
      if (process.stdout.isTTY) {
        process.stdout.flush();
      }
    } else {
      // HTTP error status (400, 401, 404, etc.)
      log(LOG_LEVELS.DEBUG, `HTTP error status ${response.status}, full response: ${JSON.stringify(response.data)}`);
      
      // Try to extract error information from different possible formats
      // Format 1: JSON-RPC error format { error: { code, message, data } }
      // Format 2: Direct error format { code, message, details, error }
      // Format 3: Simple error format { message }
      
      const responseData = response.data || {};
      const errorMessage = responseData.error?.message || 
                          responseData.message || 
                          `HTTP ${response.status}: ${response.statusText}`;
      
      // Check for WORKSPACE_REQUIRED in various places
      const errorData = responseData.error?.data || responseData.details || {};
      const errorMsg = responseData.error?.message || responseData.message || '';
      const errorCode = responseData.error?.code || responseData.code;
      
      log(LOG_LEVELS.DEBUG, `HTTP error details: errorCode=${errorCode}, errorMsg="${errorMsg}", errorData=${JSON.stringify(errorData)}`);
      
      const isWorkspaceRequired = errorCode === 'WORKSPACE_REQUIRED' ||
                                  errorData.code === 'WORKSPACE_REQUIRED' || 
                                  errorMsg.includes('Multiple workspaces available') ||
                                  errorMsg.includes('Specify workspace') ||
                                  errorMsg.includes('workspace selection') ||
                                  errorMsg.includes('workspace slug') ||
                                  errorMsg.includes('workspaceId') ||
                                  errorMsg.includes('workspaceAlias');
      
      if (isWorkspaceRequired) {
        // Get tool name from request
        const toolName = request.params?.name;
        
        log(LOG_LEVELS.DEBUG, `Detected WORKSPACE_REQUIRED for tool: ${toolName}`);
        
        // Special handling for tools that should work without workspace
        if (toolName === 'list_workspaces') {
          // For this tool, backend should not require workspace
          // Log the actual backend error for debugging
          log(LOG_LEVELS.WARN, `Backend returned workspace requirement for ${toolName} tool. Backend error: ${errorMsg}`);
          const message = `Backend requires workspace selection even for ${toolName}. This may indicate a backend configuration issue. Backend error: ${errorMsg}`;
          sendError(request.id, JSON_RPC_ERROR_CODES.SERVER_ERROR, message, {
            code: 'WORKSPACE_REQUIRED',
            hint: 'This tool should work without workspace. Please contact support or check backend configuration.',
            backendError: errorMsg,
            backendCode: errorCode
          });
          return;
        }
        
        const message = 'Multiple workspaces available. Use list_workspaces tool to get list, then use set_workspace to set default workspace, or specify workspaceAlias or workspaceId parameter in tool call.';
        sendError(request.id, JSON_RPC_ERROR_CODES.SERVER_ERROR, message, {
          code: 'WORKSPACE_REQUIRED',
          hint: 'Use list_workspaces tool to get available workspaces, then use set_workspace to set default, or specify workspaceAlias or workspaceId in tool call.'
        });
        return;
      }
      
      // Check for AUTH_REQUIRED
      if (errorCode === 'AUTH_REQUIRED' || errorData.code === 'AUTH_REQUIRED') {
        const message = 'Authentication required. Run: npx @meldocio/mcp-stdio-proxy@latest auth login';
        sendError(request.id, CUSTOM_ERROR_CODES.AUTH_REQUIRED, message, {
          code: 'AUTH_REQUIRED',
          hint: 'Use auth_login_instructions tool to get login command'
        });
        return;
      }
      
      // Forward the error as-is, but ensure JSON-RPC format
      // If response is already in JSON-RPC format, forward it
      if (responseData.jsonrpc && responseData.error) {
        process.stdout.write(JSON.stringify(responseData) + '\n');
        if (process.stdout.isTTY) {
          process.stdout.flush();
        }
      } else {
        // Convert to JSON-RPC format
        sendError(request.id, JSON_RPC_ERROR_CODES.SERVER_ERROR, errorMessage, {
          status: response.status,
          code: errorCode,
          details: errorData
        });
      }
    }
  } catch (error) {
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const errorData = error.response.data;
      const errorMessage = errorData?.error?.message || 
                          errorData?.message || 
                          `HTTP ${status}: ${error.response.statusText}`;
      
      let errorCode = JSON_RPC_ERROR_CODES.SERVER_ERROR;
      if (status === 401) {
        errorCode = CUSTOM_ERROR_CODES.AUTH_REQUIRED;
      } else if (status === 404) {
        errorCode = CUSTOM_ERROR_CODES.NOT_FOUND;
      } else if (status === 429) {
        errorCode = CUSTOM_ERROR_CODES.RATE_LIMIT;
      }
      
      // Check for WORKSPACE_REQUIRED
      const errorDataCode = errorData?.error?.code || errorData?.code;
      const errorMsgText = errorData?.error?.message || errorData?.message || errorMessage || '';
      const isWorkspaceRequired = errorDataCode === 'WORKSPACE_REQUIRED' || 
                                  errorMsgText.includes('Multiple workspaces available');
      
      if (isWorkspaceRequired) {
        // Get tool name from request
        const toolName = request.params?.name;
        
        // Special handling for tools that should work without workspace
        if (toolName === 'list_workspaces') {
          const message = `Backend requires workspace selection even for ${toolName}. Please set a default workspace using set_workspace tool first, or contact support if this persists.`;
          sendError(request.id, JSON_RPC_ERROR_CODES.SERVER_ERROR, message, {
            code: 'WORKSPACE_REQUIRED',
            hint: 'Try setting a default workspace first using set_workspace tool, or specify workspaceAlias/workspaceId in the tool call arguments.'
          });
          return;
        }
        
        const message = 'Multiple workspaces available. Use list_workspaces tool to get list, then use set_workspace to set default workspace, or specify workspaceAlias or workspaceId parameter in tool call.';
        sendError(request.id, JSON_RPC_ERROR_CODES.SERVER_ERROR, message, {
          code: 'WORKSPACE_REQUIRED',
          hint: 'Use list_workspaces tool to get available workspaces, then use set_workspace to set default, or specify workspaceAlias or workspaceId in tool call.'
        });
        return;
      }
      
      // Check for AUTH_REQUIRED
      if (errorDataCode === 'AUTH_REQUIRED') {
        const message = 'Authentication required. Run: npx @meldocio/mcp-stdio-proxy@latest auth login';
        sendError(request.id, CUSTOM_ERROR_CODES.AUTH_REQUIRED, message, {
          code: 'AUTH_REQUIRED',
          hint: 'Use auth_login_instructions tool to get login command'
        });
        return;
      }
      
      log(LOG_LEVELS.WARN, `HTTP error ${status}: ${errorMessage}`);
      sendError(request.id, errorCode, errorMessage, {
        status,
        code: errorData?.error?.code || errorDataCode || `HTTP_${status}`
      });
    } else if (error.request) {
      // Request was made but no response received
      log(LOG_LEVELS.ERROR, `Network error: ${error.message || 'No response from server'}`);
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Network error: ${error.message || 'No response from server'}`, {
                  code: 'NETWORK_ERROR'
                });
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      log(LOG_LEVELS.WARN, `Request timeout after ${REQUEST_TIMEOUT}ms`);
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Request timeout after ${REQUEST_TIMEOUT}ms`, {
                  code: 'TIMEOUT'
                });
    } else {
      // Other errors
      log(LOG_LEVELS.ERROR, `Internal error: ${error.message || 'Unknown error'}`);
      log(LOG_LEVELS.DEBUG, `Error stack: ${error.stack || 'No stack trace'}`);
      sendError(request.id, JSON_RPC_ERROR_CODES.INTERNAL_ERROR, 
                `Internal error: ${error.message || 'Unknown error'}`, {
                  code: 'INTERNAL_ERROR'
                });
    }
  }
}

/**
 * Send JSON-RPC error response
 */
function sendError(id, code, message, details) {
  // Only send error response if id is defined (not for notifications)
  // Claude Desktop's Zod schema doesn't accept null for id
  if (id === undefined || id === null) {
    // For notifications or parse errors without id, don't send response
    // or send without id field
    return;
  }
  
  const errorResponse = {
    jsonrpc: '2.0',
    id: id,
    error: {
      code: code,
      message: message
    }
  };
  
  // Add details if provided (for debugging)
  if (details && LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    errorResponse.error.data = details;
  }
  
  process.stdout.write(JSON.stringify(errorResponse) + '\n');
  // Flush stdout to ensure data is sent immediately
  if (process.stdout.isTTY) {
    process.stdout.flush();
  }
}
