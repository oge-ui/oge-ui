/**
 * Largest-Triangle-Three-Buckets downsampling: reduces a series to
 * ~`target` points while preserving its visual shape (peaks and valleys
 * survive, unlike naive nth-point sampling). Gaps (null y) split the
 * input into runs that are downsampled independently. Pure — the chart
 * applies it automatically when a series carries more points than the
 * plot has pixels.
 */
import type { PathPoint } from './path-builder';

interface XY {
  readonly x: number;
  readonly y: number;
}

function lttbRun(points: readonly XY[], target: number): XY[] {
  const n = points.length;
  if (target >= n || target < 3) return [...points];
  const sampled: XY[] = [points[0]];
  const bucketSize = (n - 2) / (target - 2);
  let a = 0;
  for (let i = 0; i < target - 2; i++) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n);
    // average of the NEXT bucket
    let avgX = 0;
    let avgY = 0;
    for (let j = rangeStart; j < rangeEnd; j++) {
      avgX += points[j].x;
      avgY += points[j].y;
    }
    const count = Math.max(1, rangeEnd - rangeStart);
    avgX /= count;
    avgY /= count;
    // pick the point of THIS bucket forming the largest triangle
    const bucketStart = Math.floor(i * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, n - 1);
    const ax = points[a].x;
    const ay = points[a].y;
    let best = bucketStart;
    let bestArea = -1;
    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = Math.abs(
        (ax - avgX) * (points[j].y - ay) - (ax - points[j].x) * (avgY - ay),
      );
      if (area > bestArea) {
        bestArea = area;
        best = j;
      }
    }
    sampled.push(points[best]);
    a = best;
  }
  sampled.push(points[n - 1]);
  return sampled;
}

/**
 * Downsamples path points to ~`target`, preserving gaps: each non-gap
 * run shrinks proportionally (small runs stay intact).
 */
export function downsamplePath(
  points: readonly PathPoint[],
  target: number,
): PathPoint[] {
  const solidCount = points.reduce(
    (acc, point) => acc + (point.y === null ? 0 : 1),
    0,
  );
  if (solidCount <= target) return [...points];
  const result: PathPoint[] = [];
  let run: XY[] = [];
  const flush = (): void => {
    if (run.length === 0) return;
    const runTarget = Math.max(
      3,
      Math.round((run.length / solidCount) * target),
    );
    for (const point of lttbRun(run, runTarget)) result.push(point);
    run = [];
  };
  for (const point of points) {
    if (point.y === null) {
      flush();
      // keep one gap marker between runs
      if (result.length > 0 && result[result.length - 1].y !== null) {
        result.push(point);
      }
    } else {
      run.push({ x: point.x, y: point.y });
    }
  }
  flush();
  return result;
}
