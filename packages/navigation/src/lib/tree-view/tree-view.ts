import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  ancestorsOf,
  buildSearchHighlightHtml,
  buildTreeIndex,
  computeTreeCheckStates,
  createFieldAccessor,
  createTypeAheadBuffer,
  edgeEnabledIndex,
  flattenNestedTree,
  flattenTreeData,
  filterTreeKeys,
  foldText,
  matchByPrefix,
  resolveSelectedKeys,
  stepEnabledIndex,
  toggleTreeSelection,
  type CheckState,
  type RowKey,
  type RowNode,
  type TreeIndex,
} from '@oge-ui/core';
import { OGE_TREE_VIEW_CONFIG, type OgeTreeViewMessages } from './config';
import {
  OgeTreeExpandIconTemplate,
  OgeTreeItemTemplate,
  OgeTreeNoDataTemplate,
} from './templates';
import {
  TREE_DRAG_HOVER_EXPAND_MS,
  exceedsDragThreshold,
  resolveDropPosition,
} from './tree-view-dnd';
import type { OgeTreeNode } from './tree-view-node';
import type {
  OgeTreeChildrenFailedEvent,
  OgeTreeChildrenLoadedEvent,
  OgeTreeCheckBoxesMode,
  OgeTreeCollapsedEvent,
  OgeTreeCollapsingEvent,
  OgeTreeDataStructure,
  OgeTreeDropPosition,
  OgeTreeExpandEvent,
  OgeTreeExpandIconTemplateContext,
  OgeTreeExpandedEvent,
  OgeTreeExpandingEvent,
  OgeTreeExpr,
  OgeTreeItemClickEvent,
  OgeTreeItemSelectionChangedEvent,
  OgeTreeItemTemplateContext,
  OgeTreeLoadChildren,
  OgeTreeReorderedEvent,
  OgeTreeReorderingEvent,
  OgeTreeSearchMode,
  OgeTreeSelectAllChangedEvent,
  OgeTreeSelectedKeysMode,
  OgeTreeSelectionChangedEvent,
  OgeTreeSelectionChangingEvent,
  OgeTreeSelectionMode,
  OgeTreeSize,
  OgeTreeVirtualScrollOptions,
  TreeFilterMode,
} from './tree-view-types';
import { TreeVirtualizerModel } from './tree-view-virtualizer';

let nextComponentId = 0;

const DEFAULT_ITEM_HEIGHT = 30;
const EMPTY_CHECK_STATES: ReadonlyMap<RowKey, CheckState> = new Map();

/** State of one node's lazy child load. */
interface LoadState {
  readonly status: 'loading' | 'loaded' | 'failed';
  readonly error?: unknown;
}

/**
 * Hierarchical list following the WAI-ARIA APG treeview pattern: a roving
 * tabindex over `role="treeitem"` rows, arrow / Home / End / type-ahead
 * navigation, and `*` to expand a level.
 *
 * Data is either a flat parent-referencing array or nested children; both are
 * normalized by `@oge-ui/core`'s tree engine, which also supplies the
 * tri-state cascade, the search filter and the lazy-child placeholders.
 *
 * ```html
 * <oge-tree-view
 *   [items]="folders"
 *   keyExpr="id"
 *   parentIdExpr="parentId"
 *   displayExpr="name"
 *   showCheckBoxes="normal"
 *   [(selectedKeys)]="picked"
 * />
 * ```
 */
@Component({
  selector: 'oge-tree-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './tree-view.scss',
  host: {
    class: 'oge-tree-view',
    '[class.oge-disabled]': 'disabled()',
    '[attr.data-size]': 'size()',
    '(keydown)': 'onHostKeydown($event)',
  },
  template: `
    @if (searchEnabled()) {
      <div class="oge-tree-view-search">
        <input
          #searchInput
          type="search"
          class="oge-tree-view-search-input"
          [value]="searchValue()"
          [attr.placeholder]="mergedMessages().searchPlaceholder"
          [attr.aria-label]="mergedMessages().searchLabel"
          [disabled]="disabled()"
          (input)="onSearchInput($event)"
        />
      </div>
    }
    @if (checkBoxesMode() === 'selectAll' && nodes().length > 0) {
      <div
        class="oge-tree-view-select-all"
        role="checkbox"
        tabindex="0"
        [attr.aria-checked]="
          selectAllState() === 'indeterminate'
            ? 'mixed'
            : selectAllState() === 'checked'
        "
        [attr.aria-disabled]="disabled() ? true : null"
        (click)="toggleSelectAll()"
        (keydown)="onSelectAllKeydown($event)"
      >
        <span
          class="oge-tree-view-check"
          aria-hidden="true"
          [attr.data-state]="selectAllState()"
        ></span>
        <span class="oge-tree-view-select-all-label">{{
          mergedMessages().selectAll
        }}</span>
      </div>
    }

    @if (nodes().length === 0) {
      <div class="oge-tree-view-empty">
        @if (noDataTemplate(); as tpl) {
          <ng-container *ngTemplateOutlet="tpl.templateRef" />
        } @else {
          {{
            searchValue()
              ? mergedMessages().noSearchResults
              : mergedMessages().noData
          }}
        }
      </div>
    } @else {
      <div
        #scrollEl
        class="oge-tree-view-scroll"
        [class.oge-tree-view-virtual]="virtualEnabled()"
        [style.block-size]="height() ?? null"
        [style.--oge-tree-item-height.px]="itemHeight()"
        (scroll)="onScroll($event)"
      >
        <div
          role="tree"
          class="oge-tree-view-list"
          [id]="resolvedTreeId()"
          [attr.aria-label]="ariaLabel()"
          [attr.aria-multiselectable]="
            selectionMode() === 'multiple' ? true : null
          "
          [attr.aria-busy]="loadingAny() ? true : null"
          [style.block-size.px]="virtualEnabled() ? totalHeight() : null"
        >
          <div
            class="oge-tree-view-viewport"
            [style.transform]="
              virtualEnabled() ? 'translateY(' + offsetY() + 'px)' : null
            "
          >
            @for (node of renderedNodes(); track node.id) {
              <div
                #rowEl
                class="oge-tree-view-item"
                [class.oge-tree-view-item-selected]="node.selected"
                [class.oge-tree-view-item-disabled]="node.disabled"
                [class.oge-tree-view-item-loading]="node.loading"
                [class.oge-tree-view-item-filler]="node.filler"
                [class.oge-tree-view-item-dragging]="dragKey() === node.key"
                [class.oge-tree-view-item-drop-before]="
                  dropTargetKey() === node.key && dropPosition() === 'before'
                "
                [class.oge-tree-view-item-drop-after]="
                  dropTargetKey() === node.key && dropPosition() === 'after'
                "
                [class.oge-tree-view-item-drop-inside]="
                  dropTargetKey() === node.key && dropPosition() === 'inside'
                "
                [attr.role]="node.filler ? null : 'treeitem'"
                [attr.data-key]="node.filler ? null : node.key"
                [id]="uid + '-node-' + node.id"
                [attr.aria-level]="node.level + 1"
                [attr.aria-posinset]="node.filler ? null : node.posInSet"
                [attr.aria-setsize]="node.filler ? null : node.setSize"
                [attr.aria-expanded]="
                  node.filler || !node.hasChildren ? null : node.expanded
                "
                [attr.aria-selected]="ariaSelected(node)"
                [attr.aria-checked]="ariaChecked(node)"
                [attr.aria-disabled]="node.disabled ? true : null"
                [tabindex]="rovingTabIndex(node)"
                [style.padding-inline-start.px]="indentOf(node)"
                (click)="onRowClick(node, $event)"
                (keydown)="onKeydown($event)"
                (dblclick)="onRowDblClick(node, $event)"
                (focus)="onRowFocus(node)"
                (pointerdown)="onPointerDown(node, $event)"
                (pointermove)="onPointerMove($event)"
                (pointerup)="onPointerUp($event)"
              >
                @if (node.filler) {
                  <span class="oge-tree-view-spinner" aria-hidden="true"></span>
                  <span class="oge-tree-view-filler-text">{{
                    node.failed
                      ? mergedMessages().childrenLoadFailed
                      : mergedMessages().loadingChildren
                  }}</span>
                } @else {
                  <span
                    class="oge-tree-view-toggle"
                    [class.oge-tree-view-toggle-hidden]="!node.hasChildren"
                    aria-hidden="true"
                  >
                    @if (node.hasChildren) {
                      @if (expandIconTemplate(); as tpl) {
                        <ng-container
                          *ngTemplateOutlet="
                            tpl.templateRef;
                            context: expandIconContext(node)
                          "
                        />
                      } @else if (node.loading) {
                        <span class="oge-tree-view-spinner"></span>
                      } @else {
                        <svg viewBox="0 0 24 24" width="14" height="14">
                          <path
                            d="M9 6l6 6-6 6"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      }
                    }
                  </span>
                  @if (checkBoxesMode() !== 'none') {
                    <!--
                      Deliberately a span, not a checkbox input: a focusable
                      control inside role="treeitem" is a nested-interactive
                      a11y violation. The state lives on the row as
                      aria-checked and the click is resolved from the target.
                    -->
                    <span
                      class="oge-tree-view-check"
                      aria-hidden="true"
                      [attr.data-state]="node.checkState"
                    ></span>
                  }
                  @if (node.icon; as icon) {
                    <svg
                      class="oge-tree-view-icon"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    >
                      <path
                        [attr.d]="icon"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  }
                  @if (itemTemplate(); as tpl) {
                    <ng-container
                      *ngTemplateOutlet="
                        tpl.templateRef;
                        context: itemContext(node)
                      "
                    />
                  } @else if (node.highlightedHtml; as html) {
                    <span class="oge-tree-view-text" [innerHTML]="html"></span>
                  } @else {
                    <span class="oge-tree-view-text">{{ node.text }}</span>
                  }
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class OgeTreeView<T extends object = Record<string, unknown>> {
  private readonly config = inject(OGE_TREE_VIEW_CONFIG);

  /** Unique DOM id prefix of this component instance. */
  protected readonly uid = `oge-tree-view-${nextComponentId++}`;

  /** Nodes to display — a flat parent-referencing list or nested children. */
  readonly items = input<readonly T[] | undefined>(undefined);
  /** Field holding a node's stable key. */
  readonly keyExpr = input<OgeTreeExpr<T, RowKey>>('id');
  /** Field holding a node's parent key (flat data). */
  readonly parentIdExpr = input<OgeTreeExpr<T>>('parentId');
  /** Field holding a node's nested children (hierarchical data). */
  readonly itemsExpr = input<
    OgeTreeExpr<T, readonly T[] | undefined> | undefined
  >(undefined);
  /** Field holding the display text. */
  readonly displayExpr = input<OgeTreeExpr<T>>('text');
  /** Field marking a node disabled. */
  readonly disabledExpr = input<OgeTreeExpr<T>>('disabled');
  /** Field hinting that a node has children that are not loaded yet. */
  readonly hasItemsExpr = input<OgeTreeExpr<T>>('hasItems');
  /** Field holding SVG path data (`d`) for a per-node icon. */
  readonly iconExpr = input<OgeTreeExpr<T> | undefined>(undefined);
  /** Parent value that marks root nodes in flat data. */
  readonly rootValue = input<unknown>(undefined);
  /** `plain` for flat data, `tree` for nested; inferred from `itemsExpr` when unset. */
  readonly dataStructure = input<OgeTreeDataStructure | undefined>(undefined);

  /** Keys of the expanded nodes — two-way. */
  readonly expandedKeys = model<readonly RowKey[]>([]);
  /** Keys of the selected nodes — two-way, projected by `selectedKeysMode`. */
  readonly selectedKeys = model<readonly RowKey[]>([]);
  /** Key of the node holding the roving tabindex — two-way. */
  readonly focusedKey = model<RowKey | undefined>(undefined);
  /** Current search text — two-way. */
  readonly searchValue = model('');

  /** How nodes may be selected. */
  readonly selectionMode = input<OgeTreeSelectionMode>('none');
  /**
   * Selects a node when its row is clicked, rather than only its checkbox.
   * `undefined` (the default) resolves to `true` without checkboxes and
   * `false` with them — otherwise clicking a label would silently tick the
   * box next to it, which is why the references ship `selectByClick: false`.
   */
  readonly selectByClick = input<boolean | undefined>(undefined);
  /** Cascades selection down to descendants and up to fully-selected parents. */
  readonly selectNodesRecursive = input(true);
  /** Checkbox column: hidden, per node, or per node plus a "select all" row. */
  readonly showCheckBoxes = input<OgeTreeCheckBoxesMode>('none');
  /** Projection applied to `selectedKeys` on the way out. */
  readonly selectedKeysMode = input<OgeTreeSelectedKeysMode>('all');

  /** Which gesture expands a node. */
  readonly expandEvent = input<OgeTreeExpandEvent>(
    this.config.expandEvent ?? 'click',
  );
  /** Expanding a node also expands its ancestors. */
  readonly expandNodesRecursive = input(true);
  /** Enables the APG `*` shortcut, which expands every sibling at the level. */
  readonly allowExpandAll = input(true);

  /** Renders the built-in search box above the tree. */
  readonly searchEnabled = input(false);
  /** How the search text is compared against the display value. */
  readonly searchMode = input<OgeTreeSearchMode>('contains');
  /** Extra fields searched alongside `displayExpr`. */
  readonly searchExpr = input<
    OgeTreeExpr<T> | readonly OgeTreeExpr<T>[] | undefined
  >(undefined);
  /** Debounce applied to the built-in search box, in milliseconds. */
  readonly searchTimeout = input(0);
  /** Which relatives of a match stay visible. */
  readonly filterMode = input<TreeFilterMode>('withAncestors');
  /** Auto-expands the ancestors of search matches. */
  readonly expandNodesOnFiltering = input(true);
  /** Wraps search matches in `<mark class="oge-highlight">`. */
  readonly highlightSearchResults = input(true);

  /** Loads a node's children the first time it expands. */
  readonly loadChildren = input<OgeTreeLoadChildren<T> | undefined>(undefined);

  /** Windowed rendering for large trees; requires a fixed row height. */
  readonly virtualScroll = input<boolean | OgeTreeVirtualScrollOptions>(false);
  /** Height of the scroll container (any CSS length). */
  readonly height = input<string | undefined>(undefined);

  /** Enables pointer drag reordering. */
  readonly allowDragging = input(false);
  /** Allows dropping *into* a node (reparenting), not just between siblings. */
  readonly allowDropInside = input(true);

  /** Disables the whole component. */
  readonly disabled = input(false);
  /** Density of the node rows. */
  readonly size = input<OgeTreeSize>('md');
  /** Aria label of the tree. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /**
   * DOM id put on the inner `role="tree"` element. Set it when an outside
   * control has to reference the tree — a combobox owning this tree as its
   * popup needs `aria-controls` to point here, not at the host.
   */
  readonly treeId = input<string | undefined>(undefined);
  /** Id actually rendered on the `role="tree"` element. */
  readonly resolvedTreeId = computed(() => this.treeId() ?? `${this.uid}-tree`);
  /** Per-instance overrides of the config `messages`. */
  readonly messages = input<Partial<OgeTreeViewMessages>>({});

  /** Cancelable pre-event of a node expanding. */
  readonly itemExpanding = output<OgeTreeExpandingEvent<T>>();
  /** Emitted after a node expanded. */
  readonly itemExpanded = output<OgeTreeExpandedEvent<T>>();
  /** Cancelable pre-event of a node collapsing. */
  readonly itemCollapsing = output<OgeTreeCollapsingEvent<T>>();
  /** Emitted after a node collapsed. */
  readonly itemCollapsed = output<OgeTreeCollapsedEvent<T>>();
  /** Cancelable pre-event of a selection change. */
  readonly selectionChanging = output<OgeTreeSelectionChangingEvent<T>>();
  /** Emitted after the selection committed. */
  readonly selectionChanged = output<OgeTreeSelectionChangedEvent<T>>();
  /** Emitted for the single node whose own selected state flipped. */
  readonly itemSelectionChanged = output<OgeTreeItemSelectionChangedEvent<T>>();
  /** Emitted when a node row is clicked. */
  readonly itemClick = output<OgeTreeItemClickEvent<T>>();
  /** Emitted when a node row is double-clicked. */
  readonly itemDblClick = output<OgeTreeItemClickEvent<T>>();
  /** Emitted after a lazy `loadChildren` resolved. */
  readonly childrenLoaded = output<OgeTreeChildrenLoadedEvent<T>>();
  /** Emitted after a lazy `loadChildren` rejected. */
  readonly childrenLoadFailed = output<OgeTreeChildrenFailedEvent<T>>();
  /** Emitted when the "select all" row is toggled. */
  readonly selectAllChanged = output<OgeTreeSelectAllChangedEvent>();
  /** Cancelable pre-event of a drag & drop reparent. */
  readonly itemReordering = output<OgeTreeReorderingEvent<T>>();
  /** Emitted after a drop passed `itemReordering`; apply it to your own data. */
  readonly itemReordered = output<OgeTreeReorderedEvent<T>>();

  protected readonly itemTemplate = contentChild(OgeTreeItemTemplate);
  protected readonly expandIconTemplate = contentChild(
    OgeTreeExpandIconTemplate,
  );
  protected readonly noDataTemplate = contentChild(OgeTreeNoDataTemplate);

  private readonly rowElements = viewChildren<ElementRef<HTMLElement>>('rowEl');
  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');

  private readonly typeAheadBuffer = createTypeAheadBuffer();

  /** Keys toggled away from the default collapsed state. */
  private readonly expandedSet = signal<ReadonlySet<RowKey>>(new Set());
  /** Raw selection set — the stored form, before `selectedKeysMode`. */
  private readonly selectedSet = signal<ReadonlySet<RowKey>>(new Set());
  private readonly deferred = signal<ReadonlyMap<RowKey, readonly T[]>>(
    new Map(),
  );
  private readonly loadStates = signal<ReadonlyMap<RowKey, LoadState>>(
    new Map(),
  );
  private readonly debouncedSearch = signal('');

  private lastEmittedExpanded: readonly RowKey[] = [];
  private lastEmittedSelected: readonly RowKey[] = [];
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  // drag state
  private readonly _dragKey = signal<RowKey | null>(null);
  private readonly _dropTargetKey = signal<RowKey | null>(null);
  private readonly _dropPosition = signal<OgeTreeDropPosition | null>(null);
  protected readonly dragKey = this._dragKey.asReadonly();
  protected readonly dropTargetKey = this._dropTargetKey.asReadonly();
  protected readonly dropPosition = this._dropPosition.asReadonly();
  private dragOrigin: { x: number; y: number } | null = null;
  private dragCandidate: RowKey | null = null;
  private hoverExpandTimer: ReturnType<typeof setTimeout> | undefined;
  private hoverExpandKey: RowKey | null = null;

  /** Effective messages: config defaults overlaid with `[messages]`. */
  protected readonly mergedMessages = computed<OgeTreeViewMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  // ---- accessors -----------------------------------------------------------

  private readonly keyOf = computed<(row: T) => RowKey>(() =>
    toAccessor(this.keyExpr()),
  );
  private readonly displayOf = computed<(row: T) => string>(() => {
    const accessor = toAccessor<T, unknown>(this.displayExpr());
    return (row) => String(accessor(row) ?? '');
  });
  private readonly disabledOf = computed<(row: T) => boolean>(() => {
    const accessor = toAccessor<T, unknown>(this.disabledExpr());
    return (row) => accessor(row) === true;
  });
  private readonly iconOf = computed<((row: T) => string | undefined) | null>(
    () => {
      const expr = this.iconExpr();
      if (expr === undefined) return null;
      const accessor = toAccessor<T, unknown>(expr);
      return (row) => {
        const value = accessor(row);
        return value == null ? undefined : String(value);
      };
    },
  );

  /** Nested payloads are flattened first; the engine has one pipeline. */
  private readonly normalized = computed<{
    rows: readonly T[];
    parentOf: ReadonlyMap<RowKey, RowKey | null> | null;
  }>(() => {
    const rows = this.items() ?? [];
    const itemsExpr = this.itemsExpr();
    const nested =
      this.dataStructure() === 'tree' ||
      (this.dataStructure() === undefined && itemsExpr !== undefined);
    if (!nested) return { rows, parentOf: null };
    const itemsOf = toAccessor<T, readonly T[] | undefined>(
      itemsExpr ?? 'items',
    );
    const flattened = flattenNestedTree(rows, {
      keyOf: this.keyOf(),
      itemsOf,
    });
    return { rows: flattened.rows, parentOf: flattened.parentOf };
  });

  /**
   * Adjacency index over the normalized rows plus any lazily loaded children.
   * Loaded children are folded into the index (not left to `deferredChildren`
   * alone) so selection, `ancestorsOf` and the drop cycle guard can see them —
   * their parent link comes from the map key, which is also what makes lazy
   * loading work for nested data, where a child carries no parent field.
   */
  protected readonly treeIndex = computed<TreeIndex<T>>(() => {
    const { rows, parentOf } = this.normalized();
    const keyOf = this.keyOf();
    const loadedRows: T[] = [];
    const loadedParents = new Map<RowKey, RowKey>();
    for (const [parentKey, children] of this.deferred()) {
      for (const child of children) {
        loadedRows.push(child);
        loadedParents.set(keyOf(child), parentKey);
      }
    }
    const parentIdAccessor = toAccessor<T, unknown>(this.parentIdExpr());
    const parentIdOf = (row: T): unknown => {
      const key = keyOf(row);
      const loaded = loadedParents.get(key);
      if (loaded !== undefined) return loaded;
      if (parentOf) return parentOf.get(key) ?? null;
      return parentIdAccessor(row);
    };
    return buildTreeIndex<T>([...rows, ...loadedRows], {
      keyOf,
      parentIdOf,
      rootValue: parentOf ? null : this.rootValue(),
    });
  });

  /** Keys that show an expand toggle — real children or a lazy hint. */
  private readonly expandableKeys = computed<ReadonlySet<RowKey>>(() => {
    const index = this.treeIndex();
    const keys = new Set<RowKey>(index.childrenOf.keys());
    const hint = this.hasChildrenHint();
    if (hint) {
      for (const [key, row] of index.byKey) {
        if (hint(row) === true) keys.add(key);
      }
    }
    return keys;
  });

  /** Lazy expandability hint — only meaningful with a `loadChildren`. */
  private readonly hasChildrenHint = computed<
    ((row: T) => boolean | undefined) | undefined
  >(() => {
    if (!this.loadChildren()) return undefined;
    const accessor = toAccessor<T, unknown>(this.hasItemsExpr());
    return (row) => {
      const value = accessor(row);
      return value === undefined ? undefined : value === true;
    };
  });

  // ---- search --------------------------------------------------------------

  private readonly searchPredicate = computed<((row: T) => boolean) | null>(
    () => {
      const needle = foldText(this.debouncedSearch().trim());
      if (!needle) return null;
      const mode = this.searchMode();
      const accessors = this.searchAccessors();
      return (row: T) =>
        accessors.some((accessor) => {
          const value = foldText(String(accessor(row) ?? ''));
          if (mode === 'equals') return value === needle;
          if (mode === 'startsWith') return value.startsWith(needle);
          return value.includes(needle);
        });
    },
  );

  private readonly searchAccessors = computed<((row: T) => unknown)[]>(() => {
    const extra = this.searchExpr();
    if (extra === undefined) return [this.displayOf()];
    const list = Array.isArray(extra)
      ? (extra as readonly OgeTreeExpr<T>[])
      : [extra as OgeTreeExpr<T>];
    return list.map((expr) => toAccessor<T, unknown>(expr));
  });

  /** Keys that survive the search filter — `null` when not searching. */
  private readonly visibleKeys = computed<ReadonlySet<RowKey> | null>(() => {
    const predicate = this.searchPredicate();
    if (!predicate) return null;
    return filterTreeKeys(this.treeIndex(), predicate, this.filterMode());
  });

  /**
   * Ancestors of matches, so a hit deep in the tree is actually reachable.
   * Ported from tree-list's `filterExpandedKeys`.
   */
  private readonly filterExpandedKeys = computed<ReadonlySet<RowKey>>(() => {
    const visible = this.visibleKeys();
    if (!visible || !this.expandNodesOnFiltering()) return new Set<RowKey>();
    const index = this.treeIndex();
    const expanded = new Set<RowKey>();
    for (const key of visible) {
      for (const ancestor of ancestorsOf(index, key)) {
        if (visible.has(ancestor)) expanded.add(ancestor);
      }
    }
    return expanded;
  });

  // ---- visible node list ---------------------------------------------------

  private readonly effectiveExpanded = computed<ReadonlySet<RowKey>>(() => {
    const filtered = this.filterExpandedKeys();
    if (filtered.size === 0) return this.expandedSet();
    return new Set([...this.expandedSet(), ...filtered]);
  });

  /** Tri-state per key — only computed while cascading selection is on. */
  protected readonly checkStates = computed<ReadonlyMap<RowKey, CheckState>>(
    () => {
      if (!this.selectNodesRecursive() || this.checkBoxesMode() === 'none') {
        return EMPTY_CHECK_STATES;
      }
      return computeTreeCheckStates(this.treeIndex(), this.selectedSet());
    },
  );

  protected readonly checkBoxesMode = computed<OgeTreeCheckBoxesMode>(() =>
    this.showCheckBoxes(),
  );

  /** Resolved `selectByClick` — see the input's note on the default. */
  private readonly selectOnRowClick = computed(
    () => this.selectByClick() ?? this.checkBoxesMode() === 'none',
  );

  /** The flat, visible node list — the single render source. */
  protected readonly nodes = computed<readonly OgeTreeNode<T>[]>(() => {
    const index = this.treeIndex();
    const keyOf = this.keyOf();
    const displayOf = this.displayOf();
    const disabledOf = this.disabledOf();
    const iconOf = this.iconOf();
    const selected = this.selectedSet();
    const states = this.checkStates();
    const loads = this.loadStates();
    const needle = this.highlightSearchResults()
      ? this.debouncedSearch().trim()
      : '';
    const flat: readonly RowNode<T>[] = flattenTreeData<T>({
      index,
      keyOf,
      expandedRowKeys: this.effectiveExpanded(),
      hasChildren: this.hasChildrenHint(),
      deferredChildren: this.deferred(),
      visibleKeys: this.visibleKeys(),
    });
    const out: OgeTreeNode<T>[] = [];
    for (const node of flat) {
      if (node.kind === 'filler') {
        const parentKey = String(node.key).replace(/:loading$/, '');
        const state = loads.get(parentKey) ?? loads.get(Number(parentKey));
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
      const text = displayOf(node.data);
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
        disabled: disabledOf(node.data),
        selected: selected.has(node.key),
        loading: loads.get(node.key)?.status === 'loading',
        checkState:
          states.get(node.key) ??
          (selected.has(node.key) ? 'checked' : 'unchecked'),
        icon: iconOf?.(node.data),
        highlightedHtml: needle ? buildSearchHighlightHtml(text, needle) : null,
      });
    }
    return out;
  });

  protected readonly loadingAny = computed(() =>
    [...this.loadStates().values()].some((s) => s.status === 'loading'),
  );

  protected readonly selectAllState = computed<CheckState>(() => {
    const roots = this.treeIndex().roots;
    if (roots.length === 0) return 'unchecked';
    const states = this.checkStates();
    const keyOf = this.keyOf();
    const selected = this.selectedSet();
    let checked = 0;
    let partial = 0;
    for (const root of roots) {
      const state =
        states.get(keyOf(root)) ??
        (selected.has(keyOf(root)) ? 'checked' : 'unchecked');
      if (state === 'checked') checked++;
      else if (state === 'indeterminate') partial++;
    }
    if (checked === roots.length) return 'checked';
    if (checked > 0 || partial > 0) return 'indeterminate';
    return 'unchecked';
  });

  // ---- virtualization ------------------------------------------------------

  protected readonly virtualEnabled = computed(
    () => this.virtualScroll() !== false,
  );

  protected readonly itemHeight = computed(() => {
    const value = this.virtualScroll();
    if (typeof value === 'object') return value.itemHeight;
    return this.config.itemHeight ?? DEFAULT_ITEM_HEIGHT;
  });

  private readonly virtualizer = new TreeVirtualizerModel({
    itemCount: () => this.nodes().length,
    itemHeight: () => this.itemHeight(),
    overscan: () => 6,
    viewportHeight: () =>
      this.scrollEl()?.nativeElement.clientHeight || this.itemHeight() * 12,
    scrollContainer: () => this.scrollEl()?.nativeElement ?? null,
  });

  protected readonly totalHeight = computed(
    () => this.virtualizer.window().totalHeight,
  );
  protected readonly offsetY = computed(
    () => this.virtualizer.window().offsetY,
  );

  /** The slice actually stamped into the DOM. */
  protected readonly renderedNodes = computed<readonly OgeTreeNode<T>[]>(() => {
    const all = this.nodes();
    if (!this.virtualEnabled()) return all;
    const window = this.virtualizer.window();
    return all.slice(window.start, window.end);
  });

  constructor() {
    // search debounce
    effect(() => {
      const value = this.searchValue();
      const delay = untracked(this.searchTimeout);
      if (delay <= 0) {
        this.debouncedSearch.set(value);
        return;
      }
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(
        () => this.debouncedSearch.set(value),
        delay,
      );
    });

    // expandedKeys ⇄ expandedSet
    effect(() => {
      const keys = this.expandedKeys();
      if (sameKeys(keys, this.lastEmittedExpanded)) return;
      this.lastEmittedExpanded = keys;
      this.expandedSet.set(new Set(keys));
    });
    effect(() => {
      const keys = [...this.expandedSet()];
      if (sameKeys(keys, untracked(this.expandedKeys))) return;
      this.lastEmittedExpanded = keys;
      this.expandedKeys.set(keys);
    });

    // selectedKeys ⇄ selectedSet, honouring the outward projection
    effect(() => {
      const keys = this.selectedKeys();
      if (sameKeys(keys, this.lastEmittedSelected)) return;
      this.lastEmittedSelected = keys;
      this.selectedSet.set(new Set(keys));
    });
    effect(() => {
      const projected = resolveSelectedKeys(
        this.treeIndex(),
        this.selectedSet(),
        this.selectedKeysMode(),
      );
      if (sameKeys(projected, untracked(this.selectedKeys))) return;
      this.lastEmittedSelected = projected;
      this.selectedKeys.set(projected);
    });

    // keep the roving tabindex on a node that still exists
    effect(() => {
      const nodes = this.nodes().filter((n) => !n.filler);
      const current = untracked(this.focusedKey);
      if (nodes.length === 0) return;
      if (current !== undefined && nodes.some((n) => n.key === current)) return;
      this.focusedKey.set(nodes.find((n) => !n.disabled)?.key);
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.searchTimer);
      clearTimeout(this.hoverExpandTimer);
    });
  }

  // ---- public API ----------------------------------------------------------

  /** Whether the node with this key is expanded. */
  isExpanded(key: RowKey): boolean {
    return this.effectiveExpanded().has(key);
  }

  /** Whether the node with this key is selected. */
  isSelected(key: RowKey): boolean {
    return this.selectedSet().has(key);
  }

  /** Selected keys under a projection, defaulting to `selectedKeysMode`. */
  getSelectedKeys(mode?: OgeTreeSelectedKeysMode): RowKey[] {
    return resolveSelectedKeys(
      this.treeIndex(),
      this.selectedSet(),
      mode ?? this.selectedKeysMode(),
    );
  }

  /**
   * Expands a node. Resolves `true` once it expanded, `false` if the node is
   * unknown, disabled, or `itemExpanding` vetoed it. With a `loadChildren` the
   * promise also awaits the child fetch.
   */
  expand(key: RowKey): Promise<boolean> {
    return this.requestExpand(key);
  }

  /** Collapses a node; resolves whether it actually collapsed. */
  collapse(key: RowKey): Promise<boolean> {
    return this.requestCollapse(key);
  }

  /** Expands the node if collapsed, collapses it otherwise. */
  toggle(key: RowKey): Promise<boolean> {
    return this.isExpanded(key) ? this.collapse(key) : this.expand(key);
  }

  /** Expands every node that has loaded children. */
  expandAll(): void {
    this.expandedSet.set(new Set(this.expandableKeys()));
  }

  /** Collapses every node. */
  collapseAll(): void {
    this.expandedSet.set(new Set());
  }

  /** Selects every node (cascading when `selectNodesRecursive` is on). */
  selectAll(): void {
    const all = new Set<RowKey>(this.treeIndex().byKey.keys());
    this.commitSelection(all);
  }

  /** Clears the selection. */
  unselectAll(): void {
    this.commitSelection(new Set());
  }

  /** Selects one node. */
  select(key: RowKey): void {
    this.setSelected(key, true);
  }

  /** Deselects one node. */
  unselect(key: RowKey): void {
    this.setSelected(key, false);
  }

  /** Focuses a node's row, or the first enabled one. */
  focus(key?: RowKey): void {
    const nodes = this.nodes();
    const index =
      key === undefined
        ? (edgeEnabledIndex(nodes.length, 1, (i) => this.nodeDisabled(i)) ?? -1)
        : nodes.findIndex((n) => n.key === key && !n.filler);
    if (index === -1) return;
    this.focusedKey.set(nodes[index].key);
    this.focusIndex(index);
  }

  /** Scrolls a node into view, virtualized or not. */
  scrollToItem(key: RowKey): void {
    const index = this.nodes().findIndex((n) => n.key === key && !n.filler);
    if (index === -1) return;
    if (this.virtualEnabled()) {
      this.virtualizer.scrollToIndex(index);
      return;
    }
    this.elementForKey(key)?.scrollIntoView({ block: 'nearest' });
  }

  // ---- template helpers ----------------------------------------------------

  protected indentOf(node: OgeTreeNode<T>): number {
    return 8 + node.level * 16;
  }

  /** APG: exactly one node sits in the Tab sequence at a time. */
  protected rovingTabIndex(node: OgeTreeNode<T>): number {
    if (node.filler || node.disabled) return -1;
    return node.key === this.focusedKey() ? 0 : -1;
  }

  protected ariaSelected(node: OgeTreeNode<T>): boolean | null {
    // APG: expose selection through aria-selected OR aria-checked, never both
    if (node.filler || this.checkBoxesMode() !== 'none') return null;
    if (this.selectionMode() === 'none') return null;
    return node.selected;
  }

  protected ariaChecked(node: OgeTreeNode<T>): string | null {
    if (node.filler || this.checkBoxesMode() === 'none') return null;
    if (node.checkState === 'indeterminate') return 'mixed';
    return node.checkState === 'checked' ? 'true' : 'false';
  }

  protected itemContext(node: OgeTreeNode<T>): OgeTreeItemTemplateContext<T> {
    return {
      $implicit: node.item,
      key: node.key,
      level: node.level,
      expanded: node.expanded,
      selected: node.selected,
      checkState: node.checkState,
      hasChildren: node.hasChildren,
      highlightedHtml: node.highlightedHtml,
    };
  }

  protected expandIconContext(
    node: OgeTreeNode<T>,
  ): OgeTreeExpandIconTemplateContext<T> {
    return {
      $implicit: node.expanded,
      item: node.item,
      key: node.key,
      loading: node.loading,
    };
  }

  protected onScroll(event: Event): void {
    if (this.virtualEnabled()) this.virtualizer.onScroll(event);
  }

  protected onSearchInput(event: Event): void {
    this.searchValue.set((event.target as HTMLInputElement).value);
  }

  // ---- interaction ---------------------------------------------------------

  protected onRowClick(node: OgeTreeNode<T>, event: MouseEvent): void {
    if (node.filler || this.disabled()) return;
    this.focusedKey.set(node.key);
    if (this.isCheckTarget(event.target)) {
      if (!node.disabled) this.toggleSelection(node, event);
      return;
    }
    if (this.isToggleTarget(event.target)) {
      void this.toggle(node.key);
      return;
    }
    if (node.disabled) return;
    this.itemClick.emit({ key: node.key, item: node.item, event });
    if (this.expandEvent() === 'click' && node.hasChildren) {
      void this.toggle(node.key);
    }
    if (this.selectOnRowClick() && this.selectionMode() !== 'none') {
      this.toggleSelection(node, event);
    }
  }

  protected onRowDblClick(node: OgeTreeNode<T>, event: MouseEvent): void {
    if (node.filler || node.disabled || this.disabled()) return;
    this.itemDblClick.emit({ key: node.key, item: node.item, event });
    if (this.expandEvent() === 'dblclick' && node.hasChildren) {
      void this.toggle(node.key);
    }
  }

  protected onRowFocus(node: OgeTreeNode<T>): void {
    if (!node.filler) this.focusedKey.set(node.key);
  }

  protected onSelectAllKeydown(event: KeyboardEvent): void {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    this.toggleSelectAll();
  }

  protected toggleSelectAll(): void {
    if (this.disabled()) return;
    const state = this.selectAllState();
    if (state === 'checked') this.unselectAll();
    else this.selectAll();
    this.selectAllChanged.emit({ state: this.selectAllState() });
  }

  // ---- keyboard (APG treeview) --------------------------------------------

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const nodes = this.nodes();
    const current = nodes.findIndex(
      (n) => !n.filler && n.key === this.focusedKey(),
    );
    if (current === -1) return;
    const node = nodes[current];

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus(this.step(current, 1));
        if (event.shiftKey && this.selectionMode() === 'multiple') {
          this.extendSelectionTo(this.step(current, 1), event);
        }
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(this.step(current, -1));
        if (event.shiftKey && this.selectionMode() === 'multiple') {
          this.extendSelectionTo(this.step(current, -1), event);
        }
        return;
      case 'ArrowRight':
        event.preventDefault();
        if (!node.hasChildren) return;
        if (!node.expanded) void this.expand(node.key);
        else this.moveFocus(this.step(current, 1));
        return;
      case 'ArrowLeft':
        event.preventDefault();
        if (node.hasChildren && node.expanded) void this.collapse(node.key);
        else this.moveFocus(this.parentIndexOf(current));
        return;
      case 'Home':
        event.preventDefault();
        if (event.ctrlKey && event.shiftKey) {
          this.selectRange(0, current, event);
          return;
        }
        this.moveFocus(this.edge(1));
        return;
      case 'End':
        event.preventDefault();
        if (event.ctrlKey && event.shiftKey) {
          this.selectRange(current, nodes.length - 1, event);
          return;
        }
        this.moveFocus(this.edge(-1));
        return;
      case 'Enter':
        event.preventDefault();
        this.itemClick.emit({ key: node.key, item: node.item, event });
        if (node.hasChildren) void this.toggle(node.key);
        else if (this.selectionMode() !== 'none') {
          this.toggleSelection(node, event);
        }
        return;
      case ' ':
        event.preventDefault();
        if (event.shiftKey && this.selectionMode() === 'multiple') {
          this.selectRange(this.anchorIndex(current), current, event);
          return;
        }
        if (this.selectionMode() !== 'none') this.toggleSelection(node, event);
        return;
      case '*':
        if (!this.allowExpandAll()) return;
        event.preventDefault();
        this.expandSiblingsOf(node);
        return;
      case 'a':
      case 'A':
        if (!event.ctrlKey || this.selectionMode() !== 'multiple') break;
        event.preventDefault();
        this.selectAll();
        return;
      default:
        break;
    }

    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      event.key !== ' '
    ) {
      const prefix = this.typeAheadBuffer.push(event.key.toLowerCase());
      const match = matchByPrefix(
        nodes.map((n) => n.text),
        prefix,
        prefix.length === 1 ? current : current - 1,
        (i) => this.nodeDisabled(i),
      );
      if (match !== null) {
        event.preventDefault();
        this.moveFocus(match);
      }
    }
  }

  private nodeDisabled(index: number): boolean {
    const node = this.nodes()[index];
    return !node || node.filler || node.disabled;
  }

  private step(start: number, direction: 1 | -1): number | null {
    return stepEnabledIndex(
      this.nodes().length,
      start,
      direction,
      (i) => this.nodeDisabled(i),
      false,
    );
  }

  private edge(direction: 1 | -1): number | null {
    return edgeEnabledIndex(this.nodes().length, direction, (i) =>
      this.nodeDisabled(i),
    );
  }

  /** Index of the row that is the focused node's parent, if it is visible. */
  private parentIndexOf(index: number): number | null {
    const nodes = this.nodes();
    const level = nodes[index]?.level ?? 0;
    if (level === 0) return null;
    for (let i = index - 1; i >= 0; i--) {
      if (!nodes[i].filler && nodes[i].level < level) return i;
    }
    return null;
  }

  private moveFocus(index: number | null): void {
    if (index === null) return;
    const node = this.nodes()[index];
    if (!node) return;
    this.focusedKey.set(node.key);
    if (this.virtualEnabled()) this.virtualizer.scrollToIndex(index);
    this.focusIndex(index);
  }

  /**
   * Focuses the row element for an absolute index. Under virtualization the
   * row may not be rendered yet, so the lookup happens after a frame.
   */
  private focusIndex(index: number): void {
    const node = this.nodes()[index];
    if (!node) return;
    const apply = () => this.elementForKey(node.key)?.focus();
    if (!this.virtualEnabled()) {
      apply();
      return;
    }
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => (cb(0), 0);
    schedule(() => apply());
  }

  private elementForKey(key: RowKey): HTMLElement | null {
    return (
      this.rowElements().find(
        (ref) => ref.nativeElement.getAttribute('data-key') === String(key),
      )?.nativeElement ?? null
    );
  }

  /** APG `*`: expands every sibling at the focused node's level. */
  private expandSiblingsOf(node: OgeTreeNode<T>): void {
    const index = this.treeIndex();
    const parent = index.parentOf.get(node.key) ?? null;
    const siblings =
      parent === null ? index.roots : (index.childrenOf.get(parent) ?? []);
    const keyOf = this.keyOf();
    const next = new Set(this.expandedSet());
    for (const sibling of siblings) {
      const key = keyOf(sibling);
      if (this.expandableKeys().has(key)) next.add(key);
    }
    this.expandedSet.set(next);
  }

  // ---- expansion pipeline --------------------------------------------------

  private requestExpand(key: RowKey): Promise<boolean> {
    const item = this.treeIndex().byKey.get(key);
    if (!item || this.disabled()) return Promise.resolve(false);
    if (this.effectiveExpanded().has(key)) return Promise.resolve(true);
    const expanding: OgeTreeExpandingEvent<T> = { key, item, cancel: false };
    this.itemExpanding.emit(expanding);
    if (expanding.cancel) return Promise.resolve(false);

    const next = new Set(this.expandedSet());
    next.add(key);
    if (this.expandNodesRecursive()) {
      for (const ancestor of ancestorsOf(this.treeIndex(), key)) {
        next.add(ancestor);
      }
    }
    this.expandedSet.set(next);
    this.itemExpanded.emit({ key, item });

    const loader = this.loadChildren();
    const needsLoad =
      !!loader &&
      !this.deferred().has(key) &&
      !this.treeIndex().childrenOf.has(key) &&
      !this.loadStates().has(key);
    if (!needsLoad) return Promise.resolve(true);
    return this.loadChildrenFor(key, item, loader);
  }

  private requestCollapse(key: RowKey): Promise<boolean> {
    const item = this.treeIndex().byKey.get(key);
    if (!item || this.disabled()) return Promise.resolve(false);
    if (!this.effectiveExpanded().has(key)) return Promise.resolve(true);
    const collapsing: OgeTreeCollapsingEvent<T> = { key, item, cancel: false };
    this.itemCollapsing.emit(collapsing);
    if (collapsing.cancel) return Promise.resolve(false);
    const next = new Set(this.expandedSet());
    next.delete(key);
    this.expandedSet.set(next);
    this.itemCollapsed.emit({ key, item });
    return Promise.resolve(true);
  }

  /**
   * Single-flight lazy child fetch; the engine renders a `filler` placeholder
   * meanwhile. This deliberately does *not* go through core's `runAsyncGuard`
   * — that models a veto (where a rejection means "no"), whereas here a
   * rejection is a failure whose error must reach `childrenLoadFailed`.
   */
  private loadChildrenFor(
    key: RowKey,
    item: T,
    loader: OgeTreeLoadChildren<T>,
  ): Promise<boolean> {
    this.setLoadState(key, { status: 'loading' });
    let pending: Promise<readonly T[]>;
    try {
      pending = loader(item, key);
    } catch (error) {
      this.setLoadState(key, { status: 'failed', error });
      this.childrenLoadFailed.emit({ key, item, error });
      return Promise.resolve(false);
    }
    return pending.then(
      (children) => {
        this.deferred.update((map) => new Map(map).set(key, children));
        this.setLoadState(key, { status: 'loaded' });
        this.childrenLoaded.emit({ key, item, children });
        return true;
      },
      (error: unknown) => {
        this.setLoadState(key, { status: 'failed', error });
        this.childrenLoadFailed.emit({ key, item, error });
        return false;
      },
    );
  }

  private setLoadState(key: RowKey, state: LoadState): void {
    this.loadStates.update((map) => new Map(map).set(key, state));
  }

  // ---- selection pipeline --------------------------------------------------

  private toggleSelection(node: OgeTreeNode<T>, event?: Event): void {
    if (this.selectionMode() === 'none') return;
    this.setSelected(node.key, !this.selectedSet().has(node.key), event);
  }

  private setSelected(key: RowKey, selected: boolean, event?: Event): void {
    const index = this.treeIndex();
    const item = index.byKey.get(key);
    if (!item) return;
    let next: Set<RowKey>;
    if (this.selectionMode() === 'single') {
      next = selected ? new Set<RowKey>([key]) : new Set<RowKey>();
    } else if (this.selectNodesRecursive()) {
      // toggleTreeSelection decides direction from raw membership, so only
      // call it when that matches the intent
      const has = this.selectedSet().has(key);
      next =
        has === selected
          ? new Set(this.selectedSet())
          : toggleTreeSelection(index, this.selectedSet(), key, true);
    } else {
      next = new Set(this.selectedSet());
      if (selected) next.add(key);
      else next.delete(key);
    }
    if (this.commitSelection(next, key, event)) {
      this.itemSelectionChanged.emit({ key, item, selected, event });
    }
  }

  private commitSelection(
    next: ReadonlySet<RowKey>,
    key?: RowKey,
    event?: Event,
  ): boolean {
    const index = this.treeIndex();
    const projected = resolveSelectedKeys(index, next, this.selectedKeysMode());
    const changing: OgeTreeSelectionChangingEvent<T> = {
      keys: projected,
      key,
      item: key === undefined ? undefined : index.byKey.get(key),
      event,
      cancel: false,
    };
    this.selectionChanging.emit(changing);
    if (changing.cancel) return false;
    const previous = resolveSelectedKeys(
      index,
      this.selectedSet(),
      this.selectedKeysMode(),
    );
    this.selectedSet.set(next);
    this.selectionChanged.emit({
      keys: projected,
      previousKeys: previous,
      key,
      item: key === undefined ? undefined : index.byKey.get(key),
      event,
    });
    return true;
  }

  /** Index the last Shift range extends from — the focused node's anchor. */
  private anchorIndex(current: number): number {
    const nodes = this.nodes();
    const first = nodes.findIndex((n) => !n.filler && n.selected);
    return first === -1 ? current : first;
  }

  private extendSelectionTo(index: number | null, event: Event): void {
    if (index === null) return;
    const node = this.nodes()[index];
    if (node && !node.filler) this.toggleSelection(node, event);
  }

  private selectRange(from: number, to: number, event: Event): void {
    const nodes = this.nodes();
    const start = Math.max(0, Math.min(from, to));
    const end = Math.min(nodes.length - 1, Math.max(from, to));
    const next = new Set(this.selectedSet());
    for (let i = start; i <= end; i++) {
      const node = nodes[i];
      if (!node.filler && !node.disabled) next.add(node.key);
    }
    this.commitSelection(next, undefined, event);
  }

  private isCheckTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      target.closest('.oge-tree-view-check') !== null
    );
  }

  private isToggleTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      target.closest('.oge-tree-view-toggle') !== null
    );
  }

  // ---- drag & drop ---------------------------------------------------------

  protected onPointerDown(node: OgeTreeNode<T>, event: PointerEvent): void {
    if (!this.allowDragging() || this.disabled() || node.filler) return;
    if (event.button !== 0 || this.isCheckTarget(event.target)) return;
    this.dragCandidate = node.key;
    this.dragOrigin = { x: event.clientX, y: event.clientY };
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragCandidate === null || !this.dragOrigin) return;
    const point = { x: event.clientX, y: event.clientY };
    if (
      this._dragKey() === null &&
      !exceedsDragThreshold(this.dragOrigin, point)
    ) {
      return;
    }
    if (this._dragKey() === null) {
      this._dragKey.set(this.dragCandidate);
      const target = event.target;
      if (target instanceof Element && 'setPointerCapture' in target) {
        try {
          (
            target as Element & { setPointerCapture(id: number): void }
          ).setPointerCapture(event.pointerId);
        } catch {
          // capture is best-effort
        }
      }
    }
    this.updateDropTarget(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    const dragKey = this._dragKey();
    const dropKey = this._dropTargetKey();
    const position = this._dropPosition();
    this.resetDrag();
    if (dragKey === null || dropKey === null || position === null) return;
    const index = this.treeIndex();
    const dragItem = index.byKey.get(dragKey);
    const dropItem = index.byKey.get(dropKey);
    if (!dragItem || !dropItem) return;
    const reordering: OgeTreeReorderingEvent<T> = {
      dragKey,
      dragItem,
      dropKey,
      dropItem,
      position,
      cancel: false,
    };
    this.itemReordering.emit(reordering);
    if (reordering.cancel) return;
    this.itemReordered.emit({
      dragKey,
      dragItem,
      dropKey,
      dropItem,
      position,
    });
    void event;
  }

  private updateDropTarget(event: PointerEvent): void {
    const dragKey = this._dragKey();
    if (dragKey === null) return;
    const row = this.rowElements().find((ref) => {
      const rect = ref.nativeElement.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    const key = row?.nativeElement.getAttribute('data-key');
    if (!row || key === null || key === undefined) {
      this._dropTargetKey.set(null);
      this._dropPosition.set(null);
      return;
    }
    const node = this.nodes().find((n) => String(n.key) === key && !n.filler);
    if (!node || !this.canDrop(dragKey, node.key)) {
      this._dropTargetKey.set(null);
      this._dropPosition.set(null);
      return;
    }
    const rect = row.nativeElement.getBoundingClientRect();
    const position = resolveDropPosition(
      event.clientY,
      rect,
      this.allowDropInside(),
    );
    this._dropTargetKey.set(node.key);
    this._dropPosition.set(position);
    this.scheduleHoverExpand(node, position);
  }

  /** A node may never be dropped into its own subtree. */
  private canDrop(dragKey: RowKey, dropKey: RowKey): boolean {
    if (dragKey === dropKey) return false;
    return !ancestorsOf(this.treeIndex(), dropKey).includes(dragKey);
  }

  /** Hovering a collapsed parent long enough opens it, so you can drop inside. */
  private scheduleHoverExpand(
    node: OgeTreeNode<T>,
    position: OgeTreeDropPosition,
  ): void {
    const shouldArm =
      position === 'inside' && node.hasChildren && !node.expanded;
    if (!shouldArm) {
      if (this.hoverExpandKey !== null) {
        clearTimeout(this.hoverExpandTimer);
        this.hoverExpandKey = null;
      }
      return;
    }
    if (this.hoverExpandKey === node.key) return;
    clearTimeout(this.hoverExpandTimer);
    this.hoverExpandKey = node.key;
    this.hoverExpandTimer = setTimeout(() => {
      if (this._dragKey() !== null) void this.expand(node.key);
    }, TREE_DRAG_HOVER_EXPAND_MS);
  }

  private resetDrag(): void {
    clearTimeout(this.hoverExpandTimer);
    this.hoverExpandKey = null;
    this.dragCandidate = null;
    this.dragOrigin = null;
    this._dragKey.set(null);
    this._dropTargetKey.set(null);
    this._dropPosition.set(null);
  }

  /** Escape cancels an in-flight drag, matching the tab strip. */
  protected onHostKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this._dragKey() !== null) {
      event.preventDefault();
      this.resetDrag();
    }
  }
}

function toAccessor<T, R = unknown>(expr: OgeTreeExpr<T, R>): (row: T) => R {
  if (typeof expr === 'function') return expr;
  const accessor = createFieldAccessor<T>(expr);
  return (row) => accessor(row) as R;
}

function sameKeys(a: readonly RowKey[], b: readonly RowKey[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}
