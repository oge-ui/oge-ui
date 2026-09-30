/**
 * The pure `.xlsx` builder, shared by both render layers.
 *
 * It lives here rather than in `@oge-ui/grid/export-excel` because it is
 * non-trivial and framework-free — the workspace's rule for what gets
 * extracted instead of copied. The Angular and React grid packages keep only
 * the three lines that turn a grid instance into a download, and both re-export
 * this builder so their public API is unchanged.
 *
 * `exceljs` is an **optional peer**: nothing pulls this entry point in unless a
 * consumer imports it, so an app that never exports an Excel file never
 * installs the dependency.
 */
import { Workbook } from 'exceljs';
import type {
  OgeExportColumn,
  OgeExportData,
  OgeExportOptions,
} from './lib/grid/grid-options';
import type { OgeTreeExportData } from './lib/tree-list/tree-list-core';

export interface OgeExcelExportOptions<
  T = unknown,
> extends OgeExportOptions<T> {
  /** Download file name. Default: `grid.xlsx`. */
  filename?: string;
  /** Worksheet name. Default: `Data`. */
  sheetName?: string;
  /** Adds an Excel auto-filter over the header row. Default: true. */
  autoFilter?: boolean;
}

/** Cell value per data type: numbers/dates stay typed, lookups/booleans use their display text. */
function cellValue<T>(
  column: OgeExportColumn<T>,
  row: T,
  customize: OgeExportOptions<T>['customizeCell'],
): unknown {
  const raw = column.accessor(row);
  if (customize) {
    const text =
      raw == null ? '' : column.format ? column.format(raw) : String(raw);
    const out = customize({
      row,
      field: column.field,
      caption: column.caption,
      value: raw,
      text,
    });
    if (out !== undefined) return out;
  }
  if (raw == null) return '';
  if (column.dataType === 'number' && typeof raw === 'number') return raw;
  if (column.dataType === 'date') {
    const date = raw instanceof Date ? raw : new Date(String(raw));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return column.format ? column.format(raw) : raw;
}

/**
 * Builds an exceljs Workbook from export data — pure and testable. The
 * one-call grid → download flow is `exportGridToExcel` in
 * `@oge-ui/grid/export-excel` (Angular) or `@oge-ui/react-grid/export-excel`.
 */
export function buildExcelWorkbook<T>(
  data: OgeExportData<T>,
  options: OgeExcelExportOptions<T> = {},
): Workbook {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? 'Data');
  sheet.columns = data.columns.map((column) => ({
    header: column.caption,
    key: column.field ?? column.caption,
    width: Math.max(column.caption.length + 4, 12),
  }));
  sheet.getRow(1).font = { bold: true };
  for (const row of data.rows) {
    sheet.addRow(
      data.columns.map((column) =>
        cellValue(column, row, options.customizeCell),
      ),
    );
  }
  if (options.autoFilter !== false && data.columns.length) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: data.columns.length },
    };
  }
  return workbook;
}

// --- tree list ----------------------------------------------------------------

/** Options of {@link buildTreeExcelWorkbook} and the tree-list download helpers. */
export interface OgeTreeExcelExportOptions {
  /** Download file name. Default: `tree-list.xlsx`. */
  filename?: string;
  /** Worksheet name. Default: `Data`. */
  sheetName?: string;
}

/**
 * Builds an exceljs Workbook from tree export data — pure and testable; the
 * one-call tree list → download flow is `exportOgeTreeListToExcel` in
 * `@oge-ui/tree-list/export-excel` (Angular) or
 * `@oge-ui/react-tree-list/export-excel`.
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
      data.columns.map((column) => cellValue(column, row, undefined)),
    );
    excelRow.outlineLevel = data.levels[index] ?? 0;
  });
  return workbook;
}
