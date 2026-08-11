import {
  OGE_PAGE_ELLIPSIS,
  resolvePageCount,
  resolvePageRange,
  resolvePageWindow,
  type OgePageWindowEntry,
} from './pagination-math';

const E = OGE_PAGE_ELLIPSIS;

describe('resolvePageWindow', () => {
  it('returns an empty window for a non-positive page count', () => {
    expect(resolvePageWindow({ pageIndex: 0, pageCount: 0 })).toEqual([]);
    expect(resolvePageWindow({ pageIndex: 3, pageCount: -5 })).toEqual([]);
  });

  it('returns every page when the count fits the budget', () => {
    expect(resolvePageWindow({ pageIndex: 0, pageCount: 1 })).toEqual([0]);
    expect(resolvePageWindow({ pageIndex: 1, pageCount: 2 })).toEqual([0, 1]);
    expect(resolvePageWindow({ pageIndex: 3, pageCount: 7 })).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it('renders both-side ellipses mid-range', () => {
    expect(resolvePageWindow({ pageIndex: 10, pageCount: 20 })).toEqual([
      0,
      E,
      9,
      10,
      11,
      E,
      19,
    ]);
  });

  it('extends the run instead of an ellipsis at the rails', () => {
    expect(resolvePageWindow({ pageIndex: 0, pageCount: 20 })).toEqual([
      0,
      1,
      2,
      3,
      4,
      E,
      19,
    ]);
    expect(resolvePageWindow({ pageIndex: 19, pageCount: 20 })).toEqual([
      0,
      E,
      15,
      16,
      17,
      18,
      19,
    ]);
  });

  it('never hides a single page behind an ellipsis', () => {
    // current=3: the run is 2..4, touching boundary+1 → page 1 renders, not '…'
    expect(resolvePageWindow({ pageIndex: 3, pageCount: 20 })).toEqual([
      0,
      1,
      2,
      3,
      4,
      E,
      19,
    ]);
    // current=4: the run is 3..5; the gap {1, 2} has two pages → ellipsis is honest
    expect(resolvePageWindow({ pageIndex: 4, pageCount: 20 })).toEqual([
      0,
      E,
      3,
      4,
      5,
      E,
      19,
    ]);
    for (let index = 0; index < 30; index++) {
      const window = resolvePageWindow({ pageIndex: index, pageCount: 30 });
      window.forEach((entry, i) => {
        if (entry !== E) return;
        const before = window[i - 1] as number;
        const after = window[i + 1] as number;
        expect(after - before).toBeGreaterThanOrEqual(3); // hides >= 2 pages
      });
    }
  });

  it('keeps a constant window length across every page (no layout jitter)', () => {
    for (const pageCount of [8, 13, 50, 200]) {
      for (let index = 0; index < pageCount; index++) {
        const window = resolvePageWindow({ pageIndex: index, pageCount });
        expect(window.length, `count=${pageCount} index=${index}`).toBe(
          Math.min(pageCount, 7),
        );
        expect(window).toContain(index); // current page always renders
        expect(window[0]).toBe(0);
        expect(window[window.length - 1]).toBe(pageCount - 1);
      }
    }
  });

  it('produces strictly increasing page numbers', () => {
    for (let index = 0; index < 40; index++) {
      const pages = resolvePageWindow({
        pageIndex: index,
        pageCount: 40,
      }).filter((entry): entry is number => entry !== E);
      for (let i = 1; i < pages.length; i++) {
        expect(pages[i]).toBeGreaterThan(pages[i - 1]);
      }
    }
  });

  it('floors maxButtons at the smallest honest shape (2×boundary + 3)', () => {
    for (const maxButtons of [0, 1, 4, 5]) {
      expect(
        resolvePageWindow({ pageIndex: 10, pageCount: 20, maxButtons }),
      ).toEqual([0, E, 10, E, 19]);
    }
  });

  it('honors boundaryCount 2', () => {
    expect(
      resolvePageWindow({
        pageIndex: 10,
        pageCount: 20,
        maxButtons: 9,
        boundaryCount: 2,
      }),
    ).toEqual([0, 1, E, 9, 10, 11, E, 18, 19]);
  });

  it('clamps an out-of-range pageIndex instead of throwing', () => {
    expect(resolvePageWindow({ pageIndex: -5, pageCount: 20 })).toEqual(
      resolvePageWindow({ pageIndex: 0, pageCount: 20 }),
    );
    expect(resolvePageWindow({ pageIndex: 99, pageCount: 20 })).toEqual(
      resolvePageWindow({ pageIndex: 19, pageCount: 20 }),
    );
  });

  it('supports an even maxButtons budget', () => {
    const window = resolvePageWindow({
      pageIndex: 10,
      pageCount: 20,
      maxButtons: 8,
    });
    expect(window.length).toBe(8);
    expect(window).toContain(10);
    expect(window[0]).toBe(0);
    expect(window[7]).toBe(19);
  });
});

describe('resolvePageRange', () => {
  it('computes the 1-based from/to of a full page', () => {
    expect(
      resolvePageRange({ pageIndex: 1, pageSize: 20, itemCount: 97 }),
    ).toEqual({ from: 21, to: 40 });
  });

  it('caps the last partial page at itemCount', () => {
    expect(
      resolvePageRange({ pageIndex: 4, pageSize: 20, itemCount: 97 }),
    ).toEqual({ from: 81, to: 97 });
  });

  it('treats a non-positive pageSize as "all"', () => {
    expect(
      resolvePageRange({ pageIndex: 3, pageSize: 0, itemCount: 97 }),
    ).toEqual({ from: 1, to: 97 });
  });

  it('reports 0–0 for zero items', () => {
    expect(
      resolvePageRange({ pageIndex: 0, pageSize: 20, itemCount: 0 }),
    ).toEqual({ from: 0, to: 0 });
  });

  it('clamps an out-of-range pageIndex to the last page', () => {
    expect(
      resolvePageRange({ pageIndex: 99, pageSize: 20, itemCount: 97 }),
    ).toEqual({ from: 81, to: 97 });
  });
});

describe('resolvePageCount', () => {
  it('divides and rounds up', () => {
    expect(resolvePageCount({ itemCount: 97, pageSize: 20 })).toBe(5);
    expect(resolvePageCount({ itemCount: 100, pageSize: 20 })).toBe(5);
  });

  it('never returns below 1', () => {
    expect(resolvePageCount({ itemCount: 0, pageSize: 20 })).toBe(1);
    expect(resolvePageCount({ itemCount: 5, pageSize: 0 })).toBe(1); // "all"
    expect(resolvePageCount({ itemCount: -3, pageSize: 20 })).toBe(1);
  });
});

// Type-only assertion: the entry union narrows as expected.
const _entry: OgePageWindowEntry = 3;
void _entry;
