import type { Point, Rect } from './geometry';
import { rectCenter } from './geometry';

/** One of the four sides of a rectangle. */
export type RectSide = 'left' | 'right' | 'top' | 'bottom';

const U_TURN_MARGIN = 20;
const ALIGN_TOLERANCE = 2;

/**
 * Chooses which sides of the source and target rectangles an edge should dock on, based on
 * the dominant axis between their centers: horizontal dominance pairs right/left, vertical
 * dominance pairs bottom/top.
 */
export function chooseDockSides(
  source: Rect,
  target: Rect,
): { readonly source: RectSide; readonly target: RectSide } {
  const sc = rectCenter(source);
  const tc = rectCenter(target);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { source: 'right', target: 'left' }
      : { source: 'left', target: 'right' };
  }
  return dy >= 0
    ? { source: 'bottom', target: 'top' }
    : { source: 'top', target: 'bottom' };
}

/** Returns the midpoint of the given rectangle side. */
export function dockPoint(rect: Rect, side: RectSide): Point {
  switch (side) {
    case 'left':
      return { x: rect.x, y: rect.y + rect.height / 2 };
    case 'right':
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    case 'top':
      return { x: rect.x + rect.width / 2, y: rect.y };
    case 'bottom':
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
  }
}

function round(p: Point): Point {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

/**
 * Routes a deterministic orthogonal polyline between two shapes without obstacle avoidance:
 * a straight 2-point line when the docks align within 2px, a 4-point Z through the middle
 * channel when the shapes face each other with a gap, and a 5-point U turn around the shapes
 * when the target lies behind the source. All waypoints are rounded to integers.
 */
export function routeOrthogonal(source: Rect, target: Rect): Point[] {
  const sides = chooseDockSides(source, target);
  if (sides.source === 'right' || sides.source === 'left') {
    return routeHorizontal(source, target, sides.source === 'right').map(round);
  }
  return routeVertical(source, target, sides.source === 'bottom').map(round);
}

function routeHorizontal(
  source: Rect,
  target: Rect,
  forward: boolean,
): Point[] {
  const d1 = dockPoint(source, forward ? 'right' : 'left');
  const facing = dockPoint(target, forward ? 'left' : 'right');
  const hasGap = forward
    ? source.x + source.width <= target.x
    : target.x + target.width <= source.x;
  if (hasGap) {
    if (Math.abs(d1.y - facing.y) <= ALIGN_TOLERANCE) {
      return [d1, { x: facing.x, y: d1.y }];
    }
    const mid = forward
      ? (source.x + source.width + target.x) / 2
      : (target.x + target.width + source.x) / 2;
    return [d1, { x: mid, y: d1.y }, { x: mid, y: facing.y }, facing];
  }
  // Target overlaps or lies behind the source: U turn out sideways, then over the top.
  const d2 = dockPoint(target, 'top');
  const outX = forward
    ? Math.max(source.x + source.width, target.x + target.width) + U_TURN_MARGIN
    : Math.min(source.x, target.x) - U_TURN_MARGIN;
  const topY = Math.min(source.y, target.y) - U_TURN_MARGIN;
  return [
    d1,
    { x: outX, y: d1.y },
    { x: outX, y: topY },
    { x: d2.x, y: topY },
    d2,
  ];
}

function routeVertical(source: Rect, target: Rect, forward: boolean): Point[] {
  const d1 = dockPoint(source, forward ? 'bottom' : 'top');
  const facing = dockPoint(target, forward ? 'top' : 'bottom');
  const hasGap = forward
    ? source.y + source.height <= target.y
    : target.y + target.height <= source.y;
  if (hasGap) {
    if (Math.abs(d1.x - facing.x) <= ALIGN_TOLERANCE) {
      return [d1, { x: d1.x, y: facing.y }];
    }
    const mid = forward
      ? (source.y + source.height + target.y) / 2
      : (target.y + target.height + source.y) / 2;
    return [d1, { x: d1.x, y: mid }, { x: facing.x, y: mid }, facing];
  }
  // Target overlaps or lies behind the source: U turn out vertically, then around the left.
  const d2 = dockPoint(target, 'left');
  const outY = forward
    ? Math.max(source.y + source.height, target.y + target.height) +
      U_TURN_MARGIN
    : Math.min(source.y, target.y) - U_TURN_MARGIN;
  const leftX = Math.min(source.x, target.x) - U_TURN_MARGIN;
  return [
    d1,
    { x: d1.x, y: outY },
    { x: leftX, y: outY },
    { x: leftX, y: d2.y },
    d2,
  ];
}

/** Returns the midpoint of the longest segment of the polyline, used to anchor edge labels. */
export function edgeLabelAnchor(waypoints: readonly Point[]): Point {
  if (waypoints.length === 0) {
    return { x: 0, y: 0 };
  }
  if (waypoints.length === 1) {
    return waypoints[0];
  }
  let bestIndex = 0;
  let bestLength = -1;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const length = Math.hypot(
      waypoints[i + 1].x - waypoints[i].x,
      waypoints[i + 1].y - waypoints[i].y,
    );
    if (length > bestLength) {
      bestLength = length;
      bestIndex = i;
    }
  }
  const a = waypoints[bestIndex];
  const b = waypoints[bestIndex + 1];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
