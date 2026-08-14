import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_TREE_VIEW_MESSAGES,
  OGE_TREE_DEFAULT_ITEM_HEIGHT,
  OGE_TREE_DRAG_THRESHOLD,
  buildTreeViewIndex,
  buildTreeViewNodes,
  createTreeSearchPredicate,
  exceedsTreeDragThreshold,
  nextTreeSelection,
  resolveOgeTreeViewConfig,
  resolveTreeDropPosition,
  resolveTreeItemHeight,
  resolveTreeSelectByClick,
  treeAccessor,
  treeAnchorIndex,
  treeAriaChecked,
  treeAriaSelected,
  treeCanDrop,
  treeCheckStates,
  treeEdgeIndex,
  treeEffectiveExpanded,
  treeExpandableKeys,
  treeFilterExpandedKeys,
  treeHasChildrenHint,
  treeLoadingAny,
  treeNodeDisabled,
  treeNodeIndent,
  treeParentIndex,
  treeRangeSelection,
  treeSearchAccessors,
  treeSelectAllState,
  treeSiblingExpansion,
  treeStepIndex,
  treeTypeAheadIndex,
  treeVisibleKeys,
  type OgeTreeSearchMode,
  type OgeTreeViewNode,
  type RowKey,
} from './tree-view-core';

interface Row {
  id: number;
  parentId: number | null;
  name: string;
  locked?: boolean;
  mayHaveChildren?: boolean;
}

/**
 * Reports (1) ▸ Monthly (2), Yearly (3); Archive (4) ▸ 2023 (5).
 */
const rows: Row[] = [
  { id: 1, parentId: null, name: 'Reports' },
  { id: 2, parentId: 1, name: 'Monthly' },
  { id: 3, parentId: 1, name: 'Yearly' },
  { id: 4, parentId: null, name: 'Archive' },
  { id: 5, parentId: 4, name: '2023' },
];

const keyOf = (row: Row): RowKey => row.id;
const index = () =>
  buildTreeViewIndex<Row>({ items: rows, keyOf, parentIdExpr: 'parentId' });

const nodesOf = (
  expanded: Iterable<RowKey> = [],
  overrides: Partial<Parameters<typeof buildTreeViewNodes<Row>>[0]> = {},
) =>
  buildTreeViewNodes<Row>({
    index: index(),
    keyOf,
    displayOf: (row) => row.name,
    disabledOf: (row) => row.locked === true,
    expandedKeys: new Set(expanded),
    selectedKeys: new Set(),
    checkStates: new Map(),
    loadStates: new Map(),
    ...overrides,
  });

describe('resolveOgeTreeViewConfig', () => {
  it('defaults and merges messages key by key', () => {
    expect(resolveOgeTreeViewConfig(undefined).messages).toEqual(
      OGE_DEFAULT_TREE_VIEW_MESSAGES,
    );
    const config = resolveOgeTreeViewConfig({ messages: { noData: 'Yok' } });
    expect(config.messages.noData).toBe('Yok');
    expect(config.messages.selectAll).toBe(
      OGE_DEFAULT_TREE_VIEW_MESSAGES.selectAll,
    );
  });
});

describe('treeAccessor', () => {
  it('reads a field name and calls a function expression', () => {
    expect(treeAccessor<Row>('name')(rows[0])).toBe('Reports');
    expect(treeAccessor<Row, number>((row) => row.id * 2)(rows[0])).toBe(2);
  });
});

describe('buildTreeViewIndex', () => {
  it('indexes flat parent-referencing data', () => {
    const built = index();
    expect(built.roots.map(keyOf)).toEqual([1, 4]);
    expect(built.childrenOf.get(1)?.map(keyOf)).toEqual([2, 3]);
    expect(built.parentOf.get(2)).toBe(1);
  });

  it('flattens nested payloads into the same one pipeline', () => {
    const nested = [
      {
        id: 1,
        parentId: null,
        name: 'Reports',
        items: [{ id: 2, parentId: null, name: 'Monthly' }],
      },
    ] as unknown as Row[];
    const built = buildTreeViewIndex<Row>({
      items: nested,
      keyOf,
      parentIdExpr: 'parentId',
      itemsExpr: 'items',
    });
    expect(built.roots.map(keyOf)).toEqual([1]);
    expect(built.childrenOf.get(1)?.map(keyOf)).toEqual([2]);
  });

  it('folds lazily loaded children in under the key they arrived on', () => {
    const built = buildTreeViewIndex<Row>({
      items: [rows[0]],
      keyOf,
      parentIdExpr: 'parentId',
      deferred: new Map([[1, [{ id: 9, parentId: null, name: 'Late' }]]]),
    });
    // the parent link comes from the map key — nested lazy children carry none
    expect(built.childrenOf.get(1)?.map(keyOf)).toEqual([9]);
    expect(built.roots.map(keyOf)).toEqual([1]);
  });
});

describe('expandability', () => {
  it('marks every parent expandable', () => {
    expect([...treeExpandableKeys(index())].sort()).toEqual([1, 4]);
  });

  it('ignores the hasItems hint unless a loader is wired', () => {
    expect(treeHasChildrenHint<Row>(false, 'mayHaveChildren')).toBeUndefined();
  });

  it('adds lazily expandable leaves once a loader is wired', () => {
    const lazyRows = [
      { id: 1, parentId: null, name: 'Reports', mayHaveChildren: true },
      { id: 2, parentId: null, name: 'Flat', mayHaveChildren: false },
    ];
    const hint = treeHasChildrenHint<Row>(true, 'mayHaveChildren');
    const built = buildTreeViewIndex<Row>({
      items: lazyRows,
      keyOf,
      parentIdExpr: 'parentId',
    });
    expect([...treeExpandableKeys(built, hint)]).toEqual([1]);
  });
});

describe('search', () => {
  const accessors = treeSearchAccessors<Row>('name', undefined);
  /** The predicate as the pipeline uses it: "not searching" matches nothing. */
  const matches = (
    text: string,
    mode: OgeTreeSearchMode,
    row: Row,
    list = accessors,
  ) => {
    const predicate = createTreeSearchPredicate<Row>(text, mode, list);
    return predicate !== null && predicate(row);
  };

  it('is null when there is nothing to search for', () => {
    expect(createTreeSearchPredicate<Row>('', 'contains', accessors)).toBe(
      null,
    );
    expect(createTreeSearchPredicate<Row>('   ', 'contains', accessors)).toBe(
      null,
    );
  });

  it('folds case and accents, so "odeme" matches "Ödemeler"', () => {
    expect(
      matches('odeme', 'contains', { id: 9, parentId: null, name: 'Ödemeler' }),
    ).toBe(true);
  });

  it('honours the three match modes', () => {
    const row = rows[1]; // Monthly
    expect(matches('thly', 'contains', row)).toBe(true);
    expect(matches('thly', 'startsWith', row)).toBe(false);
    expect(matches('mon', 'startsWith', row)).toBe(true);
    expect(matches('monthly', 'equals', row)).toBe(true);
  });

  it('searches the named fields when searchExpr is given', () => {
    const byId = treeSearchAccessors<Row>('name', 'id');
    expect(byId).toHaveLength(1);
    expect(matches('3', 'equals', rows[2], byId)).toBe(true);
    expect(treeSearchAccessors<Row>('name', ['name', 'id'])).toHaveLength(2);
  });

  it('keeps the ancestors of a match reachable', () => {
    const predicate = createTreeSearchPredicate<Row>(
      'monthly',
      'contains',
      accessors,
    );
    const visible = treeVisibleKeys(index(), predicate, 'withAncestors');
    expect([...(visible ?? [])].sort()).toEqual([1, 2]);
  });

  it('does not filter at all when nothing is searched for', () => {
    expect(treeVisibleKeys(index(), null, 'withAncestors')).toBe(null);
  });

  it('auto-expands the ancestors of the matches, when asked to', () => {
    const visible = new Set<RowKey>([1, 2]);
    expect([...treeFilterExpandedKeys(index(), visible, true)]).toEqual([1]);
    expect(treeFilterExpandedKeys(index(), visible, false).size).toBe(0);
    expect(treeFilterExpandedKeys(index(), null, true).size).toBe(0);
  });

  it('overlays the search expansion on the user’s own, without losing it', () => {
    const user = new Set<RowKey>([4]);
    expect([...treeEffectiveExpanded(user, new Set([1]))].sort()).toEqual([
      1, 4,
    ]);
    // nothing to overlay → the user's set is passed through untouched
    expect(treeEffectiveExpanded(user, new Set())).toBe(user);
  });
});

describe('buildTreeViewNodes', () => {
  it('renders only the roots while nothing is expanded', () => {
    expect(nodesOf().map((node) => node.text)).toEqual(['Reports', 'Archive']);
  });

  it('renders the children of an expanded node in place', () => {
    expect(nodesOf([1]).map((node) => node.text)).toEqual([
      'Reports',
      'Monthly',
      'Yearly',
      'Archive',
    ]);
  });

  it('carries the APG position fields', () => {
    const [reports, monthly] = nodesOf([1]);
    expect(reports).toMatchObject({
      level: 0,
      posInSet: 1,
      setSize: 2,
      hasChildren: true,
      expanded: true,
    });
    expect(monthly).toMatchObject({ level: 1, posInSet: 1, setSize: 2 });
  });

  it('reads the disabled and selected state off the accessors', () => {
    const nodes = nodesOf([1], {
      disabledOf: (row) => row.id === 2,
      selectedKeys: new Set([3]),
    });
    expect(nodes[1].disabled).toBe(true);
    expect(nodes[2].selected).toBe(true);
  });

  it('highlights the search match, and only while highlighting is on', () => {
    const nodes = nodesOf([1], { highlight: 'mon' });
    expect(nodes[1].highlightedHtml).toBe(
      '<mark class="oge-highlight">Mon</mark>thly',
    );
    expect(nodes[0].highlightedHtml).toBe(null); // no match on this row
    expect(nodesOf([1])[1].highlightedHtml).toBe(null);
  });

  it('renders a filler row under an expanded, unloaded lazy parent', () => {
    const lazyRow = { id: 1, parentId: null, name: 'Reports' };
    const nodes = buildTreeViewNodes<Row>({
      index: buildTreeViewIndex<Row>({
        items: [lazyRow],
        keyOf,
        parentIdExpr: 'parentId',
      }),
      keyOf,
      displayOf: (row) => row.name,
      disabledOf: () => false,
      expandedKeys: new Set([1]),
      selectedKeys: new Set(),
      checkStates: new Map(),
      loadStates: new Map([[1, { status: 'loading' as const }]]),
      hasChildren: () => true,
    });
    expect(nodes[0].loading).toBe(true);
    expect(nodes[1]).toMatchObject({ filler: true, failed: false, key: '1' });
  });

  it('marks the filler of a failed load', () => {
    const lazyRow = { id: 1, parentId: null, name: 'Reports' };
    const nodes = buildTreeViewNodes<Row>({
      index: buildTreeViewIndex<Row>({
        items: [lazyRow],
        keyOf,
        parentIdExpr: 'parentId',
      }),
      keyOf,
      displayOf: (row) => row.name,
      disabledOf: () => false,
      expandedKeys: new Set([1]),
      selectedKeys: new Set(),
      checkStates: new Map(),
      loadStates: new Map([[1, { status: 'failed' as const }]]),
      hasChildren: () => true,
    });
    expect(nodes[1]).toMatchObject({ filler: true, failed: true });
  });
});

describe('check states', () => {
  it('stays empty while the cascade is off', () => {
    expect(treeCheckStates(index(), new Set([2]), false).size).toBe(0);
  });

  it('marks a partly selected parent indeterminate and a full one checked', () => {
    const partial = treeCheckStates(index(), new Set([2]), true);
    expect(partial.get(1)).toBe('indeterminate');
    const full = treeCheckStates(index(), new Set([2, 3]), true);
    expect(full.get(1)).toBe('checked');
  });

  it('folds the roots up into the select-all state', () => {
    const built = index();
    const none = treeCheckStates(built, new Set(), true);
    expect(treeSelectAllState(built, keyOf, none, new Set())).toBe('unchecked');
    const some = treeCheckStates(built, new Set([2]), true);
    expect(treeSelectAllState(built, keyOf, some, new Set([2]))).toBe(
      'indeterminate',
    );
    const all = treeCheckStates(built, new Set([1, 2, 3, 4, 5]), true);
    expect(
      treeSelectAllState(built, keyOf, all, new Set([1, 2, 3, 4, 5])),
    ).toBe('checked');
  });

  it('reads an empty tree as unchecked, not as "all selected"', () => {
    const empty = buildTreeViewIndex<Row>({
      items: [],
      keyOf,
      parentIdExpr: 'parentId',
    });
    expect(treeSelectAllState(empty, keyOf, new Map(), new Set())).toBe(
      'unchecked',
    );
  });
});

describe('aria state', () => {
  const node = (overrides: Partial<OgeTreeViewNode<Row>> = {}) =>
    ({ ...nodesOf()[0], ...overrides }) as OgeTreeViewNode<Row>;

  it('exposes selection through aria-selected OR aria-checked, never both', () => {
    const selected = node({ selected: true, checkState: 'checked' });
    expect(treeAriaSelected(selected, 'none', 'multiple')).toBe(true);
    expect(treeAriaChecked(selected, 'none')).toBe(null);
    expect(treeAriaSelected(selected, 'normal', 'multiple')).toBe(null);
    expect(treeAriaChecked(selected, 'normal')).toBe('true');
  });

  it('says nothing on a tree that does not select', () => {
    expect(treeAriaSelected(node(), 'none', 'none')).toBe(null);
  });

  it('reports an indeterminate row as mixed', () => {
    expect(
      treeAriaChecked(node({ checkState: 'indeterminate' }), 'normal'),
    ).toBe('mixed');
  });

  it('says nothing on a filler row', () => {
    const filler = node({ filler: true });
    expect(treeAriaSelected(filler, 'none', 'multiple')).toBe(null);
    expect(treeAriaChecked(filler, 'normal')).toBe(null);
  });
});

describe('keyboard index math', () => {
  const list = nodesOf([1, 4]);

  it('steps one row without wrapping at the ends', () => {
    expect(treeStepIndex(list, 0, 1)).toBe(1);
    expect(treeStepIndex(list, 0, -1)).toBe(null);
    expect(treeStepIndex(list, list.length - 1, 1)).toBe(null);
  });

  it('skips disabled and filler rows', () => {
    const withDisabled = nodesOf([1, 4], {
      disabledOf: (row) => row.id === 2,
    });
    expect(treeStepIndex(withDisabled, 0, 1)).toBe(2);
    expect(treeNodeDisabled(withDisabled, 1)).toBe(true);
    expect(treeNodeDisabled(withDisabled, 99)).toBe(true);
  });

  it('finds the focusable ends', () => {
    expect(treeEdgeIndex(list, 1)).toBe(0);
    expect(treeEdgeIndex(list, -1)).toBe(list.length - 1);
  });

  it('walks up to the visible parent row', () => {
    expect(treeParentIndex(list, 1)).toBe(0); // Monthly → Reports
    expect(treeParentIndex(list, 0)).toBe(null); // a root has none
  });

  it('cycles same-letter rows on a single-letter type-ahead', () => {
    // Reports, Monthly, Yearly, Archive, 2023
    expect(treeTypeAheadIndex(list, 'a', 0)).toBe(3);
    expect(treeTypeAheadIndex(list, 'm', 0)).toBe(1);
    // a longer prefix re-tests the current row
    expect(treeTypeAheadIndex(list, 'mo', 1)).toBe(1);
    expect(treeTypeAheadIndex(list, 'zz', 0)).toBe(null);
  });
});

describe('treeSiblingExpansion', () => {
  it('opens every expandable sibling at the node’s level (the * shortcut)', () => {
    const built = index();
    const expandable = treeExpandableKeys(built);
    expect(
      [...treeSiblingExpansion(built, keyOf, new Set(), expandable, 1)].sort(),
    ).toEqual([1, 4]);
  });

  it('keeps whatever was already open', () => {
    const built = index();
    const expandable = treeExpandableKeys(built);
    expect(
      treeSiblingExpansion(built, keyOf, new Set([99]), expandable, 1).has(99),
    ).toBe(true);
  });

  it('opens the siblings of a child, not the roots', () => {
    const built = index();
    // Monthly's siblings are leaves — nothing to open
    expect([
      ...treeSiblingExpansion(
        built,
        keyOf,
        new Set(),
        treeExpandableKeys(built),
        2,
      ),
    ]).toEqual([]);
  });
});

describe('selection', () => {
  it('replaces the whole selection in single mode', () => {
    const built = index();
    expect([
      ...nextTreeSelection({
        index: built,
        selected: new Set([2]),
        key: 3,
        select: true,
        selectionMode: 'single',
        recursive: false,
      }),
    ]).toEqual([3]);
    expect(
      nextTreeSelection({
        index: built,
        selected: new Set([3]),
        key: 3,
        select: false,
        selectionMode: 'single',
        recursive: false,
      }).size,
    ).toBe(0);
  });

  it('adds and removes one key in plain multiple mode', () => {
    const built = index();
    expect(
      [
        ...nextTreeSelection({
          index: built,
          selected: new Set([2]),
          key: 3,
          select: true,
          selectionMode: 'multiple',
          recursive: false,
        }),
      ].sort(),
    ).toEqual([2, 3]);
  });

  it('cascades to the subtree in recursive mode', () => {
    const selected = nextTreeSelection({
      index: index(),
      selected: new Set(),
      key: 1,
      select: true,
      selectionMode: 'multiple',
      recursive: true,
    });
    expect(selected.has(2)).toBe(true);
    expect(selected.has(3)).toBe(true);
  });

  it('does nothing recursive when the state already matches the intent', () => {
    const current = new Set<RowKey>([2]);
    const next = nextTreeSelection({
      index: index(),
      selected: current,
      key: 2,
      select: true,
      selectionMode: 'multiple',
      recursive: true,
    });
    expect([...next]).toEqual([2]);
    expect(next).not.toBe(current); // still a fresh set
  });

  it('adds every enabled row of a range, in either direction', () => {
    const list = nodesOf([1], { disabledOf: (row) => row.id === 3 });
    expect([...treeRangeSelection(list, new Set(), 0, 2)].sort()).toEqual([
      1, 2,
    ]);
    expect([...treeRangeSelection(list, new Set(), 2, 0)].sort()).toEqual([
      1, 2,
    ]);
  });

  it('clamps a range that runs off the ends', () => {
    const list = nodesOf();
    expect([...treeRangeSelection(list, new Set(), -5, 99)].sort()).toEqual([
      1, 4,
    ]);
  });

  it('anchors a Shift range on the first selected row, else on the cursor', () => {
    const list = nodesOf([1], { selectedKeys: new Set([3]) });
    expect(treeAnchorIndex(list, 3)).toBe(2);
    expect(treeAnchorIndex(nodesOf([1]), 3)).toBe(3);
  });
});

describe('drag and drop', () => {
  it('splits a row into three zones when dropping inside is allowed', () => {
    const rect = { top: 100, height: 40 };
    expect(resolveTreeDropPosition(105, rect, true)).toBe('before');
    expect(resolveTreeDropPosition(120, rect, true)).toBe('inside');
    expect(resolveTreeDropPosition(135, rect, true)).toBe('after');
  });

  it('splits it in half when it is not', () => {
    const rect = { top: 100, height: 40 };
    expect(resolveTreeDropPosition(115, rect, false)).toBe('before');
    expect(resolveTreeDropPosition(125, rect, false)).toBe('after');
  });

  it('starts a drag only past the movement threshold', () => {
    const from = { x: 0, y: 0 };
    expect(
      exceedsTreeDragThreshold(from, {
        x: OGE_TREE_DRAG_THRESHOLD,
        y: 0,
      }),
    ).toBe(false);
    expect(
      exceedsTreeDragThreshold(from, {
        x: OGE_TREE_DRAG_THRESHOLD + 1,
        y: 0,
      }),
    ).toBe(true);
    expect(exceedsTreeDragThreshold(from, { x: 0, y: -10 })).toBe(true);
  });

  it('never drops a node into itself or its own subtree', () => {
    const built = index();
    expect(treeCanDrop(built, 1, 1)).toBe(false);
    expect(treeCanDrop(built, 1, 2)).toBe(false); // own child
    expect(treeCanDrop(built, 2, 4)).toBe(true);
    expect(treeCanDrop(built, 2, 1)).toBe(true); // back onto its own parent
  });
});

describe('render defaults', () => {
  it('clicking selects only while there are no checkboxes to tick', () => {
    expect(resolveTreeSelectByClick(undefined, 'none')).toBe(true);
    expect(resolveTreeSelectByClick(undefined, 'normal')).toBe(false);
    expect(resolveTreeSelectByClick(true, 'normal')).toBe(true);
    expect(resolveTreeSelectByClick(false, 'none')).toBe(false);
  });

  it('resolves the virtual row height from the options, the config or the default', () => {
    expect(resolveTreeItemHeight({ itemHeight: 44 }, 30)).toBe(44);
    expect(resolveTreeItemHeight(true, 36)).toBe(36);
    expect(resolveTreeItemHeight(true, undefined)).toBe(
      OGE_TREE_DEFAULT_ITEM_HEIGHT,
    );
  });

  it('indents by depth', () => {
    expect(treeNodeIndent(0)).toBe(8);
    expect(treeNodeIndent(2)).toBe(40);
  });
});

describe('treeLoadingAny', () => {
  it('is true while any node is still fetching', () => {
    expect(treeLoadingAny(new Map())).toBe(false);
    expect(treeLoadingAny(new Map([[1, { status: 'loaded' as const }]]))).toBe(
      false,
    );
    expect(
      treeLoadingAny(
        new Map([
          [1, { status: 'failed' as const }],
          [2, { status: 'loading' as const }],
        ]),
      ),
    ).toBe(true);
  });
});
