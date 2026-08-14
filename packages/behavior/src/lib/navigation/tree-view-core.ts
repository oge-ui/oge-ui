import {
  ancestorsOf,
  buildSearchHighlightHtml,
  buildTreeIndex,
  computeTreeCheckStates,
  createFieldAccessor,
  edgeEnabledIndex,
  filterTreeKeys,
  flattenNestedTree,
  flattenTreeData,
  foldText,
  matchByPrefix,
  resolveSelectedKeys,
  stepEnabledIndex,
  toggleTreeSelection,
} from '@oge-ui/core';
import type {
  CheckState,
  RowKey,
  RowNode,
  TreeFilterMode,
  TreeIndex,
} from '@oge-ui/core';

/**
 * The framework-free half of the tree view (ADR 0001): its vocabulary, the
 * event payloads, the message catalog and the config merge rule. The node
 * pipeline itself (flatten, filter, check-state propagation) already lives in
 * `@oge-ui/core` and is shared through it.
 *
 * This is also what unblocks a React tree select: the editor needs the tree's
 * vocabulary without depending on either render layer.
 */

// The identity, tri-state and filter vocabulary comes from `@oge-ui/core`;
// re-exported so the React render layer reaches it through its one behavior
// dependency.
export type { CheckState, RowKey, TreeFilterMode };

/** Shape of the bound data: a flat parent-referencing list or nested children. */
export type OgeTreeDataStructure = 'plain' | 'tree';

/** How nodes may be selected. */
export type OgeTreeSelectionMode = 'none' | 'single' | 'multiple';

/** Checkbox column: hidden, per node, or per node plus a "select all" row. */
export type OgeTreeCheckBoxesMode = 'none' | 'normal' | 'selectAll';

/** Which gesture expands a node. */
export type OgeTreeExpandEvent = 'click' | 'dblclick';

/** How the search text is compared against a node's display value. */
export type OgeTreeSearchMode = 'contains' | 'startsWith' | 'equals';

/** Projection applied when reporting `selectedKeys` outward. */
export type OgeTreeSelectedKeysMode = 'all' | 'leavesOnly' | 'excludeRecursive';

/** Where a dragged node lands relative to the drop target. */
export type OgeTreeDropPosition = 'inside' | 'before' | 'after';

/** Density of the node rows. */
export type OgeTreeSize = 'sm' | 'md' | 'lg';

/**
 * Field accessor: a property name or a function. Property names go through
 * core's `createFieldAccessor`, so dotted paths work.
 */
export type OgeTreeExpr<T, R = unknown> = string | ((row: T) => R);

/** Virtual scrolling: `true` for the default row height, or an explicit one. */
export interface OgeTreeVirtualScrollOptions {
  /** Row height in pixels — every row must actually be this tall. */
  itemHeight: number;
}

/** Loads a node's children the first time it expands. */
export type OgeTreeLoadChildren<T> = (
  parent: T,
  key: RowKey,
) => Promise<readonly T[]>;

/** Cancelable pre-event of a node expanding. */
export interface OgeTreeExpandingEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event?: Event;
  /** Set to `true` to block the expand. */
  cancel: boolean;
}

/** Cancelable pre-event of a node collapsing. */
export interface OgeTreeCollapsingEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event?: Event;
  /** Set to `true` to block the collapse. */
  cancel: boolean;
}

/** Emitted after a node expanded. */
export interface OgeTreeExpandedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event?: Event;
}

/** Emitted after a node collapsed. */
export interface OgeTreeCollapsedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event?: Event;
}

/** Cancelable pre-event of a selection change. */
export interface OgeTreeSelectionChangingEvent<T = unknown> {
  /** Keys the selection would become. */
  readonly keys: readonly RowKey[];
  /** The node that triggered the change — absent for select-all. */
  readonly key?: RowKey;
  readonly item?: T;
  readonly event?: Event;
  /** Set to `true` to block the change. */
  cancel: boolean;
}

/** Emitted after the selection committed. */
export interface OgeTreeSelectionChangedEvent<T = unknown> {
  /** Selected keys under the component's `selectedKeysMode` projection. */
  readonly keys: readonly RowKey[];
  readonly previousKeys: readonly RowKey[];
  readonly key?: RowKey;
  readonly item?: T;
  readonly event?: Event;
}

/** Emitted for the single node whose own selected state flipped. */
export interface OgeTreeItemSelectionChangedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly selected: boolean;
  readonly event?: Event;
}

/** Emitted when a node row is activated. */
export interface OgeTreeItemClickEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event: Event;
}

/** Emitted after a lazy `loadChildren` resolved. */
export interface OgeTreeChildrenLoadedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly children: readonly T[];
}

/** Emitted after a lazy `loadChildren` rejected. */
export interface OgeTreeChildrenFailedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly error: unknown;
}

/** Emitted when the "select all" row is toggled. */
export interface OgeTreeSelectAllChangedEvent {
  readonly state: CheckState;
}

/** Cancelable pre-event of a drag & drop reparent. */
export interface OgeTreeReorderingEvent<T = unknown> {
  readonly dragKey: RowKey;
  readonly dragItem: T;
  readonly dropKey: RowKey;
  readonly dropItem: T;
  readonly position: OgeTreeDropPosition;
  /** Set to `true` to block the drop. */
  cancel: boolean;
}

/**
 * Emitted after a drop passed the cancelable pre-event. The tree does not
 * mutate the data — apply the move to your own array, exactly like
 * tree-list's `rowReparented`.
 */
export interface OgeTreeReorderedEvent<T = unknown> {
  readonly dragKey: RowKey;
  readonly dragItem: T;
  readonly dropKey: RowKey;
  readonly dropItem: T;
  readonly position: OgeTreeDropPosition;
}

// --- config ----------------------------------------------------------------

/**
 * Every user-facing string in the tree view — override globally through the
 * layer's config provider or per component via `messages`.
 */
export interface OgeTreeViewMessages {
  /** Label of the "select all" row. */
  selectAll: string;
  /** Placeholder of the built-in search box. */
  searchPlaceholder: string;
  /** Accessible name of the built-in search box. */
  searchLabel: string;
  /** Accessible name of the search box's clear button. */
  clearSearch: string;
  /** Announced while a node's lazy children are loading. */
  loadingChildren: string;
  /** Shown in place of a node's children when `loadChildren` rejected. */
  childrenLoadFailed: string;
  /** Shown when the tree has no nodes at all. */
  noData: string;
  /** Shown when a search matched nothing. */
  noSearchResults: string;
}

export const OGE_DEFAULT_TREE_VIEW_MESSAGES: OgeTreeViewMessages = {
  selectAll: 'Select all',
  searchPlaceholder: 'Search…',
  searchLabel: 'Search the tree',
  clearSearch: 'Clear search',
  loadingChildren: 'Loading…',
  childrenLoadFailed: 'Could not load these items.',
  noData: 'No items to display',
  noSearchResults: 'No matching items',
};

/** Application-wide defaults for the tree view. */
export interface OgeTreeViewConfig {
  messages: OgeTreeViewMessages;
  /** Default row height used by `virtualScroll` (px). */
  itemHeight?: number;
  /** Default for the `expandEvent` input. */
  expandEvent?: OgeTreeExpandEvent;
}

export const OGE_DEFAULT_TREE_VIEW_CONFIG: OgeTreeViewConfig = {
  messages: OGE_DEFAULT_TREE_VIEW_MESSAGES,
};

export type OgeTreeViewConfigInput = Partial<
  Omit<OgeTreeViewConfig, 'messages'>
> & {
  messages?: Partial<OgeTreeViewMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeTreeViewConfig(
  input: OgeTreeViewConfigInput | undefined,
): OgeTreeViewConfig {
  return {
    ...OGE_DEFAULT_TREE_VIEW_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_TREE_VIEW_MESSAGES, ...input?.messages },
  };
}

// --- the shared decision layer ---------------------------------------------
//
// Everything below is what both render layers run: accessor resolution, the
// index build (nested payloads plus lazily loaded children), the search
// pipeline, the flat node list, the selection arithmetic, the APG index math
// and the drag & drop geometry. The Angular component and `<OgeTreeView>` are
// thin render shells over these — a rule that only holds because none of it
// touches a framework (ADR 0001).

/** Adjacency index over the tree's rows — re-exported so React reaches it. */
export type { TreeIndex };
export { ancestorsOf, resolveSelectedKeys };

/** Default row height used by `virtualScroll` when nothing overrides it. */
export const OGE_TREE_DEFAULT_ITEM_HEIGHT = 30;

/** Pixels of movement before a pointerdown becomes a drag. */
export const OGE_TREE_DRAG_THRESHOLD = 4;

/** Milliseconds a drag must hover a collapsed parent before it auto-expands. */
export const OGE_TREE_DRAG_HOVER_EXPAND_MS = 700;

/**
 * Fraction of a row's height at each edge that means "drop between rows"
 * rather than "drop into this node". With `allowDropInside` off the whole row
 * splits in half instead.
 */
const DROP_EDGE_FRACTION = 0.25;

/**
 * Resolves which of the three drop zones a pointer sits in, given the target
 * row's bounding box.
 *
 * With `allowInside`, the top and bottom quarters mean `before` / `after` and
 * the middle half means `inside`. Without it the row splits at the midpoint
 * into `before` / `after` only.
 */
export function resolveTreeDropPosition(
  clientY: number,
  rect: { top: number; height: number },
  allowInside: boolean,
): OgeTreeDropPosition {
  const offset = clientY - rect.top;
  if (!allowInside) {
    return offset < rect.height / 2 ? 'before' : 'after';
  }
  if (offset < rect.height * DROP_EDGE_FRACTION) return 'before';
  if (offset > rect.height * (1 - DROP_EDGE_FRACTION)) return 'after';
  return 'inside';
}

/** Whether two pointer positions are far enough apart to start a drag. */
export function exceedsTreeDragThreshold(
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  return (
    Math.abs(to.x - from.x) > OGE_TREE_DRAG_THRESHOLD ||
    Math.abs(to.y - from.y) > OGE_TREE_DRAG_THRESHOLD
  );
}

/** A node may never be dropped into its own subtree. */
export function treeCanDrop<T>(
  index: TreeIndex<T>,
  dragKey: RowKey,
  dropKey: RowKey,
): boolean {
  if (dragKey === dropKey) return false;
  return !ancestorsOf(index, dropKey).includes(dragKey);
}

/**
 * One rendered row: a `RowNode` from core's `flattenTreeData` resolved through
 * the component's accessors.
 *
 * Loading placeholders for lazily fetched children come through as `filler`
 * rows, which carry no data and are skipped by keyboard navigation.
 */
export interface OgeTreeViewNode<T> {
  /** DOM-safe unique id of the row (the engine key, stringified). */
  readonly id: string;
  readonly key: RowKey;
  /** `true` for the loading placeholder under an expanded, unloaded parent. */
  readonly filler: boolean;
  /** `true` when this filler represents a failed `loadChildren`. */
  readonly failed: boolean;
  readonly item: T;
  readonly text: string;
  /** Depth, 0 for roots — rendered as `aria-level = level + 1`. */
  readonly level: number;
  readonly posInSet: number;
  readonly setSize: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
  readonly disabled: boolean;
  readonly selected: boolean;
  /** `true` while this node's lazy children are being fetched. */
  readonly loading: boolean;
  readonly checkState: CheckState;
  readonly icon?: string;
  /** Display text with `<mark>` around search matches, `null` when unmatched. */
  readonly highlightedHtml: string | null;
}

/** State of one node's lazy child load. */
export interface OgeTreeLoadState {
  readonly status: 'loading' | 'loaded' | 'failed';
  readonly error?: unknown;
}

/** Resolves a field expression (name or function) into a plain accessor. */
export function treeAccessor<T, R = unknown>(
  expr: OgeTreeExpr<T, R>,
): (row: T) => R {
  if (typeof expr === 'function') return expr;
  const accessor = createFieldAccessor<T>(expr);
  return (row) => accessor(row) as R;
}

/** Inputs of {@link buildTreeViewIndex}. */
export interface OgeTreeIndexInput<T> {
  /** The bound rows: a flat parent-referencing list or nested children. */
  items: readonly T[];
  keyOf: (row: T) => RowKey;
  /** Field holding a node's parent key (flat data). */
  parentIdExpr: OgeTreeExpr<T>;
  /** Field holding a node's nested children (hierarchical data). */
  itemsExpr?: OgeTreeExpr<T, readonly T[] | undefined>;
  /** `plain`/`tree`; inferred from `itemsExpr` when unset. */
  dataStructure?: OgeTreeDataStructure;
  /** Parent value that marks root nodes in flat data. */
  rootValue?: unknown;
  /** Lazily fetched children, keyed by their parent's key. */
  deferred?: ReadonlyMap<RowKey, readonly T[]>;
}

/**
 * Builds the adjacency index the whole pipeline runs on. Nested payloads are
 * flattened first — the engine has one pipeline — and lazily loaded children
 * are folded in (not left to `deferredChildren` alone) so selection,
 * `ancestorsOf` and the drop cycle guard can see them. Their parent link comes
 * from the map key, which is also what makes lazy loading work for nested
 * data, where a child carries no parent field.
 */
export function buildTreeViewIndex<T>(
  input: OgeTreeIndexInput<T>,
): TreeIndex<T> {
  const { keyOf } = input;
  const nested =
    input.dataStructure === 'tree' ||
    (input.dataStructure === undefined && input.itemsExpr !== undefined);
  let rows = input.items;
  let parentOf: ReadonlyMap<RowKey, RowKey | null> | null = null;
  if (nested) {
    const itemsOf = treeAccessor<T, readonly T[] | undefined>(
      input.itemsExpr ?? 'items',
    );
    const flattened = flattenNestedTree(input.items, { keyOf, itemsOf });
    rows = flattened.rows;
    parentOf = flattened.parentOf;
  }

  const loadedRows: T[] = [];
  const loadedParents = new Map<RowKey, RowKey>();
  for (const [parentKey, children] of input.deferred ?? []) {
    for (const child of children) {
      loadedRows.push(child);
      loadedParents.set(keyOf(child), parentKey);
    }
  }
  const parentIdAccessor = treeAccessor<T, unknown>(input.parentIdExpr);
  const nestedParentOf = parentOf;
  const parentIdOf = (row: T): unknown => {
    const key = keyOf(row);
    const loaded = loadedParents.get(key);
    if (loaded !== undefined) return loaded;
    if (nestedParentOf) return nestedParentOf.get(key) ?? null;
    return parentIdAccessor(row);
  };
  return buildTreeIndex<T>([...rows, ...loadedRows], {
    keyOf,
    parentIdOf,
    rootValue: nestedParentOf ? null : input.rootValue,
  });
}

/**
 * The lazy expandability hint — only meaningful with a `loadChildren`, since
 * without one an unbucketed node genuinely has no children.
 */
export function treeHasChildrenHint<T>(
  lazy: boolean,
  hasItemsExpr: OgeTreeExpr<T>,
): ((row: T) => boolean | undefined) | undefined {
  if (!lazy) return undefined;
  const accessor = treeAccessor<T, unknown>(hasItemsExpr);
  return (row) => {
    const value = accessor(row);
    return value === undefined ? undefined : value === true;
  };
}

/** Keys that show an expand toggle — real children or a lazy hint. */
export function treeExpandableKeys<T>(
  index: TreeIndex<T>,
  hasChildren?: (row: T) => boolean | undefined,
): ReadonlySet<RowKey> {
  const keys = new Set<RowKey>(index.childrenOf.keys());
  if (hasChildren) {
    for (const [key, row] of index.byKey) {
      if (hasChildren(row) === true) keys.add(key);
    }
  }
  return keys;
}

/** The fields the search text is compared against (`displayExpr` by default). */
export function treeSearchAccessors<T>(
  displayExpr: OgeTreeExpr<T>,
  searchExpr: OgeTreeExpr<T> | readonly OgeTreeExpr<T>[] | undefined,
): ((row: T) => unknown)[] {
  if (searchExpr === undefined) return [treeAccessor<T, unknown>(displayExpr)];
  const list = Array.isArray(searchExpr)
    ? (searchExpr as readonly OgeTreeExpr<T>[])
    : [searchExpr as OgeTreeExpr<T>];
  return list.map((expr) => treeAccessor<T, unknown>(expr));
}

/**
 * The row predicate for the current search text — `null` when not searching.
 * Comparison folds accents and case through core's `foldText`, so `odeme`
 * matches `Ödemeler`.
 */
export function createTreeSearchPredicate<T>(
  text: string,
  mode: OgeTreeSearchMode,
  accessors: readonly ((row: T) => unknown)[],
): ((row: T) => boolean) | null {
  const needle = foldText(text.trim());
  if (!needle) return null;
  return (row: T) =>
    accessors.some((accessor) => {
      const value = foldText(String(accessor(row) ?? ''));
      if (mode === 'equals') return value === needle;
      if (mode === 'startsWith') return value.startsWith(needle);
      return value.includes(needle);
    });
}

/** Keys that survive the search filter — `null` when not searching. */
export function treeVisibleKeys<T>(
  index: TreeIndex<T>,
  predicate: ((row: T) => boolean) | null,
  filterMode: TreeFilterMode,
): ReadonlySet<RowKey> | null {
  if (!predicate) return null;
  return filterTreeKeys(index, predicate, filterMode);
}

/**
 * Ancestors of matches, so a hit deep in the tree is actually reachable.
 * Ported from tree-list's `filterExpandedKeys`.
 */
export function treeFilterExpandedKeys<T>(
  index: TreeIndex<T>,
  visible: ReadonlySet<RowKey> | null,
  enabled: boolean,
): ReadonlySet<RowKey> {
  if (!visible || !enabled) return new Set<RowKey>();
  const expanded = new Set<RowKey>();
  for (const key of visible) {
    for (const ancestor of ancestorsOf(index, key)) {
      if (visible.has(ancestor)) expanded.add(ancestor);
    }
  }
  return expanded;
}

/** The search-driven expansion overlaid on the user's own expanded set. */
export function treeEffectiveExpanded(
  expanded: ReadonlySet<RowKey>,
  filterExpanded: ReadonlySet<RowKey>,
): ReadonlySet<RowKey> {
  if (filterExpanded.size === 0) return expanded;
  return new Set([...expanded, ...filterExpanded]);
}

const EMPTY_CHECK_STATES: ReadonlyMap<RowKey, CheckState> = new Map();

/** Tri-state per key — empty unless the cascade is actually running. */
export function treeCheckStates<T>(
  index: TreeIndex<T>,
  selected: ReadonlySet<RowKey>,
  active: boolean,
): ReadonlyMap<RowKey, CheckState> {
  if (!active) return EMPTY_CHECK_STATES;
  return computeTreeCheckStates(index, selected);
}

/** Inputs of {@link buildTreeViewNodes}. */
export interface OgeTreeNodesInput<T> {
  index: TreeIndex<T>;
  keyOf: (row: T) => RowKey;
  displayOf: (row: T) => string;
  disabledOf: (row: T) => boolean;
  iconOf?: ((row: T) => string | undefined) | null;
  /** Effective expansion (user set plus search auto-expansion). */
  expandedKeys: ReadonlySet<RowKey>;
  selectedKeys: ReadonlySet<RowKey>;
  checkStates: ReadonlyMap<RowKey, CheckState>;
  loadStates: ReadonlyMap<RowKey, OgeTreeLoadState>;
  deferred?: ReadonlyMap<RowKey, readonly T[]>;
  visibleKeys?: ReadonlySet<RowKey> | null;
  hasChildren?: (row: T) => boolean | undefined;
  /** Search text to wrap in `<mark>`; `''` disables highlighting. */
  highlight?: string;
}

/** The flat, visible node list — the single render source of both layers. */
export function buildTreeViewNodes<T>(
  input: OgeTreeNodesInput<T>,
): readonly OgeTreeViewNode<T>[] {
  const needle = (input.highlight ?? '').trim();
  const flat: readonly RowNode<T>[] = flattenTreeData<T>({
    index: input.index,
    keyOf: input.keyOf,
    expandedRowKeys: input.expandedKeys,
    hasChildren: input.hasChildren,
    deferredChildren: input.deferred,
    visibleKeys: input.visibleKeys,
  });
  const out: OgeTreeViewNode<T>[] = [];
  for (const node of flat) {
    if (node.kind === 'filler') {
      const parentKey = String(node.key).replace(/:loading$/, '');
      const state =
        input.loadStates.get(parentKey) ??
        input.loadStates.get(Number(parentKey));
      out.push({
        id: String(node.key),
        key: parentKey,
        filler: true,
        failed: state?.status === 'failed',
        level: 0,
        text: '',
        posInSet: 0,
        setSize: 0,
        hasChildren: false,
        expanded: false,
        disabled: false,
        selected: false,
        loading: false,
        checkState: 'unchecked',
        highlightedHtml: null,
        item: undefined as unknown as T,
      });
      continue;
    }
    if (node.kind !== 'data') continue;
    const text = input.displayOf(node.data);
    out.push({
      id: String(node.key),
      key: node.key,
      filler: false,
      failed: false,
      item: node.data,
      text,
      level: node.level,
      posInSet: node.posInSet ?? 1,
      setSize: node.setSize ?? 1,
      hasChildren: node.hasChildren === true,
      expanded: node.expanded === true,
      disabled: input.disabledOf(node.data),
      selected: input.selectedKeys.has(node.key),
      loading: input.loadStates.get(node.key)?.status === 'loading',
      checkState:
        input.checkStates.get(node.key) ??
        (input.selectedKeys.has(node.key) ? 'checked' : 'unchecked'),
      icon: input.iconOf?.(node.data),
      highlightedHtml: needle ? buildSearchHighlightHtml(text, needle) : null,
    });
  }
  return out;
}

/** Tri-state of the "select all" row, folded up from the root states. */
export function treeSelectAllState<T>(
  index: TreeIndex<T>,
  keyOf: (row: T) => RowKey,
  checkStates: ReadonlyMap<RowKey, CheckState>,
  selected: ReadonlySet<RowKey>,
): CheckState {
  const { roots } = index;
  if (roots.length === 0) return 'unchecked';
  let checked = 0;
  let partial = 0;
  for (const root of roots) {
    const key = keyOf(root);
    const state =
      checkStates.get(key) ?? (selected.has(key) ? 'checked' : 'unchecked');
    if (state === 'checked') checked++;
    else if (state === 'indeterminate') partial++;
  }
  if (checked === roots.length) return 'checked';
  if (checked > 0 || partial > 0) return 'indeterminate';
  return 'unchecked';
}

/**
 * Resolved `selectByClick`: `undefined` means `true` without checkboxes and
 * `false` with them — otherwise clicking a label would silently tick the box
 * next to it, which is why the references ship `selectByClick: false`.
 */
export function resolveTreeSelectByClick(
  selectByClick: boolean | undefined,
  checkBoxesMode: OgeTreeCheckBoxesMode,
): boolean {
  return selectByClick ?? checkBoxesMode === 'none';
}

/** Row height driving the virtual window: explicit, configured, or default. */
export function resolveTreeItemHeight(
  virtualScroll: boolean | OgeTreeVirtualScrollOptions,
  configured: number | undefined,
): number {
  if (typeof virtualScroll === 'object') return virtualScroll.itemHeight;
  return configured ?? OGE_TREE_DEFAULT_ITEM_HEIGHT;
}

/** Inline padding of a row at this depth, in px. */
export function treeNodeIndent(level: number): number {
  return 8 + level * 16;
}

/**
 * APG: expose selection through `aria-selected` OR `aria-checked`, never both
 * — so this returns `null` whenever the checkbox column owns the state.
 */
export function treeAriaSelected<T>(
  node: OgeTreeViewNode<T>,
  checkBoxesMode: OgeTreeCheckBoxesMode,
  selectionMode: OgeTreeSelectionMode,
): boolean | null {
  if (node.filler || checkBoxesMode !== 'none') return null;
  if (selectionMode === 'none') return null;
  return node.selected;
}

/** The `aria-checked` value of a row, or `null` when checkboxes are off. */
export function treeAriaChecked<T>(
  node: OgeTreeViewNode<T>,
  checkBoxesMode: OgeTreeCheckBoxesMode,
): 'true' | 'false' | 'mixed' | null {
  if (node.filler || checkBoxesMode === 'none') return null;
  if (node.checkState === 'indeterminate') return 'mixed';
  return node.checkState === 'checked' ? 'true' : 'false';
}

/** Fillers and disabled rows are skipped by every keyboard move. */
export function treeNodeDisabled<T>(
  nodes: readonly OgeTreeViewNode<T>[],
  index: number,
): boolean {
  const node = nodes[index];
  return !node || node.filler || node.disabled;
}

/** One arrow step, without wrapping (APG trees do not wrap at the ends). */
export function treeStepIndex<T>(
  nodes: readonly OgeTreeViewNode<T>[],
  start: number,
  direction: 1 | -1,
): number | null {
  return stepEnabledIndex(
    nodes.length,
    start,
    direction,
    (i) => treeNodeDisabled(nodes, i),
    false,
  );
}

/** Home / End: the first or last node that can hold focus. */
export function treeEdgeIndex<T>(
  nodes: readonly OgeTreeViewNode<T>[],
  direction: 1 | -1,
): number | null {
  return edgeEnabledIndex(nodes.length, direction, (i) =>
    treeNodeDisabled(nodes, i),
  );
}

/** Index of the row that is this node's parent, if it is visible. */
export function treeParentIndex<T>(
  nodes: readonly OgeTreeViewNode<T>[],
  index: number,
): number | null {
  const level = nodes[index]?.level ?? 0;
  if (level === 0) return null;
  for (let i = index - 1; i >= 0; i--) {
    if (!nodes[i].filler && nodes[i].level < level) return i;
  }
  return null;
}

/**
 * Type-ahead target for a buffered prefix. A single character searches from
 * the node after the current one (so repeats cycle); a longer prefix
 * re-searches from the current one.
 */
export function treeTypeAheadIndex<T>(
  nodes: readonly OgeTreeViewNode<T>[],
  prefix: string,
  current: number,
): number | null {
  return matchByPrefix(
    nodes.map((node) => node.text),
    prefix,
    prefix.length === 1 ? current : current - 1,
    (i) => treeNodeDisabled(nodes, i),
  );
}

/** Keys the APG `*` shortcut opens: every expandable sibling at this level. */
export function treeSiblingExpansion<T>(
  index: TreeIndex<T>,
  keyOf: (row: T) => RowKey,
  expanded: ReadonlySet<RowKey>,
  expandable: ReadonlySet<RowKey>,
  key: RowKey,
): ReadonlySet<RowKey> {
  const parent = index.parentOf.get(key) ?? null;
  const siblings =
    parent === null ? index.roots : (index.childrenOf.get(parent) ?? []);
  const next = new Set(expanded);
  for (const sibling of siblings) {
    const siblingKey = keyOf(sibling);
    if (expandable.has(siblingKey)) next.add(siblingKey);
  }
  return next;
}

/**
 * The selection set after flipping one node, per mode. `toggleTreeSelection`
 * decides direction from raw membership, so it is only called when that
 * matches the intent.
 */
export function nextTreeSelection<T>(input: {
  index: TreeIndex<T>;
  selected: ReadonlySet<RowKey>;
  key: RowKey;
  select: boolean;
  selectionMode: OgeTreeSelectionMode;
  recursive: boolean;
}): ReadonlySet<RowKey> {
  const { index, selected, key, select } = input;
  if (input.selectionMode === 'single') {
    return select ? new Set<RowKey>([key]) : new Set<RowKey>();
  }
  if (input.recursive) {
    const has = selected.has(key);
    return has === select
      ? new Set(selected)
      : toggleTreeSelection(index, selected, key, true);
  }
  const next = new Set(selected);
  if (select) next.add(key);
  else next.delete(key);
  return next;
}

/** Adds every enabled node in the (inclusive, unordered) row range. */
export function treeRangeSelection<T>(
  nodes: readonly OgeTreeViewNode<T>[],
  selected: ReadonlySet<RowKey>,
  from: number,
  to: number,
): ReadonlySet<RowKey> {
  const start = Math.max(0, Math.min(from, to));
  const end = Math.min(nodes.length - 1, Math.max(from, to));
  const next = new Set(selected);
  for (let i = start; i <= end; i++) {
    const node = nodes[i];
    if (node && !node.filler && !node.disabled) next.add(node.key);
  }
  return next;
}

/** Index the last Shift range extends from — the first selected row. */
export function treeAnchorIndex<T>(
  nodes: readonly OgeTreeViewNode<T>[],
  current: number,
): number {
  const first = nodes.findIndex((node) => !node.filler && node.selected);
  return first === -1 ? current : first;
}

/** Whether any node's lazy children are still in flight. */
export function treeLoadingAny(
  loadStates: ReadonlyMap<RowKey, OgeTreeLoadState>,
): boolean {
  for (const state of loadStates.values()) {
    if (state.status === 'loading') return true;
  }
  return false;
}
