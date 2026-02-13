const fs = require('fs');
const path = require('path');

// Mock console.log to capture output
let consoleOutput = [];
const originalLog = console.log;

beforeAll(() => {
  console.log = (...args) => {
    consoleOutput.push(args.join(' '));
  };
});

afterAll(() => {
  console.log = originalLog;
});

beforeEach(() => {
  consoleOutput = [];

  // Clear module cache to get fresh instance
  jest.resetModules();

  // Reset environment
  delete process.env.CI;
  delete process.env.CONTINUOUS_INTEGRATION;
});

describe('postinstall', () => {
  describe('isDevInstall', () => {
    it('should return true if .git directory exists', () => {
      // Mock fs.existsSync to simulate .git directory
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        if (filePath.endsWith('.git')) {
          return true;
        }
        return false;
      });

      const { isDevInstall } = require('../../scripts/postinstall');
      const result = isDevInstall();

      expect(result).toBe(true);

      fs.existsSync.mockRestore();
    });

    it('should return true if CI environment variable is set', () => {
      process.env.CI = 'true';

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const { isDevInstall } = require('../../scripts/postinstall');
      const result = isDevInstall();

      expect(result).toBe(true);

      fs.existsSync.mockRestore();
    });

    it('should return true if CONTINUOUS_INTEGRATION environment variable is set', () => {
      process.env.CONTINUOUS_INTEGRATION = 'true';

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const { isDevInstall } = require('../../scripts/postinstall');
      const result = isDevInstall();

      expect(result).toBe(true);

      fs.existsSync.mockRestore();
    });

    it('should return false for user installation', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const { isDevInstall } = require('../../scripts/postinstall');
      const result = isDevInstall();

      expect(result).toBe(false);

      fs.existsSync.mockRestore();
    });
  });

  describe('installClaudeDesktopSilent', () => {
    let installMock;

    beforeEach(() => {
      // Mock at module level
      installMock = jest.fn();
      jest.doMock('../../lib/install/installers', () => ({
        install: installMock
      }));
    });

    afterEach(() => {
      jest.dontMock('../../lib/install/installers');
    });

    it('should install successfully and show success message', () => {
      installMock.mockReturnValue({
        result: 'success',
        message: 'Configuration installed successfully',
        configPath: '/path/to/config'
      });

      // Clear cache to get fresh module with mock
      jest.resetModules();
      const { installClaudeDesktopSilent } = require('../../scripts/postinstall');
      consoleOutput = [];
      installClaudeDesktopSilent();

      expect(consoleOutput.some(line => line.includes('✅ Meldoc MCP installed for Claude Desktop'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('npx @meldocio/mcp-stdio-proxy auth login'))).toBe(true);
    });

    it('should handle already configured silently', () => {
      installMock.mockReturnValue({
        result: 'already_configured',
        message: 'Configuration already exists',
        configPath: '/path/to/config'
      });

      jest.resetModules();
      const { installClaudeDesktopSilent } = require('../../scripts/postinstall');
      consoleOutput = [];
      installClaudeDesktopSilent();

      // Should not output anything for already_configured
      expect(consoleOutput.length).toBe(0);
    });

    it('should handle installation error gracefully', () => {
      installMock.mockReturnValue({
        result: 'error',
        message: 'Installation failed',
        configPath: '/path/to/config'
      });

      jest.resetModules();
      const { installClaudeDesktopSilent } = require('../../scripts/postinstall');
      consoleOutput = [];
      installClaudeDesktopSilent();

      expect(consoleOutput.some(line => line.includes('⚠️  Could not auto-install'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('Run manually'))).toBe(true);
    });

    it('should handle exception gracefully', () => {
      installMock.mockImplementation(() => {
        throw new Error('Mock error');
      });

      jest.resetModules();
      const { installClaudeDesktopSilent } = require('../../scripts/postinstall');
      consoleOutput = [];

      // Should not throw
      expect(() => installClaudeDesktopSilent()).not.toThrow();

      expect(consoleOutput.some(line => line.includes('⚠️  Auto-install skipped'))).toBe(true);
    });
  });

  describe('main', () => {
    it('should skip installation in dev mode', () => {
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        if (filePath.endsWith('.git')) {
          return true;
        }
        return false;
      });

      jest.resetModules();
      const { main } = require('../../scripts/postinstall');
      consoleOutput = [];
      main();

      // Should not output anything in dev mode
      expect(consoleOutput.length).toBe(0);

      fs.existsSync.mockRestore();
    });

    it('should run installation in user mode', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const installMock = jest.fn().mockReturnValue({
        result: 'success',
        message: 'Configuration installed successfully',
        configPath: '/path/to/config'
      });

      jest.doMock('../../lib/install/installers', () => ({
        install: installMock
      }));

      jest.resetModules();
      const { main } = require('../../scripts/postinstall');
      consoleOutput = [];
      main();

      expect(consoleOutput.some(line => line.includes('✅ Meldoc MCP installed'))).toBe(true);

      fs.existsSync.mockRestore();
      jest.dontMock('../../lib/install/installers');
    });
  });
});
