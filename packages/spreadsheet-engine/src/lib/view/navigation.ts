/**
 * Selection and Excel's keyboard movement over a sheet: arrows step over
 * hidden rows and columns and treat a merge as one cell; Ctrl+arrow jumps to
 * the edge of the data the way Excel's End mode does; Ctrl+A grows to the
 * current region; Ctrl+End finds the last used cell.
 */
import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  ogeRangeContains,
  type OgeCellRef,
  type OgeSheetRange,
} from '../address/address';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeSheetLayout } from '../paint/sheet-layout';

/** A selection: ranges (the last one is active), the active cell, the extension anchor. */
export interface OgeSheetSelection {
  readonly ranges: readonly OgeSheetRange[];
  readonly active: OgeCellRef;
  readonly anchor: OgeCellRef;
}

/** A selection of one cell. */
export function ogeCellSelection(row: number, col: number): OgeSheetSelection {
  const cell = { row, col };
  return {
    ranges: [{ top: row, left: col, bottom: row, right: col }],
    active: cell,
    anchor: cell,
  };
}

/** The range between two corners, grown until no merge crosses its edge. */
export function ogeExpandToMerges(
  sheet: OgeWorksheet,
  range: OgeSheetRange,
): OgeSheetRange {
  let current = range;
  for (let guard = 0; guard < 64; guard++) {
    let next = current;
    for (const merge of sheet.mergesIn(current)) {
      next = {
        top: Math.min(next.top, merge.top),
        left: Math.min(next.left, merge.left),
        bottom: Math.max(next.bottom, merge.bottom),
        right: Math.max(next.right, merge.right),
      };
    }
    if (next === current) return current;
    if (
      next.top === current.top &&
      next.left === current.left &&
      next.bottom === current.bottom &&
      next.right === current.right
    )
      return next;
    current = next;
  }
  return current;
}

/** The range spanned by two cells, merges included. */
export function ogeSpanRange(
  sheet: OgeWorksheet,
  a: OgeCellRef,
  b: OgeCellRef,
): OgeSheetRange {
  return ogeExpandToMerges(sheet, {
    top: Math.min(a.row, b.row),
    left: Math.min(a.col, b.col),
    bottom: Math.max(a.row, b.row),
    right: Math.max(a.col, b.col),
  });
}

/** The merge owner when the cell is inside a merge, else the cell. */
export function ogeOwnerCell(
  sheet: OgeWorksheet,
  cell: OgeCellRef,
): OgeCellRef {
  const merge = sheet.mergeAt(cell.row, cell.col);
  return merge ? { row: merge.top, col: merge.left } : cell;
}

function visibleStep(
  layout: OgeSheetLayout,
  axis: 'rows' | 'cols',
  from: number,
  step: number,
): number {
  const target = layout[axis].nextVisible(from, step > 0 ? 1 : -1);
  return target < 0 ? from : target;
}

/**
 * One arrow-key step: past hidden rows and columns, and out of (or into) a
 * merge as a whole.
 */
export function ogeMoveCell(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
  from: OgeCellRef,
  dRow: number,
  dCol: number,
): OgeCellRef {
  const merge = sheet.mergeAt(from.row, from.col);
  let row = from.row;
  let col = from.col;
  if (dRow !== 0) {
    const edge = merge ? (dRow > 0 ? merge.bottom : merge.top) : row;
    row = visibleStep(layout, 'rows', edge, dRow);
    if (row === edge) row = from.row;
  }
  if (dCol !== 0) {
    const edge = merge ? (dCol > 0 ? merge.right : merge.left) : col;
    col = visibleStep(layout, 'cols', edge, dCol);
    if (col === edge) col = from.col;
  }
  return ogeOwnerCell(sheet, { row, col });
}

/** Moves `count` visible rows or columns at once (Page Down, Alt+Page Down). */
export function ogeMovePage(
  layout: OgeSheetLayout,
  from: OgeCellRef,
  rows: number,
  cols: number,
): OgeCellRef {
  let { row, col } = from;
  for (let i = 0; i < Math.abs(rows); i++)
    row = visibleStep(layout, 'rows', row, Math.sign(rows));
  for (let i = 0; i < Math.abs(cols); i++)
    col = visibleStep(layout, 'cols', col, Math.sign(cols));
  return { row, col };
}

function filled(sheet: OgeWorksheet, row: number, col: number): boolean {
  const cell = sheet.getCell(row, col);
  return (
    cell !== undefined &&
    (cell.value !== undefined || cell.formula !== undefined)
  );
}

/**
 * Ctrl+arrow: from a filled cell beside another filled cell, to the end of
 * the run; otherwise to the next filled cell, or the sheet's edge.
 */
export function ogeDataEdge(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
  from: OgeCellRef,
  dRow: number,
  dCol: number,
): OgeCellRef {
  const axis = dRow !== 0 ? 'rows' : 'cols';
  const step = dRow !== 0 ? Math.sign(dRow) : Math.sign(dCol);
  const limit = axis === 'rows' ? OGE_SHEET_MAX_ROWS : OGE_SHEET_MAX_COLUMNS;
  const at = (i: number) =>
    axis === 'rows' ? filled(sheet, i, from.col) : filled(sheet, from.row, i);
  const make = (i: number) =>
    axis === 'rows' ? { row: i, col: from.col } : { row: from.row, col: i };
  let i = axis === 'rows' ? from.row : from.col;
  const next = (index: number) => {
    const n = layout[axis].nextVisible(index, step > 0 ? 1 : -1);
    return n < 0 ? index : n;
  };
  const first = next(i);
  if (first === i) return from;
  if (at(i) && at(first)) {
    // to the end of the filled run
    let j = first;
    for (;;) {
      const k = next(j);
      if (k === j || !at(k)) return ogeOwnerCell(sheet, make(j));
      j = k;
    }
  }
  // to the next filled cell — a sparse row is walked by its stored cells
  if (axis === 'cols') {
    let found = -1;
    if (step > 0) {
      sheet.forEachInRow(
        from.row,
        (cell, col) => {
          if (
            found < 0 &&
            col > i &&
            (cell.value !== undefined || cell.formula !== undefined) &&
            layout.cols.size(col) > 0
          )
            found = col;
        },
        i + 1,
      );
    } else {
      sheet.forEachInRow(
        from.row,
        (cell, col) => {
          if (
            col < i &&
            (cell.value !== undefined || cell.formula !== undefined) &&
            layout.cols.size(col) > 0
          )
            found = col;
        },
        0,
        i - 1,
      );
    }
    if (found >= 0) return ogeOwnerCell(sheet, make(found));
    return make(
      step > 0
        ? layout.cols.nextVisible(limit, -1)
        : layout.cols.firstVisibleFrom(0),
    );
  }
  i = first;
  while (!at(i)) {
    const k = next(i);
    if (k === i) return make(i);
    i = k;
  }
  return ogeOwnerCell(sheet, make(i));
}

/** Ctrl+End: the last row and last column holding data. */
export function ogeLastCell(sheet: OgeWorksheet): OgeCellRef {
  const used = sheet.usedRange();
  return used ? { row: used.bottom, col: used.right } : { row: 0, col: 0 };
}

/**
 * Ctrl+A's first press: the block of filled cells around `cell`, bounded by
 * empty rows and columns (Excel's "current region").
 */
export function ogeCurrentRegion(
  sheet: OgeWorksheet,
  cell: OgeCellRef,
): OgeSheetRange {
  let region: OgeSheetRange = {
    top: cell.row,
    left: cell.col,
    bottom: cell.row,
    right: cell.col,
  };
  const anyFilled = (
    top: number,
    left: number,
    bottom: number,
    right: number,
  ) => {
    for (
      let r = Math.max(0, top);
      r <= Math.min(OGE_SHEET_MAX_ROWS - 1, bottom);
      r++
    ) {
      let hit = false;
      sheet.forEachInRow(
        r,
        (stored) => {
          if (stored.value !== undefined || stored.formula !== undefined)
            hit = true;
        },
        Math.max(0, left),
        Math.min(OGE_SHEET_MAX_COLUMNS - 1, right),
      );
      if (hit) return true;
    }
    return false;
  };
  for (let guard = 0; guard < 100_000; guard++) {
    const { top, left, bottom, right } = region;
    const grow = {
      top:
        top > 0 && anyFilled(top - 1, left - 1, top - 1, right + 1)
          ? top - 1
          : top,
      bottom: anyFilled(bottom + 1, left - 1, bottom + 1, right + 1)
        ? bottom + 1
        : bottom,
      left:
        left > 0 && anyFilled(top - 1, left - 1, bottom + 1, left - 1)
          ? left - 1
          : left,
      right: anyFilled(top - 1, right + 1, bottom + 1, right + 1)
        ? right + 1
        : right,
    };
    if (
      grow.top === top &&
      grow.bottom === bottom &&
      grow.left === left &&
      grow.right === right
    )
      break;
    region = grow;
  }
  return ogeExpandToMerges(sheet, region);
}

/** Whether a selection covers a cell. */
export function ogeSelectionContains(
  selection: OgeSheetSelection,
  row: number,
  col: number,
): boolean {
  return selection.ranges.some((range) => ogeRangeContains(range, row, col));
}

/** Number of cells a selection covers (overlaps counted once per range, as Excel counts). */
export function ogeSelectionSize(selection: OgeSheetSelection): number {
  return selection.ranges.reduce(
    (sum, r) => sum + (r.bottom - r.top + 1) * (r.right - r.left + 1),
    0,
  );
}
