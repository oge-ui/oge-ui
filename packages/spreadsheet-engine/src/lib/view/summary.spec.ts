import { ogeCellError } from '../model/cell';
import { createOgeWorkbook } from '../model/workbook';
import { OgeStyleResolver } from '../paint/resolve-style';
import { OgeSheetLayout } from '../paint/sheet-layout';
import { ogeSelectionSummary } from './summary';

function sheetWith(cells: [number, number, unknown][]) {
  const workbook = createOgeWorkbook();
  const sheet = workbook.sheets[0];
  for (const [row, col, value] of cells)
    sheet.setCell(row, col, { value: value as never });
  const layout = () =>
    new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
  return { sheet, layout };
}

const range = (top: number, left: number, bottom: number, right: number) => ({
  top,
  left,
  bottom,
  right,
});

describe('ogeSelectionSummary', () => {
  it('counts what is there and adds the numbers', () => {
    const { sheet, layout } = sheetWith([
      [0, 0, 4200.5],
      [1, 0, 5100],
      [0, 1, 'Ada'],
      [1, 1, true],
    ]);
    expect(ogeSelectionSummary(sheet, layout(), [range(0, 0, 1, 1)])).toEqual({
      count: 4,
      numbers: 2,
      sum: 9300.5,
      average: 4650.25,
    });
    // text only: a count, nothing to add
    expect(ogeSelectionSummary(sheet, layout(), [range(0, 1, 0, 1)])).toEqual({
      count: 1,
      numbers: 0,
      sum: null,
      average: null,
    });
  });

  it('keeps only the count when an error is selected', () => {
    const { sheet, layout } = sheetWith([
      [0, 0, 36],
      [1, 0, ogeCellError('#DIV/0!')],
    ]);
    expect(ogeSelectionSummary(sheet, layout(), [range(0, 0, 1, 0)])).toEqual({
      count: 2,
      numbers: 1,
      sum: null,
      average: null,
    });
  });

  it('leaves hidden rows and columns out', () => {
    const { sheet, layout } = sheetWith([
      [0, 0, 130],
      [1, 0, 140],
      [2, 0, 150],
      [3, 0, 160],
      [0, 1, 1000],
    ]);
    sheet.setRow(1, { hidden: true });
    sheet.setRow(2, { hidden: true });
    sheet.setColumns(1, 1, { hidden: true });
    expect(
      ogeSelectionSummary(sheet, layout(), [range(0, 0, 3, 1)]),
    ).toMatchObject({ count: 2, sum: 290 });
  });

  it('adds several ranges like SUM does — overlaps twice — and counts formulas showing empty', () => {
    const { sheet, layout } = sheetWith([
      [0, 0, 1],
      [1, 0, 2],
    ]);
    sheet.setCell(2, 0, { formula: 'A1&""', value: '' });
    sheet.setCell(3, 0, { formula: 'NOW()' });
    expect(
      ogeSelectionSummary(sheet, layout(), [
        range(0, 0, 1, 0),
        range(1, 0, 1, 0),
      ]),
    ).toMatchObject({ count: 3, sum: 5 });
    expect(
      ogeSelectionSummary(sheet, layout(), [range(0, 0, 3, 0)]).count,
    ).toBe(4);
  });
});
