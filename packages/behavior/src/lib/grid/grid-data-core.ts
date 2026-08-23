import type {
  DataChange,
  DataSource,
  LoadOptions,
  LoadResult,
  RowKey,
} from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/** Rows fetched per windowed request (remote virtual / infinite scrolling). */
export const OGE_GRID_WINDOW_BLOCK_SIZE = 100;

/** Reactive getters the owning component wires into the core. */
export interface OgeGridDataCoreDeps {
  /** The load options the grid state adds up to (see `OgeGridStateCore`). */
  loadOptions: () => LoadOptions;
}

/**
 * Bridges the reactive grid state to the pull-based DataSource contract with
 * switchMap semantics: every relevant state change triggers one load and
 * aborts the previous in-flight one, so a stale response can never win over a
 * newer one. Windowed mode (remote virtual / infinite scrolling) fetches
 * sparse blocks instead; pushed changes (`DataSource.changes`) patch rows in
 * place when they can and reload when they cannot.
 *
 * Framework-free (ADR 0001): state lives in the caller's reactivity adapter.
 * *When* the load options changed is the host's scheduling decision, so the
 * host calls {@link sync} after each state write — Angular from an
 * `effect()`, React from an effect keyed on the options — and the core makes
 * it idempotent: equal options never load twice.
 */
export class OgeGridDataCore<T = unknown> {
  readonly source: () => DataSource<T> | null;
  readonly result: () => LoadResult<T> | null;
  readonly loading: OgeReactiveCell<boolean>;
  readonly error: OgeReactiveCell<unknown>;

  readonly windowRows: () => ReadonlyMap<number, T>;
  readonly windowTotal: () => number | null;
  /** Exclusive upper bound of the highest loaded row index. */
  readonly highestLoaded: () => number;
  readonly windowLoading: () => boolean;
  /**
   * Cells touched by the most recent pushed update batch, with a batch
   * counter — drives the grid's `highlightChanges` cell flash.
   */
  readonly pushedCells: () => {
    readonly batch: number;
    readonly cells: readonly { key: RowKey; field: string }[];
  };

  private readonly _source: OgeReactiveCell<DataSource<T> | null>;
  private readonly _result: OgeReactiveCell<LoadResult<T> | null>;
  private readonly _mode: OgeReactiveCell<'full' | 'window'>;
  private readonly _windowRows: OgeReactiveCell<ReadonlyMap<number, T>>;
  private readonly _windowTotal: OgeReactiveCell<number | null>;
  private readonly _highestLoaded: OgeReactiveCell<number>;
  private readonly _pendingCount: OgeReactiveCell<number>;
  private readonly _pushedCells: OgeReactiveCell<{
    readonly batch: number;
    readonly cells: readonly { key: RowKey; field: string }[];
  }>;

  private inflight: AbortController | null = null;
  private lastLoadJson: string | null = null;
  private windowBaseJson: string | null = null;
  private readonly pendingBlocks = new Set<number>();
  private readonly loadedBlocks = new Set<number>();
  private lastRange: { start: number; end: number } | null = null;
  private changesSub: { unsubscribe(): void } | null = null;

  constructor(
    private readonly deps: OgeGridDataCoreDeps,
    rx: OgeReactivityAdapter,
  ) {
    this._source = rx.cell<DataSource<T> | null>(null);
    this._result = rx.cell<LoadResult<T> | null>(null);
    this.loading = rx.cell(false);
    this.error = rx.cell<unknown>(null);
    this._mode = rx.cell<'full' | 'window'>('full');
    this._windowRows = rx.cell<ReadonlyMap<number, T>>(new Map());
    this._windowTotal = rx.cell<number | null>(null);
    this._highestLoaded = rx.cell(0);
    this._pendingCount = rx.cell(0);
    this._pushedCells = rx.cell({ batch: 0, cells: [] });

    this.source = () => this._source();
    this.result = () => this._result();
    this.windowRows = () => this._windowRows();
    this.windowTotal = () => this._windowTotal();
    this.highestLoaded = () => this._highestLoaded();
    this.windowLoading = rx.derived(() => this._pendingCount() > 0);
    this.pushedCells = () => this._pushedCells();
  }

  /** 'full' loads the whole (paged) result; 'window' fetches sparse blocks. */
  mode(): 'full' | 'window' {
    return this._mode();
  }

  setMode(mode: 'full' | 'window'): void {
    if (this._mode() === mode) return;
    this._mode.set(mode);
    if (mode === 'window') this.resetWindow();
    else this.lastLoadJson = null; // the next sync() must load
  }

  setSource(source: DataSource<T> | null): void {
    this.changesSub?.unsubscribe();
    this.changesSub = null;
    if (this._source() === source) return;
    this._source.set(source);
    this.lastLoadJson = null;
    if (source?.changes) {
      this.changesSub = source.changes.subscribe((batch) =>
        this.applyPush(batch),
      );
    }
  }

  /**
   * Runs the load the current source + options call for, if they differ
   * from the last one. Windowed loads go through {@link requestRange}.
   */
  sync(): void {
    const source = this._source();
    if (this._mode() === 'window') return;
    if (!source) {
      this.inflight?.abort();
      this.inflight = null;
      this.lastLoadJson = null;
      if (this._result() !== null) this._result.set(null);
      return;
    }
    const options = this.deps.loadOptions();
    const json = JSON.stringify(options);
    if (json === this.lastLoadJson) return;
    this.lastLoadJson = json;
    this.load(source, options);
  }

  /** Re-runs the current load (e.g. after external data mutations). */
  reload(): void {
    const source = this._source();
    if (source) this.load(source, this.deps.loadOptions());
  }

  /**
   * Ensures the row blocks covering [start, end) are loaded or in flight.
   * A change of sort/filter/search invalidates the whole cache.
   */
  requestRange(start: number, end: number): void {
    const source = this._source();
    if (!source || this._mode() !== 'window') return;
    this.lastRange = { start, end };
    const base = this.windowBase();
    const baseJson = JSON.stringify(base);
    if (baseJson !== this.windowBaseJson) {
      this.resetWindow();
      this.windowBaseJson = baseJson;
    }
    const total = this._windowTotal();
    const clampedEnd = total === null ? end : Math.min(end, total);
    const size = OGE_GRID_WINDOW_BLOCK_SIZE;
    const firstBlock = Math.max(0, Math.floor(start / size));
    const lastBlock = Math.max(firstBlock, Math.ceil(clampedEnd / size) - 1);
    for (let block = firstBlock; block <= lastBlock; block++) {
      if (this.pendingBlocks.has(block) || this.loadedBlocks.has(block))
        continue;
      this.pendingBlocks.add(block);
      this._pendingCount.set(this.pendingBlocks.size);
      const expectedBase = baseJson;
      source
        .load({ ...base, skip: block * size, take: size })
        .then((result) => {
          if (this.windowBaseJson !== expectedBase) return; // stale base
          const rows = result.data as readonly T[];
          const merged = new Map(this._windowRows());
          rows.forEach((row, i) => merged.set(block * size + i, row));
          this._windowRows.set(merged);
          if (result.totalCount !== undefined)
            this._windowTotal.set(result.totalCount);
          this._highestLoaded.set(
            Math.max(this._highestLoaded(), block * size + rows.length),
          );
          this.loadedBlocks.add(block);
        })
        .catch((err) => this.error.set(err))
        .finally(() => {
          this.pendingBlocks.delete(block);
          this._pendingCount.set(this.pendingBlocks.size);
        });
    }
  }

  /** Tears down the push subscription and cancels the in-flight load. */
  destroy(): void {
    this.changesSub?.unsubscribe();
    this.changesSub = null;
    this.inflight?.abort();
    this.inflight = null;
  }

  private resetWindow(): void {
    this.windowBaseJson = null;
    this.pendingBlocks.clear();
    this.loadedBlocks.clear();
    this._windowRows.set(new Map());
    this._windowTotal.set(null);
    this._highestLoaded.set(0);
    this._pendingCount.set(0);
  }

  /** Base options for windowed loads: everything except skip/take/signal. */
  private windowBase(): Omit<LoadOptions, 'skip' | 'take' | 'signal'> {
    const base: Record<string, unknown> = { ...this.deps.loadOptions() };
    delete base['skip'];
    delete base['take'];
    delete base['signal'];
    return base as Omit<LoadOptions, 'skip' | 'take' | 'signal'>;
  }

  private notifyPushedCells(batch: readonly DataChange<T>[]): void {
    const cells: { key: RowKey; field: string }[] = [];
    for (const change of batch) {
      if (change.type !== 'update') continue;
      for (const field of Object.keys(change.patch))
        cells.push({ key: change.key, field });
    }
    if (cells.length) {
      this._pushedCells.set({ batch: this._pushedCells().batch + 1, cells });
    }
  }

  /**
   * Applies pushed changes without a user-visible reload. Pure updates patch
   * rows in place; structural changes (insert/remove) re-run the current load
   * so sorting/filtering/paging stay correct.
   */
  private applyPush(batch: readonly DataChange<T>[]): void {
    const source = this._source();
    if (!source || !batch.length) return;
    const onlyUpdates = batch.every((change) => change.type === 'update');
    if (this._mode() === 'window') {
      if (onlyUpdates) {
        const merged = new Map(this._windowRows());
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
    const result = this._result();
    const grouped = (this.deps.loadOptions().group?.length ?? 0) > 0;
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

  private load(source: DataSource<T>, options: LoadOptions): void {
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
