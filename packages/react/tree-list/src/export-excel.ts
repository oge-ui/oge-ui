import {
  buildTreeExcelWorkbook,
  type OgeTreeExcelExportOptions,
} from '@oge-ui/behavior/export-excel';
import type { OgeTreeListHandle } from './lib/tree-list-types';

// The outlined workbook builder is the framework-free one both render layers
// share; re-exported so this entry point stands on its own.
export {
  buildTreeExcelWorkbook,
  type OgeTreeExcelExportOptions,
} from '@oge-ui/behavior/export-excel';

/**
 * Exports the tree list's current view (expansion + filter applied) as an
 * `.xlsx` download whose Excel row outlining mirrors the hierarchy — the
 * React face of `@oge-ui/tree-list/export-excel`.
 *
 * Takes the tree list's imperative handle rather than a component instance,
 * which is React's equivalent of the Angular signature:
 *
 * ```tsx
 * const tree = useRef<OgeTreeListHandle<Task>>(null);
 * // …
 * const { exportOgeTreeListToExcel } = await import(
 *   '@oge-ui/react-tree-list/export-excel'
 * );
 * await exportOgeTreeListToExcel(tree.current!, { filename: 'tasks.xlsx' });
 * ```
 *
 * `exceljs` is an optional peer: this entry point is the only thing that
 * imports it, so an app that never exports never installs it.
 */
export async function exportOgeTreeListToExcel<T extends object>(
  treeList: OgeTreeListHandle<T>,
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
