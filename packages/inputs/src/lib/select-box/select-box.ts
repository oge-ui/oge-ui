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
  OgeSelectBoxCustomItemEvent,
  OgeSelectBoxDisabledExpr,
  OgeSelectBoxDisplayExpr,
  OgeSelectBoxGroupExpr,
  OgeSelectBoxImageExpr,
  OgeSelectBoxItemClickEvent,
  OgeSelectBoxItemsFn,
  OgeSelectBoxSearchChangedEvent,
  OgeSelectBoxSearchExpr,
  OgeSelectBoxSearchMode,
  OgeSelectBoxSelectionChangedEvent,
  OgeSelectBoxValueExpr,
  OgeSelectItemTemplateContext,
} from './select-box-types';

declare const ngDevMode: boolean | undefined;

/** CSS default of `.oge-select-list { max-height }` — the virtual viewport budget. */
const DEFAULT_LIST_MAX_HEIGHT = 320;

/**
 * Drop-down select editor on the shared oge field chrome — WAI-ARIA combobox
 * with `aria-activedescendant` (DOM focus never leaves the input), optional
 * text search with debounce, `displayExpr`/`valueExpr` data mapping, lazy
 * item loading, flat-data grouping, custom values and the full label /
 * validation / clear-button chrome:
 *
 * ```html
 * <oge-select-box label="City" [items]="cities" [(value)]="city" />
 * <oge-select-box
 *   label="Assignee"
 *   [items]="users"
 *   displayExpr="name"
 *   valueExpr="id"
 *   [searchEnabled]="true"
 *   [showClearButton]="true"
 * />
 * ```
 *
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`, and
 * with reactive/template forms via `formControl`/`ngModel`. The popup is
 * rendered lazily on first open; client-side filtering is built in and
 * `searchChanged` + `[loading]` are the server-side filtering escape hatch.
 */
@Component({
  selector: 'oge-select-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeFieldChrome, OgePopup],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeSelectBox }],
  host: {
    class: 'oge-input oge-select-box',
    '[class.oge-select-box-open]': 'opened()',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <input
        #native
        class="oge-input-native"
        [class.oge-select-plain]="!searchEnabled()"
        type="text"
        role="combobox"
        aria-haspopup="listbox"
        autocomplete="off"
        [id]="inputId"
        [value]="inputText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly() || !searchEnabled()"
        [attr.name]="name() || null"
        [attr.title]="tooltip() ?? null"
        [attr.tabindex]="tabIndex()"
        [attr.aria-expanded]="opened()"
        [attr.aria-controls]="opened() ? listboxId : null"
        [attr.aria-autocomplete]="searchEnabled() ? 'list' : 'none'"
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
                  <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
                  <div
                    class="oge-select-option"
                    role="option"
                    [id]="optionId(row.index)"
                    [class.oge-select-option-active]="
                      row.index === activeIndex()
                    "
                    [class.oge-select-option-selected]="
                      row.item === selectedItem()
                    "
                    [class.oge-disabled]="isItemDisabled(row.item)"
                    [attr.aria-selected]="row.item === selectedItem()"
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
                            selected: row.item === selectedItem(),
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
                      <span class="oge-select-option-text">{{
                        displayOf(row.item)
                      }}</span>
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
                <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
                <div
                  class="oge-select-option"
                  role="option"
                  [id]="optionId(row.index)"
                  [class.oge-select-option-active]="row.index === activeIndex()"
                  [class.oge-select-option-selected]="
                    row.item === selectedItem()
                  "
                  [class.oge-disabled]="isItemDisabled(row.item)"
                  [attr.aria-selected]="row.item === selectedItem()"
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
                          selected: row.item === selectedItem(),
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
                    <span class="oge-select-option-text">{{
                      displayOf(row.item)
                    }}</span>
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
export class OgeSelectBox<TItem = unknown>
  extends OgeInputBase<unknown>
  implements FormValueControl<unknown>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /** Committed value (`valueExpr` of the selected item). `null` when empty. */
  readonly value = model<unknown>(null);
  /**
   * The selectable items: an array, or a function invoked lazily on first
   * open (sync or promise — loading/error rows render while pending). The
   * selected item is resolved from this full set, never the filtered one.
   */
  readonly items = input<readonly TItem[] | OgeSelectBoxItemsFn<TItem>>([]);
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
  /** Item → image URL rendered before the option text (avatars, flags…). */
  readonly imageExpr = input<OgeSelectBoxImageExpr<TItem> | undefined>(
    undefined,
  );
  /** Groups flat items under headers; items are re-ordered by first-seen group. */
  readonly groupBy = input<OgeSelectBoxGroupExpr<TItem> | undefined>(undefined);
  /** Enables typing into the field to filter the list. */
  readonly searchEnabled = input(false);
  readonly searchMode = input<OgeSelectBoxSearchMode>('contains');
  /** Which text the filter matches; defaults to the display text. */
  readonly searchExpr = input<OgeSelectBoxSearchExpr<TItem> | undefined>(
    undefined,
  );
  /** Debounce before typed text filters the list; `undefined` = config default (250ms). */
  readonly searchTimeout = input<number | undefined>(undefined);
  /** Characters required before the filter narrows the list. */
  readonly minSearchLength = input(0);
  /** Below `minSearchLength`: show the full list (`true`) or nothing (`false`). */
  readonly showDataBeforeSearch = input(false);
  /**
   * Lets typed text that matches no item become the value. `customItemCreating`
   * maps the text to an item (sync/async); unhandled, the text itself is the item.
   */
  readonly acceptCustomValue = input(false);
  /** Renders the chevron toggle in the field rail. */
  readonly showDropDownButton = input(true);
  /** Clicking the field opens the popup (select-only mode toggles it). */
  readonly openOnFieldClick = input(true);
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

  /** Fires whenever the resolved selected item changes (user or programmatic). */
  readonly selectionChanged =
    output<OgeSelectBoxSelectionChangedEvent<TItem>>();
  /** An option row was activated by click or keyboard. */
  readonly itemClick = output<OgeSelectBoxItemClickEvent<TItem>>();
  readonly dropDownOpened = output<void>();
  readonly dropDownClosed = output<void>();
  /** Raw search text on every keystroke — drive server-side filtering from here. */
  readonly searchChanged = output<OgeSelectBoxSearchChangedEvent>();
  /**
   * `acceptCustomValue` commit: assign `customItem` on the (mutable) payload
   * to map the text to an item — or `null` to reject it.
   */
  readonly customItemCreating = output<OgeSelectBoxCustomItemEvent<TItem>>();

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
    valueExpr: () => this.valueExpr(),
    disabledExpr: () => this.disabledExpr(),
    imageExpr: () => this.imageExpr(),
    searchExpr: () => this.searchExpr(),
    searchEnabled: () => this.searchEnabled(),
    searchMode: () => this.searchMode(),
    searchDebounceMs: () => this.searchTimeout() ?? this.config.searchTimeoutMs,
    minSearchLength: () => this.minSearchLength(),
    showDataBeforeSearch: () => this.showDataBeforeSearch(),
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
      // type-ahead / Home / End may have activated an option before the
      // opened-sync effect ran — only fall back to the selection when
      // nothing is active
      if (this.list.activeIndex() < 0) this.initActiveFromSelection();
      this.dropDownOpened.emit();
    },
    onClosed: () => {
      this.list.activeIndex.set(-1);
      this.userNavigated = false;
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

  protected readonly itemsStatus = this.list.itemsStatus;

  /** The item whose `valueExpr` matches `value` — from the full item set. */
  readonly selectedItem = computed<TItem | null>(() => {
    const currentValue = this.value();
    if (currentValue == null) return null;
    const found = this.list
      .resolvedItems()
      .find((item) => Object.is(this.list.itemValue(item), currentValue));
    if (found !== undefined) return found;
    const custom = this.customSelected();
    return custom !== null &&
      Object.is(this.list.itemValue(custom), currentValue)
      ? custom
      : null;
  });

  /**
   * Custom value cache: an `acceptCustomValue` item is not in `items`, so
   * `selectedItem` falls back to it — otherwise the field text would blank.
   */
  private readonly customSelected = signal<TItem | null>(null);
  private customSeq = 0;

  /** Display text of the selected item (`''` when empty). */
  readonly displayText = computed(() => {
    const item = this.selectedItem();
    return item === null ? '' : this.displayOf(item);
  });

  protected readonly inputText = computed(
    () => this.list.searchText() ?? this.displayText(),
  );

  protected readonly visibleItems = this.list.visibleItems;
  protected readonly rows = this.list.rows;
  protected readonly activeIndex = this.list.activeIndex;
  protected readonly activeDescendant = this.list.activeDescendant;

  /** Arrow navigation happened since the last keystroke (custom-value gate). */
  private userNavigated = false;

  // --- chevron feature block -------------------------------------------------

  override readonly dropdown: OgeInputDropDownApi =
    this.panelController.dropDownApi(
      () => this.showDropDownButton() && !this.effectiveDisabled(),
      () => this.toggle(),
    );

  // --- type-ahead (select-only mode) ----------------------------------------

  private typeBuffer = '';
  private typeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    // Dev-mode warnings for inputs the virtual mode ignores.
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      effect(() => {
        if (!this.virtualActive()) return;
        if (this.groupBy() !== undefined) {
          console.warn(
            'oge-select-box: virtualScroll ignores groupBy — group headers are not rendered in virtual mode.',
          );
        }
        if (this.wrapItemText()) {
          console.warn(
            'oge-select-box: virtualScroll forces fixed-height rows — wrapItemText is ignored.',
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
    // Filtering while open re-anchors the active option.
    effect(() => {
      this.list.visibleItems();
      untracked(() => {
        if (this.opened()) this.initActiveFromSelection();
      });
    });
    // selectionChanged fires on every resolved-item change, including
    // programmatic value writes (DevExtreme parity) — but not on init.
    let firstRun = true;
    let previousItem: TItem | null = null;
    effect(() => {
      const item = this.selectedItem();
      untracked(() => {
        if (firstRun) {
          firstRun = false;
          previousItem = item;
          return;
        }
        if (item !== previousItem) {
          this.selectionChanged.emit({ item, previousItem });
          previousItem = item;
        }
      });
    });
    this.destroyRef.onDestroy(() => {
      if (this.typeTimer !== null) clearTimeout(this.typeTimer);
      this.list.destroy();
      this.panelController.destroy();
    });
  }

  // --- public API ------------------------------------------------------------

  /** Opens the popup (same as `opened.set(true)`). */
  open(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.opened.set(true);
    // initialize the active option synchronously — a keydown arriving before
    // the opened-sync effect flushes must already see a valid activeIndex
    if (this.list.activeIndex() < 0) this.initActiveFromSelection();
  }

  /** Closes the popup. */
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
    if (!this.opened()) {
      if (this.openOnFieldClick()) this.open();
      return;
    }
    // while searching, clicks reposition the caret — only select-only toggles
    if (!this.searchEnabled()) this.close();
  }

  protected onNativeInput(event: Event): void {
    if (!this.searchEnabled()) return;
    const text = (event.target as HTMLInputElement).value;
    this.userNavigated = false;
    this.list.setSearch(text);
    this.inputChange.emit({ text, event });
    this.searchChanged.emit({ text });
    if (!this.opened()) this.open();
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
    this.customSelected.set(null);
    this.commitNow(this.list.itemValue(item), event);
    this.list.resetSearch();
    this.close();
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
          // opening activates the selected option (or the first one) — the
          // opened-sync effect handles it, Alt or not
          this.open();
          return;
        }
        this.userNavigated = true;
        if (event.altKey && event.key === 'ArrowUp') {
          this.commitActive(event);
          return;
        }
        this.list.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Enter': {
        if (open) {
          event.preventDefault();
          // typed text wins over the auto-activated option when custom
          // values are on and the user has not arrowed through the list
          if (
            this.acceptCustomValue() &&
            this.list.searchText() !== null &&
            !this.userNavigated &&
            this.tryCreateCustomItem(event)
          ) {
            return;
          }
          this.commitActive(event);
          return;
        }
        this.handleEnterKey(event);
        return;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          this.close();
          return;
        }
        // two-stage Escape: popup already closed → clear the search text
        if (this.list.searchText()) {
          event.preventDefault();
          this.list.resetSearch();
        }
        return;
      }
      case 'Tab': {
        if (open) this.close();
        return;
      }
      case 'Home':
      case 'End': {
        // editable mode: Home/End move the text caret (APG)
        if (this.searchEnabled()) return;
        event.preventDefault();
        this.list.setActive(
          event.key === 'Home'
            ? this.list.edgeEnabledIndex(1)
            : this.list.edgeEnabledIndex(-1),
        );
        if (!open) this.open();
        return;
      }
      case 'PageDown':
      case 'PageUp': {
        if (open) {
          event.preventDefault();
          this.userNavigated = true;
          this.list.moveActive(event.key === 'PageDown' ? 10 : -10);
        }
        return;
      }
      case ' ': {
        if (this.searchEnabled()) return;
        event.preventDefault();
        if (!open) this.open();
        else this.commitActive(event);
        return;
      }
      default: {
        // select-only type-ahead on printable characters
        if (
          !this.searchEnabled() &&
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          event.preventDefault();
          this.typeAhead(event.key);
        }
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

  // --- custom values ---------------------------------------------------------

  /** Returns `true` when the typed text was handled (created or rejected). */
  private tryCreateCustomItem(event?: Event): boolean {
    const text = (this.list.searchText() ?? '').trim();
    if (!text) return false;
    // exact display match selects the existing item instead of creating one
    const items = this.list.resolvedItems();
    const existing = items.find(
      (item) =>
        this.displayOf(item).toLocaleLowerCase() === text.toLocaleLowerCase(),
    );
    if (existing !== undefined) {
      if (!this.isItemDisabled(existing)) {
        this.selectItem(
          existing,
          this.list.visibleItems().indexOf(existing),
          event ?? new Event('change'),
        );
      }
      return true;
    }
    const payload: OgeSelectBoxCustomItemEvent<TItem> = { text };
    this.customItemCreating.emit(payload);
    const candidate =
      payload.customItem !== undefined
        ? payload.customItem
        : (text as unknown as TItem);
    if (candidate === null) return true; // handler rejected the text
    if (typeof (candidate as PromiseLike<unknown>)?.then === 'function') {
      const runId = ++this.customSeq;
      (candidate as PromiseLike<TItem | null>).then(
        (resolved) => {
          if (runId === this.customSeq && resolved != null) {
            this.applyCustomItem(resolved, event);
          }
        },
        () => undefined,
      );
      return true;
    }
    this.applyCustomItem(candidate as TItem, event);
    return true;
  }

  private applyCustomItem(item: TItem, event?: Event): void {
    this.customSelected.set(item);
    this.commitNow(this.list.itemValue(item), event);
    this.list.resetSearch();
    this.close();
  }

  // --- active-option bookkeeping ---------------------------------------------

  private initActiveFromSelection(): void {
    this.list.activateItemOrFirst(this.selectedItem());
  }

  private commitActive(event: Event): void {
    const items = this.list.visibleItems();
    const index = this.list.activeIndex();
    if (index < 0 || index >= items.length) {
      this.close();
      return;
    }
    this.selectItem(items[index], index, event);
  }

  private typeAhead(char: string): void {
    if (!this.opened()) this.open();
    if (this.typeTimer !== null) clearTimeout(this.typeTimer);
    this.typeTimer = setTimeout(() => {
      this.typeBuffer = '';
      this.typeTimer = null;
    }, this.overlayConfig.typeAheadMs);
    const lower = char.toLocaleLowerCase();
    // repeating one character cycles through its matches instead of matching "aa"
    const cycling =
      this.typeBuffer.length > 0 &&
      Array.from(this.typeBuffer).every((c) => c.toLocaleLowerCase() === lower);
    this.typeBuffer += char;
    const query = cycling ? lower : this.typeBuffer.toLocaleLowerCase();
    const items = this.list.visibleItems();
    if (items.length === 0) return;
    const start = Math.max(this.list.activeIndex(), 0);
    for (let offset = cycling ? 1 : 0; offset <= items.length; offset++) {
      const index = (start + offset) % items.length;
      const item = items[index];
      if (this.isItemDisabled(item)) continue;
      if (this.displayOf(item).toLocaleLowerCase().startsWith(query)) {
        this.list.setActive(index);
        return;
      }
    }
  }

  // --- base contract ---------------------------------------------------------

  protected override onFocusChanged(focused: boolean): void {
    if (focused) return;
    // custom values commit on blur; otherwise uncommitted search text
    // reverts to the selected display text
    if (
      this.acceptCustomValue() &&
      this.list.searchText() !== null &&
      this.tryCreateCustomItem()
    ) {
      return;
    }
    this.list.resetSearch();
    if (this.opened()) this.close();
  }

  protected nativeElement(): HTMLInputElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): unknown {
    return null;
  }

  protected valueIsEmpty(value: unknown): boolean {
    return value == null;
  }
}
