import type { RowKey } from '../rows/row-node';
import { ancestorsOf, type TreeIndex } from './tree-index';

/** Tri-state checkbox value of a tree row. */
export type CheckState = 'checked' | 'unchecked' | 'indeterminate';

/**
 * Derives the tri-state checkbox map for every indexed row, bottom-up in
 * O(n) (iterative post-order — safe for 100k-row trees).
 *
 * Recursive-selection semantics:
 * - A leaf is `'checked'` iff its key is in `selected`.
 * - A parent's state derives from its children: all children checked →
 *   `'checked'`; a mix of checked/indeterminate and unchecked (or any
 *   indeterminate child) → `'indeterminate'`.
 * - When *no* child is checked or indeterminate, the parent falls back to
 *   its own membership in `selected` — so a selected parent whose children
 *   were all deselected still reads `'checked'` only via that fallback.
 */
export function computeTreeCheckStates<T>(
  index: TreeIndex<T>,
  selected: ReadonlySet<RowKey>,
): Map<RowKey, CheckState> {
  const states = new Map<RowKey, CheckState>();
  // iterative post-order: push (key, entered); children resolve before parents
  const stack: { key: RowKey; row: T; entered: boolean }[] = [];
  for (let i = index.roots.length - 1; i >= 0; i--) {
    const row = index.roots[i];
    stack.push({ key: keyIn(index, row), row, entered: false });
  }

  while (stack.length) {
    const frame = stack[stack.length - 1];
    const children = index.childrenOf.get(frame.key);
    if (!frame.entered) {
      frame.entered = true;
      if (children) {
        for (let i = children.length - 1; i >= 0; i--) {
          const row = children[i];
          stack.push({ key: keyIn(index, row), row, entered: false });
        }
      }
      continue;
    }
    stack.pop();
    if (!children || children.length === 0) {
      states.set(frame.key, selected.has(frame.key) ? 'checked' : 'unchecked');
      continue;
    }
    let checked = 0;
    let indeterminate = 0;
    for (const child of children) {
      const state = states.get(keyIn(index, child));
      if (state === 'checked') checked += 1;
      else if (state === 'indeterminate') indeterminate += 1;
    }
    if (checked === children.length) {
      states.set(frame.key, 'checked');
    } else if (checked > 0 || indeterminate > 0) {
      states.set(frame.key, 'indeterminate');
    } else {
      states.set(frame.key, selected.has(frame.key) ? 'checked' : 'unchecked');
    }
  }

  return states;
}

/**
 * Returns a new selection set with `key` toggled.
 *
 * - `recursive: false`: plain toggle of `key` alone.
 * - `recursive: true`: turning ON adds `key` plus all its descendants;
 *   turning OFF removes them. Ancestors are then normalized walking up from
 *   `key`: an ancestor is in the set iff *all* of its children are.
 */
export function toggleTreeSelection<T>(
  index: TreeIndex<T>,
  selected: ReadonlySet<RowKey>,
  key: RowKey,
  recursive: boolean,
): Set<RowKey> {
  const next = new Set(selected);
  const turnOn = !next.has(key);

  if (!recursive) {
    if (turnOn) next.add(key);
    else next.delete(key);
    return next;
  }

  const stack: RowKey[] = [key];
  while (stack.length) {
    const current = stack.pop() as RowKey;
    if (turnOn) next.add(current);
    else next.delete(current);
    const children = index.childrenOf.get(current);
    if (children) for (const child of children) stack.push(keyIn(index, child));
  }

  for (const ancestor of ancestorsOf(index, key)) {
    const children = index.childrenOf.get(ancestor) ?? [];
    const allSelected =
      children.length > 0 &&
      children.every((child) => next.has(keyIn(index, child)));
    if (allSelected) next.add(ancestor);
    else next.delete(ancestor);
  }

  return next;
}

/**
 * Projects the raw selection set into a key list per reporting mode
 * (insertion order of the index's `byKey`):
 * - `'all'`: every selected key as-is.
 * - `'leavesOnly'`: selected keys with no children.
 * - `'excludeRecursive'`: selected keys whose parent is *not* selected —
 *   the top-most roots of fully selected subtrees.
 */
export function resolveSelectedKeys<T>(
  index: TreeIndex<T>,
  selected: ReadonlySet<RowKey>,
  mode: 'all' | 'leavesOnly' | 'excludeRecursive',
): RowKey[] {
  const out: RowKey[] = [];
  for (const key of index.byKey.keys()) {
    if (!selected.has(key)) continue;
    if (mode === 'leavesOnly') {
      const children = index.childrenOf.get(key);
      if (children && children.length > 0) continue;
    } else if (mode === 'excludeRecursive') {
      const parent = index.parentOf.get(key) ?? null;
      if (parent !== null && selected.has(parent)) continue;
    }
    out.push(key);
  }
  return out;
}

/**
 * Row → key without threading a `keyOf` callback through every function:
 * lazily inverts `byKey` (a bijection after index build), cached per index
 * instance (indexes are rebuilt on data change, so the cache never staleens).
 */
function keyIn<T>(index: TreeIndex<T>, row: T): RowKey {
  let reverse = reverseCache.get(index);
  if (!reverse) {
    reverse = new Map<unknown, RowKey>();
    for (const [key, r] of index.byKey) reverse.set(r, key);
    reverseCache.set(index, reverse);
  }
  return reverse.get(row) as RowKey;
}

const reverseCache = new WeakMap<object, Map<unknown, RowKey>>();
