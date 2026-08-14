import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  OGE_PAGE_ELLIPSIS,
  OGE_PAGINATION_DEFAULT_MAX_BUTTONS,
  clampPaginationIndex,
  formatPaginationMessage,
  paginationHasNextPage,
  paginationInfoText,
  paginationIsCompact,
  paginationPageCount,
  resolvePageCount,
  resolvePageWindow,
} from '@oge-ui/behavior';
import { OGE_PAGINATION_CONFIG, type OgePaginationMessages } from './config';
import type {
  OgePaginationDisplayMode,
  OgePaginationPageChangedEvent,
  OgePaginationPageSizeChangedEvent,
  OgePaginationSize,
} from './pagination-types';

/**
 * Standalone pagination bar: numeric page buttons in a constant-width window
 * with real ellipsis markers, first/last/prev/next navigation, an info range,
 * a page-size selector and a jump-to-page input — all opt-in around the
 * `[(pageIndex)]` / `[(pageSize)]` models:
 *
 * ```html
 * <oge-pagination [(pageIndex)]="page" [itemCount]="total" [pageSize]="20" />
 * <oge-pagination [(pageIndex)]="page" [(pageSize)]="size" [itemCount]="total"
 *   [pageSizes]="[10, 20, 50, 'all']" [showInfo]="true" />
 * ```
 *
 * No WAI-ARIA APG pagination pattern exists, so the markup is composed from
 * primitives: a `<nav>` landmark named by messages, real `<button>`s with
 * `aria-current="page"` on the active page, and the info text in an
 * `aria-live="polite"` region. Keyboard is the native Tab order — the APG
 * defines no arrow-key behavior for pagination, and every control is a
 * native element.
 *
 * `pageIndex` is **0-based** and `pageSize: 0` means "all items on one page"
 * (the grid pager's contracts, kept aligned by design). When `itemCount` is
 * `undefined` the total is unknown: only prev/next and a "Page N" indicator
 * render, and the next button never disables — clamp `pageIndex` yourself
 * when the server reports the end.
 */
@Component({
  selector: 'oge-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-pagination',
    '[class.oge-pagination-sm]': "size() === 'sm'",
    '[class.oge-pagination-lg]': "size() === 'lg'",
    '[class.oge-disabled]': 'disabled()',
  },
  template: `
    <nav class="oge-pagination-nav" [attr.aria-label]="msg().paginationLabel">
      @if (showFirstLastButtons() && !unknownTotal()) {
        <button
          type="button"
          class="oge-pagination-btn oge-pagination-nav-btn"
          [disabled]="disabled() || !hasPreviousPage()"
          [attr.aria-label]="msg().firstPage"
          [attr.title]="msg().firstPage"
          (click)="goTo(0, $event)"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m12 3.5-4.5 4.5L12 12.5M7 3.5 2.5 8 7 12.5" />
          </svg>
        </button>
      }
      @if (showNavigationButtons() || isCompact() || unknownTotal()) {
        <button
          type="button"
          class="oge-pagination-btn oge-pagination-nav-btn"
          [disabled]="disabled() || !hasPreviousPage()"
          [attr.aria-label]="msg().previousPage"
          [attr.title]="msg().previousPage"
          (click)="goTo(pageIndex() - 1, $event)"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m10 3.5-4.5 4.5L10 12.5" />
          </svg>
        </button>
      }
      @if (unknownTotal()) {
        <span class="oge-pagination-indicator" aria-live="polite">{{
          unknownText()
        }}</span>
      } @else if (isCompact()) {
        <span class="oge-pagination-indicator" aria-live="polite">{{
          indicatorText()
        }}</span>
      } @else {
        @for (entry of window(); track $index) {
          @if (entry === ellipsis) {
            <span class="oge-pagination-ellipsis" aria-hidden="true">…</span>
          } @else {
            <button
              type="button"
              class="oge-pagination-btn oge-pagination-page"
              [class.oge-pagination-current]="entry === pageIndex()"
              [disabled]="disabled()"
              [attr.aria-label]="pageAriaLabel(entry)"
              [attr.aria-current]="entry === pageIndex() ? 'page' : null"
              (click)="goTo(entry, $event)"
            >
              {{ entry + 1 }}
            </button>
          }
        }
      }
      @if (showNavigationButtons() || isCompact() || unknownTotal()) {
        <button
          type="button"
          class="oge-pagination-btn oge-pagination-nav-btn"
          [disabled]="disabled() || !hasNextPage()"
          [attr.aria-label]="msg().nextPage"
          [attr.title]="msg().nextPage"
          (click)="goTo(pageIndex() + 1, $event)"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 3.5 4.5 4.5L6 12.5" />
          </svg>
        </button>
      }
      @if (showFirstLastButtons() && !unknownTotal()) {
        <button
          type="button"
          class="oge-pagination-btn oge-pagination-nav-btn"
          [disabled]="disabled() || !hasNextPage()"
          [attr.aria-label]="msg().lastPage"
          [attr.title]="msg().lastPage"
          (click)="goTo(knownPageCount() - 1, $event)"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m4 3.5 4.5 4.5L4 12.5M9 3.5 13.5 8 9 12.5" />
          </svg>
        </button>
      }
      @if (pageSizes(); as sizes) {
        <label class="oge-pagination-sizes">
          <span class="oge-pagination-sizes-label">{{
            msg().pageSizeLabel
          }}</span>
          <select
            class="oge-pagination-select"
            [disabled]="disabled()"
            [value]="pageSize() || 'all'"
            (change)="onSizeChange($event)"
          >
            @for (size of sizes; track size) {
              <option [value]="size">
                {{ size === 'all' ? msg().allRows : size }}
              </option>
            }
          </select>
        </label>
      }
      @if (showJumpToPageInput() && !unknownTotal() && !isCompact()) {
        <label class="oge-pagination-jump">
          <span class="oge-pagination-jump-label">{{ msg().jumpLabel }}</span>
          <input
            class="oge-pagination-jump-input"
            type="number"
            min="1"
            [max]="knownPageCount()"
            [disabled]="disabled()"
            [value]="pageIndex() + 1"
            (change)="onJumpChange($event)"
            (keydown.enter)="onJumpChange($event)"
          />
        </label>
      }
      @if (showInfo() && !unknownTotal() && !isCompact()) {
        <span class="oge-pagination-info" aria-live="polite">{{
          infoText()
        }}</span>
      }
    </nav>
  `,
  styleUrl: './pagination.scss',
})
export class OgePagination {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly config = inject(OGE_PAGINATION_CONFIG);

  protected readonly ellipsis = OGE_PAGE_ELLIPSIS;

  /** The current page — 0-based, two-way. Auto-clamped when the count shrinks. */
  readonly pageIndex = model(0);
  /** Items per page — two-way. `0` means "all items on one page". */
  readonly pageSize = model(20);
  /**
   * Total item count. `undefined` = unknown total: only prev/next and a
   * "Page N" indicator render, and next never disables.
   */
  readonly itemCount = input<number | undefined>(undefined);
  /** Page-size choices; `'all'` adds the unpaged option. Presence shows the selector. */
  readonly pageSizes = input<readonly (number | 'all')[] | undefined>(
    undefined,
  );
  /** Renders the `{from}–{to} of {itemCount}` info text. */
  readonly showInfo = input(false);
  /** Renders the first/last jump buttons (the numeric rails already show both ends). */
  readonly showFirstLastButtons = input(false);
  /** Renders the prev/next buttons; forced on in compact and unknown-total modes. */
  readonly showNavigationButtons = input(true);
  /** Renders the jump-to-page input (1-based display, Enter/blur commit, clamped). */
  readonly showJumpToPageInput = input(false);
  /** Rendered slots incl. ellipsis slots — the window width never jitters. */
  readonly maxButtons = input<number | undefined>(undefined);
  /** `'adaptive'` switches to the compact indicator below the container threshold. */
  readonly displayMode = input<OgePaginationDisplayMode | undefined>(undefined);
  readonly disabled = input(false);
  /** Density preset. */
  readonly size = input<OgePaginationSize>('md');
  /** Per-instance overrides of user-facing strings. */
  readonly messages = input<Partial<OgePaginationMessages> | undefined>(
    undefined,
  );

  /** Fires on user-driven page changes (never on programmatic writes). */
  readonly pageChanged = output<OgePaginationPageChangedEvent>();
  /** Fires on user-driven page-size changes (never on programmatic writes). */
  readonly pageSizeChanged = output<OgePaginationPageSizeChangedEvent>();

  protected readonly msg = computed<OgePaginationMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  /** Total pages — `undefined` while the total is unknown. */
  readonly pageCount = computed<number | undefined>(() =>
    paginationPageCount(this.itemCount(), this.pageSize()),
  );

  protected readonly unknownTotal = computed(
    () => this.itemCount() === undefined,
  );

  /** `pageCount` with the unknown case already excluded by the template. */
  protected readonly knownPageCount = computed(() => this.pageCount() ?? 1);

  private readonly resolvedMaxButtons = computed(
    () =>
      this.maxButtons() ??
      this.config.maxButtons ??
      OGE_PAGINATION_DEFAULT_MAX_BUTTONS,
  );

  private readonly resolvedDisplayMode = computed(
    () => this.displayMode() ?? this.config.displayMode ?? 'full',
  );

  private readonly containerSize = signal(0);

  protected readonly isCompact = computed(() =>
    paginationIsCompact({
      displayMode: this.resolvedDisplayMode(),
      containerSize: this.containerSize(),
      compactBelow: this.config.compactBelow,
    }),
  );

  protected readonly window = computed(() =>
    resolvePageWindow({
      pageIndex: this.pageIndex(),
      pageCount: this.knownPageCount(),
      maxButtons: this.resolvedMaxButtons(),
    }),
  );

  protected readonly infoText = computed(() =>
    paginationInfoText(this.msg().info, {
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      itemCount: this.itemCount(),
    }),
  );

  protected readonly indicatorText = computed(() =>
    this.format(this.msg().pageIndicator, {
      page: this.pageIndex() + 1,
      pageCount: this.knownPageCount(),
    }),
  );

  protected readonly unknownText = computed(() =>
    this.format(this.msg().pageInfoUnknown, { page: this.pageIndex() + 1 }),
  );

  constructor() {
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() =>
        this.containerSize.set(this.host.nativeElement.clientWidth),
      );
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
      this.containerSize.set(this.host.nativeElement.clientWidth);
    });
    // The count shrinking under the current page auto-clamps the model —
    // an implicit pageIndexChange, deliberately no rich event (no user event).
    effect(() => {
      const pageCount = this.pageCount();
      const current = this.pageIndex();
      untracked(() => {
        if (pageCount !== undefined && current > pageCount - 1) {
          this.pageIndex.set(pageCount - 1);
        } else if (current < 0) {
          this.pageIndex.set(0);
        }
      });
    });
  }

  // --- public API ------------------------------------------------------------

  firstPage(): void {
    this.pageIndex.set(0);
  }

  /** Jumps to the last page; a no-op while the total is unknown. */
  lastPage(): void {
    const pageCount = this.pageCount();
    if (pageCount !== undefined) this.pageIndex.set(pageCount - 1);
  }

  nextPage(): void {
    if (this.hasNextPage()) this.pageIndex.set(this.pageIndex() + 1);
  }

  previousPage(): void {
    if (this.hasPreviousPage()) this.pageIndex.set(this.pageIndex() - 1);
  }

  hasPreviousPage(): boolean {
    return this.pageIndex() > 0;
  }

  /** `true` while the total is unknown — the component cannot know the end. */
  hasNextPage(): boolean {
    return paginationHasNextPage(this.pageIndex(), this.pageCount());
  }

  /** Moves keyboard focus to the first enabled control. */
  focus(): void {
    this.host.nativeElement
      .querySelector<HTMLElement>(
        'button:not(:disabled), select:not(:disabled), input:not(:disabled)',
      )
      ?.focus();
  }

  // --- interactions ----------------------------------------------------------

  protected goTo(page: number, event: Event): void {
    const clamped = clampPaginationIndex(page, this.pageCount());
    const previousPageIndex = this.pageIndex();
    if (clamped === previousPageIndex) return;
    this.pageIndex.set(clamped);
    this.pageChanged.emit({
      pageIndex: clamped,
      previousPageIndex,
      pageSize: this.pageSize(),
      event,
    });
  }

  protected onSizeChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const pageSize = raw === 'all' ? 0 : +raw;
    const previousPageSize = this.pageSize();
    if (pageSize === previousPageSize) return;
    this.pageSize.set(pageSize);
    // Re-clamp synchronously so the event reports the post-change page.
    const itemCount = this.itemCount();
    if (itemCount !== undefined) {
      const pageCount = resolvePageCount({ itemCount, pageSize });
      if (this.pageIndex() > pageCount - 1) this.pageIndex.set(pageCount - 1);
    }
    this.pageSizeChanged.emit({
      pageSize,
      previousPageSize,
      pageIndex: this.pageIndex(),
      event,
    });
  }

  protected onJumpChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const numeric = Number.parseInt(element.value, 10);
    if (!Number.isFinite(numeric)) {
      element.value = String(this.pageIndex() + 1);
      return;
    }
    this.goTo(numeric - 1, event);
    // Re-sync the display — the commit may have clamped.
    element.value = String(this.pageIndex() + 1);
  }

  protected pageAriaLabel(page: number): string {
    return this.format(this.msg().pageLabel, { page: page + 1 });
  }

  private format(
    template: string,
    params: Record<string, string | number>,
  ): string {
    return formatPaginationMessage(template, params);
  }
}
