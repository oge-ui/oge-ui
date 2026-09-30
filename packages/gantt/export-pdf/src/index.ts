import type { OgeGantt } from '@oge-ui/gantt';
import {
  buildGanttPdfDocument,
  type OgeGanttPdfExportOptions,
} from '@oge-ui/gantt-engine/export-pdf';

// The vector-chart builder is framework-free, so it lives in
// `@oge-ui/gantt-engine` and both render layers call the same one.
// Re-exported here so this entry point's public API is unchanged.
export {
  buildGanttPdfDocument,
  type OgeGanttPdfExportOptions,
} from '@oge-ui/gantt-engine/export-pdf';

/**
 * Exports the Gantt (tasks in tree order, collapse ignored) as a drawn
 * `.pdf` download.
 *
 * ```ts
 * const { exportGanttToPdf } = await import('@oge-ui/gantt/export-pdf');
 * await exportGanttToPdf(this.gantt(), { filename: 'plan.pdf', title: 'Plan' });
 * ```
 */
export async function exportGanttToPdf<
  T extends object,
  D extends object = Record<string, unknown>,
>(
  gantt: OgeGantt<T, D>,
  options: OgeGanttPdfExportOptions = {},
): Promise<void> {
  const doc = buildGanttPdfDocument(gantt.getExportData(), options);
  if (typeof document === 'undefined') return;
  doc.save(options.filename ?? 'gantt.pdf');
}
