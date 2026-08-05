import { computed, signal } from '@angular/core';
import type { FilterExpr } from '@oge-ui/core';

/**
 * Filter state slice combining three sources into one expression:
 * per-column filter-row filters, Excel-style header-filter selections and the
 * global search text (the latter travels separately as `LoadOptions.searchText`).
 */
export class FilterSlice {
  private readonly _rowFilters = signal<ReadonlyMap<string, FilterExpr>>(new Map());
  private readonly _headerFilters = signal<ReadonlyMap<string, readonly unknown[]>>(new Map());
  private readonly _searchText = signal('');

  readonly searchText = this._searchText.asReadonly();

  setRowFilter(field: string, expr: FilterExpr | null): void {
    const next = new Map(this._rowFilters());
    if (expr) next.set(field, expr);
    else if (!next.delete(field)) return;
    this._rowFilters.set(next);
  }

  /** `null` clears the filter (= all values); an empty array means "none selected". */
  setHeaderFilter(field: string, values: readonly unknown[] | null): void {
    const next = new Map(this._headerFilters());
    if (values) next.set(field, values);
    else if (!next.delete(field)) return;
    this._headerFilters.set(next);
  }

  headerFilterOf(field: string): readonly unknown[] | null {
    return this._headerFilters().get(field) ?? null;
  }

  setSearchText(text: string): void {
    this._searchText.set(text);
  }

  clearAll(): void {
    this._rowFilters.set(new Map());
    this._headerFilters.set(new Map());
    this._searchText.set('');
  }

  /** Serializable state for persistence. */
  toState(): {
    row: (readonly [string, FilterExpr])[];
    header: (readonly [string, readonly unknown[]])[];
    searchText: string;
  } {
    return {
      row: [...this._rowFilters().entries()],
      header: [...this._headerFilters().entries()],
      searchText: this._searchText(),
    };
  }

  applyState(state: {
    row?: readonly (readonly [string, FilterExpr])[];
    header?: readonly (readonly [string, readonly unknown[]])[];
    searchText?: string;
  }): void {
    this._rowFilters.set(new Map(state.row ?? []));
    this._headerFilters.set(new Map(state.header ?? []));
    this._searchText.set(state.searchText ?? '');
  }

  /** AND of all active filters; null when nothing is filtered. */
  readonly combinedExpr = computed<FilterExpr | null>(() => {
    const operands: FilterExpr[] = [...this._rowFilters().values()];
    for (const [field, values] of this._headerFilters()) {
      operands.push({ type: 'binary', field, op: 'in', value: values });
    }
    if (!operands.length) return null;
    return operands.length === 1 ? operands[0] : { type: 'and', operands };
  });
}
