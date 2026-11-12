import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import {
  OGE_FIGMA_MODES,
  ogeFigmaToCss,
  ogeTokensToFigma,
  type OgeDtcgTokens,
  type OgeFigmaExportedVariable,
} from './convert';

const root = path.resolve(__dirname, '../../..');
const tokens = JSON.parse(
  readFileSync(path.join(root, 'packages/core/tokens.json'), 'utf8'),
) as OgeDtcgTokens;

describe('ogeTokensToFigma', () => {
  const collection = ogeTokensToFigma(tokens);
  const byName = new Map(collection.variables.map((v) => [v.name, v]));

  it('builds one collection with three modes and every token', () => {
    expect(collection.name).toBe('OGE UI');
    expect(collection.modes).toEqual(['Light', 'Dark', 'High contrast']);
    const count = Object.keys(tokens.light).filter(
      (k) => !k.startsWith('$'),
    ).length;
    expect(collection.variables).toHaveLength(count);
    expect(new Set(collection.variables.map((v) => v.name)).size).toBe(count);
  });

  it('converts colours, sizes, motion, fonts and shadows', () => {
    const bg = byName.get('color/bg')!;
    expect(bg.type).toBe('COLOR');
    expect(bg.values.Light).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(bg.cssVariable).toBe('--oge-bg');
    expect(bg.values.Dark).not.toEqual(bg.values.Light);
    const padding = byName.get('size/cell-padding-x')!;
    expect(padding).toMatchObject({ type: 'FLOAT', scopes: ['GAP'] });
    expect(padding.values.Light).toBe(14);
    expect(byName.get('motion/motion-duration-fast')?.values.Light).toBe(120);
    expect(byName.get('motion/motion-easing-standard')?.values.Light).toBe(
      'cubic-bezier(0.2, 0, 0, 1)',
    );
    expect(String(byName.get('font/font-mono')?.values.Light)).toContain(
      'ui-monospace',
    );
    expect(byName.get('font/font-mono')?.scopes).toEqual(['FONT_FAMILY']);
    expect(String(byName.get('shadow/shadow-popup')?.values.Light)).toMatch(
      /^0px 12px \d+px -?\d+px rgb\(15 23 42 \/ 0\.18\)/,
    );
    expect(byName.get('number/z-popup')?.values.Light).toBe(1000);
    const soft = byName.get('color/accent-soft')!;
    expect((soft.values.Light as { a: number }).a).toBe(0.08);
    expect(soft.description).toContain('color-mix(');
  });

  it('keeps aliases as aliases in every mode', () => {
    const muted = byName.get('color/input-muted')!;
    for (const mode of OGE_FIGMA_MODES) {
      expect(muted.values[mode]).toMatchObject({ type: 'VARIABLE_ALIAS' });
    }
    expect(muted.values.Light).toEqual({
      type: 'VARIABLE_ALIAS',
      name: 'color/header-color',
    });
  });

  it('refuses an alias that points at no token', () => {
    expect(() =>
      ogeTokensToFigma({
        light: { ref: { $type: 'color', $value: '{light.missing}' } },
        dark: {},
        'high-contrast': {},
      } as unknown as OgeDtcgTokens),
    ).toThrow('Token alias {light.missing} points at no token');
  });

  it('falls back to the light token when a mode lacks one, and to plain text for unknown types', () => {
    const minimal = ogeTokensToFigma({
      light: {
        $description: 'x',
        a: { $type: 'color', $value: { components: [0, 0, 0] } },
        weird: { $type: 'gradient', $value: 'linear' },
        size: { $type: 'dimension', $value: '{light.gap}' },
        gap: { $type: 'dimension', $value: { value: 4, unit: 'px' } },
      },
      dark: {},
      'high-contrast': {},
    } as unknown as OgeDtcgTokens);
    const get = (n: string) => minimal.variables.find((v) => v.name === n)!;
    expect(get('color/a').values.Dark).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(get('other/weird').values.Light).toBe('linear');
    expect(get('size/size').values.Light).toEqual({
      type: 'VARIABLE_ALIAS',
      name: 'size/gap',
    });
  });
});

describe('ogeFigmaToCss', () => {
  const collection = ogeTokensToFigma(tokens);
  const exported: OgeFigmaExportedVariable[] = collection.variables.map(
    (v) => ({
      name: v.name,
      type: v.type,
      cssVariable: v.cssVariable,
      values: v.values,
    }),
  );

  it('writes every mode under its selector', () => {
    const css = ogeFigmaToCss(exported);
    expect(css).toContain(':root {\n  --oge-bg: #ffffff;');
    expect(css).toContain(".dark, [data-theme='dark'] {");
    expect(css).toContain("[data-theme='high-contrast'] {");
    expect(css).toContain('--oge-cell-padding-x: 14px;');
    expect(css).toContain('--oge-motion-duration-fast: 120ms;');
    expect(css).toContain('--oge-input-muted: var(--oge-header-color);');
    expect(css).toMatch(/--oge-accent-soft: rgb\(\d+ \d+ \d+ \/ 0\.08\);/);
  });

  it('writes only what a designer changed against the shipped collection', () => {
    const edited = exported.map((v) =>
      v.name === 'color/accent'
        ? { ...v, values: { ...v.values, Light: { r: 1, g: 0, b: 0, a: 1 } } }
        : v.name === 'size/radius'
          ? { ...v, values: { ...v.values, Dark: 10 } }
          : v,
    );
    const css = ogeFigmaToCss(edited, {
      baseline: collection,
      selectors: { Dark: '.night' },
    });
    expect(css).toBe(
      "/* OGE UI theme exported from Figma — load after the suite's styles */\n" +
        ':root {\n  --oge-accent: #ff0000;\n}\n\n.night {\n  --oge-radius: 10px;\n}\n',
    );
    expect(ogeFigmaToCss(exported, { baseline: collection })).toBe('');
  });

  it('handles booleans, missing code syntax and unknown aliases', () => {
    const css = ogeFigmaToCss([
      {
        name: 'flag',
        type: 'BOOLEAN',
        cssVariable: '--x-flag',
        values: { Light: true },
      },
      { name: 'orphan', type: 'FLOAT', values: { Light: 3 } },
      {
        name: 'link',
        type: 'COLOR',
        cssVariable: '--x-link',
        values: { Light: { type: 'VARIABLE_ALIAS', name: 'nowhere' } },
      },
      {
        name: 'text',
        type: 'STRING',
        cssVariable: '--x-text',
        values: { Light: 'bold' },
      },
    ]);
    expect(css).toContain('--x-flag: 1;');
    expect(css).toContain('--x-text: bold;');
    expect(css).not.toContain('orphan');
    expect(css).not.toContain('--x-link');
  });
});

describe('the plugin', () => {
  it('ships an up-to-date zip', () => {
    const result = spawnSync(
      process.execPath,
      ['tools/figma-tokens/build.mjs', '--check'],
      {
        cwd: root,
        encoding: 'utf8',
      },
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('imports the collection and exports it back through the Figma API', async () => {
    spawnSync(process.execPath, ['tools/figma-tokens/build.mjs'], {
      cwd: root,
    });
    const code = readFileSync(
      path.join(root, 'dist/figma-plugin/code.js'),
      'utf8',
    );
    // a small stand-in for figma.variables
    const variables: Record<string, unknown>[] = [];
    const collections: Record<string, unknown>[] = [];
    let ids = 0;
    const posted: Record<string, unknown>[] = [];
    let handler: (m: unknown) => Promise<void> = async () => undefined;
    const figma = {
      showUI: vi.fn(),
      notify: vi.fn(),
      closePlugin: vi.fn(),
      ui: {
        postMessage: (m: Record<string, unknown>) => posted.push(m),
        set onmessage(fn: (m: unknown) => Promise<void>) {
          handler = fn;
        },
      },
      variables: {
        getLocalVariableCollectionsAsync: async () => collections,
        getLocalVariablesAsync: async () => variables,
        createVariableCollection: (name: string) => {
          const c = {
            id: `c${ids++}`,
            name,
            modes: [{ modeId: 'm0', name: 'Mode 1' }],
            renameMode(id: string, n: string) {
              (
                this.modes.find((m) => m.modeId === id) as { name: string }
              ).name = n;
            },
            addMode(n: string) {
              this.modes.push({ modeId: `m${this.modes.length}`, name: n });
            },
          };
          collections.push(c);
          return c;
        },
        createVariable: (name: string, c: { id: string }, type: string) => {
          const v: Record<string, unknown> & {
            valuesByMode: Record<string, unknown>;
          } = {
            id: `v${ids++}`,
            name,
            variableCollectionId: c.id,
            resolvedType: type,
            valuesByMode: {},
            codeSyntax: {} as Record<string, string>,
            setVariableCodeSyntax(platform: string, value: string) {
              (this.codeSyntax as Record<string, string>)[platform] = value;
            },
            setValueForMode(mode: string, value: unknown) {
              this.valuesByMode[mode] = value;
            },
            remove() {
              variables.splice(variables.indexOf(this), 1);
            },
          };
          variables.push(v);
          return v;
        },
        createVariableAlias: (v: { id: string }) => ({
          type: 'VARIABLE_ALIAS',
          id: v.id,
        }),
      },
    };
    runInNewContext(code, { figma, __html__: '<html></html>', console });
    await handler({ type: 'import' });
    expect(posted.at(-1)).toEqual({ type: 'imported', count: 201 });
    expect(
      (collections[0] as { modes: { name: string }[] }).modes.map(
        (m) => m.name,
      ),
    ).toEqual(['Light', 'Dark', 'High contrast']);
    const bg = variables.find((v) => v['name'] === 'color/bg')!;
    expect((bg['codeSyntax'] as Record<string, string>)['WEB']).toBe(
      'var(--oge-bg)',
    );
    // a second import updates in place, and a changed type is recreated
    bg['resolvedType'] = 'STRING';
    await handler({ type: 'import' });
    expect(variables.filter((v) => v['name'] === 'color/bg')).toHaveLength(1);
    expect(variables).toHaveLength(201);
    // the designer edits the accent; the export writes only that
    const accent = variables.find((v) => v['name'] === 'color/accent') as {
      valuesByMode: Record<string, unknown>;
    };
    accent.valuesByMode['m0'] = { r: 1, g: 0, b: 0, a: 1 };
    await handler({ type: 'export', changedOnly: true });
    expect(posted.at(-1)).toMatchObject({
      type: 'exported',
      css: expect.stringContaining('--oge-accent: #ff0000;'),
    });
    await handler({ type: 'export', changedOnly: false });
    expect(String((posted.at(-1) as { css: string }).css)).toContain(
      '--oge-bg: #ffffff;',
    );
    await handler({ type: 'import', tokens });
    await handler({ type: 'close' });
    expect(figma.closePlugin).toHaveBeenCalled();
    figma.variables.getLocalVariablesAsync = async () => {
      throw new Error('boom');
    };
    await handler({ type: 'import' });
    expect(posted.at(-1)).toEqual({ type: 'error', message: 'Error: boom' });
    collections.length = 0;
    figma.variables.getLocalVariablesAsync = async () => variables;
    await handler({ type: 'export', changedOnly: false });
    expect(posted.at(-1)).toMatchObject({ type: 'exported', count: 0 });
  });
});
