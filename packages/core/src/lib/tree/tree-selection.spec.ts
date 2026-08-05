import type { RowKey } from '../rows/row-node';
import {
  computeTreeCheckStates,
  resolveSelectedKeys,
  toggleTreeSelection,
} from './tree-selection';
import { buildTreeIndex, type TreeIndex } from './tree-index';

interface Task {
  id: number;
  parentId: number | null;
}

//  1 ── 2 ── 4
//  │    └── 5
//  └─ 3
//  6 (second root, leaf)
const TASKS: Task[] = [
  { id: 1, parentId: null },
  { id: 2, parentId: 1 },
  { id: 3, parentId: 1 },
  { id: 4, parentId: 2 },
  { id: 5, parentId: 2 },
  { id: 6, parentId: null },
];

function index(): TreeIndex<Task> {
  return buildTreeIndex(TASKS, { keyOf: (t) => t.id, parentIdOf: (t) => t.parentId });
}

const keys = (s: ReadonlySet<RowKey> | RowKey[]) => [...s].sort();

describe('computeTreeCheckStates', () => {
  it('marks selected leaves checked and everything else unchecked', () => {
    const states = computeTreeCheckStates(index(), new Set<RowKey>([3]));
    expect(states.get(3)).toBe('checked');
    expect(states.get(4)).toBe('unchecked');
    expect(states.get(6)).toBe('unchecked');
  });

  it('propagates indeterminate up the whole ancestor chain', () => {
    const states = computeTreeCheckStates(index(), new Set<RowKey>([4]));
    expect(states.get(4)).toBe('checked');
    expect(states.get(2)).toBe('indeterminate');
    expect(states.get(1)).toBe('indeterminate');
    expect(states.get(6)).toBe('unchecked');
  });

  it('checks a parent when all of its children are checked', () => {
    const states = computeTreeCheckStates(index(), new Set<RowKey>([4, 5]));
    expect(states.get(2)).toBe('checked');
    expect(states.get(1)).toBe('indeterminate'); // 3 still unchecked
  });

  it('checks the full chain when every descendant is selected', () => {
    const states = computeTreeCheckStates(index(), new Set<RowKey>([2, 3, 4, 5]));
    expect(states.get(1)).toBe('checked');
  });

  it('falls back to own membership for a selected parent with no checked children', () => {
    const states = computeTreeCheckStates(index(), new Set<RowKey>([2]));
    expect(states.get(2)).toBe('checked'); // own membership, children all unchecked
    expect(states.get(1)).toBe('indeterminate');
  });

  it('covers every indexed key', () => {
    const states = computeTreeCheckStates(index(), new Set<RowKey>());
    expect(states.size).toBe(TASKS.length);
    expect([...states.values()].every((s) => s === 'unchecked')).toBe(true);
  });
});

describe('toggleTreeSelection', () => {
  it('toggles a single key when recursive is false', () => {
    const on = toggleTreeSelection(index(), new Set<RowKey>(), 2, false);
    expect(keys(on)).toEqual([2]);
    const off = toggleTreeSelection(index(), on, 2, false);
    expect(off.size).toBe(0);
  });

  it('recursive on adds the key, all descendants, and normalized ancestors', () => {
    const next = toggleTreeSelection(index(), new Set<RowKey>([3]), 2, true);
    // 2 + descendants 4,5; ancestor 1 normalizes to selected (children 2 and 3 both selected)
    expect(keys(next)).toEqual([1, 2, 3, 4, 5]);
  });

  it('recursive on leaves ancestors out while a sibling is unselected', () => {
    const next = toggleTreeSelection(index(), new Set<RowKey>(), 2, true);
    expect(keys(next)).toEqual([2, 4, 5]);
  });

  it('recursive off removes the subtree and deselects ancestors', () => {
    const all = new Set<RowKey>([1, 2, 3, 4, 5]);
    const next = toggleTreeSelection(index(), all, 2, true);
    expect(keys(next)).toEqual([3]);
  });

  it('does not mutate the input set', () => {
    const input = new Set<RowKey>([4]);
    toggleTreeSelection(index(), input, 2, true);
    expect(keys(input)).toEqual([4]);
  });
});

describe('resolveSelectedKeys', () => {
  const selected = new Set<RowKey>([1, 2, 4, 5, 6]);

  it("'all' returns every selected key in index insertion order", () => {
    expect(resolveSelectedKeys(index(), selected, 'all')).toEqual([1, 2, 4, 5, 6]);
  });

  it("'leavesOnly' keeps only selected keys without children", () => {
    expect(resolveSelectedKeys(index(), selected, 'leavesOnly')).toEqual([4, 5, 6]);
  });

  it("'excludeRecursive' keeps top-most selected roots of selected subtrees", () => {
    expect(resolveSelectedKeys(index(), selected, 'excludeRecursive')).toEqual([1, 6]);
  });

  it("'excludeRecursive' keeps a child whose parent is unselected", () => {
    const partial = new Set<RowKey>([4, 5]);
    expect(resolveSelectedKeys(index(), partial, 'excludeRecursive')).toEqual([4, 5]);
  });
});
