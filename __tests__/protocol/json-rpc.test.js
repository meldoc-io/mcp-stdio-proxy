/**
 * Tests for lib/protocol/json-rpc.js
 */

const {
  sendResponse,
  sendError,
  createResponse,
  createErrorResponse,
  validateRequest,
  isNotification,
  getMethodName
} = require('../../lib/protocol/json-rpc');

describe('JSON-RPC Utilities', () => {
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

  describe('sendResponse', () => {
    it('should send a success response', () => {
      sendResponse(1, { foo: 'bar' });

      expect(stdoutOutput).toHaveLength(1);
      const response = JSON.parse(stdoutOutput[0]);
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { foo: 'bar' }
      });
    });

    it('should not send response for notifications', () => {
      sendResponse(null, { foo: 'bar' });
      expect(stdoutOutput).toHaveLength(0);

      sendResponse(undefined, { foo: 'bar' });
      expect(stdoutOutput).toHaveLength(0);
    });
  });

  describe('sendError', () => {
    it('should send an error response', () => {
      sendError(1, -32600, 'Invalid request');

      expect(stdoutOutput).toHaveLength(1);
      const response = JSON.parse(stdoutOutput[0]);
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid request'
        }
      });
    });

    it('should not send error for notifications', () => {
      sendError(null, -32600, 'Invalid request');
      expect(stdoutOutput).toHaveLength(0);
    });
  });

  describe('createResponse', () => {
    it('should create a response object', () => {
      const response = createResponse(1, { foo: 'bar' });
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { foo: 'bar' }
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response object', () => {
      const response = createErrorResponse(1, -32600, 'Invalid request');
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid request'
        }
      });
    });
  });

  describe('validateRequest', () => {
    it('should validate a valid request', () => {
      const result = validateRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'test'
      });
      expect(result.valid).toBe(true);
    });

    it('should reject non-object requests', () => {
      const result = validateRequest(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Request must be an object');
    });

    it('should reject invalid jsonrpc version', () => {
      const result = validateRequest({
        jsonrpc: '1.0',
        id: 1,
        method: 'test'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('jsonrpc must be "2.0"');
    });

    it('should accept requests without method for notifications', () => {
      const result = validateRequest({
        jsonrpc: '2.0',
        id: null
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('isNotification', () => {
    it('should identify notifications', () => {
      expect(isNotification({ id: null })).toBe(true);
      expect(isNotification({ id: undefined })).toBe(true);
      expect(isNotification({})).toBe(true);
    });

    it('should identify non-notifications', () => {
      expect(isNotification({ id: 1 })).toBe(false);
      expect(isNotification({ id: 0 })).toBe(false);
      expect(isNotification({ id: 'test' })).toBe(false);
    });
  });

  describe('getMethodName', () => {
    it('should extract method name', () => {
      expect(getMethodName({ method: 'test' })).toBe('test');
      expect(getMethodName({ method: 'initialize' })).toBe('initialize');
    });

    it('should return null for missing method', () => {
      expect(getMethodName({})).toBe(null);
      expect(getMethodName(null)).toBe(null);
    });
  });
});
