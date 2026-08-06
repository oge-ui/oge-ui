import { buildTreeIndex, type TreeIndex } from './tree-index';
import { flattenTreeData } from './flatten-tree';
import { filterTreeKeys } from './tree-filter';

interface Node {
  id: number;
  parentId: number | null;
  title: string;
}

/** 100 roots × 999 children = 100k rows. */
function bigTree(): Node[] {
  const rows: Node[] = [];
  let id = 1;
  for (let root = 0; root < 100; root++) {
    const rootId = id;
    id += 1;
    rows.push({ id: rootId, parentId: null, title: `Root ${root}` });
    for (let child = 0; child < 999; child++) {
      rows.push({ id, parentId: rootId, title: `Node ${rootId}-${child}` });
      id += 1;
    }
  }
  return rows;
}

const keyOf = (row: Node): number => row.id;
const parentIdOf = (row: Node): unknown => row.parentId;

function time(label: string, run: () => void): number {
  const start = performance.now();
  run();
  const elapsed = performance.now() - start;
  // surfaced on failure investigations; budgets stay generous for CI runners
  if (elapsed > 100)
    console.info(`[tree-perf] ${label}: ${elapsed.toFixed(1)}ms`);
  return elapsed;
}

/**
 * Performance budgets locking the tree pipeline's complexity class. The
 * numbers are deliberately loose (CI runners are slow); a regression from
 * O(visible)/O(n) to something worse blows straight past them.
 */
describe('tree pipeline performance budgets (100k rows)', () => {
  const rows = bigTree();
  let index!: TreeIndex<Node>;

  it('buildTreeIndex stays under 400ms', () => {
    const elapsed = time('buildTreeIndex', () => {
      index = buildTreeIndex(rows, { keyOf, parentIdOf });
    });
    expect(index.byKey.size).toBe(100_000);
    expect(elapsed).toBeLessThan(400);
  });

  it('fully-expanded flatten stays under 400ms', () => {
    let count = 0;
    const elapsed = time('flatten expanded', () => {
      count = flattenTreeData({
        index,
        keyOf,
        collapsedRowKeys: new Set(),
      }).length;
    });
    expect(count).toBe(100_000);
    expect(elapsed).toBeLessThan(400);
  });

  it('collapsed flatten is O(visible), not O(n): under 50ms', () => {
    let count = 0;
    const elapsed = time('flatten collapsed', () => {
      count = flattenTreeData({
        index,
        keyOf,
        expandedRowKeys: new Set(),
      }).length;
    });
    expect(count).toBe(100); // only the roots
    expect(elapsed).toBeLessThan(50);
  });

  it('a single expansion re-flattens in O(visible): under 50ms', () => {
    let count = 0;
    const elapsed = time('flatten one branch', () => {
      count = flattenTreeData({
        index,
        keyOf,
        expandedRowKeys: new Set([1]),
      }).length;
    });
    expect(count).toBe(100 + 999);
    expect(elapsed).toBeLessThan(50);
  });

  it('filterTreeKeys sweeps 100k rows under 400ms', () => {
    let size = 0;
    const elapsed = time('filterTreeKeys', () => {
      size = filterTreeKeys(
        index,
        (row) => row.title.includes('-500'),
        'withAncestors',
      ).size;
    });
    expect(size).toBeGreaterThan(100);
    expect(elapsed).toBeLessThan(400);
  });
});
