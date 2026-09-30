import type { Point, Rect } from './geometry';
import { rectCenter } from './geometry';

/** Grid step in diagram units used for placement and movement snapping. */
export const BPMN_GRID_SIZE = 10;

/** Rounds a value to the nearest grid step. */
export function snapValue(value: number, grid = BPMN_GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

/** Rounds both coordinates of a point to the nearest grid step. */
export function snapPoint(point: Point, grid = BPMN_GRID_SIZE): Point {
  return { x: snapValue(point.x, grid), y: snapValue(point.y, grid) };
}

/** An alignment guide line; axis `x` is a vertical line at `position`, axis `y` a horizontal one. */
export interface BpmnSnapGuide {
  readonly axis: 'x' | 'y';
  readonly position: number;
}

/** Adjustment produced by neighbor snapping, applied on top of the current drag delta. */
export interface BpmnSnapResult {
  readonly dx: number;
  readonly dy: number;
  readonly guides: readonly BpmnSnapGuide[];
}

interface AxisMatch {
  readonly delta: number;
  readonly position: number;
}

function better(current: AxisMatch | null, candidate: AxisMatch): AxisMatch {
  return current === null || Math.abs(candidate.delta) < Math.abs(current.delta)
    ? candidate
    : current;
}

/**
 * Aligns the moving rectangle to nearby neighbor rectangles: centers, left/right edges on the
 * x axis and centers, top/bottom edges on the y axis. The nearest alignment within `threshold`
 * wins per axis; axes are independent. Returns the delta to add to the moving rectangle plus
 * the guide lines to render, or a zero result when nothing aligns.
 */
export function snapToNeighbors(
  moving: Rect,
  neighbors: readonly Rect[],
  threshold = 5,
): BpmnSnapResult {
  let bestX: AxisMatch | null = null;
  let bestY: AxisMatch | null = null;
  const movingCenter = rectCenter(moving);
  for (const neighbor of neighbors) {
    const neighborCenter = rectCenter(neighbor);
    const xCandidates: readonly (readonly [number, number])[] = [
      [neighborCenter.x, movingCenter.x],
      [neighbor.x, moving.x],
      [neighbor.x + neighbor.width, moving.x + moving.width],
    ];
    for (const [target, current] of xCandidates) {
      const delta = target - current;
      if (Math.abs(delta) <= threshold) {
        bestX = better(bestX, { delta, position: target });
      }
    }
    const yCandidates: readonly (readonly [number, number])[] = [
      [neighborCenter.y, movingCenter.y],
      [neighbor.y, moving.y],
      [neighbor.y + neighbor.height, moving.y + moving.height],
    ];
    for (const [target, current] of yCandidates) {
      const delta = target - current;
      if (Math.abs(delta) <= threshold) {
        bestY = better(bestY, { delta, position: target });
      }
    }
  }
  const guides: BpmnSnapGuide[] = [];
  if (bestX !== null) {
    guides.push({ axis: 'x', position: bestX.position });
  }
  if (bestY !== null) {
    guides.push({ axis: 'y', position: bestY.position });
  }
  return { dx: bestX?.delta ?? 0, dy: bestY?.delta ?? 0, guides };
}
