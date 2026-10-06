import { describe, expect, it } from 'vitest';
import { ogeFormatMessage } from '@oge-ui/core';
import {
  OGE_DEFAULT_TREE_VIEW_MESSAGES,
  fillTreeViewMessages,
  nextTreeChildPage,
  resolveTreeChildPageSize,
  treeAriaChecked,
  treeAriaSelected,
  treeChildPageLimit,
  treeLoadMoreKey,
  treeRangeSelection,
  type RowKey,
} from './tree-view-core';
import { buildTreeViewModel, planTreeViewKey } from './tree-view-model';

interface Row {
  id: number;
  parentId: number | null;
  name: string;
}

/** Root (1) with five children (11–15); 12 has two children (121, 122); Other (2). */
const rows: Row[] = [
  { id: 1, parentId: null, name: 'Root' },
  { id: 11, parentId: 1, name: 'A' },
  { id: 12, parentId: 1, name: 'B' },
  { id: 121, parentId: 12, name: 'B1' },
  { id: 122, parentId: 12, name: 'B2' },
  { id: 13, parentId: 1, name: 'C' },
  { id: 14, parentId: 1, name: 'D' },
  { id: 15, parentId: 1, name: 'E' },
  { id: 2, parentId: null, name: 'Other' },
];

function nodes(
  pageLimits?: ReadonlyMap<RowKey | null, number>,
  extra: { search?: string; expanded?: RowKey[] } = {},
) {
  return buildTreeViewModel<Row>({
    items: rows,
    keyExpr: 'id',
    parentIdExpr: 'parentId',
    displayExpr: 'name',
    disabledExpr: 'disabled',
    hasItemsExpr: 'hasItems',
    expandedKeys: new Set<RowKey>(extra.expanded ?? [1, 12]),
    selectedKeys: new Set<RowKey>(),
    search: extra.search,
    childPageSize: 2,
    pageLimits,
  }).nodes;
}

describe('tree view "Load more" paging', () => {
  it('shows the first page of every parent plus a Load more row', () => {
    const list = nodes();
    expect(
      list.map((n) => (n.more ? `more:${n.more.parentKey}` : n.text)),
    ).toEqual(['Root', 'A', 'B', 'B1', 'B2', 'more:1', 'Other']);
    const more = list[5];
    expect(more.more).toEqual({ parentKey: 1, shown: 2, total: 5 });
    expect(more.level).toBe(1);
    expect(more.filler).toBe(false);
    expect(more.key).toBe(treeLoadMoreKey(1));
  });

  it('keeps the real total in setSize', () => {
    const list = nodes();
    expect(list[1].setSize).toBe(5);
    expect(list[1].posInSet).toBe(1);
  });

  it('grows the parent by one page per Load more, never past the total', () => {
    let limits: ReadonlyMap<RowKey | null, number> = new Map();
    limits = nextTreeChildPage(limits, 1, 2, 5);
    expect(treeChildPageLimit(limits, 1, 2)).toBe(4);
    expect(nodes(limits).filter((n) => n.level === 1 && !n.more)).toHaveLength(
      4,
    );
    limits = nextTreeChildPage(limits, 1, 2, 5);
    expect(treeChildPageLimit(limits, 1, 2)).toBe(5);
    expect(nodes(limits).some((n) => n.more?.parentKey === 1)).toBe(false);
  });

  it('pages the root level under the null key', () => {
    const list = buildTreeViewModel<Row>({
      items: [
        { id: 1, parentId: null, name: 'a' },
        { id: 2, parentId: null, name: 'b' },
        { id: 3, parentId: null, name: 'c' },
      ],
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      displayExpr: 'name',
      disabledExpr: 'disabled',
      hasItemsExpr: 'hasItems',
      expandedKeys: new Set(),
      selectedKeys: new Set(),
      childPageSize: 2,
    }).nodes;
    expect(list.at(-1)?.more).toEqual({ parentKey: null, shown: 2, total: 3 });
    expect(list.at(-1)?.level).toBe(0);
  });

  it('skips the hidden children’s subtrees too', () => {
    const limits = new Map<RowKey | null, number>([[1, 1]]);
    const texts = nodes(limits).map((n) => n.text || 'more');
    expect(texts).toEqual(['Root', 'A', 'more', 'Other']);
  });

  it('turns paging off while searching, so every match stays reachable', () => {
    expect(nodes(undefined, { search: 'e' }).some((n) => n.more)).toBe(false);
  });

  it('never selects or checks the Load more row', () => {
    const list = nodes();
    const more = list[5];
    expect(treeAriaSelected(more, 'none', 'multiple')).toBeNull();
    expect(treeAriaChecked(more, 'normal')).toBeNull();
    expect(
      treeRangeSelection(list, new Set(), 0, list.length - 1).has(more.key),
    ).toBe(false);
  });

  it('resolves Enter and Space on the Load more row to a load-more action', () => {
    const list = nodes();
    const model = buildTreeViewModel<Row>({
      items: rows,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      displayExpr: 'name',
      disabledExpr: 'disabled',
      hasItemsExpr: 'hasItems',
      expandedKeys: new Set(),
      selectedKeys: new Set(),
    });
    for (const key of ['Enter', ' ']) {
      const plan = planTreeViewKey<Row>({
        key,
        nodes: list,
        index: model.index,
        keyOf: model.keyOf,
        expanded: new Set(),
        expandableKeys: model.expandableKeys,
        current: 5,
        selectionMode: 'multiple',
        pushTypeAhead: (c) => c,
      });
      expect(plan?.actions).toEqual([{ kind: 'load-more', node: list[5] }]);
    }
  });

  it('validates the page size', () => {
    expect(resolveTreeChildPageSize(undefined)).toBe(0);
    expect(resolveTreeChildPageSize(0)).toBe(0);
    expect(resolveTreeChildPageSize(-3)).toBe(0);
    expect(resolveTreeChildPageSize(Number.NaN)).toBe(0);
    expect(resolveTreeChildPageSize(2.7)).toBe(2);
  });

  it('keeps string and number parent keys apart', () => {
    expect(treeLoadMoreKey(1)).not.toBe(treeLoadMoreKey('1'));
    expect(treeLoadMoreKey(null)).not.toBe(treeLoadMoreKey(''));
  });
});

describe('tree view message fill', () => {
  it('fills the optional keys from English and keeps overrides', () => {
    const filled = fillTreeViewMessages({ noData: 'Boş', loadMore: undefined });
    expect(filled.noData).toBe('Boş');
    expect(filled.loadMore).toBe(OGE_DEFAULT_TREE_VIEW_MESSAGES.loadMore);
    expect(filled.editLabel).toBe('Item name');
  });

  it('ships ICU templates that render', () => {
    const m = fillTreeViewMessages(undefined);
    expect(ogeFormatMessage(m.loadMore, { count: 1 }, 'en')).toBe(
      'Show 1 more item',
    );
    expect(ogeFormatMessage(m.loadMore, { count: 3 }, 'en')).toBe(
      'Show 3 more items',
    );
    expect(
      ogeFormatMessage(m.movedAnnouncement, {
        item: 'A',
        target: 'B',
        position: 'inside',
      }),
    ).toBe('A moved into B.');
    expect(
      ogeFormatMessage(m.movedAnnouncement, {
        item: 'A',
        target: 'B',
        position: 'after',
      }),
    ).toBe('A moved after B.');
  });
});
