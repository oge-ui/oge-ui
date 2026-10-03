import type { OgeTreeList } from '@oge-ui/tree-list';
import {
  buildTreeExcelWorkbook,
  type OgeTreeExcelExportOptions,
} from '@oge-ui/behavior/export-excel';

// The outlined workbook builder is non-trivial and framework-free, so it lives
// in `@oge-ui/behavior` and both render layers call the same one. Re-exported
// here so this entry point's public API is unchanged.
export {
  buildTreeExcelWorkbook,
  type OgeTreeExcelExportOptions,
} from '@oge-ui/behavior/export-excel';

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
  options: OgeTreeExcelExportOptions<T> = {},
): Promise<void> {
  const workbook = buildTreeExcelWorkbook(
    treeList.getExportData(options),
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
  anchor.download = options.filename ?? 'tree-list.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}
