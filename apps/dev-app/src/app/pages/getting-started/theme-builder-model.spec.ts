import { describe, expect, it } from 'vitest';
import presetFile from './generated/theme-presets.json';
import {
  INITIAL_STATE,
  KEY_COLORS,
  changedTokens,
  contrastChecks,
  contrastRatio,
  decodeState,
  encodeState,
  exportJson,
  exportRootCss,
  exportScopedCss,
  normalizeHex,
  resolveTokens,
  themeSlug,
  type BuilderState,
  type PresetFile,
} from './theme-builder-model';

const PRESETS = presetFile as unknown as PresetFile;

describe('theme presets (generated)', () => {
  it('has the five built-in themes, each with every key colour as hex', () => {
    expect(PRESETS.presets.map((preset) => preset.id)).toEqual([
      'default',
      'dark',
      'high-contrast',
      'tailwind',
      'bootstrap',
    ]);
    for (const preset of PRESETS.presets) {
      for (const color of KEY_COLORS) {
        expect(
          normalizeHex(preset.tokens[color.token]),
          `${preset.id} ${color.token}`,
        ).not.toBeNull();
      }
    }
  });

  it('keeps derived tokens as expressions, so an edited accent re-derives', () => {
    const dark = PRESETS.presets.find((preset) => preset.id === 'dark');
    // dark.css pre-computes this tint as rgba(); the preset keeps the formula
    expect(dark?.tokens['--oge-accent-soft']).toContain('var(--oge-accent)');
    expect(PRESETS.derived).toContain('--oge-focus-ring');
  });

  it('substitutes bridge fallbacks', () => {
    const tailwind = PRESETS.presets.find((preset) => preset.id === 'tailwind');
    expect(tailwind?.tokens['--oge-accent']).toBe('#4f46e5');
    expect(tailwind?.tokens['--oge-radius']).toBe('8px');
  });
});

describe('state encoding', () => {
  const state: BuilderState = {
    preset: 'dark',
    colors: { '--oge-accent': '#ff00aa', '--oge-bg': '#101010' },
    radius: 8,
    density: 'compact',
    font: 'inter',
  };

  it('round-trips through the compact form', () => {
    const encoded = encodeState(state);
    expect(encoded).toBe('p.dark~a.ff00aa~bg.101010~r.8~d.compact~f.inter');
    expect(decodeState(encoded)).toEqual(state);
  });

  it('encodes the initial state as nothing', () => {
    expect(encodeState(INITIAL_STATE)).toBe('');
    expect(decodeState('')).toBeNull();
  });

  it('drops anything outside the closed sets', () => {
    expect(
      decodeState('p.evil~a.}body{~r.99~d.huge~f.comic~zz.123456~a.abc'),
    ).toEqual({
      ...INITIAL_STATE,
      colors: { '--oge-accent': '#aabbcc' },
      radius: 24,
    });
    expect(decodeState('nonsense')).toBeNull();
  });
});

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    // the default accent on white clears AA
    expect(contrastRatio('#2563eb', '#ffffff')).toBeGreaterThan(4.5);
    expect(contrastRatio('var(--x)', '#fff')).toBeNull();
  });

  it('composites translucent colours over the background', () => {
    expect(contrastRatio('rgb(0 0 0 / 0)', '#ffffff')).toBe(1);
  });

  it('passes every check on the default and high-contrast themes', () => {
    for (const preset of ['default', 'high-contrast'] as const) {
      const failing = contrastChecks(
        resolveTokens(PRESETS, { ...INITIAL_STATE, preset }),
      ).filter((check) => !check.pass);
      expect(
        failing.map((check) => check.id),
        preset,
      ).toEqual([]);
    }
  });

  it('flags a low-contrast accent', () => {
    const checks = contrastChecks(
      resolveTokens(PRESETS, {
        ...INITIAL_STATE,
        colors: { '--oge-accent': '#e0e0e0' },
      }),
    );
    const accent = checks.find((check) => check.id === 'accent-bg');
    expect(accent?.pass).toBe(false);
    expect(checks.find((check) => check.id === 'on-accent')?.pass).toBe(false);
  });
});

describe('exports', () => {
  const state: BuilderState = {
    ...INITIAL_STATE,
    colors: { '--oge-accent': '#7c3aed' },
    radius: 10,
  };

  it(':root lists only what differs from the default theme', () => {
    const css = exportRootCss(PRESETS, state, 'Brand');
    expect(css).toContain(':root {');
    expect(css).toContain('  --oge-accent: #7c3aed;');
    expect(css).toContain('  --oge-radius: 10px;');
    expect(css).toContain('  --oge-radius-lg: 14px;');
    expect(css).not.toContain('--oge-bg:');
    expect(css).toContain('"brand"');
  });

  it('a dark start exports every dark value and the colour scheme', () => {
    const css = exportRootCss(
      PRESETS,
      { ...INITIAL_STATE, preset: 'dark' },
      'x',
    );
    expect(css).toContain('color-scheme: dark;');
    expect(css).toContain('--oge-bg: #111827;');
    expect(
      changedTokens(PRESETS, resolveTokens(PRESETS, INITIAL_STATE)),
    ).toEqual([]);
  });

  it('the scoped variant re-declares the derived set', () => {
    const css = exportScopedCss(PRESETS, state, 'my brand');
    expect(css).toContain(
      ".oge-theme-my-brand,\n[data-oge-theme='my-brand'] {",
    );
    for (const token of PRESETS.derived) expect(css).toContain(`  ${token}:`);
  });

  it('JSON is DTCG-shaped', () => {
    const json = JSON.parse(exportJson(PRESETS, state, 'brand'));
    expect(json.brand.accent).toEqual({
      $type: 'color',
      $value: {
        colorSpace: 'srgb',
        components: [0.4863, 0.2275, 0.9294],
        hex: '#7c3aed',
      },
      $extensions: { 'com.ogeui': { cssVariable: '--oge-accent' } },
    });
    expect(json.brand.radius.$value).toEqual({ value: 10, unit: 'px' });
  });

  it('slugs the theme name', () => {
    expect(themeSlug('  My Theme! ')).toBe('my-theme');
    expect(themeSlug('***')).toBe('my-theme');
  });
});
