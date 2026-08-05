import type { DataRowNode, RowKey, RowNode } from '../rows/row-node';
import { flattenTreeData } from './flatten-tree';
import { buildTreeIndex, type TreeIndex } from './tree-index';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A' },
  { id: 2, parentId: 1, title: 'A.1' },
  { id: 3, parentId: 1, title: 'A.2' },
  { id: 4, parentId: 2, title: 'A.1.a' },
  { id: 5, parentId: null, title: 'Root B' },
];

const keyOf = (t: Task) => t.id;

function indexOf(rows: readonly Task[] = TASKS): TreeIndex<Task> {
  return buildTreeIndex(rows, { keyOf, parentIdOf: (t) => t.parentId });
}

/** Compact shape string: `key@level(parent)[+|-]` for data rows. */
function sketch(nodes: RowNode<Task>[]): string[] {
  return nodes.map((n) => {
    if (n.kind === 'data') {
      const mark = n.hasChildren ? (n.expanded ? '+' : '-') : '.';
      return `${String(n.key)}@${n.level}(${String(n.parentKey)})${mark}`;
    }
    return `${n.kind}:${String(n.key)}`;
  });
}

function dataRows(nodes: RowNode<Task>[]): DataRowNode<Task>[] {
  return nodes.filter((n): n is DataRowNode<Task> => n.kind === 'data');
}

describe('flattenTreeData', () => {
  it('expands everything by default (collapsed polarity) with level/parentKey/sourceIndex', () => {
    const flat = flattenTreeData({ index: indexOf(), keyOf });
    expect(sketch(flat)).toEqual([
      '1@0(null)+',
      '2@1(1)+',
      '4@2(2).',
      '3@1(1).',
      '5@0(null).',
    ]);
    expect(dataRows(flat).map((n) => n.sourceIndex)).toEqual([0, 1, 2, 3, 4]);
  });

  it('skips subtrees of collapsed keys', () => {
    const flat = flattenTreeData({
      index: indexOf(),
      keyOf,
      collapsedRowKeys: new Set<RowKey>([2]),
    });
    expect(sketch(flat)).toEqual([
      '1@0(null)+',
      '2@1(1)-',
      '3@1(1).',
      '5@0(null).',
    ]);
  });

  it('honors expandedRowKeys polarity (default collapsed) and lets it win over collapsedRowKeys', () => {
    const flat = flattenTreeData({
      index: indexOf(),
      keyOf,
      expandedRowKeys: new Set<RowKey>([1]),
      collapsedRowKeys: new Set<RowKey>([1]),
    });
    expect(sketch(flat)).toEqual([
      '1@0(null)+',
      '2@1(1)-',
      '3@1(1).',
      '5@0(null).',
    ]);
  });

  it('computes 1-based posInSet/setSize per sibling bucket', () => {
    const flat = dataRows(flattenTreeData({ index: indexOf(), keyOf }));
    const aria = new Map(flat.map((n) => [n.key, [n.posInSet, n.setSize]]));
    expect(aria.get(1)).toEqual([1, 2]);
    expect(aria.get(5)).toEqual([2, 2]);
    expect(aria.get(2)).toEqual([1, 2]);
    expect(aria.get(3)).toEqual([2, 2]);
    expect(aria.get(4)).toEqual([1, 1]);
  });

  it('recomputes posInSet/setSize against the visible bucket after filtering', () => {
    const flat = dataRows(
      flattenTreeData({
        index: indexOf(),
        keyOf,
        visibleKeys: new Set<RowKey>([1, 3]),
      }),
    );
    expect(flat.map((n) => n.key)).toEqual([1, 3]);
    const three = flat.find((n) => n.key === 3);
    expect([three?.posInSet, three?.setSize]).toEqual([1, 1]);
    const one = flat.find((n) => n.key === 1);
    expect([one?.posInSet, one?.setSize]).toEqual([1, 1]);
  });

  it('prunes whole subtrees not covered by visibleKeys', () => {
    // 2 visible but its child 4 not: subtree below 4 disappears; 5 filtered out
    const flat = flattenTreeData({
      index: indexOf(),
      keyOf,
      visibleKeys: new Set<RowKey>([1, 2]),
    });
    expect(dataRows(flat).map((n) => n.key)).toEqual([1, 2]);
  });

  it('infers hasChildren from buckets and lets an explicit hint override it', () => {
    const flat = dataRows(
      flattenTreeData({
        index: indexOf(),
        keyOf,
        collapsedRowKeys: new Set<RowKey>([5]),
        hasChildren: (t) => (t.id === 5 ? true : undefined),
      }),
    );
    const five = flat.find((n) => n.key === 5);
    expect(five?.hasChildren).toBe(true);
    expect(five?.expanded).toBe(false);
    const four = flat.find((n) => n.key === 4);
    expect(four?.hasChildren).toBe(false);
    expect(four?.expanded).toBe(false);
  });

  it('emits a filler row below an expanded lazy row whose children are pending', () => {
    const flat = flattenTreeData({
      index: indexOf(),
      keyOf,
      hasChildren: (t) => (t.id === 5 ? true : undefined),
    });
    expect(sketch(flat)).toEqual([
      '1@0(null)+',
      '2@1(1)+',
      '4@2(2).',
      '3@1(1).',
      '5@0(null)+',
      'filler:5:loading',
    ]);
    const filler = flat[flat.length - 1];
    expect(filler).toEqual({ kind: 'filler', key: '5:loading', index: -1 });
  });

  it('walks deferredChildren once they arrive instead of the filler', () => {
    const flat = flattenTreeData({
      index: indexOf(),
      keyOf,
      hasChildren: (t) => (t.id === 5 ? true : undefined),
      deferredChildren: new Map<RowKey, readonly Task[]>([
        [5, [{ id: 6, parentId: 5, title: 'B.1' }]],
      ]),
    });
    expect(sketch(flat)).toContain('6@1(5).');
    expect(flat.some((n) => n.kind === 'filler')).toBe(false);
  });

  it('sorts each sibling bucket via compare without mutating the index', () => {
    const index = indexOf();
    const flat = dataRows(
      flattenTreeData({ index, keyOf, compare: (a, b) => b.id - a.id }),
    );
    expect(flat.map((n) => n.key)).toEqual([5, 1, 3, 2, 4]);
    // source buckets untouched
    expect(index.roots.map((t) => t.id)).toEqual([1, 5]);
    expect(index.childrenOf.get(1)?.map((t) => t.id)).toEqual([2, 3]);
  });

  it('keeps data order in buckets when no compare is given', () => {
    const flat = dataRows(flattenTreeData({ index: indexOf(), keyOf }));
    expect(flat.filter((n) => n.parentKey === 1).map((n) => n.key)).toEqual([
      2, 3,
    ]);
  });

  it('emits detail rows after rows in expandedDetailKeys', () => {
    const flat = flattenTreeData({
      index: indexOf(),
      keyOf,
      expandedDetailKeys: new Set<RowKey>([2]),
    });
    const i = flat.findIndex((n) => n.kind === 'data' && n.key === 2);
    expect(flat[i + 1]).toEqual({
      kind: 'detail',
      key: 'd:2',
      parentKey: 2,
      data: TASKS[1],
    });
  });

  it('breaks cycles introduced by deferred children and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const flat = flattenTreeData({
        index: indexOf(),
        keyOf,
        hasChildren: (t) => (t.id === 4 ? true : undefined),
        // key 4 lazily "loads" its own ancestor chain — malformed data
        deferredChildren: new Map<RowKey, readonly Task[]>([[4, [TASKS[1]]]]),
      });
      expect(dataRows(flat).map((n) => n.key)).toEqual([1, 2, 4, 3, 5]);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('returns an empty list for empty data', () => {
    expect(flattenTreeData({ index: indexOf([]), keyOf })).toEqual([]);
  });
});
