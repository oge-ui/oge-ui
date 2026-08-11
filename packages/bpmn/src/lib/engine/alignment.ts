import type { Point, Rect } from './geometry';

/**
 * Alignment edge/axis of {@link alignElements}: `left`/`right`/`top`/`bottom`
 * align the matching edges, `centerX`/`centerY` align the centers on the
 * horizontal / vertical axis of the selection's bounding box.
 */
export type BpmnAlignMode =
  'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';

/** Distribution axis of {@link distributeElements}: `x` spreads horizontally. */
export type BpmnDistributeAxis = 'x' | 'y';

const ZERO: Point = { x: 0, y: 0 };

/**
 * Computes the per-element move deltas that align the given rectangles:
 * `left` moves every element to the leftmost left edge, `right` to the
 * rightmost right edge, `top`/`bottom` analogously, and `centerX`/`centerY`
 * to the center of the joint bounding box (bpmn-js align-elements semantics).
 * Every input id appears in the result (zero delta when already aligned);
 * fewer than 2 rectangles produce an empty result. Pure — no model involved.
 */
export function alignElements(
  rects: Readonly<Record<string, Rect>>,
  mode: BpmnAlignMode,
): Record<string, Point> {
  const entries = Object.entries(rects);
  if (entries.length < 2) {
    return {};
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [, r] of entries) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  const deltas: Record<string, Point> = {};
  for (const [id, r] of entries) {
    switch (mode) {
      case 'left':
        deltas[id] = { x: minX - r.x, y: 0 };
        break;
      case 'right':
        deltas[id] = { x: maxX - (r.x + r.width), y: 0 };
        break;
      case 'centerX':
        deltas[id] = { x: (minX + maxX) / 2 - (r.x + r.width / 2), y: 0 };
        break;
      case 'top':
        deltas[id] = { x: 0, y: minY - r.y };
        break;
      case 'bottom':
        deltas[id] = { x: 0, y: maxY - (r.y + r.height) };
        break;
      case 'centerY':
        deltas[id] = { x: 0, y: (minY + maxY) / 2 - (r.y + r.height / 2) };
        break;
    }
    deltas[id] = {
      x: Math.round(deltas[id].x),
      y: Math.round(deltas[id].y),
    };
  }
  return deltas;
}

/**
 * Computes the per-element move deltas that distribute the rectangles evenly
 * along one axis: sorted by center, the outermost two stay fixed and the
 * centers in between are spaced at equal gaps. Fewer than 3 rectangles
 * produce an empty result. Pure — no model involved.
 */
export function distributeElements(
  rects: Readonly<Record<string, Rect>>,
  axis: BpmnDistributeAxis,
): Record<string, Point> {
  const entries = Object.entries(rects);
  if (entries.length < 3) {
    return {};
  }
  const center = (r: Rect): number =>
    axis === 'x' ? r.x + r.width / 2 : r.y + r.height / 2;
  const sorted = [...entries].sort(([, a], [, b]) => center(a) - center(b));
  const first = center(sorted[0][1]);
  const last = center(sorted[sorted.length - 1][1]);
  const step = (last - first) / (sorted.length - 1);
  const deltas: Record<string, Point> = {};
  sorted.forEach(([id, r], index) => {
    const target = first + index * step;
    const d = Math.round(target - center(r));
    deltas[id] = axis === 'x' ? { x: d, y: ZERO.y } : { x: ZERO.x, y: d };
  });
  return deltas;
}
