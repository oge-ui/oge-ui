import { describe, expect, it } from 'vitest';
import type { GridStateSnapshot } from '@oge-ui/core';
import type { OgeAiGridColumn } from './grid-ai-context';
import { resolveOgeGridAiReply } from './grid-ai-response';

const COLUMNS: OgeAiGridColumn[] = [
  {
    field: 'name',
    caption: 'Name',
    dataType: 'string',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
  },
  {
    field: 'salary',
    caption: 'Salary',
    dataType: 'number',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
  },
  {
    field: 'hired',
    caption: 'Hired',
    dataType: 'date',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
  },
  {
    field: 'active',
    caption: 'Active',
    dataType: 'boolean',
    sortable: false,
    filterable: true,
    groupable: true,
    visible: true,
  },
  {
    field: 'status',
    caption: 'Status',
    dataType: 'number',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: false,
    values: [
      { value: 1, text: 'Open' },
      { value: 2, text: 'Closed' },
    ],
  },
];

const EMPTY: GridStateSnapshot = {};

function change(reply: unknown, current: GridStateSnapshot = EMPTY) {
  const result = resolveOgeGridAiReply(reply, COLUMNS, current);
  if (result.kind !== 'change')
    throw new Error(`expected change, got ${result.kind}`);
  return result;
}

describe('resolveOgeGridAiReply', () => {
  it('applies sort, group, search and hidden columns', () => {
    const result = change({
      status: 'apply',
      summary: 'Sorted by salary',
      sort: [
        { field: 'salary', dir: 'desc' },
        { field: 'salary', dir: 'asc' },
      ],
      group: [{ field: 'hired', interval: 'month' }],
      search: 'ann',
      hiddenColumns: ['salary'],
    });
    expect(result.summary).toBe('Sorted by salary');
    expect(result.slices).toEqual(['sort', 'group', 'search', 'columns']);
    expect(result.snapshot.sort).toEqual([{ field: 'salary', dir: 'desc' }]);
    expect(result.snapshot.group).toEqual([
      { field: 'hired', dir: 'asc', interval: 'month' },
    ]);
    expect(result.snapshot.filter?.searchText).toBe('ann');
    expect(result.snapshot.columns?.hidden).toEqual(['salary']);
    expect(result.warnings).toEqual([]);
  });

  it('coerces filter operands to the column type', () => {
    const result = change({
      status: 'apply',
      summary: '',
      filter: {
        type: 'and',
        operands: [
          { type: 'binary', field: 'salary', op: 'ge', value: '5000' },
          { type: 'binary', field: 'active', op: 'eq', value: 'true' },
          { type: 'binary', field: 'status', op: 'eq', value: 'closed' },
          { field: 'name', op: 'contains', value: 'an' },
        ],
      },
    });
    expect(result.snapshot.filter?.builder).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'salary', op: 'ge', value: 5000 },
        { type: 'binary', field: 'active', op: 'eq', value: true },
        { type: 'binary', field: 'status', op: 'eq', value: 2 },
        { type: 'binary', field: 'name', op: 'contains', value: 'an' },
      ],
    });
  });

  it('parses dates as local days and closes a between range at end of day', () => {
    const result = change({
      status: 'apply',
      summary: '',
      filter: {
        type: 'binary',
        field: 'hired',
        op: 'between',
        value: ['2026-09-01', '2026-09-30'],
      },
    });
    const builder = result.snapshot.filter?.builder as {
      value: [Date, Date];
    };
    const [from, to] = builder.value;
    expect([
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
      from.getHours(),
    ]).toEqual([2026, 8, 1, 0]);
    expect([to.getDate(), to.getHours(), to.getMinutes()]).toEqual([
      30, 23, 59,
    ]);
  });

  it('drops unknown fields, disallowed abilities and wrong operators with warnings', () => {
    const result = change({
      status: 'apply',
      summary: 's',
      sort: [
        { field: 'missing', dir: 'asc' },
        { field: 'active', dir: 'asc' },
      ],
      filter: {
        type: 'or',
        operands: [
          { type: 'binary', field: 'name', op: 'gt', value: 'a' },
          { type: 'binary', field: 'salary', op: 'eq', value: 'lots' },
          { type: 'binary', field: 'salary', op: 'lt', value: 10 },
        ],
      },
    });
    expect(result.warnings).toEqual([
      { kind: 'unknown-field', slice: 'sort', field: 'missing' },
      { kind: 'not-allowed', slice: 'sort', field: 'active' },
      { kind: 'invalid-operator', slice: 'filter', field: 'name' },
      { kind: 'invalid-value', slice: 'filter', field: 'salary' },
    ]);
    // a one-operand group collapses to its operand
    expect(result.snapshot.filter?.builder).toEqual({
      type: 'binary',
      field: 'salary',
      op: 'lt',
      value: 10,
    });
    // an empty sort list equals the current (empty) one: no sort change
    expect(result.slices).toEqual(['filter']);
  });

  it('leaves omitted slices untouched and reports nothing changed', () => {
    const current: GridStateSnapshot = {
      sort: [{ field: 'name', dir: 'asc' }],
      filter: { searchText: 'x' },
    };
    const result = change(
      {
        status: 'apply',
        summary: 'same',
        sort: [{ field: 'name', dir: 'asc' }],
      },
      current,
    );
    expect(result.slices).toEqual([]);
    expect(result.snapshot.sort).toEqual(current.sort);
    expect(result.snapshot.filter?.searchText).toBe('x');
  });

  it('clears the assistant filter with null, other filters on request, and resets the page', () => {
    const current: GridStateSnapshot = {
      filter: {
        builder: { type: 'binary', field: 'name', op: 'eq', value: 'a' },
        row: [
          ['salary', { type: 'binary', field: 'salary', op: 'gt', value: 1 }],
        ],
      },
      paging: { pageIndex: 3, pageSize: 20 },
    };
    const result = change(
      { status: 'apply', summary: '', filter: null, clearOtherFilters: true },
      current,
    );
    expect(result.snapshot.filter?.builder).toBeNull();
    expect(result.snapshot.filter?.row).toEqual([]);
    expect(result.snapshot.paging).toEqual({ pageIndex: 0, pageSize: 20 });
  });

  it('honours the capability switches', () => {
    const result = resolveOgeGridAiReply(
      {
        status: 'apply',
        summary: '',
        sort: [{ field: 'name', dir: 'asc' }],
        search: 'x',
      },
      COLUMNS,
      EMPTY,
      { sort: false, filter: true, group: true, search: true, columns: true },
    );
    expect(result).toMatchObject({
      kind: 'change',
      slices: ['search'],
      warnings: [{ kind: 'not-allowed', slice: 'sort' }],
    });
  });

  it('bounds the filter tree', () => {
    const operands = Array.from({ length: 100 }, (_, i) => ({
      type: 'binary',
      field: 'salary',
      op: 'eq',
      value: i,
    }));
    const result = change({
      status: 'apply',
      summary: '',
      filter: { type: 'or', operands },
    });
    const builder = result.snapshot.filter?.builder as unknown as {
      operands: unknown[];
    };
    expect(builder.operands.length).toBe(63);
    expect(result.warnings).toEqual([{ kind: 'too-complex', slice: 'filter' }]);
  });

  it('passes clarify and unsupported through, and rejects non-objects', () => {
    expect(
      resolveOgeGridAiReply(
        { status: 'clarify', summary: 'Which year?' },
        COLUMNS,
        EMPTY,
      ),
    ).toEqual({ kind: 'clarify', summary: 'Which year?' });
    expect(
      resolveOgeGridAiReply(
        { status: 'unsupported', summary: 'No region column.' },
        COLUMNS,
        EMPTY,
      ),
    ).toEqual({ kind: 'unsupported', summary: 'No region column.' });
    expect(resolveOgeGridAiReply(undefined, COLUMNS, EMPTY)).toEqual({
      kind: 'invalid',
      warnings: [],
    });
    expect(resolveOgeGridAiReply([1], COLUMNS, EMPTY).kind).toBe('invalid');
  });

  it('truncates the summary', () => {
    const result = change({ status: 'apply', summary: 'x'.repeat(1000) });
    expect(result.summary.length).toBe(400);
  });
});
