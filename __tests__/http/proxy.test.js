/**
 * The workspace chosen locally (meldoc.config.yml, set_workspace) has to reach
 * the server, which reads it from X-Meldoc-Workspace.
 */

jest.mock('../../lib/core/workspace', () => ({ resolveWorkspaceAlias: jest.fn() }));

const http = require('http');
const { resolveWorkspaceAlias } = require('../../lib/core/workspace');
const { StreamableHTTPProxy } = require('../../lib/http/proxy');

describe('StreamableHTTPProxy workspace header', () => {
  let server;
  let seen;
  let url;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      seen = req.headers;
      res.setHeader('Content-Type', 'application/json');
      res.end('{}');
    });
    server.listen(0, '127.0.0.1', () => {
      url = `http://127.0.0.1:${server.address().port}/mcp`;
      done();
    });
  });

  afterAll((done) => { server.close(done); });

  async function send() {
    const proxy = new StreamableHTTPProxy(url, async () => 'mdc_test');
    const { response } = await proxy._doRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, '');
    response.resume();
  }

  it('sends the configured workspace', async () => {
    resolveWorkspaceAlias.mockReturnValue('acme');
    await send();
    expect(seen['x-meldoc-workspace']).toBe('acme');
  });

  it('sends no workspace header when none is configured', async () => {
    resolveWorkspaceAlias.mockReturnValue(null);
    await send();
    expect(seen['x-meldoc-workspace']).toBeUndefined();
  });
});
