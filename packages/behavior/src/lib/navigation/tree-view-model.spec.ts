import { describe, expect, it, vi } from 'vitest';
import {
  buildTreeViewModel,
  nextTreeExpansion,
  planTreeViewKey,
  treeChildrenLoadNeeded,
  type OgeTreeViewModelInput,
} from './tree-view-model';
import type { RowKey } from './tree-view-core';

interface Row {
  id: number;
  parentId: number | null;
  name: string;
  locked?: boolean;
}

/** Reports (1) ▸ Monthly (2), Yearly (3); Archive (4) ▸ 2023 (5). */
const rows: Row[] = [
  { id: 1, parentId: null, name: 'Reports' },
  { id: 2, parentId: 1, name: 'Monthly' },
  { id: 3, parentId: 1, name: 'Yearly' },
  { id: 4, parentId: null, name: 'Archive' },
  { id: 5, parentId: 4, name: '2023' },
];

function model(overrides: Partial<OgeTreeViewModelInput<Row>> = {}) {
  return buildTreeViewModel<Row>({
    items: rows,
    keyExpr: 'id',
    parentIdExpr: 'parentId',
    displayExpr: 'name',
    disabledExpr: 'locked',
    hasItemsExpr: 'hasItems',
    expandedKeys: new Set<RowKey>(),
    selectedKeys: new Set<RowKey>(),
    ...overrides,
  });
}

describe('buildTreeViewModel', () => {
  it('derives the index, the accessors and the flat node list in one pass', () => {
    const built = model({ expandedKeys: new Set<RowKey>([1]) });
    expect(built.index.roots.map(built.keyOf)).toEqual([1, 4]);
    expect(built.displayOf(rows[0])).toBe('Reports');
    expect(built.disabledOf(rows[0])).toBe(false);
    expect(built.nodes.map((node) => node.text)).toEqual([
      'Reports',
      'Monthly',
      'Yearly',
      'Archive',
    ]);
  });

  it('reports which nodes show a toggle', () => {
    expect([...model().expandableKeys].sort()).toEqual([1, 4]);
  });

  it('leaves the visible set null while nothing is searched for', () => {
    const built = model();
    expect(built.visibleKeys).toBe(null);
    expect(built.filterExpandedKeys.size).toBe(0);
  });

  it('filters, auto-expands the ancestors and highlights, all from one search', () => {
    const built = model({ search: 'monthly' });
    expect([...(built.visibleKeys ?? [])].sort()).toEqual([1, 2]);
    expect([...built.filterExpandedKeys]).toEqual([1]);
    expect(built.nodes.map((node) => node.text)).toEqual([
      'Reports',
      'Monthly',
    ]);
    expect(built.nodes[1].highlightedHtml).toContain('Monthly');
  });

  it('can auto-expansion be turned off, leaving the match collapsed away', () => {
    const built = model({
      search: 'monthly',
      expandNodesOnFiltering: false,
    });
    expect(built.nodes.map((node) => node.text)).toEqual(['Reports']);
  });

  it('can turn highlighting off without turning filtering off', () => {
    const built = model({ search: 'monthly', highlightSearchResults: false });
    expect(built.nodes[1].highlightedHtml).toBe(null);
    expect(built.visibleKeys).not.toBe(null);
  });

  it('runs the tri-state cascade only when checkboxes are on', () => {
    const off = model({ selectedKeys: new Set<RowKey>([2]) });
    expect(off.checkStates.size).toBe(0);
    const on = model({
      selectedKeys: new Set<RowKey>([2]),
      showCheckBoxes: 'normal',
    });
    expect(on.checkStates.get(1)).toBe('indeterminate');
    expect(on.selectAllState).toBe('indeterminate');
  });

  it('honours selectNodesRecursive: false even with checkboxes on', () => {
    const built = model({
      selectedKeys: new Set<RowKey>([2]),
      showCheckBoxes: 'normal',
      selectNodesRecursive: false,
    });
    expect(built.checkStates.size).toBe(0);
  });

  it('folds lazily loaded children into the same pipeline', () => {
    const built = model({
      items: [rows[0]],
      expandedKeys: new Set<RowKey>([1]),
      deferred: new Map([[1, [{ id: 9, parentId: null, name: 'Late' }]]]),
      loadStates: new Map([[1, { status: 'loaded' as const }]]),
      lazy: true,
    });
    expect(built.nodes.map((node) => node.text)).toEqual(['Reports', 'Late']);
    expect(built.loadingAny).toBe(false);
  });

  it('reports a load in flight', () => {
    const built = model({
      loadStates: new Map([[1, { status: 'loading' as const }]]),
      lazy: true,
    });
    expect(built.loadingAny).toBe(true);
  });

  it('reads a nested payload through itemsExpr', () => {
    const nested = [
      {
        id: 1,
        parentId: null,
        name: 'Reports',
        items: [{ id: 2, name: 'Monthly' }],
      },
    ] as unknown as Row[];
    const built = buildTreeViewModel<Row>({
      items: nested,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      itemsExpr: 'items',
      displayExpr: 'name',
      disabledExpr: 'locked',
      hasItemsExpr: 'hasItems',
      expandedKeys: new Set<RowKey>([1]),
      selectedKeys: new Set<RowKey>(),
    });
    expect(built.nodes.map((node) => node.text)).toEqual([
      'Reports',
      'Monthly',
    ]);
  });

  it('never mutates the expansion or selection it was given', () => {
    const expandedKeys = new Set<RowKey>([1]);
    const selectedKeys = new Set<RowKey>([2]);
    model({ expandedKeys, selectedKeys, search: 'yearly' });
    expect([...expandedKeys]).toEqual([1]);
    expect([...selectedKeys]).toEqual([2]);
  });
});

describe('nextTreeExpansion', () => {
  const index = model().index;

  it('adds and removes one key', () => {
    expect([
      ...nextTreeExpansion({
        index,
        expanded: new Set<RowKey>(),
        key: 1,
        expand: true,
        recursive: false,
      }),
    ]).toEqual([1]);
    expect([
      ...nextTreeExpansion({
        index,
        expanded: new Set<RowKey>([1, 4]),
        key: 1,
        expand: false,
        recursive: false,
      }),
    ]).toEqual([4]);
  });

  it('opens the ancestors too, so a deep expand is actually visible', () => {
    expect(
      [
        ...nextTreeExpansion({
          index,
          expanded: new Set<RowKey>(),
          key: 2,
          expand: true,
          recursive: true,
        }),
      ].sort(),
    ).toEqual([1, 2]);
  });

  it('never mutates the set it was given', () => {
    const expanded = new Set<RowKey>([1]);
    nextTreeExpansion({
      index,
      expanded,
      key: 4,
      expand: true,
      recursive: true,
    });
    expect([...expanded]).toEqual([1]);
  });
});

describe('treeChildrenLoadNeeded', () => {
  const index = model().index;
  const need = (
    overrides: Partial<Parameters<typeof treeChildrenLoadNeeded<Row>>[0]> = {},
  ) =>
    treeChildrenLoadNeeded<Row>({
      index,
      deferred: new Map(),
      loadStates: new Map(),
      key: 2,
      hasLoader: true,
      ...overrides,
    });

  it('fetches a leaf’s children once', () => {
    expect(need()).toBe(true);
  });

  it('never fetches without a loader', () => {
    expect(need({ hasLoader: false })).toBe(false);
  });

  it('does not re-fetch what is already cached or already known', () => {
    expect(need({ deferred: new Map([[2, []]]) })).toBe(false);
    expect(need({ key: 1 })).toBe(false); // the index already has its children
  });

  it('single-flights a fetch that is in progress or already failed', () => {
    expect(
      need({ loadStates: new Map([[2, { status: 'loading' as const }]]) }),
    ).toBe(false);
    expect(
      need({ loadStates: new Map([[2, { status: 'failed' as const }]]) }),
    ).toBe(false);
  });
});

describe('planTreeViewKey', () => {
  const built = model({ expandedKeys: new Set<RowKey>([1]) });
  // Reports(0) ▸ Monthly(1), Yearly(2); Archive(3)
  const plan = (
    key: string,
    current: number,
    overrides: Partial<Parameters<typeof planTreeViewKey<Row>>[0]> = {},
  ) =>
    planTreeViewKey<Row>({
      key,
      nodes: built.nodes,
      index: built.index,
      keyOf: built.keyOf,
      expanded: new Set<RowKey>([1]),
      expandableKeys: built.expandableKeys,
      current,
      selectionMode: 'multiple',
      pushTypeAhead: (char) => char,
      ...overrides,
    });

  it('returns null when the roving stop points at nothing', () => {
    expect(plan('ArrowDown', 99)).toBe(null);
  });

  it('moves the roving stop with the vertical arrows', () => {
    expect(plan('ArrowDown', 0)).toEqual({
      preventDefault: true,
      actions: [{ kind: 'focus', index: 1 }],
    });
    expect(plan('ArrowUp', 1)?.actions).toEqual([{ kind: 'focus', index: 0 }]);
  });

  it('stops at the ends rather than wrapping', () => {
    expect(plan('ArrowUp', 0)?.actions).toEqual([]);
    expect(plan('ArrowDown', built.nodes.length - 1)?.actions).toEqual([]);
  });

  it('extends the selection while Shift is held, in multiple mode only', () => {
    expect(plan('ArrowDown', 0, { shiftKey: true })?.actions).toEqual([
      { kind: 'focus', index: 1 },
      { kind: 'toggle-selection', index: 1 },
    ]);
    expect(
      plan('ArrowDown', 0, { shiftKey: true, selectionMode: 'single' })
        ?.actions,
    ).toEqual([{ kind: 'focus', index: 1 }]);
  });

  it('opens a collapsed node with ArrowRight, then walks into it', () => {
    const collapsed = model();
    const openPlan = planTreeViewKey<Row>({
      key: 'ArrowRight',
      nodes: collapsed.nodes,
      index: collapsed.index,
      keyOf: collapsed.keyOf,
      expanded: new Set<RowKey>(),
      expandableKeys: collapsed.expandableKeys,
      current: 0,
      selectionMode: 'multiple',
      pushTypeAhead: (char) => char,
    });
    expect(openPlan?.actions).toEqual([{ kind: 'expand', key: 1 }]);
    // already open → the key becomes a move to the first child
    expect(plan('ArrowRight', 0)?.actions).toEqual([
      { kind: 'focus', index: 1 },
    ]);
  });

  it('swallows ArrowRight on a leaf without doing anything', () => {
    expect(plan('ArrowRight', 1)).toEqual({
      preventDefault: true,
      actions: [],
    });
  });

  it('closes an open node with ArrowLeft, else walks up to the parent', () => {
    expect(plan('ArrowLeft', 0)?.actions).toEqual([
      { kind: 'collapse', key: 1 },
    ]);
    expect(plan('ArrowLeft', 1)?.actions).toEqual([
      { kind: 'focus', index: 0 },
    ]);
    expect(plan('ArrowLeft', 3)?.actions).toEqual([]); // a root with no parent
  });

  it('jumps to the ends on Home and End', () => {
    expect(plan('Home', 2)?.actions).toEqual([{ kind: 'focus', index: 0 }]);
    expect(plan('End', 0)?.actions).toEqual([
      { kind: 'focus', index: built.nodes.length - 1 },
    ]);
  });

  it('selects to the ends on Ctrl+Shift+Home/End', () => {
    expect(plan('Home', 2, { ctrlKey: true, shiftKey: true })?.actions).toEqual(
      [{ kind: 'select-range', from: 0, to: 2 }],
    );
    expect(plan('End', 1, { ctrlKey: true, shiftKey: true })?.actions).toEqual([
      { kind: 'select-range', from: 1, to: built.nodes.length - 1 },
    ]);
  });

  it('treats Enter as a click, toggling expansion on a parent', () => {
    expect(plan('Enter', 0)?.actions).toEqual([
      { kind: 'item-click', node: built.nodes[0] },
      { kind: 'toggle-expansion', key: 1 },
    ]);
  });

  it('treats Enter on a leaf as a click plus a selection toggle', () => {
    expect(plan('Enter', 1)?.actions).toEqual([
      { kind: 'item-click', node: built.nodes[1] },
      { kind: 'toggle-selection', index: 1 },
    ]);
    expect(plan('Enter', 1, { selectionMode: 'none' })?.actions).toEqual([
      { kind: 'item-click', node: built.nodes[1] },
    ]);
  });

  it('toggles the selection on Space, and never scrolls the page', () => {
    expect(plan(' ', 1)).toEqual({
      preventDefault: true,
      actions: [{ kind: 'toggle-selection', index: 1 }],
    });
    expect(plan(' ', 1, { selectionMode: 'none' })?.actions).toEqual([]);
  });

  it('extends from the anchor on Shift+Space', () => {
    expect(plan(' ', 2, { shiftKey: true })?.actions).toEqual([
      { kind: 'select-range', from: 2, to: 2 },
    ]);
  });

  it('opens every sibling on *, and can be switched off', () => {
    const [action] = plan('*', 0)?.actions ?? [];
    expect(action.kind).toBe('set-expanded');
    expect(
      [...(action as { expanded: ReadonlySet<RowKey> }).expanded].sort(),
    ).toEqual([1, 4]);
    expect(plan('*', 0, { allowExpandAll: false })).toBe(null);
  });

  it('selects everything on Ctrl+A, in multiple mode only', () => {
    expect(plan('a', 0, { ctrlKey: true })?.actions).toEqual([
      { kind: 'select-all' },
    ]);
    expect(plan('A', 0, { ctrlKey: true })?.actions).toEqual([
      { kind: 'select-all' },
    ]);
    expect(plan('a', 0, { ctrlKey: true, selectionMode: 'single' })).toBe(null);
  });

  it('feeds a printable key into the type-ahead and focuses the match', () => {
    const pushTypeAhead = vi.fn((char: string) => char);
    expect(plan('A', 0, { pushTypeAhead })?.actions).toEqual([
      { kind: 'focus', index: 3 }, // Archive
    ]);
    expect(pushTypeAhead).toHaveBeenCalledWith('a'); // lower-cased
  });

  it('leaves an unmatched or modified key alone', () => {
    expect(plan('z', 0)).toBe(null);
    expect(plan('m', 0, { altKey: true })).toBe(null);
    expect(plan('Escape', 0)).toBe(null);
  });
});
