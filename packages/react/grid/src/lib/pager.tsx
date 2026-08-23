'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  OGE_DEFAULT_GRID_MESSAGES,
  type OgeGridMessages,
} from '@oge-ui/behavior';

export interface OgePagerProps {
  /** Zero-based current page. */
  pageIndex: number;
  pageCount: number;
  totalCount: number;
  /** Current page size; `0` when paging is off. */
  pageSize?: number;
  /** Page-size choices; `'all'` adds an unpaged option; omit to hide the selector. */
  pageSizes?: readonly (number | 'all')[] | null;
  showInfo?: boolean;
  /** 'compact' shows `page / count` instead of page buttons; 'adaptive' switches on narrow hosts. */
  displayMode?: 'full' | 'compact' | 'adaptive';
  messages?: OgeGridMessages;
  onPageChange?: (pageIndex: number) => void;
  /** Emits the new page size; `0` means "all rows" (paging off). */
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  style?: CSSProperties;
}

/** Windowed page list: first, last, and up to 5 pages around the current one. */
export function pagerPages(count: number, current: number): number[] {
  if (count <= 9) return Array.from({ length: count }, (_, i) => i);
  const around = [
    current - 2,
    current - 1,
    current,
    current + 1,
    current + 2,
  ].filter((p) => p > 0 && p < count - 1);
  return [...new Set([0, ...around, count - 1])].sort((a, b) => a - b);
}

const chevron = (path: string) => (
  <svg
    viewBox="0 0 16 16"
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

/**
 * The grid's pager — the React render of Angular's `<oge-pager>`, on the
 * same `.oge-pager-*` markup and the same stylesheet. Also usable on its own
 * under any list.
 */
export function OgePager({
  pageIndex,
  pageCount,
  totalCount,
  pageSize = 0,
  pageSizes = null,
  showInfo = true,
  displayMode = 'full',
  messages = OGE_DEFAULT_GRID_MESSAGES,
  onPageChange,
  onPageSizeChange,
  className,
  style,
}: OgePagerProps) {
  const host = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(Number.POSITIVE_INFINITY);

  useEffect(() => {
    const el = host.current;
    if (
      !el ||
      displayMode !== 'adaptive' ||
      typeof ResizeObserver === 'undefined'
    )
      return;
    const observer = new ResizeObserver(() => setHostWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayMode]);

  const compact =
    displayMode === 'compact' ||
    (displayMode === 'adaptive' && hostWidth < 480);
  const pages = useMemo(
    () => pagerPages(pageCount, pageIndex),
    [pageCount, pageIndex],
  );

  return (
    <div
      ref={host}
      className={className ? `oge-pager ${className}` : 'oge-pager'}
      style={style}
    >
      <button
        type="button"
        className="oge-pager-btn"
        disabled={pageIndex === 0}
        onClick={() => onPageChange?.(pageIndex - 1)}
        aria-label={messages.previousPage}
      >
        {chevron('m10 3.5-4.5 4.5L10 12.5')}
      </button>
      {compact ? (
        <span className="oge-pager-compact">
          {pageIndex + 1} / {pageCount}
        </span>
      ) : (
        pages.map((page) => (
          <button
            key={page}
            type="button"
            className={
              page === pageIndex
                ? 'oge-pager-btn oge-pager-current'
                : 'oge-pager-btn'
            }
            aria-current={page === pageIndex ? 'page' : undefined}
            onClick={() => onPageChange?.(page)}
          >
            {page + 1}
          </button>
        ))
      )}
      <button
        type="button"
        className="oge-pager-btn"
        disabled={pageIndex >= pageCount - 1}
        onClick={() => onPageChange?.(pageIndex + 1)}
        aria-label={messages.nextPage}
      >
        {chevron('m6 3.5 4.5 4.5L6 12.5')}
      </button>
      {pageSizes ? (
        <label className="oge-pager-sizes">
          <span className="oge-pager-sizes-label">
            {messages.pageSizeLabel}
          </span>
          <select
            value={pageSize || 'all'}
            aria-label={messages.pageSizeLabel}
            onChange={(event) => {
              const raw = event.target.value;
              onPageSizeChange?.(raw === 'all' ? 0 : +raw);
            }}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size === 'all' ? messages.allRows : size}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showInfo ? (
        <span className="oge-pager-info">
          {totalCount} {messages.rowsSuffix}
        </span>
      ) : null}
    </div>
  );
}
