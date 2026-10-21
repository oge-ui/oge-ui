import {
  compileOgeNumberFormat,
  formatOgeCellValue,
  isOgeDateFormat,
  ogeBuiltinNumberFormat,
  type OgeFormattableValue,
  type OgeNumberFormatOptions,
} from './number-format';
import { ogeFormatLocale } from './format-locale';
import { ogeDatePartsToSerial } from '../date/date-serial';

/**
 * The fixture set. Every row is a format code, a value and the text Excel
 * displays for it, from one of three sources:
 *
 * - **Microsoft** — the examples of Microsoft's "Review guidelines for
 *   customizing a number format" and "Number format codes" pages;
 * - **Excel-derived** — outputs recorded from Excel in public test suites and
 *   bug reports (numfmt's Excel-conformed tables, SheetJS SSF's tables, the
 *   numfmt maintainers' Excel checks), cross-checked in the research notes
 *   (`docs/research/spreadsheet-2026-10.md`);
 * - **Inferred** — Excel's documented rules applied to a case no source shows.
 *
 * None of these rows was captured from an Excel instance by this project yet;
 * the golden-workbook corpus (P1) replaces "inferred" with captured rows.
 * `·` in a description stands for a space in the expected text.
 */
type Row = readonly [
  code: string,
  value: OgeFormattableValue,
  expected: string,
];

const text = (
  code: string,
  value: OgeFormattableValue,
  options?: OgeNumberFormatOptions,
) => formatOgeCellValue(value, code, options).text;

const serial = (
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0,
  s = 0,
  ms = 0,
) =>
  ogeDatePartsToSerial({
    year: y,
    month: m,
    day: d,
    hour: h,
    minute: min,
    second: s,
    millisecond: ms,
  }) ?? Number.NaN;

const time = (h: number, m: number, s: number) =>
  (h * 3600 + m * 60 + s) / 86400;

const check = (rows: readonly Row[]) =>
  it.each(rows)('%s  ·  %s → %j', (code, value, expected) => {
    expect(text(code, value)).toBe(expected);
  });

describe('Microsoft examples', () => {
  describe('digit placeholders and separators', () => {
    check([
      ['####.#', 1234.59, '1234.6'],
      ['#.000', 8.9, '8.900'],
      ['0.#', 0.631, '0.6'],
      ['#.0#', 12, '12.0'],
      ['#.0#', 1234.568, '1234.57'],
      ['???.???', 44.398, ' 44.398'],
      ['???.???', 102.65, '102.65 '],
      ['???.???', 2.8, '  2.8  '],
      ['# ???/???', 5.25, '5   1/4  '],
      ['# ???/???', 5.3, '5   3/10 '],
      ['#,###', 12000, '12,000'],
      ['#,', 12000, '12'],
      ['0.0,,', 12200000, '12.2'],
      ['0.0,,"M"', 12200000, '12.2M'],
      ['0.00E+00', 12200000, '1.22E+07'],
      ['#0.0E+0', 12200000, '12.2E+6'],
    ]);
  });

  describe('sections, text and literals', () => {
    check([
      ['$0.00" Surplus";$-0.00" Shortage"', 125.74, '$125.74 Surplus'],
      ['$0.00" Surplus";$-0.00" Shortage"', -125.74, '$-125.74 Shortage'],
      ['"gross receipts for "@', 'Sales', 'gross receipts for Sales'],
    ]);
  });

  describe('dates and times', () => {
    const friday = serial(2024, 1, 5, 13, 5, 9);
    check([
      ['m', friday, '1'],
      ['mm', friday, '01'],
      ['mmm', friday, 'Jan'],
      ['mmmm', friday, 'January'],
      ['mmmmm', friday, 'J'],
      ['d', friday, '5'],
      ['dd', friday, '05'],
      ['ddd', friday, 'Fri'],
      ['dddd', friday, 'Friday'],
      ['yy', friday, '24'],
      ['yyyy', friday, '2024'],
      ['h AM/PM', time(4, 0, 0), '4 AM'],
      ['h:mm AM/PM', time(16, 36, 0), '4:36 PM'],
      ['h:mm:ss A/P', time(16, 36, 3), '4:36:03 P'],
      ['h:mm:ss.00', time(16, 36, 3.75), '16:36:03.75'],
      ['[h]:mm', time(25, 2, 0), '25:02'],
      ['[mm]:ss', time(0, 63, 46), '63:46'],
      ['[ss].00', time(0, 0, 3735.8), '3735.80'],
    ]);
  });
});

describe('Excel-derived behaviour', () => {
  describe('signs and sections', () => {
    check([
      ['0;0', -1.1, '1'],
      ['"Rs."#,##0.00', -51968287, '-Rs.51,968,287.00'],
      ['$#.00', -3.14, '-$3.14'],
      ['"-"0.00', -3.14, '--3.14'],
      ['A"TODO"', -1, '-ATODO'],
      ['[>=100]#,##0;[<=-100]-#,##0;#,##0.00', -3.96, '-3.96'],
      ['[>=100]#,##0;[<=-100]-#,##0;#,##0.00', -1234, '-1,234'],
      ['[>=100]#,##0;[<=-100]-#,##0;#,##0.00', 1234, '1,234'],
      ['[Red][<-25]General;[Blue][>25]General;[Green]General', -26, '26'],
      ['[Red][<-25]General;[Blue][>25]General;[Green]General', -50.1, '50.1'],
      ['[Red][<-25]General;[Blue][>25]General;[Green]General', -25, '-25'],
      ['[<=-100]"B"0;"C"0', -6.3, 'C6'],
      ['[black]', 123.456, '123.456'],
    ]);

    it('takes the colour of the section it picked', () => {
      const code = '[Red][<-25]General;[Blue][>25]General;[Green]General';
      expect(formatOgeCellValue(-26, code).color).toBe('#FF0000');
      expect(formatOgeCellValue(26, code).color).toBe('#0000FF');
      expect(formatOgeCellValue(0, code).color).toBe('#00FF00');
      expect(formatOgeCellValue(5, '[Color10]0').color).toBe('#008000');
    });
  });

  describe('rounding', () => {
    check([
      ['0.00', 1.005, '1.01'],
      ['0.00', 0.285, '0.29'],
      ['General', 4403928373.5, '4403928374'],
    ]);
  });

  describe('General', () => {
    check([
      ['General', -12345670000, '-12345670000'],
      ['General', -0.000123457, '-0.000123457'],
      ['General', 0.0001, '0.0001'],
      ['General', 0.00001, '0.00001'],
      ['General', 0.000012345, '0.000012345'],
      ['General', 0.000012345678, '1.23457E-05'],
      ['General', 0.00012345678, '0.000123457'],
      ['General', 1e-10, '1E-10'],
      ['General', 123456789012, '1.23457E+11'],
      ['General', 1e15, '1E+15'],
      ['General', 1e21, '1E+21'],
      ['General', 1 / 3, '0.333333333'],
      ['General', -1 / 3, '-0.333333333'],
      ['General', 2 / 3, '0.666666667'],
      ['General', 100 / 3, '33.33333333'],
      ['General', 1234567.891234, '1234567.891'],
      ['General', 0.1 + 0.2, '0.3'],
      ['General', 0, '0'],
    ]);
  });

  describe('fractions', () => {
    check([
      ['# ?/?', 1.5, '1 1/2'],
      ['# ?/?', 1, '1    '],
      ['# ?/?', 2, '2    '],
      ['# ?/?', -1.2, '-1 1/5'],
      ['# ?/?', 1.3, '1 1/3'], // a convergent, although 2/7 is closer
      ['# ?/?', 12.3, '12 1/3'],
      ['??/??', 12.3, '123/10'],
      ['# ?/8', -1.25, '-1 2/8'], // a fixed denominator is not reduced
      ['# ??/??', -1.2, '-1  1/5 '],
    ]);
  });

  describe('scientific notation', () => {
    check([
      ['##0.0E+0', 12345, '12.3E+3'],
      ['##0.0E+0', 123456, '123.5E+3'],
      ['##0.0E+0', 1234567, '1.2E+6'],
      ['##0.0E+0', 0.000123457, '123.5E-6'],
      ['#0.0E+0', 12345.6789, '1.2E+4'],
    ]);
  });

  describe('time rounding', () => {
    const noon = serial(2024, 1, 1, 12);
    check([
      ['h:mm', noon + 59.6 / 86400, '12:01'],
      ['h:mm:ss', noon + 59.6 / 86400, '12:01:00'],
      ['h:mm', noon + 43.2 / 86400, '12:00'],
      ['[h]:mm:ss', 1.5, '36:00:00'],
      ['m/d/yy h:mm', 45292.9999999, '1/2/24 0:00'],
      // the corpus capture overrules the published claim that a date-only
      // format never rounds into the next day: Excel 2024 shows 1/2/24
      ['m/d/yy', 45292.9999999, '1/2/24'],
    ]);

    it('fills a negative elapsed time with # in the 1900 system', () => {
      expect(formatOgeCellValue(-0.5, '[h]:mm:ss').overflow).toBe(true);
    });

    it('fills an elapsed time past 9999-12-31 with # (found by the fuzz spec)', () => {
      expect(formatOgeCellValue(2.0806633505350878e303, '[h]M')).toEqual({
        text: '',
        overflow: true,
      });
      expect(formatOgeCellValue(3e6, '[h]:mm').overflow).toBe(true);
      expect(text('[h]:mm', 2958465.5)).toBe('71003172:00');
    });
  });

  describe('dates', () => {
    check([
      ['m/d/yyyy', 0, '1/0/1900'],
      ['m/d/yyyy', 60, '2/29/1900'],
      ['dddd', 1, 'Sunday'],
      ['dddd', 0, 'Saturday'],
      ['y', serial(2023, 6, 1), '23'],
      ['yy', serial(2023, 6, 1), '23'],
      ['yyy', serial(2023, 6, 1), '2023'],
      ['yyyy', serial(2023, 6, 1), '2023'],
      ['bb', serial(1900, 6, 1), '43'],
      ['h AM/PM', 0, '12 AM'],
      ['hh AM/PM', 0, '12 AM'],
      ['h AM/PM', 0.5, '12 PM'],
      ['hh:mm AM/PM', time(16, 48, 0), '04:48 PM'],
      ['h:mm am/pm', time(16, 48, 0), '4:48 PM'],
      ['h:mm a/p', time(16, 48, 0), '4:48 p'],
    ]);

    it('fills dates Excel cannot show with #', () => {
      expect(formatOgeCellValue(-1, 'm/d/yyyy').overflow).toBe(true);
      expect(formatOgeCellValue(2958470, 'm/d/yyyy').overflow).toBe(true);
    });
  });

  describe('text', () => {
    check([
      ['@@', 1, '1'],
      ['0.00', 'abc', 'abc'],
      ['0;0;0;"fixed"', 'abc', 'fixed'],
    ]);
  });

  describe('padding and fills', () => {
    check([['_($* #,##0_)', 1, ' $1 ']]);
  });

  describe('grouping and scaling commas', () => {
    check([['#.0000,', 1234, '1.2340']]);
  });

  describe('placeholders between literals', () => {
    check([
      ['000-00-0000', 123456789, '123-45-6789'],
      ['(###) ###-####', 2813308004, '(281) 330-8004'],
      ['00000-0000', 12345.6789, '00001-2346'],
      ['#.##', 0, '.'],
      ['#,##0.##', 1, '1.'],
    ]);
  });

  describe('locale prefixes', () => {
    it('renders [$-40C] names in French on an English locale', () => {
      expect(text('[$-40C]d/mmm/yyyy', 45296)).toBe('5/janv./2024');
    });
  });
});

describe('inferred from the documented rules', () => {
  check([
    // conditions that can only match negatives show the magnitude
    ['[<0]"neg "0;0', -5, 'neg 5'],
    ['[<=100]0;0', -5, '-5'],
    ['[>=100]0;[<-100]0;0', -500, '500'],
    ['[Red][<=100];[Blue][>100]', -5, '-5'],
    // the minus leads the whole text
    ['"$"0.00', -5, '-$5.00'],
    ['"Total: "0', -5, '-Total: 5'],
    // a negative that rounds to zero has no sign in a one-section format
    ['0.00', -0.001, '0.00'],
    ['0', -0.4, '0'],
    ['0.00;-0.00', -0.001, '-0.00'],
    ['0%', -0.001, '0%'],
    // fractions
    ['# ?/?', 0.75, ' 3/4'],
    ['# ?/?', 0, '0    '],
    ['# ?/?', 0.001, '0    '],
    ['# ?/?', -1.5, '-1 1/2'],
    ['?/?', 1.5, '3/2'],
    ['# ??/??', 3.14159, '3  1/7 '],
    ['# ?/8', 0.3, ' 2/8'],
    ['#/100', 1.5, '150/100'],
    // scientific notation
    ['0.00E+00', 12345, '1.23E+04'],
    ['0.00E+00', 0.000123, '1.23E-04'],
    ['##0.0E+0', 0.00012, '120.0E-6'],
    ['0.0E-0', 12345, '1.2E4'],
    ['00.00E+00', 12345, '01.23E+04'],
    ['0.00E+00', 9.999, '1.00E+01'],
    ['0.00E+00', 0, '0.00E+00'],
    // time
    // the double holds 12:00:00.4999998 — Excel shows 12:00:00 (corpus #115)
    ['h:mm:ss', serial(2024, 1, 1, 12) + 0.5 / 86400, '12:00:00'],
    ['h:mm:ss', serial(2024, 1, 1, 12) + 0.6 / 86400, '12:00:01'],
    ['mm:ss.0', 0.000694444, '01:00.0'],
    ['hh "hours and" mm "minutes"', time(18, 30, 0), '18 hours and 30 minutes'],
    ['h "h" m "min"', time(7, 5, 0), '7 h 5 min'],
    ['e', serial(2023, 6, 1), '2023'],
    ['bbbb', serial(2023, 6, 1), '2566'],
    ['h:mm A/P', time(9, 5, 0), '9:05 A'],
    // text, padding, scaling
    ['@', 5, '5'],
    ['"x"@', 5, '5'],
    ['_(0_)', 5, ' 5 '],
    ['*-0', 5, '5'],
    ['#,##0,', 1234567, '1,235'],
    ['0.0,,"M"', 1234567, '1.2M'],
    ['#,', 999, '1'],
    ['0,0', 1234, '1,234'],
    ['#,#', 1234567, '1,234,567'],
    ['0 ,', 1234568, '1234568 ,'],
    ['0%', 0.125, '13%'],
    ['0.00', 2.675, '2.68'],
    ['000-00-0000', 12, '000-00-0012'],
    ['(###) ###-####', 5551234567, '(555) 123-4567'],
  ]);

  it('reports a *x fill where the repeat goes', () => {
    expect(formatOgeCellValue(5, '*-0')).toEqual({
      text: '5',
      fill: { char: '-', index: 0 },
    });
    expect(formatOgeCellValue(1234.5, '_("$"* #,##0.00_)')).toEqual({
      text: ' $1,234.50 ',
      fill: { char: ' ', index: 2 },
    });
  });
});

describe('accounting and built-in formats', () => {
  const accounting = ogeBuiltinNumberFormat(44) ?? '';

  it('renders Excel 44 (Accounting with $) in all four sections', () => {
    expect(text(accounting, 1234.5)).toBe(' $1,234.50 ');
    expect(text(accounting, -1234.5)).toBe(' $(1,234.50)');
    expect(text(accounting, 0)).toBe(' $-   ');
    expect(text(accounting, 'Total')).toBe(' Total ');
  });

  it('knows the implied codes, following the locale for the short date', () => {
    expect(ogeBuiltinNumberFormat(0)).toBe('General');
    expect(ogeBuiltinNumberFormat(14)).toBe('m/d/yyyy');
    expect(ogeBuiltinNumberFormat(22)).toBe('m/d/yyyy h:mm');
    expect(ogeBuiltinNumberFormat(49)).toBe('@');
    expect(ogeBuiltinNumberFormat(27)).toBeUndefined();
    expect(text(ogeBuiltinNumberFormat(14) ?? '', 45296)).toBe('1/5/2024');
    expect(text(ogeBuiltinNumberFormat(10) ?? '', 0.1234)).toBe('12.34%');
    expect(text(ogeBuiltinNumberFormat(38) ?? '', -1234)).toBe('(1,234)');
    expect(
      formatOgeCellValue(-1234, ogeBuiltinNumberFormat(38) ?? '').color,
    ).toBe('#FF0000');
  });
});

describe('locales', () => {
  const de = ogeFormatLocale('de-DE');
  const tr = ogeFormatLocale('tr-TR');

  it("shows the locale's separators and names", () => {
    expect(text('#,##0.00', 1234.5, { locale: de })).toBe('1.234,50');
    expect(text('General', 1234.5, { locale: de })).toBe('1234,5');
    expect(text('dd mmmm yyyy dddd', 45296, { locale: tr })).toBe(
      '05 Ocak 2024 Cuma',
    );
    expect(
      text(ogeBuiltinNumberFormat(14, tr) ?? '', 45296, { locale: tr }),
    ).toBe('05.01.2024');
    const gb = ogeFormatLocale('en-GB');
    expect(
      text(ogeBuiltinNumberFormat(14, gb) ?? '', 45296, { locale: gb }),
    ).toBe('05/01/2024');
  });

  it('lets an LCID prefix swap the names but keep the separators', () => {
    expect(text('[$-41F]mmmm', serial(2024, 3, 15))).toBe('Mart');
    expect(text('[$-409]mmmm', serial(2024, 3, 15), { locale: tr })).toBe(
      'March',
    );
    expect(text('[$€-407]#,##0.00', 1234.5)).toBe('€1,234.50');
    expect(text('[$€-407] #,##0.00', 1234.5, { locale: de })).toBe(
      '€ 1.234,50',
    );
    expect(
      text('[$-41F]mmmm', serial(2024, 3, 15), {
        resolveLcid: () => undefined,
      }),
    ).toBe('March');
  });

  it('expands the system long date and time', () => {
    const friday = serial(2024, 1, 5, 9, 5, 9);
    expect(text('[$-F800]dddd, mmmm dd, yyyy', friday)).toBe(
      'Friday, January 5, 2024',
    );
    expect(text('[$-x-sysdate]dddd', friday)).toBe('Friday, January 5, 2024');
    expect(text('[$-F400]h:mm:ss AM/PM', friday)).toBe('9:05:09 AM');
  });
});

describe('compiled formats', () => {
  it('flags dates, percentages and text formats', () => {
    expect(isOgeDateFormat('m/d/yyyy')).toBe(true);
    expect(isOgeDateFormat('[h]:mm')).toBe(true);
    expect(isOgeDateFormat('0.00')).toBe(false);
    expect(isOgeDateFormat('"d"0')).toBe(false); // a quoted letter is a literal
    expect(isOgeDateFormat('0;0;0;@')).toBe(false);
    expect(compileOgeNumberFormat('0.0%').isPercent).toBe(true);
    expect(compileOgeNumberFormat('@').isText).toBe(true);
    expect(compileOgeNumberFormat('0.00').isText).toBe(false);
  });

  it('caches by code and renders a hand-built look-alike', () => {
    expect(compileOgeNumberFormat('0.00')).toBe(compileOgeNumberFormat('0.00'));
    const lookAlike = {
      code: '0.0',
      isDate: false,
      isPercent: false,
      isText: false,
    };
    expect(formatOgeCellValue(1.25, lookAlike).text).toBe('1.3');
  });

  it('shows booleans as TRUE and FALSE under any format', () => {
    expect(text('0.00', true)).toBe('TRUE');
    expect(text('@', false)).toBe('FALSE');
  });

  it('survives malformed codes', () => {
    expect(text('[Red', 5)).toBe('[Red');
    expect(text('"unterminated', 5)).toBe('unterminated');
    expect(text('0;0;0;0;0', -5)).toBe('5'); // a fifth section is ignored
    expect(text('[>100]0;[<-100]0', 5)).toBe('');
    expect(formatOgeCellValue(5, '[>100]0;[<-100]0').overflow).toBe(true);
    expect(text('0', Number.NaN)).toBe('#NUM!');
    expect(text('', 5)).toBe('');
    expect(text('0;;', 0)).toBe('');
  });
});
