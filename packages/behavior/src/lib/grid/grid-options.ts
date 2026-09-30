import type { RowKey, SortDescriptor } from '@oge-ui/core';
import type { OgeDataType } from './grid-columns';

/**
 * The grid's option objects and event payloads that carry no framework
 * shape — plain data both render layers accept verbatim, so a React
 * `paging={{ pageSize: 10 }}` and an Angular `[paging]="{ pageSize: 10 }"`
 * are literally the same type (ADR 0001).
 */

export interface OgeFilterRowOptions {
  visible?: boolean;
  /** Debounce for typing, in ms. */
  debounce?: number;
}

export interface OgeHeaderFilterOptions {
  visible?: boolean;
  /** Maximum distinct values listed in the popup. */
  valueLimit?: number;
}

export interface OgeSearchPanelOptions {
  visible?: boolean;
  placeholder?: string;
  /** Input width in px. */
  width?: number;
}

export interface OgePagingOptions {
  pageSize: number;
  /** Shows a page-size selector in the pager; `'all'` adds an unpaged option. */
  pageSizes?: readonly (number | 'all')[];
  /** Shows the total row count in the pager. Default true. */
  showInfo?: boolean;
  /** 'compact' shows `page / count`; 'adaptive' switches to compact on narrow grids. */
  displayMode?: 'full' | 'compact' | 'adaptive';
}

export interface OgeSortingOptions {
  mode?: 'none' | 'single' | 'multi';
  /** Whether a third header click clears the sort. Defaults from global config. */
  allowUnsorting?: boolean;
}

export interface OgeGroupingOptions {
  /**
   * `false` starts every group collapsed and enables deferred loading:
   * a grouped payload may return `items: null` per group, and the grid
   * fetches a group's children only when it is expanded.
   */
  autoExpandAll?: boolean;
  /**
   * Offers "Group by this column" / "Ungroup" in the header context menu
   * without the drag-and-drop group panel. Default: on whenever `groupPanel`
   * is — set `true` to group from the menu alone.
   */
  contextMenuEnabled?: boolean;
}

export interface OgeScrollingOptions {
  /** 'virtual' windows the DOM; 'infinite' additionally loads on demand while scrolling down. */
  mode?: 'standard' | 'virtual' | 'infinite';
  /**
   * Fetch rows in blocks from the DataSource instead of loading everything
   * (server-side windowing). Defaults to true for 'infinite'.
   * Windowed mode is row-only: grouping and master-detail are unavailable.
   */
  remote?: boolean;
  /**
   * 'virtual' renders only the columns inside the horizontal viewport.
   * Requires plain columns: no pinned columns and no column bands; columns
   * without a numeric `width` fall back to their min width.
   */
  columnRenderingMode?: 'standard' | 'virtual';
}

/** Fires after the selection changed, with full state plus diffs. */
export interface OgeSelectionChangedEvent {
  selectedKeys: RowKey[];
  addedKeys: RowKey[];
  removedKeys: RowKey[];
}

/**
 * Fires after the sort changed — a header click, the header menu, `clearSorting()`
 * or a new `sorting` input — without the debounce of `stateChange`, so a caption
 * or a server request can follow the click in the same frame. The initial sort
 * is not a change.
 */
export interface OgeSortChangedEvent {
  sort: readonly SortDescriptor[];
  previousSort: readonly SortDescriptor[];
}

/** Fires after the page index or page size changed (the initial paging is not a change). */
export interface OgePageChangedEvent {
  pageIndex: number;
  /** `null` while paging is off. */
  pageSize: number | null;
  previousPageIndex: number;
  previousPageSize: number | null;
}

/** Which kind of row a toggle event is about. */
export type OgeGridToggleKind = 'group' | 'detail';

/**
 * Fires before a group row or a master-detail row expands or collapses — from
 * the pointer, the keyboard or `expandRow()` / `collapseRow()`. Set `cancel` to
 * keep the row as it is. `expandAllGroups()` / `collapseAllGroups()` do not
 * fire it per row.
 */
export interface OgeGridRowTogglingEvent<T = unknown> {
  /** The group node key, or the data row's key for a detail row. */
  key: RowKey;
  kind: OgeGridToggleKind;
  /** The data row of a detail toggle; `undefined` for a group. */
  row: T | undefined;
  cancel: boolean;
}

/** Fires after a group row or a master-detail row expanded or collapsed. */
export interface OgeGridRowToggleEvent<T = unknown> {
  key: RowKey;
  kind: OgeGridToggleKind;
  row: T | undefined;
}

/**
 * Fires after keyboard/pointer focus moved to another cell. `rowIndex` is the
 * position in the rendered (flattened) row list, `columnIndex` among the
 * visible columns; `key`/`row`/`field` are `undefined` on group and other
 * non-data rows.
 */
export interface OgeFocusedCellChangedEvent<T = unknown> {
  rowIndex: number;
  columnIndex: number;
  key: RowKey | undefined;
  row: T | undefined;
  field: string | undefined;
}

/**
 * How a context menu was asked for: a right-click / long-press (`'pointer'`) or
 * the keyboard — the Menu key or Shift+F10 on a focused cell (`'keyboard'`,
 * positioned at the cell rather than at a pointer).
 */
export type OgeContextMenuSource = 'pointer' | 'keyboard';

/** Fires after the focused row changed. */
export interface OgeFocusedRowChangedEvent<T = unknown> {
  key: RowKey | null;
  /** The focused row when it is currently loaded; `undefined` otherwise. */
  row: T | undefined;
}

/** Cancelable: fires before a CSV export starts; `fileName` is mutable. */
export interface OgeExportingEvent {
  fileName: string;
  cancel: boolean;
}

/** Fires after a row is dropped in a new position (`rowDragging`). */
export interface OgeRowReorderedEvent<T = unknown> {
  key: RowKey;
  targetKey: RowKey;
  /** Positions within the rendered (filtered/sorted) view. */
  fromIndex: number;
  toIndex: number;
  row: T;
}

/** A DataSource load or save failed. */
export interface OgeDataErrorEvent {
  error: unknown;
}

/** Column metadata handed to exporters (CSV / Excel). */
export interface OgeExportColumn<T = unknown> {
  caption: string;
  field: string | undefined;
  dataType: OgeDataType;
  accessor: (row: T) => unknown;
  format?: ((value: unknown) => string) | undefined;
}

export interface OgeExportData<T = unknown> {
  rows: readonly T[];
  columns: readonly OgeExportColumn<T>[];
}

/** Arguments handed to `customizeCell` for every exported cell. */
export interface OgeExportCellArgs<T = unknown> {
  row: T;
  field: string | undefined;
  caption: string;
  /** Raw accessor value. */
  value: unknown;
  /** Default text the exporter would emit for this cell. */
  text: string;
}

export interface OgeExportOptions<T = unknown> {
  /**
   * Which rows to export. `'all'` (default) ignores paging and exports the
   * full filtered + sorted set; `'page'` exports only the current page;
   * `'selection'` exports the selected rows. Master-detail content and group
   * headers are never exported — data rows only.
   */
  scope?: 'all' | 'page' | 'selection';
  /**
   * Override what a cell exports: return a replacement (string for CSV/PDF;
   * string/number/Date/boolean stay typed in Excel) or `undefined` to keep
   * the default.
   */
  customizeCell?: (cell: OgeExportCellArgs<T>) => unknown;
}
