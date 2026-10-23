/**
 * SpreadsheetML colours: explicit ARGB, the legacy 64-entry indexed palette,
 * theme slots with a tint, and "automatic".
 *
 * A colour in `styles.xml` is one of `rgb="FFRRGGBB"`, `indexed="N"`,
 * `theme="N"` (each optionally with `tint="-0.25"`) or `auto="1"`. Resolving it
 * needs the workbook's theme (`xl/theme/theme1.xml`) and, rarely, a custom
 * indexed palette (`styles.xml` → `colors/indexedColors`). Everything here
 * returns `#RRGGBB`; Excel ignores the alpha byte when it paints cells.
 */

/** A colour as `styles.xml` states it. Exactly one source normally applies. */
export interface OgeColor {
  /** `RRGGBB` or `AARRGGBB` hex (`rgb` attribute). */
  readonly rgb?: string;
  /** Theme slot index (`theme` attribute) — see {@link OGE_THEME_COLOR_SLOTS}. */
  readonly theme?: number;
  /** Legacy palette index (`indexed` attribute), 0–65. */
  readonly indexed?: number;
  /** Lightens (> 0) or darkens (< 0) the colour, -1…1. */
  readonly tint?: number;
  /** "Automatic": the system window text or background, by context. */
  readonly auto?: boolean;
}

/** The twelve colour slots of an Office theme. */
export type OgeThemeColorSlot =
  | 'dk1'
  | 'lt1'
  | 'dk2'
  | 'lt2'
  | 'accent1'
  | 'accent2'
  | 'accent3'
  | 'accent4'
  | 'accent5'
  | 'accent6'
  | 'hlink'
  | 'folHlink';

/** A theme's colour scheme, each slot as `RRGGBB`. */
export type OgeThemeColors = Readonly<Record<OgeThemeColorSlot, string>>;

/**
 * Theme slot for each `theme="N"` index. Not the XML order of
 * `<a:clrScheme>`: SpreadsheetML swaps the first two pairs, so `theme="0"`
 * is `lt1` ("Background 1") and `theme="1"` is `dk1` ("Text 1").
 */
export const OGE_THEME_COLOR_SLOTS: readonly OgeThemeColorSlot[] = [
  'lt1',
  'dk1',
  'lt2',
  'dk2',
  'accent1',
  'accent2',
  'accent3',
  'accent4',
  'accent5',
  'accent6',
  'hlink',
  'folHlink',
];

/**
 * The "Office" theme colours of Excel 2013–2022 — what most workbooks in
 * circulation were saved with, and the fallback when a file has no theme part.
 */
export const OGE_OFFICE_THEME_COLORS: OgeThemeColors = {
  dk1: '000000',
  lt1: 'FFFFFF',
  dk2: '44546A',
  lt2: 'E7E6E6',
  accent1: '4472C4',
  accent2: 'ED7D31',
  accent3: 'A5A5A5',
  accent4: 'FFC000',
  accent5: '5B9BD5',
  accent6: '70AD47',
  hlink: '0563C1',
  folHlink: '954F72',
};

/**
 * The legacy indexed palette (ECMA-376 §18.8.27), `RRGGBB`. Indexes 64 and 65
 * are the system foreground and background — black and white here.
 */
// prettier-ignore
export const OGE_INDEXED_COLORS: readonly string[] = [
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080',
  '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF',
  '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696',
  '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333',
  '000000', 'FFFFFF',
];

/** Where a colour is resolved: the theme, a custom palette, the "auto" colour. */
export interface OgeColorContext {
  readonly theme?: OgeThemeColors;
  readonly indexed?: readonly string[];
  /** What `auto="1"` means here — text and borders: black; fills: white. */
  readonly auto?: string;
}

const HEX6 = /^[0-9A-Fa-f]{6}$/;
const HEX8 = /^[0-9A-Fa-f]{8}$/;

/** `RRGGBB` from `RRGGBB` / `AARRGGBB` hex, or `null`. */
function hexOf(text: string): string | null {
  if (HEX8.test(text)) return text.slice(2).toUpperCase();
  if (HEX6.test(text)) return text.toUpperCase();
  return null;
}

/**
 * `#RRGGBB` for a colour, tint applied, or `null` when it names nothing
 * resolvable (an empty element, an index past the palette).
 */
export function resolveOgeColor(
  color: OgeColor,
  context: OgeColorContext = {},
): string | null {
  let hex: string | null = null;
  if (color.rgb !== undefined) {
    hex = hexOf(color.rgb);
  } else if (color.theme !== undefined) {
    const slot = OGE_THEME_COLOR_SLOTS[color.theme];
    hex = slot ? (context.theme ?? OGE_OFFICE_THEME_COLORS)[slot] : null;
  } else if (color.indexed !== undefined) {
    const palette = context.indexed ?? OGE_INDEXED_COLORS;
    // a custom palette replaces 0–63 only; 64/65 stay the system colours
    const entry =
      palette[color.indexed] ?? OGE_INDEXED_COLORS[color.indexed] ?? null;
    hex = entry === null ? null : hexOf(entry);
  } else if (color.auto) {
    hex = hexOf(context.auto ?? '000000');
  }
  if (hex === null) return null;
  const tint = color.tint ?? 0;
  return `#${tint === 0 ? hex : ogeApplyTint(hex, tint)}`;
}

/** Windows' integer HLS: hue, lightness and saturation each 0–240. */
const HLS_MAX = 240;
const RGB_MAX = 255;

/**
 * Lightens or darkens an `RRGGBB` colour as Excel paints SpreadsheetML's
 * `tint` (ECMA-376 §18.8.19) — measured: all 190 colours Excel showed for 8
 * theme colours and 22 tints, read through COM. Excel works in Windows'
 * integer HLS (each 0–240, the RGB ↔ HLS conversion of Microsoft's KB 29240):
 * a negative tint scales the lightness down, `trunc(L × (1 + tint))`; a
 * positive one moves it towards white, `trunc(L × (1 − tint)) + 240 −
 * trunc(240 × (1 − tint))` — each part cut to a whole step. Returns `RRGGBB`.
 */
export function ogeApplyTint(hex: string, tint: number): string {
  const rgb = hexOf(hex);
  if (rgb === null) return hex;
  const t = Math.max(-1, Math.min(1, tint));
  const [h, l, s] = rgbToHls(
    parseInt(rgb.slice(0, 2), 16),
    parseInt(rgb.slice(2, 4), 16),
    parseInt(rgb.slice(4, 6), 16),
  );
  const lum =
    t < 0
      ? Math.trunc(l * (1 + t))
      : Math.trunc(l * (1 - t)) + HLS_MAX - Math.trunc(HLS_MAX * (1 - t));
  return hlsToRgb(h, Math.max(0, Math.min(HLS_MAX, lum)), s)
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/** Integer division as C does it (the operands are never negative here). */
const div = (a: number, b: number) => Math.trunc(a / b);

/** RGB (0–255) → hue, lightness, saturation (0–240), KB 29240's integer way. */
function rgbToHls(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = div((max + min) * HLS_MAX + RGB_MAX, 2 * RGB_MAX);
  // grey: no saturation; the hue is undefined (KB 29240 sets two thirds)
  if (max === min) return [div(HLS_MAX * 2, 3), l, 0];
  const sum = max + min;
  const s =
    l <= HLS_MAX / 2
      ? div((max - min) * HLS_MAX + div(sum, 2), sum)
      : div(
          (max - min) * HLS_MAX + div(2 * RGB_MAX - sum, 2),
          2 * RGB_MAX - sum,
        );
  const delta = (c: number) =>
    div((max - c) * (HLS_MAX / 6) + div(max - min, 2), max - min);
  let h =
    r === max
      ? delta(b) - delta(g)
      : g === max
        ? HLS_MAX / 3 + delta(r) - delta(b)
        : (2 * HLS_MAX) / 3 + delta(g) - delta(r);
  if (h < 0) h += HLS_MAX;
  if (h > HLS_MAX) h -= HLS_MAX;
  return [h, l, s];
}

/** Hue, lightness, saturation (0–240) → RGB (0–255), KB 29240's integer way. */
function hlsToRgb(h: number, l: number, s: number): [number, number, number] {
  // a grey rounds to the nearest level (measured: black lighter by 50% is 808080)
  if (s === 0) {
    const grey = div(l * RGB_MAX + HLS_MAX / 2, HLS_MAX);
    return [grey, grey, grey];
  }
  const high =
    l <= HLS_MAX / 2
      ? div(l * (HLS_MAX + s) + HLS_MAX / 2, HLS_MAX)
      : l + s - div(l * s + HLS_MAX / 2, HLS_MAX);
  const low = 2 * l - high;
  const channel = (hue: number) =>
    div(hueToRgb(low, high, hue) * RGB_MAX + HLS_MAX / 2, HLS_MAX);
  return [channel(h + HLS_MAX / 3), channel(h), channel(h - HLS_MAX / 3)];
}

function hueToRgb(low: number, high: number, hue: number): number {
  let x = hue;
  if (x < 0) x += HLS_MAX;
  if (x > HLS_MAX) x -= HLS_MAX;
  const sixth = HLS_MAX / 6;
  if (x < sixth) return low + div((high - low) * x + HLS_MAX / 12, sixth);
  if (x < HLS_MAX / 2) return high;
  if (x < (HLS_MAX * 2) / 3)
    return (
      low + div((high - low) * ((HLS_MAX * 2) / 3 - x) + HLS_MAX / 12, sixth)
    );
  return low;
}
