import {
  buildTreePdfDocument,
  type OgeTreePdfExportOptions,
} from '@oge-ui/behavior/export-pdf';
import type { OgeTreeListHandle } from './lib/tree-list-types';

// The document builder is the framework-free one both render layers share;
// re-exported so this entry point stands on its own.
export {
  buildTreePdfDocument,
  type OgePdfPageInfo,
  type OgeTreePdfExportOptions,
} from '@oge-ui/behavior/export-pdf';

/**
 * Exports the tree list's current view (expansion + filter applied) as a
 * `.pdf` download — the React face of `@oge-ui/tree-list/export-pdf`,
 * taking the tree list's imperative handle:
 *
 * ```tsx
 * const tree = useRef<OgeTreeListHandle<Task>>(null);
 * // …
 * const { exportOgeTreeListToPdf } = await import(
 *   '@oge-ui/react-tree-list/export-pdf'
 * );
 * await exportOgeTreeListToPdf(tree.current!, { title: 'Tasks', pageNumbers: true });
 * ```
 *
 * `jspdf` and `jspdf-autotable` are optional peers, imported only here.
 */
export async function exportOgeTreeListToPdf<T extends object>(
  treeList: OgeTreeListHandle<T>,
  options: OgeTreePdfExportOptions<T> = {},
): Promise<void> {
  const doc = buildTreePdfDocument(treeList.getExportData(options), options);
  if (typeof document === 'undefined') return;
  doc.save(options.filename ?? 'tree-list.pdf');
}
