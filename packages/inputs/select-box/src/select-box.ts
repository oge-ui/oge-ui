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
  adaptiveListViewportHeight,
  isNearScrollEnd,
  ogeAllowDropDownClose,
  ogeAllowDropDownOpen,
  type OgeDropDownCloseReason,
  type OgeDropDownClosingEvent,
  type OgeDropDownOpeningEvent,
  type OgeListDataSource,
  type OgeListPageLoadedEvent,
} from '@oge-ui/behavior';
import {
  OGE_OVERLAY_CONFIG,
  OgePopup,
  ogeAdaptivePresentation,
  type OgeAdaptiveMode,
  type OgePopupCloseReason,
  type OgePopupPlacement,
} from '@oge-ui/overlay';
import { OgeFieldChrome } from '@oge-ui/inputs/field';
import { OGE_INPUT_HOST, type OgeInputDropDownApi } from '@oge-ui/inputs/field';
import { OgeInputBase } from '@oge-ui/inputs/field';
import {
  ListVirtualizerModel,
  OGE_SELECT_OPTION_HEIGHT,
  type OgeVirtualScrollOptions,
} from '@oge-ui/inputs/select-list';
import { RemoteListModel } from '@oge-ui/inputs/select-list';
import { SelectListEngine } from '@oge-ui/inputs/select-list';
import { SelectPanelController } from '@oge-ui/inputs/select-list';
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
  OgeSelectFieldTemplateContext,
  OgeSelectGroupTemplateContext,
  OgeSelectItemTemplateContext,
  OgeSelectPopupTemplateContext,
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
    '[class.oge-select-field-templated]':
      'fieldTemplate() !== undefined && fieldTemplateShown()',
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
      @if (fieldTemplate(); as fieldTpl) {
        @if (fieldTemplateShown()) {
          <span class="oge-select-field-content" aria-hidden="true">
            <ng-container
              *ngTemplateOutlet="fieldTpl; context: fieldContext()"
            />
          </span>
        }
      }
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (opened()) {
      <oge-popup
        [panel]="panel"
        [adaptive]="presentation()"
        [adaptiveTitle]="label() || msg().adaptiveTitle"
        [closeLabel]="msg().adaptiveClose"
      >
        @if (headerTemplate(); as headerTpl) {
          <div
            class="oge-select-popup-header"
            (focusout)="onPopupFocusOut($event)"
          >
            <ng-container
              *ngTemplateOutlet="headerTpl; context: popupContext()"
            />
          </div>
        }
        @if (adaptiveActive() && searchEnabled()) {
          <div ogePopupSheetHeader class="oge-popup-sheet-search">
            <input
              class="oge-sheet-search-input"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded="true"
              autocomplete="off"
              data-oge-sheet-focus
              [attr.aria-controls]="listboxId"
              [attr.aria-activedescendant]="activeDescendant()"
              [attr.aria-label]="msg().adaptiveSearch"
              [placeholder]="msg().adaptiveSearch"
              [value]="sheetSearchText()"
              (input)="onNativeInput($event)"
              (keydown)="onKeydown($event)"
            />
          </div>
        }
        <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- focusable (tabindex 0) only in the adaptive sheet, where it owns the keyboard via aria-activedescendant -->
        <div
          #listEl
          class="oge-select-list"
          [class.oge-select-wrap]="wrapItemText() && !virtualActive()"
          [class.oge-select-list-virtual]="virtualActive()"
          role="listbox"
          [id]="listboxId"
          [style.maxHeight.px]="
            adaptiveActive() ? null : (dropdownMaxHeight() ?? null)
          "
          [attr.tabindex]="adaptiveActive() && !searchEnabled() ? 0 : null"
          [attr.data-oge-sheet-focus]="
            adaptiveActive() && !searchEnabled() ? '' : null
          "
          [attr.aria-activedescendant]="
            adaptiveActive() && !searchEnabled() ? activeDescendant() : null
          "
          (keydown)="onSheetListKeydown($event)"
          [attr.aria-labelledby]="
            labelMode() !== 'hidden' && label() ? labelId : null
          "
          [attr.aria-label]="
            labelMode() === 'hidden' && label() ? label() : null
          "
          [attr.aria-busy]="busy() ? 'true' : null"
          (scroll)="onListScroll($event)"
        >
          @if (
            loading() ||
            itemsStatus() === 'loading' ||
            remote.loadingFirstPage()
          ) {
            <div class="oge-select-status" role="presentation">
              {{ msg().dropDownLoading }}
            </div>
          } @else if (
            itemsStatus() === 'error' ||
            (remote.status() === 'error' && rows().length === 0)
          ) {
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
                    [class.oge-select-option-selected]="
                      row.item === selectedItem()
                    "
                    [class.oge-disabled]="isItemDisabled(row.item)"
                    [attr.aria-selected]="row.item === selectedItem()"
                    [attr.aria-disabled]="
                      isItemDisabled(row.item) ? 'true' : null
                    "
                    [attr.aria-posinset]="row.index + 1"
                    [attr.aria-setsize]="setSize()"
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
                  @if (groupTemplate(); as groupTpl) {
                    <ng-container
                      *ngTemplateOutlet="
                        groupTpl;
                        context: { $implicit: row.label, label: row.label }
                      "
                    />
                  } @else {
                    {{ row.label }}
                  }
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
          @if (remote.loadingMore()) {
            <div
              class="oge-select-status oge-select-loading-more"
              role="presentation"
            >
              {{ msg().dropDownLoading }}
            </div>
          } @else if (remote.status() === 'error' && rows().length > 0) {
            <div class="oge-select-status" role="presentation">
              {{ msg().dropDownLoadError }}
            </div>
          }
        </div>
        @if (footerTemplate(); as footerTpl) {
          <div
            class="oge-select-popup-footer"
            (focusout)="onPopupFocusOut($event)"
          >
            <ng-container
              *ngTemplateOutlet="footerTpl; context: popupContext()"
            />
          </div>
        }
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
  /**
   * Remote, paged data: any `@oge-ui/core` `DataSource` (or an object with
   * the same `load()`, plus an optional `byKey()`). Replaces `items` while
   * set — the list asks for `pageSize` rows at a time as the user scrolls,
   * sends the typed text as `searchText` (debounced by `searchTimeout`,
   * gated by `minSearchLength`), cancels superseded requests and caches the
   * pages of each search.
   */
  readonly dataSource = input<OgeListDataSource<TItem> | undefined>(undefined);
  /** Rows requested per `dataSource` page; `undefined` = config default (30). */
  readonly pageSize = input<number | undefined>(undefined);
  /** Custom group header rendering (`groupBy` lists). */
  readonly groupTemplate = input<
    TemplateRef<OgeSelectGroupTemplateContext> | undefined
  >(undefined);
  /**
   * Custom rendering of the closed field's value (an icon, a colour swatch, a
   * two-line label). The real input stays underneath for focus, typing and
   * assistive technology; the template hides while the user types.
   */
  readonly fieldTemplate = input<
    TemplateRef<OgeSelectFieldTemplateContext<TItem>> | undefined
  >(undefined);
  /** Content above the popup list (hints, a column legend, quick filters). */
  readonly headerTemplate = input<
    TemplateRef<OgeSelectPopupTemplateContext<TItem>> | undefined
  >(undefined);
  /** Content below the popup list (a "create new" action, a result count). */
  readonly footerTemplate = input<
    TemplateRef<OgeSelectPopupTemplateContext<TItem>> | undefined
  >(undefined);
  /** Popup visibility — two-way. */
  readonly opened = model(false);
  /**
   * `'auto'` presents the list as a modal bottom sheet (title, close button,
   * a search field when `searchEnabled`) on viewports narrower than
   * `adaptiveBreakpoint`; `'none'` always anchors it. `undefined` = config
   * default (`'none'`).
   */
  readonly adaptiveMode = input<OgeAdaptiveMode | undefined>(undefined);
  /** Viewport width (px) below which `adaptiveMode: 'auto'` applies; `undefined` = config (600). */
  readonly adaptiveBreakpoint = input<number | undefined>(undefined);

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
  /** Cancelable pre-open event — set `cancel` to keep the popup closed. */
  readonly opening = output<OgeDropDownOpeningEvent>();
  /** Cancelable pre-close event (with its `reason`) — set `cancel` to keep the popup open. */
  readonly closing = output<OgeDropDownClosingEvent>();
  /** A `dataSource` page landed (search text, offset, rows, total). */
  readonly pageLoaded = output<OgeListPageLoadedEvent<TItem>>();

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

  /** Current presentation: anchored, or the adaptive bottom sheet. */
  protected readonly presentation = ogeAdaptivePresentation(
    () => this.adaptiveMode() ?? this.config.adaptiveMode,
    () => this.adaptiveBreakpoint() ?? this.config.adaptiveBreakpoint,
    'sheet',
  );
  protected readonly adaptiveActive = computed(
    () => this.presentation() !== 'popup',
  );

  /** Fixed-height window model driving the virtualized list body. */
  private readonly virtualizer = new ListVirtualizerModel({
    itemCount: () => this.list.visibleItems().length,
    itemHeight: () =>
      this.virtualOptions()?.itemHeight ??
      OGE_SELECT_OPTION_HEIGHT[this.size()],
    overscan: () => this.virtualOptions()?.overscan ?? 4,
    viewportHeight: () =>
      this.adaptiveActive()
        ? adaptiveListViewportHeight()
        : (this.dropdownMaxHeight() ?? DEFAULT_LIST_MAX_HEIGHT),
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

  /** Remote paged data — inert until `dataSource` is bound. */
  protected readonly remote: RemoteListModel<TItem> =
    new RemoteListModel<TItem>({
      source: () => this.dataSource(),
      pageSize: () => this.pageSize() ?? this.config.dataPageSize,
      searchTimeout: () => this.searchTimeout() ?? this.config.searchTimeoutMs,
      minSearchLength: () => this.minSearchLength(),
      showDataBeforeSearch: () => this.showDataBeforeSearch(),
      valueOf: (item: TItem): unknown => this.list.itemValue(item),
      onPageLoaded: (event) => this.pageLoaded.emit(event),
    });

  /** Shared dropdown-list model (filtering, active option, lazy items, ids). */
  private readonly list: SelectListEngine<TItem> = new SelectListEngine<TItem>({
    inputId: () => this.inputId,
    opened: () => this.opened(),
    items: () => (this.remote.active ? this.remote.items() : this.items()),
    serverFiltering: () => this.remote.active,
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
    beforeClose: (reason) => this.allowClose(panelCloseReason(reason)),
    onOpened: () => {
      this.list.ensureItemsLoaded();
      this.remote.open();
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
      this.remote.setSearch(null, true);
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
    if (this.remote.active) {
      const remembered = this.remote.lookup(currentValue);
      if (remembered !== undefined) return remembered;
    }
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

  /** The adaptive sheet's search field starts empty, not with the selection. */
  protected readonly sheetSearchText = computed(
    () => this.list.searchText() ?? '',
  );

  protected readonly visibleItems = this.list.visibleItems;
  protected readonly rows = this.list.rows;
  protected readonly activeIndex = this.list.activeIndex;
  protected readonly activeDescendant = this.list.activeDescendant;

  /** Anything is loading — the listbox reports `aria-busy`. */
  protected readonly busy = computed(
    () =>
      this.loading() ||
      this.itemsStatus() === 'loading' ||
      this.remote.status() === 'loading',
  );

  /** `aria-setsize` of a windowed option: the server total, `-1` while unknown. */
  protected readonly setSize = computed(() => {
    if (!this.remote.active) return this.visibleItems().length;
    return (
      this.remote.totalCount() ??
      (this.remote.hasMore() ? -1 : this.visibleItems().length)
    );
  });

  /** The field template shows unless the user is typing a search. */
  protected readonly fieldTemplateShown = computed(
    () => this.list.searchText() === null,
  );

  protected readonly fieldContext = computed<
    OgeSelectFieldTemplateContext<TItem>
  >(() => ({ $implicit: this.selectedItem(), text: this.displayText() }));

  protected readonly popupContext = computed<
    OgeSelectPopupTemplateContext<TItem>
  >(() => ({
    $implicit: this.visibleItems(),
    searchText: this.list.searchText() ?? '',
    loading: this.busy(),
  }));

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
    // A new data source owns other rows: forget the old pages.
    effect(() => {
      this.dataSource();
      untracked(() => {
        this.remote.syncSource();
        if (this.opened()) this.remote.open();
      });
    });
    // A committed value no loaded page holds resolves through `byKey`.
    effect(() => {
      const value = this.value();
      if (!this.remote.active) return;
      untracked(() => this.remote.resolve(value));
    });
    // Paging follows the view: the rendered window or the keyboard's active
    // option nearing the loaded end asks for the next page.
    effect(() => {
      if (!this.remote.active || !this.opened()) return;
      const end = this.virtualActive() ? this.virtualizer.window().end : -1;
      const active = this.list.activeIndex();
      this.remote.items();
      untracked(() => {
        const target = Math.max(end, active);
        if (target >= 0) this.remote.notifyVisibleEnd(target);
        if (!this.virtualActive()) this.scheduleFillShortList();
      });
    });
    // Filtering while open re-anchors the active option — except while a
    // remote page appends rows below the one the user is on.
    let previousCount = 0;
    effect(() => {
      const count = this.list.visibleItems().length;
      untracked(() => {
        const appended =
          this.remote.active &&
          count > previousCount &&
          this.list.activeIndex() >= 0;
        previousCount = count;
        if (this.opened() && !appended) this.initActiveFromSelection();
      });
    });
    // selectionChanged fires on every resolved-item change, including
    // programmatic value writes (reference parity) — but not on init.
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

  /** Opens the popup unless a cancelable `opening` handler vetoes it. */
  open(): void {
    if (this.effectiveDisabled() || this.readonly() || this.opened()) return;
    if (!ogeAllowDropDownOpen((event) => this.opening.emit(event))) return;
    this.opened.set(true);
    // initialize the active option synchronously — a keydown arriving before
    // the opened-sync effect flushes must already see a valid activeIndex
    if (this.list.activeIndex() < 0) this.initActiveFromSelection();
  }

  /**
   * Closes the popup unless a cancelable `closing` handler vetoes it;
   * returns whether it closed.
   */
  close(reason: OgeDropDownCloseReason = 'api'): boolean {
    if (!this.opened()) return true;
    if (!this.allowClose(reason)) return false;
    this.opened.set(false);
    return true;
  }

  /** Re-requests the current search from `dataSource`, dropping every cached page. */
  reload(): void {
    this.remote.reload();
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
    this.remote.setSearch(text);
    this.inputChange.emit({ text, event });
    this.searchChanged.emit({ text });
    if (!this.opened()) this.open();
  }

  protected onOptionHover(index: number, item: TItem): void {
    if (!this.isItemDisabled(item)) this.list.activeIndex.set(index);
  }

  protected onListScroll(event: Event): void {
    if (this.virtualActive()) {
      this.virtualizer.onScroll(event);
      return;
    }
    if (this.remote.active && isNearScrollEnd(event.target as HTMLElement)) {
      this.remote.loadMore();
    }
  }

  /**
   * A non-virtual page too short to scroll asks for the next one itself —
   * measured after the rows render (a list with no scrollbar never scrolls).
   */
  private scheduleFillShortList(): void {
    if (typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(() => {
      const el = this.listEl()?.nativeElement;
      if (!el || el.clientHeight === 0 || !this.opened()) return;
      if (isNearScrollEnd(el)) this.remote.loadMore();
    });
  }

  /** Runs the cancelable `closing` pre-event. */
  private allowClose(reason: OgeDropDownCloseReason): boolean {
    return ogeAllowDropDownClose((event) => this.closing.emit(event), reason);
  }

  protected selectItem(item: TItem, index: number, event: Event): void {
    if (this.isItemDisabled(item)) return;
    this.itemClick.emit({ item, index, event });
    this.customSelected.set(null);
    if (this.remote.active) this.remote.remember(item);
    this.commitNow(this.list.itemValue(item), event);
    this.list.resetSearch();
    this.close('select');
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
          // handled here — the panel's document listener must not run a
          // second close (and a second `closing` event) for the same key
          event.stopPropagation();
          this.close('escape');
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
        // the adaptive sheet traps Tab; only the anchored popup closes
        if (open && !this.adaptiveActive()) this.close('tab');
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

  /** Keyboard of the non-searchable adaptive listbox (it holds DOM focus). */
  protected onSheetListKeydown(event: KeyboardEvent): void {
    if (!this.adaptiveActive() || this.searchEnabled()) return;
    if (event.target !== event.currentTarget) return;
    this.onKeydown(event);
  }

  /**
   * While the adaptive sheet is open, focus lives inside it — the field's
   * blur is the sheet taking focus, not the user leaving the editor.
   */
  protected override handleBlur(event: FocusEvent): void {
    if (this.opened() && this.adaptiveActive()) return;
    // focus moving into the popup (a control in the header / footer
    // template) is not the user leaving the editor
    if (this.opened() && this.inPopup(event.relatedTarget)) return;
    super.handleBlur(event);
  }

  /** Focus leaving a header / footer control for somewhere outside the editor. */
  protected onPopupFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next === this.nativeElement() || this.inPopup(next)) return;
    super.handleBlur(event);
  }

  private inPopup(target: EventTarget | null): boolean {
    const popup = this.popupRef()?.nativeElement;
    return !!popup && target instanceof Node && popup.contains(target);
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
    this.close('select');
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
    if (this.opened()) this.close('blur');
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

/** Maps a panel-initiated close onto the editor's `closing` reasons. */
function panelCloseReason(reason: OgePopupCloseReason): OgeDropDownCloseReason {
  return reason === 'outside' || reason === 'escape' || reason === 'tab'
    ? reason
    : 'api';
}
