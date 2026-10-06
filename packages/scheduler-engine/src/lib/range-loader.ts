/**
 * Remote range loading for the scheduler: one request per visible period,
 * the neighbouring periods prefetched, navigation debounced, stale requests
 * aborted, every loaded range cached (LRU). Framework-free and reactive
 * through callbacks only — `OgeSchedulerCore` wires the callbacks to its
 * cells. A response that arrives after its range stopped being current is
 * cached but never written to the store; an aborted one is dropped.
 */
import type { DataSource, FilterExpr } from '@oge-ui/core';
import type {
  OgeSchedulerDataSource,
  OgeSchedulerLoadOptions,
} from './scheduler-types';

/** One requested range: instants plus the grouped resources on screen. */
export interface SchedulerLoadRange {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly resources?: Readonly<Record<string, readonly unknown[]>>;
}

/** The cache / dedupe key of a range. */
export function schedulerRangeKey(range: SchedulerLoadRange): string {
  return `${range.startDate.getTime()}|${range.endDate.getTime()}|${
    range.resources === undefined ? '' : JSON.stringify(range.resources)
  }`;
}

/** Whether a `dataSource` value is a range source (`load({ startDate, … })`). */
export function isOgeSchedulerRangeSource<T>(
  source: unknown,
): source is OgeSchedulerDataSource<T> {
  return (
    source !== null &&
    typeof source === 'object' &&
    !Array.isArray(source) &&
    typeof (source as { load?: unknown }).load === 'function' &&
    !('capabilities' in source)
  );
}

/**
 * The `@oge-ui/core` `LoadOptions.filter` of a range for a filtering
 * `DataSource` (`remoteFiltering`): appointments overlapping the range, or
 * any recurring series (their occurrences are expanded client-side).
 * `null` when the date fields are functions (no field name to filter on).
 */
export function schedulerRangeFilter(
  names: {
    readonly startDate: string | null;
    readonly endDate: string | null;
    readonly recurrenceRule: string | null;
  },
  range: SchedulerLoadRange,
): FilterExpr | null {
  if (names.startDate === null || names.endDate === null) return null;
  const overlap: FilterExpr = {
    type: 'and',
    operands: [
      {
        type: 'binary',
        field: names.startDate,
        op: 'lt',
        value: range.endDate,
      },
      {
        type: 'binary',
        field: names.endDate,
        op: 'ge',
        value: range.startDate,
      },
    ],
  };
  if (names.recurrenceRule === null) return overlap;
  return {
    type: 'or',
    operands: [
      overlap,
      {
        type: 'and',
        operands: [
          { type: 'binary', field: names.recurrenceRule, op: 'isnotnull' },
          {
            type: 'binary',
            field: names.recurrenceRule,
            op: 'ne',
            value: '',
          },
        ],
      },
    ],
  };
}

/** Reads a range source's result (`T[]` or `{ data }`). */
export function schedulerLoadData<T>(
  result: readonly T[] | { readonly data: readonly T[] },
): readonly T[] {
  return Array.isArray(result)
    ? (result as readonly T[])
    : ((result as { readonly data: readonly T[] }).data ?? []);
}

/** A `load` adapter over a filtering core `DataSource`. */
export function coreDataSourceRangeLoad<T>(
  source: DataSource<T>,
  filter: (range: SchedulerLoadRange) => FilterExpr | null,
): (options: OgeSchedulerLoadOptions) => Promise<readonly T[]> {
  return (options) =>
    source
      .load({ filter: filter(options), signal: options.signal })
      .then((result) => result.data as readonly T[]);
}

/** What the loader reports back. */
export interface SchedulerRangeLoaderCallbacks<T> {
  /** Loads one range (the source's `load`). */
  load(options: OgeSchedulerLoadOptions): Promise<readonly T[]>;
  /** The current range's items arrived (from the server or the cache). */
  data(items: readonly T[]): void;
  /** The current range is (not) loading. */
  loading(active: boolean): void;
  /** The current range failed (`null` clears a previous failure). */
  error(error: unknown | null): void;
  /** Navigation debounce in ms. */
  debounce(): number;
  /** Whether neighbours are prefetched. */
  prefetch(): boolean;
  /** Cache capacity in ranges. */
  cacheSize(): number;
}

interface InFlight {
  readonly controller: AbortController;
}

/** The range machine (see the file comment). */
export class SchedulerRangeLoader<T> {
  private current: { key: string; range: SchedulerLoadRange } | null = null;
  private neighbours: { key: string; range: SchedulerLoadRange }[] = [];
  private readonly cache = new Map<string, readonly T[]>();
  private readonly inFlight = new Map<string, InFlight>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private loadedOnce = false;
  private disposed = false;

  constructor(private readonly callbacks: SchedulerRangeLoaderCallbacks<T>) {}

  /** The current range's key (`null` before the first request). */
  currentKey(): string | null {
    return this.current?.key ?? null;
  }

  /** Cached range keys, least recently used first (specs). */
  cachedKeys(): readonly string[] {
    return [...this.cache.keys()];
  }

  /**
   * Makes `range` the current one. A cached range answers at once; an
   * uncached one loads — immediately the first time, after the debounce
   * while the user keeps navigating. Requests for ranges that are neither
   * current nor a neighbour are aborted.
   */
  request(
    range: SchedulerLoadRange,
    neighbours: readonly SchedulerLoadRange[] = [],
  ): void {
    if (this.disposed) return;
    const key = schedulerRangeKey(range);
    this.neighbours = neighbours.map((entry) => ({
      key: schedulerRangeKey(entry),
      range: entry,
    }));
    if (this.current?.key === key) return;
    this.current = { key, range };
    this.abortStale();
    this.clearTimer();
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      this.touch(key, cached);
      this.callbacks.loading(false);
      this.callbacks.error(null);
      this.callbacks.data(cached);
      this.prefetchNeighbours();
      return;
    }
    this.callbacks.loading(true);
    const delay = this.loadedOnce ? Math.max(0, this.callbacks.debounce()) : 0;
    this.loadedOnce = true;
    if (delay === 0) {
      this.fetch(key, range);
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.current?.key === key) this.fetch(key, range);
    }, delay);
  }

  /** Drops every cached range (after a write); the current stays current. */
  invalidate(): void {
    this.cache.clear();
    for (const entry of this.inFlight.values()) entry.controller.abort();
    this.inFlight.clear();
  }

  /** Drops the cache and reloads the current range now. */
  reload(): void {
    if (this.disposed) return;
    this.invalidate();
    this.clearTimer();
    const current = this.current;
    if (current === null) return;
    this.callbacks.loading(true);
    this.fetch(current.key, current.range);
  }

  /** Replaces the cached items of the current range (local edits). */
  replaceCurrent(items: readonly T[]): void {
    if (this.current !== null) this.touch(this.current.key, items);
  }

  /** Aborts everything; the loader answers nothing afterwards. */
  dispose(): void {
    this.disposed = true;
    this.clearTimer();
    for (const entry of this.inFlight.values()) entry.controller.abort();
    this.inFlight.clear();
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private abortStale(): void {
    const keep = new Set([
      this.current?.key,
      ...this.neighbours.map((entry) => entry.key),
    ]);
    for (const [key, entry] of this.inFlight) {
      if (!keep.has(key)) {
        entry.controller.abort();
        this.inFlight.delete(key);
      }
    }
  }

  private touch(key: string, items: readonly T[]): void {
    this.cache.delete(key);
    this.cache.set(key, items);
    const limit = Math.max(1, this.callbacks.cacheSize());
    while (this.cache.size > limit) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
  }

  private prefetchNeighbours(): void {
    if (!this.callbacks.prefetch()) return;
    for (const { key, range } of this.neighbours) {
      if (!this.cache.has(key) && !this.inFlight.has(key)) {
        this.fetch(key, range);
      }
    }
  }

  private fetch(key: string, range: SchedulerLoadRange): void {
    // a prefetch of this range already runs: its answer serves the view
    if (this.inFlight.has(key)) return;
    const controller = new AbortController();
    this.inFlight.set(key, { controller });
    let request: Promise<readonly T[]>;
    try {
      request = this.callbacks.load({
        startDate: range.startDate,
        endDate: range.endDate,
        ...(range.resources !== undefined
          ? { resources: range.resources }
          : {}),
        signal: controller.signal,
      });
    } catch (error) {
      request = Promise.reject(error);
    }
    void request.then(
      (items) => {
        if (controller.signal.aborted || this.disposed) return;
        this.inFlight.delete(key);
        const data = items ?? [];
        this.touch(key, data);
        if (this.current?.key !== key) return;
        this.callbacks.loading(false);
        this.callbacks.error(null);
        this.callbacks.data(data);
        this.prefetchNeighbours();
      },
      (error: unknown) => {
        if (controller.signal.aborted || this.disposed) return;
        this.inFlight.delete(key);
        if (this.current?.key !== key) return;
        this.callbacks.loading(false);
        this.callbacks.error(error ?? new Error('load failed'));
      },
    );
  }
}
