/**
 * The geometry of a sheet at 100% zoom: column widths and row heights in CSS
 * pixels, exactly as Excel computes them (see `font-metrics.ts`).
 *
 * - Column widths come from the stored width and the Normal font's maximum
 *   digit width; a column without a width is the sheet's default width.
 * - Rows are as tall as Excel shows them on open (measured on Excel 2024).
 *   A row with a custom height (`customHeight`) keeps it — its `ht`, else
 *   the sheet's `defaultRowHeight`. Excel fits every other row the file
 *   lists to its cells, whatever `ht` it stores (`OgeRowFitter`); where that
 *   fit hangs on measuring text — wrapped or rotated text, a font without
 *   Excel's metrics — a stored `ht` is kept instead: it is the height Excel
 *   measured when it saved the file, where a browser can break a line
 *   elsewhere.
 * - A row the file does not list is hidden on a `zeroHeight` sheet, keeps a
 *   custom default (`customHeight` on the sheet), and is otherwise as tall
 *   as an empty row: the Normal font's line, or a taller column style's.
 * - A height in points shows rounded down to whole pixels (15.6 pt is 20 px).
 */
import { OGE_SHEET_MAX_COLUMNS, OGE_SHEET_MAX_ROWS } from '../address/address';
import type { OgeWorksheet } from '../model/worksheet';
import { ogeColumnPadding } from '../metrics/font-metrics';
import {
  ogeColumnWidthToPixels,
  ogeDefaultColumnWidthPixels,
} from '../metrics/sheet-metrics';
import { OgeRowFitter } from './autofit';
import { OgeAxis } from './axis';
import { OGE_ESTIMATING_MEASURER, type OgeTextMeasurer } from './cell-text';
import type { OgePaintFont, OgeStyleResolver } from './resolve-style';

/** Options of {@link OgeSheetLayout}. */
export interface OgeSheetLayoutOptions {
  /** Measures wrapped text when a row must be fitted. Default: an estimate. */
  readonly measurer?: OgeTextMeasurer;
}

/**
 * A row height in points as Excel shows it: whole pixels, rounded down
 * (measured on Excel 2024 for heights other tools save off the pixel grid:
 * 15.6 pt is 20 px, 18.6 pt 24 px, 0.6 pt 0 px; the heights Excel saves are
 * whole pixels already).
 */
export function ogeRowHeightPixels(points: number): number {
  return Math.max(0, Math.floor((points * 4) / 3 + 1e-6));
}

/** The rows a sheet lists — a record or a cell — ascending. */
export function ogeListedRows(sheet: OgeWorksheet): number[] {
  const listed = new Set(sheet.formattedRows());
  const used = sheet.usedRange();
  if (used)
    for (let row = used.top; row <= used.bottom; row++)
      if (sheet.hasRow(row)) listed.add(row);
  return [...listed].sort((a, b) => a - b);
}

/** Row and column axes at one zoom. */
export interface OgeZoomedAxes {
  readonly zoom: number;
  readonly rows: OgeAxis;
  readonly cols: OgeAxis;
}

/** Column and row geometry of one sheet. */
export class OgeSheetLayout {
  readonly rows = new OgeAxis(OGE_SHEET_MAX_ROWS, 20);
  readonly cols = new OgeAxis(OGE_SHEET_MAX_COLUMNS, 64);
  /** The workbook's Normal font (it sizes the headers too). */
  readonly normalFont: OgePaintFont;
  /** Maximum digit width of the Normal font, px. */
  readonly maxDigitWidth: number;
  /** Column padding (margins + gridline), px. */
  readonly padding: number;
  private readonly measurer: OgeTextMeasurer;
  private zoomCache: OgeZoomedAxes | null = null;

  constructor(
    readonly sheet: OgeWorksheet,
    private readonly resolver: OgeStyleResolver,
    options: OgeSheetLayoutOptions = {},
  ) {
    this.measurer = options.measurer ?? OGE_ESTIMATING_MEASURER;
    this.normalFont = resolver.normalFont;
    this.maxDigitWidth = resolver.normalFont.maxDigitWidth;
    this.padding = ogeColumnPadding(this.maxDigitWidth);
    this.refresh();
  }

  /** The default row height, px. */
  get defaultRowHeight(): number {
    return this.rows.defaultLength;
  }

  /** Recomputes both axes from the model. */
  refresh(): void {
    this.zoomCache = null;
    this.refreshColumns();
    this.refreshRows();
  }

  /** Both axes at a zoom (percent), each size rounded as Excel rounds it; the last zoom is cached. */
  zoomed(zoom: number): OgeZoomedAxes {
    if (zoom === 100) return { zoom, rows: this.rows, cols: this.cols };
    if (this.zoomCache?.zoom !== zoom) {
      this.zoomCache = {
        zoom,
        rows: this.rows.scaled(zoom / 100),
        cols: this.cols.scaled(zoom / 100),
      };
    }
    return this.zoomCache;
  }

  private refreshColumns(): void {
    const { sheet } = this;
    const mdw = this.maxDigitWidth;
    const format = sheet.format;
    const fallback =
      format.defaultColumnWidth !== undefined
        ? ogeColumnWidthToPixels(format.defaultColumnWidth, mdw)
        : ogeDefaultColumnWidthPixels(format.baseColumnWidth, mdw);
    this.cols.setDefault(fallback);
    this.cols.clear();
    for (const span of sheet.columnSpans()) {
      const px = span.hidden
        ? 0
        : span.width !== undefined
          ? ogeColumnWidthToPixels(span.width, mdw)
          : fallback;
      if (px === fallback) continue;
      for (let c = span.first; c <= span.last; c++) this.cols.set(c, px);
    }
  }

  private refreshRows(): void {
    const { sheet } = this;
    const format = sheet.format;
    const fitter = new OgeRowFitter(
      sheet,
      this.resolver,
      (col) => this.cols.size(col),
      { measurer: this.measurer },
    );
    const base = format.zeroHeight
      ? 0
      : format.customHeight
        ? ogeRowHeightPixels(format.defaultRowHeight)
        : fitter.standard();
    this.rows.setDefault(base);
    this.rows.clear();
    for (const row of ogeListedRows(sheet)) {
      const info = sheet.getRow(row);
      let height: number;
      if (info?.hidden) height = 0;
      else if (info?.customHeight)
        height = ogeRowHeightPixels(info.height ?? format.defaultRowHeight);
      else {
        const fit = fitter.fit(row);
        height =
          fit.measured && info?.height !== undefined
            ? ogeRowHeightPixels(info.height)
            : fit.height;
      }
      if (height !== base) this.rows.set(row, height);
    }
  }
}
