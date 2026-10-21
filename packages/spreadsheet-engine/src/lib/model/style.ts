/**
 * Cell styles and the registry that interns them.
 *
 * A workbook has few distinct styles and many styled cells, so cells hold a
 * style **id** and the registry holds each distinct style once — the shape of
 * `styles.xml`'s `cellXfs`, and what keeps a million styled cells cheap.
 * Interning is by value: two equal styles, built in any key order, get the
 * same id. Id 0 is the default style (`{}`): everything inherited from the
 * workbook's Normal style.
 */
import type { OgeColor } from '../color/color';

/** Underline kinds (`u/@val`). */
export type OgeUnderline =
  'single' | 'double' | 'singleAccounting' | 'doubleAccounting';

/** A font — every field optional, so it also serves as a patch. */
export interface OgeFont {
  readonly name?: string;
  /** Size in points. */
  readonly size?: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: OgeUnderline;
  readonly strike?: boolean;
  readonly color?: OgeColor;
  readonly vertAlign?: 'superscript' | 'subscript';
  /** The theme font the name came from (`scheme`): headings or body. */
  readonly scheme?: 'major' | 'minor';
  /** Font family class (`family/@val`: 1 roman, 2 swiss, 3 modern, …). */
  readonly family?: number;
  readonly charset?: number;
  readonly outline?: boolean;
  readonly shadow?: boolean;
}

/** Pattern fill kinds (`patternFill/@patternType`). */
export type OgePatternType =
  | 'none'
  | 'solid'
  | 'mediumGray'
  | 'darkGray'
  | 'lightGray'
  | 'darkHorizontal'
  | 'darkVertical'
  | 'darkDown'
  | 'darkUp'
  | 'darkGrid'
  | 'darkTrellis'
  | 'lightHorizontal'
  | 'lightVertical'
  | 'lightDown'
  | 'lightUp'
  | 'lightGrid'
  | 'lightTrellis'
  | 'gray125'
  | 'gray0625';

/** A pattern fill. A solid fill paints `fgColor`. */
export interface OgePatternFill {
  readonly type: 'pattern';
  readonly pattern: OgePatternType;
  readonly fgColor?: OgeColor;
  readonly bgColor?: OgeColor;
}

/** One stop of a gradient fill, at `position` 0–1. */
export interface OgeGradientStop {
  readonly position: number;
  readonly color: OgeColor;
}

/** A gradient fill: linear at `degree`, or a path gradient between edge offsets. */
export interface OgeGradientFill {
  readonly type: 'gradient';
  readonly gradient: 'linear' | 'path';
  readonly degree?: number;
  readonly left?: number;
  readonly right?: number;
  readonly top?: number;
  readonly bottom?: number;
  readonly stops: readonly OgeGradientStop[];
}

/** A cell fill. */
export type OgeFill = OgePatternFill | OgeGradientFill;

/** Border line styles (`left/@style` …). */
export type OgeBorderStyle =
  | 'thin'
  | 'medium'
  | 'thick'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'hair'
  | 'mediumDashed'
  | 'dashDot'
  | 'mediumDashDot'
  | 'dashDotDot'
  | 'mediumDashDotDot'
  | 'slantDashDot';

/** One edge of a border. */
export interface OgeBorderEdge {
  readonly style: OgeBorderStyle;
  readonly color?: OgeColor;
}

/** A cell's borders. The diagonal edge is drawn up, down or both. */
export interface OgeBorder {
  readonly left?: OgeBorderEdge;
  readonly right?: OgeBorderEdge;
  readonly top?: OgeBorderEdge;
  readonly bottom?: OgeBorderEdge;
  readonly diagonal?: OgeBorderEdge;
  readonly diagonalUp?: boolean;
  readonly diagonalDown?: boolean;
}

/** Horizontal alignment; `'general'` aligns by value type (numbers right). */
export type OgeHorizontalAlignment =
  | 'general'
  | 'left'
  | 'center'
  | 'right'
  | 'fill'
  | 'justify'
  | 'centerContinuous'
  | 'distributed';

/** Vertical alignment; Excel's default is `'bottom'`. */
export type OgeVerticalAlignment =
  'top' | 'center' | 'bottom' | 'justify' | 'distributed';

/** Cell alignment. */
export interface OgeAlignment {
  readonly horizontal?: OgeHorizontalAlignment;
  readonly vertical?: OgeVerticalAlignment;
  readonly wrapText?: boolean;
  readonly shrinkToFit?: boolean;
  /** Indent level (each is three spaces of the Normal font). */
  readonly indent?: number;
  /** 0–90 counter-clockwise, 91–180 clockwise (90 + n), 255 stacked. */
  readonly textRotation?: number;
  readonly readingOrder?: 'context' | 'ltr' | 'rtl';
}

/** Protection flags; they bite only while the sheet is protected. */
export interface OgeProtection {
  /** Default `true`: a protected sheet refuses edits to the cell. */
  readonly locked?: boolean;
  /** Hide the formula while the sheet is protected. */
  readonly hidden?: boolean;
}

/** A complete cell style (one `cellXfs` entry). */
export interface OgeCellStyle {
  /** Excel number format code (`'#,##0.00'`); omitted = General. */
  readonly numberFormat?: string;
  /**
   * A built-in format id (0–163) the code came from. Some built-ins mean
   * "the reader's locale" (14 is the short date, 22 date and time), so a
   * renderer resolves them through its locale instead of `numberFormat`.
   */
  readonly numberFormatId?: number;
  readonly font?: OgeFont;
  readonly fill?: OgeFill;
  readonly border?: OgeBorder;
  readonly alignment?: OgeAlignment;
  readonly protection?: OgeProtection;
  /** The value was typed with a leading apostrophe (shown as text, kept as text). */
  readonly quotePrefix?: boolean;
}

/** The default style, id 0. */
export const OGE_DEFAULT_CELL_STYLE: OgeCellStyle = Object.freeze({});

/** Keys that would reach an object's prototype when assigned. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Drops `undefined` fields and empty objects, recursively, so equal styles
 * written differently compare equal. Arrays (gradient stops) keep their order.
 * Prototype keys are dropped: styles may come from untrusted state.
 */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value !== 'object' || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    if (UNSAFE_KEYS.has(key)) continue;
    const child = normalize((value as Record<string, unknown>)[key]);
    if (child === undefined) continue;
    if (
      typeof child === 'object' &&
      child !== null &&
      !Array.isArray(child) &&
      Object.keys(child).length === 0
    ) {
      continue;
    }
    out[key] = child;
  }
  return out;
}

/** A canonical key: keys sorted at every depth (normalize sorts them). */
function keyOf(normalized: unknown): string {
  return JSON.stringify(normalized);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Deep merge of style parts: `patch` wins, nested parts merge, `undefined` keeps. */
function mergeParts(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return base;
  if (
    typeof base !== 'object' ||
    base === null ||
    typeof patch !== 'object' ||
    patch === null ||
    Array.isArray(base) ||
    Array.isArray(patch)
  ) {
    return patch;
  }
  // a fill replaces a fill of another type outright
  const kind = (patch as { type?: unknown }).type;
  if (kind !== undefined && kind !== (base as { type?: unknown }).type)
    return patch;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    if (UNSAFE_KEYS.has(key)) continue;
    out[key] = mergeParts(out[key], value);
  }
  return out;
}

/**
 * The distinct cell styles of a workbook, each stored once and frozen.
 * Ids are stable for the registry's lifetime and dense from 0.
 */
export class OgeStyleRegistry {
  private readonly styles: OgeCellStyle[] = [OGE_DEFAULT_CELL_STYLE];
  private readonly ids = new Map<string, number>([[keyOf({}), 0]]);

  /** Number of distinct styles, the default included. */
  get size(): number {
    return this.styles.length;
  }

  /** The id of a style, adding it when it is new. */
  intern(style: OgeCellStyle): number {
    const normalized = normalize(style) as OgeCellStyle;
    const key = keyOf(normalized);
    const known = this.ids.get(key);
    if (known !== undefined) return known;
    const id = this.styles.length;
    this.styles.push(deepFreeze(normalized));
    this.ids.set(key, id);
    return id;
  }

  /** The style of an id; unknown ids read as the default style. */
  get(id: number | undefined): OgeCellStyle {
    return (id !== undefined && this.styles[id]) || OGE_DEFAULT_CELL_STYLE;
  }

  /**
   * The id of `id`'s style with `patch` merged in — what a formatting
   * command applies (`{ font: { bold: true } }` keeps the rest of the font).
   */
  merge(id: number | undefined, patch: OgeCellStyle): number {
    return this.intern(mergeParts(this.get(id), patch) as OgeCellStyle);
  }

  /** Every style by id (index = id). */
  all(): readonly OgeCellStyle[] {
    return this.styles;
  }
}
