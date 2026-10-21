/**
 * Excel's pixels for gridlines and borders, measured on screen (Excel 16.0,
 * build 17932, 96 dpi — `testing/tools/chrome-capture.ps1`), as SVG path data
 * both render layers stroke with `shape-rendering: crispEdges`:
 *
 * - A **gridline** is the last pixel row of each row and the last pixel
 *   column of each column. A fill hides the four gridlines around its cell
 *   (its box starts one pixel up and left and paints over the top and left
 *   ones), a merge hides the gridlines inside it, text spilling into empty
 *   neighbours hides the vertical gridlines it crosses, and a border hides
 *   the gridline it lies on — a dashed border's gaps show white.
 * - A **1 px border** lies on the gridline; a **2 px** one (medium, the
 *   medium dashes, slantDashDot) on the gridline and the pixel before it;
 *   **thick** and **double** are 3 px centred on it — a double's two lines
 *   leave the gridline pixel blank.
 * - Along its edge a border runs from the gridline before the cell to the
 *   cell's own gridline, widened by its thickness so corners close: thin
 *   `[x − 1, x + w − 1]`, medium `[x − 2, x + w − 1]`, thick `[x − 2, x + w]`.
 *   A double's outer line takes the thick extent, its inner one `[x, x + w − 2]`.
 *   A right edge starts at the cell's first row: the corner above it is the
 *   top edge's.
 * - Dash patterns are anchored to the grid window's top-left corner (the
 *   headers included), not to the cell: a pixel's place in the pattern is its
 *   distance from that corner, plus 1 for hair and dotted and 3 for dashed.
 *   Measured on every dashed style along both axes; the render layers anchor
 *   to the sheet as it sits unscrolled.
 *
 * Coordinates are a pane's: sheet pixels at the zoom minus the pane origin.
 */
import type { OgeBorderStyle } from '../model/style';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgePaintCell } from './paint-window';
import type { OgePaintEdge } from './resolve-style';
import type { OgeZoomedAxes } from './sheet-layout';

/** The window a drawing covers and where it starts (sheet pixels at the zoom). */
export interface OgeDrawPane {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
  readonly originX: number;
  readonly originY: number;
  /**
   * Where the sheet's top-left sits in the grid window — the header sizes —
   * which anchors the dash patterns. Default 0.
   */
  readonly dashOriginX?: number;
  readonly dashOriginY?: number;
}

/** Lines to stroke, sharing one colour, width and dash. */
export interface OgeStroke {
  /** SVG path data in the pane's pixels. */
  readonly d: string;
  /** `#RRGGBB`; `null` is automatic (black). */
  readonly color: string | null;
  readonly width: number;
  /** `stroke-dasharray`; `null` for a solid line. */
  readonly dash: string | null;
  readonly dashOffset: number;
  /** Snap to whole pixels (`shape-rendering: crispEdges`); every line Excel draws is aliased. */
  readonly crisp: boolean;
}

/** A dash pattern's own offset from the window anchor (measured). */
const OFFSET: Partial<Record<OgeBorderStyle, number>> = {
  hair: 1,
  dotted: 1,
  dashed: 3,
};

/** slantDashDot is two offset 1 px rows: the outer one longer and a pixel later. */
const SLANT_OUTER = [11, 1, 5, 1];
const SLANT_INNER = [10, 2, 4, 2];

const key = (row: number, col: number) => row * 16384 + col;

/** SVG path data of a pane's gridlines (stroke them 1 px wide). */
export function ogeGridlinePath(
  sheet: OgeWorksheet,
  axes: OgeZoomedAxes,
  pane: OgeDrawPane,
  cells: readonly OgePaintCell[],
): string {
  const { rows, cols } = axes;
  if (pane.bottom < pane.top || pane.right < pane.left) return '';
  // what hides gridlines: fills (all four sides), merges (inside), spills
  // (crossed verticals), borders (the gridline they lie on)
  const filled = new Set<number>();
  const merged = new Map<number, OgePaintCell>();
  const spills = new Map<number, [number, number][]>();
  /** A border below row r at column c (`belowRow`), above row r (`aboveRow`), right / left of column c. */
  const belowRow = new Set<number>();
  const aboveRow = new Set<number>();
  const rightOfCol = new Set<number>();
  const leftOfCol = new Set<number>();
  for (const cell of cells) {
    const range = cell.merge ?? {
      top: cell.row,
      left: cell.col,
      bottom: cell.row,
      right: cell.col,
    };
    const top = Math.max(range.top, pane.top - 1);
    const bottom = Math.min(range.bottom, pane.bottom + 1);
    const left = Math.max(range.left, pane.left - 1);
    const right = Math.min(range.right, pane.right + 1);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (cell.fill) filled.add(key(r, c));
        if (cell.merge) merged.set(key(r, c), cell);
      }
    }
    for (let c = left; c <= right; c++) {
      if (cell.top) aboveRow.add(key(range.top, c));
      if (cell.bottom) belowRow.add(key(range.bottom, c));
    }
    for (let r = top; r <= bottom; r++) {
      if (cell.left) leftOfCol.add(key(r, range.left));
      if (cell.right) rightOfCol.add(key(r, range.right));
    }
    if (
      !cell.merge &&
      (cell.clipLeft < cell.x || cell.clipRight > cell.x + cell.width)
    ) {
      const list = spills.get(cell.row);
      const span: [number, number] = [cell.clipLeft, cell.clipRight];
      if (list) list.push(span);
      else spills.set(cell.row, [span]);
    }
  }
  const sameMerge = (r1: number, c1: number, r2: number, c2: number) => {
    const a = merged.get(key(r1, c1));
    return a !== undefined && a === merged.get(key(r2, c2));
  };
  const parts: string[] = [];
  const x0 = pane.originX;
  const y0 = pane.originY;
  // a border's line covers its pixels, corner extensions included: no gridline
  // pixel shows through there (a dash gap is the cell's background)
  const blockedColumn = new Map<number, number[]>();
  const blockedRow = new Map<number, number[]>();
  const block = (map: Map<number, number[]>, at: number, pixel: number) => {
    const list = map.get(at);
    if (list) list.push(pixel);
    else map.set(at, [pixel]);
  };
  // a double's gap row is part of its band: nothing shows through there either
  for (const { line } of borderLines(cells, pane, true)) {
    for (let p = line.from; p <= line.to; p++) {
      for (let t = 0; t < line.thickness; t++) {
        const x = line.horizontal ? p : line.at + t;
        const y = line.horizontal ? line.at + t : p;
        block(blockedColumn, x, y);
        block(blockedRow, y, x);
      }
    }
  }
  /** Path data of a run of pixels `[from, to)` on gridline `at`, minus blocked pixels. */
  const run = (vertical: boolean, at: number, from: number, to: number) => {
    const blocked = (vertical ? blockedColumn : blockedRow).get(at);
    const pieces: [number, number][] = [];
    let start = from;
    if (blocked) {
      for (const p of [...new Set(blocked)]
        .filter((b) => b >= from && b < to)
        .sort((a, b) => a - b)) {
        if (p > start) pieces.push([start, p]);
        start = p + 1;
      }
    }
    if (to > start) pieces.push([start, to]);
    for (const [a, b] of pieces) {
      parts.push(
        vertical ? `M${at + 0.5} ${a}V${b}` : `M${a} ${at + 0.5}H${b}`,
      );
    }
  };
  // vertical: each column's last pixel, broken where a row hides it
  for (let c = pane.left; c <= pane.right; c++) {
    if (cols.size(c) === 0) continue;
    const x = cols.offset(c + 1) - 1;
    const next = cols.nextVisible(c, 1);
    let from = -1;
    for (let r = pane.top; r <= pane.bottom + 1; r++) {
      const shown = r <= pane.bottom && rows.size(r) > 0;
      const hidden =
        shown &&
        (filled.has(key(r, c)) ||
          rightOfCol.has(key(r, c)) ||
          (next >= 0 &&
            (filled.has(key(r, next)) ||
              leftOfCol.has(key(r, next)) ||
              sameMerge(r, c, r, next))) ||
          (spills.get(r)?.some(([from, to]) => from <= x && to > x + 1) ??
            false));
      if (shown && !hidden) {
        if (from < 0) from = r;
      } else if (r > pane.bottom || hidden) {
        if (from >= 0) {
          run(true, x - x0, rows.offset(from) - y0, rows.offset(r) - y0);
          from = -1;
        }
      }
    }
  }
  // horizontal: each row's last pixel, broken where a column hides it
  for (let r = pane.top; r <= pane.bottom; r++) {
    if (rows.size(r) === 0) continue;
    const y = rows.offset(r + 1) - 1;
    const next = rows.nextVisible(r, 1);
    let from = -1;
    for (let c = pane.left; c <= pane.right + 1; c++) {
      const shown = c <= pane.right && cols.size(c) > 0;
      const hidden =
        shown &&
        (filled.has(key(r, c)) ||
          belowRow.has(key(r, c)) ||
          (next >= 0 &&
            (filled.has(key(next, c)) ||
              aboveRow.has(key(next, c)) ||
              sameMerge(r, c, next, c))));
      if (shown && !hidden) {
        if (from < 0) from = c;
      } else if (c > pane.right || hidden) {
        if (from >= 0) {
          run(false, y - y0, cols.offset(from) - x0, cols.offset(c) - x0);
          from = -1;
        }
      }
    }
  }
  return parts.join('');
}

interface Line {
  readonly horizontal: boolean;
  /** A double's blank middle row: blocks gridlines, draws nothing. */
  readonly gap?: boolean;
  /** First pixel row (horizontal) or column (vertical) the line covers. */
  readonly at: number;
  readonly thickness: number;
  /** First and last pixel along the line. */
  readonly from: number;
  readonly to: number;
}

/**
 * The pixel lines of one edge on gridline `g` along the cell's pixels
 * `[start, end]`; `outerBefore` for top and left edges (their outer side
 * comes first), `trailing` for a right edge, which starts at the cell.
 */
function edgeLines(
  edge: OgePaintEdge,
  horizontal: boolean,
  g: number,
  start: number,
  end: number,
  outerBefore: boolean,
  trailing = false,
): Line[] {
  // a dashed right edge starts at the cell; a solid one may close the corner like the others
  const from = (extension: number) =>
    trailing && edge.dash.length ? start : start - extension;
  if (edge.style === 'double') {
    const outer = {
      horizontal,
      at: outerBefore ? g - 1 : g + 1,
      thickness: 1,
      from: from(2),
      to: end + 1,
    };
    const inner = {
      horizontal,
      at: outerBefore ? g + 1 : g - 1,
      thickness: 1,
      from: start,
      to: end - 1,
    };
    const gap = {
      horizontal,
      at: g,
      thickness: 1,
      from: outer.from,
      to: outer.to,
      gap: true,
    };
    return [outer, inner, gap];
  }
  if (edge.width === 3)
    return [
      { horizontal, at: g - 1, thickness: 3, from: from(2), to: end + 1 },
    ];
  if (edge.width === 2)
    return [{ horizontal, at: g - 1, thickness: 2, from: from(2), to: end }];
  return [{ horizontal, at: g, thickness: 1, from: from(1), to: end }];
}

function linePath(line: Line): string {
  const middle = line.at + line.thickness / 2;
  return line.horizontal
    ? `M${line.from} ${middle}H${line.to + 1}`
    : `M${middle} ${line.from}V${line.to + 1}`;
}

/** Every border line the cells draw, in pane pixels, with its edge. */
function borderLines(
  cells: readonly OgePaintCell[],
  pane: OgeDrawPane,
  gaps = false,
): { edge: OgePaintEdge; line: Line }[] {
  const out: { edge: OgePaintEdge; line: Line }[] = [];
  for (const cell of cells) {
    const x0 = cell.x - pane.originX;
    const y0 = cell.y - pane.originY;
    const x1 = x0 + cell.width - 1;
    const y1 = y0 + cell.height - 1;
    const push = (edge: OgePaintEdge | null, lines: () => Line[]) => {
      if (edge)
        for (const line of lines())
          if (gaps || !line.gap) out.push({ edge, line });
    };
    push(cell.top, () =>
      edgeLines(cell.top as OgePaintEdge, true, y0 - 1, x0, x1, true),
    );
    push(cell.bottom, () =>
      edgeLines(cell.bottom as OgePaintEdge, true, y1, x0, x1, false),
    );
    push(cell.left, () =>
      edgeLines(cell.left as OgePaintEdge, false, x0 - 1, y0, y1, true),
    );
    push(cell.right, () =>
      edgeLines(cell.right as OgePaintEdge, false, x1, y0, y1, false, true),
    );
  }
  return out;
}

/** The border strokes of painted cells, merged by colour, width and dash. */
export function ogeBorderStrokes(
  cells: readonly OgePaintCell[],
  pane: OgeDrawPane,
): OgeStroke[] {
  const groups = new Map<
    string,
    {
      color: string | null;
      width: number;
      dash: string | null;
      dashOffset: number;
      crisp: boolean;
      parts: string[];
    }
  >();
  const add = (
    color: string | null,
    width: number,
    dash: string | null,
    dashOffset: number,
    crisp: boolean,
    d: string,
  ) => {
    const id = `${color}|${width}|${dash}|${dashOffset}|${crisp}`;
    const group = groups.get(id);
    if (group) group.parts.push(d);
    else groups.set(id, { color, width, dash, dashOffset, crisp, parts: [d] });
  };
  // a pane pixel's distance from the grid window's corner, along a line
  const anchorX = pane.originX + (pane.dashOriginX ?? 0);
  const anchorY = pane.originY + (pane.dashOriginY ?? 0);
  const phase = (line: Line, offset: number, period: number) =>
    mod(line.from + (line.horizontal ? anchorX : anchorY) + offset, period);
  const stroke = (edge: OgePaintEdge, line: Line) => {
    if (edge.style === 'slantDashDot') {
      // two rows: the outer one a pixel later and longer, which slants the dashes
      const rowsOf = [
        { at: line.at, pattern: SLANT_OUTER, offset: 17 },
        { at: line.at + 1, pattern: SLANT_INNER, offset: 0 },
      ];
      for (const row of rowsOf) {
        const piece = { ...line, at: row.at, thickness: 1 };
        add(
          edge.color,
          1,
          row.pattern.join(' '),
          phase(piece, row.offset, 18),
          true,
          linePath(piece),
        );
      }
      return;
    }
    const dash = edge.dash.length ? edge.dash.join(' ') : null;
    const period = edge.dash.reduce((sum, n) => sum + n, 0);
    add(
      edge.color,
      line.thickness,
      dash,
      dash ? phase(line, OFFSET[edge.style] ?? 0, period) : 0,
      true,
      linePath(line),
    );
  };
  for (const { edge, line } of borderLines(cells, pane)) stroke(edge, line);
  for (const cell of cells) {
    const x0 = cell.x - pane.originX;
    const y0 = cell.y - pane.originY;
    const x1 = x0 + cell.width - 1;
    const y1 = y0 + cell.height - 1;
    // diagonals run from gridline corner to gridline corner, aliased like Excel's
    if (cell.diagonalUp) {
      add(
        cell.diagonalUp.color,
        cell.diagonalUp.width,
        null,
        0,
        true,
        `M${x0 - 0.5} ${y1 + 0.5}L${x1 + 0.5} ${y0 - 0.5}`,
      );
    }
    if (cell.diagonalDown) {
      add(
        cell.diagonalDown.color,
        cell.diagonalDown.width,
        null,
        0,
        true,
        `M${x0 - 0.5} ${y0 - 0.5}L${x1 + 0.5} ${y1 + 0.5}`,
      );
    }
  }
  return [...groups.values()].map(({ parts, ...rest }) => ({
    ...rest,
    d: parts.join(''),
  }));
}

function mod(value: number, period: number): number {
  return period > 0 ? ((value % period) + period) % period : 0;
}
