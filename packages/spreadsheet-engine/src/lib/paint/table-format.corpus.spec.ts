/**
 * Tables against Excel (`testing/corpus/tables.*`): the tables Excel lists,
 * every cell's fill, font colour and font flags as Excel displayed them
 * (`Range.DisplayFormat`, capture.ps1), and every line between the cells of
 * the `Lines` and `Builtin` sheets' tables as Excel drew it on screen — the
 * five pixels across each line (table-lines.ps1).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseOgeCellAddress, parseOgeRangeAddress } from '../address/address';
import { readOgeXlsxSync } from '../codec/read-xlsx';
import { OGE_EN_US_FORMAT_LOCALE } from '../format/format-locale';
import type { OgeWorksheet } from '../model/worksheet';
import { readCapture } from '../../testing/excel-capture';
import { OGE_ESTIMATING_MEASURER } from './cell-text';
import { ogePaintWindow, type OgePaintCell } from './paint-window';
import { OgeStyleResolver, type OgePaintEdge } from './resolve-style';
import { OgeSheetLayout } from './sheet-layout';
import { OgeTableFormatter } from './table-format';

interface Shown {
  readonly a: string;
  readonly fill?: string;
  readonly font?: string;
  readonly b?: boolean;
  readonly i?: boolean;
  readonly u?: number;
  readonly s?: boolean;
}
interface CapturedTable {
  readonly name: string;
  readonly range: string;
  readonly style: string | null;
  readonly headers: boolean;
  readonly totals: boolean;
  readonly filter: boolean;
  readonly first: boolean;
  readonly last: boolean;
  readonly rowStripes: boolean;
  readonly columnStripes: boolean;
}
interface CapturedSheet {
  readonly name: string;
  readonly tables?: readonly CapturedTable[];
  readonly display?: readonly Shown[];
}

const { workbook } = readOgeXlsxSync(
  new Uint8Array(
    readFileSync(resolve(__dirname, '../../../testing/corpus/tables.xlsx')),
  ),
);
const resolver = new OgeStyleResolver(workbook);
const captured = readCapture<{ sheets: readonly CapturedSheet[] }>(
  'corpus',
  'tables.excel.json',
).sheets.filter((sheet) => sheet.tables?.length);
const screen = readCapture<{
  sheets: readonly { name: string; lines: readonly string[] }[];
}>('corpus', 'tables.lines.json').sheets;

/** XlUnderlineStyle of an underline. */
const UNDERLINE: Readonly<Record<string, number>> = {
  single: 2,
  double: -4119,
  singleAccounting: 4,
  doubleAccounting: 5,
};

/** The paint cells of a sheet's tables and the cells around them. */
function paint(sheet: OgeWorksheet, display: readonly Shown[]) {
  let bottom = 0;
  let right = 0;
  for (const item of display) {
    const ref = parseOgeCellAddress(item.a);
    bottom = Math.max(bottom, ref?.row ?? 0);
    right = Math.max(right, ref?.col ?? 0);
  }
  for (const table of sheet.tables) {
    bottom = Math.max(bottom, table.range.bottom + 1);
    right = Math.max(right, table.range.right + 1);
  }
  const layout = new OgeSheetLayout(sheet, resolver);
  const cells = ogePaintWindow(
    sheet,
    layout,
    resolver,
    { top: 0, left: 0, bottom, right },
    {
      measurer: OGE_ESTIMATING_MEASURER,
      locale: OGE_EN_US_FORMAT_LOCALE,
      dateSystem: workbook.dateSystem,
      tables: new OgeTableFormatter(workbook, sheet, resolver),
    },
  );
  const at = new Map<string, OgePaintCell>(
    cells.map((cell) => [`${cell.row},${cell.col}`, cell]),
  );
  return { layout, bottom, right, at };
}

const hex = (color: string | null | undefined) =>
  color ? color.slice(1).toUpperCase() : undefined;

describe('tables as Excel displays them', () => {
  it('captured the corpus', () => {
    expect(captured.map((sheet) => sheet.name)).toEqual([
      'Elements',
      'Lines',
      'Direct',
      'Hidden',
      'Builtin',
    ]);
    expect(captured.flatMap((sheet) => sheet.tables ?? [])).toHaveLength(81);
  });

  it.each(captured.map((sheet) => [sheet.name, sheet] as const))(
    'reads %s’s tables as Excel lists them',
    (name, shown) => {
      const sheet = workbook.sheet(name) as OgeWorksheet;
      const byName = (a: { name: string }, b: { name: string }) =>
        a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      const ours = sheet.tables.map((table) => ({
        name: table.name,
        range: [
          table.range.top,
          table.range.left,
          table.range.bottom,
          table.range.right,
        ],
        style: table.style?.name ?? null,
        headers: table.headerRowCount > 0,
        totals: table.totalsRowCount > 0,
        filter: !!table.autoFilter,
        first: table.style?.showFirstColumn ?? false,
        last: table.style?.showLastColumn ?? false,
        rowStripes: table.style?.showRowStripes ?? false,
        columnStripes: table.style?.showColumnStripes ?? false,
      }));
      const excel = (shown.tables ?? []).map((table) => {
        const range = parseOgeRangeAddress(table.range);
        return {
          ...table,
          range: [range?.top, range?.left, range?.bottom, range?.right],
        };
      });
      expect(ours.sort(byName)).toEqual(excel.sort(byName));
    },
  );

  it.each(captured.map((sheet) => [sheet.name, sheet] as const))(
    'gives every cell of %s the fill and font Excel shows',
    (name, shown) => {
      const sheet = workbook.sheet(name) as OgeWorksheet;
      const display = shown.display ?? [];
      const excel = new Map(display.map((item) => [item.a, item]));
      const { layout, bottom, right, at } = paint(sheet, display);
      const mismatches: string[] = [];
      let compared = 0;
      for (let row = 0; row <= bottom; row++) {
        if (layout.rows.size(row) === 0) continue;
        for (let col = 0; col <= right; col++) {
          if (layout.cols.size(col) === 0) continue;
          const address = `${String.fromCharCode(65 + col)}${row + 1}`;
          const cell = at.get(`${row},${col}`);
          const font = cell?.font;
          const ours = {
            fill: hex(cell?.fill?.color),
            font: hex(cell?.color ?? font?.color) ?? '000000',
            b: !!font?.bold,
            i: !!font?.italic,
            u: font?.underline ? UNDERLINE[font.underline] : -4142,
            s: !!font?.strike,
          };
          const item = excel.get(address);
          const theirs = {
            fill: item?.fill,
            font: item?.font ?? '000000',
            b: !!item?.b,
            i: !!item?.i,
            u: item?.u ?? -4142,
            s: !!item?.s,
          };
          compared++;
          if (JSON.stringify(ours) !== JSON.stringify(theirs))
            mismatches.push(
              `${address}: ours ${JSON.stringify(ours)} Excel ${JSON.stringify(theirs)}`,
            );
        }
      }
      expect(compared).toBeGreaterThan(50);
      expect(mismatches).toEqual([]);
    },
  );
});

/**
 * The five pixels across a line Excel draws for an edge between two cells
 * with these fills (`L` is the middle one, the last pixel of the row or
 * column before): thin on L, medium L − 1 and L, thick L − 1 to L + 1, double
 * L − 1 and L + 1. A fill reaches over L — the second cell's, else the
 * first's — and shows there without an edge (else the gridline) and in a
 * double's gap (else white).
 */
function expectedPixels(
  edge: OgePaintEdge | null,
  before: string | undefined,
  after: string | undefined,
): string[] {
  const b = before ?? 'FFFFFF';
  const a = after ?? 'FFFFFF';
  const over = after ?? before;
  if (!edge) return [b, b, over ?? 'E0E0E0', a, a];
  const c = hex(edge.color) ?? '000000';
  switch (edge.style) {
    case 'medium':
      return [b, c, c, a, a];
    case 'thick':
      return [b, c, c, c, a];
    case 'double':
      return [b, c, over ?? 'FFFFFF', c, a];
    default:
      return [b, b, c, a, a];
  }
}

describe('table lines as Excel draws them', () => {
  it.each(screen.map((sheet) => [sheet.name, sheet.lines] as const))(
    'draws every line of %s’s tables',
    (name, lines) => {
      const sheet = workbook.sheet(name) as OgeWorksheet;
      const display =
        captured.find((shown) => shown.name === name)?.display ?? [];
      const { at } = paint(sheet, display);
      const fill = (row: number, col: number) =>
        hex(at.get(`${row},${col}`)?.fill?.color);
      const mismatches: string[] = [];
      for (const line of lines) {
        const [kind, r, c, ...pixels] = line.split(' ');
        const row = Number(r) - 1;
        const col = Number(c) - 1;
        // the line above (row, col), or left of it: drawn by one of the two cells
        const across = kind === 'h';
        const [beforeRow, beforeCol] = across ? [row - 1, col] : [row, col - 1];
        const edge = across
          ? (at.get(`${row},${col}`)?.top ??
            at.get(`${beforeRow},${beforeCol}`)?.bottom ??
            null)
          : (at.get(`${row},${col}`)?.left ??
            at.get(`${beforeRow},${beforeCol}`)?.right ??
            null);
        const expected = expectedPixels(
          edge,
          fill(beforeRow, beforeCol),
          fill(row, col),
        );
        if (expected.join(' ') !== pixels.join(' '))
          mismatches.push(
            `${kind} ${r} ${c}: ours ${expected.join(' ')} Excel ${pixels.join(' ')}`,
          );
      }
      expect(lines.length).toBeGreaterThan(400);
      expect(mismatches).toEqual([]);
    },
  );
});
