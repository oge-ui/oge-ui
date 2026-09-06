import type { OgeGrid } from '@oge-ui/grid';

// The workbook builder is non-trivial and framework-free, so it lives in
// `@oge-ui/behavior` and both render layers call the same one. Re-exported
// here so this entry point's public API is unchanged.
export {
  buildExcelWorkbook,
  type OgeExcelExportOptions,
} from '@oge-ui/behavior/export-excel';
import { buildExcelWorkbook } from '@oge-ui/behavior/export-excel';
import type { OgeExcelExportOptions } from '@oge-ui/behavior/export-excel';

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
