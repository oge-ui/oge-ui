/**
 * The theme builder's model — pure functions, no Angular, so the state
 * encoding, the contrast maths and the exports are unit-tested directly.
 *
 * Presets come from `generated/theme-presets.json` (written by
 * `docs-tools:llms` from `_tokens.scss` and `themes/*.css`): every token of
 * each built-in theme as CSS one subtree can declare. The builder edits a few
 * key tokens on top of a preset and never invents a token.
 */

export type PresetId =
  'default' | 'dark' | 'high-contrast' | 'tailwind' | 'bootstrap';

export type Density = 'compact' | 'standard' | 'comfortable';

export interface PresetFile {
  readonly version: 1;
  /** Token names declared in `derived-tokens` (expressions over others). */
  readonly derived: readonly string[];
  readonly presets: readonly {
    readonly id: PresetId;
    readonly label: string;
    readonly scheme: 'light' | 'dark';
    readonly tokens: Readonly<Record<string, string>>;
  }[];
}

/** A colour token the builder edits; `key` is its short URL name. */
export interface KeyColor {
  readonly key: string;
  readonly token: string;
  readonly label: string;
  readonly hint: string;
}

export const KEY_COLORS: readonly KeyColor[] = [
  {
    key: 'a',
    token: '--oge-accent',
    label: 'Accent',
    hint: 'Selection, focus, primary actions, links',
  },
  {
    key: 'bg',
    token: '--oge-bg',
    label: 'Background',
    hint: 'Component surfaces: grid body, fields, cards',
  },
  {
    key: 'sf',
    token: '--oge-header-bg',
    label: 'Surface',
    hint: 'Headers, toolbars, filled fields',
  },
  {
    key: 'tx',
    token: '--oge-text-color',
    label: 'Text',
    hint: 'Body text in every component',
  },
  {
    key: 'mu',
    token: '--oge-muted-color',
    label: 'Muted text',
    hint: 'Secondary text, idle outlines, hints',
  },
  {
    key: 'bd',
    token: '--oge-border-color',
    label: 'Border',
    hint: 'Hairline frames and dividers',
  },
  {
    key: 'ok',
    token: '--oge-success',
    label: 'Success',
    hint: 'Success buttons, toasts and badges',
  },
  {
    key: 'wa',
    token: '--oge-warning',
    label: 'Warning',
    hint: 'Warning buttons, toasts and badges',
  },
  {
    key: 'dg',
    token: '--oge-danger',
    label: 'Danger',
    hint: 'Danger buttons, errors, validation',
  },
];

/** Font stacks offered for the preview (not a token — components inherit it). */
export const FONT_STACKS: readonly {
  readonly id: string;
  readonly label: string;
  readonly css: string;
}[] = [
  { id: '', label: 'Inherit from the page', css: '' },
  {
    id: 'system',
    label: 'System UI',
    css: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  { id: 'inter', label: 'Inter', css: 'Inter, system-ui, sans-serif' },
  {
    id: 'serif',
    label: 'Serif',
    css: "Georgia, 'Times New Roman', serif",
  },
  {
    id: 'mono',
    label: 'Monospace',
    css: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
];

/** Grid / list density as token values; `standard` keeps the preset's. */
export const DENSITIES: Readonly<
  Record<Exclude<Density, 'standard'>, Readonly<Record<string, string>>>
> = {
  compact: {
    '--oge-row-height': '30px',
    '--oge-cell-padding-y': '5px',
    '--oge-cell-padding-x': '10px',
    '--oge-font-size': '13px',
  },
  comfortable: {
    '--oge-row-height': '44px',
    '--oge-cell-padding-y': '12px',
    '--oge-cell-padding-x': '16px',
    '--oge-font-size': '15px',
  },
};

export const RADIUS_MAX = 24;

export interface BuilderState {
  readonly preset: PresetId;
  /** Edited key colours (`#rrggbb`), by token name. */
  readonly colors: Readonly<Record<string, string>>;
  /** `--oge-radius` in px; `null` keeps the preset's. */
  readonly radius: number | null;
  readonly density: Density;
  /** `FONT_STACKS` id; `''` inherits the page font. */
  readonly font: string;
}

export const INITIAL_STATE: BuilderState = {
  preset: 'default',
  colors: {},
  radius: null,
  density: 'standard',
  font: '',
};

const PRESET_IDS: readonly PresetId[] = [
  'default',
  'dark',
  'high-contrast',
  'tailwind',
  'bootstrap',
];

export function presetOf(file: PresetFile, id: PresetId) {
  return file.presets.find((preset) => preset.id === id) ?? file.presets[0];
}

/** `#abc` / `#aabbcc` (any case, `#` optional) → `#aabbcc`; else `null`. */
export function normalizeHex(value: string | null | undefined): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((value ?? '').trim());
  if (!match) return null;
  const digits =
    match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];
  return `#${digits.toLowerCase()}`;
}

/** Radius in px of a CSS length (`6px`), or `null`. */
export function pxOf(value: string | undefined): number | null {
  const match = /^(\d+(?:\.\d+)?)px$/.exec((value ?? '').trim());
  return match ? Number(match[1]) : null;
}

/** Every token the preview and the exports declare, in preset order. */
export function resolveTokens(
  file: PresetFile,
  state: BuilderState,
): Record<string, string> {
  const tokens: Record<string, string> = {
    ...presetOf(file, state.preset).tokens,
  };
  if (state.density !== 'standard')
    Object.assign(tokens, DENSITIES[state.density]);
  if (state.radius !== null) {
    tokens['--oge-radius'] = `${state.radius}px`;
    // the large radius keeps the default 6 → 10 step
    tokens['--oge-radius-lg'] =
      `${state.radius === 0 ? 0 : state.radius + 4}px`;
  }
  for (const color of KEY_COLORS) {
    const value = state.colors[color.token];
    if (value) tokens[color.token] = value;
  }
  return tokens;
}

/** The value a key colour currently has (edited, else the preset's). */
export function keyColorValue(
  file: PresetFile,
  state: BuilderState,
  token: string,
): string {
  return (
    state.colors[token] ?? presetOf(file, state.preset).tokens[token] ?? ''
  );
}

// ------------------------------------------------------------- URL / storage

/**
 * Compact, URL-safe state: `p.dark~a.ff00aa~r.8~d.compact~f.inter` — only
 * what differs from the initial state. Colours are bare hex.
 */
export function encodeState(state: BuilderState): string {
  const parts: string[] = [];
  if (state.preset !== 'default') parts.push(`p.${state.preset}`);
  for (const color of KEY_COLORS) {
    const hex = normalizeHex(state.colors[color.token]);
    if (hex) parts.push(`${color.key}.${hex.slice(1)}`);
  }
  if (state.radius !== null) parts.push(`r.${state.radius}`);
  if (state.density !== 'standard') parts.push(`d.${state.density}`);
  if (state.font) parts.push(`f.${state.font}`);
  return parts.join('~');
}

/**
 * Reads an encoded state. Every field is validated against a closed set or
 * a strict pattern, so a crafted link can only ever produce a legal state.
 */
export function decodeState(
  text: string | null | undefined,
): BuilderState | null {
  if (!text) return null;
  let preset: PresetId = 'default';
  const colors: Record<string, string> = {};
  let radius: number | null = null;
  let density: Density = 'standard';
  let font = '';
  let recognized = false;
  for (const part of text.split('~')) {
    const dot = part.indexOf('.');
    if (dot < 1) continue;
    const key = part.slice(0, dot);
    const value = part.slice(dot + 1);
    if (key === 'p' && (PRESET_IDS as readonly string[]).includes(value)) {
      preset = value as PresetId;
      recognized = true;
    } else if (key === 'r' && /^\d{1,2}$/.test(value)) {
      radius = Math.min(Number(value), RADIUS_MAX);
      recognized = true;
    } else if (
      key === 'd' &&
      (value === 'compact' || value === 'comfortable')
    ) {
      density = value;
      recognized = true;
    } else if (key === 'f' && FONT_STACKS.some((stack) => stack.id === value)) {
      font = value;
      recognized = true;
    } else {
      const color = KEY_COLORS.find((entry) => entry.key === key);
      const hex = color ? normalizeHex(value) : null;
      if (color && hex) {
        colors[color.token] = hex;
        recognized = true;
      }
    }
  }
  return recognized ? { preset, colors, radius, density, font } : null;
}

// ---------------------------------------------------------------- contrast

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** Hex and `rgb()`/`rgba()` colours; `null` for anything else. */
export function parseColor(value: string | undefined): Rgba | null {
  const text = (value ?? '').trim().toLowerCase();
  if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = [...digits].map((d) => d + d).join('');
    }
    if (digits.length !== 6 && digits.length !== 8) return null;
    const n = (at: number) => parseInt(digits.slice(at, at + 2), 16);
    return {
      r: n(0),
      g: n(2),
      b: n(4),
      a: digits.length === 8 ? n(6) / 255 : 1,
    };
  }
  const fn = /^rgba?\((.*)\)$/.exec(text);
  if (!fn) return null;
  const [channels, alpha] = fn[1].includes('/')
    ? fn[1].split('/').map((part) => part.trim())
    : [fn[1], null];
  const parts = channels.split(/[\s,]+/).filter(Boolean);
  const a = alpha ?? (parts.length === 4 ? parts.pop() : '1') ?? '1';
  if (parts.length !== 3) return null;
  const rgba = {
    r: Number(parts[0]),
    g: Number(parts[1]),
    b: Number(parts[2]),
    a: a.endsWith('%') ? parseFloat(a) / 100 : Number(a),
  };
  return Object.values(rgba).some(Number.isNaN) ? null : rgba;
}

/** `top` painted over an opaque `bottom`. */
function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    a: 1,
  };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

/**
 * WCAG 2 contrast ratio of `fg` on `bg` (translucent colours are composited:
 * the background over white, the foreground over the background). `null`
 * when either is not a literal colour.
 */
export function contrastRatio(fg: string, bg: string): number | null {
  const back = parseColor(bg);
  const front = parseColor(fg);
  if (!back || !front) return null;
  const solidBack = over(back, WHITE);
  const solidFront = over(front, solidBack);
  const [light, dark] = [luminance(solidFront), luminance(solidBack)].sort(
    (x, y) => y - x,
  );
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

export interface ContrastCheck {
  readonly id: string;
  readonly label: string;
  readonly fg: string;
  readonly bg: string;
  readonly ratio: number | null;
  /** WCAG AA minimum for this pairing. */
  readonly min: number;
  readonly pass: boolean;
}

/** The AA checks the builder shows: text on surfaces, text on fills. */
export function contrastChecks(
  tokens: Record<string, string>,
): ContrastCheck[] {
  const fill = tokens['--oge-severity-contrast'] ?? '#ffffff';
  const pairs: [string, string, string, string, number][] = [
    ['text-bg', 'Text on background', '--oge-text-color', '--oge-bg', 4.5],
    [
      'text-surface',
      'Text on surface',
      '--oge-text-color',
      '--oge-header-bg',
      4.5,
    ],
    [
      'muted-bg',
      'Muted text on background',
      '--oge-muted-color',
      '--oge-bg',
      4.5,
    ],
    [
      'accent-bg',
      'Accent text and links on background',
      '--oge-accent',
      '--oge-bg',
      4.5,
    ],
    ['on-accent', 'Button text on accent', '', '--oge-accent', 4.5],
    ['on-success', 'Text on success fill', '', '--oge-success', 4.5],
    [
      'on-warning',
      'Text on warning fill',
      tokens['--oge-warning-contrast'] ? '--oge-warning-contrast' : '',
      '--oge-warning',
      4.5,
    ],
    ['on-danger', 'Text on danger fill', '', '--oge-danger', 4.5],
  ];
  return pairs.map(([id, label, fgToken, bgToken, min]) => {
    const fg = fgToken ? (tokens[fgToken] ?? '') : fill;
    const bg = tokens[bgToken] ?? '';
    const ratio = contrastRatio(fg, bg);
    return {
      id,
      label,
      fg,
      bg,
      ratio,
      min,
      pass: ratio !== null && ratio >= min,
    };
  });
}

// ------------------------------------------------------------------ exports

/** `my theme!` → `my-theme`; empty → `my-theme`. */
export function themeSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'my-theme';
}

/** Tokens whose value differs from the default theme. */
export function changedTokens(
  file: PresetFile,
  tokens: Record<string, string>,
): [string, string][] {
  const defaults = presetOf(file, 'default').tokens;
  return Object.entries(tokens).filter(
    ([name, value]) => defaults[name] !== value,
  );
}

function fontCss(state: BuilderState): string {
  return FONT_STACKS.find((stack) => stack.id === state.font)?.css ?? '';
}

const HEADER = (name: string) =>
  `/* OGE UI theme "${name}" — https://www.ogeui.com/getting-started/theme-builder */`;

/** `:root { … }` — every token that differs from the default theme. */
export function exportRootCss(
  file: PresetFile,
  state: BuilderState,
  name: string,
): string {
  const tokens = resolveTokens(file, state);
  const lines = changedTokens(file, tokens).map(
    ([token, value]) => `  ${token}: ${value};`,
  );
  return [
    HEADER(themeSlug(name)),
    ':root {',
    ...preamble(file, state),
    ...lines,
    '}',
    '',
  ].join('\n');
}

/**
 * `[data-oge-theme='<name>'] { … }` — the changed tokens plus the whole
 * derived set, re-declared so a themed subtree re-resolves its tints
 * (a custom property's `var()` resolves where it is declared).
 */
export function exportScopedCss(
  file: PresetFile,
  state: BuilderState,
  name: string,
): string {
  const slug = themeSlug(name);
  const tokens = resolveTokens(file, state);
  const derived = new Set(file.derived);
  const changed = changedTokens(file, tokens).filter(
    ([token]) => !derived.has(token),
  );
  const derivedLines = file.derived
    .filter((token) => tokens[token] !== undefined)
    .map((token) => `  ${token}: ${tokens[token]};`);
  return [
    HEADER(slug),
    `.oge-theme-${slug},`,
    `[data-oge-theme='${slug}'] {`,
    ...preamble(file, state),
    ...changed.map(([token, value]) => `  ${token}: ${value};`),
    '  /* derived tokens, re-resolved inside this scope */',
    ...derivedLines,
    '}',
    '',
  ].join('\n');
}

function preamble(file: PresetFile, state: BuilderState): string[] {
  const lines: string[] = [];
  if (presetOf(file, state.preset).scheme === 'dark') {
    lines.push('  color-scheme: dark;');
  }
  const font = fontCss(state);
  if (font) lines.push(`  font-family: ${font};`);
  return lines;
}

function dtcgColor(rgba: Rgba) {
  const hex = `#${[rgba.r, rgba.g, rgba.b]
    .map((n) => Math.round(n).toString(16).padStart(2, '0'))
    .join('')}`;
  return {
    colorSpace: 'srgb',
    components: [rgba.r, rgba.g, rgba.b].map(
      (n) => Math.round((n / 255) * 10000) / 10000,
    ),
    ...(rgba.a < 1 ? { alpha: Math.round(rgba.a * 10000) / 10000 } : {}),
    hex,
  };
}

/**
 * The changed tokens in the Design Tokens Community Group format — the same
 * shape as `@oge-ui/core/tokens.json`. Literal colours, px dimensions and
 * z-index numbers are typed; anything else (shadows, `color-mix()` tints)
 * stays in the CSS export and is listed in `$extensions`.
 */
export function exportJson(
  file: PresetFile,
  state: BuilderState,
  name: string,
): string {
  const slug = themeSlug(name);
  const tokens = resolveTokens(file, state);
  const derived = new Set(file.derived);
  const group: Record<string, unknown> = {};
  const cssOnly: string[] = [];
  for (const [token, value] of changedTokens(file, tokens)) {
    if (derived.has(token)) continue;
    const key = token.replace(/^--oge-/, '');
    const extensions = { 'com.ogeui': { cssVariable: token } };
    const color = parseColor(value);
    const px = pxOf(value);
    if (color) {
      group[key] = {
        $type: 'color',
        $value: dtcgColor(color),
        $extensions: extensions,
      };
    } else if (px !== null) {
      group[key] = {
        $type: 'dimension',
        $value: { value: px, unit: 'px' },
        $extensions: extensions,
      };
    } else if (/^--oge-z-/.test(token) && /^\d+$/.test(value)) {
      group[key] = {
        $type: 'number',
        $value: Number(value),
        $extensions: extensions,
      };
    } else {
      cssOnly.push(token);
    }
  }
  const font = fontCss(state);
  if (font) {
    group['font-family'] = {
      $type: 'fontFamily',
      $value: font
        .split(',')
        .map((family) => family.trim().replace(/^'|'$/g, '')),
      $description:
        'Not an OGE token: set it as font-family on the theme scope.',
    };
  }
  const out = {
    $description: `OGE UI theme "${slug}" (tokens that differ from the default theme), exported from https://www.ogeui.com/getting-started/theme-builder`,
    ...(cssOnly.length
      ? { $extensions: { 'com.ogeui': { cssOnlyTokens: cssOnly } } }
      : {}),
    [slug]: group,
  };
  return `${JSON.stringify(out, null, 2)}\n`;
}
