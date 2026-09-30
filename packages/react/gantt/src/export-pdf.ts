import {
  buildGanttPdfDocument,
  type OgeGanttPdfExportOptions,
} from '@oge-ui/gantt-engine/export-pdf';
import type { OgeGanttHandle } from './lib/gantt-types';

// The vector-chart builder is the framework-free one both render layers
// share; re-exported so this entry point stands on its own.
export {
  buildGanttPdfDocument,
  type OgeGanttPdfExportOptions,
} from '@oge-ui/gantt-engine/export-pdf';

/**
 * Exports the Gantt (tasks in tree order, collapse ignored) as a drawn
 * `.pdf` download — the React face of `@oge-ui/gantt/export-pdf`:
 *
 * ```tsx
 * const { exportGanttToPdf } = await import('@oge-ui/react-gantt/export-pdf');
 * await exportGanttToPdf(gantt.current!, { filename: 'plan.pdf', title: 'Plan' });
 * ```
 */
export async function exportGanttToPdf<
  T extends object,
  D extends object = Record<string, unknown>,
>(
  gantt: OgeGanttHandle<T, D>,
  options: OgeGanttPdfExportOptions = {},
): Promise<void> {
  const doc = buildGanttPdfDocument(gantt.getExportData(), options);
  if (typeof document === 'undefined') return;
  doc.save(options.filename ?? 'gantt.pdf');
}
