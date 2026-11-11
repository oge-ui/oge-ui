import type { RowKey } from '../rows/row-node';
import type { FilterExpr, LoadOptions } from './load-options';

/** One level of server-grouped data (nested server groups). */
export interface GroupedItem<T = unknown> {
  readonly key: unknown;
  /** `null` means children are collapsed/deferred and must be loaded on demand. */
  readonly items: readonly T[] | readonly GroupedItem<T>[] | null;
  readonly count?: number;
  readonly summary?: readonly unknown[];
}

export interface LoadResult<T = unknown> {
  readonly data: readonly T[] | readonly GroupedItem<T>[];
  /** Row count after filtering, before paging. */
  readonly totalCount?: number;
  readonly groupCount?: number;
  /** Total-summary values, positional relative to `LoadOptions.totalSummary`. */
  readonly summary?: readonly unknown[];
}

/**
 * What `DataSource.distinct()` is asked for. The grids send the filter of
 * every other column plus the global search text — never the column's own
 * filter — so the list cascades like Excel's. A server should apply them with
 * the same meaning as in `load()` (the filter contract,
 * `/guides/filter-contract`).
 */
export interface DistinctOptions {
  /** Rows to collect values from; `null` / absent = every row. */
  readonly filter?: FilterExpr | null;
  /** The grid's global search text, applied as in `LoadOptions.searchText`. */
  readonly searchText?: string;
  /**
   * Text typed in the popup's search box: only values whose text contains it
   * (case- and accent-insensitive). Sent to server sources only, debounced.
   */
  readonly search?: string;
  /** Maximum values wanted (the column's `valueLimit`). */
  readonly take?: number;
  /** Aborted when a newer request supersedes this one. */
  readonly signal?: AbortSignal;
}

/** Which operations a DataSource performs itself (vs. the grid doing them client-side). */
export interface DataSourceCapabilities {
  readonly sort: boolean;
  readonly filter: boolean;
  readonly group: boolean;
  readonly paging: boolean;
  readonly summary: boolean;
}

/** External change pushed into the grid without a full reload (live updates). */
export type DataChange<T = unknown> =
  | { readonly type: 'insert'; readonly item: T }
  | {
      readonly type: 'update';
      readonly key: RowKey;
      readonly patch: Partial<T>;
    }
  | { readonly type: 'remove'; readonly key: RowKey };

/** Minimal observable contract — structurally compatible with RxJS, without depending on it. */
export interface SubscribableLike<T> {
  subscribe(observer: (value: T) => void): { unsubscribe(): void };
}

/**
 * The universal data contract of the grid. The grid only ever talks to this
 * interface; whether operations run in-memory or on a server is an
 * implementation detail declared through `capabilities`.
 */
export interface DataSource<T = unknown> {
  readonly capabilities: DataSourceCapabilities;
  load(options: LoadOptions): Promise<LoadResult<T>>;
  /**
   * The same load answered synchronously, for sources that hold their rows
   * in memory. Optional: the React grid and tree list use it for the first
   * render only, so a server render (`renderToString`, which cannot await)
   * already contains the first page. Remote sources leave it out and load
   * after mount.
   */
  loadSync?(options: LoadOptions): LoadResult<T>;
  keyOf(item: T): RowKey;
  /**
   * Distinct values of a field, sorted (for Excel-style header filters),
   * narrowed by {@link DistinctOptions}. The header filter list is hidden
   * when absent — the current page is never passed off as "all values".
   */
  distinct?(
    field: string,
    options?: DistinctOptions,
  ): Promise<readonly unknown[]>;
  /** CRUD write-back used by the editing feature. Optional. */
  insert?(item: T): Promise<T>;
  update?(key: RowKey, patch: Partial<T>): Promise<T>;
  remove?(key: RowKey): Promise<void>;
  /** Push stream of external changes (live updates). Optional. */
  readonly changes?: SubscribableLike<readonly DataChange<T>[]>;
}
