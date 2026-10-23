/**
 * Table styles ready to apply: a workbook's own (`tableStyles`, whose
 * elements point at its differential formats) or one of Excel's 60 built-in
 * styles, which files only name and `table-styles-data.ts` holds as Excel
 * itself defines them (read through COM).
 */
import type { OgeColor } from '../color/color';
import type { OgeBorder, OgeBorderStyle, OgeCellStyle, OgeFont } from './style';
import type { OgeTableStyle, OgeTableStyleElementType } from './table';
import { OGE_TABLE_STYLES_DATA } from './table-styles-data';

/** One element of a table style: what it formats with, and its stripe size. */
export interface OgeTableStyleFormat {
  /** A differential format: only what it sets (fill, font, borders). */
  readonly format: OgeCellStyle;
  /** Rows or columns per stripe, 1–9. */
  readonly size: number;
}

/** A table style's elements by type; a type it leaves out formats nothing. */
export type OgeTableStyleFormats = Readonly<
  Partial<Record<OgeTableStyleElementType, OgeTableStyleFormat>>
>;

/** Every element type a table style may format. */
export const OGE_TABLE_STYLE_ELEMENT_TYPES: readonly OgeTableStyleElementType[] =
  [
    'wholeTable',
    'headerRow',
    'totalRow',
    'firstColumn',
    'lastColumn',
    'firstRowStripe',
    'secondRowStripe',
    'firstColumnStripe',
    'secondColumnStripe',
    'firstHeaderCell',
    'lastHeaderCell',
    'firstTotalCell',
    'lastTotalCell',
  ];

/** The names of Excel's built-in table styles, light, medium and dark. */
export const OGE_BUILTIN_TABLE_STYLE_NAMES: readonly string[] = Object.keys(
  OGE_TABLE_STYLES_DATA,
);

const ELEMENTS: Readonly<Record<string, OgeTableStyleElementType>> = {
  w: 'wholeTable',
  h: 'headerRow',
  t: 'totalRow',
  f: 'firstColumn',
  l: 'lastColumn',
  r1: 'firstRowStripe',
  r2: 'secondRowStripe',
  c1: 'firstColumnStripe',
  c2: 'secondColumnStripe',
  fh: 'firstHeaderCell',
  lh: 'lastHeaderCell',
  ft: 'firstTotalCell',
  lt: 'lastTotalCell',
};

const EDGES: Readonly<Record<string, keyof OgeBorder>> = {
  L: 'left',
  R: 'right',
  T: 'top',
  B: 'bottom',
  V: 'vertical',
  H: 'horizontal',
};

/** The border styles the built-in styles use. */
const BORDER_STYLES: Readonly<Record<string, OgeBorderStyle>> = {
  t: 'thin',
  m: 'medium',
  k: 'thick',
  d: 'double',
};

/** `4+40` → accent 1 lighter by 40%: Excel's tints are 16-bit fractions cut from two decimals. */
function colorOf(text: string): OgeColor {
  const sign = text.search(/[+-]/);
  if (sign < 0) return { theme: Number(text) };
  const hundredths = Number(text.slice(sign));
  return {
    theme: Number(text.slice(0, sign)),
    tint: Math.trunc((hundredths * 32767) / 100) / 32767,
  };
}

/** One element's tokens → its differential format (built-in stripes are one row or column). */
function decodeElement(tokens: string): OgeTableStyleFormat {
  const font: { -readonly [K in keyof OgeFont]: OgeFont[K] } = {};
  const border: { -readonly [K in keyof OgeBorder]: OgeBorder[K] } = {};
  let fill: OgeCellStyle['fill'];
  for (const token of tokens.split(',')) {
    const head = token[0];
    const rest = token.slice(1);
    if (head === 'F')
      fill = { type: 'pattern', pattern: 'solid', fgColor: colorOf(rest) };
    else if (head === 'c') font.color = colorOf(rest);
    else if (head === 'b') font.bold = true;
    else
      (border as Record<string, unknown>)[EDGES[head]] = {
        style: BORDER_STYLES[rest[0]],
        color: colorOf(rest.slice(1)),
      };
  }
  return {
    format: {
      ...(fill ? { fill } : {}),
      ...(Object.keys(font).length ? { font } : {}),
      ...(Object.keys(border).length ? { border } : {}),
    },
    size: 1,
  };
}

const builtins = new Map<string, OgeTableStyleFormats>();

/** One of Excel's built-in table styles (`TableStyleMedium2`), or `undefined`. */
export function ogeBuiltinTableStyle(
  name: string,
): OgeTableStyleFormats | undefined {
  const known = builtins.get(name);
  if (known) return known;
  const data = Object.prototype.hasOwnProperty.call(OGE_TABLE_STYLES_DATA, name)
    ? OGE_TABLE_STYLES_DATA[name]
    : undefined;
  if (data === undefined) return undefined;
  const formats: Partial<
    Record<OgeTableStyleElementType, OgeTableStyleFormat>
  > = {};
  for (const part of data.split(';')) {
    const colon = part.indexOf(':');
    const type = ELEMENTS[part.slice(0, colon)];
    if (type) formats[type] = decodeElement(part.slice(colon + 1));
  }
  builtins.set(name, formats);
  return formats;
}

/**
 * A table style by name, as a table shows it: the workbook's own style of
 * that name (one usable on tables), else Excel's built-in one; `undefined`
 * for a name neither knows.
 */
export function ogeTableStyleFormats(
  workbook: {
    readonly tableStyles: readonly OgeTableStyle[];
    readonly dxfs: readonly OgeCellStyle[];
  },
  name: string,
): OgeTableStyleFormats | undefined {
  const own = workbook.tableStyles.find(
    (style) => style.name === name && style.table,
  );
  if (!own) return ogeBuiltinTableStyle(name);
  const formats: Partial<
    Record<OgeTableStyleElementType, OgeTableStyleFormat>
  > = {};
  for (const element of own.elements) {
    const type = element.type as OgeTableStyleElementType;
    if (!OGE_TABLE_STYLE_ELEMENT_TYPES.includes(type)) continue;
    formats[type] = {
      format:
        (element.dxf !== undefined ? workbook.dxfs[element.dxf] : undefined) ??
        {},
      size: element.size ?? 1,
    };
  }
  return formats;
}
