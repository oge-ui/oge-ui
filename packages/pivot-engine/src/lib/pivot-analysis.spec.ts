import { computePivot, pathKey, type PivotFieldConfig } from '@oge-ui/core';
import { applyPivotCalculatedFields, pivotSlotsOf } from './pivot-calculated';
import { toChartSeries } from './pivot-chart';
import {
  applyPivotMemberFilters,
  pivotLabelMatches,
  pivotValueMatches,
} from './pivot-filters';
import { OgePivotGridCore, type OgePivotGridInputs } from './pivot-grid-core';
import { OGE_DEFAULT_PIVOT_MESSAGES } from './pivot-messages';
import { pivotRowHeaderSegments } from './pivot-row-header';
import type { OgePivotAxisLine, OgePivotFieldDef } from './pivot-types';
import { PLAIN_ADAPTER } from './test-adapter';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
  cost: number;
}

const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100, cost: 60 },
  { region: 'EU', city: 'Paris', year: 2024, amount: 50, cost: 40 },
  { region: 'EU', city: 'Paris', year: 2025, amount: 70, cost: 30 },
  { region: 'US', city: 'NYC', year: 2025, amount: 300, cost: 100 },
  { region: 'Asia', city: 'Tokyo', year: 2025, amount: 20, cost: 15 },
];

const CONFIG: PivotFieldConfig[] = [
  { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
  { id: 'year', dataField: 'year', area: 'column', areaIndex: 0 },
  {
    id: 'amount',
    dataField: 'amount',
    area: 'data',
    summaryType: 'sum',
    areaIndex: 0,
  },
  {
    id: 'cost',
    dataField: 'cost',
    area: 'data',
    summaryType: 'sum',
    areaIndex: 1,
  },
];

describe('applyPivotCalculatedFields', () => {
  const base = computePivot({ rows: SALES, fields: CONFIG });

  it('evaluates per cell, totals included, so ratios stay ratios of totals', () => {
    const result = applyPivotCalculatedFields(base, [
      {
        name: 'margin',
        caption: 'Margin',
        expression: (v) =>
          v.amount ? ((v.amount ?? 0) - (v.cost ?? 0)) / v.amount : null,
      },
    ]);
    expect(result.measures.map((m) => m.id)).toEqual([
      'amount',
      'cost',
      'margin',
    ]);
    const rows = pivotSlotsOf(result.rowRoot, result.rowLeafCount);
    const columns = pivotSlotsOf(result.columnRoot, result.columnLeafCount);
    const eu = rows.findIndex((slot) => slot.path[0] === 'EU');
    const grandRow = rows.findIndex((slot) => slot.isGrandTotal);
    const grandColumn = columns.findIndex((slot) => slot.isGrandTotal);
    // EU over both years: (220 - 130) / 220
    expect(result.values[eu][grandColumn][2]).toBeCloseTo(90 / 220);
    // grand total: (540 - 245) / 540, not an average of ratios
    expect(result.values[grandRow][grandColumn][2]).toBeCloseTo(295 / 540);
  });

  it('applies display modes and running totals to calculated values', () => {
    const result = applyPivotCalculatedFields(base, [
      {
        name: 'profit',
        expression: (v) => (v.amount ?? 0) - (v.cost ?? 0),
        displayMode: 'percentOfColumnGrandTotal',
      },
      {
        name: 'profitRun',
        expression: (v) => (v.amount ?? 0) - (v.cost ?? 0),
        runningTotal: { direction: 'row', allowCrossGroupVariation: true },
      },
      {
        name: 'profitDelta',
        expression: (v) => (v.amount ?? 0) - (v.cost ?? 0),
        displayMode: 'absoluteVariation',
      },
    ]);
    const rows = pivotSlotsOf(result.rowRoot, result.rowLeafCount);
    const columns = pivotSlotsOf(result.columnRoot, result.columnLeafCount);
    const grandColumn = columns.findIndex((slot) => slot.isGrandTotal);
    const grandRow = rows.findIndex((slot) => slot.isGrandTotal);
    const shares = rows
      .map((slot, r) =>
        slot.isGrandTotal ? 0 : Number(result.values[r][grandColumn][2]),
      )
      .reduce((a, b) => a + b, 0);
    expect(shares).toBeCloseTo(1); // percent of the column grand total
    expect(result.values[grandRow][grandColumn][2]).toBeCloseTo(1);
    // running total: the last regular row holds the sum of all regular rows
    const regular = rows
      .map((slot, r) => ({ slot, r }))
      .filter(({ slot }) => !slot.isGrandTotal);
    const last = regular[regular.length - 1].r;
    expect(result.values[last][grandColumn][3]).toBe(295);
    // difference from the previous column: 2025 − 2024 for EU
    const eu = rows.findIndex((slot) => slot.path[0] === 'EU');
    const y2025 = columns.findIndex((slot) => slot.path[0] === 2025);
    expect(result.values[eu][y2025][4]).toBe(40 - 50);
  });

  it('leaves hidden-total cells blank and swallows throwing expressions', () => {
    const result = applyPivotCalculatedFields(base, [
      {
        name: 'boom',
        expression: () => {
          throw new Error('x');
        },
      },
      { name: 'inf', expression: () => Infinity },
    ]);
    expect(result.values[0][0].slice(2)).toEqual([null, null]);
    expect(applyPivotCalculatedFields(base, [])).toBe(base);
  });
});

describe('pivot member filters', () => {
  it('matches labels case/accent-insensitively and compares values', () => {
    expect(
      pivotLabelMatches('İzmir', { operator: 'beginsWith', value: 'izm' }),
    ).toBe(true);
    expect(
      pivotLabelMatches('Paris', { operator: 'notContains', value: 'ar' }),
    ).toBe(false);
    expect(
      pivotLabelMatches('Rome', { operator: 'equals', value: 'rome' }),
    ).toBe(true);
    expect(
      pivotValueMatches(5, {
        measure: 'a',
        operator: 'between',
        value: 10,
        value2: 1,
      }),
    ).toBe(true);
    expect(
      pivotValueMatches(null, {
        measure: 'a',
        operator: 'notEquals',
        value: 1,
      }),
    ).toBe(false);
  });

  it('label, value and Top-N filters keep whole members (totals follow)', () => {
    const filtered = (filters: Parameters<typeof applyPivotMemberFilters>[2]) =>
      applyPivotMemberFilters(SALES, CONFIG, filters, {}).map(
        (row) => row.city,
      );
    expect(
      filtered(
        new Map([
          ['region', { labelFilter: { operator: 'contains', value: 'u' } }],
        ]),
      ),
    ).toEqual(['Berlin', 'Paris', 'Paris', 'NYC']);
    expect(
      filtered(
        new Map([
          [
            'region',
            {
              valueFilter: {
                measure: 'amount',
                operator: 'greaterThan',
                value: 100,
              },
            },
          ],
        ]),
      ),
    ).toEqual(['Berlin', 'Paris', 'Paris', 'NYC']); // EU 220, US 300
    expect(
      filtered(
        new Map([['region', { topN: { count: 1, measure: 'amount' } }]]),
      ),
    ).toEqual(['NYC']);
    expect(
      filtered(
        new Map([
          [
            'region',
            { topN: { count: 1, measure: 'cost', direction: 'bottom' } },
          ],
        ]),
      ),
    ).toEqual(['Tokyo']);
    // a filter on a field outside the axes does nothing
    expect(
      filtered(
        new Map([
          ['city', { labelFilter: { operator: 'equals', value: 'x' } }],
        ]),
      ),
    ).toHaveLength(5);
  });
});

describe('toChartSeries', () => {
  const result = computePivot({ rows: SALES, fields: CONFIG });

  it('argues by row lines and builds one series per column line × measure', () => {
    const chart = toChartSeries(result, { measures: ['amount'] });
    expect(chart.dataSource.map((point) => point.argument)).toEqual([
      'Asia',
      'EU',
      'US',
    ]);
    expect(chart.series.map((series) => series.name)).toEqual(['2024', '2025']);
    expect(chart.series[0]).toMatchObject({
      type: 'bar',
      argumentField: 'argument',
      valueField: 's0',
      measureId: 'amount',
    });
    expect(chart.dataSource[1]).toMatchObject({ s0: 150, s1: 70 }); // EU
  });

  it('follows the expand state, totals on request and a selection', () => {
    const expanded = computePivot({
      rows: SALES,
      fields: [
        ...CONFIG.slice(0, 1),
        { id: 'city', dataField: 'city', area: 'row', areaIndex: 1 },
        ...CONFIG.slice(1, 3),
      ],
      rowExpandedPaths: new Set([pathKey(['EU'])]),
    });
    const leaves = toChartSeries(expanded);
    expect(leaves.dataSource.map((p) => p.argument)).toEqual([
      'Asia',
      'EU / Berlin',
      'EU / Paris',
      'US',
    ]);
    const withTotals = toChartSeries(expanded, {
      includeTotals: true,
      includeGrandTotals: true,
      argumentIndexes: [1, 2],
      type: 'line',
    });
    expect(withTotals.dataSource.map((p) => p.argument)).toEqual([
      'EU',
      'EU / Berlin',
    ]);
    expect(withTotals.series.every((s) => s.type === 'line')).toBe(true);
    expect(withTotals.series.at(-1)?.name).toBe('Grand Total');
  });

  it('names series after the measures when the column axis is empty', () => {
    const flat = computePivot({
      rows: SALES,
      fields: CONFIG.filter((field) => field.area !== 'column'),
    });
    const chart = toChartSeries(flat, { argumentAxis: 'row' });
    expect(chart.series.map((series) => series.name)).toEqual([
      'amount',
      'cost',
    ]);
    const byColumns = toChartSeries(result, { argumentAxis: 'column' });
    expect(byColumns.dataSource.map((p) => p.argument)).toEqual([
      '2024',
      '2025',
    ]);
  });
});

describe('pivotRowHeaderSegments', () => {
  const line = (
    text: string,
    level: number,
    extra: Partial<OgePivotAxisLine> = {},
  ): OgePivotAxisLine => ({
    text,
    level,
    path: [],
    expanded: false,
    hasChildren: false,
    isTotal: false,
    isGrandTotal: false,
    ...extra,
  });
  const lines = [
    line('EU', 0, { isTotal: true, expanded: true, hasChildren: true }),
    line('Berlin', 1),
    line('Paris', 1),
    line('Grand Total', 0, { isGrandTotal: true }),
  ];

  it('is null for compact, labels only at their level for outline', () => {
    expect(pivotRowHeaderSegments(lines, 'compact', 2)).toBeNull();
    expect(pivotRowHeaderSegments(lines, 'outline', 2)).toEqual([
      ['EU', ''],
      ['', 'Berlin'],
      ['', 'Paris'],
      ['Grand Total', ''],
    ]);
  });

  it('repeats the ancestors for tabular', () => {
    expect(pivotRowHeaderSegments(lines, 'tabular', 2)).toEqual([
      ['EU', ''],
      ['EU', 'Berlin'],
      ['EU', 'Paris'],
      ['Grand Total', ''],
    ]);
  });
});

describe('OgePivotGridCore analysis inputs', () => {
  const FIELDS: OgePivotFieldDef<Sale>[] = [
    { dataField: 'region', area: 'row', topN: { count: 2, measure: 'amount' } },
    { dataField: 'year', area: 'column' },
    { dataField: 'amount', area: 'data', summaryType: 'sum' },
    { dataField: 'cost', area: 'data', summaryType: 'sum' },
  ];

  function makeCore(extra: Partial<OgePivotGridInputs<Sale>> = {}) {
    const inputs: OgePivotGridInputs<Sale> = {
      data: () => SALES,
      fields: () => FIELDS,
      virtualScrolling: () => false,
      showRowTotals: () => true,
      showColumnTotals: () => true,
      showRowGrandTotals: () => true,
      showColumnGrandTotals: () => true,
      messages: () => OGE_DEFAULT_PIVOT_MESSAGES,
      customizeCell: () => undefined,
      fieldChooser: () => ({}),
      ...extra,
    };
    return new OgePivotGridCore<Sale>(PLAIN_ADAPTER, { inputs });
  }

  it('applies the field filters, the calculated measures and their format', () => {
    const core = makeCore({
      calculatedFields: () => [
        {
          name: 'profit',
          caption: 'Profit',
          expression: (v) => (v.amount ?? 0) - (v.cost ?? 0),
          format: (value) => `${String(value)} €`,
        },
      ],
    });
    expect(core.rowLines().map((line) => line.text)).toEqual([
      'EU',
      'US',
      'Grand Total',
    ]);
    expect(core.measures().map((m) => m.caption)).toEqual([
      'Amount',
      'Cost',
      'Profit',
    ]);
    const grandColumn = core.columnLines().findIndex((l) => l.isGrandTotal);
    expect(core.preparedCell(1, grandColumn, 2).text).toBe('200 €');
    expect(core.cellTemplateContext(1, grandColumn, 2)).toMatchObject({
      measureId: 'profit',
      rowIndex: 1,
      measureIndex: 2,
    });
  });

  it('serves chart data and the tabular row-header layout', () => {
    const core = makeCore({ rowHeaderLayout: () => 'tabular' });
    const chart = core.getChartData({ measures: ['amount'] });
    expect(chart.dataSource.map((p) => p.argument)).toEqual(['EU', 'US']);
    expect(core.rowHeaderSegments()?.[0]).toEqual(['EU']);
    expect(core.rowFieldCaptions()).toEqual(['Region']);
    expect(makeCore().rowHeaderSegments()).toBeNull();
  });
});
