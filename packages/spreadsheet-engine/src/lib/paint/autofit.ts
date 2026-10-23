/**
 * Excel's AutoFit: the width a double-click on a column header's edge gives
 * the column, the height a double-click on a row header's edge gives the
 * row — and the height Excel gives every row it fits when it opens a file.
 * Measured on Excel 2024 (`Range.AutoFit`, `testing/corpus/autofit.*`, and
 * rows read on open):
 *
 * - **A column** fits its widest cell — hidden rows included, merged cells
 *   left out; with nothing to fit it keeps its width. A cell needs the room
 *   its text fits in, plus its own font's column padding and 2 px: text,
 *   dates and formatted numbers their measured width and, past about 60 px,
 *   a little more (Excel's measurement runs a hair wider than the advances,
 *   `round(w / 28 − 2.43)` px); General numbers one digit slot per
 *   character, a minus its own width, as General fits them; an indent its
 *   levels; wrapped text its longest line at the current width. Rotated
 *   text needs its projection, `w · |cos θ| + line · |sin θ|`; vertical text
 *   its font's line and padding and 1 px, stacked text the line and padding.
 * - **A row** fits its tallest cell: a font's line (glyphs do not matter;
 *   rich text its tallest run; an accounting underline or raised text adds
 *   to it), a wrapped text's lines, vertical text the way a column fits it,
 *   stacked text a line per character and 2 px. A merge within the row
 *   counts its font's line only, one over more rows not at all. Its empty
 *   cells count too, in the style they would show: the row's own
 *   (`customFormat`), else their column's, else Normal — so a row is never
 *   below the Normal line unless its style or every column's is smaller (a
 *   9 pt row style makes it 12 pt), and a 20 pt column style lifts every row
 *   without a cell in that column to 26.25 pt. The sheet's default height
 *   plays no part (`testing/corpus/rows.*`).
 * - Neither passes Excel's limits: 255 characters a column, 409.5 pt a row.
 *
 * A wrapped cell's column follows Excel's own line breaking, which this
 * matches only where it breaks lines the same way (the corpus lists where not).
 */
import { OGE_SHEET_MAX_COLUMNS, OGE_SHEET_MAX_ROWS } from '../address/address';
import {
  isOgeRichText,
  ogeRichTextToString,
  type OgeCell,
} from '../model/cell';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeFormatLocale } from '../format/format-locale';
import type { OgeDateSystem } from '../date/date-serial';
import { ogeColumnPadding, ogeHasFontMetrics } from '../metrics/font-metrics';
import { ogeCellDisplay, ogeWrapText, type OgeTextMeasurer } from './cell-text';
import { ogeIndentPixels, type OgeTablePainter } from './paint-window';
import type {
  OgePaintFont,
  OgeResolvedStyle,
  OgeStyleResolver,
} from './resolve-style';
import type { OgeSheetLayout } from './sheet-layout';

/** Options of {@link ogeAutofitColumnWidth} and {@link ogeAutofitRowHeight}. */
export interface OgeAutofitOptions {
  readonly measurer: OgeTextMeasurer;
  readonly locale: OgeFormatLocale;
  readonly dateSystem: OgeDateSystem;
  /** Table styles: a header row's font is the table's. */
  readonly tables?: OgeTablePainter;
}

/** A column wide enough for any text: displays come out whole. */
const UNLIMITED = 1e7;

/** Excel's tallest row, 409.5 pt, px. */
const MAX_ROW = 546;

/**
 * What Excel adds to a long text's measured width (measured: nothing up to
 * about 60 px, 8 px at 280, 16 px at 520).
 */
function longText(width: number): number {
  return Math.max(0, Math.round(width / 28 - 2.43));
}

/**
 * A row's height per text rotation for Calibri 11 (line 20 px), past the
 * text's own `w · |sin θ|`: measured at 15° steps, interpolated between.
 */
const ROTATED_ROW: readonly (readonly [number, number])[] = [
  [0, 20],
  [15, 22.4],
  [30, 20.3],
  [45, 17.2],
  [60, 15],
  [75, 10.3],
  [90, 7],
];

/** `textRotation` as an angle from the horizontal, 0–90° either way. */
function angleOf(rotation: number): number {
  return rotation > 90 ? rotation - 90 : rotation;
}

function rotatedRowExtra(angle: number): number {
  for (let i = 1; i < ROTATED_ROW.length; i++) {
    const [a1, v1] = ROTATED_ROW[i];
    if (angle > a1) continue;
    const [a0, v0] = ROTATED_ROW[i - 1];
    return v0 + ((v1 - v0) * (angle - a0)) / (a1 - a0);
  }
  return 7;
}

/**
 * The height a font needs of its row, px, with the extras Excel adds to its
 * line (measured on Excel 2024, 15 sizes of Calibri and 11 and 20 pt of
 * Arial, Cambria and Times New Roman): an accounting underline 3 px per
 * `ppem / 16` step under the line — the double one a step later — and never
 * under the Normal font's row plus `ppem / 7` (all 38 cases exact); a raised
 * or lowered line — superscript about 16% of the line, subscript 21% of the
 * em — within 2 px. `measured`: the extra is an estimate.
 */
function fontRow(font: OgePaintFont, normalLine: number): OgeRowFit {
  const line = font.lineHeight;
  const ppem = font.sizePx;
  let height = line;
  if (
    font.underline === 'singleAccounting' ||
    font.underline === 'doubleAccounting'
  ) {
    const steps = Math.max(
      1,
      Math.round(
        ppem / 16 - (font.underline === 'doubleAccounting' ? 0.25 : 0),
      ),
    );
    height = Math.max(line + 3 * steps, normalLine + Math.round(ppem / 7));
  }
  if (font.vertAlign === 'superscript')
    height = Math.max(height, line + Math.max(3, Math.round(line * 0.16) - 1));
  else if (font.vertAlign === 'subscript')
    height = Math.max(height, line + Math.max(4, Math.round(ppem * 0.21)));
  return { height, measured: height !== line };
}

/** Whether a style breaks its text into lines (justify and distributed do too). */
function wraps(style: OgeResolvedStyle): boolean {
  return (
    style.wrap ||
    style.horizontal === 'justify' ||
    style.horizontal === 'distributed'
  );
}

/** The style a stored cell paints with: a table's under its own, else its own. */
function styleOf(
  resolver: OgeStyleResolver,
  tables: OgeTablePainter | undefined,
  row: number,
  col: number,
  cell: OgeCell,
): OgeResolvedStyle {
  const id = cell.style ?? 0;
  return tables?.style(row, col, id)?.resolved ?? resolver.get(id);
}

/** A cell's text width on one line: rich text run by run, each in its font. */
function textWidth(
  cell: OgeCell,
  text: string,
  style: OgeResolvedStyle,
  resolver: OgeStyleResolver,
  measurer: OgeTextMeasurer,
): number {
  const value = cell.value;
  if (value !== undefined && isOgeRichText(value)) {
    let width = 0;
    for (const run of value.runs) {
      const font = run.font
        ? resolver.runFont(style.font, run.font)
        : style.font;
      width += measurer.measure(run.text, font);
    }
    return width;
  }
  return measurer.measure(text, style.font);
}

/**
 * The width Excel's AutoFit gives a column, px at 100% zoom, or `null` when
 * nothing in the column is fitted (Excel keeps its width).
 */
export function ogeAutofitColumnWidth(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
  resolver: OgeStyleResolver,
  col: number,
  options: OgeAutofitOptions,
): number | null {
  const { measurer } = options;
  const indentStep = ogeIndentPixels(layout.maxDigitWidth);
  const current = layout.cols.size(col);
  let widest: number | null = null;
  sheet.forEachCell(
    (cell, row) => {
      if (cell.value === undefined || sheet.mergeAt(row, col)) return;
      const style = styleOf(resolver, options.tables, row, col, cell);
      const display = ogeCellDisplay(cell, style, {
        width: UNLIMITED,
        padding: layout.padding,
        measurer,
        locale: options.locale,
        dateSystem: options.dateSystem,
        showZeros: sheet.view.showZeros,
      });
      if (!display || display.text === '') return;
      const font: OgePaintFont = style.font;
      const padding = ogeColumnPadding(font.maxDigitWidth);
      let need: number;
      if (style.rotation === 255) need = font.lineHeight + padding;
      else if (style.rotation === 90 || style.rotation === 180)
        need = font.lineHeight + padding + 1;
      else {
        const general =
          typeof cell.value === 'number' &&
          (!style.format ||
            (style.format.isText && style.format.code.trim() === '@'));
        let width: number;
        if (general) {
          // General's slots: a digit width per character, a minus its own width
          const text = display.text;
          const negative = text.startsWith('-');
          width =
            (text.length - (negative ? 1 : 0)) * font.maxDigitWidth +
            (negative ? Math.ceil(measurer.measure('-', font) - 0.01) : 0);
        } else if (wraps(style)) {
          // wrapped text: its longest line as it wraps now
          const text = isOgeRichText(cell.value)
            ? ogeRichTextToString(cell.value)
            : display.text;
          const lines = ogeWrapText(
            text,
            Math.max(1, current - layout.padding - style.indent * indentStep),
            font,
            measurer,
          );
          width = Math.max(
            ...lines.map((line) => measurer.measure(line, font)),
          );
        } else width = textWidth(cell, display.text, style, resolver, measurer);
        const extra = general ? 0 : 1;
        if (style.rotation === 0) {
          need =
            Math.ceil(width - 0.01) +
            extra * longText(width) +
            padding +
            2 +
            style.indent * indentStep;
        } else {
          const angle = (angleOf(style.rotation) * Math.PI) / 180;
          const across = width * Math.abs(Math.cos(angle));
          need = Math.round(
            across +
              extra * longText(across) +
              font.lineHeight * Math.abs(Math.sin(angle)) +
              padding +
              2,
          );
        }
      }
      if (widest === null || need > widest) widest = need;
    },
    { top: 0, left: col, bottom: OGE_SHEET_MAX_ROWS - 1, right: col },
  );
  // Excel's widest column: 255 characters
  return widest === null
    ? null
    : Math.min(
        widest,
        255 * layout.maxDigitWidth + ogeColumnPadding(layout.maxDigitWidth),
      );
}

/** The height Excel's AutoFit gives a row, px at 100% zoom. */
export function ogeAutofitRowHeight(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
  resolver: OgeStyleResolver,
  row: number,
  options: OgeAutofitOptions,
): number {
  return new OgeRowFitter(
    sheet,
    resolver,
    (col) => layout.cols.size(col),
    options,
  ).fit(row).height;
}

/** Options of {@link OgeRowFitter}. */
export interface OgeRowFitterOptions {
  readonly measurer: OgeTextMeasurer;
  /** Formats the numbers rotated text shows. Default: the resolver's locale. */
  readonly locale?: OgeFormatLocale;
  /** Default: the workbook's. */
  readonly dateSystem?: OgeDateSystem;
  /** Table styles: a header row's font is the table's. */
  readonly tables?: OgeTablePainter;
}

/** The height a row fits to. */
export interface OgeRowFit {
  /** px at 100% zoom. */
  readonly height: number;
  /**
   * The height hangs on measuring text as Excel measures it — wrapped or
   * rotated text, a font Excel's metrics are not known for — so it can come
   * out apart from the height Excel itself fits.
   */
  readonly measured: boolean;
}

/** A styled column span and its font's line, px. */
interface StyledColumns {
  readonly first: number;
  readonly last: number;
  readonly line: number;
}

/**
 * Fits rows of one sheet to their cells as Excel does, on open and on
 * AutoFit (see the module notes).
 */
export class OgeRowFitter {
  private readonly normalLine: number;
  private readonly padding: number;
  private readonly indentStep: number;
  private readonly locale: OgeFormatLocale;
  private readonly dateSystem: OgeDateSystem;
  private readonly styled: readonly StyledColumns[];
  /** Columns without a style: their empty cells are Normal. */
  private readonly plainColumns: number;
  private readonly lines = new Map<number, number>();
  private readonly fontRows = new WeakMap<OgePaintFont, OgeRowFit>();

  /** `columnWidth`: a column's width, px at 100% zoom (wrapped text breaks at it). */
  constructor(
    private readonly sheet: OgeWorksheet,
    private readonly resolver: OgeStyleResolver,
    private readonly columnWidth: (col: number) => number,
    private readonly options: OgeRowFitterOptions,
  ) {
    const normal = resolver.normalFont;
    this.normalLine = normal.lineHeight;
    this.padding = ogeColumnPadding(normal.maxDigitWidth);
    this.indentStep = ogeIndentPixels(normal.maxDigitWidth);
    this.locale = options.locale ?? resolver.locale;
    this.dateSystem = options.dateSystem ?? resolver.workbook.dateSystem;
    const styled: StyledColumns[] = [];
    let covered = 0;
    for (const span of sheet.columnSpans()) {
      if (!span.style) continue;
      styled.push({
        first: span.first,
        last: span.last,
        line: this.lineOf(span.style),
      });
      covered += span.last - span.first + 1;
    }
    this.styled = styled;
    this.plainColumns = OGE_SHEET_MAX_COLUMNS - covered;
  }

  /**
   * The height of a row with no cells and no style of its own — Excel's
   * standard height where the sheet's default is not a custom one: the
   * tallest line among the column styles and, while a column has none,
   * Normal's.
   */
  standard(): number {
    let height = this.plainColumns > 0 ? this.normalLine : 0;
    for (const span of this.styled) height = Math.max(height, span.line);
    return height;
  }

  /** The height Excel fits a row to. */
  fit(row: number): OgeRowFit {
    const { sheet } = this;
    const own = sheet.getRow(row)?.style;
    // the empty cells: the row's style, else their columns', else Normal
    let height = own !== undefined ? this.lineOf(own) : this.emptyLine(row);
    let measured = false;
    sheet.forEachInRow(row, (cell, col) => {
      // a merge over more rows is left out; one within the row counts its
      // font, never its text's lines
      const merge = sheet.mergeAt(row, col);
      if (merge && merge.bottom > merge.top) return;
      const style = styleOf(this.resolver, this.options.tables, row, col, cell);
      const need = merge
        ? this.lineHeight(cell, style)
        : this.cellHeight(cell, style, col);
      if (need.measured) measured = true;
      if (need.height > height) height = need.height;
    });
    return { height: Math.min(height, MAX_ROW), measured };
  }

  /** A cell's one line, px: its font's row, or the tallest of its rich text's runs. */
  private lineHeight(cell: OgeCell, style: OgeResolvedStyle): OgeRowFit {
    const own = this.fontRowOf(style.font);
    if (cell.value === undefined || !isOgeRichText(cell.value)) return own;
    let height = own.height;
    let measured = own.measured;
    for (const run of cell.value.runs)
      if (run.font) {
        const runRow = this.fontRowOf(
          this.resolver.runFont(style.font, run.font),
        );
        height = Math.max(height, runRow.height);
        measured ||= runRow.measured;
      }
    return { height, measured };
  }

  /** A font's row, cached; an estimate where Excel's metrics for its face are not known too. */
  private fontRowOf(font: OgePaintFont): OgeRowFit {
    let row = this.fontRows.get(font);
    if (!row) {
      const fit = fontRow(font, this.normalLine);
      row = {
        height: fit.height,
        measured: fit.measured || !ogeHasFontMetrics(font.name),
      };
      this.fontRows.set(font, row);
    }
    return row;
  }

  /** The line of a style's font, px. */
  private lineOf(style: number): number {
    let line = this.lines.get(style);
    if (line === undefined) {
      line = this.resolver.get(style).font.lineHeight;
      this.lines.set(style, line);
    }
    return line;
  }

  /** The tallest line among a row's empty cells when the row has no style. */
  private emptyLine(row: number): number {
    if (!this.styled.length) return this.normalLine;
    const { sheet } = this;
    let height = 0;
    let inStyled = 0;
    for (const span of this.styled) {
      let count = 0;
      sheet.forEachInRow(row, () => count++, span.first, span.last);
      inStyled += count;
      // a column style counts while one of its columns has no cell here
      if (count <= span.last - span.first) height = Math.max(height, span.line);
    }
    if (this.plainColumns > 0) {
      let all = 0;
      sheet.forEachInRow(row, () => all++);
      if (all - inStyled < this.plainColumns)
        height = Math.max(height, this.normalLine);
    }
    return height;
  }

  /** What a stored cell needs of its row, px. */
  private cellHeight(
    cell: OgeCell,
    style: OgeResolvedStyle,
    col: number,
  ): OgeRowFit {
    const { resolver } = this;
    const { measurer } = this.options;
    const font = style.font;
    const value = cell.value;
    const one = this.lineHeight(cell, style);
    if (value === undefined || (style.rotation === 0 && !wraps(style)))
      return one;
    const { height: line, measured: extra } = one;
    const text =
      ogeCellDisplay(cell, style, {
        width: UNLIMITED,
        padding: this.padding,
        measurer,
        locale: this.locale,
        dateSystem: this.dateSystem,
        showZeros: this.sheet.view.showZeros,
      })?.text ?? '';
    if (text === '') return { height: line, measured: extra };
    // stacked: a line per character
    if (style.rotation === 255)
      return {
        height: [...text].length * font.lineHeight + 2,
        measured: extra,
      };
    if (style.rotation !== 0) {
      const width = textWidth(cell, text, style, resolver, measurer);
      if (style.rotation === 90 || style.rotation === 180)
        return {
          height:
            Math.ceil(width - 0.01) +
            longText(width) +
            ogeColumnPadding(font.maxDigitWidth) +
            2,
          measured: true,
        };
      const angle = angleOf(style.rotation);
      return {
        height: Math.round(
          width * Math.abs(Math.sin((angle * Math.PI) / 180)) +
            (rotatedRowExtra(angle) * font.lineHeight) / 20,
        ),
        measured: true,
      };
    }
    // only text wraps: a number keeps to one line
    if (typeof value !== 'string' && !isOgeRichText(value))
      return { height: line, measured: extra };
    const lines = ogeWrapText(
      isOgeRichText(value) ? ogeRichTextToString(value) : text,
      Math.max(
        1,
        this.columnWidth(col) - this.padding - style.indent * this.indentStep,
      ),
      font,
      measurer,
    ).length;
    // a font shorter than the Normal font's row adds a pixel once it wraps
    return {
      height: line * lines + (lines > 1 && line < this.normalLine ? 1 : 0),
      measured: true,
    };
  }
}
