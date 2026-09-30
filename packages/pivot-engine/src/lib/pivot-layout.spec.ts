import {
  computePivot,
  pathKey,
  type PivotFieldConfig,
  type PivotLoadResult,
} from '@oge-ui/core';
import { OGE_DEFAULT_PIVOT_MESSAGES as MSG } from './pivot-messages';
import {
  pivotAxisDepth,
  pivotAxisLines,
  pivotColumnHeaderCells,
  pivotColumnWindow,
  pivotExpandablePaths,
  pivotHeaderCellKey,
  pivotHeaderCellsInWindow,
  pivotMatrixKeyTarget,
  pivotMatrixTemplate,
  pivotResultFromPayload,
  pivotRowWindow,
  pivotSlotFlags,
  pivotVirtualColumnWidth,
  pivotWindowIndexes,
} from './pivot-layout';

const SALES = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100 },
  { region: 'EU', city: 'Berlin', year: 2025, amount: 200 },
  { region: 'EU', city: 'Paris', year: 2024, amount: 50 },
  { region: 'US', city: 'NYC', year: 2024, amount: 300 },
];

const FIELDS: PivotFieldConfig[] = [
  { id: 'city', dataField: 'city', area: 'column', areaIndex: 0 },
  { id: 'year', dataField: 'year', area: 'column', areaIndex: 1 },
  { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
  { id: 'amount', dataField: 'amount', area: 'data', summaryType: 'sum' },
];

describe('axis projections', () => {
  const result = computePivot({
    rows: SALES,
    fields: FIELDS,
    columnExpandedPaths: new Set([pathKey(['Berlin'])]),
  });

  it('labels lines, totals and the grand total', () => {
    expect(pivotAxisLines(result.rowRoot, MSG).map((l) => l.text)).toEqual([
      'EU',
      'US',
      'Grand Total',
    ]);
    const blank = pivotAxisLines(
      [
        {
          value: '',
          text: '',
          path: [''],
          children: [],
          expanded: false,
          hasChildren: false,
          leafIndex: 0,
          leafCount: 1,
          isTotal: false,
          isGrandTotal: false,
        },
      ],
      MSG,
    );
    expect(blank[0].text).toBe('(Blank)');
  });

  it('lays out a spanning multi-row column header', () => {
    const depth = pivotAxisDepth(result.columnRoot);
    expect(depth).toBe(2);
    const cells = pivotColumnHeaderCells(result.columnRoot, depth, MSG);
    const berlin = cells.find((c) => c.text === 'Berlin');
    expect(berlin).toMatchObject({ rowStart: 1, rowEnd: 2, span: 3 });
    // Berlin's own subtotal slot under the spanning parent
    const subtotal = cells.find(
      (c) => c.isTotal && c.rowStart === 2 && c.path[0] === 'Berlin',
    );
    expect(subtotal).toMatchObject({ text: '', rowEnd: 3, span: 1 });
    // collapsed siblings merge down to the full depth
    expect(cells.find((c) => c.text === 'NYC')).toMatchObject({
      rowStart: 1,
      rowEnd: 3,
    });
    expect(new Set(cells.map(pivotHeaderCellKey)).size).toBe(cells.length);
  });

  it('flags subtotal and grand-total slots', () => {
    const flags = pivotSlotFlags(result.columnRoot, result.columnLeafCount);
    expect(flags.grand.at(-1)).toBe(true);
    expect(flags.total.filter(Boolean)).toHaveLength(1);
  });

  it('lists expandable paths', () => {
    expect(pivotExpandablePaths(result.columnRoot)).toEqual([
      ['Berlin'],
      ['NYC'],
      ['Paris'],
    ]);
  });
});

describe('pivotResultFromPayload', () => {
  const payload: PivotLoadResult = {
    rows: [
      { value: 'EU', hasChildren: true, children: [{ value: 'Berlin' }] },
      { value: 'US', hasChildren: true },
    ],
    columns: [{ value: 2024 }],
    values: [[[150]], [[100]], [[300]]],
    rowTotals: [[[150]], [[100]], [[300]]],
    columnTotals: [[[450]]],
    grandTotal: [450],
  };
  const measures: PivotFieldConfig[] = [
    { id: 'amount', dataField: 'amount', area: 'data' },
  ];

  it('rebuilds parent-first axes with grand-total slots', () => {
    const result = pivotResultFromPayload(payload, measures, {
      showRowGrandTotals: true,
      showColumnGrandTotals: true,
    });
    expect(result.rowLeafCount).toBe(4);
    expect(result.columnLeafCount).toBe(2);
    expect(result.rowRoot[0]).toMatchObject({
      expanded: true,
      isTotal: true,
      leafCount: 2,
    });
    expect(result.rowRoot[1].hasChildren).toBe(true);
    expect(result.values[0]).toEqual([[150], [150]]);
    expect(result.values[3]).toEqual([[450], [450]]);
  });

  it('omits the grand slots when hidden', () => {
    const result = pivotResultFromPayload(payload, measures, {
      showRowGrandTotals: false,
      showColumnGrandTotals: false,
    });
    expect(result.rowLeafCount).toBe(3);
    expect(result.values[0]).toEqual([[150]]);
  });
});

describe('two-axis virtualization', () => {
  it('windows rows below the header block with overscan', () => {
    expect(pivotRowWindow(1000, 0, 320, 2)).toEqual({ start: 0, end: 14 });
    expect(pivotRowWindow(1000, 3200, 320, 2)).toEqual({
      start: 92,
      end: 114,
    });
    expect(pivotRowWindow(5, 3200, 320, 2)).toEqual({ start: 92, end: 92 });
  });

  it('windows columns right of the row headers', () => {
    expect(pivotColumnWindow(100, 0, 440, 110)).toEqual({ start: 0, end: 9 });
    expect(pivotVirtualColumnWidth(1)).toBe(110);
    expect(pivotVirtualColumnWidth(3)).toBe(288);
    expect(pivotWindowIndexes({ start: 2, end: 5 })).toEqual([2, 3, 4]);
  });

  it('keeps header cells that intersect the window', () => {
    const cell = (columnStart: number, span: number) =>
      ({ columnStart, span }) as Parameters<
        typeof pivotHeaderCellsInWindow
      >[0][number];
    const cells = [cell(1, 2), cell(3, 1), cell(4, 5)];
    expect(pivotHeaderCellsInWindow(cells, { start: 2, end: 4 })).toEqual([
      cells[1],
      cells[2],
    ]);
  });

  it('templates tracks per mode', () => {
    const counts = { rowLeafCount: 10, columnLeafCount: 3 };
    expect(pivotMatrixTemplate(counts, false, 2, 110)).toEqual({
      rows: null,
      columns: 'minmax(160px, max-content) repeat(3, minmax(90px, auto))',
    });
    expect(pivotMatrixTemplate(counts, true, 2, 110)).toEqual({
      rows: 'repeat(2, 32px) repeat(10, 32px)',
      columns: '200px repeat(3, 110px)',
    });
  });
});

describe('pivotMatrixKeyTarget', () => {
  const at = { row: 1, col: 1 };
  it('clamps arrows and jumps with Home/End', () => {
    expect(pivotMatrixKeyTarget('ArrowDown', at, 1, 4)).toEqual(at);
    expect(pivotMatrixKeyTarget('ArrowUp', at, 1, 4)).toEqual({
      row: 0,
      col: 1,
    });
    expect(pivotMatrixKeyTarget('ArrowRight', at, 1, 4)).toEqual({
      row: 1,
      col: 2,
    });
    expect(pivotMatrixKeyTarget('ArrowLeft', { row: 0, col: 0 }, 1, 4)).toEqual(
      {
        row: 0,
        col: 0,
      },
    );
    expect(pivotMatrixKeyTarget('Home', at, 1, 4)).toEqual({ row: 1, col: 0 });
    expect(pivotMatrixKeyTarget('End', at, 1, 4)).toEqual({ row: 1, col: 4 });
    expect(pivotMatrixKeyTarget('Enter', at, 1, 4)).toBeNull();
  });
});
