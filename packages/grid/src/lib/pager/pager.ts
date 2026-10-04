import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChild,
  inject,
  input,
  output,
  signal,
  type TemplateRef,
} from '@angular/core';
import {
  ogePagerInfoContext,
  ogePagerPages,
  ogeParsePageInput,
} from '@oge-ui/behavior';
import {
  OGE_DEFAULT_MESSAGES,
  formatPattern,
  type OgeGridMessages,
} from '../config';
import {
  OgePagerInfoTemplate,
  type OgePagerInfoTemplateContext,
} from '../templates/pager-info-template';

const ICON_PATHS = {
  first: 'M4 3.5v9M11 3.5 6.5 8l4.5 4.5',
  previous: 'm10 3.5-4.5 4.5L10 12.5',
  next: 'm6 3.5 4.5 4.5L6 12.5',
  last: 'M12 3.5v9M5 3.5 9.5 8 5 12.5',
} as const;

/**
 * The grid's pager — also usable on its own under any list:
 *
 * ```html
 * <oge-pager [pageIndex]="page" [pageCount]="10" [totalCount]="95"
 *            [showFirstLast]="true" [showPageInput]="true"
 *            (pageChange)="page = $event" />
 * ```
 */
@Component({
  selector: 'oge-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: { class: 'oge-pager' },
  template: `
    @if (showFirstLast()) {
      <button
        type="button"
        class="oge-pager-btn oge-pager-first"
        [disabled]="pageIndex() === 0"
        (click)="pageChange.emit(0)"
        [attr.aria-label]="messages().firstPage"
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
          <path [attr.d]="icons.first" />
        </svg>
      </button>
    }
    <button
      type="button"
      class="oge-pager-btn"
      [disabled]="pageIndex() === 0"
      (click)="pageChange.emit(pageIndex() - 1)"
      [attr.aria-label]="messages().previousPage"
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
        <path [attr.d]="icons.previous" />
      </svg>
    </button>
    @if (showPageInput()) {
      <label class="oge-pager-input">
        <span class="oge-pager-input-label">{{ messages().goToPage }}</span>
        <input
          type="text"
          inputmode="numeric"
          class="oge-pager-input-field"
          [value]="pageIndex() + 1"
          [attr.aria-label]="messages().goToPage"
          (keydown.enter)="onPageInput($event)"
          (change)="onPageInput($event)"
        />
        <span class="oge-pager-input-count">{{ pageOfText() }}</span>
      </label>
    } @else if (isCompact()) {
      <span class="oge-pager-compact"
        >{{ pageIndex() + 1 }} / {{ pageCount() }}</span
      >
    } @else {
      @for (page of pages(); track page) {
        <button
          type="button"
          class="oge-pager-btn"
          [class.oge-pager-current]="page === pageIndex()"
          [attr.aria-current]="page === pageIndex() ? 'page' : null"
          (click)="pageChange.emit(page)"
        >
          {{ page + 1 }}
        </button>
      }
    }
    <button
      type="button"
      class="oge-pager-btn"
      [disabled]="pageIndex() >= pageCount() - 1"
      (click)="pageChange.emit(pageIndex() + 1)"
      [attr.aria-label]="messages().nextPage"
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
        <path [attr.d]="icons.next" />
      </svg>
    </button>
    @if (showFirstLast()) {
      <button
        type="button"
        class="oge-pager-btn oge-pager-last"
        [disabled]="pageIndex() >= pageCount() - 1"
        (click)="pageChange.emit(pageCount() - 1)"
        [attr.aria-label]="messages().lastPage"
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
          <path [attr.d]="icons.last" />
        </svg>
      </button>
    }
    @if (pageSizes(); as sizes) {
      <label class="oge-pager-sizes">
        <span class="oge-pager-sizes-label">{{
          messages().pageSizeLabel
        }}</span>
        <select
          [value]="pageSize() || 'all'"
          [attr.aria-label]="messages().pageSizeLabel"
          (change)="onSizeChange($any($event.target).value)"
        >
          @for (size of sizes; track size) {
            <option [value]="size">
              {{ size === 'all' ? messages().allRows : size }}
            </option>
          }
        </select>
      </label>
    }
    @if (showInfo()) {
      <span class="oge-pager-info">
        @if (effInfoTemplate(); as tpl) {
          <ng-container *ngTemplateOutlet="tpl; context: infoContext()" />
        } @else {
          {{ totalCount() }} {{ messages().rowsSuffix }}
        }
      </span>
    }
  `,
  styleUrl: './pager.scss',
})
export class OgePager {
  readonly pageIndex = input.required<number>();
  readonly pageCount = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly pageSize = input<number>(0);
  /** Page-size choices; `'all'` adds an unpaged option; null hides the selector. */
  readonly pageSizes = input<readonly (number | 'all')[] | null>(null);
  readonly showInfo = input(true);
  /** Adds first-page / last-page buttons around the page list. */
  readonly showFirstLast = input(false);
  /**
   * Replaces the page buttons with a "Page [n] of N" input; Enter or blur
   * navigates (clamped to the valid range).
   */
  readonly showPageInput = input(false);
  /**
   * Template for the info text (`*ogePagerInfoTemplate` children win); the
   * grid passes its own here.
   */
  readonly infoTemplate =
    input<TemplateRef<OgePagerInfoTemplateContext> | null>(null);
  readonly messages = input<OgeGridMessages>(OGE_DEFAULT_MESSAGES);
  readonly pageChange = output<number>();
  /** Emits the new page size; `0` means "all rows" (paging off). */
  readonly pageSizeChange = output<number>();

  /** 'compact' shows `page / count` instead of page buttons; 'adaptive' switches on narrow hosts. */
  readonly displayMode = input<'full' | 'compact' | 'adaptive'>('full');

  protected readonly icons = ICON_PATHS;
  private readonly projectedInfo = contentChild(OgePagerInfoTemplate);
  protected readonly effInfoTemplate = computed(
    () => this.projectedInfo()?.templateRef ?? this.infoTemplate(),
  );

  private readonly hostWidth = signal(Number.POSITIVE_INFINITY);

  protected readonly isCompact = computed(() => {
    const mode = this.displayMode();
    if (mode === 'compact') return true;
    return mode === 'adaptive' && this.hostWidth() < 480;
  });

  protected readonly pageOfText = computed(() =>
    formatPattern(this.messages().pageOfCount, {
      count: String(this.pageCount()),
    }),
  );

  protected readonly infoContext = computed<OgePagerInfoTemplateContext>(() => {
    const info = ogePagerInfoContext({
      pageIndex: this.pageIndex(),
      pageCount: this.pageCount(),
      totalCount: this.totalCount(),
      pageSize: this.pageSize(),
      text: `${this.totalCount()} ${this.messages().rowsSuffix}`,
    });
    return { $implicit: info, ...info };
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() =>
        this.hostWidth.set(host.nativeElement.clientWidth),
      );
      observer.observe(host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onSizeChange(raw: string): void {
    this.pageSizeChange.emit(raw === 'all' ? 0 : +raw);
  }

  protected onPageInput(event: Event): void {
    const field = event.target as HTMLInputElement;
    const page = ogeParsePageInput(field.value, this.pageCount());
    if (page === null || page === this.pageIndex()) {
      field.value = String(this.pageIndex() + 1);
      return;
    }
    field.value = String(page + 1);
    this.pageChange.emit(page);
  }

  /** Windowed page list: first, last, and up to 5 pages around the current one. */
  protected readonly pages = computed<number[]>(() =>
    ogePagerPages(this.pageCount(), this.pageIndex()),
  );
}
