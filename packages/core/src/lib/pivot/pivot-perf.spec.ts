import { PivotEngine, pathKey } from './compute-pivot';
import type { PivotFieldConfig } from './pivot-types';

interface Row {
  region: string;
  country: string;
  city: string;
  year: number;
  quarter: number;
  amount: number;
  units: number;
}

const FIELDS: PivotFieldConfig[] = [
  { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
  { id: 'country', dataField: 'country', area: 'row', areaIndex: 1 },
  { id: 'city', dataField: 'city', area: 'row', areaIndex: 2 },
  { id: 'year', dataField: 'year', area: 'column', areaIndex: 0 },
  { id: 'quarter', dataField: 'quarter', area: 'column', areaIndex: 1 },
  {
    id: 'amount',
    dataField: 'amount',
    area: 'data',
    areaIndex: 0,
    summaryType: 'sum',
  },
  {
    id: 'units',
    dataField: 'units',
    area: 'data',
    areaIndex: 1,
    summaryType: 'avg',
  },
];

function makeRows(count: number): Row[] {
  const rows: Row[] = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = {
      region: `Region ${String(i % 5)}`,
      country: `Country ${String(i % 20)}`,
      city: `City ${String(i % 100)}`,
      year: 2020 + (i % 5),
      quarter: 1 + (i % 4),
      amount: (i * 2654435761) % 10_000,
      units: i % 50,
    };
  }
  return rows;
}

describe('pivot performance budgets', () => {
  it('first compute of 100k rows (3 row + 2 column fields, 2 measures) stays in budget', () => {
    const rows = makeRows(100_000);
    const start = performance.now();
    const engine = new PivotEngine({ rows, fields: FIELDS });
    const result = engine.materialize({});
    const elapsed = performance.now() - start;
    expect(result.rowLeafCount).toBe(6); // 5 regions + grand
    // Target ~250ms on dev machines; generous bound for shared CI runners.
    expect(elapsed).toBeLessThan(1_500);
  });

  it('expansion re-materialization only pays the visible phase', () => {
    const rows = makeRows(100_000);
    const engine = new PivotEngine({ rows, fields: FIELDS });
    engine.materialize({}); // warm
    const start = performance.now();
    engine.materialize({
      rowExpandedPaths: new Set([
        pathKey(['Region 0']),
        pathKey(['Region 0', 'Country 0']),
      ]),
      columnExpandedPaths: new Set([pathKey([2020])]),
    });
    const elapsed = performance.now() - start;
    // Target ~30ms; generous bound for shared CI runners.
    expect(elapsed).toBeLessThan(400);
  });
});
