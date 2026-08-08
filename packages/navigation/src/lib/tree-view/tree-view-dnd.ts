import type { OgeTreeDropPosition } from './tree-view-types';

/** Pixels of movement before a pointerdown becomes a drag. */
export const TREE_DRAG_THRESHOLD = 4;

/** Milliseconds a drag must hover a collapsed parent before it auto-expands. */
export const TREE_DRAG_HOVER_EXPAND_MS = 700;

/**
 * Fraction of a row's height at each edge that means "drop between rows"
 * rather than "drop into this node". With `allowDropInside` off the whole row
 * splits in half instead.
 */
const EDGE_FRACTION = 0.25;

/**
 * Resolves which of the three drop zones a pointer sits in, given the target
 * row's bounding box.
 *
 * With `allowDropInside`, the top and bottom quarters mean `before` / `after`
 * and the middle half means `inside`. Without it the row splits at the
 * midpoint into `before` / `after` only. A node that cannot accept children
 * (a leaf, when `insideRequiresChildren` is set) never yields `inside`.
 */
export function resolveDropPosition(
  clientY: number,
  rect: { top: number; height: number },
  allowInside: boolean,
): OgeTreeDropPosition {
  const offset = clientY - rect.top;
  if (!allowInside) {
    return offset < rect.height / 2 ? 'before' : 'after';
  }
  if (offset < rect.height * EDGE_FRACTION) return 'before';
  if (offset > rect.height * (1 - EDGE_FRACTION)) return 'after';
  return 'inside';
}

/** Whether two pointer positions are far enough apart to start a drag. */
export function exceedsDragThreshold(
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  return (
    Math.abs(to.x - from.x) > TREE_DRAG_THRESHOLD ||
    Math.abs(to.y - from.y) > TREE_DRAG_THRESHOLD
  );
}
