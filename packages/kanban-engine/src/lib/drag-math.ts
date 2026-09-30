/**
 * Pure drag geometry: pointer position → (swimlane, column, insertion index)
 * hit-testing over rects measured once at drag start, edge auto-scroll
 * velocity, and column-reorder index math. No allocation on the move path —
 * every function reads pre-measured arrays and returns numbers. Pure.
 */

/** A DOMRect look-alike so specs need no real layout. */
export interface RectLike {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * One droppable cell measured at drag start. `contentTop` is where card
 * index 0 renders (below the sticky header); `scrollTop` is re-read by the
 * caller after auto-scroll and passed to `insertionIndexAt`.
 */
export interface KanbanCellRect {
  readonly swimlane: string | null;
  readonly column: string;
  readonly rect: RectLike;
  readonly contentTop: number;
}

/**
 * Index of the cell under the pointer, or -1. Cells are ordered
 * lane-major/column-minor (board DOM order); the column scan uses binary
 * search over the sorted `rect.left` runs of the matching lane.
 */
export function hitTestCell(
  x: number,
  y: number,
  cells: readonly KanbanCellRect[],
): number {
  // find the lane band by y first (lanes are vertical runs of equal top)
  let laneStart = -1;
  let laneEnd = -1;
  for (let i = 0; i < cells.length; i++) {
    const rect = cells[i].rect;
    if (y >= rect.top && y <= rect.bottom) {
      if (laneStart < 0) laneStart = i;
      laneEnd = i;
    } else if (laneStart >= 0 && cells[i].rect.top > y) {
      break;
    }
  }
  if (laneStart < 0) return -1;
  // binary search on left edge within [laneStart, laneEnd]
  let lo = laneStart;
  let hi = laneEnd;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const rect = cells[mid].rect;
    if (x < rect.left) hi = mid - 1;
    else if (x > rect.right) lo = mid + 1;
    else return mid;
  }
  return -1;
}

/**
 * Insertion index for a pointer at `y` (viewport px) inside a cell of
 * `count` cards of fixed `cardHeight`, scrolled by `scrollTop`. The dragged
 * card's own slot is excluded when it comes from this cell
 * (`draggedIndex >= 0`), so the placeholder gap never counts itself —
 * virtualization-safe because the math never touches the DOM. Midpoint
 * semantics: above a card's center inserts before it, below inserts after.
 */
export function insertionIndexAt(
  y: number,
  cell: KanbanCellRect,
  scrollTop: number,
  cardHeight: number,
  count: number,
  draggedIndex: number,
): number {
  const contentY = y - cell.contentTop + scrollTop;
  const visibleCount = draggedIndex >= 0 ? count - 1 : count;
  const slot = Math.round(contentY / cardHeight);
  return Math.max(0, Math.min(visibleCount, slot));
}

/**
 * Signed auto-scroll velocity (px per frame) for a pointer at `pos` inside
 * `[min, max]`: 0 outside the `edge` bands, ramping quadratically to
 * ±`maxSpeed` at the boundary. Quadratic, so the ramp feels gentle until
 * the pointer is truly at the edge.
 */
export function edgeScrollVelocity(
  pos: number,
  min: number,
  max: number,
  edge = 48,
  maxSpeed = 24,
): number {
  if (max - min <= 2 * edge) return 0;
  if (pos < min + edge) {
    const t = Math.min(1, Math.max(0, (min + edge - pos) / edge));
    return -maxSpeed * t * t;
  }
  if (pos > max - edge) {
    const t = Math.min(1, Math.max(0, (pos - (max - edge)) / edge));
    return maxSpeed * t * t;
  }
  return 0;
}

/**
 * Target index for dropping a dragged column at pointer `x`, given the
 * columns' horizontal center points in display order. The dragged column's
 * own position (`fromIndex`) yields itself until the pointer crosses a
 * neighbour's center — the standard "swap on center-cross" feel.
 */
export function columnReorderIndex(
  x: number,
  centers: readonly number[],
  fromIndex: number,
): number {
  let target = fromIndex;
  for (let i = 0; i < centers.length; i++) {
    if (i === fromIndex) continue;
    if (i < fromIndex && x < centers[i]) {
      return i;
    }
    if (i > fromIndex && x > centers[i]) {
      target = i;
    }
  }
  return target;
}
