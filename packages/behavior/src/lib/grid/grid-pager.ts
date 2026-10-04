/**
 * The pager's decisions, shared by `<oge-pager>` and the React `<OgePager>`
 * (ADR 0001): which page buttons show, what a typed page number means, and
 * the context the info-text slot receives.
 */

/** Windowed page list: first, last, and up to 5 pages around the current one. */
export function ogePagerPages(count: number, current: number): number[] {
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

/**
 * The zero-based page a go-to-page input means: the typed 1-based number,
 * clamped into `[1, pageCount]`; `null` for text that is not a whole number
 * (the input then snaps back to the current page).
 */
export function ogeParsePageInput(
  text: string,
  pageCount: number,
): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const page = Number(trimmed);
  return Math.min(Math.max(page, 1), Math.max(1, pageCount)) - 1;
}

/** What the pager's info slot (`ogePagerInfoTemplate` / `renderInfo`) receives. */
export interface OgePagerInfoContext {
  /** Zero-based current page. */
  pageIndex: number;
  pageCount: number;
  totalCount: number;
  /** Current page size; `0` when every row is shown. */
  pageSize: number;
  /** First row of the page, 1-based (`0` when there are no rows). */
  firstRow: number;
  /** Last row of the page, 1-based. */
  lastRow: number;
  /** The default info text (`{count} rows`). */
  text: string;
}

/** Builds the info slot's context. */
export function ogePagerInfoContext(input: {
  pageIndex: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  text: string;
}): OgePagerInfoContext {
  const { pageIndex, totalCount, pageSize } = input;
  const firstRow =
    totalCount === 0 ? 0 : pageSize > 0 ? pageIndex * pageSize + 1 : 1;
  const lastRow =
    pageSize > 0
      ? Math.min(totalCount, (pageIndex + 1) * pageSize)
      : totalCount;
  return { ...input, firstRow, lastRow };
}
