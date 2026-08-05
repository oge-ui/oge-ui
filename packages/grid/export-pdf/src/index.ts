import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OgeExportColumn, OgeExportData, OgeExportOptions, OgeGrid } from '@oge-ui/grid';

export interface OgePdfExportOptions extends OgeExportOptions {
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
function cellText<T>(column: OgeExportColumn<T>, row: T): string {
  const raw = column.accessor(row);
  if (raw == null) return '';
  return column.format ? column.format(raw) : String(raw);
}

/**
 * Builds a jsPDF document from export data — pure and testable; use
 * {@link exportGridToPdf} for the one-call grid → download flow.
 */
export function buildPdfDocument<T>(
  data: OgeExportData<T>,
  options: OgePdfExportOptions = {}
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
    body: data.rows.map((row) => data.columns.map((column) => cellText(column, row))),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fontStyle: 'bold' },
    columnStyles: Object.fromEntries(
      data.columns.flatMap((column, index) =>
        column.dataType === 'number' ? [[index, { halign: 'right' as const }]] : []
      )
    ),
  });
  return doc;
}

/**
 * Exports the grid's current view (filter + search + sort applied, no paging)
 * as a `.pdf` download.
 *
 * ```ts
 * const { exportGridToPdf } = await import('@oge-ui/grid/export-pdf');
 * await exportGridToPdf(this.grid(), { filename: 'orders.pdf', title: 'Orders' });
 * ```
 */
export async function exportGridToPdf<T extends object>(
  grid: OgeGrid<T>,
  options: OgePdfExportOptions = {}
): Promise<void> {
  const doc = buildPdfDocument(await grid.getExportData({ scope: options.scope }), options);
  if (typeof document === 'undefined') return;
  doc.save(options.filename ?? 'grid.pdf');
}
