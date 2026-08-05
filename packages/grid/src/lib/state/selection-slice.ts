import { computed, signal } from '@angular/core';
import type { RowKey } from '@oge-ui/core';

export type SelectionMode = 'none' | 'single' | 'multiple' | 'checkbox';

/**
 * Selection state slice. Only data rows are selectable; range selection runs
 * over the flat list of *data-row keys* supplied by the grid, so group and
 * detail rows never break a shift-range.
 */
export class SelectionSlice {
  private readonly _selected = signal<ReadonlySet<RowKey>>(new Set());
  private _anchor: RowKey | null = null;

  readonly selected = this._selected.asReadonly();
  readonly count = computed(() => this._selected().size);

  isSelected(key: RowKey): boolean {
    return this._selected().has(key);
  }

  get anchor(): RowKey | null {
    return this._anchor;
  }

  selectOnly(key: RowKey): void {
    this._anchor = key;
    this._selected.set(new Set([key]));
  }

  toggle(key: RowKey): void {
    this._anchor = key;
    const next = new Set(this._selected());
    if (!next.delete(key)) next.add(key);
    this._selected.set(next);
  }

  /**
   * Replaces the selection with the range between the anchor and `target`,
   * both inclusive, in the order given by `orderedKeys`.
   */
  selectRange(orderedKeys: readonly RowKey[], target: RowKey): void {
    const anchor = this._anchor ?? target;
    const from = orderedKeys.indexOf(anchor);
    const to = orderedKeys.indexOf(target);
    if (from < 0 || to < 0) {
      this.selectOnly(target);
      return;
    }
    const [start, end] = from <= to ? [from, to] : [to, from];
    this._selected.set(new Set(orderedKeys.slice(start, end + 1)));
  }

  /** Bulk replace (two-way binding, select-all). Keeps the anchor when possible. */
  replace(keys: Iterable<RowKey>): void {
    const next = new Set(keys);
    if (this._anchor !== null && !next.has(this._anchor)) this._anchor = null;
    this._selected.set(next);
  }

  clear(): void {
    this._anchor = null;
    if (this._selected().size) this._selected.set(new Set());
  }
}
