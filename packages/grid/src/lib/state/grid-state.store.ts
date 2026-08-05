import { Injectable, Signal, computed, effect, untracked } from '@angular/core';
import type { GridStateSnapshot, LoadOptions } from '@oge-ui/core';
import { ColumnsSlice } from './columns-slice';
import { EditingSlice } from './editing-slice';
import { ExpansionSlice } from './expansion-slice';
import { FilterSlice } from './filter-slice';
import { GroupingSlice } from './grouping-slice';
import { PagingSlice } from './paging-slice';
import { SelectionSlice } from './selection-slice';
import { SortSlice } from './sort-slice';

function loadOptionsEqual(a: LoadOptions, b: LoadOptions): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Component-scoped store composing the grid's state slices.
 * `loadOptions` is the single choke point: every state change that affects
 * *data* flows through it and triggers exactly one load. UI-only state
 * (column widths/order, expansion, selection, …) deliberately stays out of it.
 */
@Injectable()
export class GridStateStore {
  readonly sort = new SortSlice();
  readonly paging = new PagingSlice();
  readonly filter = new FilterSlice();
  readonly grouping = new GroupingSlice();
  readonly expansion = new ExpansionSlice();
  readonly columns = new ColumnsSlice();
  readonly selection = new SelectionSlice();
  readonly editing = new EditingSlice();

  constructor() {
    // Cross-slice invariants: a changed filter/search/grouping invalidates the
    // current page; changed grouping also invalidates group expansion state.
    let firstFilter = true;
    effect(() => {
      this.filter.combinedExpr();
      this.filter.searchText();
      if (firstFilter) {
        firstFilter = false;
        return;
      }
      untracked(() => this.paging.goTo(0));
    });
    let firstGroup = true;
    effect(() => {
      this.grouping.descriptors();
      if (firstGroup) {
        firstGroup = false;
        return;
      }
      untracked(() => {
        this.paging.goTo(0);
        this.expansion.clearGroups();
      });
    });
  }

  /** Serializable user-state snapshot (column visibility is added by the grid). */
  readonly snapshot: Signal<GridStateSnapshot> = computed(() => {
    const filter = this.filter.toState();
    return {
      sort: this.sort.descriptors(),
      group: this.grouping.descriptors(),
      filter: {
        row: filter.row,
        header: filter.header,
        ...(filter.searchText ? { searchText: filter.searchText } : {}),
      },
      paging: { pageIndex: this.paging.pageIndex(), pageSize: this.paging.pageSize() },
      columns: {
        order: this.columns.order(),
        widths: [...this.columns.widthOverrides().entries()],
        pins: [...this.columns.pinOverrides().entries()],
      },
    };
  });

  /**
   * Restores a snapshot. `pageIndex` is intentionally NOT restored — the
   * filter/group invalidation effects reset it, which is the safe behavior.
   */
  applySnapshot(snapshot: GridStateSnapshot): void {
    untracked(() => {
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
    });
  }

  readonly loadOptions: Signal<LoadOptions> = computed(
    () => {
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
    },
    { equal: loadOptionsEqual }
  );
}
