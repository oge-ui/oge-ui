/**
 * Copying a range the way Excel puts it on the clipboard: tab-separated text
 * of what the cells show, and HTML that Excel, Sheets and Word paste with
 * numbers, formats and merges intact (`x:num` keeps the value,
 * `mso-number-format` the code). Text that a spreadsheet would run as a
 * formula is neutralised in both (`guardCsvFormula`, CWE-1236) — on purpose
 * unlike Excel, whose own copy puts `=HYPERLINK(…)` text on the clipboard as
 * it is (measured).
 */
import { guardCsvFormula } from '@oge-ui/core';
import type { OgeSheetRange } from '../address/address';
import { formatOgeCellValue } from '../format/number-format';
import type { OgeFormatLocale } from '../format/format-locale';
import {
  isOgeCellError,
  isOgeRichText,
  ogeRichTextToString,
} from '../model/cell';
import type { OgeWorkbook } from '../model/workbook';
import type { OgeWorksheet } from '../model/worksheet';
import type {
  OgeResolvedStyle,
  OgeStyleResolver,
} from '../paint/resolve-style';
import type { OgeSheetLayout } from '../paint/sheet-layout';

/** What a copy puts on the clipboard. */
export interface OgeClipboardContent {
  readonly text: string;
  readonly html: string;
  /** Number of cells copied. */
  readonly cells: number;
}

/** The full text a cell shows (unfitted — a copy is not bound by the column). */
export function ogeCellText(
  workbook: OgeWorkbook,
  sheet: OgeWorksheet,
  resolver: OgeStyleResolver,
  row: number,
  col: number,
  locale: OgeFormatLocale,
): string {
  const cell = sheet.getCell(row, col);
  const value = cell?.value;
  if (value === undefined) return '';
  if (isOgeRichText(value)) return ogeRichTextToString(value);
  if (isOgeCellError(value)) return value.code;
  const style = resolver.get(cell?.style);
  if (!style.format) {
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'string') return value;
    return formatOgeCellValue(value, 'General', {
      locale,
      dateSystem: workbook.dateSystem,
    }).text;
  }
  return formatOgeCellValue(value, style.format, {
    locale,
    dateSystem: workbook.dateSystem,
    localeMarkers: style.localeMarkers,
  }).text;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;',
  );
}

/** Inline CSS of a cell for the HTML flavour. */
function cellCss(style: OgeResolvedStyle): string {
  const parts: string[] = [];
  const font = style.font;
  parts.push(
    `font-family:${font.family.replace(/"/g, "'")}`,
    `font-size:${font.sizePt}pt`,
  );
  if (font.bold) parts.push('font-weight:700');
  if (font.italic) parts.push('font-style:italic');
  const decoration = [
    font.underline ? 'underline' : '',
    font.strike ? 'line-through' : '',
  ]
    .filter(Boolean)
    .join(' ');
  if (decoration) parts.push(`text-decoration:${decoration}`);
  if (font.color) parts.push(`color:${font.color}`);
  if (style.fill) parts.push(`background:${style.fill.color}`);
  const edge = (side: string, e: OgeResolvedStyle['top']) => {
    if (!e) return;
    const kind =
      e.style === 'double' ? 'double' : e.dash.length ? 'dashed' : 'solid';
    parts.push(
      `border-${side}:${e.width === 1 ? 0.5 : e.width}pt ${kind} ${e.color ?? 'windowtext'}`,
    );
  };
  edge('top', style.top);
  edge('right', style.right);
  edge('bottom', style.bottom);
  edge('left', style.left);
  if (
    style.horizontal !== 'general' &&
    style.horizontal !== 'fill' &&
    style.horizontal !== 'centerContinuous'
  )
    parts.push(
      `text-align:${style.horizontal === 'distributed' ? 'justify' : style.horizontal}`,
    );
  parts.push(
    `vertical-align:${style.vertical === 'center' ? 'middle' : style.vertical === 'top' ? 'top' : 'bottom'}`,
  );
  if (style.wrap) parts.push('white-space:normal');
  else parts.push('white-space:nowrap');
  if (style.format)
    parts.push(
      `mso-number-format:'${style.format.code.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`,
    );
  return parts.join(';');
}

/** The clipboard content of one range. */
export function ogeCopyRange(
  workbook: OgeWorkbook,
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
  resolver: OgeStyleResolver,
  range: OgeSheetRange,
  locale: OgeFormatLocale,
): OgeClipboardContent {
  const lines: string[] = [];
  const rowsHtml: string[] = [];
  const covered = new Set<string>();
  let cells = 0;
  const colsHtml: string[] = [];
  for (let c = range.left; c <= range.right; c++) {
    if (layout.cols.size(c) > 0)
      colsHtml.push(`<col width=${layout.cols.size(c)}>`);
  }
  for (let r = range.top; r <= range.bottom; r++) {
    // hidden rows and columns are left out, as Excel's copy leaves them out
    if (layout.rows.size(r) === 0) continue;
    const texts: string[] = [];
    const tds: string[] = [];
    for (let c = range.left; c <= range.right; c++) {
      if (layout.cols.size(c) === 0) continue;
      cells++;
      const cell = sheet.getCell(r, c);
      const text = ogeCellText(workbook, sheet, resolver, r, c, locale);
      // only text can carry a formula; a formatted number ("-1,234.50") stays a number
      const isText =
        typeof cell?.value === 'string' || isOgeRichText(cell?.value);
      const safe = isText ? guardCsvFormula(text) : text;
      // Excel quotes a cell only when it holds a tab or a line break (measured)
      texts.push(
        /[\t\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe,
      );
      if (covered.has(`${r},${c}`)) continue;
      const style = resolver.get(cell?.style);
      const merge = sheet.mergeAt(r, c);
      let span = '';
      if (merge && merge.top === r && merge.left === c) {
        const rowSpan = Math.min(merge.bottom, range.bottom) - r + 1;
        const colSpan = Math.min(merge.right, range.right) - c + 1;
        for (let rr = r; rr < r + rowSpan; rr++)
          for (let cc = c; cc < c + colSpan; cc++) covered.add(`${rr},${cc}`);
        span = `${rowSpan > 1 ? ` rowspan=${rowSpan}` : ''}${colSpan > 1 ? ` colspan=${colSpan}` : ''}`;
      }
      const value = cell?.value;
      const number =
        typeof value === 'number'
          ? ` x:num="${value}"`
          : typeof value === 'boolean'
            ? ` x:bool="${value ? 'TRUE' : 'FALSE'}"`
            : '';
      tds.push(
        `<td${span}${number} style="${escapeHtml(cellCss(style))}">${escapeHtml(safe).replace(/\n/g, '<br style="mso-data-placement:same-cell">')}</td>`,
      );
    }
    lines.push(texts.join('\t'));
    rowsHtml.push(
      `<tr style="height:${layout.rows.size(r)}px">${tds.join('')}</tr>`,
    );
  }
  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><meta name="ProgId" content="Excel.Sheet"></head><body>' +
    `<table border=0 cellpadding=0 cellspacing=0 style="border-collapse:collapse">${colsHtml.join('')}${rowsHtml.join('')}</table></body></html>`;
  return { text: `${lines.join('\r\n')}\r\n`, html, cells };
}

/** A cell of a print table. */
export interface OgePrintCell {
  readonly text: string;
  /** CSS properties, camelCase (font, fill, borders, alignment). */
  readonly style: Readonly<Record<string, string>>;
  readonly rowSpan: number;
  readonly colSpan: number;
}

/** A range laid out for printing: column widths, row heights and cells. */
export interface OgePrintTable {
  readonly columns: readonly number[];
  readonly rows: readonly {
    readonly height: number;
    readonly cells: readonly OgePrintCell[];
  }[];
}

function printCss(
  style: OgeResolvedStyle,
  gridLines: boolean,
): Record<string, string> {
  const font = style.font;
  const css: Record<string, string> = {
    fontFamily: font.family,
    fontSize: `${font.sizePt}pt`,
    fontWeight: font.bold ? '700' : '400',
    fontStyle: font.italic ? 'italic' : 'normal',
    color: font.color ?? '#000000',
    verticalAlign:
      style.vertical === 'center'
        ? 'middle'
        : style.vertical === 'top'
          ? 'top'
          : 'bottom',
    whiteSpace: style.wrap ? 'pre-wrap' : 'pre',
    padding: '0 2px',
  };
  const decoration = [
    font.underline ? 'underline' : '',
    font.strike ? 'line-through' : '',
  ]
    .filter(Boolean)
    .join(' ');
  if (decoration) css['textDecorationLine'] = decoration;
  if (style.fill) css['background'] = style.fill.color;
  const edge = (
    side: 'Top' | 'Right' | 'Bottom' | 'Left',
    e: OgeResolvedStyle['top'],
  ) => {
    if (e)
      css[`border${side}`] =
        `${e.width === 1 ? 1 : e.width}px ${e.style === 'double' ? 'double' : e.dash.length ? 'dashed' : 'solid'} ${e.color ?? '#000000'}`;
    else if (gridLines) css[`border${side}`] = '1px solid #c0c0c0';
  };
  edge('Top', style.top);
  edge('Right', style.right);
  edge('Bottom', style.bottom);
  edge('Left', style.left);
  if (
    style.horizontal !== 'general' &&
    style.horizontal !== 'fill' &&
    style.horizontal !== 'centerContinuous'
  ) {
    css['textAlign'] =
      style.horizontal === 'distributed' ? 'justify' : style.horizontal;
  }
  return css;
}

/**
 * A range as a table to print — what a render layer builds into DOM nodes
 * (never markup) for the print preview. Hidden rows and columns are left
 * out; merges keep their spans; gridlines print when the sheet's page setup
 * asks for them, as in Excel.
 */
export function ogePrintTable(
  workbook: OgeWorkbook,
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
  resolver: OgeStyleResolver,
  range: OgeSheetRange,
  locale: OgeFormatLocale,
): OgePrintTable {
  const gridLines = sheet.pageSetup?.printGridLines === true;
  const columns: number[] = [];
  for (let c = range.left; c <= range.right; c++) {
    if (layout.cols.size(c) > 0) columns.push(layout.cols.size(c));
  }
  const covered = new Set<string>();
  const rows: { height: number; cells: OgePrintCell[] }[] = [];
  for (let r = range.top; r <= range.bottom; r++) {
    if (layout.rows.size(r) === 0) continue;
    const cells: OgePrintCell[] = [];
    for (let c = range.left; c <= range.right; c++) {
      if (layout.cols.size(c) === 0 || covered.has(`${r},${c}`)) continue;
      const cell = sheet.getCell(r, c);
      const merge = sheet.mergeAt(r, c);
      let rowSpan = 1;
      let colSpan = 1;
      if (merge && merge.top === r && merge.left === c) {
        rowSpan = Math.min(merge.bottom, range.bottom) - r + 1;
        colSpan = Math.min(merge.right, range.right) - c + 1;
        for (let rr = r; rr < r + rowSpan; rr++)
          for (let cc = c; cc < c + colSpan; cc++) covered.add(`${rr},${cc}`);
      }
      const text = ogeCellText(workbook, sheet, resolver, r, c, locale);
      const style = resolver.get(cell?.style);
      const css = printCss(style, gridLines);
      // General: numbers right, text left, as on screen
      if (style.horizontal === 'general' && typeof cell?.value === 'number')
        css['textAlign'] = 'right';
      cells.push({ text, style: css, rowSpan, colSpan });
    }
    rows.push({ height: layout.rows.size(r), cells });
  }
  return { columns, rows };
}
