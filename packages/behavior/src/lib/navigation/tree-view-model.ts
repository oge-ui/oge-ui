/**
 * The composed tree model and the composed APG key map.
 *
 * `tree-view-core.ts` holds the *steps* — build the index, filter, cascade,
 * flatten. This module holds the *whole pipeline* and the *whole key map*, so
 * a second renderer does not have to re-derive either: the React tree view and
 * the tree select's popup tree both run these two functions and keep only
 * their own state plumbing and markup (ADR 0001).
 *
 * Both are pure functions of their inputs — no framework, no mutation of the
 * arguments, no I/O.
 */
import {
  ancestorsOf,
  buildTreeViewIndex,
  buildTreeViewNodes,
  createTreeSearchPredicate,
  treeAccessor,
  treeAnchorIndex,
  treeCheckStates,
  treeEdgeIndex,
  treeEffectiveExpanded,
  treeExpandableKeys,
  treeFilterExpandedKeys,
  treeHasChildrenHint,
  treeLoadingAny,
  treeParentIndex,
  treeSearchAccessors,
  treeSelectAllState,
  treeSiblingExpansion,
  treeStepIndex,
  treeTypeAheadIndex,
  treeVisibleKeys,
  type CheckState,
  type OgeTreeCheckBoxesMode,
  type OgeTreeDataStructure,
  type OgeTreeExpr,
  type OgeTreeLoadState,
  type OgeTreeSearchMode,
  type OgeTreeSelectionMode,
  type OgeTreeViewNode,
  type RowKey,
  type TreeFilterMode,
  type TreeIndex,
} from './tree-view-core';

const EMPTY_DEFERRED: ReadonlyMap<RowKey, readonly never[]> = new Map();
const EMPTY_LOAD_STATES: ReadonlyMap<RowKey, OgeTreeLoadState> = new Map();

/** Inputs of {@link buildTreeViewModel} — the accessors' raw expressions. */
export interface OgeTreeViewModelInput<T> {
  items: readonly T[];
  keyExpr: OgeTreeExpr<T, RowKey>;
  parentIdExpr: OgeTreeExpr<T>;
  itemsExpr?: OgeTreeExpr<T, readonly T[] | undefined>;
  displayExpr: OgeTreeExpr<T>;
  disabledExpr: OgeTreeExpr<T>;
  hasItemsExpr: OgeTreeExpr<T>;
  iconExpr?: OgeTreeExpr<T>;
  rootValue?: unknown;
  dataStructure?: OgeTreeDataStructure;
  /** Lazily fetched children, keyed by their parent's key. */
  deferred?: ReadonlyMap<RowKey, readonly T[]>;
  loadStates?: ReadonlyMap<RowKey, OgeTreeLoadState>;
  /** The user's own expansion; search auto-expansion is overlaid on it. */
  expandedKeys: ReadonlySet<RowKey>;
  selectedKeys: ReadonlySet<RowKey>;
  /** Committed (already debounced) search text; `''` when not searching. */
  search?: string;
  searchMode?: OgeTreeSearchMode;
  searchExpr?: OgeTreeExpr<T> | readonly OgeTreeExpr<T>[];
  filterMode?: TreeFilterMode;
  expandNodesOnFiltering?: boolean;
  highlightSearchResults?: boolean;
  selectNodesRecursive?: boolean;
  showCheckBoxes?: OgeTreeCheckBoxesMode;
  /** Whether a `loadChildren` is wired — enables the `hasItemsExpr` hint. */
  lazy?: boolean;
}

/** The derived state a tree render needs, in one pass. */
export interface OgeTreeViewModel<T> {
  readonly index: TreeIndex<T>;
  readonly keyOf: (row: T) => RowKey;
  readonly displayOf: (row: T) => string;
  readonly disabledOf: (row: T) => boolean;
  /** Keys that show an expand toggle. */
  readonly expandableKeys: ReadonlySet<RowKey>;
  /** Keys surviving the search filter — `null` when not searching. */
  readonly visibleKeys: ReadonlySet<RowKey> | null;
  /** Ancestors auto-expanded by the search. */
  readonly filterExpandedKeys: ReadonlySet<RowKey>;
  /** `expandedKeys` overlaid with {@link OgeTreeViewModel.filterExpandedKeys}. */
  readonly effectiveExpanded: ReadonlySet<RowKey>;
  readonly checkStates: ReadonlyMap<RowKey, CheckState>;
  readonly nodes: readonly OgeTreeViewNode<T>[];
  readonly selectAllState: CheckState;
  readonly loadingAny: boolean;
}

/**
 * Runs the whole derivation — index, lazy hint, search filter, effective
 * expansion, tri-state cascade, flat node list, select-all state — in the one
 * order the pipeline requires.
 */
export function buildTreeViewModel<T>(
  input: OgeTreeViewModelInput<T>,
): OgeTreeViewModel<T> {
  const keyOf = treeAccessor<T, RowKey>(input.keyExpr);
  const displayAccessor = treeAccessor<T, unknown>(input.displayExpr);
  const displayOf = (row: T): string => String(displayAccessor(row) ?? '');
  const disabledAccessor = treeAccessor<T, unknown>(input.disabledExpr);
  const disabledOf = (row: T): boolean => disabledAccessor(row) === true;
  const iconAccessor =
    input.iconExpr === undefined
      ? null
      : treeAccessor<T, unknown>(input.iconExpr);
  const iconOf =
    iconAccessor === null
      ? null
      : (row: T): string | undefined => {
          const value = iconAccessor(row);
          return value == null ? undefined : String(value);
        };

  const deferred = input.deferred ?? EMPTY_DEFERRED;
  const loadStates = input.loadStates ?? EMPTY_LOAD_STATES;
  const search = input.search ?? '';
  const showCheckBoxes = input.showCheckBoxes ?? 'none';

  const index = buildTreeViewIndex<T>({
    items: input.items,
    keyOf,
    parentIdExpr: input.parentIdExpr,
    itemsExpr: input.itemsExpr,
    dataStructure: input.dataStructure,
    rootValue: input.rootValue,
    deferred,
  });
  const hasChildren = treeHasChildrenHint<T>(
    input.lazy === true,
    input.hasItemsExpr,
  );
  const expandableKeys = treeExpandableKeys(index, hasChildren);
  const visibleKeys = treeVisibleKeys(
    index,
    createTreeSearchPredicate<T>(
      search,
      input.searchMode ?? 'contains',
      treeSearchAccessors<T>(input.displayExpr, input.searchExpr),
    ),
    input.filterMode ?? 'withAncestors',
  );
  const filterExpandedKeys = treeFilterExpandedKeys(
    index,
    visibleKeys,
    input.expandNodesOnFiltering ?? true,
  );
  const effectiveExpanded = treeEffectiveExpanded(
    input.expandedKeys,
    filterExpandedKeys,
  );
  const checkStates = treeCheckStates(
    index,
    input.selectedKeys,
    (input.selectNodesRecursive ?? true) && showCheckBoxes !== 'none',
  );
  const nodes = buildTreeViewNodes<T>({
    index,
    keyOf,
    displayOf,
    disabledOf,
    iconOf,
    expandedKeys: effectiveExpanded,
    selectedKeys: input.selectedKeys,
    checkStates,
    loadStates,
    deferred,
    visibleKeys,
    hasChildren,
    highlight: (input.highlightSearchResults ?? true) ? search : '',
  });

  return {
    index,
    keyOf,
    displayOf,
    disabledOf,
    expandableKeys,
    visibleKeys,
    filterExpandedKeys,
    effectiveExpanded,
    checkStates,
    nodes,
    selectAllState: treeSelectAllState(
      index,
      keyOf,
      checkStates,
      input.selectedKeys,
    ),
    loadingAny: treeLoadingAny(loadStates),
  };
}

/**
 * The expansion set after opening or closing one node. Expanding also opens
 * the ancestors when `recursive`, so a programmatic expand deep in the tree
 * actually becomes visible.
 */
export function nextTreeExpansion<T>(input: {
  index: TreeIndex<T>;
  expanded: ReadonlySet<RowKey>;
  key: RowKey;
  expand: boolean;
  recursive: boolean;
}): ReadonlySet<RowKey> {
  const next = new Set(input.expanded);
  if (!input.expand) {
    next.delete(input.key);
    return next;
  }
  next.add(input.key);
  if (input.recursive) {
    for (const ancestor of ancestorsOf(input.index, input.key)) {
      next.add(ancestor);
    }
  }
  return next;
}

/**
 * Whether expanding this node has to fetch its children: there is a loader,
 * nothing is cached, the index knows no children, and no fetch ran before —
 * the single-flight guard.
 */
export function treeChildrenLoadNeeded<T>(input: {
  index: TreeIndex<T>;
  deferred: ReadonlyMap<RowKey, readonly T[]>;
  loadStates: ReadonlyMap<RowKey, OgeTreeLoadState>;
  key: RowKey;
  hasLoader: boolean;
}): boolean {
  return (
    input.hasLoader &&
    !input.deferred.has(input.key) &&
    !input.index.childrenOf.has(input.key) &&
    !input.loadStates.has(input.key)
  );
}

/** One step of {@link planTreeViewKey}'s answer. */
export type OgeTreeKeyAction<T> =
  /** Move the roving tab stop (and the scroll window) to this row. */
  | { readonly kind: 'focus'; readonly index: number }
  /** Flip this row's selected state. */
  | { readonly kind: 'toggle-selection'; readonly index: number }
  /** Add every enabled row in the inclusive range to the selection. */
  | {
      readonly kind: 'select-range';
      readonly from: number;
      readonly to: number;
    }
  | { readonly kind: 'select-all' }
  | { readonly kind: 'expand'; readonly key: RowKey }
  | { readonly kind: 'collapse'; readonly key: RowKey }
  | { readonly kind: 'toggle-expansion'; readonly key: RowKey }
  /** Report the row as clicked — Enter is a click in the APG map. */
  | { readonly kind: 'item-click'; readonly node: OgeTreeViewNode<T> }
  /** Replace the expansion set outright (the `*` shortcut). */
  | { readonly kind: 'set-expanded'; readonly expanded: ReadonlySet<RowKey> };

/** What a key press means, and whether the browser default must be stopped. */
export interface OgeTreeKeyPlan<T> {
  readonly preventDefault: boolean;
  readonly actions: readonly OgeTreeKeyAction<T>[];
}

/** Inputs of {@link planTreeViewKey}. */
export interface OgeTreeKeyInput<T> {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  nodes: readonly OgeTreeViewNode<T>[];
  index: TreeIndex<T>;
  keyOf: (row: T) => RowKey;
  expanded: ReadonlySet<RowKey>;
  expandableKeys: ReadonlySet<RowKey>;
  /** Row index holding the roving tab stop. */
  current: number;
  selectionMode: OgeTreeSelectionMode;
  allowExpandAll?: boolean;
  /** Pushes a character into the caller's buffer and returns the prefix. */
  pushTypeAhead: (char: string) => string;
}

/**
 * The WAI-ARIA APG treeview key map — arrows, Home/End (plus the Ctrl+Shift
 * range extensions), Enter, Space, `*`, Ctrl+A and type-ahead — resolved into
 * render-layer-independent actions.
 *
 * Returns `null` when the key means nothing here, so the caller lets it
 * through untouched.
 */
export function planTreeViewKey<T>(
  input: OgeTreeKeyInput<T>,
): OgeTreeKeyPlan<T> | null {
  const list = input.nodes;
  const current = input.current;
  const node = list[current];
  if (!node) return null;
  const multiple = input.selectionMode === 'multiple';
  const step = (direction: 1 | -1): OgeTreeKeyAction<T>[] => {
    const target = treeStepIndex(list, current, direction);
    if (target === null) return [];
    const actions: OgeTreeKeyAction<T>[] = [{ kind: 'focus', index: target }];
    if (input.shiftKey && multiple) {
      actions.push({ kind: 'toggle-selection', index: target });
    }
    return actions;
  };
  const focusOnly = (target: number | null): OgeTreeKeyPlan<T> => ({
    preventDefault: true,
    actions: target === null ? [] : [{ kind: 'focus', index: target }],
  });

  switch (input.key) {
    case 'ArrowDown':
      return { preventDefault: true, actions: step(1) };
    case 'ArrowUp':
      return { preventDefault: true, actions: step(-1) };
    case 'ArrowRight':
      if (!node.hasChildren) return { preventDefault: true, actions: [] };
      if (!node.expanded) {
        return {
          preventDefault: true,
          actions: [{ kind: 'expand', key: node.key }],
        };
      }
      return focusOnly(treeStepIndex(list, current, 1));
    case 'ArrowLeft':
      if (node.hasChildren && node.expanded) {
        return {
          preventDefault: true,
          actions: [{ kind: 'collapse', key: node.key }],
        };
      }
      return focusOnly(treeParentIndex(list, current));
    case 'Home':
      if (input.ctrlKey && input.shiftKey) {
        return {
          preventDefault: true,
          actions: [{ kind: 'select-range', from: 0, to: current }],
        };
      }
      return focusOnly(treeEdgeIndex(list, 1));
    case 'End':
      if (input.ctrlKey && input.shiftKey) {
        return {
          preventDefault: true,
          actions: [
            { kind: 'select-range', from: current, to: list.length - 1 },
          ],
        };
      }
      return focusOnly(treeEdgeIndex(list, -1));
    case 'Enter': {
      const actions: OgeTreeKeyAction<T>[] = [{ kind: 'item-click', node }];
      if (node.hasChildren) {
        actions.push({ kind: 'toggle-expansion', key: node.key });
      } else if (input.selectionMode !== 'none') {
        actions.push({ kind: 'toggle-selection', index: current });
      }
      return { preventDefault: true, actions };
    }
    case ' ':
      if (input.shiftKey && multiple) {
        return {
          preventDefault: true,
          actions: [
            {
              kind: 'select-range',
              from: treeAnchorIndex(list, current),
              to: current,
            },
          ],
        };
      }
      return {
        preventDefault: true,
        actions:
          input.selectionMode === 'none'
            ? []
            : [{ kind: 'toggle-selection', index: current }],
      };
    case '*':
      if (input.allowExpandAll === false) return null;
      return {
        preventDefault: true,
        actions: [
          {
            kind: 'set-expanded',
            expanded: treeSiblingExpansion(
              input.index,
              input.keyOf,
              input.expanded,
              input.expandableKeys,
              node.key,
            ),
          },
        ],
      };
    case 'a':
    case 'A':
      if (input.ctrlKey && multiple) {
        return { preventDefault: true, actions: [{ kind: 'select-all' }] };
      }
      break;
    default:
      break;
  }

  if (
    input.key.length === 1 &&
    !input.ctrlKey &&
    !input.altKey &&
    !input.metaKey &&
    input.key !== ' '
  ) {
    const match = treeTypeAheadIndex(
      list,
      input.pushTypeAhead(input.key.toLowerCase()),
      current,
    );
    if (match !== null) {
      return {
        preventDefault: true,
        actions: [{ kind: 'focus', index: match }],
      };
    }
  }
  return null;
}
