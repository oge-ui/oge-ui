import type { OgeTreeList } from '@oge-ui/tree-list';
import {
  buildTreePdfDocument,
  type OgeTreePdfExportOptions,
} from '@oge-ui/behavior/export-pdf';

// The document builder is non-trivial and framework-free, so it lives in
// `@oge-ui/behavior` and both render layers call the same one. Re-exported
// here so this entry point stands on its own.
export {
  buildTreePdfDocument,
  type OgePdfPageInfo,
  type OgeTreePdfExportOptions,
} from '@oge-ui/behavior/export-pdf';

/**
 * Exports the tree list's current view (expansion + filter applied) as a
 * `.pdf` download: the hierarchy as first-column indentation, the header
 * repeated on every page, total and per-parent summaries, page header /
 * footer callbacks.
 *
 * ```ts
 * const { exportOgeTreeListToPdf } = await import('@oge-ui/tree-list/export-pdf');
 * await exportOgeTreeListToPdf(this.treeList(), { title: 'Tasks', pageNumbers: true });
 * ```
 *
 * `jspdf` and `jspdf-autotable` are optional peers, imported only here.
 */
export async function exportOgeTreeListToPdf<T extends object>(
  treeList: OgeTreeList<T>,
  options: OgeTreePdfExportOptions<T> = {},
): Promise<void> {
  const doc = buildTreePdfDocument(treeList.getExportData(options), options);
  if (typeof document === 'undefined') return;
  doc.save(options.filename ?? 'tree-list.pdf');
}
