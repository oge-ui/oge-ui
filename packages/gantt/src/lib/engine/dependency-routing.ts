/**
 * Orthogonal dependency-arrow routing between bar endpoints (leader
 * convention: thin right-angle polylines with an arrowhead at the
 * successor). Pure geometry — inputs are pixel anchor points.
 */
import type { GanttDependencyType } from './gantt-model';

export interface GanttPoint {
  readonly x: number;
  readonly y: number;
}

/** Anchor sides a link type connects: predecessor exit / successor entry. */
export function dependencyAnchors(type: GanttDependencyType): {
  readonly fromEnd: boolean;
  readonly toEnd: boolean;
} {
  switch (type) {
    case 'FS':
      return { fromEnd: true, toEnd: false };
    case 'SS':
      return { fromEnd: false, toEnd: false };
    case 'FF':
      return { fromEnd: true, toEnd: true };
    case 'SF':
      return { fromEnd: false, toEnd: true };
  }
}

/**
 * Routes an orthogonal polyline from the predecessor anchor to the
 * successor anchor. `stub` is the horizontal clearance leaving/entering a
 * bar; the mid leg bends between the two rows.
 */
export function routeDependency(
  from: GanttPoint,
  to: GanttPoint,
  type: GanttDependencyType,
  stub = 12,
): GanttPoint[] {
  const { fromEnd, toEnd } = dependencyAnchors(type);
  const exitX = from.x + (fromEnd ? stub : -stub);
  const entryX = to.x + (toEnd ? stub : -stub);
  const points: GanttPoint[] = [from, { x: exitX, y: from.y }];
  if (
    (fromEnd && !toEnd && entryX > exitX) ||
    (!fromEnd && toEnd && entryX < exitX) ||
    (fromEnd && toEnd && to.x + stub >= exitX) ||
    (!fromEnd && !toEnd && to.x - stub <= exitX)
  ) {
    // direct Z: drop to the target row at the exit leg
    points.push({ x: exitX, y: to.y });
  } else {
    // S route: step halfway between the rows, then over to the entry leg
    const midY = from.y + (to.y > from.y ? 1 : -1) * Math.max(10, Math.abs(to.y - from.y) / 2);
    points.push({ x: exitX, y: midY });
    points.push({ x: entryX, y: midY });
  }
  points.push({ x: entryX, y: to.y });
  points.push(to);
  return points;
}

/** SVG path string of a routed polyline. */
export function dependencyPath(points: readonly GanttPoint[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(' ');
}
