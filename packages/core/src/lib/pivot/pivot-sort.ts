import { compareValues } from '../util/comparators';
import type { PivotFieldConfig, PivotPath } from './pivot-types';

/** Minimal trie shape the sorter needs (kept structural to avoid a cycle). */
interface SortableNode {
  readonly value: unknown;
  readonly path: PivotPath;
  readonly children: Map<unknown, SortableNode>;
  ordered: SortableNode[];
}

/**
 * Orders every level of an axis trie in place: by label (`sortOrder`) or,
 * when `sortBySummaryField` is set, by a measure value read at the opposite
 * axis' `sortBySummaryPath` (omitted → grand total).
 *
 * `aggregate(node, oppositeTarget, measureIndex)` is supplied by the engine.
 */
export function sortAxisChildren<Node extends SortableNode>(
  root: Node,
  fields: readonly PivotFieldConfig[],
  measures: readonly PivotFieldConfig[],
  aggregate: (node: Node, oppositeTarget: Node, measureIndex: number) => unknown,
  oppositeRoot?: Node
): void {
  const resolveTarget = (path: PivotPath | undefined): Node | undefined => {
    if (!oppositeRoot) return oppositeRoot;
    let node = oppositeRoot;
    for (const value of path ?? []) {
      const child = node.children.get(value ?? null) as Node | undefined;
      if (!child) return oppositeRoot;
      node = child;
    }
    return node;
  };

  const visit = (node: Node, level: number): void => {
    const field = fields[level];
    if (!field || node.ordered.length === 0) return;
    const direction = field.sortOrder === 'desc' ? -1 : 1;
    const summaryIndex = field.sortBySummaryField
      ? measures.findIndex(
          (measure) =>
            measure.id === field.sortBySummaryField ||
            measure.dataField === field.sortBySummaryField
        )
      : -1;

    if (summaryIndex >= 0) {
      const target = resolveTarget(field.sortBySummaryPath);
      const keyed = node.ordered.map((child) => ({
        child,
        key: target ? aggregate(child as Node, target, summaryIndex) : null,
      }));
      // nodes without a value at the target stay at the end in either direction
      keyed.sort((a, b) => {
        const aNull = a.key == null;
        const bNull = b.key == null;
        if (aNull || bNull) return aNull === bNull ? 0 : aNull ? 1 : -1;
        return compareValues(a.key, b.key) * direction;
      });
      node.ordered = keyed.map((entry) => entry.child);
    } else {
      node.ordered = [...node.ordered].sort(
        (a, b) => compareValues(a.value, b.value) * direction
      );
    }
    for (const child of node.ordered) visit(child as Node, level + 1);
  };

  visit(root, 0);
}
