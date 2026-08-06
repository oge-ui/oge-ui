import type { RowKey } from '../rows/row-node';

export interface NestedTreeConfig<T> {
  /** Stable key for a row. */
  keyOf: (row: T) => RowKey;
  /** Returns the nested children array of a row (e.g. its `items` field). */
  itemsOf: (row: T) => readonly T[] | undefined | null;
}

export interface NestedTreeResult<T> {
  /** Depth-first flattened rows (parents before children). */
  readonly rows: readonly T[];
  /** Parent key per row key (`null` for roots) — feed to `buildTreeIndex` via `parentIdOf`. */
  readonly parentOf: ReadonlyMap<RowKey, RowKey | null>;
}

/**
 * Converts a nested payload (rows carrying their children inline) into the
 * flat shape the tree pipeline consumes. O(n); a visited set breaks cycles
 * in malformed payloads. Children keep their array order, so sibling order
 * is preserved end to end.
 */
export function flattenNestedTree<T>(
  roots: readonly T[],
  config: NestedTreeConfig<T>,
): NestedTreeResult<T> {
  const rows: T[] = [];
  const parentOf = new Map<RowKey, RowKey | null>();
  const visited = new Set<RowKey>();
  const visit = (items: readonly T[], parentKey: RowKey | null): void => {
    for (const row of items) {
      const key = config.keyOf(row);
      if (visited.has(key)) continue;
      visited.add(key);
      rows.push(row);
      parentOf.set(key, parentKey);
      const children = config.itemsOf(row);
      if (children?.length) visit(children, key);
    }
  };
  visit(roots, null);
  return { rows, parentOf };
}
