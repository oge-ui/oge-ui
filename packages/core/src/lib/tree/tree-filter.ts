import type { RowKey } from '../rows/row-node';
import { ancestorsOf, type TreeIndex } from './tree-index';

/**
 * How filtering expands the matched set for tree rendering (DevExtreme
 * `filterMode` naming):
 * - `'withAncestors'`: matched rows plus all their ancestors.
 * - `'fullBranch'`: matched rows, their ancestors, and *all* descendants of
 *   matched rows.
 * - `'matchOnly'`: alias of `'withAncestors'` for now — in a strict tree
 *   render a match under a non-matching parent would be unreachable, so
 *   ancestors are always structurally required. Kept as a distinct value for
 *   forward compatibility.
 */
export type TreeFilterMode = 'matchOnly' | 'withAncestors' | 'fullBranch';

/**
 * Runs `predicate` over every indexed row (insertion order) and returns the
 * set of keys that should stay visible, expanded per `mode`. Feed the result
 * to `flattenTreeData`'s `visibleKeys`. O(n) total: a shared visible set
 * stops each ancestor walk at the first already-included ancestor, and the
 * descendant walk (fullBranch) visits every subtree node at most once.
 */
export function filterTreeKeys<T>(
  index: TreeIndex<T>,
  predicate: (row: T) => boolean,
  mode: TreeFilterMode,
): Set<RowKey> {
  const visible = new Set<RowKey>();
  const matches: RowKey[] = [];

  for (const [key, row] of index.byKey) {
    if (predicate(row)) matches.push(key);
  }

  for (const key of matches) {
    if (visible.has(key)) continue;
    visible.add(key);
    // walk up until an already-visible ancestor (its chain is done)
    for (const ancestor of ancestorsOf(index, key)) {
      if (visible.has(ancestor)) break;
      visible.add(ancestor);
    }
  }

  if (mode === 'fullBranch') {
    // byKey is a bijection (duplicates were dropped at index build), so it
    // inverts cleanly into a row → key lookup for the descendant walk.
    const keyOf = new Map<T, RowKey>();
    for (const [key, row] of index.byKey) keyOf.set(row, key);

    const stack: RowKey[] = [...matches];
    while (stack.length) {
      const key = stack.pop() as RowKey;
      const children = index.childrenOf.get(key);
      if (!children) continue;
      for (const child of children) {
        const childKey = keyOf.get(child);
        if (childKey !== undefined && !visible.has(childKey)) {
          visible.add(childKey);
          stack.push(childKey);
        }
      }
    }
  }

  return visible;
}
