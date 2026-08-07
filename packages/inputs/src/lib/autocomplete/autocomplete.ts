import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
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
  OgeSelectBoxGroupExpr,
  OgeSelectBoxImageExpr,
  OgeSelectBoxItemsFn,
  OgeSelectBoxSearchChangedEvent,
  OgeSelectBoxSearchExpr,
  OgeSelectBoxSearchMode,
  OgeSelectItemTemplateContext,
} from '../select-box/select-box-types';
import type {
  OgeAutocompleteItemClickEvent,
  OgeAutocompleteSelectionChangedEvent,
} from './autocomplete-types';

declare const ngDevMode: boolean | undefined;

/** CSS default of `.oge-select-list { max-height }` — the virtual viewport budget. */
const DEFAULT_LIST_MAX_HEIGHT = 320;

/**
 * Text editor with a filtered suggestion list — the value is the **text
 * itself** (`string`), not an item value. Suggestions open while typing (from
 * `minSearchLength` characters on), the list is capped at `maxItemCount`, and
 * picking a suggestion writes its display text:
 *
 * ```html
 * <oge-autocomplete label="City" [items]="cities" [(value)]="cityName" />
 * <oge-autocomplete
 *   label="Assignee"
 *   [items]="users"
 *   displayExpr="name"
 *   [forceSelection]="true"
 *   (selectionChanged)="onPick($event.item)"
 * />
 * ```
 *
 * WAI-ARIA combobox with `aria-activedescendant` (DOM focus never leaves the
 * input). The text commits on blur/Enter; `forceSelection` reverts
 * non-matching text to the last committed value. `searchChanged` +
 * `[loading]` are the server-side filtering escape hatch, and `virtualScroll`
 * windows large lists. Works standalone via `[(value)]`, with Signal Forms
 * via `[formField]`, and with reactive forms via `formControl`.
 */
@Component({
  selector: 'oge-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeFieldChrome, OgePopup],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeAutocomplete }],
  host: {
    class: 'oge-input oge-autocomplete',
    '[class.oge-select-box-open]': 'opened()',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <input
        #native
        class="oge-input-native"
        type="text"
        role="combobox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
        autocomplete="off"
        [id]="inputId"
        [value]="inputText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly()"
        [attr.name]="name() || null"
        [attr.title]="tooltip() ?? null"
        [attr.tabindex]="tabIndex()"
        [attr.aria-expanded]="opened()"
        [attr.aria-controls]="opened() ? listboxId : null"
        [attr.aria-activedescendant]="activeDescendant()"
        [attr.aria-label]="labelMode() === 'hidden' && label() ? label() : null"
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
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (opened()) {
      <oge-popup [panel]="panel">
        <div
          #listEl
          class="oge-select-list"
          [class.oge-select-wrap]="wrapItemText() && !virtualActive()"
          [class.oge-select-list-virtual]="virtualActive()"
          role="listbox"
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
          @if (loading() || itemsStatus() === 'loading') {
            <div class="oge-select-status" role="presentation">
              {{ msg().dropDownLoading }}
            </div>
          } @else if (itemsStatus() === 'error') {
            <div class="oge-select-status" role="presentation">
              {{ msg().dropDownLoadError }}
            </div>
          } @else if (rows().length === 0) {
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
                    [class.oge-disabled]="isItemDisabled(row.item)"
                    [attr.aria-selected]="row.index === activeIndex()"
                    [attr.aria-disabled]="
                      isItemDisabled(row.item) ? 'true' : null
                    "
                    [attr.aria-posinset]="row.index + 1"
                    [attr.aria-setsize]="visibleItems().length"
                    [attr.title]="
                      useItemTextAsTitle() ? displayOf(row.item) : null
                    "
                    (mousedown)="$event.preventDefault()"
                    (mouseenter)="onOptionHover(row.index, row.item)"
                    (click)="selectItem(row.item, row.index, $event)"
                  >
                    @if (itemTemplate(); as template) {
                      <ng-container
                        *ngTemplateOutlet="
                          template;
                          context: {
                            $implicit: row.item,
                            index: row.index,
                            selected: false,
                            active: row.index === activeIndex(),
                          }
                        "
                      />
                    } @else {
                      @if (imageOf(row.item); as imageUrl) {
                        <img
                          class="oge-select-option-img"
                          [src]="imageUrl"
                          alt=""
                          loading="lazy"
                        />
                      }
                      @if (highlightOf(row.item); as parts) {
                        <span class="oge-select-option-text"
                          >{{ parts.pre
                          }}<mark class="oge-select-mark">{{
                            parts.match
                          }}</mark
                          >{{ parts.post }}</span
                        >
                      } @else {
                        <span class="oge-select-option-text">{{
                          displayOf(row.item)
                        }}</span>
                      }
                    }
                  </div>
                }
              </div>
            </div>
          } @else {
            @for (row of rows(); track $index) {
              @if (row.kind === 'group') {
                <div class="oge-select-group" role="presentation">
                  {{ row.label }}
                </div>
              } @else {
                <!--
                  activedescendant pattern: options are never focusable and all
                  keyboard interaction lives on the combobox input above
                -->
                <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- keyboard access is provided by the roving-tabindex/listbox key handling on the container -->
                <div
                  class="oge-select-option"
                  role="option"
                  [id]="optionId(row.index)"
                  [class.oge-select-option-active]="row.index === activeIndex()"
                  [class.oge-disabled]="isItemDisabled(row.item)"
                  [attr.aria-selected]="row.index === activeIndex()"
                  [attr.aria-disabled]="
                    isItemDisabled(row.item) ? 'true' : null
                  "
                  [attr.title]="
                    useItemTextAsTitle() ? displayOf(row.item) : null
                  "
                  (mousedown)="$event.preventDefault()"
                  (mouseenter)="onOptionHover(row.index, row.item)"
                  (click)="selectItem(row.item, row.index, $event)"
                >
                  @if (itemTemplate(); as template) {
                    <ng-container
                      *ngTemplateOutlet="
                        template;
                        context: {
                          $implicit: row.item,
                          index: row.index,
                          selected: false,
                          active: row.index === activeIndex(),
                        }
                      "
                    />
                  } @else {
                    @if (imageOf(row.item); as imageUrl) {
                      <img
                        class="oge-select-option-img"
                        [src]="imageUrl"
                        alt=""
                        loading="lazy"
                      />
                    }
                    @if (highlightOf(row.item); as parts) {
                      <span class="oge-select-option-text"
                        >{{ parts.pre
                        }}<mark class="oge-select-mark">{{ parts.match }}</mark
                        >{{ parts.post }}</span
                      >
                    } @else {
                      <span class="oge-select-option-text">{{
                        displayOf(row.item)
                      }}</span>
                    }
                  }
                </div>
              }
            }
          }
        </div>
      </oge-popup>
    }
  `,
})
export class OgeAutocomplete<TItem = unknown>
  extends OgeInputBase<string>
  implements FormValueControl<string>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /** The typed text — the committed value is the string itself. */
  readonly value = model('');
  /**
   * The suggestion items: an array, or a function invoked lazily on first
   * open (sync or promise — loading/error rows render while pending).
   */
  readonly items = input<readonly TItem[] | OgeSelectBoxItemsFn<TItem>>([]);
  /** Item → display text. Omitted, the item itself is stringified. */
  readonly displayExpr = input<OgeSelectBoxDisplayExpr<TItem> | undefined>(
    undefined,
  );
  /** Marks individual items as non-selectable. */
  readonly disabledExpr = input<OgeSelectBoxDisabledExpr<TItem> | undefined>(
    undefined,
  );
  /** Item → image URL rendered before the option text (avatars, flags…). */
  readonly imageExpr = input<OgeSelectBoxImageExpr<TItem> | undefined>(
    undefined,
  );
  /** Groups flat items under headers; items are re-ordered by first-seen group. */
  readonly groupBy = input<OgeSelectBoxGroupExpr<TItem> | undefined>(undefined);
  readonly searchMode = input<OgeSelectBoxSearchMode>('contains');
  /** Which text the filter matches; defaults to the display text. */
  readonly searchExpr = input<OgeSelectBoxSearchExpr<TItem> | undefined>(
    undefined,
  );
  /** Debounce before typed text filters the list; `undefined` = config default (250ms). */
  readonly searchTimeout = input<number | undefined>(undefined);
  /** Characters required before suggestions open while typing. */
  readonly minSearchLength = input(1);
  /** Caps the rendered suggestion list. */
  readonly maxItemCount = input(10);
  /** Reverts non-matching text to the last committed value on blur. */
  readonly forceSelection = input(false);
  /** Marks the matched part of each suggestion (`<mark>`). */
  readonly searchHighlight = input(true);
  /** Renders the chevron toggle in the field rail. */
  readonly showDropDownButton = input(false);
  /** Clicking the field opens the suggestion list. */
  readonly openOnFieldClick = input(false);
  /** Shows a loading row instead of items — server-side filtering escape hatch. */
  readonly loading = input(false);
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /** Popup width: fixed pixels or `'anchor'` to match the field box. */
  readonly dropdownWidth = input<number | 'anchor'>('anchor');
  /** Scrollable list height cap; `undefined` = the CSS default (320px). */
  readonly dropdownMaxHeight = input<number | undefined>(undefined);
  /** Wraps long option text instead of ellipsizing it. */
  readonly wrapItemText = input(false);
  /** Mirrors each option's display text into its `title` attribute. */
  readonly useItemTextAsTitle = input(false);
  /** Custom option row rendering. */
  readonly itemTemplate = input<
    TemplateRef<OgeSelectItemTemplateContext<TItem>> | undefined
  >(undefined);
  /**
   * Windowed rendering for large lists: `true` or `{ itemHeight, overscan }`.
   * Rows get a fixed size-matched height; `groupBy` and `wrapItemText` are
   * ignored while active.
   */
  readonly virtualScroll = input<boolean | OgeVirtualScrollOptions>(false);
  /** Popup visibility — two-way. */
  readonly opened = model(false);

  /** A suggestion was picked (`item`) or the selection was canceled (`null`). */
  readonly selectionChanged =
    output<OgeAutocompleteSelectionChangedEvent<TItem>>();
  /** A suggestion row was activated by click or keyboard. */
  readonly itemClick = output<OgeAutocompleteItemClickEvent<TItem>>();
  readonly dropDownOpened = output<void>();
  readonly dropDownClosed = output<void>();
  /** Raw search text on every keystroke — drive server-side filtering from here. */
  readonly searchChanged = output<OgeSelectBoxSearchChangedEvent>();

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

  /** Shared dropdown-list model (filtering, active option, lazy items, ids). */
  private readonly list = new SelectListEngine<TItem>({
    inputId: () => this.inputId,
    opened: () => this.opened(),
    items: () => this.items(),
    displayExpr: () => this.displayExpr(),
    valueExpr: () => undefined,
    disabledExpr: () => this.disabledExpr(),
    imageExpr: () => this.imageExpr(),
    searchExpr: () => this.searchExpr(),
    searchEnabled: () => true,
    searchMode: () => this.searchMode(),
    searchDebounceMs: () => this.searchTimeout() ?? this.config.searchTimeoutMs,
    minSearchLength: () => this.minSearchLength(),
    // below-min states close the popup instead (onNativeInput) — an open
    // list (chevron toggle) always shows the unfiltered items
    showDataBeforeSearch: () => true,
    maxItems: () => this.maxItemCount(),
    groupBy: () => (this.virtualActive() ? undefined : this.groupBy()),
    scrollActiveIntoView: (index) => {
      if (this.virtualActive()) this.virtualizer.scrollToIndex(index);
      else this.list.scrollOptionIntoView(index);
    },
  });

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
    onOpened: () => {
      this.list.ensureItemsLoaded();
      // no auto-activated option — Enter without arrowing commits the text
      this.dropDownOpened.emit();
    },
    onClosed: () => {
      // the typed text survives a close (Escape) — it commits on blur/Enter
      this.list.activeIndex.set(-1);
      this.virtualizer.reset();
      this.dropDownClosed.emit();
    },
  });

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = this.panelController.panel;

  get listboxId(): string {
    return this.list.listboxId;
  }

  protected readonly itemsStatus = this.list.itemsStatus;

  private readonly selectedSig = signal<TItem | null>(null);
  /** The last picked suggestion; `null` once the text diverges from it. */
  readonly selectedItem = this.selectedSig.asReadonly();

  protected readonly inputText = computed(
    () => this.list.searchText() ?? this.value(),
  );

  protected readonly visibleItems = this.list.visibleItems;
  protected readonly rows = this.list.rows;
  protected readonly activeIndex = this.list.activeIndex;
  protected readonly activeDescendant = this.list.activeDescendant;

  // --- chevron feature block -------------------------------------------------

  override readonly dropdown: OgeInputDropDownApi =
    this.panelController.dropDownApi(
      () => this.showDropDownButton() && !this.effectiveDisabled(),
      () => this.toggle(),
    );

  constructor() {
    super();
    // Dev-mode warnings for inputs the virtual mode ignores.
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      effect(() => {
        if (!this.virtualActive()) return;
        if (this.groupBy() !== undefined) {
          console.warn(
            'oge-autocomplete: virtualScroll ignores groupBy — group headers are not rendered in virtual mode.',
          );
        }
        if (this.wrapItemText()) {
          console.warn(
            'oge-autocomplete: virtualScroll forces fixed-height rows — wrapItemText is ignored.',
          );
        }
      });
    }
    // Items input changes: array ↔ function, or a new function reference.
    effect(() => {
      const items = this.items();
      untracked(() => {
        void items;
        this.list.syncItemsSource();
        if (this.opened()) this.list.ensureItemsLoaded();
      });
    });
    // Filtering while open clamps a now-out-of-range active option.
    effect(() => {
      this.list.visibleItems();
      untracked(() => {
        if (
          this.opened() &&
          this.list.activeIndex() >= this.list.visibleItems().length
        ) {
          this.list.activeIndex.set(-1);
        }
      });
    });
    this.destroyRef.onDestroy(() => {
      this.list.destroy();
      this.panelController.destroy();
    });
  }

  // --- public API ------------------------------------------------------------

  /** Opens the suggestion popup (same as `opened.set(true)`). */
  open(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.opened.set(true);
  }

  /** Closes the suggestion popup. */
  close(): void {
    this.opened.set(false);
  }

  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  // --- template handlers -----------------------------------------------------

  protected onFieldClick(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.opened() && this.openOnFieldClick()) this.open();
  }

  protected onNativeInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.list.setSearch(text);
    this.inputChange.emit({ text, event });
    this.searchChanged.emit({ text });
    // typing below the threshold closes the list (DevExtreme behavior)
    if (text.trim().length >= this.minSearchLength()) {
      if (!this.opened()) this.open();
    } else if (this.opened()) {
      this.close();
    }
  }

  protected onOptionHover(index: number, item: TItem): void {
    if (!this.isItemDisabled(item)) this.list.activeIndex.set(index);
  }

  protected onListScroll(event: Event): void {
    if (this.virtualActive()) this.virtualizer.onScroll(event);
  }

  protected selectItem(item: TItem, index: number, event: Event): void {
    if (this.isItemDisabled(item)) return;
    this.itemClick.emit({ item, index, event });
    this.applySelection(item, event);
    this.focus();
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
          const items = this.list.visibleItems();
          const index = this.list.activeIndex();
          if (index < items.length) {
            this.selectItem(items[index], index, event);
            return;
          }
        }
        this.commitTypedText(event);
        if (open) this.close();
        this.handleEnterKey(event);
        return;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          this.close();
          return;
        }
        // two-stage Escape: popup already closed → revert the typed text
        if (this.list.searchText() !== null) {
          event.preventDefault();
          this.list.resetSearch();
        }
        return;
      }
      case 'Tab': {
        if (open) this.close();
        return;
      }
      case 'PageDown':
      case 'PageUp': {
        if (open) {
          event.preventDefault();
          this.list.moveActive(event.key === 'PageDown' ? 10 : -10);
        }
        return;
      }
    }
  }

  // --- expression resolution (template-visible) ------------------------------

  protected displayOf(item: TItem): string {
    return this.list.displayOf(item);
  }

  protected isItemDisabled(item: TItem): boolean {
    return this.list.isItemDisabled(item);
  }

  protected optionId(index: number): string {
    return this.list.optionId(index);
  }

  protected imageOf(item: TItem): string | null {
    return this.list.imageOf(item);
  }

  /** Splits a suggestion's display text around the typed match. */
  protected highlightOf(
    item: TItem,
  ): { pre: string; match: string; post: string } | null {
    if (!this.searchHighlight()) return null;
    const term = (this.list.searchText() ?? '').trim();
    if (!term) return null;
    const text = this.displayOf(item);
    const index = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
    if (index < 0) return null;
    return {
      pre: text.slice(0, index),
      match: text.slice(index, index + term.length),
      post: text.slice(index + term.length),
    };
  }

  // --- selection & commit ----------------------------------------------------

  private applySelection(item: TItem, event: Event): void {
    this.setSelected(item, event);
    this.commitNow(this.displayOf(item), event);
    this.list.resetSearch();
    if (this.opened()) this.close();
  }

  private setSelected(item: TItem | null, event?: Event): void {
    if (this.selectedSig() === item) return;
    this.selectedSig.set(item);
    this.selectionChanged.emit({ item, event });
  }

  /** Commits the uncommitted typed text (blur/Enter), honoring `forceSelection`. */
  private commitTypedText(event?: Event): void {
    const typed = this.list.searchText();
    if (typed === null) return;
    const trimmed = typed.trim();
    // exact display match resolves to the item and its canonical casing
    const match = this.list
      .resolvedItems()
      .find(
        (item) =>
          this.displayOf(item).toLocaleLowerCase() ===
            trimmed.toLocaleLowerCase() && !this.isItemDisabled(item),
      );
    if (match !== undefined) {
      this.applySelection(match, event ?? new Event('change'));
      return;
    }
    if (this.forceSelection()) {
      // no match: revert to the last committed value
      this.list.resetSearch();
      return;
    }
    this.setSelected(null, event);
    this.commitNow(typed, event);
    this.list.resetSearch();
  }

  // --- base contract ---------------------------------------------------------

  protected override onFocusChanged(focused: boolean): void {
    if (focused) return;
    this.commitTypedText();
    if (this.opened()) this.close();
    // a forceSelection revert can leave the binding value unchanged while the
    // DOM still shows the user's text — sync the native input imperatively
    const el = this.nativeElement();
    const text = this.inputText();
    if (el && el.value !== text) el.value = text;
  }

  protected override onValueWritten(): void {
    // programmatic writes drop stale search text and a diverged selection
    this.list.resetSearch();
    const selected = this.selectedSig();
    if (selected !== null && this.displayOf(selected) !== this.value()) {
      this.setSelected(null);
    }
  }

  protected nativeElement(): HTMLInputElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): string {
    return '';
  }

  protected valueIsEmpty(value: string): boolean {
    return value === '';
  }
}
