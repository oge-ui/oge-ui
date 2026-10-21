/**
 * Helpers for the specs that compare the engine with what Microsoft Excel
 * displayed (`testing/captures`, `testing/corpus`). Test-only.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ogeFormatLocale,
  type OgeFormatLocale,
} from '../lib/format/format-locale';
import type { OgePaintFont } from '../lib/paint/resolve-style';
import type { OgeTextMeasurer } from '../lib/paint/cell-text';

/** The regional format of the machine the capture ran on. */
export interface CaptureEnvironment {
  readonly locale: string;
  readonly decimal: string;
  readonly group: string;
  readonly shortDate: string;
  readonly longDate: string;
  readonly longTime: string;
  readonly am: string;
  readonly pm: string;
}

/** Reads a JSON file of `testing/captures` or `testing/corpus`. */
export function readCapture<T>(folder: 'captures' | 'corpus', name: string): T {
  return JSON.parse(
    readFileSync(resolve(__dirname, '../../testing', folder, name), 'utf8'),
  ) as T;
}

/** A Windows date/time pattern (`d.MM.yyyy`, `HH:mm:ss`) as an Excel code. */
export function excelCodeOfWindowsPattern(pattern: string): string {
  let code = '';
  for (let i = 0; i < pattern.length;) {
    const ch = pattern[i];
    let n = 1;
    while (pattern[i + n] === ch) n++;
    const run = pattern.slice(i, i + n);
    switch (ch) {
      case 'd':
      case 'y':
      case 's':
      case 'm':
        code += run;
        break;
      case 'M':
        code += run.toLowerCase();
        break;
      case 'H':
      case 'h':
        code += 'h'.repeat(Math.min(n, 2));
        break;
      case 't':
        code += 'AM/PM';
        break;
      case "'": {
        const end = pattern.indexOf("'", i + 1);
        const stop = end < 0 ? pattern.length : end;
        code += `"${pattern.slice(i + 1, stop)}"`;
        n = (end < 0 ? pattern.length : end + 1) - i;
        break;
      }
      default:
        code += /[a-zA-Z]/.test(ch) ? `"${run}"` : run;
    }
    i += n;
  }
  return code;
}

/**
 * The built-in codes of a Turkish Windows regional format, as Excel renders
 * them (ids 5–8, 14–22 and 37–44 follow the reader's region) — written down
 * from the captured texts: "₺1.235", "5.Oca.24", "9:05 ÖÖ", "09:05".
 */
export const TR_TR_BUILTINS: Readonly<Record<number, string>> = {
  5: '"₺"#,##0;-"₺"#,##0',
  6: '"₺"#,##0;[Red]-"₺"#,##0',
  7: '"₺"#,##0.00;-"₺"#,##0.00',
  8: '"₺"#,##0.00;[Red]-"₺"#,##0.00',
  14: 'd.mm.yyyy',
  15: 'd.mmm.yy',
  16: 'd.mmm',
  17: 'mmm.yy',
  18: 'h:mm AM/PM',
  19: 'h:mm:ss AM/PM',
  20: 'hh:mm',
  21: 'hh:mm:ss',
  22: 'd.mm.yyyy hh:mm',
  37: '#,##0;-#,##0',
  38: '#,##0;[Red]-#,##0',
  39: '#,##0.00;-#,##0.00',
  40: '#,##0.00;[Red]-#,##0.00',
  41: '_-* #,##0_-;-* #,##0_-;_-* "-"_-;_-@_-',
  42: '_-"₺"* #,##0_-;-"₺"* #,##0_-;_-"₺"* "-"_-;_-@_-',
  43: '_-* #,##0.00_-;-* #,##0.00_-;_-* "-"??_-;_-@_-',
  44: '_-"₺"* #,##0.00_-;-"₺"* #,##0.00_-;_-"₺"* "-"??_-;_-@_-',
};

/** The format locale of the capturing machine. */
export function captureLocale(
  environment: CaptureEnvironment,
): OgeFormatLocale {
  const base = ogeFormatLocale(environment.locale);
  return {
    ...base,
    decimal: environment.decimal,
    group: environment.group,
    am: environment.am,
    pm: environment.pm,
    shortDate: excelCodeOfWindowsPattern(environment.shortDate),
    longDate: excelCodeOfWindowsPattern(environment.longDate),
    longTime: excelCodeOfWindowsPattern(environment.longTime),
    dateSeparator: /[^dMy]/.exec(environment.shortDate)?.[0] ?? '/',
    timeSeparator: /[^Hhms]/.exec(environment.longTime)?.[0] ?? ':',
    ...(environment.locale === 'tr-TR' ? { builtins: TR_TR_BUILTINS } : {}),
  };
}

/**
 * Measures with the advance widths Windows GDI gives Calibri 11 — the layout
 * Excel's cells use — so fitting specs test Excel's rules, not a rasteriser.
 */
export function gdiCalibriMeasurer(): OgeTextMeasurer {
  const tables = readCapture<Record<string, string[]>>(
    'captures',
    'gdi-advances.json',
  );
  const decode = (list: readonly string[]) =>
    new Map(
      list.map((entry) => entry.split(':').map(Number) as [number, number]),
    );
  const regular = decode(tables['Calibri 11 Regular']);
  const bold = decode(tables['Calibri 11 Bold']);
  return {
    measure(text: string, font: OgePaintFont): number {
      const table = font.bold ? bold : regular;
      let width = 0;
      for (const ch of text)
        width += table.get(ch.codePointAt(0) as number) ?? 7;
      return width;
    },
  };
}

/**
 * Whether a rendering matches what Excel showed, given that Excel's text
 * includes a `*x` fill's repeats (`before` + x… + `after`).
 */
export function sameAsExcel(
  text: string,
  fill: { readonly char: string; readonly index: number } | undefined,
  excel: string,
): boolean {
  if (!fill) return text === excel;
  const before = text.slice(0, fill.index);
  const after = text.slice(fill.index);
  if (
    !excel.startsWith(before) ||
    !excel.endsWith(after) ||
    excel.length < text.length
  )
    return false;
  const middle = excel.slice(before.length, excel.length - after.length);
  return [...middle].every((c) => c === fill.char);
}
