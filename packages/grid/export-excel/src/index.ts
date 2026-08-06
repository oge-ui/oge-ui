import { Workbook } from 'exceljs';
import type {
  OgeExportColumn,
  OgeExportData,
  OgeExportOptions,
  OgeGrid,
} from '@oge-ui/grid';

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
 * Builds an exceljs Workbook from export data — pure and testable; use
 * {@link exportGridToExcel} for the one-call grid → download flow.
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

/**
 * Exports the grid's current view (filter + search + sort applied, no paging)
 * as an `.xlsx` download.
 *
 * ```ts
 * import { exportGridToExcel } from '@oge-ui/grid/export-excel';
 * await exportGridToExcel(this.grid(), { filename: 'orders.xlsx' });
 * ```
 */
export async function exportGridToExcel<T extends object>(
  grid: OgeGrid<T>,
  options: OgeExcelExportOptions<T> = {},
): Promise<void> {
  const workbook = buildExcelWorkbook(
    await grid.getExportData({ scope: options.scope }),
    options,
  );
  if (typeof document === 'undefined') return;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename ?? 'grid.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}
