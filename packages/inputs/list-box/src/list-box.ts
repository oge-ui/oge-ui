import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
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
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  OgeListBoxCore,
  ogeListBoxSections,
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
import {
  OgeListBoxGroupTemplate,
  OgeListBoxItemTemplate,
  type OgeListBoxGroupTemplateContext,
  type OgeListBoxItemTemplateContext,
} from './list-box-templates';
import type {
  OgeListBoxItemClickEvent,
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
 * `OgeListBoxCore`, shared with React. Works standalone via `[(value)]`,
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
        [attr.aria-keyshortcuts]="keyShortcuts() ?? null"
        (keydown)="onKeydown($event)"
        (click)="onListClick($event)"
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

  private readonly itemTemplateDir = contentChild(OgeListBoxItemTemplate, {
    descendants: false,
  });
  private readonly groupTemplateDir = contentChild(OgeListBoxGroupTemplate, {
    descendants: false,
  });
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('list');

  /** The shared APG listbox machine. */
  protected readonly core = new OgeListBoxCore<TItem>(
    {
      inputId: () => this.inputId,
      items: () => this.items(),
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

  constructor() {
    super();
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

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) return;
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
