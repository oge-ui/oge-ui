/**
 * Viewport arithmetic both render layers share: the header sizes, which rows
 * and columns each pane shows (frozen corner, frozen top, frozen start,
 * scrolling area), how far the scrollable area reaches, the cell under a
 * point, and where to scroll so a cell shows.
 *
 * Everything is in CSS pixels **at the zoom**: rows and columns are sized
 * the way Excel zooms them — each one rounded to whole pixels on its own
 * ({@link OgeSheetLayout.zoomed}) — so gridlines stay crisp at any zoom.
 * Cell positions are relative to the sheet's top-left (A1), headers
 * excluded. The scrollable area is, as in Excel, the used range plus a
 * margin — not all 1,048,576 rows — and it grows with the active cell.
 */
import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  type OgeCellRef,
  type OgeSheetRange,
} from '../address/address';
import {
  ogeColumnPadding,
  ogeFontMetrics,
  ogeFontPixelSize,
} from '../metrics/font-metrics';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeAxis } from '../paint/axis';
import type { OgeSheetLayout, OgeZoomedAxes } from '../paint/sheet-layout';

/** An inclusive index span; `last < first` when empty. */
export interface OgeIndexSpan {
  readonly first: number;
  readonly last: number;
}

/** A box in pixels at the zoom. */
export interface OgeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Row and column header sizes. */
export interface OgeSheetHeaders {
  /** Width of the row-number column, px (0 without headers). */
  readonly rowHeaderWidth: number;
  /** Height of the column-letter row, px (0 without headers). */
  readonly columnHeaderHeight: number;
  /** Font size of the header labels — the Normal font at the zoom, px. */
  readonly fontPx: number;
}

/**
 * Excel's header sizes for a Normal font, zoom and last visible row
 * (measured: `testing/captures/headers.json`, six Normal fonts, zoom
 * 50–200%, three- to seven-digit row numbers — every sample matches). The
 * row-number column fits `max(digits, 3)` digits of the Normal font at the
 * zoom plus the column padding; the column-letter row is one line of it.
 */
export function ogeSheetHeaders(
  font: { readonly name: string; readonly sizePt: number },
  zoom: number,
  lastVisibleRow: number,
): OgeSheetHeaders {
  const points = (font.sizePt * zoom) / 100;
  const metrics = ogeFontMetrics(font.name, points);
  const digits = Math.max(3, String(lastVisibleRow + 1).length);
  return {
    rowHeaderWidth:
      digits * metrics.maxDigitWidth + ogeColumnPadding(metrics.maxDigitWidth),
    columnHeaderHeight: metrics.lineHeight,
    fontPx: ogeFontPixelSize(points),
  };
}

/** The panes of a viewport. */
export interface OgeViewportPanes {
  /** Zoom in percent. */
  readonly zoom: number;
  /** The zoomed axes every position here comes from. */
  readonly axes: OgeZoomedAxes;
  /** Header sizes (zero when hidden). */
  readonly headers: OgeSheetHeaders;
  /** The cell area: the grid without its headers. */
  readonly cellWidth: number;
  readonly cellHeight: number;
  /** Frozen rows and columns (counts) and their size. */
  readonly frozenRows: number;
  readonly frozenColumns: number;
  readonly frozenHeight: number;
  readonly frozenWidth: number;
  /** Size of the scrollable part past the frozen panes (the extent). */
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  /** Where the scrolling area starts (the frozen panes' size, as sheet offsets). */
  readonly originX: number;
  readonly originY: number;
  /** Rows and columns the scrolling panes show (overscan included). */
  readonly rows: OgeIndexSpan;
  readonly cols: OgeIndexSpan;
  /** Rows and columns of the frozen panes. */
  readonly frozenRowSpan: OgeIndexSpan;
  readonly frozenColSpan: OgeIndexSpan;
  /** Rows and columns wholly in view, for Page Up/Down. */
  readonly pageRows: number;
  readonly pageCols: number;
}

/** What the viewport looks at. */
export interface OgeViewportInput {
  /** Scroll offsets of the scrolling area (a right-to-left `scrollLeft` may be negative). */
  readonly scrollTop: number;
  readonly scrollLeft: number;
  /** Size of the grid, headers included, px. */
  readonly width: number;
  readonly height: number;
  /** Zoom in percent. */
  readonly zoom: number;
  /** The active cell — the scrollable area always reaches it. */
  readonly active: OgeCellRef;
  /** Show the headers. Default: the sheet's own setting. */
  readonly headers?: boolean;
  /** Extra rows/columns rendered beyond each edge. Default 4 / 2. */
  readonly overscanRows?: number;
  readonly overscanCols?: number;
}

/** Rows and columns past the used range the scrollable area adds. */
const EXTENT_ROWS = 40;
const EXTENT_COLS = 12;

function span(first: number, last: number): OgeIndexSpan {
  return { first, last };
}

/** The panes, windows and scroll extent of a sheet at a scroll position. */
export function ogeViewportPanes(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
  input: OgeViewportInput,
): OgeViewportPanes {
  const axes = layout.zoomed(input.zoom);
  const { rows, cols } = axes;
  const showHeaders = input.headers ?? sheet.view.showHeaders;
  const frozenRows = Math.min(sheet.view.frozenRows, OGE_SHEET_MAX_ROWS - 1);
  const frozenColumns = Math.min(
    sheet.view.frozenColumns,
    OGE_SHEET_MAX_COLUMNS - 1,
  );
  const originY = rows.offset(frozenRows);
  const originX = cols.offset(frozenColumns);
  const overRows = input.overscanRows ?? 4;
  const overCols = input.overscanCols ?? 2;
  // rows first: the last row in view sets the row-number column's width
  const probe = ogeSheetHeaders(layout.normalFont, input.zoom, 0);
  const columnHeaderHeight = showHeaders ? probe.columnHeaderHeight : 0;
  const cellHeight = Math.max(0, input.height - columnHeaderHeight);
  const top = originY + Math.max(0, input.scrollTop);
  const bottom = top + Math.max(0, cellHeight - originY);
  const topRow = rows.indexAt(top);
  const lastVisibleRow = rows.indexAt(Math.max(top, bottom - 1));
  const headers = showHeaders
    ? ogeSheetHeaders(layout.normalFont, input.zoom, lastVisibleRow)
    : { rowHeaderWidth: 0, columnHeaderHeight: 0, fontPx: probe.fontPx };
  const cellWidth = Math.max(0, input.width - headers.rowHeaderWidth);
  const left = originX + Math.abs(input.scrollLeft);
  const right = left + Math.max(0, cellWidth - originX);
  const leftCol = cols.indexAt(left);
  const lastVisibleCol = cols.indexAt(Math.max(left, right - 1));
  // the scrollable area: the used range (and the active cell) plus a margin
  const used = sheet.usedRange();
  const screenRows = Math.ceil(cellHeight / Math.max(1, rows.defaultLength));
  const screenCols = Math.ceil(cellWidth / Math.max(1, cols.defaultLength));
  const lastRow = Math.min(
    OGE_SHEET_MAX_ROWS - 1,
    Math.max(used?.bottom ?? 0, input.active.row, frozenRows + screenRows) +
      EXTENT_ROWS,
  );
  const lastCol = Math.min(
    OGE_SHEET_MAX_COLUMNS - 1,
    Math.max(used?.right ?? 0, input.active.col, frozenColumns + screenCols) +
      EXTENT_COLS,
  );
  return {
    zoom: input.zoom,
    axes,
    headers,
    cellWidth,
    cellHeight,
    frozenRows,
    frozenColumns,
    frozenHeight: Math.min(originY, cellHeight),
    frozenWidth: Math.min(originX, cellWidth),
    scrollHeight: rows.offset(lastRow + 1) - originY,
    scrollWidth: cols.offset(lastCol + 1) - originX,
    originX,
    originY,
    rows: span(
      Math.max(frozenRows, topRow - overRows),
      Math.min(OGE_SHEET_MAX_ROWS - 1, lastVisibleRow + overRows),
    ),
    cols: span(
      Math.max(frozenColumns, leftCol - overCols),
      Math.min(OGE_SHEET_MAX_COLUMNS - 1, lastVisibleCol + overCols),
    ),
    frozenRowSpan: span(0, frozenRows - 1),
    frozenColSpan: span(0, frozenColumns - 1),
    pageRows: Math.max(1, wholeInView(rows, top, bottom, topRow)),
    pageCols: Math.max(1, wholeInView(cols, left, right, leftCol)),
  };
}

/** Shown indices wholly inside [start, end), counted from `first`. */
function wholeInView(
  axis: OgeAxis,
  start: number,
  end: number,
  first: number,
): number {
  let count = 0;
  for (let i = first; i < axis.count && axis.offset(i + 1) <= end; i++) {
    if (axis.offset(i) >= start && axis.size(i) > 0) count++;
  }
  return count;
}

/** A range's box at the zoom. */
export function ogeRangeBox(axes: OgeZoomedAxes, range: OgeSheetRange): OgeBox {
  const x = axes.cols.offset(range.left);
  const y = axes.rows.offset(range.top);
  return {
    x,
    y,
    width: axes.cols.offset(range.right + 1) - x,
    height: axes.rows.offset(range.bottom + 1) - y,
  };
}

/** A cell's box at the zoom, merges included. */
export function ogeCellBox(
  sheet: OgeWorksheet,
  axes: OgeZoomedAxes,
  row: number,
  col: number,
): OgeBox {
  const merge = sheet.mergeAt(row, col);
  return ogeRangeBox(
    axes,
    merge ?? { top: row, left: col, bottom: row, right: col },
  );
}

/** The cell under a point (sheet pixels at the zoom); merges resolve to their owner. */
export function ogeCellAt(
  sheet: OgeWorksheet,
  axes: OgeZoomedAxes,
  x: number,
  y: number,
): OgeCellRef {
  const row = axes.rows.indexAt(Math.max(0, y));
  const col = axes.cols.indexAt(Math.max(0, x));
  const merge = sheet.mergeAt(row, col);
  return merge ? { row: merge.top, col: merge.left } : { row, col };
}

/** The scroll position that puts a cell at the start of the scrolling area (a sheet's saved `topLeftCell`). */
export function ogeScrollToCell(
  panes: OgeViewportPanes,
  cell: OgeCellRef,
): { scrollTop: number; scrollLeft: number } {
  const { rows, cols } = panes.axes;
  return {
    scrollTop: Math.max(
      0,
      rows.offset(Math.max(cell.row, panes.frozenRows)) - panes.originY,
    ),
    scrollLeft: Math.max(
      0,
      cols.offset(Math.max(cell.col, panes.frozenColumns)) - panes.originX,
    ),
  };
}

/**
 * The scroll position that shows a cell with as little movement as
 * possible. A cell in a frozen pane needs none; one taller or wider than
 * the view shows its top-left.
 */
export function ogeRevealScroll(
  sheet: OgeWorksheet,
  panes: OgeViewportPanes,
  cell: OgeCellRef,
  current: { readonly scrollTop: number; readonly scrollLeft: number },
): { scrollTop: number; scrollLeft: number } {
  const box = ogeCellBox(sheet, panes.axes, cell.row, cell.col);
  let scrollTop = Math.max(0, current.scrollTop);
  let scrollLeft = Math.abs(current.scrollLeft);
  if (cell.row >= panes.frozenRows) {
    const top = box.y - panes.originY;
    const bottom = top + box.height;
    const room = panes.cellHeight - panes.frozenHeight;
    if (top < scrollTop) scrollTop = top;
    else if (bottom > scrollTop + room)
      scrollTop = Math.min(top, bottom - room);
  }
  if (cell.col >= panes.frozenColumns) {
    const left = box.x - panes.originX;
    const right = left + box.width;
    const room = panes.cellWidth - panes.frozenWidth;
    if (left < scrollLeft) scrollLeft = left;
    else if (right > scrollLeft + room)
      scrollLeft = Math.min(left, right - room);
  }
  return {
    scrollTop: Math.max(0, scrollTop),
    scrollLeft: Math.max(0, scrollLeft),
  };
}
