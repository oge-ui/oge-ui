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
  formatPattern,
  ogeMoreTagsText,
  isNearScrollEnd,
  ogeAllowDropDownClose,
  ogeAllowDropDownOpen,
  ogeCanSelectMore,
  ogeChipOverflow,
  ogeSelectAllState,
  ogeToggleAllValues,
  type OgeDropDownCloseReason,
  type OgeDropDownClosingEvent,
  type OgeDropDownOpeningEvent,
  type OgeListDataSource,
  type OgeListPageLoadedEvent,
  type OgeSelectAllState,
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
  OgeSelectBoxItemsFn,
  OgeSelectBoxSearchChangedEvent,
  OgeSelectBoxSearchExpr,
  OgeSelectBoxSearchMode,
  OgeSelectBoxValueExpr,
  OgeSelectGroupTemplateContext,
  OgeSelectItemTemplateContext,
} from '@oge-ui/inputs/select-box';
import type {
  OgeTagBoxItemClickEvent,
  OgeTagBoxSelectAllEvent,
  OgeTagBoxSelectionChangedEvent,
  OgeTagBoxTagTemplateContext,
} from './tag-box-types';

declare const ngDevMode: boolean | undefined;

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
 *   [showSelectAll]="true"
 *   [maxSelectedItems]="5"
 *   [(value)]="assigneeIds"
 * />
 * ```
 *
 * Shares the select box's vocabulary — expressions, `groupBy`, item / group
 * templates, lazy `items` functions, remote `dataSource` paging and
 * `acceptCustomValue` — and adds chip templates, a tri-state "select all"
 * row, a selection cap and chip overflow. Works standalone via `[(value)]`,
 * with Signal Forms via `[formField]` and with reactive forms via
 * `formControl`.
 */
@Component({
  selector: 'oge-tag-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeFieldChrome, OgePopup],
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
            @if (tagTemplate(); as tagTpl) {
              <ng-container
                *ngTemplateOutlet="
                  tagTpl;
                  context: {
                    $implicit: chip.item,
                    index: chip.valueIndex,
                    text: displayOf(chip.item),
                  }
                "
              />
            } @else {
              @if (imageOf(chip.item); as imageUrl) {
                <img class="oge-tag-img" [src]="imageUrl" alt="" />
              }
              <span class="oge-tag-text">{{ displayOf(chip.item) }}</span>
            }
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
          <span class="oge-tag oge-tag-more">{{ moreText() }}</span>
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
      <oge-popup
        [panel]="panel"
        [adaptive]="presentation()"
        [adaptiveTitle]="label() || msg().adaptiveTitle"
        [closeLabel]="msg().adaptiveClose"
      >
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
              [value]="searchTextValue()"
              (input)="onNativeInput($event)"
              (keydown)="onKeydown($event)"
            />
          </div>
        }
        @if (adaptiveActive()) {
          <div ogePopupSheetFooter class="oge-popup-sheet-footer">
            <button type="button" class="oge-sheet-done" (click)="close()">
              {{ msg().adaptiveDone }}
            </button>
          </div>
        }
        @if (limitReached()) {
          <div class="oge-select-limit" role="status">
            {{ limitText() }}
          </div>
        }
        <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- focusable (tabindex 0) only in the adaptive sheet, where it owns the keyboard via aria-activedescendant -->
        <div
          #listEl
          class="oge-select-list"
          [class.oge-select-list-virtual]="virtualActive()"
          role="listbox"
          aria-multiselectable="true"
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
          [attr.aria-busy]="busy() ? 'true' : null"
          (keydown)="onSheetListKeydown($event)"
          [attr.aria-labelledby]="
            labelMode() !== 'hidden' && label() ? labelId : null
          "
          [attr.aria-label]="
            labelMode() === 'hidden' && label() ? label() : null
          "
          (scroll)="onListScroll($event)"
        >
          @if (selectAllVisible()) {
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- keyboard access is the combobox's: ArrowUp from the first option activates this row, Enter/Space toggles it -->
            <div
              class="oge-select-option oge-tag-select-all-option"
              role="option"
              [id]="selectAllId"
              [class.oge-select-option-active]="selectAllActive()"
              [attr.aria-selected]="selectAllState() === true"
              [attr.aria-checked]="
                selectAllState() === 'mixed' ? 'mixed' : selectAllState()
              "
              (mousedown)="$event.preventDefault()"
              (mouseenter)="selectAllActive.set(true)"
              (click)="toggleAll($event)"
            >
              <span
                class="oge-tag-checkbox"
                [class.oge-tag-checkbox-on]="selectAllState() === true"
                [class.oge-tag-checkbox-mixed]="selectAllState() === 'mixed'"
                aria-hidden="true"
              >
                @if (selectAllState() === true) {
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
                } @else if (selectAllState() === 'mixed') {
                  <svg
                    viewBox="0 0 16 16"
                    width="10"
                    height="10"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  >
                    <path d="M4 8h8" />
                  </svg>
                }
              </span>
              <span class="oge-select-option-text">{{
                msg().selectAllText
              }}</span>
            </div>
          }
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
            (remote.status() === 'error' && visibleItems().length === 0)
          ) {
            <div class="oge-select-status" role="presentation">
              {{ msg().dropDownLoadError }}
            </div>
          } @else if (visibleItems().length === 0) {
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
                  <ng-container
                    *ngTemplateOutlet="
                      optionTpl;
                      context: {
                        $implicit: row.item,
                        index: row.index,
                        positional: true,
                      }
                    "
                  />
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
                <ng-container
                  *ngTemplateOutlet="
                    optionTpl;
                    context: {
                      $implicit: row.item,
                      index: row.index,
                      positional: false,
                    }
                  "
                />
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
          }
        </div>
      </oge-popup>
    }

    <ng-template
      #optionTpl
      let-item
      let-index="index"
      let-positional="positional"
    >
      <!--
        activedescendant pattern: options are never focusable and all
        keyboard interaction lives on the combobox input
      -->
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- keyboard access is provided by the roving-tabindex/listbox key handling on the container -->
      <div
        class="oge-select-option"
        role="option"
        [id]="optionId(index)"
        [class.oge-select-option-active]="index === activeIndex()"
        [class.oge-select-option-selected]="isSelected(item)"
        [class.oge-disabled]="isOptionDisabled(item)"
        [attr.aria-selected]="isSelected(item)"
        [attr.aria-disabled]="isOptionDisabled(item) ? 'true' : null"
        [attr.aria-posinset]="positional ? index + 1 : null"
        [attr.aria-setsize]="positional ? setSize() : null"
        (mousedown)="$event.preventDefault()"
        (mouseenter)="onOptionHover(index, item)"
        (click)="toggleItemAt(index, $event)"
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
        @if (itemTemplate(); as template) {
          <ng-container
            *ngTemplateOutlet="
              template;
              context: {
                $implicit: item,
                index: index,
                selected: isSelected(item),
                active: index === activeIndex(),
              }
            "
          />
        } @else {
          @if (imageOf(item); as imageUrl) {
            <img
              class="oge-select-option-img"
              [src]="imageUrl"
              alt=""
              loading="lazy"
            />
          }
          <span class="oge-select-option-text">{{ displayOf(item) }}</span>
        }
      </div>
    </ng-template>
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
  /**
   * The selectable items: an array, or a function invoked lazily on first
   * open (sync or promise — loading/error rows render while pending).
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
  /** Item → image URL rendered in chips and options (avatars, flags…). */
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
  /**
   * Debounce before typed text filters the list. `undefined` filters local
   * items immediately and debounces `dataSource` requests by the config
   * default (250ms).
   */
  readonly searchTimeout = input<number | undefined>(undefined);
  /** Characters required before the filter narrows the list. */
  readonly minSearchLength = input(0);
  /** Below `minSearchLength`: show the full list (`true`) or nothing (`false`). */
  readonly showDataBeforeSearch = input(false);
  /**
   * Lets typed text that matches no item become a new tag on Enter.
   * `customItemCreating` maps the text to an item (sync/async, `null` to
   * reject); unhandled, the text itself is the item.
   */
  readonly acceptCustomValue = input(false);
  /** Renders checkboxes in front of the options. */
  readonly showSelectionControls = input(true);
  /** Hides already-selected items from the popup list. */
  readonly hideSelectedItems = input(false);
  /**
   * Adds a tri-state "select all" row above the options. It acts on the
   * visible, enabled items (the current filter or loaded pages), respects
   * `maxSelectedItems` and keeps values selected under other searches.
   */
  readonly showSelectAll = input(false);
  /** Caps the rendered chips; the rest collapse into a `+N more` chip. */
  readonly maxDisplayedTags = input<number | undefined>(undefined);
  /**
   * Caps how many items can be selected. At the cap, unselected options turn
   * inert and the popup shows `maxSelectedItemsMessage`.
   */
  readonly maxSelectedItems = input<number | undefined>(undefined);
  /** Renders the chevron toggle in the field rail. */
  readonly showDropDownButton = input(true);
  /** Clicking the field opens the popup. */
  readonly openOnFieldClick = input(true);
  /** Shows a loading row instead of items — server-side filtering escape hatch. */
  readonly loading = input(false);
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /** Popup width: fixed pixels or `'anchor'` to match the field box. */
  readonly dropdownWidth = input<number | 'anchor'>('anchor');
  /** Scrollable list height cap; `undefined` = the CSS default (320px). */
  readonly dropdownMaxHeight = input<number | undefined>(undefined);
  /** Custom option row rendering (the checkbox stays). */
  readonly itemTemplate = input<
    TemplateRef<OgeSelectItemTemplateContext<TItem>> | undefined
  >(undefined);
  /** Custom group header rendering (`groupBy` lists). */
  readonly groupTemplate = input<
    TemplateRef<OgeSelectGroupTemplateContext> | undefined
  >(undefined);
  /** Custom chip content (the remove button stays). */
  readonly tagTemplate = input<
    TemplateRef<OgeTagBoxTagTemplateContext<TItem>> | undefined
  >(undefined);
  /**
   * Windowed rendering for large lists: `true` or `{ itemHeight, overscan }`.
   * Rows get a fixed size-matched height; `groupBy` is ignored while active.
   */
  readonly virtualScroll = input<boolean | OgeVirtualScrollOptions>(false);
  /**
   * Remote, paged data: any `@oge-ui/core` `DataSource` (or an object with
   * the same `load()`, plus an optional `byKey()` to resolve chips the loaded
   * pages lack). Replaces `items` while set — see the select box.
   */
  readonly dataSource = input<OgeListDataSource<TItem> | undefined>(undefined);
  /** Rows requested per `dataSource` page; `undefined` = config default (30). */
  readonly pageSize = input<number | undefined>(undefined);
  /** Popup visibility — two-way. */
  readonly opened = model(false);
  /**
   * `'auto'` presents the list as a modal bottom sheet (title, close button,
   * a search field when `searchEnabled`, a Done action) on viewports narrower
   * than `adaptiveBreakpoint`; `'none'` always anchors it. `undefined` =
   * config default (`'none'`).
   */
  readonly adaptiveMode = input<OgeAdaptiveMode | undefined>(undefined);
  /** Viewport width (px) below which `adaptiveMode: 'auto'` applies; `undefined` = config (600). */
  readonly adaptiveBreakpoint = input<number | undefined>(undefined);

  /** Fires on every commit with the added/removed item delta. */
  readonly selectionChanged = output<OgeTagBoxSelectionChangedEvent<TItem>>();
  /** An option row was toggled by click or keyboard. */
  readonly itemClick = output<OgeTagBoxItemClickEvent<TItem>>();
  /** The "select all" row was toggled. */
  readonly selectAllValueChanged = output<OgeTagBoxSelectAllEvent>();
  readonly dropDownOpened = output<void>();
  readonly dropDownClosed = output<void>();
  /** Cancelable pre-open event — set `cancel` to keep the popup closed. */
  readonly opening = output<OgeDropDownOpeningEvent>();
  /** Cancelable pre-close event (with its `reason`) — set `cancel` to keep the popup open. */
  readonly closing = output<OgeDropDownClosingEvent>();
  /** Raw search text on every keystroke — drive server-side filtering from here. */
  readonly searchChanged = output<OgeSelectBoxSearchChangedEvent>();
  /**
   * `acceptCustomValue` commit: assign `customItem` on the (mutable) payload
   * to map the text to an item — or `null` to reject it.
   */
  readonly customItemCreating = output<OgeSelectBoxCustomItemEvent<TItem>>();
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
  private readonly virtualizer: ListVirtualizerModel = new ListVirtualizerModel(
    {
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
    },
  );

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

  /** Shared dropdown-list model (filtering, active option, ids). */
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
    searchDebounceMs: () => this.searchTimeout() ?? 0,
    minSearchLength: () => this.minSearchLength(),
    showDataBeforeSearch: () => this.showDataBeforeSearch(),
    groupBy: () => (this.virtualActive() ? undefined : this.groupBy()),
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
    beforeClose: (reason) => this.allowClose(panelCloseReason(reason)),
    onOpened: () => {
      this.list.ensureItemsLoaded();
      this.remote.open();
      if (this.list.activeIndex() < 0 && !this.selectAllActive()) {
        this.list.setActive(this.list.edgeEnabledIndex(1));
      }
      this.dropDownOpened.emit();
    },
    onClosed: () => {
      this.list.activeIndex.set(-1);
      this.selectAllActive.set(false);
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

  /** DOM id of the "select all" row — an `aria-activedescendant` target. */
  get selectAllId(): string {
    return `${this.inputId}-select-all`;
  }

  /** Custom tags created through `acceptCustomValue` — not in `items`. */
  private readonly customItems = signal<readonly TItem[]>([]);
  private customSeq = 0;

  /** Selected items resolved from `value`, in value order. */
  readonly selectedItems = computed<readonly TItem[]>(() => {
    const pool = this.list.resolvedItems();
    const remote = this.remote.active;
    const custom = this.customItems();
    return this.value()
      .map((entry) => {
        const matches = (item: TItem) =>
          Object.is(this.list.itemValue(item), entry);
        return (
          pool.find(matches) ??
          (remote ? this.remote.lookup(entry) : undefined) ??
          custom.find(matches)
        );
      })
      .filter((item): item is TItem => item !== undefined);
  });

  protected readonly searchTextValue = computed(
    () => this.list.searchText() ?? '',
  );

  protected readonly visibleItems = this.list.visibleItems;
  protected readonly rows = this.list.rows;
  protected readonly itemsStatus = this.list.itemsStatus;

  /** Chip overflow arithmetic (`maxDisplayedTags`). */
  private readonly overflow = computed(() =>
    ogeChipOverflow(this.selectedItems().length, this.maxDisplayedTags()),
  );

  /** Chips rendered in the field (respects `maxDisplayedTags`). */
  protected readonly visibleChips = computed<
    readonly { item: TItem; valueIndex: number }[]
  >(() =>
    this.selectedItems()
      .slice(0, this.overflow().shown)
      .map((item, valueIndex) => ({ item, valueIndex })),
  );

  protected readonly overflowCount = computed(() => this.overflow().hidden);

  protected readonly moreText = computed(() =>
    ogeMoreTagsText(
      this.msg().moreTags,
      this.overflowCount(),
      this.config.locale,
    ),
  );

  /** `maxSelectedItems` is reached — unselected options turn inert. */
  protected readonly limitReached = computed(
    () => !ogeCanSelectMore(this.value().length, this.maxSelectedItems()),
  );

  protected readonly limitText = computed(() =>
    formatPattern(this.msg().maxSelectedItemsMessage, {
      max: String(this.maxSelectedItems() ?? ''),
    }),
  );

  protected readonly activeIndex = this.list.activeIndex;

  /** The "select all" row holds the keyboard's active-option cue. */
  protected readonly selectAllActive = signal(false);

  protected readonly selectAllVisible = computed(
    () =>
      this.showSelectAll() &&
      this.visibleItems().length > 0 &&
      !this.list.searchText(),
  );

  protected readonly selectAllState = computed<OgeSelectAllState>(() =>
    ogeSelectAllState(
      this.visibleItems(),
      (item) => this.isSelected(item),
      (item) => this.isItemDisabled(item),
    ),
  );

  protected readonly activeDescendant = computed(() =>
    this.opened() && this.selectAllActive()
      ? this.selectAllId
      : this.list.activeDescendant(),
  );

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

  /** Arrow navigation happened since the last keystroke (custom-value gate). */
  private userNavigated = false;

  override readonly dropdown: OgeInputDropDownApi =
    this.panelController.dropDownApi(
      () => this.showDropDownButton() && !this.effectiveDisabled(),
      () => this.toggle(),
    );

  constructor() {
    super();
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      effect(() => {
        if (this.virtualActive() && this.groupBy() !== undefined) {
          console.warn(
            'oge-tag-box: virtualScroll ignores groupBy — group headers are not rendered in virtual mode.',
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
    // Chips whose values no loaded page holds resolve through `byKey`.
    effect(() => {
      const values = this.value();
      if (!this.remote.active) return;
      untracked(() => {
        for (const value of values) this.remote.resolve(value);
      });
    });
    // Paging follows the view (rendered window / keyboard position).
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
    // filtering / selection changes re-anchor the active option
    effect(() => {
      this.list.visibleItems();
      untracked(() => {
        if (
          this.opened() &&
          !this.selectAllActive() &&
          this.list.activeIndex() >= this.list.visibleItems().length
        ) {
          this.list.setActive(this.list.edgeEnabledIndex(1));
        }
      });
    });
    this.destroyRef.onDestroy(() => {
      this.list.destroy();
      this.remote.destroy();
      this.panelController.destroy();
    });
  }

  // --- public API ------------------------------------------------------------

  /** Opens the popup unless a cancelable `opening` handler vetoes it. */
  open(): void {
    if (this.effectiveDisabled() || this.readonly() || this.opened()) return;
    if (!ogeAllowDropDownOpen((event) => this.opening.emit(event))) return;
    this.opened.set(true);
    if (this.list.activeIndex() < 0) {
      this.list.setActive(this.list.edgeEnabledIndex(1));
    }
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

  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  /** Selects every visible, enabled item (up to `maxSelectedItems`). */
  selectAll(): void {
    this.applySelectAll(true, new Event('change'));
  }

  /** Clears the visible, enabled items from the selection. */
  unselectAll(): void {
    this.applySelectAll(false, new Event('change'));
  }

  /** Re-requests the current search from `dataSource`, dropping every cached page. */
  reload(): void {
    this.remote.reload();
  }

  // --- selection -------------------------------------------------------------

  protected isSelected(item: TItem): boolean {
    const entry = this.list.itemValue(item);
    return this.value().some((candidate) => Object.is(candidate, entry));
  }

  /** Disabled by `disabledExpr`, or inert because the cap is reached. */
  protected isOptionDisabled(item: TItem): boolean {
    return (
      this.isItemDisabled(item) ||
      (this.limitReached() && !this.isSelected(item))
    );
  }

  protected toggleItemAt(index: number, event: Event): void {
    const item = this.list.visibleItems()[index];
    if (item === undefined || this.isOptionDisabled(item)) return;
    this.itemClick.emit({ item, index, event });
    this.toggleItem(item, event);
    // picking stays open (multi-select); clear the search for the next pick
    this.list.resetSearch();
    this.remote.setSearch(null, true);
    // in the adaptive sheet focus stays on the sheet's own search / list
    if (!this.adaptiveActive()) this.focus();
  }

  private toggleItem(item: TItem, event: Event): void {
    const entry = this.list.itemValue(item);
    const current = this.value();
    const exists = current.some((candidate) => Object.is(candidate, entry));
    if (!exists && !ogeCanSelectMore(current.length, this.maxSelectedItems())) {
      return;
    }
    if (!exists && this.remote.active) this.remote.remember(item);
    const next = exists
      ? current.filter((candidate) => !Object.is(candidate, entry))
      : [...current, entry];
    this.commitNow(next, event);
    this.selectionChanged.emit(
      exists
        ? { addedItems: [], removedItems: [item] }
        : { addedItems: [item], removedItems: [] },
    );
  }

  protected toggleAll(event: Event): void {
    // select while something can still be added; at the cap (or when all
    // are on) the same click clears the visible items
    const select =
      this.selectAllState() !== true &&
      ogeCanSelectMore(this.value().length, this.maxSelectedItems());
    this.applySelectAll(select, event);
    if (!this.adaptiveActive()) this.focus();
  }

  private applySelectAll(select: boolean, event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const items = this.list.visibleItems();
    const before = this.value();
    const next = ogeToggleAllValues(
      before,
      items,
      (item) => this.list.itemValue(item),
      (item) => this.isItemDisabled(item),
      select,
      this.maxSelectedItems(),
    );
    if (
      next.length === before.length &&
      next.every((value, index) => Object.is(value, before[index]))
    ) {
      return;
    }
    const has = (list: readonly unknown[], value: unknown) =>
      list.some((entry) => Object.is(entry, value));
    const addedItems = items.filter(
      (item) =>
        has(next, this.list.itemValue(item)) &&
        !has(before, this.list.itemValue(item)),
    );
    const removedItems = items.filter(
      (item) =>
        !has(next, this.list.itemValue(item)) &&
        has(before, this.list.itemValue(item)),
    );
    if (this.remote.active) {
      for (const item of addedItems) this.remote.remember(item);
    }
    this.commitNow(next, event);
    this.selectionChanged.emit({ addedItems, removedItems });
    this.selectAllValueChanged.emit({ selected: select, event });
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

  // --- custom values ---------------------------------------------------------

  /** Returns `true` when the typed text was handled (created or rejected). */
  private tryCreateCustomItem(event: Event): boolean {
    const text = (this.list.searchText() ?? '').trim();
    if (!text) return false;
    // exact display match toggles the existing item instead of creating one
    const existing = this.list
      .resolvedItems()
      .find(
        (item) =>
          this.displayOf(item).toLocaleLowerCase() === text.toLocaleLowerCase(),
      );
    if (existing !== undefined) {
      if (!this.isOptionDisabled(existing) && !this.isSelected(existing)) {
        this.toggleItem(existing, event);
      }
      this.clearSearchAfterPick();
      return true;
    }
    if (!ogeCanSelectMore(this.value().length, this.maxSelectedItems())) {
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
            this.addCustomItem(resolved, event);
          }
        },
        () => undefined,
      );
      return true;
    }
    this.addCustomItem(candidate as TItem, event);
    return true;
  }

  private addCustomItem(item: TItem, event: Event): void {
    this.customItems.update((items) => [...items, item]);
    if (!this.isSelected(item)) this.toggleItem(item, event);
    this.clearSearchAfterPick();
  }

  private clearSearchAfterPick(): void {
    this.list.resetSearch();
    this.remote.setSearch(null, true);
  }

  // --- template handlers -----------------------------------------------------

  protected onFieldClick(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.opened() && this.openOnFieldClick()) this.open();
  }

  protected onNativeInput(event: Event): void {
    if (!this.searchEnabled()) return;
    const text = (event.target as HTMLInputElement).value;
    this.userNavigated = false;
    this.selectAllActive.set(false);
    this.list.setSearch(text);
    this.remote.setSearch(text);
    this.inputChange.emit({ text, event });
    this.searchChanged.emit({ text });
    if (!this.opened()) this.open();
  }

  protected onOptionHover(index: number, item: TItem): void {
    if (this.isOptionDisabled(item)) return;
    this.selectAllActive.set(false);
    this.list.activeIndex.set(index);
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
        this.userNavigated = true;
        if (event.key === 'ArrowDown' && this.selectAllActive()) {
          this.selectAllActive.set(false);
          this.list.setActive(this.list.edgeEnabledIndex(1));
          return;
        }
        if (
          event.key === 'ArrowUp' &&
          this.selectAllVisible() &&
          this.list.activeIndex() <= this.list.edgeEnabledIndex(1)
        ) {
          this.selectAllActive.set(true);
          this.list.activeIndex.set(-1);
          return;
        }
        this.list.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Enter': {
        if (open) {
          event.preventDefault();
          if (this.selectAllActive()) {
            this.toggleAll(event);
            return;
          }
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
          if (this.list.activeIndex() >= 0) {
            this.toggleItemAt(this.list.activeIndex(), event);
          }
          return;
        }
        this.handleEnterKey(event);
        return;
      }
      case ' ': {
        if (this.searchEnabled()) return;
        event.preventDefault();
        if (!open) this.open();
        else if (this.selectAllActive()) this.toggleAll(event);
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
          event.stopPropagation();
          this.close('escape');
        } else if (this.list.searchText()) {
          event.preventDefault();
          this.list.resetSearch();
          this.remote.setSearch(null, true);
        }
        return;
      }
      case 'Tab': {
        // the adaptive sheet traps Tab; only the anchored popup closes
        if (open && !this.adaptiveActive()) this.close('tab');
        return;
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
    super.handleBlur(event);
  }

  /**
   * A non-virtual page too short to scroll asks for the next one itself —
   * measured after the rows render.
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
    this.remote.setSearch(null, true);
    if (this.opened()) this.close('blur');
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

/** Maps a panel-initiated close onto the editor's `closing` reasons. */
function panelCloseReason(reason: OgePopupCloseReason): OgeDropDownCloseReason {
  return reason === 'outside' || reason === 'escape' || reason === 'tab'
    ? reason
    : 'api';
}
