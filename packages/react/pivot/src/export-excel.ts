import {
  buildPivotWorkbook,
  downloadPivotWorkbook,
  type OgePivotExcelExportOptions,
} from '@oge-ui/pivot-engine/export-excel';
import type { OgePivotGridHandle } from './lib/pivot-types';

// The workbook builder is the framework-free one both render layers share
// (ADR 0003); re-exported so this entry point stands on its own.
export {
  buildPivotWorkbook,
  type OgePivotExcelExportOptions,
} from '@oge-ui/pivot-engine/export-excel';

/**
 * Exports the pivot's current view as an `.xlsx` download — the React face of
 * `@oge-ui/pivot/export-excel`, taking the grid's imperative handle:
 *
 * ```tsx
 * const pivot = useRef<OgePivotGridHandle<Sale>>(null);
 * // …
 * const { exportPivotToExcel } = await import('@oge-ui/react-pivot/export-excel');
 * await exportPivotToExcel(pivot.current!, { filename: 'sales.xlsx' });
 * ```
 *
 * `exceljs` is an optional peer: this entry point is the only thing that
 * imports it, so an app that never exports never installs it.
 */
export async function exportPivotToExcel<T>(
  grid: OgePivotGridHandle<T>,
  options: OgePivotExcelExportOptions = {},
): Promise<void> {
  const workbook = buildPivotWorkbook(grid.getResult(), options);
  await downloadPivotWorkbook(workbook, options.filename ?? 'pivot.xlsx');
}
