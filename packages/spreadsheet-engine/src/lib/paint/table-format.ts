/**
 * Excel tables' styles on their cells (`OgeTablePainter`), as Excel 16.0
 * draws them — measured through COM (`DisplayFormat`) and on screen
 * (`testing/corpus/tables.*`):
 *
 * - **Elements apply in order** — the whole table, the column stripes, the
 *   row stripes, the last column, the first column, the header row, the
 *   totals row, then the first and last header and total cells. A later one
 *   wins the fill and each font property it sets (bold, italic, underline,
 *   strikethrough, colour), an explicit "not italic" too.
 * - **Regions.** Stripes cover the data rows only and count the visible rows
 *   (columns) from the first data row (the first column), `size` at a time;
 *   the first and last column run through the header and totals rows; the
 *   corner cells need the first or last column shown.
 * - **The cell's own formatting wins**: any fill, and each font property
 *   that differs from the Normal style's font — a cell in the Normal colour
 *   (theme 1) takes the table's colour, the same black as RGB keeps its own.
 *   A border edge of its own wins over a table's line whatever its weight
 *   (`ogePaintWindow` applies that).
 * - **Lines.** On the line between two cells, the latest element of either
 *   cell that draws that line wins: an element draws its region's outer
 *   edges with its left, right, top and bottom border, and the lines inside
 *   the region with its vertical and horizontal one.
 */
import type { OgeColor } from '../color/color';
import type {
  OgeBorderEdge,
  OgeCellStyle,
  OgeFill,
  OgeFont,
} from '../model/style';
import type { OgeTable, OgeTableStyleElementType } from '../model/table';
import {
  ogeTableStyleFormats,
  type OgeTableStyleFormat,
} from '../model/table-styles';
import type { OgeWorkbook } from '../model/workbook';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeTableCellStyle, OgeTablePainter } from './paint-window';
import type { OgePaintEdge, OgeStyleResolver } from './resolve-style';

/** The elements in the order they apply; a later one wins. */
const ORDER: readonly OgeTableStyleElementType[] = [
  'wholeTable',
  'firstColumnStripe',
  'secondColumnStripe',
  'firstRowStripe',
  'secondRowStripe',
  'lastColumn',
  'firstColumn',
  'headerRow',
  'totalRow',
  'firstHeaderCell',
  'lastHeaderCell',
  'firstTotalCell',
  'lastTotalCell',
];
// places in ORDER (a stripe's second kind follows its first)
const WHOLE = 0;
const COLUMN_STRIPE = 1;
const ROW_STRIPE = 3;
const LAST_COLUMN = 5;
const FIRST_COLUMN = 6;
const HEADER = 7;
const TOTAL = 8;
const FIRST_HEADER = 9;
const LAST_HEADER = 10;
const FIRST_TOTAL = 11;
const LAST_TOTAL = 12;

/** The font properties a table style sets. */
const FONT_KEYS = ['bold', 'italic', 'underline', 'strike', 'color'] as const;
type TableFont = Pick<OgeFont, (typeof FONT_KEYS)[number]>;

/** A table with a style, laid out for lookups. */
interface Placed {
  readonly index: number;
  /** Each element's format by its place in {@link ORDER}. */
  readonly formats: readonly (OgeTableStyleFormat | undefined)[];
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  /** The header and totals rows; −1 when the table has none. */
  readonly header: number;
  readonly totals: number;
  readonly dataTop: number;
  readonly dataBottom: number;
  readonly first: boolean;
  readonly last: boolean;
  readonly rowStripes: boolean;
  readonly columnStripes: boolean;
  /** Stripe sizes: the first and second stripe's rows (columns). */
  readonly rowSizes: readonly [number, number];
  readonly columnSizes: readonly [number, number];
  /** Hidden data rows and table columns, ascending: stripes skip them. */
  readonly hiddenRows: readonly number[];
  readonly hiddenColumns: readonly number[];
}

/** An element on a cell: its place in the order and the region it covers there. */
interface Applied {
  readonly order: number;
  readonly region: number;
}

/** Where a cell is: its table and the elements that apply to it, in order. */
interface Spot {
  readonly table: Placed;
  readonly applied: readonly Applied[];
  /** One bit per applied element's order. */
  readonly mask: number;
}

/** The number of entries of an ascending list below `value`. */
function countBelow(list: readonly number[], value: number): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The stripe an index (row or column) falls in, counting visible ones from
 * `start`: whether it is a second stripe, and which stripe it is (so two
 * indexes in one stripe share it); `undefined` for a hidden one.
 */
function stripeOf(
  index: number,
  start: number,
  hidden: readonly number[],
  sizes: readonly [number, number],
): { readonly second: boolean; readonly instance: number } | undefined {
  const below = countBelow(hidden, index);
  if (hidden[below] === index) return undefined;
  const visible = index - start - below;
  const cycle = sizes[0] + sizes[1];
  const second = visible % cycle >= sizes[0];
  return {
    second,
    instance: Math.floor(visible / cycle) * 2 + (second ? 1 : 0),
  };
}

function sameColor(a: OgeColor | undefined, b: OgeColor | undefined): boolean {
  if (!a || !b) return a === b;
  return (
    a.rgb === b.rgb &&
    a.theme === b.theme &&
    a.indexed === b.indexed &&
    (a.tint ?? 0) === (b.tint ?? 0) &&
    !!a.auto === !!b.auto
  );
}

/** Whether a cell's font property is the Normal font's — then the table's shows. */
function asNormal(
  key: (typeof FONT_KEYS)[number],
  own: OgeFont,
  normal: OgeFont,
): boolean {
  if (key === 'color') return sameColor(own.color, normal.color);
  if (key === 'underline') return own.underline === normal.underline;
  return !!own[key] === !!normal[key];
}

/** Formats the cells of a sheet's styled tables. */
export class OgeTableFormatter implements OgeTablePainter {
  private readonly placed: Placed[] = [];
  private readonly composites = new Map<
    string,
    { readonly fill?: OgeFill; readonly font: TableFont }
  >();
  private readonly styles = new Map<string, OgeTableCellStyle>();

  constructor(
    private readonly workbook: OgeWorkbook,
    sheet: OgeWorksheet,
    private readonly resolver: OgeStyleResolver,
  ) {
    const hiddenRowsOf = (top: number, bottom: number) =>
      sheet.formattedRows().filter((row) => {
        if (row < top || row > bottom) return false;
        const info = sheet.getRow(row);
        // a zero height hides only as a custom one: Excel fits the others
        return (
          info?.hidden === true ||
          (info?.height === 0 && info.customHeight === true)
        );
      });
    const hiddenColumnsOf = (left: number, right: number) => {
      const out: number[] = [];
      for (const span of sheet.columnSpans()) {
        if (!span.hidden && span.width !== 0) continue;
        for (
          let c = Math.max(span.first, left);
          c <= Math.min(span.last, right);
          c++
        )
          out.push(c);
      }
      return out.sort((a, b) => a - b);
    };
    sheet.tables.forEach((table: OgeTable) => {
      const name = table.style?.name;
      const formats = name ? ogeTableStyleFormats(workbook, name) : undefined;
      if (!formats || !table.style) return;
      const { top, bottom, left, right } = table.range;
      const header = table.headerRowCount > 0 ? top : -1;
      const totals = table.totalsRowCount > 0 && bottom > header ? bottom : -1;
      const dataTop = header >= 0 ? top + 1 : top;
      const dataBottom = totals >= 0 ? bottom - 1 : bottom;
      const size = (type: OgeTableStyleElementType) => formats[type]?.size ?? 1;
      this.placed.push({
        index: this.placed.length,
        formats: ORDER.map((type) => formats[type]),
        top,
        bottom,
        left,
        right,
        header,
        totals,
        dataTop,
        dataBottom,
        first: table.style.showFirstColumn,
        last: table.style.showLastColumn,
        rowStripes: table.style.showRowStripes,
        columnStripes: table.style.showColumnStripes,
        rowSizes: [size('firstRowStripe'), size('secondRowStripe')],
        columnSizes: [size('firstColumnStripe'), size('secondColumnStripe')],
        hiddenRows: hiddenRowsOf(dataTop, dataBottom),
        hiddenColumns: hiddenColumnsOf(left, right),
      });
    });
  }

  /** Whether the sheet has a styled table. */
  get active(): boolean {
    return this.placed.length > 0;
  }

  covers(row: number, col: number): boolean {
    return this.tableAt(row, col) !== undefined;
  }

  spans(row: number): readonly (readonly [number, number])[] {
    const out: (readonly [number, number])[] = [];
    for (const p of this.placed)
      if (row >= p.top && row <= p.bottom) out.push([p.left, p.right]);
    return out;
  }

  style(
    row: number,
    col: number,
    styleId: number,
  ): OgeTableCellStyle | undefined {
    const spot = this.spot(row, col);
    if (!spot) return undefined;
    const key = `${styleId}|${spot.table.index}|${spot.mask}`;
    const known = this.styles.get(key);
    if (known) return known;
    const model = this.layer(styleId, this.composite(spot));
    const made = { model, resolved: this.resolver.resolveStyle(model) };
    this.styles.set(key, made);
    return made;
  }

  line(row: number, col: number, side: 'top' | 'left'): OgePaintEdge | null {
    const across = side === 'top';
    const before =
      across && row > 0
        ? this.spot(row - 1, col)
        : !across && col > 0
          ? this.spot(row, col - 1)
          : undefined;
    const after = this.spot(row, col);
    let best: { order: number; edge: OgeBorderEdge } | undefined;
    const shares = (spot: Spot | undefined, element: Applied, table: Placed) =>
      spot?.table === table &&
      spot.applied.some(
        (other) =>
          other.order === element.order && other.region === element.region,
      );
    // the cell before (above, left) first: on a tie the cell after wins
    if (before) {
      for (const element of before.applied) {
        const border = before.table.formats[element.order]?.format.border;
        const inside = shares(after, element, before.table);
        const edge = across
          ? inside
            ? border?.horizontal
            : border?.bottom
          : inside
            ? border?.vertical
            : border?.right;
        if (edge && (!best || element.order >= best.order))
          best = { order: element.order, edge };
      }
    }
    if (after) {
      for (const element of after.applied) {
        if (shares(before, element, after.table)) continue;
        const border = after.table.formats[element.order]?.format.border;
        const edge = across ? border?.top : border?.left;
        if (edge && (!best || element.order >= best.order))
          best = { order: element.order, edge };
      }
    }
    return best ? this.resolver.edge(best.edge) : null;
  }

  private tableAt(row: number, col: number): Placed | undefined {
    for (const p of this.placed) {
      if (row >= p.top && row <= p.bottom && col >= p.left && col <= p.right)
        return p;
    }
    return undefined;
  }

  /** The table a cell is in and the elements that apply to it. */
  private spot(row: number, col: number): Spot | undefined {
    const table = this.tableAt(row, col);
    if (!table) return undefined;
    const applied: Applied[] = [];
    let mask = 0;
    const add = (order: number, region: number) => {
      if (!table.formats[order]) return;
      applied.push({ order, region });
      mask |= 1 << order;
    };
    // a corner cell is a region of its own
    const cell = row * 16384 + col;
    const data = row >= table.dataTop && row <= table.dataBottom;
    add(WHOLE, 0);
    if (data && table.columnStripes) {
      const stripe = stripeOf(
        col,
        table.left,
        table.hiddenColumns,
        table.columnSizes,
      );
      if (stripe) add(COLUMN_STRIPE + (stripe.second ? 1 : 0), stripe.instance);
    }
    if (data && table.rowStripes) {
      const stripe = stripeOf(
        row,
        table.dataTop,
        table.hiddenRows,
        table.rowSizes,
      );
      if (stripe) add(ROW_STRIPE + (stripe.second ? 1 : 0), stripe.instance);
    }
    if (table.last && col === table.right) add(LAST_COLUMN, 0);
    if (table.first && col === table.left) add(FIRST_COLUMN, 0);
    if (row === table.header) add(HEADER, 0);
    if (row === table.totals) add(TOTAL, 0);
    if (row === table.header && table.first && col === table.left)
      add(FIRST_HEADER, cell);
    if (row === table.header && table.last && col === table.right)
      add(LAST_HEADER, cell);
    if (row === table.totals && table.first && col === table.left)
      add(FIRST_TOTAL, cell);
    if (row === table.totals && table.last && col === table.right)
      add(LAST_TOTAL, cell);
    return { table, applied, mask };
  }

  /** The fill and font a cell's elements give it, later ones winning. */
  private composite(spot: Spot): {
    readonly fill?: OgeFill;
    readonly font: TableFont;
  } {
    const key = `${spot.table.index}|${spot.mask}`;
    const known = this.composites.get(key);
    if (known) return known;
    let fill: OgeFill | undefined;
    const font: { -readonly [K in keyof TableFont]: TableFont[K] } = {};
    for (const { order } of spot.applied) {
      const format = spot.table.formats[order]?.format;
      if (format?.fill) fill = format.fill;
      for (const key of FONT_KEYS) {
        const value = format?.font?.[key];
        if (value !== undefined) (font as Record<string, unknown>)[key] = value;
      }
    }
    const made = { ...(fill ? { fill } : {}), font };
    this.composites.set(key, made);
    return made;
  }

  /** A cell's own style over its table's fill and font. */
  private layer(
    styleId: number,
    table: { readonly fill?: OgeFill; readonly font: TableFont },
  ): OgeCellStyle {
    const own = this.workbook.styles.get(styleId);
    const normal = this.workbook.defaultFont;
    let font: OgeFont | undefined = own.font;
    if (!own.font) {
      if (Object.keys(table.font).length) font = table.font;
    } else {
      const merged: { -readonly [K in keyof OgeFont]: OgeFont[K] } = {
        ...own.font,
      };
      for (const key of FONT_KEYS) {
        if (table.font[key] === undefined || !asNormal(key, own.font, normal))
          continue;
        (merged as Record<string, unknown>)[key] = table.font[key];
      }
      font = merged;
    }
    return {
      ...own,
      ...(own.fill === undefined && table.fill ? { fill: table.fill } : {}),
      ...(font ? { font } : {}),
    };
  }
}
