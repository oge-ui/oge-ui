import type { PivotAxisNode } from '@oge-ui/core';

/** The chart types the chart-integration demos switch between. */
export type PivotChartType = 'bar' | 'stackedBar' | 'line';

/**
 * The matrix line index of the row a pivot cell click landed on, or
 * `undefined` for the grand total (the demos then chart every row). Shared
 * by the Angular page and its React mirror.
 */
export function pivotRowIndexOf(
  roots: readonly PivotAxisNode[],
  rowPath: readonly unknown[],
): number | undefined {
  const key = JSON.stringify(rowPath);
  const visit = (
    nodes: readonly PivotAxisNode[],
  ): PivotAxisNode | undefined => {
    for (const node of nodes) {
      if (JSON.stringify(node.path) === key && !node.isGrandTotal) return node;
      const hit = visit(node.children);
      if (hit) return hit;
    }
    return undefined;
  };
  const node = visit(roots);
  return node && node.leafIndex >= 0 ? node.leafIndex : undefined;
}
