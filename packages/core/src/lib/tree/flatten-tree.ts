import type { RowKey, RowNode } from '../rows/row-node';
import type { TreeIndex } from './tree-index';

export interface FlattenTreeConfig<T> {
  /** Adjacency index built by `buildTreeIndex`. */
  index: TreeIndex<T>;
  /** Stable key for a row (must agree with the index's `keyOf`). */
  keyOf: (row: T) => RowKey;
  /**
   * Keys of collapsed rows (rows default to *expanded* — `autoExpandAll:
   * true` polarity).
   */
  collapsedRowKeys?: ReadonlySet<RowKey>;
  /**
   * Inverts the default: when provided, rows start *collapsed* and only
   * these keys are expanded (`autoExpandAll: false` polarity). Exactly one
   * polarity is honored; this one wins when both are passed (matching
   * `flattenGroupedData`).
   */
  expandedRowKeys?: ReadonlySet<RowKey>;
  /**
   * Lazy expandability hint: a `boolean` return overrides bucket inference
   * (rows whose children have not been loaded yet can still show an expand
   * toggle); `undefined` falls back to bucket/deferred presence.
   */
  hasChildren?: (row: T) => boolean | undefined;
  /**
   * Lazily fetched children for rows not bucketed in the index. An expanded
   * row claiming children with no bucket and no entry here renders a
   * `filler` row (loading placeholder) below itself.
   */
  deferredChildren?: ReadonlyMap<RowKey, readonly T[]>;
  /** Keys of data rows whose master-detail row is expanded. */
  expandedDetailKeys?: ReadonlySet<RowKey>;
  /**
   * Sibling-scoped sort applied per visited bucket (buckets are copied, not
   * mutated). Memoization across calls is the caller's concern.
   */
  compare?: (a: T, b: T) => number;
  /**
   * Filter result (see `filterTreeKeys`): a row not in the set is skipped
   * along with its whole subtree. Ancestors of matches are expected to be in
   * the set. `null`/`undefined` means all rows are visible.
   */
  visibleKeys?: ReadonlySet<RowKey> | null;
}

/**
 * Turns a tree index plus expansion state into the flat, typed row list that
 * feeds the virtualizer. Walks depth-first and only descends into expanded
 * rows, so cost is O(visible), not O(n).
 *
 * Emitted `DataRowNode`s carry the tree-only fields: `parentKey`,
 * `hasChildren`, `expanded` (effective expansion AND expandability),
 * `posInSet`/`setSize` (1-based, within the *visible* sibling bucket after
 * filtering), and `sourceIndex` as a running counter over emitted data rows.
 *
 * A cycle along the current path (malformed deferred data) is skipped and
 * reported once per call via `console.warn`.
 */
export function flattenTreeData<T>(config: FlattenTreeConfig<T>): RowNode<T>[] {
  const out: RowNode<T>[] = [];
  const collapsed = config.collapsedRowKeys ?? EMPTY_SET;
  const expandedDetails = config.expandedDetailKeys ?? EMPTY_SET;
  const visible = config.visibleKeys ?? null;
  const sortedCache = config.compare
    ? new Map<readonly T[], readonly T[]>()
    : null;
  const path = new Set<RowKey>();
  let sourceIndex = 0;
  let warnedCycle = false;

  const isExpanded = (key: RowKey): boolean =>
    config.expandedRowKeys
      ? config.expandedRowKeys.has(key)
      : !collapsed.has(key);

  const sortBucket = (bucket: readonly T[]): readonly T[] => {
    if (!config.compare || bucket.length < 2) return bucket;
    const cached = sortedCache?.get(bucket);
    if (cached) return cached;
    const copy = [...bucket].sort(config.compare);
    sortedCache?.set(bucket, copy);
    return copy;
  };

  const childrenFor = (key: RowKey): readonly T[] | null =>
    config.index.childrenOf.get(key) ??
    config.deferredChildren?.get(key) ??
    null;

  const visitBucket = (
    bucket: readonly T[],
    level: number,
    parentKey: RowKey | null,
  ): void => {
    const siblings = visible
      ? sortBucket(bucket).filter((row) => visible.has(config.keyOf(row)))
      : sortBucket(bucket);
    const setSize = siblings.length;
    for (let pos = 0; pos < siblings.length; pos++) {
      const row = siblings[pos];
      const key = config.keyOf(row);
      if (path.has(key)) {
        if (!warnedCycle) {
          warnedCycle = true;
          console.warn(
            `[oge] flattenTreeData: cycle detected at key "${String(key)}" — subtree skipped`,
          );
        }
        continue;
      }
      const bucketChildren = childrenFor(key);
      const hint = config.hasChildren?.(row);
      const hasChildren =
        typeof hint === 'boolean'
          ? hint
          : bucketChildren !== null && bucketChildren.length > 0;
      const expanded = hasChildren && isExpanded(key);
      out.push({
        kind: 'data',
        key,
        data: row,
        sourceIndex,
        level,
        parentKey,
        hasChildren,
        expanded,
        posInSet: pos + 1,
        setSize,
      });
      sourceIndex += 1;
      if (expandedDetails.has(key)) {
        out.push({
          kind: 'detail',
          key: `d:${key}`,
          parentKey: key,
          data: row,
        });
      }
      if (!expanded) continue;
      if (bucketChildren === null) {
        // children claimed via hasChildren but not yet fetched — placeholder
        out.push({ kind: 'filler', key: `${key}:loading`, index: -1 });
        continue;
      }
      path.add(key);
      visitBucket(bucketChildren, level + 1, key);
      path.delete(key);
    }
  };

  visitBucket(config.index.roots, 0, null);
  return out;
}

const EMPTY_SET: ReadonlySet<RowKey> = new Set();
