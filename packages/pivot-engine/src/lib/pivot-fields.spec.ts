import type { PivotFieldConfig } from '@oge-ui/core';
import { OGE_DEFAULT_PIVOT_MESSAGES } from './pivot-messages';
import {
  applyPivotFieldOverrides,
  buildPivotLoadOptions,
  pivotAreaFields,
  pivotCustomSummariesOf,
  pivotFieldConfigOf,
  pivotFieldFnsOf,
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
