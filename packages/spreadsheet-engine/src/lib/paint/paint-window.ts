/**
 * The paint model of a window of a sheet: every cell that shows something,
 * with its box, resolved style, display text, the edges it draws and where
 * its text may spill. Renderer-agnostic (ADR 0005): the DOM layers draw it
 * today; a canvas painter could draw the same model.
 *
 * Geometry is in sheet pixels at 100% zoom. Excel's rules, measured:
 *
 * - **Borders.** Two neighbours may both define the edge between them; the
 *   heavier style wins (`ogeBorderRank`), and a tie goes to the right or lower
 *   cell. Each edge is drawn once, by the cell that wins it.
 * - **Gridlines** run under everything; a fill hides the gridlines on all four
 *   sides of its cell, and a merge hides the ones inside it.
 * - **Tables** format their cells under the cells' own formatting
 *   (`OgeTablePainter`); a table's line between two cells shows only where
 *   neither cell has a border of its own, which wins whatever its weight.
 * - **Text** starts a margin (`ceil(MDW / 4)`, 2 px for Calibri 11) inside the
 *   cell, 9 px further per indent level; a line box as tall as the font's row
 *   height sits at the top, the middle `floor((h − line) / 2)` or the bottom
 *   `h − line` of the row (measured on screen; the box's last pixel is the
 *   row's gridline, which text does not reach).
 * - **A row's baseline.** Bottom-aligned one-line text in a row shares one
 *   baseline: the row's largest font descent above the bottom (a font's
 *   descent is a fifth of its line, an accounting underline adds 3 px), so a
 *   small label beside a 26 pt title sits on the title's baseline (measured).
 * - **Spill.** Text that is not wrapped, rotated, shrunk or merged paints over
 *   empty neighbours — right of a left-aligned cell, left of a right-aligned
 *   one, both ways when centred — up to the first cell with a value. Numbers
 *   never spill.
 */
import type { OgeSheetRange } from '../address/address';
import { isOgeRichText, type OgeCell } from '../model/cell';
import type { OgeHyperlink, OgeNote } from '../model/sheet-features';
import type { OgeCellStyle } from '../model/style';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeFormatLocale } from '../format/format-locale';
import type { OgeDateSystem } from '../date/date-serial';
import {
  ogeCellDisplay,
  type OgeCellDisplay,
  type OgePaintAlignment,
  type OgeTextMeasurer,
} from './cell-text';
import type {
  OgePaintEdge,
  OgePaintFill,
  OgePaintFont,
  OgeResolvedStyle,
  OgeStyleResolver,
} from './resolve-style';
import { ogeWrapText, type OgeSheetLayout } from './sheet-layout';

/** A cell's conditional-format overrides (from `OgeConditionalPainter`). */
export interface OgeConditionalPaint {
  /** A differential format merged over the cell's style. */
  readonly style?: OgeResolvedStyle;
  /** A colour scale's colour. */
  readonly fill?: OgePaintFill;
  /** A data bar: its extent as fractions of the cell width, and colour. */
  readonly dataBar?: {
    readonly from: number;
    readonly to: number;
    readonly color: string;
    readonly negative: boolean;
    readonly showValue: boolean;
  };
  /** An icon of an icon set. */
  readonly icon?: {
    readonly set: string;
    readonly index: number;
    readonly showValue: boolean;
  };
}

/** Supplies conditional formatting per cell. */
export interface OgeConditionalPainter {
  /** `base`: the style the rules patch when it is not the cell's own (a table cell's). */
  paint(
    row: number,
    col: number,
    cell: OgeCell | undefined,
    base?: OgeCellStyle,
  ): OgeConditionalPaint | undefined;
}

/** A table cell's style: the model style (a table's formatting under the cell's) and its resolution. */
export interface OgeTableCellStyle {
  readonly model: OgeCellStyle;
  readonly resolved: OgeResolvedStyle;
}

/** Supplies table formatting per cell (`OgeTableFormatter`). */
export interface OgeTablePainter {
  /** The style of a cell inside a table, or `undefined` outside every table. */
  style(
    row: number,
    col: number,
    styleId: number,
  ): OgeTableCellStyle | undefined;
  /**
   * The table line between a cell and the one above it (`'top'`) or to its
   * left (`'left'`) — what Excel draws there when neither cell has a border
   * of its own on it; `null` when no table draws one.
   */
  line(row: number, col: number, side: 'top' | 'left'): OgePaintEdge | null;
  /** Whether a cell is inside a table. */
  covers(row: number, col: number): boolean;
  /** The column spans tables cover on a row, first to last column. */
  spans(row: number): readonly (readonly [number, number])[];
}

/** Options of {@link ogePaintWindow}. */
export interface OgePaintWindowOptions {
  readonly measurer: OgeTextMeasurer;
  readonly locale: OgeFormatLocale;
  readonly dateSystem: OgeDateSystem;
  readonly conditional?: OgeConditionalPainter;
  /** Table styles; without it tables show unformatted. */
  readonly tables?: OgeTablePainter;
  /** Columns scanned beyond the window for text spilling into it. Default 32. */
  readonly spillScan?: number;
}

/** One cell to paint. */
export interface OgePaintCell {
  readonly row: number;
  readonly col: number;
  /** Box in sheet px at 100% zoom; a merge's box covers the whole merge. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly style: OgeResolvedStyle;
  /** What it shows; `null` for a cell with only a fill or borders. */
  readonly display: OgeCellDisplay | null;
  readonly font: OgePaintFont;
  /** Text colour: the format's section colour, else the font's (`null` = automatic). */
  readonly color: string | null;
  /** Background; `null` lets the gridlines show. */
  readonly fill: OgePaintFill | null;
  /** The edges this cell draws (an edge it loses to a neighbour is `null`). */
  readonly top: OgePaintEdge | null;
  readonly right: OgePaintEdge | null;
  readonly bottom: OgePaintEdge | null;
  readonly left: OgePaintEdge | null;
  readonly diagonalUp: OgePaintEdge | null;
  readonly diagonalDown: OgePaintEdge | null;
  /** Horizontal text placement, `general` resolved. */
  readonly align: OgePaintAlignment;
  /** Where the text may paint (sheet px): the box, or wider when it spills. */
  readonly clipLeft: number;
  readonly clipRight: number;
  /** Measured width of a single-line text (px at 100%), when measured. */
  readonly textWidth?: number;
  /** Left inset of the text: margin plus indent, px. */
  readonly inset: number;
  /** The text margin on each side (no indent), px. */
  readonly margin: number;
  /** Top of the text's first line box inside the cell, px. */
  readonly lineTop: number;
  /** Bottom-aligned one-line text: the row's common descent its baseline sits on, px. */
  readonly rowDescent?: number;
  /** One line's box, px: the tallest of the text's fonts, an accounting underline included. */
  readonly lineHeight: number;
  /**
   * Wrapped text's lines (wrap, and the justify and distributed alignments,
   * which wrap in Excel); absent for one-line text.
   */
  readonly lines?: readonly string[];
  /** Shrink-to-fit scale (1 when not shrunk). */
  readonly scale: number;
  readonly merge?: OgeSheetRange;
  readonly link?: OgeHyperlink;
  readonly note?: OgeNote;
  readonly dataBar?: OgeConditionalPaint['dataBar'];
  readonly icon?: OgeConditionalPaint['icon'];
}

/** Pixels per indent level at a maximum digit width (9 for Calibri 11, measured). */
export function ogeIndentPixels(maxDigitWidth: number): number {
  return Math.round((9 * maxDigitWidth) / 7);
}

/** The text margin inside a cell: half the column padding (2 px for Calibri 11). */
export function ogeTextMargin(maxDigitWidth: number): number {
  return Math.ceil(maxDigitWidth / 4);
}

/** The pixels an accounting underline adds below a font's line (measured: 3 for single). */
function accountingExtra(font: OgePaintFont): number {
  return font.underline === 'singleAccounting'
    ? 3
    : font.underline === 'doubleAccounting'
      ? 4
      : 0;
}

/** A font's line box with its accounting underline, px. */
export function ogeFontLine(font: OgePaintFont): number {
  return font.lineHeight + accountingExtra(font);
}

/** The part of a font's line below its baseline, px (Excel's row height for the font ≈ 4 : 1 above and below). */
export function ogeFontDescent(font: OgePaintFont): number {
  return Math.round(font.lineHeight / 5) + accountingExtra(font);
}

/** Where a line box of `line` px starts in a cell `height` px tall. */
export function ogeLineTop(
  vertical: OgeResolvedStyle['vertical'],
  height: number,
  line: number,
): number {
  const room = height - line;
  if (
    vertical === 'top' ||
    vertical === 'justify' ||
    vertical === 'distributed'
  )
    return 0;
  if (vertical === 'center') return Math.max(0, Math.floor(room / 2));
  return Math.max(0, room);
}

const SPILLING: ReadonlySet<OgePaintAlignment> = new Set([
  'left',
  'right',
  'center',
]);

/** Paints the cells of `range` (rows and columns inclusive). */
export function ogePaintWindow(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
  resolver: OgeStyleResolver,
  range: OgeSheetRange,
  options: OgePaintWindowOptions,
): OgePaintCell[] {
  const { rows, cols } = layout;
  const scan = options.spillScan ?? 32;
  const margin = ogeTextMargin(layout.maxDigitWidth);
  const indentStep = ogeIndentPixels(layout.maxDigitWidth);
  const showZeros = sheet.view.showZeros;

  // ── style lookup: the cell's, else the row's, else the column's ──
  const styleIdAt = (row: number, col: number, cell?: OgeCell): number => {
    const stored = cell ?? sheet.getCell(row, col);
    if (stored) return stored.style ?? 0;
    return sheet.getRow(row)?.style ?? sheet.getColumn(col)?.style ?? 0;
  };
  const tables = options.tables;
  const styleAt = (row: number, col: number, cell?: OgeCell) => {
    const id = styleIdAt(row, col, cell);
    return tables?.style(row, col, id)?.resolved ?? resolver.get(id);
  };
  const hasValue = (row: number, col: number) => {
    const cell = sheet.getCell(row, col);
    return (
      cell !== undefined &&
      (cell.value !== undefined || cell.formula !== undefined)
    );
  };

  // ── merges touching the window ──
  const merges = sheet.mergesIn(range);
  const covered = new Map<string, OgeSheetRange>();
  for (const merge of merges) {
    for (
      let r = Math.max(merge.top, range.top);
      r <= Math.min(merge.bottom, range.bottom);
      r++
    ) {
      for (
        let c = Math.max(merge.left, range.left);
        c <= Math.min(merge.right, range.right);
        c++
      ) {
        covered.set(`${r},${c}`, merge);
      }
    }
  }
  const mergeOf = (row: number, col: number) =>
    covered.get(`${row},${col}`) ??
    (row < range.top ||
    row > range.bottom ||
    col < range.left ||
    col > range.right
      ? sheet.mergeAt(row, col)
      : undefined);

  const out: OgePaintCell[] = [];

  /** The fonts a cell's text is drawn in: its own, or its rich text's runs. */
  const textFonts = (
    cell: OgeCell | undefined,
    style: OgeResolvedStyle,
  ): OgePaintFont[] =>
    cell?.value !== undefined && isOgeRichText(cell.value)
      ? cell.value.runs.map((run) =>
          run.font
            ? resolver.font({ ...style.font.source, ...run.font })
            : style.font,
        )
      : [style.font];
  // each row's common baseline for bottom-aligned one-line text: its largest descent
  const descents = new Map<number, number>();
  const rowDescent = (row: number): number => {
    let known = descents.get(row);
    if (known !== undefined) return known;
    known = 0;
    sheet.forEachInRow(row, (cell, col) => {
      if (cell.value === undefined || sheet.mergeAt(row, col)) return;
      const style = styleAt(row, col, cell);
      if (style.wrap || style.rotation !== 0 || style.vertical !== 'bottom')
        return;
      for (const font of textFonts(cell, style))
        known = Math.max(known as number, ogeFontDescent(font));
    });
    descents.set(row, known);
    return known;
  };

  /** The edge `mine` draws against a neighbour's `theirs`; ties go right/down. */
  const wins = (
    mine: OgePaintEdge | null,
    theirs: OgePaintEdge | null,
    mineIsFirst: boolean,
  ) => {
    if (!mine) return null;
    if (!theirs) return mine;
    if (mine.rank !== theirs.rank) return mine.rank > theirs.rank ? mine : null;
    return mineIsFirst ? null : mine;
  };

  const emit = (
    row: number,
    col: number,
    cell: OgeCell | undefined,
    merge: OgeSheetRange | undefined,
  ) => {
    const x = cols.offset(merge ? merge.left : col);
    const y = rows.offset(merge ? merge.top : row);
    const width = merge ? cols.offset(merge.right + 1) - x : cols.size(col);
    const height = merge ? rows.offset(merge.bottom + 1) - y : rows.size(row);
    if (width <= 0 || height <= 0) return;
    const id = styleIdAt(row, col, cell);
    const table = tables?.style(row, col, id);
    const conditional = options.conditional?.paint(
      row,
      col,
      cell,
      table?.model,
    );
    let style = table?.resolved ?? resolver.get(id);
    if (conditional?.style) style = conditional.style;
    const display = ogeCellDisplay(cell, style, {
      width,
      padding: layout.padding,
      measurer: options.measurer,
      locale: options.locale,
      dateSystem: options.dateSystem,
      showZeros,
    });
    const link = sheet.hyperlinkAt(row, col);
    const note = sheet.getNote(row, col);
    if (
      !display &&
      !style.visibleWhenEmpty &&
      !conditional?.fill &&
      !conditional?.dataBar &&
      !note &&
      !merge &&
      !table
    )
      return;

    // edges: this cell's against each neighbour's opposite edge; where
    // neither has one, a table's line — drawn by the cell inside a table,
    // the lower or right one when both are
    const lastRow = merge ? merge.bottom : row;
    const lastCol = merge ? merge.right : col;
    const edge = (
      mine: OgePaintEdge | null,
      theirs: OgePaintEdge | null,
      mineIsFirst: boolean,
      tableLine: (() => OgePaintEdge | null) | null,
    ) =>
      mine || theirs
        ? wins(mine, theirs, mineIsFirst)
        : (tableLine?.() ?? null);
    const inTable = !!table && !merge && tables !== undefined;
    const top = edge(
      style.top,
      row > 0 ? styleAt(row - 1, col).bottom : null,
      false,
      inTable ? () => tables.line(row, col, 'top') : null,
    );
    const left = edge(
      style.left,
      col > 0 ? styleAt(row, col - 1).right : null,
      false,
      inTable ? () => tables.line(row, col, 'left') : null,
    );
    const bottom = edge(
      style.bottom,
      styleAt(lastRow + 1, col).top,
      true,
      inTable && !tables.covers(lastRow + 1, col)
        ? () => tables.line(lastRow + 1, col, 'top')
        : null,
    );
    const right = edge(
      style.right,
      styleAt(row, lastCol + 1).left,
      true,
      inTable && !tables.covers(row, lastCol + 1)
        ? () => tables.line(row, lastCol + 1, 'left')
        : null,
    );

    // text placement
    let clipLeft = x;
    let clipRight = x + width;
    let textWidth: number | undefined;
    let scale = 1;
    const align = display?.align ?? 'left';
    let shown = display;
    if (display && style.rotation === 0) {
      const indent = style.indent * indentStep;
      const room = width - layout.padding - indent;
      if (!style.wrap) {
        textWidth = options.measurer.measure(display.text, style.font);
        if (align === 'fill' && textWidth > 0 && display.kind === 'text') {
          // fill repeats the text across the cell, whole copies only
          const copies = Math.max(1, Math.floor(room / textWidth));
          shown = { ...display, text: display.text.repeat(copies) };
          textWidth *= copies;
        } else if (style.shrink && textWidth > room && room > 0) {
          scale = room / textWidth;
        } else if (
          textWidth > room &&
          !merge &&
          display.kind === 'text' &&
          SPILLING.has(align)
        ) {
          // spill into empty neighbours, up to the first cell with a value
          const need = textWidth - room;
          const extendRight = (limit: number) => {
            let reach = 0;
            for (
              let c = col + 1;
              reach < limit && c < cols.count && c <= col + scan + 1;
              c++
            ) {
              if (hasValue(row, c) || sheet.mergeAt(row, c)) break;
              reach += cols.size(c);
            }
            return reach;
          };
          const extendLeft = (limit: number) => {
            let reach = 0;
            for (
              let c = col - 1;
              reach < limit && c >= 0 && c >= col - scan - 1;
              c--
            ) {
              if (hasValue(row, c) || sheet.mergeAt(row, c)) break;
              reach += cols.size(c);
            }
            return reach;
          };
          if (align === 'left')
            clipRight += Math.min(extendRight(need), need + margin);
          else if (align === 'right')
            clipLeft -= Math.min(extendLeft(need), need + margin);
          else {
            const half = need / 2 + margin;
            clipRight += Math.min(extendRight(half), half);
            clipLeft -= Math.min(extendLeft(half), half);
          }
        }
      }
      if (align === 'centerContinuous' && !merge) {
        // centred across the empty centre-continuous cells to the right
        let c = col + 1;
        while (
          c < cols.count &&
          !hasValue(row, c) &&
          styleAt(row, c).horizontal === 'centerContinuous'
        ) {
          clipRight += cols.size(c);
          c++;
        }
      }
    }
    const font = style.font;
    // the line box: the tallest of the text's fonts (a rich text's largest run)
    const fonts = textFonts(cell, style);
    const lineHeight = Math.max(...fonts.map(ogeFontLine));
    const ownDescent = Math.max(...fonts.map(ogeFontDescent));
    const baseline =
      shown &&
      !merge &&
      style.vertical === 'bottom' &&
      style.rotation === 0 &&
      !(style.wrap || align === 'justify' || align === 'distributed')
        ? rowDescent(row)
        : undefined;
    // wrapped text: its lines, and a line box as tall as all of them
    const wraps = style.wrap || align === 'justify' || align === 'distributed';
    const lines =
      shown && wraps && style.rotation === 0 && shown.text !== ''
        ? ogeWrapText(
            shown.text,
            Math.max(1, width - layout.padding - style.indent * indentStep),
            font,
            options.measurer,
          )
        : undefined;
    out.push({
      row,
      col,
      x,
      y,
      width,
      height,
      style,
      display: shown,
      font,
      color: shown?.color ?? font.color,
      fill: conditional?.fill ?? style.fill,
      top,
      right,
      bottom,
      left,
      diagonalUp: style.diagonalUp,
      diagonalDown: style.diagonalDown,
      align,
      clipLeft,
      clipRight,
      ...(textWidth !== undefined ? { textWidth } : {}),
      inset: margin + style.indent * indentStep,
      margin,
      ...(baseline !== undefined ? { rowDescent: baseline } : {}),
      lineHeight,
      lineTop:
        baseline !== undefined
          ? Math.max(
              0,
              height - Math.max(baseline, ownDescent) - lineHeight + ownDescent,
            )
          : ogeLineTop(
              style.vertical,
              height,
              lineHeight * (lines?.length ?? 1),
            ),
      ...(lines ? { lines } : {}),
      scale,
      ...(merge ? { merge } : {}),
      ...(link ? { link } : {}),
      ...(note ? { note } : {}),
      ...(conditional?.dataBar ? { dataBar: conditional.dataBar } : {}),
      ...(conditional?.icon ? { icon: conditional.icon } : {}),
    });
  };

  // merge owners first — also when the owner itself is outside the window
  const owners = new Set<OgeSheetRange>();
  for (const merge of merges) {
    if (
      rows.size(merge.top) === 0 &&
      rows.offset(merge.bottom + 1) === rows.offset(merge.top)
    )
      continue;
    owners.add(merge);
    emit(merge.top, merge.left, sheet.getCell(merge.top, merge.left), merge);
  }

  // notes may sit on empty cells: their indicator still paints
  const notedEmpty = new Map<number, number[]>();
  if (sheet.noteCount > 0) {
    for (const { row, col } of sheet.notes()) {
      if (
        row < range.top ||
        row > range.bottom ||
        col < range.left ||
        col > range.right
      )
        continue;
      if (sheet.getCell(row, col)) continue;
      const list = notedEmpty.get(row);
      if (list) list.push(col);
      else notedEmpty.set(row, [col]);
    }
  }

  const rowStyled = (row: number) => !!sheet.getRow(row)?.style;
  const styledColumns: number[] = [];
  for (const span of sheet.columnSpans()) {
    if (!span.style) continue;
    for (
      let c = Math.max(span.first, range.left);
      c <= Math.min(span.last, range.right);
      c++
    )
      styledColumns.push(c);
  }

  for (let row = range.top; row <= range.bottom; row++) {
    if (rows.size(row) === 0) continue;
    const seen = new Set<number>();
    // stored cells, plus text left or right of the window that may spill in
    sheet.forEachInRow(
      row,
      (cell, col) => {
        seen.add(col);
        if (mergeOf(row, col)) return;
        const outside = col < range.left || col > range.right;
        if (
          outside &&
          typeof cell.value !== 'string' &&
          !(
            cell.value &&
            typeof cell.value === 'object' &&
            cell.value.kind === 'rich'
          )
        )
          return;
        if (cols.size(col) === 0) return;
        const before = out.length;
        emit(row, col, cell, undefined);
        if (outside && out.length > before) {
          // keep a spilling cell only when its text reaches into the window
          const painted = out[out.length - 1];
          const reaches =
            painted.clipRight > cols.offset(range.left) &&
            painted.clipLeft < cols.offset(range.right + 1);
          if (
            !reaches ||
            (painted.clipRight <= painted.x + painted.width &&
              painted.clipLeft >= painted.x)
          )
            out.pop();
        }
      },
      Math.max(0, range.left - scan),
      Math.min(cols.count - 1, range.right + scan),
    );
    // empty cells formatted by their row or column, or inside a table
    const candidates = rowStyled(row)
      ? Array.from(
          { length: range.right - range.left + 1 },
          (_, i) => range.left + i,
        )
      : [...styledColumns, ...(notedEmpty.get(row) ?? [])];
    for (const [first, last] of tables?.spans(row) ?? []) {
      for (
        let c = Math.max(first, range.left);
        c <= Math.min(last, range.right);
        c++
      )
        candidates.push(c);
    }
    for (const col of new Set(candidates)) {
      if (seen.has(col) || mergeOf(row, col) || cols.size(col) === 0) continue;
      emit(row, col, undefined, undefined);
    }
  }
  return out;
}
