/**
 * MCP Tools Schema Definitions
 *
 * This module contains all tool definitions for the Meldoc MCP server.
 * Each tool has a name, description, and JSON Schema for input validation.
 */

/**
 * Get the complete list of MCP tools supported by this proxy
 * @returns {Array<Object>} Array of tool definitions with name, description, and inputSchema
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
 * Check if a tool name exists in the schema
 * @param {string} toolName - The name of the tool to check
 * @returns {boolean} True if tool exists
 */
function isValidToolName(toolName) {
  const tools = getToolsList();
  return tools.some(tool => tool.name === toolName);
}

/**
 * Get a specific tool definition by name
 * @param {string} toolName - The name of the tool
 * @returns {Object|null} Tool definition or null if not found
 */
function getToolByName(toolName) {
  const tools = getToolsList();
  return tools.find(tool => tool.name === toolName) || null;
}

module.exports = {
  getToolsList,
  isValidToolName,
  getToolByName
};
