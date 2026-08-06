import { effect, signal, untracked, type Signal } from '@angular/core';
import type { DataSource, LoadOptions, RowKey } from '@oge-ui/core';

/** Base load options with the per-request fields stripped. */
export type DeferredBaseOptions = Omit<LoadOptions, 'skip' | 'take' | 'signal'>;

/** One lazily-expanded node whose children must be fetched. */
export interface PendingChildRequest {
  key: RowKey;
  /** Builds the child-load options from the current base (sort/filter/search). */
  buildOptions(base: DeferredBaseOptions): LoadOptions;
}

export interface DeferredChildrenLoaderDeps<T> {
  /** Expanded keys whose children are neither in the payload nor cached yet. */
  pending: Signal<readonly PendingChildRequest[]>;
  /** Current load options; a change of the base fingerprint drops the cache. */
  baseOptions: Signal<LoadOptions>;
  source: Signal<DataSource<T> | null>;
  onError: (err: unknown) => void;
}

/**
 * On-demand child loading for lazily expanded nodes (deferred groups, lazy
 * tree nodes): de-duplicates in-flight requests per key, caches results, and
 * invalidates the whole cache when the base options (sort/filter/search)
 * change — a stale response can never land in a fresh cache. Requests are
 * deliberately not aborted on base change; the fingerprint guard drops their
 * results instead. Hosted as a plain field by the component.
 */
export class DeferredChildrenLoader<T = unknown> {
  constructor(private readonly deps: DeferredChildrenLoaderDeps<T>) {}

  private readonly cache = signal<ReadonlyMap<RowKey, readonly T[]>>(new Map());

  /** Fetched children by node key — feed to the flatten step. */
  readonly children = this.cache.asReadonly();

  /** Per-key request token: `finally` only clears its own generation. */
  private readonly inflight = new Map<RowKey, symbol>();
  private baseJson: string | null = null;

  private readonly loadEffect = effect(() => {
    const pending = this.deps.pending();
    const base = this.deps.baseOptions();
    untracked(() => {
      const { signal: _signal, skip: _skip, take: _take, ...rest } = base;
      const baseJson = JSON.stringify(rest);
      if (baseJson !== this.baseJson) {
        this.baseJson = baseJson;
        this.inflight.clear();
        if (this.cache().size) this.cache.set(new Map());
      }
      const source = this.deps.source();
      if (!source) return;
      for (const request of pending) {
        if (this.inflight.has(request.key)) continue;
        const token = Symbol();
        this.inflight.set(request.key, token);
        source
          .load(request.buildOptions(rest))
          .then((result) => {
            if (this.baseJson !== baseJson) return; // stale base
            const next = new Map(untracked(this.cache));
            next.set(request.key, result.data as readonly T[]);
            this.cache.set(next);
          })
          .catch((err) => this.deps.onError(err))
          .finally(() => {
            if (this.inflight.get(request.key) === token) {
              this.inflight.delete(request.key);
            }
          });
      }
    });
  });

  /** Drops the cache and in-flight bookkeeping (host refresh). */
  reset(): void {
    this.baseJson = null;
    this.inflight.clear();
    if (untracked(this.cache).size) this.cache.set(new Map());
  }

  /**
   * Seeds children fetched outside the pending pipeline (bulk subtree or
   * match-discovery loads). Entries live under the current base fingerprint
   * and are dropped by the same invalidation rules as loaded ones.
   */
  prime(entries: ReadonlyMap<RowKey, readonly T[]>): void {
    if (!entries.size) return;
    const next = new Map(untracked(this.cache));
    for (const [key, rows] of entries) next.set(key, rows);
    this.cache.set(next);
  }
}
