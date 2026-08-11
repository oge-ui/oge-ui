/** How the pagination renders: numeric buttons, the compact `N / M`
 * indicator, or automatically by container width. */
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
