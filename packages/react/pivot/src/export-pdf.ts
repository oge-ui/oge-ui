import {
  buildPivotPdfDocument,
  downloadPivotPdf,
  type OgePivotPdfExportOptions,
} from '@oge-ui/pivot-engine/export-pdf';
import type { OgePivotGridHandle } from './lib/pivot-types';

// The document builder is the framework-free one both render layers share
// (ADR 0003); re-exported so this entry point stands on its own.
export {
  buildPivotPdfDocument,
  type OgePdfPageInfo,
  type OgePivotPdfCell,
  type OgePivotPdfExportOptions,
} from '@oge-ui/pivot-engine/export-pdf';

/**
 * Exports the pivot's current view as a `.pdf` download — the React face of
 * `@oge-ui/pivot/export-pdf`, taking the grid's imperative handle:
 *
 * ```tsx
 * const pivot = useRef<OgePivotGridHandle<Sale>>(null);
 * // …
 * const { exportPivotToPdf } = await import('@oge-ui/react-pivot/export-pdf');
 * await exportPivotToPdf(pivot.current!, { title: 'Sales', pageNumbers: true });
 * ```
 *
 * `jspdf` and `jspdf-autotable` are optional peers, imported only here.
 */
export async function exportPivotToPdf<T>(
  grid: OgePivotGridHandle<T>,
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
