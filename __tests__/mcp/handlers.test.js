/**
 * Tests for lib/mcp/handlers.js
 */

const {
  handlePing,
  isNotification
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

  describe('isNotification', () => {
    it('should identify notification methods', () => {
      expect(isNotification('initialized')).toBe(true);
      expect(isNotification('notifications/initialized')).toBe(true);
      expect(isNotification('notifications/cancelled')).toBe(true);
      expect(isNotification('notifications/progress')).toBe(true);
    });

    it('should not identify non-notification methods', () => {
      expect(isNotification('initialize')).toBe(false);
      expect(isNotification('ping')).toBe(false);
      expect(isNotification('tools/list')).toBe(false);
      expect(isNotification('tools/call')).toBe(false);
      expect(isNotification('unknown/method')).toBe(false);
    });
  });
});
