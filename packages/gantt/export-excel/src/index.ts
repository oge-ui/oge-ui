import type { OgeGantt } from '@oge-ui/gantt';
import {
  buildGanttExcelWorkbook,
  type OgeGanttExcelExportOptions,
} from '@oge-ui/gantt-engine/export-excel';

// The workbook builder is non-trivial and framework-free, so it lives in
// `@oge-ui/gantt-engine` and both render layers call the same one.
// Re-exported here so this entry point's public API is unchanged.
export {
  buildGanttExcelWorkbook,
  type OgeGanttExcelExportOptions,
} from '@oge-ui/gantt-engine/export-excel';

/**
 * Exports the Gantt's tasks (tree order, collapse ignored) as an `.xlsx`
 * download.
 *
 * ```ts
 * const { exportGanttToExcel } = await import('@oge-ui/gantt/export-excel');
 * await exportGanttToExcel(this.gantt(), { filename: 'plan.xlsx' });
 * ```
 */
export async function exportGanttToExcel<
  T extends object,
  D extends object = Record<string, unknown>,
>(
  gantt: OgeGantt<T, D>,
  options: OgeGanttExcelExportOptions = {},
): Promise<void> {
  const workbook = buildGanttExcelWorkbook(gantt.getExportData(), options);
  if (typeof document === 'undefined') return;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename ?? 'gantt.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}
