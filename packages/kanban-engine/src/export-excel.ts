/**
 * The pure Kanban `.xlsx` builder, shared by both render layers.
 *
 * `exceljs` is an **optional peer**: nothing pulls this entry point in unless
 * a consumer imports it. The Angular `@oge-ui/kanban/export-excel` and React
 * `@oge-ui/react-kanban/export-excel` entries only turn a board into a
 * download and re-export this builder.
 */
import { Workbook } from 'exceljs';
import {
  kanbanChecklistCell,
  type OgeKanbanExportData,
  type OgeKanbanExportOptions,
} from './lib/export';

export interface OgeKanbanExcelExportOptions extends OgeKanbanExportOptions {
  /** Download file name. Default: `kanban.xlsx`. */
  readonly filename?: string;
  /** Worksheet name. Default: the export messages' `sheetName` (`Cards`). */
  readonly sheetName?: string;
}

/**
 * Builds an exceljs Workbook from board export data — one row per card in
 * board order; due dates stay real dates, tags and assignees are joined
 * with `; `. Pure and testable; `exportKanbanToExcel` in either render
 * package is the one-call board → download flow.
 */
export function buildKanbanExcelWorkbook(
  data: OgeKanbanExportData,
  options: OgeKanbanExcelExportOptions = {},
): Workbook {
  const m = data.messages;
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? m.sheetName);
  const headers = [
    m.key,
    m.title,
    m.column,
    ...(data.hasSwimlanes ? [m.swimlane] : []),
    m.description,
    m.tags,
    m.assignees,
    m.priority,
    m.dueDate,
    m.checklist,
  ];
  sheet.columns = headers.map((header, index) => ({
    header,
    key: `c${index}`,
    width: index === 1 ? 40 : Math.max(header.length + 4, 12),
  }));
  sheet.getRow(1).font = { bold: true };
  for (const row of data.rows) {
    sheet.addRow([
      row.key == null ? '' : String(row.key),
      row.title,
      row.column,
      ...(data.hasSwimlanes ? [row.swimlane ?? ''] : []),
      row.description,
      row.tags.join('; '),
      row.assignees.join('; '),
      row.priority ?? '',
      row.dueDate ?? '',
      kanbanChecklistCell(row),
    ]);
  }
  return workbook;
}

/** Writes the workbook and starts a browser download (no-op on the server). */
export async function downloadKanbanWorkbook(
  workbook: Workbook,
  filename: string,
): Promise<void> {
  if (typeof document === 'undefined') return;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
