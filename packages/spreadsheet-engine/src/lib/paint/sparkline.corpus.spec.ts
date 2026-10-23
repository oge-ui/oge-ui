/**
 * Sparklines against Excel's screen (`testing/corpus/sparklines.*`): every
 * sparkline of the workbook as Excel saved it, read, formatted and drawn by
 * the engine in the cell box the engine lays out, its crisp shapes — bars,
 * the axis, marker cores — rasterised and split into same-colour components
 * the way `sparkline-boxes.mjs` split Excel's pixels, then compared
 * component for component. Lines are anti-aliased on both sides, so a line
 * sparkline is compared by its markers.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readOgeXlsxSync } from '../codec/read-xlsx';
import { readCapture } from '../../testing/excel-capture';
import { OGE_ESTIMATING_MEASURER } from './cell-text';
import { OgeStyleResolver } from './resolve-style';
import { OgeSheetLayout } from './sheet-layout';
import { ogeDrawSparkline, type OgeSparklineDrawing } from './sparkline';
import { OgeSparklineFormatter } from './sparkline-format';

/** `[part, x0, x1, y0, y1, pixels]`, cell-relative, ends inclusive. */
type Part = readonly [string, number, number, number, number, number];
interface CapturedCell {
  readonly r: number;
  readonly c: number;
  readonly w?: number;
  readonly h?: number;
  readonly parts?: readonly Part[];
  readonly error?: string;
}
interface CapturedSheet {
  readonly name: string;
  readonly zoom: number;
  readonly rtl?: boolean;
  readonly cells: readonly CapturedCell[];
}

const { workbook } = readOgeXlsxSync(
  new Uint8Array(
    readFileSync(resolve(__dirname, '../../../testing/corpus/sparklines.xlsx')),
  ),
);
const resolver = new OgeStyleResolver(workbook);
const captured = readCapture<{ sheets: readonly CapturedSheet[] }>(
  'corpus',
  'sparklines.boxes.json',
).sheets;

/** The corpus colours of the parts (sparkline-sources.ts). */
const PARTS: Readonly<Record<string, string>> = {
  '#0000FF': 'series',
  '#FF0000': 'negative',
  '#00FF00': 'axis',
  '#FF00FF': 'markers',
  '#00FFFF': 'first',
  '#FFFF00': 'last',
  '#800000': 'high',
  '#008000': 'low',
};
const MARKERS = new Set([
  'markers',
  'first',
  'last',
  'high',
  'low',
  'negative',
]);

/**
 * Cells Excel draws a pixel apart from the model: values that land a hair
 * off a half pixel, which Excel's own arithmetic puts on the other side —
 * a negative marker at −50 (MarkersBelow), the zero line at 150% (Axis150),
 * a column top at 125% (Zoom125). Rounding ties more loosely moves other
 * cells off instead. Each still misses: one that matches comes off the list.
 */
const KNOWN = new Set([
  'MarkersBelow 3:13',
  'MarkersBelow 4:2',
  'Axis150 2:3',
  'Axis150 11:2',
  'Zoom125 4:4',
]);

/** The shapes drawn on whole pixels, by part, in a `w` × `h` cell inside. */
function raster(
  drawing: OgeSparklineDrawing,
  w: number,
  h: number,
): (string | null)[][] {
  const grid = Array.from({ length: h }, () =>
    new Array<string | null>(w).fill(null),
  );
  const put = (x: number, y: number, color: string) => {
    if (x >= 0 && y >= 0 && x < w && y < h) grid[y][x] = PARTS[color];
  };
  for (const bar of drawing.bars)
    for (let y = bar.y0; y < bar.y1; y++)
      for (let x = bar.x0; x < bar.x1; x++) put(x, y, bar.color);
  const axis = drawing.axis;
  // an axis' half-pixel ends are painted half: no part's colour
  if (axis)
    for (let y = axis.y0; y < axis.y1; y++)
      for (let x = Math.ceil(axis.x0); x < Math.floor(axis.x1); x++)
        put(x, y, axis.color);
  for (const m of drawing.markers)
    for (let y = Math.floor(m.cy - m.d); y < m.cy + m.d; y++)
      for (let x = Math.floor(m.cx - m.d); x < m.cx + m.d; x++) {
        // a marker's core: the pixels the diamond covers whole
        const inside = [
          [x, y],
          [x + 1, y],
          [x, y + 1],
          [x + 1, y + 1],
        ].every(
          ([px, py]) => Math.abs(px - m.cx) + Math.abs(py - m.cy) <= m.d + 1e-9,
        );
        if (inside) put(x, y, m.color);
      }
  return grid;
}

/** Same-part, 4-connected components, as sparkline-boxes.mjs finds them. */
function components(grid: (string | null)[][]): Part[] {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const seen = new Uint8Array(w * h);
  const out: Part[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const name = grid[y][x];
      if (!name || seen[y * w + x]) continue;
      let [x0, x1, y0, y1, n] = [x, x, y, y, 0];
      const stack = [x, y];
      seen[y * w + x] = 1;
      while (stack.length) {
        const py = stack.pop() as number;
        const px = stack.pop() as number;
        n++;
        x0 = Math.min(x0, px);
        x1 = Math.max(x1, px);
        y0 = Math.min(y0, py);
        y1 = Math.max(y1, py);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const qx = px + dx;
          const qy = py + dy;
          if (qx < 0 || qy < 0 || qx >= w || qy >= h || seen[qy * w + qx])
            continue;
          if (grid[qy][qx] !== name) continue;
          seen[qy * w + qx] = 1;
          stack.push(qx, qy);
        }
      }
      out.push([name, x0, x1, y0, y1, n]);
    }
  return out;
}

const key = (parts: readonly Part[]) =>
  parts
    .map(([name, x0, x1, y0, y1, n]) => `${name}[${x0}-${x1}x${y0}-${y1} ${n}]`)
    .sort()
    .join(' ');

describe('sparklines — the corpus against Excel’s screen', () => {
  it('captured every sparkline sheet, each cell between its gridlines', () => {
    expect(captured.map((s) => s.name)).toEqual(
      workbook.sheets
        .filter((sheet) => sheet.sparklineGroups.length)
        .map((sheet) => sheet.name),
    );
    for (const sheet of captured)
      for (const cell of sheet.cells) expect(cell.error).toBeUndefined();
  });

  for (const sheet of captured) {
    it(`draws ${sheet.name} as Excel does`, () => {
      const model = workbook.sheet(sheet.name);
      if (!model) throw new Error(`no sheet ${sheet.name}`);
      expect(model.view.zoom).toBe(sheet.zoom);
      expect(model.view.rightToLeft).toBe(!!sheet.rtl);
      const layout = new OgeSheetLayout(model, resolver, {
        measurer: OGE_ESTIMATING_MEASURER,
      });
      const { rows, cols } = layout.zoomed(sheet.zoom);
      const formatter = new OgeSparklineFormatter(workbook, model, resolver);
      const misses: string[] = [];
      for (const cell of sheet.cells) {
        const row = cell.r - 1;
        const col = cell.c - 1;
        const merge = model.mergeAt(row, col);
        const at = merge ?? { top: row, left: col, bottom: row, right: col };
        const width = cols.offset(at.right + 1) - cols.offset(at.left);
        const height = rows.offset(at.bottom + 1) - rows.offset(at.top);
        // the box the engine lays out is Excel's: its inside and the gridline
        expect([width - 1, height - 1]).toEqual([cell.w, cell.h]);
        const spec = formatter.at(row, col);
        const drawing = spec
          ? ogeDrawSparkline(spec, width, height, sheet.zoom)
          : null;
        let ours = drawing
          ? components(raster(drawing, width - 1, height - 1))
          : [];
        let theirs = cell.parts ?? [];
        if (spec?.type === 'line') {
          ours = ours.filter(([name]) => MARKERS.has(name));
          // a marker-coloured run longer than a marker is the line's
          theirs = theirs.filter(
            ([name, x0, x1, y0, y1]) =>
              MARKERS.has(name) && x1 - x0 <= 30 && y1 - y0 <= 30,
          );
        }
        const id = `${sheet.name} ${cell.r}:${cell.c}`;
        const same = key(ours) === key(theirs);
        if (KNOWN.has(id)) {
          expect(same, `${id} matches now: take it off KNOWN`).toBe(false);
        } else if (!same) {
          misses.push(`${id}\n  ours  ${key(ours)}\n  excel ${key(theirs)}`);
        }
      }
      expect(misses).toEqual([]);
    });
  }
});
