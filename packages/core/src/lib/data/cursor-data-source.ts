import type { RowKey } from '../rows/row-node';
import { resolveKeySelector } from '../util/value-accessor';
import type {
  DataChange,
  DataSource,
  DataSourceCapabilities,
  LoadResult,
  SubscribableLike,
} from './data-source';
import type { FilterExpr, LoadOptions } from './load-options';

/** One page of a cursor-paginated endpoint. */
export interface CursorPage<T, C> {
  readonly items: readonly T[];
  /** Cursor of the page after this one; `null` (or `undefined`) at the end. */
  readonly nextCursor?: C | null;
  /** Row count of the whole result, when the endpoint knows it. Optional. */
  readonly totalCount?: number;
}

/**
 * What a page fetch receives: the grid's query (sort, filter, search, …)
 * without `skip`/`take` — cursor endpoints have no offset — plus the cursor.
 */
export type CursorPageRequest<C> = Omit<
  LoadOptions,
  'skip' | 'take' | 'signal'
> & {
  /** `null` asks for the first page. */
  readonly cursor: C | null;
  readonly pageSize: number;
};

export interface CursorDataSourceOptions<T, C> {
  key: keyof T | ((row: T) => RowKey);
  /** Fetches the page after `request.cursor` (`null` = the first page). */
  fetchPage: (request: CursorPageRequest<C>) => Promise<CursorPage<T, C>>;
  /** Rows asked for per fetch. Default 50. */
  pageSize?: number;
  /**
   * Which operations the endpoint performs. Defaults to sort + filter on the
   * server; grouping and summaries are not offered (they need the whole set).
   */
  capabilities?: Partial<DataSourceCapabilities>;
  distinct?: (
    field: string,
    options?: { filter?: FilterExpr | null },
  ) => Promise<readonly unknown[]>;
  insert?: (item: T) => Promise<T>;
  update?: (key: RowKey, patch: Partial<T>) => Promise<T>;
  remove?: (key: RowKey) => Promise<void>;
  changes?: SubscribableLike<readonly DataChange<T>[]>;
}

/**
 * Adapts a **cursor-paginated** endpoint (`?after=<cursor>&limit=50` →
 * `{ items, nextCursor }`) to the grid's offset contract.
 *
 * The grid asks for `skip`/`take` windows; this source walks the cursor chain
 * forward until the window is covered and serves it from the rows it has
 * accumulated, so each server page is fetched once per query. Concurrent
 * windows share one sequential walk. Any change of sort, filter or search
 * starts a new chain from the first page.
 *
 * Pair it with `scrolling: { mode: 'infinite' }` (rows load as the user scrolls,
 * the total stays open-ended until the last page) or with paging. Without
 * either, the grid asks for everything and every page is fetched.
 *
 * ```ts
 * readonly source = new CursorDataSource<Account, string>({
 *   key: 'id',
 *   pageSize: 50,
 *   fetchPage: ({ cursor, pageSize, sort, filter }) =>
 *     api.accounts({ after: cursor, limit: pageSize, sort, filter }),
 * });
 * ```
 */
export class CursorDataSource<T, C = string> implements DataSource<T> {
  readonly capabilities: DataSourceCapabilities;
  readonly distinct?: DataSource<T>['distinct'];
  readonly insert?: DataSource<T>['insert'];
  readonly update?: DataSource<T>['update'];
  readonly remove?: DataSource<T>['remove'];
  readonly changes?: SubscribableLike<readonly DataChange<T>[]>;

  private readonly keySelector: (row: T) => RowKey;
  private readonly fetchPage: CursorDataSourceOptions<T, C>['fetchPage'];
  private readonly pageSize: number;

  private queryKey: string | null = null;
  private generation = 0;
  private rows: T[] = [];
  private cursor: C | null = null;
  private done = false;
  private knownTotal: number | undefined;
  private walk: Promise<void> = Promise.resolve();

  constructor(options: CursorDataSourceOptions<T, C>) {
    this.keySelector = resolveKeySelector(options.key);
    this.fetchPage = options.fetchPage;
    this.pageSize = Math.max(1, Math.floor(options.pageSize ?? 50));
    this.capabilities = {
      sort: true,
      filter: true,
      group: false,
      paging: true,
      summary: false,
      ...options.capabilities,
    };
    if (options.distinct) this.distinct = options.distinct;
    if (options.insert) this.insert = options.insert;
    if (options.update) this.update = options.update;
    if (options.remove) this.remove = options.remove;
    if (options.changes) this.changes = options.changes;
  }

  /** Rows fetched so far for the current query. */
  get loadedCount(): number {
    return this.rows.length;
  }

  /** False once the endpoint returned its last page for the current query. */
  get hasMore(): boolean {
    return !this.done;
  }

  async load(options: LoadOptions): Promise<LoadResult<T>> {
    const { skip = 0, take, signal: _signal, ...query } = options;
    const key = JSON.stringify(query);
    if (key !== this.queryKey) this.restart(key);
    const generation = this.generation;
    const end = take === undefined ? Infinity : skip + take;
    await this.fillTo(end, query);
    if (generation !== this.generation) {
      // the query changed while this window was loading: whoever changed it
      // issues its own load; this result describes a query nobody shows
      return { data: [], totalCount: 0 };
    }
    return {
      data: this.rows.slice(skip, take === undefined ? undefined : skip + take),
      totalCount: this.done ? this.rows.length : this.knownTotal,
    };
  }

  keyOf(item: T): RowKey {
    return this.keySelector(item);
  }

  /**
   * Drops every fetched page; the next load starts from the first page. Call
   * it after a mutation the endpoint's ordering depends on, then `reload()`
   * the grid.
   */
  invalidate(): void {
    this.restart(this.queryKey);
  }

  private restart(key: string | null): void {
    this.queryKey = key;
    this.generation++;
    this.rows = [];
    this.cursor = null;
    this.done = false;
    this.knownTotal = undefined;
    this.walk = Promise.resolve();
  }

  /** Walks the cursor chain until `end` rows exist (or the chain ends). */
  private fillTo(
    end: number,
    query: Omit<LoadOptions, 'skip' | 'take' | 'signal'>,
  ): Promise<void> {
    const generation = this.generation;
    const step = async (): Promise<void> => {
      while (
        generation === this.generation &&
        !this.done &&
        this.rows.length < end
      ) {
        const page = await this.fetchPage({
          ...query,
          cursor: this.cursor,
          pageSize: this.pageSize,
        });
        if (generation !== this.generation) return; // superseded mid-flight
        this.rows.push(...page.items);
        if (page.totalCount !== undefined) this.knownTotal = page.totalCount;
        const next = page.nextCursor ?? null;
        // an empty page ends the chain too: a cursor that never advances
        // would otherwise loop forever
        this.done = next === null || page.items.length === 0;
        this.cursor = next;
      }
    };
    // one walk at a time; a failed walk must not wedge the ones queued behind
    const run = this.walk.then(step, step);
    this.walk = run.catch(() => undefined);
    return run;
  }
}
