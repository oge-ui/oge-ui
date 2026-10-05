import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  UIEvent as ReactUIEvent,
} from 'react';
import {
  KANBAN_CARD_GAP,
  KANBAN_DEFAULT_CARD_HEIGHT,
  beginKanbanGesture,
  buildKanbanEditorChoices,
  buildKanbanEditorItems,
  buildKanbanItem,
  columnReorderIndex,
  commitKanbanMove,
  filterCards,
  findKanbanCard,
  focusFirstKanbanMenuItem,
  focusKanbanCard,
  focusOwningKanbanCard,
  isKanbanCardContentTarget,
  kanbanCardKeyRoute,
  syncKanbanCardTabStops,
  formatKanbanMessage,
  groupBoard,
  isKanbanLegalTarget,
  isKanbanMenuAvailable,
  kanbanAutoScrollStep,
  kanbanCellKey,
  kanbanColumnCounts,
  kanbanColumnOrderPreview,
  kanbanColumnTitle,
  kanbanEditorModelFrom,
  kanbanFocusableKeys,
  kanbanHeaderCenters,
  kanbanKeyboardMove,
  kanbanMoveTargets,
  kanbanNavigationTarget,
  kanbanNewColumn,
  kanbanScrollIntoViewTop,
  kanbanToolbarAddColumn,
  measureKanbanCells,
  measureKanbanDragGeometry,
  mergeOgeKanbanMessages,
  newKanbanEditorModel,
  newKanbanItemBase,
  normalizeCards,
  planKanbanMove,
  resolveKanbanColumns,
  resolveKanbanDragTarget,
  resolveKanbanFields,
  scrollKanbanCell,
  startKanbanFrameLoop,
  stepKanbanMenuFocus,
  toKanbanAccessor,
  toggleKanbanKey,
  type KanbanCard,
  type KanbanCellScroll,
  type KanbanColumnDef,
  type KanbanDragGeometry,
  type KanbanDragState,
  type KanbanDragTarget,
  type KanbanEditorChoices,
  type KanbanEditorModel,
  type KanbanMappedFields,
  type KanbanSwimlane,
  type OgeKanbanCardAddingEvent,
  type OgeKanbanCardDeletingEvent,
  type OgeKanbanCardMovingEvent,
  type OgeKanbanCardUpdatingEvent,
  type OgeKanbanColumnAddingEvent,
  type OgeKanbanConfig,
  type OgeKanbanMessages,
  type ResolvedKanbanFields,
  KANBAN_DEFAULT_UNDO_LIMIT,
  KanbanHistory,
  applyKanbanFilters,
  buildKanbanCsv,
  buildKanbanExportRows,
  canEditKanbanTitle,
  compileKanbanFilter,
  downloadKanbanText,
  fillKanbanMessages,
  formatKanbanCount,
  isInsideKanbanHost,
  isKanbanEditingTarget,
  kanbanActiveSort,
  kanbanAnchorIndex,
  kanbanBoardPeers,
  kanbanCarriedCards,
  kanbanCellCounts,
  kanbanChecklistToggle,
  kanbanCssEscape,
  kanbanFilterChoices,
  kanbanHistoryShortcut,
  kanbanLaneCounts,
  kanbanMultiMoveAnchor,
  kanbanOrderKeys,
  kanbanPeerAt,
  kanbanQuickAddItem,
  kanbanSelectCard,
  kanbanSelectCell,
  kanbanSelectionShortcut,
  kanbanTitleUpdate,
  nextKanbanBoardId,
  registerKanbanBoard,
  setKanbanColumnSort,
  sortKanbanLanes,
  toggleKanbanFilterChip,
  withFieldValue,
  type KanbanBoardPeer,
  type KanbanFilterChoices,
  type KanbanHistoryOp,
  type KanbanSelection,
  type KanbanSelectionShortcut,
  type KanbanTransfer,
  type KanbanTransferResult,
  type OgeKanbanCardTransferredEvent,
  type OgeKanbanCardTransferringEvent,
  type OgeKanbanColumnSort,
  type OgeKanbanExportData,
  type OgeKanbanExportOptions,
  type OgeKanbanFilterChipKind,
  type OgeKanbanFilterExpression,
  type OgeKanbanResolvedMessages,
  type OgeKanbanSortField,
} from '@oge-ui/kanban-engine';
import type { OgeFormItemDefinition } from '@oge-ui/react-forms';
import {
  KANBAN_CLOSED_DIALOG,
  type KanbanDialogState,
} from './kanban-card-dialog';
import type {
  OgeKanbanEditDialogShowingEvent,
  OgeKanbanProps,
} from './kanban-types';

/** The built-in context menu's state. */
export interface KanbanMenuState {
  readonly x: number;
  readonly y: number;
  readonly card: KanbanCard | null;
  readonly column: KanbanColumnDef | null;
  readonly swimlane: string | null;
}

/** Everything the board owns that is not a prop. */
interface KanbanInternalState<T> {
  items: readonly T[];
  collapsedColumns: readonly string[];
  collapsedSwimlanes: readonly string[];
  columnOrder: readonly string[];
  selectedCardKey: unknown;
  searchQuery: string;
  runtimeColumns: readonly KanbanColumnDef[];
  seenDerivedColumns: readonly KanbanColumnDef[];
  addColumnOpen: boolean;
  addColumnName: string;
  cellState: ReadonlyMap<string, KanbanCellScroll>;
  focusedCardKey: unknown;
  pendingFocusKey: string | null;
  drag: KanbanDragState<T> | null;
  dragColumnOrder: readonly string[] | null;
  draggedColumnKey: string | null;
  menu: KanbanMenuState | null;
  dialog: KanbanDialogState;
  announcement: string;
  filterValue: OgeKanbanFilterExpression;
  columnSort: OgeKanbanColumnSort<T>;
  selectedCardKeys: readonly unknown[];
  quickAddCell: string | null;
  quickAddText: string;
  editingTitleKey: unknown;
  incomingTarget: KanbanDragTarget | null;
  dragCarried: readonly unknown[];
}

/** The derived board, recomputed only when one of its inputs changed. */
export interface KanbanView<T> {
  readonly msg: OgeKanbanResolvedMessages;
  /** Chips: the distinct tags / assignees / priorities of the data. */
  readonly filterChoices: KanbanFilterChoices;
  readonly filterValue: OgeKanbanFilterExpression;
  /** Whether any search / filter / chip narrows the board. */
  readonly filtering: boolean;
  readonly columnSort: OgeKanbanColumnSort<T>;
  readonly cellCounts: ReadonlyMap<string, number>;
  readonly laneCounts: ReadonlyMap<string | null, number>;
  readonly selectedKeys: readonly unknown[];
  readonly selectedSet: ReadonlySet<unknown>;
  readonly multiSelect: boolean;
  readonly canEditTitle: boolean;
  readonly locale: string | undefined;
  readonly cardHeight: number;
  readonly canAdd: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly canDrag: boolean;
  readonly canAddColumn: boolean;
  readonly hasSwimlanes: boolean;
  readonly fields: ResolvedKanbanFields<T>;
  readonly allCards: readonly KanbanCard<T>[];
  readonly visibleCards: readonly KanbanCard<T>[];
  readonly columns: readonly KanbanColumnDef[];
  readonly lanes: readonly KanbanSwimlane<T>[];
  readonly counts: ReadonlyMap<string, number>;
  readonly focusable: ReadonlySet<unknown>;
  readonly collapsedColumns: readonly string[];
  readonly collapsedSwimlanes: readonly string[];
  readonly columnOrder: readonly string[];
  readonly selectedCardKey: unknown;
}

type Deps = readonly unknown[];

function sameDeps(a: Deps | null, b: Deps): boolean {
  if (a === null || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}

/** One memo slot: recomputes when a dependency's identity changes. */
class Memo<V> {
  private deps: Deps | null = null;
  private value!: V;
  get(deps: Deps, compute: () => V): V {
    if (!sameDeps(this.deps, deps)) {
      this.value = compute();
      this.deps = deps;
    }
    return this.value;
  }
}

const EMPTY_KEYS: readonly string[] = [];

/**
 * The React board's instance: a versioned external store (read through
 * `useSyncExternalStore`) holding the state Angular keeps in signals, plus
 * the event handlers. Every decision is delegated to `@oge-ui/kanban-engine`
 * — the same functions the Angular component calls — so what remains here
 * is state plumbing: controlled/uncontrolled models, callbacks instead of
 * outputs, and synchronous reads of the latest state for imperative calls.
 */
export class KanbanController<T extends object> {
  props!: OgeKanbanProps<T>;
  config!: OgeKanbanConfig;
  host: HTMLElement | null = null;
  /** The page direction (the `rtlEnabled` fallback), kept by the board. */
  detectedRtl = false;

  private version = 0;
  private readonly listeners = new Set<() => void>();
  private readonly st: KanbanInternalState<T>;
  private lastDataSource: readonly T[] | undefined;

  private readonly fieldsMemo = new Memo<ResolvedKanbanFields<T>>();
  private readonly cardsMemo = new Memo<KanbanCard<T>[]>();
  private readonly accessorsMemo = new Memo<
    ((item: T) => unknown)[] | undefined
  >();
  private readonly visibleMemo = new Memo<readonly KanbanCard<T>[]>();
  private readonly columnsMemo = new Memo<readonly KanbanColumnDef[]>();
  private readonly lanesMemo = new Memo<KanbanSwimlane<T>[]>();
  private readonly countsMemo = new Memo<ReadonlyMap<string, number>>();
  private readonly focusMemo = new Memo<ReadonlySet<unknown>>();
  private readonly msgMemo = new Memo<OgeKanbanResolvedMessages>();
  private readonly choicesMemo = new Memo<KanbanEditorChoices>();
  private readonly filterMemo = new Memo<
    ((card: KanbanCard<T>) => boolean) | null
  >();
  private readonly chipMemo = new Memo<
    ((card: KanbanCard<T>) => boolean) | null
  >();
  private readonly chipChoicesMemo = new Memo<KanbanFilterChoices>();
  private readonly cellCountsMemo = new Memo<ReadonlyMap<string, number>>();
  private readonly laneCountsMemo = new Memo<
    ReadonlyMap<string | null, number>
  >();
  private readonly sortedMemo = new Memo<readonly KanbanSwimlane<T>[]>();
  private readonly selectedSetMemo = new Memo<ReadonlySet<unknown>>();
  private readonly history = new KanbanHistory<T>(KANBAN_DEFAULT_UNDO_LIMIT);
  private selectionAnchor: unknown = null;
  private fallbackBoardId: string | null = null;
  private externalDrop: {
    peer: KanbanBoardPeer;
    target: KanbanDragTarget | null;
  } | null = null;
  private incomingGeometry: KanbanDragGeometry | null = null;
  private unregisterPeer: (() => void) | null = null;
  private menuReturnFocus: HTMLElement | null = null;

  private dragGeometry: KanbanDragGeometry | null = null;
  private stopFrameLoop: (() => void) | null = null;
  /** The source item being edited; `null` while creating. */
  private editedSource: T | null = null;
  /** Session-unique keys for created cards whose data has no key yet. */
  private newKeyCounter = 0;

  constructor(props: OgeKanbanProps<T>, config: OgeKanbanConfig) {
    this.props = props;
    this.config = config;
    // Angular writes the initial input values before the first render; the
    // React board seeds from them at construction, so the first paint agrees
    this.lastDataSource = props.dataSource;
    this.st = {
      items: [...(props.dataSource ?? [])],
      collapsedColumns: props.defaultCollapsedColumns ?? EMPTY_KEYS,
      collapsedSwimlanes: props.defaultCollapsedSwimlanes ?? EMPTY_KEYS,
      columnOrder: props.defaultColumnOrder ?? EMPTY_KEYS,
      selectedCardKey: props.defaultSelectedCardKey ?? null,
      searchQuery: '',
      runtimeColumns: [],
      seenDerivedColumns: [],
      addColumnOpen: false,
      addColumnName: '',
      cellState: new Map(),
      focusedCardKey: null,
      pendingFocusKey: null,
      drag: null,
      dragColumnOrder: null,
      draggedColumnKey: null,
      menu: null,
      dialog: KANBAN_CLOSED_DIALOG,
      announcement: '',
      filterValue: props.defaultFilterValue ?? {},
      columnSort: props.defaultColumnSort ?? {},
      selectedCardKeys: props.defaultSelectedCardKeys ?? EMPTY_KEYS,
      quickAddCell: null,
      quickAddText: '',
      editingTitleKey: null,
      incomingTarget: null,
      dragCarried: EMPTY_KEYS,
    };
  }

  // ---------------- store plumbing ----------------

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getVersion = (): number => this.version;

  /** Called during render with the latest props (a new array re-seeds). */
  sync(props: OgeKanbanProps<T>, config: OgeKanbanConfig): void {
    this.props = props;
    this.config = config;
    if (props.dataSource !== this.lastDataSource) {
      // the input array is copied and never mutated — hosts persist
      // through the CRUD events (same as Angular's store effect)
      this.lastDataSource = props.dataSource;
      this.st.items = [...(props.dataSource ?? [])];
    }
  }

  /** The direction the arrow keys follow: `rtlEnabled`, else the page. */
  get rtl(): boolean {
    return this.props.rtlEnabled ?? this.detectedRtl;
  }

  private set(patch: Partial<KanbanInternalState<T>>): void {
    Object.assign(this.st, patch);
    this.version++;
    for (const listener of this.listeners) listener();
  }

  get state(): Readonly<KanbanInternalState<T>> {
    return this.st;
  }

  // ---------------- controlled models ----------------

  private get collapsedColumns(): readonly string[] {
    return this.props.collapsedColumns ?? this.st.collapsedColumns;
  }
  private get collapsedSwimlanes(): readonly string[] {
    return this.props.collapsedSwimlanes ?? this.st.collapsedSwimlanes;
  }
  private get columnOrder(): readonly string[] {
    return this.props.columnOrder ?? this.st.columnOrder;
  }
  private get selectedCardKey(): unknown {
    return this.props.selectedCardKey !== undefined
      ? this.props.selectedCardKey
      : this.st.selectedCardKey;
  }

  private setCollapsedColumns(next: readonly string[]): void {
    if (this.props.collapsedColumns === undefined) {
      this.set({ collapsedColumns: next });
    }
    this.props.onCollapsedColumnsChange?.(next);
  }
  private setCollapsedSwimlanes(next: readonly string[]): void {
    if (this.props.collapsedSwimlanes === undefined) {
      this.set({ collapsedSwimlanes: next });
    }
    this.props.onCollapsedSwimlanesChange?.(next);
  }
  private setColumnOrder(next: readonly string[]): void {
    if (this.props.columnOrder === undefined) this.set({ columnOrder: next });
    this.props.onColumnOrderChange?.(next);
  }
  private setSelectedCardKey(next: unknown): void {
    if (Object.is(this.selectedCardKey, next)) return;
    if (this.props.selectedCardKey === undefined) {
      this.set({ selectedCardKey: next });
    }
    this.props.onSelectedCardKeyChange?.(next);
  }

  private get filterValue(): OgeKanbanFilterExpression {
    return this.props.filterValue ?? this.st.filterValue;
  }
  private get columnSort(): OgeKanbanColumnSort<T> {
    return this.props.columnSort ?? this.st.columnSort;
  }
  private get selectedCardKeys(): readonly unknown[] {
    return this.props.selectedCardKeys ?? this.st.selectedCardKeys;
  }

  private setFilterValue(next: OgeKanbanFilterExpression): void {
    if (this.props.filterValue === undefined) this.set({ filterValue: next });
    this.props.onFilterValueChange?.(next);
  }
  private setColumnSort(next: OgeKanbanColumnSort<T>): void {
    if (this.props.columnSort === undefined) this.set({ columnSort: next });
    this.props.onColumnSortChange?.(next);
  }
  private setSelectedCardKeys(next: readonly unknown[]): void {
    const before = this.selectedCardKeys;
    if (
      before.length === next.length &&
      before.every((key, index) => Object.is(key, next[index]))
    ) {
      return;
    }
    if (this.props.selectedCardKeys === undefined) {
      this.set({ selectedCardKeys: next });
    }
    this.props.onSelectedCardKeysChange?.(next);
  }

  // ---------------- derived view ----------------

  /** The board as it is right now — cheap when nothing changed. */
  view(): KanbanView<T> {
    const p = this.props;
    const st = this.st;
    const readOnly = p.readOnly ?? false;
    const canAdd = (p.allowAdding ?? true) && !readOnly;
    const canUpdate = (p.allowUpdating ?? true) && !readOnly;
    const canDelete = (p.allowDeleting ?? true) && !readOnly;
    const canDrag = (p.allowDragging ?? true) && !readOnly;
    const hasSwimlanes = p.swimlaneExpr !== undefined;
    const fields = this.fieldsMemo.get(
      [
        p.keyExpr,
        p.columnExpr,
        p.titleExpr,
        p.descriptionExpr,
        p.colorExpr,
        p.orderExpr,
        p.swimlaneExpr,
        p.tagsExpr,
        p.assigneeExpr,
        p.dueDateExpr,
        p.priorityExpr,
        p.checklistExpr,
      ],
      () =>
        resolveKanbanFields<T>({
          checklistExpr: p.checklistExpr,
          keyExpr: p.keyExpr ?? 'id',
          columnExpr: p.columnExpr ?? 'status',
          titleExpr: p.titleExpr ?? 'title',
          descriptionExpr: p.descriptionExpr ?? 'description',
          colorExpr: p.colorExpr ?? 'color',
          orderExpr: p.orderExpr,
          swimlaneExpr: p.swimlaneExpr,
          tagsExpr: p.tagsExpr,
          assigneeExpr: p.assigneeExpr,
          dueDateExpr: p.dueDateExpr,
          priorityExpr: p.priorityExpr,
        }),
    );
    const allCards = this.cardsMemo.get([st.items, fields], () =>
      normalizeCards(st.items, fields),
    );
    const accessors = this.accessorsMemo.get([p.searchExprs], () =>
      p.searchExprs?.map((expr) => toKanbanAccessor(expr)),
    );
    const filterValue = this.filterValue;
    const filterTest = this.filterMemo.get([p.filter], () =>
      compileKanbanFilter(p.filter),
    );
    const chipTest = this.chipMemo.get([filterValue], () =>
      compileKanbanFilter<T>(filterValue),
    );
    const visibleCards = this.visibleMemo.get(
      [allCards, st.searchQuery, accessors, filterTest, chipTest],
      () =>
        applyKanbanFilters(filterCards(allCards, st.searchQuery, accessors), [
          filterTest,
          chipTest,
        ]),
    );
    const columnOrder = this.columnOrder;
    const columns = this.columnsMemo.get(
      [
        p.columns,
        st.seenDerivedColumns,
        allCards,
        st.runtimeColumns,
        st.dragColumnOrder,
        columnOrder,
      ],
      () => {
        const result = resolveKanbanColumns({
          declared: p.columns,
          seenDerived: st.seenDerivedColumns,
          cards: allCards,
          runtime: st.runtimeColumns,
          // a header drag previews its order live; the model commits on drop
          preview: st.dragColumnOrder,
          columnOrder,
        });
        const next = result.nextSeenDerived;
        // remember for the next data change (written outside the render)
        if (next !== null) {
          queueMicrotask(() => this.set({ seenDerivedColumns: next }));
        }
        return result.columns;
      },
    );
    const locale = p.locale ?? this.config.locale;
    const columnSort = this.columnSort;
    const grouped = this.lanesMemo.get(
      [visibleCards, columns, hasSwimlanes],
      () => groupBoard(visibleCards, columns, hasSwimlanes),
    );
    const lanes = this.sortedMemo.get(
      [grouped, columnSort, locale, p.priorityOrder],
      () => sortKanbanLanes(grouped, columnSort, locale, p.priorityOrder),
    );
    const counts = this.countsMemo.get([allCards], () =>
      kanbanColumnCounts(allCards),
    );
    const cellCounts = this.cellCountsMemo.get([allCards, hasSwimlanes], () =>
      kanbanCellCounts(allCards, hasSwimlanes),
    );
    const laneCounts = this.laneCountsMemo.get([allCards], () =>
      kanbanLaneCounts(allCards),
    );
    const filterChoices = this.chipChoicesMemo.get([allCards], () =>
      kanbanFilterChoices(allCards),
    );
    const focusable = this.focusMemo.get([lanes, st.focusedCardKey], () =>
      kanbanFocusableKeys(lanes, st.focusedCardKey),
    );
    const msg = this.msgMemo.get([this.config, p.messages], () =>
      fillKanbanMessages(mergeOgeKanbanMessages(this.config, p.messages)),
    );
    const selectedKeys = this.selectedKeysNow();
    const selectedSet = this.selectedSetMemo.get(
      [selectedKeys],
      () => new Set(selectedKeys),
    );
    return {
      msg,
      filterChoices,
      filterValue,
      filtering:
        st.searchQuery.trim() !== '' || filterTest !== null || chipTest !== null,
      columnSort,
      cellCounts,
      laneCounts,
      selectedKeys,
      selectedSet,
      multiSelect: (p.selectionMode ?? 'multiple') === 'multiple',
      canEditTitle: canUpdate && canEditKanbanTitle(fields),
      locale: p.locale ?? this.config.locale,
      cardHeight:
        p.cardHeight ?? this.config.cardHeight ?? KANBAN_DEFAULT_CARD_HEIGHT,
      canAdd,
      canUpdate,
      canDelete,
      canDrag,
      canAddColumn: (p.allowColumnAdding ?? false) && !readOnly,
      hasSwimlanes,
      fields,
      allCards,
      visibleCards,
      columns,
      lanes,
      counts,
      focusable,
      collapsedColumns: this.collapsedColumns,
      collapsedSwimlanes: this.collapsedSwimlanes,
      columnOrder,
      selectedCardKey: this.selectedCardKey,
    };
  }

  private mapped(view: KanbanView<T>): KanbanMappedFields {
    const p = this.props;
    return {
      hasSwimlanes: view.hasSwimlanes,
      hasTags: p.tagsExpr !== undefined,
      hasAssignees: p.assigneeExpr !== undefined,
      hasDueDate: p.dueDateExpr !== undefined,
      hasPriority: p.priorityExpr !== undefined,
    };
  }

  /** Choice lists for the default form, built from the current board. */
  editorChoices(view: KanbanView<T> = this.view()): KanbanEditorChoices {
    const p = this.props;
    return this.choicesMemo.get(
      [
        view.allCards,
        view.columns,
        view.fields,
        view.hasSwimlanes,
        p.tagsExpr,
        p.assigneeExpr,
        p.dueDateExpr,
        p.priorityExpr,
      ],
      () =>
        buildKanbanEditorChoices(
          view.allCards,
          view.columns,
          view.fields,
          this.mapped(view),
        ),
    );
  }

  canAddTo(
    column: KanbanColumnDef,
    view: KanbanView<T> = this.view(),
  ): boolean {
    return view.canAdd && column.allowAdding !== false;
  }

  isColumnCollapsed(key: string): boolean {
    return this.collapsedColumns.includes(key);
  }

  isSwimlaneCollapsed(key: string | null): boolean {
    return key !== null && this.collapsedSwimlanes.includes(key);
  }

  private readonly isCollapsedFn = (key: string): boolean =>
    this.isColumnCollapsed(key);

  // ---------------- lifecycle (effects) ----------------

  /** After every commit: re-measure the cells, then land a pending focus. */
  afterRender(): void {
    this.measureCells();
    const pending = this.st.pendingFocusKey;
    if (pending !== null && this.host !== null) {
      this.st.pendingFocusKey = null;
      focusKanbanCard(this.host, pending);
    }
    // one Tab stop per column: card content is tabbable only in the stop
    if (this.host !== null) syncKanbanCardTabStops(this.host);
  }

  measureCells = (): void => {
    if (this.host === null) return;
    const next = measureKanbanCells(this.host, this.st.cellState);
    if (next !== null) this.set({ cellState: next });
  };

  /** Mount side of the lifecycle effect: joins the cross-board registry. */
  mount(): void {
    this.unregisterPeer?.();
    this.unregisterPeer = registerKanbanBoard(this.createPeer());
  }

  /** Unmount side of the lifecycle effect; StrictMode re-mounts cleanly. */
  teardown(): void {
    this.stopAutoScroll();
    this.unregisterPeer?.();
    this.unregisterPeer = null;
  }

  // ---------------- toolbar & collapse ----------------

  toggleColumn(key: string): void {
    this.setCollapsedColumns(toggleKanbanKey(this.collapsedColumns, key));
  }

  collapseAllColumns(): void {
    this.setCollapsedColumns(this.view().columns.map((column) => column.key));
  }

  expandAllColumns(): void {
    this.setCollapsedColumns([]);
  }

  toggleSwimlane(key: string | null): void {
    if (key === null) return;
    this.setCollapsedSwimlanes(toggleKanbanKey(this.collapsedSwimlanes, key));
  }

  onSearchInput(value: string): void {
    this.set({ searchQuery: value });
  }

  clearSearch(): void {
    this.set({ searchQuery: '' });
  }

  addFromToolbar(): void {
    const view = this.view();
    this.openNewCard(
      kanbanToolbarAddColumn(
        view.columns,
        (column) => this.canAddTo(column, view),
        this.isCollapsedFn,
      ),
      null,
    );
  }

  // ---------------- add column ----------------

  startAddColumn(): void {
    this.set({ addColumnOpen: true });
    setTimeout(() => {
      this.host
        ?.querySelector<HTMLInputElement>('.oge-kanban-add-column-input')
        ?.focus();
    });
  }

  cancelAddColumn(): void {
    this.set({ addColumnOpen: false, addColumnName: '' });
  }

  commitAddColumn(): void {
    const column = kanbanNewColumn(this.st.addColumnName, this.view().columns);
    if (column === null) {
      this.cancelAddColumn();
      return;
    }
    const event: OgeKanbanColumnAddingEvent = { column, cancel: false };
    this.props.onColumnAdding?.(event);
    if (event.cancel) return;
    this.set({ runtimeColumns: [...this.st.runtimeColumns, column] });
    this.props.onColumnAdded?.({ column });
    this.cancelAddColumn();
  }

  onAddColumnInput(value: string): void {
    this.set({ addColumnName: value });
  }

  onAddColumnKeydown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitAddColumn();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancelAddColumn();
    }
  }

  onAddColumnBlur(_event: ReactFocusEvent<HTMLInputElement>): void {
    // a commit that closed the composer unmounts the input; React may still
    // report its blur, which must not commit a second time
    if (this.st.addColumnOpen) this.commitAddColumn();
  }

  // ---------------- virtualization ----------------

  onCellScroll(
    event: ReactUIEvent<HTMLElement>,
    lane: string | null,
    column: string,
  ): void {
    const el = event.currentTarget;
    const next = new Map(this.st.cellState);
    next.set(kanbanCellKey(lane, column), {
      top: el.scrollTop,
      height: el.clientHeight,
    });
    this.set({ cellState: next });
  }

  // ---------------- pointer & keyboard on cards ----------------

  onCardClick(card: KanbanCard<T>, event: ReactMouseEvent<HTMLElement>): void {
    // the quick-action buttons resolve here, so a click and a keyboard
    // activation (Enter/Space on the focused button) take one path
    const action = (event.target as HTMLElement).closest(
      '.oge-kanban-card-action',
    );
    if (action === null) {
      this.applySelection(
        kanbanSelectCard(
          this.view().lanes,
          this.selection(),
          card.key,
          { toggle: event.ctrlKey || event.metaKey, range: event.shiftKey },
          this.props.selectionMode ?? 'multiple',
        ),
        card.key,
      );
    } else {
      this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
    }
    this.set({ focusedCardKey: card.key });
    this.props.onCardClick?.({ card, event: event.nativeEvent });
    if (action !== null) {
      if (action.classList.contains('oge-kanban-card-action-edit')) {
        this.editCard(card);
      } else if (action.classList.contains('oge-kanban-card-action-delete')) {
        this.deleteItem(card.source);
      }
    }
  }

  onCardDblClick(
    card: KanbanCard<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): void {
    event.stopPropagation();
    if (isKanbanCardContentTarget(event.target, event.currentTarget)) return;
    this.props.onCardDblClick?.({ card, event: event.nativeEvent });
    if (
      (this.props.inlineTitleEditing ?? false) &&
      (event.target as HTMLElement).closest('.oge-kanban-card-title') !== null
    ) {
      this.startTitleEdit(card.key);
      return;
    }
    if (this.view().canUpdate) this.editCard(card);
  }

  onCellDblClick(
    event: ReactMouseEvent<HTMLElement>,
    column: KanbanColumnDef,
    lane: string | null,
  ): void {
    // only a dblclick on empty cell space (not on a card) creates a card
    if ((event.target as HTMLElement).closest('.oge-kanban-card') !== null) {
      return;
    }
    if (this.canAddTo(column)) this.openNewCard(column.key, lane);
  }

  onCardKeydown(
    event: ReactKeyboardEvent<HTMLElement>,
    card: KanbanCard<T>,
  ): void {
    // keys typed into a card's own controls stay with those controls
    const route = kanbanCardKeyRoute(event);
    if (route === 'return') {
      event.preventDefault();
      focusOwningKanbanCard(event.target as Element);
      return;
    }
    if (route === 'content') return;
    const view = this.view();
    const shortcut = kanbanSelectionShortcut(
      event,
      this.props.selectionMode ?? 'multiple',
      view.selectedKeys.length,
    );
    if (shortcut !== null) {
      event.preventDefault();
      this.onSelectionShortcut(shortcut, card);
      return;
    }
    if (event.ctrlKey && !event.metaKey && !event.altKey) {
      this.onCardCtrlArrow(event, card, view);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Enter') {
      if (view.canUpdate) {
        event.preventDefault();
        this.editCard(card);
      }
      return;
    }
    if (event.key === 'F2') {
      if (view.canEditTitle) {
        event.preventDefault();
        this.startTitleEdit(card.key);
      }
      return;
    }
    if (event.key === 'Delete') {
      if (view.canDelete) {
        event.preventDefault();
        const carried = this.carried(card);
        if (carried.length > 1) {
          this.deleteCards(carried.map((entry) => entry.source));
        } else {
          this.deleteItem(card.source);
        }
      }
      return;
    }
    const position = findKanbanCard(view.lanes, card.key);
    if (position === null) return;
    const target = kanbanNavigationTarget(
      view.lanes,
      position,
      event.key,
      this.isCollapsedFn,
      this.rtl,
    );
    if (target === undefined) return;
    event.preventDefault();
    this.focusCard(target);
  }

  /** Ctrl+Arrow — the keyboard twin of the drag (see `kanbanKeyboardMove`). */
  private onCardCtrlArrow(
    event: ReactKeyboardEvent<HTMLElement>,
    card: KanbanCard<T>,
    view: KanbanView<T>,
  ): void {
    if (!view.canDrag) return;
    const sourceColumn = view.columns.find(
      (entry) => entry.key === card.column,
    );
    if (sourceColumn?.allowDrag === false) return;
    const position = findKanbanCard(view.lanes, card.key);
    if (position === null) return;
    const move = kanbanKeyboardMove(
      view.lanes,
      view.columns,
      card,
      position,
      event.key,
      this.isCollapsedFn,
      this.rtl,
    );
    if (move === null) return;
    event.preventDefault();
    const carried = this.carried(card);
    // a horizontal move carries the whole selection; up/down reorders one
    if (carried.length > 1 && move.toColumn !== card.column) {
      this.moveCards(
        carried.map((entry) => entry.key),
        move.toColumn,
        move.toIndex,
      );
      return;
    }
    this.moveCard(card.key, move.toColumn, move.toIndex);
  }

  private focusCard(card: KanbanCard<T>, keepSelection = false): void {
    this.set({ focusedCardKey: card.key });
    if (!keepSelection) {
      this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
    }
    this.scrollCardIntoView(card);
    this.set({ pendingFocusKey: String(card.key) });
  }

  // ---------------- multi-select ----------------

  /** Effective selection: `selectedCardKeys`, else the single `selectedCardKey`. */
  private selectedKeysNow(): readonly unknown[] {
    const keys = this.selectedCardKeys;
    if (keys.length > 0) return keys;
    const key = this.selectedCardKey;
    return key === null || key === undefined ? EMPTY_KEYS : [key];
  }

  private selection(): KanbanSelection {
    return {
      keys: this.selectedKeysNow(),
      anchor: this.selectionAnchor ?? this.selectedCardKey,
    };
  }

  private applySelection(next: KanbanSelection, primary: unknown): void {
    this.selectionAnchor = next.anchor;
    const before = this.selectedCardKeys;
    const same =
      before.length === next.keys.length &&
      before.every((key, index) => Object.is(key, next.keys[index]));
    this.setSelectedCardKeys(next.keys);
    this.setSelectedCardKey(
      next.keys.includes(primary) ? primary : (next.keys[0] ?? null),
    );
    if (next.keys.length > 1 && !same) {
      this.announce(
        this.view().msg.announcements.selection,
        { count: next.keys.length },
        true,
      );
    }
  }

  isCardSelected(card: KanbanCard<T>, view: KanbanView<T> = this.view()): boolean {
    return view.selectedSet.has(card.key);
  }

  /** The cards a drag / Ctrl+Arrow / Delete of `card` acts on. */
  private carried(card: KanbanCard<T>): KanbanCard<T>[] {
    if ((this.props.selectionMode ?? 'multiple') !== 'multiple') return [card];
    return kanbanCarriedCards(this.view().lanes, card, this.selectedKeysNow());
  }

  selectCards(keys: readonly unknown[]): void {
    const ordered = kanbanOrderKeys(this.view().lanes, keys);
    this.applySelection(
      { keys: ordered, anchor: ordered[0] ?? null },
      ordered[0] ?? null,
    );
  }

  clearSelection(): void {
    this.applySelection({ keys: [], anchor: null }, null);
  }

  private onSelectionShortcut(
    shortcut: KanbanSelectionShortcut,
    card: KanbanCard<T>,
  ): void {
    const lanes = this.view().lanes;
    switch (shortcut) {
      case 'select-cell': {
        const next = kanbanSelectCell(lanes, card.key);
        if (next !== null) this.applySelection(next, card.key);
        return;
      }
      case 'toggle':
        this.applySelection(
          kanbanSelectCard(
            lanes,
            this.selection(),
            card.key,
            { toggle: true, range: false },
            'multiple',
          ),
          card.key,
        );
        return;
      case 'clear':
        this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
        return;
      case 'extend-up':
      case 'extend-down': {
        const position = findKanbanCard(lanes, card.key);
        if (position === null) return;
        const target = kanbanNavigationTarget(
          lanes,
          position,
          shortcut === 'extend-up' ? 'ArrowUp' : 'ArrowDown',
          this.isCollapsedFn,
        );
        if (target === undefined) return;
        const current = this.selection();
        this.applySelection(
          kanbanSelectCard(
            lanes,
            { keys: current.keys, anchor: current.anchor ?? card.key },
            target.key,
            { toggle: false, range: true },
            'multiple',
          ),
          target.key,
        );
        this.focusCard(target, true);
        return;
      }
    }
  }

  /** Adjusts the cell's scrollTop so a virtualized target renders and shows. */
  private scrollCardIntoView(card: KanbanCard<T>): void {
    if (!(this.props.virtualScrolling ?? true)) return;
    const view = this.view();
    const position = findKanbanCard(view.lanes, card.key);
    if (position === null) return;
    const lane = view.lanes[position.laneIndex];
    const key = kanbanCellKey(lane.key, card.column);
    const state = this.st.cellState.get(key);
    if (state === undefined) return;
    const top = kanbanScrollIntoViewTop(
      state,
      position.cardIndex,
      view.cardHeight,
    );
    if (top !== null) {
      const next = new Map(this.st.cellState);
      next.set(key, { ...state, top });
      this.set({ cellState: next });
      if (this.host !== null) {
        scrollKanbanCell(this.host, lane.key, card.column, top);
      }
    }
  }

  // ---------------- drag & drop ----------------

  onCardPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    card: KanbanCard<T>,
    column: KanbanColumnDef,
    lane: string | null,
  ): void {
    const view = this.view();
    if (!view.canDrag || event.button !== 0) return;
    if (column.allowDrag === false) return;
    const cardEl = event.currentTarget;
    // quick actions and template controls keep their native press
    if (isKanbanCardContentTarget(event.target, cardEl)) return;
    const position = findKanbanCard(view.lanes, card.key);
    if (position === null || this.host === null) return;
    const rect = cardEl.getBoundingClientRect();
    this.dragGeometry = measureKanbanDragGeometry(this.host);
    // a modifier press is a selection click (decided on `click`); a plain
    // press on an unselected card selects it, on a selected one keeps the
    // multi-selection so the drag carries it
    const modified = event.ctrlKey || event.metaKey || event.shiftKey;
    if (!modified && !this.isCardSelected(card, view)) {
      this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
    }
    this.set({ focusedCardKey: card.key });
    // the gesture's preventDefault suppresses native focus-on-click
    cardEl.focus({ preventScroll: true });
    // the drag state materializes on the first past-threshold move — a
    // plain click must never lift the card
    const pending: KanbanDragState<T> = {
      card,
      column,
      fromLane: lane,
      fromIndex: position.cardIndex,
      width: rect.width,
      height: rect.height,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      target: { lane, column: card.column, index: position.cardIndex },
    };
    beginKanbanGesture(event.nativeEvent, {
      onMove: (_dx, _dy, moveEvent) => {
        const current = this.st.drag;
        const patch: Partial<KanbanInternalState<T>> = {};
        if (current === null) {
          // the lift: the selection rides along when the card is in it
          const carried = modified ? [card] : this.carried(card);
          patch.dragCarried = carried.map((entry) => entry.key);
        }
        const base = current ?? pending;
        const x = moveEvent.clientX;
        const y = moveEvent.clientY;
        patch.drag = { ...base, x, y, target: this.dragTargetAt(x, y, base) };
        this.set(patch);
        if (current === null) this.startAutoScroll();
      },
      onFinish: (commit, cancelled) => {
        this.stopAutoScroll();
        const state = this.st.drag;
        const carried = this.st.dragCarried;
        const external = this.externalDrop;
        this.externalDrop = null;
        external?.peer.preview(null);
        this.set({ drag: null, dragCarried: EMPTY_KEYS });
        if (state === null) return;
        if (cancelled) {
          this.set({
            announcement: this.view().msg.announcements.cancelled,
          });
          return;
        }
        if (!commit) return;
        if (external !== null && external.target !== null) {
          this.transferTo(external.peer, carried, state, external.target);
          return;
        }
        if (state.target === null) return;
        if (carried.length > 1) {
          this.moveCards(
            carried,
            state.target.column,
            state.target.index,
            state.target.lane,
            state.card.key,
          );
          return;
        }
        this.moveCard(
          state.card.key,
          state.target.column,
          state.target.index,
          state.target.lane,
        );
      },
    });
  }

  /**
   * The drop target at a pointer position: inside this board the usual
   * hit-test; outside it, the hovered board of the same `dragGroup`.
   */
  private dragTargetAt(
    x: number,
    y: number,
    origin: KanbanDragState<T>,
  ): KanbanDragTarget | null {
    const group = this.props.dragGroup;
    if (
      group !== undefined &&
      this.host !== null &&
      !isInsideKanbanHost(this.host, x, y)
    ) {
      const peer = kanbanPeerAt(group, this.resolvedBoardId(), x, y);
      if (this.externalDrop !== null && this.externalDrop.peer !== peer) {
        this.externalDrop.peer.preview(null);
        this.externalDrop = null;
      }
      if (peer !== null) {
        const target = peer.targetAt(x, y);
        peer.preview(target);
        this.externalDrop = { peer, target };
        return null;
      }
    } else if (this.externalDrop !== null) {
      this.externalDrop.peer.preview(null);
      this.externalDrop = null;
    }
    return this.resolveDragTarget(x, y, origin) ?? origin.target;
  }

  private resolveDragTarget(
    clientX: number,
    clientY: number,
    origin: KanbanDragState<T>,
  ): KanbanDragTarget | null {
    if (this.dragGeometry === null) return null;
    const view = this.view();
    return resolveKanbanDragTarget(
      this.dragGeometry,
      clientX,
      clientY,
      origin,
      view.lanes,
      view.columns,
      view.cardHeight + KANBAN_CARD_GAP,
    );
  }

  private startAutoScroll(): void {
    this.stopFrameLoop = startKanbanFrameLoop(() => {
      const state = this.st.drag;
      if (state === null || this.dragGeometry === null) return false;
      if (kanbanAutoScrollStep(this.dragGeometry, state)) {
        const next = this.resolveDragTarget(state.x, state.y, state);
        if (next !== null) this.set({ drag: { ...state, target: next } });
      }
      return true;
    });
  }

  private stopAutoScroll(): void {
    this.stopFrameLoop?.();
    this.stopFrameLoop = null;
  }

  onColumnHeaderPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    column: KanbanColumnDef,
  ): void {
    const p = this.props;
    if (!(p.allowColumnReordering ?? false) || (p.readOnly ?? false)) return;
    if (event.button !== 0 || this.host === null) return;
    if ((event.target as HTMLElement).closest('button') !== null) return;
    const columns = this.view().columns;
    const fromIndex = columns.findIndex((entry) => entry.key === column.key);
    if (fromIndex < 0) return;
    const centers = kanbanHeaderCenters(this.host);
    const baseOrder = columns.map((entry) => entry.key);
    this.set({ draggedColumnKey: column.key });
    beginKanbanGesture(event.nativeEvent, {
      onMove: (_dx, _dy, moveEvent) => {
        const toIndex = columnReorderIndex(
          moveEvent.clientX,
          centers,
          fromIndex,
        );
        this.set({
          dragColumnOrder: kanbanColumnOrderPreview(
            baseOrder,
            fromIndex,
            toIndex,
            column.key,
          ),
        });
      },
      onFinish: (commit) => {
        const preview = this.st.dragColumnOrder;
        this.set({ dragColumnOrder: null, draggedColumnKey: null });
        if (!commit || preview === null) return;
        const toIndex = preview.indexOf(column.key);
        if (toIndex === fromIndex) return;
        this.setColumnOrder(preview);
        this.props.onColumnReordered?.({
          column,
          fromIndex,
          toIndex,
          columnOrder: preview,
        });
        this.announce(this.view().msg.announcements.columnMoved, {
          title: kanbanColumnTitle(column),
          position: String(toIndex + 1),
        });
      },
    });
  }

  // ---------------- context menu ----------------

  onCardContextMenu(
    card: KanbanCard<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): void {
    this.props.onCardContextMenu?.({ card, event: event.nativeEvent });
    if (!this.isCardSelected(card)) {
      this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
    }
    this.set({ focusedCardKey: card.key });
    this.openMenu(event, card, null);
  }

  /** The header's column-menu button: the same menu, anchored under it. */
  onColumnMenuButton(
    event: ReactMouseEvent<HTMLElement>,
    column: KanbanColumnDef,
  ): void {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const hostRect = this.host?.getBoundingClientRect();
    event.stopPropagation();
    this.set({
      menu: {
        x: rect.left - (hostRect?.left ?? 0),
        y: rect.bottom - (hostRect?.top ?? 0) + 4,
        card: null,
        column,
        swimlane: null,
      },
    });
    this.menuReturnFocus = button;
    setTimeout(() => {
      if (this.host !== null) focusFirstKanbanMenuItem(this.host);
    });
  }

  activeSort(column: KanbanColumnDef): {
    field: OgeKanbanSortField | null;
    direction: 'asc' | 'desc';
  } {
    return kanbanActiveSort(this.columnSort, column.key);
  }

  sortFieldLabel(field: OgeKanbanSortField): string {
    const m = this.view().msg.menu;
    switch (field) {
      case 'title':
        return m.sortTitle;
      case 'priority':
        return m.sortPriority;
      case 'dueDate':
        return m.sortDueDate;
      default:
        return m.sortManual;
    }
  }

  menuSort(field: OgeKanbanSortField | null, direction?: 'asc' | 'desc'): void {
    const state = this.st.menu;
    this.closeMenu();
    const column = state?.column;
    if (column == null) return;
    const active = kanbanActiveSort(this.columnSort, column.key);
    const nextField = field ?? active.field ?? 'order';
    const nextDirection = direction ?? active.direction;
    this.setColumnSort(
      setKanbanColumnSort(this.columnSort, column.key, nextField, nextDirection),
    );
    this.announce(this.view().msg.announcements.sorted, {
      column: kanbanColumnTitle(column),
      field: this.sortFieldLabel(nextField),
    });
  }

  menuSelectAll(): void {
    const state = this.st.menu;
    this.closeMenu();
    const column = state?.column;
    if (column == null) return;
    const keys: unknown[] = [];
    for (const lane of this.view().lanes) {
      const cell = lane.columns.find((entry) => entry.column.key === column.key);
      for (const card of cell?.cards ?? []) keys.push(card.key);
    }
    this.selectCards(keys);
  }

  /** Other boards of this board's `dragGroup` (the menu's "Move to …"). */
  peerBoards(): KanbanBoardPeer[] {
    return kanbanBoardPeers(this.props.dragGroup, this.resolvedBoardId());
  }

  menuMoveToBoard(peer: KanbanBoardPeer): void {
    const state = this.st.menu;
    this.closeMenu();
    const card = state?.card as KanbanCard<T> | null | undefined;
    if (card == null) return;
    const column = peer.columns().find((entry) => entry.allowDrop !== false);
    if (column === undefined) return;
    this.transferTo(
      peer,
      this.carried(card).map((entry) => entry.key),
      null,
      {
        lane: card.swimlane,
        column: column.key,
        index: Number.MAX_SAFE_INTEGER,
      },
    );
  }

  onColumnContextMenu(
    event: ReactMouseEvent<HTMLElement>,
    column: KanbanColumnDef,
  ): void {
    this.openMenu(event, null, column);
  }

  private openMenu(
    event: ReactMouseEvent<HTMLElement>,
    card: KanbanCard<T> | null,
    column: KanbanColumnDef | null,
  ): void {
    const view = this.view();
    // no available action → keep the native browser menu
    if (
      !isKanbanMenuAvailable(card !== null, column !== null, {
        canUpdate: view.canUpdate,
        canDelete: view.canDelete,
      })
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const hostRect = this.host?.getBoundingClientRect();
    this.set({
      menu: {
        x: event.clientX - (hostRect?.left ?? 0),
        y: event.clientY - (hostRect?.top ?? 0),
        card: card as KanbanCard | null,
        column,
        swimlane: card?.swimlane ?? null,
      },
    });
    setTimeout(() => {
      if (this.host !== null) focusFirstKanbanMenuItem(this.host);
    });
  }

  closeMenu(): void {
    this.set({ menu: null });
    const back = this.menuReturnFocus;
    this.menuReturnFocus = null;
    if (back !== null && back.isConnected) back.focus();
  }

  onMenuKeydown(event: ReactKeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeMenu();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (this.host !== null) stepKanbanMenuFocus(this.host, event.key);
  }

  /** Move-to targets: every other legal visible column (a menu of real moves). */
  moveTargets(menu: KanbanMenuState): readonly KanbanColumnDef[] {
    const card = menu.card;
    const view = this.view();
    if (card === null || !view.canUpdate) return [];
    return kanbanMoveTargets(view.columns, card.column);
  }

  menuEdit(): void {
    const state = this.st.menu;
    this.closeMenu();
    if (state?.card != null) this.editCard(state.card as KanbanCard<T>);
  }

  menuDelete(): void {
    const state = this.st.menu;
    this.closeMenu();
    if (state?.card != null) this.deleteItem(state.card.source as T);
  }

  menuMoveTo(columnKey: string): void {
    const state = this.st.menu;
    this.closeMenu();
    if (state?.card != null) this.moveCard(state.card.key, columnKey);
  }

  menuAddCard(): void {
    const state = this.st.menu;
    this.closeMenu();
    if (state?.column != null) {
      this.openNewCard(state.column.key, state.swimlane);
    }
  }

  menuToggleColumn(): void {
    const state = this.st.menu;
    this.closeMenu();
    if (state?.column != null) this.toggleColumn(state.column.key);
  }

  // ---------------- editor dialog ----------------

  /** The dialog's default items (what `onCardEditDialogShowing` is handed). */
  defaultItems(): OgeFormItemDefinition[] {
    return buildKanbanEditorItems(this.view().msg.dialog, this.editorChoices());
  }

  editCard(card: KanbanCard<T>): void {
    if (!this.view().canUpdate) return;
    this.openEditor(kanbanEditorModelFrom(card), card.source, false);
  }

  openNewCard(column: string, swimlane: string | null): void {
    if (!this.view().canAdd) return;
    this.openEditor(newKanbanEditorModel(column, swimlane), null, true);
  }

  closeDialog(): void {
    if (!this.st.dialog.opened) return;
    this.set({ dialog: { ...this.st.dialog, opened: false } });
    this.editedSource = null;
    this.props.onCardEditDialogHidden?.();
  }

  private openEditor(
    model: KanbanEditorModel,
    source: T | null,
    isNew: boolean,
  ): void {
    const event: OgeKanbanEditDialogShowingEvent<T> = {
      card: source,
      isNew,
      column: model.column,
      formItems: [...(this.props.dialogItems ?? this.defaultItems())],
      cancel: false,
    };
    this.props.onCardEditDialogShowing?.(event);
    if (event.cancel) return;
    this.editedSource = source;
    this.set({
      dialog: {
        opened: true,
        isNew,
        model: { ...model },
        items: event.formItems,
      },
    });
  }

  onDialogModelChange(model: KanbanEditorModel): void {
    this.set({ dialog: { ...this.st.dialog, model } });
  }

  onDialogOpenedChange(opened: boolean): void {
    // the modal's own closes (Escape, ✕, backdrop) only close it — exactly
    // the Angular dialog's `[(opened)]` binding
    this.set({ dialog: { ...this.st.dialog, opened } });
  }

  onEditorSaved(model: KanbanEditorModel, isNew: boolean): void {
    this.set({ dialog: { ...this.st.dialog, opened: false } });
    this.props.onCardEditDialogHidden?.();
    const view = this.view();
    const mapped = this.mapped(view);
    if (isNew) {
      const base = newKanbanItemBase<T>(view.fields, ++this.newKeyCounter);
      const item = buildKanbanItem(model, base, view.fields, mapped);
      this.insertItem(item, model.column, model.swimlane);
      return;
    }
    if (this.editedSource !== null) {
      const updated = buildKanbanItem(
        model,
        this.editedSource,
        view.fields,
        mapped,
      );
      this.updateItem(this.editedSource, updated);
      this.editedSource = null;
    }
  }

  onEditorDelete(): void {
    this.set({ dialog: { ...this.st.dialog, opened: false } });
    this.props.onCardEditDialogHidden?.();
    if (this.editedSource !== null) {
      this.deleteItem(this.editedSource);
      this.editedSource = null;
    }
  }

  onEditorCancelled(): void {
    this.set({ dialog: { ...this.st.dialog, opened: false } });
    this.editedSource = null;
    this.props.onCardEditDialogHidden?.();
  }

  // ---------------- history ----------------

  canUndo(): boolean {
    return this.history.canUndo;
  }

  canRedo(): boolean {
    return this.history.canRedo;
  }

  /** Reverts the last change by replaying its inverse through the pipelines. */
  undo(): void {
    const ops = this.history.undo();
    if (ops === null) return;
    this.replayOps(ops);
    this.set({ announcement: this.view().msg.announcements.undone });
  }

  /** Re-applies the last undone change. */
  redo(): void {
    const ops = this.history.redo();
    if (ops === null) return;
    this.replayOps(ops);
    this.set({ announcement: this.view().msg.announcements.redone });
  }

  /** Keeps the history depth in step with the `undoLimit` prop. */
  syncUndoLimit(): void {
    this.history.setLimit(this.props.undoLimit ?? KANBAN_DEFAULT_UNDO_LIMIT);
  }

  private record(op: KanbanHistoryOp<T>): void {
    this.history.record(op);
  }

  private replayOps(ops: readonly KanbanHistoryOp<T>[]): void {
    this.history.replay(() => {
      for (const op of ops) {
        switch (op.kind) {
          case 'insert': {
            const fields = this.view().fields;
            this.insertItem(
              op.item,
              String(fields.column(op.item) ?? ''),
              fields.swimlane
                ? ((fields.swimlane(op.item) as string | undefined) ?? null)
                : null,
              op.index,
              true,
            );
            break;
          }
          case 'remove': {
            const item = this.itemByKey(op.key);
            if (item !== undefined) this.deleteItem(item, true);
            break;
          }
          case 'update': {
            const item = this.itemByKey(op.key);
            if (item !== undefined) this.updateItem(item, op.after, true);
            break;
          }
          case 'move':
            this.moveOne(op.key, op.to.column, op.to.index, op.to.swimlane, {
              announce: false,
              focus: true,
              force: true,
            });
            break;
        }
      }
    });
    this.set({});
  }

  private itemByKey(key: unknown): T | undefined {
    const fields = this.view().fields;
    return this.st.items.find((item) => Object.is(fields.key(item), key));
  }

  onHostKeydown(event: ReactKeyboardEvent<HTMLElement>): void {
    if (event.defaultPrevented || isKanbanEditingTarget(event.target)) return;
    const shortcut = kanbanHistoryShortcut(event);
    if (shortcut === null || (this.props.undoLimit ?? 1) === 0) return;
    event.preventDefault();
    if (shortcut === 'undo') this.undo();
    else this.redo();
  }

  // ---------------- CRUD executor ----------------

  addCard(item: T): void {
    const fields = this.view().fields;
    const column = String(fields.column(item) ?? '');
    const swimlane = fields.swimlane
      ? ((fields.swimlane(item) as string | undefined) ?? null)
      : null;
    this.insertItem(item, column, swimlane);
  }

  private insertItem(
    item: T,
    column: string,
    swimlane: string | null,
    index?: number,
    force = false,
  ): void {
    const view = this.view();
    if (!force && !view.canAdd) return;
    const event: OgeKanbanCardAddingEvent<T> = {
      card: item,
      column,
      swimlane,
      cancel: false,
    };
    this.props.onCardAdding?.(event);
    if (event.cancel) return;
    const items = [...this.st.items];
    const at =
      index === undefined
        ? items.length
        : Math.min(Math.max(index, 0), items.length);
    items.splice(at, 0, item);
    this.record({ kind: 'insert', key: view.fields.key(item), item, index: at });
    this.set({ items });
    this.props.onCardAdded?.({ card: item, column, swimlane });
    this.announce(view.msg.announcements.cardCreated, {
      title: String(view.fields.title(item) ?? ''),
    });
  }

  updateCard(original: T, updated: T): void {
    this.updateItem(original, updated);
  }

  private updateItem(original: T, updated: T, force = false): void {
    const view = this.view();
    if (!force && !view.canUpdate) return;
    const event: OgeKanbanCardUpdatingEvent<T> = {
      oldData: original,
      newData: updated,
      cancel: false,
    };
    this.props.onCardUpdating?.(event);
    if (event.cancel) return;
    this.record({
      kind: 'update',
      key: view.fields.key(updated),
      before: original,
      after: updated,
    });
    this.set({
      items: this.st.items.map((entry) =>
        entry === original ? updated : entry,
      ),
    });
    this.props.onCardUpdated?.({ oldData: original, newData: updated });
    this.announce(view.msg.announcements.cardUpdated, {
      title: String(view.fields.title(updated) ?? ''),
    });
  }

  deleteCard(item: T): void {
    this.deleteItem(item);
  }

  /** Deletes several items as one undoable step (each through `onCardDeleting`). */
  deleteCards(items: readonly T[]): void {
    if (!this.view().canDelete) return;
    let deleted = 0;
    this.history.transaction(() => {
      for (const item of items) if (this.deleteItem(item)) deleted++;
    });
    this.set({});
    if (deleted > 1) {
      this.announce(
        this.view().msg.announcements.cardsDeleted,
        { count: deleted },
        true,
      );
    }
  }

  private deleteItem(item: T, force = false): boolean {
    const view = this.view();
    if (!force && !view.canDelete) return false;
    const event: OgeKanbanCardDeletingEvent<T> = { card: item, cancel: false };
    this.props.onCardDeleting?.(event);
    if (event.cancel) return false;
    const index = this.st.items.indexOf(item);
    this.record({ kind: 'remove', key: view.fields.key(item), item, index });
    this.set({ items: this.st.items.filter((entry) => entry !== item) });
    this.props.onCardDeleted?.({ card: item });
    this.announce(view.msg.announcements.cardDeleted, {
      title: String(view.fields.title(item) ?? ''),
    });
    return true;
  }

  moveCard(
    key: unknown,
    toColumn: string,
    toIndex?: number,
    toSwimlane?: string | null,
  ): void {
    this.moveOne(key, toColumn, toIndex, toSwimlane, {
      announce: true,
      focus: true,
      force: false,
    });
  }

  /**
   * Moves several cards (board order kept) into one cell as one undoable
   * step, inserted before the card now at `toIndex` (append when unset);
   * without `toSwimlane` every card stays in its own lane.
   */
  moveCards(
    keys: readonly unknown[],
    toColumn: string,
    toIndex?: number,
    toSwimlane?: string | null,
    excludeKey?: unknown,
  ): void {
    const start = this.view();
    if (!start.canUpdate && !start.canDrag) return;
    const ordered = kanbanOrderKeys(start.lanes, keys);
    if (ordered.length === 0) return;
    const cellOf = (lane: string | null) =>
      this.view()
        .lanes.find((entry) => entry.key === lane)
        ?.columns.find((entry) => entry.column.key === toColumn);
    const anchors = new Map<string | null, unknown>();
    const anchorFor = (lane: string | null): unknown => {
      if (!anchors.has(lane)) {
        const cell = cellOf(lane);
        anchors.set(
          lane,
          toIndex === undefined || cell === undefined
            ? null
            : kanbanMultiMoveAnchor(cell.cards, toIndex, ordered, excludeKey),
        );
      }
      return anchors.get(lane);
    };
    let moved = 0;
    this.history.transaction(() => {
      for (const key of ordered) {
        const lanes = this.view().lanes;
        const position = findKanbanCard(lanes, key);
        if (position === null) continue;
        const lane =
          toSwimlane !== undefined ? toSwimlane : lanes[position.laneIndex].key;
        const cell = cellOf(lane);
        const index =
          cell === undefined
            ? undefined
            : kanbanAnchorIndex(cell.cards, anchorFor(lane), key);
        if (
          this.moveOne(key, toColumn, index, lane, {
            announce: false,
            focus: false,
            force: false,
          })
        ) {
          moved++;
        }
      }
    });
    const view = this.view();
    const column = view.columns.find((entry) => entry.key === toColumn);
    if (moved > 0) {
      this.announce(
        view.msg.announcements.cardsMoved,
        {
          count: moved,
          column: column !== undefined ? kanbanColumnTitle(column) : toColumn,
        },
        true,
      );
    }
    const primary = ordered.includes(excludeKey) ? excludeKey : ordered[0];
    const position = findKanbanCard(view.lanes, primary);
    if (position !== null) {
      const card =
        view.lanes[position.laneIndex].columns[position.columnIndex].cards[
          position.cardIndex
        ];
      this.set({ focusedCardKey: card.key });
      this.scrollCardIntoView(card);
      this.set({ pendingFocusKey: String(card.key) });
    }
  }

  private moveOne(
    key: unknown,
    toColumn: string,
    toIndex: number | undefined,
    toSwimlane: string | null | undefined,
    options: { announce: boolean; focus: boolean; force: boolean },
  ): boolean {
    const view = this.view();
    if (!options.force && !view.canUpdate && !view.canDrag) return false;
    const plan = planKanbanMove(view.lanes, key, toColumn, toIndex, toSwimlane);
    if (plan === null) return false;
    const { card } = plan;
    const event: OgeKanbanCardMovingEvent<T> = {
      card: card.source,
      fromColumn: card.column,
      toColumn,
      fromIndex: plan.fromIndex,
      toIndex: plan.toIndex,
      fromSwimlane: card.swimlane,
      toSwimlane: plan.toSwimlane,
      cancel: false,
    };
    this.props.onCardMoving?.(event);
    if (event.cancel) return false;
    const { store, moved } = commitKanbanMove(
      this.st.items,
      plan,
      view.fields,
      {
        hasSwimlanes: view.hasSwimlanes,
        hasOrder: this.props.orderExpr !== undefined,
      },
    );
    this.record({
      kind: 'move',
      key,
      from: {
        column: card.column,
        index: plan.fromIndex,
        swimlane: view.hasSwimlanes ? card.swimlane : null,
      },
      to: { column: toColumn, index: plan.toIndex, swimlane: plan.toSwimlane },
    });
    this.set({ items: store });
    this.props.onCardMoved?.({
      card: moved,
      fromColumn: card.column,
      toColumn,
      fromIndex: plan.fromIndex,
      toIndex: plan.toIndex,
      fromSwimlane: card.swimlane,
      toSwimlane: plan.toSwimlane,
    });
    if (options.announce) {
      const column = view.columns.find((entry) => entry.key === toColumn);
      this.announce(view.msg.announcements.cardMoved, {
        title: card.title,
        column: column !== undefined ? kanbanColumnTitle(column) : toColumn,
        position: String(plan.toIndex + 1),
        count: String(plan.cellCards.length + 1),
      });
    }
    if (options.focus) this.focusCard({ ...card, column: toColumn });
    return true;
  }

  /** Whether an interactive move may land a card from one column in another. */
  isLegalTarget(fromKey: string, toKey: string): boolean {
    return isKanbanLegalTarget(this.view().columns, fromKey, toKey);
  }

  // ---------------- cross-board transfer ----------------

  /** `boardId`, else a stable per-instance fallback. */
  resolvedBoardId(): string {
    const id = this.props.boardId;
    if (id !== undefined) return id;
    this.fallbackBoardId ??= nextKanbanBoardId();
    return this.fallbackBoardId;
  }

  transferCards(
    keys: readonly unknown[],
    toBoard: string,
    toColumn?: string,
    toIndex?: number,
    toSwimlane?: string | null,
  ): boolean {
    const peer = this.peerBoards().find((entry) => entry.id === toBoard);
    if (peer === undefined) return false;
    const column =
      toColumn ??
      peer.columns().find((entry) => entry.allowDrop !== false)?.key;
    if (column === undefined) return false;
    return this.transferTo(peer, keys, null, {
      lane: toSwimlane ?? null,
      column,
      index: toIndex ?? Number.MAX_SAFE_INTEGER,
    });
  }

  private transferTo(
    peer: KanbanBoardPeer,
    keys: readonly unknown[],
    drag: KanbanDragState<T> | null,
    target: KanbanDragTarget,
  ): boolean {
    const view = this.view();
    if (!view.canDrag && !view.canUpdate) return false;
    const cards: KanbanCard<T>[] = [];
    for (const key of kanbanOrderKeys(view.lanes, keys)) {
      const position = findKanbanCard(view.lanes, key);
      if (position === null) continue;
      cards.push(
        view.lanes[position.laneIndex].columns[position.columnIndex].cards[
          position.cardIndex
        ],
      );
    }
    if (cards.length === 0) return false;
    const lead = drag?.card ?? cards[0];
    const transfer: KanbanTransfer<T> = {
      items: cards.map((card) => card.source),
      cards,
      fromBoard: this.resolvedBoardId(),
      fromColumn: lead.column,
      fromSwimlane: lead.swimlane,
      target,
    };
    const result = peer.receive(transfer as KanbanTransfer<unknown>);
    if (result === null) return false;
    const sources = new Set<T>(transfer.items);
    this.set({ items: this.st.items.filter((entry) => !sources.has(entry)) });
    this.clearSelection();
    this.props.onCardTransferred?.(this.transferEvent(transfer, result));
    this.announce(
      this.view().msg.announcements.cardsTransferred,
      { count: cards.length, board: result.toBoard, column: result.toColumn },
      true,
    );
    return true;
  }

  private transferEvent(
    transfer: KanbanTransfer<T>,
    result: KanbanTransferResult,
  ): OgeKanbanCardTransferredEvent<T> {
    return {
      cards: result.items as readonly T[],
      sourceCards: transfer.items,
      fromBoard: transfer.fromBoard,
      toBoard: result.toBoard,
      fromColumn: transfer.fromColumn,
      toColumn: result.toColumn,
      fromSwimlane: transfer.fromSwimlane,
      toSwimlane: result.toSwimlane,
      toIndex: result.toIndex,
    };
  }

  /** This board as the other boards of its `dragGroup` see it. */
  private createPeer(): KanbanBoardPeer {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const board = this;
    return {
      get id() {
        return board.resolvedBoardId();
      },
      get group() {
        return board.props.dragGroup ?? '';
      },
      get host() {
        return board.host as HTMLElement;
      },
      targetAt: (x, y) => {
        if (this.host === null) return null;
        this.incomingGeometry ??= measureKanbanDragGeometry(this.host);
        const view = this.view();
        return resolveKanbanDragTarget(
          this.incomingGeometry,
          x,
          y,
          null,
          view.lanes,
          view.columns,
          view.cardHeight + KANBAN_CARD_GAP,
        );
      },
      preview: (target) => {
        if (target === null) this.incomingGeometry = null;
        if (this.st.incomingTarget !== target) {
          this.set({ incomingTarget: target });
        }
      },
      receive: (transfer) =>
        this.receiveTransfer(transfer as KanbanTransfer<T>),
      columns: () => this.view().columns,
    };
  }

  private receiveTransfer(
    transfer: KanbanTransfer<T>,
  ): KanbanTransferResult | null {
    this.incomingGeometry = null;
    this.set({ incomingTarget: null });
    if (this.props.readOnly ?? false) return null;
    const view = this.view();
    const target = transfer.target;
    const column = view.columns.find((entry) => entry.key === target.column);
    if (column === undefined || column.allowDrop === false) return null;
    const lane = view.hasSwimlanes ? target.lane : null;
    const cellCards =
      view.lanes
        .find((entry) => entry.key === lane)
        ?.columns.find((entry) => entry.column.key === target.column)?.cards ??
      [];
    const toIndex = Math.min(target.index, cellCards.length);
    const event: OgeKanbanCardTransferringEvent<T> = {
      cards: transfer.items,
      fromBoard: transfer.fromBoard,
      toBoard: this.resolvedBoardId(),
      fromColumn: transfer.fromColumn,
      toColumn: target.column,
      fromSwimlane: transfer.fromSwimlane,
      toSwimlane: lane,
      toIndex,
      cancel: false,
    };
    this.props.onCardTransferring?.(event);
    if (event.cancel) return null;
    const fields = view.fields;
    const names = fields.fieldNames;
    const landed = transfer.items.map((item) => {
      let next = item;
      if (names.column !== null) {
        next = withFieldValue(next, names.column, target.column);
      }
      if (lane !== null && names.swimlane !== null) {
        next = withFieldValue(next, names.swimlane, lane);
      }
      return next;
    });
    const anchor = cellCards[toIndex]?.key ?? null;
    this.set({ items: [...this.st.items, ...landed] });
    // silent positioning, outside the history (a transfer spans two boards)
    this.history.replay(() => {
      for (const item of landed) {
        const key = fields.key(item);
        const lanes = this.view().lanes;
        const cell = lanes
          .find((entry) => entry.key === lane)
          ?.columns.find((entry) => entry.column.key === target.column);
        if (cell === undefined) continue;
        const index = kanbanAnchorIndex(cell.cards, anchor, key);
        const plan = planKanbanMove(lanes, key, target.column, index, lane);
        if (plan === null) continue;
        this.set({
          items: commitKanbanMove(this.st.items, plan, fields, {
            hasSwimlanes: view.hasSwimlanes,
            hasOrder: this.props.orderExpr !== undefined,
          }).store,
        });
      }
    });
    const landedKeys = landed.map((item) => fields.key(item));
    const items = landedKeys
      .map((key) => this.itemByKey(key))
      .filter((item): item is T => item !== undefined);
    const result: KanbanTransferResult = {
      items,
      toBoard: this.resolvedBoardId(),
      toColumn: target.column,
      toSwimlane: lane,
      toIndex,
    };
    this.selectCards(landedKeys);
    this.props.onCardTransferred?.(this.transferEvent(transfer, result));
    this.announce(
      view.msg.announcements.cardsTransferred,
      {
        count: items.length,
        board: result.toBoard,
        column: kanbanColumnTitle(column),
      },
      true,
    );
    return result;
  }

  // ---------------- filter chips ----------------

  toggleChip(kind: OgeKanbanFilterChipKind, value: string): void {
    this.setFilterValue(toggleKanbanFilterChip(this.filterValue, kind, value));
  }

  clearFilters(): void {
    this.setFilterValue({});
  }

  // ---------------- quick add, inline title, checklist ----------------

  isQuickAddOpen(lane: string | null, column: string): boolean {
    return this.st.quickAddCell === kanbanCellKey(lane, column);
  }

  /** The column footer's add button: the composer, or the dialog. */
  onFooterAdd(column: KanbanColumnDef, lane: string | null): void {
    if (!(this.props.quickAdd ?? false)) {
      this.openNewCard(column.key, lane);
      return;
    }
    this.set({ quickAddText: '', quickAddCell: kanbanCellKey(lane, column.key) });
    setTimeout(() =>
      this.host
        ?.querySelector<HTMLInputElement>('.oge-kanban-quick-add-input')
        ?.focus(),
    );
  }

  onQuickAddInput(value: string): void {
    this.set({ quickAddText: value });
  }

  onQuickAddKeydown(
    event: ReactKeyboardEvent<HTMLInputElement>,
    column: KanbanColumnDef,
    lane: string | null,
  ): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitQuickAdd(column, lane, true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.set({ quickAddCell: null, quickAddText: '' });
      setTimeout(() =>
        this.host
          ?.querySelector<HTMLElement>(
            `.oge-kanban-cards[data-lane="${kanbanCssEscape(lane ?? '')}"][data-col="${kanbanCssEscape(column.key)}"] ~ .oge-kanban-add-card`,
          )
          ?.focus(),
      );
    }
  }

  onQuickAddBlur(column: KanbanColumnDef, lane: string | null): void {
    // a commit/escape that closed the composer unmounts the input; React may
    // still report its blur, which must not commit a second time
    if (!this.isQuickAddOpen(lane, column.key)) return;
    this.commitQuickAdd(column, lane, false);
  }

  private commitQuickAdd(
    column: KanbanColumnDef,
    lane: string | null,
    keepOpen: boolean,
  ): void {
    const view = this.view();
    const swimlane = view.hasSwimlanes ? lane : null;
    const item = kanbanQuickAddItem<T>(
      this.st.quickAddText,
      column.key,
      swimlane,
      view.fields,
      ++this.newKeyCounter,
    );
    if (item !== null) this.insertItem(item, column.key, swimlane);
    if (!keepOpen || item === null) {
      this.set({ quickAddText: '', quickAddCell: null });
    } else {
      this.set({ quickAddText: '' });
      setTimeout(() =>
        this.host
          ?.querySelector<HTMLInputElement>('.oge-kanban-quick-add-input')
          ?.focus(),
      );
    }
  }

  startTitleEdit(key: unknown): void {
    const view = this.view();
    if (!view.canEditTitle) return;
    if (findKanbanCard(view.lanes, key) === null) return;
    this.set({ editingTitleKey: key });
    setTimeout(() => {
      const input = this.host?.querySelector<HTMLInputElement>(
        '.oge-kanban-card-title-input',
      );
      input?.focus();
      input?.select();
    });
  }

  onTitleEditKeydown(
    event: ReactKeyboardEvent<HTMLInputElement>,
    card: KanbanCard<T>,
  ): void {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitTitleEdit(card, event.currentTarget.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.set({ editingTitleKey: null, pendingFocusKey: String(card.key) });
    }
  }

  onTitleEditBlur(
    event: ReactFocusEvent<HTMLInputElement>,
    card: KanbanCard<T>,
  ): void {
    if (!Object.is(this.st.editingTitleKey, card.key)) return;
    this.commitTitleEdit(card, event.currentTarget.value, false);
  }

  private commitTitleEdit(
    card: KanbanCard<T>,
    value: string,
    refocus = true,
  ): void {
    this.set({ editingTitleKey: null });
    const updated = kanbanTitleUpdate(card, value, this.view().fields);
    if (updated !== null) this.updateItem(card.source, updated);
    if (refocus) this.set({ pendingFocusKey: String(card.key) });
  }

  toggleChecklistItem(key: unknown, index: number): void {
    const view = this.view();
    const card = view.allCards.find((entry) => Object.is(entry.key, key));
    if (card === undefined) return;
    const updated = kanbanChecklistToggle(card, index, view.fields);
    if (updated !== null) this.updateItem(card.source, updated);
  }

  // ---------------- export ----------------

  getExportData(options: OgeKanbanExportOptions = {}): OgeKanbanExportData {
    const view = this.view();
    const lanes = options.visibleOnly
      ? view.lanes
      : sortKanbanLanes(
          groupBoard(view.allCards, view.columns, view.hasSwimlanes),
          view.columnSort,
          view.locale,
          this.props.priorityOrder,
        );
    return {
      rows: buildKanbanExportRows(lanes, view.columns),
      messages: view.msg.export,
      locale: view.locale,
      hasSwimlanes: view.hasSwimlanes,
    };
  }

  exportToCsv(
    fileName = 'kanban.csv',
    options: OgeKanbanExportOptions = {},
  ): string {
    const csv = buildKanbanCsv(this.getExportData(options));
    downloadKanbanText(csv, fileName);
    return csv;
  }

  // ---------------- announcements ----------------

  private announce(
    template: string,
    tokens: Readonly<Record<string, string | number>>,
    icu = false,
  ): void {
    const text = icu
      ? formatKanbanCount(template, tokens, this.view().locale)
      : formatKanbanMessage(
          template,
          Object.fromEntries(
            Object.entries(tokens).map(([name, value]) => [name, String(value)]),
          ),
        );
    this.set({ announcement: text });
  }
}
