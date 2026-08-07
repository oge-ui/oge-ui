import { computePivot, pathKey } from '@oge-ui/core';
import type { PivotFieldConfig } from '@oge-ui/core';
import { buildPivotWorkbook } from './index';

interface Sale {
  region: string;
  city: string;
  year: number;
  quarter: string;
  amount: number;
}

const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, quarter: 'Q1', amount: 100 },
  { region: 'EU', city: 'Paris', year: 2024, quarter: 'Q2', amount: 50 },
  { region: 'US', city: 'NYC', year: 2025, quarter: 'Q1', amount: 300 },
];

const FIELDS: PivotFieldConfig[] = [
  { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
  { id: 'city', dataField: 'city', area: 'row', areaIndex: 1 },
  { id: 'year', dataField: 'year', area: 'column', areaIndex: 0 },
  { id: 'quarter', dataField: 'quarter', area: 'column', areaIndex: 1 },
  {
    id: 'amount',
    dataField: 'amount',
    caption: 'Amount',
    area: 'data',
    areaIndex: 0,
    summaryType: 'sum',
  },
];

describe('buildPivotWorkbook', () => {
  it('merges multi-level column headers and keeps values typed', () => {
    const result = computePivot({
      rows: SALES,
      fields: FIELDS,
      rowExpandedPaths: new Set([pathKey(['EU'])]),
      columnExpandedPaths: new Set([pathKey([2024])]),
    });
    const sheet = buildPivotWorkbook(result, {
      sheetName: 'Sales',
    }).getWorksheet('Sales');
    expect(sheet).toBeDefined();

    // columns: 2024 (total), Q1, Q2, 2025, Grand Total → excel cols 2..6
    expect(sheet?.getCell(1, 2).value).toBe('2024');
    expect(sheet?.getCell(1, 2).font?.bold).toBe(true);
    // '2024' spans its own total column + both quarters
    expect(sheet?.getCell(1, 4).master.address).toBe('B1');
    expect(sheet?.getCell(2, 3).value).toBe('Q1');
    // leaf-at-level-0 headers merge down to the full header depth
    expect(sheet?.getCell(2, 5).master.address).toBe('E1');
    expect(sheet?.getCell(1, 5).value).toBe('2025');
    expect(sheet?.getCell(1, 6).value).toBe('Grand Total');

    // row headers keep the tree indentation, data starts under the header block
    expect(sheet?.getCell(3, 1).value).toBe('EU');
    expect(sheet?.getCell(4, 1).value).toBe('  Berlin');
    expect(sheet?.getCell(7, 1).value).toBe('Grand Total');

    // numbers stay numbers; empty intersections stay blank
    expect(sheet?.getCell(3, 2).value).toBe(150); // EU × 2024 total
    expect(sheet?.getCell(4, 3).value).toBe(100); // Berlin × Q1
    expect(sheet?.getCell(4, 5).value).toBe(''); // Berlin × 2025
    expect(sheet?.getCell(7, 6).value).toBe(450); // grand × grand
  });

  it('adds a measure caption line when several measures are shown', () => {
    const fields: PivotFieldConfig[] = [
      ...FIELDS,
      {
        id: 'count',
        dataField: 'amount',
        caption: 'Orders',
        area: 'data',
        areaIndex: 1,
        summaryType: 'count',
      },
    ];
    const result = computePivot({ rows: SALES, fields });
    const sheet = buildPivotWorkbook(result, {
      grandTotalText: 'Sum',
    }).getWorksheet('Pivot');

    // collapsed roots: 2024, 2025, Sum — two excel columns per pivot column
    expect(sheet?.getCell(1, 2).value).toBe('2024');
    expect(sheet?.getCell(1, 3).master.address).toBe('B1');
    expect(sheet?.getCell(2, 2).value).toBe('Amount');
    expect(sheet?.getCell(2, 3).value).toBe('Orders');
    expect(sheet?.getCell(1, 6).value).toBe('Sum');

    expect(sheet?.getCell(3, 1).value).toBe('EU');
    expect(sheet?.getCell(3, 2).value).toBe(150); // EU × 2024 sum
    expect(sheet?.getCell(3, 3).value).toBe(2); // EU × 2024 count
    expect(sheet?.getCell(5, 1).value).toBe('Sum');
    expect(sheet?.getCell(5, 6).value).toBe(450);
  });
});
