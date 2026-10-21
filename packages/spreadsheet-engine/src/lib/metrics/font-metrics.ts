/**
 * Font metrics as Excel uses them for the grid: the maximum digit width
 * (MDW) behind every column width, and the height of a one-line row.
 *
 * Both are what Excel measured, not estimates: the table in
 * `font-metrics-data.ts` was captured from Excel (see `testing/README.md`)
 * for 26 common fonts at every pixel size 1–96. Measured on the way, and
 * applied here:
 *
 * - MDW and the row height depend on the font and its pixel em size,
 *   `round(points × 4 / 3)`, only;
 * - a column's padding is `2 × ceil(MDW / 4) + 1` px (5 px for Calibri 11);
 * - a column without a width is `ceil((8 × MDW + padding) / 8) × 8` px wide
 *   (64 px for Calibri 11) — `baseColWidth` replaces the 8 in the product;
 * - a wrapped row is `lines × row height` high.
 */
import { OGE_FONT_METRICS_DATA } from './font-metrics-data';

/** What the grid needs to know about a font. */
export interface OgeFontMetrics {
  /** Excel's maximum digit width, px at 96 dpi. */
  readonly maxDigitWidth: number;
  /** Height of a one-line row in this font, px. */
  readonly lineHeight: number;
  /** Whether the numbers come from Excel's measured table (else Calibri's, scaled). */
  readonly measured: boolean;
}

const MAX_PPEM = 96;
const decoded = new Map<string, readonly [Int16Array, Int16Array]>();

function decode(name: string): readonly [Int16Array, Int16Array] | undefined {
  const key = name.toLowerCase();
  const cached = decoded.get(key);
  if (cached) return cached;
  const data = OGE_FONT_METRICS_DATA[key];
  if (!data) return undefined;
  const table = data.map((encoded) => {
    const values = new Int16Array(MAX_PPEM);
    let value = 0;
    for (let i = 0; i < MAX_PPEM; i++) {
      const code = encoded.charCodeAt(i);
      // 'a'..'z' = −5..+20 ('f' is +0), 'A'..'Z' = −6..−31
      value += code >= 97 ? code - 102 : 59 - code;
      values[i] = value;
    }
    return values;
  }) as unknown as readonly [Int16Array, Int16Array];
  decoded.set(key, table);
  return table;
}

/** The pixel em size Excel renders a point size at (96 dpi). */
export function ogeFontPixelSize(points: number): number {
  return Math.max(1, Math.round((points * 4) / 3));
}

/**
 * Metrics of a font at a point size. Fonts outside the table use Calibri's
 * numbers (Excel's default face) — close for most sans-serif faces, and the
 * render layers may refine them by measuring.
 */
export function ogeFontMetrics(
  name: string | undefined,
  points: number,
): OgeFontMetrics {
  const ppem = ogeFontPixelSize(points);
  const known = name ? decode(name) : undefined;
  const table =
    known ?? (decode('calibri') as readonly [Int16Array, Int16Array]);
  if (ppem <= MAX_PPEM) {
    return {
      maxDigitWidth: table[0][ppem - 1],
      lineHeight: table[1][ppem - 1],
      measured: known !== undefined,
    };
  }
  // past the table (above 72 pt): scale the largest entry
  const scale = ppem / MAX_PPEM;
  return {
    maxDigitWidth: Math.round(table[0][MAX_PPEM - 1] * scale),
    lineHeight: Math.round(table[1][MAX_PPEM - 1] * scale),
    measured: false,
  };
}

/** Whether Excel's table knows a font. */
export function ogeHasFontMetrics(name: string): boolean {
  return OGE_FONT_METRICS_DATA[name.toLowerCase()] !== undefined;
}

/** A column's padding in px: two margins and the gridline (5 for MDW 7). */
export function ogeColumnPadding(maxDigitWidth: number): number {
  return 2 * Math.ceil(maxDigitWidth / 4) + 1;
}
