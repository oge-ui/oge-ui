/**
 * AutoFit against Excel (`testing/corpus/autofit.*`): every case column and
 * row of the corpus workbook AutoFitted by the engine and compared with the
 * width or height Excel's `Range.AutoFit` gave it (`autofit-capture.ps1`).
 *
 * Text is measured with the advances Windows GDI gives Calibri 11, whole
 * pixels per character as AutoFit adds them — so the cases whose text is in
 * another font or size are checked only where the result does not hang on
 * measuring: a font's line, vertical and stacked text.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readOgeXlsxSync } from '../codec/read-xlsx';
import {
  captureLocale,
  gdiCalibriMeasurer,
  readCapture,
  type CaptureEnvironment,
} from '../../testing/excel-capture';
import { ogeAutofitColumnWidth, ogeAutofitRowHeight } from './autofit';
import type { OgeTextMeasurer } from './cell-text';
import { OgeStyleResolver } from './resolve-style';
import { OgeSheetLayout } from './sheet-layout';

interface Captured {
  readonly sheets: readonly {
    readonly name: string;
    readonly cases: readonly { readonly name: string; readonly px: number }[];
  }[];
}

const { workbook } = readOgeXlsxSync(
  new Uint8Array(
    readFileSync(resolve(__dirname, '../../../testing/corpus/autofit.xlsx')),
  ),
);
const captured = readCapture<Captured>('corpus', 'autofit.fit.json').sheets;
const locale = captureLocale(
  readCapture<CaptureEnvironment>('captures', 'environment.json'),
);
const resolver = new OgeStyleResolver(workbook, { locale });
const gdi = gdiCalibriMeasurer();
/** GDI's advances, each a whole pixel: AutoFit adds no kerning ("ff" is 10 px, not 9). */
const measurer: OgeTextMeasurer = {
  measure: (text, font) =>
    [...text].reduce((sum, ch) => sum + Math.ceil(gdi.measure(ch, font)), 0),
};

/**
 * Cases the engine fits apart from Excel: a wrapped cell's column, which
 * follows Excel's own line breaking — at the corpus's 26 px start it breaks
 * the long word into shorter pieces than the engine's wrap.
 */
const KNOWN = new Set(['Cols wrapped']);

/** Whether a case's result can be checked here: Calibri 11, or no text measured. */
function checkable(sheet: string, name: string): boolean {
  const size = /^(\d+)pt (\d+)°/.exec(name);
  if (!size) return true;
  const [, points, angle] = size;
  if (points === '11') return true;
  // vertical and stacked columns, a font's line and stacked rows measure nothing
  if (sheet.startsWith('Cols'))
    return angle === '90' || angle === '180' || angle === '255';
  return angle === '0' || angle === '255';
}

describe('AutoFit — the corpus against Excel', () => {
  it('captured every case of every sheet', () => {
    expect(captured.map((s) => s.name)).toEqual(
      workbook.sheets.map((s) => s.name),
    );
    expect(captured.reduce((n, s) => n + s.cases.length, 0)).toBeGreaterThan(
      300,
    );
  });

  for (const { name, cases } of captured) {
    it(`fits ${name} as Excel does`, () => {
      const sheet = workbook.sheet(name);
      if (!sheet) throw new Error(`no sheet ${name}`);
      const layout = new OgeSheetLayout(sheet, resolver, { measurer });
      const options = { measurer, locale, dateSystem: workbook.dateSystem };
      const misses: string[] = [];
      let checked = 0;
      cases.forEach((item, i) => {
        if (!checkable(name, item.name)) return;
        checked++;
        const ours = name.startsWith('Cols')
          ? (ogeAutofitColumnWidth(sheet, layout, resolver, i, options) ??
            layout.cols.size(i))
          : ogeAutofitRowHeight(sheet, layout, resolver, i, options);
        const known = KNOWN.has(`${name} ${item.name}`);
        if (known)
          expect(ours, `${item.name} matches now: take it off KNOWN`).not.toBe(
            item.px,
          );
        else if (ours !== item.px)
          misses.push(`${item.name}: ours ${ours}, Excel ${item.px}`);
      });
      expect(checked).toBeGreaterThan(0);
      expect(misses).toEqual([]);
    });
  }
});
