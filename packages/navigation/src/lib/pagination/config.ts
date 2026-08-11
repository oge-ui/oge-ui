import { InjectionToken, type Provider } from '@angular/core';
import type { OgePaginationDisplayMode } from './pagination-types';

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

export const OGE_PAGINATION_CONFIG = new InjectionToken<OgePaginationConfig>(
  'OGE_PAGINATION_CONFIG',
  {
    factory: () => OGE_DEFAULT_PAGINATION_CONFIG,
  },
);

export type OgePaginationConfigInput = Partial<
  Omit<OgePaginationConfig, 'messages'>
> & {
  messages?: Partial<OgePaginationMessages>;
};

/**
 * Application- or component-scoped pagination defaults:
 *
 * ```ts
 * providers: [
 *   provideOgePaginationConfig({
 *     maxButtons: 9,
 *     messages: { pageSizeLabel: 'Sayfa başına' },
 *   }),
 * ]
 * ```
 */
export function provideOgePaginationConfig(
  config: OgePaginationConfigInput,
): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_PAGINATION_CONFIG,
    useValue: {
      ...OGE_DEFAULT_PAGINATION_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_PAGINATION_MESSAGES, ...messages },
    } satisfies OgePaginationConfig,
  };
}
