import type { RowKey } from '../rows/row-node';

export interface TreeIndexConfig<T> {
  /** Stable key for a row. */
  keyOf: (row: T) => RowKey;
  /** Value of the row's parent-reference field (compared to `rootValue`). */
  parentIdOf: (row: T) => unknown;
  /**
   * Parent value marking root rows. When left `undefined` (or set to `null`),
   * both `null` and `undefined` parent values count as root.
   */
  rootValue?: unknown;
  /**
   * What to do with rows whose parent key does not exist in the data set:
   * `'discard'` (default) drops them, `'promoteToRoot'` renders them as
   * roots. Either way they are counted in `orphanCount`.
   */
  orphanPolicy?: 'discard' | 'promoteToRoot';
}

/**
 * Parent/child adjacency index built once per data change; all tree
 * operations (flattening, filtering, selection) run against it.
 */
export interface TreeIndex<T> {
  readonly roots: readonly T[];
  readonly childrenOf: ReadonlyMap<RowKey, readonly T[]>;
  /** Parent key per row key (`null` for roots). */
  readonly parentOf: ReadonlyMap<RowKey, RowKey | null>;
  readonly byKey: ReadonlyMap<RowKey, T>;
  /** Rows dropped or promoted because their parent key was missing, plus duplicate-key rows. */
  readonly orphanCount: number;
}

/**
 * Builds the adjacency index from flat self-referencing data in O(n): one
 * pass to register keys, one pass to bucket rows under their parents.
 *
 * Rules:
 * - A row whose parent value equals `rootValue` (or is `null`/`undefined`
 *   when `rootValue` is unset or `null`) is a root.
 * - A row whose parent key is not present in the data is an orphan and is
 *   discarded or promoted to root per `orphanPolicy`; both count in
 *   `orphanCount`.
 * - Sibling order preserves data order.
 * - Duplicate keys: the first occurrence wins; later rows with the same key
 *   are treated as orphans (discarded and counted) regardless of policy, so
 *   `byKey`, buckets and `parentOf` stay mutually consistent.
 */
export function buildTreeIndex<T>(
  data: readonly T[],
  config: TreeIndexConfig<T>
): TreeIndex<T> {
  const policy = config.orphanPolicy ?? 'discard';
  const byKey = new Map<RowKey, T>();
  const duplicates = new Set<number>();

  for (let i = 0; i < data.length; i++) {
    const key = config.keyOf(data[i]);
    if (byKey.has(key)) {
      duplicates.add(i);
    } else {
      byKey.set(key, data[i]);
    }
  }

  const roots: T[] = [];
  const childrenOf = new Map<RowKey, T[]>();
  const parentOf = new Map<RowKey, RowKey | null>();
  let orphanCount = 0;

  const isRootValue =
    config.rootValue === undefined || config.rootValue === null
      ? (v: unknown) => v === null || v === undefined
      : (v: unknown) => v === config.rootValue;

  for (let i = 0; i < data.length; i++) {
    if (duplicates.has(i)) {
      orphanCount += 1;
      continue;
    }
    const row = data[i];
    const key = config.keyOf(row);
    const parentValue = config.parentIdOf(row);
    if (isRootValue(parentValue)) {
      roots.push(row);
      parentOf.set(key, null);
      continue;
    }
    const parentKey = parentValue as RowKey;
    if (!byKey.has(parentKey)) {
      orphanCount += 1;
      if (policy === 'promoteToRoot') {
        roots.push(row);
        parentOf.set(key, null);
      }
      continue;
    }
    const bucket = childrenOf.get(parentKey);
    if (bucket) {
      bucket.push(row);
    } else {
      childrenOf.set(parentKey, [row]);
    }
    parentOf.set(key, parentKey);
  }

  return { roots, childrenOf, parentOf, byKey, orphanCount };
}

/**
 * Keys of all ancestors of `key`, nearest first, excluding `key` itself.
 * A visited set guards against parent cycles in malformed data.
 */
export function ancestorsOf(
  index: Pick<TreeIndex<unknown>, 'parentOf'>,
  key: RowKey
): RowKey[] {
  const out: RowKey[] = [];
  const visited = new Set<RowKey>([key]);
  let current = index.parentOf.get(key) ?? null;
  while (current !== null && !visited.has(current)) {
    out.push(current);
    visited.add(current);
    current = index.parentOf.get(current) ?? null;
  }
  return out;
}
