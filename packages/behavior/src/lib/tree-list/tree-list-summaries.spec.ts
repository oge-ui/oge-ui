import {
  ArrayDataSource,
  createFilterPredicate,
  type DataSource,
  type LoadResult,
} from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OgeGridStateCore } from '../grid/grid-state-core';
import {
  OgeTreeListCore,
  type OgeTreeListCoreDeps,
  type OgeTreeListSummary,
} from './tree-list-core';

const rx: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

interface Task {
  id: number;
  parentId: number | null;
  name: string;
  hours: number;
}

const ROWS: Task[] = [
  { id: 1, parentId: null, name: 'Build', hours: 0 },
  { id: 2, parentId: 1, name: 'Design', hours: 4 },
  { id: 3, parentId: 2, name: 'Sketch', hours: 2 },
  { id: 4, parentId: 1, name: 'Code', hours: 10 },
  { id: 5, parentId: null, name: 'Ship', hours: 1 },
];

function setup(
  options: {
    data?: readonly Task[] | DataSource<Task>;
    summary?: OgeTreeListSummary<Task>;
    remote?: boolean;
  } = {},
) {
  const state = new OgeGridStateCore(rx);
  const result = rx.cell<LoadResult<Task> | null>(null);
  const data = options.data ?? ROWS;
  const deps: OgeTreeListCoreDeps<Task> = {
    data: () => data,
    keyExpr: () => 'id',
    parentIdExpr: () => 'parentId',
    rootValue: () => null,
    orphanPolicy: () => 'discard',
    autoExpandAll: () => false,
    hasItemsExpr: () => undefined,
    itemsExpr: () => undefined,
    loadMode: () => undefined,
    filterMode: () => 'withAncestors',
    expandNodesOnFiltering: () => true,
    selectionRecursive: () => false,
    paging: () => null,
    searchColumns: () => [{ accessor: (row: Task) => row.name }],
    state,
    result,
    pageIndex: rx.cell(0),
    onError: () => undefined,
    summary: () => options.summary,
    remoteFiltering: () => options.remote ?? false,
  };
  const core = new OgeTreeListCore<Task>(deps, rx);
  const load = async () => {
    const source = core.connect(data);
    result.set(await source.load(state.loadOptions()));
  };
  const names = () =>
    core
      .flatNodes()
      .map((node) => (node.kind === 'data' ? (node.data as Task).name : '…'));
  return { core, state, load, names };
}

const SUMMARY: OgeTreeListSummary<Task> = {
  totalItems: [
    { field: 'hours', type: 'sum' },
    { field: 'name', type: 'count' },
  ],
  recursiveItems: [{ field: 'hours', type: 'sum' }],
};

describe('OgeTreeListCore summaries', () => {
  it('totals every filter-visible row at every level, collapsed ones too', async () => {
    const t = setup({ summary: SUMMARY });
    await t.load();
    expect(t.names()).toEqual(['Build', 'Ship']); // collapsed
    expect(t.core.totalSummaries()).toEqual([
      { field: 'hours', type: 'sum', value: 17 },
      { field: 'name', type: 'count', value: 5 },
    ]);
    t.state.filter.setSearchText('sketch');
    // the match + its ancestors stay visible and are what the total counts
    expect(t.core.totalSummaries()[1].value).toBe(3);
  });

  it('aggregates each parent over its visible descendants', async () => {
    const t = setup({ summary: SUMMARY });
    await t.load();
    const recursive = t.core.recursiveSummaries();
    expect(recursive.get(1)?.[0].value).toBe(16);
    expect(recursive.get(2)?.[0].value).toBe(2);
    expect(recursive.has(5)).toBe(false); // a leaf has no descendants
    t.state.filter.setSearchText('code');
    expect(t.core.recursiveSummaries().get(1)?.[0].value).toBe(10);
  });

  it('supports avg/min/max/custom and showInColumn', async () => {
    const t = setup({
      summary: {
        totalItems: [
          { field: 'hours', type: 'avg' },
          { field: 'hours', type: 'min' },
          { field: 'hours', type: 'max', showInColumn: 'name' },
          { field: 'hours', type: 'custom', name: 'odd' },
        ],
        calculateCustomSummary: {
          odd: (rows) => rows.filter((row) => row.hours % 2 === 1).length,
        },
      },
    });
    await t.load();
    expect(t.core.totalSummaries().map((s) => [s.field, s.value])).toEqual([
      ['hours', 17 / 5],
      ['hours', 0],
      ['name', 10],
      ['hours', 1],
    ]);
  });

  it('exports per-parent footers after each subtree and the total last', async () => {
    const t = setup({ summary: SUMMARY });
    await t.load();
    t.core.expandAll();
    const data = t.core.getExportData(
      [
        {
          caption: 'Name',
          field: 'name',
          dataType: 'string',
          accessor: (row) => row.name,
        },
        {
          caption: 'Hours',
          field: 'hours',
          dataType: 'number',
          accessor: (row) => row.hours,
          width: 90,
        },
      ],
      { booleanTrue: 'Yes', booleanFalse: 'No' },
      { summaryText: (s) => `Σ ${String(s.value)}`, summaryLabel: () => 'Σ' },
    );
    expect(data.columns[1].width).toBe(90);
    expect(
      data.items?.map((item) =>
        item.kind === 'data'
          ? (item.row as Task).name
          : `${item.kind}${'level' in item ? item.level : ''}`,
      ),
    ).toEqual([
      'Build',
      'Design',
      'Sketch',
      'groupFooter2', // Design's subtree
      'Code',
      'groupFooter1', // Build's subtree
      'Ship',
      'total',
    ]);
    const total = data.items?.at(-1);
    expect(total?.kind === 'total' && total.summaries[0].text).toBe('Σ 17');
  });

  it('exports flat data without summaryText, and selected rows only', async () => {
    const t = setup({ summary: SUMMARY });
    await t.load();
    const columns = [
      {
        caption: 'Name',
        field: 'name',
        dataType: 'string' as const,
        accessor: (row: Task) => row.name,
      },
    ];
    const messages = { booleanTrue: 'Yes', booleanFalse: 'No' };
    expect(t.core.getExportData(columns, messages).items).toBeUndefined();
    t.state.selection.replace([5]);
    const selected = t.core.getExportData(columns, messages, {
      selectedRowsOnly: true,
    });
    expect(selected.rows.map((row) => row.name)).toEqual(['Ship']);
  });
});

describe('OgeTreeListCore remote filtering', () => {
  /** A server honoring the contract: matches plus all their ancestors. */
  function contractSource(calls: unknown[]): DataSource<Task> {
    const local = new ArrayDataSource<Task>(ROWS, { key: 'id' });
    return {
      capabilities: {
        sort: true,
        filter: true,
        group: false,
        paging: false,
        summary: false,
      },
      keyOf: (row) => row.id,
      load: async (options) => {
        calls.push(options);
        if (!options.filter && !options.searchText) return local.load({});
        const predicate = options.filter
          ? createFilterPredicate<Task>(options.filter)
          : (row: Task) =>
              row.name
                .toLowerCase()
                .includes((options.searchText ?? '').toLowerCase());
        const keep = new Set<number>();
        for (const row of ROWS.filter(predicate)) {
          let current: Task | undefined = row;
          while (current) {
            keep.add(current.id);
            const parent: number | null = current.parentId;
            current = ROWS.find((candidate) => candidate.id === parent);
          }
        }
        return { data: ROWS.filter((row) => keep.has(row.id)) };
      },
      distinct: async (field, options) => {
        calls.push({ distinct: field, filter: options?.filter ?? null });
        return ['Code', 'Design'];
      },
    };
  }

  it('passes the filter through and renders the answer without re-filtering', async () => {
    const calls: unknown[] = [];
    const t = setup({ data: contractSource(calls), remote: true });
    await t.load();
    t.state.filter.setSearchText('sketch');
    await t.load();
    expect(calls.at(-1)).toMatchObject({ searchText: 'sketch' });
    expect(t.core.remoteFilteringActive()).toBe(true);
    // ancestors arrived from the server and their branches are open
    expect(t.names()).toEqual(['Build', 'Design', 'Sketch']);
  });

  it('asks the source for header-filter values', async () => {
    const calls: unknown[] = [];
    const t = setup({ data: contractSource(calls), remote: true });
    await t.load();
    t.core.requestDistinctValues('name');
    await Promise.resolve();
    await Promise.resolve();
    expect(calls.at(-1)).toEqual({ distinct: 'name', filter: null });
    expect(t.core.distinctValues((row) => row.name, 10, 'name')).toEqual([
      'Code',
      'Design',
    ]);
  });

  it('stays client-side without the flag', async () => {
    const calls: unknown[] = [];
    const t = setup({ data: contractSource(calls) });
    await t.load();
    t.state.filter.setSearchText('sketch');
    await t.load();
    expect(calls.at(-1)).not.toHaveProperty('searchText');
    expect(t.core.remoteFilteringActive()).toBe(false);
    expect(t.names()).toEqual(['Build', 'Design', 'Sketch']);
  });
});
