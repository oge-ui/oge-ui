import {
  DestroyRef,
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import type {
  DataChange,
  DataSource,
  LoadOptions,
  LoadResult,
  RowKey,
} from '@oge-ui/core';
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
    const {
      skip: _s,
      take: _t,
      signal: _sig,
      ...base
    } = untracked(this.store.loadOptions);
    return base;
  }

  /**
   * Ensures the row blocks covering [start, end) are loaded or in flight.
   * A change of sort/filter/search invalidates the whole cache.
   */
  /** Last requested window — reused when a push invalidates the block cache. */
  private lastRange: { start: number; end: number } | null = null;

  requestRange(start: number, end: number): void {
    const source = untracked(this._source);
    if (!source || untracked(this._mode) !== 'window') return;
    this.lastRange = { start, end };
    const base = this.windowBase();
    const baseJson = JSON.stringify(base);
    if (baseJson !== this.windowBaseJson) {
      this.resetWindow();
      this.windowBaseJson = baseJson;
    }
    const total = untracked(this._windowTotal);
    const clampedEnd = total === null ? end : Math.min(end, total);
    const firstBlock = Math.max(0, Math.floor(start / WINDOW_BLOCK_SIZE));
    const lastBlock = Math.max(
      firstBlock,
      Math.ceil(clampedEnd / WINDOW_BLOCK_SIZE) - 1,
    );
    for (let block = firstBlock; block <= lastBlock; block++) {
      if (this.pendingBlocks.has(block) || this.loadedBlocks.has(block))
        continue;
      this.pendingBlocks.add(block);
      this.pendingCount.set(this.pendingBlocks.size);
      const expectedBase = baseJson;
      source
        .load({
          ...base,
          skip: block * WINDOW_BLOCK_SIZE,
          take: WINDOW_BLOCK_SIZE,
        })
        .then((result) => {
          if (this.windowBaseJson !== expectedBase) return; // stale base
          const rows = result.data as readonly T[];
          const merged = new Map(untracked(this._windowRows));
          rows.forEach((row, i) =>
            merged.set(block * WINDOW_BLOCK_SIZE + i, row),
          );
          this._windowRows.set(merged);
          if (result.totalCount !== undefined)
            this._windowTotal.set(result.totalCount);
          this._highestLoaded.set(
            Math.max(
              untracked(this._highestLoaded),
              block * WINDOW_BLOCK_SIZE + rows.length,
            ),
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
    inject(DestroyRef).onDestroy(() => this.changesSub?.unsubscribe());
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

  // --- live updates (DataSource.changes push stream) ------------------------

  private changesSub: { unsubscribe(): void } | null = null;

  /**
   * Cells touched by the most recent pushed update batch, with a batch
   * counter — drives the grid's `highlightChanges` cell flash.
   */
  readonly pushedCells = signal<{
    readonly batch: number;
    readonly cells: readonly { key: RowKey; field: string }[];
  }>({ batch: 0, cells: [] });

  private notifyPushedCells(batch: readonly DataChange<T>[]): void {
    const cells: { key: RowKey; field: string }[] = [];
    for (const change of batch) {
      if (change.type !== 'update') continue;
      for (const field of Object.keys(change.patch))
        cells.push({ key: change.key, field });
    }
    if (cells.length) {
      this.pushedCells.set({
        batch: untracked(this.pushedCells).batch + 1,
        cells,
      });
    }
  }

  setSource(source: DataSource<T> | null): void {
    this.changesSub?.unsubscribe();
    this.changesSub = null;
    this._source.set(source);
    if (source?.changes) {
      this.changesSub = source.changes.subscribe((batch) =>
        this.applyPush(batch),
      );
    }
  }

  /**
   * Applies pushed changes without a user-visible reload. Pure updates patch
   * rows in place; structural changes (insert/remove) re-run the current load
   * so sorting/filtering/paging stay correct.
   */
  private applyPush(batch: readonly DataChange<T>[]): void {
    const source = untracked(this._source);
    if (!source || !batch.length) return;
    const onlyUpdates = batch.every((change) => change.type === 'update');
    if (untracked(this._mode) === 'window') {
      if (onlyUpdates) {
        const merged = new Map(untracked(this._windowRows));
        for (const change of batch) {
          if (change.type !== 'update') continue;
          for (const [index, row] of merged) {
            if (source.keyOf(row) === change.key) {
              merged.set(index, { ...(row as object), ...change.patch } as T);
              break;
            }
          }
        }
        this._windowRows.set(merged);
        this.notifyPushedCells(batch);
      } else {
        this.resetWindow();
        if (this.lastRange)
          this.requestRange(this.lastRange.start, this.lastRange.end);
      }
      return;
    }
    const result = untracked(this._result);
    const grouped = (untracked(this.store.loadOptions).group?.length ?? 0) > 0;
    if (onlyUpdates && result && !grouped) {
      const data = (result.data as readonly T[]).map((row) => {
        const change = batch.find(
          (c) => c.type === 'update' && source.keyOf(row) === c.key,
        );
        return change?.type === 'update'
          ? ({ ...(row as object), ...change.patch } as T)
          : row;
      });
      this._result.set({ ...result, data });
      this.notifyPushedCells(batch);
    } else {
      this.reload();
    }
  }

  /** Re-runs the current load (e.g. after external data mutations). */
  reload(): void {
    const source = untracked(this._source);
    if (source) this.load(source, untracked(this.store.loadOptions));
  }

  private load(
    source: DataSource<T>,
    options: Parameters<DataSource<T>['load']>[0],
  ): void {
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
