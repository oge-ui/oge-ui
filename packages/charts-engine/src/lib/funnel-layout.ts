/**
 * Funnel and pyramid geometry. Two funnel algorithms (DevExtreme parity):
 * `'dynamicSlope'` gives every stage the same height and makes its width
 * follow the value (the slope changes stage by stage); `'dynamicHeight'`
 * keeps one fixed outline — the full width narrowing to the neck — and
 * makes each stage's height follow the value. A pyramid is a
 * dynamic-height triangle with its apex on top and the first stage at the
 * base. Pure.
 */

export type OgeFunnelAlgorithm = 'dynamicSlope' | 'dynamicHeight';
export type OgeFunnelType = 'funnel' | 'pyramid';

export interface FunnelLayoutInput {
  /** Stage values in drawing order (negative values clamp to 0). */
  readonly values: readonly number[];
  readonly type: OgeFunnelType;
  readonly algorithm: OgeFunnelAlgorithm;
  /** Neck width as a fraction of the full width (funnel). Default 0. */
  readonly neckWidth?: number;
  /** Neck height as a fraction of the full height (dynamicHeight funnel). Default 0. */
  readonly neckHeight?: number;
  /** Upside down: the funnel opens downwards, the pyramid's apex points down. */
  readonly inverted?: boolean;
  /** Vertical gap between stages, px. */
  readonly gap?: number;
  /** Plot box. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface FunnelStageGeometry {
  /** Index into `values`. */
  readonly index: number;
  /** Outline, clockwise from the top-left corner. */
  readonly points: readonly { readonly x: number; readonly y: number }[];
  readonly path: string;
  /** Stage centre (label anchor). */
  readonly cx: number;
  readonly cy: number;
  readonly top: number;
  readonly bottom: number;
  /** Width at the vertical centre (label fit). */
  readonly midWidth: number;
  /** The outline's right edge at the centre (outside-label connector start). */
  readonly rightX: number;
  readonly leftX: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

const pathOf = (points: readonly { x: number; y: number }[]): string =>
  points.length === 0
    ? ''
    : `M ${points.map((p) => `${round(p.x)} ${round(p.y)}`).join(' L ')} Z`;

/** Lays out the stages. Zero / negative stages get no geometry. */
export function layoutFunnel(input: FunnelLayoutInput): FunnelStageGeometry[] {
  const values = input.values.map((v) =>
    Number.isFinite(v) ? Math.max(0, v) : 0,
  );
  const count = values.length;
  if (count === 0 || input.width <= 0 || input.height <= 0) return [];
  const gap = Math.max(0, input.gap ?? 2);
  const usable = Math.max(1, input.height - gap * (count - 1));
  const W = input.width;
  const cx = input.x + W / 2;
  const inverted = input.inverted === true;
  const flip = (y: number): number =>
    inverted ? input.y + input.height - (y - input.y) : y;

  /** A stage between y0 and y1 (logical, top-down) with width function w(y). */
  const stage = (
    index: number,
    y0: number,
    y1: number,
    widthAt: (y: number) => number,
    kinks: readonly number[],
  ): FunnelStageGeometry => {
    const ys = [y0, ...kinks.filter((k) => k > y0 && k < y1), y1];
    const right = ys.map((y) => ({ x: cx + widthAt(y) / 2, y: flip(y) }));
    const left = [...ys]
      .reverse()
      .map((y) => ({ x: cx - widthAt(y) / 2, y: flip(y) }));
    const points = [left[left.length - 1], ...right, ...left.slice(0, -1)];
    const mid = (y0 + y1) / 2;
    const midWidth = widthAt(mid);
    return {
      index,
      points,
      path: pathOf(points),
      cx,
      cy: flip(mid),
      top: Math.min(flip(y0), flip(y1)),
      bottom: Math.max(flip(y0), flip(y1)),
      midWidth,
      rightX: cx + midWidth / 2,
      leftX: cx - midWidth / 2,
    };
  };

  if (input.type === 'funnel' && input.algorithm === 'dynamicSlope') {
    const max = Math.max(...values, 0);
    if (max <= 0) return [];
    const h = usable / count;
    const neck = W * Math.max(0, Math.min(1, input.neckWidth ?? 0));
    const widthOf = (v: number): number => (W * v) / max;
    const result: FunnelStageGeometry[] = [];
    values.forEach((value, index) => {
      if (value <= 0) return;
      const y0 = input.y + index * (h + gap);
      const y1 = y0 + h;
      const top = widthOf(value);
      const nextValue = values.slice(index + 1).find((v) => v > 0);
      const bottom =
        nextValue !== undefined
          ? widthOf(nextValue)
          : neck > 0
            ? Math.min(top, neck)
            : top;
      result.push(
        stage(
          index,
          y0,
          y1,
          (y) => top + ((bottom - top) * (y - y0)) / (y1 - y0),
          [],
        ),
      );
    });
    return result;
  }

  // dynamic height: one outline, stage heights ∝ value
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return [];
  let widthAt: (y: number) => number;
  let kinks: number[] = [];
  const order = values.map((_, index) => index);
  if (input.type === 'pyramid') {
    // apex on top, the first stage at the base
    order.reverse();
    widthAt = (y) => (W * (y - input.y)) / input.height;
  } else {
    const neckW = W * Math.max(0, Math.min(1, input.neckWidth ?? 0));
    const neckH =
      input.height * Math.max(0, Math.min(1, input.neckHeight ?? 0));
    const neckY = input.y + input.height - neckH;
    widthAt = (y) =>
      y >= neckY
        ? neckW
        : W - ((W - neckW) * (y - input.y)) / Math.max(1e-6, neckY - input.y);
    kinks = [neckY];
  }
  const result: FunnelStageGeometry[] = [];
  let cursor = input.y;
  order.forEach((index, position) => {
    const value = values[index];
    if (value <= 0) return;
    const h = (usable * value) / total;
    const y0 = cursor;
    const y1 = cursor + h;
    cursor = y1 + (position < order.length - 1 ? gap : 0);
    result.push(stage(index, y0, y1, widthAt, kinks));
  });
  return result.sort((a, b) => a.index - b.index);
}
