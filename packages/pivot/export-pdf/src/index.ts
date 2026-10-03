import {
  buildPivotPdfDocument,
  downloadPivotPdf,
  type OgePivotPdfExportOptions,
} from '@oge-ui/pivot-engine/export-pdf';
import type { OgePivotGrid } from '@oge-ui/pivot';

// The document builder is the framework-free one both render layers share
// (ADR 0003); re-exported so this entry point stands on its own.
export {
  buildPivotPdfDocument,
  type OgePdfPageInfo,
  type OgePivotPdfCell,
  type OgePivotPdfExportOptions,
} from '@oge-ui/pivot-engine/export-pdf';

/**
 * Exports the pivot's current view as a `.pdf` download — headers repeated
 * per page, the grid's own cell text, its row-header layout and the row
 * field captions.
 *
 * ```ts
 * const { exportPivotToPdf } = await import('@oge-ui/pivot/export-pdf');
 * await exportPivotToPdf(this.pivot(), { title: 'Sales', pageNumbers: true });
 * ```
 *
 * `jspdf` and `jspdf-autotable` are optional peers, imported only here.
 */
export async function exportPivotToPdf<T extends object>(
  grid: OgePivotGrid<T>,
  options: OgePivotPdfExportOptions = {},
): Promise<void> {
  const doc = buildPivotPdfDocument(grid.getResult(), {
    rowHeaderLayout: grid.getRowHeaderLayout(),
    rowFieldCaptions: grid.getRowFieldCaptions(),
    cellText: (r, c, m) => grid.getPreparedCell(r, c, m).text,
    ...options,
  });
  downloadPivotPdf(doc, options.filename ?? 'pivot.pdf');
}
