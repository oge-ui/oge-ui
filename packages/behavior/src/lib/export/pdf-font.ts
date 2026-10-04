/**
 * Unicode font support for every OGE PDF export (grid, tree list, pivot,
 * Gantt — both render layers). Framework-free and jsPDF-agnostic at runtime:
 * the document is typed structurally, so importing this from the main barrel
 * pulls neither `jspdf` nor `jspdf-autotable` into a bundle.
 */

/** The jsPDF calls the font registration needs. */
export interface OgePdfFontTarget {
  addFileToVFS(fileName: string, data: string): unknown;
  addFont(fileName: string, family: string, style: string): unknown;
  setFont(family: string, style?: string): unknown;
}

/** A TrueType face: the raw `.ttf` bytes or their base64 text. */
export type OgePdfFontData = ArrayBuffer | Uint8Array | string;

/**
 * A TrueType font embedded into the PDF. jsPDF's built-in fonts (Helvetica,
 * Times, Courier) only cover WinAnsi (cp1252), so text in Turkish (ğ ş ı İ),
 * Polish, Czech, Greek, Cyrillic, … needs a Unicode font such as Noto Sans.
 */
export interface OgePdfFont {
  /** Family name used inside the document (any name, e.g. `NotoSans`). */
  family: string;
  /** Regular face. */
  normal: OgePdfFontData;
  /** Bold face; header and summary rows fall back to `normal` without it. */
  bold?: OgePdfFontData;
  italic?: OgePdfFontData;
  boldItalic?: OgePdfFontData;
}

let defaultFont: OgePdfFont | null = null;

/**
 * Registers the font every OGE PDF export uses when its options carry no
 * `font` — grid, tree list, pivot and Gantt, in both render layers. Call it
 * once at start-up (or right before the first export, after loading the
 * `.ttf`); pass `null` to go back to the built-in Helvetica.
 */
export function setOgePdfDefaultFont(font: OgePdfFont | null): void {
  defaultFont = font;
}

/** The font {@link setOgePdfDefaultFont} registered, if any. */
export function getOgePdfDefaultFont(): OgePdfFont | null {
  return defaultFont;
}

const FONT_STYLES = [
  ['normal', 'normal'],
  ['bold', 'bold'],
  ['italic', 'italic'],
  ['boldItalic', 'bolditalic'],
] as const;

function fontBase64(data: OgePdfFontData): string {
  if (typeof data === 'string') return data;
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Embeds `font` into `doc` and makes it the current font. Faces that are not
 * given are mapped to the regular one, so `fontStyle: 'bold'` never falls
 * back to a WinAnsi-only built-in font. Returns the family name.
 */
export function registerOgePdfFont(
  doc: OgePdfFontTarget,
  font: OgePdfFont,
): string {
  const regular = fontBase64(font.normal);
  for (const [key, style] of FONT_STYLES) {
    const data = font[key];
    const file = `${font.family}-${style}.ttf`;
    doc.addFileToVFS(file, data ? fontBase64(data) : regular);
    doc.addFont(file, font.family, style);
  }
  doc.setFont(font.family, 'normal');
  return font.family;
}

/** The font of `options`, else the registered default, else none. */
export function resolveOgePdfFont(options: {
  font?: OgePdfFont | null;
}): OgePdfFont | null {
  return options.font === undefined ? defaultFont : options.font;
}

/** The cp1252 code points above U+00FF (the € … Ÿ row). */
const CP1252_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/** True when jsPDF's built-in (WinAnsi) fonts can draw every character. */
export function isOgePdfWinAnsi(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0xff) continue;
    if (!CP1252_EXTRA.has(code)) return false;
  }
  return true;
}
let warnedUnicode = false;

/**
 * Development aid: warns once when text that the built-in fonts cannot draw
 * (e.g. Turkish `ğ ş ı İ`) is exported without a Unicode `font`.
 */
export function warnOgePdfUnicode(texts: Iterable<string>): void {
  if (warnedUnicode || typeof console === 'undefined') return;
  for (const text of texts) {
    if (!isOgePdfWinAnsi(text)) {
      warnedUnicode = true;
      console.warn(
        '[oge-ui] PDF export: the text contains characters the built-in ' +
          'PDF fonts cannot draw (for example Turkish ğ ş ı İ). Pass a ' +
          'Unicode TrueType font via the `font` option or ' +
          'setOgePdfDefaultFont() — see the export docs.',
      );
      return;
    }
  }
}
