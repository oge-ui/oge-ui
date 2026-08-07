import { signal } from '@angular/core';

export type PinOverride = 'left' | 'right' | false;

/** UI-only column state: user-driven width, order and pin overrides. */
export class ColumnsSlice {
  private readonly _widthOverrides = signal<ReadonlyMap<string, number>>(
    new Map(),
  );
  private readonly _order = signal<readonly string[] | null>(null);
  private readonly _pinOverrides = signal<ReadonlyMap<string, PinOverride>>(
    new Map(),
  );

  readonly widthOverrides = this._widthOverrides.asReadonly();
  readonly order = this._order.asReadonly();
  readonly pinOverrides = this._pinOverrides.asReadonly();

  setPinned(columnId: string, pinned: PinOverride): void {
    const next = new Map(this._pinOverrides());
    next.set(columnId, pinned);
    this._pinOverrides.set(next);
  }

  setWidth(columnId: string, width: number): void {
    const next = new Map(this._widthOverrides());
    next.set(columnId, Math.max(50, Math.round(width)));
    this._widthOverrides.set(next);
  }

  setOrder(columnIds: readonly string[]): void {
    this._order.set(columnIds);
  }

  /** Moves `sourceId` so it lands in front of `targetId` in the given base order. */
  reorder(
    baseOrder: readonly string[],
    sourceId: string,
    targetId: string,
  ): void {
    if (sourceId === targetId) return;
    const order = (this._order() ?? baseOrder).filter((id) => id !== sourceId);
    const targetIndex = order.indexOf(targetId);
    if (targetIndex < 0) return;
    order.splice(targetIndex, 0, sourceId);
    this._order.set(order);
  }

  reset(): void {
    this._widthOverrides.set(new Map());
    this._order.set(null);
    this._pinOverrides.set(new Map());
  }

  applyState(state: {
    order?: readonly string[] | null;
    widths?: readonly (readonly [string, number])[];
    pins?: readonly (readonly [string, PinOverride])[];
  }): void {
    if (state.order !== undefined)
      this._order.set(state.order ? [...state.order] : null);
    if (state.widths !== undefined)
      this._widthOverrides.set(new Map(state.widths));
    if (state.pins !== undefined) this._pinOverrides.set(new Map(state.pins));
  }
}
