/**
 * Pure pagination arithmetic — the visible page window with real ellipsis
 * markers, the from/to range of the info text and the page-count division.
 * DOM-free so the pagination component only feeds it state, the same rule
 * every other kernel in this folder follows.
 *
 * The window's defining invariant: its length is ALWAYS
 * `min(pageCount, maxButtons)` — ellipsis slots count toward the budget, so
 * paging from the first page through the middle to the last never changes how
 * many slots render, and the bar's width never jitters.
 */

/** The non-interactive gap marker in a page window. */
export const OGE_PAGE_ELLIPSIS = 'ellipsis' as const;

/** One rendered slot: a 0-based page number or an ellipsis gap. */
export type OgePageWindowEntry = number | typeof OGE_PAGE_ELLIPSIS;

export interface OgePageWindowRequest {
  /** 0-based current page; clamped into `[0, pageCount - 1]`. */
  readonly pageIndex: number;
  /** Total pages; a non-positive count returns an empty window. */
  readonly pageCount: number;
  /**
   * Total rendered slots INCLUDING ellipsis slots. Defaults to 7 and is
   * floored at `2 × boundaryCount + 3` — boundary pages, two ellipses and the
   * current page is the smallest honest shape.
   */
  readonly maxButtons?: number;
  /** Pages pinned at each rail. Defaults to 1. */
  readonly boundaryCount?: number;
}

/**
 * Resolves which page slots render. The shape is `boundary pages · one
 * page-or-ellipsis slot · a run around the current page · one
 * page-or-ellipsis slot · boundary pages`: an edge slot renders the real
 * page when the run touches it (no gap) and an ellipsis only when it hides
 * at least two pages — an ellipsis hiding a single page never happens.
 */
export function resolvePageWindow(
  request: OgePageWindowRequest,
): readonly OgePageWindowEntry[] {
  const pageCount = Math.floor(request.pageCount);
  if (pageCount <= 0) return [];
  const boundary = Math.max(1, Math.floor(request.boundaryCount ?? 1));
  const maxButtons = Math.max(
    2 * boundary + 3,
    Math.floor(request.maxButtons ?? 7),
  );
  const current = clamp(Math.floor(request.pageIndex), 0, pageCount - 1);

  if (pageCount <= maxButtons) {
    return range(0, pageCount);
  }

  // Budget: boundaries + the two edge slots + the middle run.
  const runSize = maxButtons - 2 * boundary - 2;
  const start = clamp(
    current - Math.floor((runSize - 1) / 2),
    boundary + 1,
    pageCount - boundary - 1 - runSize,
  );
  const end = start + runSize - 1;

  const entries: OgePageWindowEntry[] = [...range(0, boundary)];
  // Left edge slot: the run touching `boundary + 1` means no gap — render
  // page `boundary`; otherwise the ellipsis hides `start - boundary >= 2`.
  entries.push(start === boundary + 1 ? boundary : OGE_PAGE_ELLIPSIS);
  entries.push(...range(start, end + 1));
  // Right edge slot, mirrored.
  const lastBeforeBoundary = pageCount - boundary - 1;
  entries.push(
    end === lastBeforeBoundary - 1 ? lastBeforeBoundary : OGE_PAGE_ELLIPSIS,
  );
  entries.push(...range(pageCount - boundary, pageCount));
  return entries;
}

export interface OgePageRangeRequest {
  /** 0-based current page. */
  readonly pageIndex: number;
  /** Items per page; `<= 0` means "all items on one page". */
  readonly pageSize: number;
  readonly itemCount: number;
}

export interface OgePageRangeResult {
  /** 1-based first item of the page; `0` when there are no items. */
  readonly from: number;
  /** 1-based last item of the page; `0` when there are no items. */
  readonly to: number;
}

/** The `{from}–{to} of {itemCount}` arithmetic of the info text. */
export function resolvePageRange(
  request: OgePageRangeRequest,
): OgePageRangeResult {
  const itemCount = Math.max(0, Math.floor(request.itemCount));
  if (itemCount === 0) return { from: 0, to: 0 };
  const pageSize = Math.floor(request.pageSize);
  if (pageSize <= 0) return { from: 1, to: itemCount };
  const pageCount = resolvePageCount({ itemCount, pageSize });
  const page = clamp(Math.floor(request.pageIndex), 0, pageCount - 1);
  const from = page * pageSize + 1;
  return { from, to: Math.min(from + pageSize - 1, itemCount) };
}

export interface OgePageCountRequest {
  readonly itemCount: number;
  /** Items per page; `<= 0` means "all items on one page". */
  readonly pageSize: number;
}

/**
 * Pages needed for `itemCount` items — never below 1, so a zero-item
 * pagination still renders one (disabled-rails) page and no caller ever
 * divides by zero.
 */
export function resolvePageCount(request: OgePageCountRequest): number {
  const itemCount = Math.max(0, Math.floor(request.itemCount));
  const pageSize = Math.floor(request.pageSize);
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
}
