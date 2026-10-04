/**
 * The cartesian plot's orientation frame. The scene lays everything out in
 * a *logical* frame — the argument axis along `a` (`0..argLen`), the value
 * axis along `v` (`0..valLen`, higher values at smaller `v`, like SVG y) —
 * and the frame maps that onto the plot's screen box:
 *
 * - default: `x = a`, `y = v` (columns, argument axis at the bottom);
 * - `rotated`: `x = valLen − v`, `y = a` — a 90° rotation, so bars run
 *   horizontally and the argument axis is vertical on the left;
 * - `rotated` + RTL: `x = v`, `y = a` — the mirrored rotation (values grow
 *   to the left, the argument axis sits on the right).
 *
 * RTL without rotation mirrors through the argument scale (inverted), not
 * the frame. Series geometry is drawn in logical coordinates inside one
 * group carrying {@link OgeChartFrame.transform}, so every series type
 * rotates for free; the overlays (grid, guides, crosshair, labels) are
 * mapped to screen coordinates by the scene. Pure.
 */

export interface OgeChartFrame {
  readonly rotated: boolean;
  readonly rtl: boolean;
  /** Length of the argument axis in px (plot width, or height when rotated). */
  readonly argLen: number;
  /** Length of the value axis in px. */
  readonly valLen: number;
  /**
   * SVG `transform` of the series group (logical → plot-local px);
   * `null` = identity.
   */
  readonly transform: string | null;
}

export interface OgeChartXY {
  readonly x: number;
  readonly y: number;
}

export interface OgeChartLineVm {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface OgeChartRectVm {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function createChartFrame(
  rotated: boolean,
  rtl: boolean,
  argLen: number,
  valLen: number,
): OgeChartFrame {
  const transform = !rotated
    ? null
    : rtl
      ? 'matrix(0 1 1 0 0 0)'
      : `matrix(0 1 -1 0 ${round(valLen)} 0)`;
  return { rotated, rtl, argLen, valLen, transform };
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** Logical `(a, v)` → plot-local screen px. */
export function framePoint(
  frame: OgeChartFrame,
  a: number,
  v: number,
): OgeChartXY {
  if (!frame.rotated) return { x: a, y: v };
  return frame.rtl ? { x: v, y: a } : { x: frame.valLen - v, y: a };
}

/** Plot-local screen px → logical `(a, v)`. */
export function frameLogical(
  frame: OgeChartFrame,
  x: number,
  y: number,
): { readonly a: number; readonly v: number } {
  if (!frame.rotated) return { a: x, v: y };
  return frame.rtl ? { a: y, v: x } : { a: y, v: frame.valLen - x };
}

/** A logical segment mapped to screen. */
export function frameLine(
  frame: OgeChartFrame,
  a1: number,
  v1: number,
  a2: number,
  v2: number,
): OgeChartLineVm {
  const p = framePoint(frame, a1, v1);
  const q = framePoint(frame, a2, v2);
  return { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
}

/** A logical box (`a0..a1` × `v0..v1`, any order) mapped to a screen rect. */
export function frameRect(
  frame: OgeChartFrame,
  a0: number,
  a1: number,
  v0: number,
  v1: number,
): OgeChartRectVm {
  const p = framePoint(frame, a0, v0);
  const q = framePoint(frame, a1, v1);
  return {
    x: Math.min(p.x, q.x),
    y: Math.min(p.y, q.y),
    w: Math.abs(q.x - p.x),
    h: Math.abs(q.y - p.y),
  };
}

/**
 * The counter-transform of a text drawn *inside* the series group at
 * logical `(x, y)`: it keeps the glyphs upright while the group rotates.
 * `null` when the frame is not rotated.
 */
export function frameTextTransform(
  frame: OgeChartFrame,
  x: number,
  y: number,
): string | null {
  if (!frame.rotated) return null;
  if (frame.rtl) {
    return `matrix(0 1 1 0 ${round(x - y)} ${round(y - x)})`;
  }
  return `rotate(-90 ${round(x)} ${round(y)})`;
}

/**
 * `text-anchor` of a series value label: centered above the point by
 * default; beside the bar end / point when rotated.
 */
export function frameLabelAnchor(
  frame: OgeChartFrame,
): 'start' | 'middle' | 'end' {
  if (!frame.rotated) return 'middle';
  return frame.rtl ? 'end' : 'start';
}

/** `dominant-baseline` of a series value label (`null` = the default). */
export function frameLabelBaseline(frame: OgeChartFrame): 'central' | null {
  return frame.rotated ? 'central' : null;
}

/**
 * The document direction of `element`, read SSR-safely: the computed
 * `direction`, falling back to the nearest `dir` attribute.
 */
export function detectChartRtl(element: Element | null | undefined): boolean {
  if (element === null || element === undefined) return false;
  try {
    if (typeof getComputedStyle === 'function') {
      const direction = getComputedStyle(element).direction;
      if (direction === 'rtl') return true;
    }
  } catch {
    // detached nodes in some engines — fall through to the attribute
  }
  const owner =
    typeof element.closest === 'function' ? element.closest('[dir]') : null;
  return owner?.getAttribute('dir')?.toLowerCase() === 'rtl';
}
