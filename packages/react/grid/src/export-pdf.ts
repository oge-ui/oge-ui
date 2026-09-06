import { buildPdfDocument } from '@oge-ui/behavior/export-pdf';
import type { OgePdfExportOptions } from '@oge-ui/behavior/export-pdf';
import type { OgeGridHandle } from './lib/grid-types';

// See the sibling `export-excel` entry: the document builder is shared.
export {
  buildPdfDocument,
  type OgePdfExportOptions,
} from '@oge-ui/behavior/export-pdf';

/**
 * Exports the grid's current view (filter + search + sort applied, no paging)
 * as a `.pdf` download — the React face of `@oge-ui/grid/export-pdf`.
 *
 * ```tsx
 * const grid = useRef<OgeGridHandle<Order>>(null);
 * // …
 * const { exportGridToPdf } = await import('@oge-ui/react-grid/export-pdf');
 * await exportGridToPdf(grid.current!, { filename: 'orders.pdf', title: 'Orders' });
 * ```
 *
 * `jspdf` and `jspdf-autotable` are optional peers, imported only here.
 */
export async function exportGridToPdf<T extends object>(
  grid: OgeGridHandle<T>,
  options: OgePdfExportOptions<T> = {},
): Promise<void> {
  const doc = buildPdfDocument(
    await grid.getExportData({ scope: options.scope }),
    options,
  );
  if (typeof document === 'undefined') return;
  doc.save(options.filename ?? 'grid.pdf');
}
