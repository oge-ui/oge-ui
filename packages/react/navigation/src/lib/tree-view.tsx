'use client';

import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  beginOgeTreeDrag,
  buildTreeViewModel,
  createTypeAheadBuffer,
  fillTreeViewMessages,
  isTreeEditKey,
  nextTreeChildPage,
  nextTreeExpansion,
  nextTreeSelection,
  ogeTreeCancelCut,
  ogeTreeCut,
  ogeTreeDragGroupOf,
  ogeTreeHasCut,
  ogeTreePaste,
  planTreeEditKey,
  planTreeTransferKey,
  planTreeViewKey,
  registerOgeTreeDragPeer,
  resolveSelectedKeys,
  resolveTreeChildPageSize,
  resolveTreeItemHeight,
  resolveTreeSelectByClick,
  runTreeEditCommit,
  runTreeEditStart,
  treeAriaChecked,
  treeAriaSelected,
  treeCanDrop,
  treeCheckStates,
  treeChildPageLimit,
  treeChildrenLoadNeeded,
  treeEdgeIndex,
  treeEffectiveExpanded,
  treeLoadMoreText,
  treeNodeIndent,
  treeRangeSelection,
  treeSelectAllState,
  OGE_TREE_TRANSFER_SHORTCUTS,
  type CheckState,
  type OgePointerGestureHandle,
  type OgeTreeAllowEditing,
  type OgeTreeChildPageEvent,
  type OgeTreeDragPeer,
  type OgeTreeEditedEvent,
  type OgeTreeEditingEvent,
  type OgeTreeEditStartingEvent,
  type OgeTreeEditValidator,
  type OgeTreeTransferredEvent,
  type OgeTreeViewResolvedMessages,
  type OgeTreeChildrenFailedEvent,
  type OgeTreeChildrenLoadedEvent,
  type OgeTreeCheckBoxesMode,
  type OgeTreeCollapsedEvent,
  type OgeTreeCollapsingEvent,
  type OgeTreeDataStructure,
  type OgeTreeDropPosition,
  type OgeTreeExpandEvent,
  type OgeTreeExpandedEvent,
  type OgeTreeExpandingEvent,
  type OgeTreeExpr,
  type OgeTreeItemClickEvent,
  type OgeTreeItemSelectionChangedEvent,
  type OgeTreeLoadChildren,
  type OgeTreeLoadState,
  type OgeTreeReorderedEvent,
  type OgeTreeReorderingEvent,
  type OgeTreeSearchMode,
  type OgeTreeSelectAllChangedEvent,
  type OgeTreeSelectedKeysMode,
  type OgeTreeSelectionChangedEvent,
  type OgeTreeSelectionChangingEvent,
  type OgeTreeSelectionMode,
  type OgeTreeSize,
  type OgeTreeViewMessages,
  type OgeTreeViewNode,
  type OgeTreeVirtualScrollOptions,
  type RowKey,
  type SearchHighlightSegment,
  type TreeFilterMode,
} from '@oge-ui/behavior';
import { useOgeLiveAnnouncer } from '@oge-ui/react-overlay';
import { useOgeTreeViewConfig } from './navigation-config';
import { useTreeVirtualizer } from './use-tree-virtualizer';

/** Context handed to `renderItem` — the React face of `ogeTreeItemTemplate`. */
export interface OgeTreeItemRenderContext<T> {
  item: T;
  key: RowKey;
  level: number;
  expanded: boolean;
  selected: boolean;
  checkState: CheckState;
  hasChildren: boolean;
  /** Display text with `<mark>` around search matches, `null` when unmatched. */
  /**
   * Search-match runs of `text`, or `null` when nothing matched — rendered as
   * real `<mark>` elements, so the tree needs no `dangerouslySetInnerHTML`.
   */
  highlighted: readonly SearchHighlightSegment[] | null;
}

/** Context handed to `renderExpandIcon`. */
export interface OgeTreeExpandIconRenderContext<T> {
  expanded: boolean;
  item: T;
  key: RowKey;
  /** `true` while this node's lazy children are loading. */
  loading: boolean;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeTreeViewHandle {
  /** Whether the node with this key is expanded. */
  isExpanded(key: RowKey): boolean;
  /** Whether the node with this key is selected. */
  isSelected(key: RowKey): boolean;
  /** Selected keys under a projection, defaulting to `selectedKeysMode`. */
  getSelectedKeys(mode?: OgeTreeSelectedKeysMode): RowKey[];
  /**
   * Expands a node. Resolves `true` once it expanded, `false` if the node is
   * unknown, disabled, or `onItemExpanding` vetoed it. With a `loadChildren`
   * the promise also awaits the child fetch.
   */
  expand(key: RowKey): Promise<boolean>;
  /** Collapses a node; resolves whether it actually collapsed. */
  collapse(key: RowKey): Promise<boolean>;
  /** Expands the node if collapsed, collapses it otherwise. */
  toggle(key: RowKey): Promise<boolean>;
  /** Expands every node that has loaded children. */
  expandAll(): void;
  /** Collapses every node. */
  collapseAll(): void;
  /** Selects every node (cascading when `selectNodesRecursive` is on). */
  selectAll(): void;
  /** Clears the selection. */
  unselectAll(): void;
  /** Selects one node. */
  select(key: RowKey): void;
  /** Deselects one node. */
  unselect(key: RowKey): void;
  /** Focuses a node's row, or the first enabled one. */
  focus(key?: RowKey): void;
  /** Scrolls a node into view, virtualized or not. */
  scrollToItem(key: RowKey): void;
  /**
   * Opens the label editor on a node (what F2 does). Returns `false` when
   * editing is off for it or `onItemEditStarting` vetoed.
   */
  editItem(key: RowKey): boolean;
  /** Closes an open label editor without committing. */
  cancelEdit(): void;
  /**
   * Reveals the next `childPageSize` children of a paged parent (`null` for
   * the root level) — what activating its "Load more" row does.
   */
  showMoreChildren(parentKey: RowKey | null): void;
  /**
   * Marks a node for a keyboard move (what Ctrl+X does); `pasteItem` on any
   * tree of the same `dragGroup` moves it. Wire both to buttons or a context
   * menu for a single-pointer path. Requires `allowDragging`.
   */
  cutItem(key: RowKey): boolean;
  /**
   * Moves the cut node of this tree's group onto `targetKey` through the
   * same pipeline as a drop (`onItemReordering` → `onItemReordered` →
   * `onItemTransferred`). `position` defaults to `inside` (`after` when
   * `allowDropInside` is off).
   */
  pasteItem(targetKey: RowKey, position?: OgeTreeDropPosition): boolean;
}

export interface OgeTreeViewProps<T extends object = Record<string, unknown>> {
  /** Nodes to display — a flat parent-referencing list or nested children. */
  items?: readonly T[];
  /** Field holding a node's stable key. */
  keyExpr?: OgeTreeExpr<T, RowKey>;
  /** Field holding a node's parent key (flat data). */
  parentIdExpr?: OgeTreeExpr<T>;
  /** Field holding a node's nested children (hierarchical data). */
  itemsExpr?: OgeTreeExpr<T, readonly T[] | undefined>;
  /** Field holding the display text. */
  displayExpr?: OgeTreeExpr<T>;
  /** Field marking a node disabled. */
  disabledExpr?: OgeTreeExpr<T>;
  /** Field hinting that a node has children that are not loaded yet. */
  hasItemsExpr?: OgeTreeExpr<T>;
  /** Field holding SVG path data (`d`) for a per-node icon. */
  iconExpr?: OgeTreeExpr<T>;
  /** Parent value that marks root nodes in flat data. */
  rootValue?: unknown;
  /** `plain` for flat data, `tree` for nested; inferred from `itemsExpr`. */
  dataStructure?: OgeTreeDataStructure;

  /** Keys of the expanded nodes — controlled when provided. */
  expandedKeys?: readonly RowKey[];
  defaultExpandedKeys?: readonly RowKey[];
  onExpandedKeysChange?: (keys: readonly RowKey[]) => void;
  /** Selected keys, projected by `selectedKeysMode` — controlled when provided. */
  selectedKeys?: readonly RowKey[];
  defaultSelectedKeys?: readonly RowKey[];
  onSelectedKeysChange?: (keys: readonly RowKey[]) => void;
  /** Key of the node holding the roving tabindex — controlled when provided. */
  focusedKey?: RowKey;
  defaultFocusedKey?: RowKey;
  onFocusedKeyChange?: (key: RowKey | undefined) => void;
  /** Current search text — controlled when provided. */
  searchValue?: string;
  defaultSearchValue?: string;
  onSearchValueChange?: (value: string) => void;

  /** How nodes may be selected. */
  selectionMode?: OgeTreeSelectionMode;
  /**
   * Selects a node when its row is clicked, rather than only its checkbox.
   * `undefined` (the default) resolves to `true` without checkboxes and
   * `false` with them — otherwise clicking a label would silently tick the
   * box next to it, which is why the references ship `selectByClick: false`.
   */
  selectByClick?: boolean;
  /** Cascades selection down to descendants and up to fully-selected parents. */
  selectNodesRecursive?: boolean;
  /** Checkbox column: hidden, per node, or per node plus a "select all" row. */
  showCheckBoxes?: OgeTreeCheckBoxesMode;
  /** Projection applied to `selectedKeys` on the way out. */
  selectedKeysMode?: OgeTreeSelectedKeysMode;

  /** Which gesture expands a node. */
  expandEvent?: OgeTreeExpandEvent;
  /** Expanding a node also expands its ancestors. */
  expandNodesRecursive?: boolean;
  /** Enables the APG `*` shortcut, which expands every sibling at the level. */
  allowExpandAll?: boolean;

  /** Renders the built-in search box above the tree. */
  searchEnabled?: boolean;
  /** How the search text is compared against the display value. */
  searchMode?: OgeTreeSearchMode;
  /** Extra fields searched alongside `displayExpr`. */
  searchExpr?: OgeTreeExpr<T> | readonly OgeTreeExpr<T>[];
  /** Debounce applied to the built-in search box, in milliseconds. */
  searchTimeout?: number;
  /** Which relatives of a match stay visible. */
  filterMode?: TreeFilterMode;
  /** Auto-expands the ancestors of search matches. */
  expandNodesOnFiltering?: boolean;
  /** Wraps search matches in `<mark class="oge-highlight">`. */
  highlightSearchResults?: boolean;

  /** Loads a node's children the first time it expands. */
  loadChildren?: OgeTreeLoadChildren<T>;

  /** Windowed rendering for large trees; requires a fixed row height. */
  virtualScroll?: boolean | OgeTreeVirtualScrollOptions;
  /** Height of the scroll container (any CSS length). */
  height?: string;

  /** Enables pointer drag reordering. */
  allowDragging?: boolean;
  /** Allows dropping *into* a node (reparenting), not just between siblings. */
  allowDropInside?: boolean;
  /**
   * Trees sharing a group accept each other's nodes — by pointer drag and by
   * the Ctrl+X / Ctrl+V keyboard twin. Both trees need `allowDragging`. The
   * target fires `onItemReordering` / `onItemReordered` (with `sourceTreeId`
   * / `targetTreeId`), the source `onItemTransferred`; neither moves data.
   */
  dragGroup?: string;

  /**
   * Lets users rename nodes in place: F2 (or a double-click with
   * `editOnDblClick`) turns the label into a text field; Enter or blur
   * commits, Escape cancels. `true`, `false`, or a per-item predicate. The
   * tree does not write the label — apply `onItemEdited` to your data.
   */
  allowEditing?: OgeTreeAllowEditing<T>;
  /** A double-click opens the label editor instead of toggling the node. */
  editOnDblClick?: boolean;
  /**
   * Validates an edited label: `true` / `null` accepts, `false` rejects with
   * the catalog's `editInvalid`, a string rejects with that message. A
   * rejected label keeps the editor open.
   */
  validateEdit?: OgeTreeEditValidator<T>;

  /**
   * Children rendered per parent (roots included) before a "Load more" row —
   * Kendo's node page size. `aria-setsize` keeps reporting the real total.
   * `0` / unset renders every child. Paging pauses while searching.
   */
  childPageSize?: number;

  /** Disables the whole component. */
  disabled?: boolean;
  /** Density of the node rows. */
  size?: OgeTreeSize;
  /** Aria label of the tree. */
  ariaLabel?: string;
  /**
   * DOM id put on the inner `role="tree"` element. Set it when an outside
   * control has to reference the tree — a combobox owning this tree as its
   * popup needs `aria-controls` to point here, not at the host.
   */
  treeId?: string;
  /** Per-instance overrides of the context `messages`. */
  messages?: Partial<OgeTreeViewMessages>;

  /** Cancelable pre-event of a node expanding. */
  onItemExpanding?: (event: OgeTreeExpandingEvent<T>) => void;
  /** Fires after a node expanded. */
  onItemExpanded?: (event: OgeTreeExpandedEvent<T>) => void;
  /** Cancelable pre-event of a node collapsing. */
  onItemCollapsing?: (event: OgeTreeCollapsingEvent<T>) => void;
  /** Fires after a node collapsed. */
  onItemCollapsed?: (event: OgeTreeCollapsedEvent<T>) => void;
  /** Cancelable pre-event of a selection change. */
  onSelectionChanging?: (event: OgeTreeSelectionChangingEvent<T>) => void;
  /** Fires after the selection committed. */
  onSelectionChanged?: (event: OgeTreeSelectionChangedEvent<T>) => void;
  /** Fires for the single node whose own selected state flipped. */
  onItemSelectionChanged?: (event: OgeTreeItemSelectionChangedEvent<T>) => void;
  /** Fires when a node row is clicked. */
  onItemClick?: (event: OgeTreeItemClickEvent<T>) => void;
  /** Fires when a node row is double-clicked. */
  onItemDblClick?: (event: OgeTreeItemClickEvent<T>) => void;
  /** Fires after a lazy `loadChildren` resolved. */
  onChildrenLoaded?: (event: OgeTreeChildrenLoadedEvent<T>) => void;
  /** Fires after a lazy `loadChildren` rejected. */
  onChildrenLoadFailed?: (event: OgeTreeChildrenFailedEvent<T>) => void;
  /** Fires when the "select all" row is toggled. */
  onSelectAllChanged?: (event: OgeTreeSelectAllChangedEvent) => void;
  /** Cancelable pre-event of a drag & drop reparent. */
  onItemReordering?: (event: OgeTreeReorderingEvent<T>) => void;
  /** Fires after a drop passed `onItemReordering`; apply it to your own data. */
  onItemReordered?: (event: OgeTreeReorderedEvent<T>) => void;
  /**
   * Fires on the source tree after one of its nodes moved to another tree of
   * the same `dragGroup` — remove it from this tree's data.
   */
  onItemTransferred?: (event: OgeTreeTransferredEvent<T>) => void;
  /** Cancelable pre-event of the label editor opening. */
  onItemEditStarting?: (event: OgeTreeEditStartingEvent<T>) => void;
  /** Cancelable pre-event of an edited label committing. */
  onItemEditing?: (event: OgeTreeEditingEvent<T>) => void;
  /** Fires after a label edit committed; write `value` into your data. */
  onItemEdited?: (event: OgeTreeEditedEvent<T>) => void;
  /** Fires after a "Load more" row revealed the next page of children. */
  onChildPageShown?: (event: OgeTreeChildPageEvent<T>) => void;

  /** Replaces a node's label — the React face of `ogeTreeItemTemplate`. */
  renderItem?: (context: OgeTreeItemRenderContext<T>) => ReactNode;
  /** Replaces the expand chevron. */
  renderExpandIcon?: (context: OgeTreeExpandIconRenderContext<T>) => ReactNode;
  /** Replaces the empty state. */
  renderNoData?: () => ReactNode;

  className?: string;
  style?: CSSProperties;
}

const EMPTY_KEYS: readonly RowKey[] = [];

/**
 * Hierarchical list following the WAI-ARIA APG treeview pattern: a roving
 * tabindex over `role="treeitem"` rows, arrow / Home / End / type-ahead
 * navigation, and `*` to expand a level — the React render of the Angular
 * `<oge-tree-view>`.
 *
 * Data is either a flat parent-referencing array or nested children; both are
 * normalized by `@oge-ui/behavior`'s tree engine, which also supplies the
 * tri-state cascade, the search filter and the lazy-child placeholders — the
 * exact code the Angular component runs.
 *
 * ```tsx
 * <OgeTreeView
 *   items={folders}
 *   keyExpr="id"
 *   parentIdExpr="parentId"
 *   displayExpr="name"
 *   showCheckBoxes="normal"
 *   selectedKeys={picked}
 *   onSelectedKeysChange={setPicked}
 * />
 * ```
 */
export const OgeTreeView = forwardRef(function OgeTreeViewRender<
  T extends object,
>(props: OgeTreeViewProps<T>, ref: React.ForwardedRef<OgeTreeViewHandle>) {
  const {
    items,
    keyExpr = 'id',
    parentIdExpr = 'parentId',
    itemsExpr,
    displayExpr = 'text',
    disabledExpr = 'disabled',
    hasItemsExpr = 'hasItems',
    iconExpr,
    rootValue,
    dataStructure,
    selectionMode = 'none',
    selectNodesRecursive = true,
    showCheckBoxes = 'none',
    selectedKeysMode = 'all',
    expandNodesRecursive = true,
    allowExpandAll = true,
    searchEnabled = false,
    searchMode = 'contains',
    searchExpr,
    searchTimeout = 0,
    filterMode = 'withAncestors',
    expandNodesOnFiltering = true,
    highlightSearchResults = true,
    loadChildren,
    virtualScroll = false,
    height,
    allowDragging = false,
    allowDropInside = true,
    dragGroup,
    allowEditing = false,
    editOnDblClick = false,
    childPageSize,
    disabled = false,
    size = 'md',
    treeId,
    renderItem,
    renderExpandIcon,
    renderNoData,
    className,
    style,
  } = props;

  const config = useOgeTreeViewConfig();
  const expandEvent = props.expandEvent ?? config.expandEvent ?? 'click';
  const uid = `oge-tree-view-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const resolvedTreeId = treeId ?? `${uid}-tree`;

  const messages = useMemo<OgeTreeViewResolvedMessages>(
    () => fillTreeViewMessages({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );
  const announcer = useOgeLiveAnnouncer();

  const scrollElRef = useRef<HTMLDivElement>(null);
  const listElRef = useRef<HTMLDivElement>(null);

  // --- controlled / uncontrolled pairs --------------------------------------

  const [ownExpanded, setOwnExpanded] = useState<ReadonlySet<RowKey>>(
    () => new Set(props.defaultExpandedKeys ?? EMPTY_KEYS),
  );
  const expandedSet = useMemo(
    () =>
      props.expandedKeys !== undefined
        ? new Set<RowKey>(props.expandedKeys)
        : ownExpanded,
    [props.expandedKeys, ownExpanded],
  );

  const [ownSelected, setOwnSelected] = useState<ReadonlySet<RowKey>>(
    () => new Set(props.defaultSelectedKeys ?? EMPTY_KEYS),
  );
  const selectedSet = useMemo(
    () =>
      props.selectedKeys !== undefined
        ? new Set<RowKey>(props.selectedKeys)
        : ownSelected,
    [props.selectedKeys, ownSelected],
  );

  const [ownFocusedKey, setOwnFocusedKey] = useState<RowKey | undefined>(
    props.defaultFocusedKey,
  );
  const focusedKey =
    props.focusedKey !== undefined ? props.focusedKey : ownFocusedKey;

  const focusedKeyRef = useRef(focusedKey);
  focusedKeyRef.current = focusedKey;

  const [ownSearch, setOwnSearch] = useState(props.defaultSearchValue ?? '');
  const searchValue =
    props.searchValue !== undefined ? props.searchValue : ownSearch;

  const [deferred, setDeferred] = useState<ReadonlyMap<RowKey, readonly T[]>>(
    () => new Map(),
  );
  const [loadStates, setLoadStates] = useState<
    ReadonlyMap<RowKey, OgeTreeLoadState>
  >(() => new Map());
  const [debouncedSearch, setDebouncedSearch] = useState(searchValue);
  /** Children revealed so far per parent (`null` = roots) — "Load more". */
  const [pageLimits, setPageLimits] = useState<
    ReadonlyMap<RowKey | null, number>
  >(() => new Map());
  const pageLimitsRef = useRef(pageLimits);
  pageLimitsRef.current = pageLimits;

  // Mutable mirrors of the committed state: the interaction pipeline runs
  // several steps inside one handler (expand → load → select) and must read
  // what the previous step wrote, which React state cannot give it until the
  // next render. Re-synced from the render values on every pass, so a
  // controlled parent that refuses a change wins.
  const expandedRef = useRef(expandedSet);
  expandedRef.current = expandedSet;
  const selectedRef = useRef(selectedSet);
  selectedRef.current = selectedSet;
  const deferredRef = useRef(deferred);
  deferredRef.current = deferred;
  const loadStatesRef = useRef(loadStates);
  loadStatesRef.current = loadStates;

  // --- derived pipeline (all of it shared with the Angular component) --------

  const checkBoxesMode = showCheckBoxes;

  // One call, one pipeline: `@oge-ui/behavior` owns the index, the lazy hint,
  // the search filter, the effective expansion, the tri-state cascade and the
  // flat node list. The tree select's popup runs the same function.
  const model = useMemo(
    () =>
      buildTreeViewModel<T>({
        items: items ?? [],
        keyExpr,
        parentIdExpr,
        itemsExpr,
        displayExpr,
        disabledExpr,
        hasItemsExpr,
        iconExpr,
        rootValue,
        dataStructure,
        deferred,
        loadStates,
        expandedKeys: expandedSet,
        selectedKeys: selectedSet,
        search: debouncedSearch,
        searchMode,
        searchExpr,
        filterMode,
        expandNodesOnFiltering,
        highlightSearchResults,
        selectNodesRecursive,
        showCheckBoxes: checkBoxesMode,
        lazy: !!loadChildren,
        childPageSize,
        pageLimits,
      }),
    [
      items,
      keyExpr,
      parentIdExpr,
      itemsExpr,
      displayExpr,
      disabledExpr,
      hasItemsExpr,
      iconExpr,
      rootValue,
      dataStructure,
      deferred,
      loadStates,
      expandedSet,
      selectedSet,
      debouncedSearch,
      searchMode,
      searchExpr,
      filterMode,
      expandNodesOnFiltering,
      highlightSearchResults,
      selectNodesRecursive,
      checkBoxesMode,
      loadChildren,
      childPageSize,
      pageLimits,
    ],
  );

  const {
    index,
    keyOf,
    nodes,
    expandableKeys,
    filterExpandedKeys,
    checkStates,
    selectAllState,
    loadingAny,
  } = model;

  const selectOnRowClick = resolveTreeSelectByClick(
    props.selectByClick,
    checkBoxesMode,
  );
  const itemHeight = resolveTreeItemHeight(virtualScroll, config.itemHeight);
  const virtualActive = virtualScroll !== false;

  // Everything the imperative pipeline reads: refreshed each render so the
  // handlers never close over a stale pass.
  const latest = useRef({
    props,
    nodes,
    index,
    keyOf,
    expandableKeys,
    filterExpandedKeys,
    selectedKeysMode,
    selectionMode,
    selectNodesRecursive,
    expandNodesRecursive,
    disabled,
    loadChildren,
    allowDropInside,
    allowExpandAll,
    selectOnRowClick,
    expandEvent,
    messages,
    model,
    resolvedTreeId,
    allowDragging,
  });
  latest.current = {
    props,
    nodes,
    index,
    keyOf,
    expandableKeys,
    filterExpandedKeys,
    selectedKeysMode,
    selectionMode,
    selectNodesRecursive,
    expandNodesRecursive,
    disabled,
    loadChildren,
    allowDropInside,
    allowExpandAll,
    selectOnRowClick,
    expandEvent,
    messages,
    model,
    resolvedTreeId,
    allowDragging,
  };

  const virtual = useTreeVirtualizer({
    active: virtualActive,
    itemHeight,
    itemCount: () => latest.current.nodes.length,
    scrollEl: scrollElRef,
  });
  const virtualRef = useRef(virtual);
  virtualRef.current = virtual;

  // --- state writers --------------------------------------------------------

  const setExpanded = useCallback((next: ReadonlySet<RowKey>): void => {
    expandedRef.current = next;
    if (latest.current.props.expandedKeys === undefined) setOwnExpanded(next);
    latest.current.props.onExpandedKeysChange?.([...next]);
  }, []);

  const setFocusedKey = useCallback((key: RowKey | undefined): void => {
    focusedKeyRef.current = key;
    if (latest.current.props.focusedKey === undefined) setOwnFocusedKey(key);
    latest.current.props.onFocusedKeyChange?.(key);
  }, []);

  const setSearchValue = useCallback((value: string): void => {
    if (latest.current.props.searchValue === undefined) setOwnSearch(value);
    latest.current.props.onSearchValueChange?.(value);
  }, []);

  // search debounce — mirrors the Angular effect, including `0` meaning "now"
  useEffect(() => {
    if (searchTimeout <= 0) {
      setDebouncedSearch(searchValue);
      return;
    }
    const timer = setTimeout(
      () => setDebouncedSearch(searchValue),
      searchTimeout,
    );
    return () => clearTimeout(timer);
  }, [searchValue, searchTimeout]);

  // keep the roving tabindex on a node that still exists
  useEffect(() => {
    const usable = nodes.filter((node) => !node.filler);
    if (usable.length === 0) return;
    if (focusedKey !== undefined && usable.some((n) => n.key === focusedKey)) {
      return;
    }
    setFocusedKey(usable.find((n) => !n.disabled)?.key);
  }, [nodes, focusedKey, setFocusedKey]);

  // --- selection pipeline ---------------------------------------------------

  const commitSelection = useCallback(
    (next: ReadonlySet<RowKey>, key?: RowKey, event?: Event): boolean => {
      const view = latest.current;
      const projected = resolveSelectedKeys(
        view.index,
        next,
        view.selectedKeysMode,
      );
      const item = key === undefined ? undefined : view.index.byKey.get(key);
      const changing: OgeTreeSelectionChangingEvent<T> = {
        keys: projected,
        key,
        item,
        event,
        cancel: false,
      };
      view.props.onSelectionChanging?.(changing);
      if (changing.cancel) return false;
      const previous = resolveSelectedKeys(
        view.index,
        selectedRef.current,
        view.selectedKeysMode,
      );
      selectedRef.current = next;
      if (view.props.selectedKeys === undefined) setOwnSelected(next);
      view.props.onSelectedKeysChange?.(projected);
      view.props.onSelectionChanged?.({
        keys: projected,
        previousKeys: previous,
        key,
        item,
        event,
      });
      return true;
    },
    [],
  );

  const setSelected = useCallback(
    (key: RowKey, selected: boolean, event?: Event): void => {
      const view = latest.current;
      const item = view.index.byKey.get(key);
      if (!item) return;
      const next = nextTreeSelection<T>({
        index: view.index,
        selected: selectedRef.current,
        key,
        select: selected,
        selectionMode: view.selectionMode,
        recursive: view.selectNodesRecursive,
      });
      if (commitSelection(next, key, event)) {
        view.props.onItemSelectionChanged?.({ key, item, selected, event });
      }
    },
    [commitSelection],
  );

  const toggleSelection = useCallback(
    (node: OgeTreeViewNode<T>, event?: Event): void => {
      if (latest.current.selectionMode === 'none') return;
      setSelected(node.key, !selectedRef.current.has(node.key), event);
    },
    [setSelected],
  );

  const selectAll = useCallback((): void => {
    commitSelection(new Set<RowKey>(latest.current.index.byKey.keys()));
  }, [commitSelection]);

  const unselectAll = useCallback((): void => {
    commitSelection(new Set<RowKey>());
  }, [commitSelection]);

  // --- expansion pipeline ---------------------------------------------------

  const setLoadState = (key: RowKey, state: OgeTreeLoadState): void => {
    const next = new Map(loadStatesRef.current).set(key, state);
    loadStatesRef.current = next;
    setLoadStates(next);
  };

  /**
   * Single-flight lazy child fetch; the engine renders a `filler` placeholder
   * meanwhile. This deliberately does *not* go through a veto pipeline — there
   * a rejection means "no", whereas here it is a failure whose error must
   * reach `onChildrenLoadFailed`.
   */
  const loadChildrenFor = (
    key: RowKey,
    item: T,
    loader: OgeTreeLoadChildren<T>,
  ): Promise<boolean> => {
    setLoadState(key, { status: 'loading' });
    let pending: Promise<readonly T[]>;
    try {
      pending = loader(item, key);
    } catch (error) {
      setLoadState(key, { status: 'failed', error });
      latest.current.props.onChildrenLoadFailed?.({ key, item, error });
      return Promise.resolve(false);
    }
    return pending.then(
      (children) => {
        const next = new Map(deferredRef.current).set(key, children);
        deferredRef.current = next;
        setDeferred(next);
        setLoadState(key, { status: 'loaded' });
        latest.current.props.onChildrenLoaded?.({ key, item, children });
        return true;
      },
      (error: unknown) => {
        setLoadState(key, { status: 'failed', error });
        latest.current.props.onChildrenLoadFailed?.({ key, item, error });
        return false;
      },
    );
  };

  const currentEffectiveExpanded = (): ReadonlySet<RowKey> =>
    treeEffectiveExpanded(
      expandedRef.current,
      latest.current.filterExpandedKeys,
    );

  const requestExpand = (key: RowKey): Promise<boolean> => {
    const view = latest.current;
    const item = view.index.byKey.get(key);
    if (!item || view.disabled) return Promise.resolve(false);
    if (currentEffectiveExpanded().has(key)) return Promise.resolve(true);
    const expanding: OgeTreeExpandingEvent<T> = { key, item, cancel: false };
    view.props.onItemExpanding?.(expanding);
    if (expanding.cancel) return Promise.resolve(false);

    setExpanded(
      nextTreeExpansion({
        index: view.index,
        expanded: expandedRef.current,
        key,
        expand: true,
        recursive: view.expandNodesRecursive,
      }),
    );
    view.props.onItemExpanded?.({ key, item });

    const loader = view.loadChildren;
    const needsLoad =
      !!loader &&
      treeChildrenLoadNeeded<T>({
        index: view.index,
        deferred: deferredRef.current,
        loadStates: loadStatesRef.current,
        key,
        hasLoader: true,
      });
    if (!needsLoad || !loader) return Promise.resolve(true);
    return loadChildrenFor(key, item, loader);
  };

  const requestExpandRef = useRef(requestExpand);
  requestExpandRef.current = requestExpand;

  const requestCollapse = (key: RowKey): Promise<boolean> => {
    const view = latest.current;
    const item = view.index.byKey.get(key);
    if (!item || view.disabled) return Promise.resolve(false);
    if (!currentEffectiveExpanded().has(key)) return Promise.resolve(true);
    const collapsing: OgeTreeCollapsingEvent<T> = { key, item, cancel: false };
    view.props.onItemCollapsing?.(collapsing);
    if (collapsing.cancel) return Promise.resolve(false);
    setExpanded(
      nextTreeExpansion({
        index: view.index,
        expanded: expandedRef.current,
        key,
        expand: false,
        recursive: false,
      }),
    );
    view.props.onItemCollapsed?.({ key, item });
    return Promise.resolve(true);
  };

  const toggleKey = (key: RowKey): Promise<boolean> =>
    currentEffectiveExpanded().has(key)
      ? requestCollapse(key)
      : requestExpand(key);

  // --- focus ----------------------------------------------------------------

  const elementForKey = (key: RowKey): HTMLElement | null =>
    listElRef.current?.querySelector<HTMLElement>(
      `[data-key="${CSS.escape(String(key))}"]`,
    ) ?? null;

  /**
   * Focuses the row element for an absolute index. Under virtualization the
   * row may not be rendered yet, so the lookup happens after a frame.
   */
  const focusIndex = (rowIndex: number): void => {
    const node = latest.current.nodes[rowIndex];
    if (!node) return;
    const apply = () => elementForKey(node.key)?.focus();
    if (!virtualRef.current.active) {
      apply();
      return;
    }
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => (callback(0), 0);
    schedule(() => apply());
  };

  const moveFocus = (rowIndex: number | null): void => {
    if (rowIndex === null) return;
    const node = latest.current.nodes[rowIndex];
    if (!node) return;
    setFocusedKey(node.key);
    if (virtualRef.current.active) virtualRef.current.scrollToIndex(rowIndex);
    focusIndex(rowIndex);
  };

  // --- interaction ----------------------------------------------------------

  const isCheckTarget = (target: EventTarget | null): boolean =>
    target instanceof Element &&
    target.closest('.oge-tree-view-check') !== null;

  const isToggleTarget = (target: EventTarget | null): boolean =>
    target instanceof Element &&
    target.closest('.oge-tree-view-toggle') !== null;

  const onRowClick = (
    node: OgeTreeViewNode<T>,
    event: ReactMouseEvent,
  ): void => {
    const view = latest.current;
    if (node.filler || view.disabled) return;
    if (isEditTarget(event.target)) return;
    setFocusedKey(node.key);
    if (node.more) {
      revealNextPage(node.more.parentKey, event.nativeEvent, true);
      return;
    }
    if (isCheckTarget(event.target)) {
      if (!node.disabled) toggleSelection(node, event.nativeEvent);
      return;
    }
    if (isToggleTarget(event.target)) {
      void toggleKey(node.key);
      return;
    }
    if (node.disabled) return;
    view.props.onItemClick?.({
      key: node.key,
      item: node.item,
      event: event.nativeEvent,
    });
    if (view.expandEvent === 'click' && node.hasChildren) {
      void toggleKey(node.key);
    }
    if (view.selectOnRowClick && view.selectionMode !== 'none') {
      toggleSelection(node, event.nativeEvent);
    }
  };

  const onRowDblClick = (
    node: OgeTreeViewNode<T>,
    event: ReactMouseEvent,
  ): void => {
    const view = latest.current;
    if (node.filler || node.more || node.disabled || view.disabled) return;
    if (isEditTarget(event.target)) return;
    view.props.onItemDblClick?.({
      key: node.key,
      item: node.item,
      event: event.nativeEvent,
    });
    if (view.props.editOnDblClick && startEdit(node, event.nativeEvent)) {
      return;
    }
    if (view.expandEvent === 'dblclick' && node.hasChildren) {
      void toggleKey(node.key);
    }
  };

  const toggleSelectAll = (): void => {
    const view = latest.current;
    if (view.disabled) return;
    const state = treeSelectAllState(
      view.index,
      view.keyOf,
      checkStates,
      selectedRef.current,
    );
    if (state === 'checked') unselectAll();
    else selectAll();
    view.props.onSelectAllChanged?.({
      state: treeSelectAllState(
        view.index,
        view.keyOf,
        treeCheckStates(
          view.index,
          selectedRef.current,
          view.selectNodesRecursive && checkBoxesMode !== 'none',
        ),
        selectedRef.current,
      ),
    });
  };

  // --- keyboard (APG treeview) ---------------------------------------------

  const typeAheadBuffer = useRef(createTypeAheadBuffer());
  typeAheadBuffer.current ??= createTypeAheadBuffer();

  const extendSelectionTo = (rowIndex: number | null, event: Event): void => {
    if (rowIndex === null) return;
    const node = latest.current.nodes[rowIndex];
    if (node && !node.filler) toggleSelection(node, event);
  };

  const selectRange = (from: number, to: number, event: Event): void => {
    commitSelection(
      treeRangeSelection(latest.current.nodes, selectedRef.current, from, to),
      undefined,
      event,
    );
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    const view = latest.current;
    if (view.disabled) return;
    const list = view.nodes;
    const current = list.findIndex(
      (node) => !node.filler && node.key === focusedKeyRef.current,
    );
    if (current === -1) return;
    const native = event.nativeEvent;
    const node = list[current];

    // F2 renames (the desktop-tree convention; APG leaves it to the author)
    if (isTreeEditKey(event)) {
      if (startEdit(node, native)) event.preventDefault();
      return;
    }
    // the keyboard twin of drag & drop: Ctrl+X here, Ctrl+V on the target
    if (view.allowDragging && !node.more) {
      const transfer = planTreeTransferKey(event);
      if (transfer === 'cut') {
        event.preventDefault();
        ogeTreeCut(peer, node.key);
        return;
      }
      if (transfer !== null) {
        event.preventDefault();
        const position =
          transfer === 'paste' && view.allowDropInside ? 'inside' : 'after';
        ogeTreePaste(peer, node.key, position, native);
        return;
      }
    }
    if (event.key === 'Escape' && ogeTreeHasCut(peer)) {
      event.preventDefault();
      ogeTreeCancelCut(peer);
      return;
    }

    // The APG key map itself lives in `@oge-ui/behavior`; this only executes
    // the actions it resolves, so the tree select's popup gets the same map.
    const plan = planTreeViewKey<T>({
      key: event.key,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      nodes: list,
      index: view.index,
      keyOf: view.keyOf,
      expanded: expandedRef.current,
      expandableKeys: view.expandableKeys,
      current,
      selectionMode: view.selectionMode,
      allowExpandAll: view.allowExpandAll,
      pushTypeAhead: (char) => typeAheadBuffer.current.push(char),
    });
    if (!plan) return;
    if (plan.preventDefault) event.preventDefault();
    for (const action of plan.actions) {
      switch (action.kind) {
        case 'focus':
          moveFocus(action.index);
          break;
        case 'toggle-selection':
          extendSelectionTo(action.index, native);
          break;
        case 'select-range':
          selectRange(action.from, action.to, native);
          break;
        case 'select-all':
          selectAll();
          break;
        case 'expand':
          void requestExpand(action.key);
          break;
        case 'collapse':
          void requestCollapse(action.key);
          break;
        case 'toggle-expansion':
          void toggleKey(action.key);
          break;
        case 'item-click':
          view.props.onItemClick?.({
            key: action.node.key,
            item: action.node.item,
            event: native,
          });
          break;
        case 'set-expanded':
          setExpanded(action.expanded);
          break;
        case 'load-more':
          if (action.node.more) {
            revealNextPage(action.node.more.parentKey, native, true);
          }
          break;
      }
    }
  };

  // --- "Load more" paging --------------------------------------------------

  const pendingFocusKey = useRef<RowKey | null>(null);

  /**
   * One more page under `parentKey`, then `onChildPageShown`. With `focus`
   * (the row was activated) the first newly shown child takes the focus, so
   * the user carries on where the list grew.
   */
  const revealNextPage = (
    parentKey: RowKey | null,
    event: Event | undefined,
    focus: boolean,
  ): void => {
    const view = latest.current;
    const pageSize = resolveTreeChildPageSize(view.props.childPageSize);
    if (pageSize === 0) return;
    const siblings =
      parentKey === null
        ? view.index.roots
        : (view.index.childrenOf.get(parentKey) ?? []);
    const total = siblings.length;
    const shown = treeChildPageLimit(
      pageLimitsRef.current,
      parentKey,
      pageSize,
    );
    if (shown >= total) return;
    const next = nextTreeChildPage(
      pageLimitsRef.current,
      parentKey,
      pageSize,
      total,
    );
    pageLimitsRef.current = next;
    setPageLimits(next);
    view.props.onChildPageShown?.({
      parentKey,
      parentItem:
        parentKey === null ? undefined : view.index.byKey.get(parentKey),
      shown: treeChildPageLimit(next, parentKey, pageSize),
      total,
      event,
    });
    if (!focus) return;
    const firstNew = view.keyOf(siblings[shown]);
    setFocusedKey(firstNew);
    pendingFocusKey.current = firstNew;
  };

  // focus the first newly revealed child once it rendered
  useEffect(() => {
    const target = pendingFocusKey.current;
    if (target === null) return;
    const rowIndex = nodes.findIndex((n) => !n.filler && n.key === target);
    if (rowIndex === -1) return;
    pendingFocusKey.current = null;
    moveFocus(rowIndex);
  });

  // --- label editing ----------------------------------------------------------

  const [editingKey, setEditingKeyState] = useState<RowKey | null>(null);
  const editingKeyRef = useRef<RowKey | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const setEditingKey = (key: RowKey | null): void => {
    editingKeyRef.current = key;
    setEditingKeyState(key);
  };

  const startEdit = (node: OgeTreeViewNode<T>, event?: Event): boolean => {
    if (editingKeyRef.current === node.key) return true;
    const view = latest.current;
    const open = runTreeEditStart<T>({
      node,
      allow: view.props.allowEditing ?? false,
      treeDisabled: view.disabled,
      event,
      emitStarting: (starting) => view.props.onItemEditStarting?.(starting),
    });
    if (!open) return false;
    setEditError(null);
    setEditingKey(node.key);
    return true;
  };

  /** Closes the editor; with `refocus` the row takes the focus back. */
  const closeEditor = (key: RowKey, refocus: boolean): void => {
    // cleared first, so the blur the refocus causes is not a second commit
    setEditingKey(null);
    setEditError(null);
    if (refocus) elementForKey(key)?.focus();
  };

  const commitEdit = (
    node: OgeTreeViewNode<T>,
    event: Event,
    refocus: boolean,
  ): void => {
    const view = latest.current;
    const field = editInputRef.current;
    const result = runTreeEditCommit<T>({
      key: node.key,
      item: node.item,
      previousValue: node.text,
      value: field?.value ?? node.text,
      event,
      validate: view.props.validateEdit,
      invalidMessage: view.messages.editInvalid,
      emitEditing: (editing) => view.props.onItemEditing?.(editing),
      emitEdited: (edited) => view.props.onItemEdited?.(edited),
    });
    if (result.status === 'invalid') {
      const error = result.error ?? view.messages.editInvalid;
      setEditError(error);
      announcer.announce(error);
      if (refocus) field?.focus();
      return;
    }
    closeEditor(node.key, refocus);
  };

  const onEditKeyDown = (
    node: OgeTreeViewNode<T>,
    event: ReactKeyboardEvent<HTMLInputElement>,
  ): void => {
    // the field owns its keys: arrows move the caret, Space types a space,
    // and Escape must not reach a drawer or dialog around the tree
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    const action = planTreeEditKey(event.key);
    if (action === null) return;
    event.preventDefault();
    if (action === 'cancel') closeEditor(node.key, true);
    else commitEdit(node, event.nativeEvent, true);
  };

  const isEditTarget = (target: EventTarget | null): boolean =>
    target instanceof Element &&
    target.closest('.oge-tree-view-edit-input') !== null;

  // the editor takes focus with its text selected as soon as it renders
  const editFieldRef = useCallback((field: HTMLInputElement | null) => {
    editInputRef.current = field;
    if (field) {
      field.focus();
      field.select();
    }
  }, []);

  // --- drag & drop ----------------------------------------------------------

  const [dragKey, setDragKey] = useState<RowKey | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<RowKey | null>(null);
  const [dropPosition, setDropPosition] = useState<OgeTreeDropPosition | null>(
    null,
  );
  const [cutKey, setCutKey] = useState<RowKey | null>(null);
  const dragHandle = useRef<OgePointerGestureHandle | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  /**
   * This tree as a participant in moves — its own reorders and its
   * `dragGroup`'s cross-tree drops share one commit path in
   * `@oge-ui/behavior` (`tree-view-transfer`). Stable for the component's
   * life; everything it reads comes through `latest`.
   */
  const peerRef = useRef<OgeTreeDragPeer | null>(null);
  peerRef.current ??= {
    treeId: () => latest.current.resolvedTreeId,
    group: () =>
      ogeTreeDragGroupOf(
        latest.current.props.dragGroup,
        latest.current.resolvedTreeId,
      ),
    element: () => hostRef.current,
    rows: () =>
      Array.from(
        listElRef.current?.querySelectorAll<HTMLElement>(
          '.oge-tree-view-item',
        ) ?? [],
      ),
    rowInfo: (dataKey) => {
      const node = latest.current.nodes.find(
        (n) => !n.filler && !n.more && String(n.key) === dataKey,
      );
      return node
        ? {
            key: node.key,
            hasChildren: node.hasChildren,
            expanded: node.expanded,
          }
        : null;
    },
    itemOf: (key) => latest.current.index.byKey.get(key),
    textOf: (key) => {
      const item = latest.current.index.byKey.get(key);
      return item === undefined
        ? String(key)
        : latest.current.model.displayOf(item);
    },
    canDrop: (source, dropKey) => {
      const view = latest.current;
      if (view.disabled || !view.index.byKey.has(dropKey)) return false;
      return source.treeId !== view.resolvedTreeId
        ? true
        : treeCanDrop(view.index, source.key, dropKey);
    },
    allowDropInside: () => latest.current.allowDropInside,
    preview: (target) => {
      setDropTargetKey(target?.key ?? null);
      setDropPosition(target?.position ?? null);
    },
    expand: (key) => void requestExpandRef.current(key),
    setCut: (key) => setCutKey(key),
    announce: (text) => announcer.announce(text),
    messages: () => latest.current.messages,
    emitReordering: (event) =>
      latest.current.props.onItemReordering?.(
        event as OgeTreeReorderingEvent<T>,
      ),
    emitReordered: (event) =>
      latest.current.props.onItemReordered?.(event as OgeTreeReorderedEvent<T>),
    emitTransferred: (event) =>
      latest.current.props.onItemTransferred?.(
        event as OgeTreeTransferredEvent<T>,
      ),
  };
  const peer = peerRef.current;

  // a tree that drags takes part in its group's moves while it is mounted
  useEffect(() => {
    if (!allowDragging) return;
    const unregister = registerOgeTreeDragPeer(peer);
    return () => {
      unregister();
      setCutKey(null);
    };
  }, [allowDragging, dragGroup, resolvedTreeId, peer]);

  useEffect(
    () => () => {
      dragHandle.current?.cancel();
    },
    [],
  );

  /**
   * Pointer drags run on `@oge-ui/behavior`'s `beginOgeTreeDrag`
   * (`beginPointerDragDrop` underneath): threshold, touch long press, ghost,
   * auto-scroll, capture-phase Escape, hover-to-expand and the cross-tree
   * hit-test over the `dragGroup` registry. The drop runs the same commit
   * as Ctrl+V.
   */
  const onPointerDown = (
    node: OgeTreeViewNode<T>,
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    const view = latest.current;
    if (!allowDragging || view.disabled || node.filler || node.more) return;
    if (event.button !== 0 || isCheckTarget(event.target)) return;
    if (isEditTarget(event.target)) return;
    dragHandle.current?.cancel();
    const key = node.key;
    dragHandle.current = beginOgeTreeDrag(event, {
      peer,
      key,
      row: event.currentTarget,
      autoScroll: scrollElRef.current,
      onStart: () => setDragKey(key),
      onEnd: () => {
        setDragKey(null);
        dragHandle.current = null;
      },
    });
  };

  // --- imperative handle ----------------------------------------------------

  useImperativeHandle(ref, () => ({
    isExpanded: (key) => currentEffectiveExpanded().has(key),
    isSelected: (key) => selectedRef.current.has(key),
    getSelectedKeys: (mode) =>
      resolveSelectedKeys(
        latest.current.index,
        selectedRef.current,
        mode ?? latest.current.selectedKeysMode,
      ),
    expand: requestExpand,
    collapse: requestCollapse,
    toggle: toggleKey,
    expandAll: () => setExpanded(new Set(latest.current.expandableKeys)),
    collapseAll: () => setExpanded(new Set<RowKey>()),
    selectAll,
    unselectAll,
    select: (key) => setSelected(key, true),
    unselect: (key) => setSelected(key, false),
    focus: (key) => {
      const list = latest.current.nodes;
      const rowIndex =
        key === undefined
          ? (treeEdgeIndex(list, 1) ?? -1)
          : list.findIndex((node) => node.key === key && !node.filler);
      if (rowIndex === -1) return;
      setFocusedKey(list[rowIndex].key);
      focusIndex(rowIndex);
    },
    scrollToItem: (key) => {
      const list = latest.current.nodes;
      const rowIndex = list.findIndex(
        (node) => node.key === key && !node.filler,
      );
      if (rowIndex === -1) return;
      if (virtualRef.current.active) {
        virtualRef.current.scrollToIndex(rowIndex);
        return;
      }
      elementForKey(key)?.scrollIntoView({ block: 'nearest' });
    },
    editItem: (key) => {
      const node = latest.current.nodes.find(
        (candidate) => candidate.key === key && !candidate.filler,
      );
      return node ? startEdit(node) : false;
    },
    cancelEdit: () => {
      const key = editingKeyRef.current;
      if (key !== null) closeEditor(key, false);
    },
    showMoreChildren: (parentKey) =>
      revealNextPage(parentKey, undefined, false),
    cutItem: (key) => {
      if (!latest.current.allowDragging || latest.current.disabled) {
        return false;
      }
      return ogeTreeCut(peer, key);
    },
    pasteItem: (targetKey, position) => {
      if (!latest.current.allowDragging || latest.current.disabled) {
        return false;
      }
      return ogeTreePaste(
        peer,
        targetKey,
        position ?? (latest.current.allowDropInside ? 'inside' : 'after'),
      );
    },
  }));

  // --- render ---------------------------------------------------------------

  const virtualWindow = virtual.window();
  const renderedNodes = virtualActive
    ? nodes.slice(virtualWindow.start, virtualWindow.end)
    : nodes;

  const hostClasses = ['oge-tree-view', disabled && 'oge-disabled', className]
    .filter(Boolean)
    .join(' ');

  /**
   * The roving tab stop has to exist on the FIRST paint. The seeding effect
   * above only runs after it, so until then every row would be
   * `tabindex="-1"` — a scrollable region with no keyboard access (axe
   * `scrollable-region-focusable`, WCAG 2.1.1), which is what the virtualized
   * tree renders. Angular seeds it inside change detection and paints with
   * the stop already in place; this fallback matches that frame for frame.
   */
  const seedFocusedKey = useMemo(
    () => nodes.find((node) => !node.filler && !node.disabled)?.key,
    [nodes],
  );
  const tabStopKey = focusedKey ?? seedFocusedKey;

  /** `aria-keyshortcuts` of a row: F2 when renamable, the move keys when dragging. */
  const keyShortcuts = (node: OgeTreeViewNode<T>): string | undefined => {
    if (node.filler || node.more) return undefined;
    const keys: string[] = [];
    if (allowEditing !== false) keys.push('F2');
    if (allowDragging) keys.push(OGE_TREE_TRANSFER_SHORTCUTS);
    return keys.length ? keys.join(' ') : undefined;
  };

  /** Label of a "Load more" row: the ICU plural over the hidden children. */
  const loadMoreText = (node: OgeTreeViewNode<T>): string =>
    node.more ? treeLoadMoreText(messages.loadMore, node.more) : '';

  const rovingTabIndex = (node: OgeTreeViewNode<T>): number => {
    if (node.filler || node.disabled) return -1;
    return node.key === tabStopKey ? 0 : -1;
  };

  return (
    <div ref={hostRef} className={hostClasses} data-size={size} style={style}>
      {searchEnabled && (
        <div className="oge-tree-view-search">
          <input
            type="search"
            className="oge-tree-view-search-input"
            value={searchValue}
            placeholder={messages.searchPlaceholder}
            aria-label={messages.searchLabel}
            disabled={disabled}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
      )}
      {checkBoxesMode === 'selectAll' && nodes.length > 0 && (
        <div
          className="oge-tree-view-select-all"
          role="checkbox"
          tabIndex={0}
          aria-checked={
            selectAllState === 'indeterminate'
              ? 'mixed'
              : selectAllState === 'checked'
          }
          aria-disabled={disabled ? true : undefined}
          onClick={toggleSelectAll}
          onKeyDown={(event) => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            toggleSelectAll();
          }}
        >
          <span
            className="oge-tree-view-check"
            aria-hidden="true"
            data-state={selectAllState}
          />
          <span className="oge-tree-view-select-all-label">
            {messages.selectAll}
          </span>
        </div>
      )}

      {nodes.length === 0 ? (
        <div className="oge-tree-view-empty">
          {renderNoData
            ? renderNoData()
            : searchValue
              ? messages.noSearchResults
              : messages.noData}
        </div>
      ) : (
        <div
          ref={scrollElRef}
          className={[
            'oge-tree-view-scroll',
            virtualActive && 'oge-tree-view-virtual',
          ]
            .filter(Boolean)
            .join(' ')}
          style={
            {
              blockSize: height,
              '--oge-tree-item-height': `${itemHeight}px`,
            } as CSSProperties
          }
          onScroll={virtual.onScroll}
        >
          <div
            ref={listElRef}
            role="tree"
            className="oge-tree-view-list"
            id={resolvedTreeId}
            aria-label={props.ariaLabel}
            aria-multiselectable={
              selectionMode === 'multiple' ? true : undefined
            }
            aria-busy={loadingAny ? true : undefined}
            style={{
              blockSize: virtualActive ? virtualWindow.totalHeight : undefined,
            }}
          >
            <div
              className="oge-tree-view-viewport"
              style={{
                transform: virtualActive
                  ? `translateY(${virtualWindow.offsetY}px)`
                  : undefined,
              }}
            >
              {renderedNodes.map((node) => {
                const ariaChecked = treeAriaChecked(node, checkBoxesMode);
                const ariaSelected = treeAriaSelected(
                  node,
                  checkBoxesMode,
                  selectionMode,
                );
                return (
                  <div
                    key={node.id}
                    className={[
                      'oge-tree-view-item',
                      node.selected && 'oge-tree-view-item-selected',
                      node.disabled && 'oge-tree-view-item-disabled',
                      node.loading && 'oge-tree-view-item-loading',
                      node.filler && 'oge-tree-view-item-filler',
                      dragKey === node.key && 'oge-tree-view-item-dragging',
                      dropTargetKey === node.key &&
                        dropPosition === 'before' &&
                        'oge-tree-view-item-drop-before',
                      dropTargetKey === node.key &&
                        dropPosition === 'after' &&
                        'oge-tree-view-item-drop-after',
                      dropTargetKey === node.key &&
                        dropPosition === 'inside' &&
                        'oge-tree-view-item-drop-inside',
                      cutKey === node.key && 'oge-tree-view-item-cut',
                      node.more && 'oge-tree-view-item-more',
                      editingKey === node.key && 'oge-tree-view-item-editing',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role={node.filler ? undefined : 'treeitem'}
                    data-key={node.filler ? undefined : String(node.key)}
                    id={`${uid}-node-${node.id}`}
                    aria-level={node.level + 1}
                    aria-posinset={
                      node.filler || node.more ? undefined : node.posInSet
                    }
                    aria-setsize={
                      node.filler || node.more ? undefined : node.setSize
                    }
                    aria-keyshortcuts={keyShortcuts(node)}
                    aria-expanded={
                      node.filler || !node.hasChildren
                        ? undefined
                        : node.expanded
                    }
                    aria-selected={ariaSelected ?? undefined}
                    aria-checked={ariaChecked ?? undefined}
                    aria-disabled={node.disabled ? true : undefined}
                    tabIndex={rovingTabIndex(node)}
                    style={{
                      paddingInlineStart: `${treeNodeIndent(node.level)}px`,
                    }}
                    onClick={(event) => onRowClick(node, event)}
                    onKeyDown={onKeyDown}
                    onDoubleClick={(event) => onRowDblClick(node, event)}
                    onFocus={() => {
                      if (!node.filler) setFocusedKey(node.key);
                    }}
                    onPointerDown={(event) => onPointerDown(node, event)}
                  >
                    {node.filler ? (
                      <>
                        <span
                          className="oge-tree-view-spinner"
                          aria-hidden="true"
                        />
                        <span className="oge-tree-view-filler-text">
                          {node.failed
                            ? messages.childrenLoadFailed
                            : messages.loadingChildren}
                        </span>
                      </>
                    ) : node.more ? (
                      <>
                        <span
                          className="oge-tree-view-more-icon"
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14">
                            <path
                              d="M6 9l6 6 6-6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span className="oge-tree-view-text oge-tree-view-more-text">
                          {loadMoreText(node)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          className={[
                            'oge-tree-view-toggle',
                            !node.hasChildren && 'oge-tree-view-toggle-hidden',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          aria-hidden="true"
                        >
                          {node.hasChildren &&
                            (renderExpandIcon ? (
                              renderExpandIcon({
                                expanded: node.expanded,
                                item: node.item,
                                key: node.key,
                                loading: node.loading,
                              })
                            ) : node.loading ? (
                              <span className="oge-tree-view-spinner" />
                            ) : (
                              <svg viewBox="0 0 24 24" width="14" height="14">
                                <path
                                  d="M9 6l6 6-6 6"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ))}
                        </span>
                        {checkBoxesMode !== 'none' && (
                          // Deliberately a span, not a checkbox input: a
                          // focusable control inside role="treeitem" is a
                          // nested-interactive a11y violation. The state lives
                          // on the row as aria-checked and the click is
                          // resolved from the target.
                          <span
                            className="oge-tree-view-check"
                            aria-hidden="true"
                            data-state={node.checkState}
                          />
                        )}
                        {node.icon && (
                          <svg
                            className="oge-tree-view-icon"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            aria-hidden="true"
                          >
                            <path
                              d={node.icon}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        {editingKey === node.key ? (
                          // A transient text field inside the treeitem:
                          // treeitem does not make its children
                          // presentational, so axe's nested-interactive does
                          // not apply. Uncontrolled — the value is read on
                          // commit, never per keystroke.
                          <>
                            <input
                              ref={editFieldRef}
                              type="text"
                              className="oge-tree-view-edit-input"
                              defaultValue={node.text}
                              aria-label={messages.editLabel}
                              aria-invalid={editError ? true : undefined}
                              aria-describedby={
                                editError ? `${uid}-edit-error` : undefined
                              }
                              onKeyDown={(event) => onEditKeyDown(node, event)}
                              onBlur={(event) => {
                                if (editingKeyRef.current !== node.key) return;
                                commitEdit(node, event.nativeEvent, false);
                              }}
                            />
                            {editError && (
                              <span
                                className="oge-tree-view-edit-error"
                                id={`${uid}-edit-error`}
                              >
                                {editError}
                              </span>
                            )}
                          </>
                        ) : renderItem ? (
                          renderItem({
                            item: node.item,
                            key: node.key,
                            level: node.level,
                            expanded: node.expanded,
                            selected: node.selected,
                            checkState: node.checkState,
                            hasChildren: node.hasChildren,
                            highlighted: node.highlighted,
                          })
                        ) : node.highlighted ? (
                          <span className="oge-tree-view-text">
                            {node.highlighted.map((run, runIndex) =>
                              run.match ? (
                                <mark key={runIndex} className="oge-highlight">
                                  {run.text}
                                </mark>
                              ) : (
                                <Fragment key={runIndex}>{run.text}</Fragment>
                              ),
                            )}
                          </span>
                        ) : (
                          <span className="oge-tree-view-text">
                            {node.text}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}) as <T extends object = Record<string, unknown>>(
  props: OgeTreeViewProps<T> & {
    ref?: React.ForwardedRef<OgeTreeViewHandle>;
  },
) => ReactNode;
