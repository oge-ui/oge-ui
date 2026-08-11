/**
 * Series geometry that depends on other series: stack accumulation
 * (stacked / full-stacked, positive and negative branches separately) and
 * bar group slotting inside a category band. Pure.
 */
import {
  isBarType,
  isStackedType,
  type ChartSeries,
} from './series-model';

/** Per-point stacked segment: base → top in value space. */
export interface StackedValue {
  readonly base: number;
  readonly top: number;
}

/**
 * Stack accumulation for the stacked series among `seriesList`, keyed by
 * `stack` group. Positive values stack upward from 0, negatives downward
 * (dx behavior). `fullStackedBar` normalizes each argument's group total
 * to 1. Returns one array per series index (null for non-stacked series
 * or gap points).
 */
export function computeStacks<T>(
  seriesList: readonly ChartSeries<T>[],
): readonly (readonly (StackedValue | null)[] | null)[] {
  interface Bucket {
    positive: Map<unknown, number>;
    negative: Map<unknown, number>;
  }
  const buckets = new Map<string, Bucket>();
  const bucketOf = (key: string): Bucket => {
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = { positive: new Map(), negative: new Map() };
      buckets.set(key, bucket);
    }
    return bucket;
  };

  // full-stacked totals per argument per stack key
  const totals = new Map<string, Map<unknown, number>>();
  for (const series of seriesList) {
    if (series.type !== 'fullStackedBar') continue;
    const key = `${series.type}:${series.input.stack ?? ''}`;
    let byArg = totals.get(key);
    if (byArg === undefined) {
      byArg = new Map();
      totals.set(key, byArg);
    }
    for (const point of series.points) {
      if (point.value === null) continue;
      byArg.set(
        point.argument,
        (byArg.get(point.argument) ?? 0) + Math.abs(point.value),
      );
    }
  }

  return seriesList.map((series) => {
    if (!isStackedType(series.type)) return null;
    const key = `${series.type}:${series.input.stack ?? ''}`;
    const bucket = bucketOf(key);
    const fullTotals = totals.get(key);
    return series.points.map((point) => {
      if (point.value === null) return null;
      let value = point.value;
      if (series.type === 'fullStackedBar') {
        const total = fullTotals?.get(point.argument) ?? 0;
        value = total > 0 ? value / total : 0;
      }
      const side = value >= 0 ? bucket.positive : bucket.negative;
      const base = side.get(point.argument) ?? 0;
      const top = base + value;
      side.set(point.argument, top);
      return { base, top };
    });
  });
}

/** One bar series' slot inside the category band. */
export interface BarSlot {
  /** Offset of the slot's left edge from the band center, px. */
  readonly offsetPx: number;
  readonly widthPx: number;
}

/**
 * Bar slotting: plain `bar` series each get their own slot; stacked series
 * share one slot per stack group. `bandPx` is the full category band.
 */
export function computeBarSlots<T>(
  seriesList: readonly ChartSeries<T>[],
  bandPx: number,
  padding = 0.2,
): readonly (BarSlot | null)[] {
  const slotKeys: string[] = [];
  const keyOf = (series: ChartSeries<T>): string =>
    series.type === 'bar'
      ? `bar:${slotKeys.length}`
      : `stack:${series.input.stack ?? ''}`;
  const assigned = seriesList.map((series) => {
    if (!isBarType(series.type)) return null;
    const key = keyOf(series);
    let slot = slotKeys.indexOf(key);
    if (slot === -1) {
      slot = slotKeys.length;
      slotKeys.push(key);
    }
    return slot;
  });
  const slotCount = slotKeys.length;
  if (slotCount === 0) return seriesList.map(() => null);
  const usable = bandPx * (1 - padding);
  const widthPx = usable / slotCount;
  return assigned.map((slot) =>
    slot === null
      ? null
      : { offsetPx: -usable / 2 + slot * widthPx, widthPx },
  );
}

/** Candlestick geometry in value space (px mapping is the caller's). */
export interface CandleGeometry {
  readonly bodyTop: number;
  readonly bodyBottom: number;
  readonly wickTop: number;
  readonly wickBottom: number;
  readonly rising: boolean;
}

export function candleGeometry(point: {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
}): CandleGeometry | null {
  const { open, high, low, close } = point;
  if (open === null || high === null || low === null || close === null) {
    return null;
  }
  return {
    bodyTop: Math.max(open, close),
    bodyBottom: Math.min(open, close),
    wickTop: high,
    wickBottom: low,
    rising: close >= open,
  };
}
