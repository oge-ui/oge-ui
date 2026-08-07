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
  OGE_OVERLAY_CONFIG,
  OgePopup,
  type OgePopupPlacement,
} from '@oge-ui/overlay';
import { OgeFieldChrome } from '../field/field-chrome';
import { OGE_INPUT_HOST, type OgeInputDropDownApi } from '../field/input-host';
import { OgeInputBase } from '../field/input-base';
import {
  ListVirtualizerModel,
  OGE_SELECT_OPTION_HEIGHT,
  type OgeVirtualScrollOptions,
} from '../select-list/list-virtualizer';
import { SelectListEngine } from '../select-list/select-list-engine';
import { SelectPanelController } from '../select-list/select-panel-controller';
import type {
  OgeSelectBoxDisabledExpr,
  OgeSelectBoxDisplayExpr,
  OgeSelectBoxImageExpr,
  OgeSelectBoxSearchExpr,
  OgeSelectBoxSearchMode,
  OgeSelectBoxValueExpr,
} from '../select-box/select-box-types';
import type {
  OgeTagBoxItemClickEvent,
  OgeTagBoxSelectionChangedEvent,
} from './tag-box-types';

/** CSS default of `.oge-select-list { max-height }` — the virtual viewport budget. */
const DEFAULT_LIST_MAX_HEIGHT = 320;

/**
 * Multi-select editor on the shared oge field chrome: selected items render
 * as removable chips inside the field, the popup is a multiselectable
 * listbox with checkboxes that stays open while picking, and the value is an
 * array of `valueExpr` results:
 *
 * ```html
 * <oge-tag-box label="Skills" [items]="skills" [(value)]="selected" />
 * <oge-tag-box
 *   label="Assignees"
 *   [items]="users"
 *   displayExpr="name"
 *   valueExpr="id"
 *   [searchEnabled]="true"
 *   [(value)]="assigneeIds"
 * />
 * ```
 *
 * Shares the select box's expression vocabulary
 * (`displayExpr`/`valueExpr`/`disabledExpr`/`imageExpr`) and works
 * standalone via `[(value)]`, with Signal Forms via `[formField]` and with
 * reactive forms via `formControl`.
 */
@Component({
  selector: 'oge-tag-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeFieldChrome, OgePopup],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeTagBox }],
  host: {
    class: 'oge-input oge-tag-box',
    '[class.oge-select-box-open]': 'opened()',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <div class="oge-tag-strip">
        @for (chip of visibleChips(); track $index) {
          <span class="oge-tag">
            @if (imageOf(chip.item); as imageUrl) {
              <img class="oge-tag-img" [src]="imageUrl" alt="" />
            }
            <span class="oge-tag-text">{{ displayOf(chip.item) }}</span>
            <button
              type="button"
              class="oge-tag-remove"
              tabindex="-1"
              [attr.aria-label]="msg().removeTagButton"
              (mousedown)="$event.preventDefault()"
              (click)="removeAt(chip.valueIndex, $event)"
            >
              <svg
                viewBox="0 0 16 16"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="m4 4 8 8m0-8-8 8" />
              </svg>
            </button>
          </span>
        }
        @if (overflowCount() > 0) {
          <span class="oge-tag oge-tag-more">+{{ overflowCount() }}</span>
        }
        <input
          #native
          class="oge-input-native oge-tag-input"
          [class.oge-select-plain]="!searchEnabled()"
          type="text"
          role="combobox"
          aria-haspopup="listbox"
          autocomplete="off"
          [id]="inputId"
          [value]="searchTextValue()"
          [placeholder]="isEmpty() ? placeholderText() : ''"
          [disabled]="effectiveDisabled()"
          [readOnly]="readonly() || !searchEnabled()"
          [attr.name]="name() || null"
          [attr.title]="tooltip() ?? null"
          [attr.tabindex]="tabIndex()"
          [attr.aria-expanded]="opened()"
          [attr.aria-controls]="opened() ? listboxId : null"
          [attr.aria-autocomplete]="searchEnabled() ? 'list' : 'none'"
          [attr.aria-activedescendant]="activeDescendant()"
          [attr.aria-label]="
            labelMode() === 'hidden' && label() ? label() : null
          "
          [attr.aria-labelledby]="
            labelMode() !== 'hidden' && label() ? labelId : null
          "
          [attr.aria-describedby]="describedBy()"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.aria-required]="required() ? 'true' : null"
          (input)="onNativeInput($event)"
          (click)="onFieldClick()"
          (keydown)="onKeydown($event)"
          (focus)="handleFocus($event)"
          (blur)="handleBlur($event)"
        />
      </div>
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (opened()) {
      <oge-popup [panel]="panel">
        <div
          #listEl
          class="oge-select-list"
          [class.oge-select-list-virtual]="virtualActive()"
          role="listbox"
          aria-multiselectable="true"
          [id]="listboxId"
          [style.maxHeight.px]="dropdownMaxHeight() ?? null"
          [attr.aria-labelledby]="
            labelMode() !== 'hidden' && label() ? labelId : null
          "
          [attr.aria-label]="
            labelMode() === 'hidden' && label() ? label() : null
          "
          (scroll)="onListScroll($event)"
        >
          @if (visibleItems().length === 0) {
            <div class="oge-select-status" role="presentation">
              {{ msg().noDataText }}
            </div>
          } @else if (virtualActive()) {
            <div
              class="oge-select-spacer"
              [style.height.px]="virtualWindow().totalHeight"
            >
              <div
                class="oge-select-window"
                [style.transform]="
                  'translateY(' + virtualWindow().offsetY + 'px)'
                "
              >
                @for (row of windowedItems(); track row.index) {
                  <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- keyboard access is provided by the roving-tabindex/listbox key handling on the container -->
                  <div
                    class="oge-select-option"
                    role="option"
                    [id]="optionId(row.index)"
                    [class.oge-select-option-active]="
                      row.index === activeIndex()
                    "
                    [class.oge-select-option-selected]="isSelected(row.item)"
                    [class.oge-disabled]="isItemDisabled(row.item)"
                    [attr.aria-selected]="isSelected(row.item)"
                    [attr.aria-disabled]="
                      isItemDisabled(row.item) ? 'true' : null
                    "
                    [attr.aria-posinset]="row.index + 1"
                    [attr.aria-setsize]="visibleItems().length"
                    (mousedown)="$event.preventDefault()"
                    (mouseenter)="onOptionHover(row.index, row.item)"
                    (click)="toggleItemAt(row.index, $event)"
                  >
                    @if (showSelectionControls()) {
                      <span
                        class="oge-tag-checkbox"
                        [class.oge-tag-checkbox-on]="isSelected(row.item)"
                        aria-hidden="true"
                      >
                        @if (isSelected(row.item)) {
                          <svg
                            viewBox="0 0 16 16"
                            width="10"
                            height="10"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="m3 8.5 3.5 3.5L13 4.5" />
                          </svg>
                        }
                      </span>
                    }
                    @if (imageOf(row.item); as imageUrl) {
                      <img
                        class="oge-select-option-img"
                        [src]="imageUrl"
                        alt=""
                        loading="lazy"
                      />
                    }
                    <span class="oge-select-option-text">{{
                      displayOf(row.item)
                    }}</span>
                  </div>
                }
              </div>
            </div>
          } @else {
            @for (item of visibleItems(); track $index) {
              <!--
                activedescendant pattern: options are never focusable and all
                keyboard interaction lives on the combobox input above
              -->
              <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- keyboard access is provided by the roving-tabindex/listbox key handling on the container -->
              <div
                class="oge-select-option"
                role="option"
                [id]="optionId($index)"
                [class.oge-select-option-active]="$index === activeIndex()"
                [class.oge-select-option-selected]="isSelected(item)"
                [class.oge-disabled]="isItemDisabled(item)"
                [attr.aria-selected]="isSelected(item)"
                [attr.aria-disabled]="isItemDisabled(item) ? 'true' : null"
                (mousedown)="$event.preventDefault()"
                (mouseenter)="onOptionHover($index, item)"
                (click)="toggleItemAt($index, $event)"
              >
                @if (showSelectionControls()) {
                  <span
                    class="oge-tag-checkbox"
                    [class.oge-tag-checkbox-on]="isSelected(item)"
                    aria-hidden="true"
                  >
                    @if (isSelected(item)) {
                      <svg
                        viewBox="0 0 16 16"
                        width="10"
                        height="10"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="m3 8.5 3.5 3.5L13 4.5" />
                      </svg>
                    }
                  </span>
                }
                @if (imageOf(item); as imageUrl) {
                  <img
                    class="oge-select-option-img"
                    [src]="imageUrl"
                    alt=""
                    loading="lazy"
                  />
                }
                <span class="oge-select-option-text">{{
                  displayOf(item)
                }}</span>
              </div>
            }
          }
        </div>
      </oge-popup>
    }
  `,
})
export class OgeTagBox<TItem = unknown>
  extends OgeInputBase<readonly unknown[]>
  implements FormValueControl<readonly unknown[]>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /** Committed values (the `valueExpr` of every selected item) — two-way. */
  readonly value = model<readonly unknown[]>([]);
  /** The selectable items. */
  readonly items = input<readonly TItem[]>([]);
  /** Item → display text. Omitted, the item itself is stringified. */
  readonly displayExpr = input<OgeSelectBoxDisplayExpr<TItem> | undefined>(
    undefined,
  );
  /** Item → committed value. Omitted, the whole item is the value. */
  readonly valueExpr = input<OgeSelectBoxValueExpr<TItem> | undefined>(
    undefined,
  );
  /** Marks individual items as non-selectable. */
  readonly disabledExpr = input<OgeSelectBoxDisabledExpr<TItem> | undefined>(
    undefined,
  );
  /** Item → image URL rendered in chips and options (avatars, flags…). */
  readonly imageExpr = input<OgeSelectBoxImageExpr<TItem> | undefined>(
    undefined,
  );
  /** Enables typing into the field to filter the list. */
  readonly searchEnabled = input(false);
  readonly searchMode = input<OgeSelectBoxSearchMode>('contains');
  /** Which text the filter matches; defaults to the display text. */
  readonly searchExpr = input<OgeSelectBoxSearchExpr<TItem> | undefined>(
    undefined,
  );
  /** Renders checkboxes in front of the options. */
  readonly showSelectionControls = input(true);
  /** Hides already-selected items from the popup list. */
  readonly hideSelectedItems = input(false);
  /** Caps the rendered chips; the rest collapse into a `+N` chip. */
  readonly maxDisplayedTags = input<number | undefined>(undefined);
  /** Renders the chevron toggle in the field rail. */
  readonly showDropDownButton = input(true);
  /** Clicking the field opens the popup. */
  readonly openOnFieldClick = input(true);
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /** Popup width: fixed pixels or `'anchor'` to match the field box. */
  readonly dropdownWidth = input<number | 'anchor'>('anchor');
  /** Scrollable list height cap; `undefined` = the CSS default (320px). */
  readonly dropdownMaxHeight = input<number | undefined>(undefined);
  /**
   * Windowed rendering for large lists: `true` or `{ itemHeight, overscan }`.
   * Rows get a fixed size-matched height while active.
   */
  readonly virtualScroll = input<boolean | OgeVirtualScrollOptions>(false);
  /** Popup visibility — two-way. */
  readonly opened = model(false);

  /** Fires on every commit with the added/removed item delta. */
  readonly selectionChanged = output<OgeTagBoxSelectionChangedEvent<TItem>>();
  /** An option row was toggled by click or keyboard. */
  readonly itemClick = output<OgeTagBoxItemClickEvent<TItem>>();
  readonly dropDownOpened = output<void>();
  readonly dropDownClosed = output<void>();

  private readonly native = viewChild<ElementRef<HTMLInputElement>>('native');
  private readonly chromeRef = viewChild(OgeFieldChrome, { read: ElementRef });
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('listEl');

  /** Normalized `virtualScroll` options; `null` when virtualization is off. */
  private readonly virtualOptions = computed<OgeVirtualScrollOptions | null>(
    () => {
      const value = this.virtualScroll();
      if (value === false) return null;
      return value === true ? {} : value;
    },
  );

  protected readonly virtualActive = computed(
    () => this.virtualOptions() !== null,
  );

  /** Fixed-height window model driving the virtualized list body. */
  private readonly virtualizer = new ListVirtualizerModel({
    itemCount: () => this.list.visibleItems().length,
    itemHeight: () =>
      this.virtualOptions()?.itemHeight ??
      OGE_SELECT_OPTION_HEIGHT[this.size()],
    overscan: () => this.virtualOptions()?.overscan ?? 4,
    viewportHeight: () => this.dropdownMaxHeight() ?? DEFAULT_LIST_MAX_HEIGHT,
    scrollContainer: () => this.listEl()?.nativeElement ?? null,
  });

  protected readonly virtualWindow = computed(() => this.virtualizer.window());

  /** The windowed slice rendered in virtual mode — indices stay absolute. */
  protected readonly windowedItems = computed<
    readonly { item: TItem; index: number }[]
  >(() => {
    const { start, end } = this.virtualizer.window();
    return this.list
      .visibleItems()
      .slice(start, end)
      .map((item, offset) => ({ item, index: start + offset }));
  });

  /** Shared dropdown-list model (filtering, active option, ids). */
  private readonly list = new SelectListEngine<TItem>({
    inputId: () => this.inputId,
    opened: () => this.opened(),
    items: () => this.items(),
    displayExpr: () => this.displayExpr(),
    valueExpr: () => this.valueExpr(),
    disabledExpr: () => this.disabledExpr(),
    imageExpr: () => this.imageExpr(),
    searchExpr: () => this.searchExpr(),
    searchEnabled: () => this.searchEnabled(),
    searchMode: () => this.searchMode(),
    searchDebounceMs: () => 0,
    preFilterItems: (items) =>
      this.hideSelectedItems()
        ? items.filter((item) => !this.isSelected(item))
        : items,
    scrollActiveIntoView: (index) => {
      if (this.virtualActive()) this.virtualizer.scrollToIndex(index);
      else this.list.scrollOptionIntoView(index);
    },
  });

  private readonly panelController = new SelectPanelController({
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
    onOpened: () => {
      if (this.list.activeIndex() < 0) {
        this.list.setActive(this.list.edgeEnabledIndex(1));
      }
      this.dropDownOpened.emit();
    },
    onClosed: () => {
      this.list.activeIndex.set(-1);
      this.list.resetSearch();
      this.virtualizer.reset();
      this.dropDownClosed.emit();
    },
  });

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = this.panelController.panel;

  get listboxId(): string {
    return this.list.listboxId;
  }

  /** Selected items resolved from `value`, in value order. */
  readonly selectedItems = computed<readonly TItem[]>(() => {
    const items = this.items();
    return this.value()
      .map((entry) =>
        items.find((item) => Object.is(this.list.itemValue(item), entry)),
      )
      .filter((item): item is TItem => item !== undefined);
  });

  protected readonly searchTextValue = computed(
    () => this.list.searchText() ?? '',
  );

  protected readonly visibleItems = this.list.visibleItems;

  /** Chips rendered in the field (respects `maxDisplayedTags`). */
  protected readonly visibleChips = computed<
    readonly { item: TItem; valueIndex: number }[]
  >(() => {
    const chips = this.selectedItems().map((item, valueIndex) => ({
      item,
      valueIndex,
    }));
    const max = this.maxDisplayedTags();
    return max !== undefined && chips.length > max
      ? chips.slice(0, max)
      : chips;
  });

  protected readonly overflowCount = computed(() => {
    const max = this.maxDisplayedTags();
    if (max === undefined) return 0;
    return Math.max(0, this.selectedItems().length - max);
  });

  protected readonly activeIndex = this.list.activeIndex;
  protected readonly activeDescendant = this.list.activeDescendant;

  override readonly dropdown: OgeInputDropDownApi =
    this.panelController.dropDownApi(
      () => this.showDropDownButton() && !this.effectiveDisabled(),
      () => this.toggle(),
    );

  constructor() {
    super();
    // filtering / selection changes re-anchor the active option
    effect(() => {
      this.list.visibleItems();
      untracked(() => {
        if (
          this.opened() &&
          this.list.activeIndex() >= this.list.visibleItems().length
        ) {
          this.list.setActive(this.list.edgeEnabledIndex(1));
        }
      });
    });
    this.destroyRef.onDestroy(() => {
      this.list.destroy();
      this.panelController.destroy();
    });
  }

  // --- public API ------------------------------------------------------------

  open(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.opened.set(true);
    if (this.list.activeIndex() < 0) {
      this.list.setActive(this.list.edgeEnabledIndex(1));
    }
  }

  close(): void {
    this.opened.set(false);
  }

  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  // --- selection -------------------------------------------------------------

  protected isSelected(item: TItem): boolean {
    const entry = this.list.itemValue(item);
    return this.value().some((candidate) => Object.is(candidate, entry));
  }

  protected toggleItemAt(index: number, event: Event): void {
    const item = this.list.visibleItems()[index];
    if (item === undefined || this.isItemDisabled(item)) return;
    this.itemClick.emit({ item, index, event });
    const entry = this.list.itemValue(item);
    const current = this.value();
    const exists = current.some((candidate) => Object.is(candidate, entry));
    const next = exists
      ? current.filter((candidate) => !Object.is(candidate, entry))
      : [...current, entry];
    this.commitNow(next, event);
    this.selectionChanged.emit(
      exists
        ? { addedItems: [], removedItems: [item] }
        : { addedItems: [item], removedItems: [] },
    );
    // picking stays open (multi-select); clear the search for the next pick
    this.list.resetSearch();
    this.focus();
  }

  protected removeAt(valueIndex: number, event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const removedItem = this.selectedItems()[valueIndex];
    const next = this.value().filter((_, index) => index !== valueIndex);
    this.commitNow(next, event);
    if (removedItem !== undefined) {
      this.selectionChanged.emit({
        addedItems: [],
        removedItems: [removedItem],
      });
    }
    this.focus();
  }

  // --- template handlers -----------------------------------------------------

  protected onFieldClick(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.opened() && this.openOnFieldClick()) this.open();
  }

  protected onNativeInput(event: Event): void {
    if (!this.searchEnabled()) return;
    const text = (event.target as HTMLInputElement).value;
    this.list.setSearch(text);
    this.inputChange.emit({ text, event });
    if (!this.opened()) this.open();
  }

  protected onOptionHover(index: number, item: TItem): void {
    if (!this.isItemDisabled(item)) this.list.activeIndex.set(index);
  }

  protected onListScroll(event: Event): void {
    if (this.virtualActive()) this.virtualizer.onScroll(event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const open = this.opened();
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          this.open();
          return;
        }
        this.list.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Enter': {
        if (open && this.list.activeIndex() >= 0) {
          event.preventDefault();
          this.toggleItemAt(this.list.activeIndex(), event);
          return;
        }
        this.handleEnterKey(event);
        return;
      }
      case ' ': {
        if (this.searchEnabled()) return;
        event.preventDefault();
        if (!open) this.open();
        else if (this.list.activeIndex() >= 0) {
          this.toggleItemAt(this.list.activeIndex(), event);
        }
        return;
      }
      case 'Backspace': {
        if ((this.list.searchText() ?? '') === '' && this.value().length > 0) {
          event.preventDefault();
          this.removeAt(this.value().length - 1, event);
        }
        return;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          this.close();
        } else if (this.list.searchText()) {
          event.preventDefault();
          this.list.resetSearch();
        }
        return;
      }
      case 'Tab': {
        if (open) this.close();
        return;
      }
    }
  }

  // --- expression resolution -------------------------------------------------

  protected displayOf(item: TItem): string {
    return this.list.displayOf(item);
  }

  protected isItemDisabled(item: TItem): boolean {
    return this.list.isItemDisabled(item);
  }

  protected imageOf(item: TItem): string | null {
    return this.list.imageOf(item);
  }

  protected optionId(index: number): string {
    return this.list.optionId(index);
  }

  // --- base contract ---------------------------------------------------------

  protected override onFocusChanged(focused: boolean): void {
    if (focused) return;
    this.list.resetSearch();
    if (this.opened()) this.close();
  }

  protected nativeElement(): HTMLInputElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): readonly unknown[] {
    return [];
  }

  protected valueIsEmpty(value: readonly unknown[]): boolean {
    return value.length === 0;
  }

  protected override normalizeWrite(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
  }
}
