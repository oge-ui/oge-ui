'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  OGE_DEFAULT_GRID_MESSAGES,
  formatPattern,
  ogePagerInfoContext,
  ogePagerInfoText,
  ogePagerPages,
  ogeParsePageInput,
  type OgeGridMessages,
  type OgePagerInfoContext,
} from '@oge-ui/behavior';
import { ogeDefaultLocale } from '@oge-ui/core';

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
  /** Adds first-page / last-page buttons around the page list. */
  showFirstLast?: boolean;
  /**
   * Replaces the page buttons with a "Page [n] of N" input; Enter or blur
   * navigates (clamped to the valid range).
   */
  showPageInput?: boolean;
  /** Renders the info text instead of the `pagerInfo` message. */
  renderInfo?: (context: OgePagerInfoContext) => ReactNode;
  messages?: OgeGridMessages;
  /**
   * BCP 47 locale of the plural-aware info text (`pagerInfo`); the grid
   * passes its own. `undefined` = `navigator.language`.
   */
  locale?: string;
  onPageChange?: (pageIndex: number) => void;
  /** Emits the new page size; `0` means "all rows" (paging off). */
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Windowed page list: first, last, and up to 5 pages around the current one
 * (`@oge-ui/behavior`'s `ogePagerPages`, kept under its historical name).
 */
export const pagerPages = ogePagerPages;

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
  showFirstLast = false,
  showPageInput = false,
  renderInfo,
  messages = OGE_DEFAULT_GRID_MESSAGES,
  locale,
  onPageChange,
  onPageSizeChange,
  className,
  style,
}: OgePagerProps) {
  const host = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(Number.POSITIVE_INFINITY);
  const infoText = ogePagerInfoText(
    messages,
    totalCount,
    locale ?? ogeDefaultLocale(),
  );

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
  /** The go-to-page input committed: navigate, or snap back to the page. */
  const commitPageInput = (field: HTMLInputElement): void => {
    const page = ogeParsePageInput(field.value, pageCount);
    field.value = String((page ?? pageIndex) + 1);
    if (page !== null && page !== pageIndex) onPageChange?.(page);
  };
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
      {showFirstLast ? (
        <button
          type="button"
          className="oge-pager-btn oge-pager-first"
          disabled={pageIndex === 0}
          onClick={() => onPageChange?.(0)}
          aria-label={messages.firstPage}
        >
          {chevron('M4 3.5v9M11 3.5 6.5 8l4.5 4.5')}
        </button>
      ) : null}
      <button
        type="button"
        className="oge-pager-btn"
        disabled={pageIndex === 0}
        onClick={() => onPageChange?.(pageIndex - 1)}
        aria-label={messages.previousPage}
      >
        {chevron('m10 3.5-4.5 4.5L10 12.5')}
      </button>
      {showPageInput ? (
        <label className="oge-pager-input">
          <span className="oge-pager-input-label">{messages.goToPage}</span>
          <input
            key={pageIndex}
            type="text"
            inputMode="numeric"
            className="oge-pager-input-field"
            defaultValue={String(pageIndex + 1)}
            aria-label={messages.goToPage}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitPageInput(event.currentTarget);
            }}
            onBlur={(event) => commitPageInput(event.currentTarget)}
          />
          <span className="oge-pager-input-count">
            {formatPattern(messages.pageOfCount, {
              count: String(pageCount),
            })}
          </span>
        </label>
      ) : compact ? (
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
      {showFirstLast ? (
        <button
          type="button"
          className="oge-pager-btn oge-pager-last"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange?.(pageCount - 1)}
          aria-label={messages.lastPage}
        >
          {chevron('M12 3.5v9M5 3.5 9.5 8 5 12.5')}
        </button>
      ) : null}
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
          {renderInfo
            ? renderInfo(
                ogePagerInfoContext({
                  pageIndex,
                  pageCount,
                  totalCount,
                  pageSize,
                  text: infoText,
                }),
              )
            : infoText}
        </span>
      ) : null}
    </div>
  );
}
