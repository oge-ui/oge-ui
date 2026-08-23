import type { GridStateSnapshot, LoadOptions } from '@oge-ui/core';
import type { OgeReactivityAdapter } from '../reactivity';
import { OgeGridEditingState } from './grid-editing-state';
import {
  OgeGridColumnsState,
  OgeGridExpansionState,
  OgeGridFilterState,
  OgeGridGroupingState,
  OgeGridPagingState,
  OgeGridSelectionState,
  OgeGridSortState,
} from './grid-state';

/**
 * The grid's user state, composed: one object owning every slice, the
 * `LoadOptions` they add up to, and the serializable snapshot.
 *
 * `loadOptions` is the single choke point — every state change that affects
 * *data* flows through it and triggers exactly one load. UI-only state
 * (column widths/order, expansion, selection, …) deliberately stays out.
 *
 * Framework-free (ADR 0001). The cross-slice invariants (a changed filter or
 * grouping invalidates the current page; changed grouping also drops group
 * expansion) are applied by {@link reconcile}, which the host calls once per
 * state write — Angular from an `effect()`, React from the store's bump —
 * instead of the core subscribing to anything itself.
 */
export class OgeGridStateCore {
  readonly sort: OgeGridSortState;
  readonly paging: OgeGridPagingState;
  readonly filter: OgeGridFilterState;
  readonly grouping: OgeGridGroupingState;
  readonly expansion: OgeGridExpansionState;
  readonly columns: OgeGridColumnsState;
  readonly selection: OgeGridSelectionState;
  readonly editing: OgeGridEditingState;

  /** Serializable user-state snapshot (column visibility is added by the grid). */
  readonly snapshot: () => GridStateSnapshot;
  readonly loadOptions: () => LoadOptions;

  private lastFilterJson: string | null = null;
  private lastGroupJson: string | null = null;

  constructor(rx: OgeReactivityAdapter) {
    this.sort = new OgeGridSortState(rx);
    this.paging = new OgeGridPagingState(rx);
    this.filter = new OgeGridFilterState(rx);
    this.grouping = new OgeGridGroupingState(rx);
    this.expansion = new OgeGridExpansionState(rx);
    this.columns = new OgeGridColumnsState(rx);
    this.selection = new OgeGridSelectionState(rx);
    this.editing = new OgeGridEditingState(rx);

    this.snapshot = rx.derived<GridStateSnapshot>(() => {
      const filter = this.filter.toState();
      return {
        sort: this.sort.descriptors(),
        group: this.grouping.descriptors(),
        filter: {
          row: filter.row,
          header: filter.header,
          ...(filter.searchText ? { searchText: filter.searchText } : {}),
        },
        paging: {
          pageIndex: this.paging.pageIndex(),
          pageSize: this.paging.pageSize(),
        },
        columns: {
          order: this.columns.order(),
          widths: [...this.columns.widthOverrides().entries()],
          pins: [...this.columns.pinOverrides().entries()],
        },
      };
    });

    this.loadOptions = rx.derived<LoadOptions>(() => {
      const window = this.paging.window();
      const filter = this.filter.combinedExpr();
      const searchText = this.filter.searchText().trim();
      const groups = this.grouping.descriptors();
      const groupSummary = this.grouping.groupSummary();
      const totalSummary = this.grouping.totalSummary();
      return {
        sort: this.sort.descriptors(),
        // paging window is meaningless while grouped (full tree is loaded)
        ...(groups.length ? {} : (window ?? {})),
        ...(filter ? { filter } : {}),
        ...(searchText ? { searchText } : {}),
        ...(groups.length ? { group: groups } : {}),
        ...(groups.length && groupSummary.length ? { groupSummary } : {}),
        ...(totalSummary.length ? { totalSummary } : {}),
        requireTotalCount: true,
      };
    });
  }

  /**
   * Applies the cross-slice invariants for whatever changed since the last
   * call. The first call takes the baseline and resets nothing. Returns
   * whether anything was written (the host may need another pass).
   */
  reconcile(): boolean {
    const filterJson = JSON.stringify([
      this.filter.combinedExpr(),
      this.filter.searchText(),
    ]);
    const groupJson = JSON.stringify(this.grouping.descriptors());
    let changed = false;
    if (this.lastFilterJson !== null && filterJson !== this.lastFilterJson) {
      if (this.paging.pageIndex() !== 0) {
        this.paging.goTo(0);
        changed = true;
      }
    }
    if (this.lastGroupJson !== null && groupJson !== this.lastGroupJson) {
      if (this.paging.pageIndex() !== 0) {
        this.paging.goTo(0);
        changed = true;
      }
      if (this.expansion.collapsedGroups().size) {
        this.expansion.clearGroups();
        changed = true;
      }
    }
    this.lastFilterJson = filterJson;
    this.lastGroupJson = groupJson;
    return changed;
  }

  /**
   * Restores a snapshot. `pageIndex` is intentionally NOT restored — the
   * filter/group invalidation resets it, which is the safe behavior.
   */
  applySnapshot(snapshot: GridStateSnapshot): void {
    if (snapshot.sort) this.sort.set(snapshot.sort);
    if (snapshot.group) this.grouping.set(snapshot.group);
    if (snapshot.filter) this.filter.applyState(snapshot.filter);
    if (snapshot.columns) {
      this.columns.applyState({
        order: snapshot.columns.order,
        widths: snapshot.columns.widths,
        pins: snapshot.columns.pins,
      });
    }
    if (snapshot.paging?.pageSize !== undefined) {
      this.paging.applyState({ pageSize: snapshot.paging.pageSize });
    }
  }
}

/** Structural equality for `LoadOptions` (the load trigger's change test). */
export function loadOptionsEqual(a: LoadOptions, b: LoadOptions): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
