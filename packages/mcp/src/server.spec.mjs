import { describe, expect, it } from 'vitest';
import { createOgeMcpServer } from './server.mjs';

const DOCS = {
  version: '9.9.9',
  overview: '# OGE UI',
  packages: [
    {
      npm: '@oge-ui/grid',
      label: 'Data Grid',
      summary: 'Data grid for Angular.',
      tier: 'mit',
      framework: 'angular',
      docs: '# @oge-ui/grid\n\nIntro.\n\n## Virtual scrolling\n\nSet `virtualScroll` to render only visible rows.\n\n## Grouping\n\nGroup rows by a column.',
    },
    {
      npm: '@oge-ui/react-grid',
      label: 'Data Grid (React)',
      summary: 'Data grid for React.',
      tier: 'mit',
      framework: 'react',
      docs: '# @oge-ui/react-grid\n\n## Virtual scrolling\n\nPass `virtualScroll` to OgeGrid.',
    },
    {
      npm: '@oge-ui/core',
      label: 'Core',
      summary: 'Engine.',
      tier: 'mit',
      framework: 'agnostic',
      docs: '# @oge-ui/core\n\n## Licensing\n\nogeSetLicenseKey registers a key.',
    },
  ],
};

const server = createOgeMcpServer(DOCS);
const call = (name, args) =>
  server.handle({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name, arguments: args },
  });
const textOf = (reply) => reply.result.content[0].text;

describe('createOgeMcpServer', () => {
  it('negotiates the protocol and advertises tools', () => {
    const init = server.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {} },
    });
    expect(init.result.protocolVersion).toBe('2024-11-05');
    expect(init.result.serverInfo).toEqual({
      name: 'oge-ui',
      version: '9.9.9',
    });
    expect(init.result.capabilities).toEqual({ tools: { listChanged: false } });
    const future = server.handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: { protocolVersion: '2099-01-01' },
    });
    expect(future.result.protocolVersion).toBe('2025-06-18');
    const list = server.handle({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
    expect(list.result.tools.map((t) => t.name)).toEqual([
      'list_packages',
      'get_package_docs',
      'search_docs',
      'get_setup',
    ]);
    expect(
      server.handle({ jsonrpc: '2.0', id: 4, method: 'ping' }).result,
    ).toEqual({});
  });

  it('ignores notifications and reports unknown methods and tools', () => {
    expect(
      server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    ).toBeNull();
    expect(
      server.handle({ jsonrpc: '2.0', id: 5, method: 'resources/list' }).error
        .code,
    ).toBe(-32601);
    expect(call('rm_rf', {}).error.code).toBe(-32602);
    expect(call('__proto__', {}).error.code).toBe(-32602);
    expect(server.handle({ id: 6, method: 'x' }).error.code).toBe(-32600);
  });

  it('lists packages per framework, framework-free ones always included', () => {
    const react = textOf(call('list_packages', { framework: 'react' }));
    expect(react).toContain('@oge-ui/react-grid');
    expect(react).toContain('@oge-ui/core');
    expect(react).not.toContain('- @oge-ui/grid ');
    expect(textOf(call('list_packages', {})).split('\n')).toHaveLength(3);
  });

  it('returns a package reference by npm name, short name or label', () => {
    expect(
      textOf(call('get_package_docs', { package: '@oge-ui/grid' })),
    ).toContain('## Grouping');
    expect(
      textOf(call('get_package_docs', { package: 'react-grid' })),
    ).toContain('OgeGrid');
    expect(textOf(call('get_package_docs', { package: 'core' }))).toContain(
      'ogeSetLicenseKey',
    );
    const miss = call('get_package_docs', { package: 'nope' });
    expect(miss.result.isError).toBe(true);
    expect(textOf(miss)).toContain('@oge-ui/grid');
  });

  it('searches sections, ranking full matches and headings first, filtered by framework', () => {
    const angular = textOf(
      call('search_docs', { query: 'virtual scrolling', framework: 'angular' }),
    );
    expect(angular.startsWith('## Virtual scrolling — @oge-ui/grid')).toBe(
      true,
    );
    expect(angular).not.toContain('react-grid');
    const both = textOf(
      call('search_docs', { query: 'virtual scrolling', limit: 2 }),
    );
    expect(both.split('\n---\n')).toHaveLength(2);
    expect(textOf(call('search_docs', { query: 'zzzz' }))).toContain(
      'No section matches',
    );
    expect(call('search_docs', { query: ' ' }).result.isError).toBe(true);
  });

  it('gives setup per framework', () => {
    expect(textOf(call('get_setup', { framework: 'angular' }))).toContain(
      'ng add oge-ui',
    );
    expect(textOf(call('get_setup', { framework: 'react' }))).toContain(
      '@oge-ui/react/styles.css',
    );
    expect(call('get_setup', { framework: 'vue' }).result.isError).toBe(true);
  });
});
