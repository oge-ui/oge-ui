import type { OgeGrid } from '@oge-ui/grid';

// See the sibling `export-excel` entry: the document builder is shared.
export {
  buildPdfDocument,
  type OgePdfExportOptions,
} from '@oge-ui/behavior/export-pdf';
import { buildPdfDocument } from '@oge-ui/behavior/export-pdf';
import type { OgePdfExportOptions } from '@oge-ui/behavior/export-pdf';

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
  options: OgePdfExportOptions<T> = {},
): Promise<void> {
  const doc = buildPdfDocument(
    await grid.getExportData({ scope: options.scope }),
    options,
  );
  if (typeof document === 'undefined') return;
  doc.save(options.filename ?? 'grid.pdf');
}
