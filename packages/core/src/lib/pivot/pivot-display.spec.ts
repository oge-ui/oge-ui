import { computePivot, pathKey } from './compute-pivot';
import type { PivotFieldConfig, PivotSummaryDisplayMode } from './pivot-types';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
}

const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100 },
  { region: 'EU', city: 'Berlin', year: 2025, amount: 200 },
  { region: 'EU', city: 'Paris', year: 2024, amount: 50 },
  { region: 'US', city: 'NYC', year: 2024, amount: 300 },
  { region: 'US', city: 'NYC', year: 2025, amount: 100 },
];

function fieldsWith(
  displayMode: PivotSummaryDisplayMode,
  extra?: Partial<PivotFieldConfig>
): PivotFieldConfig[] {
  return [
    { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
    { id: 'year', dataField: 'year', area: 'column', areaIndex: 0 },
    {
      id: 'amount',
      dataField: 'amount',
      area: 'data',
      summaryType: 'sum',
      summaryDisplayMode: displayMode,
      ...extra,
    },
  ];
}

function matrix(result: ReturnType<typeof computePivot>) {
  return result.values.map((line) => line.map((cell) => cell[0]));
}

describe('pivot display modes', () => {
  // base (no mode): rows EU=150/200/350, US=300/100/400, G=450/300/750

  it('percentOfGrandTotal divides every cell by the overall grand', () => {
    const result = computePivot({ rows: SALES, fields: fieldsWith('percentOfGrandTotal') });
    expect(matrix(result)[0][0]).toBeCloseTo(150 / 750);
    expect(matrix(result)[2][2]).toBeCloseTo(1);
  });

  it('percentOfColumnGrandTotal divides by the grand-total row of the column', () => {
    const result = computePivot({
      rows: SALES,
      fields: fieldsWith('percentOfColumnGrandTotal'),
    });
    expect(matrix(result)[0][0]).toBeCloseTo(150 / 450);
    expect(matrix(result)[1][1]).toBeCloseTo(100 / 300);
    expect(matrix(result)[2][0]).toBeCloseTo(1); // grand row over itself
  });

  it('percentOfRowGrandTotal divides by the row grand-total column', () => {
    const result = computePivot({ rows: SALES, fields: fieldsWith('percentOfRowGrandTotal') });
    expect(matrix(result)[0][0]).toBeCloseTo(150 / 350);
    expect(matrix(result)[0][2]).toBeCloseTo(1);
  });

  it('percentOfColumnTotal uses the nearest parent subtotal row', () => {
    const fields: PivotFieldConfig[] = [
      { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
      { id: 'city', dataField: 'city', area: 'row', areaIndex: 1 },
      { id: 'year', dataField: 'year', area: 'column', areaIndex: 0 },
      {
        id: 'amount',
        dataField: 'amount',
        area: 'data',
        summaryType: 'sum',
        summaryDisplayMode: 'percentOfColumnTotal',
      },
    ];
    const result = computePivot({
      rows: SALES,
      fields,
      rowExpandedPaths: new Set([pathKey(['EU'])]),
    });
    // rows: EU (subtotal line), Berlin, Paris, US, GRAND; col 2024: 150, 100, 50, 300, 450
    const col2024 = matrix(result).map((line) => line[0]);
    expect(col2024[1]).toBeCloseTo(100 / 150); // Berlin vs its parent EU total
    expect(col2024[2]).toBeCloseTo(50 / 150);
    expect(col2024[3]).toBeCloseTo(300 / 450); // top-level US vs grand
  });

  it('absolute and percent variation compare against the previous column', () => {
    const absolute = computePivot({ rows: SALES, fields: fieldsWith('absoluteVariation') });
    // first column has no predecessor; totals are excluded from the chain
    expect(matrix(absolute)[0]).toEqual([null, 50, null]); // EU: 200-150
    const percent = computePivot({ rows: SALES, fields: fieldsWith('percentVariation') });
    expect(matrix(percent)[1][1]).toBeCloseTo((100 - 300) / 300);
  });

  it('running totals accumulate along the requested axis and reset per group', () => {
    const result = computePivot({
      rows: SALES,
      fields: fieldsWith('none', { runningTotal: { direction: 'row' } }),
    });
    // down the 2024 column: EU 150 → US 150+300=450 (single group at top level)
    expect(matrix(result).map((line) => line[0]).slice(0, 2)).toEqual([150, 450]);
  });
});
