/**
 * Tests for lib/install/templates.js
 */

const {
  getConfigTemplate,
  configsEqual,
  mergeClaudeDesktopConfig,
  mergeCursorConfig,
  mergeClaudeCodeConfig
} = require('../../lib/install/templates');

describe('Install Templates', () => {
  describe('getConfigTemplate', () => {
    it('should return claude-desktop config', () => {
      const config = getConfigTemplate('claude-desktop');
      expect(config).toHaveProperty('command', 'npx');
      expect(config.args).toContain('@meldocio/mcp-stdio-proxy@latest');
    });

    it('should return cursor config', () => {
      const config = getConfigTemplate('cursor');
      expect(config).toHaveProperty('command', 'npx');
      expect(config.args).toContain('@meldocio/mcp-stdio-proxy@latest');
    });

    it('should return claude-code config', () => {
      const config = getConfigTemplate('claude-code');
      expect(config).toHaveProperty('type', 'stdio');
      expect(config).toHaveProperty('command', 'npx');
      expect(config.args).toContain('@meldocio/mcp-stdio-proxy@latest');
    });

    it('should throw for unknown client', () => {
      expect(() => getConfigTemplate('unknown')).toThrow();
    });
  });

  describe('configsEqual', () => {
    it('should return true for equal objects', () => {
      const a = { foo: 'bar', nested: { key: 'value' } };
      const b = { foo: 'bar', nested: { key: 'value' } };
      expect(configsEqual(a, b)).toBe(true);
    });

    it('should return true for equal arrays', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];
      expect(configsEqual(a, b)).toBe(true);
    });

    it('should return false for different objects', () => {
      const a = { foo: 'bar' };
      const b = { foo: 'baz' };
      expect(configsEqual(a, b)).toBe(false);
    });

    it('should return false for different arrays', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 4];
      expect(configsEqual(a, b)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(configsEqual(null, null)).toBe(true);
      expect(configsEqual(undefined, undefined)).toBe(true);
      expect(configsEqual(null, undefined)).toBe(false);
    });
  });

  describe('mergeClaudeDesktopConfig', () => {
    it('should add meldoc server to empty config', () => {
      const existing = {};
      const newServer = { command: 'npx', args: ['-y', '@meldocio/mcp-stdio-proxy@latest'] };

      const { merged, changed } = mergeClaudeDesktopConfig(existing, newServer);

      expect(changed).toBe(true);
      expect(merged.mcpServers).toBeDefined();
      expect(merged.mcpServers.meldoc).toEqual(newServer);
    });

    it('should not change if meldoc already configured correctly', () => {
      const newServer = { command: 'npx', args: ['-y', '@meldocio/mcp-stdio-proxy@latest'] };
      const existing = {
        mcpServers: {
          meldoc: newServer
        }
      };

      const { merged, changed } = mergeClaudeDesktopConfig(existing, newServer);

      expect(changed).toBe(false);
      expect(merged.mcpServers.meldoc).toEqual(newServer);
    });

    it('should update if meldoc configured differently', () => {
      const existing = {
        mcpServers: {
          meldoc: { command: 'old', args: [] }
        }
      };
      const newServer = { command: 'npx', args: ['-y', '@meldocio/mcp-stdio-proxy@latest'] };

      const { merged, changed } = mergeClaudeDesktopConfig(existing, newServer);

      expect(changed).toBe(true);
      expect(merged.mcpServers.meldoc).toEqual(newServer);
    });
  });

  describe('mergeCursorConfig', () => {
    it('should add meldoc server to cursor config', () => {
      const existing = {};
      const newServer = { command: 'npx', args: ['-y', '@meldocio/mcp-stdio-proxy@latest'] };

      const { merged, changed } = mergeCursorConfig(existing, newServer);

      expect(changed).toBe(true);
      expect(merged.mcpServers.meldoc).toEqual(newServer);
    });
  });

  describe('mergeClaudeCodeConfig', () => {
    it('should add meldoc-mcp server to claude-code config', () => {
      const existing = {};
      const newServer = { type: 'stdio', command: 'npx', args: ['-y', '@meldocio/mcp-stdio-proxy@latest'] };

      const { merged, changed } = mergeClaudeCodeConfig(existing, newServer);

      expect(changed).toBe(true);
      expect(merged.mcpServers['meldoc-mcp']).toEqual(newServer);
    });

    it('should not change if meldoc-mcp already configured correctly', () => {
      const newServer = { type: 'stdio', command: 'npx', args: ['-y', '@meldocio/mcp-stdio-proxy@latest'] };
      const existing = {
        mcpServers: {
          'meldoc-mcp': newServer
        }
      };

      const { merged, changed } = mergeClaudeCodeConfig(existing, newServer);

      expect(changed).toBe(false);
    });
  });
});
