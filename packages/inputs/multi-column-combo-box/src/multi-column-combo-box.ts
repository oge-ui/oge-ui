import { NgTemplateOutlet } from '@angular/common';
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
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  adaptiveListViewportHeight,
  formatPattern,
  isNearScrollEnd,
  ogeAllowDropDownClose,
  ogeAllowDropDownOpen,
  ogeChipOverflow,
  ogeComboCellText,
  ogeComboCellValue,
  ogeComboColumnCaption,
  ogeComboColumnTarget,
  ogeComboFixedWidth,
  ogeComboGridTemplate,
  ogeComboSearchStrings,
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
  OgeSelectBoxDisabledExpr,
  OgeSelectBoxDisplayExpr,
  OgeSelectBoxItemsFn,
  OgeSelectBoxSearchChangedEvent,
  OgeSelectBoxSearchExpr,
  OgeSelectBoxSearchMode,
  OgeSelectBoxValueExpr,
} from '@oge-ui/inputs/select-box';
import type {
  OgeComboBoxCellTemplateContext,
  OgeComboBoxColumn,
  OgeMultiColumnComboBoxRowClickEvent,
  OgeMultiColumnComboBoxSelectionChangedEvent,
  OgeMultiColumnComboBoxSelectionMode,
} from './multi-column-combo-box-types';

/** CSS default of the popup body's `max-height`. */
const DEFAULT_LIST_MAX_HEIGHT = 320;

/**
 * Combo box whose popup is a small data grid: several columns per row, a
 * header, keyboard row **and** cell navigation, search across the chosen
 * columns, virtual scrolling and remote paged data — the WAI-ARIA APG
 * "combobox with grid popup" pattern (`aria-haspopup="grid"`, DOM focus stays
 * in the input, `aria-activedescendant` names the active gridcell).
 *
 * ```html
 * <oge-multi-column-combo-box
 *   label="Product"
 *   [items]="products"
 *   [columns]="[
 *     { field: 'sku', caption: 'SKU', width: 90 },
 *     { field: 'name' },
 *     { field: 'price', format: { style: 'currency', currency: 'EUR' }, alignment: 'end' },
 *   ]"
 *   valueExpr="id"
 *   displayExpr="name"
 *   [(value)]="productId"
 * />
 * ```
 *
 * Single or multiple selection (multiple renders removable chips and keeps
 * the popup open while picking), `valueExpr` / `displayExpr` mapping,
 * `[(value)]`, Signal Forms `[formField]` and reactive forms, and the
 * adaptive bottom sheet on small screens.
 */
@Component({
  selector: 'oge-multi-column-combo-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeFieldChrome, OgePopup],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeMultiColumnComboBox }],
  host: {
    class: 'oge-input oge-select-box oge-multi-column-combo-box',
    '[class.oge-select-box-open]': 'opened()',
    '[class.oge-multi-column-combo-box-multiple]': 'multiple()',
  },
  styleUrl: './multi-column-combo-box.scss',
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      @if (multiple()) {
        <div class="oge-tag-strip">
          @for (chip of visibleChips(); track $index) {
            <span class="oge-tag">
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
            <span class="oge-tag oge-tag-more">{{ moreText() }}</span>
          }
          <ng-container [ngTemplateOutlet]="fieldInput" />
        </div>
      } @else {
        <ng-container [ngTemplateOutlet]="fieldInput" />
      }
      <ng-template #fieldInput>
        <input
          #native
          class="oge-input-native"
          [class.oge-tag-input]="multiple()"
          [class.oge-select-plain]="!searchEnabled()"
          type="text"
          role="combobox"
          aria-haspopup="grid"
          autocomplete="off"
          [id]="inputId"
          [value]="inputText()"
          [placeholder]="multiple() && !isEmpty() ? '' : placeholderText()"
          [disabled]="effectiveDisabled()"
          [readOnly]="readonly() || !searchEnabled()"
          [attr.name]="name() || null"
          [attr.title]="tooltip() ?? null"
          [attr.tabindex]="tabIndex()"
          [attr.aria-expanded]="opened()"
          [attr.aria-controls]="opened() ? gridId : null"
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
      </ng-template>
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
              aria-haspopup="grid"
              aria-autocomplete="list"
              aria-expanded="true"
              autocomplete="off"
              data-oge-sheet-focus
              [attr.aria-controls]="gridId"
              [attr.aria-activedescendant]="activeDescendant()"
              [attr.aria-label]="msg().adaptiveSearch"
              [placeholder]="msg().adaptiveSearch"
              [value]="list.searchText() ?? ''"
              (input)="onNativeInput($event)"
              (keydown)="onKeydown($event)"
            />
          </div>
        }
        @if (adaptiveActive() && multiple()) {
          <div ogePopupSheetFooter class="oge-popup-sheet-footer">
            <button type="button" class="oge-sheet-done" (click)="close()">
              {{ msg().adaptiveDone }}
            </button>
          </div>
        }
        <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- focusable (tabindex 0) only in the adaptive sheet, where it owns the keyboard via aria-activedescendant -->
        <div
          #listEl
          class="oge-mccb-grid"
          [class.oge-mccb-grid-virtual]="virtualActive()"
          role="grid"
          [id]="gridId"
          [attr.aria-multiselectable]="multiple() ? 'true' : null"
          [attr.aria-rowcount]="rowCount()"
          [attr.aria-colcount]="columns().length"
          [attr.aria-busy]="busy() ? 'true' : null"
          [attr.aria-labelledby]="
            labelMode() !== 'hidden' && label() ? labelId : null
          "
          [attr.aria-label]="
            labelMode() === 'hidden' && label() ? label() : null
          "
          [attr.tabindex]="adaptiveActive() && !searchEnabled() ? 0 : null"
          [attr.data-oge-sheet-focus]="
            adaptiveActive() && !searchEnabled() ? '' : null
          "
          [attr.aria-activedescendant]="
            adaptiveActive() && !searchEnabled() ? activeDescendant() : null
          "
          [style.maxHeight.px]="
            adaptiveActive() ? null : (dropdownMaxHeight() ?? null)
          "
          [style.--oge-mccb-columns]="gridTemplate()"
          [style.--oge-mccb-min-width.px]="fixedWidth() ?? null"
          (keydown)="onSheetListKeydown($event)"
          (scroll)="onListScroll($event)"
        >
          @if (showHeader()) {
            <div
              class="oge-mccb-row oge-mccb-header"
              role="row"
              aria-rowindex="1"
            >
              @for (column of columns(); track $index) {
                <div
                  class="oge-mccb-cell oge-mccb-header-cell"
                  role="columnheader"
                  [class]="column.cssClass ?? ''"
                  [class.oge-mccb-align-center]="column.alignment === 'center'"
                  [class.oge-mccb-align-end]="column.alignment === 'end'"
                  [attr.aria-colindex]="$index + 1"
                >
                  {{ captionOf(column) }}
                </div>
              }
            </div>
          }
          @if (
            loading() ||
            itemsStatus() === 'loading' ||
            remote.loadingFirstPage()
          ) {
            <ng-container
              *ngTemplateOutlet="
                statusRow;
                context: { $implicit: msg().dropDownLoading }
              "
            />
          } @else if (
            itemsStatus() === 'error' ||
            (remote.status() === 'error' && visibleItems().length === 0)
          ) {
            <ng-container
              *ngTemplateOutlet="
                statusRow;
                context: { $implicit: msg().dropDownLoadError }
              "
            />
          } @else if (visibleItems().length === 0) {
            <ng-container
              *ngTemplateOutlet="
                statusRow;
                context: { $implicit: msg().noDataText }
              "
            />
          } @else if (virtualActive()) {
            <div
              class="oge-select-spacer"
              role="presentation"
              [style.height.px]="virtualWindow().totalHeight"
            >
              <div
                class="oge-select-window"
                role="presentation"
                [style.transform]="
                  'translateY(' + virtualWindow().offsetY + 'px)'
                "
              >
                @for (row of windowedItems(); track row.index) {
                  <ng-container
                    *ngTemplateOutlet="
                      rowTpl;
                      context: { $implicit: row.item, index: row.index }
                    "
                  />
                }
              </div>
            </div>
          } @else {
            @for (item of visibleItems(); track $index) {
              <ng-container
                *ngTemplateOutlet="
                  rowTpl;
                  context: { $implicit: item, index: $index }
                "
              />
            }
          }
          @if (remote.loadingMore()) {
            <ng-container
              *ngTemplateOutlet="
                statusRow;
                context: { $implicit: msg().dropDownLoading, more: true }
              "
            />
          }
        </div>
      </oge-popup>
    }

    <ng-template #statusRow let-text let-more="more">
      <div class="oge-mccb-row oge-mccb-status-row" role="row">
        <div
          class="oge-select-status"
          [class.oge-select-loading-more]="more"
          role="gridcell"
          [attr.aria-colspan]="columns().length"
        >
          {{ text }}
        </div>
      </div>
    </ng-template>

    <ng-template #rowTpl let-item let-index="index">
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- keyboard access is the combobox's (aria-activedescendant names the active gridcell) -->
      <div
        class="oge-mccb-row oge-select-option"
        role="row"
        [id]="rowId(index)"
        [class.oge-select-option-active]="index === activeIndex()"
        [class.oge-select-option-selected]="isSelected(item)"
        [class.oge-disabled]="isItemDisabled(item)"
        [attr.aria-selected]="isSelected(item)"
        [attr.aria-disabled]="isItemDisabled(item) ? 'true' : null"
        [attr.aria-rowindex]="index + (showHeader() ? 2 : 1)"
        (mousedown)="$event.preventDefault()"
        (mouseenter)="onRowHover(index, item)"
        (click)="onRowClick(item, index, $event)"
      >
        @for (column of columns(); track $index; let col = $index) {
          <div
            class="oge-mccb-cell"
            role="gridcell"
            [id]="cellId(index, col)"
            [class]="column.cssClass ?? ''"
            [class.oge-mccb-cell-active]="
              gridNavigating() &&
              index === activeIndex() &&
              col === activeColumn()
            "
            [class.oge-mccb-align-center]="column.alignment === 'center'"
            [class.oge-mccb-align-end]="column.alignment === 'end'"
            [attr.aria-colindex]="col + 1"
          >
            @if (column.cellTemplate; as cellTpl) {
              <ng-container
                *ngTemplateOutlet="
                  cellTpl;
                  context: cellContext(column, item, index)
                "
              />
            } @else {
              <span class="oge-mccb-cell-text">{{
                cellText(column, item)
              }}</span>
            }
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class OgeMultiColumnComboBox<TItem = unknown>
  extends OgeInputBase<unknown>
  implements FormValueControl<unknown>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /**
   * Committed value: the `valueExpr` of the selected row (`null` when
   * empty), or an array of them in `multiple` mode — two-way.
   */
  readonly value = model<unknown>(null);
  /** The rows: an array, or a function invoked lazily on first open. */
  readonly items = input<readonly TItem[] | OgeSelectBoxItemsFn<TItem>>([]);
  /** The popup columns, left to right. */
  readonly columns = input<readonly OgeComboBoxColumn<TItem>[]>([]);
  /**
   * Row → field text. Omitted, the first column's formatted cell text — so a
   * product picker shows the column the user reads first.
   */
  readonly displayExpr = input<OgeSelectBoxDisplayExpr<TItem> | undefined>(
    undefined,
  );
  /** Row → committed value. Omitted, the whole row is the value. */
  readonly valueExpr = input<OgeSelectBoxValueExpr<TItem> | undefined>(
    undefined,
  );
  /** Marks individual rows as non-selectable. */
  readonly disabledExpr = input<OgeSelectBoxDisabledExpr<TItem> | undefined>(
    undefined,
  );
  /** One row (`'single'`) or many (`'multiple'`, chips + array value). */
  readonly selectionMode = input<OgeMultiColumnComboBoxSelectionMode>('single');
  /** Typing filters the rows (default `true` — it is a combo box). */
  readonly searchEnabled = input(true);
  readonly searchMode = input<OgeSelectBoxSearchMode>('contains');
  /**
   * Which text the search matches. Omitted, every column whose `searchable`
   * is not `false` is searched by its formatted cell text.
   */
  readonly searchExpr = input<OgeSelectBoxSearchExpr<TItem> | undefined>(
    undefined,
  );
  /** Debounce before typed text filters; `undefined` = config default (250ms). */
  readonly searchTimeout = input<number | undefined>(undefined);
  /** Characters required before the filter narrows the rows. */
  readonly minSearchLength = input(0);
  /** Below `minSearchLength`: show every row (`true`) or none (`false`). */
  readonly showDataBeforeSearch = input(false);
  /** Renders the column header row. */
  readonly showHeader = input(true);
  /** Renders the chevron toggle in the field rail. */
  readonly showDropDownButton = input(true);
  /** Clicking the field opens the popup. */
  readonly openOnFieldClick = input(true);
  /** Shows a loading row instead of the rows — server-side filtering escape hatch. */
  readonly loading = input(false);
  /** In `multiple` mode, caps the rendered chips; the rest fold into `+N more`. */
  readonly maxDisplayedTags = input<number | undefined>(undefined);
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /**
   * Popup width: fixed pixels or `'anchor'` to match the field. With
   * `'anchor'`, all-pixel column widths still set the grid's minimum width
   * (the popup scrolls horizontally rather than squeezing the columns).
   */
  readonly dropdownWidth = input<number | 'anchor'>('anchor');
  /** Scrollable popup height cap; `undefined` = the CSS default (320px). */
  readonly dropdownMaxHeight = input<number | undefined>(undefined);
  /** Windowed row rendering for large lists: `true` or `{ itemHeight, overscan }`. */
  readonly virtualScroll = input<boolean | OgeVirtualScrollOptions>(false);
  /**
   * Remote, paged rows: any `@oge-ui/core` `DataSource` (or an object with
   * the same `load()`, plus an optional `byKey()`). Replaces `items` while
   * set — see the select box.
   */
  readonly dataSource = input<OgeListDataSource<TItem> | undefined>(undefined);
  /** Rows requested per `dataSource` page; `undefined` = config default (30). */
  readonly pageSize = input<number | undefined>(undefined);
  /** Popup visibility — two-way. */
  readonly opened = model(false);
  /**
   * `'auto'` presents the grid as a modal bottom sheet (title, close button,
   * a search field, a Done action in `multiple` mode) on viewports narrower
   * than `adaptiveBreakpoint`. `undefined` = config default (`'none'`).
   */
  readonly adaptiveMode = input<OgeAdaptiveMode | undefined>(undefined);
  /** Viewport width (px) below which `adaptiveMode: 'auto'` applies; `undefined` = config (600). */
  readonly adaptiveBreakpoint = input<number | undefined>(undefined);

  /** Fires on every commit with the selection and its delta. */
  readonly selectionChanged =
    output<OgeMultiColumnComboBoxSelectionChangedEvent<TItem>>();
  /** A row was activated by click or keyboard. */
  readonly rowClick = output<OgeMultiColumnComboBoxRowClickEvent<TItem>>();
  readonly dropDownOpened = output<void>();
  readonly dropDownClosed = output<void>();
  /** Cancelable pre-open event — set `cancel` to keep the popup closed. */
  readonly opening = output<OgeDropDownOpeningEvent>();
  /** Cancelable pre-close event (with its `reason`) — set `cancel` to keep the popup open. */
  readonly closing = output<OgeDropDownClosingEvent>();
  /** Raw search text on every keystroke. */
  readonly searchChanged = output<OgeSelectBoxSearchChangedEvent>();
  /** A `dataSource` page landed (search text, offset, rows, total). */
  readonly pageLoaded = output<OgeListPageLoadedEvent<TItem>>();

  private readonly native = viewChild<ElementRef<HTMLInputElement>>('native');
  private readonly chromeRef = viewChild(OgeFieldChrome, { read: ElementRef });
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('listEl');

  /** DOM id of the popup grid — the combobox's `aria-controls` target. */
  get gridId(): string {
    return `${this.inputId}-grid`;
  }

  protected readonly multiple = computed(
    () => this.selectionMode() === 'multiple',
  );

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

  protected readonly presentation = ogeAdaptivePresentation(
    () => this.adaptiveMode() ?? this.config.adaptiveMode,
    () => this.adaptiveBreakpoint() ?? this.config.adaptiveBreakpoint,
    'sheet',
  );
  protected readonly adaptiveActive = computed(
    () => this.presentation() !== 'popup',
  );

  private readonly rowHeight = computed(
    () =>
      this.virtualOptions()?.itemHeight ??
      OGE_SELECT_OPTION_HEIGHT[this.size()],
  );

  /**
   * Fixed-height window model. The sticky header sits in the same scroller,
   * so the rows' viewport is the list height minus one header row — with
   * that, the window arithmetic and `scrollToIndex` stay exact.
   */
  private readonly virtualizer: ListVirtualizerModel = new ListVirtualizerModel(
    {
      itemCount: () => this.list.visibleItems().length,
      itemHeight: () => this.rowHeight(),
      overscan: () => this.virtualOptions()?.overscan ?? 4,
      viewportHeight: () =>
        (this.adaptiveActive()
          ? adaptiveListViewportHeight()
          : (this.dropdownMaxHeight() ?? DEFAULT_LIST_MAX_HEIGHT)) -
        (this.showHeader() ? OGE_SELECT_OPTION_HEIGHT[this.size()] : 0),
      scrollContainer: () => this.listEl()?.nativeElement ?? null,
    },
  );

  protected readonly virtualWindow = computed(() => this.virtualizer.window());

  protected readonly windowedItems = computed<
    readonly { item: TItem; index: number }[]
  >(() => {
    const { start, end } = this.virtualizer.window();
    return this.list
      .visibleItems()
      .slice(start, end)
      .map((item, offset) => ({ item, index: start + offset }));
  });

  /** Remote paged rows — inert until `dataSource` is bound. */
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

  /** The default display text: the first column's cell. */
  private readonly effectiveDisplayExpr = computed<
    OgeSelectBoxDisplayExpr<TItem> | undefined
  >(() => {
    const explicit = this.displayExpr();
    if (explicit !== undefined) return explicit;
    const first = this.columns()[0];
    return first ? (item: TItem) => this.cellText(first, item) : undefined;
  });

  /** Shared list model (filtering, active row, lazy items, ids). */
  protected readonly list: SelectListEngine<TItem> =
    new SelectListEngine<TItem>({
      inputId: () => this.inputId,
      opened: () => this.opened(),
      items: () => (this.remote.active ? this.remote.items() : this.items()),
      serverFiltering: () => this.remote.active,
      displayExpr: () => this.effectiveDisplayExpr(),
      valueExpr: () => this.valueExpr(),
      disabledExpr: () => this.disabledExpr(),
      imageExpr: () => undefined,
      searchExpr: () => this.searchExpr(),
      searchTexts: (item) =>
        ogeComboSearchStrings(this.columns(), item, this.config.locale),
      searchEnabled: () => this.searchEnabled(),
      searchMode: () => this.searchMode(),
      searchDebounceMs: () =>
        this.searchTimeout() ?? this.config.searchTimeoutMs,
      minSearchLength: () => this.minSearchLength(),
      showDataBeforeSearch: () => this.showDataBeforeSearch(),
      scrollActiveIntoView: (index) => {
        if (this.virtualActive()) this.virtualizer.scrollToIndex(index);
        else this.scrollRowIntoView(index);
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
      if (this.list.activeIndex() < 0) this.initActiveFromSelection();
      this.dropDownOpened.emit();
    },
    onClosed: () => {
      this.list.activeIndex.set(-1);
      this.gridNavigating.set(false);
      this.list.resetSearch();
      this.remote.setSearch(null, true);
      this.virtualizer.reset();
      this.dropDownClosed.emit();
    },
  });

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = this.panelController.panel;

  protected readonly itemsStatus = this.list.itemsStatus;
  protected readonly visibleItems = this.list.visibleItems;
  protected readonly activeIndex = this.list.activeIndex;

  /** The active column within the active row (Left/Right/Home/End). */
  protected readonly activeColumn = signal(0);
  /**
   * The keyboard is in the grid (after Up/Down): Left/Right move between
   * cells instead of the text caret, and the active cell is outlined.
   */
  protected readonly gridNavigating = signal(false);

  protected readonly activeDescendant = computed<string | null>(() => {
    const index = this.list.activeIndex();
    if (!this.opened() || index < 0) return null;
    return this.cellId(index, this.activeColumn());
  });

  /** The committed values as a list, whatever the selection mode. */
  private readonly valueList = computed<readonly unknown[]>(() => {
    const value = this.value();
    if (this.multiple()) return Array.isArray(value) ? value : [];
    return value == null ? [] : [value];
  });

  /** Selected rows resolved from `value` (loaded, lazy or remembered rows). */
  readonly selectedItems = computed<readonly TItem[]>(() => {
    const pool = this.list.resolvedItems();
    const remote = this.remote.active;
    return this.valueList()
      .map(
        (entry) =>
          pool.find((item) => Object.is(this.list.itemValue(item), entry)) ??
          (remote ? this.remote.lookup(entry) : undefined),
      )
      .filter((item): item is TItem => item !== undefined);
  });

  /** The single-mode selected row (`null` when empty or in `multiple` mode). */
  readonly selectedItem = computed<TItem | null>(() =>
    this.multiple() ? null : (this.selectedItems()[0] ?? null),
  );

  protected readonly inputText = computed(() => {
    const search = this.list.searchText();
    if (search !== null) return search;
    if (this.multiple()) return '';
    const item = this.selectedItem();
    return item === null ? '' : this.displayOf(item);
  });

  private readonly overflow = computed(() =>
    ogeChipOverflow(this.selectedItems().length, this.maxDisplayedTags()),
  );

  protected readonly visibleChips = computed(() =>
    this.selectedItems()
      .slice(0, this.overflow().shown)
      .map((item, valueIndex) => ({ item, valueIndex })),
  );

  protected readonly overflowCount = computed(() => this.overflow().hidden);

  protected readonly moreText = computed(() =>
    formatPattern(this.msg().moreTags, {
      count: String(this.overflowCount()),
    }),
  );

  protected readonly gridTemplate = computed(() =>
    ogeComboGridTemplate(this.columns()),
  );

  protected readonly fixedWidth = computed(() =>
    ogeComboFixedWidth(this.columns()),
  );

  protected readonly busy = computed(
    () =>
      this.loading() ||
      this.itemsStatus() === 'loading' ||
      this.remote.status() === 'loading',
  );

  /** `aria-rowcount`: header + rows, the server total when known, `-1` while open-ended. */
  protected readonly rowCount = computed(() => {
    const header = this.showHeader() ? 1 : 0;
    if (!this.remote.active) return this.visibleItems().length + header;
    const total = this.remote.totalCount();
    if (total !== undefined) return total + header;
    return this.remote.hasMore() ? -1 : this.visibleItems().length + header;
  });

  override readonly dropdown: OgeInputDropDownApi =
    this.panelController.dropDownApi(
      () => this.showDropDownButton() && !this.effectiveDisabled(),
      () => this.toggle(),
    );

  constructor() {
    super();
    effect(() => {
      const items = this.items();
      untracked(() => {
        void items;
        this.list.syncItemsSource();
        if (this.opened()) this.list.ensureItemsLoaded();
      });
    });
    effect(() => {
      this.dataSource();
      untracked(() => {
        this.remote.syncSource();
        if (this.opened()) this.remote.open();
      });
    });
    effect(() => {
      const values = this.valueList();
      if (!this.remote.active) return;
      untracked(() => {
        for (const value of values) this.remote.resolve(value);
      });
    });
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
    // filtering re-anchors the active row; appended pages keep it
    let previousCount = 0;
    effect(() => {
      const count = this.list.visibleItems().length;
      untracked(() => {
        const appended =
          this.remote.active &&
          count > previousCount &&
          this.list.activeIndex() >= 0;
        previousCount = count;
        if (!this.opened() || appended) return;
        if (
          this.list.activeIndex() >= count ||
          this.list.searchText() !== null
        ) {
          this.list.setActive(this.list.edgeEnabledIndex(1));
        }
      });
    });
    // a narrower column set clamps the active column
    effect(() => {
      const count = this.columns().length;
      untracked(() => {
        if (this.activeColumn() >= count) this.activeColumn.set(0);
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

  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  /** Re-requests the current search from `dataSource`, dropping every cached page. */
  reload(): void {
    this.remote.reload();
  }

  // --- template helpers ------------------------------------------------------

  protected captionOf(column: OgeComboBoxColumn<TItem>): string {
    return ogeComboColumnCaption(column);
  }

  protected cellText(column: OgeComboBoxColumn<TItem>, item: TItem): string {
    return ogeComboCellText(column, item, this.config.locale);
  }

  protected cellContext(
    column: OgeComboBoxColumn<TItem>,
    item: TItem,
    rowIndex: number,
  ): OgeComboBoxCellTemplateContext<TItem> {
    return {
      $implicit: item,
      value: ogeComboCellValue(column, item),
      text: this.cellText(column, item),
      rowIndex,
    };
  }

  protected rowId(index: number): string {
    return `${this.inputId}-row-${index}`;
  }

  protected cellId(index: number, column: number): string {
    return `${this.inputId}-cell-${index}-${column}`;
  }

  protected displayOf(item: TItem): string {
    return this.list.displayOf(item);
  }

  protected isItemDisabled(item: TItem): boolean {
    return this.list.isItemDisabled(item);
  }

  protected isSelected(item: TItem): boolean {
    const entry = this.list.itemValue(item);
    return this.valueList().some((candidate) => Object.is(candidate, entry));
  }

  // --- selection -------------------------------------------------------------

  protected onRowClick(item: TItem, index: number, event: Event): void {
    if (this.isItemDisabled(item)) return;
    this.rowClick.emit({ item, index, event });
    this.pick(item, event);
  }

  private pick(item: TItem, event: Event): void {
    if (this.remote.active) this.remote.remember(item);
    const entry = this.list.itemValue(item);
    const before = this.selectedItems();
    if (this.multiple()) {
      const current = this.valueList();
      const exists = current.some((candidate) => Object.is(candidate, entry));
      const next = exists
        ? current.filter((candidate) => !Object.is(candidate, entry))
        : [...current, entry];
      this.commitNow(next, event);
      this.selectionChanged.emit({
        selectedItems: exists
          ? before.filter((candidate) => candidate !== item)
          : [...before, item],
        addedItems: exists ? [] : [item],
        removedItems: exists ? [item] : [],
      });
      this.list.resetSearch();
      this.remote.setSearch(null, true);
      if (!this.adaptiveActive()) this.focus();
      return;
    }
    const previous = before[0];
    this.commitNow(entry, event);
    if (previous !== item) {
      this.selectionChanged.emit({
        selectedItems: [item],
        addedItems: [item],
        removedItems: previous === undefined ? [] : [previous],
      });
    }
    this.list.resetSearch();
    this.close('select');
    this.focus();
  }

  protected removeAt(valueIndex: number, event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const items = this.selectedItems();
    const removed = items[valueIndex];
    const next = this.valueList().filter((_, index) => index !== valueIndex);
    this.commitNow(next, event);
    if (removed !== undefined) {
      this.selectionChanged.emit({
        selectedItems: items.filter((_, index) => index !== valueIndex),
        addedItems: [],
        removedItems: [removed],
      });
    }
    this.focus();
  }

  private initActiveFromSelection(): void {
    this.list.activateItemOrFirst(this.selectedItems()[0] ?? null);
  }

  private commitActive(event: Event): void {
    const items = this.list.visibleItems();
    const index = this.list.activeIndex();
    if (index < 0 || index >= items.length) {
      if (!this.multiple()) this.close();
      return;
    }
    this.onRowClick(items[index], index, event);
  }

  // --- template handlers -----------------------------------------------------

  protected onFieldClick(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.opened()) {
      if (this.openOnFieldClick()) this.open();
      return;
    }
    if (!this.searchEnabled()) this.close();
  }

  protected onNativeInput(event: Event): void {
    if (!this.searchEnabled()) return;
    const text = (event.target as HTMLInputElement).value;
    this.gridNavigating.set(false);
    this.list.setSearch(text);
    this.remote.setSearch(text);
    this.inputChange.emit({ text, event });
    this.searchChanged.emit({ text });
    if (!this.opened()) this.open();
  }

  protected onRowHover(index: number, item: TItem): void {
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

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const open = this.opened();
    const rtl = getComputedStyle(this.hostEl.nativeElement).direction === 'rtl';
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          this.open();
          return;
        }
        if (event.altKey && event.key === 'ArrowUp') {
          this.commitActive(event);
          return;
        }
        this.gridNavigating.set(true);
        this.list.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'PageDown':
      case 'PageUp': {
        if (!open) return;
        event.preventDefault();
        this.gridNavigating.set(true);
        this.list.moveActive(event.key === 'PageDown' ? 10 : -10);
        return;
      }
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Home':
      case 'End': {
        // APG grid popup: once the keyboard is in the grid, these move
        // between cells; before that they belong to the text caret
        const inGrid =
          open &&
          this.list.activeIndex() >= 0 &&
          (this.gridNavigating() || !this.searchEnabled());
        if (!inGrid) return;
        event.preventDefault();
        if ((event.key === 'Home' || event.key === 'End') && event.ctrlKey) {
          this.list.setActive(
            this.list.edgeEnabledIndex(event.key === 'Home' ? 1 : -1),
          );
          return;
        }
        this.activeColumn.set(
          ogeComboColumnTarget(
            this.activeColumn(),
            event.key,
            this.columns().length,
            rtl,
          ),
        );
        return;
      }
      case 'Enter': {
        if (open) {
          event.preventDefault();
          this.commitActive(event);
          return;
        }
        this.handleEnterKey(event);
        return;
      }
      case ' ': {
        if (!open) {
          if (this.searchEnabled()) return;
          event.preventDefault();
          this.open();
          return;
        }
        if (this.searchEnabled() && !this.gridNavigating()) return;
        event.preventDefault();
        this.commitActive(event);
        return;
      }
      case 'Backspace': {
        if (
          this.multiple() &&
          (this.list.searchText() ?? '') === '' &&
          this.valueList().length > 0
        ) {
          event.preventDefault();
          this.removeAt(this.valueList().length - 1, event);
        }
        return;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          this.close('escape');
          return;
        }
        if (this.list.searchText()) {
          event.preventDefault();
          this.list.resetSearch();
          this.remote.setSearch(null, true);
        }
        return;
      }
      case 'Tab': {
        if (open && !this.adaptiveActive()) this.close('tab');
        return;
      }
    }
  }

  /** Keyboard of the non-searchable adaptive grid (it holds DOM focus). */
  protected onSheetListKeydown(event: KeyboardEvent): void {
    if (!this.adaptiveActive() || this.searchEnabled()) return;
    if (event.target !== event.currentTarget) return;
    this.onKeydown(event);
  }

  protected override handleBlur(event: FocusEvent): void {
    if (this.opened() && this.adaptiveActive()) return;
    super.handleBlur(event);
  }

  /** Non-virtual rows scroll by their element (the sticky header is padded out). */
  private scrollRowIntoView(index: number): void {
    const id = this.rowId(index);
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => (callback(0), 0);
    schedule(() =>
      document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' }),
    );
  }

  private scheduleFillShortList(): void {
    if (typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(() => {
      const el = this.listEl()?.nativeElement;
      if (!el || el.clientHeight === 0 || !this.opened()) return;
      if (isNearScrollEnd(el)) this.remote.loadMore();
    });
  }

  private allowClose(reason: OgeDropDownCloseReason): boolean {
    return ogeAllowDropDownClose((event) => this.closing.emit(event), reason);
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

  protected emptyValue(): unknown {
    return this.multiple() ? [] : null;
  }

  protected valueIsEmpty(value: unknown): boolean {
    if (value == null) return true;
    return Array.isArray(value) && value.length === 0;
  }

  protected override normalizeWrite(value: unknown): unknown {
    if (this.multiple()) return Array.isArray(value) ? value : [];
    return value ?? null;
  }
}

/** Maps a panel-initiated close onto the editor's `closing` reasons. */
function panelCloseReason(reason: OgePopupCloseReason): OgeDropDownCloseReason {
  return reason === 'outside' || reason === 'escape' || reason === 'tab'
    ? reason
    : 'api';
}
