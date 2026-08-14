'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
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
  type OgePaginationDisplayMode,
  type OgePaginationMessages,
  type OgePaginationPageChangedEvent,
  type OgePaginationPageSizeChangedEvent,
  type OgePaginationSize,
} from '@oge-ui/behavior';
import { useOgePaginationConfig } from './navigation-config';

/** The public methods of `<OgePagination>`, reached through its `ref`. */
export interface OgePaginationHandle {
  firstPage(): void;
  /** Jumps to the last page; a no-op while the total is unknown. */
  lastPage(): void;
  nextPage(): void;
  previousPage(): void;
  hasPreviousPage(): boolean;
  /** `true` while the total is unknown — the component cannot know the end. */
  hasNextPage(): boolean;
  /** Total pages — `undefined` while the total is unknown. */
  pageCount(): number | undefined;
  /** Moves keyboard focus to the first enabled control. */
  focus(): void;
}

export interface OgePaginationProps {
  /** The current page — 0-based, controlled. Pair with `onPageIndexChange`. */
  pageIndex?: number;
  /** Initial page of the uncontrolled mode. */
  defaultPageIndex?: number;
  /** The current page changed — the controlled counterpart of `[(pageIndex)]`. */
  onPageIndexChange?: (pageIndex: number) => void;
  /** Items per page — controlled. `0` means "all items on one page". */
  pageSize?: number;
  /** Initial size of the uncontrolled mode. */
  defaultPageSize?: number;
  /** The page size changed — the controlled counterpart of `[(pageSize)]`. */
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * Total item count. `undefined` = unknown total: only prev/next and a
   * "Page N" indicator render, and next never disables.
   */
  itemCount?: number;
  /** Page-size choices; `'all'` adds the unpaged option. Presence shows the selector. */
  pageSizes?: readonly (number | 'all')[];
  /** Renders the `{from}–{to} of {itemCount}` info text. */
  showInfo?: boolean;
  /** Renders the first/last jump buttons (the numeric rails already show both ends). */
  showFirstLastButtons?: boolean;
  /** Renders the prev/next buttons; forced on in compact and unknown-total modes. */
  showNavigationButtons?: boolean;
  /** Renders the jump-to-page input (1-based display, Enter/blur commit, clamped). */
  showJumpToPageInput?: boolean;
  /** Rendered slots incl. ellipsis slots — the window width never jitters. */
  maxButtons?: number;
  /** `'adaptive'` switches to the compact indicator below the container threshold. */
  displayMode?: OgePaginationDisplayMode;
  disabled?: boolean;
  /** Density preset. */
  size?: OgePaginationSize;
  /** Per-instance overrides of the config strings. */
  messages?: Partial<OgePaginationMessages>;
  className?: string;
  style?: CSSProperties;
  id?: string;
  /** Fires on user-driven page changes (never on programmatic writes). */
  onPageChanged?: (event: OgePaginationPageChangedEvent) => void;
  /** Fires on user-driven page-size changes (never on programmatic writes). */
  onPageSizeChanged?: (event: OgePaginationPageSizeChangedEvent) => void;
}

/**
 * Standalone pagination bar: numeric page buttons in a constant-width window
 * with real ellipsis markers, first/last/prev/next navigation, an info range,
 * a page-size selector and a jump-to-page input — the React render of the
 * Angular `<oge-pagination>`, over the same `@oge-ui/behavior` decisions and
 * the same `.oge-pagination-*` classes.
 *
 * ```tsx
 * <OgePagination pageIndex={page} onPageIndexChange={setPage} itemCount={total} />
 * ```
 *
 * No WAI-ARIA APG pagination pattern exists, so the markup is composed from
 * primitives: a `<nav>` landmark named by messages, real `<button>`s with
 * `aria-current="page"` on the active page, and the info text in an
 * `aria-live="polite"` region. Keyboard is the native Tab order.
 *
 * `pageIndex` is **0-based** and `pageSize: 0` means "all items on one page".
 * When `itemCount` is `undefined` the total is unknown: only prev/next and a
 * "Page N" indicator render, and the next button never disables.
 */
export const OgePagination = forwardRef<
  OgePaginationHandle,
  OgePaginationProps
>(function OgePagination(props, ref) {
  const {
    itemCount,
    pageSizes,
    showInfo = false,
    showFirstLastButtons = false,
    showNavigationButtons = true,
    showJumpToPageInput = false,
    disabled = false,
    size = 'md',
    className,
    style,
    id,
  } = props;

  const config = useOgePaginationConfig();
  const messages = useMemo<OgePaginationMessages>(
    () => ({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );

  const hostRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef<HTMLInputElement>(null);

  const latest = useRef(props);
  latest.current = props;

  const [uncontrolledIndex, setUncontrolledIndex] = useState(
    props.defaultPageIndex ?? 0,
  );
  const [uncontrolledSize, setUncontrolledSize] = useState(
    props.defaultPageSize ?? 20,
  );
  const pageIndex = props.pageIndex ?? uncontrolledIndex;
  const pageSize = props.pageSize ?? uncontrolledSize;

  const setPageIndex = useCallback((next: number): void => {
    if (latest.current.pageIndex === undefined) setUncontrolledIndex(next);
    latest.current.onPageIndexChange?.(next);
  }, []);

  const setPageSize = useCallback((next: number): void => {
    if (latest.current.pageSize === undefined) setUncontrolledSize(next);
    latest.current.onPageSizeChange?.(next);
  }, []);

  const pageCount = paginationPageCount(itemCount, pageSize);
  const unknownTotal = itemCount === undefined;
  /** `pageCount` with the unknown case already excluded by the template. */
  const knownPageCount = pageCount ?? 1;

  const maxButtons =
    props.maxButtons ?? config.maxButtons ?? OGE_PAGINATION_DEFAULT_MAX_BUTTONS;
  const displayMode = props.displayMode ?? config.displayMode ?? 'full';

  const [containerSize, setContainerSize] = useState(0);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(() =>
      setContainerSize(host.clientWidth),
    );
    observer.observe(host);
    setContainerSize(host.clientWidth);
    return () => observer.disconnect();
  }, []);

  const isCompact = paginationIsCompact({
    displayMode,
    containerSize,
    compactBelow: config.compactBelow,
  });

  const pageWindow = useMemo(
    () =>
      resolvePageWindow({
        pageIndex,
        pageCount: knownPageCount,
        maxButtons,
      }),
    [pageIndex, knownPageCount, maxButtons],
  );

  const hasPreviousPage = pageIndex > 0;
  const hasNextPage = paginationHasNextPage(pageIndex, pageCount);

  // The count shrinking under the current page auto-clamps the model — an
  // implicit page change, deliberately no rich event (no user event).
  useEffect(() => {
    if (pageCount !== undefined && pageIndex > pageCount - 1) {
      setPageIndex(pageCount - 1);
    } else if (pageIndex < 0) {
      setPageIndex(0);
    }
  }, [pageCount, pageIndex, setPageIndex]);

  // The jump input is uncontrolled so typing is not fought by a re-render;
  // this keeps its display in sync with the model, including after a clamp.
  useEffect(() => {
    if (jumpRef.current) jumpRef.current.value = String(pageIndex + 1);
  }, [pageIndex]);

  // --- interactions --------------------------------------------------------

  const goTo = useCallback(
    (page: number, event: Event): void => {
      const clamped = clampPaginationIndex(page, pageCount);
      if (clamped === pageIndex) return;
      setPageIndex(clamped);
      latest.current.onPageChanged?.({
        pageIndex: clamped,
        previousPageIndex: pageIndex,
        pageSize,
        event,
      });
    },
    [pageCount, pageIndex, pageSize, setPageIndex],
  );

  const onSizeChange = (event: ReactChangeEvent<HTMLSelectElement>): void => {
    const raw = event.target.value;
    const nextSize = raw === 'all' ? 0 : +raw;
    if (nextSize === pageSize) return;
    setPageSize(nextSize);
    // Re-clamp synchronously so the event reports the post-change page.
    let nextIndex = pageIndex;
    if (itemCount !== undefined) {
      const nextCount = resolvePageCount({ itemCount, pageSize: nextSize });
      if (pageIndex > nextCount - 1) {
        nextIndex = nextCount - 1;
        setPageIndex(nextIndex);
      }
    }
    latest.current.onPageSizeChanged?.({
      pageSize: nextSize,
      previousPageSize: pageSize,
      pageIndex: nextIndex,
      event: event.nativeEvent,
    });
  };

  const commitJump = (element: HTMLInputElement, event: Event): void => {
    const numeric = Number.parseInt(element.value, 10);
    if (!Number.isFinite(numeric)) {
      element.value = String(pageIndex + 1);
      return;
    }
    goTo(numeric - 1, event);
    // Re-sync the display — the commit may have clamped.
    element.value = String(clampPaginationIndex(numeric - 1, pageCount) + 1);
  };

  const onJumpBlur = (event: ReactFocusEvent<HTMLInputElement>): void =>
    commitJump(event.target, event.nativeEvent);

  const onJumpKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    commitJump(event.currentTarget, event.nativeEvent);
  };

  // --- imperative handle ---------------------------------------------------

  const state = useRef({ pageIndex, pageCount, hasNextPage, hasPreviousPage });
  state.current = { pageIndex, pageCount, hasNextPage, hasPreviousPage };

  useImperativeHandle<OgePaginationHandle, OgePaginationHandle>(
    ref,
    () => ({
      firstPage: () => setPageIndex(0),
      lastPage: () => {
        const count = state.current.pageCount;
        if (count !== undefined) setPageIndex(count - 1);
      },
      nextPage: () => {
        if (state.current.hasNextPage)
          setPageIndex(state.current.pageIndex + 1);
      },
      previousPage: () => {
        if (state.current.hasPreviousPage) {
          setPageIndex(state.current.pageIndex - 1);
        }
      },
      hasPreviousPage: () => state.current.hasPreviousPage,
      hasNextPage: () => state.current.hasNextPage,
      pageCount: () => state.current.pageCount,
      focus: () => {
        hostRef.current
          ?.querySelector<HTMLElement>(
            'button:not(:disabled), select:not(:disabled), input:not(:disabled)',
          )
          ?.focus();
      },
    }),
    [setPageIndex],
  );

  // --- render --------------------------------------------------------------

  const hostClasses = [
    'oge-pagination',
    size === 'sm' && 'oge-pagination-sm',
    size === 'lg' && 'oge-pagination-lg',
    disabled && 'oge-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const navIcon = (path: string): ReactNode => (
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

  const navButton = (
    label: string,
    path: string,
    isDisabled: boolean,
    target: () => number,
  ): ReactNode => (
    <button
      type="button"
      className="oge-pagination-btn oge-pagination-nav-btn"
      disabled={isDisabled}
      aria-label={label}
      title={label}
      onClick={(event) => goTo(target(), event.nativeEvent)}
    >
      {navIcon(path)}
    </button>
  );

  const showPrevNext = showNavigationButtons || isCompact || unknownTotal;

  return (
    <div ref={hostRef} id={id} className={hostClasses} style={style}>
      <nav className="oge-pagination-nav" aria-label={messages.paginationLabel}>
        {showFirstLastButtons &&
          !unknownTotal &&
          navButton(
            messages.firstPage,
            'm12 3.5-4.5 4.5L12 12.5M7 3.5 2.5 8 7 12.5',
            disabled || !hasPreviousPage,
            () => 0,
          )}
        {showPrevNext &&
          navButton(
            messages.previousPage,
            'm10 3.5-4.5 4.5L10 12.5',
            disabled || !hasPreviousPage,
            () => pageIndex - 1,
          )}

        {unknownTotal ? (
          <span className="oge-pagination-indicator" aria-live="polite">
            {formatPaginationMessage(messages.pageInfoUnknown, {
              page: pageIndex + 1,
            })}
          </span>
        ) : isCompact ? (
          <span className="oge-pagination-indicator" aria-live="polite">
            {formatPaginationMessage(messages.pageIndicator, {
              page: pageIndex + 1,
              pageCount: knownPageCount,
            })}
          </span>
        ) : (
          pageWindow.map((entry, index) =>
            entry === OGE_PAGE_ELLIPSIS ? (
              <span
                key={`e${index}`}
                className="oge-pagination-ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={`p${entry}`}
                type="button"
                className={[
                  'oge-pagination-btn',
                  'oge-pagination-page',
                  entry === pageIndex && 'oge-pagination-current',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={disabled}
                aria-label={formatPaginationMessage(messages.pageLabel, {
                  page: entry + 1,
                })}
                aria-current={entry === pageIndex ? 'page' : undefined}
                onClick={(event) => goTo(entry, event.nativeEvent)}
              >
                {entry + 1}
              </button>
            ),
          )
        )}

        {showPrevNext &&
          navButton(
            messages.nextPage,
            'm6 3.5 4.5 4.5L6 12.5',
            disabled || !hasNextPage,
            () => pageIndex + 1,
          )}
        {showFirstLastButtons &&
          !unknownTotal &&
          navButton(
            messages.lastPage,
            'm4 3.5 4.5 4.5L4 12.5M9 3.5 13.5 8 9 12.5',
            disabled || !hasNextPage,
            () => knownPageCount - 1,
          )}

        {pageSizes !== undefined && (
          <label className="oge-pagination-sizes">
            <span className="oge-pagination-sizes-label">
              {messages.pageSizeLabel}
            </span>
            <select
              className="oge-pagination-select"
              disabled={disabled}
              value={pageSize || 'all'}
              onChange={onSizeChange}
            >
              {pageSizes.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? messages.allRows : option}
                </option>
              ))}
            </select>
          </label>
        )}

        {showJumpToPageInput && !unknownTotal && !isCompact && (
          <label className="oge-pagination-jump">
            <span className="oge-pagination-jump-label">
              {messages.jumpLabel}
            </span>
            <input
              ref={jumpRef}
              className="oge-pagination-jump-input"
              type="number"
              min={1}
              max={knownPageCount}
              disabled={disabled}
              defaultValue={pageIndex + 1}
              onBlur={onJumpBlur}
              onKeyDown={onJumpKeyDown}
            />
          </label>
        )}

        {showInfo && !unknownTotal && !isCompact && (
          <span className="oge-pagination-info" aria-live="polite">
            {paginationInfoText(messages.info, {
              pageIndex,
              pageSize,
              itemCount,
            })}
          </span>
        )}
      </nav>
    </div>
  );
});
