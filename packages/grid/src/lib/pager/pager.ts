import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { OGE_DEFAULT_MESSAGES, type OgeGridMessages } from '../config';

@Component({
  selector: 'oge-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-pager' },
  template: `
    <button
      type="button"
      class="oge-pager-btn"
      [disabled]="pageIndex() === 0"
      (click)="pageChange.emit(pageIndex() - 1)"
      [attr.aria-label]="messages().previousPage"
    >
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m10 3.5-4.5 4.5L10 12.5" />
      </svg>
    </button>
    @if (isCompact()) {
      <span class="oge-pager-compact">{{ pageIndex() + 1 }} / {{ pageCount() }}</span>
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
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m6 3.5 4.5 4.5L6 12.5" />
      </svg>
    </button>
    @if (pageSizes(); as sizes) {
      <label class="oge-pager-sizes">
        <span class="oge-pager-sizes-label">{{ messages().pageSizeLabel }}</span>
        <select
          [value]="pageSize() || 'all'"
          [attr.aria-label]="messages().pageSizeLabel"
          (change)="onSizeChange($any($event.target).value)"
        >
          @for (size of sizes; track size) {
            <option [value]="size">{{ size === 'all' ? messages().allRows : size }}</option>
          }
        </select>
      </label>
    }
    @if (showInfo()) {
      <span class="oge-pager-info">{{ totalCount() }} {{ messages().rowsSuffix }}</span>
    }
  `,
  styles: `
    .oge-pager {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border-top: 1px solid var(--oge-border-color);
      background: var(--oge-header-bg);
      color: var(--oge-text-color, inherit);
    }

    .oge-pager-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      min-height: 26px;
      padding: 3px 7px;
      border: 1px solid transparent;
      border-radius: var(--oge-radius);
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--oge-row-hover-bg);
      }

      &:disabled {
        color: var(--oge-muted-color);
        cursor: default;
      }
    }

    .oge-pager-current {
      border-color: var(--oge-border-color);
      background: var(--oge-popup-bg, #fff);
      font-weight: 600;
    }

    .oge-pager-sizes {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-inline-start: 12px;
      font-size: 12px;
      color: var(--oge-muted-color);

      select {
        padding: 2px 6px;
        border: 1px solid var(--oge-border-color);
        border-radius: var(--oge-radius);
        background: var(--oge-popup-bg, #fff);
        color: inherit;
        font: inherit;
      }
    }

    .oge-pager-compact {
      padding: 0 6px;
      font-variant-numeric: tabular-nums;
      color: var(--oge-muted-color);
    }

    .oge-pager-info {
      margin-inline-start: auto;
      color: var(--oge-muted-color);
      font-size: 12px;
    }
  `,
})
export class OgePager {
  readonly pageIndex = input.required<number>();
  readonly pageCount = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly pageSize = input<number>(0);
  /** Page-size choices; `'all'` adds an unpaged option; null hides the selector. */
  readonly pageSizes = input<readonly (number | 'all')[] | null>(null);
  readonly showInfo = input(true);
  readonly messages = input<OgeGridMessages>(OGE_DEFAULT_MESSAGES);
  readonly pageChange = output<number>();
  /** Emits the new page size; `0` means "all rows" (paging off). */
  readonly pageSizeChange = output<number>();

  /** 'compact' shows `page / count` instead of page buttons; 'adaptive' switches on narrow hosts. */
  readonly displayMode = input<'full' | 'compact' | 'adaptive'>('full');

  private readonly hostWidth = signal(Number.POSITIVE_INFINITY);

  protected readonly isCompact = computed(() => {
    const mode = this.displayMode();
    if (mode === 'compact') return true;
    return mode === 'adaptive' && this.hostWidth() < 480;
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.hostWidth.set(host.nativeElement.clientWidth));
      observer.observe(host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onSizeChange(raw: string): void {
    this.pageSizeChange.emit(raw === 'all' ? 0 : +raw);
  }

  /** Windowed page list: first, last, and up to 5 pages around the current one. */
  protected readonly pages = computed<number[]>(() => {
    const count = this.pageCount();
    const current = this.pageIndex();
    if (count <= 9) return Array.from({ length: count }, (_, i) => i);
    const around = [current - 2, current - 1, current, current + 1, current + 2].filter(
      (p) => p > 0 && p < count - 1
    );
    return [...new Set([0, ...around, count - 1])].sort((a, b) => a - b);
  });
}
