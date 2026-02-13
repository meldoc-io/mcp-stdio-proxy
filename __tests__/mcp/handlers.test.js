/**
 * Tests for lib/mcp/handlers.js
 */

const {
  handleInitialize,
  handlePing,
  handleResourcesList,
  handleToolsList,
  isLocalMethod,
  handleLocalMethod
} = require('../../lib/mcp/handlers');

describe('MCP Handlers', () => {
  let originalStdoutWrite;
  let stdoutOutput;

  beforeEach(() => {
    stdoutOutput = [];
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = jest.fn((data) => {
      stdoutOutput.push(data);
      return true;
    });
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
  });

  describe('handleInitialize', () => {
    it('should return initialize response', () => {
      const request = { id: 1, method: 'initialize' };
      handleInitialize(request);

      expect(stdoutOutput).toHaveLength(1);
      const response = JSON.parse(stdoutOutput[0]);

      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.result.protocolVersion).toBe('2025-06-18');
      expect(response.result.capabilities).toBeDefined();
      expect(response.result.serverInfo).toBeDefined();
      expect(response.result.serverInfo.name).toBe('@meldocio/mcp-stdio-proxy');
    });
  });

  describe('handlePing', () => {
    it('should return empty response', () => {
      const request = { id: 2, method: 'ping' };
      handlePing(request);

      expect(stdoutOutput).toHaveLength(1);
      const response = JSON.parse(stdoutOutput[0]);

      expect(response.id).toBe(2);
      expect(response.result).toEqual({});
    });
  });

  describe('handleResourcesList', () => {
    it('should return empty resources list', () => {
      const request = { id: 3, method: 'resources/list' };
      handleResourcesList(request);

      expect(stdoutOutput).toHaveLength(1);
      const response = JSON.parse(stdoutOutput[0]);

      expect(response.id).toBe(3);
      expect(response.result.resources).toEqual([]);
    });
  });

  describe('handleToolsList', () => {
    it('should return list of tools', () => {
      const request = { id: 4, method: 'tools/list' };
      handleToolsList(request);

      expect(stdoutOutput).toHaveLength(1);
      const response = JSON.parse(stdoutOutput[0]);

      expect(response.id).toBe(4);
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);
      expect(response.result.tools.length).toBeGreaterThan(0);

      // Check that each tool has required fields
      response.result.tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('isLocalMethod', () => {
    it('should identify local methods', () => {
      expect(isLocalMethod('initialize')).toBe(true);
      expect(isLocalMethod('initialized')).toBe(true);
      expect(isLocalMethod('notifications/initialized')).toBe(true);
      expect(isLocalMethod('ping')).toBe(true);
      expect(isLocalMethod('resources/list')).toBe(true);
      expect(isLocalMethod('tools/list')).toBe(true);
    });

    it('should not identify non-local methods', () => {
      expect(isLocalMethod('tools/call')).toBe(false);
      expect(isLocalMethod('unknown/method')).toBe(false);
    });
  });

  describe('handleLocalMethod', () => {
    it('should handle initialize method', () => {
      const request = { id: 1, method: 'initialize' };
      const handled = handleLocalMethod(request);

      expect(handled).toBe(true);
      expect(stdoutOutput).toHaveLength(1);
    });

    it('should handle notifications without sending response', () => {
      const request = { method: 'initialized' };
      const handled = handleLocalMethod(request);

      expect(handled).toBe(true);
      expect(stdoutOutput).toHaveLength(0); // No response for notifications
    });

    it('should return false for non-local methods', () => {
      const request = { id: 1, method: 'unknown/method' };
      const handled = handleLocalMethod(request);

      expect(handled).toBe(false);
      expect(stdoutOutput).toHaveLength(0);
    });
  });
});
