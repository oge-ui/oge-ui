import type { PivotFieldConfig } from '@oge-ui/core';
import { OGE_DEFAULT_PIVOT_MESSAGES } from './pivot-messages';
import {
  applyPivotFieldOverrides,
  buildPivotLoadOptions,
  pivotAreaFields,
  pivotCustomSummariesOf,
  pivotFieldConfigOf,
  pivotAxisFieldFns,
  pivotFieldFnsOf,
  pivotHeaderFormatter,
  pivotIntervalDate,
  pivotMemberText,
  pivotOverridesFromSnapshot,
  pivotPanelAreas,
  pivotStateSnapshot,
} from './pivot-fields';

describe('pivotFieldConfigOf', () => {
  it('applies the directive defaults', () => {
    expect(pivotFieldConfigOf({ dataField: 'order.unitPrice' }, 3)).toEqual({
      id: 'order.unitPrice',
      dataField: 'order.unitPrice',
      caption: 'Unit Price',
      area: null,
      areaIndex: 3,
      dataType: undefined,
      groupInterval: undefined,
      summaryType: 'sum',
      summaryName: undefined,
      summaryDisplayMode: 'none',
      runningTotal: undefined,
      sortOrder: undefined,
      sortBySummaryField: undefined,
      sortBySummaryPath: undefined,
      filterValues: undefined,
      filterType: 'include',
      showTotals: true,
    });
  });

  it('keeps explicit values', () => {
    const config = pivotFieldConfigOf(
      {
        dataField: 'amount',
        id: 'share',
        caption: '% of Column',
        area: 'data',
        areaIndex: 0,
        summaryType: 'avg',
        summaryDisplayMode: 'percentOfGrandTotal',
        showTotals: false,
      },
      7,
    );
    expect(config).toMatchObject({
      id: 'share',
      caption: '% of Column',
      area: 'data',
      areaIndex: 0,
      summaryType: 'avg',
      summaryDisplayMode: 'percentOfGrandTotal',
      showTotals: false,
    });
  });
});

describe('field layout helpers', () => {
  const base: PivotFieldConfig[] = [
    { id: 'region', dataField: 'region', area: 'row', areaIndex: 1 },
    { id: 'city', dataField: 'city', area: 'row', areaIndex: 0 },
    { id: 'year', dataField: 'year', area: 'column', areaIndex: 0 },
    { id: 'amount', dataField: 'amount', area: 'data', areaIndex: 0 },
  ];

  it('overlays overrides by id', () => {
    const next = applyPivotFieldOverrides(
      base,
      new Map([['city', { area: null }]]),
    );
    expect(next.find((f) => f.id === 'city')?.area).toBeNull();
    expect(next.find((f) => f.id === 'region')?.area).toBe('row');
  });

  it('sorts an area by areaIndex', () => {
    expect(pivotAreaFields(base, 'row').map((f) => f.id)).toEqual([
      'city',
      'region',
    ]);
  });

  it('builds the four panel areas in fixed order', () => {
    const areas = pivotPanelAreas(base, OGE_DEFAULT_PIVOT_MESSAGES);
    expect(areas.map((a) => [a.area, a.label, a.fields.length])).toEqual([
      ['filter', 'Filters', 0],
      ['row', 'Rows', 2],
      ['column', 'Columns', 1],
      ['data', 'Values', 1],
    ]);
  });

  it('collects out-of-band functions and custom reducers', () => {
    const format = (value: unknown) => String(value);
    const reducer = () => 1;
    const defs = [
      { dataField: 'a', format },
      { dataField: 'b' },
      {
        dataField: 'c',
        summaryName: 'median',
        calculateCustomSummary: reducer,
      },
    ];
    expect(Object.keys(pivotFieldFnsOf(defs))).toEqual(['a']);
    expect(pivotCustomSummariesOf(defs)).toEqual({ median: reducer });
    expect(pivotCustomSummariesOf([{ dataField: 'a' }])).toBeUndefined();
  });

  it('builds the remote request with folded value filters', () => {
    const fields: PivotFieldConfig[] = [
      ...base,
      {
        id: 'country',
        dataField: 'country',
        area: 'filter',
        filterValues: ['DE'],
      },
      {
        id: 'channel',
        dataField: 'channel',
        area: null,
        filterValues: ['web'],
        filterType: 'exclude',
      },
    ];
    const options = buildPivotLoadOptions(fields, [['EU']], []);
    expect(options.rowFields.map((f) => f.dataField)).toEqual([
      'city',
      'region',
    ]);
    expect(options.measures).toEqual([
      { field: 'amount', type: 'sum', name: undefined },
    ]);
    expect(options.filter).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'country', op: 'in', value: ['DE'] },
        {
          type: 'not',
          operand: {
            type: 'binary',
            field: 'channel',
            op: 'in',
            value: ['web'],
          },
        },
      ],
    });
    expect(options.rowExpandedPaths).toEqual([['EU']]);
    expect(buildPivotLoadOptions(base, [], []).filter).toBeNull();
  });

  it('round-trips a state snapshot into overrides', () => {
    const snapshot = pivotStateSnapshot(base, [['EU']], [], true);
    expect(snapshot.fieldPanelCollapsed).toBe(true);
    expect(snapshot.fields?.[0]).toMatchObject({ id: 'region', area: 'row' });
    const overrides = pivotOverridesFromSnapshot(snapshot);
    expect(overrides?.get('city')).toMatchObject({ area: 'row', areaIndex: 0 });
    expect(overrides?.get('city')).not.toHaveProperty('id');
    expect(pivotOverridesFromSnapshot({})).toBeNull();
  });
});

describe('member header formats', () => {
  it('pivotIntervalDate maps date-interval buckets to a representative date', () => {
    expect(pivotIntervalDate(2024, 'year')).toEqual(new Date(2024, 0, 1));
    expect(pivotIntervalDate(3, 'quarter')).toEqual(new Date(2000, 6, 1));
    expect(pivotIntervalDate(12, 'month')).toEqual(new Date(2000, 11, 1));
    expect(pivotIntervalDate(17, 'day')).toEqual(new Date(2000, 0, 17));
    expect((pivotIntervalDate(0, 'dayOfWeek') as Date).getDay()).toBe(0);
    expect((pivotIntervalDate(5, 'dayOfWeek') as Date).getDay()).toBe(5);
    // numeric intervals, no interval and non-numbers pass through
    expect(pivotIntervalDate(100, 50)).toBe(100);
    expect(pivotIntervalDate(7, undefined)).toBe(7);
    expect(pivotIntervalDate(null, 'month')).toBeNull();
  });

  it('pivotHeaderFormatter: functions pass, declarative formats are interval-aware', () => {
    const fn = (value: unknown) => `#${String(value)}`;
    expect(pivotHeaderFormatter(fn, 'month')).toBe(fn);
    const month = pivotHeaderFormatter(
      { type: 'date', pattern: 'MMMM' },
      'month',
      'de-DE',
    );
    expect(month(3)).toBe('März');
    expect(month(null)).toBe('');
    const weekday = pivotHeaderFormatter(
      { type: 'date', pattern: 'EEEE' },
      'dayOfWeek',
      'en-US',
    );
    expect(weekday(1)).toBe('Monday');
    // a number format on a numeric interval formats the bucket start
    const bucket = pivotHeaderFormatter({ type: 'number' }, 1000, 'en-US');
    expect(bucket(12000)).toBe('12,000');
    // ungrouped date values format as dates
    const plain = pivotHeaderFormatter(
      { type: 'date', dateStyle: 'medium' },
      undefined,
      'en-US',
    );
    expect(plain(new Date(2026, 0, 5))).toBe('Jan 5, 2026');
  });

  it('pivotFieldFnsOf compiles headerFormat; pivotAxisFieldFns puts it in format', () => {
    const fns = pivotFieldFnsOf(
      [
        {
          dataField: 'day',
          groupInterval: 'month',
          format: () => 'cell',
          headerFormat: { type: 'date', pattern: 'MMM' },
        },
        { dataField: 'region', format: () => 'only-format' },
      ],
      'en-US',
    );
    expect(fns['day'].format?.(1)).toBe('cell');
    expect(fns['day'].headerFormat?.(1)).toBe('Jan');
    const axis = pivotAxisFieldFns(fns);
    expect(axis['day'].format?.(1)).toBe('Jan');
    expect(axis['region'].format?.('EU')).toBe('only-format');
    expect(pivotMemberText(axis['day'], 2)).toBe('Feb');
    expect(pivotMemberText(undefined, null)).toBe('');
    expect(
      pivotMemberText(
        { customizeText: ({ valueText }) => `<${valueText}>` },
        'x',
      ),
    ).toBe('<x>');
  });
});
