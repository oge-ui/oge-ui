import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import type { DataSource, LoadOptions, LoadResult } from '@oge-ui/core';
import { GridStateStore } from '../state/grid-state.store';

/** Rows fetched per windowed request (remote virtual / infinite scrolling). */
export const WINDOW_BLOCK_SIZE = 100;

/**
 * Bridges the reactive grid state to the pull-based DataSource contract with
 * switchMap semantics: every relevant state change triggers one load and
 * aborts the previous in-flight one, so a stale response can never win over a
 * newer one. Effects coalesce synchronous state writes into a single run.
 */
@Injectable()
export class GridDataAdapter<T = unknown> {
  private readonly store = inject(GridStateStore);

  private readonly _source = signal<DataSource<T> | null>(null);
  private readonly _result = signal<LoadResult<T> | null>(null);

  readonly source = this._source.asReadonly();
  readonly result = this._result.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<unknown>(null);

  private inflight: AbortController | null = null;

  // --- windowed mode (remote virtual / infinite scrolling) -----------------

  /** 'full' loads the whole (paged) result; 'window' fetches sparse blocks. */
  private readonly _mode = signal<'full' | 'window'>('full');

  private readonly _windowRows = signal<ReadonlyMap<number, T>>(new Map());
  private readonly _windowTotal = signal<number | null>(null);
  private readonly _highestLoaded = signal(0);
  private windowBaseJson: string | null = null;
  private readonly pendingBlocks = new Set<number>();
  private readonly loadedBlocks = new Set<number>();
  private readonly pendingCount = signal(0);

  readonly windowRows = this._windowRows.asReadonly();
  readonly windowTotal = this._windowTotal.asReadonly();
  /** Exclusive upper bound of the highest loaded row index. */
  readonly highestLoaded = this._highestLoaded.asReadonly();
  readonly windowLoading = computed(() => this.pendingCount() > 0);

  setMode(mode: 'full' | 'window'): void {
    if (untracked(this._mode) === mode) return;
    this._mode.set(mode);
    if (mode === 'window') this.resetWindow();
  }

  private resetWindow(): void {
    this.windowBaseJson = null;
    this.pendingBlocks.clear();
    this.loadedBlocks.clear();
    this._windowRows.set(new Map());
    this._windowTotal.set(null);
    this._highestLoaded.set(0);
    this.pendingCount.set(0);
  }

  /** Base options for windowed loads: everything except skip/take/signal. */
  private windowBase(): Omit<LoadOptions, 'skip' | 'take' | 'signal'> {
    const { skip: _s, take: _t, signal: _sig, ...base } = untracked(this.store.loadOptions);
    return base;
  }

  /**
   * Ensures the row blocks covering [start, end) are loaded or in flight.
   * A change of sort/filter/search invalidates the whole cache.
   */
  requestRange(start: number, end: number): void {
    const source = untracked(this._source);
    if (!source || untracked(this._mode) !== 'window') return;
    const base = this.windowBase();
    const baseJson = JSON.stringify(base);
    if (baseJson !== this.windowBaseJson) {
      this.resetWindow();
      this.windowBaseJson = baseJson;
    }
    const total = untracked(this._windowTotal);
    const clampedEnd = total === null ? end : Math.min(end, total);
    const firstBlock = Math.max(0, Math.floor(start / WINDOW_BLOCK_SIZE));
    const lastBlock = Math.max(firstBlock, Math.ceil(clampedEnd / WINDOW_BLOCK_SIZE) - 1);
    for (let block = firstBlock; block <= lastBlock; block++) {
      if (this.pendingBlocks.has(block) || this.loadedBlocks.has(block)) continue;
      this.pendingBlocks.add(block);
      this.pendingCount.set(this.pendingBlocks.size);
      const expectedBase = baseJson;
      source
        .load({ ...base, skip: block * WINDOW_BLOCK_SIZE, take: WINDOW_BLOCK_SIZE })
        .then((result) => {
          if (this.windowBaseJson !== expectedBase) return; // stale base
          const rows = result.data as readonly T[];
          const merged = new Map(untracked(this._windowRows));
          rows.forEach((row, i) => merged.set(block * WINDOW_BLOCK_SIZE + i, row));
          this._windowRows.set(merged);
          if (result.totalCount !== undefined) this._windowTotal.set(result.totalCount);
          this._highestLoaded.set(
            Math.max(untracked(this._highestLoaded), block * WINDOW_BLOCK_SIZE + rows.length)
          );
          this.loadedBlocks.add(block);
        })
        .catch((err) => this.error.set(err))
        .finally(() => {
          this.pendingBlocks.delete(block);
          this.pendingCount.set(this.pendingBlocks.size);
        });
    }
  }

  constructor() {
    effect(() => {
      const source = this._source();
      const options = this.store.loadOptions();
      const mode = this._mode();
      untracked(() => {
        if (mode === 'window') return; // windowed loads go through requestRange
        if (!source) {
          this.inflight?.abort();
          this.inflight = null;
          this._result.set(null);
          return;
        }
        this.load(source, options);
      });
    });
  }

  setSource(source: DataSource<T> | null): void {
    this._source.set(source);
  }

  /** Re-runs the current load (e.g. after external data mutations). */
  reload(): void {
    const source = untracked(this._source);
    if (source) this.load(source, untracked(this.store.loadOptions));
  }

  private load(source: DataSource<T>, options: Parameters<DataSource<T>['load']>[0]): void {
    this.inflight?.abort();
    const controller = new AbortController();
    this.inflight = controller;
    this.loading.set(true);
    source
      .load({ ...options, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        this._result.set(result);
        this.error.set(null);
        this.loading.set(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        this.error.set(err);
        this.loading.set(false);
      });
  }
}
