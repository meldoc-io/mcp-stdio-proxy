const axios = require('axios');
const { makeBackendRequest } = require('../../lib/http/client');
const { getAccessToken } = require('../../lib/core/auth');
const { resolveWorkspaceAlias, findRepoConfig, readRepoConfig } = require('../../lib/core/workspace');
const { setWorkspaceAlias, getWorkspaceAlias, readConfig, writeConfig } = require('../../lib/core/config');
const { deleteCredentials, writeCredentials } = require('../../lib/core/credentials');

// Mock dependencies
jest.mock('axios');
jest.mock('../../lib/core/auth');
jest.mock('../../lib/core/workspace');

describe('http/client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    deleteCredentials();

    // Default mocks
    getAccessToken.mockResolvedValue({
      token: 'test-token',
      type: 'user_session'
    });

    resolveWorkspaceAlias.mockResolvedValue('default-workspace');
    findRepoConfig.mockReturnValue(null);
    readRepoConfig.mockReturnValue(null);

    axios.post.mockResolvedValue({
      status: 200,
      data: {
        jsonrpc: '2.0',
        id: 1,
        result: { success: true }
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    deleteCredentials();

    // Clean up config
    const config = readConfig();
    if (config) {
      delete config.workspaceAlias;
      writeConfig(config);
    }
  });

  describe('makeBackendRequest', () => {
    it('should make request with authentication header', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {}
        }
      };

      await makeBackendRequest(request);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/mcp/v1/rpc'),
        expect.objectContaining({
          jsonrpc: '2.0',
          id: 1,
          method: 'docs_list'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should add workspace header when workspace is resolved', async () => {
      resolveWorkspaceAlias.mockResolvedValue('my-workspace');

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {}
        }
      };

      await makeBackendRequest(request);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Workspace-Alias': 'my-workspace'
          })
        })
      );
    });

    it('should not add workspace header when no workspace is resolved', async () => {
      resolveWorkspaceAlias.mockResolvedValue(null);

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {}
        }
      };

      await makeBackendRequest(request);

      const callHeaders = axios.post.mock.calls[0][2].headers;
      expect(callHeaders['X-Workspace-Alias']).toBeUndefined();
    });

    it('should cache workspaceAlias when explicitly provided in arguments', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {
            workspaceAlias: 'explicit-workspace',
            projectId: 'test-project'
          }
        }
      };

      await makeBackendRequest(request);

      // Verify workspace was cached
      const cachedWorkspace = getWorkspaceAlias();
      expect(cachedWorkspace).toBe('explicit-workspace');
    });

    it('should cache workspaceAlias when provided in params.args (alternative format)', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          args: {
            workspaceAlias: 'another-workspace'
          }
        }
      };

      await makeBackendRequest(request);

      const cachedWorkspace = getWorkspaceAlias();
      expect(cachedWorkspace).toBe('another-workspace');
    });

    it('should not cache workspaceAlias if it is not a string', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {
            workspaceAlias: null
          }
        }
      };

      await makeBackendRequest(request);

      const cachedWorkspace = getWorkspaceAlias();
      expect(cachedWorkspace).toBeNull();
    });

    it('should not cache workspaceId (only workspaceAlias)', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {
            workspaceId: 'some-uuid-123'
          }
        }
      };

      await makeBackendRequest(request);

      const cachedWorkspace = getWorkspaceAlias();
      expect(cachedWorkspace).toBeNull();
    });

    it('should overwrite existing cached workspace with new explicit workspace', async () => {
      // Set initial workspace
      setWorkspaceAlias('old-workspace');

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {
            workspaceAlias: 'new-workspace'
          }
        }
      };

      await makeBackendRequest(request);

      const cachedWorkspace = getWorkspaceAlias();
      expect(cachedWorkspace).toBe('new-workspace');
    });

    it('should throw error when not authenticated', async () => {
      getAccessToken.mockResolvedValue(null);

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {}
        }
      };

      await expect(makeBackendRequest(request)).rejects.toThrow('Not authenticated');
    });

    it('should skip resolveWorkspaceAlias when explicit workspace provided', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {
            workspaceAlias: 'explicit-workspace'
          }
        }
      };

      await makeBackendRequest(request);

      // Should NOT call resolveWorkspaceAlias when explicit workspace provided
      expect(resolveWorkspaceAlias).not.toHaveBeenCalled();

      // Should cache the explicit workspace
      expect(getWorkspaceAlias()).toBe('explicit-workspace');
    });

    it('should use explicit workspaceAlias even if resolveWorkspaceAlias returns different value', async () => {
      // Simulate repo config returning different workspace
      resolveWorkspaceAlias.mockResolvedValue('repo-workspace');

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {
            workspaceAlias: 'explicit-workspace'
          }
        }
      };

      await makeBackendRequest(request);

      // Should use explicit workspace, not resolved one
      const callHeaders = axios.post.mock.calls[0][2].headers;
      expect(callHeaders['X-Workspace-Alias']).toBe('explicit-workspace');

      // Should NOT call resolveWorkspaceAlias when explicit workspace provided
      expect(resolveWorkspaceAlias).not.toHaveBeenCalled();
    });

    it('should call resolveWorkspaceAlias only when no explicit workspace provided', async () => {
      resolveWorkspaceAlias.mockResolvedValue('resolved-workspace');

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {
            projectId: 'test-project'
          }
        }
      };

      await makeBackendRequest(request);

      // Should call resolveWorkspaceAlias
      expect(resolveWorkspaceAlias).toHaveBeenCalled();

      // Should use resolved workspace
      const callHeaders = axios.post.mock.calls[0][2].headers;
      expect(callHeaders['X-Workspace-Alias']).toBe('resolved-workspace');
    });

    it('should NOT cache explicit workspaceAlias when repo config exists', async () => {
      // Simulate repo config exists
      findRepoConfig.mockReturnValue('/path/to/meldoc.config.yml');
      readRepoConfig.mockReturnValue('repo-workspace');

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {
            workspaceAlias: 'explicit-workspace'
          }
        }
      };

      await makeBackendRequest(request);

      // Should use explicit workspace
      const callHeaders = axios.post.mock.calls[0][2].headers;
      expect(callHeaders['X-Workspace-Alias']).toBe('explicit-workspace');

      // Should NOT cache it (because repo config exists)
      const cachedWorkspace = getWorkspaceAlias();
      expect(cachedWorkspace).toBeNull();
    });

    it('should cache explicit workspaceAlias when NO repo config exists', async () => {
      // Simulate no repo config
      findRepoConfig.mockReturnValue(null);
      readRepoConfig.mockReturnValue(null);

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'docs_list',
        params: {
          arguments: {
            workspaceAlias: 'explicit-workspace'
          }
        }
      };

      await makeBackendRequest(request);

      // Should use explicit workspace
      const callHeaders = axios.post.mock.calls[0][2].headers;
      expect(callHeaders['X-Workspace-Alias']).toBe('explicit-workspace');

      // Should cache it (because no repo config)
      const cachedWorkspace = getWorkspaceAlias();
      expect(cachedWorkspace).toBe('explicit-workspace');
    });
  });
});
