import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  LOCALE_ID,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
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
import { DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { createTypeAheadBuffer, ogeFormatMessage } from '@oge-ui/core';
import {
  beginPointerGesture,
  getOgeLiveAnnouncer,
  ogeIsRtl,
  ogeListViewActionFromTarget,
  ogeListViewActionShortcuts,
  ogeListViewActionsText,
  ogeListViewBuildRows,
  ogeListViewClick,
  ogeListViewExprValue,
  ogeListViewFilter,
  ogeListViewIndexFromTarget,
  ogeListViewInitialActive,
  ogeListViewItemId,
  ogeListViewKeyDown,
  ogeListViewOffsetTree,
  ogeListViewRole,
  ogeListViewSameKeys,
  ogeListViewScrollTarget,
  ogeListViewSelectionDiff,
  ogeListViewShouldLoadMore,
  ogeListViewSwipeAxis,
  ogeListViewSwipeOpens,
  ogeListViewSwipeReveal,
  ogeListViewSwipeTranslate,
  ogeListViewTextOf,
  ogeListViewVirtualSettings,
  ogeListViewWindow,
  OGE_LIST_VIEW_FALLBACK_HEIGHT,
  type OgeListViewItemRow,
  type OgeListViewNavResult,
  type OgeListViewNavState,
  type OgePointerGestureHandle,
} from '@oge-ui/behavior';
import { OGE_LIST_VIEW_CONFIG, type OgeListViewMessages } from './config';
import {
  OgeListViewEmptyTemplate,
  OgeListViewFooterTemplate,
  OgeListViewGroupTemplate,
  OgeListViewItemTemplate,
  type OgeListViewItemTemplateContext,
} from './templates';
import type {
  OgeListViewActiveItemChangedEvent,
  OgeListViewExpr,
  OgeListViewItemAction,
  OgeListViewItemActionClickEvent,
  OgeListViewItemClickEvent,
  OgeListViewKey,
  OgeListViewLoadMoreEvent,
  OgeListViewPageLoadMode,
  OgeListViewSearchExpr,
  OgeListViewSearchMode,
  OgeListViewSelectionChangedEvent,
  OgeListViewSelectionMode,
  OgeListViewVirtualScrollOptions,
} from './list-view-types';

let nextListViewId = 0;

/** Fallback width (px) of the action tray before it is measured. */
const TRAY_FALLBACK = 120;

interface SwipeState {
  index: number;
  reveal: number;
  tray: number;
}

/**
 * A templated, virtualizable list: selection, sticky group headers, search,
 * load-more / infinite scroll and swipe actions.
 *
 * ```html
 * <oge-list-view
 *   [items]="people"
 *   displayExpr="name"
 *   selectionMode="multiple"
 *   [(selectedKeys)]="picked"
 *   groupExpr="team"
 *   [searchEnabled]="true"
 *   height="360px"
 *   ariaLabel="People"
 * />
 * ```
 *
 * Its role follows `selectionMode` (`ogeListViewRole`): a selectable list is
 * a WAI-ARIA APG **listbox** — the scroll viewport is the focusable
 * `role="listbox"` and tracks the active option with
 * `aria-activedescendant`, which is what lets a virtualized list keep
 * keyboard focus while rows come and go; `selectionMode="none"` renders a
 * `role="list"` whose items hold a roving tab stop. Groups render as
 * labelled segments with an `aria-hidden` sticky header. Item actions are
 * revealed by a horizontal swipe on touch and on hover / focus with a mouse;
 * their keyboard twin is the action's `shortcut` (`aria-keyshortcuts`).
 */
@Component({
  selector: 'oge-list-view',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-list-view',
    '[class.oge-list-view-disabled]': 'disabled()',
    '[class.oge-list-view-virtual]': '!!settings()',
    '[class.oge-list-view-has-actions]': 'itemActions().length > 0',
  },
  styleUrl: './list-view.scss',
  template: `
    @if (searchEnabled()) {
      <div class="oge-list-view-search">
        <svg
          class="oge-list-view-search-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 3-4.35-4.35" />
        </svg>
        <input
          #searchInput
          type="search"
          class="oge-list-view-search-input"
          [value]="searchValue()"
          [attr.aria-label]="msg().searchLabel"
          [attr.placeholder]="msg().searchPlaceholder"
          [attr.aria-controls]="listId"
          [disabled]="disabled()"
          (input)="onSearchInput($event)"
          (keydown)="onSearchKeydown($event)"
        />
        @if (searchValue()) {
          <button
            type="button"
            class="oge-list-view-search-clear"
            [attr.aria-label]="msg().clearSearch"
            [disabled]="disabled()"
            (click)="clearSearch(); searchInput.focus()"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        }
      </div>
    }
    <!-- the viewport is the composite widget: it owns the keyboard (listbox: the
         focus itself, list: bubbling from the roving items) and delegates clicks -->
    <div
      #viewport
      class="oge-list-view-viewport"
      [class.oge-list-view-viewport-empty]="isEmpty()"
      [id]="listId"
      [attr.role]="role()"
      [attr.aria-label]="label()"
      [attr.aria-multiselectable]="
        role() === 'listbox' && mode() === 'multiple' ? true : null
      "
      [attr.aria-activedescendant]="
        role() === 'listbox' && activeIndex() >= 0 ? activeId() : null
      "
      [attr.aria-busy]="loading() ? true : null"
      [attr.aria-disabled]="disabled() ? true : null"
      [tabindex]="role() === 'listbox' && !disabled() ? 0 : -1"
      [style.height]="cssHeight()"
      (scroll)="onScroll()"
      (keydown)="onKeydown($event)"
      (click)="onClick($event)"
      (pointerdown)="onPointerDown($event)"
      (focus)="onViewportFocus()"
      (focusin)="onFocusIn($event)"
    >
      <div
        role="none"
        class="oge-list-view-canvas"
        [style.height.px]="settings() ? win().totalHeight : null"
      >
        <div
          role="none"
          class="oge-list-view-window"
          [style.transform]="
            settings() ? 'translateY(' + win().offsetY + 'px)' : null
          "
        >
          @for (seg of win().segments; track seg.headerRow) {
            @if (seg.group === null) {
              @for (row of seg.items; track row.key) {
                <ng-container
                  *ngTemplateOutlet="itemTpl; context: { $implicit: row }"
                />
              }
            } @else {
              <div
                class="oge-list-view-group"
                [attr.role]="role() === 'listbox' ? 'group' : 'listitem'"
                [attr.aria-label]="role() === 'listbox' ? seg.group : null"
              >
                @if (seg.showHeader) {
                  <div
                    class="oge-list-view-group-header"
                    aria-hidden="true"
                    [style.height.px]="settings()?.groupHeaderHeight ?? null"
                  >
                    @if (groupTemplate(); as tpl) {
                      <ng-container
                        *ngTemplateOutlet="
                          tpl.templateRef;
                          context: { $implicit: seg.group, count: seg.count }
                        "
                      />
                    } @else {
                      <span class="oge-list-view-group-label">{{
                        seg.group
                      }}</span>
                      <span class="oge-list-view-group-count">{{
                        seg.count
                      }}</span>
                    }
                  </div>
                }
                <div
                  class="oge-list-view-group-items"
                  [attr.role]="role() === 'listbox' ? 'none' : 'list'"
                  [attr.aria-label]="role() === 'list' ? seg.group : null"
                >
                  @for (row of seg.items; track row.key) {
                    <ng-container
                      *ngTemplateOutlet="itemTpl; context: { $implicit: row }"
                    />
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
    @if (actionsText()) {
      <span class="oge-sr-only" [id]="descId">{{ actionsText() }}</span>
    }
    @if (isEmpty() && !loading()) {
      <div class="oge-list-view-empty">
        @if (emptyTemplate(); as tpl) {
          <ng-container
            *ngTemplateOutlet="
              tpl.templateRef;
              context: { $implicit: searching(), searchValue: searchValue() }
            "
          />
        } @else {
          {{ searching() ? msg().noResults : msg().noData }}
        }
      </div>
    }
    @if (loading()) {
      <div class="oge-list-view-loading" aria-hidden="true">
        <span class="oge-list-view-spinner"></span>
        {{ msg().loading }}
      </div>
    }
    @if (
      resolvedPageLoadMode() === 'button' &&
      hasMore() &&
      !loading() &&
      !footerTemplate()
    ) {
      <button
        type="button"
        class="oge-list-view-load-more"
        [disabled]="disabled()"
        (click)="requestMore('button')"
      >
        {{ msg().loadMore }}
      </button>
    }
    @if (footerTemplate(); as tpl) {
      <div class="oge-list-view-footer">
        <ng-container
          *ngTemplateOutlet="
            tpl.templateRef;
            context: {
              $implicit: loadMoreFn,
              loading: loading(),
              hasMore: hasMore(),
              itemCount: items().length,
            }
          "
        />
      </div>
    }

    <ng-template #itemTpl let-row>
      <div
        class="oge-list-view-item"
        [class.oge-list-view-item-selected]="isSelected(row.key)"
        [class.oge-list-view-item-active]="row.index === activeIndex()"
        [class.oge-list-view-item-disabled]="isDisabledAt(row.index)"
        [class.oge-list-view-item-swiped]="swipeTranslate(row.index) !== 0"
        [attr.role]="role() === 'listbox' ? 'option' : 'listitem'"
        [id]="itemId(row.key)"
        [attr.data-oge-list-index]="row.index"
        [attr.aria-selected]="role() === 'listbox' ? isSelected(row.key) : null"
        [attr.aria-disabled]="isDisabledAt(row.index) ? true : null"
        [attr.aria-setsize]="model().items.length"
        [attr.aria-posinset]="row.index + 1"
        [attr.aria-keyshortcuts]="shortcuts()"
        [attr.aria-describedby]="actionsText() ? descId : null"
        [attr.tabindex]="
          role() === 'list' ? (row.index === activeIndex() ? 0 : -1) : null
        "
        [style.height.px]="settings()?.itemHeight ?? null"
      >
        <div
          class="oge-list-view-item-main"
          [style.translate]="
            swipeTranslate(row.index)
              ? swipeTranslate(row.index) + 'px 0'
              : null
          "
        >
          @if (showControls()) {
            <span
              class="oge-list-view-check"
              [class.oge-list-view-check-radio]="mode() === 'single'"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" focusable="false">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          }
          @if (itemTemplate(); as tpl) {
            <div class="oge-list-view-item-content">
              <ng-container
                *ngTemplateOutlet="tpl.templateRef; context: itemContext(row)"
              />
            </div>
          } @else {
            <span class="oge-list-view-item-text">{{ textOf(row.item) }}</span>
          }
        </div>
        @if (itemActions().length) {
          <span class="oge-list-view-actions" aria-hidden="true">
            @for (action of itemActions(); track action.key) {
              <span
                class="oge-list-view-action"
                [class]="
                  'oge-list-view-action-' + (action.severity ?? 'neutral')
                "
                [attr.data-oge-list-action]="action.key"
                [attr.title]="action.label"
              >
                @if (action.icon) {
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    focusable="false"
                  >
                    <path [attr.d]="action.icon" />
                  </svg>
                } @else {
                  {{ action.label }}
                }
              </span>
            }
          </span>
        }
      </div>
    </ng-template>
  `,
})
export class OgeListView<T = unknown> {
  private readonly config = inject(OGE_LIST_VIEW_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly localeId = inject(LOCALE_ID);
  private readonly announcer = getOgeLiveAnnouncer(
    isPlatformBrowser(inject(PLATFORM_ID)) ? inject(DOCUMENT) : null,
  );

  /** The items, in order. */
  readonly items = input<readonly T[]>([]);
  /** Field (or function) giving each item's key; default `'id'`. */
  readonly keyExpr = input<OgeListViewExpr<T>>('id');
  /** Field (or function) giving the text of the default template, search and type-ahead. */
  readonly displayExpr = input<OgeListViewExpr<T> | undefined>(undefined);
  /** Field (or function) marking an item disabled (truthy = disabled). */
  readonly disabledExpr = input<OgeListViewExpr<T> | undefined>(undefined);
  /** Field (or function) grouping the items under sticky headers. */
  readonly groupExpr = input<OgeListViewExpr<T> | undefined>(undefined);
  /** `none` (a list), `single` or `multiple` (a listbox); falls back to the config. */
  readonly selectionMode = input<OgeListViewSelectionMode | undefined>(
    undefined,
  );
  /** Keys of the selected items (two-way). */
  readonly selectedKeys = model<readonly OgeListViewKey[]>([]);
  /** Draws a check (multiple) or radio (single) glyph in every item; falls back to the config. */
  readonly showSelectionControls = input<boolean | undefined>(undefined);
  /** Disables the whole list: nothing selects, the search field is disabled. */
  readonly disabled = input(false);
  /** Height of the scroll viewport (`number` = px, or any CSS length). */
  readonly height = input<number | string | undefined>(undefined);
  /**
   * Windowed rendering with fixed row heights — `true`, or
   * `{ itemHeight, groupHeaderHeight, overscan }`.
   */
  readonly virtualScroll = input<boolean | OgeListViewVirtualScrollOptions>(
    false,
  );
  /** Renders a search field above the list. */
  readonly searchEnabled = input(false);
  /** Field(s) the search matches; default the display text. */
  readonly searchExpr = input<OgeListViewSearchExpr<T> | undefined>(undefined);
  /** `contains` (default) or `startsWith`; falls back to the config. */
  readonly searchMode = input<OgeListViewSearchMode | undefined>(undefined);
  /** The search text (two-way). */
  readonly searchValue = model('');
  /** `none`, `button` or `scroll` (infinite); falls back to the config. */
  readonly pageLoadMode = input<OgeListViewPageLoadMode | undefined>(undefined);
  /** Whether more items can be requested (`loadMoreRequested`). */
  readonly hasMore = input(false);
  /** Shows the loading row and sets `aria-busy`. */
  readonly loading = input(false);
  /** Actions revealed by a swipe (touch) or on hover / focus, with keyboard shortcuts. */
  readonly itemActions = input<readonly OgeListViewItemAction[]>([]);
  /** Accessible name; falls back to the `listLabel` message. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** BCP 47 locale of the announced counts; `undefined` = config → `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);

  /** The selection changed through a click, a key, a range or Ctrl+A. */
  readonly selectionChanged = output<OgeListViewSelectionChangedEvent<T>>();
  /** An item was clicked or activated with Enter. */
  readonly itemClick = output<OgeListViewItemClickEvent<T>>();
  /** An item action ran — tap, click or its keyboard shortcut. */
  readonly itemActionClick = output<OgeListViewItemActionClickEvent<T>>();
  /** The list asks for more items (button or infinite scroll). */
  readonly loadMoreRequested = output<OgeListViewLoadMoreEvent>();
  /** The active (keyboard) item moved. */
  readonly activeItemChanged = output<OgeListViewActiveItemChangedEvent<T>>();

  protected readonly itemTemplate = contentChild(OgeListViewItemTemplate);
  protected readonly groupTemplate = contentChild(OgeListViewGroupTemplate);
  protected readonly emptyTemplate = contentChild(OgeListViewEmptyTemplate);
  protected readonly footerTemplate = contentChild(OgeListViewFooterTemplate);
  private readonly viewport =
    viewChild.required<ElementRef<HTMLElement>>('viewport');

  protected readonly listId = `oge-list-view-${nextListViewId++}`;
  protected readonly descId = `${this.listId}-actions`;

  protected readonly msg = computed<OgeListViewMessages>(
    () => this.config.messages,
  );
  protected readonly mode = computed<OgeListViewSelectionMode>(
    () => this.selectionMode() ?? this.config.selectionMode ?? 'none',
  );
  protected readonly role = computed(() => ogeListViewRole(this.mode()));
  protected readonly label = computed(
    () => this.ariaLabel() ?? this.msg().listLabel,
  );
  protected readonly showControls = computed(
    () =>
      this.mode() !== 'none' &&
      (this.showSelectionControls() ??
        this.config.showSelectionControls ??
        false),
  );
  protected readonly resolvedPageLoadMode = computed<OgeListViewPageLoadMode>(
    () => this.pageLoadMode() ?? this.config.pageLoadMode ?? 'none',
  );
  private readonly resolvedLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.localeId,
  );

  protected readonly searching = computed(() => !!this.searchValue().trim());
  private readonly filtered = computed(() =>
    this.searchEnabled()
      ? ogeListViewFilter(this.items(), this.searchValue(), {
          searchExpr: this.searchExpr(),
          displayExpr: this.displayExpr(),
          mode: this.searchMode() ?? this.config.searchMode ?? 'contains',
        })
      : this.items(),
  );
  protected readonly model = computed(() =>
    ogeListViewBuildRows(this.filtered(), {
      keyExpr: this.keyExpr(),
      groupExpr: this.groupExpr(),
    }),
  );
  protected readonly isEmpty = computed(() => this.model().items.length === 0);
  private readonly keys = computed(() => this.model().items.map((r) => r.key));
  private readonly texts = computed(() =>
    this.model().items.map((r) => this.textOf(r.item)),
  );
  private readonly disabledFlags = computed(() => {
    const all = this.disabled();
    const expr = this.disabledExpr();
    return this.model().items.map(
      (r) =>
        all || (expr !== undefined && !!ogeListViewExprValue(r.item, expr)),
    );
  });
  private readonly selectedSet = computed(() => new Set(this.selectedKeys()));

  protected readonly settings = computed(() =>
    ogeListViewVirtualSettings(this.virtualScroll()),
  );
  private readonly tree = computed(() => {
    const settings = this.settings();
    return settings ? ogeListViewOffsetTree(this.model().rows, settings) : null;
  });
  private readonly scrollTop = signal(0);
  private readonly measuredHeight = signal(0);
  private readonly viewportHeight = computed(() => {
    const measured = this.measuredHeight();
    if (measured > 0) return measured;
    const h = this.height();
    return typeof h === 'number' ? h : OGE_LIST_VIEW_FALLBACK_HEIGHT;
  });
  protected readonly win = computed(() =>
    ogeListViewWindow(
      this.model(),
      this.tree(),
      this.settings(),
      this.scrollTop(),
      this.viewportHeight(),
    ),
  );
  protected readonly cssHeight = computed(() => {
    const h = this.height();
    if (typeof h === 'number') return `${h}px`;
    if (h) return h;
    return this.settings() ? `${OGE_LIST_VIEW_FALLBACK_HEIGHT}px` : null;
  });

  /** Remembered active index (`-1` = derive from the selection). */
  private readonly active = signal(-1);
  private readonly anchor = signal(-1);
  /** The active item — valid on the first paint (tab stop / descendant). */
  protected readonly activeIndex = computed(() =>
    ogeListViewInitialActive(
      this.keys(),
      this.selectedKeys(),
      (i) => this.disabledFlags()[i],
      this.active(),
    ),
  );
  protected readonly activeId = computed(() => {
    const key = this.keys()[this.activeIndex()];
    return key === undefined ? null : this.itemId(key);
  });
  protected readonly shortcuts = computed(() =>
    ogeListViewActionShortcuts(this.itemActions()),
  );
  protected readonly actionsText = computed(() =>
    ogeListViewActionsText(this.itemActions(), this.msg()),
  );

  private readonly swipe = signal<SwipeState | null>(null);
  private readonly openSwipe = signal<SwipeState | null>(null);
  private gesture: OgePointerGestureHandle | null = null;
  private readonly typeAhead = createTypeAheadBuffer();
  /** `items().length` when the last load-more was requested (`-1` = none). */
  private requestedAt = -1;
  private pendingLoadFrom: number | null = null;

  protected readonly loadMoreFn = () => this.requestMore('button');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.viewport().nativeElement;
      this.measuredHeight.set(el.clientHeight);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() =>
        this.measuredHeight.set(el.clientHeight),
      );
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    destroyRef.onDestroy(() => this.gesture?.cancel());

    // announce what a load-more brought in, once it arrived
    effect(() => {
      const count = this.items().length;
      untracked(() => {
        const from = this.pendingLoadFrom;
        if (from === null || count <= from) return;
        this.pendingLoadFrom = null;
        this.say(this.msg().loadedCount, count - from);
      });
    });

    // infinite scroll: a first page that does not fill the viewport asks again
    afterRenderEffect(() => {
      this.model();
      if (this.resolvedPageLoadMode() !== 'scroll') return;
      untracked(() => this.checkInfinite());
    });
  }

  /** Moves focus into the list (the listbox, or the active item of a list). */
  focus(): void {
    if (this.role() === 'listbox') {
      this.viewport().nativeElement.focus();
      this.revealIndex(this.activeIndex());
    } else {
      this.focusItemAfterRender(this.activeIndex());
    }
  }

  /** Scrolls the item with `key` into view (and makes it the active one). */
  scrollToItem(key: OgeListViewKey): void {
    const index = this.keys().indexOf(key);
    if (index < 0) return;
    this.active.set(index);
    this.revealIndex(index);
  }

  /** Clears the selection (emits `selectionChanged`). */
  clearSelection(): void {
    this.commitSelection([], undefined, undefined);
  }

  /** Selects every enabled item of a multiple-selection list. */
  selectAll(): void {
    if (this.mode() !== 'multiple') return;
    const keys = this.keys().filter((_, i) => !this.disabledFlags()[i]);
    this.commitSelection(keys, undefined, undefined);
    this.say(this.msg().selectedCount, keys.length);
  }

  /** Empties the search field. */
  clearSearch(): void {
    this.applySearch('');
  }

  // --- template helpers -----------------------------------------------------

  protected textOf(item: T): string {
    return ogeListViewTextOf(item, this.displayExpr());
  }

  protected itemId(key: OgeListViewKey): string {
    return ogeListViewItemId(this.listId, key);
  }

  protected isSelected(key: OgeListViewKey): boolean {
    return this.selectedSet().has(key);
  }

  protected isDisabledAt(index: number): boolean {
    return !!this.disabledFlags()[index];
  }

  protected itemContext(
    row: OgeListViewItemRow<T>,
  ): OgeListViewItemTemplateContext<T> {
    return {
      $implicit: row.item,
      index: row.index,
      key: row.key,
      selected: this.isSelected(row.key),
      active: row.index === this.activeIndex(),
      disabled: this.isDisabledAt(row.index),
      group: row.group,
    };
  }

  protected swipeTranslate(index: number): number {
    const rtl = this.rtl();
    const live = this.swipe();
    if (live && live.index === index)
      return ogeListViewSwipeTranslate(live.reveal, rtl);
    const open = this.openSwipe();
    if (open && open.index === index)
      return ogeListViewSwipeTranslate(open.tray, rtl);
    return 0;
  }

  // --- events ---------------------------------------------------------------

  protected onSearchInput(event: Event): void {
    this.applySearch((event.target as HTMLInputElement).value);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && !this.isEmpty()) {
      event.preventDefault();
      this.focus();
    } else if (event.key === 'Escape' && this.searchValue()) {
      event.preventDefault();
      this.clearSearch();
    }
  }

  protected onScroll(): void {
    const el = this.viewport().nativeElement;
    this.scrollTop.set(el.scrollTop);
    if (this.resolvedPageLoadMode() === 'scroll') this.checkInfinite();
  }

  protected onViewportFocus(): void {
    if (this.role() === 'listbox') this.revealIndex(this.activeIndex());
  }

  protected onFocusIn(event: FocusEvent): void {
    if (this.role() !== 'list') return;
    const index = ogeListViewIndexFromTarget(
      event.target,
      this.viewport().nativeElement,
    );
    if (index >= 0 && index !== this.activeIndex()) this.setActive(index);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled() || this.isEmpty()) return;
    // keys typed into projected content (none should exist) are not ours
    if ((event.target as HTMLElement | null)?.closest?.('input, textarea'))
      return;
    const result = ogeListViewKeyDown(this.navState(), event);
    if (!result.handled) return;
    event.preventDefault();
    this.apply(result, event);
  }

  protected onClick(event: MouseEvent): void {
    if (this.disabled()) return;
    const el = this.viewport().nativeElement;
    const index = ogeListViewIndexFromTarget(event.target, el);
    if (index < 0) return;
    const actionKey = ogeListViewActionFromTarget(event.target);
    if (actionKey !== null) {
      const action = this.itemActions().find((a) => a.key === actionKey);
      if (action && !this.isDisabledAt(index)) {
        this.openSwipe.set(null);
        this.runAction(action, index, event);
      }
      return;
    }
    if (this.openSwipe()) {
      // a tap on a swiped row closes its tray first
      this.openSwipe.set(null);
      return;
    }
    const result = ogeListViewClick(this.navState(), index, event);
    if (result.handled) this.apply(result, event);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (
      event.pointerType !== 'touch' ||
      this.disabled() ||
      !this.itemActions().length ||
      ogeListViewActionFromTarget(event.target) !== null
    )
      return;
    const el = this.viewport().nativeElement;
    const index = ogeListViewIndexFromTarget(event.target, el);
    if (index < 0 || this.isDisabledAt(index)) return;
    const row = (event.target as Element).closest<HTMLElement>(
      '[data-oge-list-index]',
    );
    const tray =
      row?.querySelector<HTMLElement>('.oge-list-view-actions')?.offsetWidth ||
      TRAY_FALLBACK;
    const open = this.openSwipe();
    const startOpen = open?.index === index;
    if (open && !startOpen) this.openSwipe.set(null);
    let axis: boolean | null = null;
    this.gesture?.cancel();
    const gesture = beginPointerGesture(event, {
      preventDefault: false,
      touchAction: false,
      touchLock: false,
      suppressClick: true,
      threshold: 6,
      onMove: (dx, dy) => {
        if (axis === null) axis = ogeListViewSwipeAxis(dx, dy);
        if (axis === false) {
          gesture.cancel();
          return;
        }
        if (axis === null) return;
        this.swipe.set({
          index,
          tray,
          reveal: ogeListViewSwipeReveal(dx, tray, this.rtl(), startOpen),
        });
      },
      onFinish: (commit) => {
        const live = this.swipe();
        this.swipe.set(null);
        this.gesture = null;
        if (!commit || !live) return;
        this.openSwipe.set(
          ogeListViewSwipeOpens(live.reveal, tray)
            ? { ...live, reveal: tray }
            : null,
        );
      },
    });
    this.gesture = gesture;
  }

  /** Requests the next page — the load-more button, the footer, infinite scroll. */
  protected requestMore(reason: 'button' | 'scroll'): void {
    const count = this.items().length;
    if (!this.hasMore() || this.loading() || this.disabled()) return;
    if (reason === 'scroll' && this.requestedAt === count) return;
    this.requestedAt = count;
    this.pendingLoadFrom = count;
    this.loadMoreRequested.emit({ reason, itemCount: count });
  }

  // --- internals ------------------------------------------------------------

  private rtl(): boolean {
    return ogeIsRtl(this.host.nativeElement);
  }

  private navState(): OgeListViewNavState {
    const settings = this.settings();
    return {
      mode: this.mode(),
      keys: this.keys(),
      texts: this.texts(),
      isDisabled: (i) => !!this.disabledFlags()[i],
      active: this.activeIndex(),
      anchor: this.anchor(),
      selected: this.selectedKeys(),
      pageSize: settings
        ? Math.max(
            1,
            Math.floor(this.viewportHeight() / settings.itemHeight) - 1,
          )
        : 10,
      actions: this.itemActions(),
      typeAhead: this.typeAhead,
    };
  }

  private apply(result: OgeListViewNavResult, event: Event): void {
    const index = result.active ?? this.activeIndex();
    const row = this.model().items[index];
    if (result.anchor !== undefined) this.anchor.set(result.anchor);
    if (result.active !== undefined) {
      if (result.active !== this.activeIndex() || this.active() < 0)
        this.setActive(result.active);
      this.revealIndex(result.active);
      if (this.role() === 'list') this.focusItemAfterRender(result.active);
    }
    if (result.selected)
      this.commitSelection(result.selected, row?.item, event);
    if (result.selectAll)
      this.say(this.msg().selectedCount, result.selected?.length ?? 0);
    if (result.activate && row)
      this.itemClick.emit({ item: row.item, key: row.key, index, event });
    if (result.action && row) this.runAction(result.action, index, event);
  }

  private setActive(index: number): void {
    const previous = this.activeIndex();
    this.active.set(index);
    const row = this.model().items[index];
    if (row && previous !== index)
      this.activeItemChanged.emit({ item: row.item, key: row.key, index });
  }

  private runAction(
    action: OgeListViewItemAction,
    index: number,
    event: Event | undefined,
  ): void {
    const row = this.model().items[index];
    if (!row) return;
    this.itemActionClick.emit({
      action,
      item: row.item,
      key: row.key,
      index,
      event,
    });
  }

  private commitSelection(
    next: readonly OgeListViewKey[],
    item: T | undefined,
    event: Event | undefined,
  ): void {
    const previous = this.selectedKeys();
    if (ogeListViewSameKeys(previous, next)) return;
    const diff = ogeListViewSelectionDiff(previous, next);
    this.selectedKeys.set([...next]);
    this.selectionChanged.emit({
      selectedKeys: [...next],
      previousKeys: previous,
      addedKeys: diff.added,
      removedKeys: diff.removed,
      item,
      event,
    });
  }

  private applySearch(value: string): void {
    if (value === this.searchValue()) return;
    this.searchValue.set(value);
    this.active.set(-1);
    this.anchor.set(-1);
    this.scrollTop.set(0);
    const el = this.viewport().nativeElement;
    el.scrollTop = 0;
    if (value.trim())
      this.say(this.msg().resultsCount, this.model().items.length);
  }

  /** Scrolls item `index` into the viewport (below a sticky group header). */
  private revealIndex(index: number): void {
    if (index < 0) return;
    const el = this.viewport().nativeElement;
    const tree = this.tree();
    const settings = this.settings();
    if (tree && settings) {
      const rowIndex = this.model().itemRowIndex[index];
      if (rowIndex === undefined) return;
      const target = ogeListViewScrollTarget(
        tree.offsetOf(rowIndex),
        settings.itemHeight,
        el.scrollTop,
        this.viewportHeight(),
        this.model().grouped ? settings.groupHeaderHeight : 0,
      );
      if (target === null) return;
      el.scrollTop = target;
      this.scrollTop.set(target);
      return;
    }
    const key = this.keys()[index];
    if (key === undefined) return;
    afterNextRender(
      () =>
        el
          .querySelector<HTMLElement>(`#${this.itemId(key)}`)
          ?.scrollIntoView?.({ block: 'nearest' }),
      { injector: this.injector },
    );
  }

  private focusItemAfterRender(index: number): void {
    const key = this.keys()[index];
    if (key === undefined) return;
    this.revealIndex(index);
    const el = this.viewport().nativeElement;
    const focus = () =>
      el.querySelector<HTMLElement>(`#${this.itemId(key)}`)?.focus({
        preventScroll: true,
      });
    const now = el.querySelector<HTMLElement>(`#${this.itemId(key)}`);
    if (now) now.focus({ preventScroll: true });
    afterNextRender(focus, { injector: this.injector });
  }

  private checkInfinite(): void {
    const el = this.viewport().nativeElement;
    if (
      ogeListViewShouldLoadMore(el.scrollTop, el.clientHeight, el.scrollHeight)
    )
      this.requestMore('scroll');
  }

  private say(template: string, count: number): void {
    this.announcer.announce(
      ogeFormatMessage(template, { count }, this.resolvedLocale()),
    );
  }
}
