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
  | { readonly type: 'update'; readonly key: RowKey; readonly patch: Partial<T> }
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
  keyOf(item: T): RowKey;
  /**
   * Distinct values of a field (for Excel-style header filters), optionally
   * narrowed by the current filter. Header filter UI is hidden when absent.
   */
  distinct?(field: string, options?: { filter?: FilterExpr | null }): Promise<readonly unknown[]>;
  /** CRUD write-back used by the editing feature. Optional. */
  insert?(item: T): Promise<T>;
  update?(key: RowKey, patch: Partial<T>): Promise<T>;
  remove?(key: RowKey): Promise<void>;
  /** Push stream of external changes (live updates). Optional. */
  readonly changes?: SubscribableLike<readonly DataChange<T>[]>;
}
