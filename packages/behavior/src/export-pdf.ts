/**
 * The pure `.pdf` builder, shared by both render layers — see the sibling
 * `export-excel` entry point for why it lives here rather than in the grid
 * packages. `jspdf` and `jspdf-autotable` are **optional peers**.
 *
 * What it writes: the header block (bands merged) repeated on every page,
 * group rows, group-footer and total summary rows, column widths taken from
 * the grid and fitted to the page, per-cell styles from `cellStyle` /
 * `customizeCell`, a title, and page header/footer callbacks (page numbers).
 */
import { jsPDF } from 'jspdf';
import autoTable, {
  type CellDef,
  type RowInput,
  type Styles,
} from 'jspdf-autotable';
import {
  mergeOgeExportStyles,
  ogeExportCellText,
  ogeExportHeaderCells,
  ogeExportItemsOf,
} from './lib/grid/grid-export';
import type {
  OgeExportCellStyle,
  OgeExportColumn,
  OgeExportData,
  OgeExportItem,
  OgeExportOptions,
  OgeExportRowKind,
} from './lib/grid/grid-options';
import type { OgeTreeExportData } from './lib/tree-list/tree-list-core';
import {
  registerOgePdfFont,
  resolveOgePdfFont,
  warnOgePdfUnicode,
  type OgePdfFont,
} from './lib/export/pdf-font';

export {
  getOgePdfDefaultFont,
  isOgePdfWinAnsi,
  registerOgePdfFont,
  resolveOgePdfFont,
  setOgePdfDefaultFont,
  warnOgePdfUnicode,
  type OgePdfFont,
  type OgePdfFontData,
  type OgePdfFontTarget,
} from './lib/export/pdf-font';

/** What a page header / footer callback is told. */
export interface OgePdfPageInfo {
  /** 1-based page number. */
  pageNumber: number;
  /** Total page count (known: callbacks run after the table is laid out). */
  pageCount: number;
}

/** Page chrome shared by every OGE PDF builder (grid, tree list, pivot). */
export interface OgePdfPageOptions {
  /** Heading printed above the table on the first page. */
  title?: string;
  /** Page orientation. Default: `landscape`. */
  orientation?: 'portrait' | 'landscape';
  /** jsPDF page format. Default: `a4`. */
  pageFormat?: string | number[];
  /** Page margin in mm. Default: 14. */
  margin?: number;
  /** Body font size in points. Default: 9. */
  fontSize?: number;
  /**
   * Unicode TrueType font to embed. Required for characters outside
   * WinAnsi — Turkish `ğ ş ı İ`, Central European, Greek, Cyrillic, … —
   * which the built-in Helvetica draws as garbage. Default: the font set by
   * `setOgePdfDefaultFont()`, else Helvetica; `null` forces Helvetica.
   */
  font?: OgePdfFont | null;
  /** Text drawn at the top of every page; return nothing to skip a page. */
  pageHeader?: (page: OgePdfPageInfo) => string | undefined | void;
  /** Text drawn at the bottom of every page (e.g. `Page 2 of 5`). */
  pageFooter?: (page: OgePdfPageInfo) => string | undefined | void;
  /**
   * Shorthand for a centred `n / total` footer when no `pageFooter` is
   * given. Default: false.
   */
  pageNumbers?: boolean;
  /** Repeats the header block on every page. Default: true. */
  repeatHeader?: boolean;
  /**
   * Scales the column widths so the table fills the printable width
   * (widths from the grid keep their proportions). Default: true.
   */
  fitToWidth?: boolean;
}

export interface OgePdfExportOptions<T = unknown>
  extends OgeExportOptions<T>, OgePdfPageOptions {
  /** Download file name. Default: `grid.pdf`. */
  filename?: string;
  /** Style of the header block (merged over the bold default). */
  headerStyle?: OgeExportCellStyle;
  /** Style of group header rows. */
  groupStyle?: OgeExportCellStyle;
  /** Style of group-footer and total rows. */
  summaryStyle?: OgeExportCellStyle;
}

const DEFAULT_HEADER: OgeExportCellStyle = {
  bold: true,
  background: '#f1f3f5',
  color: '#1f2937',
};
const DEFAULT_GROUP: OgeExportCellStyle = {
  bold: true,
  background: '#f6f7f9',
};
const DEFAULT_SUMMARY: OgeExportCellStyle = {
  bold: true,
  background: '#fafbfc',
};

const H_ALIGN = { start: 'left', center: 'center', end: 'right' } as const;

/** An {@link OgeExportCellStyle} as jspdf-autotable cell styles. */
export function ogePdfCellStyles(style: OgeExportCellStyle): Partial<Styles> {
  const out: Partial<Styles> = {};
  if (style.bold || style.italic) {
    out.fontStyle =
      style.bold && style.italic
        ? 'bolditalic'
        : style.bold
          ? 'bold'
          : 'italic';
  }
  if (style.color) out.textColor = style.color;
  if (style.background) out.fillColor = style.background;
  if (style.fontSize) out.fontSize = style.fontSize;
  if (style.alignment) out.halign = H_ALIGN[style.alignment];
  if (style.verticalAlignment) out.valign = style.verticalAlignment;
  if (style.wrap === false) out.overflow = 'ellipsize';
  if (style.border) {
    out.lineWidth = 0.2;
    out.lineColor = typeof style.border === 'string' ? style.border : '#d0d5dd';
  }
  return out;
}

/** Creates the document with the shared page options applied. */
export function createOgePdfDocument(options: OgePdfPageOptions): jsPDF {
  const doc = new jsPDF({
    orientation: options.orientation ?? 'landscape',
    format: options.pageFormat ?? 'a4',
  });
  const font = resolveOgePdfFont(options);
  if (font) registerOgePdfFont(doc, font);
  return doc;
}

/**
 * The autoTable `font` style for `options`: the embedded family, or
 * undefined for the built-in default.
 */
export function ogePdfTableFont(
  options: OgePdfPageOptions,
): string | undefined {
  return resolveOgePdfFont(options)?.family;
}

/** The table's top on page one and the margins left for the page chrome. */
export function ogePdfLayout(
  doc: jsPDF,
  options: OgePdfPageOptions,
): {
  startY: number;
  margin: { top: number; bottom: number; left: number; right: number };
} {
  const margin = options.margin ?? 14;
  const top = margin + (options.pageHeader ? 6 : 0);
  const bottom = margin + (options.pageFooter || options.pageNumbers ? 6 : 0);
  let startY = top;
  if (options.title) {
    doc.setFontSize(14);
    doc.text(options.title, margin, startY);
    startY += 8;
  }
  return { startY, margin: { top, bottom, left: margin, right: margin } };
}

/**
 * Draws the page header / footer text on every page once the table is laid
 * out, so the footer knows the final page count.
 */
export function applyOgePdfPageChrome(
  doc: jsPDF,
  options: OgePdfPageOptions,
): void {
  const footer =
    options.pageFooter ??
    (options.pageNumbers
      ? ({ pageNumber, pageCount }: OgePdfPageInfo) =>
          `${pageNumber} / ${pageCount}`
      : undefined);
  if (!options.pageHeader && !footer) return;
  const margin = options.margin ?? 14;
  const pageCount = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    doc.setPage(pageNumber);
    const { width, height } = doc.internal.pageSize;
    const family = ogePdfTableFont(options);
    if (family) doc.setFont(family, 'normal');
    doc.setFontSize(8);
    const head = options.pageHeader?.({ pageNumber, pageCount });
    if (head) doc.text(head, margin, margin - 2);
    const foot = footer?.({ pageNumber, pageCount });
    if (foot)
      doc.text(foot, width / 2, height - margin / 2, { align: 'center' });
  }
}

/** Every string a table writes (for the WinAnsi warning). */
export function* pdfTexts(
  head: unknown,
  body: unknown,
  options: OgePdfPageOptions,
): Generator<string> {
  if (options.title) yield options.title;
  const visit = function* (value: unknown): Generator<string> {
    if (typeof value === 'string') yield value;
    else if (Array.isArray(value)) for (const v of value) yield* visit(v);
    else if (value && typeof value === 'object' && 'content' in value)
      yield String((value as { content: unknown }).content ?? '');
  };
  yield* visit(head);
  yield* visit(body);
}

/** px → mm (96 dpi). */
const MM_PER_PX = 25.4 / 96;

/**
 * Column widths in mm: the grid's px widths, scaled to the printable width
 * when `fitToWidth` (columns without a width share what is left).
 */
function columnWidths<T>(
  columns: readonly OgeExportColumn<T>[],
  printable: number,
  fit: boolean,
): (number | 'auto')[] {
  const known = columns.map((column) =>
    column.width ? column.width * MM_PER_PX : undefined,
  );
  if (!fit) return known.map((width) => width ?? 'auto');
  const unknown = known.filter((width) => width === undefined).length;
  const sum = known.reduce<number>((total, width) => total + (width ?? 0), 0);
  if (!sum) return known.map(() => 'auto');
  // columns without a width are counted at the average known width
  const average = sum / Math.max(1, known.length - unknown);
  const scale = printable / (sum + unknown * average);
  return known.map((width) => (width ?? average) * scale);
}

/**
 * Lays the export model out as one autotable — the routine behind the grid
 * and tree-list documents. `indentFirstColumn` pads tree / group depth.
 */
function writeTable<T>(
  doc: jsPDF,
  data: OgeExportData<T>,
  options: OgePdfExportOptions<T>,
): void {
  const columns = data.columns;
  const count = columns.length;
  const { startY, margin } = ogePdfLayout(doc, options);
  const headerStyle = mergeOgeExportStyles(DEFAULT_HEADER, options.headerStyle);
  const groupStyle = mergeOgeExportStyles(DEFAULT_GROUP, options.groupStyle);
  const summaryStyle = mergeOgeExportStyles(
    DEFAULT_SUMMARY,
    options.summaryStyle,
  );
  const styleFor = (
    base: OgeExportCellStyle,
    column: OgeExportColumn<T>,
    row: T | undefined,
    value: unknown,
    kind: OgeExportRowKind,
    level: number,
  ): OgeExportCellStyle =>
    mergeOgeExportStyles(
      base,
      options.cellStyle?.({ row, column, value, kind, level }),
    );

  // --- head ---
  const header = ogeExportHeaderCells(columns);
  const head: CellDef[][] = Array.from({ length: header.rows }, () => []);
  for (const cell of header.cells) {
    const column =
      cell.columnIndex !== undefined ? columns[cell.columnIndex] : undefined;
    const style = column
      ? styleFor(
          mergeOgeExportStyles(headerStyle, {
            alignment: headerStyle.alignment ?? column.alignment,
          }),
          column,
          undefined,
          column.caption,
          'header',
          0,
        )
      : mergeOgeExportStyles(headerStyle, { alignment: 'center' });
    head[cell.row - 1].push({
      content: cell.caption,
      rowSpan: cell.rowSpan,
      colSpan: cell.colSpan,
      styles: ogePdfCellStyles(style),
    });
  }

  // --- body ---
  const items: readonly OgeExportItem<T>[] = ogeExportItemsOf(data);
  const indent = (level: number): Partial<Styles> =>
    level > 0
      ? { cellPadding: { top: 2, bottom: 2, right: 2, left: 2 + level * 4 } }
      : {};
  const body: RowInput[] = items.map((item): CellDef[] => {
    switch (item.kind) {
      case 'data':
        return columns.map((column, index) => {
          const raw = column.accessor(item.row);
          let text = ogeExportCellText(column, item.row);
          const style = styleFor(
            { alignment: column.alignment },
            column,
            item.row,
            raw,
            'data',
            item.level,
          );
          if (options.customizeCell) {
            const out = options.customizeCell({
              row: item.row,
              field: column.field,
              caption: column.caption,
              value: raw,
              text,
              column,
              level: item.level,
              style,
            });
            if (out !== undefined) text = String(out);
          }
          return {
            content: text,
            styles: {
              ...ogePdfCellStyles(style),
              ...(index === 0 ? indent(item.level) : {}),
            },
          };
        });
      case 'group': {
        const first = columns[0];
        const style = first
          ? styleFor(
              groupStyle,
              first,
              undefined,
              item.value,
              'group',
              item.level,
            )
          : groupStyle;
        return [
          {
            content: item.text,
            colSpan: Math.max(1, count),
            styles: { ...ogePdfCellStyles(style), ...indent(item.level) },
          },
        ];
      }
      case 'groupFooter':
      case 'total':
        return columns.map((column) => {
          const summaries = item.summaries.filter(
            (summary) => summary.field === column.field,
          );
          const style = styleFor(
            mergeOgeExportStyles(summaryStyle, { alignment: column.alignment }),
            column,
            undefined,
            summaries[0]?.value,
            item.kind,
            item.kind === 'total' ? 0 : item.level,
          );
          return {
            content: summaries.map((summary) => summary.text).join('\n'),
            styles: ogePdfCellStyles(style),
          };
        });
    }
  });

  const printable =
    doc.internal.pageSize.getWidth() - margin.left - margin.right;
  const widths = columnWidths(columns, printable, options.fitToWidth !== false);
  const family = ogePdfTableFont(options);
  if (!family) warnOgePdfUnicode(pdfTexts(head, body, options));
  autoTable(doc, {
    startY,
    margin,
    head,
    body,
    showHead: options.repeatHeader === false ? 'firstPage' : 'everyPage',
    tableWidth: options.fitToWidth === false ? 'wrap' : 'auto',
    theme: 'grid',
    styles: {
      ...(family ? { font: family } : {}),
      fontSize: options.fontSize ?? 9,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: '#d0d5dd',
      textColor: '#1f2937',
      overflow: 'linebreak',
    },
    headStyles: { fontStyle: 'bold' },
    columnStyles: Object.fromEntries(
      widths.map((width, index) => [index, { cellWidth: width }]),
    ),
  });
  applyOgePdfPageChrome(doc, options);
}

/**
 * Builds a jsPDF document from export data — pure and testable. The one-call
 * grid → download flow is `exportGridToPdf` in `@oge-ui/grid/export-pdf`
 * (Angular) or `@oge-ui/react-grid/export-pdf`.
 */
export function buildPdfDocument<T>(
  data: OgeExportData<T>,
  options: OgePdfExportOptions<T> = {},
): jsPDF {
  const doc = createOgePdfDocument(options);
  writeTable(doc, data, options);
  return doc;
}

// --- tree list ----------------------------------------------------------------

/** Options of {@link buildTreePdfDocument} and the tree-list PDF helpers. */
export interface OgeTreePdfExportOptions<T = unknown> extends Omit<
  OgePdfExportOptions<T>,
  'scope' | 'groups' | 'groupStyle'
> {
  /** Download file name. Default: `tree-list.pdf`. */
  filename?: string;
}

/**
 * Builds a jsPDF document from tree export data: the hierarchy shows as
 * first-column indentation, total summaries close the table and recursive
 * (per-parent) summaries follow each parent's subtree. The one-call flow is
 * `exportOgeTreeListToPdf` in `@oge-ui/tree-list/export-pdf` (Angular) or
 * `@oge-ui/react-tree-list/export-pdf`.
 */
export function buildTreePdfDocument<T>(
  data: OgeTreeExportData<T>,
  options: OgeTreePdfExportOptions<T> = {},
): jsPDF {
  const doc = createOgePdfDocument(options);
  const items =
    data.items ??
    data.rows.map((row, index) => ({
      kind: 'data' as const,
      row,
      level: data.levels[index] ?? 0,
    }));
  writeTable(doc, { ...data, items }, options);
  return doc;
}
