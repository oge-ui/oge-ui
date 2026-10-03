import { describe, expect, it } from 'vitest';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OgeGridRangeSelectionCore,
  isOgeRangeExtendKey,
  ogeRangeAnnouncementCounts,
  ogeRangeBounds,
  ogeRangeLattice,
} from './grid-range-selection';

/** A plain-closure adapter — proves the machine needs no framework caching. */
const rx: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

/** Row 2 is a group row; the rest hold data. */
const isDataRow = (row: number): boolean => row !== 2 && row >= 0 && row < 8;

describe('cell range selection', () => {
  it('normalizes bounds whichever corner the gesture started from', () => {
    expect(
      ogeRangeBounds({ anchor: { row: 4, col: 3 }, focus: { row: 1, col: 0 } }),
    ).toEqual({ top: 1, bottom: 4, left: 0, right: 3 });
  });

  it('click selects one cell, Shift extends from the anchor, Ctrl adds a range', () => {
    const core = new OgeGridRangeSelectionCore({ isDataRow }, rx);
    core.selectCell({ row: 0, col: 0 });
    core.extendTo({ row: 1, col: 2 });
    expect(core.ranges()).toEqual([
      { anchor: { row: 0, col: 0 }, focus: { row: 1, col: 2 } },
    ]);
    expect(core.isSelected(1, 1)).toBe(true);
    expect(core.isSelected(3, 1)).toBe(false);
    core.addCell({ row: 5, col: 4 });
    expect(core.ranges()).toHaveLength(2);
    expect(core.isSelected(5, 4)).toBe(true);
    // Shift extends the *active* (last) range only
    core.extendTo({ row: 6, col: 4 });
    expect(core.ranges()[0]).toEqual({
      anchor: { row: 0, col: 0 },
      focus: { row: 1, col: 2 },
    });
    expect(core.isSelected(6, 4)).toBe(true);
  });

  it('multipleRanges: false keeps a single range', () => {
    const core = new OgeGridRangeSelectionCore(
      { isDataRow, multiple: () => false },
      rx,
    );
    core.selectCell({ row: 0, col: 0 });
    core.addCell({ row: 3, col: 3 });
    expect(core.ranges()).toEqual([
      { anchor: { row: 3, col: 3 }, focus: { row: 3, col: 3 } },
    ]);
  });

  it('never selects cells of non-data rows and counts only data cells', () => {
    const core = new OgeGridRangeSelectionCore({ isDataRow }, rx);
    core.selectCell({ row: 1, col: 0 });
    core.extendTo({ row: 3, col: 1 });
    expect(core.isSelected(2, 0)).toBe(false);
    expect(core.stats()).toEqual({ rowCount: 2, columnCount: 2, cellCount: 4 });
  });

  it('outlines the union of overlapping ranges', () => {
    const core = new OgeGridRangeSelectionCore({ isDataRow }, rx);
    core.selectCell({ row: 0, col: 0 });
    core.extendTo({ row: 1, col: 1 });
    expect(core.edgesOf(0, 0)).toEqual({
      top: true,
      bottom: false,
      start: true,
      end: false,
    });
    expect(core.edgesOf(1, 1)).toEqual({
      top: false,
      bottom: true,
      start: false,
      end: true,
    });
    expect(core.edgesOf(5, 5)).toBeNull();
  });

  it('puts the fill corner on the last data row of a single range', () => {
    const core = new OgeGridRangeSelectionCore({ isDataRow }, rx);
    core.selectCell({ row: 0, col: 0 });
    core.extendTo({ row: 2, col: 1 });
    // row 2 is a group row: the corner is row 1
    expect(core.isFillCorner(1, 1)).toBe(true);
    expect(core.isFillCorner(2, 1)).toBe(false);
    core.addCell({ row: 5, col: 5 });
    expect(core.isFillCorner(5, 5)).toBe(false);
  });

  it('builds the copy lattice from several ranges with gaps', () => {
    const lattice = ogeRangeLattice(
      [
        { anchor: { row: 0, col: 0 }, focus: { row: 0, col: 1 } },
        { anchor: { row: 3, col: 2 }, focus: { row: 3, col: 2 } },
      ],
      isDataRow,
    );
    expect(lattice.rows).toEqual([0, 3]);
    expect(lattice.cols).toEqual([0, 1, 2]);
    expect(lattice.isSelected(0, 2)).toBe(false);
    expect(lattice.isSelected(3, 2)).toBe(true);
  });

  it('announces ranges past one cell only', () => {
    expect(
      ogeRangeAnnouncementCounts({ rowCount: 1, columnCount: 1, cellCount: 1 }),
    ).toBeNull();
    expect(
      ogeRangeAnnouncementCounts({ rowCount: 2, columnCount: 3, cellCount: 6 }),
    ).toEqual({ rows: 2, columns: 3, cells: 6 });
  });

  it('recognizes Shift + navigation keys as range extensions', () => {
    expect(isOgeRangeExtendKey({ key: 'ArrowDown', shiftKey: true })).toBe(
      true,
    );
    expect(isOgeRangeExtendKey({ key: 'End', shiftKey: true })).toBe(true);
    expect(isOgeRangeExtendKey({ key: 'ArrowDown' })).toBe(false);
    expect(
      isOgeRangeExtendKey({ key: 'ArrowDown', shiftKey: true, altKey: true }),
    ).toBe(false);
    expect(isOgeRangeExtendKey({ key: 'a', shiftKey: true })).toBe(false);
  });
});
