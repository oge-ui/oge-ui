/**
 * The geometry of a sheet at 100% zoom: column widths and row heights in CSS
 * pixels, exactly as Excel computes them (see `font-metrics.ts`).
 *
 * - Column widths come from the stored width and the Normal font's maximum
 *   digit width; a column without a width is the sheet's default width.
 * - A row with a stored height (`ht`) keeps it — Excel stores the heights it
 *   fitted, so an Excel-saved file needs no measuring. A row without one is
 *   fitted the way Excel fits it on load: the tallest one-line font in the
 *   row, a wrapped cell's line count × its line height, never below the
 *   sheet's default.
 */
import { OGE_SHEET_MAX_COLUMNS, OGE_SHEET_MAX_ROWS } from '../address/address';
import { isOgeRichText, ogeRichTextToString } from '../model/cell';
import type { OgeWorksheet } from '../model/worksheet';
import { ogeColumnPadding } from '../metrics/font-metrics';
import {
  ogeColumnWidthToPixels,
  ogeDefaultColumnWidthPixels,
} from '../metrics/sheet-metrics';
import { OgeAxis } from './axis';
import { OGE_ESTIMATING_MEASURER, type OgeTextMeasurer } from './cell-text';
import type { OgePaintFont, OgeStyleResolver } from './resolve-style';

/** Options of {@link OgeSheetLayout}. */
export interface OgeSheetLayoutOptions {
  /** Measures wrapped text when a row must be fitted. Default: an estimate. */
  readonly measurer?: OgeTextMeasurer;
}

/** Points to pixels the way Excel snaps row heights (to whole pixels). */
function rowPixels(points: number): number {
  return Math.round((points * 4) / 3);
}

/**
 * Lines `text` wraps into within `width` px: greedy by words, a word longer
 * than the line broken by characters, explicit line breaks kept.
 */
export function ogeWrapText(
  text: string,
  width: number,
  font: OgePaintFont,
  measurer: OgeTextMeasurer,
): string[] {
  const lines: string[] = [];
  const room = Math.max(1, width);
  for (const paragraph of text.split(/\r\n|\r|\n/)) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/(?<= )/)) {
      const candidate = line + word;
      if (measurer.measure(candidate.trimEnd(), font) <= room) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line.trimEnd());
      // a word wider than the line: break it by characters
      let rest = word;
      line = '';
      while (measurer.measure(rest.trimEnd(), font) > room && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measurer.measure(rest.slice(0, cut), font) > room)
          cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line.trimEnd());
  }
  return lines;
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
  /** Row height of one line of the Normal font, px. */
  private readonly normalLine: number;
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
    this.normalLine = resolver.normalFont.lineHeight;
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
    const base = rowPixels(format.defaultRowHeight);
    this.rows.setDefault(format.zeroHeight ? 0 : base);
    this.rows.clear();
    const stored = new Set<number>();
    for (const row of sheet.formattedRows()) {
      const info = sheet.getRow(row);
      if (info?.hidden) {
        this.rows.set(row, 0);
        stored.add(row);
      } else if (info?.height !== undefined) {
        this.rows.set(row, rowPixels(info.height));
        stored.add(row);
      } else if (format.zeroHeight) {
        // a formatted row of a zeroHeight sheet shows at the default height
        this.rows.set(row, base);
      }
    }
    if (format.customHeight) return;
    // rows Excel would fit: the tallest font, or a wrapped cell's lines
    const fitted = new Map<number, number>();
    sheet.forEachCell((cell, row, col) => {
      if (stored.has(row) || (!cell.style && !isOgeRichText(cell.value)))
        return;
      const style = this.resolver.get(cell.style);
      let height = style.font.lineHeight;
      // rich text: the tallest run sets the line
      if (isOgeRichText(cell.value)) {
        for (const run of cell.value.runs) {
          if (run.font)
            height = Math.max(
              height,
              this.resolver.font({ ...style.font.source, ...run.font })
                .lineHeight,
            );
        }
      }
      // justify and distributed wrap like wrapText does
      const wraps =
        style.wrap ||
        style.horizontal === 'justify' ||
        style.horizontal === 'distributed';
      if (wraps && cell.value !== undefined && !sheet.mergeAt(row, col)) {
        const text =
          typeof cell.value === 'string'
            ? cell.value
            : isOgeRichText(cell.value)
              ? ogeRichTextToString(cell.value)
              : null;
        if (text !== null) {
          const width = this.cols.size(col) - this.padding;
          const lines = ogeWrapText(
            text,
            width,
            style.font,
            this.measurer,
          ).length;
          // measured: lines of a font shorter than the Normal font's row add
          // one pixel once they wrap (Arial 10 under Calibri 11: 17, 35, 52 …)
          height =
            height * lines + (lines > 1 && height < this.normalLine ? 1 : 0);
        }
      }
      if (height > (fitted.get(row) ?? base)) fitted.set(row, height);
    });
    for (const [row, height] of fitted) this.rows.set(row, height);
  }
}
