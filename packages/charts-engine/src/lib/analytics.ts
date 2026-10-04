/**
 * Chart analytics as pure functions: regression trendlines (linear,
 * exponential, logarithmic, polynomial, moving average) with R², the core
 * technical indicators (SMA, EMA, Bollinger Bands, MACD, RSI), box-plot
 * statistics and histogram binning. No DOM, no dependencies — the series
 * sugar (`trendline`, `type: 'indicator'`, `boxPlot`, `histogram`) runs
 * these, and apps can call them directly for their own pipelines.
 *
 * Every indicator returns an array aligned with its input: `null` where the
 * window is not yet full (or the input value was a gap).
 */
import { niceStep } from './scale';

/** A numeric series: plain values, or objects carrying a `value`. */
export type OgeAnalyticsInput =
  | readonly (number | null | undefined)[]
  | readonly { readonly value: number | null | undefined }[];

function valuesOf(input: OgeAnalyticsInput): (number | null)[] {
  return (input as readonly unknown[]).map((entry) => {
    const raw =
      entry !== null && typeof entry === 'object'
        ? (entry as { value: unknown }).value
        : entry;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  });
}

/* ------------------------------------------------------------------ */
/* moving averages                                                     */
/* ------------------------------------------------------------------ */

/**
 * Simple moving average over `period` values. A gap inside the window
 * yields `null` for that position (the average would be biased).
 */
export function ogeSma(
  input: OgeAnalyticsInput,
  period: number,
): (number | null)[] {
  const values = valuesOf(input);
  const size = Math.max(1, Math.floor(period));
  return values.map((_, index) => {
    if (index + 1 < size) return null;
    let sum = 0;
    for (let i = index - size + 1; i <= index; i++) {
      const value = values[i];
      if (value === null) return null;
      sum += value;
    }
    return sum / size;
  });
}

/**
 * Exponential moving average (`k = 2 / (period + 1)`), seeded with the SMA
 * of the first full window. Gaps carry the previous average forward.
 */
export function ogeEma(
  input: OgeAnalyticsInput,
  period: number,
): (number | null)[] {
  const values = valuesOf(input);
  const size = Math.max(1, Math.floor(period));
  const k = 2 / (size + 1);
  const result: (number | null)[] = [];
  let ema: number | null = null;
  let seed: number[] = [];
  for (const value of values) {
    if (ema === null) {
      if (value === null) {
        seed = [];
        result.push(null);
        continue;
      }
      seed.push(value);
      if (seed.length < size) {
        result.push(null);
        continue;
      }
      ema = seed.reduce((sum, entry) => sum + entry, 0) / size;
      result.push(ema);
      continue;
    }
    if (value !== null) ema = value * k + ema * (1 - k);
    result.push(value === null ? null : ema);
  }
  return result;
}

/** Bollinger Bands: the `period` SMA ± `stdDev` population deviations. */
export interface OgeBollingerBand {
  readonly middle: number | null;
  readonly upper: number | null;
  readonly lower: number | null;
}

export function ogeBollingerBands(
  input: OgeAnalyticsInput,
  period = 20,
  stdDev = 2,
): OgeBollingerBand[] {
  const values = valuesOf(input);
  const middle = ogeSma(values, period);
  const size = Math.max(1, Math.floor(period));
  return middle.map((mean, index) => {
    if (mean === null) return { middle: null, upper: null, lower: null };
    let squares = 0;
    for (let i = index - size + 1; i <= index; i++) {
      const diff = (values[i] as number) - mean;
      squares += diff * diff;
    }
    const deviation = Math.sqrt(squares / size) * stdDev;
    return { middle: mean, upper: mean + deviation, lower: mean - deviation };
  });
}

/** MACD: fast EMA − slow EMA, its signal EMA and the histogram between. */
export interface OgeMacdPoint {
  readonly macd: number | null;
  readonly signal: number | null;
  readonly histogram: number | null;
}

export function ogeMacd(
  input: OgeAnalyticsInput,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): OgeMacdPoint[] {
  const values = valuesOf(input);
  const fast = ogeEma(values, fastPeriod);
  const slow = ogeEma(values, slowPeriod);
  const macd = fast.map((entry, index) => {
    const other = slow[index];
    return entry === null || other === null ? null : entry - other;
  });
  const signal = ogeEma(macd, signalPeriod);
  return macd.map((entry, index) => {
    const sig = signal[index];
    return {
      macd: entry,
      signal: sig,
      histogram: entry === null || sig === null ? null : entry - sig,
    };
  });
}

/**
 * Relative Strength Index (Wilder smoothing), 0–100. The first value lands
 * at index `period` (it needs `period` changes).
 */
export function ogeRsi(
  input: OgeAnalyticsInput,
  period = 14,
): (number | null)[] {
  const values = valuesOf(input);
  const size = Math.max(1, Math.floor(period));
  const result: (number | null)[] = values.map(() => null);
  let avgGain = 0;
  let avgLoss = 0;
  let changes = 0;
  let previous: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value === null) continue;
    if (previous === null) {
      previous = value;
      continue;
    }
    const change = value - previous;
    previous = value;
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    changes++;
    if (changes <= size) {
      avgGain += gain / size;
      avgLoss += loss / size;
      if (changes < size) continue;
    } else {
      avgGain = (avgGain * (size - 1) + gain) / size;
      avgLoss = (avgLoss * (size - 1) + loss) / size;
    }
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* trendlines                                                          */
/* ------------------------------------------------------------------ */

export type OgeTrendlineType =
  'linear' | 'exponential' | 'logarithmic' | 'polynomial' | 'movingAverage';

export interface OgeTrendlineFitOptions {
  /** Polynomial degree (2–6). Default 2. */
  readonly order?: number;
  /** Moving-average window. Default 3. */
  readonly period?: number;
}

/** A fitted trendline. */
export interface OgeTrendlineFit {
  readonly type: OgeTrendlineType;
  /**
   * The model's parameters: linear `[intercept, slope]`; exponential
   * `[a, b]` of `a·e^(b·x)`; logarithmic `[a, b]` of `a + b·ln x`;
   * polynomial `[c0, c1, …]` in the normalised x space; moving average `[]`.
   */
  readonly coefficients: readonly number[];
  /** Coefficient of determination on the input points; null when undefined. */
  readonly r2: number | null;
  /** The model at `x` (null outside its domain, e.g. `x ≤ 0` for log). */
  readonly predict: (x: number) => number | null;
  /** The fitted line at the input's x positions, ascending x. */
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

/** Solves `A·x = b` by Gaussian elimination with partial pivoting. */
function solve(matrix: number[][], vector: number[]): number[] | null {
  const n = vector.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / a[col][col];
      for (let k = col; k <= n; k++) a[row][k] -= factor * a[col][k];
    }
  }
  const result = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = a[row][n];
    for (let k = row + 1; k < n; k++) sum -= a[row][k] * result[k];
    result[row] = sum / a[row][row];
  }
  return result;
}

/** Least-squares polynomial coefficients (ascending powers). */
function polyFit(
  xs: readonly number[],
  ys: readonly number[],
  degree: number,
): number[] | null {
  const size = degree + 1;
  const matrix: number[][] = Array.from({ length: size }, () =>
    new Array<number>(size).fill(0),
  );
  const vector = new Array<number>(size).fill(0);
  for (let i = 0; i < xs.length; i++) {
    const powers = [1];
    for (let p = 1; p <= degree * 2; p++) powers.push(powers[p - 1] * xs[i]);
    for (let row = 0; row < size; row++) {
      vector[row] += powers[row] * ys[i];
      for (let col = 0; col < size; col++) {
        matrix[row][col] += powers[row + col];
      }
    }
  }
  return solve(matrix, vector);
}

function rSquared(
  ys: readonly number[],
  fitted: readonly (number | null)[],
): number | null {
  if (ys.length < 2) return null;
  const mean = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  let total = 0;
  let residual = 0;
  for (let i = 0; i < ys.length; i++) {
    const estimate = fitted[i];
    if (estimate === null) return null;
    total += (ys[i] - mean) ** 2;
    residual += (ys[i] - estimate) ** 2;
  }
  return total === 0 ? (residual === 0 ? 1 : null) : 1 - residual / total;
}

/**
 * Fits a trendline through `(x, y)` points (null y = skipped). Fewer than
 * two usable points (or a degenerate system) returns `null`. Exponential
 * fits skip `y ≤ 0`, logarithmic fits skip `x ≤ 0`.
 */
export function ogeTrendline(
  points: readonly { readonly x: number; readonly y: number | null }[],
  type: OgeTrendlineType,
  options: OgeTrendlineFitOptions = {},
): OgeTrendlineFit | null {
  const usable = points
    .filter(
      (point): point is { x: number; y: number } =>
        point.y !== null &&
        Number.isFinite(point.y) &&
        Number.isFinite(point.x),
    )
    .sort((a, b) => a.x - b.x);
  const domain = usable.filter((point) =>
    type === 'exponential'
      ? point.y > 0
      : type === 'logarithmic'
        ? point.x > 0
        : true,
  );
  if (domain.length < 2) return null;
  const xs = domain.map((point) => point.x);
  const ys = domain.map((point) => point.y);

  let coefficients: number[];
  let predict: (x: number) => number | null;
  if (type === 'movingAverage') {
    const period = Math.max(2, Math.floor(options.period ?? 3));
    const averaged = ogeSma(ys, period);
    const line = domain
      .map((point, index) => ({ x: point.x, y: averaged[index] }))
      .filter((point): point is { x: number; y: number } => point.y !== null);
    const lookup = new Map(line.map((point) => [point.x, point.y] as const));
    return {
      type,
      coefficients: [],
      r2: null,
      predict: (x) => lookup.get(x) ?? null,
      points: line,
    };
  }
  if (type === 'polynomial') {
    // normalise x into [0, 1] so epoch-ms arguments stay well-conditioned
    const min = xs[0];
    const span = xs[xs.length - 1] - min || 1;
    const degree = Math.min(6, Math.max(2, Math.floor(options.order ?? 2)));
    const fit = polyFit(
      xs.map((x) => (x - min) / span),
      ys,
      Math.min(degree, domain.length - 1),
    );
    if (fit === null) return null;
    coefficients = fit;
    predict = (x) => {
      const t = (x - min) / span;
      let y = 0;
      for (let p = fit.length - 1; p >= 0; p--) y = y * t + fit[p];
      return y;
    };
  } else if (type === 'exponential') {
    const fit = polyFit(
      xs,
      ys.map((y) => Math.log(y)),
      1,
    );
    if (fit === null) return null;
    const a = Math.exp(fit[0]);
    const b = fit[1];
    coefficients = [a, b];
    predict = (x) => a * Math.exp(b * x);
  } else if (type === 'logarithmic') {
    const fit = polyFit(
      xs.map((x) => Math.log(x)),
      ys,
      1,
    );
    if (fit === null) return null;
    coefficients = fit;
    predict = (x) => (x > 0 ? fit[0] + fit[1] * Math.log(x) : null);
  } else {
    const fit = polyFit(xs, ys, 1);
    if (fit === null) return null;
    coefficients = fit;
    predict = (x) => fit[0] + fit[1] * x;
  }
  const fitted = xs.map((x) => predict(x));
  return {
    type,
    coefficients,
    r2: rSquared(ys, fitted),
    predict,
    points: xs
      .map((x, index) => ({ x, y: fitted[index] }))
      .filter((point): point is { x: number; y: number } => point.y !== null),
  };
}

/* ------------------------------------------------------------------ */
/* box plot                                                            */
/* ------------------------------------------------------------------ */

/** Five-number summary plus the mean and the outliers. */
export interface OgeBoxStats {
  /** Lower whisker end. */
  readonly low: number;
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  /** Upper whisker end. */
  readonly high: number;
  readonly mean: number;
  readonly outliers: readonly number[];
}

/** Quantile by linear interpolation between closest ranks (Excel `.INC`). */
export function ogeQuantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, q));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/**
 * Box statistics of raw values. `'tukey'` whiskers (default) end at the
 * last datum within 1.5 × IQR of the box and report the rest as outliers;
 * `'minMax'` whiskers span the full range. Empty input → `null`.
 */
export function ogeBoxStats(
  input: OgeAnalyticsInput,
  whiskers: 'tukey' | 'minMax' = 'tukey',
): OgeBoxStats | null {
  const sorted = valuesOf(input)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const q1 = ogeQuantile(sorted, 0.25);
  const median = ogeQuantile(sorted, 0.5);
  const q3 = ogeQuantile(sorted, 0.75);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  if (whiskers === 'minMax') {
    return {
      low: sorted[0],
      q1,
      median,
      q3,
      high: sorted[sorted.length - 1],
      mean,
      outliers: [],
    };
  }
  const fence = (q3 - q1) * 1.5;
  const inside = sorted.filter(
    (value) => value >= q1 - fence && value <= q3 + fence,
  );
  return {
    low: inside[0] ?? q1,
    q1,
    median,
    q3,
    high: inside[inside.length - 1] ?? q3,
    mean,
    outliers: sorted.filter(
      (value) => value < q1 - fence || value > q3 + fence,
    ),
  };
}

/* ------------------------------------------------------------------ */
/* histogram                                                           */
/* ------------------------------------------------------------------ */

/**
 * Histogram binning: an explicit `thresholds` list (bin edges, ascending),
 * a fixed `width`, or a target `count` (default: Sturges' rule) rounded to
 * a 1-2-5 width so edges land on readable numbers.
 */
export interface OgeHistogramBinning {
  readonly count?: number;
  readonly width?: number;
  readonly thresholds?: readonly number[];
}

export interface OgeHistogramBin {
  /** Inclusive lower edge. */
  readonly start: number;
  /** Exclusive upper edge (inclusive for the last bin). */
  readonly end: number;
  readonly count: number;
  /** Input positions that fell into the bin. */
  readonly indexes: readonly number[];
}

export function ogeHistogramBins(
  input: OgeAnalyticsInput,
  binning: OgeHistogramBinning = {},
): OgeHistogramBin[] {
  const values = valuesOf(input);
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return [];
  const min = Math.min(...present);
  const max = Math.max(...present);
  let edges: number[];
  if (binning.thresholds !== undefined && binning.thresholds.length >= 2) {
    edges = [...binning.thresholds].sort((a, b) => a - b);
  } else {
    const width =
      binning.width !== undefined && binning.width > 0
        ? binning.width
        : max === min
          ? 1
          : niceStep(
              max - min,
              Math.max(
                1,
                binning.count ?? Math.ceil(Math.log2(present.length) + 1),
              ),
            );
    const first = Math.floor(min / width) * width;
    edges = [first];
    while (edges.length < 2 || edges[edges.length - 1] < max) {
      edges.push(first + edges.length * width);
      if (edges.length > 10_000) break;
    }
  }
  const bins = edges.slice(0, -1).map((start, index) => ({
    start,
    end: edges[index + 1],
    count: 0,
    indexes: [] as number[],
  }));
  values.forEach((value, index) => {
    if (value === null) return;
    const last = bins.length - 1;
    for (let b = 0; b <= last; b++) {
      const bin = bins[b];
      const inBin =
        value >= bin.start &&
        (value < bin.end || (b === last && value === bin.end));
      if (inBin) {
        bin.count++;
        bin.indexes.push(index);
        return;
      }
    }
  });
  return bins;
}
