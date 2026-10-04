import type {
  FilterExpr,
  GroupDescriptor,
  GroupInterval,
  RowKey,
  SortDescriptor,
  SummaryDescriptor,
} from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/**
 * The grid's user state, sliced by concern.
 *
 * Every class here is framework-free (ADR 0001): it takes an
 * {@link OgeReactivityAdapter} and exposes plain getters, so the Angular grid
 * drives it with signals and the React grid with its own store — one
 * implementation of what a sort toggle, a shift-range or a header-filter
 * selection *means*.
 */

/** Sort state: read-only getters + intent methods. */
export class OgeGridSortState {
  readonly descriptors: () => readonly SortDescriptor[];
  private readonly _descriptors: OgeReactiveCell<readonly SortDescriptor[]>;

  constructor(rx: OgeReactivityAdapter) {
    this._descriptors = rx.cell<readonly SortDescriptor[]>([]);
    this.descriptors = () => this._descriptors();
  }

  /**
   * Cycles a field through asc → desc → none (or asc → desc → asc when
   * `allowUnsorting` is false). `additive` (multi-sort, e.g. shift+click)
   * keeps other fields' descriptors and preserves this field's chain position.
   */
  toggle(field: string, additive = false, allowUnsorting = true): void {
    const current = this._descriptors();
    const existing = current.find((d) => d.field === field);
    if (!additive) {
      this._descriptors.set(
        !existing
          ? [{ field, dir: 'asc' }]
          : existing.dir === 'asc'
            ? [{ field, dir: 'desc' }]
            : allowUnsorting
              ? []
              : [{ field, dir: 'asc' }],
      );
      return;
    }
    if (!existing) {
      this._descriptors.set([...current, { field, dir: 'asc' }]);
    } else if (existing.dir === 'asc') {
      this._descriptors.set(
        current.map((d) => (d.field === field ? { field, dir: 'desc' } : d)),
      );
    } else if (allowUnsorting) {
      this._descriptors.set(current.filter((d) => d.field !== field));
    } else {
      this._descriptors.set(
        current.map((d) => (d.field === field ? { field, dir: 'asc' } : d)),
      );
    }
  }

  set(descriptors: readonly SortDescriptor[]): void {
    this._descriptors.set(descriptors);
  }

  clear(): void {
    this._descriptors.set([]);
  }

  /** Direction and 1-based chain position of a field, or null when unsorted. */
  stateOf(field: string): { dir: 'asc' | 'desc'; index: number } | null {
    const index = this._descriptors().findIndex((d) => d.field === field);
    return index < 0
      ? null
      : { dir: this._descriptors()[index].dir, index: index + 1 };
  }
}

/** Paging state. A `null` page size means paging is off. */
export class OgeGridPagingState {
  readonly pageSize: () => number | null;
  readonly pageIndex: () => number;
  /** skip/take window for LoadOptions; null when paging is off. */
  readonly window: () => { skip: number; take: number } | null;

  private readonly _pageSize: OgeReactiveCell<number | null>;
  private readonly _pageIndex: OgeReactiveCell<number>;

  constructor(rx: OgeReactivityAdapter) {
    this._pageSize = rx.cell<number | null>(null);
    this._pageIndex = rx.cell(0);
    this.pageSize = () => this._pageSize();
    this.pageIndex = () => this._pageIndex();
    this.window = rx.derived<{ skip: number; take: number } | null>(() => {
      const size = this._pageSize();
      return size == null
        ? null
        : { skip: this._pageIndex() * size, take: size };
    });
  }

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

/** Serializable filter state. */
export interface OgeGridFilterStateSnapshot {
  row: (readonly [string, FilterExpr])[];
  header: (readonly [string, readonly unknown[]])[];
  builder: FilterExpr | null;
  searchText: string;
}

/**
 * Filter state combining three sources into one expression: per-column
 * filter-row filters, Excel-style header-filter selections and the global
 * search text (the latter travels separately as `LoadOptions.searchText`).
 */
export class OgeGridFilterState {
  readonly searchText: () => string;
  readonly builderFilter: () => FilterExpr | null;
  /** AND of all active filters; null when nothing is filtered. */
  readonly combinedExpr: () => FilterExpr | null;

  private readonly _rowFilters: OgeReactiveCell<
    ReadonlyMap<string, FilterExpr>
  >;
  private readonly _headerFilters: OgeReactiveCell<
    ReadonlyMap<string, readonly unknown[]>
  >;
  private readonly _builderFilter: OgeReactiveCell<FilterExpr | null>;
  private readonly _searchText: OgeReactiveCell<string>;

  constructor(rx: OgeReactivityAdapter) {
    this._rowFilters = rx.cell<ReadonlyMap<string, FilterExpr>>(new Map());
    this._headerFilters = rx.cell<ReadonlyMap<string, readonly unknown[]>>(
      new Map(),
    );
    this._builderFilter = rx.cell<FilterExpr | null>(null);
    this._searchText = rx.cell('');

    this.searchText = () => this._searchText();
    this.builderFilter = () => this._builderFilter();
    this.combinedExpr = rx.derived<FilterExpr | null>(() => {
      const operands: FilterExpr[] = [...this._rowFilters().values()];
      for (const [field, values] of this._headerFilters()) {
        operands.push({ type: 'binary', field, op: 'in', value: values });
      }
      const builder = this._builderFilter();
      if (builder) operands.push(builder);
      if (!operands.length) return null;
      return operands.length === 1 ? operands[0] : { type: 'and', operands };
    });
  }

  setBuilderFilter(expr: FilterExpr | null): void {
    this._builderFilter.set(expr);
  }

  setRowFilter(field: string, expr: FilterExpr | null): void {
    const next = new Map(this._rowFilters());
    if (expr) next.set(field, expr);
    else if (!next.delete(field)) return;
    this._rowFilters.set(next);
  }

  /** The row-filter expression stored under `field` (or another slot key). */
  rowFilterOf(field: string): FilterExpr | null {
    return this._rowFilters().get(field) ?? null;
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
    this._builderFilter.set(null);
    this._searchText.set('');
  }

  /** Serializable state for persistence. */
  toState(): OgeGridFilterStateSnapshot {
    return {
      row: [...this._rowFilters().entries()],
      header: [...this._headerFilters().entries()],
      builder: this._builderFilter(),
      searchText: this._searchText(),
    };
  }

  applyState(state: {
    row?: readonly (readonly [string, FilterExpr])[];
    header?: readonly (readonly [string, readonly unknown[]])[];
    builder?: FilterExpr | null;
    searchText?: string;
  }): void {
    this._rowFilters.set(new Map(state.row ?? []));
    this._headerFilters.set(new Map(state.header ?? []));
    this._builderFilter.set(state.builder ?? null);
    this._searchText.set(state.searchText ?? '');
  }
}

/** Row grouping state: group descriptors + summary configuration. */
export class OgeGridGroupingState {
  readonly descriptors: () => readonly GroupDescriptor[];
  readonly groupSummary: () => readonly SummaryDescriptor[];
  readonly totalSummary: () => readonly SummaryDescriptor[];
  /** Date bucket per field, synced from the columns (`groupInterval`). */
  readonly intervals: () => Readonly<Record<string, GroupInterval>>;
  /**
   * The descriptors as `LoadOptions.group` carries them: each with its
   * column's `interval`. The user-facing `descriptors` stay interval-free, so
   * persisted state does not depend on column configuration.
   */
  readonly loadDescriptors: () => readonly GroupDescriptor[];

  private readonly _descriptors: OgeReactiveCell<readonly GroupDescriptor[]>;
  private readonly _intervals: OgeReactiveCell<
    Readonly<Record<string, GroupInterval>>
  >;
  private readonly _groupSummary: OgeReactiveCell<readonly SummaryDescriptor[]>;
  private readonly _totalSummary: OgeReactiveCell<readonly SummaryDescriptor[]>;

  constructor(rx: OgeReactivityAdapter) {
    this._descriptors = rx.cell<readonly GroupDescriptor[]>([]);
    this._groupSummary = rx.cell<readonly SummaryDescriptor[]>([]);
    this._totalSummary = rx.cell<readonly SummaryDescriptor[]>([]);
    this.descriptors = () => this._descriptors();
    this.groupSummary = () => this._groupSummary();
    this.totalSummary = () => this._totalSummary();
    this._intervals = rx.cell<Readonly<Record<string, GroupInterval>>>({});
    this.intervals = () => this._intervals();
    this.loadDescriptors = rx.derived(() => {
      const intervals = this._intervals();
      return this._descriptors().map((d) =>
        intervals[d.field] ? { ...d, interval: intervals[d.field] } : d,
      );
    });
  }

  /** Synced from column definitions; guarded so effects do not loop. */
  setIntervals(intervals: Readonly<Record<string, GroupInterval>>): void {
    if (JSON.stringify(intervals) !== JSON.stringify(this._intervals()))
      this._intervals.set(intervals);
  }

  groupBy(field: string): void {
    if (this._descriptors().some((d) => d.field === field)) return;
    this._descriptors.set([...this._descriptors(), { field, dir: 'asc' }]);
  }

  ungroup(field: string): void {
    const next = this._descriptors().filter((d) => d.field !== field);
    if (next.length !== this._descriptors().length) this._descriptors.set(next);
  }

  /**
   * Moves the grouping on `field` one level towards the end (`1`) or the
   * start (`-1`) of the group order. Returns its new index, or -1 when it is
   * not grouped or already at that edge.
   */
  move(field: string, direction: 1 | -1): number {
    const descriptors = [...this._descriptors()];
    const from = descriptors.findIndex((d) => d.field === field);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= descriptors.length) return -1;
    [descriptors[from], descriptors[to]] = [descriptors[to], descriptors[from]];
    this._descriptors.set(descriptors);
    return to;
  }

  toggleDirection(field: string): void {
    this._descriptors.set(
      this._descriptors().map((d) =>
        d.field === field
          ? { field, dir: d.dir === 'asc' ? 'desc' : 'asc' }
          : d,
      ),
    );
  }

  set(descriptors: readonly GroupDescriptor[]): void {
    this._descriptors.set(descriptors);
  }

  clear(): void {
    if (this._descriptors().length) this._descriptors.set([]);
  }

  /** Synced from column definitions; guarded so effects do not loop. */
  setSummaries(
    group: readonly SummaryDescriptor[],
    total: readonly SummaryDescriptor[],
  ): void {
    if (JSON.stringify(group) !== JSON.stringify(this._groupSummary())) {
      this._groupSummary.set(group);
    }
    if (JSON.stringify(total) !== JSON.stringify(this._totalSummary())) {
      this._totalSummary.set(total);
    }
  }
}

/**
 * Expansion state. Groups default to expanded (a *collapsed* set is tracked);
 * master-detail rows default to collapsed (an *expanded* set). Deliberately
 * not part of LoadOptions — toggling re-runs only the flatten step.
 */
export class OgeGridExpansionState {
  readonly collapsedGroups: () => ReadonlySet<RowKey>;
  readonly expandedDetails: () => ReadonlySet<RowKey>;

  private readonly _collapsedGroups: OgeReactiveCell<ReadonlySet<RowKey>>;
  private readonly _expandedDetails: OgeReactiveCell<ReadonlySet<RowKey>>;

  constructor(rx: OgeReactivityAdapter) {
    this._collapsedGroups = rx.cell<ReadonlySet<RowKey>>(new Set());
    this._expandedDetails = rx.cell<ReadonlySet<RowKey>>(new Set());
    this.collapsedGroups = () => this._collapsedGroups();
    this.expandedDetails = () => this._expandedDetails();
  }

  toggleGroup(key: RowKey): void {
    const next = new Set(this._collapsedGroups());
    if (!next.delete(key)) next.add(key);
    this._collapsedGroups.set(next);
  }

  toggleDetail(key: RowKey): void {
    const next = new Set(this._expandedDetails());
    if (!next.delete(key)) next.add(key);
    this._expandedDetails.set(next);
  }

  isDetailExpanded(key: RowKey): boolean {
    return this._expandedDetails().has(key);
  }

  clearGroups(): void {
    if (this._collapsedGroups().size) this._collapsedGroups.set(new Set());
  }

  /** Replaces the toggled-group set (expand-all / collapse-all). */
  setGroups(keys: ReadonlySet<RowKey>): void {
    this._collapsedGroups.set(new Set(keys));
  }

  clearDetails(): void {
    if (this._expandedDetails().size) this._expandedDetails.set(new Set());
  }
}

export type OgePinOverride = 'left' | 'right' | false;

/** UI-only column state: user-driven width, order and pin overrides. */
export class OgeGridColumnsState {
  readonly widthOverrides: () => ReadonlyMap<string, number>;
  readonly order: () => readonly string[] | null;
  readonly pinOverrides: () => ReadonlyMap<string, OgePinOverride>;

  private readonly _widthOverrides: OgeReactiveCell<
    ReadonlyMap<string, number>
  >;
  private readonly _order: OgeReactiveCell<readonly string[] | null>;
  private readonly _pinOverrides: OgeReactiveCell<
    ReadonlyMap<string, OgePinOverride>
  >;

  constructor(rx: OgeReactivityAdapter) {
    this._widthOverrides = rx.cell<ReadonlyMap<string, number>>(new Map());
    this._order = rx.cell<readonly string[] | null>(null);
    this._pinOverrides = rx.cell<ReadonlyMap<string, OgePinOverride>>(
      new Map(),
    );
    this.widthOverrides = () => this._widthOverrides();
    this.order = () => this._order();
    this.pinOverrides = () => this._pinOverrides();
  }

  setPinned(columnId: string, pinned: OgePinOverride): void {
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

  /**
   * Moves `sourceId` so it lands in front of `targetId` (or right after it,
   * with `position: 'after'`) in the given base order.
   */
  reorder(
    baseOrder: readonly string[],
    sourceId: string,
    targetId: string,
    position: 'before' | 'after' = 'before',
  ): void {
    if (sourceId === targetId) return;
    const current = this._order() ?? baseOrder;
    // ids the base knows but a stored order lacks (a column shown after the
    // order was captured) join at their base position, so the move is exact
    const known = new Set(current);
    const merged = [...current, ...baseOrder.filter((id) => !known.has(id))];
    const order = merged.filter((id) => id !== sourceId);
    const targetIndex = order.indexOf(targetId);
    if (targetIndex < 0) return;
    order.splice(
      position === 'after' ? targetIndex + 1 : targetIndex,
      0,
      sourceId,
    );
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
    pins?: readonly (readonly [string, OgePinOverride])[];
  }): void {
    if (state.order !== undefined)
      this._order.set(state.order ? [...state.order] : null);
    if (state.widths !== undefined)
      this._widthOverrides.set(new Map(state.widths));
    if (state.pins !== undefined) this._pinOverrides.set(new Map(state.pins));
  }
}

/**
 * Selection state. Only data rows are selectable; range selection runs over
 * the flat list of *data-row keys* supplied by the grid, so group and detail
 * rows never break a shift-range.
 */
export class OgeGridSelectionState {
  readonly selected: () => ReadonlySet<RowKey>;
  readonly count: () => number;

  private readonly _selected: OgeReactiveCell<ReadonlySet<RowKey>>;
  private _anchor: RowKey | null = null;

  constructor(rx: OgeReactivityAdapter) {
    this._selected = rx.cell<ReadonlySet<RowKey>>(new Set());
    this.selected = () => this._selected();
    this.count = rx.derived(() => this._selected().size);
  }

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
