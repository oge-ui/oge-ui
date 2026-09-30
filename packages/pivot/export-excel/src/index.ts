import {
  buildPivotWorkbook,
  downloadPivotWorkbook,
  type OgePivotExcelExportOptions,
} from '@oge-ui/pivot-engine/export-excel';
import type { OgePivotGrid } from '@oge-ui/pivot';

// The workbook builder is the framework-free one both render layers share
// (ADR 0003); re-exported so this entry point's public API is unchanged.
export {
  buildPivotWorkbook,
  type OgePivotExcelExportOptions,
} from '@oge-ui/pivot-engine/export-excel';

/** Exports the pivot's current view as an `.xlsx` download. */
export async function exportPivotToExcel<T extends object>(
  grid: OgePivotGrid<T>,
  options: OgePivotExcelExportOptions = {},
): Promise<void> {
  const workbook = buildPivotWorkbook(grid.getResult(), options);
  await downloadPivotWorkbook(workbook, options.filename ?? 'pivot.xlsx');
}
