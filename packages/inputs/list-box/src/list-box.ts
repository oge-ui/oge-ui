import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  OGE_LIST_BOX_REORDER_SHORTCUTS,
  OgeListBoxCore,
  beginPointerDragDrop,
  ogeListBoxDropTarget,
  ogeListBoxReorderAnnouncement,
  ogeListBoxSections,
  ogeMoveListItem,
  prepareTouchDrag,
  type OgeListBoxDropTarget,
  type OgeListBoxReorder,
  type OgeListBoxReorderCause,
  type OgeListBoxSelectionMode,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectGroupExpr,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
} from '@oge-ui/behavior';
import { OgeControlBase } from '@oge-ui/inputs/field';
import { OgeLiveAnnouncer } from '@oge-ui/overlay';
import {
  OgeListBoxGroupTemplate,
  OgeListBoxItemTemplate,
  type OgeListBoxGroupTemplateContext,
  type OgeListBoxItemTemplateContext,
} from './list-box-templates';
import type {
  OgeListBoxItemClickEvent,
  OgeListBoxReorderedEvent,
  OgeListBoxReorderingEvent,
  OgeListBoxSelectionChangedEvent,
} from './list-box-types';

/** Angular's reactivity, in the shape the shared machine consumes. */
const SIGNAL_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

/**
 * A standing, always-open list of options as a form editor — the WAI-ARIA
 * APG **listbox** (Kendo ListBox, PrimeNG Listbox, Syncfusion ListBox):
 *
 * ```html
 * <oge-list-box
 *   label="Cities"
 *   [items]="cities"
 *   displayExpr="name"
 *   valueExpr="id"
 *   selectionMode="multiple"
 *   [showCheckBoxes]="true"
 *   [(value)]="picked"
 * />
 * ```
 *
 * One Tab stop: the focusable `role="listbox"` carries
 * `aria-activedescendant`; arrows, Home/End and PageUp/PageDown move the
 * active option (in `single` mode the selection follows), typing jumps by
 * prefix. In `multiple` mode (`aria-multiselectable`) Space/Enter and clicks
 * toggle, Shift+arrows / Shift+click extend from the anchor, Ctrl+Shift+Home/End
 * select to an edge and Ctrl+A selects all. `groupBy` renders labelled
 * `role="group"`s, `searchEnabled` a filter field above the list. The value
 * is one `valueExpr` result (or `null`) in single mode and an items-ordered
 * array in multiple mode; the list machine is `@oge-ui/behavior`'s
 * `OgeListBoxCore`, shared with React. `allowReordering` lets the user
 * reorder the options — Alt+↑/↓ on the active option, or a pointer drag —
 * through the cancelable `reordering` → `reordered` pair, announced through
 * the shared live announcer; persist `reordered.items` to keep the order. Works standalone via `[(value)]`,
 * with Signal Forms via `[formField]` and with reactive/template forms via
 * `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-list-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    class: 'oge-list-box',
    '[class.oge-list-box-multiple]': 'multiple()',
    '[class.oge-list-box-checks]': 'checks()',
    '[class.oge-list-box-invalid]': 'showError()',
    '[class.oge-list-box-readonly]': 'readonly()',
    '[class.oge-list-box-sm]': "size() === 'sm'",
    '[class.oge-list-box-lg]': "size() === 'lg'",
    '[class.oge-list-box-reorderable]': 'allowReordering()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @if (label()) {
      <span class="oge-list-box-label" [id]="labelId"
        >{{ label() }}
        @if (required()) {
          <span class="oge-list-box-required" aria-hidden="true">*</span>
        }
      </span>
    }
    <div class="oge-list-box-frame">
      @if (searchEnabled()) {
        <div class="oge-list-box-search">
          <svg
            class="oge-list-box-search-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            class="oge-list-box-search-input"
            autocomplete="off"
            [attr.placeholder]="
              searchPlaceholder() ?? msg().listBoxSearchPlaceholder
            "
            [attr.aria-label]="msg().listBoxSearchLabel"
            [attr.aria-controls]="core.listboxId"
            [disabled]="effectiveDisabled()"
            [value]="core.searchText() ?? ''"
            (input)="onSearchInput($event)"
            (keydown)="onSearchKeydown($event)"
          />
        </div>
      }
      <div
        #list
        class="oge-list-box-list"
        role="listbox"
        [id]="core.listboxId"
        [tabindex]="effectiveDisabled() ? -1 : tabIndex()"
        [style.max-height]="maxHeight()"
        [attr.title]="tooltip() ?? null"
        [attr.aria-multiselectable]="multiple() ? 'true' : null"
        [attr.aria-activedescendant]="activeDescendant()"
        [attr.aria-labelledby]="labelledBy() ?? (label() ? labelId : null)"
        [attr.aria-label]="labelledBy() || label() ? null : msg().listBoxLabel"
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        [attr.aria-readonly]="readonly() ? 'true' : null"
        [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
        [attr.aria-keyshortcuts]="shortcuts()"
        (keydown)="onKeydown($event)"
        (click)="onListClick($event)"
        (pointerdown)="onListPointerDown($event)"
        (focus)="onListFocus()"
      >
        @for (section of sections(); track $index; let s = $index) {
          @if (section.label !== null) {
            <div
              class="oge-list-box-group"
              role="group"
              [attr.aria-labelledby]="groupId(s)"
            >
              <div
                class="oge-list-box-group-header"
                role="presentation"
                [id]="groupId(s)"
              >
                @if (resolvedGroupTemplate(); as template) {
                  <ng-container
                    *ngTemplateOutlet="
                      template;
                      context: {
                        $implicit: section.label,
                        count: section.options.length,
                      }
                    "
                  />
                } @else {
                  {{ section.label }}
                }
              </div>
              @for (option of section.options; track option.index) {
                <ng-container
                  *ngTemplateOutlet="
                    optionTpl;
                    context: { $implicit: option.item, index: option.index }
                  "
                />
              }
            </div>
          } @else {
            @for (option of section.options; track option.index) {
              <ng-container
                *ngTemplateOutlet="
                  optionTpl;
                  context: { $implicit: option.item, index: option.index }
                "
              />
            }
          }
        }
      </div>
      @if (core.visibleItems().length === 0) {
        <div class="oge-list-box-empty">
          {{ noDataText() ?? msg().noDataText }}
        </div>
      }
    </div>
    @if (subscript(); as sub) {
      <div
        class="oge-list-box-subscript"
        [class.oge-list-box-error]="sub.error"
        [id]="sub.id"
      >
        {{ sub.text }}
      </div>
    }

    <ng-template #optionTpl let-item let-index="index">
      <div
        class="oge-list-box-option"
        role="option"
        [id]="core.optionId(index)"
        [attr.data-index]="index"
        [class.oge-list-box-option-active]="index === core.activeIndex()"
        [class.oge-list-box-option-selected]="core.isSelected(item)"
        [class.oge-disabled]="core.isItemDisabled(item)"
        [class.oge-list-box-option-drop-before]="dropAt(index, 'before')"
        [class.oge-list-box-option-drop-after]="dropAt(index, 'after')"
        [attr.aria-selected]="core.isSelected(item)"
        [attr.aria-disabled]="core.isItemDisabled(item) ? 'true' : null"
      >
        @if (checks()) {
          <span class="oge-list-box-check" aria-hidden="true">
            <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg>
          </span>
        }
        <span class="oge-list-box-option-content">
          @if (resolvedItemTemplate(); as template) {
            <ng-container
              *ngTemplateOutlet="
                template;
                context: {
                  $implicit: item,
                  index: index,
                  selected: core.isSelected(item),
                  active: index === core.activeIndex(),
                  disabled: core.isItemDisabled(item),
                }
              "
            />
          } @else {
            {{ core.displayOf(item) }}
          }
        </span>
      </div>
    </ng-template>
  `,
  styleUrl: './list-box.scss',
})
export class OgeListBox<TItem = unknown>
  extends OgeControlBase<unknown>
  implements FormValueControl<unknown>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly announcer = inject(OgeLiveAnnouncer);

  /**
   * The selection — one `valueExpr` result (or `null`) in `single` mode, an
   * items-ordered array in `multiple` mode. Two-way.
   */
  readonly value = model<unknown>(null);
  /** The options. */
  readonly items = input<readonly TItem[]>([]);
  /** Item → option text. Omitted, the item itself is stringified. */
  readonly displayExpr = input<OgeSelectDisplayExpr<TItem> | undefined>(
    undefined,
  );
  /** Item → value. Omitted, the whole item is the value. */
  readonly valueExpr = input<OgeSelectValueExpr<TItem> | undefined>(undefined);
  /** Marks individual options as non-selectable (skipped by the keyboard). */
  readonly disabledExpr = input<OgeSelectDisabledExpr<TItem> | undefined>(
    undefined,
  );
  /** Groups the options under labelled headers (first-seen group order). */
  readonly groupBy = input<OgeSelectGroupExpr<TItem> | undefined>(undefined);
  /** `'single'` (selection follows focus) or `'multiple'`. */
  readonly selectionMode = input<OgeListBoxSelectionMode>('single');
  /** Draws a check glyph on every option (multiple mode only). */
  readonly showCheckBoxes = input(false);
  /** Renders a search field above the list that filters the options. */
  readonly searchEnabled = input(false);
  /** Which text the search matches; omitted, the display text. */
  readonly searchExpr = input<OgeSelectSearchExpr<TItem> | undefined>(
    undefined,
  );
  /** `'contains'` (default) or `'startswith'` matching. */
  readonly searchMode = input<OgeSelectSearchMode>('contains');
  /** Placeholder of the search field; `undefined` = the messages catalog. */
  readonly searchPlaceholder = input<string | undefined>(undefined);
  /** Maximum list height — px number or any CSS length; the list scrolls past it. */
  readonly height = input<number | string | undefined>(undefined);
  /** Text shown while there are no (matching) options. */
  readonly noDataText = input<string | undefined>(undefined);
  /** Visible label above the list; also its accessible name. */
  readonly label = input('');
  /** Id of an external element naming the list (overrides `label`). */
  readonly labelledBy = input<string | undefined>(undefined);
  /** Helper text under the list (hidden while an error shows). */
  readonly hint = input<string | undefined>(undefined);
  /** Shortcuts advertised as `aria-keyshortcuts` on the list (hosts handling extra keys). */
  readonly keyShortcuts = input<string | undefined>(undefined);
  /**
   * Lets the user reorder the options: Alt+↑/↓ moves the active option, a
   * pointer drag drops it before / after another. The list shows the new
   * order at once; persist `reordered.items` (a new `items` resets it).
   */
  readonly allowReordering = input(false);
  /** Option template as a `TemplateRef` (wins over a projected `[ogeListBoxItemTemplate]`). */
  readonly itemTemplate = input<
    TemplateRef<OgeListBoxItemTemplateContext<TItem>> | undefined
  >(undefined);
  /** Group header template as a `TemplateRef` (wins over `[ogeListBoxGroupTemplate]`). */
  readonly groupTemplate = input<
    TemplateRef<OgeListBoxGroupTemplateContext> | undefined
  >(undefined);

  /** The selection changed — rich payload with the added / removed items. */
  readonly selectionChanged = output<OgeListBoxSelectionChangedEvent<TItem>>();
  /** An enabled option was clicked. */
  readonly itemClick = output<OgeListBoxItemClickEvent<TItem>>();
  /** Cancelable pre-event of every reorder (keyboard, drag, `reorderItem()`). */
  readonly reordering = output<OgeListBoxReorderingEvent<TItem>>();
  /** An option moved — `items` is the new order. */
  readonly reordered = output<OgeListBoxReorderedEvent<TItem>>();

  private readonly itemTemplateDir = contentChild(OgeListBoxItemTemplate, {
    descendants: false,
  });
  private readonly groupTemplateDir = contentChild(OgeListBoxGroupTemplate, {
    descendants: false,
  });
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('list');

  /** The displayed order: `items`, until the user reorders (reset by a new `items`). */
  private readonly order = linkedSignal<readonly TItem[]>(() => this.items());
  /** Where a reorder drag would drop. */
  protected readonly dropIndicator = signal<OgeListBoxDropTarget | null>(null);

  /** The shared APG listbox machine. */
  protected readonly core = new OgeListBoxCore<TItem>(
    {
      inputId: () => this.inputId,
      items: () => this.order(),
      displayExpr: () => this.displayExpr(),
      valueExpr: () => this.valueExpr(),
      disabledExpr: () => this.disabledExpr(),
      searchExpr: () => this.searchExpr(),
      searchEnabled: () => this.searchEnabled(),
      searchMode: () => this.searchMode(),
      searchDebounceMs: () => 0,
      groupBy: () => this.groupBy(),
      selectionMode: () => this.selectionMode(),
      value: () => this.value(),
    },
    SIGNAL_ADAPTER,
  );

  protected readonly multiple = computed(
    () => this.selectionMode() === 'multiple',
  );
  protected readonly checks = computed(
    () => this.multiple() && this.showCheckBoxes(),
  );
  protected readonly sections = computed(() =>
    ogeListBoxSections(this.core.rows()),
  );
  protected readonly maxHeight = computed(() => {
    const height = this.height();
    return typeof height === 'number' ? `${height}px` : (height ?? null);
  });
  protected readonly resolvedItemTemplate = computed(
    () => this.itemTemplate() ?? this.itemTemplateDir()?.template,
  );
  protected readonly resolvedGroupTemplate = computed(
    () => this.groupTemplate() ?? this.groupTemplateDir()?.template,
  );
  private readonly listFocused = signal(false);
  /** Active option id — only while the list itself has focus. */
  protected readonly activeDescendant = computed(() =>
    this.listFocused() ? this.core.activeDescendant() : null,
  );

  protected readonly subscript = computed(() => {
    if (this.showError() && this.resolvedErrorText()) {
      return { id: this.errorId, text: this.resolvedErrorText(), error: true };
    }
    const hint = this.hint();
    return hint ? { id: this.hintId, text: hint, error: false } : null;
  });
  protected readonly describedBy = computed(() => this.subscript()?.id ?? null);
  protected readonly shortcuts = computed(() => {
    const keys = [
      this.keyShortcuts(),
      this.allowReordering() ? OGE_LIST_BOX_REORDER_SHORTCUTS : undefined,
    ].filter((entry): entry is string => !!entry);
    return keys.length > 0 ? keys.join(' ') : null;
  });

  constructor() {
    super();
    // touch drags must be armed before the first touchstart (Chrome decides there)
    afterNextRender(() => {
      if (this.allowReordering()) prepareTouchDrag();
    });
    // a filter that hides the active option moves it to the first match
    effect(() => {
      const items = this.core.visibleItems();
      untracked(() => {
        const active = this.core.activeIndex();
        if (active >= items.length) {
          this.core.activeIndex.set(this.core.edgeEnabledIndex(1));
        }
      });
    });
    this.destroyRef.onDestroy(() => this.core.destroy());
  }

  protected groupId(section: number): string {
    return `${this.inputId}-group-${section}`;
  }

  // --- public API ------------------------------------------------------------

  /** The options currently shown (after the search filter), in display order. */
  getVisibleItems(): readonly TItem[] {
    return this.core.visibleItems();
  }

  /** The selected items, in items order. */
  getSelectedItems(): TItem[] {
    return this.core.selectedItems();
  }

  /** Selects every enabled option (multiple mode). */
  selectAll(): void {
    if (!this.editable()) return;
    this.commitSelection(this.core.selectAllValue(), undefined);
  }

  /** Deselects every enabled option. */
  unselectAll(): void {
    if (!this.editable()) return;
    this.commitSelection(this.core.unselectAllValue(), undefined);
  }

  /** Makes `item` the active option and scrolls it into view. */
  scrollToItem(item: TItem): void {
    this.core.activateItem(item);
  }

  /**
   * Moves `item` before / after `target` (both options of this list) through
   * the same cancelable path as the keyboard and the pointer; `false` when
   * the move is not possible (disabled item, another group, read-only) or a
   * `reordering` handler cancelled it. `cause` is reported in the events —
   * the transfer list passes `'drag'` for its own pointer drops.
   */
  reorderItem(
    item: TItem,
    target: TItem,
    position: 'before' | 'after' = 'before',
    cause: OgeListBoxReorderCause = 'api',
  ): boolean {
    return this.commitReorder(
      this.core.reorderAt(item, target, position),
      cause,
      undefined,
    );
  }

  /** Sets the search text programmatically (`''` clears the filter). */
  search(text: string): void {
    if (text) this.core.setSearch(text);
    else this.core.resetSearch();
  }

  // --- interactions ----------------------------------------------------------

  private editable(): boolean {
    return !this.effectiveDisabled() && !this.readonly();
  }

  private commitSelection(next: unknown, event: Event | undefined): void {
    const previousValue = this.value();
    const delta = this.core.selectionDelta(previousValue, next);
    if (!delta.changed) return;
    this.commitNow(next, event);
    this.selectionChanged.emit({
      value: next,
      previousValue,
      addedItems: delta.added,
      removedItems: delta.removed,
      event,
    });
  }

  protected onListFocus(): void {
    this.listFocused.set(true);
    this.core.ensureActive();
  }

  private commitReorder(
    reorder: OgeListBoxReorder | null,
    cause: OgeListBoxReorderCause,
    event: Event | undefined,
  ): boolean {
    if (!reorder || !this.editable()) return false;
    const items = this.order();
    const item = items[reorder.fromIndex];
    const pre: OgeListBoxReorderingEvent<TItem> = {
      item,
      fromIndex: reorder.fromIndex,
      toIndex: reorder.toIndex,
      cause,
      event,
      cancel: false,
    };
    this.reordering.emit(pre);
    if (pre.cancel) return false;
    const next = ogeMoveListItem(items, reorder.fromIndex, reorder.toIndex);
    this.order.set(next);
    // focus stays on the moved option
    this.core.activateItem(item);
    this.announcer.announce(
      ogeListBoxReorderAnnouncement(
        this.msg().listBoxReorderedAnnouncement,
        this.core.displayOf(item),
        reorder.toIndex + 1,
        next.length,
        this.config.locale,
      ),
    );
    this.reordered.emit({
      item,
      fromIndex: reorder.fromIndex,
      toIndex: reorder.toIndex,
      cause,
      items: next,
      event,
    });
    return true;
  }

  protected dropAt(index: number, position: 'before' | 'after'): boolean {
    const drop = this.dropIndicator();
    return drop !== null && drop.index === index && drop.position === position;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) return;
    if (this.allowReordering() && !this.readonly()) {
      const reorder = this.core.reorderKey(event);
      if (reorder.handled) {
        event.preventDefault();
        if (reorder.reorder)
          this.commitReorder(reorder.reorder, 'keyboard', event);
        return;
      }
    }
    const result = this.core.handleKey(event, !this.readonly());
    if (result.handled) event.preventDefault();
    if ('value' in result) this.commitSelection(result.value, event);
  }

  protected onListClick(event: MouseEvent): void {
    if (this.effectiveDisabled()) return;
    const option = (event.target as Element | null)?.closest?.(
      '.oge-list-box-option',
    );
    if (!option || !this.listEl()?.nativeElement.contains(option)) return;
    const index = Number(option.getAttribute('data-index'));
    const item = this.core.visibleItems()[index];
    if (item === undefined || this.core.isItemDisabled(item)) return;
    this.itemClick.emit({ item, index, event });
    if (this.readonly()) {
      this.core.setActive(index);
      return;
    }
    const next = this.core.clickOption(index, event);
    if (next !== undefined) this.commitSelection(next, event);
  }

  protected onListPointerDown(event: PointerEvent): void {
    if (!this.allowReordering() || !this.editable() || event.button !== 0) {
      return;
    }
    // inside a transfer list the transfer list runs one drag for both moves
    // between the lists and reorders inside one (it calls `reorderItem`)
    if (this.hostEl.nativeElement.closest('.oge-transfer-list-pane')) return;
    const list = this.listEl()?.nativeElement;
    const option = (event.target as Element | null)?.closest?.(
      '.oge-list-box-option',
    );
    if (!list || !option || option.closest('[role="listbox"]') !== list) {
      return;
    }
    const item =
      this.core.visibleItems()[Number(option.getAttribute('data-index'))];
    if (item === undefined || this.core.isItemDisabled(item)) return;
    beginPointerDragDrop<OgeListBoxDropTarget>(event, {
      source: option,
      autoScroll: list,
      resolve: (hit, move) => ogeListBoxDropTarget(hit, list, move.clientY),
      onOver: (target) => this.dropIndicator.set(target),
      onDrop: (target) => {
        const over = this.core.visibleItems()[target.index];
        if (over === undefined) return;
        this.commitReorder(
          this.core.reorderAt(item, over, target.position),
          'drag',
          event,
        );
      },
      onEnd: () => this.dropIndicator.set(null),
    });
  }

  protected onSearchInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.search(text);
    this.core.setActive(this.core.edgeEnabledIndex(1));
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.listEl()?.nativeElement.focus();
    }
  }

  protected onFocusIn(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleFocus(event);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (event.target === this.listEl()?.nativeElement) {
      this.listFocused.set(false);
      this.core.resetTypeAhead();
    }
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleBlur(event);
  }

  // --- base contract ---------------------------------------------------------

  protected nativeElement(): HTMLElement | null {
    return this.listEl()?.nativeElement ?? null;
  }

  protected emptyValue(): unknown {
    return this.multiple() ? [] : null;
  }

  protected valueIsEmpty(value: unknown): boolean {
    return Array.isArray(value)
      ? value.length === 0
      : value === null || value === undefined;
  }

  protected override normalizeWrite(value: unknown): unknown {
    if (this.multiple()) {
      if (Array.isArray(value)) return value;
      return value === null || value === undefined ? [] : [value];
    }
    return value === undefined ? null : value;
  }
}
