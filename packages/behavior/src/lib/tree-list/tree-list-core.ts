import {
  ArrayDataSource,
  ancestorsOf,
  buildCsv,
  buildTreeIndex,
  computeTreeCheckStates,
  createFieldAccessor,
  createFilterPredicate,
  filterTreeKeys,
  flattenNestedTree,
  flattenTreeData,
  foldText,
  resolveSelectedKeys,
  toggleTreeSelection,
  type CheckState,
  type CsvOptions,
  type DataRowNode,
  type DataSource,
  type FilterExpr,
  type LoadOptions,
  type LoadResult,
  type RowKey,
  type RowNode,
  type TreeFilterMode,
  type TreeIndex,
  type TreeListStateSnapshot,
} from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OgeGridDeferredChildrenCore,
  type OgePendingChildRequest,
} from '../grid/grid-deferred-children';
import type { OgeGridEditingState } from '../grid/grid-editing-state';
import type {
  OgeGridExpansionState,
  OgeGridFilterState,
  OgeGridSelectionState,
} from '../grid/grid-state';
import type { OgeGridKeyboardNavTreeHooks } from '../grid/grid-keyboard-nav';
import type {
  OgeExportColumn,
  OgeExportData,
  OgePagingOptions,
} from '../grid/grid-options';
import {
  isDataSource,
  lookupTextOf,
  type LookupItem,
  type OgeDataType,
} from '../grid/grid-columns';
import { formatCellValue } from '../grid/grid-header-filter';
// the drop zones and the selection-report modes are the tree view's own
// vocabulary — one tree language across the suite
import {
  resolveTreeDropPosition,
  type OgeTreeDropPosition,
  type OgeTreeSelectedKeysMode,
} from '../navigation/tree-view-core';

export type { OgeTreeDropPosition, OgeTreeSelectedKeysMode };

// --- the tree list's public vocabulary --------------------------------------

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

/** Export payload of the visible tree; `levels` aligns with `rows`. */
export interface OgeTreeExportData<T = unknown> extends OgeExportData<T> {
  /** Zero-based depth per exported row (drives spreadsheet outline levels). */
  levels: readonly number[];
}

/** Fired after a row is dropped onto (or next to) another row. */
export interface OgeTreeRowReparentEvent<T = unknown> {
  key: RowKey;
  row: T;
  fromParentKey: RowKey | null;
  toParentKey: RowKey | null;
  /** `'inside'` reparents; `'before'`/`'after'` order among the target's siblings. */
  position: OgeTreeDropPosition;
}

/** `'full'` loads everything up front; `'lazy'` fetches children per expansion. */
export type OgeTreeLoadMode = 'full' | 'lazy';

/** Rows whose parent key is missing: drop them or render them as roots. */
export type OgeTreeOrphanPolicy = 'discard' | 'promoteToRoot';

// --- the core ---------------------------------------------------------------

/** The state slices the tree list reads — both render layers' stores fit. */
export interface OgeTreeListStateSlices {
  expansion: OgeGridExpansionState;
  filter: OgeGridFilterState;
  selection: OgeGridSelectionState;
  editing: OgeGridEditingState;
  loadOptions: () => LoadOptions;
}

/** What the search panel matches against: a column's value accessor. */
export interface OgeTreeSearchColumn<T> {
  readonly accessor: (row: T) => unknown;
}

/** A column as the exporters read it — the render layers' resolved column fits. */
export interface OgeTreeExportSourceColumn<T> {
  readonly caption: string;
  readonly field: string | undefined;
  readonly dataType: OgeDataType;
  readonly accessor: (row: T) => unknown;
  readonly format?: ((value: unknown) => string) | undefined;
  readonly lookupItems?: readonly LookupItem[] | undefined;
}

/** The strings the core formats booleans with. */
export interface OgeTreeBooleanMessages {
  booleanTrue: string;
  booleanFalse: string;
}

/** Reactive getters the host wires into the core — props/inputs, slices, data. */
export interface OgeTreeListCoreDeps<T> {
  /** The raw `data` input (only inspected: array or DataSource). */
  data: () => readonly T[] | DataSource<T>;
  keyExpr: () => string | ((row: T) => RowKey);
  parentIdExpr: () => string | ((row: T) => unknown);
  rootValue: () => unknown;
  orphanPolicy: () => OgeTreeOrphanPolicy;
  autoExpandAll: () => boolean;
  hasItemsExpr: () => string | ((row: T) => boolean) | undefined;
  itemsExpr: () => string | ((row: T) => readonly T[] | undefined) | undefined;
  loadMode: () => OgeTreeLoadMode | undefined;
  filterMode: () => TreeFilterMode;
  expandNodesOnFiltering: () => boolean;
  selectionRecursive: () => boolean;
  /** Client-side paging over the flattened rows; `null` = off. */
  paging: () => OgePagingOptions | null;
  /** Columns the search panel matches (the resolved, visible columns). */
  searchColumns: () => readonly OgeTreeSearchColumn<T>[];
  state: OgeTreeListStateSlices;
  /** The base load result of the host's data adapter. */
  result: () => LoadResult<T> | null;
  /** Current zero-based page — owned by the host (Angular exposes it publicly). */
  pageIndex: OgeReactiveCell<number>;
  onError: (error: unknown) => void;
}

/** Hooks of {@link OgeTreeListCore.requestToggle} — the cancelable pipeline's events. */
export interface OgeTreeToggleNotifier<T> {
  expanding(event: OgeTreeRowTogglingEvent<T>): void;
  collapsing(event: OgeTreeRowTogglingEvent<T>): void;
  expanded(event: OgeTreeRowToggleEvent<T>): void;
  collapsed(event: OgeTreeRowToggleEvent<T>): void;
}

const EMPTY_CHECK_STATES: ReadonlyMap<RowKey, CheckState> = new Map();

/** Remote discovery and subtree loads stop after this many levels. */
const MAX_TREE_DEPTH = 32;

/** Load options minus filter/search — the tree filters client-side. */
function withoutFilter(options: LoadOptions): LoadOptions {
  const rest: Record<string, unknown> = { ...options };
  delete rest['filter'];
  delete rest['searchText'];
  return rest as LoadOptions;
}

/**
 * Wraps the user source for tree semantics: filter/search never reach the
 * source (filtering runs client-side so ancestor rows survive), and lazy mode
 * narrows the base load to the root rows.
 */
export function ogeTreeDataSource<T>(
  inner: DataSource<T>,
  lazy: { parentField: string; rootValue: unknown } | null,
): DataSource<T> {
  return {
    capabilities: { ...inner.capabilities, filter: false },
    keyOf: (item) => inner.keyOf(item),
    load: (options) => {
      const rest = withoutFilter(options);
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
 * Top/bottom quarter of a row = order before/after; the middle = reparent
 * inside. A row with no measurable box always means "inside".
 */
export function ogeTreeDropPosition(
  clientY: number,
  rect: { top: number; height: number } | null | undefined,
): OgeTreeDropPosition {
  if (!rect || rect.height <= 0) return 'inside';
  return resolveTreeDropPosition(clientY, rect, true);
}

/**
 * The tree list's whole data model — index, expansion polarity, client-side
 * filtering with ancestor preservation, lazy children, remote match
 * discovery, recursive selection, paging over the flattened rows, drag &
 * drop reparenting and the export shape.
 *
 * Framework-free (ADR 0001): both render layers construct it with their own
 * {@link OgeReactivityAdapter} — signals in Angular, a versioned store in
 * React — so every derived member tracks exactly as the component's own
 * computeds used to. *When* to run the side-effecting syncs
 * ({@link syncRemoteFilter}, `deferredLoader.sync()`) stays the host's
 * scheduling decision.
 */
export class OgeTreeListCore<T> {
  /** Row → key accessor (trees always need an intrinsic key). */
  readonly rowKeyOf: () => (row: T) => RowKey;
  /** Row → parent reference (nested payloads read the flattened parent map). */
  readonly parentIdOf: () => (row: T) => unknown;
  readonly nestedItemsOf: () => ((row: T) => readonly T[] | undefined) | null;
  readonly hasChildrenHint: () => ((row: T) => boolean | undefined) | undefined;
  /** Lazy child requests filter on this field; requires a string `parentIdExpr`. */
  readonly lazyParentField: () => string | null;
  /** Remote lookups by key (`[keyField, 'in', keys]`) need a string `keyExpr`. */
  readonly lazyKeyField: () => string | null;
  readonly effLoadMode: () => OgeTreeLoadMode;
  /** Unwrapped user source — lazy child requests bypass the tree wrapper. */
  readonly innerSource: () => DataSource<T> | null;
  /** Rows discovered by remote filtering (matches + their ancestor chains). */
  readonly remoteFilterRows: () => readonly T[];
  /** Loaded rows: base result + lazily fetched children + remote matches. */
  readonly indexRows: () => readonly T[];
  /** Adjacency index, rebuilt only when the loaded rows change. */
  readonly treeIndex: () => TreeIndex<T>;
  /** Rows that can expand: loaded buckets plus lazy `hasItemsExpr` hints. */
  readonly expandableKeys: () => ReadonlySet<RowKey>;
  /** Toggled keys with `autoExpandAll` polarity (mirrors grid group expansion). */
  readonly toggledKeys: () => ReadonlySet<RowKey>;
  /** Effective expanded set (independent of polarity). */
  readonly expandedSet: () => ReadonlySet<RowKey>;
  /** Row predicate from the filter slice + search text (`null` = no filter). */
  readonly filterPredicate: () => ((row: T) => boolean) | null;
  /** Keys visible under the active filter (`null` = everything). */
  readonly visibleKeys: () => ReadonlySet<RowKey> | null;
  /** Parents of matches that must expand while filtering. */
  readonly filterExpandedKeys: () => ReadonlySet<RowKey> | null;
  /** Every visible row across all pages (unsaved added rows on top). */
  readonly flatNodes: () => RowNode<T>[];
  /** Expanded lazy nodes whose children are neither indexed nor cached yet. */
  readonly pendingChildRequests: () => readonly OgePendingChildRequest[];
  /** Loader fingerprint without filter/search (the tree filters client-side). */
  readonly childLoadBase: () => LoadOptions;
  /** On-demand child loading for lazily expanded nodes. */
  readonly deferredLoader: OgeGridDeferredChildrenCore<T>;
  /** Effective page size; `null` when paging is off or "all rows". */
  readonly effPageSize: () => number | null;
  readonly pageCount: () => number;
  /** The flat rows actually rendered: the current page, or everything. */
  readonly renderNodes: () => readonly RowNode<T>[];
  /** Visible data-row count across all pages. */
  readonly totalCount: () => number;
  /** Rendered data-row count (the current page). */
  readonly renderedRowCount: () => number;
  /** Key → flat node index of the current view (keyboard hierarchy jumps). */
  readonly keyToFlatIndex: () => ReadonlyMap<RowKey, number>;
  /** Keys of all visible data rows in display order. */
  readonly dataKeys: () => readonly RowKey[];
  readonly firstDataRow: () => T | undefined;
  /** Tri-state map (recursive selection); empty when the feature is off. */
  readonly checkStates: () => ReadonlyMap<RowKey, CheckState>;
  readonly allSelected: () => boolean;
  readonly someSelected: () => boolean;

  private readonly nestedParents: OgeReactiveCell<ReadonlyMap<
    RowKey,
    RowKey | null
  > | null>;
  private readonly innerSourceCell: OgeReactiveCell<DataSource<T> | null>;
  private readonly remoteFilterRowsCell: OgeReactiveCell<readonly T[]>;
  /** User-picked size from the pager; `0` = "all rows", `null` = use options. */
  private readonly pageSizeOverride: OgeReactiveCell<number | null>;
  /** Fingerprint of the discovery currently applied/in flight. */
  private remoteFilterJson: string | null = null;

  constructor(
    private readonly deps: OgeTreeListCoreDeps<T>,
    rx: OgeReactivityAdapter,
  ) {
    const state = deps.state;
    this.nestedParents = rx.cell<ReadonlyMap<RowKey, RowKey | null> | null>(
      null,
    );
    this.innerSourceCell = rx.cell<DataSource<T> | null>(null);
    this.remoteFilterRowsCell = rx.cell<readonly T[]>([]);
    this.pageSizeOverride = rx.cell<number | null>(null);
    this.innerSource = () => this.innerSourceCell();
    this.remoteFilterRows = () => this.remoteFilterRowsCell();

    this.lazyParentField = rx.derived(() => {
      const parent = deps.parentIdExpr();
      return typeof parent === 'string' ? parent : null;
    });
    this.lazyKeyField = rx.derived(() => {
      const key = deps.keyExpr();
      return typeof key === 'string' ? key : null;
    });
    this.effLoadMode = rx.derived<OgeTreeLoadMode>(() => {
      // without a string parent field no child request can ever be built
      if (this.lazyParentField() === null) return 'full';
      const explicit = deps.loadMode();
      if (explicit) return explicit;
      return isDataSource(deps.data()) && deps.hasItemsExpr() !== undefined
        ? 'lazy'
        : 'full';
    });

    this.rowKeyOf = rx.derived(() => {
      const key = deps.keyExpr();
      if (typeof key === 'function') return key;
      const accessor = createFieldAccessor<T>(key);
      return (row: T) => accessor(row) as RowKey;
    });
    this.parentIdOf = rx.derived(() => {
      const nested = this.nestedParents();
      if (nested) {
        const keyOf = this.rowKeyOf();
        return (row: T) => nested.get(keyOf(row)) ?? null;
      }
      const parent = deps.parentIdExpr();
      return typeof parent === 'function'
        ? parent
        : createFieldAccessor<T>(parent);
    });
    this.nestedItemsOf = rx.derived(() => {
      const expr = deps.itemsExpr();
      if (expr === undefined) return null;
      if (typeof expr === 'function') return expr;
      const accessor = createFieldAccessor<T>(expr);
      return (row: T) => accessor(row) as readonly T[] | undefined;
    });
    this.hasChildrenHint = rx.derived(() => {
      const expr = deps.hasItemsExpr();
      if (expr === undefined) return undefined;
      if (typeof expr === 'function') return expr;
      const accessor = createFieldAccessor<T>(expr);
      return (row: T) => {
        const value = accessor(row);
        return value === undefined || value === null
          ? undefined
          : Boolean(value);
      };
    });

    // the loader is built before `indexRows` reads its cache — its deps are
    // closures, only called from `sync()` after construction
    this.deferredLoader = new OgeGridDeferredChildrenCore<T>(
      {
        pending: () => this.pendingChildRequests(),
        baseOptions: () => this.childLoadBase(),
        source: () => this.innerSourceCell(),
        onError: (err) => deps.onError(err),
      },
      rx,
    );

    this.indexRows = rx.derived(() => {
      const base = (deps.result()?.data ?? []) as readonly T[];
      const cache = this.deferredLoader.children();
      const remote = this.remoteFilterRowsCell();
      if (!cache.size && !remote.length) return base;
      // duplicates resolve first-wins in buildTreeIndex, so order is base →
      // lazily fetched children → remotely discovered rows
      const all = [...base];
      for (const rows of cache.values()) all.push(...rows);
      all.push(...remote);
      return all;
    });

    this.treeIndex = rx.derived(() => {
      // track the result identity: a reload must re-index even when the
      // source returns the same (in-place mutated) array reference
      deps.result();
      return buildTreeIndex<T>(this.indexRows(), {
        keyOf: this.rowKeyOf(),
        parentIdOf: this.parentIdOf(),
        rootValue: deps.rootValue(),
        orphanPolicy: deps.orphanPolicy(),
      });
    });

    this.expandableKeys = rx.derived(() => {
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

    this.toggledKeys = () => state.expansion.collapsedGroups();

    this.expandedSet = rx.derived(() => {
      const toggled = this.toggledKeys();
      if (!deps.autoExpandAll()) return toggled;
      const expanded = new Set<RowKey>();
      for (const key of this.expandableKeys()) {
        if (!toggled.has(key)) expanded.add(key);
      }
      return expanded;
    });

    this.filterPredicate = rx.derived(() => {
      const expr = state.filter.combinedExpr();
      const search = state.filter.searchText().trim();
      const exprPredicate = expr ? createFilterPredicate<T>(expr) : null;
      if (!search) return exprPredicate;
      const needle = foldText(search);
      const columns = deps.searchColumns();
      const searchPredicate = (row: T): boolean =>
        columns.some((column) => {
          const value = column.accessor(row);
          return value != null && foldText(String(value)).includes(needle);
        });
      if (!exprPredicate) return searchPredicate;
      return (row: T) => exprPredicate(row) && searchPredicate(row);
    });

    this.visibleKeys = rx.derived(() => {
      const predicate = this.filterPredicate();
      if (!predicate) return null;
      return filterTreeKeys(this.treeIndex(), predicate, deps.filterMode());
    });

    this.filterExpandedKeys = rx.derived(() => {
      if (!deps.expandNodesOnFiltering()) return null;
      const visible = this.visibleKeys();
      if (!visible) return null;
      const index = this.treeIndex();
      const parents = new Set<RowKey>();
      for (const key of visible) {
        const parent = index.parentOf.get(key);
        if (parent != null && visible.has(parent)) parents.add(parent);
      }
      return parents;
    });

    this.flatNodes = rx.derived(() => {
      let toggled = this.toggledKeys();
      const autoExpandAll = deps.autoExpandAll();
      const filterExpanded = this.filterExpandedKeys();
      if (filterExpanded?.size) {
        const next = new Set(toggled);
        // toggled = collapsed under autoExpandAll: matched paths must not stay
        // collapsed; otherwise toggled = expanded: they join the set
        for (const key of filterExpanded) {
          if (autoExpandAll) next.delete(key);
          else next.add(key);
        }
        toggled = next;
      }
      const nodes = flattenTreeData<T>({
        index: this.treeIndex(),
        keyOf: this.rowKeyOf(),
        ...(autoExpandAll
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
      const added = state.editing.added();
      if (!added.length) return nodes;
      const changes = state.editing.changes();
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

    this.pendingChildRequests = rx.derived(() => {
      if (this.effLoadMode() !== 'lazy') return [];
      const parentField = this.lazyParentField();
      if (!parentField) return [];
      const index = this.treeIndex();
      const cache = this.deferredLoader.children();
      const requests: OgePendingChildRequest[] = [];
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

    this.childLoadBase = rx.derived(() => {
      return withoutFilter(state.loadOptions());
    });

    // --- paging over the visible rows ---
    this.effPageSize = rx.derived(() => {
      const options = deps.paging();
      if (!options) return null;
      const override = this.pageSizeOverride();
      const size = override ?? options.pageSize ?? 20;
      return size > 0 ? size : null; // 0 = "all"
    });
    this.pageCount = rx.derived(() => {
      const size = this.effPageSize();
      if (size === null) return 1;
      return Math.max(1, Math.ceil(this.flatNodes().length / size));
    });
    this.renderNodes = rx.derived(() => {
      const nodes = this.flatNodes();
      const size = this.effPageSize();
      if (size === null) return nodes;
      const page = Math.min(deps.pageIndex(), this.pageCount() - 1);
      return nodes.slice(page * size, (page + 1) * size);
    });
    const countData = (nodes: readonly RowNode<T>[]): number =>
      nodes.reduce(
        (count, node) => (node.kind === 'data' ? count + 1 : count),
        0,
      );
    this.totalCount = rx.derived(() => countData(this.flatNodes()));
    this.renderedRowCount = rx.derived(() => countData(this.renderNodes()));
    this.keyToFlatIndex = rx.derived(() => {
      const map = new Map<RowKey, number>();
      const nodes = this.renderNodes();
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].kind === 'data') map.set(nodes[i].key, i);
      }
      return map;
    });
    this.dataKeys = rx.derived(() =>
      this.flatNodes().flatMap((node) =>
        node.kind === 'data' ? [node.key] : [],
      ),
    );
    this.firstDataRow = rx.derived(() => {
      const node = this.flatNodes().find((entry) => entry.kind === 'data');
      return node?.kind === 'data' ? node.data : undefined;
    });

    // --- selection ---
    this.checkStates = rx.derived(() => {
      if (!deps.selectionRecursive()) return EMPTY_CHECK_STATES;
      return computeTreeCheckStates(
        this.treeIndex(),
        state.selection.selected(),
      );
    });
    this.allSelected = rx.derived(() => {
      const keys = this.dataKeys();
      if (!keys.length) return false;
      const selected = state.selection.selected();
      return keys.every((key) => selected.has(key));
    });
    this.someSelected = rx.derived(
      () => state.selection.count() > 0 && !this.allSelected(),
    );
  }

  // --- source wiring ---------------------------------------------------------

  /**
   * The reads {@link connect} depends on — a host that tracks dependencies
   * (Angular's `effect`) calls this in the tracked part and `connect()`
   * untracked, so exactly these inputs re-run the wiring.
   */
  connectInputs(): void {
    this.deps.data();
    this.rowKeyOf();
    this.lazyParentField();
    this.effLoadMode();
    this.deps.rootValue();
    this.nestedItemsOf();
  }

  /**
   * Normalizes the `data` input — nested payloads flatten, arrays become an
   * `ArrayDataSource` — and returns the tree-wrapped source the host's data
   * adapter should load. A new source invalidates the child cache: stale rows
   * from the previous source must never join the new tree.
   */
  connect(
    data: readonly T[] | DataSource<T>,
    sortValues?: Readonly<Record<string, (row: T) => unknown>>,
  ): DataSource<T> {
    const key = this.rowKeyOf();
    const itemsOf = this.nestedItemsOf();
    let rows = data;
    let nestedParents: ReadonlyMap<RowKey, RowKey | null> | null = null;
    if (itemsOf && !isDataSource(data)) {
      // nested payload: flatten inline children into the plain shape
      const flattened = flattenNestedTree(data, { keyOf: key, itemsOf });
      rows = flattened.rows;
      nestedParents = flattened.parentOf;
    }
    const inner = isDataSource(rows)
      ? rows
      : new ArrayDataSource<T>(rows, { key, sortValues });
    this.nestedParents.set(nestedParents);
    if (this.innerSourceCell() !== null) {
      this.deferredLoader.reset();
      this.remoteFilterJson = null;
      this.remoteFilterRowsCell.set([]);
    }
    this.innerSourceCell.set(inner);
    const parentField = this.lazyParentField();
    const lazy = this.effLoadMode() === 'lazy' && parentField !== null;
    return ogeTreeDataSource(
      inner,
      lazy && parentField
        ? { parentField, rootValue: this.deps.rootValue() }
        : null,
    );
  }

  /** Drops lazily fetched and remotely discovered rows (host then reloads). */
  refresh(): void {
    this.deferredLoader.reset();
    this.remoteFilterJson = null;
    this.remoteFilterRowsCell.set([]);
  }

  // --- lazy remote filtering ---------------------------------------------------

  /** The reads {@link syncRemoteFilter} depends on (see {@link connectInputs}). */
  remoteFilterInputs(): void {
    this.deps.state.filter.combinedExpr();
    this.deps.state.filter.searchText();
    this.effLoadMode();
    this.innerSourceCell();
    this.lazyKeyField();
  }

  /**
   * Lazy trees cannot find matches under unloaded branches client-side, so an
   * active filter/search additionally asks the source for ALL matching rows
   * and then completes their ancestor chains via `[keyField, 'in', keys]`
   * lookups. Needs string `keyExpr` + `parentIdExpr`; the contract is the
   * plain filter language, so OData/custom stores work unchanged. Idempotent:
   * the same filter never starts a second discovery.
   */
  syncRemoteFilter(): void {
    const expr = this.deps.state.filter.combinedExpr();
    const search = this.deps.state.filter.searchText().trim();
    const lazy = this.effLoadMode() === 'lazy';
    const source = this.innerSourceCell();
    const keyField = this.lazyKeyField();
    if (!lazy || !source || !keyField || (!expr && !search)) {
      this.remoteFilterJson = null;
      if (this.remoteFilterRowsCell().length) this.remoteFilterRowsCell.set([]);
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
  }

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
      const keyOf = this.rowKeyOf();
      const parentIdOf = this.parentIdOf();
      const rootValue = this.deps.rootValue();
      const known = new Set<RowKey>(this.indexRows().map(keyOf));
      for (const row of rows) known.add(keyOf(row));
      // complete the ancestor chains level by level (depth-capped)
      for (let depth = 0; depth < MAX_TREE_DEPTH; depth++) {
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
      this.remoteFilterRowsCell.set(rows);
    } catch (err) {
      if (this.remoteFilterJson === fingerprint) this.deps.onError(err);
    }
  }

  // --- lazy subtree loading (recursive selection) ------------------------------

  /** True when a hint-expandable descendant of `key` has no loaded children. */
  hasUnloadedDescendants(key: RowKey): boolean {
    const hint = this.hasChildrenHint();
    if (!hint || this.effLoadMode() !== 'lazy') return false;
    const index = this.treeIndex();
    const cache = this.deferredLoader.children();
    const keyOf = this.rowKeyOf();
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
  async loadSubtree(rootKey: RowKey): Promise<void> {
    const source = this.innerSourceCell();
    const parentField = this.lazyParentField();
    const hint = this.hasChildrenHint();
    if (!source || !parentField || !hint) return;
    const keyOf = this.rowKeyOf();
    const parentIdOf = this.parentIdOf();
    // seed: every hint-expandable node under the root with no loaded bucket
    const missingUnder = (): RowKey[] => {
      const index = this.treeIndex();
      const cache = this.deferredLoader.children();
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
    for (let depth = 0; depth < MAX_TREE_DEPTH && frontier.length; depth++) {
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
            !this.treeIndex().childrenOf.has(key) &&
            !this.deferredLoader.children().has(key),
        );
    }
  }

  // --- paging -------------------------------------------------------------------

  /** Navigates to the given zero-based page (clamped to the valid range). */
  setPageIndex(index: number): void {
    const count = this.pageCount();
    this.deps.pageIndex.set(Math.min(Math.max(0, index), count - 1));
  }

  /** Current page size; `0` when paging is off or set to "all rows". */
  pageSize(): number {
    return this.effPageSize() ?? 0;
  }

  /** Changes the page size (`0` shows all rows) and resets to the first page. */
  setPageSize(size: number): void {
    this.pageSizeOverride.set(size);
    this.deps.pageIndex.set(0);
  }

  // --- selection ------------------------------------------------------------------

  /** Checkbox state of a row: tri-state under recursive selection. */
  rowCheckState(key: RowKey): CheckState {
    if (!this.deps.selectionRecursive()) {
      return this.deps.state.selection.isSelected(key)
        ? 'checked'
        : 'unchecked';
    }
    return this.checkStates().get(key) ?? 'unchecked';
  }

  /**
   * Central toggle: cascades through descendants in recursive mode. On lazy
   * trees the missing subtree is bulk-fetched first, so the cascade covers
   * branches that were never expanded.
   */
  toggleSelection(key: RowKey): void {
    if (!this.deps.selectionRecursive()) {
      this.deps.state.selection.toggle(key);
      return;
    }
    if (this.hasUnloadedDescendants(key)) {
      void this.loadSubtree(key).then(() => this.applyRecursiveToggle(key));
      return;
    }
    this.applyRecursiveToggle(key);
  }

  private applyRecursiveToggle(key: RowKey): void {
    this.deps.state.selection.replace([
      ...toggleTreeSelection(
        this.treeIndex(),
        this.deps.state.selection.selected(),
        key,
        true,
      ),
    ]);
  }

  /** Selected keys narrowed per mode (recursive selection reporting). */
  getSelectedRowKeys(mode: OgeTreeSelectedKeysMode = 'all'): RowKey[] {
    return resolveSelectedKeys(
      this.treeIndex(),
      this.deps.state.selection.selected(),
      mode,
    );
  }

  /** Data of the selected rows, narrowed per mode like `getSelectedRowKeys`. */
  getSelectedRowsData(mode: OgeTreeSelectedKeysMode = 'all'): T[] {
    const index = this.treeIndex();
    return this.getSelectedRowKeys(mode)
      .map((key) => index.byKey.get(key))
      .filter((row): row is T => row !== undefined);
  }

  /**
   * Selects every visible row; recursive mode additionally cascades to all
   * their descendants, so select-all and per-row toggles agree about scope
   * under a filter.
   */
  selectAll(): void {
    const keys = this.dataKeys();
    if (!this.deps.selectionRecursive()) {
      this.deps.state.selection.replace(keys);
      return;
    }
    const index = this.treeIndex();
    const keyOf = this.rowKeyOf();
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
    this.deps.state.selection.replace([...selected]);
  }

  // --- expansion --------------------------------------------------------------------

  isRowExpanded(key: RowKey): boolean {
    return this.expandedSet().has(key);
  }

  expandAll(): void {
    this.deps.state.expansion.setGroups(
      this.deps.autoExpandAll() ? new Set() : new Set(this.expandableKeys()),
    );
  }

  collapseAll(): void {
    this.deps.state.expansion.setGroups(
      this.deps.autoExpandAll() ? new Set(this.expandableKeys()) : new Set(),
    );
  }

  /** Polarity-aware: expanded means "not toggled" under `autoExpandAll`. */
  expandRow(key: RowKey): void {
    const toggled = this.toggledKeys().has(key);
    const shouldToggle = this.deps.autoExpandAll() ? toggled : !toggled;
    if (shouldToggle) this.deps.state.expansion.toggleGroup(key);
  }

  collapseRow(key: RowKey): void {
    const toggled = this.toggledKeys().has(key);
    const shouldToggle = this.deps.autoExpandAll() ? !toggled : toggled;
    if (shouldToggle) this.deps.state.expansion.toggleGroup(key);
  }

  /**
   * Writes a controlled `expandedRowKeys` value into the expansion slice,
   * polarity-aware. A no-op when the set already matches — which is what lets
   * both directions of the binding run without echoing.
   */
  applyExpandedRowKeys(keys: readonly RowKey[]): void {
    const current = this.expandedSet();
    if (keys.length === current.size && keys.every((key) => current.has(key)))
      return;
    const wanted = new Set(keys);
    if (this.deps.autoExpandAll()) {
      const toggled = new Set<RowKey>();
      for (const key of this.expandableKeys()) {
        if (!wanted.has(key)) toggled.add(key);
      }
      this.deps.state.expansion.setGroups(toggled);
    } else {
      this.deps.state.expansion.setGroups(wanted);
    }
  }

  /**
   * The cancelable expand/collapse pipeline of UI-driven toggles: the `-ing`
   * event may veto, then the toggle, then the past-tense event. The
   * imperative `expandRow()`/`collapseRow()` bypass it on purpose.
   */
  requestToggle(
    node: DataRowNode<T>,
    expand: boolean,
    notify: OgeTreeToggleNotifier<T>,
  ): boolean {
    if (!node.hasChildren || node.expanded === expand) return false;
    const toggling: OgeTreeRowTogglingEvent<T> = {
      key: node.key,
      row: node.data,
      cancel: false,
    };
    if (expand) notify.expanding(toggling);
    else notify.collapsing(toggling);
    if (toggling.cancel) return false;
    this.deps.state.expansion.toggleGroup(node.key);
    if (expand) notify.expanded({ key: node.key, row: node.data });
    else notify.collapsed({ key: node.key, row: node.data });
    return true;
  }

  /**
   * Expands the ancestor chain of `key` and returns its flat index in the
   * current view — `undefined` when the row is unknown or not rendered.
   */
  revealRow(key: RowKey): number | undefined {
    const index = this.treeIndex();
    if (!index.byKey.has(key)) return undefined;
    for (const ancestor of ancestorsOf(index, key)) this.expandRow(ancestor);
    return this.keyToFlatIndex().get(key);
  }

  /** Treegrid keyboard hooks over the rendered rows (Right/Left semantics). */
  keyboardTreeHooks(
    toggle: (node: DataRowNode<T>, expand: boolean) => void,
  ): OgeGridKeyboardNavTreeHooks {
    const dataNodeAt = (row: number): DataRowNode<T> | undefined => {
      const node = this.renderNodes()[row];
      return node?.kind === 'data' ? node : undefined;
    };
    return {
      isExpandable: (row) => dataNodeAt(row)?.hasChildren === true,
      isExpanded: (row) => dataNodeAt(row)?.expanded === true,
      toggle: (row, expand) => {
        const node = dataNodeAt(row);
        if (node) toggle(node, expand);
      },
      parentRowIndex: (row) => {
        const node = dataNodeAt(row);
        if (!node || node.parentKey == null) return -1;
        return this.keyToFlatIndex().get(node.parentKey) ?? -1;
      },
      firstChildRowIndex: (row) => {
        const node = dataNodeAt(row);
        if (!node?.expanded) return -1;
        const nodes = this.renderNodes();
        for (let i = row + 1; i < nodes.length; i++) {
          const next = nodes[i];
          if (next.kind !== 'data') continue;
          return next.parentKey === node.key ? i : -1;
        }
        return -1;
      },
    };
  }

  // --- rows & nodes -----------------------------------------------------------------

  /** The loaded row carrying `key` (any branch). */
  getNodeByKey(key: RowKey): T | undefined {
    return this.treeIndex().byKey.get(key);
  }

  /** The flat data node carrying `key`, if it is currently visible. */
  dataNodeByKey(key: RowKey): DataRowNode<T> | undefined {
    return this.flatNodes().find(
      (node): node is DataRowNode<T> =>
        node.kind === 'data' && node.key === key,
    );
  }

  /** Runs `callback` for every loaded row (all branches, loaded lazily or not). */
  forEachNode(
    callback: (row: T, key: RowKey, parentKey: RowKey | null) => void,
  ): void {
    const index = this.treeIndex();
    for (const [key, row] of index.byKey) {
      callback(row, key, index.parentOf.get(key) ?? null);
    }
  }

  /** Data rows of the currently rendered page, in display order. */
  getVisibleRows(): readonly T[] {
    return this.renderNodes().flatMap((node) =>
      node.kind === 'data' ? [node.data] : [],
    );
  }

  /**
   * `addRow(parentKey)` staging: with a string `parentIdExpr` the parent
   * reference is written onto the new row, so saving inserts it under that
   * node.
   */
  stageNewRowParent(key: RowKey, parentKey: RowKey | undefined): void {
    const parentField = this.lazyParentField();
    if (parentKey !== undefined && parentField !== null) {
      this.deps.state.editing.setChange(key, parentField, parentKey);
    }
  }

  // --- drag & drop reparenting --------------------------------------------------------

  /** A row must not be dropped onto itself or become a descendant of itself. */
  isValidDropTarget(draggedKey: RowKey | null, targetKey: RowKey): boolean {
    if (draggedKey === null || draggedKey === targetKey) return false;
    return !ancestorsOf(this.treeIndex(), targetKey).includes(draggedKey);
  }

  /**
   * Applies a drop. With plain-array data and a writable top-level parent
   * field the row is moved in place (`reload` is called); dotted paths,
   * nested payloads and DataSources are the consumer's job — they get the
   * returned event and persist the move themselves. `null` when the drop is
   * invalid or changes nothing.
   */
  applyDrop(
    draggedKey: RowKey,
    targetKey: RowKey,
    position: OgeTreeDropPosition,
    reload: () => void,
  ): OgeTreeRowReparentEvent<T> | null {
    if (!this.isValidDropTarget(draggedKey, targetKey)) return null;
    const index = this.treeIndex();
    const row = index.byKey.get(draggedKey);
    if (row === undefined) return null;
    const fromParentKey = index.parentOf.get(draggedKey) ?? null;
    const toParentKey =
      position === 'inside'
        ? targetKey
        : (index.parentOf.get(targetKey) ?? null);
    if (position === 'inside' && fromParentKey === targetKey) return null;
    const data = this.deps.data();
    const parentField = this.lazyParentField();
    if (
      !isDataSource(data) &&
      this.nestedItemsOf() === null &&
      parentField !== null &&
      !parentField.includes('.')
    ) {
      (row as Record<string, unknown>)[parentField] =
        toParentKey === null ? this.deps.rootValue() : toParentKey;
      if (position !== 'inside') {
        // before/after: also move the row next to the target in the backing
        // array, so sibling order (data order) reflects the drop
        const array = data as T[];
        const from = array.indexOf(row);
        if (from >= 0) array.splice(from, 1);
        const targetRow = index.byKey.get(targetKey);
        const at = targetRow === undefined ? -1 : array.indexOf(targetRow);
        if (at < 0) array.push(row);
        else array.splice(position === 'before' ? at : at + 1, 0, row);
      }
      reload();
    }
    if (position === 'inside') this.expandRow(targetKey);
    return { key: draggedKey, row, fromParentKey, toParentKey, position };
  }

  // --- header filter (distinct values over the loaded rows) ---------------------------

  /**
   * Distinct raw values of a column over every loaded row, ordered by folded
   * text — locale-independent, so local and CI runs agree. The tree lists
   * what it has loaded rather than asking the source, because filtering is
   * client-side here.
   */
  distinctValues(
    accessor: (row: T) => unknown,
    limit: number,
  ): readonly unknown[] {
    const seen = new Map<string, unknown>();
    for (const row of this.indexRows()) {
      const value = accessor(row);
      const text = String(value ?? '');
      if (!seen.has(text)) seen.set(text, value);
    }
    return [...seen.entries()]
      .sort(([a], [b]) => {
        const fa = foldText(a);
        const fb = foldText(b);
        return fa < fb ? -1 : fa > fb ? 1 : 0;
      })
      .slice(0, limit)
      .map(([, value]) => value);
  }

  // --- persistence ------------------------------------------------------------------------

  /** The expansion part of a `TreeListStateSnapshot`. */
  expansionSnapshot(): NonNullable<TreeListStateSnapshot['expansion']> {
    return { toggled: [...this.toggledKeys()] };
  }

  /** Restores the expansion part of a snapshot, if it has one. */
  applyExpansionSnapshot(snapshot: TreeListStateSnapshot): void {
    if (snapshot.expansion) {
      this.deps.state.expansion.setGroups(new Set(snapshot.expansion.toggled));
    }
  }

  // --- export ---------------------------------------------------------------------------------

  /**
   * Rows, column metadata and depth levels of the currently visible tree
   * (expansion + filter applied, all pages) — the shared source for exporters.
   * Cell text is display-faithful: format > lookup text > boolean labels.
   */
  getExportData(
    columns: readonly OgeTreeExportSourceColumn<T>[],
    messages: OgeTreeBooleanMessages,
  ): OgeTreeExportData<T> {
    const nodes = this.flatNodes().filter(
      (node): node is DataRowNode<T> => node.kind === 'data',
    );
    const exportColumns: OgeExportColumn<T>[] = columns.map((column) => ({
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
    }));
    return {
      rows: nodes.map((node) => node.data),
      columns: exportColumns,
      levels: nodes.map((node) => node.level),
    };
  }

  /** TSV of the selected visible rows with a header row, or `''` when none. */
  clipboardText(columns: readonly OgeExportColumn<T>[]): string {
    const selected = this.deps.state.selection.selected();
    if (!selected.size) return '';
    const rows = this.flatNodes()
      .filter(
        (node): node is DataRowNode<T> =>
          node.kind === 'data' && selected.has(node.key),
      )
      .map((node) => node.data);
    if (!rows.length) return '';
    return buildCsv(rows, columns, { separator: '\t', bom: false });
  }
}

/**
 * CSV of tree export data, the hierarchy expressed by indenting the first
 * column two spaces per level. Goes through `buildCsv`, so the formula guard
 * applies.
 */
export function ogeTreeCsv<T>(
  data: OgeTreeExportData<T>,
  options?: CsvOptions,
): string {
  const { rows, columns, levels } = data;
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

/** Text a distinct value is listed under in the tree's header-filter popup. */
export function ogeTreeHeaderValueText(
  value: unknown,
  column: {
    dataType: OgeDataType;
    format?: ((value: unknown) => string) | undefined;
    lookupItems?: readonly LookupItem[] | undefined;
  } | null,
  blankValue: string,
): string {
  if (!column) return String(value ?? '');
  if (value == null || value === '') return blankValue;
  if (column.lookupItems) return lookupTextOf(column.lookupItems, value);
  return formatCellValue(value, column.dataType, column.format);
}

/**
 * Date columns group their header-filter values by year (tri-state group
 * checkboxes), years ascending; the search matches the year label or a
 * value's text, and groups left empty disappear.
 */
export function ogeTreeHeaderValueGroups(
  values: readonly unknown[],
  search: string,
  textOf: (value: unknown) => string,
  blankValue: string,
): readonly { label: string; values: readonly unknown[] }[] {
  const byYear = new Map<string, unknown[]>();
  for (const value of values) {
    const date = value instanceof Date ? value : new Date(String(value));
    const label = Number.isNaN(date.getTime())
      ? blankValue
      : String(date.getFullYear());
    const bucket = byYear.get(label);
    if (bucket) bucket.push(value);
    else byYear.set(label, [value]);
  }
  const query = foldText(search.trim());
  return [...byYear.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([label, groupValues]) => ({
      label,
      values: query
        ? groupValues.filter(
            (value) =>
              foldText(label).includes(query) ||
              foldText(textOf(value)).includes(query),
          )
        : groupValues,
    }))
    .filter((group) => group.values.length > 0);
}
