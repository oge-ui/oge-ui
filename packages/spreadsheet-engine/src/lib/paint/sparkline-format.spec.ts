import { ogeCellError, type OgeCellValue } from '../model/cell';
import type { OgeSparklineGroup } from '../model/sparkline';
import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import { OgeStyleResolver } from './resolve-style';
import { OgeSparklineFormatter } from './sparkline-format';

function group(
  ref: string | undefined,
  options: Partial<OgeSparklineGroup> = {},
  cell = { row: 0, col: 0 },
): OgeSparklineGroup {
  return {
    type: 'line',
    sparklines: [{ cell, ...(ref ? { ref } : {}) }],
    colors: {},
    lineWeight: 0.75,
    markers: false,
    high: false,
    low: false,
    first: false,
    last: false,
    negative: false,
    displayXAxis: false,
    displayHidden: false,
    displayEmptyCellsAs: 'zero',
    minAxisType: 'individual',
    maxAxisType: 'individual',
    rightToLeft: false,
    ...options,
  };
}

function formatter(workbook: OgeWorkbook, ...groups: OgeSparklineGroup[]) {
  const sheet = workbook.sheets[0];
  sheet.sparklineGroups.push(...groups);
  return new OgeSparklineFormatter(
    workbook,
    sheet,
    new OgeStyleResolver(workbook),
  );
}

/** A workbook whose first sheet holds `values` in row 1 from B (B1, C1, …). */
function data(values: readonly (OgeCellValue | undefined)[]): OgeWorkbook {
  const workbook = createOgeWorkbook();
  values.forEach((v, i) => workbook.sheets[0].setValue(0, 1 + i, v));
  return workbook;
}

describe('OgeSparklineFormatter', () => {
  it('finds the sparklines by cell and row; a later group wins a cell', () => {
    const workbook = data([1, 2, 3]);
    const f = formatter(
      workbook,
      group('B1:D1', {}, { row: 2, col: 0 }),
      group('B1:D1', { type: 'column' }, { row: 2, col: 5 }),
      group('B1:D1', { type: 'stacked' }, { row: 2, col: 0 }),
    );
    expect(f.active).toBe(true);
    expect(f.columns(2)).toEqual([0, 5, 0]);
    expect(f.columns(1)).toEqual([]);
    expect(f.at(2, 0)?.type).toBe('stacked');
    expect(f.at(2, 5)?.type).toBe('column');
    expect(f.at(1, 1)).toBeUndefined();
    expect(formatter(createOgeWorkbook()).active).toBe(false);
  });

  it('reads the points as Excel plots them', () => {
    const values = [
      3,
      'text',
      true,
      false,
      ogeCellError('#N/A'),
      ogeCellError('#DIV/0!'),
      undefined,
    ];
    const points = (empty: OgeSparklineGroup['displayEmptyCellsAs']) =>
      formatter(
        data(values),
        group('B1:H1', { displayEmptyCellsAs: empty }),
      ).at(0, 0)?.values;
    expect(points('zero')).toEqual([3, 0, 1, 0, 'join', 0, 0]);
    expect(points('gap')).toEqual([3, 0, 1, 0, 'join', 0, 'gap']);
    expect(points('span')).toEqual([3, 0, 1, 0, 'join', 0, 'join']);
  });

  it('drops hidden rows and columns unless the group shows hidden data', () => {
    const workbook = data([1, 2, 3, 4]);
    const sheet = workbook.sheets[0];
    sheet.setColumns(2, 2, { hidden: true });
    for (let row = 0; row < 4; row++) sheet.setValue(row, 8, row + 10);
    sheet.setRow(1, { hidden: true });
    const f = formatter(
      workbook,
      group('B1:E1', {}, { row: 5, col: 0 }),
      group('B1:E1', { displayHidden: true }, { row: 5, col: 1 }),
      group('I1:I4', {}, { row: 5, col: 2 }),
    );
    expect(f.at(5, 0)?.values).toEqual([1, 3, 4]);
    expect(f.at(5, 1)?.values).toEqual([1, 2, 3, 4]);
    expect(f.at(5, 2)?.values).toEqual([10, 12, 13]);
  });

  it('counts rows a zero-height sheet does not list as hidden', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    sheet.format = { ...sheet.format, zeroHeight: true };
    // B1 and B3 hold values, B2 and B4 none; only row 4 is listed among those
    sheet.setValue(0, 1, 1);
    sheet.setValue(2, 1, 3);
    sheet.setRow(3, { customHeight: false });
    expect(formatter(workbook, group('B1:B4')).at(0, 0)?.values).toEqual([
      1, 3, 0,
    ]);
  });

  it('reads another sheet by name, quoted or not, in any case', () => {
    const workbook = createOgeWorkbook();
    for (const name of ['Q1 sales', 'Jan', 'Mar']) {
      const other = workbook.addSheet(name);
      other.setValue(1, 1, 5);
      other.setValue(1, 2, 7);
    }
    const f = formatter(
      workbook,
      group("'q1 SALES'!B2:C2", {}, { row: 0, col: 0 }),
      group('Nowhere!B2:C2', {}, { row: 0, col: 1 }),
      group('2:2', {}, { row: 0, col: 2 }),
      group(undefined, {}, { row: 0, col: 3 }),
      group('Jan:Mar!B2:C2', {}, { row: 0, col: 4 }),
    );
    expect(f.at(0, 0)?.values).toEqual([5, 7]);
    // no such sheet, whole rows, no data, several sheets: nothing to draw
    expect(f.at(0, 1)).toBeUndefined();
    expect(f.at(0, 2)).toBeUndefined();
    expect(f.at(0, 3)).toBeUndefined();
    expect(f.at(0, 4)).toBeUndefined();
  });

  it('shares a group axis across the group’s sparklines', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    [
      [1, 2],
      [8, 9],
    ].forEach((row, r) => row.forEach((v, c) => sheet.setValue(r, 1 + c, v)));
    const shared = group('B1:C1', {
      minAxisType: 'group',
      maxAxisType: 'group',
      sparklines: [
        { cell: { row: 0, col: 0 }, ref: 'B1:C1' },
        { cell: { row: 1, col: 0 }, ref: 'B2:C2' },
      ],
    });
    const f = formatter(workbook, shared);
    expect(f.at(0, 0)?.axis).toEqual({ lo: 1 - 8 * 0.010101010101, hi: 9 });
    expect(f.at(1, 0)?.axis).toEqual(f.at(0, 0)?.axis);
    // custom ends are the group's own
    const custom = formatter(
      data([1, 2]),
      group('B1:C1', {
        minAxisType: 'custom',
        manualMin: -1,
        maxAxisType: 'custom',
        manualMax: 4,
      }),
    );
    expect(custom.at(0, 0)?.axis).toEqual({ lo: -1, hi: 4 });
  });

  it('takes the group’s colours, Excel’s default style for the rest', () => {
    const workbook = data([1, 2]);
    const resolver = new OgeStyleResolver(workbook);
    const f = formatter(
      workbook,
      group('B1:C1', { colors: { series: { rgb: 'FF0000FF' } } }),
    );
    const colors = f.at(0, 0)?.colors;
    expect(colors?.series).toBe('#0000FF');
    // accent 1, darker 50%, for the markers; accent 2 for negative points
    expect(colors?.markers).toBe(
      resolver.color({ theme: 4, tint: -0.499984740745262 }, null),
    );
    expect(colors?.negative).toBe(resolver.color({ theme: 5 }, null));
    expect(colors?.axis).toBe('#000000');
  });

  it('places the points of a date axis by their dates', () => {
    const workbook = data([1, 2, 3]);
    const sheet = workbook.sheets[0];
    [45658, 45659, 45668].forEach((d, i) => sheet.setValue(1, 1 + i, d));
    const dated = formatter(
      workbook,
      group('B1:D1', { dateRef: 'B2:D2' }),
      group('B1:D1', { dateRef: 'B2:C2' }, { row: 0, col: 5 }),
    );
    expect(dated.at(0, 0)?.dates).toEqual([45658, 45659, 45668]);
    // dates that do not match the data one for one are not used
    expect(dated.at(0, 5)?.dates).toBeUndefined();
    sheet.setColumns(2, 2, { hidden: true });
    const hidden = formatter(workbook);
    expect(hidden.at(0, 0)?.dates).toEqual([45658, 45668]);
  });

  it('builds each sparkline once', () => {
    const f = formatter(data([1, 2]), group('B1:C1'));
    expect(f.at(0, 0)).toBe(f.at(0, 0));
  });
});
