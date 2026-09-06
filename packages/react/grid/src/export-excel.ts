import { buildExcelWorkbook } from '@oge-ui/behavior/export-excel';
import type { OgeExcelExportOptions } from '@oge-ui/behavior/export-excel';
import type { OgeGridHandle } from './lib/grid-types';

// The workbook builder is the framework-free one both render layers share;
// re-exported so this entry point stands on its own.
export {
  buildExcelWorkbook,
  type OgeExcelExportOptions,
} from '@oge-ui/behavior/export-excel';

/**
 * Exports the grid's current view (filter + search + sort applied, no paging)
 * as an `.xlsx` download — the React face of `@oge-ui/grid/export-excel`.
 *
 * Takes the grid's imperative handle rather than a component instance, which
 * is React's equivalent of the Angular signature:
 *
 * ```tsx
 * const grid = useRef<OgeGridHandle<Order>>(null);
 * // …
 * const { exportGridToExcel } = await import('@oge-ui/react-grid/export-excel');
 * await exportGridToExcel(grid.current!, { filename: 'orders.xlsx' });
 * ```
 *
 * `exceljs` is an optional peer: this entry point is the only thing that
 * imports it, so an app that never exports never installs it.
 */
export async function exportGridToExcel<T extends object>(
  grid: OgeGridHandle<T>,
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
