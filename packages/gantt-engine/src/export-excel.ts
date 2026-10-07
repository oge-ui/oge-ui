/**
 * The pure Gantt `.xlsx` builder, shared by both render layers.
 *
 * It lives in the engine rather than in `@oge-ui/gantt/export-excel` because
 * it is non-trivial and framework-free. The Angular and React Gantt packages
 * keep only the lines that turn a Gantt into a download, and both re-export
 * this builder so their public API is unchanged.
 *
 * `exceljs` is an **optional peer**: nothing pulls this entry point in unless
 * a consumer imports it.
 */
import { Workbook } from 'exceljs';
import type { OgeGanttExportData, OgeGanttTask } from './lib/gantt-types';

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
  /**
   * Write a right-to-left worksheet (the first column on the right, as the
   * RTL task list shows it). Default: the Gantt's own direction
   * (`OgeGanttExportData.rtl`), else `false`.
   */
  rtl?: boolean;
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
 * the render packages' `exportGanttToExcel` is the one-call gantt →
 * download flow.
 * Rows follow the tree order with indented titles and bold summary rows.
 */
export function buildGanttExcelWorkbook<T>(
  data: OgeGanttExportData<T>,
  options: OgeGanttExcelExportOptions = {},
): Workbook {
  const workbook = new Workbook();
  const rtl = options.rtl ?? data.rtl ?? false;
  const sheet = workbook.addWorksheet(
    options.sheetName ?? 'Tasks',
    rtl ? { views: [{ rightToLeft: true }] } : undefined,
  );
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
