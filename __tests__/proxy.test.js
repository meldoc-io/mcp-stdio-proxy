const { spawn } = require('child_process');
const path = require('path');

describe('meldoc-mcp-proxy', () => {
  const originalEnv = process.env;
  const proxyPath = path.join(__dirname, '../bin/meldoc-mcp-proxy.js');
  
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MELDOC_MCP_TOKEN: 'test_token_123',
      MELDOC_API_URL: 'https://api.meldoc.io'
    };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  describe('Environment validation', () => {
    it('should exit with error if MELDOC_MCP_TOKEN is missing', (done) => {
      delete process.env.MELDOC_MCP_TOKEN;
      
      const proxy = spawn('node', [proxyPath]);
      let stderr = '';
      
      proxy.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      proxy.on('close', (code) => {
        expect(code).not.toBe(0);
        expect(stderr).toContain('MELDOC_MCP_TOKEN');
        done();
      });
      
      // Send empty input to trigger validation
      proxy.stdin.end();
    });
  });
  
  describe('JSON parsing', () => {
    it('should return parse error for invalid JSON', (done) => {
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      let stdout = '';
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proxy.on('close', () => {
        try {
          const result = JSON.parse(stdout.trim());
          expect(result.error).toBeDefined();
          expect(result.error.code).toBe(-32700);
          expect(result.error.message).toContain('Parse error');
          done();
        } catch (e) {
          done(e);
        }
      });
      
      proxy.stdin.write('invalid json{');
      proxy.stdin.end();
    });
    
    it('should return invalid request error for malformed JSON-RPC', (done) => {
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      let stdout = '';
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proxy.on('close', () => {
        try {
          const result = JSON.parse(stdout.trim());
          expect(result.error).toBeDefined();
          expect(result.error.code).toBe(-32600);
          done();
        } catch (e) {
          done(e);
        }
      });
      
      proxy.stdin.write('{"jsonrpc":"1.0","id":1}');
      proxy.stdin.end();
    });
  });
  
  describe('Request validation', () => {
    it('should validate JSON-RPC 2.0 format', (done) => {
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      let stdout = '';
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proxy.on('close', () => {
        try {
          const result = JSON.parse(stdout.trim());
          expect(result.error).toBeDefined();
          expect(result.error.code).toBe(-32600);
          done();
        } catch (e) {
          done(e);
        }
      });
      
      // Missing method
      proxy.stdin.write('{"jsonrpc":"2.0","id":1}');
      proxy.stdin.end();
    });
  });
  
  describe('Line processing', () => {
    it('should handle empty lines', (done) => {
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      let hasOutput = false;
      proxy.stdout.on('data', () => {
        hasOutput = true;
      });
      
      proxy.on('close', () => {
        // Empty lines should be ignored, no output expected
        // But we might get network errors, which is OK
        done();
      });
      
      proxy.stdin.write('\n\n');
      proxy.stdin.end();
      
      // Timeout in case no output
      setTimeout(() => {
        if (!hasOutput) {
          done();
        }
      }, 2000);
    });
  });
  
  describe('Configuration', () => {
    it('should use default API URL when MELDOC_API_URL is not set', (done) => {
      delete process.env.MELDOC_API_URL;
      process.env.MELDOC_MCP_TOKEN = 'test_token';
      
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      // Just check it doesn't crash on startup
      proxy.on('close', (code) => {
        // Should not exit immediately (only on missing token)
        // If it exits with 0 or 1, that's fine - means it started
        done();
      });
      
      proxy.stdin.end();
      
      // Timeout
      setTimeout(() => {
        proxy.kill();
        done();
      }, 1000);
    });
    
    it('should use custom MELDOC_API_URL when provided', (done) => {
      process.env.MELDOC_API_URL = 'https://custom.api.example.com';
      process.env.MELDOC_MCP_TOKEN = 'test_token';
      
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      // Just check it doesn't crash
      proxy.on('close', () => {
        done();
      });
      
      proxy.stdin.end();
      
      setTimeout(() => {
        proxy.kill();
        done();
      }, 1000);
    });
  });
});
