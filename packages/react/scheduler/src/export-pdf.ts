import {
  buildSchedulerPdfDocument,
  type OgeSchedulerPdfExportOptions,
} from '@oge-ui/scheduler-engine/export-pdf';
import type { OgeSchedulerHandle } from './lib/scheduler-types';

// The list builder is the framework-free one both render layers share;
// re-exported so this entry point stands on its own.
export {
  buildSchedulerPdfDocument,
  type OgeSchedulerPdfExportOptions,
} from '@oge-ui/scheduler-engine/export-pdf';

/**
 * Exports the visible period (or `range`) as a day-grouped appointment list
 * `.pdf` download (`jspdf` peer) — the React face of
 * `@oge-ui/scheduler/export-pdf`.
 */
export async function exportSchedulerToPdf<T extends object>(
  scheduler: OgeSchedulerHandle<T>,
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
