/**
 * OGE UI design tokens ↔ Figma variables (P-8).
 *
 * `ogeTokensToFigma` turns the DTCG `tokens.json` that `@oge-ui/core` ships
 * into one variable collection, "OGE UI", with a Light, a Dark and a High
 * contrast mode. Colours stay colours, sizes and durations become numbers,
 * aliases stay aliases, and every variable carries its CSS custom property as
 * the Web code syntax, so Dev Mode shows `var(--oge-…)`.
 *
 * `ogeFigmaToCss` goes the other way: the collection a designer edited, as
 * the plugin exports it, becomes a stylesheet of `--oge-*` overrides per
 * mode — a theme an application loads after the suite's own.
 */

/** The three modes, in collection order. */
export const OGE_FIGMA_MODES = ['Light', 'Dark', 'High contrast'] as const;
export type OgeFigmaMode = (typeof OGE_FIGMA_MODES)[number];

/** The collection's name in Figma. */
export const OGE_FIGMA_COLLECTION = 'OGE UI';

const MODE_KEYS: Record<OgeFigmaMode, string> = {
  Light: 'light',
  Dark: 'dark',
  'High contrast': 'high-contrast',
};

export type OgeFigmaVariableType = 'COLOR' | 'FLOAT' | 'STRING';

export interface OgeFigmaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface OgeFigmaAlias {
  readonly type: 'VARIABLE_ALIAS';
  /** The aliased variable's name in the same collection. */
  readonly name: string;
}

export type OgeFigmaValue = OgeFigmaColor | number | string | OgeFigmaAlias;

/** One Figma variable to create or update. */
export interface OgeFigmaVariable {
  /** Slash-grouped name (`color/bg`, `size/cell-padding-x`). */
  readonly name: string;
  readonly type: OgeFigmaVariableType;
  readonly description: string;
  /** The CSS custom property, `--oge-bg`. */
  readonly cssVariable: string;
  /** Figma's variable scopes (where the picker offers it). */
  readonly scopes: readonly string[];
  readonly values: Readonly<Record<OgeFigmaMode, OgeFigmaValue>>;
}

export interface OgeFigmaCollection {
  readonly name: string;
  readonly modes: readonly OgeFigmaMode[];
  readonly variables: readonly OgeFigmaVariable[];
}

interface DtcgToken {
  readonly $type?: string;
  readonly $value: unknown;
  readonly $description?: string;
  readonly $extensions?: {
    readonly 'com.ogeui'?: {
      readonly cssVariable?: string;
      readonly css?: string;
    };
  };
}

type DtcgTheme = Readonly<Record<string, DtcgToken | string>>;

/** The parts of `tokens.json` the converter reads. */
export interface OgeDtcgTokens {
  readonly light: DtcgTheme;
  readonly dark: DtcgTheme;
  readonly 'high-contrast': DtcgTheme;
}

const GROUPS: Record<string, string> = {
  color: 'color',
  dimension: 'size',
  number: 'number',
  duration: 'motion',
  cubicBezier: 'motion',
  fontFamily: 'font',
  shadow: 'shadow',
};

const isToken = (value: unknown): value is DtcgToken =>
  typeof value === 'object' && value !== null && '$value' in value;

/** Where a variable of this kind belongs in Figma's pickers. */
function scopesOf(type: string, key: string): string[] {
  if (type === 'color') {
    if (
      /(^|-)(text|color|muted|header-color)($|-)/.test(key) &&
      !/bg/.test(key)
    ) {
      return ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'];
    }
    if (/border|stroke|ring/.test(key)) return ['STROKE_COLOR', 'SHAPE_FILL'];
    if (/shadow/.test(key)) return ['EFFECT_COLOR'];
    return ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR', 'TEXT_FILL'];
  }
  if (type === 'dimension') {
    if (/radius/.test(key)) return ['CORNER_RADIUS'];
    if (/padding|gap|spacing|margin/.test(key)) return ['GAP'];
    if (/width|height|size/.test(key)) return ['WIDTH_HEIGHT'];
    if (/font-size/.test(key)) return ['FONT_SIZE'];
    return ['ALL_SCOPES'];
  }
  if (type === 'fontFamily') return ['FONT_FAMILY'];
  return ['ALL_SCOPES'];
}

const round = (n: number) => Math.round(n * 10_000) / 10_000;

function cssColor(value: {
  components?: readonly number[];
  alpha?: number;
  hex?: string;
}): string {
  const alpha = value.alpha ?? 1;
  if (value.hex && alpha === 1) return value.hex;
  const [r = 0, g = 0, b = 0] = value.components ?? [];
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)} / ${round(alpha)})`;
}

function shadowCss(value: unknown): string {
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((s) => {
      const shadow = s as {
        color: { components?: number[]; alpha?: number; hex?: string };
        offsetX: { value: number; unit: string };
        offsetY: { value: number; unit: string };
        blur: { value: number; unit: string };
        spread: { value: number; unit: string };
        inset?: boolean;
      };
      const d = (v: { value: number; unit: string }) => `${v.value}${v.unit}`;
      return `${shadow.inset ? 'inset ' : ''}${d(shadow.offsetX)} ${d(shadow.offsetY)} ${d(shadow.blur)} ${d(shadow.spread)} ${cssColor(shadow.color)}`;
    })
    .join(', ');
}

/** A token's value in one mode, as Figma stores it. */
function figmaValue(
  token: DtcgToken,
  nameOf: (key: string) => string | undefined,
): { type: OgeFigmaVariableType; value: OgeFigmaValue } {
  const type = token.$type ?? 'color';
  const raw = token.$value;
  if (typeof raw === 'string' && /^\{[^}]+\}$/.test(raw)) {
    const target = raw.slice(1, -1).split('.').slice(1).join('.');
    const name = nameOf(target);
    if (name) {
      return {
        type:
          type === 'color'
            ? 'COLOR'
            : type === 'dimension' || type === 'number' || type === 'duration'
              ? 'FLOAT'
              : 'STRING',
        value: { type: 'VARIABLE_ALIAS', name },
      };
    }
    throw new Error(`Token alias ${raw} points at no token`);
  }
  switch (type) {
    case 'color': {
      const color = raw as { components?: readonly number[]; alpha?: number };
      const [r = 0, g = 0, b = 0] = color.components ?? [];
      return {
        type: 'COLOR',
        value: {
          r: round(r),
          g: round(g),
          b: round(b),
          a: round(color.alpha ?? 1),
        },
      };
    }
    case 'dimension':
    case 'duration':
      return { type: 'FLOAT', value: (raw as { value: number }).value };
    case 'number':
      return { type: 'FLOAT', value: Number(raw) };
    case 'cubicBezier':
      return {
        type: 'STRING',
        value: `cubic-bezier(${(raw as number[]).join(', ')})`,
      };
    case 'fontFamily':
      return {
        type: 'STRING',
        value: (Array.isArray(raw) ? raw : [raw])
          .map((f) => (/\s/.test(String(f)) ? `"${f}"` : String(f)))
          .join(', '),
      };
    case 'shadow':
      return { type: 'STRING', value: shadowCss(raw) };
    default:
      return { type: 'STRING', value: String(raw) };
  }
}

/** The "OGE UI" collection for `tokens.json`. */
export function ogeTokensToFigma(tokens: OgeDtcgTokens): OgeFigmaCollection {
  const light = tokens.light;
  const keys = Object.keys(light).filter(
    (k) => !k.startsWith('$') && isToken(light[k]),
  );
  const nameOf = (key: string) => {
    const token = light[key];
    return isToken(token)
      ? `${GROUPS[token.$type ?? 'color'] ?? 'other'}/${key}`
      : undefined;
  };
  const variables = keys.map((key): OgeFigmaVariable => {
    const base = light[key] as DtcgToken;
    const values = {} as Record<OgeFigmaMode, OgeFigmaValue>;
    let type: OgeFigmaVariableType = 'STRING';
    for (const mode of OGE_FIGMA_MODES) {
      const token = tokens[MODE_KEYS[mode] as keyof OgeDtcgTokens][key];
      const converted = figmaValue(isToken(token) ? token : base, nameOf);
      values[mode] = converted.value;
      type = converted.type;
    }
    const css = base.$extensions?.['com.ogeui']?.css;
    return {
      name: nameOf(key) as string,
      type,
      description: [base.$description, css ? `CSS: ${css}` : '']
        .filter(Boolean)
        .join(' — '),
      cssVariable:
        base.$extensions?.['com.ogeui']?.cssVariable ?? `--oge-${key}`,
      scopes: scopesOf(base.$type ?? 'color', key),
      values,
    };
  });
  return { name: OGE_FIGMA_COLLECTION, modes: [...OGE_FIGMA_MODES], variables };
}

/** One variable as the plugin exports it from Figma. */
export interface OgeFigmaExportedVariable {
  readonly name: string;
  readonly type: OgeFigmaVariableType | 'BOOLEAN';
  readonly cssVariable?: string;
  readonly values: Readonly<Record<string, OgeFigmaValue | boolean>>;
}

/** Where each mode's overrides go. */
export interface OgeFigmaCssOptions {
  readonly selectors?: Partial<Record<OgeFigmaMode, string>>;
  /** Only variables whose value differs from these defaults (the shipped collection). */
  readonly baseline?: OgeFigmaCollection;
}

const DEFAULT_SELECTORS: Record<OgeFigmaMode, string> = {
  Light: ':root',
  Dark: ".dark, [data-theme='dark']",
  'High contrast': "[data-theme='high-contrast']",
};

function cssValue(
  variable: OgeFigmaExportedVariable,
  value: OgeFigmaValue | boolean,
  cssVariableOf: (name: string) => string | undefined,
): string | null {
  if (typeof value === 'object' && value !== null && 'type' in value) {
    const target = cssVariableOf(value.name);
    return target ? `var(${target})` : null;
  }
  if (typeof value === 'object' && value !== null) {
    const { r, g, b, a } = value;
    const hex = (n: number) =>
      Math.round(n * 255)
        .toString(16)
        .padStart(2, '0');
    return a >= 1
      ? `#${hex(r)}${hex(g)}${hex(b)}`
      : `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)} / ${round(a)})`;
  }
  if (typeof value === 'number') {
    if (variable.name.startsWith('size/')) return `${value}px`;
    if (/^motion\/.*duration/.test(variable.name)) return `${value}ms`;
    return String(value);
  }
  if (typeof value === 'boolean') return value ? '1' : '0';
  return value;
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * The exported collection as `--oge-*` overrides: one rule per mode, and with
 * a `baseline` only the values a designer changed.
 */
export function ogeFigmaToCss(
  variables: readonly OgeFigmaExportedVariable[],
  options: OgeFigmaCssOptions = {},
): string {
  const selectors = { ...DEFAULT_SELECTORS, ...options.selectors };
  const byName = new Map(variables.map((v) => [v.name, v]));
  const baseline = new Map(options.baseline?.variables.map((v) => [v.name, v]));
  const cssVariableOf = (name: string) =>
    byName.get(name)?.cssVariable ?? baseline.get(name)?.cssVariable;
  const blocks: string[] = [];
  for (const mode of OGE_FIGMA_MODES) {
    const lines: string[] = [];
    for (const variable of variables) {
      const property =
        variable.cssVariable ?? baseline.get(variable.name)?.cssVariable;
      if (!property || !(mode in variable.values)) continue;
      const value = variable.values[mode];
      const shipped = baseline.get(variable.name)?.values[mode];
      if (options.baseline && shipped !== undefined && same(shipped, value))
        continue;
      const css = cssValue(variable, value, cssVariableOf);
      if (css !== null) lines.push(`  ${property}: ${css};`);
    }
    if (lines.length)
      blocks.push(`${selectors[mode]} {\n${lines.join('\n')}\n}`);
  }
  return blocks.length
    ? `/* OGE UI theme exported from Figma — load after the suite's styles */\n${blocks.join('\n\n')}\n`
    : '';
}
