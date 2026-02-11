const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  readCredentials,
  writeCredentials,
  deleteCredentials,
  isTokenExpired,
  isTokenExpiredOrExpiringSoon,
  CREDENTIALS_PATH
} = require('../lib/credentials');

describe('credentials', () => {
  const testCredentials = {
    type: 'user_session',
    apiBaseUrl: 'https://api.meldoc.io',
    user: {
      id: 'test-uuid',
      email: 'test@example.com'
    },
    tokens: {
      accessToken: 'test-access-token',
      accessExpiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      refreshToken: 'test-refresh-token'
    },
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(CREDENTIALS_PATH)) {
      fs.unlinkSync(CREDENTIALS_PATH);
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(CREDENTIALS_PATH)) {
      fs.unlinkSync(CREDENTIALS_PATH);
    }
  });

  describe('readCredentials', () => {
    it('should return null if file does not exist', () => {
      const result = readCredentials();
      expect(result).toBeNull();
    });

    it('should read credentials from file', () => {
      writeCredentials(testCredentials);
      const result = readCredentials();
      expect(result).toEqual(testCredentials);
    });

    it('should return null on invalid JSON', () => {
      const dir = path.dirname(CREDENTIALS_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
      fs.writeFileSync(CREDENTIALS_PATH, 'invalid json', { mode: 0o600 });
      const result = readCredentials();
      expect(result).toBeNull();
    });
  });

  describe('writeCredentials', () => {
    it('should write credentials to file with correct permissions', () => {
      writeCredentials(testCredentials);
      expect(fs.existsSync(CREDENTIALS_PATH)).toBe(true);
      
      const stats = fs.statSync(CREDENTIALS_PATH);
      // Check permissions (mode & 0o777 should be 0o600)
      expect(stats.mode & 0o777).toBe(0o600);
      
      const content = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
      expect(content).toEqual(testCredentials);
    });

    it('should create directory if it does not exist', () => {
      const dir = path.dirname(CREDENTIALS_PATH);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
      }
      
      writeCredentials(testCredentials);
      expect(fs.existsSync(CREDENTIALS_PATH)).toBe(true);
    });
  });

  describe('deleteCredentials', () => {
    it('should delete credentials file', () => {
      writeCredentials(testCredentials);
      expect(fs.existsSync(CREDENTIALS_PATH)).toBe(true);
      
      deleteCredentials();
      expect(fs.existsSync(CREDENTIALS_PATH)).toBe(false);
    });

    it('should not throw if file does not exist', () => {
      expect(() => deleteCredentials()).not.toThrow();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true if credentials are null', () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it('should return true if token is expired', () => {
      const expired = {
        ...testCredentials,
        tokens: {
          ...testCredentials.tokens,
          accessExpiresAt: new Date(Date.now() - 1000).toISOString()
        }
      };
      expect(isTokenExpired(expired)).toBe(true);
    });

    it('should return false if token is not expired', () => {
      expect(isTokenExpired(testCredentials)).toBe(false);
    });

    it('should return true if accessExpiresAt is missing', () => {
      const noExpiry = {
        ...testCredentials,
        tokens: {
          accessToken: 'test',
          refreshToken: 'test'
        }
      };
      expect(isTokenExpired(noExpiry)).toBe(true);
    });
  });

  describe('isTokenExpiredOrExpiringSoon', () => {
    it('should return true if token expires in less than 5 minutes', () => {
      const expiringSoon = {
        ...testCredentials,
        tokens: {
          ...testCredentials.tokens,
          accessExpiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString() // 4 minutes
        }
      };
      expect(isTokenExpiredOrExpiringSoon(expiringSoon)).toBe(true);
    });

    it('should return false if token expires in more than 5 minutes', () => {
      expect(isTokenExpiredOrExpiringSoon(testCredentials)).toBe(false);
    });

    it('should return true if token is expired', () => {
      const expired = {
        ...testCredentials,
        tokens: {
          ...testCredentials.tokens,
          accessExpiresAt: new Date(Date.now() - 1000).toISOString()
        }
      };
      expect(isTokenExpiredOrExpiringSoon(expired)).toBe(true);
    });
  });
});
