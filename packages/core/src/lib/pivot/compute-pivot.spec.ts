import { PivotEngine, computePivot, pathKey } from './compute-pivot';
import type { PivotFieldConfig } from './pivot-types';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number | null;
  hired?: string;
}

const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100 },
  { region: 'EU', city: 'Berlin', year: 2025, amount: 200 },
  { region: 'EU', city: 'Paris', year: 2024, amount: 50 },
  { region: 'US', city: 'NYC', year: 2024, amount: 300 },
  { region: 'US', city: 'NYC', year: 2025, amount: null },
];

const FIELDS: PivotFieldConfig[] = [
  { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
  { id: 'city', dataField: 'city', area: 'row', areaIndex: 1 },
  { id: 'year', dataField: 'year', area: 'column', areaIndex: 0 },
  {
    id: 'amount',
    dataField: 'amount',
    area: 'data',
    areaIndex: 0,
    summaryType: 'sum',
  },
  {
    id: 'count',
    dataField: 'amount',
    area: 'data',
    areaIndex: 1,
    summaryType: 'count',
  },
];

/** Text map of the matrix: rows/cols labeled by path + total flags. */
function matrixOf(result: ReturnType<typeof computePivot>, measure = 0) {
  return result.values.map((line) => line.map((cell) => cell[measure]));
}

describe('computePivot', () => {
  it('aggregates collapsed roots with grand totals on both axes', () => {
    const result = computePivot({ rows: SALES, fields: FIELDS });
    // rows: EU, US, GRAND — columns: 2024, 2025, GRAND (roots collapsed)
    expect(result.rowLeafCount).toBe(3);
    expect(result.columnLeafCount).toBe(3);
    expect(matrixOf(result)).toEqual([
      [150, 200, 350], // EU: 2024=100+50, 2025=200
      [300, 0, 300], // US: 2025 amount null → sum 0
      [450, 200, 650], // grand row
    ]);
    // count measure counts rows (nulls included)
    expect(matrixOf(result, 1)).toEqual([
      [2, 1, 3],
      [1, 1, 2],
      [3, 2, 5],
    ]);
  });

  it('expands a row node: the parent line leads with subtotals, children follow', () => {
    const result = computePivot({
      rows: SALES,
      fields: FIELDS,
      rowExpandedPaths: new Set([pathKey(['EU'])]),
    });
    // rows: EU (subtotal line), Berlin, Paris, US, GRAND
    expect(result.rowLeafCount).toBe(5);
    expect(matrixOf(result).map((line) => line[2])).toEqual([
      350, 300, 50, 300, 650,
    ]);
    const eu = result.rowRoot[0];
    expect(eu.expanded).toBe(true);
    expect(eu.isTotal).toBe(true); // its own line carries the subtotal values
    expect(eu.leafIndex).toBe(0);
    expect(eu.leafCount).toBe(3); // itself + Berlin + Paris
    expect(eu.children.map((child) => String(child.value))).toEqual([
      'Berlin',
      'Paris',
    ]);
  });

  it('honors total visibility settings', () => {
    const result = computePivot({
      rows: SALES,
      fields: FIELDS,
      rowExpandedPaths: new Set([pathKey(['EU'])]),
      settings: {
        showRowTotals: false,
        showRowGrandTotals: false,
        showColumnGrandTotals: false,
      },
    });
    // rows: EU (blank expander line), Berlin, Paris, US — no grand rows/columns
    expect(result.rowLeafCount).toBe(4);
    expect(result.columnLeafCount).toBe(2);
    expect(matrixOf(result)[0]).toEqual([null, null]); // totals hidden → blank parent line
    expect(matrixOf(result)[1]).toEqual([100, 200]); // Berlin unaffected
  });

  it('applies include/exclude field filters before pivoting', () => {
    const result = computePivot({
      rows: SALES,
      fields: [
        ...FIELDS,
        {
          id: 'cityFilter',
          dataField: 'city',
          area: 'filter',
          filterValues: ['NYC'],
          filterType: 'exclude',
        },
      ],
    });
    expect(matrixOf(result).at(-1)).toEqual([150, 200, 350]); // NYC rows gone
  });

  it('supports zero row fields by emitting a single grand slot', () => {
    const result = computePivot({
      rows: SALES,
      fields: FIELDS.filter((field) => field.area !== 'row'),
      settings: { showRowGrandTotals: false }, // ignored when the axis is empty
    });
    expect(result.rowLeafCount).toBe(1);
    expect(matrixOf(result)[0]).toEqual([450, 200, 650]);
  });

  it('groupInterval buckets dates by year', () => {
    const rows: Sale[] = [
      { region: 'EU', city: 'B', year: 0, amount: 10, hired: '2024-05-01' },
      { region: 'EU', city: 'B', year: 0, amount: 20, hired: '2024-11-01' },
      { region: 'EU', city: 'B', year: 0, amount: 5, hired: '2025-01-15' },
    ];
    const result = computePivot({
      rows,
      fields: [
        {
          id: 'hired',
          dataField: 'hired',
          area: 'column',
          groupInterval: 'year',
        },
        { id: 'amount', dataField: 'amount', area: 'data', summaryType: 'sum' },
      ],
    });
    expect(
      result.columnRoot.filter((n) => !n.isGrandTotal).map((n) => n.value),
    ).toEqual([2024, 2025]);
    expect(matrixOf(result)[0]).toEqual([30, 5, 35]);
  });

  it('custom measures run the out-of-band reducer over the cell rows', () => {
    const result = computePivot({
      rows: SALES,
      fields: [
        { id: 'region', dataField: 'region', area: 'row' },
        {
          id: 'cities',
          dataField: 'city',
          area: 'data',
          summaryType: 'custom',
          summaryName: 'distinctCities',
        },
      ],
      customSummaries: {
        distinctCities: (rows) =>
          new Set(rows.map((r) => (r as Sale).city)).size,
      },
    });
    expect(matrixOf(result).map((line) => line[0])).toEqual([2, 1, 3]);
  });

  it('property: leaf sums add up to the grand total', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      region: `R${String(i % 7)}`,
      city: `C${String(i % 13)}`,
      year: 2020 + (i % 4),
      amount: (i * 37) % 100,
    }));
    const engine = new PivotEngine({ rows, fields: FIELDS });
    const collapsed = engine.materialize({});
    const grand = matrixOf(collapsed).at(-1)?.at(-1);
    const regions = matrixOf(collapsed)
      .slice(0, -1)
      .reduce((sum, line) => sum + (line.at(-1) as number), 0);
    expect(regions).toBe(grand);
  });

  it('drillDownRows returns exactly the rows behind a cell', () => {
    const engine = new PivotEngine({ rows: SALES, fields: FIELDS });
    const rows = engine.drillDownRows(['EU'], [2024]);
    expect(rows.map((r) => r.amount).sort()).toEqual([100, 50].sort());
    expect(engine.drillDownRows(['EU', 'Berlin'], [2025])).toHaveLength(1);
    expect(engine.drillDownRows([], [])).toHaveLength(5); // grand cell
  });
});
