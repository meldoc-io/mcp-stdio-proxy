const axios = require('axios');
const {
  getAccessToken,
  refreshToken,
  isAuthenticated,
  getAuthStatus
} = require('../lib/auth');
const { writeCredentials, deleteCredentials, readCredentials } = require('../lib/credentials');

// Mock axios
jest.mock('axios');

describe('auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    deleteCredentials();
    delete process.env.MELDOC_ACCESS_TOKEN;
    delete process.env.MELDOC_MCP_TOKEN;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    deleteCredentials();
  });

  describe('getAccessToken', () => {
    it('should return token from MELDOC_ACCESS_TOKEN env var (priority 1)', async () => {
      process.env.MELDOC_ACCESS_TOKEN = 'env-token';
      const result = await getAccessToken();
      expect(result).toEqual({
        token: 'env-token',
        type: 'env'
      });
    });

    it('should return token from credentials.json (priority 2)', async () => {
      const credentials = {
        type: 'user_session',
        apiBaseUrl: 'https://api.meldoc.io',
        user: { id: 'test', email: 'test@example.com' },
        tokens: {
          accessToken: 'user-token',
          accessExpiresAt: new Date(Date.now() + 3600000).toISOString(),
          refreshToken: 'refresh-token'
        },
        updatedAt: new Date().toISOString()
      };
      writeCredentials(credentials);
      
      const result = await getAccessToken();
      expect(result).toEqual({
        token: 'user-token',
        type: 'user_session'
      });
    });

    it('should return token from MELDOC_MCP_TOKEN env var (priority 3)', async () => {
      process.env.MELDOC_MCP_TOKEN = 'integration-token';
      const result = await getAccessToken();
      expect(result).toEqual({
        token: 'integration-token',
        type: 'integration'
      });
    });

    it('should return null if no token found', async () => {
      const result = await getAccessToken();
      expect(result).toBeNull();
    });

    it('should refresh token if expired or expiring soon', async () => {
      const credentials = {
        type: 'user_session',
        apiBaseUrl: 'http://localhost:4200',
        user: { id: 'test', email: 'test@example.com' },
        tokens: {
          accessToken: 'old-token',
          accessExpiresAt: new Date(Date.now() - 1000).toISOString(), // expired
          refreshToken: 'refresh-token'
        },
        updatedAt: new Date().toISOString()
      };
      writeCredentials(credentials);

      // Mock refresh response
      axios.post.mockResolvedValue({
        data: {
          accessToken: 'new-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          refreshToken: 'new-refresh-token'
        }
      });

      const result = await getAccessToken();
      expect(result).toEqual({
        token: 'new-token',
        type: 'user_session'
      });
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        { refreshToken: 'refresh-token' },
        expect.any(Object)
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token and update credentials', async () => {
      const credentials = {
        type: 'user_session',
        apiBaseUrl: 'http://localhost:4200',
        user: { id: 'test', email: 'test@example.com' },
        tokens: {
          accessToken: 'old-token',
          accessExpiresAt: new Date().toISOString(),
          refreshToken: 'refresh-token'
        },
        updatedAt: new Date().toISOString()
      };
      writeCredentials(credentials);

      axios.post.mockResolvedValue({
        data: {
          accessToken: 'new-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          refreshToken: 'new-refresh-token'
        }
      });

      const result = await refreshToken(credentials);
      expect(result).toBeDefined();
      expect(result.tokens.accessToken).toBe('new-token');
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:4200/api/auth/refresh',
        { refreshToken: 'refresh-token' },
        expect.any(Object)
      );
    });

    it('should delete credentials if refresh fails', async () => {
      const credentials = {
        type: 'user_session',
        apiBaseUrl: 'http://localhost:4200',
        tokens: {
          refreshToken: 'refresh-token'
        }
      };
      writeCredentials(credentials);

      axios.post.mockRejectedValue(new Error('Refresh failed'));

      const result = await refreshToken(credentials);
      expect(result).toBeNull();
      const creds = readCredentials();
      expect(creds).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if token exists', async () => {
      process.env.MELDOC_ACCESS_TOKEN = 'test-token';
      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false if no token', async () => {
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('getAuthStatus', () => {
    it('should return status for user session', async () => {
      const credentials = {
        type: 'user_session',
        apiBaseUrl: 'https://api.meldoc.io',
        user: { id: 'test', email: 'test@example.com' },
        tokens: {
          accessToken: 'token',
          accessExpiresAt: new Date(Date.now() + 3600000).toISOString(),
          refreshToken: 'refresh'
        },
        updatedAt: new Date().toISOString()
      };
      writeCredentials(credentials);

      const result = await getAuthStatus();
      expect(result).toEqual({
        authenticated: true,
        type: 'user_session',
        user: credentials.user,
        expiresAt: credentials.tokens.accessExpiresAt
      });
    });

    it('should return null if not authenticated', async () => {
      const result = await getAuthStatus();
      expect(result).toBeNull();
    });
  });
});
