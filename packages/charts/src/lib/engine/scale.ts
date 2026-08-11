/**
 * Chart scales: numeric domain → pixel mapping plus tick generation.
 * Linear ticks use the 1-2-5 "nice number" ladder; log ticks are powers of
 * ten; time ticks are calendar-true (local Date stepping — real month
 * lengths, DST-safe positions on the ms axis). Pure.
 */

export type ChartScaleKind = 'linear' | 'logarithmic' | 'category' | 'time';

/** A numeric domain window (time: epoch ms; category: index space). */
export interface ChartRange {
  readonly min: number;
  readonly max: number;
}

export interface ChartScale {
  readonly kind: ChartScaleKind;
  readonly min: number;
  readonly max: number;
  readonly rangePx: number;
  readonly inverted: boolean;
  /** Domain value → px (0 at the range start; callers add the plot origin). */
  readonly toPx: (value: number) => number;
  readonly fromPx: (px: number) => number;
  /** Tick positions in domain units. */
  readonly ticks: readonly number[];
  /** Time scales: the tick unit the generator chose. */
  readonly tickUnit?: TimeTickUnit;
}

export type TimeTickUnit =
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year';

/* ---------------- linear ---------------- */

/** The 1-2-5 ladder step ≥ (span / targetCount). */
export function niceStep(span: number, targetCount: number): number {
  if (span <= 0 || targetCount <= 0) return 1;
  const rough = span / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  for (const factor of [1, 2, 5, 10]) {
    if (magnitude * factor >= rough) return magnitude * factor;
  }
  return magnitude * 10;
}

export function niceTicks(
  min: number,
  max: number,
  targetCount = 6,
): number[] {
  if (!(max > min)) return [min];
  const step = niceStep(max - min, targetCount);
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  // guard float drift with a half-step epsilon
  for (let v = first; v <= max + step * 1e-6; v += step) {
    ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return ticks;
}

export function createLinearScale(options: {
  min: number;
  max: number;
  rangePx: number;
  inverted?: boolean;
  targetTicks?: number;
}): ChartScale {
  const { min, max, rangePx } = options;
  const inverted = options.inverted === true;
  const span = max - min || 1;
  const toPx = (value: number): number => {
    const frac = (value - min) / span;
    return (inverted ? 1 - frac : frac) * rangePx;
  };
  const fromPx = (px: number): number => {
    const frac = px / (rangePx || 1);
    return min + (inverted ? 1 - frac : frac) * span;
  };
  return {
    kind: 'linear',
    min,
    max,
    rangePx,
    inverted,
    toPx,
    fromPx,
    ticks: niceTicks(min, max, options.targetTicks ?? 6),
  };
}

/* ---------------- logarithmic ---------------- */

export function logTicks(min: number, max: number): number[] {
  const lo = Math.ceil(Math.log10(Math.max(min, Number.MIN_VALUE)));
  const hi = Math.floor(Math.log10(Math.max(max, Number.MIN_VALUE)));
  const ticks: number[] = [];
  for (let exp = lo; exp <= hi; exp++) ticks.push(Math.pow(10, exp));
  return ticks.length > 0 ? ticks : [min];
}

export function createLogScale(options: {
  min: number;
  max: number;
  rangePx: number;
  inverted?: boolean;
}): ChartScale {
  // a log domain must be strictly positive — clamp honestly
  const min = Math.max(options.min, Number.MIN_VALUE);
  const max = Math.max(options.max, min * 10);
  const { rangePx } = options;
  const inverted = options.inverted === true;
  const logMin = Math.log10(min);
  const logSpan = Math.log10(max) - logMin || 1;
  const toPx = (value: number): number => {
    const frac =
      (Math.log10(Math.max(value, Number.MIN_VALUE)) - logMin) / logSpan;
    return (inverted ? 1 - frac : frac) * rangePx;
  };
  const fromPx = (px: number): number => {
    const frac = px / (rangePx || 1);
    return Math.pow(10, logMin + (inverted ? 1 - frac : frac) * logSpan);
  };
  return {
    kind: 'logarithmic',
    min,
    max,
    rangePx,
    inverted,
    toPx,
    fromPx,
    ticks: logTicks(min, max),
  };
}

/* ---------------- category ---------------- */

/**
 * Category scale over `count` bands: domain is index space
 * `[-0.5, count - 0.5]`, one tick per band center.
 */
export function createCategoryScale(options: {
  count: number;
  rangePx: number;
  inverted?: boolean;
}): ChartScale {
  const count = Math.max(1, options.count);
  const linear = createLinearScale({
    min: -0.5,
    max: count - 0.5,
    rangePx: options.rangePx,
    inverted: options.inverted,
  });
  return {
    ...linear,
    kind: 'category',
    ticks: Array.from({ length: count }, (_, i) => i),
  };
}

/** Band width of a category scale in px. */
export function categoryBandPx(scale: ChartScale, count: number): number {
  return scale.rangePx / Math.max(1, count);
}

/* ---------------- time ---------------- */

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Unit + step chosen so ~targetCount ticks cover the span. */
export function pickTimeUnit(
  spanMs: number,
  targetCount: number,
): { unit: TimeTickUnit; step: number } {
  const rough = spanMs / Math.max(1, targetCount);
  if (rough <= 30 * MINUTE) {
    for (const step of [1, 5, 10, 15, 30]) {
      if (step * MINUTE >= rough) return { unit: 'minute', step };
    }
  }
  if (rough <= 12 * HOUR) {
    for (const step of [1, 2, 3, 6, 12]) {
      if (step * HOUR >= rough) return { unit: 'hour', step };
    }
  }
  if (rough <= 3 * DAY) {
    for (const step of [1, 2, 3]) {
      if (step * DAY >= rough) return { unit: 'day', step };
    }
  }
  if (rough <= 21 * DAY) return { unit: 'week', step: 1 };
  if (rough <= 3 * 30 * DAY) {
    for (const step of [1, 2, 3]) {
      if (step * 30 * DAY >= rough) return { unit: 'month', step };
    }
  }
  if (rough <= 365 * DAY) return { unit: 'month', step: 6 };
  return { unit: 'year', step: Math.max(1, Math.round(rough / (365 * DAY))) };
}

function ceilToUnit(
  ms: number,
  unit: TimeTickUnit,
  step: number,
  firstDayOfWeek: number,
): Date {
  const d = new Date(ms);
  switch (unit) {
    case 'minute': {
      const t = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        Math.ceil(d.getMinutes() / step) * step,
      );
      return t.getTime() >= ms ? t : new Date(t.getTime() + step * MINUTE);
    }
    case 'hour': {
      const t = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        Math.ceil(d.getHours() / step) * step,
      );
      return t.getTime() >= ms ? t : new Date(t.getTime() + step * HOUR);
    }
    case 'day': {
      const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return t.getTime() >= ms
        ? t
        : new Date(d.getFullYear(), d.getMonth(), d.getDate() + step);
    }
    case 'week': {
      const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const shift = (t.getDay() - firstDayOfWeek + 7) % 7;
      const start = new Date(
        t.getFullYear(),
        t.getMonth(),
        t.getDate() - shift,
      );
      return start.getTime() >= ms
        ? start
        : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    }
    case 'month': {
      const t = new Date(
        d.getFullYear(),
        Math.ceil(d.getMonth() / step) * step,
        1,
      );
      return t.getTime() >= ms
        ? t
        : new Date(t.getFullYear(), t.getMonth() + step, 1);
    }
    case 'year': {
      const t = new Date(Math.ceil(d.getFullYear() / step) * step, 0, 1);
      return t.getTime() >= ms ? t : new Date(t.getFullYear() + step, 0, 1);
    }
  }
}

function stepDate(d: Date, unit: TimeTickUnit, step: number): Date {
  switch (unit) {
    case 'minute':
      return new Date(d.getTime() + step * MINUTE);
    case 'hour':
      return new Date(d.getTime() + step * HOUR);
    case 'day':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + step);
    case 'week':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * step);
    case 'month':
      return new Date(d.getFullYear(), d.getMonth() + step, 1);
    case 'year':
      return new Date(d.getFullYear() + step, 0, 1);
  }
}

/** Calendar-true time ticks over `[min, max]` epoch ms. */
export function timeTicks(
  min: number,
  max: number,
  targetCount = 6,
  firstDayOfWeek = 1,
): { ticks: number[]; unit: TimeTickUnit } {
  if (!(max > min)) return { ticks: [min], unit: 'day' };
  const { unit, step } = pickTimeUnit(max - min, targetCount);
  const ticks: number[] = [];
  let cursor = ceilToUnit(min, unit, step, firstDayOfWeek);
  // hard cap keeps a degenerate span from looping forever
  for (let i = 0; i < 500 && cursor.getTime() <= max; i++) {
    ticks.push(cursor.getTime());
    cursor = stepDate(cursor, unit, step);
  }
  return { ticks: ticks.length > 0 ? ticks : [min], unit };
}

export function createTimeScale(options: {
  min: number;
  max: number;
  rangePx: number;
  inverted?: boolean;
  targetTicks?: number;
  firstDayOfWeek?: number;
}): ChartScale {
  const linear = createLinearScale(options);
  const { ticks, unit } = timeTicks(
    options.min,
    options.max,
    options.targetTicks ?? 6,
    options.firstDayOfWeek ?? 1,
  );
  return { ...linear, kind: 'time', ticks, tickUnit: unit };
}

/* ---------------- visual range ---------------- */

/** Clamps a window into `bounds`, preserving its span where possible. */
export function clampRange(
  range: ChartRange,
  bounds: ChartRange,
  minSpan = 0,
): ChartRange {
  const boundSpan = bounds.max - bounds.min;
  const span = Math.min(Math.max(range.max - range.min, minSpan), boundSpan);
  let min = range.min;
  if (min < bounds.min) min = bounds.min;
  if (min + span > bounds.max) min = bounds.max - span;
  return { min, max: min + span };
}
