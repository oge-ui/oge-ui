import type { OgeScheduler } from '@oge-ui/scheduler';
import {
  buildSchedulerPdfDocument,
  type OgeSchedulerPdfExportOptions,
} from '@oge-ui/scheduler-engine/export-pdf';

// The list builder is framework-free, so it lives in
// `@oge-ui/scheduler-engine` and both render layers call the same one.
// Re-exported so this entry point stands on its own.
export {
  buildSchedulerPdfDocument,
  type OgeSchedulerPdfExportOptions,
} from '@oge-ui/scheduler-engine/export-pdf';

/**
 * Exports the visible period (or `range`) as a day-grouped appointment list
 * `.pdf` download (`jspdf` peer). Text outside WinAnsi needs a Unicode
 * `font` — per export, or once via `setOgePdfDefaultFont()`.
 *
 * ```ts
 * const { exportSchedulerToPdf } = await import('@oge-ui/scheduler/export-pdf');
 * await exportSchedulerToPdf(this.scheduler(), { filename: 'week.pdf' });
 * ```
 */
export async function exportSchedulerToPdf<T extends object>(
  scheduler: OgeScheduler<T>,
  options: OgeSchedulerPdfExportOptions & {
    readonly range?: { readonly startDate: Date; readonly endDate: Date };
  } = {},
): Promise<void> {
  const doc = buildSchedulerPdfDocument(
    scheduler.getExportData(options.range),
    options,
  );
  if (typeof document === 'undefined') return;
  doc.save(options.filename ?? 'schedule.pdf');
}
