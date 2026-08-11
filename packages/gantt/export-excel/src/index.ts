import { Workbook } from 'exceljs';
import type { OgeGantt, OgeGanttExportData, OgeGanttTask } from '@oge-ui/gantt';

export interface OgeGanttExcelExportOptions {
  /** Download file name. Default: `gantt.xlsx`. */
  filename?: string;
  /** Worksheet name. Default: `Tasks`. */
  sheetName?: string;
  /** Indent child task titles by tree level. Default: true. */
  indentTitles?: boolean;
  /** Appends a resource column when resources are configured. Default: true. */
  includeResources?: boolean;
  /** Header of the appended resource column. Default: `Assigned`. */
  resourcesHeader?: string;
}

/** Typed cell value: start/end stay dates, progress stays a number. */
function cellValue<T>(
  task: OgeGanttTask<T>,
  column: OgeGanttExportData<T>['columns'][number],
  options: OgeGanttExcelExportOptions,
): unknown {
  switch (column.field) {
    case 'title': {
      const indent =
        options.indentTitles === false ? '' : '  '.repeat(task.level);
      return indent + task.title;
    }
    case 'start':
      return task.start;
    case 'end':
      return task.end;
    case 'progress':
      return task.progress;
    default:
      return column.text(task);
  }
}

/**
 * Builds an exceljs Workbook from Gantt export data — pure and testable;
 * use {@link exportGanttToExcel} for the one-call gantt → download flow.
 * Rows follow the tree order with indented titles and bold summary rows.
 */
export function buildGanttExcelWorkbook<T>(
  data: OgeGanttExportData<T>,
  options: OgeGanttExcelExportOptions = {},
): Workbook {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? 'Tasks');
  const hasResources =
    options.includeResources !== false &&
    data.tasks.some((task) => data.resourceText(task) !== null);
  const headers = [
    ...data.columns.map((column) => column.header),
    ...(hasResources ? [options.resourcesHeader ?? 'Assigned'] : []),
  ];
  sheet.columns = headers.map((header, index) => ({
    header,
    key: `c${index}`,
    width: index === 0 ? 40 : Math.max(header.length + 4, 12),
  }));
  sheet.getRow(1).font = { bold: true };
  for (const task of data.tasks) {
    const row = sheet.addRow([
      ...data.columns.map((column) => cellValue(task, column, options)),
      ...(hasResources ? [data.resourceText(task) ?? ''] : []),
    ]);
    if (task.isSummary) row.font = { bold: true };
  }
  return workbook;
}

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
