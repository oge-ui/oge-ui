import { join } from 'node:path';
import { HostTree, type Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { updateAgentsFile } from './agents-file';
import type { NgAddOptions } from './options';
import { addThemeStyle } from './theme';

const runner = new SchematicTestRunner(
  'oge',
  join(__dirname, 'collection.json'),
);

/** Runs a rule against a tree and hands back the result. */
async function run(
  rule: ReturnType<typeof updateAgentsFile>,
  tree: Tree,
): Promise<Tree> {
  return firstValueFrom(runner.callRule(rule, tree));
}

function workspaceTree(files: Record<string, string> = {}): Tree {
  const tree = new HostTree();
  tree.create(
    '/package.json',
    JSON.stringify({
      name: 'consumer',
      dependencies: { '@oge-ui/grid': '0.6.0' },
    }),
  );
  for (const [path, content] of Object.entries(files)) {
    tree.create(path, content);
  }
  return tree;
}

const ANGULAR_JSON = JSON.stringify({
  version: 1,
  projects: {
    app: {
      projectType: 'application',
      root: '',
      sourceRoot: 'src',
      architect: {
        build: {
          builder: '@angular/build:application',
          options: { styles: ['src/styles.css'] },
        },
      },
    },
  },
});

const NO_OPTIONS: NgAddOptions = {};

describe('ng-add → AGENTS.md', () => {
  it('creates the file with a usage block for the installed package', async () => {
    const tree = await run(
      updateAgentsFile('@oge-ui/grid', NO_OPTIONS),
      workspaceTree(),
    );

    const content = tree.readText('/AGENTS.md');
    expect(content).toContain('<!-- oge-ui:start -->');
    expect(content).toContain('<!-- oge-ui:end -->');
    expect(content).toContain('`<oge-grid [data]="rows" keyField="id">`');
    expect(content).toContain('node_modules/@oge-ui/grid/llms.txt');
    expect(content).toContain('https://ogeui.com/llms-full.txt');
  });

  it('is idempotent — a second run leaves exactly one block', async () => {
    const once = await run(
      updateAgentsFile('@oge-ui/grid', NO_OPTIONS),
      workspaceTree(),
    );
    const twice = await run(updateAgentsFile('@oge-ui/grid', NO_OPTIONS), once);

    const content = twice.readText('/AGENTS.md');
    expect(content.match(/<!-- oge-ui:start -->/g)).toHaveLength(1);
    expect(content.match(/<!-- oge-ui:end -->/g)).toHaveLength(1);
    expect(content).toBe(once.readText('/AGENTS.md'));
  });

  it('grows the table as more families are installed', async () => {
    const tree = new HostTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: { '@oge-ui/grid': '0.6.0', '@oge-ui/overlay': '0.6.0' },
      }),
    );

    const content = (
      await run(updateAgentsFile('@oge-ui/overlay', NO_OPTIONS), tree)
    ).readText('/AGENTS.md');

    expect(content).toContain('<oge-grid');
    expect(content).toContain('OgeToastService');
    expect(content).toContain('node_modules/@oge-ui/overlay/llms.txt');
  });

  it('lists every family when the umbrella package is installed', async () => {
    const tree = new HostTree();
    tree.create(
      '/package.json',
      JSON.stringify({ dependencies: { 'oge-ui': '0.6.0' } }),
    );

    const content = (
      await run(updateAgentsFile('oge-ui', NO_OPTIONS), tree)
    ).readText('/AGENTS.md');

    expect(content).toContain("from 'oge-ui'");
    expect(content).toContain('<oge-tree-list');
    expect(content).toContain('<oge-tab-panel>');
  });

  it('preserves content around an existing block', async () => {
    const tree = workspaceTree({
      '/AGENTS.md': [
        '# House rules',
        '',
        'Run the tests before committing.',
        '',
        '<!-- oge-ui:start -->',
        'stale content',
        '<!-- oge-ui:end -->',
        '',
        '## Deploy',
        '',
        'Push to main.',
        '',
      ].join('\n'),
    });

    const content = (
      await run(updateAgentsFile('@oge-ui/grid', NO_OPTIONS), tree)
    ).readText('/AGENTS.md');

    expect(content).toContain('# House rules');
    expect(content).toContain('Run the tests before committing.');
    expect(content).toContain('## Deploy');
    expect(content).toContain('Push to main.');
    expect(content).not.toContain('stale content');
  });

  it('appends the block when the file exists without markers', async () => {
    const tree = workspaceTree({ '/AGENTS.md': '# House rules\n' });

    const content = (
      await run(updateAgentsFile('@oge-ui/grid', NO_OPTIONS), tree)
    ).readText('/AGENTS.md');

    expect(content.startsWith('# House rules')).toBe(true);
    expect(content).toContain('<!-- oge-ui:start -->');
  });

  it('touches nothing with --skip-agents-file', async () => {
    const tree = await run(
      updateAgentsFile('@oge-ui/grid', { skipAgentsFile: true }),
      workspaceTree(),
    );

    expect(tree.exists('/AGENTS.md')).toBe(false);
  });
});

describe('ng-add → theme stylesheet', () => {
  it('does nothing by default — the light theme is built in', async () => {
    const tree = await run(
      addThemeStyle('@oge-ui/grid', NO_OPTIONS),
      workspaceTree({ '/angular.json': ANGULAR_JSON }),
    );

    expect(readStyles(tree)).toEqual(['src/styles.css']);
  });

  it('registers the requested theme first so app styles still win', async () => {
    const tree = await run(
      addThemeStyle('@oge-ui/grid', { theme: 'dark' }),
      workspaceTree({ '/angular.json': ANGULAR_JSON }),
    );

    expect(readStyles(tree)).toEqual([
      'node_modules/@oge-ui/grid/themes/dark.css',
      'src/styles.css',
    ]);
  });

  it('does not duplicate an already registered theme', async () => {
    const once = await run(
      addThemeStyle('@oge-ui/grid', { theme: 'dark' }),
      workspaceTree({ '/angular.json': ANGULAR_JSON }),
    );
    const twice = await run(
      addThemeStyle('@oge-ui/grid', { theme: 'dark' }),
      once,
    );

    expect(readStyles(twice)).toHaveLength(2);
  });

  it('no-ops without angular.json instead of throwing', async () => {
    const tree = workspaceTree();

    await expect(
      run(addThemeStyle('@oge-ui/grid', { theme: 'tailwind' }), tree),
    ).resolves.toBeDefined();
    expect(tree.exists('/angular.json')).toBe(false);
  });

  it('skips the theme when the package owning it is not installed', async () => {
    const tree = new HostTree();
    tree.create(
      '/package.json',
      JSON.stringify({ dependencies: { '@oge-ui/buttons': '0.6.0' } }),
    );
    tree.create('/angular.json', ANGULAR_JSON);

    const result = await run(
      addThemeStyle('@oge-ui/buttons', { theme: 'bootstrap' }),
      tree,
    );

    expect(readStyles(result)).toEqual(['src/styles.css']);
  });
});

function readStyles(tree: Tree): unknown {
  const workspace = JSON.parse(tree.readText('/angular.json')) as {
    projects: Record<
      string,
      { architect: Record<string, { options: { styles: unknown } }> }
    >;
  };
  return workspace.projects['app'].architect['build'].options.styles;
}
