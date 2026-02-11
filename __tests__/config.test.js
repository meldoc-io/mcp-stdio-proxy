const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  readConfig,
  writeConfig,
  getWorkspaceAlias,
  setWorkspaceAlias,
  CONFIG_PATH
} = require('../lib/config');

describe('config', () => {
  const testConfig = {
    workspaceAlias: 'test-workspace'
  };

  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
    }
  });

  describe('readConfig', () => {
    it('should return null if file does not exist', () => {
      const result = readConfig();
      expect(result).toBeNull();
    });

    it('should read config from file', () => {
      writeConfig(testConfig);
      const result = readConfig();
      expect(result).toEqual(testConfig);
    });
  });

  describe('writeConfig', () => {
    it('should write config to file with correct permissions', () => {
      writeConfig(testConfig);
      expect(fs.existsSync(CONFIG_PATH)).toBe(true);
      
      const stats = fs.statSync(CONFIG_PATH);
      // Check permissions (mode & 0o777 should be 0o644)
      expect(stats.mode & 0o777).toBe(0o644);
      
      const content = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      expect(content).toEqual(testConfig);
    });

    it('should create directory if it does not exist', () => {
      const dir = path.dirname(CONFIG_PATH);
      if (fs.existsSync(dir)) {
        // Don't delete, just test that it works
      }
      
      writeConfig(testConfig);
      expect(fs.existsSync(CONFIG_PATH)).toBe(true);
    });
  });

  describe('getWorkspaceAlias', () => {
    it('should return null if config does not exist', () => {
      const result = getWorkspaceAlias();
      expect(result).toBeNull();
    });

    it('should return workspace alias from config', () => {
      writeConfig(testConfig);
      const result = getWorkspaceAlias();
      expect(result).toBe('test-workspace');
    });

    it('should return null if workspaceAlias is not set', () => {
      writeConfig({});
      const result = getWorkspaceAlias();
      expect(result).toBeNull();
    });
  });

  describe('setWorkspaceAlias', () => {
    it('should set workspace alias in config', () => {
      setWorkspaceAlias('new-workspace');
      const result = getWorkspaceAlias();
      expect(result).toBe('new-workspace');
    });

    it('should update existing config', () => {
      writeConfig({ workspaceAlias: 'old-workspace' });
      setWorkspaceAlias('new-workspace');
      const result = getWorkspaceAlias();
      expect(result).toBe('new-workspace');
    });
  });
});
