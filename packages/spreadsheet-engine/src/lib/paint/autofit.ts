/**
 * Excel's AutoFit: the width a double-click on a column header's edge gives
 * the column, the height a double-click on a row header's edge gives the
 * row. Measured on Excel 2024 (`Range.AutoFit`, `testing/corpus/autofit.*`):
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
 * - **A row** fits its tallest cell, merged cells left out, never below the
 *   sheet's default: a font's line (glyphs do not matter, an empty cell's
 *   font counts), a wrapped cell's lines, vertical text the way a column
 *   fits it, stacked text a line per character and 2 px.
 * - Neither passes Excel's limits: 255 characters a column, 409.5 pt a row.
 *
 * A wrapped cell's column follows Excel's own line breaking, which this
 * matches only where it breaks lines the same way (the corpus lists where not).
 */
import { OGE_SHEET_MAX_ROWS } from '../address/address';
import {
  isOgeRichText,
  ogeRichTextToString,
  type OgeCell,
} from '../model/cell';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeFormatLocale } from '../format/format-locale';
import type { OgeDateSystem } from '../date/date-serial';
import { ogeColumnPadding } from '../metrics/font-metrics';
import { ogeCellDisplay, type OgeTextMeasurer } from './cell-text';
import { ogeIndentPixels, type OgeTablePainter } from './paint-window';
import type {
  OgePaintFont,
  OgeResolvedStyle,
  OgeStyleResolver,
} from './resolve-style';
import { ogeWrapText, type OgeSheetLayout } from './sheet-layout';

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

/** The style a cell paints with: a table's under its own, else its own. */
function styleOf(
  sheet: OgeWorksheet,
  resolver: OgeStyleResolver,
  tables: OgeTablePainter | undefined,
  row: number,
  col: number,
  cell: OgeCell,
): OgeResolvedStyle {
  const id =
    cell.style ?? sheet.getRow(row)?.style ?? sheet.getColumn(col)?.style ?? 0;
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
        ? resolver.font({ ...style.font.source, ...run.font })
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
      const style = styleOf(sheet, resolver, options.tables, row, col, cell);
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
        } else if (
          style.wrap ||
          style.horizontal === 'justify' ||
          style.horizontal === 'distributed'
        ) {
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
  const { measurer } = options;
  const base = Math.round((sheet.format.defaultRowHeight * 4) / 3);
  const normalLine = layout.normalFont.lineHeight;
  const indentStep = ogeIndentPixels(layout.maxDigitWidth);
  let tallest = base;
  sheet.forEachInRow(row, (cell, col) => {
    if (sheet.mergeAt(row, col)) return;
    const style = styleOf(sheet, resolver, options.tables, row, col, cell);
    const font = style.font;
    let height = font.lineHeight;
    // rich text: the tallest run sets the line
    if (cell.value !== undefined && isOgeRichText(cell.value))
      for (const run of cell.value.runs)
        if (run.font)
          height = Math.max(
            height,
            resolver.font({ ...font.source, ...run.font }).lineHeight,
          );
    const display =
      cell.value === undefined
        ? null
        : ogeCellDisplay(cell, style, {
            width: UNLIMITED,
            padding: layout.padding,
            measurer,
            locale: options.locale,
            dateSystem: options.dateSystem,
            showZeros: sheet.view.showZeros,
          });
    const text = display?.text ?? '';
    if (text !== '' && style.rotation === 255) {
      // stacked: a line per character
      height = [...text].length * font.lineHeight + 2;
    } else if (text !== '' && style.rotation !== 0) {
      const width = textWidth(cell, text, style, resolver, measurer);
      if (style.rotation === 90 || style.rotation === 180) {
        height =
          Math.ceil(width - 0.01) +
          longText(width) +
          ogeColumnPadding(font.maxDigitWidth) +
          2;
      } else {
        const angle = angleOf(style.rotation);
        height = Math.round(
          width * Math.abs(Math.sin((angle * Math.PI) / 180)) +
            (rotatedRowExtra(angle) * font.lineHeight) / 20,
        );
      }
    } else if (
      text !== '' &&
      (style.wrap ||
        style.horizontal === 'justify' ||
        style.horizontal === 'distributed')
    ) {
      const plain = isOgeRichText(cell.value)
        ? ogeRichTextToString(cell.value)
        : text;
      const lines = ogeWrapText(
        plain,
        Math.max(
          1,
          layout.cols.size(col) - layout.padding - style.indent * indentStep,
        ),
        font,
        measurer,
      ).length;
      // a font shorter than the Normal font's row adds a pixel once it wraps
      height = height * lines + (lines > 1 && height < normalLine ? 1 : 0);
    }
    if (height > tallest) tallest = height;
  });
  return Math.min(tallest, MAX_ROW);
}
