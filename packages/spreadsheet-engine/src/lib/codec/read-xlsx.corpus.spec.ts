/**
 * The reader against Excel: each corpus workbook was saved by Microsoft Excel
 * and everything Excel reported about it through its object model is in
 * `testing/corpus/<name>.excel.json` (see `testing/README.md`). Reading the
 * Excel-written file must reproduce that, with no import issue.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatOgeCellAddress,
  formatOgeRangeAddress,
  parseOgeCellAddress,
} from '../address/address';
import { resolveOgeColor } from '../color/color';
import {
  isOgeCellError,
  isOgeRichText,
  ogeRichTextToString,
} from '../model/cell';
import type { OgeWorksheet } from '../model/worksheet';
import { ogeColumnWidthToPixels } from '../metrics/sheet-metrics';
import { ogeDisplayFormula } from './formula-text';
import { readOgeXlsxSync } from './read-xlsx';

interface CapturedCell {
  readonly a: string;
  readonly t: string;
  readonly n?: number;
  readonly s?: string;
  readonly b?: boolean;
  readonly e?: string;
  readonly f?: string;
  /** A legacy (Ctrl+Shift+Enter) array's range, on every cell of it. */
  readonly array?: string;
  /** A dynamic array's spill range, on its anchor. */
  readonly spill?: string;
}

interface CapturedSheet {
  readonly name: string;
  readonly visible: number;
  readonly tabColor?: string;
  readonly window?: {
    readonly freeze: boolean;
    readonly splitRow: number;
    readonly splitColumn: number;
    readonly zoom: number;
    readonly gridlines: boolean;
    readonly headings: boolean;
    readonly rightToLeft: boolean;
    readonly activeCell: string;
  };
  readonly cells: readonly CapturedCell[];
  readonly merges: readonly string[];
  readonly columns: readonly string[];
  readonly rows: readonly string[];
  readonly hyperlinks: readonly {
    readonly range: string;
    readonly address: string | null;
    readonly subAddress: string | null;
    readonly tip: string | null;
  }[];
  readonly notes: readonly {
    readonly cell: string;
    readonly text: string;
    readonly visible: boolean;
    readonly author: string;
  }[];
}

interface CapturedBook {
  readonly name: string;
  readonly date1904: boolean;
  readonly sheets: readonly CapturedSheet[];
  readonly names: readonly {
    readonly name: string;
    readonly refersTo: string;
    readonly visible: boolean;
  }[];
}

const corpus = (file: string) =>
  readFileSync(resolve(__dirname, `../../../testing/corpus/${file}`));

const BOOKS = ['styles', 'structure', 'formulas', 'dates1904'];

/** Calibri 11, the corpus's Normal font: 7 px digits, 64 px columns, 20 px rows. */
const MDW = 7;

function columnPixels(sheet: OgeWorksheet, col: number): number {
  const info = sheet.getColumn(col);
  if (info?.hidden) return 0;
  const width = info?.width ?? sheet.format.defaultColumnWidth;
  return width === undefined ? 64 : ogeColumnWidthToPixels(width, MDW);
}

function rowPixels(sheet: OgeWorksheet, row: number): number {
  const info = sheet.getRow(row);
  if (info?.hidden) return 0;
  return Math.round(((info?.height ?? sheet.format.defaultRowHeight) * 4) / 3);
}

describe.each(BOOKS)('corpus %s.xlsx', (name) => {
  const captured = JSON.parse(
    corpus(`${name}.excel.json`).toString('utf8'),
  ) as CapturedBook;
  const { workbook, issues } = readOgeXlsxSync(
    new Uint8Array(corpus(`${name}.xlsx`)),
  );

  it('reads without an import issue', () => {
    expect(issues).toEqual([]);
  });

  it('has the sheets, their states and tab colours', () => {
    expect(workbook.dateSystem).toBe(captured.date1904 ? '1904' : '1900');
    expect(workbook.sheets.map((s) => s.name)).toEqual(
      captured.sheets.map((s) => s.name),
    );
    captured.sheets.forEach((expected, i) => {
      const sheet = workbook.sheets[i];
      expect(sheet.state).toBe(
        expected.visible === -1
          ? 'visible'
          : expected.visible === 0
            ? 'hidden'
            : 'veryHidden',
      );
      const tab = sheet.tabColor
        ? resolveOgeColor(sheet.tabColor, {
            theme: workbook.theme,
            indexed: workbook.indexedColors,
          })
        : undefined;
      expect(tab?.slice(1)).toBe(expected.tabColor);
    });
  });

  it('has the window of every visible sheet', () => {
    for (const expected of captured.sheets) {
      if (!expected.window) continue;
      const view = (workbook.sheet(expected.name) as OgeWorksheet).view;
      const w = expected.window;
      expect({
        sheet: expected.name,
        frozenRows: view.frozenRows,
        frozenColumns: view.frozenColumns,
        zoom: view.zoom,
        gridlines: view.showGridLines,
        headings: view.showHeaders,
        rightToLeft: view.rightToLeft,
      }).toEqual({
        sheet: expected.name,
        frozenRows: w.freeze ? w.splitRow : 0,
        frozenColumns: w.freeze ? w.splitColumn : 0,
        zoom: w.zoom,
        gridlines: w.gridlines,
        headings: w.headings,
        rightToLeft: w.rightToLeft,
      });
    }
  });

  it('reads every value and formula as Excel holds them', () => {
    for (const expected of captured.sheets) {
      const sheet = workbook.sheet(expected.name) as OgeWorksheet;
      for (const item of expected.cells) {
        const ref = parseOgeCellAddress(item.a);
        expect(ref).not.toBeNull();
        if (!ref) continue;
        const cell = sheet.getCell(ref.row, ref.col);
        const value = cell?.value;
        const where = `${expected.name}!${item.a}`;
        if (item.n !== undefined)
          expect({ where, value }).toEqual({ where, value: item.n });
        else if (item.b !== undefined)
          expect({ where, value }).toEqual({ where, value: item.b });
        else if (item.e !== undefined)
          expect({
            where,
            error: isOgeCellError(value) ? value.code : value,
          }).toEqual({ where, error: item.e });
        else if (item.s !== undefined) {
          const text = isOgeRichText(value)
            ? ogeRichTextToString(value)
            : value;
          expect({ where, text }).toEqual({ where, text: item.s });
        }
        if (cell?.formula !== undefined) {
          expect({
            where,
            formula: `=${ogeDisplayFormula(cell.formula)}`,
          }).toEqual({ where, formula: item.f });
        }
        if (cell?.array) {
          const range = formatOgeRangeAddress({
            ...cell.array.range,
            kind: 'range',
            topAbsolute: false,
            leftAbsolute: false,
            bottomAbsolute: false,
            rightAbsolute: false,
          });
          const excel = cell.array.dynamic ? item.spill : item.array;
          expect({ where, range }).toEqual({
            where,
            range: excel?.includes(':') ? excel : `${excel}:${excel}`,
          });
        }
        // a formula Excel reports for a cell that is not an array follower is in the model
        if (item.f && !item.array)
          expect({ where, formula: cell?.formula !== undefined }).toEqual({
            where,
            formula: true,
          });
      }
    }
  });

  it('has the merges, links and notes', () => {
    for (const expected of captured.sheets) {
      const sheet = workbook.sheet(expected.name) as OgeWorksheet;
      const merges = sheet.merges.map(
        (m) =>
          `${formatOgeCellAddress({ row: m.top, col: m.left })}:${formatOgeCellAddress({ row: m.bottom, col: m.right })}`,
      );
      expect(merges).toEqual(expected.merges);
      expect(
        sheet.hyperlinks.map((link) => ({
          range: formatOgeCellAddress({
            row: link.range.top,
            col: link.range.left,
          }),
          address: link.target ?? null,
          subAddress: link.location ?? null,
          tip: link.tooltip ?? null,
        })),
      ).toEqual(
        expected.hyperlinks.map(({ range, address, subAddress, tip }) => ({
          range,
          address,
          subAddress,
          tip,
        })),
      );
      expect(
        sheet.notes().map(({ row, col, note }) => ({
          cell: formatOgeCellAddress({ row, col }),
          text:
            typeof note.text === 'string'
              ? note.text
              : ogeRichTextToString(note.text),
          visible: note.visible ?? false,
          author: note.author,
        })),
      ).toEqual(expected.notes);
    }
  });

  it('has the defined names', () => {
    const names = workbook.names.map((n) => {
      const bare = n.name.replace(/^_xlnm\./, '');
      return {
        name:
          n.sheet === undefined
            ? bare
            : `${workbook.sheets[n.sheet].name}!${bare}`,
        refersTo: `=${n.formula}`,
        visible: !n.hidden,
      };
    });
    const sort = <T extends { name: string }>(list: readonly T[]) =>
      [...list].sort((a, b) => a.name.localeCompare(b.name));
    // Excel adds hidden `_xlfn.` names in memory for the future functions a
    // workbook uses; they are not in the file
    expect(sort(names)).toEqual(
      sort(captured.names.filter((n) => !n.name.startsWith('_xlfn.'))),
    );
  });

  it('sizes columns and rows like Excel', () => {
    for (const expected of captured.sheets) {
      const sheet = workbook.sheet(expected.name) as OgeWorksheet;
      expected.columns.forEach((entry, col) => {
        const [px, hidden] = entry.split('|');
        expect({
          sheet: expected.name,
          col,
          px: columnPixels(sheet, col),
        }).toEqual({
          sheet: expected.name,
          col,
          px: hidden === 'True' ? 0 : Math.round(Number(px)),
        });
      });
      expected.rows.forEach((entry, row) => {
        const [px, hidden] = entry.split('|');
        expect({
          sheet: expected.name,
          row,
          px: rowPixels(sheet, row),
        }).toEqual({
          sheet: expected.name,
          row,
          px: hidden === 'True' ? 0 : Math.round(Number(px)),
        });
      });
    }
  });
});
