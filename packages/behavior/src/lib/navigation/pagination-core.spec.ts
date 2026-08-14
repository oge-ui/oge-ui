import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_PAGINATION_MESSAGES,
  OGE_PAGE_ELLIPSIS,
  clampPaginationIndex,
  formatPaginationMessage,
  paginationHasNextPage,
  paginationInfoText,
  paginationIsCompact,
  paginationPageCount,
  resolveOgePaginationConfig,
  resolvePageWindow,
} from './pagination-core';

describe('paginationPageCount', () => {
  it('divides, rounding the partial last page up', () => {
    expect(paginationPageCount(100, 10)).toBe(10);
    expect(paginationPageCount(101, 10)).toBe(11);
  });

  it('reports one page for an empty result set — there is always a page 1', () => {
    expect(paginationPageCount(0, 10)).toBe(1);
  });

  it('reports one page when paging is off (pageSize 0 = all items)', () => {
    expect(paginationPageCount(500, 0)).toBe(1);
  });

  it('stays unknown while the total is unknown', () => {
    expect(paginationPageCount(undefined, 10)).toBeUndefined();
  });
});

describe('clampPaginationIndex', () => {
  it('brings the requested page into range', () => {
    expect(clampPaginationIndex(5, 3)).toBe(2);
    expect(clampPaginationIndex(-1, 3)).toBe(0);
    expect(clampPaginationIndex(1, 3)).toBe(1);
  });

  it('clamps only the floor while the total is unknown', () => {
    expect(clampPaginationIndex(99, undefined)).toBe(99);
    expect(clampPaginationIndex(-5, undefined)).toBe(0);
  });

  it('lands on page 0 for a single-page result set', () => {
    expect(clampPaginationIndex(3, 1)).toBe(0);
  });
});

describe('paginationHasNextPage', () => {
  it('disables next only on the known last page', () => {
    expect(paginationHasNextPage(0, 3)).toBe(true);
    expect(paginationHasNextPage(2, 3)).toBe(false);
  });

  it('keeps next live while the total is unknown', () => {
    expect(paginationHasNextPage(99, undefined)).toBe(true);
  });
});

describe('paginationIsCompact', () => {
  it('follows the explicit modes without measuring anything', () => {
    expect(
      paginationIsCompact({ displayMode: 'compact', containerSize: 2000 }),
    ).toBe(true);
    expect(
      paginationIsCompact({ displayMode: 'full', containerSize: 10 }),
    ).toBe(false);
  });

  it('switches the adaptive mode at the container threshold', () => {
    expect(
      paginationIsCompact({ displayMode: 'adaptive', containerSize: 320 }),
    ).toBe(true);
    expect(
      paginationIsCompact({ displayMode: 'adaptive', containerSize: 900 }),
    ).toBe(false);
  });

  it('honours a custom threshold', () => {
    expect(
      paginationIsCompact({
        displayMode: 'adaptive',
        containerSize: 700,
        compactBelow: 800,
      }),
    ).toBe(true);
  });

  it('treats an unmeasured container as wide enough', () => {
    expect(
      paginationIsCompact({ displayMode: 'adaptive', containerSize: 0 }),
    ).toBe(false);
  });
});

describe('message formatting', () => {
  it('replaces every named placeholder', () => {
    expect(
      formatPaginationMessage('{page} / {pageCount}', {
        page: 2,
        pageCount: 9,
      }),
    ).toBe('2 / 9');
  });

  it('leaves a placeholder with no parameter alone', () => {
    expect(formatPaginationMessage('Page {page}', {})).toBe('Page {page}');
  });

  it('builds the info range from the page state', () => {
    expect(
      paginationInfoText(OGE_DEFAULT_PAGINATION_MESSAGES.info, {
        pageIndex: 2,
        pageSize: 10,
        itemCount: 95,
      }),
    ).toBe('21–30 of 95');
  });

  it('caps the range at the real item count on the last page', () => {
    expect(
      paginationInfoText(OGE_DEFAULT_PAGINATION_MESSAGES.info, {
        pageIndex: 9,
        pageSize: 10,
        itemCount: 95,
      }),
    ).toBe('91–95 of 95');
  });

  it('reads an empty or unknown result set as 0–0 of 0', () => {
    expect(
      paginationInfoText(OGE_DEFAULT_PAGINATION_MESSAGES.info, {
        pageIndex: 0,
        pageSize: 10,
        itemCount: 0,
      }),
    ).toBe('0–0 of 0');
    expect(
      paginationInfoText(OGE_DEFAULT_PAGINATION_MESSAGES.info, {
        pageIndex: 0,
        pageSize: 10,
        itemCount: undefined,
      }),
    ).toBe('0–0 of 0');
  });
});

describe('resolvePageWindow (re-exported)', () => {
  it('renders every page while they fit the slot budget', () => {
    expect(
      resolvePageWindow({ pageIndex: 0, pageCount: 5, maxButtons: 7 }),
    ).toEqual([0, 1, 2, 3, 4]);
  });

  it('keeps a constant width with real ellipsis markers', () => {
    const window = resolvePageWindow({
      pageIndex: 10,
      pageCount: 30,
      maxButtons: 7,
    });
    expect(window).toHaveLength(7);
    expect(window[0]).toBe(0);
    expect(window[window.length - 1]).toBe(29);
    expect(window).toContain(OGE_PAGE_ELLIPSIS);
    expect(window).toContain(10);
  });
});

describe('resolveOgePaginationConfig', () => {
  it('defaults, merges messages key by key and carries the defaults through', () => {
    expect(resolveOgePaginationConfig(undefined).messages).toEqual(
      OGE_DEFAULT_PAGINATION_MESSAGES,
    );
    const config = resolveOgePaginationConfig({
      displayMode: 'compact',
      maxButtons: 5,
      messages: { allRows: 'Tümü' },
    });
    expect(config).toMatchObject({ displayMode: 'compact', maxButtons: 5 });
    expect(config.messages.allRows).toBe('Tümü');
    expect(config.messages.nextPage).toBe(
      OGE_DEFAULT_PAGINATION_MESSAGES.nextPage,
    );
  });
});
