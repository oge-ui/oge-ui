/**
 * Cell styles resolved for painting: fonts with a CSS font stack, fills as
 * CSS backgrounds, border edges with their Excel precedence rank and dash
 * pattern, alignment with defaults applied. Resolved once per style id —
 * a workbook has few styles and many cells.
 */
import {
  resolveOgeColor,
  type OgeColor,
  type OgeColorContext,
} from '../color/color';
import {
  compileOgeNumberFormat,
  ogeBuiltinNumberFormat,
  type OgeNumberFormat,
} from '../format/number-format';
import {
  OGE_EN_US_FORMAT_LOCALE,
  type OgeFormatLocale,
} from '../format/format-locale';
import { ogeFontMetrics, ogeFontPixelSize } from '../metrics/font-metrics';
import type {
  OgeBorderEdge,
  OgeBorderStyle,
  OgeCellStyle,
  OgeFill,
  OgeFont,
  OgeHorizontalAlignment,
  OgeUnderline,
  OgeVerticalAlignment,
} from '../model/style';
import type { OgeWorkbook } from '../model/workbook';

/** A font ready to paint. Sizes are at 100% zoom. */
export interface OgePaintFont {
  /** The face Excel uses (a `scheme` font resolves to the theme's face). */
  readonly name: string;
  /** CSS `font-family`: the face, a metric-compatible substitute, a generic family. */
  readonly family: string;
  readonly sizePt: number;
  /** Whole CSS pixels, as Excel draws it: `round(pt × 4 / 3)` (15 px for 11 pt). */
  readonly sizePx: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline?: OgeUnderline;
  readonly strike: boolean;
  readonly vertAlign?: 'superscript' | 'subscript';
  /** `#RRGGBB`, or `null` for automatic (window text). */
  readonly color: string | null;
  /** CSS `font` shorthand, for measuring. */
  readonly css: string;
  /** Excel's maximum digit width for this font, px. */
  readonly maxDigitWidth: number;
  /** Height of one line of this font in a row, px. */
  readonly lineHeight: number;
  /** The model font it was resolved from (the Normal font merged with the style's). */
  readonly source: OgeFont;
}

/** A fill ready to paint. */
export interface OgePaintFill {
  /** CSS `background` value. */
  readonly css: string;
  /** One colour standing for the fill (forced colours, gridline hiding, copy). */
  readonly color: string;
  /**
   * A pattern fill's 8 × 8 tile as a CSS `url()` (an SVG data image), drawn
   * pixel for pixel; it repeats on the sheet's grid (see {@link ogePatternTile}).
   */
  readonly tile?: string;
}

/** One border edge ready to paint. */
export interface OgePaintEdge {
  readonly style: OgeBorderStyle;
  /** `#RRGGBB`, or `null` for automatic (window text). */
  readonly color: string | null;
  /** Line width, px. */
  readonly width: 1 | 2 | 3;
  /** Dash pattern, px on/off; empty for a solid line. `double` draws two lines. */
  readonly dash: readonly number[];
  /** Precedence against the neighbour's edge (higher wins; a tie goes right/down). */
  readonly rank: number;
}

/** A cell style resolved for painting. */
export interface OgeResolvedStyle {
  readonly id: number;
  readonly font: OgePaintFont;
  readonly fill: OgePaintFill | null;
  readonly top: OgePaintEdge | null;
  readonly right: OgePaintEdge | null;
  readonly bottom: OgePaintEdge | null;
  readonly left: OgePaintEdge | null;
  readonly diagonalUp: OgePaintEdge | null;
  readonly diagonalDown: OgePaintEdge | null;
  /** As stored; `general` is resolved per value when painting. */
  readonly horizontal: OgeHorizontalAlignment;
  readonly vertical: OgeVerticalAlignment;
  readonly wrap: boolean;
  readonly shrink: boolean;
  /** Indent level. */
  readonly indent: number;
  /** 0–180, or 255 for stacked letters. */
  readonly rotation: number;
  readonly readingOrder: 'context' | 'ltr' | 'rtl';
  /** The compiled number format; `null` for General. */
  readonly format: OgeNumberFormat | null;
  /** Built-in id 18/19: the locale's AM/PM markers show. */
  readonly localeMarkers: boolean;
  readonly quotePrefix: boolean;
  /** The formula is hidden while the sheet is protected. */
  readonly formulaHidden: boolean;
  /** Whether the style paints anything on an empty cell (fill or border). */
  readonly visibleWhenEmpty: boolean;
}

/**
 * Faces with a metric-compatible open substitute — what a browser on Linux
 * or macOS without Office uses, keeping widths and line breaks Excel's.
 */
const SUBSTITUTES: Readonly<Record<string, string>> = {
  calibri: 'Carlito',
  cambria: 'Caladea',
  arial: '"Liberation Sans", Arimo',
  helvetica: 'Arial, "Liberation Sans", Arimo',
  'times new roman': '"Liberation Serif", Tinos',
  'courier new': '"Liberation Mono", Cousine',
  'aptos narrow': '"Arial Narrow", "Liberation Sans Narrow"',
  aptos: '"Segoe UI", "Helvetica Neue"',
  'aptos display': '"Segoe UI", "Helvetica Neue"',
  'calibri light': 'Carlito',
};

const SERIF = new Set([
  'times new roman',
  'cambria',
  'georgia',
  'garamond',
  'book antiqua',
  'constantia',
]);
const MONO = new Set(['courier new', 'consolas', 'lucida console']);

/** CSS font stack for a face Excel names. */
export function ogeFontFamily(name: string): string {
  const key = name.toLowerCase();
  const quoted = `"${name.replace(/["\\]/g, '')}"`;
  const generic = SERIF.has(key)
    ? 'serif'
    : MONO.has(key)
      ? 'monospace'
      : 'sans-serif';
  const substitute = SUBSTITUTES[key];
  return substitute
    ? `${quoted}, ${substitute}, ${generic}`
    : `${quoted}, ${generic}`;
}

/** Measured precedence (ADR 0005 research): higher wins a shared edge. */
const RANK: Readonly<Record<OgeBorderStyle, number>> = {
  hair: 1,
  dashDotDot: 2,
  dashDot: 3,
  dotted: 4,
  dashed: 5,
  thin: 6,
  mediumDashDotDot: 7,
  slantDashDot: 8,
  mediumDashDot: 9,
  mediumDashed: 10,
  medium: 11,
  thick: 12,
  double: 13,
};

const WIDTH: Readonly<Record<OgeBorderStyle, 1 | 2 | 3>> = {
  hair: 1,
  thin: 1,
  dotted: 1,
  dashed: 1,
  dashDot: 1,
  dashDotDot: 1,
  medium: 2,
  mediumDashed: 2,
  mediumDashDot: 2,
  mediumDashDotDot: 2,
  slantDashDot: 2,
  thick: 3,
  double: 3,
};

/** Dash patterns read off Excel's own rendering (px on, px off …). */
const DASH: Readonly<Record<OgeBorderStyle, readonly number[]>> = {
  hair: [1, 1],
  thin: [],
  dotted: [2, 2],
  dashed: [3, 1],
  dashDot: [9, 3, 3, 3],
  dashDotDot: [9, 3, 3, 3, 3, 3],
  medium: [],
  mediumDashed: [9, 3],
  mediumDashDot: [9, 3, 3, 3],
  mediumDashDotDot: [9, 3, 3, 3, 3, 3],
  slantDashDot: [11, 1, 5, 1],
  thick: [],
  double: [],
};

/** The precedence rank of a border style. */
export function ogeBorderRank(style: OgeBorderStyle): number {
  return RANK[style];
}

/**
 * Pattern fills as CSS gradients: stripes for the line patterns, a fine
 * checker for the grey densities. No image URLs — nothing a strict
 * `img-src` policy would block.
 */
/**
 * Excel's pattern fills are 8 × 8 pixel bitmaps, measured on screen (Excel
 * 16.0): `1` is the foreground. A tile's rows start where the sheet's
 * top-left would sit in the grid window — the header sizes — so the
 * pattern stays put on the sheet as it scrolls, and does not scale with zoom.
 */
const PATTERN_MASKS: Readonly<Record<string, readonly string[]>> = {
  mediumGray: ['10101010', '01010101'],
  darkGray: ['11101110', '10111011'],
  lightGray: ['10001000', '00100010'],
  darkHorizontal: ['11111111', '11111111', '00000000', '00000000'],
  darkVertical: ['11001100'],
  darkDown: ['11001100', '01100110', '00110011', '10011001'],
  darkUp: ['00110011', '01100110', '11001100', '10011001'],
  darkGrid: ['10011001', '01100110', '01100110', '10011001'],
  darkTrellis: ['11111111', '01100110', '11111111', '10011001'],
  lightHorizontal: ['11111111', '00000000', '00000000', '00000000'],
  lightVertical: ['10001000'],
  lightDown: ['10001000', '01000100', '00100010', '00010001'],
  lightUp: ['00010001', '00100010', '01000100', '10001000'],
  lightGrid: ['11111111', '10001000', '10001000', '10001000'],
  lightTrellis: ['10001000', '01010101', '00100010', '01010101'],
  gray125: ['10001000', '00000000', '00100010', '00000000'],
  gray0625: ['10000000', '00000000', '00001000', '00000000'],
};

const tiles = new Map<string, string>();

/**
 * A pattern's 8 × 8 tile as a CSS `url()` of an SVG data image (the
 * documented CSP allows `img-src data:`; where it does not, the cell shows
 * the pattern's representative colour). `null` for an unknown pattern.
 */
export function ogePatternTile(
  pattern: string,
  fg: string,
  bg: string,
): string | null {
  const mask = Object.prototype.hasOwnProperty.call(PATTERN_MASKS, pattern)
    ? PATTERN_MASKS[pattern]
    : undefined;
  if (!mask) return null;
  const id = `${pattern}|${fg}|${bg}`;
  const known = tiles.get(id);
  if (known) return known;
  let path = '';
  for (let y = 0; y < 8; y++) {
    const row = mask[y % mask.length];
    for (let x = 0; x < 8;) {
      if (row[x] !== '1') {
        x++;
        continue;
      }
      let end = x;
      while (end < 8 && row[end] === '1') end++;
      path += `M${x} ${y}h${end - x}v1h${x - end}z`;
      x = end;
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' shape-rendering='crispEdges'><rect width='8' height='8' fill='${bg}'/><path fill='${fg}' d='${path}'/></svg>`;
  const tile = `url("data:image/svg+xml,${svg.replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
  tiles.set(id, tile);
  return tile;
}

function patternCss(pattern: string, fg: string, bg: string): string {
  const stripes = (angle: string, on: number, period: number) =>
    `repeating-linear-gradient(${angle}, ${fg} 0 ${on}px, ${bg} ${on}px ${period}px)`;
  const dots = (size: number, spot: number) =>
    `radial-gradient(${fg} ${spot}px, transparent ${spot + 0.01}px) 0 0 / ${size}px ${size}px, ${bg}`;
  switch (pattern) {
    case 'darkHorizontal':
      return stripes('to bottom', 2, 4);
    case 'lightHorizontal':
      return stripes('to bottom', 1, 4);
    case 'darkVertical':
      return stripes('to right', 2, 4);
    case 'lightVertical':
      return stripes('to right', 1, 4);
    case 'darkDown':
      return stripes('45deg', 2, 4);
    case 'lightDown':
      return stripes('45deg', 1, 4);
    case 'darkUp':
      return stripes('-45deg', 2, 4);
    case 'lightUp':
      return stripes('-45deg', 1, 4);
    case 'darkGrid':
      return `conic-gradient(${fg} 25%, ${bg} 0 50%, ${fg} 0 75%, ${bg} 0) 0 0 / 4px 4px`;
    case 'lightGrid':
      return `linear-gradient(${fg} 1px, transparent 1px) 0 0 / 4px 4px, linear-gradient(to right, ${fg} 1px, ${bg} 1px) 0 0 / 4px 4px`;
    case 'darkTrellis':
      return `repeating-linear-gradient(45deg, ${fg} 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, ${fg} 0 1px, ${bg} 1px 3px)`;
    case 'lightTrellis':
      return `repeating-linear-gradient(45deg, ${fg} 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, ${fg} 0 1px, ${bg} 1px 4px)`;
    case 'mediumGray':
      return `conic-gradient(${fg} 25%, ${bg} 0 50%, ${fg} 0 75%, ${bg} 0) 0 0 / 2px 2px`;
    case 'darkGray':
      return `conic-gradient(${bg} 25%, ${fg} 0) 0 0 / 2px 2px`;
    case 'lightGray':
      return dots(2, 0.6);
    case 'gray125':
      return dots(4, 0.7);
    case 'gray0625':
      return dots(6, 0.7);
    default:
      return fg;
  }
}

/** Mix two `#RRGGBB` colours (for a pattern's representative colour). */
function mix(a: string, b: string, weight: number): string {
  const channel = (hex: string, at: number) =>
    parseInt(hex.slice(at, at + 2), 16);
  let out = '#';
  for (const at of [1, 3, 5]) {
    const value = Math.round(
      channel(a, at) * weight + channel(b, at) * (1 - weight),
    );
    out += value.toString(16).padStart(2, '0').toUpperCase();
  }
  return out;
}

const DENSITY: Readonly<Record<string, number>> = {
  gray0625: 0.0625,
  gray125: 0.125,
  lightGray: 0.25,
  mediumGray: 0.5,
  darkGray: 0.75,
};

/** Options of {@link OgeStyleResolver}. */
export interface OgeStyleResolverOptions {
  /** Locale for built-in number formats (14, 22 …). Default en-US. */
  readonly locale?: OgeFormatLocale;
}

/** Resolves and caches the styles of one workbook. */
export class OgeStyleResolver {
  private readonly cache = new Map<number, OgeResolvedStyle>();
  private readonly fontCache = new Map<string, OgePaintFont>();
  readonly colors: OgeColorContext;
  readonly locale: OgeFormatLocale;
  /** The Normal style's font: what every style starts from. */
  readonly normalFont: OgePaintFont;

  constructor(
    readonly workbook: OgeWorkbook,
    options: OgeStyleResolverOptions = {},
  ) {
    this.colors = { theme: workbook.theme, indexed: workbook.indexedColors };
    this.locale = options.locale ?? OGE_EN_US_FORMAT_LOCALE;
    this.normalFont = this.font(undefined);
  }

  /** A colour as `#RRGGBB`; `auto` and unresolvable colours give `fallback`. */
  color(color: OgeColor | undefined, fallback: string | null): string | null {
    if (!color || color.auto) return fallback;
    // indexed 64/65 are the system foreground/background: automatic
    if (
      color.indexed === 64 &&
      color.theme === undefined &&
      color.rgb === undefined
    )
      return fallback;
    return resolveOgeColor(color, this.colors) ?? fallback;
  }

  /** The paint font for a font patch over the Normal font. */
  font(patch: OgeFont | undefined): OgePaintFont {
    const base = this.workbook.defaultFont;
    const merged: OgeFont = { ...base, ...patch };
    const key = JSON.stringify(merged);
    const known = this.fontCache.get(key);
    if (known) return known;
    // a font that names its face is not a theme font, whatever the Normal font is
    const scheme =
      patch?.name !== undefined && patch.scheme === undefined
        ? undefined
        : merged.scheme;
    const themed =
      scheme === 'minor'
        ? this.workbook.themeFonts.minor
        : scheme === 'major'
          ? this.workbook.themeFonts.major
          : undefined;
    const name = themed ?? merged.name ?? 'Calibri';
    const sizePt = merged.size && merged.size > 0 ? merged.size : 11;
    // GDI rounds the em height to whole pixels: Calibri 11 draws at 15 px, not 14.67
    const sizePx = ogeFontPixelSize(sizePt);
    const bold = merged.bold === true;
    const italic = merged.italic === true;
    const family = ogeFontFamily(name);
    // vertAlign shrinks the glyphs; the row keeps the full size
    const drawn = merged.vertAlign
      ? Math.round(sizePx * 0.66 * 100) / 100
      : sizePx;
    const metrics = ogeFontMetrics(name, sizePt);
    const font: OgePaintFont = {
      name,
      family,
      sizePt,
      sizePx,
      bold,
      italic,
      ...(merged.underline ? { underline: merged.underline } : {}),
      strike: merged.strike === true,
      ...(merged.vertAlign ? { vertAlign: merged.vertAlign } : {}),
      color: this.color(merged.color, null),
      css: `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${drawn}px ${family}`,
      maxDigitWidth: metrics.maxDigitWidth,
      lineHeight: metrics.lineHeight,
      source: merged,
    };
    this.fontCache.set(key, font);
    return font;
  }

  /** The paint fill of a fill; `null` for none. */
  fill(fill: OgeFill | undefined): OgePaintFill | null {
    if (!fill) return null;
    if (fill.type === 'gradient') {
      const stops = fill.stops
        .map(
          (stop) =>
            `${this.color(stop.color, '#FFFFFF')} ${Math.round(stop.position * 1000) / 10}%`,
        )
        .join(', ');
      const first = this.color(fill.stops[0]?.color, '#FFFFFF') as string;
      if (fill.gradient === 'path') {
        const x = Math.round(
          (((fill.left ?? 0) + (1 - (fill.right ?? 0))) / 2) * 100,
        );
        const y = Math.round(
          (((fill.top ?? 0) + (1 - (fill.bottom ?? 0))) / 2) * 100,
        );
        return {
          css: `radial-gradient(farthest-corner at ${x}% ${y}%, ${stops})`,
          color: first,
        };
      }
      return {
        css: `linear-gradient(${90 + (fill.degree ?? 0)}deg, ${stops})`,
        color: first,
      };
    }
    if (fill.pattern === 'none') return null;
    // a solid fill paints fgColor; patterns draw fgColor over bgColor
    const fg = this.color(fill.fgColor, '#000000') as string;
    if (fill.pattern === 'solid') return { css: fg, color: fg };
    const bg = this.color(fill.bgColor, '#FFFFFF') as string;
    const density = DENSITY[fill.pattern] ?? 0.5;
    const tile = ogePatternTile(fill.pattern, fg, bg);
    return {
      css: patternCss(fill.pattern, fg, bg),
      color: mix(fg, bg, density),
      ...(tile ? { tile } : {}),
    };
  }

  edge(edge: OgeBorderEdge | undefined): OgePaintEdge | null {
    if (!edge) return null;
    return {
      style: edge.style,
      color: this.color(edge.color, null),
      width: WIDTH[edge.style],
      dash: DASH[edge.style],
      rank: RANK[edge.style],
    };
  }

  /** The number format of a style, built-ins resolved through the locale. */
  numberFormat(style: OgeCellStyle): OgeNumberFormat | null {
    const id = style.numberFormatId;
    const code =
      id !== undefined &&
      (this.locale.builtins?.[id] !== undefined ||
        id === 14 ||
        id === 22 ||
        style.numberFormat === undefined)
        ? ogeBuiltinNumberFormat(id, this.locale)
        : style.numberFormat;
    if (code === undefined || code === 'General') return null;
    return compileOgeNumberFormat(code);
  }

  /** The resolved style of an id. */
  get(id: number | undefined): OgeResolvedStyle {
    const key = id ?? 0;
    const known = this.cache.get(key);
    if (known) return known;
    const style = this.workbook.styles.get(key);
    const resolved = this.resolve(key, style);
    this.cache.set(key, resolved);
    return resolved;
  }

  /** A style merged with a differential format (a conditional format's dxf). */
  withPatch(id: number | undefined, patch: OgeCellStyle): OgeResolvedStyle {
    const base = this.workbook.styles.get(id ?? 0);
    const font = patch.font ? { ...base.font, ...patch.font } : base.font;
    return this.resolve(-1, {
      ...base,
      ...patch,
      ...(font ? { font } : {}),
      border: patch.border ? { ...base.border, ...patch.border } : base.border,
    });
  }

  private resolve(id: number, style: OgeCellStyle): OgeResolvedStyle {
    const alignment = style.alignment ?? {};
    const border = style.border ?? {};
    const fill = this.fill(style.fill);
    const top = this.edge(border.top);
    const right = this.edge(border.right);
    const bottom = this.edge(border.bottom);
    const left = this.edge(border.left);
    const diagonal = border.diagonal;
    const diagonalUp = border.diagonalUp ? this.edge(diagonal) : null;
    const diagonalDown = border.diagonalDown ? this.edge(diagonal) : null;
    return {
      id,
      font: this.font(style.font),
      fill,
      top,
      right,
      bottom,
      left,
      diagonalUp,
      diagonalDown,
      horizontal: alignment.horizontal ?? 'general',
      vertical: alignment.vertical ?? 'bottom',
      wrap:
        alignment.wrapText === true ||
        alignment.horizontal === 'justify' ||
        alignment.horizontal === 'distributed' ||
        alignment.vertical === 'justify' ||
        alignment.vertical === 'distributed',
      shrink: alignment.shrinkToFit === true && alignment.wrapText !== true,
      indent: alignment.indent ?? 0,
      rotation: alignment.textRotation ?? 0,
      readingOrder: alignment.readingOrder ?? 'context',
      format: this.numberFormat(style),
      localeMarkers: style.numberFormatId === 18 || style.numberFormatId === 19,
      quotePrefix: style.quotePrefix === true,
      formulaHidden: style.protection?.hidden === true,
      visibleWhenEmpty: !!(
        fill ||
        top ||
        right ||
        bottom ||
        left ||
        diagonalUp ||
        diagonalDown
      ),
    };
  }
}

/** The pixel em size of a paint font (what Excel's tables are keyed by). */
export function ogePaintFontPixelSize(font: OgePaintFont): number {
  return ogeFontPixelSize(font.sizePt);
}
