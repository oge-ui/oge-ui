import type { CSSProperties, ReactNode } from 'react';
import type {
  CsvOptions,
  DataSource,
  FilterExpr,
  FilterOperator,
  GridStateSnapshot,
  RowKey,
  SummaryType,
} from '@oge-ui/core';
import type {
  OgeColumnLookup,
  OgeDataErrorEvent,
  OgeDataType,
  OgeExportData,
  OgeExportOptions,
  OgeExportingEvent,
  OgeFilterRowOptions,
  OgeFocusedRowChangedEvent,
  OgeGridMessages,
  OgeGridSelectionMode,
  OgeGroupingOptions,
  OgePagingOptions,
  OgeRowReorderedEvent,
  OgeScrollingOptions,
  OgeSearchPanelOptions,
  OgeSelectionChangedEvent,
  OgeSortingOptions,
  OgeStateStorage,
} from '@oge-ui/behavior';

/** What a cell render prop receives — the React form of `*ogeCellTemplate`'s context. */
export interface OgeGridCellRenderContext<T = unknown> {
  /** The cell value (`column.field` read from the row, or `calculateCellValue`). */
  value: unknown;
  row: T;
  /** Index within the current result set. */
  rowIndex: number;
  key: RowKey;
  column: OgeGridColumnProps<T>;
}

/** What a header render prop receives — the React form of `*ogeHeaderTemplate`'s context. */
export interface OgeGridHeaderRenderContext<T = unknown> {
  column: OgeGridColumnProps<T>;
  caption: string;
}

/** What `renderRow` receives — the React form of `*ogeRowTemplate`'s context. */
export interface OgeGridRowRenderContext<T = unknown> {
  row: T;
  /** Index within the flat row list. */
  index: number;
  key: RowKey;
}

/** What `renderDetail` receives — the React form of `*ogeDetailTemplate`'s context. */
export interface OgeGridDetailRenderContext<T = unknown> {
  row: T;
  key: RowKey;
}

/**
 * One column, as plain props — the React form of `<oge-column>`. Renders
 * nothing itself; the grid derives its layout from the list.
 */
export interface OgeGridColumnProps<T = unknown> {
  /** Dotted paths are supported, e.g. `"customer.name"`. */
  field?: string;
  /** Header text; derived from `field` when omitted. */
  caption?: string;
  /** Number → px; string is used verbatim (e.g. `'2fr'`, `'150px'`). */
  width?: number | string;
  dataType?: OgeDataType;
  /** Custom value formatter applied to the default (non-rendered) cell text. */
  format?: (value: unknown) => string;
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  /** Filter-row operator override (default: contains for text, eq for number/date). */
  filterOperator?: FilterOperator;
  /** Track minimum in px for flexible-width columns. */
  minWidth?: number;
  /** Maps stored values to display texts (cells and filters). */
  lookup?: OgeColumnLookup;
  /** Computes the cell value from the row (display-only columns; disables sort/filter unless `field` is set). */
  calculateCellValue?: (row: T) => unknown;
  /** Custom sort key for this column (client-side array data only). */
  calculateSortValue?: (row: T) => unknown;
  /** Custom filter expression for filter-row input on this column. */
  calculateFilterExpression?: (
    value: unknown,
    operator: FilterOperator,
  ) => FilterExpr | null;
  /** Initial sort direction applied on first render (with `sortIndex` for multi-sort order). */
  sortOrder?: 'asc' | 'desc';
  sortIndex?: number;
  /** Initial group level of this column (0 = first). */
  groupIndex?: number;
  /** Responsive hiding: lower priorities hide first when the grid runs out of width. */
  hidingPriority?: number;
  /** Pins the column to an edge (requires a numeric `width`). */
  pinned?: false | 'left' | 'right';
  /** Aggregate(s) shown on group rows for this column's field. */
  groupSummary?: SummaryType | readonly SummaryType[];
  /**
   * Where this column's group summaries render: inline on the group header
   * row (default) or on a dedicated footer row after the group's children.
   */
  groupSummaryPosition?: 'row' | 'footer';
  /** Aggregate(s) shown in the grid's total row for this column's field. */
  totalSummary?: SummaryType | readonly SummaryType[];
  /**
   * Reducer for the `'custom'` summary type: receives the (group or total)
   * rows and returns the aggregate value. Client-side data only.
   */
  calculateCustomSummary?: (rows: readonly T[]) => unknown;
  /** Renders the cell content — the React form of `*ogeCellTemplate`. */
  renderCell?: (context: OgeGridCellRenderContext<T>) => ReactNode;
  /** Renders the header caption — the React form of `*ogeHeaderTemplate`. */
  renderHeader?: (context: OgeGridHeaderRenderContext<T>) => ReactNode;
}

/** Programmatic column definition (alternative to a full column object). */
export interface OgeColumnDef {
  field: string;
  caption?: string;
}

export interface OgeRowClickEvent<T = unknown> {
  row: T;
  key: RowKey;
  event: React.MouseEvent;
}

export interface OgeCellClickEvent<T = unknown> {
  row: T;
  key: RowKey;
  field: string | undefined;
  value: unknown;
  event: React.SyntheticEvent;
}

/** What `renderNoData` receives. */
export interface OgeGridNoDataContext {
  messages: OgeGridMessages;
}

export interface OgeGridProps<T extends object = Record<string, unknown>> {
  /** Rows to render: a static array or any DataSource implementation. */
  data?: readonly T[] | DataSource<T>;
  /**
   * The columns. When omitted, columns are derived from the first row's keys;
   * a plain string is shorthand for `{ field }`.
   */
  columns?: readonly (string | OgeColumnDef | OgeGridColumnProps<T>)[];
  /** Field (or selector) producing a stable row key; falls back to the row index. */
  keyField?: keyof T | ((row: T) => RowKey);
  /** `false` disables sorting entirely; `'single'` restricts to one column (no shift+click chains). */
  sortable?: boolean | 'single' | 'multi';
  /** Sorting options; overrides the `sortable` shorthand. */
  sorting?: OgeSortingOptions;
  paging?: false | OgePagingOptions;
  /**
   * Renders only the rows inside the scroll viewport (plus overscan). Give
   * the grid a bounded height (`style={{ height: 600 }}`) when enabled.
   */
  virtualScroll?: boolean;
  /** Scrolling options; overrides the `virtualScroll` shorthand. */
  scrolling?: OgeScrollingOptions;
  /** Fixed row height in px used by the virtualizer. Defaults from global config. */
  rowHeight?: number;
  /**
   * Measures real row heights (wrapped text, render props) instead of forcing
   * `rowHeight`, with scroll anchoring. Virtual mode only; ignored in
   * windowed (remote) mode.
   */
  autoRowHeight?: boolean;
  /** Height assumed for expanded master-detail rows in virtual mode. */
  detailRowHeight?: number;
  /** Extra rows rendered above/below the virtual window. */
  overscan?: number;
  /** Track minimum for columns without an explicit width. */
  columnMinWidth?: number;
  /** Per-column filter editors below the header. */
  filterRow?: boolean | OgeFilterRowOptions;
  /** Global search box above the grid. */
  searchPanel?: boolean | OgeSearchPanelOptions;
  /** Debounce for text filter inputs, in ms. Set to 0 in tests. */
  filterDebounce?: number;
  /** Shows the drop area for drag-and-drop row grouping. */
  groupPanel?: boolean;
  /** Initial/programmatic grouping by field names (also drivable via the group panel). */
  groupBy?: readonly string[];
  /** Grouping options (`autoExpandAll`, deferred loading). */
  grouping?: OgeGroupingOptions;
  /** Per-grid overrides of the UI strings (see `OgeGridConfigProvider` for app-wide). */
  messages?: Partial<OgeGridMessages>;
  /**
   * Persists user state (sort, filters, grouping, column layout, page size)
   * under this key via the state storage (default: localStorage) and restores
   * it on mount.
   */
  stateKey?: string;
  /** Per-grid storage backend; overrides `OgeGridStateStorageProvider`. */
  stateStorage?: OgeStateStorage;
  /** Row selection: none | single | multiple (ctrl/shift) | checkbox column. */
  selectionMode?: OgeGridSelectionMode;
  /** Selected row keys — controlled when provided. */
  selectedKeys?: readonly RowKey[];
  /** Uncontrolled initial selection. */
  defaultSelectedKeys?: readonly RowKey[];
  onSelectedKeysChange?: (keys: RowKey[]) => void;
  /**
   * Header select-all scope: `'allPages'` (default) selects the whole
   * filtered set across pages; `'page'` only the rows on the current page.
   */
  selectAllMode?: 'allPages' | 'page';
  /** Highlights and tracks a single focused row. */
  focusedRowEnabled?: boolean;
  /** The focused row's key — controlled when provided. */
  focusedRowKey?: RowKey | null;
  onFocusedRowKeyChange?: (key: RowKey | null) => void;
  /** Alternating row background (zebra striping), stable under virtualization. */
  rowAlternation?: boolean;
  /** Wraps cell text instead of clipping it. */
  wordWrap?: boolean;
  /**
   * Right-to-left layout. `undefined` (default) auto-detects the inherited
   * CSS `direction`; `true`/`false` force it.
   */
  rtlEnabled?: boolean;
  /** Enables drag-resize handles on header edges. */
  columnResize?: boolean;
  /** Enables drag-and-drop column reordering. */
  columnReorder?: boolean;
  /**
   * Drag-handle column for reordering rows. With plain-array data the array
   * is mutated in place; DataSource consumers handle `onRowReordered` instead.
   */
  rowDragging?: boolean;
  /** Spinner overlay while a load is in flight. */
  loadPanel?: boolean;
  /** Renders the empty state instead of the `noData` message. */
  renderNoData?: (context: OgeGridNoDataContext) => ReactNode;
  /**
   * Replaces the whole data row — the React form of `*ogeRowTemplate`. Group,
   * detail and summary rows keep their built-in rendering.
   */
  renderRow?: (context: OgeGridRowRenderContext<T>) => ReactNode;
  /**
   * Master-detail content rendered under an expanded row — the React form of
   * `*ogeDetailTemplate`. Its presence adds the expander column.
   */
  renderDetail?: (context: OgeGridDetailRenderContext<T>) => ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Accessible name of the grid. */
  ariaLabel?: string;

  onRowClick?: (event: OgeRowClickEvent<T>) => void;
  /** Fires when a data row is double-clicked. */
  onRowDblClick?: (event: OgeRowClickEvent<T>) => void;
  /** Fires when a data cell is clicked. */
  onCellClick?: (event: OgeCellClickEvent<T>) => void;
  /** Fires when a data cell is double-clicked. */
  onCellDblClick?: (event: OgeCellClickEvent<T>) => void;
  /** Fires after a row is dropped in a new position. */
  onRowReordered?: (event: OgeRowReorderedEvent<T>) => void;
  /** Fires after the grid has rendered a new result set. */
  onContentReady?: () => void;
  /** Fires after the selection changed, with `addedKeys`/`removedKeys` diffs. */
  onSelectionChanged?: (event: OgeSelectionChangedEvent) => void;
  /** Fires after the focused row changed (`focusedRowEnabled` or key writes). */
  onFocusedRowChanged?: (event: OgeFocusedRowChangedEvent<T>) => void;
  /** Fires when a DataSource load fails. */
  onDataErrorOccurred?: (event: OgeDataErrorEvent) => void;
  /** Cancelable: fires before a CSV export starts; `fileName` is mutable. */
  onExporting?: (event: OgeExportingEvent) => void;
  /**
   * Debounced notification whenever the persistable UI state changes —
   * persist the snapshot anywhere (API, database) without a storage backend.
   */
  onStateChange?: (snapshot: GridStateSnapshot) => void;
}

/** Imperative handle — mirrors the Angular component's public methods. */
export interface OgeGridHandle<T extends object = Record<string, unknown>> {
  /** Re-runs the current load against the DataSource. */
  refresh(): void;
  /** Clears every filter: row filters and search. */
  clearFilters(): void;
  /** Clears the sort order. */
  clearSorting(): void;
  /** Scrolls a row into the viewport — by flat index, or by row key. */
  scrollToRow(target: number | RowKey): void;
  /** Scrolls the row carrying `key` into view and, with `focusedRowEnabled`, focuses it. */
  navigateToRow(key: RowKey): void;
  /** Expands every group row (all levels). */
  expandAllGroups(): void;
  /** Collapses every group row (all levels). */
  collapseAllGroups(): void;
  /** Whether the group row (by its group node key) or master-detail row carrying `key` is expanded. */
  isRowExpanded(key: RowKey): boolean;
  /** Expands a group row (by its group node key) or a master-detail row. */
  expandRow(key: RowKey): void;
  /** Collapses a group row (by its group node key) or a master-detail row. */
  collapseRow(key: RowKey): void;
  /** Shows the load panel with an optional custom message until `endCustomLoading()`. */
  beginCustomLoading(message?: string): void;
  endCustomLoading(): void;
  /** Current zero-based page index. */
  pageIndex(): number;
  /** Navigates to the given zero-based page (clamped to the valid range). */
  setPageIndex(index: number): void;
  /** Current page size; `0` when paging is off. */
  pageSize(): number;
  /** Changes the page size (`0` turns paging off) and resets to the first page. */
  setPageSize(size: number): void;
  /** Number of pages; `1` when paging is off. */
  pageCount(): number;
  /** Data row count of the current filtered set, across all pages. */
  totalCount(): number;
  /** Data rows of the currently rendered page, in display order. */
  getVisibleRows(): readonly T[];
  /** The loaded row carrying `key`, if it is currently rendered. */
  getRowByKey(key: RowKey): T | undefined;
  /** Data of the selected rows among the currently loaded rows, in display order. */
  getSelectedRowsData(): T[];
  /** Selects every row of the current filtered set; scope via `selectAllMode`. */
  selectAll(): void;
  clearSelection(): void;
  /** Deselects every row — same as `clearSelection()` (parity alias). */
  deselectAll(): void;
  /** Whether the row carrying `key` is currently selected. */
  isRowSelected(key: RowKey): boolean;
  /** Current persistable UI state: sort, filters, grouping, column layout, page size. */
  state(): GridStateSnapshot;
  /** Applies a previously captured state snapshot. */
  applyState(snapshot: GridStateSnapshot): void;
  /** Rows and column metadata of the current view — the shared source for exporters. */
  getExportData(options?: OgeExportOptions<T>): Promise<OgeExportData<T>>;
  /** Builds CSV of the current view; `scope` narrows to the page or selection. */
  getCsv(options?: CsvOptions & OgeExportOptions<T>): Promise<string>;
  /** Downloads the current view as a CSV file. Fires the cancelable `onExporting` first. */
  exportCsv(filename?: string): Promise<void>;
  /** Copies the selected rows (with a header) — or the focused cell's text — as TSV. */
  copyToClipboard(): Promise<void>;
}
