/**
 * Tests for lib/protocol/error-codes.js
 */

const {
  JSON_RPC_ERROR_CODES,
  CUSTOM_ERROR_CODES,
  HTTP_STATUS_CODES,
  getErrorName,
  isAuthError,
  isClientError,
  isServerError,
  formatErrorMessage,
  createErrorData
} = require('../../lib/protocol/error-codes');

describe('Error Codes', () => {
  describe('Constants', () => {
    it('should export JSON-RPC error codes', () => {
      expect(JSON_RPC_ERROR_CODES.PARSE_ERROR).toBe(-32700);
      expect(JSON_RPC_ERROR_CODES.INVALID_REQUEST).toBe(-32600);
      expect(JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND).toBe(-32601);
      expect(JSON_RPC_ERROR_CODES.INVALID_PARAMS).toBe(-32602);
      expect(JSON_RPC_ERROR_CODES.INTERNAL_ERROR).toBe(-32603);
      expect(JSON_RPC_ERROR_CODES.SERVER_ERROR).toBe(-32000);
    });

    it('should export custom error codes', () => {
      expect(CUSTOM_ERROR_CODES.AUTH_REQUIRED).toBe(-32001);
      expect(CUSTOM_ERROR_CODES.NOT_FOUND).toBe(-32002);
      expect(CUSTOM_ERROR_CODES.RATE_LIMIT).toBe(-32003);
    });

    it('should export HTTP status codes', () => {
      expect(HTTP_STATUS_CODES.OK).toBe(200);
      expect(HTTP_STATUS_CODES.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS_CODES.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS_CODES.INTERNAL_ERROR).toBe(500);
    });
  });

  describe('getErrorName', () => {
    it('should return error name for known codes', () => {
      expect(getErrorName(-32700)).toBe('PARSE_ERROR');
      expect(getErrorName(-32600)).toBe('INVALID_REQUEST');
      expect(getErrorName(-32001)).toBe('AUTH_REQUIRED');
    });

    it('should return UNKNOWN_ERROR for unknown codes', () => {
      expect(getErrorName(99999)).toBe('UNKNOWN_ERROR');
    });
  });

  describe('isAuthError', () => {
    it('should identify auth errors', () => {
      expect(isAuthError(CUSTOM_ERROR_CODES.AUTH_REQUIRED)).toBe(true);
      expect(isAuthError(HTTP_STATUS_CODES.UNAUTHORIZED)).toBe(true);
      expect(isAuthError(HTTP_STATUS_CODES.FORBIDDEN)).toBe(true);
    });

    it('should not identify non-auth errors', () => {
      expect(isAuthError(JSON_RPC_ERROR_CODES.PARSE_ERROR)).toBe(false);
      expect(isAuthError(HTTP_STATUS_CODES.NOT_FOUND)).toBe(false);
    });
  });

  describe('isClientError', () => {
    it('should identify client errors (4xx)', () => {
      expect(isClientError(400)).toBe(true);
      expect(isClientError(404)).toBe(true);
      expect(isClientError(429)).toBe(true);
    });

    it('should not identify non-client errors', () => {
      expect(isClientError(200)).toBe(false);
      expect(isClientError(500)).toBe(false);
      expect(isClientError(-32600)).toBe(false);
    });
  });

  describe('isServerError', () => {
    it('should identify server errors (5xx)', () => {
      expect(isServerError(500)).toBe(true);
      expect(isServerError(502)).toBe(true);
      expect(isServerError(503)).toBe(true);
    });

    it('should not identify non-server errors', () => {
      expect(isServerError(200)).toBe(false);
      expect(isServerError(404)).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with code', () => {
      const result = formatErrorMessage('Error occurred', { code: 'TEST_ERROR' });
      expect(result).toContain('Error occurred');
      expect(result).toContain('code: TEST_ERROR');
    });

    it('should format error message with hint', () => {
      const result = formatErrorMessage('Error occurred', { hint: 'Try again' });
      expect(result).toContain('Error occurred');
      expect(result).toContain('Hint: Try again');
    });

    it('should format error message without details', () => {
      const result = formatErrorMessage('Error occurred');
      expect(result).toBe('Error occurred');
    });
  });

  describe('createErrorData', () => {
    it('should create error data with code', () => {
      const result = createErrorData('TEST_ERROR');
      expect(result).toEqual({ code: 'TEST_ERROR' });
    });

    it('should create error data with hint', () => {
      const result = createErrorData('TEST_ERROR', 'Try again');
      expect(result).toEqual({
        code: 'TEST_ERROR',
        hint: 'Try again'
      });
    });

    it('should create error data with additional fields', () => {
      const result = createErrorData('TEST_ERROR', null, { foo: 'bar' });
      expect(result).toEqual({
        code: 'TEST_ERROR',
        foo: 'bar'
      });
    });
  });
});
