/**
 * Zoom & pan math over the argument-axis visual range: cursor-centered
 * wheel zoom (the domain value under the cursor stays put), pan deltas
 * and drag-selection windows — all clamped into the data bounds. Pure.
 */
import { clampRange, type ChartRange, type ChartScale } from './scale';

/**
 * Cursor-centered zoom: `focusFrac` (0..1 across the range) keeps its
 * domain value fixed while the span multiplies by `factor` (<1 zooms in).
 */
export function zoomRangeAt(
  range: ChartRange,
  focusFrac: number,
  factor: number,
  bounds: ChartRange,
  minSpanFrac = 0.01,
): ChartRange {
  const span = range.max - range.min;
  const focusValue = range.min + span * focusFrac;
  const newSpan = span * factor;
  const next = {
    min: focusValue - newSpan * focusFrac,
    max: focusValue + newSpan * (1 - focusFrac),
  };
  return clampRange(next, bounds, (bounds.max - bounds.min) * minSpanFrac);
}

/** Pan by a fraction of the current span (positive = later/right). */
export function panRange(
  range: ChartRange,
  deltaFrac: number,
  bounds: ChartRange,
): ChartRange {
  const span = range.max - range.min;
  return clampRange(
    { min: range.min + span * deltaFrac, max: range.max + span * deltaFrac },
    bounds,
  );
}

/** Drag-selection `[pxA, pxB]` → domain window (order-insensitive). */
export function rangeFromSelection(
  pxA: number,
  pxB: number,
  scale: ChartScale,
  bounds: ChartRange,
  minSpanFrac = 0.01,
): ChartRange {
  const a = scale.fromPx(Math.min(pxA, pxB));
  const b = scale.fromPx(Math.max(pxA, pxB));
  return clampRange(
    { min: Math.min(a, b), max: Math.max(a, b) },
    bounds,
    (bounds.max - bounds.min) * minSpanFrac,
  );
}
