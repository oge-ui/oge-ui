/**
 * Axis-option refinements over the kernel scales: fixed tick intervals
 * (numbers and calendar intervals), whole-number ticks, minor ticks, value
 * axis breaks (a piecewise-linear scale with a fixed px gap per break) and
 * the pane offset that places a value scale inside its pane. Pure.
 */
import {
  createLinearScale,
  niceTicks,
  type ChartScale,
  type ChartScaleKind,
  type TimeTickUnit,
} from './scale';
import type {
  OgeChartAxisBreak,
  OgeChartDateInterval,
  OgeChartMinorTickOptions,
  OgeChartTickInterval,
} from './charts-types';

/** Pixels a break occupies on the axis (the zig-zag gap). */
export const CHART_BREAK_GAP_PX = 12;

const MAX_TICKS = 1000;

/** A break as laid out on its scale. */
export interface ChartScaleBreak {
  readonly start: number;
  readonly end: number;
  /** Center of the gap, px from the range start (after inversion). */
  readonly px: number;
}

/** A value scale shifted to start `offsetPx` into the plot (its pane). */
export function offsetChartScale(
  scale: ChartScale,
  offsetPx: number,
): ChartScale {
  if (offsetPx === 0) return scale;
  return {
    ...scale,
    toPx: (value) => offsetPx + scale.toPx(value),
    fromPx: (px) => scale.fromPx(px - offsetPx),
    breaks: scale.breaks?.map((brk) => ({ ...brk, px: brk.px + offsetPx })),
  };
}

/* ---------------- calendar intervals ---------------- */

/** Whether a tick interval / period is a calendar interval object. */
export function isChartDateInterval(
  value: unknown,
): value is OgeChartDateInterval {
  return (
    typeof value === 'object' &&
    value !== null &&
    !('min' in value) &&
    ['years', 'months', 'weeks', 'days', 'hours', 'minutes'].some(
      (key) => typeof (value as Record<string, unknown>)[key] === 'number',
    )
  );
}

/** `date` moved by `sign` × `interval` in local calendar fields. */
export function addChartDateInterval(
  ms: number,
  interval: OgeChartDateInterval,
  sign = 1,
): number {
  const d = new Date(ms);
  return new Date(
    d.getFullYear() + sign * (interval.years ?? 0),
    d.getMonth() + sign * (interval.months ?? 0),
    d.getDate() + sign * ((interval.days ?? 0) + 7 * (interval.weeks ?? 0)),
    d.getHours() + sign * (interval.hours ?? 0),
    d.getMinutes() + sign * (interval.minutes ?? 0),
    d.getSeconds(),
    d.getMilliseconds(),
  ).getTime();
}

/** The label unit matching a calendar interval's coarsest field. */
export function chartDateIntervalUnit(
  interval: OgeChartDateInterval,
): TimeTickUnit {
  if ((interval.years ?? 0) > 0) return 'year';
  if ((interval.months ?? 0) > 0) return 'month';
  if ((interval.weeks ?? 0) > 0) return 'week';
  if ((interval.days ?? 0) > 0) return 'day';
  if ((interval.hours ?? 0) > 0) return 'hour';
  return 'minute';
}

/** The first boundary of the interval's unit at or after `ms`. */
function alignToUnit(
  ms: number,
  unit: TimeTickUnit,
  firstDayOfWeek: number,
): number {
  const d = new Date(ms);
  let aligned: Date;
  switch (unit) {
    case 'year':
      aligned = new Date(d.getFullYear(), 0, 1);
      if (aligned.getTime() < ms) aligned = new Date(d.getFullYear() + 1, 0, 1);
      break;
    case 'month':
      aligned = new Date(d.getFullYear(), d.getMonth(), 1);
      if (aligned.getTime() < ms) {
        aligned = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
      break;
    case 'week': {
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const shift = (day.getDay() - firstDayOfWeek + 7) % 7;
      aligned = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate() - shift,
      );
      if (aligned.getTime() < ms) {
        aligned = new Date(
          aligned.getFullYear(),
          aligned.getMonth(),
          aligned.getDate() + 7,
        );
      }
      break;
    }
    case 'day':
      aligned = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (aligned.getTime() < ms) {
        aligned = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
      break;
    case 'hour':
      aligned = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
      );
      if (aligned.getTime() < ms)
        aligned = new Date(aligned.getTime() + 3_600_000);
      break;
    default:
      aligned = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
      );
      if (aligned.getTime() < ms)
        aligned = new Date(aligned.getTime() + 60_000);
  }
  return aligned.getTime();
}

/* ---------------- tick options ---------------- */

/** Ticks at multiples of `step` inside `[min, max]`. */
function steppedTicks(min: number, max: number, step: number): number[] {
  if (!(step > 0) || !(max >= min)) return [min];
  const ticks: number[] = [];
  const first = Math.ceil(min / step - 1e-9) * step;
  for (
    let i = 0, v = first;
    v <= max + step * 1e-6 && i < MAX_TICKS;
    i++, v = first + i * step
  ) {
    ticks.push(Math.abs(v) < step * 1e-9 ? 0 : Math.round(v / step) * step);
  }
  return ticks.length > 0 ? ticks : [min];
}

export interface ChartTickOptions {
  readonly tickInterval?: OgeChartTickInterval;
  readonly allowDecimals?: boolean;
  readonly minorTicks?: boolean | OgeChartMinorTickOptions;
  /** Locale week start for `{ weeks }` intervals. Default Monday. */
  readonly firstDayOfWeek?: number;
}

/**
 * The scale with its major ticks replaced per `tickInterval` /
 * `allowDecimals`, and `minorTicks` filled in. Category axes read a number
 * interval as "every n-th category"; time axes take milliseconds or a
 * calendar interval; logarithmic axes ignore the interval.
 */
export function applyChartTickOptions(
  scale: ChartScale,
  options: ChartTickOptions,
): ChartScale {
  let ticks = scale.ticks;
  let tickUnit = scale.tickUnit;
  const { min, max } = scale;
  const interval = options.tickInterval;
  const kind: ChartScaleKind = scale.kind;
  const broken = (scale.breaks ?? []).length > 0;

  if (interval !== undefined && !broken) {
    if (kind === 'category' && typeof interval === 'number') {
      const n = Math.max(1, Math.round(interval));
      ticks = scale.ticks.filter((tick) => Math.round(tick) % n === 0);
    } else if (kind === 'time' && isChartDateInterval(interval)) {
      const unit = chartDateIntervalUnit(interval);
      const next: number[] = [];
      let cursor = alignToUnit(min, unit, options.firstDayOfWeek ?? 1);
      for (let i = 0; cursor <= max && i < MAX_TICKS; i++) {
        next.push(cursor);
        const stepped = addChartDateInterval(cursor, interval);
        if (stepped <= cursor) break;
        cursor = stepped;
      }
      if (next.length > 0) {
        ticks = next;
        tickUnit = unit;
      }
    } else if (
      typeof interval === 'number' &&
      interval > 0 &&
      (kind === 'linear' || kind === 'time')
    ) {
      // guard against a tiny interval flooding the axis
      const step = Math.max(interval, (max - min) / MAX_TICKS);
      ticks = steppedTicks(min, max, step);
    }
  }

  if (options.allowDecimals === false && kind === 'linear') {
    if (ticks.some((tick) => !Number.isInteger(tick))) {
      const step =
        ticks.length >= 2 ? Math.max(1, Math.ceil(ticks[1] - ticks[0])) : 1;
      ticks = broken
        ? ticks.filter((tick) => Number.isInteger(tick))
        : steppedTicks(Math.ceil(min), Math.floor(max), step);
    }
  }

  const minor = minorTickOptions(options.minorTicks);
  const minorTicks =
    minor === null ? undefined : chartMinorTicks(scale, ticks, minor.count);
  return { ...scale, ticks, tickUnit, minorTicks };
}

function minorTickOptions(
  value: boolean | OgeChartMinorTickOptions | undefined,
): { count: number } | null {
  if (value === undefined || value === false) return null;
  if (value === true) return { count: 4 };
  if (value.visible === false) return null;
  return { count: Math.max(1, Math.round(value.count ?? 4)) };
}

/**
 * Minor ticks between (and beyond, inside the domain) the major ticks:
 * `count` evenly spaced per interval; logarithmic scales use 2…9 × 10ⁿ.
 * A break between two majors leaves that interval without minors.
 */
export function chartMinorTicks(
  scale: ChartScale,
  majors: readonly number[],
  count: number,
): number[] {
  const { min, max } = scale;
  if (scale.kind === 'logarithmic') {
    const result: number[] = [];
    const lo = Math.floor(Math.log10(min));
    const hi = Math.ceil(Math.log10(max));
    for (let exp = lo; exp <= hi && result.length < MAX_TICKS; exp++) {
      for (let factor = 2; factor <= 9; factor++) {
        const value = factor * Math.pow(10, exp);
        if (value > min && value < max) result.push(value);
      }
    }
    return result;
  }
  if (scale.kind === 'category' || majors.length < 2) return [];
  const breaks = scale.breaks ?? [];
  const inBreak = (a: number, b: number): boolean =>
    breaks.some((brk) => brk.start < b && brk.end > a);
  const result: number[] = [];
  const pushBetween = (a: number, b: number): void => {
    if (inBreak(a, b)) return;
    for (let k = 1; k <= count; k++) {
      const value = a + ((b - a) * k) / (count + 1);
      if (value > min && value < max && result.length < MAX_TICKS) {
        result.push(value);
      }
    }
  };
  const step = majors[1] - majors[0];
  pushBetween(majors[0] - step, majors[0]);
  for (let i = 1; i < majors.length; i++) pushBetween(majors[i - 1], majors[i]);
  pushBetween(majors[majors.length - 1], majors[majors.length - 1] + step);
  return result;
}

/* ---------------- breaks ---------------- */

/** Breaks sorted, merged and clipped strictly inside `(min, max)`. */
export function normalizeChartBreaks(
  breaks: readonly OgeChartAxisBreak[] | undefined,
  min: number,
  max: number,
): { start: number; end: number }[] {
  const list = (breaks ?? [])
    .map((brk) => ({
      start: Math.min(brk.start, brk.end),
      end: Math.max(brk.start, brk.end),
    }))
    .filter(
      (brk) =>
        Number.isFinite(brk.start) &&
        Number.isFinite(brk.end) &&
        brk.end > brk.start &&
        brk.end > min &&
        brk.start < max,
    )
    .map((brk) => ({
      start: Math.max(brk.start, min),
      end: Math.min(brk.end, max),
    }))
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const brk of list) {
    const last = merged[merged.length - 1];
    if (last !== undefined && brk.start <= last.end) {
      last.end = Math.max(last.end, brk.end);
    } else {
      merged.push({ ...brk });
    }
  }
  // a break swallowing the whole domain leaves nothing to draw
  return merged.filter((brk) => !(brk.start <= min && brk.end >= max));
}

/**
 * A linear scale that skips the `breaks` ranges: the domain outside the
 * breaks maps linearly onto the range minus a {@link CHART_BREAK_GAP_PX}
 * gap per break; values inside a break land in its gap. Without (valid)
 * breaks this is `createLinearScale`.
 */
export function createBrokenLinearScale(options: {
  min: number;
  max: number;
  rangePx: number;
  inverted?: boolean;
  breaks?: readonly OgeChartAxisBreak[];
  targetTicks?: number;
  gapPx?: number;
}): ChartScale {
  const { min, max, rangePx } = options;
  const valid = normalizeChartBreaks(options.breaks, min, max);
  const linear = createLinearScale(options);
  if (valid.length === 0) return linear;
  const inverted = options.inverted === true;
  const gapPx = options.gapPx ?? CHART_BREAK_GAP_PX;
  const segments: { start: number; end: number }[] = [];
  let cursor = min;
  for (const brk of valid) {
    segments.push({ start: cursor, end: brk.start });
    cursor = brk.end;
  }
  segments.push({ start: cursor, end: max });
  const domain = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
  const usable = Math.max(1, rangePx - gapPx * valid.length);
  const unit = usable / (domain || 1);

  /** px from the range start before inversion */
  const position = (value: number): number => {
    if (value <= min) return (value - min) * unit;
    let px = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (value <= seg.end) return px + (value - seg.start) * unit;
      px += (seg.end - seg.start) * unit;
      const brk = valid[i];
      if (brk === undefined) return px + (value - seg.end) * unit;
      if (value < brk.end) {
        return px + gapPx * ((value - brk.start) / (brk.end - brk.start));
      }
      px += gapPx;
    }
    return px;
  };
  const valueAt = (px: number): number => {
    if (px <= 0) return min + px / unit;
    let start = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segPx = (seg.end - seg.start) * unit;
      if (px <= start + segPx) return seg.start + (px - start) / unit;
      start += segPx;
      const brk = valid[i];
      if (brk === undefined) return seg.end + (px - start) / unit;
      if (px < start + gapPx) {
        return brk.start + ((px - start) / gapPx) * (brk.end - brk.start);
      }
      start += gapPx;
    }
    return max;
  };
  const toPx = (value: number): number => {
    const px = position(value);
    return inverted ? rangePx - px : px;
  };
  const fromPx = (px: number): number => valueAt(inverted ? rangePx - px : px);

  const target = options.targetTicks ?? 6;
  const ticks: number[] = [];
  const gapEdges = valid.flatMap((brk) => [
    position(brk.start),
    position(brk.end),
  ]);
  for (const seg of segments) {
    const segPx = (seg.end - seg.start) * unit;
    if (segPx < 8) continue;
    const count = Math.max(1, Math.round((target * segPx) / rangePx));
    for (const tick of niceTicks(seg.start, seg.end, count)) {
      if (tick < seg.start || tick > seg.end) continue;
      const px = position(tick);
      // keep labels clear of the zig-zag
      if (gapEdges.some((edge) => Math.abs(edge - px) < 9)) continue;
      ticks.push(tick);
    }
  }
  return {
    ...linear,
    toPx,
    fromPx,
    ticks: ticks.length > 0 ? ticks : linear.ticks,
    breaks: valid.map((brk) => ({
      start: brk.start,
      end: brk.end,
      px: toPx(brk.start) + (inverted ? -gapPx / 2 : gapPx / 2),
    })),
  };
}
