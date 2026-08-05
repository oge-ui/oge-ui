import { NgTemplateOutlet } from '@angular/common';
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
  buildTreeIndex,
  createFieldAccessor,
  flattenTreeData,
  type DataRowNode,
  type DataSource,
  type RowKey,
  type RowNode,
  type TreeIndex,
} from '@oge-ui/core';
import {
  CHECKBOX_WIDTH,
  ColumnLayoutModel,
  ColumnModel,
  KeyboardNavModel,
  RowVirtualizerModel,
  isDataSource,
  lookupTextOf,
  type ColumnDefLike,
  type ResolvedColumn as FoundationResolvedColumn,
} from '@oge-ui/grid/foundation';
import {
  GridDataAdapter,
  GridStateStore,
  OGE_GRID_CONFIG,
  OgeColumn,
  OgeColumnGroup,
  OgeNoDataTemplate,
  formatCellValue,
  type OgeCellTemplateContext,
  type OgeGridMessages,
  type OgeHeaderTemplateContext,
  type OgeRowClickEvent,
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
  imports: [NgTemplateOutlet],
  providers: [GridStateStore, GridDataAdapter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './tree-list.html',
  styleUrl: './tree-list.scss',
  host: {
    class: 'oge-tree-list',
    '[class.oge-virtual]': 'virtualized()',
    '[class.oge-loading]': 'adapter.loading()',
    '[class.oge-rtl]': 'rtl()',
    '[attr.dir]': "rtlEnabled() === undefined ? null : rtlEnabled() ? 'rtl' : 'ltr'",
  },
})
export class OgeTreeList<T extends object = Record<string, unknown>> {
  protected readonly store = inject(GridStateStore);
  protected readonly adapter: GridDataAdapter<T> = inject(GridDataAdapter);
  private readonly config = inject(OGE_GRID_CONFIG);
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
  readonly hasItemsExpr = input<string | ((row: T) => boolean) | undefined>(undefined);

  /** Programmatic column definitions (alternative to declarative `<oge-column>`). */
  readonly columns = input<readonly (string | ColumnDefLike)[] | undefined>(undefined);

  /** `true` = multi-column sorting, `'single'`, or `false` to disable. */
  readonly sortable = input<boolean | 'single' | 'multi'>(true);

  readonly sorting = input<OgeSortingOptions | undefined>(undefined);

  /** Windows the DOM to the visible rows (100k-node trees). */
  readonly virtualScroll = input(false);

  readonly rowHeight = input<number | undefined>(undefined);
  readonly overscan = input<number | undefined>(undefined);
  readonly columnMinWidth = input<number | undefined>(undefined);

  /** Enables drag-resize handles on header edges. */
  readonly columnResize = input(true);

  /** Per-instance message overrides (merged over the global config). */
  readonly messages = input<Partial<OgeGridMessages> | undefined>(undefined);

  /** Row selection: none | single | multiple (ctrl/shift) | checkbox column. */
  readonly selectionMode = input<SelectionMode>('none');

  /** Two-way binding of the selected row keys. */
  readonly selectedKeys = model<RowKey[]>([]);

  /** Alternating row background (zebra striping), stable under virtualization. */
  readonly rowAlternation = input(false);

  /**
   * Right-to-left layout. `undefined` (default) auto-detects the inherited
   * CSS `direction`; `true`/`false` force it.
   */
  readonly rtlEnabled = input<boolean | undefined>(undefined);

  readonly rowClick = output<OgeRowClickEvent<T>>();
  readonly rowDblClick = output<OgeRowClickEvent<T>>();
  readonly rowExpanded = output<OgeTreeRowToggleEvent<T>>();
  readonly rowCollapsed = output<OgeTreeRowToggleEvent<T>>();
  /** Fires after the tree has rendered a new result set. */
  readonly contentReady = output<void>();

  protected readonly declaredColumns = contentChildren<OgeColumn<T>>(OgeColumn, {
    descendants: true,
  });
  protected readonly columnGroups = contentChildren<OgeColumnGroup<T>>(OgeColumnGroup);
  protected readonly noDataTemplate = contentChild(OgeNoDataTemplate);

  // --- viewport state -------------------------------------------------------

  protected readonly scrollTop = signal(0);
  protected readonly scrollLeft = signal(0);
  protected readonly viewportHeight = signal(400);
  protected readonly hostWidth = signal(0);
  private readonly detectedRtl = signal(false);
  protected readonly rtl = computed(() => this.rtlEnabled() ?? this.detectedRtl());

  // --- effective options ----------------------------------------------------

  protected readonly msg = computed<OgeGridMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly effRowHeight = computed(() => this.rowHeight() ?? this.config.rowHeight);
  private readonly effOverscan = computed(() => this.overscan() ?? this.config.overscan);
  private readonly effColumnMinWidth = computed(
    () => this.columnMinWidth() ?? this.config.columnMinWidth
  );

  protected readonly sortMode = computed<'none' | 'single' | 'multi'>(() => {
    const explicit = this.sorting()?.mode;
    if (explicit) return explicit;
    const shorthand = this.sortable();
    if (shorthand === false) return 'none';
    return shorthand === true ? 'multi' : shorthand;
  });

  private readonly allowUnsorting = computed(
    () => this.sorting()?.allowUnsorting ?? this.config.allowUnsorting
  );

  protected readonly virtualized = computed(() => this.virtualScroll());

  // --- keys & tree index ----------------------------------------------------

  /** Row → key accessor (trees always need an intrinsic key). */
  private readonly rowKeyOf = computed<(row: T) => RowKey>(() => {
    const key = this.keyExpr();
    if (typeof key === 'function') return key;
    const accessor = createFieldAccessor<T>(key);
    return (row) => accessor(row) as RowKey;
  });

  private readonly parentIdOf = computed<(row: T) => unknown>(() => {
    const parent = this.parentIdExpr();
    return typeof parent === 'function' ? parent : createFieldAccessor<T>(parent);
  });

  private readonly hasChildrenHint = computed<((row: T) => boolean | undefined) | undefined>(() => {
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
   * Adjacency index, rebuilt only when the loaded result changes. The source
   * applies the global sort, so buckets inherit sibling order for free.
   */
  protected readonly treeIndex = computed<TreeIndex<T>>(() => {
    const result = this.adapter.result();
    return buildTreeIndex<T>((result?.data ?? []) as readonly T[], {
      keyOf: this.rowKeyOf(),
      parentIdOf: this.parentIdOf(),
      rootValue: this.rootValue(),
      orphanPolicy: this.orphanPolicy(),
    });
  });

  private readonly expandableKeys = computed<ReadonlySet<RowKey>>(
    () => new Set(this.treeIndex().childrenOf.keys())
  );

  // --- expansion ------------------------------------------------------------

  /** Toggled keys with `autoExpandAll` polarity (mirrors grid group expansion). */
  private readonly toggledKeys = computed(() => this.store.expansion.collapsedGroups());

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

  // --- flat rows ------------------------------------------------------------

  protected readonly flatNodes = computed<RowNode<T>[]>(() => {
    const toggled = this.toggledKeys();
    return flattenTreeData<T>({
      index: this.treeIndex(),
      keyOf: this.rowKeyOf(),
      ...(this.autoExpandAll()
        ? { collapsedRowKeys: toggled }
        : { expandedRowKeys: toggled }),
      hasChildren: this.hasChildrenHint(),
    });
  });

  protected readonly keyOf = computed<(row: T, index: number) => RowKey>(() => {
    const selector = this.rowKeyOf();
    return (row) => selector(row);
  });

  /** Visible data-row count (drives aria-rowcount). */
  protected readonly totalCount = computed(
    () => this.flatNodes().reduce((count, node) => (node.kind === 'data' ? count + 1 : count), 0)
  );

  /** Key → flat node index of the current view (keyboard hierarchy jumps). */
  private readonly keyToFlatIndex = computed<ReadonlyMap<RowKey, number>>(() => {
    const map = new Map<RowKey, number>();
    const nodes = this.flatNodes();
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].kind === 'data') map.set(nodes[i].key, i);
    }
    return map;
  });

  // --- columns --------------------------------------------------------------

  /** OgeColumn instance → band caption (from `<oge-column-group>`). */
  private readonly bandByColumn = computed<ReadonlyMap<OgeColumn<T>, string>>(() => {
    const map = new Map<OgeColumn<T>, string>();
    for (const group of this.columnGroups()) {
      for (const column of group.columns()) map.set(column, group.caption());
    }
    return map;
  });

  protected readonly hasCheckboxColumn = computed(() => this.selectionMode() === 'checkbox');

  protected readonly leadingCellCount = computed(() => (this.hasCheckboxColumn() ? 1 : 0));

  private readonly leadingWidth = computed(() =>
    this.hasCheckboxColumn() ? CHECKBOX_WIDTH : 0
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

  private readonly layoutModel = new ColumnLayoutModel<T, OgeColumn<T>>({
    resolvedColumns: this.resolvedColumns,
    colVirtualized: computed(() => false),
    scrollLeft: this.scrollLeft,
    hostWidth: this.hostWidth,
    leadingTracks: computed(() =>
      this.hasCheckboxColumn() ? [`${CHECKBOX_WIDTH}px`] : []
    ),
    trailingTracks: computed(() => []),
    leadingWidth: this.leadingWidth,
    defaultMinWidth: this.effColumnMinWidth,
    pinnedDefaultWidth: computed(() => this.config.pinnedDefaultWidth),
  });

  protected readonly renderColumns = this.layoutModel.renderColumns;
  protected readonly gridTemplateColumns = this.layoutModel.gridTemplateColumns;

  protected pinnedLeftOf(column: ResolvedColumn<T>): number | null {
    return this.layoutModel.pinnedLeftOf(column);
  }

  protected pinnedRightOf(column: ResolvedColumn<T>): number | null {
    return this.layoutModel.pinnedRightOf(column);
  }

  // --- virtualization -------------------------------------------------------

  private readonly virtualizer = new RowVirtualizerModel<T>({
    flatNodes: this.flatNodes,
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
    flatNodes: this.flatNodes,
    columnCount: computed(() => this.resolvedColumns().length),
    rtl: this.rtl,
    pageSize: computed(() =>
      Math.max(1, Math.floor(this.viewportHeight() / this.effRowHeight()) - 1)
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
        const nodes = untracked(this.flatNodes);
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
    const node = untracked(this.flatNodes)[row];
    return node?.kind === 'data' ? node : undefined;
  }

  // --- selection ------------------------------------------------------------

  /** Keys of all visible data rows in display order. */
  protected readonly dataKeys = computed<readonly RowKey[]>(() =>
    this.flatNodes().flatMap((node) => (node.kind === 'data' ? [node.key] : []))
  );

  protected isRowSelected(key: RowKey): boolean {
    return this.store.selection.isSelected(key);
  }

  protected readonly allSelected = computed(() => {
    const keys = this.dataKeys();
    if (!keys.length) return false;
    const selected = this.store.selection.selected();
    return keys.every((key) => selected.has(key));
  });

  protected readonly someSelected = computed(
    () => this.store.selection.count() > 0 && !this.allSelected()
  );

  protected onRowClick(node: DataRowNode<T>, event: MouseEvent): void {
    this.rowClick.emit({ row: node.data, key: node.key, event });
    const mode = this.selectionMode();
    if (mode === 'none') return;
    if (mode === 'single') {
      this.store.selection.selectOnly(node.key);
      return;
    }
    if (event.shiftKey) this.store.selection.selectRange(this.dataKeys(), node.key);
    else if (event.ctrlKey || event.metaKey || mode === 'checkbox') {
      this.store.selection.toggle(node.key);
    } else this.store.selection.selectOnly(node.key);
  }

  protected onCheckboxToggle(node: DataRowNode<T>): void {
    this.store.selection.toggle(node.key);
  }

  protected toggleSelectAll(): void {
    if (untracked(this.allSelected)) this.store.selection.clear();
    else this.store.selection.replace(untracked(this.dataKeys));
  }

  protected ariaSelectedOf(node: DataRowNode<T>): boolean | null {
    return this.selectionMode() === 'none' ? null : this.isRowSelected(node.key);
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

  protected sortStateOf(column: ResolvedColumn<T>): { dir: 'asc' | 'desc'; index: number } | null {
    return column.field ? this.store.sort.stateOf(column.field) : null;
  }

  protected ariaSortOf(column: ResolvedColumn<T>): string | null {
    const state = this.sortStateOf(column);
    if (!state) return column.sortable && this.sortMode() !== 'none' ? 'none' : null;
    return state.dir === 'asc' ? 'ascending' : 'descending';
  }

  protected readonly multiSorted = computed(() => this.store.sort.descriptors().length > 1);

  // --- column resize --------------------------------------------------------

  protected onResizeStart(column: ResolvedColumn<T>, event: PointerEvent): void {
    if (!this.columnResize()) return;
    event.preventDefault();
    event.stopPropagation();
    const headerCell = (event.target as HTMLElement).closest('.oge-header-cell') as HTMLElement;
    const startWidth =
      headerCell?.offsetWidth ??
      (typeof column.width === 'number' ? column.width : this.config.pinnedDefaultWidth);
    const startX = event.clientX;
    const onMove = (move: PointerEvent): void => {
      this.suppressHeaderClick = true;
      this.store.columns.setWidth(column.id, startWidth + (move.clientX - startX));
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setTimeout(() => (this.suppressHeaderClick = false));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- cells ----------------------------------------------------------------

  protected cellContext(
    row: T,
    rowIndex: number,
    column: ResolvedColumn<T>
  ): OgeCellTemplateContext<T> {
    return {
      $implicit: column.accessor(row),
      row,
      rowIndex,
      // Templated columns are always declarative, so `source` is defined here.
      column: column.source as OgeColumn<T>,
    };
  }

  protected headerContext(column: ResolvedColumn<T>): OgeHeaderTemplateContext<T> {
    return { $implicit: column.source as OgeColumn<T> };
  }

  protected cellDisplayText(node: DataRowNode<T>, column: ResolvedColumn<T>): string {
    const value = column.accessor(node.data);
    if (column.format) return column.format(value);
    if (column.lookupItems) return lookupTextOf(column.lookupItems, value);
    if (column.dataType === 'boolean' && value != null) {
      return value ? this.msg().booleanTrue : this.msg().booleanFalse;
    }
    return formatCellValue(value, column.dataType, undefined);
  }

  // --- expansion actions ----------------------------------------------------

  private setRowExpanded(node: DataRowNode<T>, expand: boolean): void {
    if (!node.hasChildren || node.expanded === expand) return;
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
      const node = this.flatNodes()[cell.row];
      if (node?.kind === 'data' && this.selectionMode() !== 'none') {
        event.preventDefault();
        if (this.selectionMode() === 'single') this.store.selection.selectOnly(node.key);
        else this.store.selection.toggle(node.key);
      }
      return;
    }
    if (this.keyboard.handleKey(event)) event.preventDefault();
  }

  // --- imperative API -------------------------------------------------------

  /** Re-runs the current load against the DataSource. */
  refresh(): void {
    this.adapter.reload();
  }

  expandAll(): void {
    this.store.expansion.setGroups(
      untracked(this.autoExpandAll) ? new Set() : new Set(untracked(this.expandableKeys))
    );
  }

  collapseAll(): void {
    this.store.expansion.setGroups(
      untracked(this.autoExpandAll) ? new Set(untracked(this.expandableKeys)) : new Set()
    );
  }

  expandRow(key: RowKey): void {
    if (!untracked(this.expandedSet).has(key)) this.store.expansion.toggleGroup(key);
  }

  collapseRow(key: RowKey): void {
    if (untracked(this.expandedSet).has(key)) this.store.expansion.toggleGroup(key);
  }

  isRowExpanded(key: RowKey): boolean {
    return untracked(this.expandedSet).has(key);
  }

  getNodeByKey(key: RowKey): T | undefined {
    return untracked(this.treeIndex).byKey.get(key);
  }

  /** Scrolls a row (by key or visible index) into the viewport. */
  scrollToRow(target: number | RowKey): void {
    const nodes = untracked(this.flatNodes);
    let index = nodes.findIndex((node) => node.key === target);
    if (index < 0 && typeof target === 'number' && target >= 0 && target < nodes.length) {
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
      const data = this.data();
      const key = this.rowKeyOf();
      const sortValues = this.sortValueSelectors();
      this.adapter.setSource(
        isDataSource(data) ? data : new ArrayDataSource<T>(data, { key, sortValues })
      );
    });
    // trees never page: the flatten step owns visibility
    effect(() => {
      untracked(() => this.store.paging.configure(null));
    });
    // selectedKeys model ⇄ selection slice (guarded both ways)
    effect(() => {
      const keys = this.selectedKeys();
      untracked(() => {
        const current = this.store.selection.selected();
        if (keys.length === current.size && keys.every((key) => current.has(key))) return;
        this.store.selection.replace(keys);
      });
    });
    effect(() => {
      const selected = this.store.selection.selected();
      untracked(() => {
        const keys = this.selectedKeys();
        if (keys.length === selected.size && keys.every((key) => selected.has(key))) return;
        this.selectedKeys.set([...selected]);
      });
    });
    // expandedRowKeys model ⇄ expansion slice (guarded both ways, polarity-aware)
    effect(() => {
      const keys = this.expandedRowKeys();
      untracked(() => {
        const current = this.expandedSet();
        if (keys.length === current.size && keys.every((key) => current.has(key))) return;
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
        if (keys.length === expanded.size && keys.every((key) => expanded.has(key))) return;
        this.expandedRowKeys.set([...expanded]);
      });
    });
    // focus follows the keyboard-navigation cell
    effect(() => {
      const cell = this.focusedCell();
      if (!cell) return;
      untracked(() => this.virtualizer.scrollRowIntoView(cell.row));
      setTimeout(() => {
        const viewport = this.viewportRef()?.nativeElement;
        const el = viewport?.querySelector<HTMLElement>(`[data-cell="${cell.row}-${cell.col}"]`);
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
      this.detectedRtl.set(getComputedStyle(this.hostRef.nativeElement).direction === 'rtl');
    });
  }
}
