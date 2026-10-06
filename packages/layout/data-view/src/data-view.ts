import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  LOCALE_ID,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChild,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { ogeFormatMessage } from '@oge-ui/core';
import {
  getOgeLiveAnnouncer,
  ogeDataViewClampPage,
  ogeDataViewDisplayText,
  ogeDataViewFormat,
  ogeDataViewInfoText,
  ogeDataViewIsEllipsis,
  ogeDataViewKey,
  ogeDataViewKeyIntent,
  ogeDataViewMeasureColumns,
  ogeDataViewPageCount,
  ogeDataViewPageItems,
  ogeDataViewPagerWindow,
  ogeDataViewProcess,
  ogeDataViewRole,
  ogeDataViewStyleVars,
  ogeDataViewTabStop,
  ogeDataViewToggleSelection,
  ogeIsRtl,
  OGE_DATA_VIEW_DEFAULT_MIN_ITEM_WIDTH,
  type OgeDataViewPagerEntry,
} from '@oge-ui/behavior';
import { OGE_DATA_VIEW_CONFIG, type OgeDataViewMessages } from './config';
import {
  OgeDataViewEmptyTemplate,
  OgeDataViewItemTemplate,
  OgeDataViewListItemTemplate,
  type OgeDataViewItemTemplateContext,
} from './templates';
import type {
  OgeDataViewDisplayExpr,
  OgeDataViewItemClickEvent,
  OgeDataViewKey,
  OgeDataViewKeyExpr,
  OgeDataViewLayout,
  OgeDataViewLayoutChangedEvent,
  OgeDataViewOptionsChangedEvent,
  OgeDataViewPageChangedEvent,
  OgeDataViewSearchExpr,
  OgeDataViewSelectionChangedEvent,
  OgeDataViewSelectionMode,
  OgeDataViewSort,
  OgeDataViewSortChangedEvent,
  OgeDataViewSortOption,
} from './data-view-types';

let nextId = 0;

const SKELETON_COUNT = 6;

/**
 * A templated collection of items in responsive columns or one per row, with
 * a layout switch, search, sorting, a filter hook, paging and optional
 * selection:
 *
 * ```html
 * <oge-data-view
 *   [items]="products"
 *   [pageSize]="8"
 *   [showLayoutSwitch]="true"
 *   [searchEnabled]="true"
 *   [sortOptions]="[{ field: 'name', label: 'Name' }, { field: 'price', label: 'Price' }]"
 *   ariaLabel="Products"
 * >
 *   <ng-template ogeDataViewItemTemplate let-item>
 *     <h3>{{ item.name }}</h3>
 *     <p>{{ item.price }}</p>
 *   </ng-template>
 * </oge-data-view>
 * ```
 *
 * No WAI-ARIA APG pattern exists for a data view, so it is composed from list
 * primitives: without selection a `list` of `listitem`s (templates may hold
 * links and buttons), with `selectionMode` an APG **listbox** of `option`s with
 * one roving tab stop — arrows walk the items in reading order (mirrored in
 * RTL), Up / Down jump a row, PageUp / PageDown turn the page, Space / Enter
 * toggle. Options are leaves for assistive technology, so a selectable view's
 * template must stay non-interactive. Columns come from a container query on
 * the view's own width (`minItemWidth`), never the window.
 *
 * The built-in pager draws from `@oge-ui/behavior`'s pagination decisions; an
 * app wanting the full `oge-pagination` bar binds it to `[(pageIndex)]` and
 * sets `showPager` to `false` (the layout package does not depend on
 * navigation). With `remoteOperations` the view neither sorts, searches nor
 * pages: it emits `optionsChanged` and renders `items` as the current page of
 * `itemCount` items.
 */
@Component({
  selector: 'oge-data-view',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-data-view',
    '[class.oge-data-view-layout-grid]': "resolvedLayout() === 'grid'",
    '[class.oge-data-view-layout-list]': "resolvedLayout() === 'list'",
    '[class.oge-data-view-fixed-columns]': '!!columns()',
    '[class.oge-data-view-loading]': 'loading()',
    '[style]': 'styleVars()',
    '(click)': 'onHostClick($event)',
  },
  styleUrl: './data-view.scss',
  template: `
    <div class="oge-data-view-header">
      <ng-content select="[ogeDataViewToolbar]" />
      @if (searchEnabled()) {
        <input
          type="search"
          class="oge-data-view-search"
          [attr.aria-label]="msg().search"
          [attr.aria-controls]="itemsId"
          [placeholder]="msg().searchPlaceholder"
          [value]="searchValue()"
          (input)="onSearchInput($event)"
        />
      }
      @if (sortOptions().length) {
        <label class="oge-data-view-sort">
          <span class="oge-data-view-sort-label">{{ msg().sortBy }}</span>
          <select
            class="oge-data-view-sort-select"
            [attr.aria-controls]="itemsId"
            (change)="onSortFieldChange($event)"
          >
            <option value="" [selected]="!sort()">{{ msg().sortNone }}</option>
            @for (option of sortOptions(); track option.field) {
              <option
                [value]="option.field"
                [selected]="sort()?.field === option.field"
              >
                {{ option.label }}
              </option>
            }
          </select>
        </label>
        <button
          type="button"
          class="oge-data-view-tool oge-data-view-direction"
          [disabled]="!sort()"
          [attr.aria-pressed]="sort()?.direction === 'desc'"
          [attr.aria-label]="msg().descending"
          [attr.title]="
            sort()?.direction === 'desc' ? msg().descending : msg().ascending
          "
          (click)="toggleDirection($event)"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M7 4v16M3 16l4 4 4-4M14 6h7M14 11h5M14 16h3" />
          </svg>
        </button>
      }
      @if (showLayoutSwitch()) {
        <div
          class="oge-data-view-layout-switch"
          role="group"
          [attr.aria-label]="msg().layoutSwitch"
        >
          <button
            type="button"
            class="oge-data-view-tool"
            [attr.aria-pressed]="resolvedLayout() === 'grid'"
            [attr.aria-label]="msg().gridLayout"
            [attr.title]="msg().gridLayout"
            (click)="setLayout('grid', $event)"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
              <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
              <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
              <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
            </svg>
          </button>
          <button
            type="button"
            class="oge-data-view-tool"
            [attr.aria-pressed]="resolvedLayout() === 'list'"
            [attr.aria-label]="msg().listLayout"
            [attr.title]="msg().listLayout"
            (click)="setLayout('list', $event)"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"
              />
            </svg>
          </button>
        </div>
      }
    </div>

    @if (pageItems().length) {
      @if (role() === 'listbox') {
        <div
          class="oge-data-view-items"
          role="listbox"
          [id]="itemsId"
          [attr.aria-label]="ariaLabel() ?? msg().dataView"
          [attr.aria-multiselectable]="
            selectionMode() === 'multiple' ? true : null
          "
          [attr.aria-busy]="loading() || null"
        >
          @for (item of pageItems(); track keys()[$index]; let i = $index) {
            <div
              role="option"
              class="oge-data-view-item oge-data-view-option"
              [class.oge-data-view-item-selected]="isSelected(i)"
              [attr.aria-selected]="isSelected(i)"
              [attr.data-oge-data-view-index]="i"
              [tabindex]="i === tabStop() ? 0 : -1"
              (keydown)="onOptionKeydown($event, i)"
              (focus)="focusIndex.set(i)"
            >
              <span class="oge-data-view-check" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  focusable="false"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <ng-container
                *ngTemplateOutlet="body; context: { item: item, index: i }"
              />
            </div>
          }
        </div>
      } @else {
        <div
          class="oge-data-view-items"
          role="list"
          [id]="itemsId"
          [attr.aria-label]="ariaLabel() ?? null"
          [attr.aria-busy]="loading() || null"
        >
          @for (item of pageItems(); track keys()[$index]; let i = $index) {
            <div
              role="listitem"
              class="oge-data-view-item"
              [attr.data-oge-data-view-index]="i"
            >
              <ng-container
                *ngTemplateOutlet="body; context: { item: item, index: i }"
              />
            </div>
          }
        </div>
      }
    } @else if (loading()) {
      <div class="oge-data-view-items" [id]="itemsId" aria-busy="true">
        <span class="oge-sr-only">{{ msg().loading }}</span>
        @for (bone of skeleton; track bone) {
          <div class="oge-data-view-item oge-data-view-bone" aria-hidden="true">
            <span class="oge-data-view-bone-line"></span>
            <span
              class="oge-data-view-bone-line oge-data-view-bone-short"
            ></span>
          </div>
        }
      </div>
    } @else {
      <div class="oge-data-view-empty" [id]="itemsId">
        @if (emptyTemplate(); as tpl) {
          <ng-container
            *ngTemplateOutlet="
              tpl.template;
              context: { $implicit: filtered(), text: emptyText() }
            "
          />
        } @else {
          {{ emptyText() }}
        }
      </div>
    }

    @if (pagerVisible()) {
      <div
        class="oge-data-view-pager"
        role="group"
        [attr.aria-label]="msg().pager"
      >
        <button
          type="button"
          class="oge-data-view-page-btn"
          data-oge-data-view-pager="prev"
          [disabled]="currentPage() === 0"
          [attr.aria-label]="msg().previousPage"
          [attr.title]="msg().previousPage"
          (click)="pagerClick(currentPage() - 1, $event)"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m10 3.5-4.5 4.5L10 12.5" />
          </svg>
        </button>
        @for (entry of pagerWindow(); track $index) {
          @if (isEllipsis(entry)) {
            <span class="oge-data-view-ellipsis" aria-hidden="true">…</span>
          } @else {
            <button
              type="button"
              class="oge-data-view-page-btn oge-data-view-page"
              [class.oge-data-view-page-current]="entry === currentPage()"
              [attr.data-oge-data-view-page]="entry"
              [attr.aria-current]="entry === currentPage() ? 'page' : null"
              [attr.aria-label]="pageLabel(entry)"
              (click)="pagerClick(+entry, $event)"
            >
              {{ +entry + 1 }}
            </button>
          }
        }
        <button
          type="button"
          class="oge-data-view-page-btn"
          data-oge-data-view-pager="next"
          [disabled]="currentPage() >= pageCount() - 1"
          [attr.aria-label]="msg().nextPage"
          [attr.title]="msg().nextPage"
          (click)="pagerClick(currentPage() + 1, $event)"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m6 3.5 4.5 4.5L6 12.5" />
          </svg>
        </button>
        @if (showPageInfo()) {
          <span class="oge-data-view-info">{{ infoText() }}</span>
        }
      </div>
    }

    <ng-template #body let-item="item" let-index="index">
      @if (activeTemplate(); as tpl) {
        <ng-container
          *ngTemplateOutlet="
            tpl.template;
            context: templateContext(item, index)
          "
        />
      } @else {
        <span class="oge-data-view-text">{{ displayText(item) }}</span>
      }
    </ng-template>
  `,
})
export class OgeDataView<T = unknown> {
  private readonly config = inject(OGE_DATA_VIEW_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly localeId = inject(LOCALE_ID);
  private readonly announcer = isPlatformBrowser(inject(PLATFORM_ID))
    ? getOgeLiveAnnouncer(inject(DOCUMENT))
    : getOgeLiveAnnouncer(null);

  /** Id of the items container — the search, sort and pager control it. */
  protected readonly itemsId = `oge-data-view-items-${nextId++}`;
  protected readonly skeleton = Array.from(
    { length: SKELETON_COUNT },
    (_, i) => i,
  );

  /** The items, in their own order. With `remoteOperations`: the current page. */
  readonly items = input<readonly T[]>([]);
  /** Field (dot paths allowed) or function giving each item's key. Default `'id'`. */
  readonly keyExpr = input<OgeDataViewKeyExpr<T>>('id');
  /** Field or function giving an item's text when no template is projected. */
  readonly displayExpr = input<OgeDataViewDisplayExpr<T> | undefined>(
    undefined,
  );
  /** `grid` (responsive columns) or `list` (one per row), two-way; starts from the config, then `grid`. */
  readonly layout = model<OgeDataViewLayout>(this.config.layout ?? 'grid');
  /** Renders the grid / list toggle group in the header. */
  readonly showLayoutSwitch = input(false);
  /** Minimum width of a grid cell in px before another column fits (container query). Default 240. */
  readonly minItemWidth = input<number | undefined>(undefined);
  /** A fixed column count for the grid layout (collapses to one column in a narrow container). */
  readonly columns = input<number | undefined>(undefined);
  /** Gap between items — px number or any CSS length. Default 16px. */
  readonly gap = input<number | string | undefined>(undefined);
  /** Items per page; `0` (default) shows every item. Falls back to the config. */
  readonly pageSize = input<number | undefined>(undefined);
  /** 0-based current page (two-way). */
  readonly pageIndex = model(0);
  /** Total item count for `remoteOperations`; defaults to the processed items' length. */
  readonly itemCount = input<number | undefined>(undefined);
  /** Renders the built-in pager when there is more than one page. */
  readonly showPager = input(true);
  /** Renders the `{from}–{to} of {itemCount}` text beside the pager. */
  readonly showPageInfo = input(true);
  /** Choices of the built-in sort select; empty hides it. */
  readonly sortOptions = input<readonly OgeDataViewSortOption[]>([]);
  /** The active sort (two-way); `null` keeps the items' order. */
  readonly sort = model<OgeDataViewSort | null>(null);
  /** A predicate the items must pass (client-side only). */
  readonly filter = input<((item: T) => boolean) | null>(null);
  /** Renders the search field in the header. */
  readonly searchEnabled = input(false);
  /** The search text (two-way). Words match case-, accent- and locale-insensitively. */
  readonly searchValue = model('');
  /** Field(s) or function the search matches; default every primitive field. */
  readonly searchExpr = input<OgeDataViewSearchExpr<T> | undefined>(undefined);
  /** The app sorts, searches and pages: listen to `optionsChanged`, pass the page as `items` and the total as `itemCount`. */
  readonly remoteOperations = input(false);
  /** `none` (a list), `single` or `multiple` (an APG listbox). */
  readonly selectionMode = input<OgeDataViewSelectionMode>('none');
  /** Keys of the selected items (two-way). */
  readonly selectedKeys = model<readonly OgeDataViewKey[]>([]);
  /** Shows skeleton placeholders (no items yet) or marks the items `aria-busy`. */
  readonly loading = input(false);
  /** BCP 47 locale of the sort comparison; falls back to the config, then `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);
  /** Accessible name of the items; a listbox falls back to the `dataView` message. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** The layout changed through the switch or `setLayout()`. */
  readonly layoutChanged = output<OgeDataViewLayoutChangedEvent>();
  /** The page changed through the pager, PageUp / PageDown or `goToPage()`. */
  readonly pageChanged = output<OgeDataViewPageChangedEvent>();
  /** The sort changed through the built-in controls. */
  readonly sortChanged = output<OgeDataViewSortChangedEvent>();
  /** The selection changed through a click, Space / Enter, Ctrl+A or a method. */
  readonly selectionChanged = output<OgeDataViewSelectionChangedEvent<T>>();
  /** An item was clicked (or activated with Enter / Space in a listbox). */
  readonly itemClick = output<OgeDataViewItemClickEvent<T>>();
  /** Sort, search or page changed — the request to answer under `remoteOperations`. */
  readonly optionsChanged = output<OgeDataViewOptionsChangedEvent>();

  protected readonly itemTemplate = contentChild(OgeDataViewItemTemplate);
  protected readonly listItemTemplate = contentChild(
    OgeDataViewListItemTemplate,
  );
  protected readonly emptyTemplate = contentChild(OgeDataViewEmptyTemplate);

  protected readonly msg = computed<OgeDataViewMessages>(
    () => this.config.messages,
  );
  protected readonly resolvedLayout = computed<OgeDataViewLayout>(() =>
    this.layout(),
  );
  private readonly resolvedPageSize = computed(() =>
    Math.max(0, Math.floor(this.pageSize() ?? this.config.pageSize ?? 0)),
  );
  private readonly resolvedLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.localeId,
  );
  protected readonly styleVars = computed(() =>
    ogeDataViewStyleVars({
      minItemWidth:
        this.minItemWidth() ??
        this.config.minItemWidth ??
        OGE_DATA_VIEW_DEFAULT_MIN_ITEM_WIDTH,
      columns: this.columns(),
      gap: this.gap(),
    }),
  );

  protected readonly role = computed(() =>
    ogeDataViewRole(this.selectionMode()),
  );

  /** Items after filter → search → sort (the items as given when remote). */
  private readonly processed = computed<readonly T[]>(() =>
    this.remoteOperations()
      ? this.items()
      : ogeDataViewProcess(this.items(), {
          filter: this.filter(),
          searchValue: this.searchValue(),
          searchExpr: this.searchExpr(),
          sort: this.sort(),
          locale: this.resolvedLocale(),
        }),
  );
  private readonly total = computed(() =>
    this.remoteOperations()
      ? (this.itemCount() ?? this.items().length)
      : this.processed().length,
  );
  protected readonly pageCount = computed(() =>
    ogeDataViewPageCount(this.total(), this.resolvedPageSize()),
  );
  protected readonly currentPage = computed(() =>
    ogeDataViewClampPage(this.pageIndex(), this.pageCount()),
  );
  protected readonly pageItems = computed<readonly T[]>(() =>
    this.remoteOperations()
      ? this.items()
      : ogeDataViewPageItems(
          this.processed(),
          this.currentPage(),
          this.resolvedPageSize(),
        ),
  );
  protected readonly keys = computed(() => {
    const keyExpr = this.keyExpr();
    const offset = this.remoteOperations()
      ? 0
      : this.currentPage() * this.resolvedPageSize();
    return this.pageItems().map((item, i) =>
      ogeDataViewKey(item, keyExpr, offset + i),
    );
  });
  protected readonly filtered = computed(
    () => this.items().length > 0 && this.total() === 0,
  );
  protected readonly emptyText = computed(() =>
    this.filtered() ? this.msg().noResults : this.msg().noData,
  );
  protected readonly pagerVisible = computed(
    () =>
      this.showPager() && this.resolvedPageSize() > 0 && this.pageCount() > 1,
  );
  protected readonly pagerWindow = computed(() =>
    ogeDataViewPagerWindow(this.currentPage(), this.pageCount()),
  );
  protected readonly infoText = computed(() =>
    ogeDataViewInfoText(this.msg(), {
      pageIndex: this.currentPage(),
      pageSize: this.resolvedPageSize(),
      itemCount: this.total(),
    }),
  );
  protected readonly activeTemplate = computed(() =>
    this.resolvedLayout() === 'list'
      ? (this.listItemTemplate() ?? this.itemTemplate())
      : this.itemTemplate(),
  );

  /** Last focused option of the listbox page. */
  protected readonly focusIndex = signal(-1);
  /** The listbox's roving tab stop — valid on the first paint. */
  protected readonly tabStop = computed(() =>
    ogeDataViewTabStop(this.keys(), this.focusIndex(), this.selectedKeys()),
  );

  /** Focuses the item at `index` of the page (default: the tab stop) in a selectable view. */
  focus(index?: number): void {
    if (this.role() !== 'listbox') {
      this.host.nativeElement
        .querySelector<HTMLElement>(
          '.oge-data-view-items a, .oge-data-view-items button, .oge-data-view-items [tabindex]',
        )
        ?.focus();
      return;
    }
    this.focusOption(index ?? this.tabStop());
  }

  /** Shows page `index` (clamped) and emits `pageChanged` when it changed. */
  goToPage(index: number): void {
    this.changePage(index, undefined);
  }

  /** Switches the layout and emits `layoutChanged` when it changed. */
  setLayout(layout: OgeDataViewLayout, event?: Event): void {
    const previousLayout = this.resolvedLayout();
    if (layout === previousLayout) return;
    this.layout.set(layout);
    this.layoutChanged.emit({ layout, previousLayout, event });
  }

  /** Deselects everything and emits `selectionChanged` when something was selected. */
  clearSelection(): void {
    this.commitSelection([], undefined, undefined);
  }

  /** Selects every item that passes the filter and search (multiple selection only). */
  selectAll(): void {
    if (this.selectionMode() !== 'multiple') return;
    const keyExpr = this.keyExpr();
    this.commitSelection(
      this.processed().map((item, i) => ogeDataViewKey(item, keyExpr, i)),
      undefined,
      undefined,
    );
  }

  protected isSelected(index: number): boolean {
    return (
      this.selectionMode() !== 'none' &&
      this.selectedKeys().includes(this.keys()[index])
    );
  }

  protected isEllipsis(entry: OgeDataViewPagerEntry): boolean {
    return ogeDataViewIsEllipsis(entry);
  }

  protected pageLabel(entry: OgeDataViewPagerEntry): string {
    return ogeDataViewFormat(this.msg().page, { page: +entry + 1 });
  }

  protected displayText(item: T): string {
    return ogeDataViewDisplayText(item, this.displayExpr());
  }

  protected templateContext(
    item: T,
    index: number,
  ): OgeDataViewItemTemplateContext<T> {
    return {
      $implicit: item,
      index,
      layout: this.resolvedLayout(),
      selected: this.isSelected(index),
    };
  }

  // --- header --------------------------------------------------------------

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue.set(value);
    this.resetPage();
    this.emitOptions();
    if (!this.remoteOperations()) {
      this.announcer.announce(
        ogeFormatMessage(
          this.msg().results,
          { count: this.total() },
          this.resolvedLocale(),
        ),
      );
    }
  }

  protected onSortFieldChange(event: Event): void {
    const field = (event.target as HTMLSelectElement).value;
    const previous = this.sort();
    this.applySort(
      field ? { field, direction: previous?.direction ?? 'asc' } : null,
      event,
    );
  }

  protected toggleDirection(event: Event): void {
    const sort = this.sort();
    if (!sort) return;
    this.applySort(
      {
        field: sort.field,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      },
      event,
    );
  }

  private applySort(sort: OgeDataViewSort | null, event: Event): void {
    const previousSort = this.sort();
    this.sort.set(sort);
    this.sortChanged.emit({ sort, previousSort, event });
    this.resetPage();
    this.emitOptions();
  }

  // --- paging --------------------------------------------------------------

  protected pagerClick(index: number, event: Event): void {
    if (!this.changePage(index, event)) return;
    // keep focus in the pager: on the clicked button unless it just became
    // disabled (prev on the first page, next on the last), else the current
    // page's button
    const button = event.currentTarget as HTMLButtonElement | null;
    afterNextRender(
      () => {
        const host = this.host.nativeElement;
        if (button?.isConnected && !button.disabled) {
          button.focus();
          return;
        }
        host
          .querySelector<HTMLElement>(
            `[data-oge-data-view-page="${this.currentPage()}"]`,
          )
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  /** Commits a page change; `true` when the page actually changed. */
  private changePage(index: number, event: Event | undefined): boolean {
    const previousPageIndex = this.currentPage();
    const pageIndex = ogeDataViewClampPage(index, this.pageCount());
    if (pageIndex === previousPageIndex) return false;
    this.pageIndex.set(pageIndex);
    this.focusIndex.set(-1);
    this.pageChanged.emit({
      pageIndex,
      previousPageIndex,
      pageSize: this.resolvedPageSize(),
      event,
    });
    this.emitOptions();
    this.announcer.announce(
      ogeDataViewFormat(this.msg().pageAnnouncement, {
        page: pageIndex + 1,
        pageCount: this.pageCount(),
      }),
    );
    return true;
  }

  private resetPage(): void {
    if (this.pageIndex() !== 0) this.pageIndex.set(0);
    this.focusIndex.set(-1);
  }

  private emitOptions(): void {
    this.optionsChanged.emit({
      sort: this.sort(),
      searchValue: this.searchValue(),
      pageIndex: this.currentPage(),
      pageSize: this.resolvedPageSize(),
    });
  }

  // --- items ---------------------------------------------------------------

  protected onHostClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    const el = target?.closest?.('[data-oge-data-view-index]');
    if (!el || !this.host.nativeElement.contains(el)) return;
    // a nested data view owns its own clicks
    if (el.closest('.oge-data-view') !== this.host.nativeElement) return;
    const index = Number(el.getAttribute('data-oge-data-view-index'));
    this.activate(index, event);
  }

  protected onOptionKeydown(event: KeyboardEvent, index: number): void {
    const intent = ogeDataViewKeyIntent(event, {
      index,
      count: this.pageItems().length,
      columns: this.measureColumns(),
      rtl: ogeIsRtl(this.host.nativeElement),
      multiple: this.selectionMode() === 'multiple',
    });
    if (!intent) return;
    event.preventDefault();
    switch (intent.type) {
      case 'move':
        this.focusOption(intent.index);
        return;
      case 'page': {
        if (!this.changePage(this.currentPage() + intent.delta, event)) return;
        afterNextRender(
          () => this.focusOption(Math.min(index, this.pageItems().length - 1)),
          { injector: this.injector },
        );
        return;
      }
      case 'toggle':
        this.activate(index, event);
        return;
      case 'selectAll':
        this.selectAll();
        return;
    }
  }

  private activate(index: number, event: Event): void {
    const item = this.pageItems()[index];
    if (item === undefined) return;
    const key = this.keys()[index];
    if (this.role() === 'listbox') {
      this.focusIndex.set(index);
      this.commitSelection(
        ogeDataViewToggleSelection(
          this.selectionMode(),
          this.selectedKeys(),
          key,
        ),
        item,
        event,
      );
    }
    this.itemClick.emit({ item, index, key, event });
  }

  private commitSelection(
    selectedKeys: OgeDataViewKey[],
    item: T | undefined,
    event: Event | undefined,
  ): void {
    const previousKeys = [...this.selectedKeys()];
    if (
      previousKeys.length === selectedKeys.length &&
      previousKeys.every((key, i) => key === selectedKeys[i])
    )
      return;
    this.selectedKeys.set(selectedKeys);
    this.selectionChanged.emit({ selectedKeys, previousKeys, item, event });
  }

  private options(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '.oge-data-view-option',
      ),
    );
  }

  private measureColumns(): number {
    return this.resolvedLayout() === 'list'
      ? 1
      : ogeDataViewMeasureColumns(this.options());
  }

  private focusOption(index: number): void {
    if (index < 0) return;
    this.focusIndex.set(index);
    this.host.nativeElement
      .querySelector<HTMLElement>(`[data-oge-data-view-index="${index}"]`)
      ?.focus();
  }
}
