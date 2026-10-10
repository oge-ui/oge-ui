import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Reads the suite's design tokens and builds the token artifacts:
 *
 * - `design-tokens.json` — the docs site's token reference table
 *   (`/getting-started/tokens`): every token with its default, dark,
 *   high-contrast and bridge values, a category, resolved swatch colours and
 *   the packages whose stylesheets read it.
 * - `theme-presets.json` — the ThemeBuilder's starting points
 *   (`/getting-started/theme-builder`): every token of each built-in theme,
 *   resolved to plain CSS the preview can apply to one subtree.
 * - `tokens.json` — the light / dark / high-contrast themes in the Design
 *   Tokens Community Group format (2025.10: `$value` + `$type`, colours as
 *   sRGB component objects with a `hex` fallback, dimensions as
 *   `{ value, unit }`), shipped as `@oge-ui/core/tokens.json`.
 *
 * Sources, never typed twice: `packages/grid/src/lib/styles/_tokens.scss`
 * (`literal-tokens` + `derived-tokens`) and `themes/*.css`. "Used by" greps
 * `var(--oge-…)` reads in every package's SCSS, CSS and TypeScript.
 * Everything is generated and committed by `docs-tools:llms`, and
 * `docs-tools:llms-check` fails when a token or theme changes without a
 * regeneration.
 */

export const TOKENS_SCSS = 'packages/grid/src/lib/styles/_tokens.scss';
export const THEMES_DIR = 'packages/grid/src/lib/styles/themes';

/** Theme columns of the reference table, in display order. */
export const THEMES = [
  { id: 'dark', file: 'dark.css', label: 'Dark' },
  { id: 'hc', file: 'high-contrast.css', label: 'High contrast' },
  { id: 'tailwind', file: 'tailwind.css', label: 'Tailwind' },
  { id: 'bootstrap', file: 'bootstrap.css', label: 'Bootstrap' },
];

/** Category ids and labels, in display order. */
export const CATEGORIES = [
  { id: 'color', label: 'Colour' },
  { id: 'spacing', label: 'Spacing & size' },
  { id: 'radius', label: 'Radius' },
  { id: 'typography', label: 'Typography' },
  { id: 'elevation', label: 'Elevation' },
  { id: 'z-index', label: 'Z-index' },
  { id: 'motion', label: 'Motion' },
  { id: 'component', label: 'Component-specific' },
];

/** Token name prefixes that belong to one component family. */
const COMPONENT_PREFIXES = [
  'scheduler',
  'gantt',
  'kanban',
  'chart',
  'editor',
  'avatar',
  'rating',
  'signature',
  'switch',
  'tooltip',
  'badge',
  'toast',
  'modal',
  'input',
];

/** The category of one token, from its name. */
export function categoryOf(name) {
  const bare = name.replace(/^--oge-/, '');
  if (bare.startsWith('z-')) return 'z-index';
  if (/(^|-)radius/.test(bare)) return 'radius';
  if (/(^|-)(duration|easing|transition)(-|$)/.test(bare)) return 'motion';
  if (/^font-/.test(bare)) return 'typography';
  if (COMPONENT_PREFIXES.some((prefix) => bare.startsWith(`${prefix}-`))) {
    return 'component';
  }
  if (/(^|-)shadow(-|$)/.test(bare)) return 'elevation';
  if (/(padding|height|width|indent|gap)/.test(bare)) return 'spacing';
  return 'color';
}

// ------------------------------------------------------------------ parsing

/**
 * Declarations of a CSS/SCSS block body, in order: `{ name, value, note }`.
 * `note` is the comment directly above the declaration, if any.
 *
 * @param {string} body text between `{` and `}` (no nested blocks)
 */
export function readDeclarations(body) {
  /** @type {{ name: string, value: string, note?: string }[]} */
  const out = [];
  let i = 0;
  let note = null;
  while (i < body.length) {
    const rest = body.slice(i);
    const space = /^\s+/.exec(rest);
    if (space) {
      i += space[0].length;
      continue;
    }
    if (rest.startsWith('//')) {
      const end = rest.indexOf('\n');
      const text = rest.slice(2, end < 0 ? undefined : end).trim();
      note = note ? `${note} ${text}` : text;
      i += end < 0 ? rest.length : end;
      continue;
    }
    if (rest.startsWith('/*')) {
      const end = rest.indexOf('*/');
      note = cleanComment(rest.slice(2, end));
      i += end + 2;
      continue;
    }
    const semi = topLevelIndex(rest, ';');
    const statement = rest.slice(0, semi < 0 ? undefined : semi);
    i += semi < 0 ? rest.length : semi + 1;
    const colon = statement.indexOf(':');
    if (colon > 0) {
      const name = statement.slice(0, colon).trim();
      const value = squash(statement.slice(colon + 1));
      if (name.startsWith('--oge-')) {
        out.push({ name, value, ...(note ? { note } : {}) });
      }
    }
    note = null;
  }
  return out;
}

/** Body of `@mixin <name> { … }` in an SCSS file. */
export function mixinBody(text, name) {
  const start = text.indexOf(`@mixin ${name} {`);
  if (start < 0) throw new Error(`tokens: no @mixin ${name} in ${TOKENS_SCSS}`);
  const open = text.indexOf('{', start);
  return text.slice(open + 1, matchingBrace(text, open));
}

/** Body of the first top-level rule of a theme file (not the `@media` copy). */
export function firstRuleBody(text) {
  // comments stay in the text (a note above a declaration is kept), but are
  // skipped while looking for the rule's opening brace
  const clean = text;
  let depth = 0;
  for (let i = 0; i < clean.length; i++) {
    if (clean.startsWith('/*', i)) {
      i = clean.indexOf('*/', i) + 1;
      continue;
    }
    const char = clean[i];
    if (char === '{') {
      const header = clean.slice(0, i).split('}').pop() ?? '';
      if (depth === 0 && !header.includes('@media')) {
        return clean.slice(i + 1, matchingBrace(clean, i));
      }
      depth++;
    } else if (char === '}') depth--;
  }
  throw new Error('tokens: no rule block in theme file');
}

function matchingBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  throw new Error('tokens: unbalanced braces');
}

/** Index of `char` outside parentheses and quotes, or -1. */
function topLevelIndex(text, char) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === char && depth === 0) return i;
  }
  return -1;
}

/** Splits on top-level commas. */
export function splitTopLevel(text, separator = ',') {
  const parts = [];
  let rest = text;
  for (;;) {
    const at = topLevelIndex(rest, separator);
    if (at < 0) break;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at + 1);
  }
  parts.push(rest.trim());
  return parts;
}

function squash(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/,\s*\)/g, ')')
    .trim();
}

function cleanComment(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trim())
    .filter(Boolean)
    .join(' ');
}

// ------------------------------------------------------------------ colours

/** @typedef {{ r: number, g: number, b: number, a: number }} Rgba */

/**
 * Parses a literal CSS colour: hex, `rgb()`/`rgba()` (comma or space syntax)
 * and `transparent`. `null` for anything else.
 *
 * @returns {Rgba | null}
 */
export function parseColor(value) {
  const text = value.trim().toLowerCase();
  if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (text === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (text === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = [...digits].map((d) => d + d).join('');
    }
    if (digits.length !== 6 && digits.length !== 8) return null;
    const n = (at) => parseInt(digits.slice(at, at + 2), 16);
    return {
      r: n(0),
      g: n(2),
      b: n(4),
      a: digits.length === 8 ? round(n(6) / 255, 4) : 1,
    };
  }
  const fn = /^rgba?\((.*)\)$/.exec(text);
  if (fn) {
    const [channels, alpha] = fn[1].includes('/')
      ? fn[1].split('/').map((part) => part.trim())
      : [fn[1], null];
    const parts = channels.split(/[\s,]+/).filter(Boolean);
    const a = alpha ?? (parts.length === 4 ? parts.pop() : '1');
    if (parts.length !== 3) return null;
    const num = (part) =>
      part.endsWith('%') ? (parseFloat(part) / 100) * 255 : parseFloat(part);
    const rgba = {
      r: num(parts[0]),
      g: num(parts[1]),
      b: num(parts[2]),
      a: a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a),
    };
    return Object.values(rgba).some(Number.isNaN) ? null : rgba;
  }
  return null;
}

/** `#rrggbb` when opaque, else `rgb(r g b / a)`. */
export function formatColor({ r, g, b, a }) {
  const channel = (n) => Math.round(n);
  if (a >= 1) {
    return `#${[r, g, b]
      .map((n) => channel(n).toString(16).padStart(2, '0'))
      .join('')}`;
  }
  return `rgb(${channel(r)} ${channel(g)} ${channel(b)} / ${round(a, 3)})`;
}

/** `color-mix(in srgb, A p%, B)` — premultiplied sRGB interpolation. */
function mix(a, b, p) {
  const alpha = a.a * p + b.a * (1 - p);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const channel = (key) => (a[key] * a.a * p + b[key] * b.a * (1 - p)) / alpha;
  return {
    r: channel('r'),
    g: channel('g'),
    b: channel('b'),
    a: round(alpha, 4),
  };
}

function round(n, digits) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

// --------------------------------------------------------------- resolution

/**
 * Substitutes `var(--not-oge, fallback)` with its fallback (the bridge
 * themes read Tailwind / Bootstrap variables with plain-CSS fallbacks).
 * `var(--oge-…)` references are kept.
 */
export function withFallbacks(value) {
  let out = value;
  for (let guard = 0; guard < 20; guard++) {
    const at = out.search(/var\(--(?!oge-)/);
    if (at < 0) break;
    const open = at + 3;
    let depth = 0;
    let end = -1;
    for (let i = open; i < out.length; i++) {
      if (out[i] === '(') depth++;
      else if (out[i] === ')' && --depth === 0) {
        end = i;
        break;
      }
    }
    if (end < 0) break;
    const inner = out.slice(open + 1, end);
    const comma = topLevelIndex(inner, ',');
    const fallback = comma < 0 ? '' : inner.slice(comma + 1).trim();
    out = out.slice(0, at) + fallback + out.slice(end + 1);
  }
  return out;
}

/**
 * Resolves a token value to a colour within one theme's token map
 * (`var(--oge-x)` lookups, bridge fallbacks, `color-mix()` in sRGB).
 * `null` when the value is not a colour.
 *
 * @param {string} value
 * @param {Map<string, string>} map token name → raw value for this theme
 * @returns {Rgba | null}
 */
export function resolveColor(value, map, depth = 0) {
  if (depth > 12) return null;
  const text = withFallbacks(value).trim();
  const ref = /^var\((--oge-[a-z0-9-]+)\)$/.exec(text);
  if (ref) {
    const target = map.get(ref[1]);
    return target === undefined ? null : resolveColor(target, map, depth + 1);
  }
  const mixed = /^color-mix\(in srgb,(.*)\)$/.exec(text);
  if (mixed) {
    const parts = splitTopLevel(mixed[1]);
    if (parts.length !== 2) return null;
    const [first, second] = parts.map((part) => {
      const pct = /\s(\d+(?:\.\d+)?)%$/.exec(part);
      return {
        color: resolveColor(
          pct ? part.slice(0, pct.index) : part,
          map,
          depth + 1,
        ),
        pct: pct ? parseFloat(pct[1]) / 100 : null,
      };
    });
    if (!first.color || !second.color) return null;
    const p =
      first.pct ?? (second.pct === null ? 0.5 : 1 - (second.pct ?? 0.5));
    return mix(first.color, second.color, p);
  }
  return parseColor(text);
}

// -------------------------------------------------------------------- model

/**
 * @typedef {object} TokenModel
 * @property {{ name: string, value: string, note?: string, derived: boolean }[]} base
 * @property {Map<string, Map<string, string>>} themes theme id → name → raw value
 * @property {Map<string, string[]>} usedBy token → npm package names
 */

/** Reads tokens, themes and usages from the workspace. */
export function readTokenModel(workspaceRoot) {
  const abs = (...parts) => path.join(workspaceRoot, ...parts);
  const scss = readFileSync(abs(TOKENS_SCSS), 'utf8');
  const base = [
    ...readDeclarations(mixinBody(scss, 'literal-tokens')).map((d) => ({
      ...d,
      derived: false,
    })),
    ...readDeclarations(mixinBody(scss, 'derived-tokens')).map((d) => ({
      ...d,
      derived: true,
    })),
  ];
  /** @type {Map<string, Map<string, string>>} */
  const themes = new Map();
  /** @type {Map<string, Map<string, string>>} */
  const themeNotes = new Map();
  for (const theme of THEMES) {
    const declarations = readDeclarations(
      firstRuleBody(readFileSync(abs(THEMES_DIR, theme.file), 'utf8')),
    );
    themes.set(theme.id, new Map(declarations.map((d) => [d.name, d.value])));
    themeNotes.set(
      theme.id,
      new Map(declarations.filter((d) => d.note).map((d) => [d.name, d.note])),
    );
  }
  return { base, themes, themeNotes, usedBy: readUsages(workspaceRoot) };
}

/** token → sorted npm names of the packages whose sources read it. */
function readUsages(workspaceRoot) {
  const packagesDir = path.join(workspaceRoot, 'packages');
  const tokensFile = path.join(workspaceRoot, TOKENS_SCSS);
  const themesDir = path.join(workspaceRoot, THEMES_DIR);
  /** @type {Map<string, Set<string>>} */
  const usages = new Map();
  /** @type {Map<string, string | null>} */
  const packageOfDir = new Map();
  const npmNameOf = (dir) => {
    if (packageOfDir.has(dir)) return packageOfDir.get(dir);
    const manifest = path.join(dir, 'package.json');
    let name = null;
    if (existsSync(manifest)) {
      name = JSON.parse(readFileSync(manifest, 'utf8')).name ?? null;
    } else if (path.dirname(dir) !== dir && dir !== packagesDir) {
      name = npmNameOf(path.dirname(dir));
    }
    packageOfDir.set(dir, name);
    return name;
  };
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (full === themesDir) continue;
        walk(full);
        continue;
      }
      if (!/\.(scss|css|ts|tsx)$/.test(entry.name)) continue;
      if (/\.(spec|test|stories)\.tsx?$/.test(entry.name)) continue;
      if (full === tokensFile) continue;
      const text = readFileSync(full, 'utf8');
      const pkg = npmNameOf(dir);
      if (!pkg || pkg === 'oge-ui') continue;
      for (const match of text.matchAll(/var\(\s*(--oge-[a-z0-9-]+)/g)) {
        const set = usages.get(match[1]) ?? new Set();
        set.add(pkg);
        usages.set(match[1], set);
      }
    }
  };
  walk(packagesDir);
  return new Map(
    [...usages].map(([name, set]) => [
      name,
      [...set].sort((a, b) => a.localeCompare(b, 'en')),
    ]),
  );
}

/** name → raw value of the default (light) theme. */
function baseMap(model) {
  return new Map(model.base.map((t) => [t.name, t.value]));
}

/**
 * name → raw value of a scoped theme: the default set overlaid with the
 * theme's own declarations (what a subtree under that scope resolves).
 */
function themeMap(model, id) {
  const map = baseMap(model);
  for (const [name, value] of model.themes.get(id) ?? []) map.set(name, value);
  return map;
}

/** The ordered token names: the default set, then theme-only additions. */
function tokenNames(model) {
  const names = model.base.map((t) => t.name);
  for (const theme of THEMES) {
    for (const name of model.themes.get(theme.id)?.keys() ?? []) {
      if (!names.includes(name)) names.push(name);
    }
  }
  return names;
}

// ------------------------------------------------------- reference table

/**
 * The docs site's token reference (`design-tokens.json`).
 * One row per token: `n` name, `c` category, `k` `'d'` for derived tokens,
 * `d` the source comment, `v` raw values per theme (a theme's value only when
 * it differs from the default), `s` resolved swatch colours for colour
 * tokens, `u` the packages that read it.
 */
export function buildReferenceData(model) {
  const base = new Map(model.base.map((t) => [t.name, t]));
  const maps = new Map([
    ['light', baseMap(model)],
    ...THEMES.map((theme) => [theme.id, themeMap(model, theme.id)]),
  ]);
  const rows = [];
  for (const name of tokenNames(model)) {
    const token = base.get(name);
    /** @type {Record<string, string>} */
    const values = {};
    if (token) values.light = token.value;
    for (const theme of THEMES) {
      const own = model.themes.get(theme.id)?.get(name);
      if (own !== undefined && own !== token?.value) values[theme.id] = own;
    }
    const category = categoryOf(name);
    /** @type {Record<string, string>} */
    const swatches = {};
    for (const [id, value] of Object.entries(values)) {
      const color = resolveColor(value, maps.get(id) ?? new Map());
      if (color) swatches[id] = formatColor(color);
    }
    const isColor =
      Object.keys(swatches).length > 0 &&
      (category === 'color' || category === 'component');
    const note =
      token?.note ??
      THEMES.map((theme) => model.themeNotes.get(theme.id)?.get(name)).find(
        Boolean,
      );
    rows.push({
      n: name,
      c: category,
      ...(token?.derived ? { k: 'd' } : {}),
      ...(note ? { d: note } : {}),
      v: values,
      ...(isColor ? { s: swatches } : {}),
      u: model.usedBy.get(name) ?? [],
    });
  }
  return {
    version: 1,
    source: TOKENS_SCSS,
    themes: [
      { id: 'light', label: 'Default (light)' },
      ...THEMES.map(({ id, label }) => ({ id, label })),
    ],
    categories: CATEGORIES.filter((category) =>
      rows.some((row) => row.c === category.id),
    ),
    tokens: rows,
  };
}

// --------------------------------------------------------------- presets

/** ThemeBuilder presets, in menu order. */
export const PRESETS = [
  { id: 'default', label: 'Default', theme: null, scheme: 'light' },
  { id: 'dark', label: 'Dark', theme: 'dark', scheme: 'dark' },
  {
    id: 'high-contrast',
    label: 'High contrast',
    theme: 'hc',
    scheme: 'light',
  },
  { id: 'tailwind', label: 'Tailwind', theme: 'tailwind', scheme: 'light' },
  { id: 'bootstrap', label: 'Bootstrap', theme: 'bootstrap', scheme: 'light' },
];

/**
 * The ThemeBuilder's presets (`theme-presets.json`): for each built-in theme,
 * every token as CSS a subtree can declare. Literal tokens carry the theme's
 * value with bridge fallbacks substituted; derived tokens keep their
 * expression — the theme's own when it is one (high contrast's solid focus
 * ring), else the default — so an edited accent re-derives its tints, and a
 * theme's pre-computed tint (dark's `rgba()` soft accent) never goes stale.
 */
export function buildPresets(model) {
  const derived = new Set(
    model.base.filter((t) => t.derived).map((t) => t.name),
  );
  const base = baseMap(model);
  const presets = [];
  for (const preset of PRESETS) {
    const own = preset.theme ? model.themes.get(preset.theme) : new Map();
    /** @type {Record<string, string>} */
    const tokens = {};
    for (const name of tokenNames(model)) {
      const themed = own?.get(name);
      let value = themed ?? base.get(name);
      if (value === undefined) continue;
      if (derived.has(name)) {
        value =
          themed !== undefined && themed.includes('var(--oge-')
            ? themed
            : (base.get(name) ?? value);
      } else {
        value = withFallbacks(value);
      }
      tokens[name] = value;
    }
    presets.push({
      id: preset.id,
      label: preset.label,
      scheme: preset.scheme,
      tokens,
    });
  }
  return { version: 1, derived: [...derived], presets };
}

// ------------------------------------------------------------------- DTCG

const DTCG_GROUPS = [
  { id: 'light', theme: null, description: 'Default (light) theme' },
  {
    id: 'dark',
    theme: 'dark',
    description:
      "Dark theme — `.oge-theme-dark` / `[data-oge-theme='dark']` (@oge-ui/core/themes/dark.css)",
  },
  {
    id: 'high-contrast',
    theme: 'hc',
    description:
      "High-contrast theme — `.oge-theme-high-contrast` / `[data-oge-theme='high-contrast']` (@oge-ui/core/themes/high-contrast.css)",
  },
];

/** A colour in the DTCG 2025.10 shape (sRGB components + hex fallback). */
function dtcgColor(rgba) {
  const hex = formatColor({ ...rgba, a: 1 });
  return {
    colorSpace: 'srgb',
    components: [rgba.r, rgba.g, rgba.b].map((n) => round(n / 255, 4)),
    ...(rgba.a < 1 ? { alpha: round(rgba.a, 4) } : {}),
    hex,
  };
}

function dtcgDimension(text) {
  const match = /^(-?\d*\.?\d+)(px|rem)$/.exec(text.trim());
  return match ? { value: parseFloat(match[1]), unit: match[2] } : null;
}

/** `0 1px 2px rgba(…)` layers → DTCG shadow objects. */
function dtcgShadow(value, map) {
  const layers = [];
  for (const layer of splitTopLevel(value)) {
    const parts = splitTopLevel(layer, ' ').filter(Boolean);
    const inset = parts[0] === 'inset';
    if (inset) parts.shift();
    const lengths = [];
    let color = null;
    for (const part of parts) {
      const dim = part === '0' ? { value: 0, unit: 'px' } : dtcgDimension(part);
      if (dim && !color) lengths.push(dim);
      else color = resolveColor(part, map);
    }
    if (!color || lengths.length < 2) return null;
    const zero = { value: 0, unit: 'px' };
    layers.push({
      color: dtcgColor(color),
      offsetX: lengths[0],
      offsetY: lengths[1],
      blur: lengths[2] ?? zero,
      spread: lengths[3] ?? zero,
      ...(inset ? { inset: true } : {}),
    });
  }
  return layers.length === 1 ? layers[0] : layers;
}

/** One DTCG token for `name` in a theme map, or `null` if untypable. */
function dtcgToken(name, value, map, group, derived) {
  const bare = name.replace(/^--oge-/, '');
  const extensions = { 'com.ogeui': { cssVariable: name } };
  const ref = /^var\((--oge-[a-z0-9-]+)\)$/.exec(value);
  if (ref && map.has(ref[1])) {
    const target = map.get(ref[1]) ?? '';
    const type = resolveColor(target, map)
      ? 'color'
      : dtcgDimension(target)
        ? 'dimension'
        : null;
    if (!type) return null;
    return {
      $type: type,
      $value: `{${group}.${ref[1].replace(/^--oge-/, '')}}`,
      $extensions: extensions,
    };
  }
  if (/^z-/.test(bare) && /^\d+$/.test(value)) {
    return { $type: 'number', $value: Number(value), $extensions: extensions };
  }
  if (bare.startsWith('font-') && value.includes(',')) {
    return {
      $type: 'fontFamily',
      $value: splitTopLevel(value).map((family) =>
        family.replace(/^['"]|['"]$/g, ''),
      ),
      $extensions: extensions,
    };
  }
  const duration = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(value);
  if (duration) {
    return {
      $type: 'duration',
      $value: { value: Number(duration[1]), unit: duration[2] },
      $extensions: extensions,
    };
  }
  const bezier = /^cubic-bezier\(([^)]+)\)$/.exec(value);
  if (bezier) {
    return {
      $type: 'cubicBezier',
      $value: bezier[1].split(',').map(Number),
      $extensions: extensions,
    };
  }
  const dim = dtcgDimension(value);
  if (dim) return { $type: 'dimension', $value: dim, $extensions: extensions };
  if (/shadow/.test(bare)) {
    const shadow = dtcgShadow(value, map);
    return shadow
      ? { $type: 'shadow', $value: shadow, $extensions: extensions }
      : null;
  }
  const color = resolveColor(value, map);
  if (color) {
    if (derived || !parseColor(value)) {
      // a computed tint: the resolved colour, with the CSS that derives it
      extensions['com.ogeui'].css = value;
    }
    return {
      $type: 'color',
      $value: dtcgColor(color),
      $extensions: extensions,
    };
  }
  return null;
}

/** The DTCG `tokens.json` (light / dark / high-contrast groups). */
export function buildDtcg(model) {
  const derived = new Set(
    model.base.filter((t) => t.derived).map((t) => t.name),
  );
  const notes = new Map(
    model.base.filter((t) => t.note).map((t) => [t.name, t.note]),
  );
  /** @type {Record<string, unknown>} */
  const out = {
    $description:
      'OGE UI design tokens in the Design Tokens Community Group format (2025.10). ' +
      'Generated from packages/grid/src/lib/styles/_tokens.scss and themes/*.css by ' +
      '`nx run docs-tools:llms` — do not edit. Each token maps to the CSS custom ' +
      'property in $extensions["com.ogeui"].cssVariable; computed tints carry their CSS ' +
      'expression in $extensions["com.ogeui"].css. https://www.ogeui.com/getting-started/tokens',
  };
  for (const group of DTCG_GROUPS) {
    const map = group.theme ? themeMap(model, group.theme) : baseMap(model);
    /** @type {Record<string, unknown>} */
    const tokens = { $description: group.description };
    for (const [name, value] of map) {
      const token = dtcgToken(name, value, map, group.id, derived.has(name));
      if (!token) continue;
      const note = notes.get(name);
      tokens[name.replace(/^--oge-/, '')] = note
        ? { $description: note, ...token }
        : token;
    }
    out[group.id] = tokens;
  }
  return out;
}

/** The three artifacts as file contents (stable, LF, trailing newline). */
export function buildTokenArtifacts(workspaceRoot) {
  const model = readTokenModel(workspaceRoot);
  const json = (data) => `${JSON.stringify(data, null, 2)}\n`;
  return {
    model,
    reference: json(buildReferenceData(model)),
    presets: json(buildPresets(model)),
    dtcg: json(buildDtcg(model)),
  };
}
