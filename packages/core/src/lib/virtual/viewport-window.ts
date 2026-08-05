import type { OffsetTree } from './offset-tree';

export interface ViewportWindow {
  /** First rendered row index (inclusive). */
  readonly start: number;
  /** Last rendered row index (exclusive). */
  readonly end: number;
  /** translateY for the rendered block. */
  readonly offsetY: number;
  /** Total scrollable height (spacer). */
  readonly totalHeight: number;
}

/** Pure window computation for the virtualizer. */
export function computeWindow(
  scrollTop: number,
  viewportHeight: number,
  tree: OffsetTree,
  overscan = 4
): ViewportWindow {
  const totalHeight = tree.totalHeight;
  if (tree.length === 0 || viewportHeight <= 0) {
    return { start: 0, end: 0, offsetY: 0, totalHeight };
  }
  const clampedTop = Math.min(Math.max(0, scrollTop), Math.max(0, totalHeight - viewportHeight));
  const firstVisible = tree.indexAt(clampedTop);
  const lastVisible = tree.indexAt(clampedTop + viewportHeight);
  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(tree.length, lastVisible + 1 + overscan);
  return { start, end, offsetY: tree.offsetOf(start), totalHeight };
}
