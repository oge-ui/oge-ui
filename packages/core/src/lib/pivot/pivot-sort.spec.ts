import { computePivot } from './compute-pivot';
import type { PivotFieldConfig } from './pivot-types';

interface Sale {
  region: string;
  year: number;
  amount: number;
}

const SALES: Sale[] = [
  { region: 'B-Region', year: 2024, amount: 10 },
  { region: 'A-Region', year: 2024, amount: 300 },
  { region: 'C-Region', year: 2024, amount: 100 },
  { region: 'A-Region', year: 2025, amount: 5 },
];

function rowLabels(fields: PivotFieldConfig[]): string[] {
  return computePivot({ rows: SALES, fields })
    .rowRoot.filter((node) => !node.isGrandTotal)
    .map((node) => String(node.value));
}

describe('pivot axis sorting', () => {
  it('sorts labels ascending by default and descending on demand', () => {
    const base: PivotFieldConfig[] = [
      { id: 'region', dataField: 'region', area: 'row' },
      { id: 'amount', dataField: 'amount', area: 'data', summaryType: 'sum' },
    ];
    expect(rowLabels(base)).toEqual(['A-Region', 'B-Region', 'C-Region']);
    expect(
      rowLabels([{ ...base[0], sortOrder: 'desc' }, base[1]])
    ).toEqual(['C-Region', 'B-Region', 'A-Region']);
  });

  it('sortBySummaryField orders a level by the measure grand total', () => {
    const fields: PivotFieldConfig[] = [
      { id: 'region', dataField: 'region', area: 'row', sortBySummaryField: 'amount', sortOrder: 'desc' },
      { id: 'year', dataField: 'year', area: 'column' },
      { id: 'amount', dataField: 'amount', area: 'data', summaryType: 'sum' },
    ];
    // totals: A=305, C=100, B=10 → desc
    expect(rowLabels(fields)).toEqual(['A-Region', 'C-Region', 'B-Region']);
  });

  it('sortBySummaryPath reads the measure at a specific opposite-axis node', () => {
    const fields: PivotFieldConfig[] = [
      {
        id: 'region',
        dataField: 'region',
        area: 'row',
        sortBySummaryField: 'amount',
        sortBySummaryPath: [2025],
        sortOrder: 'desc',
      },
      { id: 'year', dataField: 'year', area: 'column' },
      { id: 'amount', dataField: 'amount', area: 'data', summaryType: 'sum' },
    ];
    // at 2025: A=5, others null → A first, null-valued keep stable relative order
    expect(rowLabels(fields)[0]).toBe('A-Region');
  });
});
