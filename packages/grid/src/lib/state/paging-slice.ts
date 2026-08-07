import { computed, signal } from '@angular/core';

/** Paging state slice. A `null` page size means paging is off. */
export class PagingSlice {
  private readonly _pageSize = signal<number | null>(null);
  private readonly _pageIndex = signal(0);

  readonly pageSize = this._pageSize.asReadonly();
  readonly pageIndex = this._pageIndex.asReadonly();

  /** skip/take window for LoadOptions; null when paging is off. */
  readonly window = computed<{ skip: number; take: number } | null>(() => {
    const size = this._pageSize();
    return size == null ? null : { skip: this._pageIndex() * size, take: size };
  });

  configure(pageSize: number | null): void {
    if (pageSize === this._pageSize()) return;
    this._pageSize.set(pageSize);
    this._pageIndex.set(0);
  }

  goTo(pageIndex: number): void {
    this._pageIndex.set(Math.max(0, pageIndex));
  }

  /** Restores persisted paging without resetting the index. */
  applyState(state: { pageSize?: number | null; pageIndex?: number }): void {
    if (state.pageSize !== undefined) this._pageSize.set(state.pageSize);
    if (state.pageIndex !== undefined)
      this._pageIndex.set(Math.max(0, state.pageIndex));
  }
}
