/**
 * Tests for lib/install/config-manager.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  fileExists,
  readConfig,
  writeConfig,
  readConfigSafe,
  isValidConfig,
  modifyConfig
} = require('../../lib/install/config-manager');

describe('Config Manager', () => {
  let testDir;
  let testFile;

  beforeEach(() => {
    // Create a temporary directory for tests
    testDir = path.join(os.tmpdir(), `meldoc-test-${Date.now()}`);
    testFile = path.join(testDir, 'test-config.json');
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    try {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('fileExists', () => {
    it('should return true for existing files', () => {
      fs.writeFileSync(testFile, '{}');
      expect(fileExists(testFile)).toBe(true);
    });

    it('should return false for non-existing files', () => {
      expect(fileExists(testFile)).toBe(false);
    });
  });

  describe('readConfig', () => {
    it('should read valid JSON config', () => {
      const config = { foo: 'bar' };
      fs.writeFileSync(testFile, JSON.stringify(config));

      const result = readConfig(testFile);
      expect(result).toEqual(config);
    });

    it('should return null for non-existing file', () => {
      const result = readConfig(testFile);
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      fs.writeFileSync(testFile, 'invalid json');
      const result = readConfig(testFile);
      expect(result).toBeNull();
    });
  });

  describe('writeConfig', () => {
    it('should write config to file', () => {
      const config = { foo: 'bar', nested: { key: 'value' } };
      writeConfig(testFile, config);

      expect(fs.existsSync(testFile)).toBe(true);
      const content = fs.readFileSync(testFile, 'utf8');
      expect(JSON.parse(content)).toEqual(config);
    });

    it('should create parent directories if needed', () => {
      const deepFile = path.join(testDir, 'deep', 'nested', 'config.json');
      const config = { test: true };

      writeConfig(deepFile, config);

      expect(fs.existsSync(deepFile)).toBe(true);
      const content = fs.readFileSync(deepFile, 'utf8');
      expect(JSON.parse(content)).toEqual(config);

      // Clean up
      fs.unlinkSync(deepFile);
      fs.rmdirSync(path.dirname(deepFile));
      fs.rmdirSync(path.dirname(path.dirname(deepFile)));
    });
  });

  describe('readConfigSafe', () => {
    it('should return config for existing file', () => {
      const config = { foo: 'bar' };
      fs.writeFileSync(testFile, JSON.stringify(config));

      const result = readConfigSafe(testFile);
      expect(result).toEqual(config);
    });

    it('should return empty object for non-existing file', () => {
      const result = readConfigSafe(testFile);
      expect(result).toEqual({});
    });

    it('should return empty object for invalid JSON', () => {
      fs.writeFileSync(testFile, 'invalid');
      const result = readConfigSafe(testFile);
      expect(result).toEqual({});
    });
  });

  describe('isValidConfig', () => {
    it('should validate valid configs', () => {
      expect(isValidConfig({})).toBe(true);
      expect(isValidConfig({ foo: 'bar' })).toBe(true);
    });

    it('should reject invalid configs', () => {
      expect(isValidConfig(null)).toBe(false);
      expect(isValidConfig(undefined)).toBe(false);
      expect(isValidConfig([])).toBe(false);
      expect(isValidConfig('string')).toBe(false);
      expect(isValidConfig(123)).toBe(false);
    });
  });

  describe('modifyConfig', () => {
    it('should modify existing config', () => {
      const initial = { foo: 'bar' };
      fs.writeFileSync(testFile, JSON.stringify(initial));

      const result = modifyConfig(testFile, (config) => {
        return { ...config, baz: 'qux' };
      });

      expect(result.success).toBe(true);
      const updated = JSON.parse(fs.readFileSync(testFile, 'utf8'));
      expect(updated).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should create new config if file does not exist', () => {
      const result = modifyConfig(testFile, () => {
        return { test: true };
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(testFile)).toBe(true);
      const config = JSON.parse(fs.readFileSync(testFile, 'utf8'));
      expect(config).toEqual({ test: true });
    });

    it('should handle errors gracefully', () => {
      const result = modifyConfig(testFile, () => {
        return 'invalid'; // Not an object
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a valid object');
    });
  });
});
