/**
 * Polar/radar geometry: angle slotting around the circle, polar →
 * cartesian mapping (0 rad = 12 o'clock, clockwise — the pie convention),
 * circular/spider grid rings and closed radar loops with gap handling.
 * Pure.
 */

export interface PolarXY {
  readonly x: number;
  readonly y: number;
}

/** Polar → cartesian; 0 rad points up, angles grow clockwise. */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): PolarXY {
  return { x: cx + radius * Math.sin(angle), y: cy - radius * Math.cos(angle) };
}

/** The angle of argument slot `index` among `count` slots. */
export function angleForIndex(
  index: number,
  count: number,
  startAngle = 0,
): number {
  return startAngle + (Math.PI * 2 * index) / Math.max(1, count);
}

const fmt = (value: number): string => String(Math.round(value * 100) / 100);

/**
 * One grid ring at `radius`: a circle, or — in spider mode — the polygon
 * through the `count` argument vertices.
 */
export function radarGridPath(
  cx: number,
  cy: number,
  radius: number,
  count: number,
  spider: boolean,
  startAngle = 0,
): string {
  if (!spider || count < 3) {
    return `M ${fmt(cx - radius)} ${fmt(cy)} A ${fmt(radius)} ${fmt(radius)} 0 1 0 ${fmt(cx + radius)} ${fmt(cy)} A ${fmt(radius)} ${fmt(radius)} 0 1 0 ${fmt(cx - radius)} ${fmt(cy)} Z`;
  }
  let d = '';
  for (let i = 0; i < count; i++) {
    const point = polarToCartesian(
      cx,
      cy,
      radius,
      angleForIndex(i, count, startAngle),
    );
    d += `${i === 0 ? 'M' : ' L'} ${fmt(point.x)} ${fmt(point.y)}`;
  }
  return `${d} Z`;
}

/**
 * A radar polyline through polar points (null = gap breaks the run);
 * `close` joins the last run back to its first point when no gap exists.
 */
export function radarLoopPath(
  points: readonly (PolarXY | null)[],
  close: boolean,
): string {
  const runs: PolarXY[][] = [];
  let current: PolarXY[] = [];
  let hasGap = false;
  for (const point of points) {
    if (point === null) {
      hasGap = true;
      if (current.length > 0) runs.push(current);
      current = [];
    } else {
      current.push(point);
    }
  }
  if (current.length > 0) runs.push(current);
  return runs
    .map((run) => {
      const d = run
        .map(
          (point, index) =>
            `${index === 0 ? 'M' : ' L'} ${fmt(point.x)} ${fmt(point.y)}`,
        )
        .join('');
      return close && !hasGap && run.length > 2 ? `${d} Z` : d;
    })
    .join(' ');
}
