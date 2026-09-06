/**
 * The pure `.pdf` builder, shared by both render layers — see the sibling
 * `export-excel` entry point for why it lives here rather than in the grid
 * packages. `jspdf` and `jspdf-autotable` are **optional peers**.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  OgeExportColumn,
  OgeExportData,
  OgeExportOptions,
} from './lib/grid/grid-options';

export interface OgePdfExportOptions<T = unknown> extends OgeExportOptions<T> {
  /** Download file name. Default: `grid.pdf`. */
  filename?: string;
  /** Heading printed above the table. */
  title?: string;
  /** Page orientation. Default: `landscape`. */
  orientation?: 'portrait' | 'landscape';
  /** jsPDF page format. Default: `a4`. */
  pageFormat?: string | number[];
}

/** PDF is text: every value goes through the column's display formatting. */
function cellText<T>(
  column: OgeExportColumn<T>,
  row: T,
  customize: OgeExportOptions<T>['customizeCell'],
): string {
  const raw = column.accessor(row);
  const text =
    raw == null ? '' : column.format ? column.format(raw) : String(raw);
  if (customize) {
    const out = customize({
      row,
      field: column.field,
      caption: column.caption,
      value: raw,
      text,
    });
    if (out !== undefined) return String(out);
  }
  return text;
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
  const doc = new jsPDF({
    orientation: options.orientation ?? 'landscape',
    format: options.pageFormat ?? 'a4',
  });
  let startY = 14;
  if (options.title) {
    doc.setFontSize(14);
    doc.text(options.title, 14, startY);
    startY += 8;
  }
  autoTable(doc, {
    startY,
    head: [data.columns.map((column) => column.caption)],
    body: data.rows.map((row) =>
      data.columns.map((column) =>
        cellText(column, row, options.customizeCell),
      ),
    ),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fontStyle: 'bold' },
    columnStyles: Object.fromEntries(
      data.columns.flatMap((column, index) =>
        column.dataType === 'number'
          ? [[index, { halign: 'right' as const }]]
          : [],
      ),
    ),
  });
  return doc;
}
