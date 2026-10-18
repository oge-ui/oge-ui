import { describe, expect, it } from 'vitest';
import { resolveOgeGridColumns, type OgeGridColumnSpec } from './grid-columns';
import { ogeDescribeGridColumns } from './grid-column-description';

function spec(overrides: Partial<OgeGridColumnSpec>): OgeGridColumnSpec {
  return {
    field: undefined,
    caption: undefined,
    width: undefined,
    dataType: 'string',
    alignment: undefined,
    format: undefined,
    visible: true,
    sortable: true,
    filterable: true,
    filterOperator: undefined,
    minWidth: undefined,
    lookup: undefined,
    calculateCellValue: undefined,
    calculateFilterExpression: undefined,
    hidingPriority: undefined,
    pinned: false,
    editable: true,
    cellTemplate: undefined,
    headerTemplate: undefined,
    editTemplate: undefined,
    bandCaption: undefined,
    source: {},
    ...overrides,
  };
}

function resolve(specs: OgeGridColumnSpec[], firstRow?: object) {
  return resolveOgeGridColumns({
    specs,
    columnDefs: () => undefined,
    firstDataRow: () => firstRow,
    widthOverrides: new Map(),
    pinOverrides: new Map(),
    order: null,
    adaptiveHiddenIds: new Set(),
  });
}

describe('ogeDescribeGridColumns', () => {
  it('describes declared columns with visibility, abilities and lookup values', () => {
    const all = resolve([
      spec({ field: 'firstName', sortable: false }),
      spec({ field: 'amount', dataType: 'number', caption: 'Net amount' }),
      spec({
        field: 'status',
        dataType: 'number',
        lookup: {
          dataSource: [
            { id: 1, label: 'Open' },
            { id: { nested: true }, label: 'Object' },
          ],
          valueExpr: 'id',
          displayExpr: 'label',
        },
      }),
      spec({ caption: 'Actions' }),
    ]);
    const info = ogeDescribeGridColumns(all, new Set(['firstName', 'status']));
    expect(info).toEqual([
      {
        field: 'firstName',
        caption: 'First Name',
        dataType: 'string',
        visible: true,
        sortable: false,
        filterable: true,
        groupable: true,
      },
      {
        field: 'amount',
        caption: 'Net amount',
        dataType: 'number',
        visible: false,
        sortable: true,
        filterable: true,
        groupable: true,
      },
      {
        field: 'status',
        caption: 'Status',
        dataType: 'number',
        visible: true,
        sortable: true,
        filterable: true,
        groupable: true,
        values: [{ value: 1, text: 'Open' }],
      },
    ]);
  });

  it('infers the type of auto-derived columns from a sample row', () => {
    const all = resolveOgeGridColumns({
      specs: [],
      columnDefs: () => undefined,
      firstDataRow: () => ({
        id: 1,
        ok: true,
        at: new Date(2026, 0, 1),
        name: 'a',
      }),
      widthOverrides: new Map(),
      pinOverrides: new Map(),
      order: null,
      adaptiveHiddenIds: new Set(),
    });
    const sample = { id: 1, ok: true, at: new Date(2026, 0, 1), name: 'a' };
    const types = ogeDescribeGridColumns(all, new Set(['id']), sample).map(
      (c) => c.dataType,
    );
    expect(types).toEqual(['number', 'boolean', 'date', 'string']);
  });
});
