/**
 * Fitting against Excel: 34 values × 11 formats × every column width from
 * 10 to 110 px, as Excel displayed them (`testing/captures/fit.json`). Text
 * is measured with the GDI advance widths Excel lays Calibri 11 out with.
 */
import { ogeBuiltinNumberFormat } from '../format/number-format';
import { createOgeWorkbook } from '../model/workbook';
import {
  captureLocale,
  gdiCalibriMeasurer,
  readCapture,
  sameAsExcel,
  type CaptureEnvironment,
} from '../../testing/excel-capture';
import { ogeCellDisplay } from './cell-text';
import { OgeStyleResolver } from './resolve-style';

interface FitCapture {
  readonly values: readonly number[];
  readonly sheets: readonly {
    readonly format: string | number;
    readonly widthsPx: readonly number[];
    /** One line per value: the texts at each width, tab-separated. */
    readonly rows: readonly string[];
  }[];
}

const environment = readCapture<CaptureEnvironment>(
  'captures',
  'environment.json',
);
const fit = readCapture<FitCapture>('captures', 'fit.json');
const locale = captureLocale(environment);
const measurer = gdiCalibriMeasurer();
const workbook = createOgeWorkbook({
  defaultFont: { name: 'Calibri', size: 11, family: 2, color: { theme: 1 } },
});
const resolver = new OgeStyleResolver(workbook, { locale });

describe.each(
  fit.sheets.map((sheet) => [String(sheet.format), sheet] as const),
)('format %s in narrow columns', (_label, sheet) => {
  const id =
    typeof sheet.format === 'number'
      ? workbook.styles.intern(
          sheet.format === 0
            ? {}
            : {
                numberFormatId: sheet.format,
                numberFormat: ogeBuiltinNumberFormat(sheet.format) ?? 'General',
              },
        )
      : workbook.styles.intern({ numberFormat: sheet.format });
  const style = resolver.get(id);

  it('shows what Excel shows at every width', () => {
    const shows = (value: number, width: number, excel: string) => {
      const display = ogeCellDisplay({ value }, style, {
        width,
        padding: 5,
        measurer,
        locale,
        dateSystem: '1900',
      });
      return display === null
        ? excel === ''
        : sameAsExcel(display.text, display.fill, excel);
    };
    // one capture no rule explains: the Text format shows -12.5 as "0"
    // in a column one digit wide, where -0.5, -5 and -98.77 show "#"
    const quirk = (value: number, width: number) =>
      sheet.format === 49 && value === -12.5 && width >= 12 && width <= 16;
    const mismatches: string[] = [];
    const shaping: string[] = [];
    fit.values.forEach((value, r) => {
      const texts = sheet.rows[r].split('\t');
      sheet.widthsPx.forEach((raw, c) => {
        const width = Math.round(raw);
        const excel = texts[c];
        if (shows(value, width, excel) || quirk(value, width)) return;
        // GDI shapes a few strings 1–2 px off the sum of their advances
        // ("Ocak" +2, the ₺ glyph from a fallback font −1): the fitting
        // rules hold when the text measures that much differently
        const near = [-2, -1, 1, 2].some((d) => shows(value, width + d, excel));
        (near ? shaping : mismatches).push(
          `${value} @${width}px: Excel "${excel}"`,
        );
      });
    });
    expect(mismatches).toEqual([]);
    // and those stay rare: at most a couple of widths per value
    expect(shaping.length).toBeLessThanOrEqual(fit.values.length * 2);
  });
});
