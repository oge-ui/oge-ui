/**
 * SVG path builders — one `<path>` per series regardless of point count
 * (the performance contract). Gaps (null y) split subpaths; splines are
 * Catmull-Rom converted to cubic Beziers. Pure, deterministic output.
 */

export interface PathPoint {
  readonly x: number;
  /** null = gap. */
  readonly y: number | null;
}

const fmt = (value: number): string =>
  String(Math.round(value * 100) / 100);

/** Polyline path with gap handling. */
export function linePath(points: readonly PathPoint[]): string {
  let d = '';
  let penDown = false;
  for (const point of points) {
    if (point.y === null) {
      penDown = false;
      continue;
    }
    d += `${penDown ? ' L' : `${d === '' ? '' : ' '}M`} ${fmt(point.x)} ${fmt(point.y)}`;
    penDown = true;
  }
  return d;
}

/** Consecutive non-gap runs of at least one point. */
function runs(points: readonly PathPoint[]): { x: number; y: number }[][] {
  const result: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (const point of points) {
    if (point.y === null) {
      if (current.length > 0) result.push(current);
      current = [];
    } else {
      current.push({ x: point.x, y: point.y });
    }
  }
  if (current.length > 0) result.push(current);
  return result;
}

/** Catmull-Rom → cubic Bezier spline with gap handling. */
export function splinePath(points: readonly PathPoint[]): string {
  const parts: string[] = [];
  for (const run of runs(points)) {
    if (run.length === 1) {
      parts.push(`M ${fmt(run[0].x)} ${fmt(run[0].y)}`);
      continue;
    }
    let d = `M ${fmt(run[0].x)} ${fmt(run[0].y)}`;
    for (let i = 0; i < run.length - 1; i++) {
      const p0 = run[Math.max(0, i - 1)];
      const p1 = run[i];
      const p2 = run[i + 1];
      const p3 = run[Math.min(run.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
    }
    parts.push(d);
  }
  return parts.join(' ');
}

/**
 * Closed area between a top line and a bottom line (same x sequence,
 * reversed on the way back). `spline` smooths both edges. Gap points must
 * be gaps in BOTH lines (the caller aligns them).
 */
export function areaPath(
  top: readonly PathPoint[],
  bottom: readonly PathPoint[],
  spline = false,
): string {
  const topRuns = runs(top);
  const bottomRuns = runs(bottom);
  const parts: string[] = [];
  const count = Math.min(topRuns.length, bottomRuns.length);
  for (let i = 0; i < count; i++) {
    const t = topRuns[i];
    const b = [...bottomRuns[i]].reverse();
    const edge = (pts: { x: number; y: number }[]): string => {
      const asPathPoints = pts.map((p) => ({ x: p.x, y: p.y as number | null }));
      const path = spline ? splinePath(asPathPoints) : linePath(asPathPoints);
      return path;
    };
    const topEdge = edge(t);
    const bottomEdge = edge(b).replace(/^M /, 'L ');
    parts.push(`${topEdge} ${bottomEdge} Z`);
  }
  return parts.join(' ');
}

/** Horizontal-baseline area (classic `area` series). */
export function baselineAreaPath(
  top: readonly PathPoint[],
  baselineY: number,
  spline = false,
): string {
  const bottom = top.map((point) => ({
    x: point.x,
    y: point.y === null ? null : baselineY,
  }));
  return areaPath(top, bottom, spline);
}
