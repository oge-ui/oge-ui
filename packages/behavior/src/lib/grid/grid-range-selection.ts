import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/**
 * Cell range selection (`selectionMode: 'cell'`), shared by both grid render
 * layers (ADR 0001).
 *
 * Coordinates are the grid's own navigation coordinates — the flat row index
 * (group, detail and data rows all count) and the visible column index — so a
 * range, the focused cell and the keyboard machine speak one language. Only
 * data rows ever hold cells; every helper here takes an `isDataRow` predicate
 * and skips the rest, which is what keeps a range dragged across a group
 * header from copying or pasting into it.
 */

/** One cell: flat row index + visible column index. */
export interface OgeGridCellCoord {
  readonly row: number;
  readonly col: number;
}

/**
 * One rectangular range. `anchor` is where the gesture started (the cell a
 * Shift+click extends from), `focus` the moving corner.
 */
export interface OgeGridCellRange {
  readonly anchor: OgeGridCellCoord;
  readonly focus: OgeGridCellCoord;
}

/** A range as inclusive edges. */
export interface OgeGridRangeBounds {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

/** Fires after the selected ranges changed (`selectionMode: 'cell'`). */
export interface OgeRangeSelectionChangedEvent {
  ranges: readonly OgeGridCellRange[];
  /** Distinct data rows touched by the ranges. */
  rowCount: number;
  /** Distinct columns touched by the ranges. */
  columnCount: number;
  /** Selected data cells (overlaps counted once). */
  cellCount: number;
}

/** Normalizes a range to inclusive top/bottom/left/right edges. */
export function ogeRangeBounds(range: OgeGridCellRange): OgeGridRangeBounds {
  return {
    top: Math.min(range.anchor.row, range.focus.row),
    bottom: Math.max(range.anchor.row, range.focus.row),
    left: Math.min(range.anchor.col, range.focus.col),
    right: Math.max(range.anchor.col, range.focus.col),
  };
}

/** Whether a range covers the cell. */
export function ogeRangeContains(
  range: OgeGridCellRange,
  row: number,
  col: number,
): boolean {
  const b = ogeRangeBounds(range);
  return row >= b.top && row <= b.bottom && col >= b.left && col <= b.right;
}

/** Which edges of the selection outline a cell draws. */
export interface OgeGridRangeEdges {
  readonly top: boolean;
  readonly bottom: boolean;
  readonly start: boolean;
  readonly end: boolean;
}

/** The selected cells' coordinates, as a sorted row × column lattice. */
export interface OgeGridRangeLattice {
  /** Distinct data rows, ascending. */
  readonly rows: readonly number[];
  /** Distinct columns, ascending. */
  readonly cols: readonly number[];
  /** Whether one lattice point is actually selected (multi-range gaps). */
  isSelected(row: number, col: number): boolean;
}

/**
 * Every selected data cell of `ranges`, as the rows × columns lattice copy and
 * the announcements need. Several ranges merge into their union: a gap the
 * ranges leave inside the lattice copies as an empty cell.
 */
export function ogeRangeLattice(
  ranges: readonly OgeGridCellRange[],
  isDataRow: (row: number) => boolean,
): OgeGridRangeLattice {
  const rows = new Set<number>();
  const cols = new Set<number>();
  const bounds = ranges.map(ogeRangeBounds);
  for (const b of bounds) {
    for (let row = b.top; row <= b.bottom; row++)
      if (isDataRow(row)) rows.add(row);
    for (let col = b.left; col <= b.right; col++) cols.add(col);
  }
  return {
    rows: [...rows].sort((a, b) => a - b),
    cols: [...cols].sort((a, b) => a - b),
    isSelected: (row, col) =>
      bounds.some(
        (b) =>
          row >= b.top && row <= b.bottom && col >= b.left && col <= b.right,
      ),
  };
}

/** Options of {@link OgeGridRangeSelectionCore}. */
export interface OgeGridRangeSelectionDeps {
  /** Whether the flat row holds data cells (group/detail/summary rows do not). */
  isDataRow: (row: number) => boolean;
  /** Ctrl/Cmd+click may add ranges; `false` keeps exactly one. Default `true`. */
  multiple?: () => boolean;
}

/**
 * The range machine: which ranges are selected, how a click, Shift+click,
 * Ctrl+click, drag or Shift+Arrow changes them, and the per-cell questions
 * the templates ask (selected? which outline edges?).
 */
export class OgeGridRangeSelectionCore {
  /** The selected ranges, most recent last (the active one). */
  readonly ranges: () => readonly OgeGridCellRange[];
  /** Counts the change event and the announcement report. */
  readonly stats: () => {
    rowCount: number;
    columnCount: number;
    cellCount: number;
  };

  private readonly _ranges: OgeReactiveCell<readonly OgeGridCellRange[]>;

  constructor(
    private readonly deps: OgeGridRangeSelectionDeps,
    rx: OgeReactivityAdapter,
  ) {
    this._ranges = rx.cell<readonly OgeGridCellRange[]>([]);
    this.ranges = () => this._ranges();
    this.stats = rx.derived(() => {
      const lattice = ogeRangeLattice(this._ranges(), this.deps.isDataRow);
      let cells = 0;
      for (const row of lattice.rows)
        for (const col of lattice.cols)
          if (lattice.isSelected(row, col)) cells++;
      return {
        rowCount: lattice.rows.length,
        columnCount: lattice.cols.length,
        cellCount: cells,
      };
    });
  }

  /** The range the next Shift gesture extends (the last one). */
  activeRange(): OgeGridCellRange | null {
    const ranges = this._ranges();
    return ranges.length ? ranges[ranges.length - 1] : null;
  }

  /** Plain click / plain keyboard move: one single-cell range. */
  selectCell(cell: OgeGridCellCoord): void {
    const active = this.activeRange();
    if (
      this._ranges().length === 1 &&
      active &&
      sameCell(active.anchor, cell) &&
      sameCell(active.focus, cell)
    )
      return;
    this._ranges.set([{ anchor: cell, focus: cell }]);
  }

  /**
   * Shift+click / Shift+Arrow / drag: moves the active range's moving corner,
   * keeping its anchor. Without a range yet, starts one at `cell`.
   */
  extendTo(cell: OgeGridCellCoord): void {
    const ranges = this._ranges();
    const active = this.activeRange();
    if (!active) {
      this._ranges.set([{ anchor: cell, focus: cell }]);
      return;
    }
    if (sameCell(active.focus, cell)) return;
    this._ranges.set([
      ...ranges.slice(0, -1),
      { anchor: active.anchor, focus: cell },
    ]);
  }

  /** Ctrl/Cmd+click: starts an additional range (or replaces, when single). */
  addCell(cell: OgeGridCellCoord): void {
    if (this.deps.multiple?.() === false) {
      this.selectCell(cell);
      return;
    }
    this._ranges.set([...this._ranges(), { anchor: cell, focus: cell }]);
  }

  /** Replaces every range (the `selectedRanges` binding, `selectRange()`). */
  setRanges(ranges: readonly OgeGridCellRange[]): void {
    this._ranges.set(ranges);
  }

  clear(): void {
    if (this._ranges().length) this._ranges.set([]);
  }

  /** Whether the cell lies in any range (data rows only). */
  isSelected(row: number, col: number): boolean {
    const ranges = this._ranges();
    if (!ranges.length || !this.deps.isDataRow(row)) return false;
    return ranges.some((range) => ogeRangeContains(range, row, col));
  }

  /**
   * The outline edges a selected cell draws — a side is drawn when the
   * neighbour across it is not selected, so overlapping ranges outline their
   * union. `null` for unselected cells.
   */
  edgesOf(row: number, col: number): OgeGridRangeEdges | null {
    if (!this.isSelected(row, col)) return null;
    const above = this.previousDataRow(row);
    const below = this.nextDataRow(row);
    return {
      top: above < 0 || !this.isSelected(above, col),
      bottom: below < 0 || !this.isSelected(below, col),
      start: !this.isSelected(row, col - 1),
      end: !this.isSelected(row, col + 1),
    };
  }

  /** Whether the cell is the active range's bottom-end corner (fill handle). */
  isFillCorner(row: number, col: number): boolean {
    const active = this.activeRange();
    if (!active || this._ranges().length !== 1) return false;
    const b = ogeRangeBounds(active);
    return lastDataRowIn(b, this.deps.isDataRow) === row && b.right === col;
  }

  private previousDataRow(row: number): number {
    for (let r = row - 1; r >= 0 && r >= row - 64; r--)
      if (this.deps.isDataRow(r)) return r;
    return -1;
  }

  private nextDataRow(row: number): number {
    for (let r = row + 1; r <= row + 64; r++)
      if (this.deps.isDataRow(r)) return r;
    return -1;
  }
}

function sameCell(a: OgeGridCellCoord, b: OgeGridCellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

/** The last data row inside the bounds, or `-1`. */
function lastDataRowIn(
  b: OgeGridRangeBounds,
  isDataRow: (row: number) => boolean,
): number {
  for (let row = b.bottom; row >= b.top; row--) if (isDataRow(row)) return row;
  return -1;
}

/**
 * The range selection's announcement: `{rows} × {columns}` cells. Returned
 * as the two counts the catalog pattern needs; `null` for a single cell,
 * which the focus move already speaks.
 */
export function ogeRangeAnnouncementCounts(stats: {
  rowCount: number;
  columnCount: number;
  cellCount: number;
}): { rows: number; columns: number; cells: number } | null {
  if (stats.cellCount <= 1) return null;
  return {
    rows: stats.rowCount,
    columns: stats.columnCount,
    cells: stats.cellCount,
  };
}

/** Whether a key event extends a cell range (Shift + a navigation key). */
export function isOgeRangeExtendKey(event: {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
}): boolean {
  if (!event.shiftKey || event.altKey) return false;
  return (
    event.key === 'ArrowUp' ||
    event.key === 'ArrowDown' ||
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowRight' ||
    event.key === 'Home' ||
    event.key === 'End' ||
    event.key === 'PageUp' ||
    event.key === 'PageDown'
  );
}
