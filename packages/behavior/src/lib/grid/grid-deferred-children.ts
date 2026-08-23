import type { DataSource, LoadOptions, RowKey } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/** Base load options with the per-request fields stripped. */
export type OgeDeferredBaseOptions = Omit<
  LoadOptions,
  'skip' | 'take' | 'signal'
>;

/** One lazily-expanded node whose children must be fetched. */
export interface OgePendingChildRequest {
  key: RowKey;
  /** Builds the child-load options from the current base (sort/filter/search). */
  buildOptions(base: OgeDeferredBaseOptions): LoadOptions;
}

/** Reactive getters the owning component wires into the loader. */
export interface OgeGridDeferredChildrenDeps<T> {
  /** Expanded keys whose children are neither in the payload nor cached yet. */
  pending: () => readonly OgePendingChildRequest[];
  /** Current load options; a change of the base fingerprint drops the cache. */
  baseOptions: () => LoadOptions;
  source: () => DataSource<T> | null;
  onError: (err: unknown) => void;
}

/**
 * On-demand child loading for lazily expanded nodes (deferred groups, lazy
 * tree nodes): de-duplicates in-flight requests per key, caches results, and
 * invalidates the whole cache when the base options (sort/filter/search)
 * change — a stale response can never land in a fresh cache. Requests are
 * deliberately not aborted on base change; the fingerprint guard drops their
 * results instead.
 *
 * Framework-free (ADR 0001). *When* to look for new work is the host's
 * scheduling decision, so there is no effect in here: the host watches
 * `pending` / `baseOptions` with whatever its framework offers and calls
 * {@link sync}.
 */
export class OgeGridDeferredChildrenCore<T = unknown> {
  /** Fetched children by node key — feed to the flatten step. */
  readonly children: () => ReadonlyMap<RowKey, readonly T[]>;

  private readonly cache: OgeReactiveCell<ReadonlyMap<RowKey, readonly T[]>>;
  /** Per-key request token: `finally` only clears its own generation. */
  private readonly inflight = new Map<RowKey, symbol>();
  private baseJson: string | null = null;

  constructor(
    private readonly deps: OgeGridDeferredChildrenDeps<T>,
    rx: OgeReactivityAdapter,
  ) {
    this.cache = rx.cell<ReadonlyMap<RowKey, readonly T[]>>(new Map());
    this.children = () => this.cache();
  }

  /**
   * Starts a request for every pending key that has none in flight, after
   * dropping the cache if the base options changed. Idempotent: calling it
   * again with the same inputs starts nothing.
   */
  sync(): void {
    const pending = this.deps.pending();
    const rest = withoutRequestFields(this.deps.baseOptions());
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
          const next = new Map(this.cache());
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
  }

  /** Drops the cache and in-flight bookkeeping (host refresh). */
  reset(): void {
    this.baseJson = null;
    this.inflight.clear();
    if (this.cache().size) this.cache.set(new Map());
  }

  /**
   * Seeds children fetched outside the pending pipeline (bulk subtree or
   * match-discovery loads). Entries live under the current base fingerprint
   * and are dropped by the same invalidation rules as loaded ones.
   */
  prime(entries: ReadonlyMap<RowKey, readonly T[]>): void {
    if (!entries.size) return;
    const next = new Map(this.cache());
    for (const [key, rows] of entries) next.set(key, rows);
    this.cache.set(next);
  }
}

/**
 * The base options minus the three per-request fields — this is what both the
 * cache fingerprint and each child request are built from.
 */
function withoutRequestFields(options: LoadOptions): OgeDeferredBaseOptions {
  const rest: Record<string, unknown> = { ...options };
  delete rest['signal'];
  delete rest['skip'];
  delete rest['take'];
  return rest as OgeDeferredBaseOptions;
}
