import type { GroupedItem } from '../data/data-source';
import { flattenGroupedData } from '../rows/flatten';
import { runLoadOptions } from '../pipeline/run-load-options';
import { computeSummaries } from './summaries';
import { groupRows } from './group-rows';

interface Sale {
  id: number;
  region: string;
  city: string;
  year: number;
  amount: number | null;
}

const SALES: Sale[] = [
  { id: 1, region: 'EU', city: 'Berlin', year: 2024, amount: 100 },
  { id: 2, region: 'EU', city: 'Berlin', year: 2025, amount: 200 },
  { id: 3, region: 'EU', city: 'Paris', year: 2024, amount: 50 },
  { id: 4, region: 'US', city: 'NYC', year: 2024, amount: 300 },
  { id: 5, region: 'US', city: 'NYC', year: 2025, amount: null },
];

describe('computeSummaries', () => {
  it('computes sum/avg/min/max/count and skips nulls', () => {
    const result = computeSummaries(SALES, [
      { field: 'amount', type: 'sum' },
      { field: 'amount', type: 'avg' },
      { field: 'amount', type: 'min' },
      { field: 'amount', type: 'max' },
      { field: 'id', type: 'count' },
    ]);
    expect(result.map((s) => s.value)).toEqual([650, 162.5, 50, 300, 5]);
  });

  it('returns null avg/min/max for all-null values', () => {
    const rows = [{ v: null }, { v: null }];
    const result = computeSummaries(rows, [
      { field: 'v', type: 'avg' },
      { field: 'v', type: 'min' },
      { field: 'v', type: 'sum' },
    ]);
    expect(result.map((s) => s.value)).toEqual([null, null, 0]);
  });

  it('runs custom reducers keyed by name ?? field and defaults to null when missing', () => {
    const result = computeSummaries(
      SALES,
      [
        { field: 'amount', type: 'custom' },
        { field: 'amount', type: 'custom', name: 'range' },
        { field: 'amount', type: 'custom', name: 'unregistered' },
      ],
      {
        amount: (rows) => rows.filter((r) => (r as { amount: number | null }).amount != null).length,
        range: (rows, field) => {
          const values = rows
            .map((r) => (r as Record<string, unknown>)[field])
            .filter((v): v is number => typeof v === 'number');
          return Math.max(...values) - Math.min(...values);
        },
      }
    );
    expect(result.map((s) => s.value)).toEqual([4, 250, null]);
  });

  it('passes custom reducers through groupRows per bucket', () => {
    const tree = groupRows(SALES, [{ field: 'region', dir: 'asc' }], [{ field: 'amount', type: 'custom' }], {
      amount: (rows) => rows.length * 1000,
    });
    expect(tree.map((g) => g.summary)).toEqual([[3000], [2000]]);
  });
});

describe('groupRows', () => {
  it('builds a nested tree with counts and summaries', () => {
    const tree = groupRows(
      SALES,
      [
        { field: 'region', dir: 'asc' },
        { field: 'city', dir: 'asc' },
      ],
      [{ field: 'amount', type: 'sum' }]
    );
    expect(tree.map((g) => g.key)).toEqual(['EU', 'US']);
    expect(tree[0].count).toBe(3);
    expect(tree[0].summary).toEqual([350]);
    const euCities = tree[0].items as GroupedItem<Sale>[];
    expect(euCities.map((g) => g.key)).toEqual(['Berlin', 'Paris']);
    expect((euCities[0].items as Sale[]).map((s) => s.id)).toEqual([1, 2]);
  });
});

describe('flattenGroupedData', () => {
  const keyOf = (row: Sale) => row.id;

  it('produces the exact flat node list for a 3-level grouping (snapshot)', () => {
    const groups = [
      { field: 'region', dir: 'asc' as const },
      { field: 'city', dir: 'asc' as const },
      { field: 'year', dir: 'asc' as const },
    ];
    const result = runLoadOptions(SALES, {
      group: groups,
      groupSummary: [{ field: 'amount', type: 'sum' }],
      requireTotalCount: true,
    });
    const flat = flattenGroupedData(result.data as GroupedItem<Sale>[], {
      keyOf,
      groups,
      groupSummary: [{ field: 'amount', type: 'sum' }],
    });
    expect(
      flat.map((n) =>
        n.kind === 'group'
          ? `${'  '.repeat(n.level)}[${n.groupField}=${n.groupValue} n=${n.childCount} sum=${n.summaries[0]?.value}]`
          : `${'  '.repeat(n.level)}#${String(n.key)}`
      )
    ).toEqual([
      '[region=EU n=3 sum=350]',
      '  [city=Berlin n=2 sum=300]',
      '    [year=2024 n=1 sum=100]',
      '      #1',
      '    [year=2025 n=1 sum=200]',
      '      #2',
      '  [city=Paris n=1 sum=50]',
      '    [year=2024 n=1 sum=50]',
      '      #3',
      '[region=US n=2 sum=300]',
      '  [city=NYC n=2 sum=300]',
      '    [year=2024 n=1 sum=300]',
      '      #4',
      '    [year=2025 n=1 sum=0]',
      '      #5',
    ]);
    expect(result.totalCount).toBe(5);
  });

  it('skips children of collapsed groups', () => {
    const groups = [{ field: 'region', dir: 'asc' as const }];
    const tree = groupRows(SALES, groups);
    const flat = flattenGroupedData(tree, {
      keyOf,
      groups,
      collapsedGroupKeys: new Set(['g:EU']),
    });
    expect(flat.map((n) => (n.kind === 'group' ? `[${n.groupValue}]` : `#${String(n.key)}`))).toEqual([
      '[EU]',
      '[US]',
      '#4',
      '#5',
    ]);
    expect(flat[0].kind === 'group' && flat[0].expanded).toBe(false);
  });

  it('emits group footer summary rows after expanded groups only', () => {
    const groups = [{ field: 'region', dir: 'asc' as const }];
    const groupSummary = [{ field: 'amount', type: 'sum' as const }];
    const tree = groupRows(SALES, groups, groupSummary);
    const flat = flattenGroupedData(tree, {
      keyOf,
      groups,
      groupSummary,
      groupFooters: true,
      collapsedGroupKeys: new Set(['g:US']),
    });
    expect(
      flat.map((n) =>
        n.kind === 'summary'
          ? `footer:${String(n.key)}=${n.summaries[0]?.value}`
          : `${n.kind}:${String(n.key)}`
      )
    ).toEqual([
      'group:g:EU',
      'data:1',
      'data:2',
      'data:3',
      'footer:g:EU:footer=350',
      'group:g:US', // collapsed — no children, no footer
    ]);
  });

  it('injects detail rows after expanded data rows (grouped and plain)', () => {
    const plain = flattenGroupedData(SALES, {
      keyOf,
      groups: [],
      expandedDetailKeys: new Set([2]),
    });
    expect(plain.map((n) => `${n.kind}:${String(n.key)}`)).toEqual([
      'data:1',
      'data:2',
      'detail:d:2',
      'data:3',
      'data:4',
      'data:5',
    ]);
  });

  it('treats null group values as their own bucket with a stable key', () => {
    const rows = [
      { id: 1, region: null as string | null },
      { id: 2, region: 'EU' },
      { id: 3, region: null as string | null },
    ];
    const groups = [{ field: 'region', dir: 'asc' as const }];
    const tree = groupRows(rows, groups);
    const flat = flattenGroupedData(tree, { keyOf: (r) => r.id, groups });
    const groupNodes = flat.filter((n) => n.kind === 'group');
    expect(groupNodes).toHaveLength(2);
    expect(new Set(groupNodes.map((n) => n.key)).size).toBe(2);
  });
});
