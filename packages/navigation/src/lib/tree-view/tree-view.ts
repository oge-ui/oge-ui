import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
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
  treeChildPageLimit,
  treeChildrenLoadNeeded,
  treeEdgeIndex,
  treeLoadMoreText,
  treeNodeIndent,
  treeRangeSelection,
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
  type OgeTreeKeyAction,
  type OgeTreeLoadState,
  type OgeTreeTransferredEvent,
  type OgeTreeViewModel,
  type OgeTreeViewResolvedMessages,
  type RowKey,
  type TreeIndex,
} from '@oge-ui/behavior';
import { OgeLiveAnnouncer } from '@oge-ui/overlay';
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
                [class.oge-tree-view-item-cut]="cutKey() === node.key"
                [class.oge-tree-view-item-more]="!!node.more"
                [class.oge-tree-view-item-editing]="editingKey() === node.key"
                [attr.role]="node.filler ? null : 'treeitem'"
                [attr.data-key]="node.filler ? null : node.key"
                [id]="uid + '-node-' + node.id"
                [attr.aria-level]="node.level + 1"
                [attr.aria-posinset]="
                  node.filler || node.more ? null : node.posInSet
                "
                [attr.aria-setsize]="
                  node.filler || node.more ? null : node.setSize
                "
                [attr.aria-keyshortcuts]="keyShortcuts(node)"
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
              >
                @if (node.filler) {
                  <span class="oge-tree-view-spinner" aria-hidden="true"></span>
                  <span class="oge-tree-view-filler-text">{{
                    node.failed
                      ? mergedMessages().childrenLoadFailed
                      : mergedMessages().loadingChildren
                  }}</span>
                } @else if (node.more) {
                  <span class="oge-tree-view-more-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="14" height="14">
                      <path
                        d="M6 9l6 6 6-6"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                  <span class="oge-tree-view-text oge-tree-view-more-text">{{
                    loadMoreText(node)
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
                  @if (editingKey() === node.key) {
                    <!--
                      A transient text field inside the treeitem: treeitem
                      does not make its children presentational, so axe's
                      nested-interactive does not apply. Its keys stop at the
                      field; focus returns to the row on Enter / Escape.
                    -->
                    <input
                      #editInput
                      type="text"
                      class="oge-tree-view-edit-input"
                      [value]="node.text"
                      [attr.aria-label]="mergedMessages().editLabel"
                      [attr.aria-invalid]="editError() ? 'true' : null"
                      [attr.aria-describedby]="
                        editError() ? uid + '-edit-error' : null
                      "
                      (keydown)="onEditKeydown(node, $event)"
                      (blur)="onEditBlur(node, $event)"
                    />
                    @if (editError(); as error) {
                      <span
                        class="oge-tree-view-edit-error"
                        [id]="uid + '-edit-error'"
                        >{{ error }}</span
                      >
                    }
                  } @else if (itemTemplate(); as tpl) {
                    <ng-container
                      *ngTemplateOutlet="
                        tpl.templateRef;
                        context: itemContext(node)
                      "
                    />
                  } @else if (node.highlighted; as runs) {
                    <!-- prettier-ignore -->
                    <span class="oge-tree-view-text">@for (run of runs; track $index) {@if (run.match) {<mark class="oge-highlight">{{ run.text }}</mark>} @else {{{ run.text }}}}</span>
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
  private readonly announcer = inject(OgeLiveAnnouncer);
  private readonly injector = inject(Injector);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

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
  /**
   * Trees sharing a group accept each other's nodes — by pointer drag and by
   * the Ctrl+X / Ctrl+V keyboard twin. Both trees need `allowDragging`. The
   * target fires `itemReordering` / `itemReordered` (with `sourceTreeId` /
   * `targetTreeId`), the source `itemTransferred`; neither moves data.
   */
  readonly dragGroup = input<string | undefined>(undefined);

  /**
   * Lets users rename nodes in place: F2 (or a double-click with
   * `editOnDblClick`) turns the label into a text field; Enter or blur
   * commits, Escape cancels. `true`, `false`, or a per-item predicate. The
   * tree does not write the label — apply `itemEdited` to your data.
   */
  readonly allowEditing = input<OgeTreeAllowEditing<T>>(false);
  /** A double-click opens the label editor instead of toggling the node. */
  readonly editOnDblClick = input(false);
  /**
   * Validates an edited label: `true` / `null` accepts, `false` rejects with
   * the catalog's `editInvalid`, a string rejects with that message. A
   * rejected label keeps the editor open.
   */
  readonly validateEdit = input<OgeTreeEditValidator<T> | undefined>(undefined);

  /**
   * Children rendered per parent (roots included) before a "Load more" row —
   * Kendo's node page size. `aria-setsize` keeps reporting the real total.
   * `0` / unset renders every child. Paging pauses while searching.
   */
  readonly childPageSize = input<number | undefined>(undefined);

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
  /**
   * Emitted by the source tree after one of its nodes moved to another tree
   * of the same `dragGroup` — remove it from this tree's data.
   */
  readonly itemTransferred = output<OgeTreeTransferredEvent<T>>();
  /** Cancelable pre-event of the label editor opening. */
  readonly itemEditStarting = output<OgeTreeEditStartingEvent<T>>();
  /** Cancelable pre-event of an edited label committing. */
  readonly itemEditing = output<OgeTreeEditingEvent<T>>();
  /** Emitted after a label edit committed; write `value` into your data. */
  readonly itemEdited = output<OgeTreeEditedEvent<T>>();
  /** Emitted after a "Load more" row revealed the next page of children. */
  readonly childPageShown = output<OgeTreeChildPageEvent<T>>();

  protected readonly itemTemplate = contentChild(OgeTreeItemTemplate);
  protected readonly expandIconTemplate = contentChild(
    OgeTreeExpandIconTemplate,
  );
  protected readonly noDataTemplate = contentChild(OgeTreeNoDataTemplate);

  private readonly rowElements = viewChildren<ElementRef<HTMLElement>>('rowEl');
  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');
  private readonly editInput =
    viewChild<ElementRef<HTMLInputElement>>('editInput');

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
  private dragHandle: OgePointerGestureHandle | null = null;
  private readonly _cutKey = signal<RowKey | null>(null);
  /** The node a pending Ctrl+X holds (drawn dashed until pasted). */
  protected readonly cutKey = this._cutKey.asReadonly();

  // label editing
  private readonly _editingKey = signal<RowKey | null>(null);
  private readonly _editError = signal<string | null>(null);
  protected readonly editingKey = this._editingKey.asReadonly();
  protected readonly editError = this._editError.asReadonly();

  /** Children revealed so far per parent (`null` = roots) — "Load more". */
  private readonly pageLimits = signal<ReadonlyMap<RowKey | null, number>>(
    new Map(),
  );

  /** Effective messages: config defaults overlaid with `[messages]`. */
  protected readonly mergedMessages = computed<OgeTreeViewResolvedMessages>(
    () => fillTreeViewMessages({ ...this.config.messages, ...this.messages() }),
  );

  /**
   * This tree as a participant in moves — its own reorders and its
   * `dragGroup`'s cross-tree drops share one commit path in
   * `@oge-ui/behavior` (`tree-view-transfer`).
   */
  private readonly peer: OgeTreeDragPeer = {
    treeId: () => this.resolvedTreeId(),
    group: () => ogeTreeDragGroupOf(this.dragGroup(), this.resolvedTreeId()),
    element: () => this.hostEl.nativeElement,
    rows: () => this.rowElements().map((ref) => ref.nativeElement),
    rowInfo: (dataKey) => {
      const node = this.nodes().find(
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
    itemOf: (key) => this.treeIndex().byKey.get(key),
    textOf: (key) => {
      const item = this.treeIndex().byKey.get(key);
      return item === undefined ? String(key) : this.model().displayOf(item);
    },
    canDrop: (source, dropKey) => {
      if (this.disabled() || !this.treeIndex().byKey.has(dropKey)) return false;
      return source.treeId !== this.resolvedTreeId()
        ? true
        : treeCanDrop(this.treeIndex(), source.key, dropKey);
    },
    allowDropInside: () => this.allowDropInside(),
    preview: (target) => {
      this._dropTargetKey.set(target?.key ?? null);
      this._dropPosition.set(target?.position ?? null);
    },
    expand: (key) => void this.expand(key),
    setCut: (key) => this._cutKey.set(key),
    announce: (text) => this.announcer.announce(text),
    messages: () => this.mergedMessages(),
    emitReordering: (event) =>
      this.itemReordering.emit(event as OgeTreeReorderingEvent<T>),
    emitReordered: (event) =>
      this.itemReordered.emit(event as OgeTreeReorderedEvent<T>),
    emitTransferred: (event) =>
      this.itemTransferred.emit(event as OgeTreeTransferredEvent<T>),
  };

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
      childPageSize: this.childPageSize(),
      pageLimits: this.pageLimits(),
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

    // a tree that drags takes part in its group's moves while it is mounted
    effect((onCleanup) => {
      if (!this.allowDragging()) return;
      this.dragGroup();
      this.resolvedTreeId();
      const unregister = untracked(() => registerOgeTreeDragPeer(this.peer));
      onCleanup(() => {
        unregister();
        this._cutKey.set(null);
      });
    });

    // the label editor takes focus with its text selected as soon as it renders
    effect(() => {
      const field = this.editInput()?.nativeElement;
      if (!field) return;
      untracked(() => {
        field.focus();
        field.select();
      });
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.searchTimer);
      this.dragHandle?.cancel();
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

  /**
   * Opens the label editor on a node (what F2 does). Returns `false` when
   * editing is off for it or `itemEditStarting` vetoed.
   */
  editItem(key: RowKey): boolean {
    const node = this.nodes().find((n) => n.key === key && !n.filler);
    if (!node) return false;
    return this.startEdit(node);
  }

  /** Closes an open label editor without committing. */
  cancelEdit(): void {
    const key = this._editingKey();
    if (key !== null) this.closeEditor(key, false);
  }

  /**
   * Reveals the next `childPageSize` children of a paged parent (`null` for
   * the root level) — what activating its "Load more" row does.
   */
  showMoreChildren(parentKey: RowKey | null): void {
    this.revealNextPage(parentKey, undefined, false);
  }

  /**
   * Marks a node for a keyboard move (what Ctrl+X does); `pasteItem` on any
   * tree of the same `dragGroup` moves it. Wire both to buttons or a context
   * menu for a single-pointer path. Requires `allowDragging`.
   */
  cutItem(key: RowKey): boolean {
    if (!this.allowDragging() || this.disabled()) return false;
    return ogeTreeCut(this.peer, key);
  }

  /**
   * Moves the cut node of this tree's group onto `targetKey` through the
   * same pipeline as a drop (`itemReordering` → `itemReordered` →
   * `itemTransferred`). `position` defaults to `inside` (`after` when
   * `allowDropInside` is off).
   */
  pasteItem(targetKey: RowKey, position?: OgeTreeDropPosition): boolean {
    if (!this.allowDragging() || this.disabled()) return false;
    return ogeTreePaste(
      this.peer,
      targetKey,
      position ?? (this.allowDropInside() ? 'inside' : 'after'),
    );
  }

  // ---- template helpers ----------------------------------------------------

  /** `aria-keyshortcuts` of a row: F2 when renamable, the move keys when dragging. */
  protected keyShortcuts(node: OgeTreeNode<T>): string | null {
    if (node.filler || node.more) return null;
    const keys: string[] = [];
    if (this.allowEditing() !== false) keys.push('F2');
    if (this.allowDragging()) keys.push(OGE_TREE_TRANSFER_SHORTCUTS);
    return keys.length ? keys.join(' ') : null;
  }

  /** Label of a "Load more" row: the ICU plural over the hidden children. */
  protected loadMoreText(node: OgeTreeNode<T>): string {
    return node.more
      ? treeLoadMoreText(this.mergedMessages().loadMore, node.more)
      : '';
  }

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
      highlighted: node.highlighted,
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
    if (this.isEditTarget(event.target)) return;
    this.focusedKey.set(node.key);
    if (node.more) {
      this.revealNextPage(node.more.parentKey, event, true);
      return;
    }
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
    if (node.filler || node.more || node.disabled || this.disabled()) return;
    if (this.isEditTarget(event.target)) return;
    this.itemDblClick.emit({ key: node.key, item: node.item, event });
    if (this.editOnDblClick() && this.startEdit(node, event)) return;
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

    // F2 renames (the desktop-tree convention; APG leaves it to the author)
    if (isTreeEditKey(event)) {
      if (this.startEdit(node, event)) event.preventDefault();
      return;
    }
    // the keyboard twin of drag & drop: Ctrl+X here, Ctrl+V on the target
    if (this.allowDragging() && !node.more) {
      const transfer = planTreeTransferKey(event);
      if (transfer === 'cut') {
        event.preventDefault();
        ogeTreeCut(this.peer, node.key);
        return;
      }
      if (transfer !== null) {
        event.preventDefault();
        const position =
          transfer === 'paste' && this.allowDropInside() ? 'inside' : 'after';
        ogeTreePaste(this.peer, node.key, position, event);
        return;
      }
    }
    if (event.key === 'Escape' && ogeTreeHasCut(this.peer)) {
      event.preventDefault();
      ogeTreeCancelCut(this.peer);
      return;
    }

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
      case 'load-more':
        if (action.node.more) {
          this.revealNextPage(action.node.more.parentKey, event, true);
        }
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

  // ---- "Load more" paging --------------------------------------------------

  /**
   * One more page under `parentKey`, then `childPageShown`. With `focus`
   * (the row was activated) the first newly shown child takes the focus, so
   * the user carries on where the list grew.
   */
  private revealNextPage(
    parentKey: RowKey | null,
    event: Event | undefined,
    focus: boolean,
  ): void {
    const pageSize = resolveTreeChildPageSize(this.childPageSize());
    if (pageSize === 0) return;
    const index = this.treeIndex();
    const siblings =
      parentKey === null
        ? index.roots
        : (index.childrenOf.get(parentKey) ?? []);
    const total = siblings.length;
    const shown = treeChildPageLimit(this.pageLimits(), parentKey, pageSize);
    if (shown >= total) return;
    const next = nextTreeChildPage(
      this.pageLimits(),
      parentKey,
      pageSize,
      total,
    );
    this.pageLimits.set(next);
    this.childPageShown.emit({
      parentKey,
      parentItem: parentKey === null ? undefined : index.byKey.get(parentKey),
      shown: treeChildPageLimit(next, parentKey, pageSize),
      total,
      event,
    });
    if (!focus) return;
    const firstNew = this.keyOf()(siblings[shown]);
    this.focusedKey.set(firstNew);
    afterNextRender(
      () => {
        const rowIndex = this.nodes().findIndex(
          (n) => !n.filler && n.key === firstNew,
        );
        if (rowIndex !== -1) this.moveFocus(rowIndex);
      },
      { injector: this.injector },
    );
  }

  // ---- label editing -------------------------------------------------------

  private startEdit(node: OgeTreeNode<T>, event?: Event): boolean {
    if (this._editingKey() === node.key) return true;
    const open = runTreeEditStart<T>({
      node,
      allow: this.allowEditing(),
      treeDisabled: this.disabled(),
      event,
      emitStarting: (starting) => this.itemEditStarting.emit(starting),
    });
    if (!open) return false;
    this._editError.set(null);
    this._editingKey.set(node.key);
    return true;
  }

  protected onEditKeydown(node: OgeTreeNode<T>, event: KeyboardEvent): void {
    // the field owns its keys: arrows move the caret, Space types a space,
    // and Escape must not reach a drawer or dialog around the tree
    event.stopPropagation();
    const action = planTreeEditKey(event.key);
    if (action === null) return;
    event.preventDefault();
    if (action === 'cancel') this.closeEditor(node.key, true);
    else this.commitEdit(node, event, true);
  }

  protected onEditBlur(node: OgeTreeNode<T>, event: FocusEvent): void {
    if (this._editingKey() !== node.key) return;
    this.commitEdit(node, event, false);
  }

  private commitEdit(
    node: OgeTreeNode<T>,
    event: Event,
    refocus: boolean,
  ): void {
    const field = this.editInput()?.nativeElement;
    const result = runTreeEditCommit<T>({
      key: node.key,
      item: node.item,
      previousValue: node.text,
      value: field?.value ?? node.text,
      event,
      validate: this.validateEdit(),
      invalidMessage: this.mergedMessages().editInvalid,
      emitEditing: (editing) => this.itemEditing.emit(editing),
      emitEdited: (edited) => this.itemEdited.emit(edited),
    });
    if (result.status === 'invalid') {
      const error = result.error ?? this.mergedMessages().editInvalid;
      this._editError.set(error);
      this.announcer.announce(error);
      if (refocus) field?.focus();
      return;
    }
    this.closeEditor(node.key, refocus);
  }

  /** Closes the editor; with `refocus` the row takes the focus back. */
  private closeEditor(key: RowKey, refocus: boolean): void {
    // cleared first, so the blur the refocus causes is not a second commit
    this._editingKey.set(null);
    this._editError.set(null);
    if (refocus) this.elementForKey(key)?.focus();
  }

  private isEditTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      target.closest('.oge-tree-view-edit-input') !== null
    );
  }

  // ---- drag & drop ---------------------------------------------------------

  /**
   * Pointer drags run on `@oge-ui/behavior`'s `beginOgeTreeDrag`
   * (`beginPointerDragDrop` underneath): threshold, touch long press, ghost,
   * auto-scroll, capture-phase Escape, hover-to-expand and the cross-tree
   * hit-test over the `dragGroup` registry. The drop runs the same commit
   * as Ctrl+V.
   */
  protected onPointerDown(node: OgeTreeNode<T>, event: PointerEvent): void {
    if (!this.allowDragging() || this.disabled() || node.filler || node.more) {
      return;
    }
    if (event.button !== 0 || this.isCheckTarget(event.target)) return;
    if (this.isEditTarget(event.target)) return;
    this.dragHandle?.cancel();
    const key = node.key;
    this.dragHandle = beginOgeTreeDrag(event, {
      peer: this.peer,
      key,
      row: event.currentTarget as Element | null,
      autoScroll: this.scrollEl()?.nativeElement ?? null,
      onStart: () => this._dragKey.set(key),
      onEnd: () => {
        this._dragKey.set(null);
        this.dragHandle = null;
      },
    });
  }
}

function sameKeys(a: readonly RowKey[], b: readonly RowKey[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}
