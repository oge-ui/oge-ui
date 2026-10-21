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

/**
 * Lightens or darkens an `RRGGBB` colour the way SpreadsheetML's `tint` does
 * (ECMA-376 §18.8.19): in HLS space, a negative tint scales the luminance
 * down (`L × (1 + tint)`), a positive one moves it towards white
 * (`L × (1 − tint) + tint`). Returns `RRGGBB`.
 *
 * Excel's own integer rounding is not published; this, the spec's formula,
 * lands within 2/255 per channel of every colour Excel's theme picker shows
 * (checked against 50 of them) — below what a screen can show apart. The
 * writer keeps the `tint` itself, so a round trip loses nothing.
 */
export function ogeApplyTint(hex: string, tint: number): string {
  const rgb = hexOf(hex);
  if (rgb === null) return hex;
  const t = Math.max(-1, Math.min(1, tint));
  const r = parseInt(rgb.slice(0, 2), 16) / 255;
  const g = parseInt(rgb.slice(2, 4), 16) / 255;
  const b = parseInt(rgb.slice(4, 6), 16) / 255;
  const [h, l, s] = rgbToHls(r, g, b);
  const lum = t < 0 ? l * (1 + t) : l * (1 - t) + t;
  const [r2, g2, b2] = hlsToRgb(h, lum, s);
  return [r2, g2, b2]
    .map((channel) =>
      Math.round(Math.max(0, Math.min(1, channel)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase();
}

/** RGB (0–1) → hue (0–1), lightness, saturation. */
function rgbToHls(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, l, 0];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, l, s];
}

function hlsToRgb(h: number, l: number, s: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hueToRgb(p, q, h + 1 / 3),
    hueToRgb(p, q, h),
    hueToRgb(p, q, h - 1 / 3),
  ];
}

function hueToRgb(p: number, q: number, t: number): number {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}
