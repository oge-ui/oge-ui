/**
 * The framework-free arithmetic of the progress bar (ADR 0001): the value →
 * ratio clamp, the `aria-valuenow` rule, the visible label and — for
 * `type: 'circular'` — the SVG ring geometry. Both render layers call these,
 * so a linear and a circular bar fed the same value always announce and
 * paint the same thing.
 */

/** Shape of the progress bar: the linear track or the circular ring. */
export type OgeProgressBarType = 'linear' | 'circular';

/** Default ring diameter in px (`size`). */
export const OGE_PROGRESS_RING_DEFAULT_SIZE = 48;

/** Default ring stroke width in px (`thickness`). */
export const OGE_PROGRESS_RING_DEFAULT_THICKNESS = 4;

/**
 * Share of the ring the indeterminate arc covers — long enough to read as
 * motion, short enough never to read as a value.
 */
export const OGE_PROGRESS_RING_INDETERMINATE_RATIO = 0.25;

/**
 * Fill ratio in `[0, 1]` of `value` between `min` and `max`. A `null` value
 * (indeterminate) and a degenerate range (`max <= min`) are `0`.
 */
export function ogeProgressRatio(
  value: number | null | undefined,
  min: number,
  max: number,
): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  if (!(max > min)) return 0;
  return Math.min(Math.max((value - min) / (max - min), 0), 1);
}

/**
 * The `aria-valuenow` of a progress bar: omitted (`null`) while
 * indeterminate — never a sentinel — and clamped into `[min, max]`
 * otherwise, because a now beyond max is invalid ARIA.
 */
export function ogeProgressAriaNow(
  value: number | null | undefined,
  min: number,
  max: number,
): number | null {
  if (value === null || value === undefined) return null;
  return Math.min(Math.max(value, min), max);
}

/**
 * The visible label: `formatLabel(value, ratio)` when supplied, the rounded
 * percentage otherwise, and an empty string while indeterminate.
 */
export function ogeProgressLabel(
  value: number | null | undefined,
  ratio: number,
  formatLabel?: (value: number, ratio: number) => string,
): string {
  if (value === null || value === undefined) return '';
  return formatLabel
    ? formatLabel(value, ratio)
    : `${Math.round(ratio * 100)}%`;
}

/** The SVG numbers of one progress ring. */
export interface OgeProgressRingGeometry {
  /** Outer diameter in px — the SVG's width, height and viewBox side. */
  readonly size: number;
  /** Stroke width in px, clamped into `[1, size / 2]`. */
  readonly thickness: number;
  /** `cx` / `cy` of both circles. */
  readonly center: number;
  /** `r` of both circles — the stroke is centred on it, so it stays inside the box. */
  readonly radius: number;
  /** Length of the full circle, `2πr`. */
  readonly circumference: number;
  /** `stroke-dasharray` of the value circle: one dash the length of the circle. */
  readonly dashArray: string;
  /** `stroke-dashoffset` of the value circle: the unfilled share of the circle. */
  readonly dashOffset: number;
  /** The `viewBox` attribute. */
  readonly viewBox: string;
}

/**
 * Geometry of a determinate (or, with the indeterminate ratio, spinning)
 * ring: the value circle is one dash as long as the circumference, offset by
 * the unfilled share, so `ratio` maps linearly onto the visible arc. The
 * render layers rotate the SVG by −90° so the arc starts at 12 o'clock.
 */
export function ogeProgressRingGeometry(options: {
  readonly ratio: number;
  readonly size?: number;
  readonly thickness?: number;
}): OgeProgressRingGeometry {
  const size =
    options.size !== undefined && options.size > 0
      ? options.size
      : OGE_PROGRESS_RING_DEFAULT_SIZE;
  const requested =
    options.thickness !== undefined && options.thickness > 0
      ? options.thickness
      : OGE_PROGRESS_RING_DEFAULT_THICKNESS;
  const thickness = Math.min(Math.max(requested, 1), size / 2);
  const center = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(Math.max(options.ratio, 0), 1);
  return {
    size,
    thickness,
    center,
    radius,
    circumference,
    dashArray: `${circumference}`,
    dashOffset: circumference * (1 - ratio),
    viewBox: `0 0 ${size} ${size}`,
  };
}
