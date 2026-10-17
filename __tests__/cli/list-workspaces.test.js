/**
 * `config list-workspaces` must call the tool by its server name and read the
 * workspaces from MCP content, the way api.meldoc.io answers a tools/call.
 */

jest.mock('axios');
jest.mock('../../lib/core/auth', () => ({
  getAccessToken: jest.fn().mockResolvedValue({ token: 'mdc_test' }),
  getAuthStatus: jest.fn()
}));

const axios = require('axios');
const { handleConfigListWorkspaces } = require('../../lib/cli/commands');

describe('config list-workspaces', () => {
  let output;
  let exit;

  beforeEach(() => {
    output = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => output.push(args.join(' ')));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('lists workspaces from the tool result content', async () => {
    axios.post.mockResolvedValue({
      data: {
        result: {
          content: [{ type: 'text', text: JSON.stringify({ workspaces: [{ alias: 'acme', name: 'Acme', role: 'admin' }] }) }]
        }
      }
    });

    await handleConfigListWorkspaces();

    expect(exit.mock.calls[0][0]).toBe(0);
    expect(axios.post.mock.calls[0][1].params.name).toBe('list_workspaces');
    expect(output.join('\n')).toContain('acme');
  });

  it('exits 1 when the tool reports an error', async () => {
    axios.post.mockResolvedValue({
      data: { result: { isError: true, content: [{ type: 'text', text: 'boom' }] } }
    });

    await handleConfigListWorkspaces();

    expect(exit.mock.calls[0][0]).toBe(1);
  });
});
