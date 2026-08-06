import { NgTemplateOutlet } from '@angular/common';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
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
} from '@angular/core';
import {
  ArrayDataSource,
  ancestorsOf,
  buildCsv,
  buildTreeIndex,
  computeTreeCheckStates,
  type CsvOptions,
  createFieldAccessor,
  createFilterPredicate,
  filterTreeKeys,
  flattenNestedTree,
  flattenTreeData,
  foldText,
  foldTextWithMap,
  type FilterExpr,
  resolveSelectedKeys,
  toggleTreeSelection,
  type CheckState,
  type DataRowNode,
  type DataSource,
  type FilterOperator,
  type RowKey,
  type RowNode,
  type TreeFilterMode,
  type TreeIndex,
  type TreeListStateSnapshot,
} from '@oge-ui/core';
import {
  CHECKBOX_WIDTH,
  COMMAND_WIDTH,
  DRAG_WIDTH,
  ColumnLayoutModel,
  EditingModel,
  ColumnModel,
  DeferredChildrenLoader,
  KeyboardNavModel,
  OGE_STATE_STORAGE,
  RowVirtualizerModel,
  buildRowFilterExpr,
  createStatePersistence,
  defaultOperatorFor,
  humanize,
  isDataSource,
  lookupTextOf,
  type ColumnDefLike,
  type PendingChildRequest,
  type ResolvedColumn as FoundationResolvedColumn,
} from '@oge-ui/grid/foundation';
import {
  GridDataAdapter,
  GridStateStore,
  OGE_GRID_CONFIG,
  OgeColumn,
  OgeColumnGroup,
  OgeFilterBuilderGroup,
  OgeNoDataTemplate,
  OgePager,
  OgeToolbarItem,
  builderToExpr,
  describeExpr,
  exprToBuilder,
  formatCellValue,
  operatorsFor,
  type BuilderGroup,
  type FilterBuilderField,
  type OgeCommandButton,
  type OgeExportColumn,
  type OgeExportData,
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
  type OgeSearchPanelOptions,
  type OgeSortingOptions,
  type SelectionMode,
} from '@oge-ui/grid';

/** Tree-list view of the shared column view-model: `source` is the OgeColumn. */
type ResolvedColumn<T = unknown> = FoundationResolvedColumn<T, OgeColumn<T>>;

/** Fired when a row is expanded or collapsed. */
export interface OgeTreeRowToggleEvent<T = unknown> {
  key: RowKey;
  row: T;
}

/** Cancelable pre-toggle notification; set `cancel = true` to veto. */
export interface OgeTreeRowTogglingEvent<T = unknown> {
  key: RowKey;
  row: T;
  cancel: boolean;
}

/** Prefill hook for `addRow()`: values written here stage onto the new row. */
export interface OgeTreeInitNewRowEvent {
  key: RowKey;
  /** Parent staged by `addRow(parentKey)`, if any. */
  parentKey: RowKey | null;
  values: Record<string, unknown>;
}

const EMPTY_CHECK_STATES: ReadonlyMap<RowKey, CheckState> = new Map();

const COLUMN_DRAG_TYPE = 'application/x-oge-column';

/** Export payload of the visible tree; `levels` aligns with `rows`. */
export interface OgeTreeExportData<T = unknown> extends OgeExportData<T> {
  /** Zero-based depth per exported row (drives spreadsheet outline levels). */
  levels: readonly number[];
}

/** Where a dragged row lands relative to the drop target. */
export type OgeTreeDropPosition = 'inside' | 'before' | 'after';

/** Fired after a row is dropped onto (or next to) another row. */
export interface OgeTreeRowReparentEvent<T = unknown> {
  key: RowKey;
  row: T;
  fromParentKey: RowKey | null;
  toParentKey: RowKey | null;
  /** `'inside'` reparents; `'before'`/`'after'` order among the target's siblings. */
  position: OgeTreeDropPosition;
}

/**
 * Wraps the user source for tree semantics: filter/search never reach the
 * source (filtering runs client-side so ancestor rows survive), and lazy
 * mode narrows the base load to the root rows.
 */
function treeSource<T>(
  inner: DataSource<T>,
  lazy: { parentField: string; rootValue: unknown } | null,
): DataSource<T> {
  return {
    capabilities: { ...inner.capabilities, filter: false },
    keyOf: (item) => inner.keyOf(item),
    load: (options) => {
      const { filter: _filter, searchText: _search, ...rest } = options;
      return inner.load(
        lazy
          ? {
              ...rest,
              filter: {
                type: 'binary',
                field: lazy.parentField,
                op: 'eq',
                value: lazy.rootValue,
              },
            }
          : rest,
      );
    },
    ...(inner.distinct ? { distinct: inner.distinct.bind(inner) } : {}),
    ...(inner.insert ? { insert: inner.insert.bind(inner) } : {}),
    ...(inner.update ? { update: inner.update.bind(inner) } : {}),
    ...(inner.remove ? { remove: inner.remove.bind(inner) } : {}),
    ...(inner.changes ? { changes: inner.changes } : {}),
  };
}

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
  ],
  providers: [GridStateStore, GridDataAdapter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './tree-list.html',
  styleUrl: './tree-list.scss',
  host: {
    class: 'oge-tree-list',
    '[class.oge-virtual]': 'virtualized()',
    '[class.oge-loading]': 'adapter.loading()',
    '[class.oge-wrap]': 'wordWrap()',
    '[class.oge-rtl]': 'rtl()',
    '[attr.dir]':
      "rtlEnabled() === undefined ? null : rtlEnabled() ? 'rtl' : 'ltr'",
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closePopups()',
  },
})
export class OgeTreeList<T extends object = Record<string, unknown>> {
  protected readonly store = inject(GridStateStore);
  protected readonly adapter: GridDataAdapter<T> = inject(GridDataAdapter);
  private readonly config = inject(OGE_GRID_CONFIG);
  private readonly stateStorage = inject(OGE_STATE_STORAGE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');

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

  /** Programmatic column definitions (alternative to declarative `<oge-column>`). */
  readonly columns = input<readonly (string | ColumnDefLike)[] | undefined>(
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

  /** Enables drag-resize handles on header edges. */
  readonly columnResize = input(true);

  /** Enables drag-and-drop column reordering (headers and chooser rows). */
  readonly columnReorder = input(true);

  /** Shows the column visibility chooser button in the toolbar. */
  readonly columnChooser = input(false);

  /** Per-instance message overrides (merged over the global config). */
  readonly messages = input<Partial<OgeGridMessages> | undefined>(undefined);

  /** Row selection: none | single | multiple (ctrl/shift) | checkbox column. */
  readonly selectionMode = input<SelectionMode>('none');

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
  /** Fires after the tree has rendered a new result set. */
  readonly contentReady = output<void>();
  /**
   * Debounced notification whenever the persistable UI state changes —
   * persist the snapshot anywhere without `OGE_STATE_STORAGE`.
   */
  readonly stateChange = output<TreeListStateSnapshot>();

  protected readonly declaredColumns = contentChildren<OgeColumn<T>>(
    OgeColumn,
    {
      descendants: true,
    },
  );
  protected readonly columnGroups =
    contentChildren<OgeColumnGroup<T>>(OgeColumnGroup);
  protected readonly noDataTemplate = contentChild(OgeNoDataTemplate);
  protected readonly toolbarItems = contentChildren(OgeToolbarItem);

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

  /** Lazy child requests filter on this field; requires a string `parentIdExpr`. */
  private readonly lazyParentField = computed<string | null>(() => {
    const parent = this.parentIdExpr();
    return typeof parent === 'string' ? parent : null;
  });

  /** Remote lookups by key (`[keyField, 'in', keys]`) need a string `keyExpr`. */
  private readonly lazyKeyField = computed<string | null>(() => {
    const key = this.keyExpr();
    return typeof key === 'string' ? key : null;
  });

  private readonly effLoadMode = computed<'full' | 'lazy'>(() => {
    // without a string parent field no child request can ever be built
    if (this.lazyParentField() === null) return 'full';
    const explicit = this.loadMode();
    if (explicit) return explicit;
    return isDataSource(this.data()) && this.hasItemsExpr() !== undefined
      ? 'lazy'
      : 'full';
  });

  // --- keys & tree index ----------------------------------------------------

  /** Row → key accessor (trees always need an intrinsic key). */
  private readonly rowKeyOf = computed<(row: T) => RowKey>(() => {
    const key = this.keyExpr();
    if (typeof key === 'function') return key;
    const accessor = createFieldAccessor<T>(key);
    return (row) => accessor(row) as RowKey;
  });

  /** Parent map produced from a nested (`itemsExpr`) payload, else null. */
  private readonly nestedParents = signal<ReadonlyMap<
    RowKey,
    RowKey | null
  > | null>(null);

  private readonly parentIdOf = computed<(row: T) => unknown>(() => {
    const nested = this.nestedParents();
    if (nested) {
      const keyOf = this.rowKeyOf();
      return (row) => nested.get(keyOf(row)) ?? null;
    }
    const parent = this.parentIdExpr();
    return typeof parent === 'function'
      ? parent
      : createFieldAccessor<T>(parent);
  });

  private readonly nestedItemsOf = computed<
    ((row: T) => readonly T[] | undefined) | null
  >(() => {
    const expr = this.itemsExpr();
    if (expr === undefined) return null;
    if (typeof expr === 'function') return expr;
    const accessor = createFieldAccessor<T>(expr);
    return (row) => accessor(row) as readonly T[] | undefined;
  });

  private readonly hasChildrenHint = computed<
    ((row: T) => boolean | undefined) | undefined
  >(() => {
    const expr = this.hasItemsExpr();
    if (expr === undefined) return undefined;
    if (typeof expr === 'function') return expr;
    const accessor = createFieldAccessor<T>(expr);
    return (row) => {
      const value = accessor(row);
      return value === undefined || value === null ? undefined : Boolean(value);
    };
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

  /**
   * Rows discovered by remote filtering (matches + their ancestor chains) —
   * they join the index so lazy filtering can reach unloaded branches.
   */
  private readonly remoteFilterRows = signal<readonly T[]>([]);

  /** Loaded rows: base result + lazily fetched children + remote matches. */
  private readonly indexRows = computed<readonly T[]>(() => {
    const base = (this.adapter.result()?.data ?? []) as readonly T[];
    const cache = this.deferredLoader.children();
    const remote = this.remoteFilterRows();
    if (!cache.size && !remote.length) return base;
    // duplicates resolve first-wins in buildTreeIndex, so order is base →
    // lazily fetched children → remotely discovered rows
    const all = [...base];
    for (const rows of cache.values()) all.push(...rows);
    all.push(...remote);
    return all;
  });

  /**
   * Adjacency index, rebuilt only when the loaded rows change. The source
   * applies the global sort, so buckets inherit sibling order for free; lazy
   * child batches keep their per-request order.
   */
  protected readonly treeIndex = computed<TreeIndex<T>>(() => {
    // track the result identity: a reload must re-index even when the source
    // returns the same (in-place mutated) array reference
    this.adapter.result();
    return buildTreeIndex<T>(this.indexRows(), {
      keyOf: this.rowKeyOf(),
      parentIdOf: this.parentIdOf(),
      rootValue: this.rootValue(),
      orphanPolicy: this.orphanPolicy(),
    });
  });

  /** Rows that can expand: loaded buckets plus lazy `hasItemsExpr` hints. */
  private readonly expandableKeys = computed<ReadonlySet<RowKey>>(() => {
    const index = this.treeIndex();
    const keys = new Set<RowKey>(index.childrenOf.keys());
    const hint = this.hasChildrenHint();
    if (hint && this.effLoadMode() === 'lazy') {
      for (const [key, row] of index.byKey) {
        if (hint(row) === true) keys.add(key);
      }
    }
    return keys;
  });

  // --- expansion ------------------------------------------------------------

  /** Toggled keys with `autoExpandAll` polarity (mirrors grid group expansion). */
  private readonly toggledKeys = computed(() =>
    this.store.expansion.collapsedGroups(),
  );

  /** Effective expanded set (independent of polarity). */
  private readonly expandedSet = computed<ReadonlySet<RowKey>>(() => {
    const toggled = this.toggledKeys();
    if (!this.autoExpandAll()) return toggled;
    const expanded = new Set<RowKey>();
    for (const key of this.expandableKeys()) {
      if (!toggled.has(key)) expanded.add(key);
    }
    return expanded;
  });

  protected isRowExpandedKey(key: RowKey): boolean {
    return this.expandedSet().has(key);
  }

  // --- filtering (client-side, ancestors preserved) --------------------------

  /**
   * Row predicate from the filter slice + search text. Filtering always runs
   * client-side over the loaded nodes — the DataSource never receives
   * filter/search (a source-side filter would drop ancestor rows).
   */
  private readonly filterPredicate = computed<((row: T) => boolean) | null>(
    () => {
      const expr = this.store.filter.combinedExpr();
      const search = this.store.filter.searchText().trim();
      const exprPredicate = expr ? createFilterPredicate<T>(expr) : null;
      if (!search) return exprPredicate;
      const needle = foldText(search);
      const columns = this.resolvedColumns();
      const searchPredicate = (row: T): boolean =>
        columns.some((column) => {
          const value = column.accessor(row);
          return value != null && foldText(String(value)).includes(needle);
        });
      if (!exprPredicate) return searchPredicate;
      return (row) => exprPredicate(row) && searchPredicate(row);
    },
  );

  /** Keys visible under the active filter (`null` = everything). */
  private readonly visibleKeys = computed<ReadonlySet<RowKey> | null>(() => {
    const predicate = this.filterPredicate();
    if (!predicate) return null;
    return filterTreeKeys(this.treeIndex(), predicate, this.filterMode());
  });

  /**
   * While filtering, parents of visible rows must expand or the matches stay
   * hidden under collapsed branches (`expandNodesOnFiltering`).
   */
  private readonly filterExpandedKeys = computed<ReadonlySet<RowKey> | null>(
    () => {
      if (!this.expandNodesOnFiltering()) return null;
      const visible = this.visibleKeys();
      if (!visible) return null;
      const index = this.treeIndex();
      const parents = new Set<RowKey>();
      for (const key of visible) {
        const parent = index.parentOf.get(key);
        if (parent != null && visible.has(parent)) parents.add(parent);
      }
      return parents;
    },
  );

  // --- flat rows ------------------------------------------------------------

  protected readonly flatNodes = computed<RowNode<T>[]>(() => {
    let toggled = this.toggledKeys();
    const filterExpanded = this.filterExpandedKeys();
    if (filterExpanded?.size) {
      if (this.autoExpandAll()) {
        // toggled = collapsed: matched paths must not stay collapsed
        const next = new Set(toggled);
        for (const key of filterExpanded) next.delete(key);
        toggled = next;
      } else {
        // toggled = expanded: matched paths join the expanded set
        const next = new Set(toggled);
        for (const key of filterExpanded) next.add(key);
        toggled = next;
      }
    }
    const nodes = flattenTreeData<T>({
      index: this.treeIndex(),
      keyOf: this.rowKeyOf(),
      ...(this.autoExpandAll()
        ? { collapsedRowKeys: toggled }
        : { expandedRowKeys: toggled }),
      // the hint only means something when a lazy loader can satisfy it —
      // honoring it in full mode would render an eternal loading skeleton
      hasChildren:
        this.effLoadMode() === 'lazy' ? this.hasChildrenHint() : undefined,
      deferredChildren: this.deferredLoader.children(),
      visibleKeys: this.visibleKeys(),
    });
    // unsaved added rows render on top as roots, like the grid
    const added = this.store.editing.added();
    if (!added.length) return nodes;
    const changes = this.store.editing.changes();
    const newNodes: RowNode<T>[] = added.map((key, i) => ({
      kind: 'data',
      key,
      data: (changes.get(key) ?? {}) as T,
      sourceIndex: -1 - i,
      level: 0,
      parentKey: null,
      hasChildren: false,
      expanded: false,
    }));
    return [...newNodes, ...nodes];
  });

  // --- lazy child loading ----------------------------------------------------

  /** Expanded lazy nodes whose children are neither indexed nor cached yet. */
  private readonly pendingChildRequests = computed<
    readonly PendingChildRequest[]
  >(() => {
    if (this.effLoadMode() !== 'lazy') return [];
    const parentField = this.lazyParentField();
    if (!parentField) return [];
    const index = this.treeIndex();
    const cache = this.deferredLoader.children();
    const requests: PendingChildRequest[] = [];
    for (const node of this.flatNodes()) {
      if (node.kind !== 'data' || !node.expanded) continue;
      if (index.childrenOf.has(node.key) || cache.has(node.key)) continue;
      const value = node.key;
      requests.push({
        key: node.key,
        buildOptions: (base) => ({
          ...(base.sort?.length ? { sort: base.sort } : {}),
          filter: { type: 'binary', field: parentField, op: 'eq', value },
        }),
      });
    }
    return requests;
  });

  /** Unwrapped user source — lazy child requests bypass the tree wrapper. */
  private readonly innerSource = signal<DataSource<T> | null>(null);

  /**
   * Loader fingerprint without filter/search: the tree filters client-side,
   * so a filter keystroke must not wipe the child cache and refetch every
   * open level.
   */
  private readonly childLoadBase = computed(() => {
    const {
      filter: _filter,
      searchText: _search,
      ...rest
    } = this.store.loadOptions();
    return rest;
  });

  private readonly deferredLoader = new DeferredChildrenLoader<T>({
    pending: this.pendingChildRequests,
    baseOptions: this.childLoadBase,
    source: this.innerSource,
    onError: (err) => this.adapter.error.set(err),
  });

  // --- lazy remote filtering -------------------------------------------------

  /** Fingerprint of the discovery currently applied/in flight. */
  private remoteFilterJson: string | null = null;

  /**
   * Lazy trees cannot find matches under unloaded branches client-side, so an
   * active filter/search additionally asks the source for ALL matching rows
   * and then completes their ancestor chains via `[keyField, 'in', keys]`
   * lookups. Needs string `keyExpr` + `parentIdExpr`; the contract is the
   * plain filter language, so OData/custom stores work unchanged.
   */
  private readonly remoteFilterEffect = effect(() => {
    const expr = this.store.filter.combinedExpr();
    const search = this.store.filter.searchText().trim();
    const lazy = this.effLoadMode() === 'lazy';
    const source = this.innerSource();
    const keyField = this.lazyKeyField();
    untracked(() => {
      if (!lazy || !source || !keyField || (!expr && !search)) {
        this.remoteFilterJson = null;
        if (this.remoteFilterRows().length) this.remoteFilterRows.set([]);
        return;
      }
      const fingerprint = JSON.stringify({ expr, search });
      if (fingerprint === this.remoteFilterJson) return;
      this.remoteFilterJson = fingerprint;
      void this.discoverRemoteMatches(
        source,
        expr,
        search,
        keyField,
        fingerprint,
      );
    });
  });

  private async discoverRemoteMatches(
    source: DataSource<T>,
    expr: FilterExpr | null,
    search: string,
    keyField: string,
    fingerprint: string,
  ): Promise<void> {
    try {
      const result = await source.load({
        ...(expr ? { filter: expr } : {}),
        ...(search ? { searchText: search } : {}),
      });
      let rows = [...(result.data as readonly T[])];
      const keyOf = untracked(this.rowKeyOf);
      const parentIdOf = untracked(this.parentIdOf);
      const rootValue = untracked(this.rootValue);
      const known = new Set<RowKey>(untracked(this.indexRows).map(keyOf));
      for (const row of rows) known.add(keyOf(row));
      // complete the ancestor chains level by level (depth-capped)
      for (let depth = 0; depth < 32; depth++) {
        const missing = new Set<RowKey>();
        for (const row of rows) {
          const parent = parentIdOf(row);
          if (parent == null || parent === rootValue) continue;
          if (!known.has(parent as RowKey)) missing.add(parent as RowKey);
        }
        if (!missing.size) break;
        const parents = await source.load({
          filter: {
            type: 'binary',
            field: keyField,
            op: 'in',
            value: [...missing],
          },
        });
        const fetched = parents.data as readonly T[];
        if (!fetched.length) break; // the source cannot resolve further
        for (const row of fetched) known.add(keyOf(row));
        rows = [...rows, ...fetched];
      }
      if (this.remoteFilterJson !== fingerprint) return; // stale discovery
      this.remoteFilterRows.set(rows);
    } catch (err) {
      if (this.remoteFilterJson === fingerprint) this.adapter.error.set(err);
    }
  }

  // --- lazy subtree loading (recursive selection) ----------------------------

  /** True when a hint-expandable descendant of `key` has no loaded children. */
  private hasUnloadedDescendants(key: RowKey): boolean {
    const hint = untracked(this.hasChildrenHint);
    if (!hint || untracked(this.effLoadMode) !== 'lazy') return false;
    const index = untracked(this.treeIndex);
    const cache = untracked(this.deferredLoader.children);
    const keyOf = untracked(this.rowKeyOf);
    const stack: RowKey[] = [key];
    while (stack.length) {
      const current = stack.pop() as RowKey;
      const row = index.byKey.get(current);
      if (!row) return true;
      const bucket = index.childrenOf.get(current);
      if (hint(row) === true && !bucket && !cache.has(current)) return true;
      if (bucket) for (const child of bucket) stack.push(keyOf(child));
    }
    return false;
  }

  /** Bulk-fetches every missing level under `rootKey` (`parentId in [...]`). */
  private async loadSubtree(rootKey: RowKey): Promise<void> {
    const source = untracked(this.innerSource);
    const parentField = untracked(this.lazyParentField);
    const hint = untracked(this.hasChildrenHint);
    if (!source || !parentField || !hint) return;
    const keyOf = untracked(this.rowKeyOf);
    const parentIdOf = untracked(this.parentIdOf);
    // seed: every hint-expandable node under the root with no loaded bucket
    const missingUnder = (): RowKey[] => {
      const index = untracked(this.treeIndex);
      const cache = untracked(this.deferredLoader.children);
      const out: RowKey[] = [];
      const stack: RowKey[] = [rootKey];
      while (stack.length) {
        const current = stack.pop() as RowKey;
        const row = index.byKey.get(current);
        if (!row) continue;
        const bucket = index.childrenOf.get(current);
        if (hint(row) === true && !bucket && !cache.has(current))
          out.push(current);
        if (bucket) for (const child of bucket) stack.push(keyOf(child));
      }
      return out;
    };
    let frontier = missingUnder();
    for (let depth = 0; depth < 32 && frontier.length; depth++) {
      const result = await source.load({
        filter: {
          type: 'binary',
          field: parentField,
          op: 'in',
          value: frontier,
        },
      });
      const rows = result.data as readonly T[];
      const byParent = new Map<RowKey, T[]>();
      for (const row of rows) {
        const parent = parentIdOf(row) as RowKey;
        const bucket = byParent.get(parent);
        if (bucket) bucket.push(row);
        else byParent.set(parent, [row]);
      }
      // parents that came back empty are primed too, so they never refetch
      for (const key of frontier) {
        if (!byParent.has(key)) byParent.set(key, []);
      }
      this.deferredLoader.prime(byParent);
      frontier = rows
        .filter((row) => hint(row) === true)
        .map(keyOf)
        .filter(
          (key) =>
            !untracked(this.treeIndex).childrenOf.has(key) &&
            !untracked(this.deferredLoader.children).has(key),
        );
    }
  }

  // --- client-side paging over the visible rows ------------------------------

  protected readonly pageIndex = signal(0);
  /** User-picked size from the pager; `0` = "all rows", `null` = use options. */
  private readonly pageSizeOverride = signal<number | null>(null);

  protected readonly effPageSize = computed<number | null>(() => {
    const options = this.pagingOptions();
    if (!options) return null;
    const override = this.pageSizeOverride();
    const size = override ?? options.pageSize ?? 20;
    return size > 0 ? size : null; // 0 = "all"
  });

  protected readonly pageCount = computed(() => {
    const size = this.effPageSize();
    if (size === null) return 1;
    return Math.max(1, Math.ceil(this.flatNodes().length / size));
  });

  /** The flat rows actually rendered: the current page, or everything. */
  protected readonly renderNodes = computed<readonly RowNode<T>[]>(() => {
    const nodes = this.flatNodes();
    const size = this.effPageSize();
    if (size === null) return nodes;
    const page = Math.min(this.pageIndex(), this.pageCount() - 1);
    return nodes.slice(page * size, (page + 1) * size);
  });

  protected onPageSizeChange(size: number): void {
    this.pageSizeOverride.set(size);
    this.pageIndex.set(0);
  }

  protected readonly keyOf = computed<(row: T, index: number) => RowKey>(() => {
    const selector = this.rowKeyOf();
    return (row) => selector(row);
  });

  /** Visible data-row count (drives aria-rowcount). */
  /** Visible data-row count across all pages (pager totals, select-all). */
  protected readonly totalDataCount = computed(() =>
    this.flatNodes().reduce(
      (count, node) => (node.kind === 'data' ? count + 1 : count),
      0,
    ),
  );

  /** Rendered data-row count (aria-rowcount of the current page). */
  protected readonly totalCount = computed(() =>
    this.renderNodes().reduce(
      (count, node) => (node.kind === 'data' ? count + 1 : count),
      0,
    ),
  );

  /** Key → flat node index of the current view (keyboard hierarchy jumps). */
  private readonly keyToFlatIndex = computed<ReadonlyMap<RowKey, number>>(
    () => {
      const map = new Map<RowKey, number>();
      const nodes = this.renderNodes();
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].kind === 'data') map.set(nodes[i].key, i);
      }
      return map;
    },
  );

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

  protected readonly leadingCellCount = computed(
    () => (this.rowDragging() ? 1 : 0) + (this.hasCheckboxColumn() ? 1 : 0),
  );

  private readonly leadingWidth = computed(
    () =>
      (this.rowDragging() ? DRAG_WIDTH : 0) +
      (this.hasCheckboxColumn() ? CHECKBOX_WIDTH : 0),
  );

  protected readonly firstDataRow = computed<T | undefined>(() => {
    const node = this.flatNodes().find((entry) => entry.kind === 'data');
    return node?.kind === 'data' ? node.data : undefined;
  });

  private readonly columnModel = new ColumnModel<T, OgeColumn<T>>({
    declaredColumns: this.declaredColumns,
    bands: this.bandByColumn,
    columnDefs: this.columns,
    firstDataRow: this.firstDataRow,
    widthOverrides: this.store.columns.widthOverrides,
    pinOverrides: this.store.columns.pinOverrides,
    order: this.store.columns.order,
    hostWidth: this.hostWidth,
    defaultMinWidth: this.effColumnMinWidth,
    adaptiveLeadingWidth: this.leadingWidth,
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
    tree: {
      isExpandable: (row) => this.dataNodeAt(row)?.hasChildren === true,
      isExpanded: (row) => this.dataNodeAt(row)?.expanded === true,
      toggle: (row, expand) => {
        const node = this.dataNodeAt(row);
        if (node) this.setRowExpanded(node, expand);
      },
      parentRowIndex: (row) => {
        const node = this.dataNodeAt(row);
        if (!node || node.parentKey == null) return -1;
        return untracked(this.keyToFlatIndex).get(node.parentKey) ?? -1;
      },
      firstChildRowIndex: (row) => {
        const node = this.dataNodeAt(row);
        if (!node?.expanded) return -1;
        const nodes = untracked(this.renderNodes);
        for (let i = row + 1; i < nodes.length; i++) {
          const next = nodes[i];
          if (next.kind !== 'data') continue;
          return next.parentKey === node.key ? i : -1;
        }
        return -1;
      },
    },
  });

  protected readonly focusedCell = this.keyboard.focusedCell;

  protected isCellTabbable(row: number, col: number): boolean {
    return this.keyboard.isCellTabbable(row, col);
  }

  protected onCellFocus(row: number, col: number): void {
    this.keyboard.onCellFocus(row, col);
  }

  private dataNodeAt(row: number): DataRowNode<T> | undefined {
    const node = untracked(this.renderNodes)[row];
    return node?.kind === 'data' ? node : undefined;
  }

  // --- selection ------------------------------------------------------------

  /** Keys of all visible data rows in display order. */
  protected readonly dataKeys = computed<readonly RowKey[]>(() =>
    this.flatNodes().flatMap((node) =>
      node.kind === 'data' ? [node.key] : [],
    ),
  );

  protected isRowSelected(key: RowKey): boolean {
    return this.store.selection.isSelected(key);
  }

  /** Tri-state map (recursive selection); empty when the feature is off. */
  private readonly checkStates = computed<ReadonlyMap<RowKey, CheckState>>(
    () => {
      if (!this.selectionRecursive()) return EMPTY_CHECK_STATES;
      return computeTreeCheckStates(
        this.treeIndex(),
        this.store.selection.selected(),
      );
    },
  );

  protected rowCheckState(key: RowKey): CheckState {
    if (!this.selectionRecursive()) {
      return this.isRowSelected(key) ? 'checked' : 'unchecked';
    }
    return this.checkStates().get(key) ?? 'unchecked';
  }

  /**
   * Central toggle: cascades through descendants in recursive mode. On lazy
   * trees the missing subtree is bulk-fetched first, so the cascade covers
   * branches that were never expanded.
   */
  private toggleSelection(key: RowKey): void {
    if (!untracked(this.selectionRecursive)) {
      this.store.selection.toggle(key);
      return;
    }
    if (this.hasUnloadedDescendants(key)) {
      void this.loadSubtree(key).then(() => this.applyRecursiveToggle(key));
      return;
    }
    this.applyRecursiveToggle(key);
  }

  private applyRecursiveToggle(key: RowKey): void {
    this.store.selection.replace([
      ...toggleTreeSelection(
        untracked(this.treeIndex),
        untracked(this.store.selection.selected),
        key,
        true,
      ),
    ]);
  }

  /** Selected keys narrowed per mode (recursive selection reporting). */
  getSelectedRowKeys(
    mode: 'all' | 'leavesOnly' | 'excludeRecursive' = 'all',
  ): RowKey[] {
    return resolveSelectedKeys(
      untracked(this.treeIndex),
      untracked(this.store.selection.selected),
      mode,
    );
  }

  protected readonly allSelected = computed(() => {
    const keys = this.dataKeys();
    if (!keys.length) return false;
    const selected = this.store.selection.selected();
    return keys.every((key) => selected.has(key));
  });

  protected readonly someSelected = computed(
    () => this.store.selection.count() > 0 && !this.allSelected(),
  );

  protected onRowClick(node: DataRowNode<T>, event: MouseEvent): void {
    this.rowClick.emit({ row: node.data, key: node.key, event });
    if (this.focusedRowEnabled()) this.focusedRowKey.set(node.key);
    const mode = this.selectionMode();
    if (mode === 'none') return;
    if (mode === 'single') {
      this.store.selection.selectOnly(node.key);
      return;
    }
    if (event.shiftKey)
      this.store.selection.selectRange(this.dataKeys(), node.key);
    else if (event.ctrlKey || event.metaKey || mode === 'checkbox') {
      this.toggleSelection(node.key);
    } else this.store.selection.selectOnly(node.key);
  }

  protected onCheckboxToggle(node: DataRowNode<T>): void {
    this.toggleSelection(node.key);
  }

  protected toggleSelectAll(): void {
    if (untracked(this.allSelected)) {
      this.store.selection.clear();
      return;
    }
    const keys = untracked(this.dataKeys);
    if (!untracked(this.selectionRecursive)) {
      this.store.selection.replace(keys);
      return;
    }
    // recursive mode cascades: visible keys plus all their descendants, so
    // select-all and per-row toggles agree about scope under a filter
    const index = untracked(this.treeIndex);
    const keyOf = untracked(this.rowKeyOf);
    const selected = new Set<RowKey>(keys);
    const stack = [...keys];
    while (stack.length) {
      const key = stack.pop() as RowKey;
      const children = index.childrenOf.get(key);
      if (!children) continue;
      for (const child of children) {
        const childKey = keyOf(child);
        if (!selected.has(childKey)) {
          selected.add(childKey);
          stack.push(childKey);
        }
      }
    }
    this.store.selection.replace([...selected]);
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
    x: number;
    y: number;
  } | null>(null);

  protected currentOperator(column: ResolvedColumn<T>): FilterOperator {
    if (!column.field) return 'contains';
    return (
      this.rowFilterOps().get(column.field) ??
      column.filterOperator ??
      defaultOperatorFor(column.dataType)
    );
  }

  protected operatorSymbol(column: ResolvedColumn<T>): string {
    const symbols: Partial<Record<FilterOperator, string>> = {
      eq: '=',
      ne: '≠',
      gt: '>',
      ge: '≥',
      lt: '<',
      le: '≤',
      contains: '∗',
      notcontains: '!∗',
      startswith: 'a…',
      endswith: '…z',
    };
    return symbols[this.currentOperator(column)] ?? '=';
  }

  protected toggleOperatorMenu(
    column: ResolvedColumn<T>,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    if (this.operatorMenu()?.column.id === column.id) {
      this.operatorMenu.set(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.operatorMenu.set({ column, x: rect.left, y: rect.bottom + 4 });
  }

  protected operatorChoices(column: ResolvedColumn<T>): FilterOperator[] {
    return operatorsFor(column.dataType).filter(
      (op) => op !== 'isnull' && op !== 'isnotnull',
    );
  }

  protected chooseOperator(op: FilterOperator | null): void {
    const menu = this.operatorMenu();
    this.operatorMenu.set(null);
    const field = menu?.column.field;
    if (!menu || !field) return;
    const next = new Map(this.rowFilterOps());
    if (op === null) next.delete(field);
    else next.set(field, op);
    this.rowFilterOps.set(next);
    // re-apply the current editor value with the new operator
    const raw = this.rowFilterRaw.get(field) ?? '';
    const effective =
      op ??
      menu.column.filterOperator ??
      defaultOperatorFor(menu.column.dataType);
    this.store.filter.setRowFilter(
      field,
      this.rowFilterExprFor(menu.column, raw, effective),
    );
  }

  /** Row-filter expression for a column — the column's custom builder wins. */
  private rowFilterExprFor(
    column: ResolvedColumn<T>,
    raw: string,
    operator?: FilterOperator,
  ) {
    const field = column.field;
    if (!field) return null;
    if (column.calculateFilterExpression) {
      const text = raw.trim();
      const op =
        operator ??
        column.filterOperator ??
        defaultOperatorFor(column.dataType);
      return text ? column.calculateFilterExpression(text, op) : null;
    }
    return buildRowFilterExpr(field, column.dataType, raw, operator);
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

  // --- filter panel + builder ------------------------------------------------

  protected readonly builderOpen = signal(false);
  protected builderTree: BuilderGroup = {
    kind: 'group',
    logic: 'and',
    items: [],
  };
  /** Bumped by the recursive editor so the preview text refreshes. */
  protected readonly builderVersion = signal(0);

  protected readonly builderFields = computed<FilterBuilderField[]>(() =>
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
  protected readonly headerFilterPosition = signal<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  protected readonly headerFilterSearch = signal('');

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
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.headerFilterSearch.set('');
    this.headerFilterPosition.set({ top: rect.bottom + 4, left: rect.left });
    this.headerFilterField.set(column.field);
  }

  protected closeHeaderFilter(): void {
    this.headerFilterField.set(null);
  }

  /** Distinct raw values of the open column over all loaded rows, sorted by text. */
  private readonly headerValues = computed<readonly unknown[]>(() => {
    const column = this.headerFilterColumn();
    if (!column) return [];
    const seen = new Map<string, unknown>();
    for (const row of this.indexRows()) {
      const value = column.accessor(row);
      const text = String(value ?? '');
      if (!seen.has(text)) seen.set(text, value);
    }
    // fold-based ordering: locale-independent, so local and CI runs agree
    return [...seen.entries()]
      .sort(([a], [b]) => {
        const fa = foldText(a);
        const fb = foldText(b);
        return fa < fb ? -1 : fa > fb ? 1 : 0;
      })
      .slice(0, this.effHeaderFilterLimit())
      .map(([, value]) => value);
  });

  protected headerValueText(value: unknown): string {
    const column = untracked(this.headerFilterColumn);
    if (!column) return String(value ?? '');
    if (value == null || value === '') return this.msg().blankValue;
    if (column.lookupItems) return lookupTextOf(column.lookupItems, value);
    return formatCellValue(value, column.dataType, column.format);
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
    const byYear = new Map<string, unknown[]>();
    for (const value of this.headerValues()) {
      const date = value instanceof Date ? value : new Date(String(value));
      const label = Number.isNaN(date.getTime())
        ? this.msg().blankValue
        : String(date.getFullYear());
      const bucket = byYear.get(label);
      if (bucket) bucket.push(value);
      else byYear.set(label, [value]);
    }
    const query = foldText(this.headerFilterSearch().trim());
    return [...byYear.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([label, values]) => ({
        label,
        values: query
          ? values.filter(
              (value) =>
                foldText(label).includes(query) ||
                foldText(this.headerValueText(value)).includes(query),
            )
          : values,
      }))
      .filter((group) => group.values.length > 0);
  });

  protected isHeaderGroupSelected(group: {
    values: readonly unknown[];
  }): boolean {
    return group.values.every((value) => this.isHeaderValueSelected(value));
  }

  protected isHeaderGroupIndeterminate(group: {
    values: readonly unknown[];
  }): boolean {
    const selected = group.values.filter((value) =>
      this.isHeaderValueSelected(value),
    ).length;
    return selected > 0 && selected < group.values.length;
  }

  /** Group checkbox: selects the whole year, or clears it when complete. */
  protected toggleHeaderGroup(group: { values: readonly unknown[] }): void {
    const field = untracked(this.headerFilterField);
    if (field === null) return;
    const all = untracked(this.headerValues);
    const current = this.store.filter.headerFilterOf(field) ?? [...all];
    const complete = group.values.every((value) => current.includes(value));
    const next = complete
      ? current.filter((value) => !group.values.includes(value))
      : [...new Set([...current, ...group.values])];
    this.store.filter.setHeaderFilter(
      field,
      next.length === all.length ? null : next,
    );
  }

  protected isHeaderValueSelected(value: unknown): boolean {
    const field = this.headerFilterField();
    if (field === null) return false;
    const selected = this.store.filter.headerFilterOf(field);
    return selected === null || selected.includes(value);
  }

  protected toggleHeaderValue(value: unknown): void {
    const field = untracked(this.headerFilterField);
    if (field === null) return;
    const all = untracked(this.headerValues);
    const current = this.store.filter.headerFilterOf(field) ?? [...all]; // null = all selected
    const next = current.includes(value)
      ? current.filter((candidate) => candidate !== value)
      : [...current, value];
    // back to the full set = filter off
    this.store.filter.setHeaderFilter(
      field,
      next.length === all.length ? null : next,
    );
  }

  protected readonly allHeaderValuesSelected = computed(() => {
    const field = this.headerFilterField();
    if (field === null) return false;
    return this.store.filter.headerFilterOf(field) === null;
  });

  protected toggleAllHeaderValues(): void {
    const field = untracked(this.headerFilterField);
    if (field === null) return;
    const selected = this.store.filter.headerFilterOf(field);
    // all → none; anything else → all
    this.store.filter.setHeaderFilter(field, selected === null ? [] : null);
  }

  protected isHeaderFilterActive(column: ResolvedColumn<T>): boolean {
    return (
      column.field != null &&
      this.store.filter.headerFilterOf(column.field) != null
    );
  }

  // --- search highlighting ---------------------------------------------------

  private readonly sanitizer = inject(DomSanitizer);

  /** Escaped cell text with `<mark>` around search matches, or null when inactive. */
  protected searchHighlightHtml(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): SafeHtml | null {
    const query = this.store.filter.searchText().trim();
    if (!query) return null;
    const text = this.cellDisplayText(node, column);
    // Match on folded text (locale-independent, accent-insensitive), then map
    // the folded match range back onto the original string for the <mark>.
    const { folded, sourceIndex } = foldTextWithMap(text);
    const needle = foldText(query);
    if (!needle || !folded.includes(needle)) return null;
    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = '';
    let index = 0;
    let foldedFrom = 0;
    for (;;) {
      const found = folded.indexOf(needle, foldedFrom);
      if (found < 0) {
        html += escape(text.slice(index));
        break;
      }
      const start = sourceIndex[found];
      const last = sourceIndex[found + needle.length - 1];
      const end = last + ((text.codePointAt(last) ?? 0) > 0xffff ? 2 : 1);
      html += escape(text.slice(index, start));
      html += `<mark class="oge-highlight">${escape(text.slice(start, end))}</mark>`;
      index = end;
      foldedFrom = found + needle.length;
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /** Filter-row lookup select: applies an exact-match filter on the raw value. */
  protected onLookupFilter(column: ResolvedColumn<T>, rawIndex: string): void {
    const field = column.field;
    if (!field || !column.lookupItems) return;
    if (rawIndex === '') {
      this.store.filter.setRowFilter(field, null);
      return;
    }
    const item = column.lookupItems[Number(rawIndex)];
    this.store.filter.setRowFilter(
      field,
      item === undefined
        ? null
        : { type: 'binary', field, op: 'eq', value: item.value },
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
    const onMove = (move: PointerEvent): void => {
      this.suppressHeaderClick = true;
      this.store.columns.setWidth(
        column.id,
        startWidth + (move.clientX - startX),
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

  protected onHeaderDragStart(
    column: ResolvedColumn<T>,
    event: DragEvent,
  ): void {
    if (!column.field || !this.columnReorder()) {
      event.preventDefault();
      return;
    }
    if (event.dataTransfer) {
      event.dataTransfer.setData(COLUMN_DRAG_TYPE, column.id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onHeaderDragOver(
    column: ResolvedColumn<T>,
    event: DragEvent,
  ): void {
    if (!event.dataTransfer?.types.includes(COLUMN_DRAG_TYPE)) return;
    event.preventDefault();
    if (this.columnReorder() && this.headerDropTargetId() !== column.id) {
      this.headerDropTargetId.set(column.id);
    }
  }

  protected onHeaderDragEnd(): void {
    this.headerDropTargetId.set(null);
  }

  protected onHeaderDrop(target: ResolvedColumn<T>, event: DragEvent): void {
    this.headerDropTargetId.set(null);
    const sourceId = event.dataTransfer?.getData(COLUMN_DRAG_TYPE);
    if (!sourceId || !this.columnReorder() || sourceId === target.id) return;
    event.preventDefault();
    this.store.columns.reorder(
      this.resolvedColumns().map((c) => c.id),
      sourceId,
      target.id,
    );
  }

  protected readonly chooserOpen = signal(false);
  /** Anchored to the chooser button: its bottom-right corner. */
  protected readonly chooserPosition = signal<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  protected toggleChooser(event: Event): void {
    event.stopPropagation();
    if (this.chooserOpen()) {
      this.chooserOpen.set(false);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.chooserPosition.set({ top: rect.bottom + 4, left: rect.right });
    this.chooserOpen.set(true);
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

  private chooserDragId: string | null = null;
  /** Chooser row the dragged column would be inserted in front of. */
  protected readonly chooserDropTargetId = signal<string | null>(null);

  protected onChooserDragStart(id: string, event: DragEvent): void {
    this.chooserDragId = id;
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onChooserDragOver(id: string, event: DragEvent): void {
    if (!this.chooserDragId) return;
    event.preventDefault();
    if (this.chooserDropTargetId() !== id) this.chooserDropTargetId.set(id);
  }

  protected onChooserDragEnd(): void {
    this.chooserDragId = null;
    this.chooserDropTargetId.set(null);
  }

  /** Reorders columns by dropping one chooser row onto another. */
  protected onChooserDrop(targetId: string, event: DragEvent): void {
    const sourceId = this.chooserDragId;
    this.onChooserDragEnd();
    if (!sourceId || sourceId === targetId || !this.columnReorder()) return;
    event.preventDefault();
    this.store.columns.reorder(
      this.chooserEntries().map((entry) => entry.id),
      sourceId,
      targetId,
    );
  }

  protected readonly contextMenu = signal<{
    x: number;
    y: number;
    items: OgeMenuItem[];
  } | null>(null);

  protected onRowContextMenuOpen(
    node: DataRowNode<T>,
    event: MouseEvent,
  ): void {
    const items: OgeMenuItem[] = [];
    this.rowContextMenu.emit({
      row: node.data,
      key: node.key,
      clientX: event.clientX,
      clientY: event.clientY,
      items,
    });
    if (!items.length) return; // fall back to the native browser menu
    event.preventDefault();
    this.contextMenu.set({ x: event.clientX, y: event.clientY, items });
  }

  protected runMenuItem(item: OgeMenuItem): void {
    item.action?.();
    this.contextMenu.set(null);
  }

  protected onHeaderContextMenu(
    column: ResolvedColumn<T>,
    event: MouseEvent,
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
      clientX: event.clientX,
      clientY: event.clientY,
      items,
    });
    if (!items.length) return;
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({ x: event.clientX, y: event.clientY, items });
  }

  protected closePopups(): void {
    this.closeHeaderFilter();
    this.chooserOpen.set(false);
    this.contextMenu.set(null);
    this.operatorMenu.set(null);
    this.builderOpen.set(false);
  }

  /** Closes popups on clicks outside of them. */
  protected onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (
      this.headerFilterField() !== null &&
      !target?.closest?.('.oge-header-filter-popup')
    ) {
      this.closeHeaderFilter();
    }
    if (this.chooserOpen() && !target?.closest?.('.oge-chooser-popup')) {
      this.chooserOpen.set(false);
    }
    if (this.contextMenu() && !target?.closest?.('.oge-context-menu')) {
      this.contextMenu.set(null);
    }
    if (this.operatorMenu() && !target?.closest?.('.oge-operator-menu')) {
      this.operatorMenu.set(null);
    }
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

  // --- row drag reparenting -------------------------------------------------

  private draggedRowKey: RowKey | null = null;
  /** Row + relative position currently hovered as a valid drop target. */
  protected readonly dropTarget = signal<{
    key: RowKey;
    position: OgeTreeDropPosition;
  } | null>(null);

  protected onRowDragStart(node: DataRowNode<T>, event: DragEvent): void {
    this.draggedRowKey = node.key;
    event.dataTransfer?.setData('text/plain', String(node.key));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  private isValidDropTarget(targetKey: RowKey): boolean {
    const dragged = this.draggedRowKey;
    if (dragged === null || dragged === targetKey) return false;
    // a row must not become a descendant of itself
    return !ancestorsOf(untracked(this.treeIndex), targetKey).includes(dragged);
  }

  /** Top/bottom quarter of a row = order before/after; middle = reparent inside. */
  private dropPositionOf(event: DragEvent): OgeTreeDropPosition {
    const row = (event.currentTarget ?? event.target) as HTMLElement | null;
    const rect = row?.getBoundingClientRect?.();
    if (!rect || rect.height <= 0) return 'inside';
    const offset = (event.clientY - rect.top) / rect.height;
    if (offset < 0.25) return 'before';
    if (offset > 0.75) return 'after';
    return 'inside';
  }

  protected onRowDragOver(node: DataRowNode<T>, event: DragEvent): void {
    if (!this.isValidDropTarget(node.key)) return;
    event.preventDefault();
    const position = this.dropPositionOf(event);
    const current = this.dropTarget();
    if (current?.key !== node.key || current.position !== position) {
      this.dropTarget.set({ key: node.key, position });
    }
  }

  protected onRowDragEnd(): void {
    this.draggedRowKey = null;
    this.dropTarget.set(null);
  }

  protected onRowDrop(target: DataRowNode<T>, event: DragEvent): void {
    const draggedKey = this.draggedRowKey;
    const position = this.dropTarget()?.position ?? this.dropPositionOf(event);
    const valid = draggedKey !== null && this.isValidDropTarget(target.key);
    this.onRowDragEnd();
    if (!valid || draggedKey === null) return;
    event.preventDefault();
    const index = untracked(this.treeIndex);
    const row = index.byKey.get(draggedKey);
    if (row === undefined) return;
    const fromParentKey = index.parentOf.get(draggedKey) ?? null;
    const toParentKey =
      position === 'inside'
        ? target.key
        : (index.parentOf.get(target.key) ?? null);
    if (position === 'inside' && fromParentKey === target.key) return;
    const data = untracked(this.data);
    const parentField = untracked(this.lazyParentField);
    // auto-apply only for plain arrays with a writable top-level parent
    // field; dotted paths, nested payloads and DataSources are the
    // consumer's job (handle rowReparented)
    if (
      !isDataSource(data) &&
      untracked(this.nestedItemsOf) === null &&
      parentField !== null &&
      !parentField.includes('.')
    ) {
      const rootValue = untracked(this.rootValue);
      (row as Record<string, unknown>)[parentField] =
        toParentKey === null ? rootValue : toParentKey;
      if (position !== 'inside') {
        // before/after: also move the row next to the target in the backing
        // array, so sibling order (data order) reflects the drop
        const array = data as T[];
        const from = array.indexOf(row);
        if (from >= 0) array.splice(from, 1);
        const targetRow = index.byKey.get(target.key);
        const at = targetRow === undefined ? -1 : array.indexOf(targetRow);
        if (at < 0) array.push(row);
        else array.splice(position === 'before' ? at : at + 1, 0, row);
      }
      this.adapter.reload();
    }
    if (position === 'inside') this.expandRow(target.key);
    this.rowReparented.emit({
      key: draggedKey,
      row,
      fromParentKey,
      toParentKey,
      position,
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
    },
    // saved rows may live in the lazy child cache — drop it so the reload
    // re-fetches open levels and the UI shows the persisted values
    reload: () => {
      this.deferredLoader.reset();
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

  /** Explicit form grid template when `editing.formColCount` is set. */
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

  protected deleteRow(node: DataRowNode<T>, event?: Event): void {
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
    const parentField = untracked(this.lazyParentField);
    if (parentKey !== undefined && parentField !== null) {
      this.store.editing.setChange(key, parentField, parentKey);
    }
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
    const index = untracked(this.treeIndex);
    for (const [key, row] of index.byKey) {
      callback(row, key, index.parentOf.get(key) ?? null);
    }
  }

  /** Data rows of the currently rendered page, in display order. */
  getVisibleRows(): readonly T[] {
    return untracked(this.renderNodes).flatMap((node) =>
      node.kind === 'data' ? [node.data] : [],
    );
  }

  // --- expansion actions ----------------------------------------------------

  private setRowExpanded(node: DataRowNode<T>, expand: boolean): void {
    if (!node.hasChildren || node.expanded === expand) return;
    // consumers may veto UI-driven toggles (imperative API stays silent)
    const toggling: OgeTreeRowTogglingEvent<T> = {
      key: node.key,
      row: node.data,
      cancel: false,
    };
    if (expand) this.rowExpanding.emit(toggling);
    else this.rowCollapsing.emit(toggling);
    if (toggling.cancel) return;
    this.store.expansion.toggleGroup(node.key);
    if (expand) this.rowExpanded.emit({ key: node.key, row: node.data });
    else this.rowCollapsed.emit({ key: node.key, row: node.data });
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
      expansion: { toggled: [...this.toggledKeys()] },
    };
  });

  /** Current persistable UI state: sort, filters, column layout, expansion. */
  state(): TreeListStateSnapshot {
    return untracked(this.persistedSnapshot);
  }

  /** Applies a previously captured state snapshot (see `state()` / `stateChange`). */
  applyState(snapshot: TreeListStateSnapshot): void {
    untracked(() => {
      this.store.applySnapshot(snapshot);
      if (snapshot.expansion) {
        this.store.expansion.setGroups(new Set(snapshot.expansion.toggled));
      }
      const hidden = new Set(snapshot.columns?.hidden ?? []);
      for (const column of this.declaredColumns()) {
        const field = column.field();
        if (field) column.visible.set(!hidden.has(field));
      }
    });
  }

  // --- imperative API -------------------------------------------------------

  /** Re-runs the current load and drops lazily fetched/discovered rows. */
  refresh(): void {
    this.deferredLoader.reset();
    this.remoteFilterJson = null;
    this.remoteFilterRows.set([]);
    this.adapter.reload();
  }

  clearFilters(): void {
    this.store.filter.clearAll();
  }

  clearSorting(): void {
    this.store.sort.clear();
  }

  expandAll(): void {
    this.store.expansion.setGroups(
      untracked(this.autoExpandAll)
        ? new Set()
        : new Set(untracked(this.expandableKeys)),
    );
  }

  collapseAll(): void {
    this.store.expansion.setGroups(
      untracked(this.autoExpandAll)
        ? new Set(untracked(this.expandableKeys))
        : new Set(),
    );
  }

  expandRow(key: RowKey): void {
    // polarity-aware: expanded means "not toggled" under autoExpandAll
    const toggled = untracked(this.toggledKeys).has(key);
    const shouldToggle = untracked(this.autoExpandAll) ? toggled : !toggled;
    if (shouldToggle) this.store.expansion.toggleGroup(key);
  }

  collapseRow(key: RowKey): void {
    const toggled = untracked(this.toggledKeys).has(key);
    const shouldToggle = untracked(this.autoExpandAll) ? !toggled : toggled;
    if (shouldToggle) this.store.expansion.toggleGroup(key);
  }

  isRowExpanded(key: RowKey): boolean {
    return untracked(this.expandedSet).has(key);
  }

  getNodeByKey(key: RowKey): T | undefined {
    return untracked(this.treeIndex).byKey.get(key);
  }

  /** Expands the ancestors of `key`, scrolls to it and focuses its first cell. */
  focusRow(key: RowKey): void {
    const index = untracked(this.treeIndex);
    if (!index.byKey.has(key)) return;
    for (const ancestor of ancestorsOf(index, key)) this.expandRow(ancestor);
    if (untracked(this.focusedRowEnabled)) this.focusedRowKey.set(key);
    const flatIndex = untracked(this.keyToFlatIndex).get(key);
    if (flatIndex !== undefined) {
      this.virtualizer.scrollRowIntoView(flatIndex);
      this.keyboard.focusedCell.set({ row: flatIndex, col: 0 });
    }
  }

  /**
   * CSV of the currently visible rows (expansion + filter applied), the
   * hierarchy expressed by indenting the first column.
   */
  /**
   * Rows, column metadata and depth levels of the currently visible tree
   * (expansion + filter applied) — the shared source for exporters.
   */
  getExportData(): OgeTreeExportData<T> {
    const nodes = untracked(this.flatNodes).filter(
      (node): node is DataRowNode<T> => node.kind === 'data',
    );
    const messages = untracked(this.msg);
    // display-faithful text per cell: format > lookup text > boolean labels
    const columns: OgeExportColumn<T>[] = untracked(this.resolvedColumns).map(
      (column) => ({
        caption: column.caption,
        field: column.field,
        dataType: column.dataType,
        accessor: column.accessor,
        format: column.format
          ? column.format
          : column.lookupItems
            ? (value: unknown): string =>
                lookupTextOf(column.lookupItems ?? [], value)
            : column.dataType === 'boolean'
              ? (value: unknown): string =>
                  value == null
                    ? ''
                    : value
                      ? messages.booleanTrue
                      : messages.booleanFalse
              : undefined,
      }),
    );
    return {
      rows: nodes.map((node) => node.data),
      columns,
      levels: nodes.map((node) => node.level),
    };
  }

  getCsv(options?: CsvOptions): string {
    const { rows, columns, levels } = this.getExportData();
    const indexOf = new Map<T, number>(rows.map((row, i) => [row, i]));
    const csvColumns = columns.map((column, columnIndex) => ({
      ...column,
      accessor: (row: T): unknown => {
        const value = column.accessor(row);
        if (columnIndex !== 0) return value;
        const text = column.format
          ? column.format(value)
          : formatCellValue(value, column.dataType, undefined);
        return '  '.repeat(levels[indexOf.get(row) ?? 0] ?? 0) + text;
      },
      format: columnIndex === 0 ? undefined : column.format,
    }));
    return buildCsv(rows, csvColumns, options);
  }

  /** Downloads the visible tree as a CSV file. */
  exportCsv(filename = 'tree-list.csv'): void {
    const csv = this.getCsv();
    if (typeof document === 'undefined') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
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
    // contentReady: after the DOM for a new result set is in place
    afterRenderEffect(() => {
      if (this.adapter.result() === null) return;
      untracked(() => this.contentReady.emit());
    });
    effect(() => {
      let data = this.data();
      const key = this.rowKeyOf();
      const sortValues = this.sortValueSelectors();
      const parentField = this.lazyParentField();
      const lazy = this.effLoadMode() === 'lazy' && parentField !== null;
      const rootValue = this.rootValue();
      const itemsOf = this.nestedItemsOf();
      let nestedParents: ReadonlyMap<RowKey, RowKey | null> | null = null;
      if (itemsOf && !isDataSource(data)) {
        // nested payload: flatten inline children into the plain shape
        const flattened = flattenNestedTree(data, { keyOf: key, itemsOf });
        data = flattened.rows;
        nestedParents = flattened.parentOf;
      }
      const inner = isDataSource(data)
        ? data
        : new ArrayDataSource<T>(data, { key, sortValues });
      untracked(() => {
        this.nestedParents.set(nestedParents);
        // a new source (or key/parent mapping) invalidates the child cache —
        // stale rows from the previous source must never join the new tree
        if (this.innerSource() !== null) {
          this.deferredLoader.reset();
          this.remoteFilterJson = null;
          this.remoteFilterRows.set([]);
        }
        this.innerSource.set(inner);
        this.adapter.setSource(
          treeSource(
            inner,
            lazy && parentField ? { parentField, rootValue } : null,
          ),
        );
      });
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
        const index = this.treeIndex();
        if (!index.byKey.has(key)) return;
        for (const ancestor of ancestorsOf(index, key))
          this.expandRow(ancestor);
        const flatIndex = this.keyToFlatIndex().get(key);
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
    // expandedRowKeys model ⇄ expansion slice (guarded both ways, polarity-aware)
    effect(() => {
      const keys = this.expandedRowKeys();
      untracked(() => {
        const current = this.expandedSet();
        if (
          keys.length === current.size &&
          keys.every((key) => current.has(key))
        )
          return;
        const wanted = new Set(keys);
        if (this.autoExpandAll()) {
          const toggled = new Set<RowKey>();
          for (const key of this.expandableKeys()) {
            if (!wanted.has(key)) toggled.add(key);
          }
          this.store.expansion.setGroups(toggled);
        } else {
          this.store.expansion.setGroups(wanted);
        }
      });
    });
    effect(() => {
      const expanded = this.expandedSet();
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
        this.hostRef.nativeElement
          .querySelector<HTMLElement>('.oge-editor')
          ?.focus();
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
