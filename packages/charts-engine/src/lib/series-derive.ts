/**
 * Derived series — the data-stage pass that turns the analytic series
 * types into plain points the scene can draw: waterfall running sums,
 * box-plot statistics, histogram bins, pareto ordering and cumulative
 * shares, technical indicators, trendline fits and the per-point
 * `customizePoint` overrides. Pure; runs once per data change.
 */
import {
  ogeBollingerBands,
  ogeBoxStats,
  ogeEma,
  ogeHistogramBins,
  ogeMacd,
  ogeRsi,
  ogeSma,
  ogeTrendline,
  type OgeTrendlineFit,
} from './analytics';
import {
  chartFieldAccessor,
  chartNumber,
  type ChartPoint,
  type ChartPointStyle,
  type ChartSeries,
  type ChartSeriesInput,
  type ChartTrendlineOptions,
} from './series-model';
import type { StackedValue } from './series-layout';
import { formatOgeChartMessage, type OgeChartsMessages } from './charts-config';

/**
 * Category order when a pareto series is present: its categories sorted by
 * their (summed) value, descending; categories of other series follow in
 * first-appearance order. `null` = keep the data order.
 */
export function paretoCategoryOrder<T>(
  data: readonly T[],
  inputs: readonly ChartSeriesInput<T>[],
  categories: readonly unknown[],
): unknown[] | null {
  const pareto = inputs.find((input) => input.type === 'pareto');
  if (pareto === undefined) return null;
  const argOf = chartFieldAccessor(pareto.argumentField);
  const valueOf = chartFieldAccessor(pareto.valueField);
  if (argOf === null || valueOf === null) return null;
  const totals = new Map<unknown, number>();
  for (const item of data) {
    const argument = argOf(item);
    if (argument === undefined || argument === null) continue;
    const value = chartNumber(valueOf(item)) ?? 0;
    totals.set(argument, (totals.get(argument) ?? 0) + value);
  }
  const sorted = [...totals.keys()].sort(
    (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0),
  );
  const rest = categories.filter((category) => !totals.has(category));
  return [...sorted, ...rest];
}

/** What the derive pass needs besides the series. */
export interface ChartDeriveContext<T> {
  readonly dataSource: readonly T[];
  readonly messages: OgeChartsMessages;
}

/** The derived series plus the extra geometry/analytics they carry. */
export interface ChartDerived<T> {
  readonly seriesList: readonly ChartSeries<T>[];
  /** Waterfall base → top per point (null for other series). */
  readonly waterfallStacks: readonly (
    readonly (StackedValue | null)[] | null
  )[];
  /** Trendline fit per series (null = none). */
  readonly trends: readonly (OgeTrendlineFit | null)[];
}

const withName = <T>(
  series: ChartSeries<T>,
  points: readonly ChartPoint<T>[],
  name?: string,
): ChartSeries<T> => ({
  ...series,
  name: series.input.name ?? name ?? series.name,
  points,
});

function summaryKind(raw: unknown): 'total' | 'intermediate' | null {
  if (raw === true || raw === 'total') return 'total';
  if (raw === 'intermediate' || raw === 'intermediateSum') {
    return 'intermediate';
  }
  return null;
}

function deriveWaterfall<T>(series: ChartSeries<T>): {
  points: ChartPoint<T>[];
  stacks: (StackedValue | null)[];
} {
  const summaryOf = chartFieldAccessor(series.input.summaryField);
  let running = 0;
  let lastSubtotal = 0;
  const stacks: (StackedValue | null)[] = [];
  const points = series.points.map((point): ChartPoint<T> => {
    const summary =
      summaryOf === null ? null : summaryKind(summaryOf(point.source));
    if (summary === 'total') {
      stacks.push({ base: 0, top: running });
      lastSubtotal = running;
      return {
        ...point,
        value: running,
        kind: 'total',
        extra: { total: running },
      };
    }
    if (summary === 'intermediate') {
      const value = running - lastSubtotal;
      stacks.push({ base: lastSubtotal, top: running });
      lastSubtotal = running;
      return {
        ...point,
        value,
        kind: 'intermediate',
        extra: { total: running },
      };
    }
    if (point.value === null) {
      stacks.push(null);
      return point;
    }
    const base = running;
    running += point.value;
    stacks.push({ base, top: running });
    return {
      ...point,
      kind: point.value >= 0 ? 'up' : 'down',
      extra: { total: running },
    };
  });
  return { points, stacks };
}

function deriveBoxPlot<T>(series: ChartSeries<T>): ChartPoint<T>[] {
  const input = series.input;
  const valuesOf = chartFieldAccessor(input.valuesField);
  const q1Of = chartFieldAccessor(input.q1Field);
  const medianOf = chartFieldAccessor(input.medianField);
  const q3Of = chartFieldAccessor(input.q3Field);
  const outliersOf = chartFieldAccessor(input.outliersField);
  return series.points.map((point): ChartPoint<T> => {
    if (valuesOf !== null) {
      const raw = valuesOf(point.source);
      const stats = Array.isArray(raw)
        ? ogeBoxStats(raw as readonly number[], input.whiskers ?? 'tukey')
        : null;
      if (stats === null) {
        return { ...point, value: null, low: null, high: null };
      }
      return {
        ...point,
        value: stats.median,
        low: stats.low,
        high: stats.high,
        extra: {
          q1: stats.q1,
          median: stats.median,
          q3: stats.q3,
          mean: stats.mean,
        },
        outliers: stats.outliers,
      };
    }
    const q1 = q1Of === null ? null : chartNumber(q1Of(point.source));
    const median =
      medianOf === null ? point.value : chartNumber(medianOf(point.source));
    const q3 = q3Of === null ? null : chartNumber(q3Of(point.source));
    const rawOutliers = outliersOf === null ? null : outliersOf(point.source);
    const outliers = Array.isArray(rawOutliers)
      ? rawOutliers
          .map((value) => chartNumber(value))
          .filter((value): value is number => value !== null)
      : [];
    if (q1 === null || q3 === null || median === null) {
      return { ...point, value: null };
    }
    return {
      ...point,
      value: median,
      low: point.low ?? q1,
      high: point.high ?? q3,
      extra: { q1, median, q3, mean: null },
      outliers,
    };
  });
}

function deriveHistogram<T>(
  series: ChartSeries<T>,
  data: readonly T[],
): ChartPoint<T>[] {
  const valueOf = chartFieldAccessor(series.input.valueField);
  if (valueOf === null) return [];
  const bins = ogeHistogramBins(
    data.map((item) => chartNumber(valueOf(item))),
    series.input.bins,
  );
  return bins.map((bin, index): ChartPoint<T> => {
    const center = (bin.start + bin.end) / 2;
    return {
      argument: center,
      argNumeric: center,
      value: bin.count,
      value2: null,
      size: null,
      open: null,
      high: null,
      low: null,
      close: null,
      // a bin has no single source item: the first one stands in
      source: data[bin.indexes[0] ?? -1] as T,
      index,
      extra: { binStart: bin.start, binEnd: bin.end },
    };
  });
}

function derivePareto<T>(series: ChartSeries<T>): ChartPoint<T>[] {
  const order = series.points
    .map((point, index) => ({ point, index }))
    .filter((entry) => entry.point.argNumeric !== null)
    .sort((a, b) => (a.point.argNumeric ?? 0) - (b.point.argNumeric ?? 0));
  const total = order.reduce(
    (sum, entry) => sum + Math.max(0, entry.point.value ?? 0),
    0,
  );
  const cumulative = new Map<number, number>();
  let running = 0;
  for (const entry of order) {
    running += Math.max(0, entry.point.value ?? 0);
    cumulative.set(entry.index, total > 0 ? running / total : 0);
  }
  return series.points.map((point, index) =>
    cumulative.has(index)
      ? { ...point, extra: { cumulative: cumulative.get(index) ?? null } }
      : point,
  );
}

function deriveIndicator<T>(
  series: ChartSeries<T>,
  messages: OgeChartsMessages,
): ChartSeries<T> {
  const options = series.input.indicator ?? { type: 'sma' };
  const closeOf = chartFieldAccessor(series.input.closeField);
  const source = series.points.map((point) =>
    series.input.valueField === undefined && closeOf !== null
      ? chartNumber(closeOf(point.source))
      : point.value,
  );
  const words = messages.values;
  const format = (template: string, tokens: Record<string, number>): string =>
    formatOgeChartMessage(
      template,
      Object.fromEntries(
        Object.entries(tokens).map(([key, value]) => [key, String(value)]),
      ),
    );
  if (options.type === 'bollinger') {
    const period = options.period ?? 20;
    const stdDev = options.stdDev ?? 2;
    const bands = ogeBollingerBands(source, period, stdDev);
    return withName(
      series,
      series.points.map((point, index) => ({
        ...point,
        value: bands[index].middle,
        extra: { upper: bands[index].upper, lower: bands[index].lower },
      })),
      format(words.bollinger, { period, stdDev }),
    );
  }
  if (options.type === 'macd') {
    const fast = options.fastPeriod ?? 12;
    const slow = options.slowPeriod ?? 26;
    const signal = options.signalPeriod ?? 9;
    const macd = ogeMacd(source, fast, slow, signal);
    return withName(
      series,
      series.points.map((point, index) => ({
        ...point,
        value: macd[index].macd,
        extra: {
          signal: macd[index].signal,
          histogram: macd[index].histogram,
        },
      })),
      format(words.macd, { fast, slow, signal }),
    );
  }
  const period = options.period ?? (options.type === 'rsi' ? 14 : 10);
  const values =
    options.type === 'ema'
      ? ogeEma(source, period)
      : options.type === 'rsi'
        ? ogeRsi(source, period)
        : ogeSma(source, period);
  return withName(
    series,
    series.points.map((point, index) => ({ ...point, value: values[index] })),
    format(
      options.type === 'ema'
        ? words.ema
        : options.type === 'rsi'
          ? words.rsi
          : words.sma,
      { period },
    ),
  );
}

/** The trendline options of a series, normalized (`null` = none). */
export function chartTrendlineOptions(
  input: ChartSeriesInput<unknown>,
): ChartTrendlineOptions | null {
  const trendline = input.trendline;
  if (trendline === undefined) return null;
  return typeof trendline === 'string' ? { type: trendline } : trendline;
}

function applyCustomization<T>(
  series: ChartSeries<T>,
  seriesIndex: number,
): ChartSeries<T> {
  const customize = series.input.customizePoint;
  if (customize === undefined) return series;
  return {
    ...series,
    points: series.points.map((point, pointIndex) => {
      const result = customize({
        seriesIndex,
        seriesName: series.name,
        pointIndex,
        argument: point.argument,
        value: point.value,
        source: point.source,
      });
      if (result === null || result === undefined) return point;
      const style: ChartPointStyle = { ...point.style, ...result };
      return { ...point, style };
    }),
  };
}

/** The derive pass over freshly built series. */
export function deriveChartSeries<T>(
  seriesList: readonly ChartSeries<T>[],
  context: ChartDeriveContext<T>,
): ChartDerived<T> {
  const waterfallStacks: ((StackedValue | null)[] | null)[] = [];
  const derived = seriesList.map((series, seriesIndex) => {
    waterfallStacks[seriesIndex] = null;
    let next: ChartSeries<T> = series;
    switch (series.type) {
      case 'waterfall': {
        const result = deriveWaterfall(series);
        waterfallStacks[seriesIndex] = result.stacks;
        next = withName(series, result.points);
        break;
      }
      case 'boxPlot':
        next = withName(series, deriveBoxPlot(series));
        break;
      case 'histogram':
        next = withName(series, deriveHistogram(series, context.dataSource));
        break;
      case 'pareto':
        next = withName(series, derivePareto(series));
        break;
      case 'indicator':
        next = deriveIndicator(series, context.messages);
        break;
      default:
        break;
    }
    return applyCustomization(next, seriesIndex);
  });
  const trends = derived.map((series) => {
    const options = chartTrendlineOptions(
      series.input as ChartSeriesInput<unknown>,
    );
    if (options === null) return null;
    return ogeTrendline(
      series.points
        .filter((point) => point.argNumeric !== null)
        .map((point) => ({ x: point.argNumeric as number, y: point.value })),
      options.type,
      { order: options.order, period: options.period },
    );
  });
  return { seriesList: derived, waterfallStacks, trends };
}
