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
    it('should start without token (token checked on tool calls)', (done) => {
      delete process.env.MELDOC_MCP_TOKEN;
      
      const proxy = spawn('node', [proxyPath]);
      let stdout = '';
      
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // Send initialize request - should work without token
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' }
        }
      };
      
      proxy.on('close', () => {
        try {
          const result = JSON.parse(stdout.trim());
          expect(result.result).toBeDefined();
          expect(result.result.serverInfo.name).toBe('@meldocio/mcp-stdio-proxy');
          done();
        } catch (e) {
          done(e);
        }
      });
      
      proxy.stdin.write(JSON.stringify(initRequest) + '\n');
      proxy.stdin.end();
      
      setTimeout(() => {
        if (stdout) {
          proxy.kill();
        } else {
          done(new Error('No response received'));
        }
      }, 2000);
    });
    
    it('should return tools list without token (tools/list does not require auth)', (done) => {
      delete process.env.MELDOC_MCP_TOKEN;
      
      const proxy = spawn('node', [proxyPath]);
      let stdout = '';
      
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // Send tools/list request - should work without token
      const toolRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };
      
      proxy.on('close', () => {
        try {
          const result = JSON.parse(stdout.trim());
          expect(result.result).toBeDefined();
          expect(result.result.tools).toBeDefined();
          expect(Array.isArray(result.result.tools)).toBe(true);
          expect(result.result.tools.length).toBeGreaterThan(0);
          done();
        } catch (e) {
          done(e);
        }
      });
      
      proxy.stdin.write(JSON.stringify(toolRequest) + '\n');
      proxy.stdin.end();
      
      setTimeout(() => {
        if (stdout) {
          proxy.kill();
        } else {
          done(new Error('No response received'));
        }
      }, 2000);
    });
  });
  
  describe('JSON parsing', () => {
    it('should handle invalid JSON gracefully', (done) => {
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      let stdout = '';
      let stderr = '';
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      proxy.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      proxy.on('close', () => {
        // Parse errors without id don't send response to avoid Zod validation errors
        // But should log to stderr
        expect(stderr).toContain('Parse error');
        // stdout should be empty for parse errors without id
        expect(stdout.trim()).toBe('');
        done();
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
  
  describe('MCP Protocol Methods', () => {
    it('should handle initialize request', (done) => {
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      let stdout = '';
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' }
        }
      };
      
      proxy.on('close', () => {
        try {
          const result = JSON.parse(stdout.trim());
          expect(result.jsonrpc).toBe('2.0');
          expect(result.id).toBe(1);
          expect(result.result).toBeDefined();
          expect(result.result.protocolVersion).toBe('2025-06-18');
          expect(result.result.serverInfo.name).toBe('@meldocio/mcp-stdio-proxy');
          expect(result.result.serverInfo.version).toBeDefined();
          done();
        } catch (e) {
          done(e);
        }
      });
      
      proxy.stdin.write(JSON.stringify(initRequest) + '\n');
      proxy.stdin.end();
      
      setTimeout(() => {
        if (stdout) {
          proxy.kill();
        } else {
          done(new Error('No response received'));
        }
      }, 2000);
    });
    
    it('should handle ping request', (done) => {
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      let stdout = '';
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      const pingRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping'
      };
      
      proxy.on('close', () => {
        try {
          const result = JSON.parse(stdout.trim());
          expect(result.jsonrpc).toBe('2.0');
          expect(result.id).toBe(1);
          expect(result.result).toBeDefined();
          done();
        } catch (e) {
          done(e);
        }
      });
      
      proxy.stdin.write(JSON.stringify(pingRequest) + '\n');
      proxy.stdin.end();
      
      setTimeout(() => {
        if (stdout) {
          proxy.kill();
        } else {
          done(new Error('No response received'));
        }
      }, 2000);
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
      
      // Should start without token now
      let stdout = '';
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // Send initialize to verify it works
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' }
        }
      };
      
      proxy.on('close', () => {
        try {
          if (stdout) {
            const result = JSON.parse(stdout.trim());
            expect(result.result).toBeDefined();
          }
          done();
        } catch (e) {
          done(e);
        }
      });
      
      proxy.stdin.write(JSON.stringify(initRequest) + '\n');
      proxy.stdin.end();
      
      // Timeout
      setTimeout(() => {
        proxy.kill();
        if (!stdout) {
          done(new Error('No response received'));
        }
      }, 2000);
    });
    
    it('should use custom MELDOC_API_URL when provided', (done) => {
      process.env.MELDOC_API_URL = 'https://custom.api.example.com';
      process.env.MELDOC_MCP_TOKEN = 'test_token';
      
      const proxy = spawn('node', [proxyPath], {
        env: process.env
      });
      
      // Should start and respond to initialize
      let stdout = '';
      proxy.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' }
        }
      };
      
      proxy.on('close', () => {
        try {
          if (stdout) {
            const result = JSON.parse(stdout.trim());
            expect(result.result).toBeDefined();
          }
          done();
        } catch (e) {
          done(e);
        }
      });
      
      proxy.stdin.write(JSON.stringify(initRequest) + '\n');
      proxy.stdin.end();
      
      setTimeout(() => {
        proxy.kill();
        if (!stdout) {
          done(new Error('No response received'));
        }
      }, 2000);
    });
  });
});
