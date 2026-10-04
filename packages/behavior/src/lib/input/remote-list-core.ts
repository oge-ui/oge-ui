import type { LoadOptions, LoadResult } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/**
 * What a list editor's `dataSource` must provide. Structurally a subset of
 * `@oge-ui/core`'s grid `DataSource` contract — `CustomDataSource`,
 * `ArrayDataSource`, `CursorDataSource` and `ODataDataSource` all satisfy it
 * as they are — plus an optional `byKey`, which resolves a committed value
 * the loaded pages do not contain (an initial value, a value restored from
 * storage) so the closed field can still show its text.
 *
 * The editor calls `load()` with `skip` / `take` (one page), `searchText`
 * (the typed text, trimmed), `requireTotalCount: true` and an `AbortSignal`
 * that fires when a newer search supersedes the request. `totalCount` in the
 * result is optional: without it the list keeps asking for pages until one
 * comes back shorter than `take`.
 */
export interface OgeListDataSource<TItem> {
  load(options: LoadOptions): Promise<LoadResult<TItem>>;
  /** Resolves the item whose committed value is `key`; `null` when unknown. */
  byKey?(
    key: unknown,
  ): PromiseLike<TItem | null | undefined> | TItem | null | undefined;
}

/** Load state of the current query's pages. */
export type OgeListDataStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Payload of a list editor's `pageLoaded` notification. */
export interface OgeListPageLoadedEvent<TItem> {
  /** The search text the page was requested for (`''` = no search). */
  readonly searchText: string;
  readonly skip: number;
  /** Rows the page delivered. */
  readonly items: readonly TItem[];
  /** The server's row count for the query, when it reported one. */
  readonly totalCount: number | undefined;
}

/** Reactive getters the owning editor wires into the remote list machine. */
export interface OgeRemoteListCoreDeps<TItem> {
  /** The bound source; `null`/`undefined` = the editor is in local mode. */
  source: () => OgeListDataSource<TItem> | null | undefined;
  /** Rows requested per page (`take`). */
  pageSize: () => number;
  /** Debounce (ms) between the last keystroke and the server request. */
  searchTimeout: () => number;
  /** Characters required before the typed text is sent to the server. */
  minSearchLength: () => number;
  /** Below `minSearchLength`: load the unfiltered list (`true`) or nothing. */
  showDataBeforeSearch: () => boolean;
  /** Committed value of an item — keys the remembered (selected) items. */
  valueOf: (item: TItem) => unknown;
  /** Rows before the loaded end at which the next page is requested (default 5). */
  prefetchRows?: () => number;
  /** Notified after every page that landed for a still-current query. */
  onPageLoaded?: (event: OgeListPageLoadedEvent<TItem>) => void;
}

/** One query's accumulated pages — cached per search text. */
interface QueryState<TItem> {
  readonly query: string;
  readonly items: readonly TItem[];
  readonly total: number | undefined;
  /** No page left to ask for. */
  readonly done: boolean;
  readonly status: OgeListDataStatus;
  /** Below `minSearchLength` without `showDataBeforeSearch`: nothing is asked for. */
  readonly blocked: boolean;
}

function emptyState<TItem>(query: string, blocked = false): QueryState<TItem> {
  return {
    query,
    items: [],
    total: undefined,
    done: blocked,
    status: 'idle',
    blocked,
  };
}

/**
 * Remote, paged "load on scroll" data for the dropdown list editors (select
 * box, tag box, autocomplete, multi-column combo box) in **both** render
 * layers (ADR 0001). The editor feeds it the typed text and the last index
 * its list (virtualized or not) shows; the machine turns that into
 * `skip` / `take` + `searchText` requests against an
 * {@link OgeListDataSource}:
 *
 * - **Paging driven by the view.** `notifyVisibleEnd(index)` requests the
 *   next page once the rendered window (or the keyboard's active option)
 *   comes within `prefetchRows` of the loaded end. One page is in flight at
 *   a time; the end is known from `totalCount`, or from a short page.
 * - **Debounced search.** `setSearch()` waits `searchTimeout` ms after the
 *   last keystroke; `minSearchLength` gates what is sent at all.
 * - **Stale requests are cancelled.** A new query aborts the previous
 *   request's `AbortSignal`, and an aborted request never writes state.
 * - **Pages are cached per search text**, so deleting a character back to a
 *   previous query re-shows its rows without a request.
 * - **Selected items are remembered** by value, and `resolve(value)` asks
 *   `byKey` for one no loaded page contains — the field keeps its text
 *   while the list shows a different search.
 */
export class OgeRemoteListCore<TItem> {
  /** Rows loaded so far for the current query. */
  readonly items: () => readonly TItem[];
  readonly status: () => OgeListDataStatus;
  /** First page of the current query is loading (the list has nothing yet). */
  readonly loadingFirstPage: () => boolean;
  /** A follow-up page is loading below rows already shown. */
  readonly loadingMore: () => boolean;
  /** The server's row count for the current query, when it reported one. */
  readonly totalCount: () => number | undefined;
  /** More rows exist beyond the loaded ones. */
  readonly hasMore: () => boolean;
  /** The current query is below `minSearchLength` and nothing is requested. */
  readonly blocked: () => boolean;

  private readonly current: OgeReactiveCell<QueryState<TItem>>;
  private readonly remembered: OgeReactiveCell<ReadonlyMap<unknown, TItem>>;
  private readonly cache = new Map<string, QueryState<TItem>>();
  private searchText: string | null = null;
  private started = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private controller: AbortController | null = null;
  private inflightQuery: string | null = null;
  private readonly pendingKeys = new Set<unknown>();
  private generation = 0;

  constructor(
    private readonly deps: OgeRemoteListCoreDeps<TItem>,
    rx: OgeReactivityAdapter,
  ) {
    this.current = rx.cell<QueryState<TItem>>(emptyState(''));
    this.remembered = rx.cell<ReadonlyMap<unknown, TItem>>(new Map());
    this.items = rx.derived(() => this.current().items);
    this.status = rx.derived(() => this.current().status);
    this.loadingFirstPage = rx.derived(
      () =>
        this.current().status === 'loading' &&
        this.current().items.length === 0,
    );
    this.loadingMore = rx.derived(
      () =>
        this.current().status === 'loading' && this.current().items.length > 0,
    );
    this.totalCount = rx.derived(() => this.current().total);
    this.hasMore = rx.derived(
      () => !this.current().done && !this.current().blocked,
    );
    this.blocked = rx.derived(() => this.current().blocked);
  }

  /** Whether a source is bound — the editor is in remote mode. */
  get active(): boolean {
    return this.deps.source() != null;
  }

  // --- lifecycle -------------------------------------------------------------

  /**
   * The popup opened: loads the first page of the current query unless it is
   * already cached. Idempotent — the editor calls it on every open.
   */
  open(): void {
    if (!this.active) return;
    this.started = true;
    if (this.timer === null) this.applySearch();
  }

  /** Drops every cached page and reloads the current query (after a data change). */
  reload(): void {
    this.abort();
    this.cache.clear();
    this.current.set(emptyState(''));
    if (this.started) this.applySearch();
  }

  /** The bound source changed: forget everything that came from the old one. */
  syncSource(): void {
    this.abort();
    this.cache.clear();
    this.pendingKeys.clear();
    this.started = false;
    this.current.set(emptyState(''));
  }

  /** Clears the pending debounce and aborts the in-flight request. */
  destroy(): void {
    this.clearTimer();
    this.abort();
  }

  // --- search ----------------------------------------------------------------

  /**
   * Sets the typed text (`null` = not searching). The request follows after
   * `searchTimeout`; `immediate` skips the debounce (popup open, clear).
   */
  setSearch(text: string | null, immediate = false): void {
    this.searchText = text;
    this.clearTimer();
    if (!this.active) return;
    const ms = this.deps.searchTimeout();
    if (immediate || text === null || !ms) {
      if (this.started) this.applySearch();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.started = true;
      this.applySearch();
    }, ms);
  }

  /** The query a typed text maps to; `null` when it is gated by `minSearchLength`. */
  queryFor(text: string | null): string | null {
    const typed = (text ?? '').trim();
    const min = this.deps.minSearchLength();
    if (min > 0 && typed.length < min) {
      return this.deps.showDataBeforeSearch() ? '' : null;
    }
    return typed;
  }

  private applySearch(): void {
    const query = this.queryFor(this.searchText);
    if (query === null) {
      this.abort();
      this.current.set(emptyState('', true));
      return;
    }
    const now = this.current();
    if (!now.blocked && now.query === query && this.cache.has(query)) {
      if (now.status === 'idle' && !now.done) this.loadMore();
      return;
    }
    // a different query supersedes whatever is still loading
    if (this.inflightQuery !== null && this.inflightQuery !== query) {
      this.abort();
    }
    const cached = this.cache.get(query);
    const state = cached ?? emptyState<TItem>(query);
    if (!cached) this.cache.set(query, state);
    this.current.set(state);
    if (state.items.length === 0 && !state.done && state.status !== 'loading') {
      this.loadMore();
    }
  }

  // --- paging ----------------------------------------------------------------

  /** Requests the next page of the current query (no-op while one is in flight). */
  loadMore(): void {
    const state = this.current();
    if (state.blocked || state.done || state.status === 'loading') return;
    const source = this.deps.source();
    if (!source) return;
    this.started = true;
    this.loadPage(source, state);
  }

  /**
   * The list rendered (or the keyboard reached) up to `endIndex`: loads the
   * next page once that is within `prefetchRows` of the loaded end.
   */
  notifyVisibleEnd(endIndex: number): void {
    const state = this.current();
    if (state.blocked || state.done || state.status === 'loading') return;
    const prefetch = this.deps.prefetchRows?.() ?? 5;
    if (endIndex >= state.items.length - prefetch) this.loadMore();
  }

  /** Retries the current query after a failed page. */
  retry(): void {
    const state = this.current();
    if (state.status !== 'error') return;
    this.commit({ ...state, status: 'idle' });
    this.loadMore();
  }

  private loadPage(source: OgeListDataSource<TItem>, state: QueryState<TItem>) {
    const take = Math.max(1, Math.floor(this.deps.pageSize()));
    const skip = state.items.length;
    const query = state.query;
    const controller =
      typeof AbortController === 'function' ? new AbortController() : null;
    this.controller = controller;
    this.inflightQuery = query;
    const generation = this.generation;
    this.commit({ ...state, status: 'loading' });
    const options: LoadOptions = {
      skip,
      take,
      searchText: query.length > 0 ? query : undefined,
      requireTotalCount: true,
      ...(controller ? { signal: controller.signal } : {}),
    };
    let request: Promise<LoadResult<TItem>>;
    try {
      request = Promise.resolve(source.load(options));
    } catch (error) {
      request = Promise.reject(error);
    }
    request.then(
      (result) => {
        if (controller?.signal.aborted || generation !== this.generation) {
          return;
        }
        this.controller = null;
        this.inflightQuery = null;
        const base = this.cache.get(query) ?? state;
        const rows = (result.data ?? []) as readonly TItem[];
        const items = [...base.items, ...rows];
        const total = result.totalCount ?? base.total;
        const done =
          total !== undefined ? items.length >= total : rows.length < take;
        this.commit({
          query,
          items,
          total,
          done,
          status: 'ready',
          blocked: false,
        });
        this.deps.onPageLoaded?.({
          searchText: query,
          skip,
          items: rows,
          totalCount: result.totalCount,
        });
      },
      () => {
        if (controller?.signal.aborted || generation !== this.generation) {
          return;
        }
        this.controller = null;
        this.inflightQuery = null;
        const base = this.cache.get(query) ?? state;
        this.commit({ ...base, status: 'error' });
      },
    );
  }

  private commit(state: QueryState<TItem>): void {
    this.cache.set(state.query, state);
    const now = this.current();
    if (!now.blocked && now.query === state.query) this.current.set(state);
  }

  private abort(): void {
    this.generation++;
    const query = this.inflightQuery;
    this.controller?.abort();
    this.controller = null;
    this.inflightQuery = null;
    if (query === null) return;
    // the aborted page never landed: the query keeps what it had, and will
    // ask again the next time it is shown
    const cached = this.cache.get(query);
    if (cached && cached.status === 'loading') {
      const settled: QueryState<TItem> = { ...cached, status: 'idle' };
      this.cache.set(query, settled);
      const now = this.current();
      if (!now.blocked && now.query === query) this.current.set(settled);
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // --- selected items ---------------------------------------------------------

  /** Keeps `item` resolvable by its value after the list moves on to another query. */
  remember(item: TItem): void {
    const key = this.deps.valueOf(item);
    const map = this.remembered();
    if (map.get(key) === item) return;
    const next = new Map(map);
    next.set(key, item);
    this.remembered.set(next);
  }

  /** The loaded or remembered item whose value is `value`. */
  lookup(value: unknown): TItem | undefined {
    for (const item of this.current().items) {
      if (Object.is(this.deps.valueOf(item), value)) return item;
    }
    const remembered = this.remembered().get(value);
    if (remembered !== undefined) return remembered;
    for (const state of this.cache.values()) {
      for (const item of state.items) {
        if (Object.is(this.deps.valueOf(item), value)) return item;
      }
    }
    return undefined;
  }

  /**
   * Makes `value` resolvable: a no-op when a loaded page or the remembered
   * set has it, otherwise one `byKey` call per value (never repeated while
   * pending). The resolved item is remembered.
   */
  resolve(value: unknown): void {
    if (value == null || this.lookup(value) !== undefined) return;
    const source = this.deps.source();
    if (!source?.byKey || this.pendingKeys.has(value)) return;
    this.pendingKeys.add(value);
    let result: PromiseLike<TItem | null | undefined>;
    try {
      result = Promise.resolve(source.byKey(value));
    } catch {
      this.pendingKeys.delete(value);
      return;
    }
    result.then(
      (item) => {
        this.pendingKeys.delete(value);
        // a source swapped while the lookup ran owns other data
        if (item != null && this.deps.source() === source) this.remember(item);
      },
      () => this.pendingKeys.delete(value),
    );
  }
}

/**
 * Whether a scrolling list element is within `threshold` px of its bottom —
 * the non-virtualized list's "load the next page" trigger.
 */
export function isNearScrollEnd(element: HTMLElement, threshold = 48): boolean {
  return (
    element.scrollTop + element.clientHeight >= element.scrollHeight - threshold
  );
}
