import { filterTreeKeys } from './tree-filter';
import { buildTreeIndex, type TreeIndex } from './tree-index';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

//  1 Root A            5 Root B
//  ├─ 2 A.1            └─ 6 B.1
//  │   └─ 4 A.1.a
//  └─ 3 A.2
const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A' },
  { id: 2, parentId: 1, title: 'A.1' },
  { id: 3, parentId: 1, title: 'A.2' },
  { id: 4, parentId: 2, title: 'A.1.a' },
  { id: 5, parentId: null, title: 'Root B' },
  { id: 6, parentId: 5, title: 'B.1' },
];

function index(): TreeIndex<Task> {
  return buildTreeIndex(TASKS, {
    keyOf: (t) => t.id,
    parentIdOf: (t) => t.parentId,
  });
}

describe('filterTreeKeys', () => {
  it('withAncestors keeps matches plus their full ancestor chains', () => {
    const keys = filterTreeKeys(index(), (t) => t.id === 4, 'withAncestors');
    expect([...keys].sort()).toEqual([1, 2, 4]);
  });

  it('dedupes shared ancestors across multiple matches', () => {
    const keys = filterTreeKeys(
      index(),
      (t) => t.id === 4 || t.id === 3,
      'withAncestors',
    );
    expect([...keys].sort()).toEqual([1, 2, 3, 4]);
  });

  it('matchOnly is an alias of withAncestors', () => {
    const a = filterTreeKeys(
      index(),
      (t) => t.title.includes('.1'),
      'matchOnly',
    );
    const b = filterTreeKeys(
      index(),
      (t) => t.title.includes('.1'),
      'withAncestors',
    );
    expect(a).toEqual(b);
  });

  it('fullBranch also pulls in all descendants of matches', () => {
    const keys = filterTreeKeys(index(), (t) => t.id === 2, 'fullBranch');
    expect([...keys].sort()).toEqual([1, 2, 4]);
    const rootMatch = filterTreeKeys(index(), (t) => t.id === 1, 'fullBranch');
    expect([...rootMatch].sort()).toEqual([1, 2, 3, 4]);
  });

  it('fullBranch does not leak siblings of the matched branch', () => {
    const keys = filterTreeKeys(index(), (t) => t.id === 2, 'fullBranch');
    expect(keys.has(3)).toBe(false);
    expect(keys.has(5)).toBe(false);
  });

  it('returns an empty set when nothing matches', () => {
    expect(filterTreeKeys(index(), () => false, 'withAncestors').size).toBe(0);
    expect(filterTreeKeys(index(), () => false, 'fullBranch').size).toBe(0);
  });
});
