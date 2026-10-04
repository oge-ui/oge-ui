import type { CSSProperties, ReactNode } from 'react';
import type {
  CsvOptions,
  DataSource,
  FilterExpr,
  RowKey,
  TreeFilterMode,
  TreeListStateSnapshot,
} from '@oge-ui/core';
import type {
  OgeGridColumnHidingMode,
  OgeContextMenuSource,
  OgeDataErrorEvent,
  OgeEditingOptions,
  OgeEditingStartEvent,
  OgeExportingEvent,
  OgeFilterRowOptions,
  OgeFocusedRowChangedEvent,
  OgeGridMessages,
  OgeGridSelectionMode,
  OgeHeaderFilterOptions,
  OgeMenuItem,
  OgePagingOptions,
  OgeRowInsertedEvent,
  OgeRowInsertingEvent,
  OgeRowRemovedEvent,
  OgeRowRemovingEvent,
  OgeRowUpdatedEvent,
  OgeRowUpdatingEvent,
  OgeSavedChangesEvent,
  OgeSavingChangesEvent,
  OgeSearchPanelOptions,
  OgeSelectionChangedEvent,
  OgeSortingOptions,
  OgeStateStorage,
  OgeTreeExportData,
  OgeTreeExportOptions,
  OgeTreeListRemoteOperations,
  OgeTreeListSummary,
  OgeTreeInitNewRowEvent,
  OgeTreeLoadMode,
  OgeTreeOrphanPolicy,
  OgeTreeRowReparentEvent,
  OgeTreeRowToggleEvent,
  OgeTreeRowTogglingEvent,
  OgeTreeSelectedKeysMode,
} from '@oge-ui/behavior';
import type {
  OgeCellClickEvent,
  OgeCommandButton,
  OgeGridColumnProps,
  OgeGridNoDataContext,
  OgeRowClickEvent,
} from '@oge-ui/react-grid';

/**
 * Emitted on data-row right-click. Push items to open the tree's own menu at
 * the pointer; leave it empty and the browser's native menu is left alone.
 */
export interface OgeTreeContextMenuEvent<T = unknown> {
  row: T;
  key: RowKey;
  /** Where the menu opens: the pointer, or the focused cell's start/bottom corner. */
  clientX: number;
  clientY: number;
  items: OgeMenuItem[];
  /** `'keyboard'` for the Menu key / Shift+F10 on a focused cell. */
  source: OgeContextMenuSource;
  /** The originating event — `preventDefault()` vetoes the native menu yourself. */
  event: React.MouseEvent | React.KeyboardEvent;
}

/**
 * Emitted on header right-click with the built-in items (sort / pin / hide)
 * prebuilt — add, remove or reorder them before the menu opens.
 */
export interface OgeTreeHeaderContextMenuEvent {
  field: string;
  caption: string;
  clientX: number;
  clientY: number;
  items: OgeMenuItem[];
  source: OgeContextMenuSource;
  event: React.MouseEvent | React.KeyboardEvent;
}

/**
 * Props of `<OgeTreeList>` — the React form of Angular's `<oge-tree-list>`
 * inputs and outputs. Controlled values come as a value + `on…Change` pair
 * (Angular's `model()`s); outputs are `on`-prefixed callbacks.
 */
export interface OgeTreeListProps<T extends object = Record<string, unknown>> {
  /** Flat self-referencing rows: a static array or any DataSource implementation. */
  data?: readonly T[] | DataSource<T>;
  /** Row key: field path or selector function. Default `'id'`. */
  keyExpr?: string | ((row: T) => RowKey);
  /** Parent reference: field path or selector function. Default `'parentId'`. */
  parentIdExpr?: string | ((row: T) => unknown);
  /** Parent value marking root rows (`null`/`undefined` both count by default). */
  rootValue?: unknown;
  /** Rows whose parent key is missing: drop them or render them as roots. */
  orphanPolicy?: OgeTreeOrphanPolicy;
  /** Expands every row initially; the toggled-set polarity follows. */
  autoExpandAll?: boolean;
  /** Expanded row keys — controlled when provided. */
  expandedRowKeys?: readonly RowKey[];
  /** Uncontrolled initial expansion. */
  defaultExpandedRowKeys?: readonly RowKey[];
  onExpandedRowKeysChange?: (keys: RowKey[]) => void;
  /**
   * Expandability hint for lazily loaded children: field path or predicate.
   * Without it, expandability is inferred from the loaded children.
   */
  hasItemsExpr?: string | ((row: T) => boolean);
  /**
   * Nested payloads: rows carry their children inline under this field (or
   * accessor). The tree flattens them internally — `parentIdExpr` is ignored.
   * Plain-array data only.
   */
  itemsExpr?: string | ((row: T) => readonly T[] | undefined);
  /**
   * `'full'` loads everything up front; `'lazy'` fetches children per
   * expansion (`filter: [parentIdExpr, '=', parentKey]`). Defaults to
   * `'lazy'` when a DataSource plus `hasItemsExpr` are given.
   */
  loadMode?: OgeTreeLoadMode;
  /**
   * The columns — the grid's column props (`OgeGridColumnProps`), or a plain
   * field name. The React form of both Angular's `<oge-column>` children and
   * its `[columns]` input; `bandCaption` stands in for `<oge-column-group>`.
   */
  columns?: readonly (string | OgeGridColumnProps<T>)[];
  /** Per-column filter editors under the header. */
  filterRow?: boolean | OgeFilterRowOptions;
  /** Global search box in the toolbar. */
  searchPanel?: boolean | OgeSearchPanelOptions;
  /**
   * How filtering expands the matched set: matched rows always keep their
   * ancestors visible; `'fullBranch'` additionally keeps all descendants.
   */
  filterMode?: TreeFilterMode;
  /** Debounce for text filter inputs, in ms. Set to 0 in tests. */
  filterDebounce?: number;
  /**
   * Speaks sort, filter/search result count, page, row expansion,
   * select-all and blocked-save validation changes through the shared live
   * announcer (`useOgeLiveAnnouncer`, texts from `messages`). `undefined`
   * falls back to the grid config's `announcements` (default `true`).
   */
  announcements?: boolean;
  /** Auto-expands the ancestor chains of matches while a filter is active. Default true. */
  expandNodesOnFiltering?: boolean;
  /** Shows the filter panel bar with the filter-builder entry point. */
  filterPanel?: boolean;
  /** Excel-style distinct-value filter popups on the column headers. */
  headerFilter?: boolean | OgeHeaderFilterOptions;
  /**
   * Aggregates: `totalItems` render in a footer row over every
   * filter-visible row; `recursiveItems` show each parent's aggregate of its
   * visible descendants beside its own value. Both are included in exports.
   */
  summary?: OgeTreeListSummary<T>;
  /**
   * Operations the data source performs itself. `filtering: true` (full load
   * mode) sends filter, search and header-filter value requests to the
   * source, which answers with the matches **plus all their ancestors**.
   */
  remoteOperations?: OgeTreeListRemoteOperations;
  /**
   * Pages the visible (flattened) rows client-side. Paging and
   * `virtualScroll` are alternatives — when both are set, paging wins.
   */
  paging?: false | OgePagingOptions;
  /** The builder/programmatic filter expression — controlled when provided. */
  filterValue?: FilterExpr | null;
  /** Uncontrolled initial filter expression. */
  defaultFilterValue?: FilterExpr | null;
  onFilterValueChange?: (value: FilterExpr | null) => void;
  /**
   * Persists user state (sort, filters, column layout, expansion) under this
   * key via the state storage (default: localStorage).
   */
  stateKey?: string;
  /** Per-tree storage backend; overrides `OgeGridStateStorageProvider`. */
  stateStorage?: OgeStateStorage;
  /** `true` = multi-column sorting, `'single'`, or `false` to disable. */
  sortable?: boolean | 'single' | 'multi';
  sorting?: OgeSortingOptions;
  /** Windows the DOM to the visible rows (100k-node trees). Give the tree a bounded height. */
  virtualScroll?: boolean;
  /**
   * `'virtual'` renders only the columns inside the horizontal viewport.
   * Requires plain columns: no pinned columns and no column bands.
   */
  columnRenderingMode?: 'standard' | 'virtual';
  rowHeight?: number;
  overscan?: number;
  columnMinWidth?: number;
  /**
   * What happens to columns responsive hiding (`hidingPriority`) takes out:
   * `'detail'` gives every row an expand button revealing the hidden
   * columns' caption / value pairs; `'hide'` drops them. `undefined` = the
   * grid provider default (`'detail'`).
   */
  columnHidingMode?: OgeGridColumnHidingMode;
  /** Enables drag-resize handles on header edges. Default true. */
  columnResize?: boolean;
  /** Enables drag-and-drop column reordering (headers and chooser rows). Default true. */
  columnReorder?: boolean;
  /** Shows the column visibility chooser button in the toolbar. */
  columnChooser?: boolean;
  /** Per-instance message overrides (merged over `OgeGridConfigProvider`). */
  messages?: Partial<OgeGridMessages>;
  /**
   * BCP 47 locale of the tree list's formatted text — default date cells,
   * declarative column `format`s, summaries, header-filter values, the filter
   * row's number parsing and editors, exported text — and of its
   * plural-aware announcements. `undefined` falls back to the
   * `<OgeGridConfigProvider>` `locale`, then `navigator.language`.
   */
  locale?: string;
  /** Row selection: none | single | multiple (ctrl/shift) | checkbox column. */
  selectionMode?: OgeGridSelectionMode;
  /**
   * Recursive selection: toggling a row cascades to its descendants and
   * normalizes ancestors (tri-state checkboxes).
   */
  selectionRecursive?: boolean;
  /** Selected row keys — controlled when provided. */
  selectedKeys?: readonly RowKey[];
  /** Uncontrolled initial selection. */
  defaultSelectedKeys?: readonly RowKey[];
  onSelectedKeysChange?: (keys: RowKey[]) => void;
  /** Highlights and tracks a single focused row. */
  focusedRowEnabled?: boolean;
  /** The focused row's key — controlled when provided. */
  focusedRowKey?: RowKey | null;
  onFocusedRowKeyChange?: (key: RowKey | null) => void;
  /**
   * A `focusedRowKey` change expands its ancestor chain and scrolls the row
   * into view automatically.
   */
  autoNavigateToFocusedRow?: boolean;
  /** `false` hides the header select-all checkbox in checkbox mode. */
  allowSelectAll?: boolean;
  /** Alternating row background (zebra striping), stable under virtualization. */
  rowAlternation?: boolean;
  /** Cells wrap instead of truncating; virtual mode keeps fixed heights. */
  wordWrap?: boolean;
  /** Spinner overlay while a load is in flight. */
  loadPanel?: boolean;
  /**
   * Customizes the trailing command column: reorder/mix the built-in
   * `'edit'`/`'delete'` buttons with custom ones, with an optional per-row
   * `visible` predicate.
   */
  commandButtons?: readonly OgeCommandButton<T>[];
  /**
   * Right-to-left layout. `undefined` (default) auto-detects the inherited
   * CSS `direction`; `true`/`false` force it.
   */
  rtlEnabled?: boolean;
  /**
   * Drag-handle column for reparenting rows: dropping onto a row makes the
   * dragged row its child. With plain-array data and a string `parentIdExpr`
   * the parent field is updated in place; DataSource consumers handle
   * `onRowReparented` instead.
   */
  rowDragging?: boolean;
  /** Enables editing: `{ mode: 'cell' | 'row' | 'batch' | 'form' | 'popup', allow… }`. */
  editing?: false | OgeEditingOptions;
  /** Renders the empty state instead of the `noData` message — the React form of `*ogeNoDataTemplate`. */
  renderNoData?: (context: OgeGridNoDataContext) => ReactNode;
  /**
   * Your own toolbar content — the React form of Angular's projected
   * `[ogeToolbar]` items, which the tree list places at the toolbar's start
   * edge ahead of its built-in tools. Makes the toolbar render.
   */
  toolbarBefore?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Accessible name of the treegrid. */
  ariaLabel?: string;

  /** Fires after a row is dropped onto a new parent (or next to a sibling). */
  onRowReparented?: (event: OgeTreeRowReparentEvent<T>) => void;
  /** Fires before changes reach the DataSource; cancelable. */
  onSavingChanges?: (event: OgeSavingChangesEvent<T>) => void;
  onRowClick?: (event: OgeRowClickEvent<T>) => void;
  onRowDblClick?: (event: OgeRowClickEvent<T>) => void;
  /** Fires when a data cell is clicked. */
  onCellClick?: (event: OgeCellClickEvent<T>) => void;
  /** Fires when a data cell is double-clicked. */
  onCellDblClick?: (event: OgeCellClickEvent<T>) => void;
  /** Fires on row right-click; push `items` in the handler to open the built-in menu. */
  onRowContextMenu?: (event: OgeTreeContextMenuEvent<T>) => void;
  /** Customize (or extend) the built-in header context menu per column. */
  onHeaderContextMenu?: (event: OgeTreeHeaderContextMenuEvent) => void;
  /** Cancelable: fires before a row expands (UI-driven toggles). */
  onRowExpanding?: (event: OgeTreeRowTogglingEvent<T>) => void;
  /** Cancelable: fires before a row collapses (UI-driven toggles). */
  onRowCollapsing?: (event: OgeTreeRowTogglingEvent<T>) => void;
  onRowExpanded?: (event: OgeTreeRowToggleEvent<T>) => void;
  onRowCollapsed?: (event: OgeTreeRowToggleEvent<T>) => void;
  /** Prefill new rows created by `addRow()` before their editors open. */
  onInitNewRow?: (event: OgeTreeInitNewRowEvent) => void;
  /** Fires after the selection changed, with `addedKeys`/`removedKeys` diffs. */
  onSelectionChanged?: (event: OgeSelectionChangedEvent) => void;
  /** Fires after the focused row changed (`focusedRowEnabled` or key writes). */
  onFocusedRowChanged?: (event: OgeFocusedRowChangedEvent<T>) => void;
  /** Fires when a DataSource load or save fails. */
  onDataErrorOccurred?: (event: OgeDataErrorEvent) => void;
  /** Fires after a save batch was applied (only the non-canceled changes). */
  onSavedChanges?: (event: OgeSavedChangesEvent<T>) => void;
  /** Cancelable: fires before a cell or row editor opens. */
  onEditingStart?: (event: OgeEditingStartEvent<T>) => void;
  /** Cancelable: fires before a new row is inserted into the DataSource. */
  onRowInserting?: (event: OgeRowInsertingEvent) => void;
  onRowInserted?: (event: OgeRowInsertedEvent) => void;
  /** Cancelable: fires before a row update reaches the DataSource. */
  onRowUpdating?: (event: OgeRowUpdatingEvent<T>) => void;
  onRowUpdated?: (event: OgeRowUpdatedEvent) => void;
  /** Cancelable: fires before a row is removed from the DataSource. */
  onRowRemoving?: (event: OgeRowRemovingEvent<T>) => void;
  onRowRemoved?: (event: OgeRowRemovedEvent) => void;
  /** Fires after an edit session ended without saving. */
  onEditCanceled?: () => void;
  /** Cancelable: fires before a CSV export starts; `fileName` is mutable. */
  onExporting?: (event: OgeExportingEvent) => void;
  /** Fires after the tree has rendered a new result set. */
  onContentReady?: () => void;
  /**
   * Debounced notification whenever the persistable UI state changes —
   * persist the snapshot anywhere without a storage backend.
   */
  onStateChange?: (snapshot: TreeListStateSnapshot) => void;
}

/** Imperative handle — mirrors the Angular component's public methods. */
export interface OgeTreeListHandle<T extends object = Record<string, unknown>> {
  /** Selected keys narrowed per mode (recursive selection reporting). */
  getSelectedRowKeys(mode?: OgeTreeSelectedKeysMode): RowKey[];
  /** Data of the selected rows, narrowed per mode like `getSelectedRowKeys`. */
  getSelectedRowsData(mode?: OgeTreeSelectedKeysMode): T[];
  /** Selects every visible row; recursive mode cascades to their descendants. */
  selectAll(): void;
  clearSelection(): void;
  /** Deselects every row — same as `clearSelection()` (parity alias). */
  deselectAll(): void;
  /** Whether the row carrying `key` is currently selected. */
  isRowSelected(key: RowKey): boolean;
  /** Copies the selected rows (with a header) to the clipboard as TSV. */
  copyToClipboard(): Promise<void>;
  /**
   * Adds a new (unsaved) row; with `parentKey` and a string `parentIdExpr`
   * the parent reference is pre-staged, so saving inserts it under that node.
   */
  addRow(parentKey?: RowKey): void;
  /** Runs `callback` for every loaded row (all branches, loaded lazily or not). */
  forEachNode(
    callback: (row: T, key: RowKey, parentKey: RowKey | null) => void,
  ): void;
  /** Data rows of the currently rendered page, in display order. */
  getVisibleRows(): readonly T[];
  /** Re-runs the current load and drops lazily fetched/discovered rows. */
  refresh(): void;
  clearFilters(): void;
  clearSorting(): void;
  expandAll(): void;
  collapseAll(): void;
  /** Polarity-aware; does not fire the cancelable `onRowExpanding`. */
  expandRow(key: RowKey): void;
  collapseRow(key: RowKey): void;
  isRowExpanded(key: RowKey): boolean;
  /** The loaded row carrying `key`. */
  getNodeByKey(key: RowKey): T | undefined;
  /** Expands the ancestors of `key`, scrolls to it and focuses its first cell. */
  focusRow(key: RowKey): void;
  /** Same as `focusRow()` (parity alias). */
  navigateToRow(key: RowKey): void;
  /** Scrolls a row (by key or visible index) into the viewport. */
  scrollToRow(target: number | RowKey): void;
  /** Shows the load panel with an optional custom message until `endCustomLoading()`. */
  beginCustomLoading(message?: string): void;
  endCustomLoading(): void;
  /** Current zero-based page index — Angular's writable `pageIndex` signal. */
  pageIndex(): number;
  /** Navigates to the given zero-based page (clamped to the valid range). */
  setPageIndex(index: number): void;
  /** Current page size; `0` when paging is off or set to "all rows". */
  pageSize(): number;
  /** Changes the page size (`0` shows all rows) and resets to the first page. */
  setPageSize(size: number): void;
  /** Number of pages; `1` when paging is off. */
  pageCount(): number;
  /** Visible data-row count across all pages. */
  totalCount(): number;
  /** Current persistable UI state: sort, filters, column layout, expansion. */
  state(): TreeListStateSnapshot;
  /** Applies a previously captured state snapshot. */
  applyState(snapshot: TreeListStateSnapshot): void;
  /** Opens the row editor for `key` (`row`/`form`/`popup` modes). */
  editRow(key: RowKey): void;
  /** Stages (batch) or immediately saves the deletion of `key`. */
  deleteRow(key: RowKey): void;
  /** Commits the open editor; in batch mode saves the whole staged set. */
  saveChanges(): void;
  /** Discards every pending change and closes any open editor. */
  discardChanges(): void;
  /** Whether unsaved edits exist: staged changes, added or removed rows. */
  hasChanges(): boolean;
  /**
   * Rows, column metadata, depth levels and summary lines of the visible
   * tree — synchronous, like the Angular tree list (the grid's is async).
   * `visibleColumnsOnly: false` adds hidden columns, `selectedRowsOnly`
   * narrows to the selection, `summaries: false` drops the summary lines.
   */
  getExportData(options?: OgeTreeExportOptions): OgeTreeExportData<T>;
  /** CSV of the visible tree, the hierarchy indented in the first column. */
  getCsv(options?: CsvOptions): string;
  /** Downloads the visible tree as a CSV file; fires the cancelable `onExporting` first. */
  exportCsv(filename?: string): void;
}
