import { Workbook } from 'exceljs';
import type { OgeExportColumn } from '@oge-ui/grid';
import type { OgeTreeExportData, OgeTreeList } from '@oge-ui/tree-list';

export interface OgeTreeExcelExportOptions {
  /** Download file name. Default: `tree-list.xlsx`. */
  filename?: string;
  /** Worksheet name. Default: `Data`. */
  sheetName?: string;
}

/** Cell value per data type: numbers/dates stay typed, lookups/booleans use their display text. */
function cellValue<T>(column: OgeExportColumn<T>, row: T): unknown {
  const raw = column.accessor(row);
  if (raw == null) return '';
  if (column.dataType === 'number' && typeof raw === 'number') return raw;
  if (column.dataType === 'date') {
    const date = raw instanceof Date ? raw : new Date(String(raw));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return column.format ? column.format(raw) : raw;
}

/**
 * Builds an exceljs Workbook from tree export data — pure and testable; use
 * {@link exportOgeTreeListToExcel} for the one-call tree-list → download flow.
 *
 * Each data row's `outlineLevel` is set to its tree depth so Excel's native
 * row outlining (collapse/expand groups) mirrors the on-screen hierarchy —
 * no whitespace indentation in the first column.
 */
export function buildTreeExcelWorkbook<T>(
  data: OgeTreeExportData<T>,
  options: OgeTreeExcelExportOptions = {},
): Workbook {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? 'Data');
  sheet.columns = data.columns.map((column) => ({
    header: column.caption,
    key: column.field ?? column.caption,
    width: Math.max(column.caption.length + 4, 12),
  }));
  sheet.getRow(1).font = { bold: true };
  data.rows.forEach((row, index) => {
    const excelRow = sheet.addRow(
      data.columns.map((column) => cellValue(column, row)),
    );
    excelRow.outlineLevel = data.levels[index] ?? 0;
  });
  return workbook;
}

/**
 * Exports the tree-list's current view (expansion + filter applied) as an
 * `.xlsx` download with Excel row outlining that mirrors the hierarchy.
 *
 * ```ts
 * import { exportOgeTreeListToExcel } from '@oge-ui/tree-list/export-excel';
 * await exportOgeTreeListToExcel(this.treeList(), { filename: 'orgs.xlsx' });
 * ```
 */
export async function exportOgeTreeListToExcel<T extends object>(
  treeList: OgeTreeList<T>,
  options: OgeTreeExcelExportOptions = {},
): Promise<void> {
  const workbook = buildTreeExcelWorkbook(treeList.getExportData(), options);
  if (typeof document === 'undefined') return;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename ?? 'tree-list.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}
