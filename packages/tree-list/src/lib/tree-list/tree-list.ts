import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OgeCheckBox } from '@oge-ui/inputs/check-box';
import { OgeDateBox } from '@oge-ui/inputs/date-box';
import { OgeNumberBox } from '@oge-ui/inputs/number-box';
import { OgeSelectBox } from '@oge-ui/inputs/select-box';
import { OgeTextBox } from '@oge-ui/inputs/text-box';
import {
  OgeAnchoredPanel,
  OgeLiveAnnouncer,
  OgeMenuList,
  OgeModal,
  OgeModalFooter,
  OgePopup,
  type OgeMenuListItemClickEvent,
} from '@oge-ui/overlay';
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
  type CheckState,
  type CsvOptions,
  type DataRowNode,
  type DataSource,
  type FilterExpr,
  type FilterOperator,
  type RowKey,
  type RowNode,
  type SearchHighlightSegment,
  type TreeFilterMode,
  type TreeIndex,
  type TreeListStateSnapshot,
  buildSearchHighlightSegments,
  foldText,
  sanitizeTreeListStateSnapshot,
} from '@oge-ui/core';
import {
  OgeGridAnnouncements,
  OgeTreeListCore,
  allHeaderValuesSelected,
  effectiveFilterOperator,
  filterOperatorSymbol,
  filterRowOperatorChoices,
  headerGroupState,
  booleanCellLabel,
  isHeaderValueSelected,
  ogeTreeCsv,
  ogeTreeDropPosition,
  ogeTreeHeaderValueGroups,
  ogeTreeHeaderValueText,
  resizedColumnWidth,
  rowClickSelectionIntent,
  rowFilterExpr,
  clampColumnWidth,
  formatPattern,
  ogeChooserMoveDirection,
  ogeColumnMoveTarget,
  ogeColumnSeparatorKeyCommand,
  ogeColumnWidthBounds,
  ogeGridHeaderKeyCommand,
  ogeGridHeaderKeyShortcuts,
  ogeListMoveTarget,
  ogeSeparatorTargetWidth,
  ogeTreeRowKeyMove,
  type OgeColumnWidthBounds,
  toggleAllHeaderValues,
  toggleHeaderGroup,
  toggleHeaderValue,
  type OgeTreeDropPosition,
  type OgeTreeExportData,
  type OgeTreeInitNewRowEvent,
  type OgeTreeRowReparentEvent,
  type OgeTreeRowToggleEvent,
  type OgeTreeRowTogglingEvent,
  type OgeGridColumnHidingMode,
} from '@oge-ui/behavior';
import {
  beginPointerDragDrop,
  isOgeDragExcludedTarget,
  resolveOgeAttributeTarget,
  resolveOgeHeaderDropTarget,
  resolveOgeRowDropIndex,
  type OgeGridHeaderDropTarget,
} from '@oge-ui/behavior';
import {
  OgeContextMenuEcho,
  isOgeContextMenuKey,
  ogeContextMenuKeyTarget,
  type OgeContextMenuSource,
} from '@oge-ui/grid/foundation';
import {
  CHECKBOX_WIDTH,
  COMMAND_WIDTH,
  DRAG_WIDTH,
  EXPANDER_WIDTH,
  ColumnLayoutModel,
  EditingModel,
  ColumnModel,
  KeyboardNavModel,
  OGE_STATE_STORAGE,
  RowVirtualizerModel,
  dateFilterExpr,
  createStatePersistence,
  humanize,
  lookupTextOf,
  type ResolvedColumn as FoundationResolvedColumn,
} from '@oge-ui/grid/foundation';
import { OgeForm, type OgeFormItemData } from '@oge-ui/forms';
import { OgeToolbar } from '@oge-ui/layout/toolbar';
import {
  GridDataAdapter,
  GridStateStore,
  OGE_GRID_CONFIG,
  OgeCellEditor,
  OgeColumn,
  OgeColumnDefCache,
  OgeColumnGroup,
  type OgeColumnDef,
  OgeFilterBuilderGroup,
  OgeGridToolbarItem,
  OgeNoDataTemplate,
  OgePager,
  builderToExpr,
  describeExpr,
  exprToBuilder,
  formatCellValue,
  operatorsFor,
  type OgeBuilderGroup,
  type OgeFilterBuilderField,
  type OgeCommandButton,
  type OgeCellClickEvent,
  type OgeCellTemplateContext,
  type OgeContextMenuEvent,
  type OgeEditTemplateContext,
  type OgeHeaderContextMenuEvent,
  type OgeHeaderFilterOptions,
  type OgeMenuItem,
  type OgePagingOptions,
  type OgeEditingOptions,
  type OgeFilterRowOptions,
  type OgeGridMessages,
  type OgeHeaderTemplateContext,
  type OgeRowClickEvent,
  type OgeSavingChangesEvent,
  type OgeSavedChangesEvent,
  type OgeEditingStartEvent,
  type OgeRowInsertingEvent,
  type OgeRowInsertedEvent,
  type OgeRowUpdatingEvent,
  type OgeRowUpdatedEvent,
  type OgeRowRemovingEvent,
  type OgeRowRemovedEvent,
  type OgeSelectionChangedEvent,
  type OgeFocusedRowChangedEvent,
  type OgeExportingEvent,
  type OgeDataErrorEvent,
  type OgeSearchPanelOptions,
  type OgeSortingOptions,
  type OgeSelectionMode,
} from '@oge-ui/grid';
import { SIGNAL_ADAPTER, cellOf } from './signal-adapter';

/** Tree-list view of the shared column view-model: `source` is the OgeColumn. */
type ResolvedColumn<T = unknown> = FoundationResolvedColumn<T, OgeColumn<T>>;

// The event payloads and the export shape are the tree list's shared
// vocabulary — they live in `@oge-ui/behavior` beside `OgeTreeListCore` so both
// render layers speak the same types, and are re-exported here unchanged.
export type {
  OgeTreeDropPosition,
  OgeTreeExportData,
  OgeTreeInitNewRowEvent,
  OgeTreeRowReparentEvent,
  OgeTreeRowToggleEvent,
  OgeTreeRowTogglingEvent,
};

let nextUid = 0;

/**
 * Hierarchical data grid over flat self-referencing data (`id`/`parentId`).
 * Shares the column model, state slices, data adapter, virtualization,
 * keyboard navigation and theming with `@oge-ui/grid`.
 *
 * ```html
 * <oge-tree-list [data]="tasks" keyExpr="id" parentIdExpr="parentId">
 *   <oge-column field="title" />
 *   <oge-column field="owner" />
 * </oge-tree-list>
 * ```
 */
@Component({
  selector: 'oge-tree-list',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    OgeFilterBuilderGroup,
    OgePager,
    OgeCellEditor,
    OgeForm,
    OgeCheckBox,
    OgeDateBox,
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
  templateUrl: './tree-list.html',
  styleUrl: './tree-list.scss',
  host: {
    class: 'oge-tree-list',
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
export class OgeTreeList<T extends object = Record<string, unknown>> {
  /**
   * Instance id prefix: a header is labelled by its caption alone
   * (`aria-labelledby`), not by the separator / filter button inside it.
   */
  protected readonly uid = `oge-tree-list-${nextUid++}`;

  protected readonly store = inject(GridStateStore);
  protected readonly adapter: GridDataAdapter<T> = inject(GridDataAdapter);
  private readonly config = inject(OGE_GRID_CONFIG);
  private readonly stateStorage = inject(OGE_STATE_STORAGE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');
  /** One adapter template, reused for every column that has an edit template. */
  private readonly editAdapterTemplate =
    viewChild<TemplateRef<unknown>>('editAdapter');

  // --- inputs / outputs -----------------------------------------------------

  /** Flat self-referencing rows: a static array or any DataSource implementation. */
  readonly data = input<readonly T[] | DataSource<T>>([]);

  /** Row key: field path or selector function. */
  readonly keyExpr = input<string | ((row: T) => RowKey)>('id');

  /** Parent reference: field path or selector function. */
  readonly parentIdExpr = input<string | ((row: T) => unknown)>('parentId');

  /** Parent value marking root rows (`null`/`undefined` both count by default). */
  readonly rootValue = input<unknown>(null);

  /** Rows whose parent key is missing: drop them or render them as roots. */
  readonly orphanPolicy = input<'discard' | 'promoteToRoot'>('discard');

  /** Expands every row initially; the toggled-set polarity follows. */
  readonly autoExpandAll = input(false);

  /** Two-way binding of the expanded row keys. */
  readonly expandedRowKeys = model<readonly RowKey[]>([]);

  /**
   * Expandability hint for lazily loaded children: field path or predicate.
   * Without it, expandability is inferred from the loaded children.
   */
  readonly hasItemsExpr = input<string | ((row: T) => boolean) | undefined>(
    undefined,
  );

  /**
   * Nested payloads: rows carry their children inline under this field (or
   * accessor). The tree flattens them internally — `parentIdExpr` is ignored.
   * Plain-array data only.
   */
  readonly itemsExpr = input<
    string | ((row: T) => readonly T[] | undefined) | undefined
  >(undefined);

  /**
   * `'full'` loads everything up front; `'lazy'` fetches children per
   * expansion (`filter: [parentIdExpr, '=', parentKey]` against the
   * DataSource). Defaults to `'lazy'` when a DataSource plus `hasItemsExpr`
   * are given, `'full'` otherwise. Lazy mode needs a string `parentIdExpr`.
   */
  readonly loadMode = input<'full' | 'lazy' | undefined>(undefined);

  /**
   * Programmatic columns — field names or full `OgeColumnDef` objects with
   * every `<oge-column>` option; used only without declarative children.
   */
  readonly columns = input<readonly (string | OgeColumnDef<T>)[] | undefined>(
    undefined,
  );

  /** Per-column filter editors under the header. */
  readonly filterRow = input<boolean | OgeFilterRowOptions>(false);

  /** Global search box in the toolbar. */
  readonly searchPanel = input<boolean | OgeSearchPanelOptions>(false);

  /**
   * How filtering expands the matched set: matched rows always keep their
   * ancestors visible; `'fullBranch'` additionally keeps all descendants.
   */
  readonly filterMode = input<TreeFilterMode>('withAncestors');

  /** Debounce for text filter inputs, in ms. Set to 0 in tests. */
  readonly filterDebounce = input<number | undefined>(undefined);

  /** Auto-expands the ancestor chains of matches while a filter is active. */
  readonly expandNodesOnFiltering = input(true);

  /** Shows the filter panel bar with the filter-builder entry point. */
  readonly filterPanel = input(false);

  /** Excel-style distinct-value filter popups on the column headers. */
  readonly headerFilter = input<boolean | OgeHeaderFilterOptions>(false);

  /**
   * Pages the visible (flattened) rows client-side. Paging and
   * `virtualScroll` are alternatives — when both are set, paging wins.
   */
  readonly paging = input<false | OgePagingOptions>(false);

  /** Two-way binding of the builder/programmatic filter expression. */
  readonly filterValue = model<FilterExpr | null>(null);

  /**
   * Persists user state (sort, filters, column layout, expansion) under this
   * key via `OGE_STATE_STORAGE` (default: localStorage).
   */
  readonly stateKey = input<string | undefined>(undefined);

  /** `true` = multi-column sorting, `'single'`, or `false` to disable. */
  readonly sortable = input<boolean | 'single' | 'multi'>(true);

  readonly sorting = input<OgeSortingOptions | undefined>(undefined);

  /** Windows the DOM to the visible rows (100k-node trees). */
  readonly virtualScroll = input(false);

  /**
   * `'virtual'` renders only the columns inside the horizontal viewport.
   * Requires plain columns: no pinned columns and no column bands.
   */
  readonly columnRenderingMode = input<'standard' | 'virtual'>('standard');

  readonly rowHeight = input<number | undefined>(undefined);
  readonly overscan = input<number | undefined>(undefined);
  readonly columnMinWidth = input<number | undefined>(undefined);

  /**
   * What happens to columns responsive hiding (`hidingPriority`) takes out on
   * a narrow tree list: `'detail'` gives every row an expand button revealing
   * the hidden columns' caption / value pairs; `'hide'` drops them.
   * `undefined` = the grid config default (`'detail'`).
   */
  readonly columnHidingMode = input<OgeGridColumnHidingMode | undefined>(
    undefined,
  );

  /** Enables drag-resize handles on header edges. */
  readonly columnResize = input(true);

  /** Enables drag-and-drop column reordering (headers and chooser rows). */
  readonly columnReorder = input(true);

  /** Shows the column visibility chooser button in the toolbar. */
  readonly columnChooser = input(false);

  /** Per-instance message overrides (merged over the global config). */
  readonly messages = input<Partial<OgeGridMessages> | undefined>(undefined);

  /** Row selection: none | single | multiple (ctrl/shift) | checkbox column. */
  readonly selectionMode = input<OgeSelectionMode>('none');

  /**
   * Recursive selection: toggling a row cascades to its descendants and
   * normalizes ancestors (tri-state checkboxes).
   */
  readonly selectionRecursive = input(false);

  /** Two-way binding of the selected row keys. */
  readonly selectedKeys = model<RowKey[]>([]);

  /** Highlights and tracks a single focused row. */
  readonly focusedRowEnabled = input(false);

  /** Two-way binding of the focused row's key. */
  readonly focusedRowKey = model<RowKey | null>(null);

  /**
   * A `focusedRowKey` change expands its ancestor chain and scrolls the row
   * into view automatically.
   */
  readonly autoNavigateToFocusedRow = input(false);

  /** Hides the header select-all checkbox in checkbox mode. */
  readonly allowSelectAll = input(true);

  /** Alternating row background (zebra striping), stable under virtualization. */
  readonly rowAlternation = input(false);

  /** Cells wrap instead of truncating; virtual mode keeps fixed heights. */
  readonly wordWrap = input(false);

  /** Spinner overlay while a load is in flight. */
  readonly loadPanel = input(false);

  /**
   * Customizes the trailing command column: reorder/mix the built-in
   * 'edit'/'delete' buttons with custom ones (text + onClick), with an
   * optional per-row `visible` predicate.
   */
  readonly commandButtons = input<readonly OgeCommandButton<T>[] | undefined>(
    undefined,
  );

  /**
   * Right-to-left layout. `undefined` (default) auto-detects the inherited
   * CSS `direction`; `true`/`false` force it.
   */
  readonly rtlEnabled = input<boolean | undefined>(undefined);

  /**
   * Drag-handle column for reparenting rows: dropping onto a row makes the
   * dragged row its child. With plain-array data and a string `parentIdExpr`
   * the parent field is updated in place; DataSource consumers handle
   * `rowReparented` instead.
   */
  readonly rowDragging = input(false);

  /** Fires after a row is dropped onto a new parent. */
  readonly rowReparented = output<OgeTreeRowReparentEvent<T>>();

  /** Enables editing: `{ mode: 'cell' | 'row' | 'batch', allow… }`. */
  readonly editing = input<false | OgeEditingOptions>(false);

  /** Fires before changes reach the DataSource; cancelable. */
  readonly savingChanges = output<OgeSavingChangesEvent<T>>();

  readonly rowClick = output<OgeRowClickEvent<T>>();
  readonly rowDblClick = output<OgeRowClickEvent<T>>();
  /** Fires when a data cell is clicked. */
  readonly cellClick = output<OgeCellClickEvent<T>>();

  /** Fires on row right-click; add `items` in the handler to open the built-in menu. */
  readonly rowContextMenu = output<OgeContextMenuEvent<T>>();

  /** Customize (or extend) the built-in header context menu per column. */
  readonly headerContextMenu = output<OgeHeaderContextMenuEvent>();
  /** Cancelable: fires before a row expands (UI-driven toggles). */
  readonly rowExpanding = output<OgeTreeRowTogglingEvent<T>>();
  /** Cancelable: fires before a row collapses (UI-driven toggles). */
  readonly rowCollapsing = output<OgeTreeRowTogglingEvent<T>>();
  readonly rowExpanded = output<OgeTreeRowToggleEvent<T>>();
  readonly rowCollapsed = output<OgeTreeRowToggleEvent<T>>();
  /** Prefill new rows created by `addRow()` before their editors open. */
  readonly initNewRow = output<OgeTreeInitNewRowEvent>();
  /** Fires when a data cell is double-clicked. */
  readonly cellDblClick = output<OgeCellClickEvent<T>>();
  /** Fires after the selection changed, with `addedKeys`/`removedKeys` diffs. */
  readonly selectionChanged = output<OgeSelectionChangedEvent>();
  /** Fires after the focused row changed (`focusedRowEnabled` or key writes). */
  readonly focusedRowChanged = output<OgeFocusedRowChangedEvent<T>>();
  /** Fires when a DataSource load or save fails. */
  readonly dataErrorOccurred = output<OgeDataErrorEvent>();
  /** Fires after a save batch was applied (only the non-canceled changes). */
  readonly savedChanges = output<OgeSavedChangesEvent<T>>();
  /** Cancelable: fires before a cell or row editor opens. */
  readonly editingStart = output<OgeEditingStartEvent<T>>();
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
  /** Fires after the tree has rendered a new result set. */
  readonly contentReady = output<void>();
  /**
   * Debounced notification whenever the persistable UI state changes —
   * persist the snapshot anywhere without `OGE_STATE_STORAGE`.
   */
  readonly stateChange = output<TreeListStateSnapshot>();

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
  protected readonly noDataTemplate = contentChild(OgeNoDataTemplate);
  protected readonly toolbarItems = contentChildren(OgeGridToolbarItem);

  // --- viewport state -------------------------------------------------------

  protected readonly scrollTop = signal(0);
  protected readonly scrollLeft = signal(0);
  protected readonly viewportHeight = signal(400);
  protected readonly hostWidth = signal(0);
  private readonly detectedRtl = signal(false);
  protected readonly rtl = computed(
    () => this.rtlEnabled() ?? this.detectedRtl(),
  );

  // --- effective options ----------------------------------------------------

  protected readonly msg = computed<OgeGridMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly effRowHeight = computed(
    () => this.rowHeight() ?? this.config.rowHeight,
  );
  private readonly effOverscan = computed(
    () => this.overscan() ?? this.config.overscan,
  );
  private readonly effColumnMinWidth = computed(
    () => this.columnMinWidth() ?? this.config.columnMinWidth,
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

  protected readonly virtualized = computed(() => this.virtualScroll());

  protected readonly filterRowVisible = computed(() => {
    const value = this.filterRow();
    return typeof value === 'boolean' ? value : value.visible !== false;
  });

  private readonly effFilterDebounce = computed(() => {
    const row = this.filterRow();
    const fromOptions = typeof row === 'object' ? row.debounce : undefined;
    return fromOptions ?? this.filterDebounce() ?? this.config.filterDebounce;
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

  protected readonly pagingOptions = computed<OgePagingOptions | null>(() => {
    const value = this.paging();
    return value === false ? null : value;
  });

  // --- the tree model (shared with @oge-ui/react-tree-list) ---------------

  /** Current zero-based page index (writable signal). */
  readonly pageIndex = signal(0);

  /**
   * Everything the tree derives from its data — index, expansion polarity,
   * client-side filtering, lazy children, remote match discovery, recursive
   * selection, paging over the flattened rows — is `@oge-ui/behavior`'s
   * `OgeTreeListCore`, the same machine the React tree list runs. This
   * component hands it signals (inputs, the store slices, the adapter's
   * result) and decides *when* its syncs run.
   */
  private readonly core = new OgeTreeListCore<T>(
    {
      data: this.data,
      keyExpr: this.keyExpr,
      parentIdExpr: this.parentIdExpr,
      rootValue: this.rootValue,
      orphanPolicy: this.orphanPolicy,
      autoExpandAll: this.autoExpandAll,
      hasItemsExpr: this.hasItemsExpr,
      itemsExpr: this.itemsExpr,
      loadMode: this.loadMode,
      filterMode: this.filterMode,
      expandNodesOnFiltering: this.expandNodesOnFiltering,
      selectionRecursive: this.selectionRecursive,
      paging: () => this.pagingOptions(),
      searchColumns: () => this.resolvedColumns(),
      state: {
        expansion: this.store.expansion,
        filter: this.store.filter,
        selection: this.store.selection,
        editing: this.store.editing,
        loadOptions: this.store.loadOptions,
      },
      result: this.adapter.result,
      pageIndex: cellOf(this.pageIndex),
      onError: (err) => this.adapter.error.set(err),
    },
    SIGNAL_ADAPTER,
  );

  /** Lazy children load as soon as an expansion makes them pending. */
  private readonly childLoadEffect = effect(() => {
    this.core.pendingChildRequests();
    this.core.childLoadBase();
    untracked(() => this.core.deferredLoader.sync());
  });

  /**
   * Lazy trees also ask the source for filter/search matches under unloaded
   * branches (see `OgeTreeListCore.syncRemoteFilter`).
   */
  private readonly remoteFilterEffect = effect(() => {
    this.core.remoteFilterInputs();
    untracked(() => this.core.syncRemoteFilter());
  });

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

  /** Adjacency index, rebuilt only when the loaded rows change. */
  protected readonly treeIndex: () => TreeIndex<T> = this.core.treeIndex;

  protected isRowExpandedKey(key: RowKey): boolean {
    return this.core.expandedSet().has(key);
  }

  protected readonly flatNodes: () => RowNode<T>[] = this.core.flatNodes;
  protected readonly effPageSize: () => number | null = this.core.effPageSize;
  protected readonly pageCount: () => number = this.core.pageCount;
  /** The flat rows actually rendered: the current page, or everything. */
  protected readonly renderNodes: () => readonly RowNode<T>[] =
    this.core.renderNodes;

  protected onPageSizeChange(size: number): void {
    this.core.setPageSize(size);
  }

  protected readonly keyOf = computed<(row: T, index: number) => RowKey>(() => {
    const selector = this.core.rowKeyOf();
    return (row) => selector(row);
  });

  /** Visible data-row count across all pages (pager totals, select-all). */
  readonly totalCount: () => number = this.core.totalCount;

  /** Rendered data-row count (aria-rowcount of the current page). */
  protected readonly renderedRowCount: () => number =
    this.core.renderedRowCount;

  // --- columns --------------------------------------------------------------

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

  protected readonly hasCheckboxColumn = computed(
    () => this.selectionMode() === 'checkbox',
  );

  private readonly effColumnHidingMode = computed(
    () => this.columnHidingMode() ?? this.config.columnHidingMode,
  );

  /** Whether an adaptive-detail toggle can appear (declarations only — no cycle). */
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

  /** A leading adaptive-detail toggle column is rendered. */
  protected readonly hasAdaptiveToggle = computed(
    () => this.adaptiveHiddenColumns().length > 0,
  );

  private readonly adaptiveExpandedKeys = signal<ReadonlySet<RowKey>>(
    new Set(),
  );

  protected readonly leadingCellCount = computed(
    () =>
      (this.rowDragging() ? 1 : 0) +
      (this.hasAdaptiveToggle() ? 1 : 0) +
      (this.hasCheckboxColumn() ? 1 : 0),
  );

  /** Leading width the hiding pass counts (the adaptive toggle comes on top). */
  private readonly hidingLeadingWidth = computed(
    () =>
      (this.rowDragging() ? DRAG_WIDTH : 0) +
      (this.hasCheckboxColumn() ? CHECKBOX_WIDTH : 0),
  );

  private readonly leadingWidth = computed(
    () =>
      this.hidingLeadingWidth() +
      (this.hasAdaptiveToggle() ? EXPANDER_WIDTH : 0),
  );

  protected readonly firstDataRow: () => T | undefined = this.core.firstDataRow;

  private readonly columnModel = new ColumnModel<T, OgeColumn<T>>({
    declaredColumns: this.declaredColumns,
    bands: this.bandByColumn,
    columnDefs: () => undefined,
    firstDataRow: this.firstDataRow,
    widthOverrides: this.store.columns.widthOverrides,
    pinOverrides: this.store.columns.pinOverrides,
    order: this.store.columns.order,
    hostWidth: this.hostWidth,
    defaultMinWidth: this.effColumnMinWidth,
    adaptiveLeadingWidth: this.hidingLeadingWidth,
    detailToggleWidth: computed(() =>
      this.adaptiveDetailPossible() ? EXPANDER_WIDTH : 0,
    ),
  });

  protected readonly resolvedColumns = this.columnModel.resolvedColumns;
  protected readonly bandRow = this.columnModel.bandRow;

  /**
   * Column virtualization is opt-in and requires plain columns: pinned
   * columns and bands rely on every column being present in the DOM.
   */
  protected readonly colVirtualized = computed(
    () =>
      this.columnRenderingMode() === 'virtual' &&
      this.bandRow() === null &&
      this.resolvedColumns().every((column) => column.pinned === false),
  );

  private readonly layoutModel = new ColumnLayoutModel<T, OgeColumn<T>>({
    resolvedColumns: this.resolvedColumns,
    colVirtualized: this.colVirtualized,
    scrollLeft: this.scrollLeft,
    hostWidth: this.hostWidth,
    leadingTracks: computed(() => {
      const tracks: string[] = [];
      if (this.rowDragging()) tracks.push(`${DRAG_WIDTH}px`);
      if (this.hasAdaptiveToggle()) tracks.push(`${EXPANDER_WIDTH}px`);
      if (this.hasCheckboxColumn()) tracks.push(`${CHECKBOX_WIDTH}px`);
      return tracks;
    }),
    trailingTracks: computed(() =>
      this.hasCommandColumn() ? [`${COMMAND_WIDTH}px`] : [],
    ),
    leadingWidth: this.leadingWidth,
    defaultMinWidth: this.effColumnMinWidth,
    pinnedDefaultWidth: computed(() => this.config.pinnedDefaultWidth),
  });

  protected readonly renderColumns = this.layoutModel.renderColumns;
  protected readonly gridTemplateColumns = this.layoutModel.gridTemplateColumns;
  protected readonly colSpacerLeft = this.layoutModel.colSpacerLeft;
  protected readonly colSpacerRight = this.layoutModel.colSpacerRight;

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

  protected pinnedLeftOf(column: ResolvedColumn<T>): number | null {
    return this.layoutModel.pinnedLeftOf(column);
  }

  protected pinnedRightOf(column: ResolvedColumn<T>): number | null {
    return this.layoutModel.pinnedRightOf(column);
  }

  // --- virtualization -------------------------------------------------------

  private readonly virtualizer = new RowVirtualizerModel<T>({
    flatNodes: this.renderNodes,
    virtualized: this.virtualized,
    scrollTop: this.scrollTop,
    viewportHeight: this.viewportHeight,
    rowHeight: this.effRowHeight,
    detailRowHeight: computed(() => this.config.detailRowHeight),
    overscan: this.effOverscan,
    autoRowHeight: computed(() => false),
    viewport: () => this.viewportRef()?.nativeElement ?? null,
  });

  protected readonly viewWindow = this.virtualizer.viewWindow;
  protected readonly viewStart = this.virtualizer.viewStart;
  protected readonly viewNodes = this.virtualizer.viewNodes;
  protected readonly bodyHeight = this.virtualizer.bodyHeight;
  protected readonly rowsTransform = this.virtualizer.rowsTransform;

  // --- keyboard -------------------------------------------------------------

  private readonly keyboard = new KeyboardNavModel<T>({
    flatNodes: this.renderNodes,
    columnCount: computed(() => this.resolvedColumns().length),
    rtl: this.rtl,
    pageSize: computed(() =>
      Math.max(1, Math.floor(this.viewportHeight() / this.effRowHeight()) - 1),
    ),
    tree: this.core.keyboardTreeHooks((node, expand) =>
      this.setRowExpanded(node, expand),
    ),
  });

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

  // --- selection ------------------------------------------------------------

  /** Keys of all visible data rows in display order. */
  protected readonly dataKeys: () => readonly RowKey[] = this.core.dataKeys;

  /** Whether the row carrying `key` is currently selected. */
  isRowSelected(key: RowKey): boolean {
    return this.store.selection.isSelected(key);
  }

  protected rowCheckState(key: RowKey): CheckState {
    return this.core.rowCheckState(key);
  }

  /**
   * Central toggle: cascades through descendants in recursive mode. On lazy
   * trees the missing subtree is bulk-fetched first, so the cascade covers
   * branches that were never expanded.
   */
  private toggleSelection(key: RowKey): void {
    untracked(() => this.core.toggleSelection(key));
  }

  /** Selected keys narrowed per mode (recursive selection reporting). */
  getSelectedRowKeys(
    mode: 'all' | 'leavesOnly' | 'excludeRecursive' = 'all',
  ): RowKey[] {
    return untracked(() => this.core.getSelectedRowKeys(mode));
  }

  protected readonly allSelected: () => boolean = this.core.allSelected;

  protected readonly someSelected: () => boolean = this.core.someSelected;

  protected onRowClick(node: DataRowNode<T>, event: MouseEvent): void {
    this.rowClick.emit({ row: node.data, key: node.key, event });
    if (this.focusedRowEnabled()) this.focusedRowKey.set(node.key);
    switch (rowClickSelectionIntent(this.selectionMode(), event)) {
      case 'range':
        this.store.selection.selectRange(this.dataKeys(), node.key);
        break;
      case 'toggle':
        this.toggleSelection(node.key);
        break;
      case 'selectOnly':
        this.store.selection.selectOnly(node.key);
        break;
      default:
        break;
    }
  }

  protected onCheckboxToggle(node: DataRowNode<T>): void {
    this.toggleSelection(node.key);
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

  protected toggleSelectAll(): void {
    if (untracked(this.allSelected)) this.clearSelection();
    else this.selectAll();
    this.announcer.selectionCount(untracked(this.store.selection.count));
  }

  /**
   * Selects every visible row; recursive mode additionally cascades to all
   * their descendants, so select-all and per-row toggles agree about scope
   * under a filter.
   */
  selectAll(): void {
    untracked(() => this.core.selectAll());
  }

  /** Clears the selection. */
  clearSelection(): void {
    this.store.selection.clear();
  }

  /** Deselects every row — same as `clearSelection()` (parity alias). */
  deselectAll(): void {
    this.clearSelection();
  }

  protected ariaSelectedOf(node: DataRowNode<T>): boolean | null {
    return this.selectionMode() === 'none'
      ? null
      : this.isRowSelected(node.key);
  }

  // --- sorting --------------------------------------------------------------

  private suppressHeaderClick = false;

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

  // --- filter row & search ---------------------------------------------------

  private readonly filterTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  private readonly clearFilterTimers = this.destroyRef.onDestroy(() => {
    for (const timer of this.filterTimers.values()) clearTimeout(timer);
    this.filterTimers.clear();
  });

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

  /**
   * The grid's filter-row choices minus `between`: the tree's date filter
   * cell is a single date box, not a range picker.
   */
  protected operatorChoices(column: ResolvedColumn<T>): FilterOperator[] {
    return filterRowOperatorChoices(column.dataType).filter(
      (op) => op !== 'between',
    );
  }

  protected chooseOperator(op: FilterOperator | null): void {
    const menu = this.operatorMenu();
    this.operatorPanel.close('select');
    const field = menu?.column.field;
    if (!menu || !field) return;
    const next = new Map(this.rowFilterOps());
    if (op === null) next.delete(field);
    else next.set(field, op);
    this.rowFilterOps.set(next);
    // re-apply the current editor value with the new operator
    const raw = this.rowFilterRaw.get(field) ?? '';
    this.store.filter.setRowFilter(
      field,
      rowFilterExpr(
        menu.column,
        raw,
        effectiveFilterOperator(menu.column, op ?? undefined),
      ),
    );
  }

  protected onFilterInput(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    this.rowFilterRaw.set(field, raw);
    this.debounced(`f:${field}`, () => {
      this.store.filter.setRowFilter(
        field,
        rowFilterExpr(column, raw, this.currentOperator(column)),
      );
    });
  }

  /** Selects apply immediately (no debounce). */
  protected onFilterSelect(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    this.rowFilterRaw.set(field, raw);
    this.store.filter.setRowFilter(
      field,
      rowFilterExpr(column, raw, this.currentOperator(column)),
    );
  }

  // --- filter panel + builder ------------------------------------------------

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

  // --- header filter (distinct values) ---------------------------------------

  /** Field whose header-filter popup is open, or null. */
  protected readonly headerFilterField = signal<string | null>(null);
  private readonly headerFilterAnchor = signal<HTMLElement | null>(null);
  protected readonly headerFilterSearch = signal('');

  private readonly headerFilterPopupRef = viewChild('headerFilterPopup', {
    read: ElementRef,
  });

  /** Anchored header-filter popup below its funnel button. */
  readonly headerFilterPanel = new OgeAnchoredPanel({
    anchor: () => this.headerFilterAnchor() ?? this.hostRef.nativeElement,
    panel: () => this.headerFilterPopupRef()?.nativeElement ?? null,
    placement: () => 'bottom-start',
    onClosed: () => this.headerFilterField.set(null),
  });

  private readonly headerFilterColumn = computed<ResolvedColumn<T> | null>(
    () => {
      const field = this.headerFilterField();
      if (field === null) return null;
      return (
        this.resolvedColumns().find((column) => column.field === field) ?? null
      );
    },
  );

  protected toggleHeaderFilter(column: ResolvedColumn<T>, event: Event): void {
    event.stopPropagation();
    if (!column.field) return;
    if (this.headerFilterField() === column.field) {
      this.closeHeaderFilter();
      return;
    }
    this.headerFilterSearch.set('');
    this.headerFilterAnchor.set(event.currentTarget as HTMLElement);
    this.headerFilterField.set(column.field);
    this.headerFilterPanel.open();
    this.headerFilterPanel.updatePosition();
  }

  protected closeHeaderFilter(): void {
    this.headerFilterPanel.close();
  }

  /** Distinct raw values of the open column over all loaded rows, sorted by text. */
  private readonly headerValues = computed<readonly unknown[]>(() => {
    const column = this.headerFilterColumn();
    if (!column) return [];
    return this.core.distinctValues(
      column.accessor,
      this.effHeaderFilterLimit(),
    );
  });

  protected headerValueText(value: unknown): string {
    return ogeTreeHeaderValueText(
      value,
      untracked(this.headerFilterColumn),
      this.msg().blankValue,
    );
  }

  /** Popup rows after the popup's own search box. */
  protected readonly visibleHeaderValues = computed<readonly unknown[]>(() => {
    const values = this.headerValues();
    const query = foldText(this.headerFilterSearch().trim());
    if (!query) return values;
    return values.filter((value) =>
      foldText(this.headerValueText(value)).includes(query),
    );
  });

  /**
   * Date columns group their values by year (tri-state group checkboxes);
   * null when the open column is not a date column.
   */
  protected readonly headerValueGroups = computed<
    readonly { label: string; values: readonly unknown[] }[] | null
  >(() => {
    const column = this.headerFilterColumn();
    if (!column || column.dataType !== 'date') return null;
    return ogeTreeHeaderValueGroups(
      this.headerValues(),
      this.headerFilterSearch(),
      (value) => this.headerValueText(value),
      this.msg().blankValue,
    );
  });

  /** The open column's selection; `null` = every value (no filter). */
  private headerSelection(): readonly unknown[] | null {
    const field = this.headerFilterField();
    return field === null ? null : this.store.filter.headerFilterOf(field);
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

  /** Group checkbox: selects the whole year, or clears it when complete. */
  protected toggleHeaderGroup(group: { values: readonly unknown[] }): void {
    const field = untracked(this.headerFilterField);
    if (field === null) return;
    this.store.filter.setHeaderFilter(
      field,
      toggleHeaderGroup(
        untracked(this.headerValues),
        untracked(() => this.headerSelection()),
        group.values,
      ),
    );
  }

  protected isHeaderValueSelected(value: unknown): boolean {
    if (this.headerFilterField() === null) return false;
    return isHeaderValueSelected(this.headerSelection(), value);
  }

  protected toggleHeaderValue(value: unknown): void {
    const field = untracked(this.headerFilterField);
    if (field === null) return;
    // back to the full set = filter off
    this.store.filter.setHeaderFilter(
      field,
      toggleHeaderValue(
        untracked(this.headerValues),
        untracked(() => this.headerSelection()),
        value,
      ),
    );
  }

  protected readonly allHeaderValuesSelected = computed(() => {
    if (this.headerFilterField() === null) return false;
    return allHeaderValuesSelected(this.headerSelection());
  });

  protected toggleAllHeaderValues(): void {
    const field = untracked(this.headerFilterField);
    if (field === null) return;
    // all → none; anything else → all
    this.store.filter.setHeaderFilter(
      field,
      toggleAllHeaderValues(untracked(() => this.headerSelection())),
    );
  }

  protected isHeaderFilterActive(column: ResolvedColumn<T>): boolean {
    return (
      column.field != null &&
      this.store.filter.headerFilterOf(column.field) != null
    );
  }

  // --- search highlighting ---------------------------------------------------

  /**
   * Cell text split into search-match runs, or null when the search is off.
   * Segments rather than a trusted HTML string — see the grid's
   * `searchHighlightRuns` for why the sink is gone rather than defended.
   */
  protected searchHighlightRuns(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): readonly SearchHighlightSegment[] | null {
    const query = this.store.filter.searchText().trim();
    if (!query) return null;
    return buildSearchHighlightSegments(
      this.cellDisplayText(node, column),
      query,
    );
  }

  /** Filter-row lookup select: applies an exact-match filter on the raw value. */
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

  protected onSearchInput(raw: string): void {
    this.debounced('search', () => this.store.filter.setSearchText(raw));
  }

  // --- column resize --------------------------------------------------------

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
      setTimeout(() => (this.suppressHeaderClick = false));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- column drag reorder, chooser & context menus --------------------------

  /** Header the dragged column would be inserted in front of (drop indicator). */
  protected readonly headerDropTargetId = signal<string | null>(null);

  /**
   * Pointer drag of a header onto another (long press under touch) —
   * `columns.reorder`, the command Ctrl+Shift+Arrow runs.
   */
  protected onHeaderPointerDown(
    column: ResolvedColumn<T>,
    event: PointerEvent,
  ): void {
    if (event.button !== 0 || !column.field || !this.columnReorder()) return;
    const cell = event.currentTarget as HTMLElement;
    if (isOgeDragExcludedTarget(event.target, cell)) return;
    const host = this.hostRef.nativeElement;
    beginPointerDragDrop<OgeGridHeaderDropTarget>(event, {
      source: cell,
      autoScroll: this.viewportRef()?.nativeElement ?? null,
      autoScrollOptions: { axis: 'x' },
      resolve: (hit) =>
        resolveOgeHeaderDropTarget(hit, host, { reorder: true, group: false }),
      onOver: (target) => {
        const id =
          target?.kind === 'column' && target.id !== column.id
            ? target.id
            : null;
        if (this.headerDropTargetId() !== id) this.headerDropTargetId.set(id);
      },
      onDrop: (target) => {
        if (target.kind !== 'column' || target.id === column.id) return;
        this.store.columns.reorder(
          this.resolvedColumns().map((c) => c.id),
          column.id,
          target.id,
        );
      },
      onEnd: () => this.headerDropTargetId.set(null),
    });
  }

  protected readonly chooserOpen = signal(false);
  /** Anchored to the chooser button: its bottom-right corner. */
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
    this.chooserAnchor.set(event.currentTarget as HTMLElement);
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

  /** The Menu key / Shift+F10 open the row or header menu at the focused cell. */
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
      target.rowIndex === null
        ? undefined
        : this.renderNodes()[target.rowIndex];
    if (node?.kind !== 'data') return false;
    this.contextMenuEcho.mark(event.timeStamp);
    event.preventDefault();
    this.openRowContextMenu(node, target.x, target.y, event, 'keyboard');
    return true;
  }

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

  protected closePopups(): void {
    // the anchored panels also close themselves (outside click / Escape);
    // this is the API/keyboard sweep. The edit/builder dialogs run on
    // oge-modal, which owns its Escape/backdrop closing via the overlay stack.
    this.headerFilterPanel.close();
    this.chooserPanel.close();
    this.contextMenuPanel.close();
    this.operatorPanel.close();
  }

  // --- cells ----------------------------------------------------------------

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
    const value = column.accessor(node.data);
    if (column.format) return column.format(value);
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
    if (column.dataType !== 'boolean') return null;
    return booleanCellLabel(column.accessor(node.data), column, this.msg());
  }

  // --- row drag reparenting -------------------------------------------------

  /** Row + relative position currently hovered as a valid drop target. */
  protected readonly dropTarget = signal<{
    key: RowKey;
    position: OgeTreeDropPosition;
  } | null>(null);

  /**
   * Pointer drag on a row's handle (touch drags at once — the handle is
   * `touch-action: none`). The top/bottom quarter of the row under the
   * pointer orders before/after it, the middle reparents inside; the drop
   * runs `applyDrop`, the same path as the Ctrl+Arrow keys.
   */
  protected onRowHandlePointerDown(
    node: DataRowNode<T>,
    event: PointerEvent,
  ): void {
    if (event.button !== 0) return;
    const handle = event.currentTarget as HTMLElement;
    const host = this.hostRef.nativeElement;
    const draggedKey = node.key;
    beginPointerDragDrop<{ key: RowKey; position: OgeTreeDropPosition }>(
      event,
      {
        source: handle,
        ghost: handle.closest('.oge-row'),
        longPress: 0,
        autoScroll: this.viewportRef()?.nativeElement ?? null,
        autoScrollOptions: { axis: 'y' },
        resolve: (hit, moveEvent) => {
          const index = resolveOgeRowDropIndex(hit, host);
          const target =
            index === null ? undefined : untracked(this.renderNodes)[index];
          if (target?.kind !== 'data') return null;
          if (
            !untracked(() =>
              this.core.isValidDropTarget(draggedKey, target.key),
            )
          )
            return null;
          const row = hit?.closest('.oge-row');
          return {
            key: target.key,
            position: ogeTreeDropPosition(
              moveEvent.clientY,
              row?.getBoundingClientRect?.(),
            ),
          };
        },
        onOver: (target) => {
          const current = this.dropTarget();
          if (
            current?.key !== target?.key ||
            current?.position !== target?.position
          )
            this.dropTarget.set(target);
        },
        onDrop: (target) => {
          // plain arrays with a writable top-level parent field are moved in
          // place; dotted paths, nested payloads and DataSources are the
          // consumer's job (handle rowReparented)
          const moved = untracked(() =>
            this.core.applyDrop(draggedKey, target.key, target.position, () =>
              this.adapter.reload(),
            ),
          );
          if (moved) this.rowReparented.emit(moved);
        },
        onEnd: () => this.dropTarget.set(null),
      },
    );
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

  /** Row the focus follows once a keyboard move re-renders the rows. */
  private readonly pendingFocusRow = signal<{
    key: RowKey;
    col: number;
    nodes: readonly RowNode<T>[];
  } | null>(null);

  /**
   * Ctrl+ArrowUp/Down move the focused row among its siblings, Ctrl+Right
   * indents it under the previous sibling, Ctrl+Left outdents it — the
   * keyboard twin of a handle drag, through the same `applyDrop` and the same
   * `rowReparented`. Returns whether the key was one of those.
   */
  private moveRowByKeyboard(
    node: DataRowNode<T>,
    event: KeyboardEvent,
    col: number,
  ): boolean {
    const move = ogeTreeRowKeyMove(event, this.rtl());
    if (move === null) return false;
    event.preventDefault();
    const target = untracked(() =>
      this.core.keyboardMoveTarget(node.key, move),
    );
    if (!target) return true;
    const nodes = untracked(this.renderNodes);
    const moved = untracked(() =>
      this.core.applyDrop(node.key, target.targetKey, target.position, () =>
        this.adapter.reload(),
      ),
    );
    if (!moved) return true;
    this.rowReparented.emit(moved);
    this.pendingFocusRow.set({ key: node.key, col, nodes });
    return true;
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
    const columns = this.resolvedColumns();
    const target = ogeColumnMoveTarget(columns, column.id, command.direction);
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
    const cell = (event.currentTarget as HTMLElement).closest<HTMLElement>(
      '.oge-header-cell',
    );
    if (command.kind === 'exit') {
      cell?.focus();
      return;
    }
    const current = cell?.offsetWidth || this.separatorValue(column).now;
    const width = ogeSeparatorTargetWidth(
      command,
      current,
      this.widthBounds(column, current),
    );
    if (width !== null) this.resizeColumnTo(column, width, false);
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
      item?.querySelector<HTMLElement>('input')?.focus();
    });
  }

  // --- editing ---------------------------------------------------------------

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
    // saved rows may live in the lazy child cache — drop it so the reload
    // re-fetches open levels and the UI shows the persisted values
    reload: () => {
      this.core.deferredLoader.reset();
      this.adapter.reload();
    },
  });

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
    const items = this.editingModel.editingOptions()?.formItems;
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
   * The row currently rendered as an edit form — inline or in the popup. Both
   * edit exactly one row at a time, which is what lets a single `FormGroup`
   * back either surface.
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

  /** The edited row's controls as one `FormGroup`, for `<oge-form>`. */
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
            editorTemplate: item.column.editTemplate ? adapter : undefined,
          },
        ];
      });
    },
  );

  /** Layout columns for the edit form; `undefined` keeps the auto-fit default. */
  protected readonly editFormColCount = computed<number | 'auto'>(() => {
    const count = this.editingModel.editingOptions()?.formColCount;
    return count && count > 0 ? count : 'auto';
  });

  /** Resolves a column back from an item field, for the edit-template adapter. */
  protected editColumnFor(field: string): ResolvedColumn<T> | null {
    return (
      this.editFormItems().find((item) => item.column.field === field)
        ?.column ?? null
    );
  }

  protected readonly formGridTemplate = computed<string | null>(() => {
    const count = this.editingModel.editingOptions()?.formColCount;
    return count && count > 0 ? `repeat(${count}, minmax(0, 1fr))` : null;
  });

  /** Trailing command cell: editing actions or custom command buttons. */
  protected readonly hasCommandColumn = computed(
    () =>
      (this.editingModel.editingOptions() !== null &&
        (this.canUpdate() || this.canDelete())) ||
      (this.commandButtons()?.length ?? 0) > 0,
  );

  /** Custom buttons win; otherwise edit/delete derive from the edit mode. */
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
    ) {
      buttons.push({ name: 'edit' });
    }
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

  protected isCellDirty(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): boolean {
    return this.editingModel.isCellDirty(node, column);
  }

  protected isRowEditing(key: RowKey): boolean {
    return this.editingModel.isRowEditing(key);
  }

  /** The editing row renders as an inline labeled form (`mode: 'form'`). */
  protected isFormRow(key: RowKey): boolean {
    return this.editingModel.isFormRow(key);
  }

  /** The row edited in the modal dialog (`mode: 'popup'`), if any. */
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

  protected isCellEditorOpen(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): boolean {
    return this.editingModel.isCellEditorOpen(node, column);
  }

  protected editControl(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): FormControl<unknown> {
    return this.editingModel.editControl(node, column);
  }

  protected lookupItemsFor(node: DataRowNode<T>, column: ResolvedColumn<T>) {
    return this.editingModel.lookupItemsFor(node, column);
  }

  protected commitAndNext(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
    event: Event,
  ): void {
    this.editingModel.commitAndNext(node, column, event);
  }

  protected cancelActiveEditor(): void {
    this.editingModel.cancelActiveEditor();
  }

  protected onEditorBlur(): void {
    this.editingModel.onEditorBlur();
  }

  protected onEditorEnter(): void {
    const mode = this.editMode();
    if (mode === 'row' || mode === 'popup' || mode === 'form') {
      this.editingModel.commitActiveRow();
    } else {
      this.editingModel.commitActiveCell();
    }
  }

  protected startRowEdit(node: DataRowNode<T>, event?: Event): void {
    this.editingModel.startRowEdit(node, event);
  }

  protected commitActiveRow(): void {
    this.editingModel.commitActiveRow();
  }

  protected deleteRowNode(node: DataRowNode<T>, event?: Event): void {
    this.editingModel.deleteRow(node, event);
  }

  protected saveAllChanges(): void {
    this.editingModel.saveAllChanges();
  }

  protected discardAllChanges(): void {
    this.editingModel.discardAllChanges();
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
    if (!this.store.editing.isCellEditing(node.key, column.field)) {
      if (
        !this.editingModel.notifyEditingStart(node.key, node.data, column.field)
      )
        return;
      this.store.editing.startCell(node.key, column.field);
    }
  }

  /**
   * Adds a new (unsaved) row; with `parentKey` and a string `parentIdExpr`
   * the parent reference is pre-staged, so saving inserts it under that node.
   */
  addRow(parentKey?: RowKey): void {
    this.editingModel.addNewRow();
    const key = untracked(this.store.editing.added)[0];
    if (key === undefined) return;
    untracked(() => this.core.stageNewRowParent(key, parentKey));
    // prefill hook: values the consumer writes stage onto the new row
    const event: OgeTreeInitNewRowEvent = {
      key,
      parentKey: parentKey ?? null,
      values: {},
    };
    this.initNewRow.emit(event);
    if (Object.keys(event.values).length) {
      this.store.editing.setRowChanges(key, event.values);
    }
  }

  /** Runs `callback` for every loaded row (all branches, loaded lazily or not). */
  forEachNode(
    callback: (row: T, key: RowKey, parentKey: RowKey | null) => void,
  ): void {
    untracked(() => this.core.forEachNode(callback));
  }

  /** Data rows of the currently rendered page, in display order. */
  getVisibleRows(): readonly T[] {
    return untracked(() => this.core.getVisibleRows());
  }

  // --- live announcements --------------------------------------------------

  /**
   * Speaks sort, filter/search result count, page, row expansion,
   * select-all and blocked-save validation changes through the shared
   * `OgeLiveAnnouncer` (texts from `messages`). `undefined` falls back to the
   * grid config's `announcements` (default `true`).
   */
  readonly announcements = input<boolean | undefined>(undefined);

  private readonly liveAnnouncer = inject(OgeLiveAnnouncer);

  /** The grid family's shared announcement rules (`@oge-ui/behavior`). */
  private readonly announcer = new OgeGridAnnouncements({
    announce: (message, options) =>
      this.liveAnnouncer.announce(message, options),
    messages: () => untracked(this.msg),
    enabled: () => untracked(this.announcements) ?? this.config.announcements,
    caption: (field) => untracked(() => this.captionOf(field)),
  });

  private readonly announcementEffect = effect(() => {
    const snapshot = {
      sort: this.store.sort.descriptors(),
      filterKey: JSON.stringify([
        this.store.filter.combinedExpr(),
        this.store.filter.searchText().trim(),
      ]),
      // the tree filters client-side: a new flat list is the new result
      resultToken: this.flatNodes(),
      loading: this.adapter.loading(),
      rowCount: this.totalCount(),
      paging: this.effPageSize() != null,
      pageIndex: this.pageIndex(),
      pageCount: this.pageCount(),
    };
    untracked(() => this.announcer.observe(snapshot));
  });

  private captionOf(field: string): string {
    const column = this.resolvedColumns().find(
      (candidate) => candidate.field === field,
    );
    return column?.caption ?? humanize(field);
  }

  /** The row's name in announcements: its first column's display text. */
  private rowLabel(node: DataRowNode<T>): string {
    const column = this.resolvedColumns().find((candidate) => candidate.field);
    return column ? this.cellDisplayText(node, column) : String(node.key);
  }

  /** Announces the first editor that blocked a commit, with its error text. */
  private announceInvalidEditor(
    invalid: readonly { key: RowKey; field: string }[],
  ): void {
    const first = invalid[0];
    if (!first) return;
    const control = untracked(this.editingModel.activeControls).get(
      `${String(first.key)}::${first.field}`,
    );
    const error = control ? this.editorErrorText(control) : null;
    this.announcer.validationFailed(
      untracked(() => this.captionOf(first.field)),
      error ?? untracked(this.msg).invalidError,
    );
  }

  // --- expansion actions ----------------------------------------------------

  private setRowExpanded(node: DataRowNode<T>, expand: boolean): void {
    // consumers may veto UI-driven toggles (imperative API stays silent)
    const toggled = untracked(() =>
      this.core.requestToggle(node, expand, {
        expanding: (event) => this.rowExpanding.emit(event),
        collapsing: (event) => this.rowCollapsing.emit(event),
        expanded: (event) => this.rowExpanded.emit(event),
        collapsed: (event) => this.rowCollapsed.emit(event),
      }),
    );
    if (toggled) {
      this.announcer.rowToggled(
        untracked(() => this.rowLabel(node)),
        expand,
      );
    }
  }

  protected onExpanderClick(node: DataRowNode<T>, event: Event): void {
    event.stopPropagation();
    this.setRowExpanded(node, !node.expanded);
  }

  // --- keyboard / scroll wiring ---------------------------------------------

  protected onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.scrollTop.set(target.scrollTop);
    this.scrollLeft.set(target.scrollLeft);
  }

  protected onTreeKeydown(event: KeyboardEvent): void {
    if (
      isOgeContextMenuKey(event) &&
      this.store.editing.editCell() === null &&
      this.store.editing.editRowKey() === null &&
      this.openContextMenuFromKeyboard(event)
    )
      return;
    const cell = this.focusedCell();
    if (!cell) return;
    if (event.key === ' ') {
      const node = this.renderNodes()[cell.row];
      if (node?.kind === 'data' && this.selectionMode() !== 'none') {
        event.preventDefault();
        if (this.selectionMode() === 'single')
          this.store.selection.selectOnly(node.key);
        else this.toggleSelection(node.key);
      }
      return;
    }
    if (
      this.rowDragging() &&
      this.store.editing.editCell() === null &&
      this.store.editing.editRowKey() === null &&
      (event.target as HTMLElement | null)?.closest?.('[data-cell]')
    ) {
      const node = this.renderNodes()[cell.row];
      if (
        node?.kind === 'data' &&
        this.moveRowByKeyboard(node, event, cell.col)
      )
        return;
    }
    if (this.keyboard.handleKey(event)) event.preventDefault();
  }

  // --- state persistence ----------------------------------------------------

  /** Store snapshot + column visibility + expansion (paging/grouping don't apply). */
  private readonly persistedSnapshot = computed<TreeListStateSnapshot>(() => {
    const { group: _group, paging: _paging, ...base } = this.store.snapshot();
    const hidden = this.declaredColumns()
      .filter((column) => !column.visible())
      .map((column) => column.field())
      .filter((field): field is string => field != null);
    return {
      ...base,
      columns: { ...base.columns, hidden },
      expansion: this.core.expansionSnapshot(),
    };
  });

  /** Current persistable UI state: sort, filters, column layout, expansion. */
  state(): TreeListStateSnapshot {
    return untracked(this.persistedSnapshot);
  }

  /** Applies a previously captured state snapshot (see `state()` / `stateChange`). */
  applyState(snapshot: TreeListStateSnapshot): void {
    // public API fed from storage, URLs or the host: validate the shape first
    const safe = sanitizeTreeListStateSnapshot(snapshot);
    if (safe === null) return;
    untracked(() => {
      this.store.applySnapshot(safe);
      this.core.applyExpansionSnapshot(safe);
      const hidden = new Set(safe.columns?.hidden ?? []);
      for (const column of this.declaredColumns()) {
        const field = column.field();
        if (field) column.visible.set(!hidden.has(field));
      }
    });
  }

  // --- imperative API -------------------------------------------------------

  /** Re-runs the current load and drops lazily fetched/discovered rows. */
  refresh(): void {
    untracked(() => this.core.refresh());
    this.adapter.reload();
  }

  clearFilters(): void {
    this.store.filter.clearAll();
  }

  clearSorting(): void {
    this.store.sort.clear();
  }

  expandAll(): void {
    untracked(() => this.core.expandAll());
  }

  collapseAll(): void {
    untracked(() => this.core.collapseAll());
  }

  expandRow(key: RowKey): void {
    // polarity-aware: expanded means "not toggled" under autoExpandAll
    untracked(() => this.core.expandRow(key));
  }

  collapseRow(key: RowKey): void {
    untracked(() => this.core.collapseRow(key));
  }

  isRowExpanded(key: RowKey): boolean {
    return untracked(() => this.core.isRowExpanded(key));
  }

  getNodeByKey(key: RowKey): T | undefined {
    return untracked(() => this.core.getNodeByKey(key));
  }

  /** Expands the ancestors of `key`, scrolls to it and focuses its first cell. */
  focusRow(key: RowKey): void {
    if (!untracked(this.treeIndex).byKey.has(key)) return;
    const flatIndex = untracked(() => this.core.revealRow(key));
    if (untracked(this.focusedRowEnabled)) this.focusedRowKey.set(key);
    if (flatIndex !== undefined) {
      this.virtualizer.scrollRowIntoView(flatIndex);
      this.keyboard.focusedCell.set({ row: flatIndex, col: 0 });
    }
  }

  /**
   * Expands the path to `key`, scrolls to it and focuses it — same as
   * `focusRow()` (parity alias).
   */
  navigateToRow(key: RowKey): void {
    this.focusRow(key);
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

  /** Navigates to the given zero-based page (clamped to the valid range). */
  setPageIndex(index: number): void {
    untracked(() => this.core.setPageIndex(index));
  }

  /** Current page size; `0` when paging is off or set to "all rows". */
  pageSize(): number {
    return untracked(() => this.core.pageSize());
  }

  /** Changes the page size (`0` shows all rows) and resets to the first page. */
  setPageSize(size: number): void {
    this.core.setPageSize(size);
  }

  /** The flat data node carrying `key`, if it is currently rendered. */
  private dataNodeByKey(key: RowKey): DataRowNode<T> | undefined {
    return untracked(() => this.core.dataNodeByKey(key));
  }

  /** Data of the selected rows, narrowed per mode like `getSelectedRowKeys`. */
  getSelectedRowsData(
    mode: 'all' | 'leavesOnly' | 'excludeRecursive' = 'all',
  ): T[] {
    return untracked(() => this.core.getSelectedRowsData(mode));
  }

  /**
   * Copies the selected rows (with a header) to the clipboard as
   * tab-separated values.
   */
  async copyToClipboard(): Promise<void> {
    const { columns } = this.getExportData();
    const text = untracked(() => this.core.clipboardText(columns));
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
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

  /**
   * Rows, column metadata and depth levels of the currently visible tree
   * (expansion + filter applied) — the shared source for exporters.
   */
  getExportData(): OgeTreeExportData<T> {
    return untracked(() =>
      this.core.getExportData(this.resolvedColumns(), this.msg()),
    );
  }

  /**
   * CSV of the currently visible rows (expansion + filter applied), the
   * hierarchy expressed by indenting the first column.
   */
  getCsv(options?: CsvOptions): string {
    return ogeTreeCsv(this.getExportData(), options);
  }

  /**
   * Downloads the visible tree as a CSV file. Fires the cancelable
   * `exporting` event first (the Excel helper function calls
   * `getExportData` directly and does not).
   */
  exportCsv(filename = 'tree-list.csv'): void {
    const event: OgeExportingEvent = { fileName: filename, cancel: false };
    this.exporting.emit(event);
    if (event.cancel) return;
    const csv = this.getCsv();
    if (typeof document === 'undefined') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = event.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Scrolls a row (by key or visible index) into the viewport. */
  scrollToRow(target: number | RowKey): void {
    const nodes = untracked(this.renderNodes);
    let index = nodes.findIndex((node) => node.key === target);
    if (
      index < 0 &&
      typeof target === 'number' &&
      target >= 0 &&
      target < nodes.length
    ) {
      index = target;
    }
    if (index >= 0) this.virtualizer.scrollRowIntoView(index);
  }

  // --- wiring ---------------------------------------------------------------

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.contextMenuPanel.destroy();
      this.operatorPanel.destroy();
      this.headerFilterPanel.destroy();
      this.chooserPanel.destroy();
    });
    // contentReady: after the DOM for a new result set is in place
    afterRenderEffect(() => {
      if (this.adapter.result() === null) return;
      untracked(() => this.contentReady.emit());
    });
    effect(() => {
      const data = this.data();
      this.core.connectInputs();
      const sortValues = this.sortValueSelectors();
      untracked(() =>
        this.adapter.setSource(this.core.connect(data, sortValues)),
      );
    });
    // the SOURCE never pages: paging happens over the flattened rows
    effect(() => {
      untracked(() => this.store.paging.configure(null));
    });
    // filter/search changes jump back to the first page
    effect(() => {
      this.store.filter.combinedExpr();
      this.store.filter.searchText();
      untracked(() => this.pageIndex.set(0));
    });
    // autoNavigateToFocusedRow: expand the ancestors and scroll it into view
    effect(() => {
      const key = this.focusedRowKey();
      if (key === null || !this.autoNavigateToFocusedRow()) return;
      untracked(() => {
        const flatIndex = this.core.revealRow(key);
        if (flatIndex !== undefined)
          this.virtualizer.scrollRowIntoView(flatIndex);
      });
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
        row: key === null ? undefined : untracked(() => this.getNodeByKey(key)),
      });
    });
    // surface DataSource load failures (save failures route through the model)
    effect(() => {
      const error = this.adapter.error();
      if (error !== null) this.dataErrorOccurred.emit({ error });
    });
    // expandedRowKeys model ⇄ expansion slice (guarded both ways, polarity-aware)
    effect(() => {
      const keys = this.expandedRowKeys();
      untracked(() => this.core.applyExpandedRowKeys(keys));
    });
    effect(() => {
      const expanded = this.core.expandedSet();
      untracked(() => {
        const keys = this.expandedRowKeys();
        if (
          keys.length === expanded.size &&
          keys.every((key) => expanded.has(key))
        )
          return;
        this.expandedRowKeys.set([...expanded]);
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
    // Registered AFTER the model⇄slice sync effects: their first run must
    // precede the restore, or the models' defaults would overwrite it.
    createStatePersistence<TreeListStateSnapshot>({
      stateKey: this.stateKey,
      prefix: 'oge-tree-list',
      storage: this.stateStorage,
      snapshot: this.persistedSnapshot,
      apply: (snapshot) => this.applyState(snapshot),
      // re-run the restore once the column directives registered
      beforeRestore: () => this.declaredColumns(),
      onChange: (snapshot) => this.stateChange.emit(snapshot),
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
    // a keyboard-moved row keeps the focus once the rows re-render, and the
    // live region says where it landed
    effect(() => {
      const pending = this.pendingFocusRow();
      const nodes = this.renderNodes();
      if (!pending || nodes === pending.nodes) return;
      const row = nodes.findIndex(
        (node) => node.kind === 'data' && node.key === pending.key,
      );
      if (row < 0) return;
      untracked(() => {
        this.pendingFocusRow.set(null);
        this.focusedCell.set({ row, col: pending.col });
        const placement = this.core.rowPlacement(pending.key);
        if (placement) {
          this.announce(
            formatPattern(this.msg().treeRowMoved, {
              level: String(placement.level),
              position: String(placement.position),
              total: String(placement.total),
            }),
          );
        }
      });
    });
    // focus follows the keyboard-navigation cell — unless an editor is open
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
        this.virtualizer.scrollRowIntoView(cell.row);
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
}
