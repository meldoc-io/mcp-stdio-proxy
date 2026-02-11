const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  findRepoConfig,
  readRepoConfig,
  resolveWorkspaceAlias
} = require('../lib/workspace');
const { writeConfig, deleteCredentials } = require('../lib/config');

// Mock js-yaml
jest.mock('js-yaml', () => ({
  load: jest.fn((content) => {
    if (content.includes('workspace: "repo-workspace"')) {
      return { context: { workspace: 'repo-workspace' } };
    }
    return {};
  })
}));

describe('workspace', () => {
  const testDir = path.join(os.tmpdir(), 'meldoc-test-' + Date.now());
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    process.chdir(testDir);
  });

  afterEach(() => {
    // Clean up
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    // Clean config
    const { CONFIG_PATH } = require('../lib/config');
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
    }
  });

  describe('findRepoConfig', () => {
    it('should return null if .meldoc.yml does not exist', () => {
      const result = findRepoConfig();
      expect(result).toBeNull();
    });

    it('should find .meldoc.yml in current directory', () => {
      const configPath = path.join(testDir, '.meldoc.yml');
      fs.writeFileSync(configPath, 'context:\n  workspace: "test"');
      
      const result = findRepoConfig();
      expect(result).toBeTruthy();
      expect(result).toContain('.meldoc.yml');
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should find .meldoc.yml in parent directory', () => {
      const subDir = path.join(testDir, 'subdir');
      fs.mkdirSync(subDir, { recursive: true });
      const configPath = path.join(testDir, '.meldoc.yml');
      fs.writeFileSync(configPath, 'context:\n  workspace: "test"');
      
      process.chdir(subDir);
      const result = findRepoConfig();
      expect(result).toBeTruthy();
      expect(result).toContain('.meldoc.yml');
      expect(fs.existsSync(result)).toBe(true);
    });
  });

  describe('readRepoConfig', () => {
    it('should read workspace from .meldoc.yml', () => {
      const configPath = path.join(testDir, '.meldoc.yml');
      fs.writeFileSync(configPath, 'context:\n  workspace: "repo-workspace"');
      
      const result = readRepoConfig(configPath);
      expect(result).toBe('repo-workspace');
    });

    it('should return null if workspace not found', () => {
      const configPath = path.join(testDir, '.meldoc.yml');
      fs.writeFileSync(configPath, 'context: {}');
      
      const result = readRepoConfig(configPath);
      expect(result).toBeNull();
    });
  });

  describe('resolveWorkspaceAlias', () => {
    it('should return workspace from repo config if useRepoConfig is true', () => {
      const configPath = path.join(testDir, '.meldoc.yml');
      fs.writeFileSync(configPath, 'context:\n  workspace: "repo-workspace"');
      
      const result = resolveWorkspaceAlias(true);
      expect(result).toBe('repo-workspace');
    });

    it('should return workspace from global config if repo config not found', () => {
      writeConfig({ workspaceAlias: 'global-workspace' });
      
      const result = resolveWorkspaceAlias(true);
      expect(result).toBe('global-workspace');
    });

    it('should return null if no workspace found', () => {
      const result = resolveWorkspaceAlias(true);
      expect(result).toBeNull();
    });

    it('should skip repo config if useRepoConfig is false', () => {
      const configPath = path.join(testDir, '.meldoc.yml');
      fs.writeFileSync(configPath, 'context:\n  workspace: "repo-workspace"');
      writeConfig({ workspaceAlias: 'global-workspace' });
      
      const result = resolveWorkspaceAlias(false);
      expect(result).toBe('global-workspace');
    });
  });
});
