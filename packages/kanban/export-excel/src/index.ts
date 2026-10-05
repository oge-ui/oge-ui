import type { OgeKanban } from '@oge-ui/kanban';
import {
  buildKanbanExcelWorkbook,
  downloadKanbanWorkbook,
  type OgeKanbanExcelExportOptions,
} from '@oge-ui/kanban-engine/export-excel';

// The workbook builder is framework-free, so it lives in
// `@oge-ui/kanban-engine` and both render layers call the same one;
// re-exported here so this entry point stands on its own.
export {
  buildKanbanExcelWorkbook,
  type OgeKanbanExcelExportOptions,
} from '@oge-ui/kanban-engine/export-excel';

/**
 * Exports the board's cards (board order; `visibleOnly` = what the filters
 * show) as an `.xlsx` download. `exceljs` is an optional peer — only this
 * entry point imports it.
 *
 * ```ts
 * const { exportKanbanToExcel } = await import('@oge-ui/kanban/export-excel');
 * await exportKanbanToExcel(this.board(), { filename: 'sprint.xlsx' });
 * ```
 */
export async function exportKanbanToExcel<T extends object>(
  board: OgeKanban<T>,
  options: OgeKanbanExcelExportOptions = {},
): Promise<void> {
  const workbook = buildKanbanExcelWorkbook(
    board.getExportData(options),
    options,
  );
  await downloadKanbanWorkbook(workbook, options.filename ?? 'kanban.xlsx');
}
