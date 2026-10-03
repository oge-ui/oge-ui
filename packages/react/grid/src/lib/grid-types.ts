import type { CSSProperties, ReactNode } from 'react';
import type {
  CsvOptions,
  DataSource,
  FilterExpr,
  FilterOperator,
  GridStateSnapshot,
  GroupInterval,
  RowKey,
  SummaryType,
} from '@oge-ui/core';
import type {
  OgeGridColumnHidingMode,
  OgeColumnAlignment,
  OgeColumnLookup,
  OgeContextMenuSource,
  OgeDataErrorEvent,
  OgeEditingOptions,
  OgeEditingStartEvent,
  OgeDataType,
  OgeExportData,
  OgeExportOptions,
  OgeExportingEvent,
  OgeFilterRowOptions,
  OgeFocusedCellChangedEvent,
  OgeFocusedRowChangedEvent,
  OgeGridMessages,
  OgeGridRowToggleEvent,
  OgeGridRowTogglingEvent,
  OgePageChangedEvent,
  OgeSortChangedEvent,
  OgeGridSelectionMode,
  OgeHeaderFilterOptions,
  OgeMenuItem,
  OgeGroupingOptions,
  OgePagingOptions,
  OgeRowInsertedEvent,
  OgeRowInsertingEvent,
  OgeRowRemovedEvent,
  OgeRowRemovingEvent,
  OgeRowReorderedEvent,
  OgeRowUpdatedEvent,
  OgeRowUpdatingEvent,
  OgeSavedChangesEvent,
  OgeSavingChangesEvent,
  OgeScrollingOptions,
  OgeSearchPanelOptions,
  OgeSelectionChangedEvent,
  OgeSortingOptions,
  OgeStateStorage,
  OgeCellPreparedEvent,
  OgeClassValue,
  OgeConditionalFormat,
  OgeGridCellRange,
  OgeGridCellSpan,
  OgeGridColumnInfo,
  OgePagerInfoContext,
  OgeRangeSelectionChangedEvent,
  OgeRangeSelectionOptions,
  OgeRowDragEndEvent,
  OgeRowDragOverEvent,
  OgeRowDragStartEvent,
  OgeRowDropEvent,
  OgeRowPreparedEvent,
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
 * A cell-level rule: returns the message to show, or `null` to accept.
 *
 * A message rather than a boolean, and a plain function rather than Angular's
 * `ValidatorFn`: React has no forms engine to carry an error map, so the rule
 * that rejects a value is also the thing that says why. A rule may return a
 * promise (a server uniqueness check): the editor is `aria-busy` while it
 * runs, a commit waits for it, and pastes / fills await it too.
 */
export type OgeGridValidator<T = unknown> = (
  value: unknown,
  row: T,
) => string | null | Promise<string | null>;

/** What an editor render prop receives — the React form of `*ogeEditTemplate`. */
export interface OgeGridEditorRenderContext<T = unknown> {
  /** The draft value — not the row's stored value while an edit is open. */
  value: unknown;
  /** Writes the draft; the grid commits it on Enter/Tab/blur or Save. */
  setValue: (value: unknown) => void;
  row: T;
  key: RowKey;
  column: OgeGridColumnProps<T>;
  /** Validation message once the editor has been touched, else `null`. */
  error: string | null;
  /** Commits the edit and closes the editor. */
  commit: () => void;
  /** Abandons the edit and closes the editor. */
  cancel: () => void;
}

/** Prefill hook for `addRow()`: values written here stage onto the new row. */
export interface OgeInitNewRowEvent {
  key: RowKey;
  values: Record<string, unknown>;
}

/** One button of the command column (`commandButtons`). */
export interface OgeCommandButton<T = unknown> {
  /** `'edit'` and `'delete'` render the built-ins; anything else is custom. */
  name: 'edit' | 'delete' | (string & {});
  /** Label of a custom button. */
  text?: string;
  /** Hides the button for rows it does not apply to. */
  visible?: (row: T) => boolean;
  /** What a custom button does. */
  onClick?: (context: { row: T; key: RowKey; event: React.MouseEvent }) => void;
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
  /**
   * Horizontal alignment of the cells, header and summaries (logical: `'end'`
   * is the right edge in LTR). Unset, numbers align to the end, the rest to
   * the start.
   */
  alignment?: OgeColumnAlignment;
  /** Custom value formatter applied to the default (non-rendered) cell text. */
  format?: (value: unknown) => string;
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  /** Filter-row operator override (default: contains for text, eq for number/date). */
  filterOperator?: FilterOperator;
  /** Track minimum in px for flexible-width columns. */
  minWidth?: number;
  /** Upper bound in px for user resizing (pointer drag and Alt+Arrow keys). */
  maxWidth?: number;
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
  /**
   * Date bucket for grouping by this column: `'day'`, `'month'` or `'year'`.
   * Date columns default to `'day'`, so two timestamps of one day share a
   * group. Remote sources receive it as `LoadOptions.group[].interval`.
   */
  groupInterval?: GroupInterval;
  /** Responsive hiding: lower priorities hide first when the grid runs out of width. */
  hidingPriority?: number;
  /** Pins the column to an edge (requires a numeric `width`). */
  pinned?: false | 'left' | 'right';
  /**
   * Groups this column under a spanning band header — the React form of
   * `<oge-column-group caption>`. Adjacent columns carrying the same caption
   * share one band cell; a column without one leaves a blank above it.
   */
  bandCaption?: string;
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
  /** Lets `editing` open an editor on this column. Default: true when a `field` is set. */
  editable?: boolean;
  /** Rejects an empty value while editing. */
  required?: boolean;
  /** Extra cell rules, first failing message wins (sync or async). */
  validators?: readonly OgeGridValidator<T>[];
  /**
   * Declarative conditional formatting: rules (`{ when, class | style }`),
   * data bars, colour scales and icon sets — token classes and CSS custom
   * properties only, so themes and forced colours keep working.
   */
  conditionalFormats?: readonly OgeConditionalFormat<T>[];
  /**
   * Merges vertically adjacent cells with equal values into one cell
   * (`aria-rowspan`). Not applied while the grid is virtualized.
   */
  mergeCells?: boolean;
  /** Renders the cell's editor — the React form of `*ogeEditTemplate`. */
  renderEditor?: (context: OgeGridEditorRenderContext<T>) => ReactNode;
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

/**
 * Emitted on data-row right-click. Push items to open the grid's own menu at
 * the pointer; leave it empty and the browser's native menu is left alone.
 */
export interface OgeContextMenuEvent<T = unknown> {
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
 * Emitted on header right-click with the built-in items (sort / group / pin /
 * hide) prebuilt — add, remove or reorder them before the menu opens.
 */
export interface OgeHeaderContextMenuEvent {
  field: string;
  caption: string;
  clientX: number;
  clientY: number;
  items: OgeMenuItem[];
  source: OgeContextMenuSource;
  event: React.MouseEvent | React.KeyboardEvent;
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
  /**
   * What happens to columns responsive hiding (`hidingPriority`) takes out on
   * a narrow grid: `'detail'` gives every row an expand button revealing the
   * hidden columns' caption / value pairs (formatted like the cells,
   * `renderCell` included); `'hide'` drops them. `undefined` = provider
   * default (`'detail'`).
   */
  columnHidingMode?: OgeGridColumnHidingMode;
  /** Per-column filter editors below the header. */
  filterRow?: boolean | OgeFilterRowOptions;
  /** Excel-style distinct-value filter button in the headers. */
  headerFilter?: boolean | OgeHeaderFilterOptions;
  /** Toolbar button opening the show/hide (and reorder) column list. */
  columnChooser?: boolean;
  /**
   * Your own toolbar content, by group — the React form of Angular's
   * `[ogeToolbar]="'before' | 'center' | 'after'"`. `toolbarBefore` sits at
   * the start edge ahead of the group panel (filters, primary actions),
   * `toolbarCenter` in the middle, `toolbarAfter` ahead of the built-in tools.
   * Any of them makes the toolbar render.
   */
  toolbarBefore?: ReactNode;
  toolbarCenter?: ReactNode;
  toolbarAfter?: ReactNode;
  /** Filter summary bar above the grid, opening the visual filter builder. */
  filterPanel?: boolean;
  /**
   * The filter-builder expression — controlled when provided. Combines with
   * the filter row, the header filters and the search panel.
   */
  filterValue?: FilterExpr | null;
  /** Uncontrolled initial filter-builder expression. */
  defaultFilterValue?: FilterExpr | null;
  onFilterValueChange?: (value: FilterExpr | null) => void;
  /** Briefly flashes cells whose value changed under a live-updating source. */
  highlightChanges?: boolean;
  /** Global search box above the grid. */
  searchPanel?: boolean | OgeSearchPanelOptions;
  /** Debounce for text filter inputs, in ms. Set to 0 in tests. */
  filterDebounce?: number;
  /**
   * Speaks sort, filter/search result count, page, group expansion,
   * select-all and blocked-save validation changes through the shared live
   * announcer (`useOgeLiveAnnouncer`, texts from `messages`). `undefined`
   * falls back to the config's `announcements` (default `true`).
   */
  announcements?: boolean;
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
  /**
   * Selection: none | single | multiple (ctrl/shift) | checkbox column |
   * `cell` — rectangular cell ranges with TSV copy / paste and the fill handle.
   */
  selectionMode?: OgeGridSelectionMode;
  /** Options of cell range selection (`selectionMode: 'cell'`). */
  rangeSelection?: OgeRangeSelectionOptions;
  /** The selected cell ranges — controlled when provided. */
  selectedRanges?: readonly OgeGridCellRange[];
  /** Uncontrolled initial cell ranges. */
  defaultSelectedRanges?: readonly OgeGridCellRange[];
  onSelectedRangesChange?: (ranges: readonly OgeGridCellRange[]) => void;
  /** Fires after the selected cell ranges changed, with their sizes. */
  onRangeSelectionChanged?: (event: OgeRangeSelectionChangedEvent) => void;
  /** Classes for a data row: string, array or `{ class: condition }` record. */
  rowClass?: (row: T, key: RowKey) => OgeClassValue;
  /** Classes for a data cell, per row and column. */
  cellClass?: (row: T, column: OgeGridColumnInfo) => OgeClassValue;
  /**
   * Fires for every data row element that renders a row for the first time —
   * the imperative escape hatch for decoration the hooks cannot express.
   */
  onRowPrepared?: (event: OgeRowPreparedEvent<T>) => void;
  /** Fires for every data cell of a prepared row. */
  onCellPrepared?: (event: OgeCellPreparedEvent<T>) => void;
  /**
   * Rows pinned above the scrolling body: data objects, or keys of loaded rows
   * (which then leave the body). Display rows — not editable, not selectable,
   * not part of the arrow-key navigation; virtual scrolling compatible.
   */
  pinnedTopRows?: readonly (T | RowKey)[];
  /** Rows pinned below the body, above the total row. */
  pinnedBottomRows?: readonly (T | RowKey)[];
  /**
   * Keeps the group rows enclosing the first visible row under the header
   * while scrolling — a visual aid; clicking one scrolls to it.
   */
  stickyGroupRows?: boolean;
  /**
   * Row / column spans per cell. Spans never cross group rows; the owner cell
   * gets `aria-rowspan` / `aria-colspan` and the keyboard steps over the
   * covered area. Ignored while virtualized; row spans assume uniform heights.
   */
  cellSpan?: (
    row: T,
    column: OgeGridColumnInfo,
  ) => OgeGridCellSpan | null | undefined;
  /** Sizes every column to its content once the first result set rendered. */
  columnAutoWidth?: boolean;
  /** Shows truncated cell text in a tooltip on hover and on keyboard focus. */
  cellHintEnabled?: boolean;
  /**
   * Grids (and other components) sharing a group name accept each other's
   * dragged rows; the target grid's `onRowDrop` carries the source row.
   */
  rowDragGroup?: string;
  /** A drop on the middle of a row means "inside" it. */
  allowDropInsideRow?: boolean;
  /** Cancelable: a row drag is about to start. */
  onRowDragStart?: (event: OgeRowDragStartEvent<T>) => void;
  /** Cancelable: a dragged row of the group hovers this grid. */
  onRowDragOver?: (event: OgeRowDragOverEvent) => void;
  /** A row was dropped on this grid — its own (reorder) or another component's. */
  onRowDrop?: (event: OgeRowDropEvent) => void;
  /** The source side of a drag ended. */
  onRowDragEnd?: (event: OgeRowDragEndEvent<T>) => void;
  /** Renders the pager's info text instead of `{count} rows`. */
  renderPagerInfo?: (context: OgePagerInfoContext) => ReactNode;
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
  /**
   * Deferred selection: the selection is an expression rather than a key set,
   * so "select all" over a remote source never materializes keys.
   */
  selectionDeferred?: boolean;
  /** The selection expression — controlled when provided (deferred mode). */
  selectionFilter?: FilterExpr | null;
  onSelectionFilterChange?: (filter: FilterExpr | null) => void;
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
  /**
   * Enables editing: `{ mode: 'cell' | 'row' | 'batch' | 'popup' | 'form',
   * allowUpdating, allowAdding, allowDeleting, confirmDelete, formItems,
   * formColCount }`. `false` (default) disables it.
   */
  editing?: false | OgeEditingOptions;
  /**
   * Customizes the trailing command column: reorder or mix the built-in
   * `'edit'` / `'delete'` buttons with your own. Omitted, the column shows the
   * built-ins the `editing` permissions allow.
   */
  commandButtons?: readonly OgeCommandButton<T>[];
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
  /** Host element id — also the component id row-drag events report. */
  id?: string;
  /** Accessible name of the grid. */
  ariaLabel?: string;

  onRowClick?: (event: OgeRowClickEvent<T>) => void;
  /** Fires when a data row is double-clicked. */
  onRowDblClick?: (event: OgeRowClickEvent<T>) => void;
  /** Fires when a data cell is clicked. */
  onCellClick?: (event: OgeCellClickEvent<T>) => void;
  /** Fires when a data cell is double-clicked. */
  onCellDblClick?: (event: OgeCellClickEvent<T>) => void;
  /** Right-click on a data row — push items to open the grid's menu. */
  onRowContextMenu?: (event: OgeContextMenuEvent<T>) => void;
  /** Customize (or extend) the built-in header context menu per column. */
  onHeaderContextMenu?: (event: OgeHeaderContextMenuEvent) => void;
  /** Fires after a row is dropped in a new position. */
  onRowReordered?: (event: OgeRowReorderedEvent<T>) => void;
  /** Fires after the grid has rendered a new result set. */
  onContentReady?: () => void;
  /** Fires after the selection changed, with `addedKeys`/`removedKeys` diffs. */
  onSelectionChanged?: (event: OgeSelectionChangedEvent) => void;
  /** Fires after the focused row changed (`focusedRowEnabled` or key writes). */
  onFocusedRowChanged?: (event: OgeFocusedRowChangedEvent<T>) => void;
  /** Fires after keyboard/pointer focus moved to another cell. */
  onFocusedCellChanged?: (event: OgeFocusedCellChangedEvent<T>) => void;
  /** Fires as soon as the sort changed — no debounce, unlike `onStateChange`. */
  onSortChanged?: (event: OgeSortChangedEvent) => void;
  /** Fires after the page index or page size changed. */
  onPageChanged?: (event: OgePageChangedEvent) => void;
  /** Fires before a group or master-detail row expands; set `cancel` to veto. */
  onRowExpanding?: (event: OgeGridRowTogglingEvent<T>) => void;
  /** Fires after a group or master-detail row expanded. */
  onRowExpanded?: (event: OgeGridRowToggleEvent<T>) => void;
  /** Fires before a group or master-detail row collapses; set `cancel` to veto. */
  onRowCollapsing?: (event: OgeGridRowTogglingEvent<T>) => void;
  /** Fires after a group or master-detail row collapsed. */
  onRowCollapsed?: (event: OgeGridRowToggleEvent<T>) => void;
  /** Fires when a DataSource load fails. */
  onDataErrorOccurred?: (event: OgeDataErrorEvent) => void;
  /** Cancelable: fires before a row or cell editor opens. */
  onEditingStart?: (event: OgeEditingStartEvent<T>) => void;
  /** Fires when `addRow()` created a draft row — values written here stage onto it. */
  onInitNewRow?: (event: OgeInitNewRowEvent) => void;
  /** Cancelable: fires before an added row reaches the DataSource. */
  onRowInserting?: (event: OgeRowInsertingEvent) => void;
  onRowInserted?: (event: OgeRowInsertedEvent) => void;
  /** Cancelable: fires before an edited row reaches the DataSource. */
  onRowUpdating?: (event: OgeRowUpdatingEvent<T>) => void;
  onRowUpdated?: (event: OgeRowUpdatedEvent) => void;
  /** Cancelable: fires before a row is removed. */
  onRowRemoving?: (event: OgeRowRemovingEvent<T>) => void;
  onRowRemoved?: (event: OgeRowRemovedEvent) => void;
  /** Cancelable: fires before a save batch reaches the DataSource. */
  onSavingChanges?: (event: OgeSavingChangesEvent<T>) => void;
  onSavedChanges?: (event: OgeSavedChangesEvent<T>) => void;
  /** Fires after an edit session ended without saving. */
  onEditCanceled?: () => void;
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
  /**
   * Opens the column chooser below `anchor` — e.g. a button in your own header
   * bar, with `columnChooser` off. Without one it opens below the toolbar's
   * chooser button, or the grid's edge.
   */
  showColumnChooser(anchor?: HTMLElement): void;
  /** Closes the column chooser if it is open. */
  hideColumnChooser(): void;
  /**
   * The raw value of a total summary by field (and type, when a column has
   * several); `undefined` when none is configured or nothing has loaded.
   */
  getTotalSummaryValue(field: string, type?: SummaryType): unknown;
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
  exportCsv(
    filename?: string,
    options?: CsvOptions & OgeExportOptions<T>,
  ): Promise<void>;
  /** Copies the selected rows (with a header) — or the focused cell's text — as TSV. */
  copyToClipboard(): Promise<void>;
  /** Adds an empty draft row on top; requires `editing.allowAdding`. */
  addRow(): void;
  /** Opens the row editor for `key` (`row`/`form`/`popup` modes); requires `editing.allowUpdating`. */
  editRow(key: RowKey): void;
  /** Marks the row removed in batch mode, deletes it immediately otherwise; requires `editing.allowDeleting`. */
  deleteRow(key: RowKey): void;
  /** Commits the open editor and saves every pending change. */
  saveChanges(): void;
  /** Drops every pending change and closes the editor. */
  discardChanges(): void;
  /** Whether any change is waiting to be saved. */
  hasChanges(): boolean;
  /** Selects a rectangular cell range (`add` keeps the existing ones). */
  selectRange(range: OgeGridCellRange, add?: boolean): void;
  /** Clears every cell range. */
  clearRangeSelection(): void;
  /** The selected cells' values as a rows × columns matrix. */
  getSelectedRangeData(): unknown[][];
  /**
   * Pastes a TSV block into the editable cells from the focused cell — one
   * undoable batch through the regular edit events. Resolves with the cells written.
   */
  pasteText(text: string): Promise<number>;
  /** Ctrl+D: copies the range's first row into its other rows. */
  fillDown(): Promise<number>;
  /** Ctrl+R: copies the range's first column into its other columns. */
  fillRight(): Promise<number>;
  /** Reverts the last edit, paste or fill (Ctrl+Z). */
  undo(): Promise<void>;
  /** Re-applies the last undone step (Ctrl+Y). */
  redo(): Promise<void>;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Sizes a column to its header and rendered cells. */
  autoFitColumn(field: string): void;
  /** `autoFitColumn()` for every visible column. */
  autoFitColumns(): void;
}
