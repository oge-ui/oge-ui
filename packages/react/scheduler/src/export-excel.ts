import {
  buildSchedulerExcelWorkbook,
  type OgeSchedulerExcelExportOptions,
} from '@oge-ui/scheduler-engine/export-excel';
import type { OgeSchedulerHandle } from './lib/scheduler-types';

// The workbook builder is the framework-free one both render layers share;
// re-exported so this entry point stands on its own.
export {
  buildSchedulerExcelWorkbook,
  type OgeSchedulerExcelExportOptions,
} from '@oge-ui/scheduler-engine/export-excel';

/**
 * Exports the visible period (or `range`) as an `.xlsx` appointment list
 * (`exceljs` peer) — the React face of `@oge-ui/scheduler/export-excel`.
 */
export async function exportSchedulerToExcel<T extends object>(
  scheduler: OgeSchedulerHandle<T>,
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
