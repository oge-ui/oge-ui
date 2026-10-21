/**
 * The renderer against Excel itself: every case of
 * `testing/tools/number-format-cases.ts` was opened in Microsoft Excel and
 * its displayed text recorded (`testing/captures/number-formats.json`, in the
 * regional format of the capturing machine — `environment.json`). Regenerate
 * with `node packages/spreadsheet-engine/testing/tools/run.mjs` (Windows +
 * Excel); see `testing/README.md`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatOgeCellValue,
  ogeBuiltinNumberFormat,
  type OgeFormattableValue,
} from './number-format';
import { ogeFormatLocale, type OgeFormatLocale } from './format-locale';

interface Environment {
  readonly locale: string;
  readonly decimal: string;
  readonly group: string;
  readonly shortDate: string;
  readonly longDate: string;
  readonly longTime: string;
  readonly am: string;
  readonly pm: string;
}

interface Captured {
  readonly format: string | number;
  readonly value: OgeFormattableValue;
  readonly text?: string;
  readonly error?: string;
}

const read = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      resolve(__dirname, `../../../testing/captures/${name}`),
      'utf8',
    ),
  ) as T;

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
        code += run;
        break;
      case 'M':
        code += run.toLowerCase();
        break;
      case 'H':
      case 'h':
        code += 'h'.repeat(Math.min(n, 2));
        break;
      case 'm':
        code += run;
        break;
      case 't':
        code += 'AM/PM';
        break;
      case "'": {
        const end = pattern.indexOf("'", i + 1);
        const literal = pattern.slice(i + 1, end < 0 ? pattern.length : end);
        code += `"${literal}"`;
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
 * them (ids 5–8, 14–22, 37–44 follow the reader's region). Written down from
 * the captured texts: "₺1.235", "5.Oca.24", "9:05 ÖÖ", "09:05".
 */
const TR_TR_BUILTINS: Readonly<Record<number, string>> = {
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
export function captureLocale(environment: Environment): OgeFormatLocale {
  const base = ogeFormatLocale(environment.locale);
  const dateSeparator = /[^dMy]/.exec(environment.shortDate)?.[0] ?? '/';
  const timeSeparator = /[^Hhms]/.exec(environment.longTime)?.[0] ?? ':';
  return {
    ...base,
    decimal: environment.decimal,
    group: environment.group,
    am: environment.am,
    pm: environment.pm,
    shortDate: excelCodeOfWindowsPattern(environment.shortDate),
    longDate: excelCodeOfWindowsPattern(environment.longDate),
    longTime: excelCodeOfWindowsPattern(environment.longTime),
    dateSeparator,
    timeSeparator,
    ...(environment.locale === 'tr-TR' ? { builtins: TR_TR_BUILTINS } : {}),
  };
}

/**
 * Compares a rendering with the text Excel showed in a 120-character column:
 * a `#` overflow fills the cell, a `*x` fill repeats `x` where it stands.
 */
export function matchesExcel(
  rendered: ReturnType<typeof formatOgeCellValue>,
  excel: string,
): boolean {
  if (rendered.overflow) return /^#+$/.test(excel);
  if (!rendered.fill) return rendered.text === excel;
  const { char, index } = rendered.fill;
  const before = rendered.text.slice(0, index);
  const after = rendered.text.slice(index);
  if (!excel.startsWith(before) || !excel.endsWith(after)) return false;
  const middle = excel.slice(before.length, excel.length - after.length);
  return middle.length > 0 && [...middle].every((c) => c === char);
}

const environment = read<Environment>('environment.json');
const captured = read<Captured[]>('number-formats.json');
const locale = captureLocale(environment);

describe(`number formats as Excel ${environment.locale} displays them`, () => {
  it('has a capture for every case', () => {
    expect(captured.length).toBeGreaterThan(250);
    expect(captured.filter((c) => c.error)).toEqual([]);
  });

  it.each(captured.map((c, i) => [i, c] as const))(
    '#%i',
    (_i, { format, value, text }) => {
      const id = typeof format === 'number' ? format : undefined;
      const code =
        id === undefined
          ? (format as string)
          : (ogeBuiltinNumberFormat(id, locale) ?? 'General');
      const rendered = formatOgeCellValue(value, code, {
        locale,
        localeMarkers: id === 18 || id === 19,
      });
      const ok = matchesExcel(rendered, text ?? '');
      if (!ok) {
        // the assertion message names the case
        expect({
          format,
          value,
          rendered: rendered.text,
          overflow: rendered.overflow,
        }).toEqual({
          format,
          value,
          rendered: text,
          overflow: rendered.overflow,
        });
      }
      expect(ok).toBe(true);
    },
  );
});
