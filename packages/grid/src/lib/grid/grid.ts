import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  type TemplateRef,
} from '@angular/core';
import {
  ArrayDataSource,
  buildCsv,
  createFilterPredicate,
  flattenGroupedData,
  buildSearchHighlightSegments,
  type SearchHighlightSegment,
  groupNodeKey,
  resolveKeySelector,
  type CsvOptions,
  type GridStateSnapshot,
  type GroupedItem,
  type DataRowNode,
  type DataSource,
  type FilterExpr,
  type FilterOperator,
  groupKeyFilter,
  type GroupInterval,
  type GroupRowNode,
  type RowKey,
  type RowNode,
  type SortDescriptor,
  type SummaryDescriptor,
  type SummaryRowNode,
  type SummaryType,
  sanitizeGridStateSnapshot,
} from '@oge-ui/core';
import {
  OgeGridAnnouncements,
  allRowsSelected,
  deferredToggleExpr,
  keyEqualsExpr,
  resizedColumnWidth,
  rowClickSelectionIntent,
  clampColumnWidth,
  ogeAdjacentDataRow,
  ogeChooserMoveDirection,
  ogeColumnMoveTarget,
  ogeColumnSeparatorKeyCommand,
  ogeColumnWidthBounds,
  ogeGridHeaderKeyCommand,
  ogeGridHeaderKeyShortcuts,
  ogeGroupChipKeyCommand,
  ogeListMoveTarget,
  ogeRowMoveDirection,
  ogeSeparatorTargetWidth,
  type OgeColumnWidthBounds,
  type OgeGridColumnHidingMode,
} from '@oge-ui/behavior';
import {
  OgeContextMenuEcho,
  dateRangeFilterExpr,
  isOgeContextMenuKey,
  ogeContextMenuKeyTarget,
} from '@oge-ui/behavior';
import {
  effectiveFilterOperator,
  filterOperatorSymbol,
  filterRowOperatorChoices,
  rowFilterExpr,
} from '@oge-ui/behavior';
import {
  allHeaderValuesSelected,
  booleanCellLabel,
  filterHeaderValues,
  headerGroupState,
  headerValueText,
  headerYearLabel,
  isHeaderValueSelected,
  toggleAllHeaderValues as toggleAllHeaderValueSelection,
  toggleHeaderGroup as toggleHeaderGroupSelection,
  toggleHeaderValue as toggleHeaderValueSelection,
} from '@oge-ui/behavior';
import {
  OGE_GRID_HOST_SELECTOR,
  OGE_NO_SPANS,
  OGE_TOOLTIP_PANEL_OPTIONS,
  OgeGridRangeSelectionCore,
  OgePreparedTracker,
  OgeTooltipCore,
  buildOgeRangeTsv,
  computeOgeGridSpans,
  emptyHeaderConditionFilter,
  findOgeRowDragParticipant,
  flattenHeaderDateTree,
  groupHeaderValuesByDate,
  headerConditionExpr,
  headerConditionNeedsValue,
  headerConditionOperators,
  isOgeDateType,
  isOgeRangeExtendKey,
  ogeClassList,
  ogeColumnValueRange,
  ogeFillSeries,
  ogeFillTarget,
  ogeFirstVisibleRow,
  ogeFormatsNeedRange,
  ogeGridEditShortcut,
  ogeGroupValueText,
  ogeHeaderConditionKey,
  ogeIsTextTruncated,
  ogeKeyboardFillPlan,
  ogeMeasureAutoWidth,
  ogeOwnedClosest,
  ogeRangeAnnouncementCounts,
  ogeRangeBounds,
  ogeRangeLattice,
  ogeRowDropPosition,
  ogeStickyGroupChain,
  ogeValueFits,
  parseHeaderConditionExpr,
  parseOgeCellText,
  parseOgeTsv,
  planOgeGridPaste,
  registerOgeRowDragParticipant,
  resolveOgeConditionalFormat,
  tooltipDescribedByTarget,
  type OgeCellPreparedEvent,
  type OgeClassValue,
  type OgeConditionalCellFormat,
  type OgeConditionalRange,
  type OgeFillPlan,
  type OgeGridCellCoord,
  type OgeGridCellRange,
  type OgeGridCellSpan,
  type OgeGridCellValueWrite,
  type OgeGridColumnInfo,
  type OgeGridRangeBounds,
  type OgeGridRangeEdges,
  type OgeGridSpanExtent,
  type OgeGridSpanLayout,
  type OgeHeaderCondition,
  type OgeHeaderConditionFilter,
  type OgeHeaderDateNode,
  type OgeHeaderFilterMode,
  type OgeRangeSelectionChangedEvent,
  type OgeRangeSelectionOptions,
  type OgeRowDragEndEvent,
  type OgeRowDragOverEvent,
  type OgeRowDragSource,
  type OgeRowDragStartEvent,
  type OgeRowDragTarget,
  type OgeRowDropEvent,
  type OgeRowDropPosition,
  type OgeRowPreparedEvent,
} from '@oge-ui/behavior';
import {
  beginPointerDragDrop,
  isOgeDragExcludedTarget,
  ogeMoveGroupingTo,
  resolveOgeAttributeTarget,
  resolveOgeHeaderDropTarget,
  resolveOgeRowDropIndex,
  type OgeGridHeaderDropTarget,
} from '@oge-ui/behavior';
import {
  CHECKBOX_WIDTH,
  COMMAND_WIDTH,
  ColumnLayoutModel,
  ColumnModel,
  DeferredChildrenLoader,
  EditingModel,
  KeyboardNavModel,
  RowVirtualizerModel,
  DRAG_WIDTH,
  EXPANDER_WIDTH,
  dateFilterExpr,
  humanize,
  isDataSource,
  lookupTextOf,
  type LookupItem,
  type OgeEditingOptions,
  type OgeEditingStartEvent,
  type OgeRowInsertedEvent,
  type OgeRowInsertingEvent,
  type OgeRowRemovedEvent,
  type OgeRowRemovingEvent,
  type OgeRowUpdatedEvent,
  type OgeRowUpdatingEvent,
  type OgeSavedChangesEvent,
  type OgeSavingChangesEvent,
  type PendingChildRequest,
  type ResolvedColumn as FoundationResolvedColumn,
  OGE_STATE_STORAGE,
  createStatePersistence,
} from '@oge-ui/grid/foundation';
import { OgeColumn } from '../columns/column';
import { OgeColumnDefCache, type OgeColumnDef } from '../columns/column-def';
import { OgeColumnGroup } from '../columns/column-group';
import { formatCellValue } from '../columns/value-format';
import {
  OGE_GRID_CONFIG,
  formatPattern,
  type OgeGridMessages,
} from '../config';
import { GridDataAdapter, WINDOW_BLOCK_SIZE } from '../data/grid-data-adapter';
import {
  OgeFilterBuilderGroup,
  builderToExpr,
  describeExpr,
  exprToBuilder,
  operatorsFor,
  type OgeBuilderGroup,
  type OgeFilterBuilderField,
} from '../filter-builder/filter-builder';
import { OgeCheckBox } from '@oge-ui/inputs/check-box';
import { OgeDateBox, OgeDateRangeBox } from '@oge-ui/inputs/date-box';
import { OgeNumberBox } from '@oge-ui/inputs/number-box';
import { OgeSelectBox } from '@oge-ui/inputs/select-box';
import { OgeTextBox } from '@oge-ui/inputs/text-box';
import {
  OGE_OVERLAY_CONFIG,
  OgeAnchoredPanel,
  OgeLiveAnnouncer,
  OgeMenuList,
  OgeModal,
  OgeModalFooter,
  OgePopup,
  type OgeMenuItem,
  type OgeMenuListItemClickEvent,
} from '@oge-ui/overlay';
import { OgeForm, type OgeFormItemData } from '@oge-ui/forms';
import { OgeCellEditor } from '../editing/cell-editor';
import { OgePager } from '../pager/pager';
import { GridStateStore } from '../state/grid-state.store';
import { SIGNAL_ADAPTER } from '../state/signal-adapter';
import { OgePagerInfoTemplate } from '../templates/pager-info-template';
import type { OgeSelectionMode } from '../state/selection-slice';
import type { OgeEditTemplateContext } from '../templates/edit-template';
import type { OgeCellTemplateContext } from '../templates/cell-template';
import {
  OgeDetailTemplate,
  type OgeDetailTemplateContext,
} from '../templates/detail-template';
import { OgeNoDataTemplate } from '../templates/no-data-template';
import { OgeRowTemplate } from '../templates/row-template';
import { OgeToolbar } from '@oge-ui/layout/toolbar';
import { OgeGridToolbarItem } from '../templates/toolbar-item';
import type { OgeHeaderTemplateContext } from '../templates/header-template';

// The option objects and framework-free event payloads are single-sourced in
// `@oge-ui/behavior` (the React grid accepts the very same types); re-exported
// so `@oge-ui/grid` consumers are unaffected.
export type {
  OgeContextMenuSource,
  OgeDataErrorEvent,
  OgeExportCellArgs,
  OgeExportColumn,
  OgeExportData,
  OgeExportOptions,
  OgeExportingEvent,
  OgeFilterRowOptions,
  OgeFocusedCellChangedEvent,
  OgeFocusedRowChangedEvent,
  OgeGridRowToggleEvent,
  OgeGridRowTogglingEvent,
  OgeGridToggleKind,
  OgePageChangedEvent,
  OgeSortChangedEvent,
  OgeGroupingOptions,
  OgeHeaderFilterOptions,
  OgePagingOptions,
  OgeRowReorderedEvent,
  OgeScrollingOptions,
  OgeSearchPanelOptions,
  OgeSelectionChangedEvent,
  OgeSortingOptions,
  OgeRangeSelectionOptions,
  OgeRangeSelectionChangedEvent,
  OgeGridCellRange,
  OgeGridCellCoord,
  OgeRowPreparedEvent,
  OgeCellPreparedEvent,
  OgeGridColumnInfo,
  OgeClassValue,
  OgeConditionalFormat,
  OgeGridCellSpan,
  OgeRowDragStartEvent,
  OgeRowDragOverEvent,
  OgeRowDropEvent,
  OgeRowDragEndEvent,
  OgeRowDropPosition,
  OgeHeaderFilterMode,
} from '@oge-ui/behavior';
import type {
  OgeContextMenuSource,
  OgeDataErrorEvent,
  OgeExportColumn,
  OgeExportData,
  OgeExportOptions,
  OgeExportingEvent,
  OgeFilterRowOptions,
  OgeFocusedCellChangedEvent,
  OgeFocusedRowChangedEvent,
  OgeGridRowToggleEvent,
  OgeGridRowTogglingEvent,
  OgeGridToggleKind,
  OgePageChangedEvent,
  OgeSortChangedEvent,
  OgeGroupingOptions,
  OgeHeaderFilterOptions,
  OgePagingOptions,
  OgeRowReorderedEvent,
  OgeScrollingOptions,
  OgeSearchPanelOptions,
  OgeSelectionChangedEvent,
  OgeSortingOptions,
} from '@oge-ui/behavior';

/** Same fields in the same order with the same directions. */
function sameSort(
  a: readonly SortDescriptor[],
  b: readonly SortDescriptor[],
): boolean {
  return (
    a.length === b.length &&
    a.every((d, i) => d.field === b[i].field && d.dir === b[i].dir)
  );
}

export type { OgeColumnDef } from '../columns/column-def';

export interface OgeRowClickEvent<T = unknown> {
  row: T;
  key: RowKey;
  event: MouseEvent;
}

/** One button of the command column (`commandButtons` input). */
export interface OgeCommandButton<T = unknown> {
  /** Built-in behavior; omit for custom buttons. */
  name?: 'edit' | 'delete';
  /** Label for custom buttons (also the accessible name). */
  text?: string;
  onClick?: (row: T, key: RowKey) => void;
  /** Per-row visibility. */
  visible?: (row: T) => boolean;
}

export interface OgeCellClickEvent<T = unknown> {
  row: T;
  key: RowKey;
  field: string | undefined;
  value: unknown;
  event: Event;
}

// OgeMenuItem now comes from @oge-ui/overlay (the canonical menu item shape) —
// the legacy grid-local `{ text, disabled?, action? }` interface was a strict
// subset, so existing handlers keep working. Re-exported from the barrel.

/**
 * Emitted on row right-click — and on the Menu key / Shift+F10 in a focused
 * cell; push into `items` to open the built-in menu.
 */
export interface OgeContextMenuEvent<T = unknown> {
  row: T;
  key: RowKey;
  /** Where the menu opens: the pointer, or the focused cell's start/bottom corner. */
  clientX: number;
  clientY: number;
  items: OgeMenuItem[];
  source: OgeContextMenuSource;
  /** The originating event — call `preventDefault()` to veto the native menu yourself. */
  event: MouseEvent | KeyboardEvent;
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
  event: MouseEvent | KeyboardEvent;
}

// Save-flow types moved to the foundation entry with the editing model;
// re-exported so `@oge-ui/grid` consumers are unaffected.
export {
  type OgeDataChange,
  type OgeEditingStartEvent,
  type OgeRowInsertedEvent,
  type OgeRowInsertingEvent,
  type OgeRowRemovedEvent,
  type OgeRowRemovingEvent,
  type OgeRowUpdatedEvent,
  type OgeRowUpdatingEvent,
  type OgeSavedChangesEvent,
  type OgeSavingChangesEvent,
} from '@oge-ui/grid/foundation';

/** Prefill hook for `addRow()`: values written here stage onto the new row. */
export interface OgeInitNewRowEvent {
  key: RowKey;
  values: Record<string, unknown>;
}

/** Grid-side view of the shared column view-model: `source` is the OgeColumn. */
type ResolvedColumn<T = unknown> = FoundationResolvedColumn<T, OgeColumn<T>>;

let nextUid = 0;

/** The resolved format of a cell without `conditionalFormats`. */
const NO_FORMAT: OgeConditionalCellFormat = Object.freeze({
  classes: [],
  vars: {},
  icon: null,
  iconSet: null,
}) as OgeConditionalCellFormat;

@Component({
  selector: 'oge-grid',
  imports: [
    NgTemplateOutlet,
    OgePager,
    ReactiveFormsModule,
    OgeFilterBuilderGroup,
    OgeCellEditor,
    OgeForm,
    OgeCheckBox,
    OgeDateBox,
    OgeDateRangeBox,
    OgeSelectBox,
    OgeTextBox,
    OgeNumberBox,
    OgePopup,
    OgeMenuList,
    OgeModal,
    OgeModalFooter,
    OgeToolbar,
  ],
  providers: [GridStateStore, GridDataAdapter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './grid.html',
  styleUrl: './grid.scss',
  host: {
    class: 'oge-grid',
    '[class.oge-virtual]': 'virtualized()',
    '[class.oge-loading]':
      'adapter.loading() || customLoadingMessage() !== null',
    '[class.oge-wrap]': 'wordWrap()',
    '[class.oge-rtl]': 'rtl()',
    '[attr.dir]':
      "rtlEnabled() === undefined ? null : rtlEnabled() ? 'rtl' : 'ltr'",
    '(document:keydown.escape)': 'closePopups()',
  },
})
export class OgeGrid<T extends object = Record<string, unknown>> {
  /**
   * Instance id prefix: a header is labelled by its caption alone
   * (`aria-labelledby`), not by the separator / filter button inside it.
   */
  protected readonly uid = `oge-grid-${nextUid++}`;

  protected readonly store = inject(GridStateStore);
  protected readonly adapter: GridDataAdapter<T> = inject(GridDataAdapter);
  private readonly config = inject(OGE_GRID_CONFIG);
  private readonly stateStorage = inject(OGE_STATE_STORAGE);

  /** Rows to render: a static array or any DataSource implementation. */
  readonly data = input<readonly T[] | DataSource<T>>([]);

  /**
   * Programmatic columns — field names or full `OgeColumnDef` objects with
   * every `<oge-column>` option (the way to share columns through a wrapper
   * component). Used only when no declarative `<oge-column>` children exist;
   * when both are absent, columns are derived from the first row's keys.
   */
  readonly columns = input<readonly (string | OgeColumnDef<T>)[] | undefined>(
    undefined,
  );

  /** Field (or selector) producing a stable row key; falls back to the row index. */
  readonly keyField = input<keyof T | ((row: T) => RowKey) | undefined>(
    undefined,
  );

  /** `false` disables sorting entirely; `'single'` restricts to one column (no shift+click chains). */
  readonly sortable = input<boolean | 'single' | 'multi'>('multi');

  /** Sorting options; overrides the `sortable` shorthand. */
  readonly sorting = input<OgeSortingOptions | undefined>(undefined);

  readonly paging = input<false | OgePagingOptions>(false);

  /**
   * Renders only the rows inside the scroll viewport (plus overscan).
   * Give the grid a bounded height (e.g. `style="height: 600px"`) when enabled.
   */
  readonly virtualScroll = input(false);

  /** Scrolling options; overrides the `virtualScroll` shorthand. */
  readonly scrolling = input<OgeScrollingOptions | undefined>(undefined);

  protected readonly effScrolling = computed<{
    mode: 'standard' | 'virtual' | 'infinite';
    remote: boolean;
  }>(() => {
    const options = this.scrolling();
    const mode =
      options?.mode ?? (this.virtualScroll() ? 'virtual' : 'standard');
    return { mode, remote: options?.remote ?? mode === 'infinite' };
  });

  /** Virtualized rendering active (virtual or infinite). */
  protected readonly virtualized = computed(
    () => this.effScrolling().mode !== 'standard',
  );

  /** Sparse block-fetching active. */
  protected readonly windowed = computed(
    () => this.virtualized() && this.effScrolling().remote,
  );

  /** Fixed row height in px used by the virtualizer. Defaults from global config. */
  readonly rowHeight = input<number | undefined>(undefined);

  /**
   * Measures real row heights (wrapped text, templates) instead of forcing
   * `rowHeight`, with scroll anchoring when heights above the viewport settle.
   * Virtual mode only; ignored in windowed (remote) mode.
   */
  readonly autoRowHeight = input(false);

  /** Height assumed for expanded master-detail rows in virtual mode. */
  readonly detailRowHeight = input<number | undefined>(undefined);

  /** Extra rows rendered above/below the virtual window. */
  readonly overscan = input<number | undefined>(undefined);

  /** Track minimum for columns without an explicit width. */
  readonly columnMinWidth = input<number | undefined>(undefined);

  /**
   * What happens to columns responsive hiding (`hidingPriority`) takes out on
   * a narrow grid: `'detail'` gives every row an expand button revealing the
   * hidden columns' caption / value pairs (formatted like the cells, cell
   * templates included); `'hide'` drops them. `undefined` = config default
   * (`'detail'`).
   */
  readonly columnHidingMode = input<OgeGridColumnHidingMode | undefined>(
    undefined,
  );

  /** Per-column filter editors below the header. */
  readonly filterRow = input<boolean | OgeFilterRowOptions>(false);

  /** Excel-style distinct-value filter button in headers. */
  readonly headerFilter = input<boolean | OgeHeaderFilterOptions>(false);

  /** Global search box above the grid. */
  readonly searchPanel = input<boolean | OgeSearchPanelOptions>(false);

  /** Per-grid overrides of the UI strings (see `provideOgeGridConfig` for app-wide). */
  readonly messages = input<Partial<OgeGridMessages> | undefined>(undefined);

  /**
   * Persists user state (sort, filters, grouping, column layout, page size)
   * under this key via `OGE_STATE_STORAGE` (default: localStorage) and
   * restores it on startup.
   */
  readonly stateKey = input<string | undefined>(undefined);

  /** Shows the filter panel bar with the filter-builder entry point. */
  readonly filterPanel = input(false);

  /** Two-way binding of the builder/programmatic filter expression. */
  readonly filterValue = model<FilterExpr | null>(null);

  /** Shows the drop area for drag-and-drop row grouping. */
  readonly groupPanel = input(false);

  /** Initial/programmatic grouping by field names (also drivable via the group panel). */
  readonly groupBy = input<readonly string[] | undefined>(undefined);

  /** Grouping options (`autoExpandAll`, deferred loading). */
  readonly grouping = input<OgeGroupingOptions | undefined>(undefined);

  /** Shows the column visibility chooser button. */
  readonly columnChooser = input(false);

  /** Enables drag-resize handles on header edges. */
  readonly columnResize = input(true);

  /** Enables drag-and-drop column reordering. */
  readonly columnReorder = input(true);

  /** Debounce for text filter inputs, in ms. Set to 0 in tests. */
  readonly filterDebounce = input<number | undefined>(undefined);

  // --- effective options (input → option object → global config) -----------

  protected readonly msg = computed<OgeGridMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly effRowHeight = computed(
    () => this.rowHeight() ?? this.config.rowHeight,
  );

  protected readonly effDetailRowHeight = computed(
    () => this.detailRowHeight() ?? this.config.detailRowHeight,
  );

  private readonly effOverscan = computed(
    () => this.overscan() ?? this.config.overscan,
  );

  protected readonly filterRowVisible = computed(() => {
    const value = this.filterRow();
    return typeof value === 'boolean' ? value : value.visible !== false;
  });

  private readonly effFilterDebounce = computed(() => {
    const row = this.filterRow();
    const fromOptions = typeof row === 'object' ? row.debounce : undefined;
    return fromOptions ?? this.filterDebounce() ?? this.config.filterDebounce;
  });

  protected readonly headerFilterVisible = computed(() => {
    const value = this.headerFilter();
    return typeof value === 'boolean' ? value : value.visible !== false;
  });

  private readonly effHeaderFilterLimit = computed(() => {
    const value = this.headerFilter();
    return (
      (typeof value === 'object' ? value.valueLimit : undefined) ??
      this.config.headerFilterValueLimit
    );
  });

  protected readonly searchPanelVisible = computed(() => {
    const value = this.searchPanel();
    return typeof value === 'boolean' ? value : value.visible !== false;
  });

  protected readonly searchPanelOptions = computed<OgeSearchPanelOptions>(
    () => {
      const value = this.searchPanel();
      return typeof value === 'object' ? value : {};
    },
  );

  protected readonly sortMode = computed<'none' | 'single' | 'multi'>(() => {
    const explicit = this.sorting()?.mode;
    if (explicit) return explicit;
    const shorthand = this.sortable();
    if (shorthand === false) return 'none';
    return shorthand === true ? 'multi' : shorthand;
  });

  private readonly allowUnsorting = computed(
    () => this.sorting()?.allowUnsorting ?? this.config.allowUnsorting,
  );

  protected readonly pagingOptions = computed<OgePagingOptions | null>(() => {
    const value = this.paging();
    return value === false ? null : value;
  });

  /** Row selection: none | single | multiple (ctrl/shift) | checkbox column. */
  readonly selectionMode = input<OgeSelectionMode>('none');

  /** Two-way binding of the selected row keys. */
  readonly selectedKeys = model<RowKey[]>([]);

  readonly rowClick = output<OgeRowClickEvent<T>>();

  /** Fires on row right-click; add `items` in the handler to open the built-in menu. */
  readonly rowContextMenu = output<OgeContextMenuEvent<T>>();
  /** Customize (or extend) the built-in header context menu per column. */
  readonly headerContextMenu = output<OgeHeaderContextMenuEvent>();

  /** Fires when a data cell is clicked. */
  readonly cellClick = output<OgeCellClickEvent<T>>();

  /** Fires when a data row is double-clicked. */
  readonly rowDblClick = output<OgeRowClickEvent<T>>();

  /** Fires when a data cell is double-clicked. */
  readonly cellDblClick = output<OgeCellClickEvent<T>>();

  /** Fires after the grid has rendered a new result set. */
  readonly contentReady = output<void>();

  /** Fires after the selection changed, with `addedKeys`/`removedKeys` diffs. */
  readonly selectionChanged = output<OgeSelectionChangedEvent>();

  /** Fires after the focused row changed (`focusedRowEnabled` or key writes). */
  readonly focusedRowChanged = output<OgeFocusedRowChangedEvent<T>>();

  /** Fires after keyboard/pointer focus moved to another cell. */
  readonly focusedCellChanged = output<OgeFocusedCellChangedEvent<T>>();

  /** Fires as soon as the sort changed — no debounce, unlike `stateChange`. */
  readonly sortChanged = output<OgeSortChangedEvent>();

  /** Fires after the page index or page size changed. */
  readonly pageChanged = output<OgePageChangedEvent>();

  /** Fires before a group or master-detail row expands; set `cancel` to veto. */
  readonly rowExpanding = output<OgeGridRowTogglingEvent<T>>();
  /** Fires after a group or master-detail row expanded. */
  readonly rowExpanded = output<OgeGridRowToggleEvent<T>>();
  /** Fires before a group or master-detail row collapses; set `cancel` to veto. */
  readonly rowCollapsing = output<OgeGridRowTogglingEvent<T>>();
  /** Fires after a group or master-detail row collapsed. */
  readonly rowCollapsed = output<OgeGridRowToggleEvent<T>>();

  /** Fires when a DataSource load or save fails. */
  readonly dataErrorOccurred = output<OgeDataErrorEvent>();

  /** Enables editing: `{ mode: 'cell' | 'row' | 'batch' | 'popup' | 'form', allow… }`. */
  readonly editing = input<false | OgeEditingOptions>(false);

  /** Fires before changes reach the DataSource; cancelable. */
  readonly savingChanges = output<OgeSavingChangesEvent<T>>();

  /** Fires after a save batch was applied (only the non-canceled changes). */
  readonly savedChanges = output<OgeSavedChangesEvent<T>>();

  /** Cancelable: fires before a cell or row editor opens. */
  readonly editingStart = output<OgeEditingStartEvent<T>>();

  /** Prefill new rows created by `addRow()` before their editors open. */
  readonly initNewRow = output<OgeInitNewRowEvent>();

  /** Cancelable: fires before a new row is inserted into the DataSource. */
  readonly rowInserting = output<OgeRowInsertingEvent>();

  /** Fires after a new row was inserted into the DataSource. */
  readonly rowInserted = output<OgeRowInsertedEvent>();

  /** Cancelable: fires before a row update reaches the DataSource. */
  readonly rowUpdating = output<OgeRowUpdatingEvent<T>>();

  /** Fires after a row was updated in the DataSource. */
  readonly rowUpdated = output<OgeRowUpdatedEvent>();

  /** Cancelable: fires before a row is removed from the DataSource. */
  readonly rowRemoving = output<OgeRowRemovingEvent<T>>();

  /** Fires after a row was removed from the DataSource. */
  readonly rowRemoved = output<OgeRowRemovedEvent>();

  /** Fires after an edit session ended without saving. */
  readonly editCanceled = output<void>();

  /** Cancelable: fires before a CSV export starts; `fileName` is mutable. */
  readonly exporting = output<OgeExportingEvent>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');
  /** One adapter template, reused for every column that has an edit template. */
  private readonly editAdapterTemplate =
    viewChild<TemplateRef<unknown>>('editAdapter');

  protected readonly scrollTop = signal(0);
  protected readonly scrollLeft = signal(0);
  protected readonly viewportHeight = signal(400);

  protected readonly detailTemplate = contentChild(OgeDetailTemplate<T>);
  private readonly projectedColumns = contentChildren<OgeColumn<T>>(OgeColumn, {
    descendants: true,
  });
  private readonly columnDefCache = new OgeColumnDefCache<T>();
  /** Declarative `<oge-column>` children, else the programmatic `columns`. */
  protected readonly declaredColumns = computed<readonly OgeColumn<T>[]>(() => {
    const projected = this.projectedColumns();
    return projected.length
      ? projected
      : this.columnDefCache.resolve(this.columns());
  });
  protected readonly columnGroups =
    contentChildren<OgeColumnGroup<T>>(OgeColumnGroup);

  /** New inputs (wordWrap) + responsive width tracking. */
  readonly wordWrap = input(false);
  protected readonly hostWidth = signal(0);

  /** Alternating row background (zebra striping), stable under virtualization. */
  readonly rowAlternation = input(false);

  /**
   * Right-to-left layout. `undefined` (default) auto-detects the inherited
   * CSS `direction`; `true`/`false` force it.
   */
  readonly rtlEnabled = input<boolean | undefined>(undefined);

  /** Direction detected from the DOM when `rtlEnabled` is not set. */
  private readonly detectedRtl = signal(false);

  protected readonly rtl = computed(
    () => this.rtlEnabled() ?? this.detectedRtl(),
  );

  /**
   * Drag-handle column for reordering rows. With plain-array data the array
   * is mutated in place; DataSource consumers handle `rowReordered` instead.
   */
  readonly rowDragging = input(false);

  /** Fires after a row is dropped in a new position. */
  readonly rowReordered = output<OgeRowReorderedEvent<T>>();

  /**
   * Customizes the trailing command column: reorder/mix the built-in
   * 'edit'/'delete' buttons with custom ones (text + onClick), with an
   * optional per-row `visible` predicate.
   */
  readonly commandButtons = input<readonly OgeCommandButton<T>[] | undefined>(
    undefined,
  );

  /** Highlights and tracks a single focused row . */
  readonly focusedRowEnabled = input(false);

  /** Two-way binding of the focused row's key. */
  readonly focusedRowKey = model<RowKey | null>(null);

  /** Spinner overlay while a load is in flight. */
  readonly loadPanel = input(false);

  /** Briefly flashes cells patched by push updates . */
  readonly highlightChanges = input(false);

  /** `key::field` of recently pushed cells → batch counter (drives the flash animation). */
  protected readonly updatedCells = signal<ReadonlyMap<string, number>>(
    new Map(),
  );

  /**
   * 0 = no flash; 1/2 alternate per push batch so consecutive updates to the
   * same cell restart the CSS animation (two identical keyframes, new class).
   */
  protected cellFlashPhase(key: RowKey, field: string | undefined): number {
    if (field == null || !this.highlightChanges()) return 0;
    const cells = this.updatedCells();
    if (!cells.size) return 0; // fast path: no per-cell key allocation while idle
    const batch = cells.get(`${String(key)}::${field}`);
    return batch === undefined ? 0 : (batch % 2) + 1;
  }

  protected readonly noDataTemplate = contentChild(OgeNoDataTemplate);
  /** `*ogePagerInfoTemplate`: replaces the pager's info text. */
  protected readonly pagerInfoTemplate = contentChild(OgePagerInfoTemplate);
  protected readonly rowTemplate = contentChild(OgeRowTemplate<T>);
  protected readonly toolbarItems = contentChildren(OgeGridToolbarItem);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.contextMenuPanel.destroy();
      this.operatorPanel.destroy();
      this.headerFilterPanel.destroy();
      this.chooserPanel.destroy();
      this.hintCore.destroy();
      this.hintPanel.destroy();
    });
    // measure real row heights once the DOM for the current window is in place
    afterRenderEffect(() => {
      if (!this.virtualizer.measuring()) return;
      this.viewNodes();
      this.measureRenderedRows();
    });
    // contentReady: after the DOM for a new result set is in place
    afterRenderEffect(() => {
      if (this.adapter.result() === null) return;
      untracked(() => this.contentReady.emit());
    });
    // highlightChanges: stamp pushed cells, clear each batch after its flash
    effect(() => {
      const { batch, cells } = this.adapter.pushedCells();
      if (!cells.length || !untracked(this.highlightChanges)) return;
      untracked(() => {
        const next = new Map(this.updatedCells());
        for (const cell of cells)
          next.set(`${String(cell.key)}::${cell.field}`, batch);
        this.updatedCells.set(next);
        setTimeout(() => {
          const current = new Map(untracked(this.updatedCells));
          let changed = false;
          for (const [cellKey, cellBatch] of current) {
            if (cellBatch === batch) {
              current.delete(cellKey);
              changed = true;
            }
          }
          if (changed) this.updatedCells.set(current);
        }, 1300);
      });
    });
    effect(() => {
      const data = this.data();
      const keyField = this.keyField();
      const sortValues = this.sortValueSelectors();
      const customSummaries = this.customSummarySelectors();
      this.adapter.setSource(
        isDataSource(data)
          ? data
          : new ArrayDataSource<T>(data, {
              key: keyField,
              sortValues,
              customSummaries,
            }),
      );
    });
    // Inline object/array bindings produce a fresh reference on every change
    // detection pass; these effects must react to *content* changes only,
    // otherwise they would keep overwriting user-driven state (pager size,
    // group panel) with the template literal.
    let lastPagingJson: string | undefined;
    effect(() => {
      const options = this.pagingOptions();
      const json = options ? JSON.stringify(options) : 'off';
      if (json === lastPagingJson) return;
      lastPagingJson = json;
      untracked(() =>
        this.store.paging.configure(options ? options.pageSize : null),
      );
    });
    let lastGroupByJson: string | undefined;
    effect(() => {
      const fields = this.groupBy();
      if (fields === undefined) return;
      const json = JSON.stringify(fields);
      if (json === lastGroupByJson) return;
      lastGroupByJson = json;
      untracked(() =>
        this.store.grouping.set(
          fields.map((field) => ({ field, dir: 'asc' as const })),
        ),
      );
    });
    // summary configuration comes from the declared columns; each column may
    // declare a single aggregate or a list of them
    effect(() => {
      const asList = (
        value: SummaryType | readonly SummaryType[] | undefined,
      ): readonly SummaryType[] =>
        value === undefined ? [] : typeof value === 'string' ? [value] : value;
      const group: SummaryDescriptor[] = [];
      const total: SummaryDescriptor[] = [];
      for (const column of this.declaredColumns()) {
        const field = column.field();
        if (!field) continue;
        for (const type of asList(column.groupSummary()))
          group.push({ field, type });
        for (const type of asList(column.totalSummary()))
          total.push({ field, type });
      }
      this.store.grouping.setSummaries(group, total);
    });
    // date columns group by calendar day unless they say otherwise
    effect(() => {
      const intervals: Record<string, GroupInterval> = {};
      for (const column of this.declaredColumns()) {
        const field = column.field();
        if (!field) continue;
        const interval =
          column.groupInterval() ??
          (isOgeDateType(column.dataType()) ? 'day' : undefined);
        if (interval) intervals[field] = interval;
      }
      this.store.grouping.setIntervals(intervals);
    });
    // selectedKeys model ⇄ selection slice (guarded both ways)
    effect(() => {
      const keys = this.selectedKeys();
      untracked(() => {
        const current = this.store.selection.selected();
        if (
          keys.length === current.size &&
          keys.every((key) => current.has(key))
        )
          return;
        this.store.selection.replace(keys);
      });
    });
    effect(() => {
      const selected = this.store.selection.selected();
      untracked(() => {
        const keys = this.selectedKeys();
        if (
          keys.length === selected.size &&
          keys.every((key) => selected.has(key))
        )
          return;
        this.selectedKeys.set([...selected]);
      });
    });
    // selectionChanged with added/removed diffs; the initial state is not a change
    let previousSelection: ReadonlySet<RowKey> | null = null;
    effect(() => {
      const selected = this.store.selection.selected();
      const previous = previousSelection;
      previousSelection = selected;
      if (previous === null) return;
      if (
        previous.size === selected.size &&
        [...selected].every((key) => previous.has(key))
      )
        return;
      this.selectionChanged.emit({
        selectedKeys: [...selected],
        addedKeys: [...selected].filter((key) => !previous.has(key)),
        removedKeys: [...previous].filter((key) => !selected.has(key)),
      });
    });
    // focusedRowChanged; the initial key is not a change
    let previousFocusedKey: RowKey | null | undefined;
    effect(() => {
      const key = this.focusedRowKey();
      const previous = previousFocusedKey;
      previousFocusedKey = key;
      if (previous === undefined || previous === key) return;
      this.focusedRowChanged.emit({
        key,
        row: key === null ? undefined : untracked(() => this.getRowByKey(key)),
      });
    });
    // sortChanged: synchronous with the change, unlike the debounced stateChange
    let previousSort: readonly SortDescriptor[] | undefined;
    effect(() => {
      const sort = this.store.sort.descriptors();
      const previous = previousSort;
      previousSort = sort;
      if (previous === undefined || sameSort(previous, sort)) return;
      untracked(() => this.sortChanged.emit({ sort, previousSort: previous }));
    });
    // pageChanged; the initial paging is not a change
    let previousPage: { index: number; size: number | null } | undefined;
    effect(() => {
      const page = {
        index: this.store.paging.pageIndex(),
        size: this.store.paging.pageSize(),
      };
      const previous = previousPage;
      previousPage = page;
      if (
        previous === undefined ||
        (previous.index === page.index && previous.size === page.size)
      )
        return;
      untracked(() =>
        this.pageChanged.emit({
          pageIndex: page.index,
          pageSize: page.size,
          previousPageIndex: previous.index,
          previousPageSize: previous.size,
        }),
      );
    });
    // focusedCellChanged; clearing the focus (null) is not reported
    let previousCell: { row: number; col: number } | null = null;
    effect(() => {
      const cell = this.focusedCell();
      if (!cell) return;
      const previous = previousCell;
      previousCell = cell;
      if (previous && previous.row === cell.row && previous.col === cell.col)
        return;
      untracked(() => {
        const node = this.flatNodes()[cell.row];
        const data = node?.kind === 'data' ? node : undefined;
        this.focusedCellChanged.emit({
          rowIndex: cell.row,
          columnIndex: cell.col,
          key: data?.key,
          row: data?.data,
          field: this.resolvedColumns()[cell.col]?.field,
        });
      });
    });
    // surface DataSource load failures (save failures route through the model)
    effect(() => {
      const error = this.adapter.error();
      if (error !== null) this.dataErrorOccurred.emit({ error });
    });
    // focus the first editor when one opens
    effect(() => {
      const cell = this.store.editing.editCell();
      const rowKey = this.store.editing.editRowKey();
      if (!cell && rowKey === null) return;
      setTimeout(() => {
        const editor =
          this.hostRef.nativeElement.querySelector<HTMLElement>('.oge-editor');
        // composite editors carry .oge-editor on the host — focus the control
        const target =
          editor?.querySelector<HTMLElement>('input, select, textarea') ??
          editor;
        target?.focus();
      });
    });
    // a keyboard-moved row keeps the focus once the rows re-render
    effect(() => {
      const pending = this.pendingFocusRow();
      const nodes = this.flatNodes();
      if (!pending || nodes === pending.nodes) return;
      const row = nodes.findIndex(
        (node) => node.kind === 'data' && node.key === pending.key,
      );
      if (row < 0) return;
      untracked(() => {
        this.pendingFocusRow.set(null);
        this.focusedCell.set({ row, col: pending.col });
      });
    });
    // focus follows the keyboard-navigation cell — unless an editor is open
    // (the editor-focus effect above owns the focus then)
    effect(() => {
      const cell = this.focusedCell();
      if (!cell) return;
      const editorOpen = untracked(
        () =>
          this.store.editing.editCell() !== null ||
          this.store.editing.editRowKey() !== null,
      );
      if (editorOpen) return;
      untracked(() => {
        this.scrollRowIntoView(cell.row);
        this.scrollColumnIntoView(cell.col);
      });
      setTimeout(() => {
        if (
          this.store.editing.editCell() !== null ||
          this.store.editing.editRowKey() !== null
        ) {
          return;
        }
        const viewport = this.viewportRef()?.nativeElement;
        const el = viewport?.querySelector<HTMLElement>(
          `[data-cell="${cell.row}-${cell.col}"]`,
        );
        el?.focus({ preventScroll: true });
      });
    });
    // filterValue model ⇄ builder filter slice (guarded both ways)
    effect(() => {
      const value = this.filterValue();
      untracked(() => {
        const current = this.store.filter.builderFilter();
        if (JSON.stringify(value) === JSON.stringify(current)) return;
        this.store.filter.setBuilderFilter(value);
      });
    });
    effect(() => {
      const current = this.store.filter.builderFilter();
      untracked(() => {
        if (JSON.stringify(current) === JSON.stringify(this.filterValue()))
          return;
        this.filterValue.set(current);
      });
    });
    // --- state persistence (stateKey) ---
    createStatePersistence<GridStateSnapshot>({
      stateKey: this.stateKey,
      prefix: 'oge-grid',
      storage: this.stateStorage,
      snapshot: this.persistedSnapshot,
      sanitize: sanitizeGridStateSnapshot,
      // a bound [groupBy] is controlled: the page decides the grouping, so a
      // stored grouping from an earlier visit must not replace it
      apply: (snapshot) =>
        this.applyState(
          untracked(this.groupBy) === undefined
            ? snapshot
            : { ...snapshot, group: undefined },
        ),
      // re-run the restore once the column directives registered
      beforeRestore: () => this.declaredColumns(),
      onChange: (snapshot) => this.stateChange.emit(snapshot),
    });
    // initial sort/group from column inputs — applied only while the slices
    // are untouched (so stateKey restore and user interaction win)
    effect(() => {
      const columns = this.declaredColumns();
      const sortConfigs = columns
        .map((column) => ({
          field: column.field(),
          dir: column.sortOrder(),
          index: column.sortIndex() ?? 0,
        }))
        .filter(
          (c): c is { field: string; dir: 'asc' | 'desc'; index: number } =>
            Boolean(c.field && c.dir),
        )
        .sort((a, b) => a.index - b.index);
      const groupConfigs = columns
        .map((column) => ({
          field: column.field(),
          index: column.groupIndex(),
        }))
        .filter((c): c is { field: string; index: number } =>
          Boolean(c.field && c.index !== undefined),
        )
        .sort((a, b) => a.index - b.index);
      untracked(() => {
        if (sortConfigs.length && this.store.sort.descriptors().length === 0) {
          this.store.sort.set(
            sortConfigs.map(({ field, dir }) => ({ field, dir })),
          );
        }
        if (
          groupConfigs.length &&
          this.store.grouping.descriptors().length === 0
        ) {
          this.store.grouping.set(
            groupConfigs.map(({ field }) => ({ field, dir: 'asc' as const })),
          );
        }
      });
    });
    afterNextRender(() => {
      const viewport = this.viewportRef()?.nativeElement;
      if (!viewport || typeof ResizeObserver === 'undefined') return;
      this.viewportHeight.set(viewport.clientHeight);
      this.hostWidth.set(viewport.clientWidth);
      const observer = new ResizeObserver(() => {
        this.viewportHeight.set(viewport.clientHeight);
        this.hostWidth.set(viewport.clientWidth);
      });
      observer.observe(viewport);
      this.destroyRef.onDestroy(() => observer.disconnect());
      this.detectedRtl.set(
        getComputedStyle(this.hostRef.nativeElement).direction === 'rtl',
      );
    });
  }

  protected onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.scrollTop.set(target.scrollTop);
    this.scrollLeft.set(target.scrollLeft);
    this.updateStickyGroups();
    if (untracked(this.hintCell)) this.hintCore.hide();
  }

  // --- state persistence ----------------------------------------------------

  /**
   * Debounced notification whenever the persistable UI state changes —
   * persist the snapshot anywhere (API, database) without `OGE_STATE_STORAGE`.
   */
  readonly stateChange = output<GridStateSnapshot>();

  /** Store snapshot + column visibility (which lives on the column directives). */
  private readonly persistedSnapshot = computed<GridStateSnapshot>(() => {
    const base = this.store.snapshot();
    const hidden = this.declaredColumns()
      .filter((column) => !column.visible())
      .map((column) => column.field())
      .filter((field): field is string => field != null);
    return { ...base, columns: { ...base.columns, hidden } };
  });

  /** Current persistable UI state: sort, filters, grouping, column layout. */
  state(): GridStateSnapshot {
    return untracked(this.persistedSnapshot);
  }

  /** Applies a previously captured state snapshot (see `state()` / `stateChange`). */
  applyState(snapshot: GridStateSnapshot): void {
    // public API fed from storage, URLs or the host: validate the shape first
    const safe = sanitizeGridStateSnapshot(snapshot);
    if (safe === null) return;
    untracked(() => {
      this.store.applySnapshot(safe);
      const hidden = new Set(safe.columns?.hidden ?? []);
      for (const column of this.declaredColumns()) {
        const field = column.field();
        if (field) column.visible.set(!hidden.has(field));
      }
    });
  }

  // --- imperative API -------------------------------------------------------

  /** Re-runs the current load against the DataSource. */
  refresh(): void {
    this.adapter.reload();
  }

  /** Expands every group row (all levels). */
  expandAllGroups(): void {
    this.store.expansion.setGroups(
      untracked(this.groupsAutoExpand) ? new Set() : this.collectGroupKeys(),
    );
  }

  /** Collapses every group row (all levels). */
  collapseAllGroups(): void {
    this.store.expansion.setGroups(
      untracked(this.groupsAutoExpand) ? this.collectGroupKeys() : new Set(),
    );
  }

  /** All group node keys of the current result, across levels. */
  private collectGroupKeys(): Set<RowKey> {
    const keys = new Set<RowKey>();
    const result = untracked(this.adapter.result);
    if (!result?.data.length) return keys;
    const visit = (
      items: readonly unknown[],
      parentKey: RowKey | null,
    ): void => {
      for (const item of items) {
        if (
          typeof item !== 'object' ||
          item === null ||
          !('items' in item) ||
          !('key' in item)
        ) {
          return;
        }
        const group = item as GroupedItem<T>;
        const key = groupNodeKey(parentKey, group.key);
        keys.add(key);
        if (group.items?.length) visit(group.items, key);
      }
    };
    visit(result.data, null);
    return keys;
  }

  /** Clears every filter: row filters, header filters, builder filter and search. */
  clearFilters(): void {
    this.store.filter.clearAll();
  }

  /** Clears the sort order. */
  clearSorting(): void {
    this.store.sort.clear();
  }

  /**
   * Scrolls a row into the viewport — by flat index, or by row key when a
   * `RowKey` is given.
   */
  scrollToRow(target: number | RowKey): void {
    const nodes = untracked(this.flatNodes);
    let index = nodes.findIndex((node) => node.key === target);
    if (
      index < 0 &&
      typeof target === 'number' &&
      target >= 0 &&
      target < nodes.length
    ) {
      index = target;
    }
    if (index >= 0) this.scrollRowIntoView(index);
  }

  /**
   * Scrolls the row carrying `key` into view and, when `focusedRowEnabled` is
   * on, makes it the focused row. Rows hidden inside collapsed groups are not
   * revealed — expand their groups first (`expandRow`).
   */
  navigateToRow(key: RowKey): void {
    this.scrollToRow(key);
    if (untracked(this.focusedRowEnabled)) this.focusedRowKey.set(key);
  }

  /**
   * Whether the group row (addressed by its group node key) or master-detail
   * row carrying `key` is currently expanded.
   */
  isRowExpanded(key: RowKey): boolean {
    if (this.collectGroupKeys().has(key)) {
      const toggled = untracked(this.store.expansion.collapsedGroups);
      return untracked(this.groupsAutoExpand)
        ? !toggled.has(key)
        : toggled.has(key);
    }
    return untracked(() => this.store.expansion.isDetailExpanded(key));
  }

  /** Expands a group row (by its group node key) or a master-detail row. */
  expandRow(key: RowKey): void {
    this.setRowExpansion(key, true);
  }

  /** Collapses a group row (by its group node key) or a master-detail row. */
  collapseRow(key: RowKey): void {
    this.setRowExpansion(key, false);
  }

  private setRowExpansion(key: RowKey, expanded: boolean): void {
    if (this.isRowExpanded(key) === expanded) return;
    this.requestToggle(
      this.collectGroupKeys().has(key) ? 'group' : 'detail',
      key,
    );
  }

  /**
   * Every single-row toggle — pointer, keyboard, `expandRow()`/`collapseRow()`
   * — runs through here, so `rowExpanding`/`rowCollapsing` can veto it and the
   * `-ed` events report it.
   */
  private requestToggle(kind: OgeGridToggleKind, key: RowKey): void {
    const expanding = !this.isRowExpanded(key);
    const row =
      kind === 'detail' ? untracked(() => this.getRowByKey(key)) : undefined;
    const pending: OgeGridRowTogglingEvent<T> = {
      key,
      kind,
      row,
      cancel: false,
    };
    (expanding ? this.rowExpanding : this.rowCollapsing).emit(pending);
    if (pending.cancel) return;
    if (kind === 'group') this.store.expansion.toggleGroup(key);
    else this.store.expansion.toggleDetail(key);
    (expanding ? this.rowExpanded : this.rowCollapsed).emit({ key, kind, row });
    if (kind === 'group') {
      const group = untracked(this.flatNodes).find(
        (node): node is GroupRowNode =>
          node.kind === 'group' && node.key === key,
      );
      if (group) {
        this.announcer.groupToggled(
          untracked(() => this.groupValueText(group)),
          expanding,
        );
      }
    }
  }

  /** Message shown by `beginCustomLoading()`; `null` while inactive. */
  protected readonly customLoadingMessage = signal<string | null>(null);

  /**
   * Shows the load panel with an optional custom message (default:
   * `messages.loading`) until `endCustomLoading()` — independent of
   * data-source activity and of the `loadPanel` input.
   */
  beginCustomLoading(message?: string): void {
    this.customLoadingMessage.set(message ?? untracked(this.msg).loading);
  }

  /** Hides the load panel shown by `beginCustomLoading()`. */
  endCustomLoading(): void {
    this.customLoadingMessage.set(null);
  }

  // --- imperative API: paging ----------------------------------------------

  /** Current zero-based page index. */
  pageIndex(): number {
    return untracked(this.store.paging.pageIndex);
  }

  /** Navigates to the given zero-based page (clamped to the valid range). */
  setPageIndex(index: number): void {
    const count = untracked(this.pageCount);
    this.store.paging.goTo(Math.min(Math.max(0, index), count - 1));
  }

  /** Current page size; `0` when paging is off. */
  pageSize(): number {
    return untracked(this.store.paging.pageSize) ?? 0;
  }

  /** Changes the page size (`0` turns paging off) and resets to the first page. */
  setPageSize(size: number): void {
    this.store.paging.configure(size === 0 ? null : size);
  }

  // --- imperative API: rows & selection ------------------------------------

  /** The flat data node carrying `key`, if it is currently rendered. */
  private dataNodeByKey(key: RowKey): DataRowNode<T> | undefined {
    return untracked(this.flatNodes).find(
      (node): node is DataRowNode<T> =>
        node.kind === 'data' && node.key === key,
    );
  }

  /** Data rows of the currently rendered page, in display order. */
  getVisibleRows(): readonly T[] {
    return untracked(this.flatNodes).flatMap((node) =>
      node.kind === 'data' ? [node.data] : [],
    );
  }

  /**
   * The loaded row carrying `key`, if it is currently rendered (the tree
   * list's `getNodeByKey` counterpart).
   */
  getRowByKey(key: RowKey): T | undefined {
    return this.dataNodeByKey(key)?.data;
  }

  /** Data of the selected rows among the currently loaded rows, in display order. */
  getSelectedRowsData(): T[] {
    const selected: ReadonlySet<RowKey> = untracked(this.selectionDeferred)
      ? untracked(this.deferredSelectedKeys)
      : untracked(this.store.selection.selected);
    return untracked(this.flatNodes)
      .filter(
        (node): node is DataRowNode<T> =>
          node.kind === 'data' && selected.has(node.key),
      )
      .map((node) => node.data);
  }

  /**
   * Selects every row of the current filtered set; scope via `selectAllMode`.
   * Deferred mode: the selection becomes the current filter expression, so no
   * keys are materialized.
   */
  selectAll(): void {
    void this.runSelectAll();
  }

  /** `selectAll()`'s body; settles once the selection is in place. */
  private runSelectAll(): Promise<void> {
    if (untracked(this.selectionDeferred)) {
      const field = untracked(this.deferredKeyFieldName);
      if (!field) return Promise.resolve();
      const filter = untracked(this.store.loadOptions).filter;
      this.selectionFilter.set(
        filter ?? { type: 'binary', field, op: 'isnotnull' },
      );
      return Promise.resolve();
    }
    if (untracked(this.selectAllMode) === 'page') {
      this.store.selection.replace(untracked(this.dataKeys));
      return Promise.resolve();
    }
    return this.selectAllPages();
  }

  /** Clears the selection (deferred mode: resets `selectionFilter`). */
  clearSelection(): void {
    if (untracked(this.selectionDeferred)) {
      this.selectionFilter.set(null);
      return;
    }
    this.store.selection.clear();
  }

  /** Deselects every row — same as `clearSelection()` (parity alias). */
  deselectAll(): void {
    this.clearSelection();
  }

  // --- imperative API: editing ---------------------------------------------

  /**
   * Adds a new (unsaved) row and opens its editor(s). Requires
   * `editing.allowAdding`.
   */
  addRow(): void {
    if (!untracked(this.editingModel.canAdd)) return;
    this.createNewRow();
  }

  /**
   * Opens the row editor for the row carrying `key`. Effective in
   * `row`/`form`/`popup` modes; requires `editing.allowUpdating`.
   */
  editRow(key: RowKey): void {
    if (!untracked(this.editingModel.canUpdate)) return;
    const node = this.dataNodeByKey(key);
    if (node) this.editingModel.startRowEdit(node);
  }

  /**
   * Deletes the row carrying `key`: staged in batch mode (toggle), saved
   * immediately otherwise. Requires `editing.allowDeleting`.
   */
  deleteRow(key: RowKey): void {
    if (!untracked(this.editingModel.canDelete)) return;
    const node = this.dataNodeByKey(key);
    if (node) this.editingModel.deleteRow(node);
  }

  /**
   * Saves pending edits: commits the open editor, and in batch mode saves the
   * whole staged change set. `savingChanges` can still cancel the save.
   */
  saveChanges(): void {
    const mode = untracked(this.editingModel.editMode);
    if (mode === 'batch') {
      this.editingModel.commitActiveCell();
      this.editingModel.saveAllChanges();
    } else if (mode === 'cell') {
      this.editingModel.commitActiveCell();
    } else {
      this.editingModel.commitActiveRow();
    }
  }

  /**
   * Discards every pending change and closes any open editor; emits
   * `editCanceled` when anything was open or pending.
   */
  discardChanges(): void {
    this.editingModel.cancelEditing();
  }

  /** Whether unsaved edits exist: staged changes, added or removed rows. */
  hasChanges(): boolean {
    return untracked(this.store.editing.hasPending);
  }

  // --- export ---------------------------------------------------------------

  /**
   * Rows and column metadata of the current view (filter + search + sort
   * applied) — the shared source for CSV/Excel exporters. By default paging
   * is ignored (the full filtered set is exported); pass
   * `{ scope: 'page' | 'selection' }` to narrow it.
   */
  async getExportData(
    options: OgeExportOptions<T> = {},
  ): Promise<OgeExportData<T>> {
    const scope = options.scope ?? 'all';
    const source = untracked(this.adapter.source);
    const load = untracked(this.store.loadOptions);
    const result = source
      ? await source.load({
          ...(load.sort?.length ? { sort: load.sort } : {}),
          ...(load.filter ? { filter: load.filter } : {}),
          ...(load.searchText ? { searchText: load.searchText } : {}),
          ...(scope === 'page' && load.take != null
            ? { skip: load.skip ?? 0, take: load.take }
            : {}),
        })
      : { data: [] };
    let rows = result.data as readonly T[];
    if (scope === 'selection') {
      if (untracked(this.selectionDeferred)) {
        const expr = untracked(this.selectionFilter);
        const predicate = expr ? createFilterPredicate<T>(expr) : null;
        rows = predicate ? rows.filter((row) => predicate(row)) : [];
      } else {
        const selected = untracked(this.store.selection.selected);
        const keyOf = untracked(this.keySelector);
        rows = rows.filter((row, index) => selected.has(keyOf(row, index)));
      }
    }
    return { rows, columns: this.exportColumns() };
  }

  /** Field columns with display formatting resolved (lookup text, booleans). */
  private exportColumns(): OgeExportColumn<T>[] {
    const messages = untracked(this.msg);
    return untracked(this.resolvedColumns)
      .filter((column) => column.field)
      .map((column) => ({
        caption: column.caption,
        field: column.field,
        dataType: column.dataType,
        accessor: column.accessor as (row: T) => unknown,
        format:
          column.format ??
          (column.lookupItems
            ? (value: unknown) =>
                lookupTextOf(column.lookupItems as LookupItem[], value)
            : column.dataType === 'boolean'
              ? (value: unknown) =>
                  value ? messages.booleanTrue : messages.booleanFalse
              : undefined),
      }));
  }

  /**
   * Copies the selected rows (with a header) — or, without a selection, the
   * focused cell's text — to the clipboard as tab-separated values.
   */
  async copyToClipboard(): Promise<void> {
    const text = this.clipboardText();
    if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  }

  private clipboardText(): string {
    const range = this.rangeClipboardText();
    if (range !== null) return range;
    const nodes = untracked(this.flatNodes);
    const columns = this.exportColumns();
    const selected: ReadonlySet<RowKey> = untracked(this.selectionDeferred)
      ? untracked(this.deferredSelectedKeys)
      : untracked(this.store.selection.selected);
    const rows = nodes
      .filter(
        (node): node is DataRowNode<T> =>
          node.kind === 'data' && selected.has(node.key),
      )
      .map((node) => node.data);
    if (rows.length)
      return buildCsv(rows, columns, { separator: '\t', bom: false });
    const cell = untracked(this.focusedCell);
    const node = cell ? nodes[cell.row] : undefined;
    const column = cell ? untracked(this.resolvedColumns)[cell.col] : undefined;
    if (!node || node.kind !== 'data' || !column) return '';
    const value = column.accessor(node.data);
    return value == null
      ? ''
      : column.format
        ? column.format(value)
        : String(value);
  }

  /** Builds CSV of the current view; `scope` narrows to the page or selection. */
  async getCsv(options?: CsvOptions & OgeExportOptions<T>): Promise<string> {
    const { rows, columns } = await this.getExportData({
      scope: options?.scope,
    });
    const customize = options?.customizeCell;
    const csvColumns = customize
      ? columns.map((column) => ({
          caption: column.caption,
          accessor: (row: T) => {
            const value = column.accessor(row);
            const text =
              value == null
                ? ''
                : column.format
                  ? column.format(value)
                  : String(value);
            const out = customize({
              row,
              field: column.field,
              caption: column.caption,
              value,
              text,
            });
            return out === undefined ? text : out;
          },
        }))
      : columns;
    return buildCsv(rows, csvColumns, options);
  }

  /**
   * Downloads the current view as a CSV file. Fires the cancelable
   * `exporting` event first (the Excel/PDF helper functions call
   * `getExportData` directly and do not).
   */
  /**
   * Downloads the CSV. `options` are `getCsv()`'s — `scope`, `customizeCell`,
   * `separator`… — so a customized export still goes through `exporting` and
   * the built-in formula guard instead of a hand-rolled Blob.
   */
  async exportCsv(
    filename = 'grid.csv',
    options?: CsvOptions & OgeExportOptions<T>,
  ): Promise<void> {
    const event: OgeExportingEvent = { fileName: filename, cancel: false };
    this.exporting.emit(event);
    if (event.cancel) return;
    const csv = await this.getCsv(options);
    if (typeof document === 'undefined') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = event.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // --- data & rows ---------------------------------------------------------

  private readonly keySelector = computed<(row: T, index: number) => RowKey>(
    () => {
      const key = this.keyField();
      if (key === undefined) return (_row, index) => index;
      const selector = resolveKeySelector<T>(key);
      return (row) => selector(row);
    },
  );

  /** Backwards-compatible alias used by the template's track expressions. */
  protected readonly keyOf = this.keySelector;

  protected readonly grouped = computed(
    () => this.store.grouping.descriptors().length > 0,
  );

  /** Rows expand/collapse when grouped or with master-detail → `treegrid`, else `grid`. */
  protected readonly gridRole = computed(() =>
    this.grouped() || this.detailTemplate() !== undefined ? 'treegrid' : 'grid',
  );

  /** `autoExpandAll: false` inverts group expansion: the toggled set holds *expanded* keys. */
  private readonly groupsAutoExpand = computed(
    () => this.grouping()?.autoExpandAll !== false,
  );

  /** Per-field `calculateSortValue` selectors (array data only). */
  private readonly sortValueSelectors = computed<
    Record<string, (row: T) => unknown> | undefined
  >(() => {
    const entries = this.declaredColumns().flatMap((column) => {
      const field = column.field();
      const calculate = column.calculateSortValue();
      return field && calculate ? [[field, calculate] as const] : [];
    });
    return entries.length ? Object.fromEntries(entries) : undefined;
  });

  /** Fields whose group summaries render on a footer row instead of the group header. */
  private readonly groupFooterFields = computed<ReadonlySet<string>>(() => {
    const fields = new Set<string>();
    for (const column of this.declaredColumns()) {
      const field = column.field();
      if (
        field &&
        column.groupSummary() &&
        column.groupSummaryPosition() === 'footer'
      ) {
        fields.add(field);
      }
    }
    return fields;
  });

  /** Per-field `calculateCustomSummary` reducers (array data only). */
  private readonly customSummarySelectors = computed<
    Record<string, (rows: readonly T[]) => unknown> | undefined
  >(() => {
    const entries = this.declaredColumns().flatMap((column) => {
      const field = column.field();
      const calculate = column.calculateCustomSummary();
      return field && calculate ? [[field, calculate] as const] : [];
    });
    return entries.length ? Object.fromEntries(entries) : undefined;
  });

  // --- deferred group loading ----------------------------------------------

  /** Expanded groups whose children are neither in the payload nor cached yet. */
  private readonly pendingGroups = computed<{ key: RowKey; path: unknown[] }[]>(
    () => {
      const result = this.adapter.result();
      const groups = this.store.grouping.descriptors();
      if (!result || !groups.length || !result.data.length) return [];
      const first = result.data[0] as Record<string, unknown> | null;
      if (typeof first !== 'object' || first === null || !('items' in first))
        return [];
      const autoExpand = this.groupsAutoExpand();
      const toggled = this.store.expansion.collapsedGroups();
      const cache = this.deferredGroupRows();
      const pending: { key: RowKey; path: unknown[] }[] = [];
      const visit = (
        items: readonly GroupedItem<T>[],
        parentKey: RowKey | null,
        path: readonly unknown[],
      ): void => {
        for (const item of items) {
          const key = groupNodeKey(parentKey, item.key);
          const expanded = autoExpand ? !toggled.has(key) : toggled.has(key);
          if (!expanded) continue;
          const children = item.items ?? cache.get(key) ?? null;
          if (children === null) {
            pending.push({ key, path: [...path, item.key] });
            continue;
          }
          const child = children[0] as Record<string, unknown> | undefined;
          if (
            child &&
            typeof child === 'object' &&
            'items' in child &&
            'key' in child
          ) {
            visit(children as readonly GroupedItem<T>[], key, [
              ...path,
              item.key,
            ]);
          }
        }
      };
      visit(result.data as readonly GroupedItem<T>[], null, []);
      return pending;
    },
  );

  /** Load-option construction for one deferred group: ancestor path filters + remaining group levels. */
  private readonly pendingGroupRequests = computed<
    readonly PendingChildRequest[]
  >(() =>
    this.pendingGroups().map((entry) => ({
      key: entry.key,
      buildOptions: (rest) => {
        const groups = rest.group ?? [];
        const pathFilters: FilterExpr[] = entry.path.map((value, i) =>
          groupKeyFilter(groups[i]?.field ?? '', value, groups[i]?.interval),
        );
        const operands = [
          ...(rest.filter ? [rest.filter] : []),
          ...pathFilters,
        ];
        const filter =
          operands.length === 1
            ? operands[0]
            : { type: 'and' as const, operands };
        const remaining = groups.slice(entry.path.length);
        return {
          filter,
          ...(rest.sort?.length ? { sort: rest.sort } : {}),
          ...(rest.searchText ? { searchText: rest.searchText } : {}),
          ...(remaining.length
            ? {
                group: remaining,
                ...(rest.groupSummary?.length
                  ? { groupSummary: rest.groupSummary }
                  : {}),
              }
            : {}),
        };
      },
    })),
  );

  /** Fetches children for expanded deferred groups; base changes drop the cache. */
  private readonly deferredLoader = new DeferredChildrenLoader<unknown>({
    pending: this.pendingGroupRequests,
    baseOptions: this.store.loadOptions,
    source: this.adapter.source,
    onError: (err) => this.adapter.error.set(err),
  });

  /** Children fetched on demand for groups delivered with `items: null`. */
  private readonly deferredGroupRows = this.deferredLoader.children;

  /** The body rows: every flattened row except the ones pinned by key. */
  protected readonly flatNodes = computed<RowNode<T>[]>(() => {
    const all = this.allFlatNodes();
    const pinned = this.pinnedKeys();
    if (!pinned.size) return all;
    return all.filter((node) => node.kind !== 'data' || !pinned.has(node.key));
  });

  private readonly allFlatNodes = computed<RowNode<T>[]>(() => {
    const result = this.adapter.result();
    const toggledGroups = this.store.expansion.collapsedGroups();
    const flattened = result
      ? flattenGroupedData<T>(result.data as readonly T[], {
          keyOf: this.keySelector(),
          groups: this.store.grouping.descriptors(),
          groupSummary: this.store.grouping.groupSummary(),
          ...(this.groupsAutoExpand()
            ? { collapsedGroupKeys: toggledGroups }
            : { expandedGroupKeys: toggledGroups }),
          deferredChildren: this.deferredGroupRows() as ReadonlyMap<
            RowKey,
            readonly T[]
          >,
          expandedDetailKeys: this.detailTemplate()
            ? this.store.expansion.expandedDetails()
            : undefined,
          groupFooters: this.groupFooterFields().size > 0,
        })
      : [];
    // unsaved new rows render on top
    const added = this.store.editing.added();
    if (!added.length) return flattened;
    const addedNodes: RowNode<T>[] = added.map((key, index) => ({
      kind: 'data',
      key,
      data: {} as T,
      sourceIndex: -1 - index,
      level: 0,
    }));
    return [...addedNodes, ...flattened];
  });

  private readonly firstDataRow = computed<T | undefined>(() => {
    const node = this.flatNodes().find((n) => n.kind === 'data');
    if (node?.kind === 'data') return node.data;
    // windowed mode never populates the full result; sample the block cache
    const first = this.adapter.windowRows().values().next();
    return first.done ? undefined : first.value;
  });

  /** Data row count of the current filtered set, across all pages. */
  readonly totalCount = computed<number>(() => {
    if (this.windowed())
      return this.adapter.windowTotal() ?? this.adapter.highestLoaded();
    const result = this.adapter.result();
    if (result?.totalCount != null) return result.totalCount;
    return this.flatNodes().reduce(
      (count, node) => (node.kind === 'data' ? count + 1 : count),
      0,
    );
  });

  /** Number of pages; `1` when paging is off. */
  readonly pageCount = computed<number>(() => {
    const pageSize = this.store.paging.pageSize();
    return pageSize == null
      ? 1
      : Math.max(1, Math.ceil(this.totalCount() / pageSize));
  });

  // --- virtualization ------------------------------------------------------

  /**
   * Row count of the windowed virtual space. With an unknown total (pure
   * infinite scrolling) the space grows one block past the highest loaded row,
   * so the user can always scroll further until the source runs dry.
   */
  private readonly windowCount = computed<number>(() => {
    const total = this.adapter.windowTotal();
    if (total != null) return total;
    return this.adapter.highestLoaded() + WINDOW_BLOCK_SIZE;
  });

  private readonly virtualizer = new RowVirtualizerModel<T>({
    flatNodes: this.flatNodes,
    virtualized: this.virtualized,
    scrollTop: this.scrollTop,
    viewportHeight: this.viewportHeight,
    rowHeight: this.effRowHeight,
    detailRowHeight: this.effDetailRowHeight,
    overscan: this.effOverscan,
    autoRowHeight: this.autoRowHeight,
    viewport: () => this.viewportRef()?.nativeElement ?? null,
    windowAdapter: {
      active: this.windowed,
      count: this.windowCount,
      rows: this.adapter.windowRows,
      keyOf: this.keySelector,
      blockSize: WINDOW_BLOCK_SIZE,
    },
  });

  private readonly offsetTree = this.virtualizer.offsetTree;
  private readonly measuredHeights = this.virtualizer.measuredHeights;
  protected readonly viewWindow = this.virtualizer.viewWindow;

  /** Index of the first rendered node within the flat row space. */
  protected readonly viewStart = this.virtualizer.viewStart;

  protected readonly viewNodes = this.virtualizer.viewNodes;

  private measureRenderedRows(): void {
    this.virtualizer.measureRenderedRows();
  }

  /** Keeps the adapter's load strategy in sync with the scrolling options. */
  private readonly windowModeEffect = effect(() => {
    const windowed = this.windowed();
    untracked(() => this.adapter.setMode(windowed ? 'window' : 'full'));
  });

  /**
   * Requests the blocks covering the visible window (plus one block of
   * read-ahead). Tracking `loadOptions` re-triggers after sort/filter changes,
   * which invalidate the adapter's block cache.
   */
  private readonly windowRequestEffect = effect(() => {
    if (!this.windowed()) return;
    if (!this.adapter.source()) return; // re-run once the source is attached
    const window = this.viewWindow();
    this.store.loadOptions();
    untracked(() => {
      const start = window?.start ?? 0;
      const end = window?.end ?? WINDOW_BLOCK_SIZE;
      this.adapter.requestRange(start, end + WINDOW_BLOCK_SIZE);
    });
  });

  protected readonly bodyHeight = this.virtualizer.bodyHeight;

  protected readonly rowsTransform = this.virtualizer.rowsTransform;

  // --- columns -------------------------------------------------------------

  /** OgeColumn instance → band caption (from `<oge-column-group>`). */
  private readonly bandByColumn = computed<ReadonlyMap<OgeColumn<T>, string>>(
    () => {
      const map = new Map<OgeColumn<T>, string>();
      for (const group of this.columnGroups()) {
        for (const column of group.columns()) map.set(column, group.caption());
      }
      return map;
    },
  );

  /** Master-detail toggle in the expander column. */
  protected readonly hasDetailToggle = computed(
    () => this.detailTemplate() !== undefined,
  );

  private readonly effColumnHidingMode = computed(
    () => this.columnHidingMode() ?? this.config.columnHidingMode,
  );

  /**
   * Whether an adaptive-detail toggle can appear — decided from the
   * declarations alone, so the hiding pass can count the toggle's width
   * without depending on its own result (that would be a cycle).
   */
  private readonly adaptiveDetailPossible = computed(
    () =>
      this.effColumnHidingMode() === 'detail' &&
      this.declaredColumns().some(
        (column) => column.visible() && column.hidingPriority() !== undefined,
      ),
  );

  /** The columns hidden by width, rendered in each row's adaptive detail. */
  protected readonly adaptiveHiddenColumns = computed(() =>
    this.effColumnHidingMode() === 'detail'
      ? this.columnModel.adaptiveHiddenColumns()
      : [],
  );

  /** Adaptive-detail toggle in the expander column (some column is hidden). */
  protected readonly hasAdaptiveToggle = computed(
    () => this.adaptiveHiddenColumns().length > 0,
  );

  /** True when a leading expander column is rendered (master-detail or adaptive detail). */
  protected readonly hasExpander = computed(
    () => this.hasDetailToggle() || this.hasAdaptiveToggle(),
  );

  /** One expander track wide per toggle it holds. */
  private readonly expanderWidth = computed(
    () =>
      ((this.hasDetailToggle() ? 1 : 0) + (this.hasAdaptiveToggle() ? 1 : 0)) *
      EXPANDER_WIDTH,
  );

  /** Keys of the rows whose adaptive detail is open. */
  private readonly adaptiveExpandedKeys = signal<ReadonlySet<RowKey>>(
    new Set(),
  );

  protected readonly hasCheckboxColumn = computed(
    () => this.selectionMode() === 'checkbox',
  );

  /** Number of leading utility cells (expander / checkbox) before data columns. */
  protected readonly leadingCellCount = computed(
    () =>
      (this.rowDragging() ? 1 : 0) +
      (this.hasExpander() ? 1 : 0) +
      (this.hasCheckboxColumn() ? 1 : 0),
  );

  private readonly leadingWidth = computed(
    () =>
      (this.rowDragging() ? DRAG_WIDTH : 0) +
      this.expanderWidth() +
      (this.hasCheckboxColumn() ? CHECKBOX_WIDTH : 0),
  );

  private readonly effColumnMinWidth = computed(
    () => this.columnMinWidth() ?? this.config.columnMinWidth,
  );

  /** Leading width counted against adaptive hiding (drag handle excluded). */
  private readonly adaptiveLeadingWidth = computed(
    () =>
      (this.hasDetailToggle() ? EXPANDER_WIDTH : 0) +
      (this.hasCheckboxColumn() ? CHECKBOX_WIDTH : 0),
  );

  private readonly columnModel = new ColumnModel<T, OgeColumn<T>>({
    declaredColumns: this.declaredColumns,
    bands: this.bandByColumn,
    // programmatic defs arrive through declaredColumns; the resolver only
    // derives columns from the first row when neither kind exists
    columnDefs: () => undefined,
    firstDataRow: this.firstDataRow,
    widthOverrides: this.store.columns.widthOverrides,
    pinOverrides: this.store.columns.pinOverrides,
    order: this.store.columns.order,
    hostWidth: this.hostWidth,
    defaultMinWidth: this.effColumnMinWidth,
    adaptiveLeadingWidth: this.adaptiveLeadingWidth,
    detailToggleWidth: computed(() =>
      this.adaptiveDetailPossible() ? EXPANDER_WIDTH : 0,
    ),
  });

  protected readonly resolvedColumns = this.columnModel.resolvedColumns;

  /** Band header cells (caption + span) for the current column order. */
  protected readonly bandRow = this.columnModel.bandRow;

  // --- column virtualization ------------------------------------------------

  /**
   * Column virtualization is opt-in and requires plain columns: pinned columns
   * and bands rely on every column being present in the DOM.
   */
  protected readonly colVirtualized = computed(
    () =>
      this.scrolling()?.columnRenderingMode === 'virtual' &&
      this.bandRow() === null &&
      this.resolvedColumns().every((column) => column.pinned === false),
  );

  private readonly leadingTracks = computed<readonly string[]>(() => {
    const leading: string[] = [];
    if (this.rowDragging()) leading.push(`${DRAG_WIDTH}px`);
    if (this.hasExpander()) leading.push(`${this.expanderWidth()}px`);
    if (this.hasCheckboxColumn()) leading.push(`${CHECKBOX_WIDTH}px`);
    return leading;
  });

  private readonly trailingTracks = computed<readonly string[]>(() =>
    this.hasCommandColumn() ? [`${COMMAND_WIDTH}px`] : [],
  );

  private readonly layoutModel = new ColumnLayoutModel<T, OgeColumn<T>>({
    resolvedColumns: this.resolvedColumns,
    colVirtualized: this.colVirtualized,
    scrollLeft: this.scrollLeft,
    hostWidth: this.hostWidth,
    leadingTracks: this.leadingTracks,
    trailingTracks: this.trailingTracks,
    leadingWidth: this.leadingWidth,
    defaultMinWidth: this.effColumnMinWidth,
    pinnedDefaultWidth: computed(() => this.config.pinnedDefaultWidth),
  });

  /** Columns actually rendered — the horizontal window when virtualized. */
  protected readonly renderColumns = this.layoutModel.renderColumns;
  protected readonly colSpacerLeft = this.layoutModel.colSpacerLeft;
  protected readonly colSpacerRight = this.layoutModel.colSpacerRight;
  protected readonly gridTemplateColumns = this.layoutModel.gridTemplateColumns;

  protected pinnedLeftOf(column: ResolvedColumn<T>): number | null {
    return this.layoutModel.pinnedLeftOf(column);
  }

  protected pinnedRightOf(column: ResolvedColumn<T>): number | null {
    return this.layoutModel.pinnedRightOf(column);
  }

  // --- sorting -------------------------------------------------------------

  protected onHeaderClick(column: ResolvedColumn<T>, event: Event): void {
    if (this.suppressHeaderClick) {
      this.suppressHeaderClick = false;
      return;
    }
    if (!column.sortable || !column.field || this.sortMode() === 'none') return;
    if (event instanceof KeyboardEvent) event.preventDefault();
    const { shiftKey, ctrlKey } = event as MouseEvent | KeyboardEvent;
    const additive = this.sortMode() === 'multi' && (shiftKey || ctrlKey);
    this.store.sort.toggle(column.field, additive, this.allowUnsorting());
  }

  protected sortStateOf(
    column: ResolvedColumn<T>,
  ): { dir: 'asc' | 'desc'; index: number } | null {
    return column.field ? this.store.sort.stateOf(column.field) : null;
  }

  protected ariaSortOf(column: ResolvedColumn<T>): string | null {
    const state = this.sortStateOf(column);
    if (!state)
      return column.sortable && this.sortMode() !== 'none' ? 'none' : null;
    return state.dir === 'asc' ? 'ascending' : 'descending';
  }

  protected readonly multiSorted = computed(
    () => this.store.sort.descriptors().length > 1,
  );

  // --- cells ---------------------------------------------------------------

  protected cellText(row: T, column: ResolvedColumn<T>): string {
    const value = column.accessor(row);
    if (column.dataType === 'boolean' && !column.format && value != null) {
      return value ? this.msg().booleanTrue : this.msg().booleanFalse;
    }
    return formatCellValue(value, column.dataType, column.format);
  }

  protected cellContext(
    row: T,
    rowIndex: number,
    column: ResolvedColumn<T>,
  ): OgeCellTemplateContext<T> {
    return {
      $implicit: column.accessor(row),
      row,
      rowIndex,
      // Templated columns are always declarative, so `source` is defined here.
      column: column.source as OgeColumn<T>,
    };
  }

  protected headerContext(
    column: ResolvedColumn<T>,
  ): OgeHeaderTemplateContext<T> {
    return { $implicit: column.source as OgeColumn<T> };
  }

  protected cellDisplayText(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): string {
    const value = this.displayValue(node, column);
    if (column.format) return column.format(value);
    if (column.lookup && typeof column.lookup.dataSource === 'function') {
      const items = this.lookupItemsFor(node, column);
      if (items) return lookupTextOf(items, value);
    }
    if (column.lookupItems) return lookupTextOf(column.lookupItems, value);
    if (column.dataType === 'boolean' && value != null) {
      return value ? this.msg().booleanTrue : this.msg().booleanFalse;
    }
    return formatCellValue(value, column.dataType, undefined);
  }

  /**
   * Screen-reader text of a default-rendered boolean cell (its `✓` / `✗`
   * glyph is drawn `aria-hidden`), or `null` for every other cell.
   */
  protected booleanLabelOf(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): string | null {
    if (column.dataType !== 'boolean' || column.lookup) return null;
    return booleanCellLabel(
      this.displayValue(node, column),
      column,
      this.msg(),
    );
  }

  /** Filter-row lookup editor: applies an exact-match filter on the raw value. */
  protected onLookupFilter(column: ResolvedColumn<T>, value: unknown): void {
    const field = column.field;
    if (!field || !column.lookupItems) return;
    this.store.filter.setRowFilter(
      field,
      value == null ? null : { type: 'binary', field, op: 'eq', value },
    );
  }

  /** Filter-row boolean editor items: (All) / true / false. */
  protected readonly booleanFilterItems = computed(() => [
    { value: '', text: this.msg().selectAllValues },
    { value: 'true', text: this.msg().booleanTrue },
    { value: 'false', text: this.msg().booleanFalse },
  ]);

  /** Filter-row date editor: applies a timezone-safe day-range expression. */
  protected onDateFilter(column: ResolvedColumn<T>, value: unknown): void {
    const field = column.field;
    if (!field) return;
    this.store.filter.setRowFilter(
      field,
      value instanceof Date
        ? dateFilterExpr(field, this.currentOperator(column), value)
        : null,
    );
  }

  /** The filter row's range picker (`between` on a date column). */
  protected onDateRangeFilter(
    column: ResolvedColumn<T>,
    range: readonly [Date | null, Date | null],
  ): void {
    const field = column.field;
    if (!field) return;
    this.store.filter.setRowFilter(
      field,
      dateRangeFilterExpr(field, range[0], range[1]),
    );
  }

  protected onEditorEnter(): void {
    const mode = this.editMode();
    if (mode === 'row' || mode === 'popup' || mode === 'form')
      this.commitActiveRow();
    else this.commitActiveCell();
  }

  protected readonly popupNode = computed<DataRowNode<T> | null>(() => {
    if (this.editMode() !== 'popup') return null;
    const key = this.store.editing.editRowKey();
    if (key === null) return null;
    return (
      this.flatNodes().find(
        (node): node is DataRowNode<T> =>
          node.kind === 'data' && node.key === key,
      ) ?? null
    );
  });

  protected detailContext(row: T): OgeDetailTemplateContext<T> {
    return { $implicit: row };
  }

  // --- grouping ------------------------------------------------------------

  /** Field → column index; group rows and summaries resolve columns per render. */
  private readonly columnsByField = computed<
    ReadonlyMap<string, ResolvedColumn<T>>
  >(() => {
    const map = new Map<string, ResolvedColumn<T>>();
    for (const column of this.resolvedColumns()) {
      if (column.field !== undefined && !map.has(column.field))
        map.set(column.field, column);
    }
    return map;
  });

  protected columnByField(field: string): ResolvedColumn<T> | undefined {
    return this.columnsByField().get(field);
  }

  protected groupCaption(field: string): string {
    return this.columnByField(field)?.caption ?? humanize(field);
  }

  protected groupValueText(node: GroupRowNode): string {
    const column = this.columnByField(node.groupField);
    return column
      ? ogeGroupValueText(
          node.groupValue,
          column,
          this.store.grouping.intervals()[node.groupField],
          this.msg(),
        )
      : String(node.groupValue ?? '');
  }

  protected groupSummaryText(node: GroupRowNode): string {
    const messages = this.msg();
    const footerFields = this.groupFooterFields();
    return node.summaries
      .filter((summary) => !footerFields.has(summary.field))
      .map((summary) => {
        const column = summary.field
          ? this.columnByField(summary.field)
          : undefined;
        const value = column
          ? formatCellValue(summary.value, column.dataType, column.format)
          : String(summary.value ?? '');
        return formatPattern(messages.groupSummaryPattern, {
          label: messages.summaryLabels[summary.type],
          column: column?.caption ?? summary.field,
          value,
        });
      })
      .join('  ·  ');
  }

  /** Footer summary text of one column on a group-footer (`summary`) row. */
  protected groupFooterText(
    node: SummaryRowNode,
    column: ResolvedColumn<T>,
  ): string {
    const field = column.field;
    if (!field || !this.groupFooterFields().has(field)) return '';
    const messages = this.msg();
    return node.summaries
      .filter((summary) => summary.field === field)
      .map((summary) =>
        formatPattern(messages.totalSummaryPattern, {
          label: messages.summaryLabels[summary.type],
          value: formatCellValue(summary.value, column.dataType, column.format),
        }),
      )
      .join(' · ');
  }

  protected toggleGroup(key: RowKey, event?: Event): void {
    event?.preventDefault();
    this.requestToggle('group', key);
  }

  protected toggleDetail(key: RowKey, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.requestToggle('detail', key);
  }

  /** Whether the row's adaptive detail (the hidden columns) is open. */
  protected isAdaptiveExpanded(key: RowKey): boolean {
    return this.adaptiveExpandedKeys().has(key);
  }

  /** DOM id of a row's adaptive detail — the toggle's `aria-controls`. */
  protected adaptiveDetailId(key: RowKey): string {
    return `${this.uid}-ad-${String(key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  /** Opens or closes a row's adaptive detail (`columnHidingMode: 'detail'`). */
  protected toggleAdaptiveDetail(key: RowKey, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const next = new Set(this.adaptiveExpandedKeys());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.adaptiveExpandedKeys.set(next);
  }

  /** Total-summary text per column id; empty when no totals are configured. */
  protected readonly totalSummaryByColumn = computed<
    ReadonlyMap<string, string>
  >(() => {
    const descriptors = this.store.grouping.totalSummary();
    const values = this.adapter.result()?.summary;
    const out = new Map<string, string>();
    if (!descriptors.length || !values) return out;
    const messages = this.msg();
    descriptors.forEach((descriptor, i) => {
      const column = this.columnByField(descriptor.field);
      if (!column) return;
      const value = formatCellValue(values[i], column.dataType, column.format);
      const text = formatPattern(messages.totalSummaryPattern, {
        label: messages.summaryLabels[descriptor.type],
        value,
      });
      const existing = out.get(column.id);
      out.set(column.id, existing ? `${existing} · ${text}` : text);
    });
    return out;
  });

  protected readonly hasTotalRow = computed(
    () => this.totalSummaryByColumn().size > 0,
  );

  /**
   * The raw value of a total summary — what the total row formats — by field
   * and, when a column carries several aggregates, by type. `undefined` when
   * no such total is configured or the data has not loaded yet.
   */
  getTotalSummaryValue(field: string, type?: SummaryType): unknown {
    const descriptors = untracked(this.store.grouping.totalSummary);
    const values = untracked(this.adapter.result)?.summary;
    if (!values) return undefined;
    const index = descriptors.findIndex(
      (d) => d.field === field && (type === undefined || d.type === type),
    );
    return index < 0 ? undefined : values[index];
  }

  // --- selection -----------------------------------------------------------

  /** Keys of all (filtered, flattened) data rows in display order. */
  protected readonly dataKeys = computed<readonly RowKey[]>(() =>
    this.flatNodes().flatMap((node) =>
      node.kind === 'data' ? [node.key] : [],
    ),
  );

  /** Whether the row carrying `key` is currently selected. */
  isRowSelected(key: RowKey): boolean {
    if (this.selectionDeferred()) return this.deferredSelectedKeys().has(key);
    return this.store.selection.isSelected(key);
  }

  // --- deferred selection ---------------------------------------------------

  /**
   * Deferred selection: no key set is tracked — the
   * selection is the serializable `selectionFilter` expression instead, so
   * select-all over huge remote sets never fetches keys. Requires a string
   * `keyField`. `null` means nothing is selected.
   */
  readonly selectionDeferred = input(false);
  /** Two-way selection expression (deferred mode). */
  readonly selectionFilter = model<FilterExpr | null>(null);

  private readonly deferredKeyFieldName = computed<string | null>(() => {
    const key = this.keyField();
    return typeof key === 'string' ? key : null;
  });

  /** Keys of the currently rendered rows that match `selectionFilter`. */
  private readonly deferredSelectedKeys = computed<ReadonlySet<RowKey>>(() => {
    const expr = this.selectionFilter();
    if (!this.selectionDeferred() || !expr) return new Set<RowKey>();
    const predicate = createFilterPredicate<T>(expr);
    const keys = new Set<RowKey>();
    for (const node of this.flatNodes()) {
      if (node.kind === 'data' && predicate(node.data)) keys.add(node.key);
    }
    return keys;
  });

  private keyEqualsExpr(key: RowKey): FilterExpr | null {
    return keyEqualsExpr(this.deferredKeyFieldName(), key);
  }

  private deferredToggle(key: RowKey): void {
    const eq = this.keyEqualsExpr(key);
    if (!eq) return;
    this.selectionFilter.set(
      deferredToggleExpr(
        untracked(this.selectionFilter),
        eq,
        untracked(this.deferredSelectedKeys).has(key),
      ),
    );
  }

  private deferredSelectOnly(key: RowKey): void {
    const eq = this.keyEqualsExpr(key);
    if (eq) this.selectionFilter.set(eq);
  }

  /**
   * Header select-all scope: `'allPages'` (default) selects the whole
   * filtered set across pages; `'page'` only the rows on the current page.
   */
  readonly selectAllMode = input<'allPages' | 'page'>('allPages');

  protected readonly allSelected = computed(() => {
    const keys = this.dataKeys();
    if (!keys.length) return false;
    if (this.selectionDeferred()) {
      const selected = this.deferredSelectedKeys();
      return keys.every((key) => selected.has(key));
    }
    return allRowsSelected({
      keys,
      selected: this.store.selection.selected(),
      totalCount: this.totalCount(),
      selectAllMode: this.selectAllMode(),
    });
  });

  protected readonly someSelected = computed(() => {
    if (this.selectionDeferred()) {
      return this.deferredSelectedKeys().size > 0 && !this.allSelected();
    }
    return this.store.selection.count() > 0 && !this.allSelected();
  });

  protected onRowClick(node: DataRowNode<T>, event: MouseEvent): void {
    this.rowClick.emit({ row: node.data, key: node.key, event });
    if (this.focusedRowEnabled()) this.focusedRowKey.set(node.key);
    const mode = this.selectionMode();
    if (mode === 'none') return;
    if (this.selectionDeferred()) {
      if (mode === 'single') this.deferredSelectOnly(node.key);
      else this.deferredToggle(node.key);
      return;
    }
    switch (rowClickSelectionIntent(mode, event)) {
      case 'range':
        this.store.selection.selectRange(this.dataKeys(), node.key);
        break;
      case 'toggle':
        this.store.selection.toggle(node.key);
        break;
      case 'selectOnly':
        this.store.selection.selectOnly(node.key);
        break;
      default:
        break;
    }
  }

  // --- row drag reordering -------------------------------------------------

  /** Key of the row currently hovered as drop target (indicator line). */
  protected readonly dropTargetKey = signal<RowKey | null>(null);

  /**
   * Pointer drag on a row's handle (mouse, pen and touch — the handle is
   * `touch-action: none`, so touch drags at once): the drop runs
   * `commitRowMove`, the same path as Ctrl+ArrowUp/Down.
   */
  protected onRowHandlePointerDown(
    node: DataRowNode<T>,
    event: PointerEvent,
  ): void {
    if (event.button !== 0) return;
    const start: OgeRowDragStartEvent<T> = {
      key: node.key,
      row: node.data,
      cancel: false,
    };
    this.rowDragStart.emit(start);
    if (start.cancel) return;
    const group = this.rowDragGroup();
    if (group) {
      this.beginGroupRowDrag(node, event, group);
      return;
    }
    const handle = event.currentTarget as HTMLElement;
    const host = this.hostRef.nativeElement;
    beginPointerDragDrop<DataRowNode<T>>(event, {
      source: handle,
      ghost: handle.closest('.oge-row'),
      longPress: 0,
      autoScroll: this.viewportRef()?.nativeElement ?? null,
      autoScrollOptions: { axis: 'y' },
      resolve: (hit) => {
        const index = resolveOgeRowDropIndex(hit, host);
        const target =
          index === null ? undefined : untracked(this.flatNodes)[index];
        return target?.kind === 'data' ? target : null;
      },
      onOver: (target) => {
        const key = target?.key ?? null;
        if (this.dropTargetKey() !== key) this.dropTargetKey.set(key);
      },
      onDrop: (target) => {
        if (target.key !== node.key) this.commitRowMove(node.key, target.key);
      },
      onEnd: ({ dropped }) => {
        this.dropTargetKey.set(null);
        this.rowDragEnd.emit({
          key: node.key,
          row: node.data,
          dropped,
          targetComponentId: dropped ? this.componentId() : null,
        });
      },
    });
  }

  /**
   * A row drag across every component of `rowDragGroup`: the element under
   * the pointer is matched against the registered participants, and the
   * drop runs the target's `drop` (this grid's own reorder path included).
   */
  private beginGroupRowDrag(
    node: DataRowNode<T>,
    event: PointerEvent,
    group: string,
  ): void {
    const handle = event.currentTarget as HTMLElement;
    const source: OgeRowDragSource = {
      componentId: this.componentId(),
      key: node.key,
      row: node.data,
    };
    type Hit = {
      participant: NonNullable<ReturnType<typeof findOgeRowDragParticipant>>;
      target: OgeRowDragTarget;
    };
    let current: Hit['participant'] | null = null;
    let lastY = event.clientY;
    beginPointerDragDrop<Hit>(event, {
      source: handle,
      ghost: handle.closest('.oge-row'),
      longPress: 0,
      autoScroll: this.viewportRef()?.nativeElement ?? null,
      autoScrollOptions: { axis: 'y' },
      resolve: (hit, move) => {
        lastY = move.clientY;
        const participant = findOgeRowDragParticipant(hit, group);
        const target =
          participant && hit ? participant.resolve(hit, lastY, source) : null;
        return participant && target ? { participant, target } : null;
      },
      onOver: (hit) => {
        if (current && current !== hit?.participant) current.over(source, null);
        current = hit?.participant ?? null;
        current?.over(source, hit?.target ?? null);
      },
      onDrop: (hit) => hit.participant.drop(source, hit.target),
      onEnd: ({ dropped }) => {
        current?.over(source, null);
        const targetId = dropped ? (current?.componentId ?? null) : null;
        current = null;
        this.rowDragEnd.emit({
          key: node.key,
          row: node.data,
          dropped,
          targetComponentId: targetId,
        });
      },
    });
  }

  /** Row the focus follows once a keyboard move re-renders the rows. */
  private readonly pendingFocusRow = signal<{
    key: RowKey;
    col: number;
    nodes: readonly RowNode<T>[];
  } | null>(null);

  /**
   * Ctrl+ArrowUp/Down on a focused row: the keyboard twin of a handle drag
   * onto the neighbouring data row — same drop path, same `rowReordered`.
   */
  private moveRowByKeyboard(row: number, direction: 1 | -1, col: number): void {
    const nodes = untracked(this.flatNodes);
    const node = nodes[row];
    const targetIndex = ogeAdjacentDataRow(nodes, row, direction);
    if (node?.kind !== 'data' || targetIndex < 0) return;
    const target = nodes[targetIndex] as DataRowNode<T>;
    const moved = this.commitRowMove(node.key, target.key);
    if (!moved) return;
    this.pendingFocusRow.set({ key: node.key, col, nodes });
    this.announce(
      formatPattern(this.msg().rowMoved, {
        position: String(moved.toIndex + 1),
        total: String(moved.total),
      }),
    );
  }

  /** Moves `fromKey` onto `targetKey`'s position and emits `rowReordered`. */
  private commitRowMove(
    fromKey: RowKey,
    targetKey: RowKey,
  ): { toIndex: number; total: number } | null {
    const target = { key: targetKey };
    const nodes = untracked(this.flatNodes);
    const dataNodes = nodes.filter(
      (node): node is DataRowNode<T> => node.kind === 'data',
    );
    const fromIndex = dataNodes.findIndex((node) => node.key === fromKey);
    const toIndex = dataNodes.findIndex((node) => node.key === target.key);
    if (fromIndex < 0 || toIndex < 0) return null;
    const moved = dataNodes[fromIndex].data;
    // plain-array data: move in place so the new order survives a reload
    const data = untracked(this.data);
    if (Array.isArray(data)) {
      const keyOf = untracked(this.keySelector);
      const source = data as T[];
      const sourceFrom = source.findIndex(
        (row, index) => keyOf(row, index) === fromKey,
      );
      const sourceTo = source.findIndex(
        (row, index) => keyOf(row, index) === target.key,
      );
      if (sourceFrom >= 0 && sourceTo >= 0) {
        source.splice(sourceTo, 0, ...source.splice(sourceFrom, 1));
        this.adapter.reload();
      }
    }
    this.rowReordered.emit({
      key: fromKey,
      targetKey: target.key,
      fromIndex,
      toIndex,
      row: moved,
    });
    return { toIndex, total: dataNodes.length };
  }

  // --- keyboard alternatives to the drag gestures (WCAG 2.1.1 / 2.5.7) --------

  /** Text of the permanent polite live region. */
  protected readonly liveMessage = signal('');

  /** Announces `text`, re-announcing an identical message too. */
  private announce(text: string): void {
    // a no-break space toggles so a repeated message is still a DOM change
    this.liveMessage.set(
      untracked(this.liveMessage) === text ? `${text}\u00A0` : text,
    );
  }

  protected headerKeyShortcuts(column: ResolvedColumn<T>): string | null {
    return ogeGridHeaderKeyShortcuts({
      resize: this.columnResize(),
      move: !!column.field && this.columnReorder(),
    });
  }

  protected resizeLabel(column: ResolvedColumn<T>): string {
    return formatPattern(this.msg().resizeColumn, { column: column.caption });
  }

  private widthBounds(
    column: ResolvedColumn<T>,
    now = 0,
  ): OgeColumnWidthBounds {
    return ogeColumnWidthBounds(
      column.minWidth,
      column.maxWidth,
      Math.max(this.hostWidth(), now),
    );
  }

  /** The separator's `aria-valuenow/min/max`: the column width in px. */
  protected separatorValue(column: ResolvedColumn<T>): {
    now: number;
    min: number;
    max: number;
  } {
    const now = Math.round(
      this.layoutModel.colWidths()[column.absIndex] ??
        this.config.columnMinWidth,
    );
    const bounds = this.widthBounds(column, now);
    return { now: clampColumnWidth(now, bounds), ...bounds };
  }

  private headerCellOf(id: string): HTMLElement | null {
    return (
      Array.from(
        this.hostRef.nativeElement.querySelectorAll<HTMLElement>(
          '.oge-header-row > .oge-header-cell[data-colid]',
        ),
      ).find((cell) => cell.dataset['colid'] === id) ?? null
    );
  }

  /** Sets a column's width from the keyboard, clamped to its bounds. */
  private resizeColumnTo(
    column: ResolvedColumn<T>,
    width: number,
    announce: boolean,
  ): void {
    const next = clampColumnWidth(width, this.widthBounds(column, width));
    this.store.columns.setWidth(column.id, next);
    if (announce) {
      this.announce(
        formatPattern(this.msg().columnResized, {
          column: column.caption,
          width: String(next),
        }),
      );
    }
  }

  /** Alt+Arrow resizes, Ctrl+Shift+Arrow moves the focused header's column. */
  protected onHeaderKeydown(
    column: ResolvedColumn<T>,
    event: KeyboardEvent,
  ): void {
    if (event.target !== event.currentTarget) return;
    const command = ogeGridHeaderKeyCommand(event, this.rtl());
    if (!command) return;
    if (command.kind === 'resize') {
      if (!this.columnResize()) return;
      event.preventDefault();
      event.stopPropagation();
      const cell = event.currentTarget as HTMLElement;
      const current = cell.offsetWidth || this.separatorValue(column).now;
      this.resizeColumnTo(column, current + command.delta, true);
      return;
    }
    if (!this.columnReorder() || !column.field) return;
    event.preventDefault();
    event.stopPropagation();
    this.moveColumnByKeyboard(column, command.direction);
  }

  private moveColumnByKeyboard(
    column: ResolvedColumn<T>,
    direction: 1 | -1,
  ): void {
    const columns = this.resolvedColumns();
    const target = ogeColumnMoveTarget(columns, column.id, direction);
    if (!target) return;
    this.store.columns.reorder(
      columns.map((c) => c.id),
      column.id,
      target.anchorId,
      target.position,
    );
    this.announce(
      formatPattern(this.msg().columnMoved, {
        column: column.caption,
        position: String(target.toIndex + 1),
        total: String(columns.length),
      }),
    );
    // the header re-renders in its new slot: keep the focus on it
    setTimeout(() => this.headerCellOf(column.id)?.focus());
  }

  /** APG window-splitter keys on the focused resize separator. */
  protected onResizeHandleKeydown(
    column: ResolvedColumn<T>,
    event: KeyboardEvent,
  ): void {
    const command = ogeColumnSeparatorKeyCommand(event, this.rtl());
    if (!command) return;
    event.preventDefault();
    event.stopPropagation();
    if (command.kind === 'exit') {
      (event.currentTarget as HTMLElement)
        .closest<HTMLElement>('.oge-header-cell')
        ?.focus();
      return;
    }
    const cell = (event.currentTarget as HTMLElement).closest<HTMLElement>(
      '.oge-header-cell',
    );
    const current = cell?.offsetWidth || this.separatorValue(column).now;
    const width = ogeSeparatorTargetWidth(
      command,
      current,
      this.widthBounds(column, current),
    );
    if (width !== null) this.resizeColumnTo(column, width, false);
  }

  /** Ctrl+Arrow reorders the grouping, Delete / Backspace removes it. */
  protected onGroupChipKeydown(field: string, event: KeyboardEvent): void {
    const command = ogeGroupChipKeyCommand(event, this.rtl());
    if (!command) return;
    event.preventDefault();
    event.stopPropagation();
    const caption = this.groupCaption(field);
    const fields = this.store.grouping.descriptors().map((d) => d.field);
    if (command.kind === 'remove') {
      const at = fields.indexOf(field);
      const neighbour = fields[at + 1] ?? fields[at - 1];
      this.store.grouping.ungroup(field);
      this.announce(
        formatPattern(this.msg().groupRemoved, { column: caption }),
      );
      // focus the neighbouring chip, or the column's header when none is left
      setTimeout(() => {
        const chip =
          neighbour === undefined ? null : this.groupChipButtonOf(neighbour);
        (chip ?? this.headerCellOf(field))?.focus();
      });
      return;
    }
    const index = this.store.grouping.move(field, command.direction);
    if (index < 0) return;
    this.announce(
      formatPattern(this.msg().groupMoved, {
        column: caption,
        position: String(index + 1),
        total: String(fields.length),
      }),
    );
    setTimeout(() => this.groupChipButtonOf(field)?.focus());
  }

  private groupChipButtonOf(field: string): HTMLElement | null {
    return (
      Array.from(
        this.hostRef.nativeElement.querySelectorAll<HTMLElement>(
          '.oge-group-chip-remove',
        ),
      ).find((button) => button.dataset['groupField'] === field) ?? null
    );
  }

  /** Ctrl+ArrowUp/Down on a column-chooser item moves that column. */
  protected onChooserKeydown(id: string, event: KeyboardEvent): void {
    const direction = ogeChooserMoveDirection(event);
    if (direction === null || !this.columnReorder()) return;
    event.preventDefault();
    event.stopPropagation();
    const entries = this.chooserEntries();
    const ids = entries.map((entry) => entry.id);
    const target = ogeListMoveTarget(ids, id, direction);
    if (!target) return;
    this.store.columns.reorder(ids, id, target.anchorId, target.position);
    this.announce(
      formatPattern(this.msg().columnMoved, {
        column: entries.find((entry) => entry.id === id)?.caption ?? id,
        position: String(target.toIndex + 1),
        total: String(ids.length),
      }),
    );
    setTimeout(() => {
      const item = Array.from(
        document.querySelectorAll<HTMLElement>('.oge-chooser-item'),
      ).find((element) => element.dataset['chooserId'] === id);
      item?.querySelector<HTMLElement>('input, [tabindex="0"]')?.focus();
    });
  }

  protected onCheckboxToggle(node: DataRowNode<T>, event: Event): void {
    event.stopPropagation();
    if (this.selectionDeferred()) {
      this.deferredToggle(node.key);
      return;
    }
    this.store.selection.toggle(node.key);
  }

  /** Select-all works on the current filtered set; scope via `selectAllMode`. */
  protected toggleSelectAll(): void {
    const announce = (): void =>
      this.announcer.selectionCount(
        untracked(this.selectionDeferred)
          ? untracked(this.selectionFilter)
            ? untracked(this.totalCount)
            : 0
          : untracked(this.store.selection.count),
      );
    if (untracked(this.allSelected)) {
      this.clearSelection();
      announce();
    } else {
      void this.runSelectAll().then(announce);
    }
  }

  /** Loads the full filtered set (paging ignored) and selects every key. */
  private async selectAllPages(): Promise<void> {
    const { rows } = await this.getExportData();
    const keyOf = untracked(this.keySelector);
    this.store.selection.replace(rows.map((row, index) => keyOf(row, index)));
  }

  protected ariaSelectedOf(node: DataRowNode<T>): boolean | null {
    return this.selectionMode() === 'none'
      ? null
      : this.isRowSelected(node.key);
  }

  // --- keyboard navigation -------------------------------------------------

  private readonly keyboard = new KeyboardNavModel<T>({
    flatNodes: this.flatNodes,
    columnCount: computed(() => this.resolvedColumns().length),
    rtl: this.rtl,
    pageSize: computed(() =>
      Math.max(1, Math.floor(this.viewportHeight() / this.effRowHeight()) - 1),
    ),
  });

  /** Focused cell: flat node index + visible column index. */
  protected readonly focusedCell = this.keyboard.focusedCell;

  protected isCellTabbable(row: number, col: number): boolean {
    return this.keyboard.isCellTabbable(row, col);
  }

  protected onCellFocus(row: number, col: number): void {
    // any focus move of its own supersedes a pending keyboard row move
    const pending = untracked(this.pendingFocusRow);
    const current = untracked(this.focusedCell);
    if (pending && (current?.row !== row || current.col !== col))
      this.pendingFocusRow.set(null);
    this.keyboard.onCellFocus(row, col);
  }

  /** Brings a virtualized column into the horizontal window before focusing. */
  private scrollColumnIntoView(col: number): void {
    if (!this.colVirtualized()) return;
    const widths = this.layoutModel.colWidths();
    if (col < 0 || col >= widths.length) return;
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) return;
    let left = this.leadingWidth();
    for (let i = 0; i < col; i++) left += widths[i];
    const right = left + widths[col];
    if (left < viewport.scrollLeft) viewport.scrollLeft = left;
    else if (right > viewport.scrollLeft + viewport.clientWidth) {
      viewport.scrollLeft = right - viewport.clientWidth;
    }
    this.scrollLeft.set(viewport.scrollLeft);
  }

  private scrollRowIntoView(row: number): void {
    this.virtualizer.scrollRowIntoView(row);
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // close any open popup (menus, header filter, chooser) before anything else
      if (
        this.contextMenu() ||
        this.operatorMenu() ||
        this.headerFilterField() !== null ||
        this.chooserOpen()
      ) {
        event.preventDefault();
        this.closePopups();
        return;
      }
    }
    const noEditorOpen =
      this.store.editing.editCell() === null &&
      this.store.editing.editRowKey() === null;
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'a' &&
      this.cellSelect()
    ) {
      // cell mode: Ctrl+A selects every cell
      if (!noEditorOpen) return;
      event.preventDefault();
      const nodes = this.flatNodes();
      const last = this.resolvedColumns().length - 1;
      if (nodes.length && last >= 0)
        this.rangeCore.setRanges([
          {
            anchor: { row: 0, col: 0 },
            focus: { row: nodes.length - 1, col: last },
          },
        ]);
      return;
    }
    if (noEditorOpen && this.handleEditShortcut(event)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      // Ctrl+A selects every (filtered) row in multi-select modes
      const mode = this.selectionMode();
      if (noEditorOpen && (mode === 'multiple' || mode === 'checkbox')) {
        event.preventDefault();
        if (!this.allSelected()) this.toggleSelectAll();
      }
      return;
    }
    if (
      noEditorOpen &&
      isOgeContextMenuKey(event) &&
      this.openContextMenuFromKeyboard(event)
    )
      return;
    const cell = this.focusedCell();
    if (!cell) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      // no editor open → copy selection/cell; native copy still runs unhindered
      if (noEditorOpen) void this.copyToClipboard();
      return;
    }
    if (event.key === ' ') {
      const node = this.flatNodes()[cell.row];
      if (
        node?.kind === 'data' &&
        this.selectionMode() !== 'none' &&
        !this.cellSelect()
      ) {
        event.preventDefault();
        if (this.selectionDeferred()) {
          if (this.selectionMode() === 'single')
            this.deferredSelectOnly(node.key);
          else this.deferredToggle(node.key);
        } else if (this.selectionMode() === 'single') {
          this.store.selection.selectOnly(node.key);
        } else this.store.selection.toggle(node.key);
      }
      return;
    }
    const rowMove = ogeRowMoveDirection(event);
    if (
      rowMove !== null &&
      noEditorOpen &&
      this.rowDragging() &&
      (event.target as HTMLElement | null)?.closest?.('[data-cell]')
    ) {
      event.preventDefault();
      this.moveRowByKeyboard(cell.row, rowMove, cell.col);
      return;
    }
    if (this.keyboard.handleKey(event)) {
      event.preventDefault();
      const next = this.focusedCell();
      if (this.cellSelect() && next) {
        if (isOgeRangeExtendKey(event)) this.rangeCore.extendTo(next);
        else this.rangeCore.selectCell(next);
      }
    }
  }

  // --- context menu --------------------------------------------------------

  protected readonly contextMenu = signal<{
    x: number;
    y: number;
    items: OgeMenuItem[];
  } | null>(null);

  private readonly contextMenuPopupRef = viewChild('contextMenuPopup', {
    read: ElementRef,
  });

  /** Anchored context menu: pointer-point positioning with viewport clamping. */
  readonly contextMenuPanel = new OgeAnchoredPanel({
    anchor: () => this.hostRef.nativeElement,
    anchorRect: () => {
      const menu = this.contextMenu();
      return menu ? { top: menu.y, left: menu.x, width: 0, height: 0 } : null;
    },
    panel: () => this.contextMenuPopupRef()?.nativeElement ?? null,
    placement: () => 'bottom-start',
    onClosed: () => this.contextMenu.set(null),
  });

  private openContextMenu(x: number, y: number, items: OgeMenuItem[]): void {
    this.contextMenu.set({ x, y, items });
    this.contextMenuPanel.open();
    this.contextMenuPanel.updatePosition();
    // the WAI-ARIA menu keyboard lives on the focused menu-list container
    setTimeout(() =>
      this.contextMenuPopupRef()
        ?.nativeElement.querySelector('.oge-menu-list')
        ?.focus(),
    );
  }

  protected onContextMenuItemClick(_event: OgeMenuListItemClickEvent): void {
    // the menu-list runs item.action after this handler returns
    this.contextMenuPanel.close('select');
  }

  protected onRowContextMenuOpen(
    node: DataRowNode<T>,
    event: MouseEvent,
  ): void {
    if (this.contextMenuEcho.swallow(event)) return;
    this.openRowContextMenu(
      node,
      event.clientX,
      event.clientY,
      event,
      'pointer',
    );
  }

  private openRowContextMenu(
    node: DataRowNode<T>,
    x: number,
    y: number,
    event: MouseEvent | KeyboardEvent,
    source: OgeContextMenuSource,
  ): void {
    const items: OgeMenuItem[] = [];
    this.rowContextMenu.emit({
      row: node.data,
      key: node.key,
      clientX: x,
      clientY: y,
      items,
      source,
      event,
    });
    if (!items.length) return; // fall back to the native browser menu
    event.preventDefault();
    this.openContextMenu(x, y, items);
  }

  /** Swallows the native `contextmenu` that may follow a keyboard-opened menu. */
  private readonly contextMenuEcho = new OgeContextMenuEcho();

  /**
   * The Menu key / Shift+F10 open the row or header menu at the focused cell
   * (see `@oge-ui/behavior`'s grid-context-menu). Returns whether it did.
   */
  private openContextMenuFromKeyboard(event: KeyboardEvent): boolean {
    const target = ogeContextMenuKeyTarget(event.target);
    if (!target) return false;
    if (target.headerColumnId !== null) {
      const column = this.resolvedColumns().find(
        (c) => c.id === target.headerColumnId,
      );
      if (!column?.field) return false;
      this.contextMenuEcho.mark(event.timeStamp);
      event.preventDefault();
      this.openHeaderContextMenu(column, target.x, target.y, event, 'keyboard');
      return true;
    }
    const node =
      target.rowIndex === null ? undefined : this.flatNodes()[target.rowIndex];
    if (node?.kind !== 'data') return false;
    this.contextMenuEcho.mark(event.timeStamp);
    event.preventDefault();
    this.openRowContextMenu(node, target.x, target.y, event, 'keyboard');
    return true;
  }

  /** Built-in header context menu: sort / group / pin / hide. */
  protected onHeaderContextMenu(
    column: ResolvedColumn<T>,
    event: MouseEvent,
  ): void {
    if (this.contextMenuEcho.swallow(event)) return;
    this.openHeaderContextMenu(
      column,
      event.clientX,
      event.clientY,
      event,
      'pointer',
    );
  }

  private openHeaderContextMenu(
    column: ResolvedColumn<T>,
    x: number,
    y: number,
    event: MouseEvent | KeyboardEvent,
    source: OgeContextMenuSource,
  ): void {
    const field = column.field;
    if (!field) return;
    const messages = this.msg();
    const items: OgeMenuItem[] = [];
    if (column.sortable && this.sortMode() !== 'none') {
      items.push(
        {
          text: messages.sortAscending,
          action: () => this.store.sort.set([{ field, dir: 'asc' }]),
        },
        {
          text: messages.sortDescending,
          action: () => this.store.sort.set([{ field, dir: 'desc' }]),
        },
      );
      if (this.sortStateOf(column)) {
        items.push({
          text: messages.clearSort,
          action: () => this.store.sort.clear(),
        });
      }
    }
    if (this.groupPanel() || this.grouping()?.contextMenuEnabled) {
      const grouped = this.store.grouping
        .descriptors()
        .some((d) => d.field === field);
      items.push(
        grouped
          ? {
              text: messages.ungroupColumn,
              action: () => this.store.grouping.ungroup(field),
            }
          : {
              text: messages.groupByColumn,
              action: () => this.store.grouping.groupBy(field),
            },
      );
    }
    if (column.pinned !== 'left') {
      items.push({
        text: messages.pinLeft,
        action: () => this.store.columns.setPinned(column.id, 'left'),
      });
    }
    if (column.pinned !== 'right') {
      items.push({
        text: messages.pinRight,
        action: () => this.store.columns.setPinned(column.id, 'right'),
      });
    }
    if (column.pinned !== false) {
      items.push({
        text: messages.unpin,
        action: () => this.store.columns.setPinned(column.id, false),
      });
    }
    items.push({
      text: messages.autoFitColumn,
      action: () => this.fitColumn(column),
    });
    if (column.source) {
      const source = column.source;
      items.push({
        text: messages.hideColumn,
        action: () => source.visible.set(false),
      });
    }
    // consumers may add / remove / reorder the built-in items
    this.headerContextMenu.emit({
      field,
      caption: column.caption,
      clientX: x,
      clientY: y,
      items,
      source,
      event,
    });
    if (!items.length) return;
    event.preventDefault();
    event.stopPropagation();
    this.openContextMenu(x, y, items);
  }

  // --- editing -------------------------------------------------------------

  /** Editing engine: modes, editor controls, commit/cancel/save flows. */
  private readonly editingModel = new EditingModel<T, OgeColumn<T>>({
    editing: this.editing,
    slice: this.store.editing,
    columns: this.resolvedColumns,
    flatNodes: this.flatNodes,
    source: this.adapter.source,
    confirmDeleteMessage: computed(() => this.msg().confirmDelete),
    events: {
      savingChanges: (event) => this.savingChanges.emit(event),
      savedChanges: (event) => this.savedChanges.emit(event),
      editingStart: (event) => this.editingStart.emit(event),
      rowInserting: (event) => this.rowInserting.emit(event),
      rowInserted: (event) => this.rowInserted.emit(event),
      rowUpdating: (event) => this.rowUpdating.emit(event),
      rowUpdated: (event) => this.rowUpdated.emit(event),
      rowRemoving: (event) => this.rowRemoving.emit(event),
      rowRemoved: (event) => this.rowRemoved.emit(event),
      editCanceled: () => this.editCanceled.emit(),
      dataError: (error) => this.dataErrorOccurred.emit({ error }),
      validationFailed: (invalid) => this.announceInvalidEditor(invalid),
    },
    reload: () => this.adapter.reload(),
  });

  // --- live announcements --------------------------------------------------

  /**
   * Speaks sort, filter/search result count, page, group expansion,
   * select-all and blocked-save validation changes through the shared
   * `OgeLiveAnnouncer` (texts from `messages`). `undefined` falls back to the
   * config's `announcements` (default `true`).
   */
  readonly announcements = input<boolean | undefined>(undefined);

  private readonly liveAnnouncer = inject(OgeLiveAnnouncer);

  /** The shared announcement rules (`@oge-ui/behavior`). */
  private readonly announcer = new OgeGridAnnouncements({
    announce: (message, options) =>
      this.liveAnnouncer.announce(message, options),
    messages: () => untracked(this.msg),
    enabled: () => untracked(this.announcements) ?? this.config.announcements,
    caption: (field) => untracked(() => this.groupCaption(field)),
  });

  private readonly announcementEffect = effect(() => {
    const windowed = this.windowed();
    const snapshot = {
      sort: this.store.sort.descriptors(),
      filterKey: JSON.stringify([
        this.store.filter.combinedExpr(),
        this.store.filter.searchText().trim(),
      ]),
      resultToken: windowed ? this.adapter.windowRows() : this.adapter.result(),
      loading: windowed ? this.adapter.windowLoading() : this.adapter.loading(),
      rowCount: this.totalCount(),
      paging: this.store.paging.pageSize() != null,
      pageIndex: this.store.paging.pageIndex(),
      pageCount: this.pageCount(),
    };
    untracked(() => this.announcer.observe(snapshot));
  });

  /** Announces the first editor that blocked a commit, with its error text. */
  private announceInvalidEditor(
    invalid: readonly { key: RowKey; field: string }[],
  ): void {
    const first = invalid[0];
    if (!first) return;
    const control = untracked(this.activeControls).get(
      `${String(first.key)}::${first.field}`,
    );
    const error = control ? this.editorErrorText(control) : null;
    this.announcer.validationFailed(
      untracked(() => this.groupCaption(first.field)),
      error ?? untracked(this.msg).invalidError,
    );
  }

  protected readonly editingOptions = this.editingModel.editingOptions;
  protected readonly editMode = this.editingModel.editMode;
  protected readonly canUpdate = this.editingModel.canUpdate;
  protected readonly canDelete = this.editingModel.canDelete;
  protected readonly canAdd = this.editingModel.canAdd;

  /**
   * Fields the form/popup editors render, resolved from `editing.formItems`
   * (selection, order, labels, spans) — default: every editable column.
   */
  protected readonly editFormItems = computed<
    readonly { column: ResolvedColumn<T>; label: string; colSpan: number }[]
  >(() => {
    const editable = this.resolvedColumns().filter(
      (column) => column.editable && column.field,
    );
    const items = this.editingOptions()?.formItems;
    if (!items?.length) {
      return editable.map((column) => ({
        column,
        label: column.caption,
        colSpan: 1,
      }));
    }
    return items.flatMap((entry) => {
      const spec = typeof entry === 'string' ? { field: entry } : entry;
      const column = editable.find(
        (candidate) => candidate.field === spec.field,
      );
      if (!column) return [];
      return [
        {
          column,
          label: spec.label ?? column.caption,
          colSpan: Math.max(1, spec.colSpan ?? 1),
        },
      ];
    });
  });

  /**
   * The row currently rendered as an inline edit form, if any. Both the inline
   * form and the popup edit exactly one row at a time, which is what lets a
   * single `FormGroup` back either surface.
   */
  protected readonly editFormNode = computed<DataRowNode<T> | null>(() => {
    if (this.editMode() === 'popup') return this.popupNode();
    if (this.editMode() !== 'form') return null;
    const key = this.store.editing.editRowKey();
    if (key === null) return null;
    return (
      this.flatNodes().find(
        (node): node is DataRowNode<T> =>
          node.kind === 'data' && node.key === key,
      ) ?? null
    );
  });

  /**
   * The edited row's controls as one `FormGroup`, so `<oge-form>` can lay the
   * row out. The controls themselves still come from `EditingModel` — this is
   * only the shape `[formGroup]` expects.
   */
  protected readonly editFormGroup = computed<FormGroup | null>(() => {
    const node = this.editFormNode();
    if (!node) return null;
    const controls: Record<string, FormControl<unknown>> = {};
    for (const item of this.editFormItems()) {
      const field = item.column.field;
      if (!field) continue;
      controls[field] = this.editControl(node, item.column);
    }
    return new FormGroup(controls);
  });

  /** `editing.formItems` translated into the forms package's item model. */
  protected readonly editFormFields = computed<readonly OgeFormItemData[]>(
    () => {
      const node = this.editFormNode();
      if (!node) return [];
      const adapter = this.editAdapterTemplate();
      return this.editFormItems().flatMap((item) => {
        const field = item.column.field;
        if (!field) return [];
        const lookupItems = this.lookupItemsFor(node, item.column);
        return [
          {
            field,
            label: item.label,
            colSpan: item.colSpan,
            dataType: item.column.dataType,
            editorType: lookupItems ? ('selectBox' as const) : undefined,
            editorOptions: lookupItems
              ? { items: lookupItems, displayExpr: 'text', valueExpr: 'value' }
              : undefined,
            // a column's own *ogeEditTemplate keeps its documented context;
            // one adapter template resolves the column back from the field
            editorTemplate: item.column.editTemplate ? adapter : undefined,
          },
        ];
      });
    },
  );

  /** Layout columns for the edit form; `undefined` keeps the auto-fit default. */
  protected readonly editFormColCount = computed<number | 'auto'>(() => {
    const count = this.editingOptions()?.formColCount;
    return count && count > 0 ? count : 'auto';
  });

  /** Resolves a column back from an item field, for the edit-template adapter. */
  protected editColumnFor(field: string): ResolvedColumn<T> | null {
    return (
      this.editFormItems().find((item) => item.column.field === field)
        ?.column ?? null
    );
  }

  /** Trailing command column (edit/delete/save/cancel buttons). */
  protected readonly hasCommandColumn = computed(() => {
    if (this.commandButtons()?.length) return true;
    const mode = this.editMode();
    if (!mode) return false;
    if (mode === 'row' || mode === 'popup' || mode === 'form')
      return this.canUpdate() || this.canDelete();
    return this.canDelete();
  });

  /** Buttons rendered in a row's idle command cell — input overrides defaults. */
  protected readonly effCommandButtons = computed<
    readonly OgeCommandButton<T>[]
  >(() => {
    const custom = this.commandButtons();
    if (custom?.length) return custom;
    const mode = this.editMode();
    const buttons: OgeCommandButton<T>[] = [];
    if (
      (mode === 'row' || mode === 'popup' || mode === 'form') &&
      this.canUpdate()
    )
      buttons.push({ name: 'edit' });
    if (mode && this.canDelete()) buttons.push({ name: 'delete' });
    return buttons;
  });

  protected commandButtonVisible(
    button: OgeCommandButton<T>,
    node: DataRowNode<T>,
  ): boolean {
    return button.visible ? button.visible(node.data) : true;
  }

  protected runCommandButton(
    button: OgeCommandButton<T>,
    node: DataRowNode<T>,
    event: Event,
  ): void {
    event.stopPropagation();
    button.onClick?.(node.data, node.key);
  }

  /** Row data with pending edits applied (batch dirty view). */
  protected displayValue(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): unknown {
    return this.editingModel.displayValue(node, column);
  }

  protected isCellDirty(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): boolean {
    return this.editingModel.isCellDirty(node, column);
  }

  protected isRowEditing(key: RowKey): boolean {
    return this.editingModel.isRowEditing(key);
  }

  /** Form mode: the row whose cells are replaced by the inline form. */
  protected isFormRow(key: RowKey): boolean {
    return this.editingModel.isFormRow(key);
  }

  protected isCellEditorOpen(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): boolean {
    return this.editingModel.isCellEditorOpen(node, column);
  }

  /** Reactive controls for the active editor(s), keyed `key::field`. */
  protected readonly activeControls = this.editingModel.activeControls;

  protected editControl(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): FormControl<unknown> {
    return this.editingModel.editControl(node, column);
  }

  /** Editor option list — cascading (function) lookups see the row's draft. */
  protected lookupItemsFor(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): readonly LookupItem[] | undefined {
    return this.editingModel.lookupItemsFor(node, column);
  }

  protected editContextFor(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): OgeEditTemplateContext<T> {
    return {
      $implicit: this.editControl(node, column),
      row: node.data,
      column: column.source as OgeColumn<T>,
    };
  }

  protected editorErrorText(control: FormControl<unknown>): string | null {
    if (!control.invalid || !control.touched) return null;
    return control.hasError('required')
      ? this.msg().requiredError
      : this.msg().invalidError;
  }

  protected onCellClickToEdit(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
    event?: Event,
  ): void {
    // ignore events bubbling out of an open editor (e.g. its own Enter commit)
    if ((event?.target as HTMLElement | null)?.closest?.('.oge-editor')) return;
    if (event?.type === 'dblclick') {
      this.cellDblClick.emit({
        row: node.data,
        key: node.key,
        field: column.field,
        value: column.accessor(node.data),
        event,
      });
      return;
    }
    if (event?.type === 'click') {
      this.cellClick.emit({
        row: node.data,
        key: node.key,
        field: column.field,
        value: column.accessor(node.data),
        event,
      });
    }
    const mode = this.editMode();
    if (
      (mode !== 'cell' && mode !== 'batch') ||
      !this.canUpdate() ||
      !column.editable ||
      !column.field ||
      this.store.editing.isRemoved(node.key)
    ) {
      return;
    }
    // range selection owns the single click (spreadsheet style): editing
    // starts on double-click, F2 or Enter
    if (this.cellSelect() && event?.type === 'click') return;
    if (!this.store.editing.isCellEditing(node.key, column.field)) {
      if (
        !this.editingModel.notifyEditingStart(node.key, node.data, column.field)
      )
        return;
      this.store.editing.startCell(node.key, column.field);
    }
  }

  /** Commits the single-cell editor (cell → save, batch → pending change). */
  protected commitActiveCell(): void {
    this.editingModel.commitActiveCell();
  }

  protected cancelActiveEditor(): void {
    this.editingModel.cancelActiveEditor();
  }

  protected onEditorBlur(): void {
    this.editingModel.onEditorBlur();
  }

  /** Tab inside a cell editor: commit and open the next editable column. */
  protected commitAndNext(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
    event: Event,
  ): void {
    this.editingModel.commitAndNext(node, column, event);
  }

  protected startRowEdit(node: DataRowNode<T>, event?: Event): void {
    this.editingModel.startRowEdit(node, event);
  }

  /** Saves the row editor (row + popup modes). */
  protected commitActiveRow(): void {
    this.editingModel.commitActiveRow();
  }

  protected deleteRowNode(node: DataRowNode<T>, event?: Event): void {
    this.editingModel.deleteRow(node, event);
  }

  protected addNewRow(): void {
    this.createNewRow();
  }

  /** Shared toolbar/imperative add-row path — stages `initNewRow` prefills. */
  private createNewRow(): void {
    this.editingModel.addNewRow();
    const key = untracked(this.store.editing.added)[0];
    if (key === undefined) return;
    const event: OgeInitNewRowEvent = { key, values: {} };
    this.initNewRow.emit(event);
    if (Object.keys(event.values).length) {
      this.store.editing.setRowChanges(key, event.values);
    }
  }

  /** Batch toolbar: save everything pending. */
  protected saveAllChanges(): void {
    this.editingModel.saveAllChanges();
  }

  protected discardAllChanges(): void {
    this.editingModel.discardAllChanges();
  }

  // --- group panel & column drag/drop --------------------------------------

  /** Header the dragged column would be inserted in front of (drop indicator). */
  protected readonly headerDropTargetId = signal<string | null>(null);
  /** A dragged header is over the group panel. */
  protected readonly groupPanelDropActive = signal(false);

  /**
   * Pointer drag of a header (long press under touch, so a swipe still
   * scrolls the header): onto another header it reorders the columns, onto
   * the group panel it groups by the column — the `columns.reorder` /
   * `grouping.groupBy` commands the keyboard alternatives run.
   */
  protected onHeaderPointerDown(
    column: ResolvedColumn<T>,
    event: PointerEvent,
  ): void {
    const reorder = this.columnReorder();
    const group = this.groupPanel();
    if (event.button !== 0 || !column.field || (!reorder && !group)) return;
    const cell = event.currentTarget as HTMLElement;
    if (isOgeDragExcludedTarget(event.target, cell)) return;
    const host = this.hostRef.nativeElement;
    beginPointerDragDrop<OgeGridHeaderDropTarget>(event, {
      source: cell,
      autoScroll: this.viewportRef()?.nativeElement ?? null,
      autoScrollOptions: { axis: 'x' },
      resolve: (hit) =>
        resolveOgeHeaderDropTarget(hit, host, { reorder, group }),
      onOver: (target) => {
        const id =
          target?.kind === 'column' && target.id !== column.id
            ? target.id
            : null;
        if (this.headerDropTargetId() !== id) this.headerDropTargetId.set(id);
        this.groupPanelDropActive.set(target?.kind === 'group');
      },
      onDrop: (target) => {
        if (target.kind === 'group') {
          if (column.field) this.store.grouping.groupBy(column.field);
          return;
        }
        if (target.id === column.id) return;
        this.store.columns.reorder(
          this.resolvedColumns().map((c) => c.id),
          column.id,
          target.id,
        );
      },
      onEnd: () => {
        this.headerDropTargetId.set(null);
        this.groupPanelDropActive.set(false);
      },
    });
  }

  /** Chip the dragged grouping would land on (insert indicator). */
  protected readonly groupChipDropTarget = signal<string | null>(null);

  /**
   * Pointer reorder of the group chips — the drop moves the grouping step by
   * step through `grouping.move`, the command Ctrl+Arrow on a chip runs.
   */
  protected onGroupChipPointerDown(field: string, event: PointerEvent): void {
    if (event.button !== 0) return;
    const chip = event.currentTarget as HTMLElement;
    if (isOgeDragExcludedTarget(event.target, chip)) return;
    const panel = chip.closest('.oge-group-panel');
    beginPointerDragDrop<string>(event, {
      source: chip,
      resolve: (hit) =>
        resolveOgeAttributeTarget(hit, panel, 'data-group-chip'),
      onOver: (target) =>
        this.groupChipDropTarget.set(target === field ? null : target),
      onDrop: (target) => {
        const fields = this.store.grouping.descriptors().map((d) => d.field);
        const index = ogeMoveGroupingTo(
          this.store.grouping,
          fields,
          field,
          fields.indexOf(target),
        );
        if (index < 0) return;
        this.announce(
          formatPattern(this.msg().groupMoved, {
            column: this.groupCaption(field),
            position: String(index + 1),
            total: String(fields.length),
          }),
        );
      },
      onEnd: () => this.groupChipDropTarget.set(null),
    });
  }

  protected ungroup(field: string, event?: Event): void {
    event?.stopPropagation();
    this.store.grouping.ungroup(field);
  }

  // --- column resize -------------------------------------------------------

  private suppressHeaderClick = false;

  protected onResizeStart(
    column: ResolvedColumn<T>,
    event: PointerEvent,
  ): void {
    if (!this.columnResize()) return;
    event.preventDefault();
    event.stopPropagation();
    const headerCell = (event.target as HTMLElement).closest(
      '.oge-header-cell',
    ) as HTMLElement;
    const startWidth =
      headerCell?.offsetWidth ??
      (typeof column.width === 'number'
        ? column.width
        : this.config.pinnedDefaultWidth);
    const startX = event.clientX;
    const rtl = this.rtl();
    const bounds = ogeColumnWidthBounds(
      column.minWidth,
      column.maxWidth,
      Number.POSITIVE_INFINITY,
    );
    const onMove = (move: PointerEvent): void => {
      this.suppressHeaderClick = true;
      this.store.columns.setWidth(
        column.id,
        clampColumnWidth(
          resizedColumnWidth(startWidth, startX, move.clientX, rtl),
          bounds,
        ),
      );
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // allow the click swallow flag to reset after the click event fires
      setTimeout(() => (this.suppressHeaderClick = false));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- column chooser ------------------------------------------------------

  protected readonly chooserOpen = signal(false);
  private readonly chooserAnchor = signal<HTMLElement | null>(null);

  private readonly chooserPopupRef = viewChild('chooserPopup', {
    read: ElementRef,
  });

  /** Anchored column chooser: end-aligned below its toolbar button. */
  readonly chooserPanel = new OgeAnchoredPanel({
    anchor: () => this.chooserAnchor() ?? this.hostRef.nativeElement,
    panel: () => this.chooserPopupRef()?.nativeElement ?? null,
    placement: () => 'bottom-end',
    onClosed: () => this.chooserOpen.set(false),
  });

  protected toggleChooser(event: Event): void {
    event.stopPropagation();
    if (this.chooserOpen()) {
      this.chooserPanel.close();
      return;
    }
    this.openChooser(event.currentTarget as HTMLElement);
  }

  /**
   * Opens the column chooser below `anchor` — e.g. a button in your own header
   * bar, with `columnChooser` left off so the grid draws no toolbar row. Without
   * an anchor it opens below the toolbar's chooser button, or the grid's edge.
   */
  showColumnChooser(anchor?: HTMLElement): void {
    if (untracked(this.chooserOpen)) return;
    const button =
      anchor ??
      this.hostRef.nativeElement.querySelector<HTMLElement>(
        '.oge-chooser-button',
      );
    this.openChooser(button);
  }

  /** Closes the column chooser if it is open. */
  hideColumnChooser(): void {
    if (untracked(this.chooserOpen)) this.chooserPanel.close();
  }

  private openChooser(anchor: HTMLElement | null): void {
    this.chooserAnchor.set(anchor);
    this.chooserOpen.set(true);
    this.chooserPanel.open();
    this.chooserPanel.updatePosition();
  }

  /** Chooser rows: every column with its id and caption, in display order. */
  protected readonly chooserEntries = computed<
    readonly { id: string; caption: string; column: OgeColumn<T> | undefined }[]
  >(() => {
    const declared = this.declaredColumns();
    let entries: {
      id: string;
      caption: string;
      column: OgeColumn<T> | undefined;
    }[];
    if (declared.length) {
      entries = declared.map((column, index) => {
        const field = column.field();
        return {
          id: field ?? `col-${index}`,
          caption: column.caption() ?? (field ? humanize(field) : ''),
          column,
        };
      });
    } else {
      entries = this.resolvedColumns().map((column) => ({
        id: column.id,
        caption: column.caption,
        column: undefined,
      }));
    }
    const order = this.store.columns.order();
    if (!order) return entries;
    return [...entries].sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      return (
        (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) -
        (ib < 0 ? Number.MAX_SAFE_INTEGER : ib)
      );
    });
  });

  protected toggleChooserVisible(entry: {
    column: OgeColumn<T> | undefined;
  }): void {
    entry.column?.visible.set(!entry.column.visible());
  }

  /** Chooser row the dragged column would be inserted in front of. */
  protected readonly chooserDropTargetId = signal<string | null>(null);

  /**
   * Reorders columns by dragging one chooser row onto another (long press
   * under touch) — `columns.reorder`, as Ctrl+ArrowUp/Down on the row runs.
   * The click a drag ends with is swallowed, so the checkbox keeps its state.
   */
  protected onChooserPointerDown(id: string, event: PointerEvent): void {
    if (event.button !== 0 || !this.columnReorder()) return;
    const row = event.currentTarget as HTMLElement;
    const list = row.closest('.oge-chooser-popup');
    beginPointerDragDrop<string>(event, {
      source: row,
      resolve: (hit) => resolveOgeAttributeTarget(hit, list, 'data-chooser-id'),
      onOver: (target) => {
        const next = target === id ? null : target;
        if (this.chooserDropTargetId() !== next)
          this.chooserDropTargetId.set(next);
      },
      onDrop: (targetId) => {
        if (targetId === id || !this.columnReorder()) return;
        this.store.columns.reorder(
          this.chooserEntries().map((entry) => entry.id),
          id,
          targetId,
        );
      },
      onEnd: () => this.chooserDropTargetId.set(null),
    });
  }

  // --- filtering -----------------------------------------------------------

  private readonly filterTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  private debounced(key: string, apply: () => void): void {
    const pending = this.filterTimers.get(key);
    if (pending) clearTimeout(pending);
    const delay = this.effFilterDebounce();
    if (delay <= 0) {
      apply();
      return;
    }
    this.filterTimers.set(
      key,
      setTimeout(() => {
        this.filterTimers.delete(key);
        apply();
      }, delay),
    );
  }

  protected onFilterInput(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    this.rowFilterRaw.set(field, raw);
    this.debounced(`f:${field}`, () => {
      this.store.filter.setRowFilter(
        field,
        this.rowFilterExprFor(column, raw, this.currentOperator(column)),
      );
    });
  }

  /** Row-filter expression for a column — the column's custom builder wins. */
  private rowFilterExprFor(
    column: ResolvedColumn<T>,
    raw: string,
    operator?: FilterOperator,
  ): FilterExpr | null {
    return rowFilterExpr(column, raw, operator);
  }

  /** Selects apply immediately (no debounce). */
  protected onFilterSelect(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    this.rowFilterRaw.set(field, raw);
    this.store.filter.setRowFilter(
      field,
      this.rowFilterExprFor(column, raw, this.currentOperator(column)),
    );
  }

  protected onSearchInput(raw: string): void {
    this.debounced('search', () => this.store.filter.setSearchText(raw));
  }

  // --- filter-row operator menu --------------------------------------------

  /** User-chosen filter-row operator per field (overrides column default). */
  private readonly rowFilterOps = signal<ReadonlyMap<string, FilterOperator>>(
    new Map(),
  );
  /** Last raw editor value per field, so an operator change re-applies it. */
  private readonly rowFilterRaw = new Map<string, string>();

  protected readonly operatorMenu = signal<{
    column: ResolvedColumn<T>;
    anchor: HTMLElement;
  } | null>(null);

  private readonly operatorPopupRef = viewChild('operatorPopup', {
    read: ElementRef,
  });

  /** Anchored operator menu below its filter-row button. */
  readonly operatorPanel = new OgeAnchoredPanel({
    anchor: () => this.operatorMenu()?.anchor ?? this.hostRef.nativeElement,
    panel: () => this.operatorPopupRef()?.nativeElement ?? null,
    placement: () => 'bottom-start',
    onClosed: () => this.operatorMenu.set(null),
  });

  /** Operator choices as canonical menu items; the reset row carries no value. */
  protected operatorItems(column: ResolvedColumn<T>): OgeMenuItem[] {
    const current = this.currentOperator(column);
    const items: OgeMenuItem[] = this.operatorChoices(column).map((op) => ({
      text: this.msg().operators[op],
      value: op,
      checked: op === current ? true : undefined,
    }));
    items.push({ text: '', separator: true });
    items.push({ text: this.msg().resetOperator });
    return items;
  }

  protected currentOperator(column: ResolvedColumn<T>): FilterOperator {
    return effectiveFilterOperator(
      column,
      column.field ? this.rowFilterOps().get(column.field) : undefined,
    );
  }

  protected operatorSymbol(column: ResolvedColumn<T>): string {
    return filterOperatorSymbol(this.currentOperator(column));
  }

  protected toggleOperatorMenu(
    column: ResolvedColumn<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    if (this.operatorMenu()?.column.id === column.id) {
      this.operatorPanel.close();
      return;
    }
    this.operatorMenu.set({
      column,
      anchor: event.currentTarget as HTMLElement,
    });
    this.operatorPanel.open();
    this.operatorPanel.updatePosition();
  }

  protected operatorChoices(column: ResolvedColumn<T>): FilterOperator[] {
    return filterRowOperatorChoices(column.dataType);
  }

  protected chooseOperator(op: FilterOperator | null): void {
    const menu = this.operatorMenu();
    this.operatorPanel.close('select');
    const field = menu?.column.field;
    if (!menu || !field) return;
    const previous = this.currentOperator(menu.column);
    const next = new Map(this.rowFilterOps());
    if (op === null) next.delete(field);
    else next.set(field, op);
    this.rowFilterOps.set(next);
    // "between" swaps the editor; the old editor's value means nothing to it
    if ((previous === 'between') !== (op === 'between')) {
      this.store.filter.setRowFilter(field, null);
      return;
    }
    // re-apply the current editor value with the new operator
    const raw = this.rowFilterRaw.get(field) ?? '';
    const effective = effectiveFilterOperator(menu.column, op ?? undefined);
    this.store.filter.setRowFilter(
      field,
      this.rowFilterExprFor(menu.column, raw, effective),
    );
  }

  // --- filter panel + builder ----------------------------------------------

  protected readonly builderOpen = signal(false);
  protected builderTree: OgeBuilderGroup = {
    kind: 'group',
    logic: 'and',
    items: [],
  };
  /** Bumped by the recursive editor so the preview text refreshes. */
  protected readonly builderVersion = signal(0);

  protected readonly builderFields = computed<OgeFilterBuilderField[]>(() =>
    this.resolvedColumns()
      .filter((column) => column.filterable && column.field)
      .map((column) => ({
        field: column.field as string,
        caption: column.caption,
        dataType: column.dataType,
      })),
  );

  protected readonly filterPanelText = computed<string | null>(() => {
    const expr = this.store.filter.builderFilter();
    if (!expr) return null;
    return describeExpr(expr, this.builderFields(), this.msg());
  });

  protected openFilterBuilder(): void {
    this.builderTree = exprToBuilder(
      this.store.filter.builderFilter(),
      this.builderFields(),
    );
    if (!this.builderTree.items.length) {
      const first = this.builderFields()[0];
      if (first) {
        this.builderTree.items.push({
          kind: 'condition',
          field: first.field,
          op: operatorsFor(first.dataType)[0],
          value: '',
        });
      }
    }
    this.builderVersion.set(this.builderVersion() + 1);
    this.builderOpen.set(true);
  }

  protected readonly builderPreview = computed<string>(() => {
    this.builderVersion();
    const expr = builderToExpr(this.builderTree, this.builderFields());
    return expr ? describeExpr(expr, this.builderFields(), this.msg()) : '—';
  });

  protected applyFilterBuilder(): void {
    this.store.filter.setBuilderFilter(
      builderToExpr(this.builderTree, this.builderFields()),
    );
    this.builderOpen.set(false);
  }

  protected clearBuilderFilter(event?: Event): void {
    event?.stopPropagation();
    this.store.filter.setBuilderFilter(null);
  }

  // --- search highlighting --------------------------------------------------

  /** Cell text split into search-match runs, or null when the search is off. */
  /** Highlight runs memoized per cell text — cleared when the query changes. */
  private highlightCacheQuery = '';
  private readonly highlightCache = new Map<
    string,
    readonly SearchHighlightSegment[] | null
  >();

  /**
   * The runs the template wraps in `<mark>`.
   *
   * Segments rather than a trusted HTML string: the previous version escaped
   * the cell text and handed the result to `bypassSecurityTrustHtml`, which is
   * safe but unusable in a codebase that bans the trusted-HTML APIs outright —
   * and a grid whose cells show reported, hostile content is exactly where such
   * a ban exists. Emitting real text nodes and `<mark>` elements removes the
   * sink instead of defending it.
   */
  protected searchHighlightRuns(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): readonly SearchHighlightSegment[] | null {
    const query = this.store.filter.searchText().trim();
    if (!query) return null;
    const text = this.cellDisplayText(node, column);
    if (query !== this.highlightCacheQuery) {
      this.highlightCacheQuery = query;
      this.highlightCache.clear();
    }
    const cached = this.highlightCache.get(text);
    if (cached !== undefined) return cached;
    const runs = buildSearchHighlightSegments(text, query);
    if (this.highlightCache.size > 1000) this.highlightCache.clear();
    this.highlightCache.set(text, runs);
    return runs;
  }

  // --- header filter (Excel-style distinct values) -------------------------

  protected readonly headerFilterField = signal<string | null>(null);
  private readonly headerFilterAnchor = signal<HTMLElement | null>(null);
  /** null while the distinct values are loading. */
  protected readonly headerFilterValues = signal<readonly unknown[] | null>(
    null,
  );
  /** Search text inside the header-filter popup. */
  protected readonly headerFilterSearch = signal('');

  private readonly headerFilterPopupRef = viewChild('headerFilterPopup', {
    read: ElementRef,
  });

  /** Anchored header-filter popup below its funnel button. */
  readonly headerFilterPanel = new OgeAnchoredPanel({
    anchor: () => this.headerFilterAnchor() ?? this.hostRef.nativeElement,
    panel: () => this.headerFilterPopupRef()?.nativeElement ?? null,
    placement: () => 'bottom-start',
    onClosed: () => {
      this.headerFilterField.set(null);
      this.headerFilterValues.set(null);
    },
  });

  protected readonly visibleHeaderValues = computed<readonly unknown[] | null>(
    () => {
      const values = this.headerFilterValues();
      if (!values) return null;
      return filterHeaderValues(values, this.headerFilterSearch(), (value) =>
        this.headerValueText(value),
      );
    },
  );

  private headerYearOf(value: unknown): string {
    return headerYearLabel(value, this.msg().blankValue);
  }

  protected isHeaderGroupSelected(group: {
    values: readonly unknown[];
  }): boolean {
    return headerGroupState(this.headerSelection(), group.values) === 'all';
  }

  protected isHeaderGroupIndeterminate(group: {
    values: readonly unknown[];
  }): boolean {
    return headerGroupState(this.headerSelection(), group.values) === 'some';
  }

  /** The open column's selection; `null` means every value (no filter). */
  private headerSelection(): readonly unknown[] | null {
    const field = this.headerFilterField();
    return field == null ? null : this.store.filter.headerFilterOf(field);
  }

  /** Checks/unchecks every value of a year group at once. */
  protected toggleHeaderGroup(group: { values: readonly unknown[] }): void {
    const field = this.headerFilterField();
    const all = this.headerFilterValues();
    if (field == null || all == null) return;
    this.store.filter.setHeaderFilter(
      field,
      toggleHeaderGroupSelection(all, this.headerSelection(), group.values),
    );
  }

  protected readonly headerFilterAvailable = computed(
    () =>
      this.headerFilterVisible() &&
      typeof this.adapter.source()?.distinct === 'function',
  );

  protected toggleHeaderFilter(column: ResolvedColumn<T>, event: Event): void {
    event.stopPropagation();
    const field = column.field;
    if (!field) return;
    if (this.headerFilterField() === field) {
      this.closeHeaderFilter();
      return;
    }
    this.headerFilterAnchor.set(event.currentTarget as HTMLElement);
    this.headerFilterField.set(field);
    this.headerFilterValues.set(null);
    this.headerFilterSearch.set('');
    this.headerDateCollapsed.set(new Set());
    this.headerConditionDraft.set(
      parseHeaderConditionExpr(
        this.store.filter.rowFilterOf(ogeHeaderConditionKey(field)),
        column.dataType,
      ),
    );
    this.headerFilterPanel.open();
    this.headerFilterPanel.updatePosition();
    if (this.headerFilterMode() === 'conditions') return;
    this.adapter
      .source()
      ?.distinct?.(field)
      .then((values) => {
        if (this.headerFilterField() === field) {
          this.headerFilterValues.set(
            values.slice(0, this.effHeaderFilterLimit()),
          );
        }
      });
  }

  protected closeHeaderFilter(): void {
    this.headerFilterPanel.close();
  }

  protected closePopups(): void {
    // the anchored panels also close themselves (outside click / Escape);
    // this is the API/keyboard sweep. The edit/builder dialogs run on
    // oge-modal, which owns its Escape/backdrop closing via the overlay stack.
    this.headerFilterPanel.close();
    this.chooserPanel.close();
    this.contextMenuPanel.close();
    this.operatorPanel.close();
    this.hintCore.hide();
  }

  protected isHeaderFilterActive(column: ResolvedColumn<T>): boolean {
    return (
      column.field != null &&
      (this.store.filter.headerFilterOf(column.field) != null ||
        this.store.filter.rowFilterOf(ogeHeaderConditionKey(column.field)) !=
          null)
    );
  }

  protected isHeaderValueSelected(value: unknown): boolean {
    if (this.headerFilterField() == null) return false;
    return isHeaderValueSelected(this.headerSelection(), value);
  }

  protected toggleHeaderValue(value: unknown): void {
    const field = this.headerFilterField();
    const all = this.headerFilterValues();
    if (field == null || all == null) return;
    this.store.filter.setHeaderFilter(
      field,
      toggleHeaderValueSelection(all, this.headerSelection(), value),
    );
  }

  protected toggleAllHeaderValues(): void {
    const field = this.headerFilterField();
    if (field == null) return;
    this.store.filter.setHeaderFilter(
      field,
      toggleAllHeaderValueSelection(this.headerSelection()),
    );
  }

  protected allHeaderValuesSelected(): boolean {
    return (
      this.headerFilterField() != null &&
      allHeaderValuesSelected(this.headerSelection())
    );
  }

  protected headerValueText(value: unknown): string {
    const field = this.headerFilterField();
    const column = field ? this.columnByField(field) : undefined;
    return headerValueText(value, {
      dataType: column?.dataType ?? 'string',
      lookupItems: column?.lookupItems,
      format: column?.format,
      messages: this.msg(),
    });
  }

  // ===========================================================================
  // Interaction depth: cell ranges, clipboard, fill, undo, styling hooks,
  // conditional formats, pinned / sticky rows, spans, auto-fit, cell hints,
  // cross-grid row drag. The decisions are `@oge-ui/behavior`'s; this is the
  // Angular wiring.
  // ===========================================================================

  /** Options of cell range selection (`selectionMode: 'cell'`). */
  readonly rangeSelection = input<OgeRangeSelectionOptions | undefined>(
    undefined,
  );

  /** Two-way binding of the selected cell ranges (`selectionMode: 'cell'`). */
  readonly selectedRanges = model<readonly OgeGridCellRange[]>([]);

  /** Fires after the selected cell ranges changed, with their sizes. */
  readonly rangeSelectionChanged = output<OgeRangeSelectionChangedEvent>();

  /** Cell range mode is on. */
  protected readonly cellSelect = computed(
    () => this.selectionMode() === 'cell',
  );

  private readonly rangeCore = new OgeGridRangeSelectionCore(
    {
      isDataRow: (row) => this.flatNodes()[row]?.kind === 'data',
      multiple: () => this.rangeSelection()?.multipleRanges !== false,
    },
    SIGNAL_ADAPTER,
  );

  /** The fill handle shows (cell mode, editing on, option not off). */
  protected readonly fillHandleEnabled = computed(
    () =>
      this.cellSelect() &&
      this.rangeSelection()?.fillHandle !== false &&
      !!this.editMode() &&
      this.canUpdate(),
  );

  /** Cells a fill-handle drag would write (dashed preview). */
  protected readonly fillPreview = signal<OgeGridRangeBounds | null>(null);

  private readonly rangeSyncEffects = (() => {
    // ranges → model + event + announcement (the initial state is no change)
    let previous: readonly OgeGridCellRange[] | null = null;
    effect(() => {
      const ranges = this.rangeCore.ranges();
      const before = previous;
      previous = ranges;
      if (before === null) return;
      untracked(() => {
        if (JSON.stringify(this.selectedRanges()) !== JSON.stringify(ranges))
          this.selectedRanges.set(ranges);
        const stats = this.rangeCore.stats();
        this.rangeSelectionChanged.emit({ ranges, ...stats });
        const counts = ogeRangeAnnouncementCounts(stats);
        if (counts)
          this.announcer.rangeSelected(
            counts.rows,
            counts.columns,
            counts.cells,
          );
      });
    });
    // model → ranges
    effect(() => {
      const bound = this.selectedRanges();
      untracked(() => {
        if (JSON.stringify(bound) !== JSON.stringify(this.rangeCore.ranges()))
          this.rangeCore.setRanges(bound);
      });
    });
    // a new view (sort, filter, page, grouping) invalidates the coordinates
    let lastLoad: string | undefined;
    effect(() => {
      const key = JSON.stringify(this.store.loadOptions());
      const previousKey = lastLoad;
      lastLoad = key;
      if (previousKey !== undefined && previousKey !== key)
        untracked(() => this.rangeCore.clear());
    });
    return true;
  })();

  protected isCellInRange(row: number, col: number): boolean {
    return this.cellSelect() && this.rangeCore.isSelected(row, col);
  }

  protected rangeEdges(row: number, col: number): OgeGridRangeEdges | null {
    return this.cellSelect() ? this.rangeCore.edgesOf(row, col) : null;
  }

  protected isFillCorner(row: number, col: number): boolean {
    return this.fillHandleEnabled() && this.rangeCore.isFillCorner(row, col);
  }

  protected isInFillPreview(row: number, col: number): boolean {
    const preview = this.fillPreview();
    return (
      preview !== null &&
      row >= preview.top &&
      row <= preview.bottom &&
      col >= preview.left &&
      col <= preview.right &&
      this.flatNodes()[row]?.kind === 'data'
    );
  }

  /** Selects a rectangular range programmatically (`selectionMode: 'cell'`). */
  selectRange(range: OgeGridCellRange, add = false): void {
    this.rangeCore.setRanges(
      add ? [...untracked(this.rangeCore.ranges), range] : [range],
    );
  }

  /** Clears every cell range. */
  clearRangeSelection(): void {
    this.rangeCore.clear();
  }

  /**
   * The selected cells' values as a rows × columns matrix (the lattice the
   * copy writes; cells between several ranges are `undefined`).
   */
  getSelectedRangeData(): unknown[][] {
    const lattice = ogeRangeLattice(untracked(this.rangeCore.ranges), (row) =>
      this.isDataRowAt(row),
    );
    const nodes = untracked(this.flatNodes);
    const columns = untracked(this.resolvedColumns);
    return lattice.rows.map((row) =>
      lattice.cols.map((col) => {
        const node = nodes[row];
        const column = columns[col];
        return node?.kind === 'data' && column && lattice.isSelected(row, col)
          ? untracked(() => this.displayValue(node, column))
          : undefined;
      }),
    );
  }

  private isDataRowAt(row: number): boolean {
    return untracked(this.flatNodes)[row]?.kind === 'data';
  }

  /** The data cell coordinate under a pointer hit, if it is one of ours. */
  private cellCoordOf(hit: Element | null): OgeGridCellCoord | null {
    const cell = ogeOwnedClosest(
      hit,
      '[data-cell]',
      this.hostRef.nativeElement,
      OGE_GRID_HOST_SELECTOR,
    );
    const [row, col] = (cell?.dataset['cell'] ?? '').split('-').map(Number);
    return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : null;
  }

  /**
   * Cell mode: click selects a cell, Shift+click extends, Ctrl/Cmd+click adds
   * a range, and a drag (long press under touch) extends the range under the
   * pointer — `beginPointerDragDrop` with no ghost.
   */
  protected onCellPointerDown(
    rowIndex: number,
    column: ResolvedColumn<T>,
    event: PointerEvent,
  ): void {
    if (!this.cellSelect() || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('.oge-editor, .oge-fill-handle')) return;
    const cell = { row: rowIndex, col: column.absIndex };
    if (event.shiftKey) {
      // no browser text selection between the anchor and here
      event.preventDefault();
      this.rangeCore.extendTo(cell);
      (event.currentTarget as HTMLElement | null)?.focus({
        preventScroll: true,
      });
      return;
    }
    if (event.ctrlKey || event.metaKey) this.rangeCore.addCell(cell);
    else this.rangeCore.selectCell(cell);
    beginPointerDragDrop<OgeGridCellCoord>(event, {
      source: event.currentTarget as Element,
      ghost: false,
      autoScroll: this.viewportRef()?.nativeElement ?? null,
      resolve: (hit) => this.cellCoordOf(hit),
      onOver: (over) => {
        if (over) this.rangeCore.extendTo(over);
      },
      onDrop: () => undefined,
    });
  }

  /**
   * The fill handle: dragging it down/up/right/left previews the cells a
   * fill would write and, on drop, copies the range's values or extends its
   * number / date series into them — through the same apply path a paste
   * takes (one undoable batch, the regular edit events).
   */
  protected onFillHandlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    const active = untracked(this.rangeCore.ranges).at(-1);
    if (!active) return;
    const source = ogeRangeBounds(active);
    beginPointerDragDrop<OgeFillPlan>(event, {
      source: event.currentTarget as Element,
      ghost: false,
      longPress: 0,
      preventDefault: true,
      autoScroll: this.viewportRef()?.nativeElement ?? null,
      resolve: (hit) => {
        const cell = this.cellCoordOf(hit);
        return cell ? ogeFillTarget(source, cell) : null;
      },
      onOver: (plan) => this.fillPreview.set(plan?.target ?? null),
      onDrop: (plan) => void this.runFill(source, plan),
      onEnd: () => this.fillPreview.set(null),
    });
  }

  /** Data rows of the flat range `[top, bottom]`, ascending. */
  private dataRowsIn(top: number, bottom: number): number[] {
    const nodes = untracked(this.flatNodes);
    const rows: number[] = [];
    for (let row = Math.max(0, top); row <= bottom && row < nodes.length; row++)
      if (nodes[row].kind === 'data') rows.push(row);
    return rows;
  }

  private valueAt(row: number, col: number): unknown {
    const node = untracked(this.flatNodes)[row];
    const column = untracked(this.resolvedColumns)[col];
    if (node?.kind !== 'data' || !column) return undefined;
    return untracked(() => this.displayValue(node, column));
  }

  /** A write for (row, col), or `null` when the cell takes no value of that shape. */
  private writeAt(
    row: number,
    col: number,
    value: unknown,
  ): OgeGridCellValueWrite | null {
    const node = untracked(this.flatNodes)[row];
    const column = untracked(this.resolvedColumns)[col];
    if (node?.kind !== 'data' || !column?.field || !column.editable) return null;
    if (!ogeValueFits(value, column.dataType)) return null;
    return { key: node.key, field: column.field, value };
  }

  private async runFill(
    source: OgeGridRangeBounds,
    plan: OgeFillPlan,
  ): Promise<number> {
    const writes: OgeGridCellValueWrite[] = [];
    const { target, direction } = plan;
    if (direction === 'down' || direction === 'up') {
      const sourceRows = this.dataRowsIn(source.top, source.bottom);
      const targetRows = this.dataRowsIn(target.top, target.bottom);
      if (direction === 'up') targetRows.reverse();
      for (let col = source.left; col <= source.right; col++) {
        const values = sourceRows.map((row) => this.valueAt(row, col));
        const series = ogeFillSeries(values, targetRows.length, direction === 'up');
        targetRows.forEach((row, i) => {
          const write = this.writeAt(row, col, series[i]);
          if (write) writes.push(write);
        });
      }
    } else {
      const targetCols: number[] = [];
      for (let col = target.left; col <= target.right; col++)
        targetCols.push(col);
      if (direction === 'left') targetCols.reverse();
      for (const row of this.dataRowsIn(source.top, source.bottom)) {
        const values: unknown[] = [];
        for (let col = source.left; col <= source.right; col++)
          values.push(this.valueAt(row, col));
        const series = ogeFillSeries(
          values,
          targetCols.length,
          direction === 'left',
        );
        targetCols.forEach((col, i) => {
          const write = this.writeAt(row, col, series[i]);
          if (write) writes.push(write);
        });
      }
    }
    const count = await this.editingModel.applyCellValues(writes, {
      source: 'fill',
    });
    const range = plan.range;
    this.rangeCore.setRanges([
      {
        anchor: { row: range.top, col: range.left },
        focus: { row: range.bottom, col: range.right },
      },
    ]);
    this.announcer.cellsWritten('fill', count);
    return count;
  }

  /**
   * Ctrl+D: copies the active range's first row into its other rows (a
   * single row copies the row above it in). Resolves with the cells written.
   */
  fillDown(): Promise<number> {
    return this.keyboardFill('down');
  }

  /** Ctrl+R: the same, across columns. */
  fillRight(): Promise<number> {
    return this.keyboardFill('right');
  }

  private async keyboardFill(axis: 'down' | 'right'): Promise<number> {
    if (!untracked(this.fillHandleEnabled)) return 0;
    const active = untracked(this.rangeCore.ranges).at(-1);
    if (!active) return 0;
    const plan = ogeKeyboardFillPlan(ogeRangeBounds(active), axis, (row) => {
      const above = this.dataRowsIn(0, row - 1);
      return above.length ? above[above.length - 1] : -1;
    });
    if (!plan) return 0;
    const writes: OgeGridCellValueWrite[] = [];
    const { source, target } = plan;
    if (axis === 'down') {
      const sourceRow = this.dataRowsIn(source.top, source.bottom)[0];
      if (sourceRow === undefined) return 0;
      for (const row of this.dataRowsIn(target.top, target.bottom)) {
        if (row === sourceRow) continue;
        for (let col = target.left; col <= target.right; col++) {
          const write = this.writeAt(row, col, this.valueAt(sourceRow, col));
          if (write) writes.push(write);
        }
      }
    } else {
      for (const row of this.dataRowsIn(target.top, target.bottom)) {
        const value = this.valueAt(row, source.left);
        for (let col = target.left; col <= target.right; col++) {
          if (col === source.left) continue;
          const write = this.writeAt(row, col, value);
          if (write) writes.push(write);
        }
      }
    }
    const count = await this.editingModel.applyCellValues(writes, {
      source: 'fill',
    });
    this.announcer.cellsWritten('fill', count);
    return count;
  }

  /** Copies the selected ranges as TSV (with captions per `copyHeaders`). */
  private rangeClipboardText(): string | null {
    const ranges = untracked(this.rangeCore.ranges);
    if (!untracked(this.cellSelect) || !ranges.length) return null;
    const nodes = untracked(this.flatNodes);
    const columns = untracked(this.resolvedColumns);
    return buildOgeRangeTsv(
      ogeRangeLattice(ranges, (row) => nodes[row]?.kind === 'data'),
      (row, col) => {
        const node = nodes[row];
        const column = columns[col];
        return node?.kind === 'data' && column
          ? untracked(() => this.cellDisplayText(node, column))
          : '';
      },
      (col) => columns[col]?.caption ?? '',
      { headers: untracked(this.rangeSelection)?.copyHeaders === true },
    );
  }

  /** The native `copy` event: the range TSV lands on the clipboard data. */
  protected onGridCopy(event: ClipboardEvent): void {
    if (
      this.store.editing.editCell() !== null ||
      this.store.editing.editRowKey() !== null
    )
      return;
    const text = this.rangeClipboardText();
    if (text === null || !event.clipboardData) return;
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  }

  /** The native `paste` event outside an editor pastes into the cells. */
  protected onGridPaste(event: ClipboardEvent): void {
    if (
      this.store.editing.editCell() !== null ||
      this.store.editing.editRowKey() !== null ||
      !this.editMode() ||
      !this.canUpdate()
    )
      return;
    const text = event.clipboardData?.getData('text/plain');
    if (!text) return;
    event.preventDefault();
    void this.pasteText(text);
  }

  /**
   * Pastes a TSV block (what Excel and the grid's own copy write) into the
   * editable cells, starting at the focused cell — or filling the selected
   * range with a single value. Values parse with the column's data type and
   * lookup, run the validators, and land as one undoable batch through the
   * regular edit events; lines past the last row become new rows only with
   * `rangeSelection.pasteAddsRows`. Resolves with the cells written.
   */
  async pasteText(text: string): Promise<number> {
    if (!untracked(this.editMode) || !untracked(this.canUpdate)) return 0;
    const nodes = untracked(this.flatNodes);
    const columns = untracked(this.resolvedColumns);
    const active = untracked(this.cellSelect)
      ? (untracked(this.rangeCore.ranges).at(-1) ?? null)
      : null;
    const start = untracked(this.focusedCell) ?? active?.anchor ?? null;
    if (!start) return 0;
    const messages = untracked(this.msg);
    const matrix = parseOgeTsv(text);
    const plan = planOgeGridPaste(matrix, start, {
      rowCount: nodes.length,
      columnCount: columns.length,
      isDataRow: (row) => nodes[row]?.kind === 'data',
      selection: active,
    });
    const parse = (raw: string, col: number, node?: DataRowNode<T>) => {
      const column = columns[col];
      if (!column?.field || !column.editable) return null;
      const lookupItems = node
        ? untracked(() => this.lookupItemsFor(node, column))
        : column.lookupItems;
      const parsed = parseOgeCellText(
        raw,
        { dataType: column.dataType, lookupItems },
        messages,
      );
      return parsed.ok ? { field: column.field, value: parsed.value } : null;
    };
    const writes: OgeGridCellValueWrite[] = [];
    for (const cell of plan.cells) {
      const node = nodes[cell.row];
      if (node?.kind !== 'data') continue;
      const value = parse(cell.value, cell.col, node);
      if (value) writes.push({ key: node.key, ...value });
    }
    const newRows = untracked(this.rangeSelection)?.pasteAddsRows
      ? plan.extraRows.map((line) => {
          const row: Record<string, unknown> = {};
          for (const cell of line) {
            const value = parse(cell.value, cell.col);
            if (value) row[value.field] = value.value;
          }
          return row;
        })
      : [];
    const count = await this.editingModel.applyCellValues(writes, {
      source: 'paste',
      newRows,
    });
    this.announcer.cellsWritten('paste', count);
    return count;
  }

  /** Reverts the last edit, paste or fill (Ctrl+Z). */
  async undo(): Promise<void> {
    const count = await this.editingModel.undo();
    this.announcer.cellsWritten('undo', count);
  }

  /** Re-applies the last undone step (Ctrl+Y / Ctrl+Shift+Z). */
  async redo(): Promise<void> {
    const count = await this.editingModel.redo();
    this.announcer.cellsWritten('redo', count);
  }

  /** Whether `undo()` has a step to revert. */
  canUndo(): boolean {
    return untracked(this.editingModel.history.canUndo);
  }

  /** Whether `redo()` has a step to re-apply. */
  canRedo(): boolean {
    return untracked(this.editingModel.history.canRedo);
  }

  /** Grid-level edit shortcuts; returns whether the key was handled. */
  private handleEditShortcut(event: KeyboardEvent): boolean {
    const shortcut = ogeGridEditShortcut(event);
    if (!shortcut || !this.editMode()) return false;
    if (shortcut === 'undo' || shortcut === 'redo') {
      event.preventDefault();
      void (shortcut === 'undo' ? this.undo() : this.redo());
      return true;
    }
    if (!this.fillHandleEnabled() || !this.rangeCore.ranges().length)
      return false;
    event.preventDefault();
    void this.keyboardFill(shortcut === 'fillDown' ? 'down' : 'right');
    return true;
  }

  /** `aria-keyshortcuts` of a data cell in cell mode. */
  protected readonly cellKeyShortcuts = computed(() =>
    this.fillHandleEnabled()
      ? 'Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Control+C Control+V Control+D Control+R Control+Z Control+Y'
      : this.cellSelect()
        ? 'Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Control+C'
        : null,
  );

  // --- async validation ------------------------------------------------------

  /** Whether the cell's editor waits for an async validator. */
  protected editorPending(control: FormControl<unknown> | undefined): boolean {
    this.editingModel.controlRevision();
    return !!control?.pending;
  }

  // --- styling hooks & conditional formats -----------------------------------

  /** Classes for a data row: string, array or `{ class: condition }` record. */
  readonly rowClass = input<
    ((row: T, key: RowKey) => OgeClassValue) | undefined
  >(undefined);

  /** Classes for a data cell, per row and column. */
  readonly cellClass = input<
    ((row: T, column: OgeGridColumnInfo) => OgeClassValue) | undefined
  >(undefined);

  /**
   * Fires for every data row element that renders a row for the first time
   * (a scrolled-in or re-keyed row included) — the imperative escape hatch
   * for decoration the declarative hooks cannot express.
   */
  readonly rowPrepared = output<OgeRowPreparedEvent<T>>();

  /** Fires for every data cell of a prepared row. */
  readonly cellPrepared = output<OgeCellPreparedEvent<T>>();

  private readonly preparedTracker = new OgePreparedTracker();

  private readonly preparedEffect = afterRenderEffect(() => {
    const nodes = this.viewNodes();
    const columns = this.resolvedColumns();
    if (!nodes.length) return;
    untracked(() => this.emitPrepared(columns));
  });

  private lastPreparedColumns: readonly unknown[] | null = null;

  private emitPrepared(columns: readonly ResolvedColumn<T>[]): void {
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) return;
    if (this.lastPreparedColumns !== columns) {
      this.lastPreparedColumns = columns;
      this.preparedTracker.reset();
    }
    const flat = this.flatNodes();
    for (const element of Array.from(
      viewport.querySelectorAll<HTMLElement>(
        '.oge-rows > .oge-row[data-rowindex]:not(.oge-edit-form-row)',
      ),
    )) {
      const rowIndex = Number(element.dataset['rowindex']);
      const node = flat[rowIndex];
      if (node?.kind !== 'data' || !this.preparedTracker.isNew(element, node.data))
        continue;
      this.rowPrepared.emit({
        row: node.data,
        key: node.key,
        rowIndex,
        element,
      });
      for (const cell of Array.from(
        element.querySelectorAll<HTMLElement>('[data-cell]'),
      )) {
        const col = Number((cell.dataset['cell'] ?? '').split('-')[1]);
        const column = columns[col];
        if (!column) continue;
        this.cellPrepared.emit({
          row: node.data,
          key: node.key,
          field: column.field,
          value: column.accessor(node.data),
          rowIndex,
          columnIndex: col,
          element: cell,
        });
      }
    }
  }

  /** Per-column info handed to `cellClass` / `cellSpan`, stable per layout. */
  private readonly columnInfos = computed<ReadonlyMap<string, OgeGridColumnInfo>>(
    () =>
      new Map(
        this.resolvedColumns().map((column) => [
          column.id,
          {
            field: column.field,
            caption: column.caption,
            dataType: column.dataType,
            index: column.absIndex,
          },
        ]),
      ),
  );

  /** Value ranges of the columns whose formats are relative (bars, scales). */
  private readonly formatRanges = computed<
    ReadonlyMap<string, OgeConditionalRange | null>
  >(() => {
    const map = new Map<string, OgeConditionalRange | null>();
    const nodes = this.flatNodes();
    for (const column of this.resolvedColumns()) {
      const formats = column.source?.conditionalFormats?.();
      if (ogeFormatsNeedRange(formats))
        map.set(column.id, ogeColumnValueRange(nodes, column.accessor));
    }
    return map;
  });

  protected rowClassesOf(node: DataRowNode<T>): string[] {
    const hook = this.rowClass();
    return hook ? ogeClassList(hook(node.data, node.key)) : [];
  }

  /** The cell's resolved conditional format (classes, vars, icon). */
  protected cellFormatOf(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): OgeConditionalCellFormat {
    const formats = column.source?.conditionalFormats?.();
    if (!formats?.length) return NO_FORMAT;
    return resolveOgeConditionalFormat(
      formats,
      this.displayValue(node, column),
      node.data,
      this.formatRanges().get(column.id) ?? null,
    );
  }

  protected cellClassesOf(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): string[] {
    const hook = this.cellClass();
    const info = this.columnInfos().get(column.id);
    const own = hook && info ? ogeClassList(hook(node.data, info)) : [];
    const format = this.cellFormatOf(node, column);
    return format.classes.length ? [...own, ...format.classes] : own;
  }

  /**
   * The cell's custom properties: a conditional format's `--oge-cf-*` and,
   * for a row-span owner, `--oge-span-rows`.
   */
  protected cellVarsOf(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
    rowIndex?: number,
  ): Record<string, string> | null {
    const vars = this.cellFormatOf(node, column).vars;
    const span =
      rowIndex === undefined ? null : this.spanOf(rowIndex, column.absIndex);
    if (span && span.rowSpan > 1)
      return { ...vars, '--oge-span-rows': String(span.rowSpan) };
    return Object.keys(vars).length ? vars : null;
  }

  // --- pinned rows -------------------------------------------------------------

  /**
   * Rows pinned above the scrolling body: data objects, or keys of loaded
   * rows (which then leave the body). They stay visible while scrolling,
   * virtual scrolling included; they are display rows — not editable, not
   * selectable, not part of the arrow-key navigation.
   */
  readonly pinnedTopRows = input<readonly (T | RowKey)[] | undefined>(
    undefined,
  );

  /** Rows pinned below the body, above the total row. */
  readonly pinnedBottomRows = input<readonly (T | RowKey)[] | undefined>(
    undefined,
  );

  /** Keys pinned by key — taken out of the body. */
  private readonly pinnedKeys = computed<ReadonlySet<RowKey>>(() => {
    const keys = new Set<RowKey>();
    for (const entry of [
      ...(this.pinnedTopRows() ?? []),
      ...(this.pinnedBottomRows() ?? []),
    ]) {
      if (typeof entry === 'string' || typeof entry === 'number')
        keys.add(entry);
    }
    return keys;
  });

  private resolvePinned(
    entries: readonly (T | RowKey)[] | undefined,
    side: 'top' | 'bottom',
  ): DataRowNode<T>[] {
    if (!entries?.length) return [];
    const keyOf = this.keySelector();
    const keyed = this.keyField() !== undefined;
    const loaded = this.allFlatNodes();
    return entries.flatMap((entry, index): DataRowNode<T>[] => {
      if (typeof entry === 'string' || typeof entry === 'number') {
        const node = loaded.find(
          (candidate): candidate is DataRowNode<T> =>
            candidate.kind === 'data' && candidate.key === entry,
        );
        return node ? [{ ...node, level: 0 }] : [];
      }
      const row = entry as T;
      return [
        {
          kind: 'data',
          key: keyed ? keyOf(row, -1) : `oge-pinned-${side}-${index}`,
          data: row,
          sourceIndex: -1,
          level: 0,
        },
      ];
    });
  }

  protected readonly pinnedTopNodes = computed(() =>
    this.resolvePinned(this.pinnedTopRows(), 'top'),
  );

  protected readonly pinnedBottomNodes = computed(() =>
    this.resolvePinned(this.pinnedBottomRows(), 'bottom'),
  );

  /** `aria-rowindex` offset the pinned top rows add to the body rows. */
  protected readonly pinnedTopOffset = computed(
    () => this.pinnedTopNodes().length,
  );

  // --- sticky group rows ---------------------------------------------------------

  /**
   * Keeps the group rows enclosing the first visible row on screen under
   * the header while scrolling (all levels; virtual scrolling included). A
   * visual aid — the real group rows stay where they are for keyboard and
   * screen-reader users; clicking a sticky row scrolls to it.
   */
  readonly stickyGroupRows = input(false);

  protected readonly stickyGroups = signal<readonly GroupRowNode[]>([]);

  private updateStickyGroups(): void {
    if (!untracked(this.stickyGroupRows) || !untracked(this.grouped)) {
      if (untracked(this.stickyGroups).length) this.stickyGroups.set([]);
      return;
    }
    const viewport = this.viewportRef()?.nativeElement;
    const header = viewport?.querySelector('.oge-header-row');
    if (!viewport || !header) return;
    const rows = Array.from(
      viewport.querySelectorAll<HTMLElement>('.oge-rows > [data-rowindex]'),
    );
    const top = header.getBoundingClientRect().bottom;
    const first = ogeFirstVisibleRow(rows, top, (row) =>
      Number((row as HTMLElement).dataset['rowindex']),
    );
    const chain = ogeStickyGroupChain(untracked(this.flatNodes), first);
    const current = untracked(this.stickyGroups);
    if (
      chain.length !== current.length ||
      chain.some((node, i) => node.key !== current[i].key)
    )
      this.stickyGroups.set(chain);
  }

  private readonly stickyEffect = afterRenderEffect(() => {
    this.viewNodes();
    this.stickyGroupRows();
    untracked(() => this.updateStickyGroups());
  });

  protected scrollToGroup(key: RowKey): void {
    const index = untracked(this.flatNodes).findIndex(
      (node) => node.key === key,
    );
    if (index < 0) return;
    const viewport = this.viewportRef()?.nativeElement;
    if (this.virtualized()) this.scrollRowIntoView(index);
    else
      viewport
        ?.querySelector<HTMLElement>(`.oge-rows > [data-rowindex="${index}"]`)
        ?.scrollIntoView({ block: 'center' });
    setTimeout(() =>
      viewport
        ?.querySelector<HTMLElement>(
          `.oge-rows > .oge-group-row[data-rowindex="${index}"]`,
        )
        ?.focus({ preventScroll: true }),
    );
  }

  // --- row / column spans --------------------------------------------------------

  /**
   * Row / column spans per cell: return `{ rowSpan, colSpan }` (or nothing).
   * Spans never cross group rows; the owner cell gets `aria-rowspan` /
   * `aria-colspan` and the keyboard steps over the covered area. Ignored
   * while virtualized and with column virtualization; row spans assume
   * uniform row heights (no `wordWrap` / `autoRowHeight`).
   */
  readonly cellSpan = input<
    ((row: T, column: OgeGridColumnInfo) => OgeGridCellSpan | null | undefined) | undefined
  >(undefined);

  protected readonly spanLayout = computed<OgeGridSpanLayout>(() => {
    if (this.virtualized() || this.colVirtualized()) return OGE_NO_SPANS;
    const hook = this.cellSpan();
    const infos = this.columnInfos();
    const columns = this.resolvedColumns().map((column) => ({
      field: column.field,
      accessor: column.accessor,
      mergeCells: column.source?.mergeCells?.() ?? false,
      id: column.id,
    }));
    return computeOgeGridSpans({
      nodes: this.flatNodes(),
      columns,
      cellSpan: hook
        ? (row, column) => {
            const info = infos.get(column.id);
            return info ? hook(row, info) : null;
          }
        : undefined,
    });
  });

  /** How a body cell renders under the span layout. */
  protected spanKind(
    row: number,
    col: number,
  ): 'plain' | 'owner' | 'hidden' | 'placeholder' {
    const layout = this.spanLayout();
    if (layout.empty) return 'plain';
    const owner = layout.ownerOf(row, col);
    if (owner) return owner.row === row ? 'hidden' : 'placeholder';
    return layout.extentOf(row, col) ? 'owner' : 'plain';
  }

  protected spanOf(row: number, col: number): OgeGridSpanExtent | null {
    return this.spanLayout().extentOf(row, col);
  }

  // --- column auto-fit & cell hints ------------------------------------------------

  /**
   * Sizes every column without a user width to its header and rendered
   * cells once the first result set rendered (DevExtreme `columnAutoWidth`).
   */
  readonly columnAutoWidth = input(false);

  private autoWidthDone: unknown = null;

  private readonly autoWidthEffect = afterRenderEffect(() => {
    const result = this.adapter.result();
    if (!this.columnAutoWidth() || !result || result === this.autoWidthDone)
      return;
    if (this.autoWidthDone !== null) return;
    this.autoWidthDone = result;
    untracked(() => this.autoFitColumns());
  });

  /**
   * Sizes a column to its header and its *rendered* cells (a virtualized
   * grid fits to the visible window) — what a double-click on the resize
   * handle and the header menu's "Size to fit" run.
   */
  autoFitColumn(field: string): void {
    const column = untracked(this.resolvedColumns).find(
      (candidate) => candidate.field === field || candidate.id === field,
    );
    if (column) this.fitColumn(column);
  }

  /** `autoFitColumn()` for every visible column. */
  autoFitColumns(): void {
    for (const column of untracked(this.resolvedColumns)) this.fitColumn(column);
  }

  private fitColumn(column: ResolvedColumn<T>): void {
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) return;
    const header = this.headerCellOf(column.id);
    const cells = viewport.querySelectorAll(
      `.oge-rows [data-cell$="-${column.absIndex}"]`,
    );
    const width = ogeMeasureAutoWidth(
      header,
      cells,
      header?.querySelector('.oge-header-caption') ?? null,
    );
    if (width === null) return;
    this.resizeColumnTo(column, width, false);
  }

  protected onResizeHandleDblClick(
    column: ResolvedColumn<T>,
    event: MouseEvent,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    this.fitColumn(column);
  }

  /**
   * Shows truncated cell text in a tooltip (the overlay tooltip machine) on
   * hover — and immediately on keyboard focus.
   */
  readonly cellHintEnabled = input(false);

  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);
  protected readonly hintCell = signal<HTMLElement | null>(null);
  protected readonly hintText = signal('');
  private readonly hintPopupRef = viewChild('cellHint', { read: ElementRef });

  readonly hintPanel = new OgeAnchoredPanel({
    anchor: () => this.hintCell() ?? this.hostRef.nativeElement,
    panel: () => this.hintPopupRef()?.nativeElement ?? null,
    placement: () => 'top',
    ...OGE_TOOLTIP_PANEL_OPTIONS,
    onClosed: () => this.hintCore.onPanelClosed(),
  });

  private readonly hintCore = new OgeTooltipCore({
    text: () => untracked(this.hintText),
    showDelay: () => this.overlayConfig.tooltipShowDelayMs,
    hideDelay: () => this.overlayConfig.tooltipHideDelayMs,
    isOpen: () => this.hintPanel.isOpen(),
    open: () => {
      this.hintPanel.open();
      setTimeout(() => this.hintPanel.updatePosition());
    },
    close: () => this.hintPanel.close(),
    describedByTarget: () => {
      const cell = untracked(this.hintCell);
      return cell ? tooltipDescribedByTarget(cell) : null;
    },
    panelId: this.hintPanel.panelId,
  });

  private hintTargetOf(target: EventTarget | null): HTMLElement | null {
    if (!untracked(this.cellHintEnabled)) return null;
    const cell = ogeOwnedClosest(
      target as Element | null,
      '.oge-cell[data-cell]',
      this.hostRef.nativeElement,
      OGE_GRID_HOST_SELECTOR,
    );
    if (!cell || cell.querySelector('.oge-editor')) return null;
    return ogeIsTextTruncated(cell) ? cell : null;
  }

  protected onHintOver(event: PointerEvent): void {
    const cell = this.hintTargetOf(event.target);
    if (cell === untracked(this.hintCell)) return;
    if (!cell) {
      this.hintCore.scheduleHide();
      return;
    }
    this.hintCore.hide();
    this.hintCell.set(cell);
    this.hintText.set((cell.textContent ?? '').trim());
    this.hintCore.scheduleShow();
  }

  protected onHintLeave(): void {
    this.hintCore.scheduleHide();
  }

  protected onHintFocus(event: FocusEvent): void {
    const cell = this.hintTargetOf(event.target);
    if (!cell) {
      if (untracked(this.hintCell)) this.hintCore.hide();
      return;
    }
    this.hintCore.hide();
    this.hintCell.set(cell);
    this.hintText.set((cell.textContent ?? '').trim());
    this.hintCore.show();
  }

  protected onHintBlur(): void {
    this.hintCore.hide();
  }

  // --- cross-grid row drag ---------------------------------------------------------

  /**
   * Grids (and other components) sharing a group name accept each other's
   * dragged rows; a drop on another grid fires that grid's `rowDrop` with
   * the source row — move the data in the handler.
   */
  readonly rowDragGroup = input<string | undefined>(undefined);

  /** A drop on the middle of a row means "inside" it (`position: 'inside'`). */
  readonly allowDropInsideRow = input(false);

  /** Cancelable: a row drag is about to start. */
  readonly rowDragStart = output<OgeRowDragStartEvent<T>>();
  /** Cancelable: a dragged row of the group hovers this grid. */
  readonly rowDragOver = output<OgeRowDragOverEvent>();
  /** A row was dropped on this grid — its own (reorder) or another component's. */
  readonly rowDrop = output<OgeRowDropEvent>();
  /** The source side of a drag ended. */
  readonly rowDragEnd = output<OgeRowDragEndEvent<T>>();

  /** Drop position indicator of the row under a drag. */
  protected readonly dropPosition = signal<OgeRowDropPosition | null>(null);

  /** The id events report for this grid: the host `id`, else the internal one. */
  protected componentId(): string {
    return this.hostRef.nativeElement.id || this.uid;
  }

  private readonly dragParticipantEffect = effect((onCleanup) => {
    const group = this.rowDragGroup();
    if (!group) return;
    const off = registerOgeRowDragParticipant({
      componentId: this.componentId(),
      group,
      element: () => this.hostRef.nativeElement,
      resolve: (hit, clientY, source) => this.resolveRowDrop(hit, clientY, source),
      over: (_source, target) => {
        const key = target?.key ?? null;
        if (this.dropTargetKey() !== key) this.dropTargetKey.set(key);
        this.dropPosition.set(target?.position ?? null);
      },
      drop: (source, target) => this.acceptRowDrop(source, target),
    });
    onCleanup(off);
  });

  private resolveRowDrop(
    hit: Element,
    clientY: number,
    source: OgeRowDragSource,
  ): OgeRowDragTarget | null {
    const host = this.hostRef.nativeElement;
    const nodes = untracked(this.flatNodes);
    const dataNodes = nodes.filter(
      (node): node is DataRowNode<T> => node.kind === 'data',
    );
    const rowEl = ogeOwnedClosest(
      hit,
      '.oge-row[data-rowindex]',
      host,
      OGE_GRID_HOST_SELECTOR,
    );
    let target: OgeRowDragTarget | null = null;
    if (rowEl) {
      const node = nodes[Number(rowEl.dataset['rowindex'])];
      if (node?.kind !== 'data') return null;
      const position = ogeRowDropPosition(
        rowEl.getBoundingClientRect(),
        clientY,
        untracked(this.allowDropInsideRow),
      );
      const index = dataNodes.indexOf(node);
      target = {
        componentId: this.componentId(),
        key: node.key,
        row: node.data,
        position,
        index: position === 'after' ? index + 1 : index,
      };
    } else if (
      ogeOwnedClosest(hit, '.oge-body, .oge-no-data', host, OGE_GRID_HOST_SELECTOR)
    ) {
      target = {
        componentId: this.componentId(),
        key: null,
        row: undefined,
        position: 'after',
        index: dataNodes.length,
      };
    }
    if (!target) return null;
    const over: OgeRowDragOverEvent = {
      sourceComponentId: source.componentId,
      sourceKey: source.key,
      sourceRow: source.row,
      targetKey: target.key,
      position: target.position,
      cancel: false,
    };
    this.rowDragOver.emit(over);
    return over.cancel ? null : target;
  }

  private acceptRowDrop(
    source: OgeRowDragSource,
    target: OgeRowDragTarget,
  ): void {
    const same = source.componentId === this.componentId();
    if (same && target.key !== null && target.key !== source.key && target.position !== 'inside')
      this.commitRowMove(source.key, target.key);
    this.rowDrop.emit({
      sourceComponentId: source.componentId,
      targetComponentId: this.componentId(),
      sameComponent: same,
      sourceKey: source.key,
      sourceRow: source.row,
      targetKey: target.key,
      targetRow: target.row,
      position: target.position,
      toIndex: target.index,
    });
  }

  // --- header filter: conditions + date tree ---------------------------------------

  protected readonly headerFilterMode = computed<OgeHeaderFilterMode>(() => {
    const value = this.headerFilter();
    return (typeof value === 'object' ? value.mode : undefined) ?? 'list';
  });

  /** The open header filter's column. */
  protected readonly headerFilterColumn = computed(() => {
    const field = this.headerFilterField();
    return field ? this.columnByField(field) : undefined;
  });

  /** The condition section's draft for the open column. */
  protected readonly headerConditionDraft =
    signal<OgeHeaderConditionFilter | null>(null);

  /** Operator choices of the open column, as select-box items. */
  protected readonly headerConditionItems = computed(() => {
    const column = this.headerFilterColumn();
    const messages = this.msg();
    return column
      ? headerConditionOperators(column.dataType).map((op) => ({
          value: op,
          text: messages.operators[op],
        }))
      : [];
  });

  protected readonly headerBooleanItems = computed(() => [
    { value: true, text: this.msg().booleanTrueLabel },
    { value: false, text: this.msg().booleanFalseLabel },
  ]);

  protected conditionNeedsValue(operator: FilterOperator): boolean {
    return headerConditionNeedsValue(operator);
  }

  protected setHeaderCondition(
    which: 'first' | 'second',
    patch: Partial<OgeHeaderCondition>,
  ): void {
    const draft = this.headerConditionDraft();
    if (!draft) return;
    this.headerConditionDraft.set({
      ...draft,
      [which]: { ...draft[which], ...patch },
    });
  }

  protected setHeaderConditionLogic(logic: 'and' | 'or'): void {
    const draft = this.headerConditionDraft();
    if (draft) this.headerConditionDraft.set({ ...draft, logic });
  }

  protected applyHeaderConditions(): void {
    const column = this.headerFilterColumn();
    const draft = this.headerConditionDraft();
    if (!column?.field || !draft) return;
    this.store.filter.setRowFilter(
      ogeHeaderConditionKey(column.field),
      headerConditionExpr(column.field, column.dataType, draft),
    );
  }

  protected clearHeaderConditions(): void {
    const column = this.headerFilterColumn();
    if (!column?.field) return;
    this.store.filter.setRowFilter(ogeHeaderConditionKey(column.field), null);
    this.headerConditionDraft.set(emptyHeaderConditionFilter(column.dataType));
  }

  /** Collapsed year / month nodes of the date tree. */
  protected readonly headerDateCollapsed = signal<ReadonlySet<string>>(
    new Set(),
  );

  /** A date column's values as year → month → day rows. */
  protected readonly headerDateRows = computed<
    readonly OgeHeaderDateNode[] | null
  >(() => {
    const column = this.headerFilterColumn();
    if (!column || !isOgeDateType(column.dataType)) return null;
    const values = this.headerFilterValues();
    if (!values) return null;
    const tree = groupHeaderValuesByDate(
      values,
      this.headerFilterSearch(),
      this.msg().blankValue,
      (value) => this.headerValueText(value),
      // a datetime day node gathers several timestamps: label it by the day
      column.dataType === 'datetime'
        ? (date) => formatCellValue(date, 'date', undefined)
        : undefined,
    );
    return flattenHeaderDateTree(
      tree,
      this.headerFilterSearch().trim() ? new Set() : this.headerDateCollapsed(),
    );
  });

  protected toggleHeaderDateNode(key: string): void {
    const next = new Set(this.headerDateCollapsed());
    if (!next.delete(key)) next.add(key);
    this.headerDateCollapsed.set(next);
  }

  protected isHeaderDateNodeCollapsed(key: string): boolean {
    return this.headerDateCollapsed().has(key);
  }

  protected headerDateNodeState(node: OgeHeaderDateNode): boolean | null {
    const state = headerGroupState(this.headerSelection(), node.values);
    return state === 'some' ? null : state === 'all';
  }

  protected onPageSizeChange(pageSize: number): void {
    this.store.paging.configure(pageSize === 0 ? null : pageSize);
  }
}

export type { SummaryType };
