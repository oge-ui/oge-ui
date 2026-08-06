import { createFilterPredicate } from '../filtering/filter-evaluator';
import { drillDownFilter, pathToFilterExpr } from './pivot-drill-down';
import { LocalPivotStore } from './local-pivot-store';
import type { PivotFieldConfig } from './pivot-types';

interface Sale {
  region: string;
  city: string;
  hired: string;
  price: number;
  amount: number;
}

const ROWS: Sale[] = [
  { region: 'EU', city: 'Berlin', hired: '2024-04-01', price: 12, amount: 100 },
  { region: 'EU', city: 'Paris', hired: '2025-06-01', price: 27, amount: 50 },
  { region: 'US', city: 'NYC', hired: '2024-01-01', price: 5, amount: 300 },
];

describe('pathToFilterExpr', () => {
  const fields: PivotFieldConfig[] = [
    { id: 'region', dataField: 'region', area: 'row' },
    { id: 'city', dataField: 'city', area: 'row' },
  ];

  it('builds an and-chain of eq conditions (isnull for blanks)', () => {
    expect(pathToFilterExpr(fields, ['EU', 'Berlin'])).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'region', op: 'eq', value: 'EU' },
        { type: 'binary', field: 'city', op: 'eq', value: 'Berlin' },
      ],
    });
    expect(pathToFilterExpr(fields, [null])).toEqual({
      type: 'binary',
      field: 'region',
      op: 'isnull',
    });
  });

  it('expands year and numeric intervals to ranges the evaluator can run', () => {
    const intervalFields: PivotFieldConfig[] = [
      { id: 'hired', dataField: 'hired', area: 'row', groupInterval: 'year' },
      { id: 'price', dataField: 'price', area: 'column', groupInterval: 10 },
    ];
    const yearExpr = pathToFilterExpr([intervalFields[0]], [2024]);
    expect(yearExpr).not.toBeNull();
    const matches = ROWS.filter(createFilterPredicate(yearExpr as never));
    expect(matches.map((r) => r.city)).toEqual(['Berlin', 'NYC']);

    const priceExpr = pathToFilterExpr([intervalFields[1]], [20]);
    const priceMatches = ROWS.filter(createFilterPredicate(priceExpr as never));
    expect(priceMatches.map((r) => r.city)).toEqual(['Paris']);
  });

  it('returns null for date parts a plain range cannot express', () => {
    expect(
      pathToFilterExpr([{ id: 'h', dataField: 'hired', area: 'row', groupInterval: 'month' }], [4])
    ).toBeNull();
  });

  it('drillDownFilter combines both axis paths', () => {
    const expr = drillDownFilter(
      [{ id: 'region', dataField: 'region', area: 'row' }],
      [{ id: 'city', dataField: 'city', area: 'column' }],
      { rowPath: ['EU'], columnPath: ['Paris'] }
    );
    const matches = ROWS.filter(createFilterPredicate(expr as never));
    expect(matches).toHaveLength(1);
  });
});

describe('LocalPivotStore', () => {
  it('serves the serializable contract from in-memory rows', async () => {
    const store = new LocalPivotStore(ROWS);
    const result = await store.load({
      rowFields: [{ dataField: 'region' }],
      columnFields: [{ dataField: 'city' }],
      measures: [{ field: 'amount', type: 'sum' }],
    });
    expect(result.rows.map((node) => node.value)).toEqual(['EU', 'US']);
    expect(result.columns.map((node) => node.value)).toEqual(['Berlin', 'NYC', 'Paris']);
    expect(result.grandTotal).toEqual([450]);

    const drill = await store.drillDown({ rowPath: ['EU'], columnPath: [] });
    expect(drill).toHaveLength(2);
  });
});
