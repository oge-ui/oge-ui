import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import type { DataSource, LoadResult } from '@oge-ui/core';
import { GridStateStore } from '../state/grid-state.store';

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

  constructor() {
    effect(() => {
      const source = this._source();
      const options = this.store.loadOptions();
      untracked(() => {
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
