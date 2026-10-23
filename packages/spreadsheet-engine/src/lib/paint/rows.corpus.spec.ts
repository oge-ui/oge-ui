/**
 * Row heights against Excel (`testing/corpus/rows.*`): every case row of the
 * corpus workbook as the layout sizes it on open, and as AutoFit fits it,
 * next to the heights Excel gave it (`rows-capture.ps1`) — which rows Excel
 * fits and which keep a height, the fonts, underlines, raised text, rich
 * runs, merges and row and column styles a fit counts.
 *
 * Text is measured with the advances Windows GDI gives Calibri 11, whole
 * pixels per character as Excel adds them; the cases that measure text —
 * wrapped and rotated — are all in Calibri 11.
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
import { ogeAutofitRowHeight } from './autofit';
import type { OgeTextMeasurer } from './cell-text';
import { OgeStyleResolver } from './resolve-style';
import { OgeSheetLayout } from './sheet-layout';

interface Captured {
  readonly sheets: readonly {
    readonly name: string;
    readonly standard: number;
    readonly cases: readonly {
      readonly name: string;
      readonly open: number;
      readonly hidden: boolean;
      readonly autofit: number | null;
    }[];
  }[];
}

const { workbook, issues } = readOgeXlsxSync(
  new Uint8Array(
    readFileSync(resolve(__dirname, '../../../testing/corpus/rows.xlsx')),
  ),
);
const captured = readCapture<Captured>('corpus', 'rows.heights.json').sheets;
const locale = captureLocale(
  readCapture<CaptureEnvironment>('captures', 'environment.json'),
);
const resolver = new OgeStyleResolver(workbook, { locale });
const gdi = gdiCalibriMeasurer();
const measurer: OgeTextMeasurer = {
  measure: (text, font) =>
    [...text].reduce((sum, ch) => sum + Math.ceil(gdi.measure(ch, font)), 0),
};

/** Raised and lowered text: the extra Excel adds is estimated, within 2 px. */
const ESTIMATED = /superscript|subscript/;

/**
 * Where the layout sizes a row apart from Excel on purpose: wrapped text in
 * a row the file stores a height for keeps that height (Excel's own, when
 * Excel saved the file), where Excel breaks the text again on open.
 */
const KNOWN = new Set(['Rows wrapped, stored 15']);

describe('rows — the corpus against Excel', () => {
  it('reads the corpus and captured every case of every sheet', () => {
    expect(issues).toEqual([]);
    expect(captured.map((s) => s.name)).toEqual(
      workbook.sheets.map((s) => s.name),
    );
    expect(captured.reduce((n, s) => n + s.cases.length, 0)).toBeGreaterThan(
      200,
    );
  });

  for (const { name, standard, cases } of captured) {
    it(`sizes ${name} as Excel opens it, and AutoFits it as Excel does`, () => {
      const sheet = workbook.sheet(name);
      if (!sheet) throw new Error(`no sheet ${name}`);
      const layout = new OgeSheetLayout(sheet, resolver, { measurer });
      const options = { measurer, locale, dateSystem: workbook.dateSystem };
      expect(layout.defaultRowHeight).toBe(standard);
      const misses: string[] = [];
      cases.forEach((item, row) => {
        const room = ESTIMATED.test(item.name) ? 2 : 0;
        const open = layout.rows.size(row);
        if (KNOWN.has(`${name} ${item.name}`))
          expect(open, `${item.name} matches now: take it off KNOWN`).not.toBe(
            item.open,
          );
        else if (Math.abs(open - item.open) > room)
          misses.push(`${item.name} on open: ours ${open}, Excel ${item.open}`);
        if (item.autofit === null) return;
        const fit = ogeAutofitRowHeight(sheet, layout, resolver, row, options);
        if (Math.abs(fit - item.autofit) > room)
          misses.push(
            `${item.name} AutoFit: ours ${fit}, Excel ${item.autofit}`,
          );
      });
      expect(misses).toEqual([]);
    });
  }
});
