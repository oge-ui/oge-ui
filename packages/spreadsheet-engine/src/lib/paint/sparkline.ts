/**
 * Sparklines drawn as Excel draws them (ADR 0005): a line, column or
 * win/loss chart inside its cell, laid out on Excel's own pixel rules —
 * measured on its screen, cell by cell (`testing/corpus/sparklines.*`).
 *
 * The cell box is W × H px at the zoom, its last column and row the
 * gridline; z is the zoom factor.
 *
 * - **Plot.** x from 2z to W − 1 − 2z, y from t = 4z (the axis top) to
 *   b = H − 4z (its bottom). Points sit at the centres of n equal bands —
 *   or, on a date axis, proportionally to their dates with half the
 *   smallest gap of margin at each end.
 * - **Scale.** y(v) = t + (hi − v) / (hi − lo) · (b − t). Data that stays
 *   above zero moves the axis bottom a ninety-ninth of the span below the
 *   minimum (below zero: the top above the maximum), so the extreme value
 *   keeps a sliver; equal values span from zero to them.
 * - **Snapping.** Horizontal edges round half up; vertical ones round half
 *   toward the cell's middle row (H / 2) — the two rules Excel's pixels
 *   follow. A line's vertices sit on pixel centres (odd widths) or corners
 *   (even widths); a highlighted marker on the pixel corner at the
 *   vertex's top left, a plain marker at the rounded point.
 * - **Columns** are 5/7 of their band wide — the whole band once the gap
 *   between n evenly spaced ones would be under 2 px, on a date axis too —
 *   from the zero line (or the moved axis end), at least 1 px unless the
 *   value is on the baseline. Win/loss bars fill half the plot from its
 *   middle.
 */
import type { OgeSparklineType } from '../model/sparkline';

/**
 * A point: a number, an empty cell shown as a gap (`'gap'`, the line breaks),
 * or a point left out that the line joins over (`'join'`: an empty cell in
 * `span` mode, or `#N/A`).
 */
export type OgeSparklineValue = number | 'gap' | 'join';

/** The colours of a sparkline's parts, resolved: `#RRGGBB`. */
export interface OgeSparklinePaintColors {
  readonly series: string;
  readonly negative: string;
  readonly axis: string;
  readonly markers: string;
  readonly first: string;
  readonly last: string;
  readonly high: string;
  readonly low: string;
}

/** What drawing one sparkline needs. */
export interface OgeSparklineSpec {
  readonly type: OgeSparklineType;
  /** In data order. */
  readonly values: readonly OgeSparklineValue[];
  /** A date per value (serials), for a date axis. */
  readonly dates?: readonly (number | undefined)[];
  /** The axis' ends; `null`: no usable scale (a custom end without a value) — lines and columns draw nothing. */
  readonly axis: { readonly lo: number; readonly hi: number } | null;
  /** Points. */
  readonly lineWeight: number;
  readonly markers: boolean;
  readonly high: boolean;
  readonly low: boolean;
  readonly first: boolean;
  readonly last: boolean;
  readonly negative: boolean;
  readonly displayXAxis: boolean;
  readonly rightToLeft: boolean;
  readonly colors: OgeSparklinePaintColors;
}

/** A filled box on whole pixels: [x0, x1) × [y0, y1). */
export interface OgeSparklineRect {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly color: string;
}

/** A diamond marker: its centre and half diagonal. */
export interface OgeSparklineMarker {
  readonly cx: number;
  readonly cy: number;
  readonly d: number;
  readonly color: string;
}

/** A sparkline's shapes in its cell box, px, in paint order. */
export interface OgeSparklineDrawing {
  readonly bars: readonly OgeSparklineRect[];
  /** The x axis (drawn over the bars, under the line). */
  readonly axis: {
    readonly x0: number;
    readonly x1: number;
    readonly y0: number;
    readonly y1: number;
    readonly color: string;
  } | null;
  /** The line's runs: each a polyline through its vertices. */
  readonly lines: readonly (readonly (readonly [number, number])[])[];
  readonly lineWidth: number;
  readonly lineColor: string;
  readonly markers: readonly OgeSparklineMarker[];
}

/** Excel's stretch of an axis end past data that does not reach zero: a hair under 1/99 of the span. */
const STRETCH = 0.010101010101;

/** The axis ends for a sparkline's numbers, Excel's way. `null`: a custom end without its value. */
export function ogeSparklineAxis(
  numbers: readonly number[],
  options: {
    readonly minAxisType?: 'individual' | 'group' | 'custom';
    readonly maxAxisType?: 'individual' | 'group' | 'custom';
    readonly manualMin?: number;
    readonly manualMax?: number;
    /** The group's extremes, for `group` ends. */
    readonly groupMin?: number;
    readonly groupMax?: number;
  } = {},
): { lo: number; hi: number } | null {
  const minType = options.minAxisType ?? 'individual';
  const maxType = options.maxAxisType ?? 'individual';
  if (minType === 'custom' && options.manualMin === undefined) return null;
  if (maxType === 'custom' && options.manualMax === undefined) return null;
  let dataMin = Infinity;
  let dataMax = -Infinity;
  for (const v of numbers) {
    if (v < dataMin) dataMin = v;
    if (v > dataMax) dataMax = v;
  }
  if (!numbers.length) return null;
  let lo =
    minType === 'custom'
      ? (options.manualMin as number)
      : minType === 'group'
        ? (options.groupMin ?? dataMin)
        : dataMin;
  let hi =
    maxType === 'custom'
      ? (options.manualMax as number)
      : maxType === 'group'
        ? (options.groupMax ?? dataMax)
        : dataMax;
  if (lo === hi) {
    // equal values reach from zero; all zero stays degenerate (drawn mid-height)
    if (minType !== 'custom' && hi > 0) lo = 0;
    else if (maxType !== 'custom' && lo < 0) hi = 0;
    return { lo, hi };
  }
  if (lo > hi) return null;
  const span = hi - lo;
  if (lo > 0 && minType !== 'custom') lo -= span * STRETCH;
  else if (hi < 0 && maxType !== 'custom') hi += span * STRETCH;
  return { lo, hi };
}

/** Rounds half up (Excel's horizontal pixel edges). */
const snapX = (x: number) => Math.floor(x + 0.5);

/** Rounds to a pixel row, a half toward the cell's middle (Excel's vertical edges). */
function snapY(y: number, middle: number): number {
  const floor = Math.floor(y);
  if (y - floor !== 0.5) return Math.round(y);
  return y > middle ? floor : floor + 1;
}

/** A marker's half diagonal at 100% per line weight (points), measured: steps at these weights. */
const MARKER_STEPS: readonly (readonly [number, number])[] = [
  [1.35, 2],
  [1.7, 2.4],
  [2, 3.1],
  [3, 4],
  [4, 4.4],
  [5, 5.1],
  [6, 6],
  [7, 6.4],
  [8, 7],
];

/** A marker's half diagonal, px, for a line weight (points) at a zoom factor. */
export function ogeSparklineMarkerSize(
  lineWeight: number,
  zoom: number,
): number {
  const step = MARKER_STEPS.find(([below]) => lineWeight < below);
  const g = step ? step[1] : Math.max(8, lineWeight);
  return Math.max(1, Math.round(zoom * g));
}

/** Draws one sparkline in a cell box `width` × `height` px at `zoom` (percent). */
export function ogeDrawSparkline(
  spec: OgeSparklineSpec,
  width: number,
  height: number,
  zoom = 100,
): OgeSparklineDrawing {
  const z = zoom / 100;
  const x0 = 2 * z;
  const x1 = width - 1 - 2 * z;
  const middle = height / 2;
  // the plot's top and bottom land on whole pixels before anything is placed
  const t = snapY(4 * z, middle);
  const b = snapY(height - 4 * z, middle);
  const colors = spec.colors;
  const empty: OgeSparklineDrawing = {
    bars: [],
    axis: null,
    lines: [],
    lineWidth: 0,
    lineColor: colors.series,
    markers: [],
  };
  const n = spec.values.length;
  if (n === 0 || x1 <= x0 || b <= t) return empty;

  // ── where each point sits, and its band ──
  const xs: number[] = [];
  const even = (x1 - x0) / n;
  let band = even;
  const dated = spec.dates
    ?.map((d, i) => ({ d, i }))
    .filter((p): p is { d: number; i: number } => p.d !== undefined);
  const distinct = dated
    ? [...new Set(dated.map((p) => p.d))].sort((a, c) => a - c)
    : [];
  if (dated && distinct.length > 1) {
    let gap = Infinity;
    for (let i = 1; i < distinct.length; i++)
      gap = Math.min(gap, distinct[i] - distinct[i - 1]);
    const first = distinct[0];
    const span = distinct[distinct.length - 1] - first + gap;
    band = (gap / span) * (x1 - x0);
    for (let i = 0; i < n; i++) {
      const d = spec.dates?.[i];
      xs.push(
        d === undefined ? NaN : x0 + ((d - first + gap / 2) / span) * (x1 - x0),
      );
    }
  } else {
    for (let i = 0; i < n; i++) xs.push(x0 + (i + 0.5) * band);
  }
  if (spec.rightToLeft) for (let i = 0; i < n; i++) xs[i] = x0 + x1 - xs[i];

  // ── which colour each point takes: high, low, first, last, negative ──
  const numbers: { i: number; v: number }[] = [];
  spec.values.forEach((v, i) => {
    if (typeof v === 'number' && !Number.isNaN(xs[i])) numbers.push({ i, v });
  });
  if (!numbers.length) return empty;
  let high = -Infinity;
  let low = Infinity;
  for (const { v } of numbers) {
    if (v > high) high = v;
    if (v < low) low = v;
  }
  const firstIndex = numbers[0].i;
  const lastIndex = numbers[numbers.length - 1].i;
  const highlight = (i: number, v: number): string | null => {
    if (spec.high && v === high) return colors.high;
    if (spec.low && v === low) return colors.low;
    if (spec.first && i === firstIndex) return colors.first;
    if (spec.last && i === lastIndex) return colors.last;
    if (spec.negative && v < 0) return colors.negative;
    return null;
  };

  // ── win/loss: half the plot either side of the middle ──
  if (spec.type === 'stacked') {
    const mid = (t + b) / 2;
    const bars: OgeSparklineRect[] = [];
    const k = bandFill(even, z);
    for (const { i, v } of numbers) {
      if (v === 0) continue;
      const [left, right] = [
        snapX(xs[i] - (k * band) / 2),
        snapX(xs[i] + (k * band) / 2),
      ];
      const [top, bottom] =
        v > 0
          ? [snapY(t, middle), snapY(mid, middle)]
          : [snapY(mid, middle), snapY(b, middle)];
      bars.push({
        x0: left,
        x1: right,
        y0: top,
        y1: bottom,
        color: highlight(i, v) ?? colors.series,
      });
    }
    return {
      ...empty,
      bars,
      axis: spec.displayXAxis ? axisAt(mid) : null,
    };
  }

  const axis = spec.axis;
  if (!axis) return empty;
  const { lo, hi } = axis;
  const y =
    lo === hi
      ? () => (t + b) / 2
      : (v: number) => t + ((hi - v) / (hi - lo)) * (b - t);
  const zeroShown = lo <= 0 && 0 <= hi && lo !== hi;

  function axisAt(at: number) {
    // a 1 pt line, snapped like the series line: odd widths on pixel centres
    const thickness = Math.max(1, Math.round((4 / 3) * z));
    const top = snapY(at - thickness / 2, middle);
    const half = thickness % 2 ? 0.5 : 0;
    return {
      x0: Math.floor(x0) + half,
      x1: Math.floor(x1) + half,
      y0: top,
      y1: top + thickness,
      color: colors.axis,
    };
  }

  if (spec.type === 'column') {
    const bars: OgeSparklineRect[] = [];
    if (lo !== hi) {
      // bars stand on zero, else on the axis end the data stays away from
      const baseValue = lo > 0 ? lo : hi < 0 ? hi : 0;
      const base = snapY(y(baseValue), middle);
      const k = bandFill(even, z);
      for (const { i, v } of numbers) {
        if (v === baseValue || (lo > 0 && v < lo) || (hi < 0 && v > hi))
          continue;
        const [left, right] = [
          snapX(xs[i] - (k * band) / 2),
          snapX(xs[i] + (k * band) / 2),
        ];
        const end = snapY(y(Math.min(hi, Math.max(lo, v))), middle);
        const color = highlight(i, v) ?? colors.series;
        // at least 1 px, but never outside the plot
        const [top, bottom] =
          v > baseValue
            ? [Math.max(t, Math.min(end, base - 1)), Math.min(b, base)]
            : [Math.max(t, base), Math.min(b, Math.max(end, base + 1))];
        if (bottom > top)
          bars.push({ x0: left, x1: right, y0: top, y1: bottom, color });
      }
    }
    return {
      ...empty,
      bars,
      axis: spec.displayXAxis && zeroShown ? axisAt(y(0)) : null,
    };
  }

  // ── line ──
  const lineWidth = Math.max(1, Math.round(spec.lineWeight * (4 / 3) * z));
  const odd = lineWidth % 2 === 1;
  const vertex = (i: number, v: number): [number, number] =>
    odd
      ? [Math.floor(xs[i]) + 0.5, snapY(y(v) - 0.5, middle) + 0.5]
      : [snapX(xs[i]), snapY(y(v), middle)];
  const lines: [number, number][][] = [];
  let run: [number, number][] = [];
  spec.values.forEach((v, i) => {
    if (v === 'gap') {
      if (run.length > 1) lines.push(run);
      run = [];
    } else if (typeof v === 'number' && !Number.isNaN(xs[i]))
      run.push(vertex(i, v));
  });
  if (run.length > 1) lines.push(run);
  // a value past a custom axis end runs out of the plot: Excel cuts the line at its rows
  const clipped = lines.flatMap((line) => clipRun(line, t, b + 1));

  const d = ogeSparklineMarkerSize(spec.lineWeight, z);
  const markers: OgeSparklineMarker[] = [];
  for (const { i, v } of numbers) {
    const yv = y(v);
    if (yv < t - 0.5 || yv > b + 0.5) continue;
    const color = highlight(i, v);
    if (color)
      markers.push({
        cx: Math.floor(xs[i]),
        cy: snapY(yv - 0.5, middle),
        d,
        color,
      });
    else if (spec.markers)
      markers.push({
        cx: snapX(xs[i]),
        cy: snapY(yv, middle),
        d,
        color: colors.markers,
      });
  }
  return {
    bars: [],
    axis: spec.displayXAxis && zeroShown ? axisAt(y(0)) : null,
    lines: clipped,
    lineWidth,
    lineColor: colors.series,
    markers,
  };
}

/** The parts of a polyline between two rows: top ≤ y ≤ bottom. */
function clipRun(
  run: readonly (readonly [number, number])[],
  top: number,
  bottom: number,
): [number, number][][] {
  const out: [number, number][][] = [];
  let part: [number, number][] = [];
  const flush = () => {
    if (part.length > 1) out.push(part);
    part = [];
  };
  for (let i = 0; i + 1 < run.length; i++) {
    const [ax, ay] = run[i];
    const [bx, by] = run[i + 1];
    let from = 0;
    let to = 1;
    const dy = by - ay;
    if (dy === 0) {
      if (ay < top || ay > bottom) {
        flush();
        continue;
      }
    } else {
      const a = (top - ay) / dy;
      const c = (bottom - ay) / dy;
      from = Math.max(from, Math.min(a, c));
      to = Math.min(to, Math.max(a, c));
      if (from > to) {
        flush();
        continue;
      }
    }
    const at = (f: number): [number, number] => [
      ax + (bx - ax) * f,
      ay + dy * f,
    ];
    if (from > 0) flush();
    if (!part.length) part.push(at(from));
    part.push(at(to));
    if (to < 1) flush();
  }
  flush();
  return out;
}

/** The part of its band a column fills: 5/7, or all of it once the gap between evenly spaced columns (`band`) would be under 2 px. */
function bandFill(band: number, z: number): number {
  return band * (2 / 7) < 2 * z ? 1 : 5 / 7;
}
