import type {
  DataSource,
  LoadOptions,
  LoadResult,
  RowKey,
  TreeFilterMode,
} from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OgeGridStateCore } from '../grid/grid-state-core';
import type { OgePagingOptions } from '../grid/grid-options';
import {
  OgeTreeListCore,
  ogeTreeCsv,
  ogeTreeDataSource,
  ogeTreeDropPosition,
  ogeTreeHeaderValueGroups,
  ogeTreeHeaderValueText,
  type OgeTreeListCoreDeps,
} from './tree-list-core';

/** Plain closures, no memoization — proves the core needs no framework caching. */
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

interface Node {
  id: number;
  parentId: number | null;
  name: string;
  hasKids?: boolean;
}

const ROWS: Node[] = [
  { id: 1, parentId: null, name: 'Root A' },
  { id: 2, parentId: 1, name: 'Child A1' },
  { id: 3, parentId: 2, name: 'Grand A1a' },
  { id: 4, parentId: 1, name: 'Child A2' },
  { id: 5, parentId: null, name: 'Root B' },
];

interface Options {
  data?: readonly Node[] | DataSource<Node>;
  autoExpandAll?: boolean;
  recursive?: boolean;
  paging?: OgePagingOptions | null;
  filterMode?: TreeFilterMode;
  hasItemsExpr?: string;
}

function setup(options: Options = {}) {
  const state = new OgeGridStateCore(rx);
  const result = rx.cell<LoadResult<Node> | null>(null);
  const pageIndex = rx.cell(0);
  const errors: unknown[] = [];
  const props = {
    data: options.data ?? ROWS,
    autoExpandAll: options.autoExpandAll ?? false,
  };
  const deps: OgeTreeListCoreDeps<Node> = {
    data: () => props.data,
    keyExpr: () => 'id',
    parentIdExpr: () => 'parentId',
    rootValue: () => null,
    orphanPolicy: () => 'discard',
    autoExpandAll: () => props.autoExpandAll,
    hasItemsExpr: () => options.hasItemsExpr,
    itemsExpr: () => undefined,
    loadMode: () => undefined,
    filterMode: () => options.filterMode ?? 'withAncestors',
    expandNodesOnFiltering: () => true,
    selectionRecursive: () => options.recursive ?? false,
    paging: () => options.paging ?? null,
    searchColumns: () => [{ accessor: (row: Node) => row.name }],
    state,
    result,
    pageIndex,
    onError: (error) => errors.push(error),
  };
  const core = new OgeTreeListCore<Node>(deps, rx);
  /** Connects and runs the base load synchronously through the wrapper. */
  const load = async () => {
    const source = core.connect(props.data);
    result.set(await source.load(state.loadOptions()));
  };
  const names = () =>
    core
      .flatNodes()
      .map((node) => (node.kind === 'data' ? (node.data as Node).name : '…'));
  return { core, state, result, pageIndex, errors, load, names, props };
}

describe('OgeTreeListCore', () => {
  it('flattens only expanded branches and honors autoExpandAll polarity', async () => {
    const t = setup();
    await t.load();
    expect(t.names()).toEqual(['Root A', 'Root B']);
    t.core.expandRow(1);
    expect(t.names()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']);
    expect(t.core.isRowExpanded(1)).toBe(true);

    const auto = setup({ autoExpandAll: true });
    await auto.load();
    expect(auto.names()).toHaveLength(5);
    auto.core.collapseRow(1);
    expect(auto.names()).toEqual(['Root A', 'Root B']);
    // under autoExpandAll the toggled set records the collapsed key
    expect(auto.core.expansionSnapshot()).toEqual({ toggled: [1] });
  });

  it('expandAll / collapseAll and the controlled expandedRowKeys are polarity-aware', async () => {
    const t = setup({ autoExpandAll: true });
    await t.load();
    t.core.collapseAll();
    expect(t.names()).toEqual(['Root A', 'Root B']);
    t.core.applyExpandedRowKeys([1]);
    expect(t.names()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']);
    expect([...t.core.expandedSet()]).toEqual([1]);
    t.core.expandAll();
    expect(t.names()).toHaveLength(5);
  });

  it('keeps ancestors of filter matches and expands their path', async () => {
    const t = setup();
    await t.load();
    t.state.filter.setSearchText('grand');
    expect(t.names()).toEqual(['Root A', 'Child A1', 'Grand A1a']);
    t.state.filter.setSearchText('');
    const full = setup({ filterMode: 'fullBranch' });
    await full.load();
    full.state.filter.setSearchText('child a1');
    expect(full.names()).toEqual(['Root A', 'Child A1', 'Grand A1a']);
  });

  it('never hands filter or search to the source', async () => {
    const seen: LoadOptions[] = [];
    const inner: DataSource<Node> = {
      capabilities: {
        sort: true,
        filter: true,
        group: false,
        paging: false,
        summary: false,
      },
      keyOf: (row) => row.id,
      load: async (options) => {
        seen.push(options);
        return { data: ROWS };
      },
    };
    const wrapped = ogeTreeDataSource(inner, null);
    expect(wrapped.capabilities.filter).toBe(false);
    await wrapped.load({
      searchText: 'x',
      filter: { type: 'binary', field: 'name', op: 'eq', value: 'x' },
      sort: [{ field: 'name', dir: 'asc' }],
    });
    expect(seen[0]).toEqual({ sort: [{ field: 'name', dir: 'asc' }] });
    const lazy = ogeTreeDataSource(inner, {
      parentField: 'parentId',
      rootValue: null,
    });
    await lazy.load({ searchText: 'x' });
    expect(seen[1]).toEqual({
      filter: { type: 'binary', field: 'parentId', op: 'eq', value: null },
    });
  });

  it('cascades recursive selection and reports it per mode', async () => {
    const t = setup({ recursive: true });
    await t.load();
    t.core.toggleSelection(1);
    expect([...t.state.selection.selected()].sort()).toEqual([1, 2, 3, 4]);
    expect(t.core.getSelectedRowKeys('leavesOnly').sort()).toEqual([3, 4]);
    expect(t.core.getSelectedRowKeys('excludeRecursive')).toEqual([1]);
    t.core.toggleSelection(4);
    expect(t.core.rowCheckState(1)).toBe('indeterminate');
    expect(t.core.rowCheckState(2)).toBe('checked');
    expect(t.core.getSelectedRowsData('excludeRecursive')).toEqual([ROWS[1]]);
  });

  it('selectAll cascades to hidden descendants in recursive mode', async () => {
    const t = setup({ recursive: true });
    await t.load();
    t.core.selectAll();
    expect(t.state.selection.count()).toBe(5);
    const flat = setup();
    await flat.load();
    flat.core.selectAll();
    // only the visible rows
    expect([...flat.state.selection.selected()]).toEqual([1, 5]);
  });

  it('pages the flattened rows client-side', async () => {
    const t = setup({ autoExpandAll: true, paging: { pageSize: 2 } });
    await t.load();
    expect(t.core.pageCount()).toBe(3);
    expect(t.core.renderNodes()).toHaveLength(2);
    t.core.setPageIndex(9);
    expect(t.pageIndex()).toBe(2);
    expect(t.core.getVisibleRows().map((row) => row.name)).toEqual(['Root B']);
    t.core.setPageSize(0);
    expect(t.pageIndex()).toBe(0);
    expect(t.core.pageSize()).toBe(0);
    expect(t.core.renderNodes()).toHaveLength(5);
  });

  it('runs the cancelable toggle pipeline', async () => {
    const t = setup();
    await t.load();
    const log: string[] = [];
    const node = t.core.dataNodeByKey(1);
    if (!node) throw new Error('missing node');
    const notify = {
      expanding: (event: { cancel: boolean; key: RowKey }) => {
        log.push(`expanding:${String(event.key)}`);
        event.cancel = true;
      },
      collapsing: () => log.push('collapsing'),
      expanded: () => log.push('expanded'),
      collapsed: () => log.push('collapsed'),
    };
    expect(t.core.requestToggle(node, true, notify)).toBe(false);
    expect(log).toEqual(['expanding:1']);
    expect(t.core.isRowExpanded(1)).toBe(false);
    notify.expanding = (event) => log.push(`expanding:${String(event.key)}`);
    expect(t.core.requestToggle(node, true, notify)).toBe(true);
    expect(log).toEqual(['expanding:1', 'expanding:1', 'expanded']);
  });

  it('reparents plain-array rows in place and guards descendants', async () => {
    const rows = ROWS.map((row) => ({ ...row }));
    const t = setup({ data: rows, autoExpandAll: true });
    await t.load();
    expect(t.core.isValidDropTarget(1, 3)).toBe(false);
    let reloads = 0;
    const event = t.core.applyDrop(5, 2, 'inside', () => (reloads += 1));
    expect(event).toEqual({
      key: 5,
      row: rows[4],
      fromParentKey: null,
      toParentKey: 2,
      position: 'inside',
    });
    expect(rows[4].parentId).toBe(2);
    expect(reloads).toBe(1);
    // before: moves next to the target in the backing array too
    t.core.applyDrop(4, 2, 'before', () => undefined);
    expect(rows.map((row) => row.id)).toEqual([1, 4, 2, 3, 5]);
    expect(ogeTreeDropPosition(2, { top: 0, height: 20 })).toBe('before');
    expect(ogeTreeDropPosition(10, { top: 0, height: 20 })).toBe('inside');
    expect(ogeTreeDropPosition(19, { top: 0, height: 20 })).toBe('after');
    expect(ogeTreeDropPosition(19, null)).toBe('inside');
  });

  it('maps keyboard moves onto the drop path (siblings, indent, outdent)', async () => {
    const rows = ROWS.map((row) => ({ ...row }));
    const t = setup({ data: rows, autoExpandAll: true });
    await t.load();
    // Root A > (Child A1 > Grand A1a), Child A2 ; Root B
    expect(t.core.keyboardMoveTarget(4, 'up')).toEqual({
      targetKey: 2,
      position: 'before',
    });
    expect(t.core.keyboardMoveTarget(2, 'down')).toEqual({
      targetKey: 4,
      position: 'after',
    });
    expect(t.core.keyboardMoveTarget(1, 'down')).toEqual({
      targetKey: 5,
      position: 'after',
    });
    expect(t.core.keyboardMoveTarget(2, 'up')).toBeNull();
    expect(t.core.keyboardMoveTarget(4, 'down')).toBeNull();
    expect(t.core.keyboardMoveTarget(4, 'indent')).toEqual({
      targetKey: 2,
      position: 'inside',
    });
    expect(t.core.keyboardMoveTarget(2, 'indent')).toBeNull();
    expect(t.core.keyboardMoveTarget(3, 'outdent')).toEqual({
      targetKey: 2,
      position: 'after',
    });
    expect(t.core.keyboardMoveTarget(1, 'outdent')).toBeNull();
    expect(t.core.keyboardMoveTarget(99, 'up')).toBeNull();
    expect(t.core.rowPlacement(4)).toEqual({ level: 2, position: 2, total: 2 });

    // the target runs the same applyDrop the pointer uses
    const target = t.core.keyboardMoveTarget(3, 'outdent');
    if (!target) throw new Error('expected a target');
    const event = t.core.applyDrop(
      3,
      target.targetKey,
      target.position,
      () => undefined,
    );
    expect(event).toMatchObject({ key: 3, fromParentKey: 2, toParentKey: 1 });
    expect(rows.find((row) => row.id === 3)?.parentId).toBe(1);
  });

  it('loads lazy children per expansion and discovers remote matches', async () => {
    const all: Node[] = ROWS.map((row) => ({
      ...row,
      hasKids: ROWS.some((child) => child.parentId === row.id),
    }));
    const requests: string[] = [];
    const source: DataSource<Node> = {
      capabilities: {
        sort: true,
        filter: true,
        group: false,
        paging: false,
        summary: false,
      },
      keyOf: (row) => row.id,
      load: async (options) => {
        const filter = options.filter as
          { field: string; op: string; value: unknown } | undefined;
        requests.push(JSON.stringify(filter ?? options.searchText ?? null));
        if (options.searchText) {
          const needle = options.searchText.toLowerCase();
          return {
            data: all.filter((row) => row.name.toLowerCase().includes(needle)),
          };
        }
        if (filter?.op === 'in') {
          const keys = filter.value as unknown[];
          return {
            data: all.filter((row) =>
              keys.includes(filter.field === 'id' ? row.id : row.parentId),
            ),
          };
        }
        return {
          data: all.filter((row) => row.parentId === (filter?.value ?? null)),
        };
      },
    };
    const t = setup({ data: source, hasItemsExpr: 'hasKids' });
    expect(t.core.effLoadMode()).toBe('lazy');
    await t.load();
    expect(t.names()).toEqual(['Root A', 'Root B']);
    t.core.expandRow(1);
    // an expanded, unloaded node renders a filler row until its children land
    expect(t.names()).toEqual(['Root A', '…', 'Root B']);
    t.core.deferredLoader.sync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(t.names()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']);

    t.state.filter.setSearchText('grand');
    t.core.syncRemoteFilter();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(t.names()).toEqual(['Root A', 'Child A1', 'Grand A1a']);
    expect(t.errors).toEqual([]);
  });

  it('builds export data with levels and an indented CSV', async () => {
    const t = setup({ autoExpandAll: true });
    await t.load();
    const data = t.core.getExportData(
      [
        {
          caption: 'Name',
          field: 'name',
          dataType: 'string',
          accessor: (row) => row.name,
        },
      ],
      { booleanTrue: 'Yes', booleanFalse: 'No' },
    );
    expect(data.levels).toEqual([0, 1, 2, 1, 0]);
    const csv = ogeTreeCsv(data, { bom: false });
    expect(csv.split('\r\n').slice(0, 3)).toEqual([
      'Name',
      'Root A',
      '  Child A1',
    ]);
  });

  it('guards the first-column value before indenting it', async () => {
    const t = setup({ autoExpandAll: true });
    await t.load();
    const data = t.core.getExportData(
      [
        {
          caption: 'Name',
          field: 'name',
          dataType: 'string',
          accessor: (row) =>
            row.parentId === null ? '=cmd|"/c calc"!A1' : '  @SUM(A1)',
        },
        {
          caption: 'Second',
          field: 'name',
          dataType: 'string',
          accessor: () => ' +1+1',
        },
      ],
      { booleanTrue: 'Yes', booleanFalse: 'No' },
    );
    const lines = ogeTreeCsv(data, { bom: false }).split('\r\n');
    // the value is neutralised, indentation stays in front of it
    expect(lines[1]).toBe('"\'=cmd|""/c calc""!A1",\' +1+1');
    expect(lines[2]).toBe("  '  @SUM(A1),' +1+1");
    // opting out of the guard leaves both untouched
    const raw = ogeTreeCsv(data, { bom: false, formulaGuard: false });
    expect(raw.split('\r\n')[2]).toBe('    @SUM(A1), +1+1');
  });

  it('lists distinct values over the loaded rows and groups dates by year', async () => {
    const t = setup();
    await t.load();
    // blanks fold to '' and sort first
    expect(t.core.distinctValues((row) => row.parentId, 10)).toEqual([
      null,
      1,
      2,
    ]);
    expect(t.core.distinctValues((row) => row.parentId, 2)).toHaveLength(2);
    expect(
      ogeTreeHeaderValueText(null, { dataType: 'string' }, '(Blanks)'),
    ).toBe('(Blanks)');
    const groups = ogeTreeHeaderValueGroups(
      ['2026-01-02', '2025-05-01', 'oops'],
      '',
      String,
      '(Blanks)',
    );
    expect(groups.map((group) => group.label)).toEqual([
      '(Blanks)',
      '2025',
      '2026',
    ]);
  });

  it('stages the parent of a new row under a string parentIdExpr', async () => {
    const t = setup();
    await t.load();
    t.state.editing.addRow('new-1');
    t.core.stageNewRowParent('new-1', 5);
    expect(t.state.editing.changeFor('new-1', 'parentId')).toBe(5);
    expect(t.core.flatNodes()[0]).toMatchObject({ key: 'new-1', level: 0 });
  });

  it('reveals a deep row by expanding its ancestors', async () => {
    const t = setup();
    await t.load();
    expect(t.core.revealRow(3)).toBe(2);
    expect(t.names()).toEqual([
      'Root A',
      'Child A1',
      'Grand A1a',
      'Child A2',
      'Root B',
    ]);
    expect(t.core.revealRow(99)).toBeUndefined();
  });
});
