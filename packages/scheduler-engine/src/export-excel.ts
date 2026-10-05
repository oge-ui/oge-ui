/**
 * `@oge-ui/scheduler-engine/export-excel` — the scheduler's list workbook,
 * shared by both render layers: one row per appointment / occurrence of
 * the period with real Date cells, a yes/no all-day and recurring column,
 * location, description and one column per resource kind. `exceljs` is an
 * **optional peer** pulled in only by this entry.
 */
import { Workbook } from 'exceljs';
import type { OgeSchedulerExportData } from './lib/export-data';

/** Options of the scheduler Excel export. */
export interface OgeSchedulerExcelExportOptions {
  /** Download file name. Default: `schedule.xlsx`. */
  filename?: string;
  /** Worksheet name. Default: the messages' `export.sheetName`. */
  sheetName?: string;
  /** Appends one column per resource kind. Default: true. */
  includeResources?: boolean;
  /** Excel number format of the start / end cells. Default: `yyyy-mm-dd hh:mm`. */
  dateFormat?: string;
}

/**
 * Builds an exceljs Workbook from the export rows — pure and testable;
 * the render packages' `exportSchedulerToExcel` is the one-call scheduler
 * → download flow. Cell values are typed (dates stay dates), so no text
 * cell can be read as a formula.
 */
export function buildSchedulerExcelWorkbook<T>(
  data: OgeSchedulerExportData<T>,
  options: OgeSchedulerExcelExportOptions = {},
): Workbook {
  const m = data.messages;
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? m.sheetName);
  const resourceLabels =
    options.includeResources === false
      ? []
      : data.resources.map((resource) => resource.label ?? resource.fieldExpr);
  const headers = [
    m.subject,
    m.start,
    m.end,
    m.allDay,
    m.location,
    m.description,
    m.recurring,
    ...resourceLabels,
  ];
  sheet.columns = headers.map((header, index) => ({
    header,
    key: `c${index}`,
    width: index === 0 || index === 5 ? 36 : Math.max(header.length + 4, 14),
  }));
  sheet.getRow(1).font = { bold: true };
  const dateFormat = options.dateFormat ?? 'yyyy-mm-dd hh:mm';
  for (const row of data.rows) {
    const resources = resourceLabels.map(
      (label) =>
        row.resources.find((entry) => entry.label === label)?.text ?? '',
    );
    const added = sheet.addRow([
      row.text,
      row.startDate,
      row.endDate,
      row.allDay ? m.yes : m.no,
      row.location ?? '',
      row.description ?? '',
      row.recurring ? m.yes : m.no,
      ...resources,
    ]);
    added.getCell(2).numFmt = dateFormat;
    added.getCell(3).numFmt = dateFormat;
  }
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return workbook;
}
