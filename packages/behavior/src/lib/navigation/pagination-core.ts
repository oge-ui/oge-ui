import {
  resolveMenubarCompact,
  resolvePageCount,
  resolvePageRange,
} from '@oge-ui/core';

/**
 * The framework-free half of the pagination (ADR 0001): its vocabulary, the
 * event payloads, the message catalog and the config merge rule, plus the
 * small decisions both render layers make (clamping, the compact switch, the
 * message interpolation).
 *
 * The arithmetic itself already lives in `@oge-ui/core` (`pagination-math` —
 * the constant-width page window with its real ellipsis markers, the info
 * range and the page-count division); it is re-exported here so the React
 * render layer reaches it without importing a second package.
 */
export {
  OGE_PAGE_ELLIPSIS,
  resolvePageCount,
  resolvePageRange,
  resolvePageWindow,
  type OgePageCountRequest,
  type OgePageRangeRequest,
  type OgePageRangeResult,
  type OgePageWindowEntry,
  type OgePageWindowRequest,
} from '@oge-ui/core';

/**
 * How the pagination renders: numeric buttons, the compact `N / M` indicator,
 * or automatically by container width.
 */
export type OgePaginationDisplayMode = 'full' | 'compact' | 'adaptive';

/** Density preset of the pagination controls. */
export type OgePaginationSize = 'sm' | 'md' | 'lg';

/** A user-driven page change. */
export interface OgePaginationPageChangedEvent {
  /** The new 0-based page. */
  pageIndex: number;
  previousPageIndex: number;
  pageSize: number;
  /** The originating DOM event. */
  event: Event;
}

/** A user-driven page-size change. */
export interface OgePaginationPageSizeChangedEvent {
  /** The new size; `0` means "all items" (paging off). */
  pageSize: number;
  previousPageSize: number;
  /** The 0-based page AFTER the change re-clamped the index. */
  pageIndex: number;
  /** The originating DOM event. */
  event: Event;
}

// --- decisions -------------------------------------------------------------

/** Default slot budget of the page window, ellipsis slots included. */
export const OGE_PAGINATION_DEFAULT_MAX_BUTTONS = 7;

/** Default container width below which `'adaptive'` goes compact. */
export const OGE_PAGINATION_DEFAULT_COMPACT_BELOW = 480;

/**
 * Total pages, or `undefined` while the total is unknown — the state in which
 * only prev/next and a "Page N" indicator render and next never disables.
 */
export function paginationPageCount(
  itemCount: number | undefined,
  pageSize: number,
): number | undefined {
  if (itemCount === undefined) return undefined;
  return resolvePageCount({ itemCount, pageSize });
}

/**
 * The requested page brought into range. An unknown total cannot clamp the
 * upper end — only the floor at zero applies.
 */
export function clampPaginationIndex(
  page: number,
  pageCount: number | undefined,
): number {
  return Math.max(
    0,
    pageCount === undefined ? page : Math.min(page, pageCount - 1),
  );
}

/** `true` while the total is unknown — the component cannot know the end. */
export function paginationHasNextPage(
  pageIndex: number,
  pageCount: number | undefined,
): boolean {
  return pageCount === undefined || pageIndex < pageCount - 1;
}

export interface OgePaginationCompactRequest {
  readonly displayMode: OgePaginationDisplayMode;
  /** Measured container width; `<= 0` means "not measured yet". */
  readonly containerSize: number;
  /** Threshold in px; defaults to {@link OGE_PAGINATION_DEFAULT_COMPACT_BELOW}. */
  readonly compactBelow?: number;
}

/**
 * Whether the compact `N / M` indicator replaces the numeric rails.
 * `'adaptive'` defers to the shared container-width rule, which treats an
 * unmeasured container as "wide enough" — that is what keeps jsdom specs
 * deterministic.
 */
export function paginationIsCompact(
  request: OgePaginationCompactRequest,
): boolean {
  if (request.displayMode === 'compact') return true;
  if (request.displayMode !== 'adaptive') return false;
  return resolveMenubarCompact({
    containerSize: request.containerSize,
    compactBelow: request.compactBelow ?? OGE_PAGINATION_DEFAULT_COMPACT_BELOW,
  }).compact;
}

/** Replaces every `{name}` placeholder of a message with its parameter. */
export function formatPaginationMessage(
  template: string,
  params: Record<string, string | number>,
): string {
  return Object.entries(params).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

/** The `{from}–{to} of {itemCount}` info text. */
export function paginationInfoText(
  template: string,
  state: {
    readonly pageIndex: number;
    readonly pageSize: number;
    readonly itemCount: number | undefined;
  },
): string {
  const itemCount = state.itemCount ?? 0;
  const range = resolvePageRange({
    pageIndex: state.pageIndex,
    pageSize: state.pageSize,
    itemCount,
  });
  return formatPaginationMessage(template, {
    from: range.from,
    to: range.to,
    itemCount,
  });
}

// --- config ----------------------------------------------------------------

/** Every user-facing string the pagination renders, including aria labels. */
export interface OgePaginationMessages {
  /** Accessible name of the `<nav>` landmark. */
  paginationLabel: string;
  /** Aria label of the first-page button. */
  firstPage: string;
  /** Aria label of the last-page button. */
  lastPage: string;
  /** Aria label of the previous-page button. */
  previousPage: string;
  /** Aria label of a numeric page button — placeholder `{page}` (1-based). */
  pageLabel: string;
  /** Aria label of the next-page button. */
  nextPage: string;
  /** Info text — placeholders `{from}` `{to}` `{itemCount}`. */
  info: string;
  /** Current-page text when the total is unknown — placeholder `{page}`. */
  pageInfoUnknown: string;
  /** Compact indicator — placeholders `{page}` `{pageCount}` (1-based). */
  pageIndicator: string;
  /** Visible label of the page-size selector. */
  pageSizeLabel: string;
  /** The "all items on one page" option of the page-size selector. */
  allRows: string;
  /** Visible label of the jump-to-page input. */
  jumpLabel: string;
}

export const OGE_DEFAULT_PAGINATION_MESSAGES: OgePaginationMessages = {
  paginationLabel: 'Pagination',
  firstPage: 'First page',
  lastPage: 'Last page',
  previousPage: 'Previous page',
  pageLabel: 'Page {page}',
  nextPage: 'Next page',
  info: '{from}–{to} of {itemCount}',
  pageInfoUnknown: 'Page {page}',
  pageIndicator: '{page} / {pageCount}',
  pageSizeLabel: 'Items per page',
  allRows: 'All',
  jumpLabel: 'Go to page',
};

export interface OgePaginationConfig {
  messages: OgePaginationMessages;
  /** Default for the `displayMode` input. */
  displayMode?: OgePaginationDisplayMode;
  /** Adaptive threshold in px; the component resolves `?? 480`. */
  compactBelow?: number;
  /** Default for the `maxButtons` input; the component resolves `?? 7`. */
  maxButtons?: number;
}

export const OGE_DEFAULT_PAGINATION_CONFIG: OgePaginationConfig = {
  messages: OGE_DEFAULT_PAGINATION_MESSAGES,
};

export type OgePaginationConfigInput = Partial<
  Omit<OgePaginationConfig, 'messages'>
> & {
  messages?: Partial<OgePaginationMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgePaginationConfig(
  input: OgePaginationConfigInput | undefined,
): OgePaginationConfig {
  return {
    ...OGE_DEFAULT_PAGINATION_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_PAGINATION_MESSAGES, ...input?.messages },
  };
}
