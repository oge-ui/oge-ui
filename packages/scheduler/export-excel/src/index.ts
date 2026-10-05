import type { OgeScheduler } from '@oge-ui/scheduler';
import {
  buildSchedulerExcelWorkbook,
  type OgeSchedulerExcelExportOptions,
} from '@oge-ui/scheduler-engine/export-excel';

// The workbook builder is framework-free, so it lives in
// `@oge-ui/scheduler-engine` and both render layers call the same one.
// Re-exported so this entry point stands on its own.
export {
  buildSchedulerExcelWorkbook,
  type OgeSchedulerExcelExportOptions,
} from '@oge-ui/scheduler-engine/export-excel';

/**
 * Exports the visible period (or `range`) as an `.xlsx` appointment list
 * (`exceljs` peer) — typed Date cells, all-day / recurring columns, one
 * column per resource kind.
 *
 * ```ts
 * const { exportSchedulerToExcel } = await import('@oge-ui/scheduler/export-excel');
 * await exportSchedulerToExcel(this.scheduler(), { filename: 'week.xlsx' });
 * ```
 */
export async function exportSchedulerToExcel<T extends object>(
  scheduler: OgeScheduler<T>,
  options: OgeSchedulerExcelExportOptions & {
    readonly range?: { readonly startDate: Date; readonly endDate: Date };
  } = {},
): Promise<void> {
  const workbook = buildSchedulerExcelWorkbook(
    scheduler.getExportData(options.range),
    options,
  );
  if (typeof document === 'undefined') return;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename ?? 'schedule.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}
