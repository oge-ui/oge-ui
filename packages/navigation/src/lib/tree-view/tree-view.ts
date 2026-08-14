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
// The whole decision layer — the composed derivation (`buildTreeViewModel`),
// the composed APG key map (`planTreeViewKey`), the expansion and selection
// arithmetic and the drag geometry — is framework-free in `@oge-ui/behavior`,
// shared verbatim with `<OgeTreeView>` in `@oge-ui/react-navigation` (ADR
// 0001). What is left here is the Angular render shell and its signal wiring.
import {
  buildTreeViewModel,
  createTypeAheadBuffer,
  nextTreeExpansion,
  nextTreeSelection,
  planTreeViewKey,
  resolveSelectedKeys,
  resolveTreeItemHeight,
  resolveTreeSelectByClick,
  resolveTreeDropPosition,
  exceedsTreeDragThreshold,
  treeAriaChecked,
  treeAriaSelected,
  treeCanDrop,
  treeChildrenLoadNeeded,
  treeEdgeIndex,
  treeNodeIndent,
  treeRangeSelection,
  OGE_TREE_DRAG_HOVER_EXPAND_MS,
  type CheckState,
  type OgeTreeKeyAction,
  type OgeTreeLoadState,
  type OgeTreeViewModel,
  type RowKey,
  type TreeIndex,
} from '@oge-ui/behavior';
import { OGE_TREE_VIEW_CONFIG, type OgeTreeViewMessages } from './config';
import {
  OgeTreeExpandIconTemplate,
  OgeTreeItemTemplate,
  OgeTreeNoDataTemplate,
} from './templates';
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
  private readonly loadStates = signal<ReadonlyMap<RowKey, OgeTreeLoadState>>(
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

  // ---- derived pipeline ----------------------------------------------------

  protected readonly checkBoxesMode = computed<OgeTreeCheckBoxesMode>(() =>
    this.showCheckBoxes(),
  );

  /**
   * One call, one pipeline: `@oge-ui/behavior` owns the accessors, the index
   * build (lazily loaded children folded in), the lazy expandability hint, the
   * search filter and its auto-expansion, the effective expansion, the
   * tri-state cascade, the flat node list and the select-all state — in the one
   * order the pipeline requires. `<OgeTreeView>` in `@oge-ui/react-navigation`
   * runs the same function; what is left here is the signal wiring.
   */
  private readonly model = computed<OgeTreeViewModel<T>>(() =>
    buildTreeViewModel<T>({
      items: this.items() ?? [],
      keyExpr: this.keyExpr(),
      parentIdExpr: this.parentIdExpr(),
      itemsExpr: this.itemsExpr(),
      displayExpr: this.displayExpr(),
      disabledExpr: this.disabledExpr(),
      hasItemsExpr: this.hasItemsExpr(),
      iconExpr: this.iconExpr(),
      rootValue: this.rootValue(),
      dataStructure: this.dataStructure(),
      deferred: this.deferred(),
      loadStates: this.loadStates(),
      expandedKeys: this.expandedSet(),
      selectedKeys: this.selectedSet(),
      search: this.debouncedSearch(),
      searchMode: this.searchMode(),
      searchExpr: this.searchExpr(),
      filterMode: this.filterMode(),
      expandNodesOnFiltering: this.expandNodesOnFiltering(),
      highlightSearchResults: this.highlightSearchResults(),
      selectNodesRecursive: this.selectNodesRecursive(),
      showCheckBoxes: this.checkBoxesMode(),
      lazy: !!this.loadChildren(),
    }),
  );

  /** Adjacency index over the rows plus any lazily loaded children. */
  protected readonly treeIndex = computed<TreeIndex<T>>(
    () => this.model().index,
  );

  private readonly keyOf = computed<(row: T) => RowKey>(
    () => this.model().keyOf,
  );

  /** Keys that show an expand toggle — real children or a lazy hint. */
  private readonly expandableKeys = computed<ReadonlySet<RowKey>>(
    () => this.model().expandableKeys,
  );

  /** `expandedSet` overlaid with the ancestors the search auto-expanded. */
  private readonly effectiveExpanded = computed<ReadonlySet<RowKey>>(
    () => this.model().effectiveExpanded,
  );

  /** Resolved `selectByClick` — see the input's note on the default. */
  private readonly selectOnRowClick = computed(() =>
    resolveTreeSelectByClick(this.selectByClick(), this.checkBoxesMode()),
  );

  /** The flat, visible node list — the single render source. */
  protected readonly nodes = computed<readonly OgeTreeNode<T>[]>(
    () => this.model().nodes,
  );

  protected readonly loadingAny = computed(() => this.model().loadingAny);

  protected readonly selectAllState = computed<CheckState>(
    () => this.model().selectAllState,
  );

  // ---- virtualization ------------------------------------------------------

  protected readonly virtualEnabled = computed(
    () => this.virtualScroll() !== false,
  );

  protected readonly itemHeight = computed(() =>
    resolveTreeItemHeight(this.virtualScroll(), this.config.itemHeight),
  );

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
        ? (treeEdgeIndex(nodes, 1) ?? -1)
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
    return treeNodeIndent(node.level);
  }

  /** APG: exactly one node sits in the Tab sequence at a time. */
  protected rovingTabIndex(node: OgeTreeNode<T>): number {
    if (node.filler || node.disabled) return -1;
    return node.key === this.focusedKey() ? 0 : -1;
  }

  protected ariaSelected(node: OgeTreeNode<T>): boolean | null {
    return treeAriaSelected(node, this.checkBoxesMode(), this.selectionMode());
  }

  protected ariaChecked(node: OgeTreeNode<T>): string | null {
    return treeAriaChecked(node, this.checkBoxesMode());
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

    // The APG key map itself lives in `@oge-ui/behavior`; this only executes
    // the actions it resolves, so the React tree view gets the same map.
    const plan = planTreeViewKey<T>({
      key: event.key,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      nodes,
      index: this.treeIndex(),
      keyOf: this.keyOf(),
      expanded: this.expandedSet(),
      expandableKeys: this.expandableKeys(),
      current,
      selectionMode: this.selectionMode(),
      allowExpandAll: this.allowExpandAll(),
      pushTypeAhead: (char) => this.typeAheadBuffer.push(char),
    });
    if (!plan) return;
    if (plan.preventDefault) event.preventDefault();
    for (const action of plan.actions) {
      this.runKeyAction(action, event);
    }
  }

  private runKeyAction(
    action: OgeTreeKeyAction<T>,
    event: KeyboardEvent,
  ): void {
    switch (action.kind) {
      case 'focus':
        this.moveFocus(action.index);
        break;
      case 'toggle-selection':
        this.extendSelectionTo(action.index, event);
        break;
      case 'select-range':
        this.selectRange(action.from, action.to, event);
        break;
      case 'select-all':
        this.selectAll();
        break;
      case 'expand':
        void this.expand(action.key);
        break;
      case 'collapse':
        void this.collapse(action.key);
        break;
      case 'toggle-expansion':
        void this.toggle(action.key);
        break;
      case 'item-click':
        this.itemClick.emit({
          key: action.node.key,
          item: action.node.item,
          event,
        });
        break;
      case 'set-expanded':
        this.expandedSet.set(action.expanded);
        break;
    }
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

  // ---- expansion pipeline --------------------------------------------------

  private requestExpand(key: RowKey): Promise<boolean> {
    const item = this.treeIndex().byKey.get(key);
    if (!item || this.disabled()) return Promise.resolve(false);
    if (this.effectiveExpanded().has(key)) return Promise.resolve(true);
    const expanding: OgeTreeExpandingEvent<T> = { key, item, cancel: false };
    this.itemExpanding.emit(expanding);
    if (expanding.cancel) return Promise.resolve(false);

    this.expandedSet.set(
      nextTreeExpansion<T>({
        index: this.treeIndex(),
        expanded: this.expandedSet(),
        key,
        expand: true,
        recursive: this.expandNodesRecursive(),
      }),
    );
    this.itemExpanded.emit({ key, item });

    const loader = this.loadChildren();
    if (
      !loader ||
      !treeChildrenLoadNeeded<T>({
        index: this.treeIndex(),
        deferred: this.deferred(),
        loadStates: this.loadStates(),
        key,
        hasLoader: true,
      })
    ) {
      return Promise.resolve(true);
    }
    return this.loadChildrenFor(key, item, loader);
  }

  private requestCollapse(key: RowKey): Promise<boolean> {
    const item = this.treeIndex().byKey.get(key);
    if (!item || this.disabled()) return Promise.resolve(false);
    if (!this.effectiveExpanded().has(key)) return Promise.resolve(true);
    const collapsing: OgeTreeCollapsingEvent<T> = { key, item, cancel: false };
    this.itemCollapsing.emit(collapsing);
    if (collapsing.cancel) return Promise.resolve(false);
    this.expandedSet.set(
      nextTreeExpansion<T>({
        index: this.treeIndex(),
        expanded: this.expandedSet(),
        key,
        expand: false,
        recursive: false,
      }),
    );
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

  private setLoadState(key: RowKey, state: OgeTreeLoadState): void {
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
    const next = nextTreeSelection<T>({
      index,
      selected: this.selectedSet(),
      key,
      select: selected,
      selectionMode: this.selectionMode(),
      recursive: this.selectNodesRecursive(),
    });
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

  private extendSelectionTo(index: number | null, event: Event): void {
    if (index === null) return;
    const node = this.nodes()[index];
    if (node && !node.filler) this.toggleSelection(node, event);
  }

  private selectRange(from: number, to: number, event: Event): void {
    this.commitSelection(
      treeRangeSelection(this.nodes(), this.selectedSet(), from, to),
      undefined,
      event,
    );
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
      !exceedsTreeDragThreshold(this.dragOrigin, point)
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
    if (!node || !treeCanDrop(this.treeIndex(), dragKey, node.key)) {
      this._dropTargetKey.set(null);
      this._dropPosition.set(null);
      return;
    }
    const rect = row.nativeElement.getBoundingClientRect();
    const position = resolveTreeDropPosition(
      event.clientY,
      rect,
      this.allowDropInside(),
    );
    this._dropTargetKey.set(node.key);
    this._dropPosition.set(position);
    this.scheduleHoverExpand(node, position);
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
    }, OGE_TREE_DRAG_HOVER_EXPAND_MS);
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

function sameKeys(a: readonly RowKey[], b: readonly RowKey[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}
