import {
  buildGanttExcelWorkbook,
  type OgeGanttExcelExportOptions,
} from '@oge-ui/gantt-engine/export-excel';
import type { OgeGanttHandle } from './lib/gantt-types';

// The workbook builder is the framework-free one both render layers share;
// re-exported so this entry point stands on its own.
export {
  buildGanttExcelWorkbook,
  type OgeGanttExcelExportOptions,
} from '@oge-ui/gantt-engine/export-excel';

/**
 * Exports the Gantt's tasks (tree order, collapse ignored) as an `.xlsx`
 * download — the React face of `@oge-ui/gantt/export-excel`. Takes the
 * Gantt's imperative handle, React's equivalent of the Angular instance:
 *
 * ```tsx
 * const gantt = useRef<OgeGanttHandle<Task>>(null);
 * // …
 * const { exportGanttToExcel } = await import('@oge-ui/react-gantt/export-excel');
 * await exportGanttToExcel(gantt.current!, { filename: 'plan.xlsx' });
 * ```
 *
 * `exceljs` is an optional peer: this entry point is the only thing that
 * imports it, so an app that never exports never installs it.
 */
export async function exportGanttToExcel<
  T extends object,
  D extends object = Record<string, unknown>,
>(
  gantt: OgeGanttHandle<T, D>,
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
