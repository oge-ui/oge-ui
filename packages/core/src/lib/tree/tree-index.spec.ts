import { ancestorsOf, buildTreeIndex, type TreeIndexConfig } from './tree-index';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

const CONFIG: TreeIndexConfig<Task> = {
  keyOf: (t) => t.id,
  parentIdOf: (t) => t.parentId,
};

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A' },
  { id: 2, parentId: 1, title: 'A.1' },
  { id: 3, parentId: 1, title: 'A.2' },
  { id: 4, parentId: 2, title: 'A.1.a' },
  { id: 5, parentId: null, title: 'Root B' },
];

describe('buildTreeIndex', () => {
  it('buckets children under parents and preserves data order', () => {
    const index = buildTreeIndex(TASKS, CONFIG);
    expect(index.roots.map((t) => t.id)).toEqual([1, 5]);
    expect(index.childrenOf.get(1)?.map((t) => t.id)).toEqual([2, 3]);
    expect(index.childrenOf.get(2)?.map((t) => t.id)).toEqual([4]);
    expect(index.parentOf.get(1)).toBeNull();
    expect(index.parentOf.get(4)).toBe(2);
    expect(index.byKey.size).toBe(5);
    expect(index.orphanCount).toBe(0);
  });

  it('treats both null and undefined parents as roots when rootValue is unset', () => {
    const rows = [
      { id: 1, parentId: undefined as number | null | undefined, title: 'u' },
      { id: 2, parentId: null as number | null | undefined, title: 'n' },
    ];
    const index = buildTreeIndex(rows, {
      keyOf: (r) => r.id,
      parentIdOf: (r) => r.parentId,
    });
    expect(index.roots.map((r) => r.id)).toEqual([1, 2]);
  });

  it('uses a custom rootValue when provided', () => {
    const rows = [
      { id: 'a', parent: 0 },
      { id: 'b', parent: 'a' },
    ];
    const index = buildTreeIndex(rows, {
      keyOf: (r) => r.id,
      parentIdOf: (r) => r.parent,
      rootValue: 0,
    });
    expect(index.roots.map((r) => r.id)).toEqual(['a']);
    expect(index.childrenOf.get('a')?.map((r) => r.id)).toEqual(['b']);
  });

  it('discards orphans by default and counts them', () => {
    const rows: Task[] = [...TASKS, { id: 6, parentId: 999, title: 'lost' }];
    const index = buildTreeIndex(rows, CONFIG);
    expect(index.orphanCount).toBe(1);
    expect(index.roots.map((t) => t.id)).toEqual([1, 5]);
    expect(index.parentOf.has(6)).toBe(false);
  });

  it('promotes orphans to roots under promoteToRoot, still counting them', () => {
    const rows: Task[] = [...TASKS, { id: 6, parentId: 999, title: 'lost' }];
    const index = buildTreeIndex(rows, { ...CONFIG, orphanPolicy: 'promoteToRoot' });
    expect(index.orphanCount).toBe(1);
    expect(index.roots.map((t) => t.id)).toEqual([1, 5, 6]);
    expect(index.parentOf.get(6)).toBeNull();
  });

  it('keeps the first occurrence of a duplicate key and counts the rest as orphans', () => {
    const rows: Task[] = [...TASKS, { id: 2, parentId: 5, title: 'dup' }];
    const index = buildTreeIndex(rows, CONFIG);
    expect(index.orphanCount).toBe(1);
    expect(index.byKey.get(2)?.title).toBe('A.1');
    expect(index.childrenOf.get(1)?.map((t) => t.id)).toEqual([2, 3]);
    expect(index.childrenOf.has(5)).toBe(false);
  });

  it('handles empty data', () => {
    const index = buildTreeIndex([], CONFIG);
    expect(index.roots).toEqual([]);
    expect(index.byKey.size).toBe(0);
    expect(index.orphanCount).toBe(0);
  });
});

describe('ancestorsOf', () => {
  it('returns ancestors nearest-first, excluding the key itself', () => {
    const index = buildTreeIndex(TASKS, CONFIG);
    expect(ancestorsOf(index, 4)).toEqual([2, 1]);
    expect(ancestorsOf(index, 1)).toEqual([]);
    expect(ancestorsOf(index, 999)).toEqual([]);
  });

  it('breaks out of parent cycles', () => {
    const parentOf = new Map<number, number | null>([
      [1, 2],
      [2, 3],
      [3, 1],
    ]);
    expect(ancestorsOf({ parentOf }, 1)).toEqual([2, 3]);
  });
});
