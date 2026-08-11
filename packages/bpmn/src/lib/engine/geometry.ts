/** A point in diagram coordinates. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** An axis-aligned rectangle in diagram coordinates. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Returns the center point of a rectangle. */
export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Returns a copy of the rectangle moved by the given delta. */
export function translateRect(rect: Rect, dx: number, dy: number): Rect {
  return {
    x: rect.x + dx,
    y: rect.y + dy,
    width: rect.width,
    height: rect.height,
  };
}

/** Returns the rectangle grown by `amount` on every side (negative amounts shrink it). */
export function inflateRect(rect: Rect, amount: number): Rect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + 2 * amount,
    height: rect.height + 2 * amount,
  };
}

/** True when the point lies inside the rectangle, borders inclusive. */
export function rectContainsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** True when the two rectangles overlap or touch. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width &&
    b.x <= a.x + a.width &&
    a.y <= b.y + b.height &&
    b.y <= a.y + a.height
  );
}

/** Returns the smallest rectangle enclosing all given rectangles, or null for an empty list. */
export function boundsOfRects(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Returns the point on the rectangle's border (perimeter) nearest to the given
 * point: points outside are clamped onto the border, points inside are pushed
 * out to the closest side. Used to slide boundary events along their host.
 */
export function nearestPointOnRectPerimeter(rect: Rect, point: Point): Point {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const cx = Math.max(left, Math.min(right, point.x));
  const cy = Math.max(top, Math.min(bottom, point.y));
  if (cx !== point.x || cy !== point.y) {
    return { x: cx, y: cy }; // outside: clamped point already lies on the border
  }
  const toLeft = point.x - left;
  const toRight = right - point.x;
  const toTop = point.y - top;
  const toBottom = bottom - point.y;
  const min = Math.min(toLeft, toRight, toTop, toBottom);
  if (min === toLeft) {
    return { x: left, y: point.y };
  }
  if (min === toRight) {
    return { x: right, y: point.y };
  }
  if (min === toTop) {
    return { x: point.x, y: top };
  }
  return { x: point.x, y: bottom };
}

/** Returns the shortest distance from a point to the line segment `a`–`b`. */
export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  let t = 0;
  if (lengthSq > 0) {
    t = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq;
    t = Math.max(0, Math.min(1, t));
  }
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return Math.hypot(point.x - cx, point.y - cy);
}

/** True when the point lies within `tolerance` of any segment of the waypoint polyline. */
export function edgeHitTest(
  waypoints: readonly Point[],
  point: Point,
  tolerance: number,
): boolean {
  for (let i = 0; i < waypoints.length - 1; i++) {
    if (distanceToSegment(point, waypoints[i], waypoints[i + 1]) <= tolerance) {
      return true;
    }
  }
  return false;
}
