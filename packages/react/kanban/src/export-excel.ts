import {
  buildKanbanExcelWorkbook,
  downloadKanbanWorkbook,
  type OgeKanbanExcelExportOptions,
} from '@oge-ui/kanban-engine/export-excel';
import type { OgeKanbanHandle } from './lib/kanban-types';

// The workbook builder is the framework-free one both render layers share;
// re-exported so this entry point stands on its own.
export {
  buildKanbanExcelWorkbook,
  type OgeKanbanExcelExportOptions,
} from '@oge-ui/kanban-engine/export-excel';

/**
 * Exports the board's cards (board order; `visibleOnly` = what the filters
 * show) as an `.xlsx` download — the React face of
 * `@oge-ui/kanban/export-excel`, taking the board's imperative handle:
 *
 * ```tsx
 * const board = useRef<OgeKanbanHandle<Task>>(null);
 * // …
 * const { exportKanbanToExcel } = await import('@oge-ui/react-kanban/export-excel');
 * await exportKanbanToExcel(board.current!, { filename: 'sprint.xlsx' });
 * ```
 *
 * `exceljs` is an optional peer: only this entry point imports it.
 */
export async function exportKanbanToExcel<T extends object>(
  board: OgeKanbanHandle<T>,
  options: OgeKanbanExcelExportOptions = {},
): Promise<void> {
  const workbook = buildKanbanExcelWorkbook(
    board.getExportData(options),
    options,
  );
  await downloadKanbanWorkbook(workbook, options.filename ?? 'kanban.xlsx');
}
