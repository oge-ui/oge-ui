/**
 * Pure slider arithmetic — clamp, step snapping with float-error correction,
 * value↔ratio projection and the multi-thumb pair constraint. DOM-free so the
 * slider components only feed it measurements, the same rule every other
 * kernel in this folder follows.
 *
 * Note the deliberate difference from the number box's private step helpers:
 * a slider ALWAYS snaps to the step grid (a thumb cannot sit between stops),
 * while a typed number deliberately keeps off-grid values.
 */

/** Clamps `value` into `[min, max]` (bounds may arrive reversed-safe). */
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Decimal places of `n`, capped — used to undo binary float drift. */
function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const text = String(n);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : Math.min(text.length - dot - 1, 12);
}

/**
 * Snaps `value` to the step grid anchored at `min`, clamped to `[min, max]`.
 * The result is rounded to the step's decimal precision so `0.1 + 0.2`-class
 * drift never reaches `aria-valuenow`. `max` itself is always reachable even
 * when `(max - min)` is not a step multiple — every reference slider allows
 * the far end.
 */
export function snapToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const clamped = clampValue(value, min, max);
  if (step <= 0) return clamped;
  if (clamped === max) return max; // the far end always wins over the grid
  const steps = Math.round((clamped - min) / step);
  const decimals = Math.max(decimalsOf(step), decimalsOf(min));
  const factor = Math.pow(10, decimals);
  const snapped = Math.round((min + steps * step) * factor) / factor;
  // Snapping may overshoot past max when the range is not a step multiple;
  // the far end then wins over the grid.
  return snapped > max ? max : snapped < min ? min : snapped;
}

/** Projects `value` onto `[0, 1]` along the range; `0` when the range is empty. */
export function valueToRatio(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clampValue((value - min) / (max - min), 0, 1);
}

/** Projects a `[0, 1]` ratio back to a snapped value. */
export function ratioToValue(
  ratio: number,
  min: number,
  max: number,
  step: number,
): number {
  return snapToStep(min + clampValue(ratio, 0, 1) * (max - min), min, max, step);
}

/** Which thumb of a range pair is being constrained. */
export type OgeRangeThumb = 'start' | 'end';

/**
 * Constrains one thumb of a range pair against its sibling: the start thumb
 * may never pass the end thumb (minus `minRange`, when set) and vice versa —
 * the APG multi-thumb rule, expressed as arithmetic.
 */
export function constrainRangeValue(
  value: number,
  sibling: number,
  thumb: OgeRangeThumb,
  minRange = 0,
): number {
  return thumb === 'start'
    ? Math.min(value, sibling - minRange)
    : Math.max(value, sibling + minRange);
}
