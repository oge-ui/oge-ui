import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  OgeTreeView,
  type OgeTreeCheckBoxesMode,
  type OgeTreeDataStructure,
  type OgeTreeExpr,
  type OgeTreeLoadChildren,
  type OgeTreeSearchMode,
  type OgeTreeSelectedKeysMode,
  type OgeTreeVirtualScrollOptions,
  type RowKey,
  type TreeFilterMode,
} from '@oge-ui/navigation';
import {
  OGE_OVERLAY_CONFIG,
  OgePopup,
  type OgePopupPlacement,
} from '@oge-ui/overlay';
import { OgeFieldChrome } from '../field/field-chrome';
import { OgeInputBase } from '../field/input-base';
import { OGE_INPUT_HOST, type OgeInputDropDownApi } from '../field/input-host';
import { SelectPanelController } from '../select-list/select-panel-controller';
import type {
  OgeTreeSelectDisplayMode,
  OgeTreeSelectSelectionChangedEvent,
  OgeTreeSelectSelectionMode,
} from './tree-select-types';

let nextTreeSelectId = 0;

/**
 * Drop-down editor whose popup is a full `oge-tree-view` — the hierarchical
 * counterpart of `oge-select-box`, on the same field chrome (label modes,
 * validation subscript, clear button, Signal Forms and reactive forms).
 *
 * The field is a WAI-ARIA combobox with `aria-haspopup="tree"`. Unlike the
 * select box it does **not** use `aria-activedescendant`: the tree owns a
 * roving tabindex, so opening moves real DOM focus into it, which is the
 * combobox pattern's other sanctioned option and keeps the tree's own APG
 * keyboard map (arrows, Home/End, type-ahead, `*`) intact.
 *
 * ```html
 * <oge-tree-select
 *   label="Folder"
 *   [items]="folders"
 *   keyExpr="id"
 *   parentIdExpr="parentId"
 *   displayExpr="name"
 *   [(value)]="folderId"
 * />
 * ```
 */
@Component({
  selector: 'oge-tree-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeFieldChrome, OgePopup, OgeTreeView],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeTreeSelect }],
  host: {
    class: 'oge-input oge-tree-select',
    '[class.oge-tree-select-open]': 'opened()',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <input
        #native
        class="oge-input-native oge-select-plain"
        type="text"
        role="combobox"
        aria-haspopup="tree"
        autocomplete="off"
        readonly
        [id]="inputId"
        [value]="inputText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [attr.name]="name() || null"
        [attr.title]="tooltip() ?? null"
        [attr.tabindex]="tabIndex()"
        [attr.aria-expanded]="opened()"
        [attr.aria-controls]="opened() ? treeId : null"
        [attr.aria-label]="labelMode() === 'hidden' && label() ? label() : null"
        [attr.aria-labelledby]="
          labelMode() !== 'hidden' && label() ? labelId : null
        "
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        (click)="onFieldClick()"
        (keydown)="onKeydown($event)"
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
      />
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (opened()) {
      <oge-popup [panel]="panel">
        <div
          class="oge-tree-select-panel"
          [style.max-block-size.px]="dropdownMaxHeight()"
        >
          <oge-tree-view
            #tree
            [treeId]="treeId"
            [items]="items()"
            [keyExpr]="keyExpr()"
            [parentIdExpr]="parentIdExpr()"
            [itemsExpr]="itemsExpr()"
            [displayExpr]="displayExpr()"
            [disabledExpr]="disabledExpr()"
            [hasItemsExpr]="hasItemsExpr()"
            [iconExpr]="iconExpr()"
            [rootValue]="rootValue()"
            [dataStructure]="dataStructure()"
            [selectionMode]="selectionMode()"
            [expandEvent]="expandEvent()"
            [showCheckBoxes]="showCheckBoxes()"
            [selectNodesRecursive]="selectNodesRecursive()"
            [selectedKeysMode]="selectedKeysMode()"
            [searchEnabled]="searchEnabled()"
            [searchMode]="searchMode()"
            [filterMode]="filterMode()"
            [loadChildren]="loadChildren()"
            [virtualScroll]="virtualScroll()"
            [height]="treeHeight()"
            [ariaLabel]="label() || undefined"
            [(expandedKeys)]="expandedKeys"
            [selectedKeys]="selectedKeys()"
            (selectedKeysChange)="onTreeSelectionChange($event)"
          />
        </div>
      </oge-popup>
    }
  `,
})
export class OgeTreeSelect<TItem extends object = Record<string, unknown>>
  extends OgeInputBase<unknown>
  implements FormValueControl<unknown>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /** DOM id of the popup tree — the combobox's `aria-controls` target. */
  readonly treeId = `oge-tree-select-${nextTreeSelectId++}-tree`;

  /**
   * Committed value: the selected key in `single` mode, an array of keys in
   * `multiple` mode. `null` / `[]` when empty.
   */
  readonly value = model<unknown>(null);

  /** Nodes to display — a flat parent-referencing list or nested children. */
  readonly items = input<readonly TItem[] | undefined>(undefined);
  /** Field holding a node's stable key. */
  readonly keyExpr = input<OgeTreeExpr<TItem, RowKey>>('id');
  /** Field holding a node's parent key (flat data). */
  readonly parentIdExpr = input<OgeTreeExpr<TItem>>('parentId');
  /** Field holding nested children; setting it switches to hierarchical data. */
  readonly itemsExpr = input<
    OgeTreeExpr<TItem, readonly TItem[] | undefined> | undefined
  >(undefined);
  /** Field holding the display text, used for the field text too. */
  readonly displayExpr = input<OgeTreeExpr<TItem>>('text');
  /** Field marking a node disabled. */
  readonly disabledExpr = input<OgeTreeExpr<TItem>>('disabled');
  /** Field hinting at not-yet-loaded children — pairs with `loadChildren`. */
  readonly hasItemsExpr = input<OgeTreeExpr<TItem>>('hasItems');
  /** Field holding SVG path data (`d`) for a per-node icon. */
  readonly iconExpr = input<OgeTreeExpr<TItem> | undefined>(undefined);
  /** Parent value that marks root nodes in flat data. */
  readonly rootValue = input<unknown>(undefined);
  /** Explicit data shape; inferred from `itemsExpr` when unset. */
  readonly dataStructure = input<OgeTreeDataStructure | undefined>(undefined);

  /** One node or many. `multiple` makes `value` an array of keys. */
  readonly selectionMode = input<OgeTreeSelectSelectionMode>('single');
  /** Checkbox column inside the popup. */
  readonly showCheckBoxes = input<OgeTreeCheckBoxesMode>('none');
  /** Cascades selection down to descendants and up to full parents. */
  readonly selectNodesRecursive = input(true);
  /** Projection applied to the committed keys in `multiple` mode. */
  readonly selectedKeysMode = input<OgeTreeSelectedKeysMode>('all');
  /** How a multiple-selection value is rendered in the closed field. */
  readonly displayMode = input<OgeTreeSelectDisplayMode>('text');
  /**
   * Which gesture expands a node inside the popup. Defaults to `dblclick`, not
   * the tree's own `click`: in a picker a single click should choose a node,
   * and the chevron expands either way.
   */
  readonly expandEvent = input<'click' | 'dblclick'>('dblclick');

  /** Renders the tree's search box inside the popup. */
  readonly searchEnabled = input(false);
  /** How the search text is compared. */
  readonly searchMode = input<OgeTreeSearchMode>('contains');
  /** Which relatives of a search match stay visible. */
  readonly filterMode = input<TreeFilterMode>('withAncestors');
  /** Loads a node's children the first time it expands. */
  readonly loadChildren = input<OgeTreeLoadChildren<TItem> | undefined>(
    undefined,
  );
  /** Windowed rendering inside the popup for very large trees. */
  readonly virtualScroll = input<boolean | OgeTreeVirtualScrollOptions>(false);

  /** Keys of the expanded nodes — two-way, survives close/reopen. */
  readonly expandedKeys = model<readonly RowKey[]>([]);
  /** Whether the popup is open — two-way. */
  readonly opened = model(false);
  /** Popup placement relative to the field. */
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /** Popup width; `'anchor'` matches the field. */
  readonly dropdownWidth = input<number | 'anchor'>('anchor');
  /** Max height of the popup in pixels. */
  readonly dropdownMaxHeight = input(320);
  /** Opens the popup when the field itself is clicked, not just the chevron. */
  readonly openOnFieldClick = input(true);

  /** Emitted after the committed selection changed. */
  readonly selectionChanged = output<OgeTreeSelectSelectionChangedEvent>();
  /** Emitted after the popup opened. */
  readonly dropDownOpened = output<void>();
  /** Emitted after the popup closed. */
  readonly dropDownClosed = output<void>();

  private readonly nativeRef =
    viewChild<ElementRef<HTMLInputElement>>('native');
  // read: ElementRef — a template ref on a component element resolves to the
  // component instance, and the panel needs the DOM node
  private readonly chromeRef = viewChild(OgeFieldChrome, { read: ElementRef });
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });
  private readonly treeRef = viewChild<OgeTreeView<TItem>>('tree');

  /** The value as a key list, whatever the selection mode. */
  protected readonly selectedKeys = computed<readonly RowKey[]>(() => {
    const value = this.value();
    if (value === null || value === undefined) return [];
    return Array.isArray(value) ? (value as RowKey[]) : [value as RowKey];
  });

  /** Key → display text, resolved from `items` so it survives a closed popup. */
  private readonly labelByKey = computed<ReadonlyMap<RowKey, string>>(() => {
    const rows = this.items() ?? [];
    const keyOf = toAccessor<TItem, RowKey>(this.keyExpr());
    const displayOf = toAccessor<TItem, unknown>(this.displayExpr());
    const itemsExpr = this.itemsExpr();
    const nested =
      this.dataStructure() === 'tree' ||
      (this.dataStructure() === undefined && itemsExpr !== undefined);
    const map = new Map<RowKey, string>();
    const visit = (list: readonly TItem[]): void => {
      for (const row of list) {
        map.set(keyOf(row), String(displayOf(row) ?? ''));
        if (!nested) continue;
        const childrenOf = toAccessor<TItem, readonly TItem[] | undefined>(
          itemsExpr ?? 'items',
        );
        const children = childrenOf(row);
        if (children?.length) visit(children);
      }
    };
    visit(rows);
    return map;
  });

  /** Text shown in the closed field. */
  protected readonly inputText = computed(() => {
    const keys = this.selectedKeys();
    if (keys.length === 0) return '';
    if (this.displayMode() === 'count' && keys.length > 1) {
      return `${keys.length}`;
    }
    const labels = this.labelByKey();
    return keys.map((key) => labels.get(key) ?? String(key)).join(', ');
  });

  protected readonly treeHeight = computed(() =>
    this.virtualScroll() === false
      ? undefined
      : `${this.dropdownMaxHeight() - 8}px`,
  );

  private readonly panelController = new SelectPanelController({
    // anchor on the bordered container, not the host — the host also holds
    // the label and subscript, which the popup must ignore
    anchor: () =>
      this.chromeRef()?.nativeElement.querySelector('.oge-input-container') ??
      this.hostEl.nativeElement,
    panel: () => this.popupRef()?.nativeElement ?? null,
    placement: () => this.dropdownPlacement(),
    width: () => this.dropdownWidth(),
    offset: () => this.overlayConfig.offset,
    viewportPadding: () => this.overlayConfig.viewportPadding,
    opened: this.opened,
    blocked: () => this.effectiveDisabled() || this.readonly(),
    restoreFocus: () => this.focus(),
    onOpened: () => this.dropDownOpened.emit(),
    onClosed: () => this.dropDownClosed.emit(),
  });

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = this.panelController.panel;

  override readonly dropdown: OgeInputDropDownApi =
    this.panelController.dropDownApi(
      () => !this.readonly(),
      () => this.toggle(),
    );

  constructor() {
    super();
    // Moving DOM focus into the tree is what lets its own APG keyboard map
    // work; the combobox keeps `aria-expanded`/`aria-controls` pointing at it.
    effect(() => {
      const open = this.opened();
      const tree = this.treeRef();
      if (!open || !tree) return;
      untracked(() => queueMicrotask(() => tree.focus(this.selectedKeys()[0])));
    });
  }

  /** Opens the popup. */
  open(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.opened.set(true);
  }

  /** Closes the popup. */
  close(): void {
    this.opened.set(false);
  }

  /** Opens the popup if closed, closes it otherwise. */
  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  protected onFieldClick(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.openOnFieldClick()) return;
    this.toggle();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!this.opened()) this.open();
        else this.treeRef()?.focus(this.selectedKeys()[0]);
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.toggle();
        return;
      case 'Escape':
        if (this.opened()) {
          event.preventDefault();
          this.close();
          this.focus();
        }
        return;
      default:
        return;
    }
  }

  protected onTreeSelectionChange(keys: readonly RowKey[]): void {
    const previous = this.selectedKeys();
    if (sameKeys(keys, previous)) return;
    const next =
      this.selectionMode() === 'multiple' ? [...keys] : (keys[0] ?? null);
    this.commitNow(next);
    this.selectionChanged.emit({ keys: [...keys], previousKeys: previous });
    // Closing has to happen *after* the commit: the popup owns the tree, so
    // tearing it down on the earlier `itemClick` would destroy the component
    // before its selection ever reached us.
    if (this.selectionMode() === 'single' && this.showCheckBoxes() === 'none') {
      this.close();
      this.focus();
    }
  }

  protected override nativeElement(): HTMLInputElement | null {
    return this.nativeRef()?.nativeElement ?? null;
  }

  protected emptyValue(): unknown {
    return this.selectionMode() === 'multiple' ? [] : null;
  }

  protected valueIsEmpty(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    return Array.isArray(value) && value.length === 0;
  }
}

function toAccessor<T, R = unknown>(expr: OgeTreeExpr<T, R>): (row: T) => R {
  if (typeof expr === 'function') return expr;
  return (row) =>
    expr
      .split('.')
      .reduce<unknown>(
        (acc, part) => (acc as Record<string, unknown> | null)?.[part],
        row,
      ) as R;
}

function sameKeys(a: readonly RowKey[], b: readonly RowKey[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}
