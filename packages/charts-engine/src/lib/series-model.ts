/**
 * Series normalization and point extraction: field mapping (names with
 * dotted paths, or getter functions — core `createFieldAccessor`),
 * argument resolution per axis kind (number / epoch ms / category index)
 * and the empty-value policy (null/NaN → gap). Pure.
 */
import { createFieldAccessor, toLocalDate } from '@oge-ui/core';
import type { ChartScaleKind } from './scale';
import type { OgeHistogramBinning, OgeTrendlineType } from './analytics';

export type ChartSeriesType =
  | 'line'
  | 'spline'
  | 'stepLine'
  | 'area'
  | 'splineArea'
  | 'stepArea'
  | 'stackedArea'
  | 'fullStackedArea'
  | 'bar'
  | 'stackedBar'
  | 'fullStackedBar'
  | 'rangeBar'
  | 'scatter'
  | 'bubble'
  | 'rangeArea'
  | 'candlestick'
  | 'stackedLine'
  | 'fullStackedLine'
  | 'stackedSplineArea'
  | 'fullStackedSplineArea'
  | 'waterfall'
  | 'boxPlot'
  | 'histogram'
  | 'pareto'
  | 'ohlc'
  | 'indicator'
  /** Polar charts only: concentric rings whose arc length is the value. */
  | 'radialBar';

export type ChartFieldExpr<T> = string | ((item: T) => unknown);

/**
 * Where a data label sits. Bars: `'outside'` past the bar end (default),
 * `'inside'`/`'insideEnd'` just inside the end, `'center'`, `'insideBase'`
 * at the base. Points (line/scatter/bubble/polar): `'outside'` above,
 * `'inside'`/`'insideBase'` below, `'center'` on the point. Pie:
 * `'outside'` in two columns with connectors (default), `'inside'`/
 * `'center'` mid-ring, `'insideEnd'` near the rim, `'insideBase'` near the
 * hole.
 */
export type ChartLabelPosition =
  'inside' | 'outside' | 'center' | 'insideEnd' | 'insideBase';

/** What a label `format` callback (and a label template) receives. */
export interface ChartLabelInfo<T = unknown> {
  readonly seriesIndex: number;
  readonly seriesName: string;
  readonly pointIndex: number;
  readonly argument: unknown;
  readonly value: number | null;
  /**
   * Share of the whole, 0–1: the pie slice fraction, the full-stacked
   * share, the pareto cumulative share; `null` elsewhere.
   */
  readonly percent: number | null;
  readonly source: T | undefined;
  /** The default text (SI-formatted value; pie: the argument). */
  readonly text: string;
}

/** Data labels of a series (cartesian, pie, polar). */
export interface ChartLabelOptions<T = unknown> {
  readonly visible?: boolean;
  readonly position?: ChartLabelPosition;
  /** Custom text; wins over the default formatting. */
  readonly format?: (info: ChartLabelInfo<T>) => string;
  /** Label zero values too. Default true. */
  readonly showForZero?: boolean;
  /** Pie outside labels: draw the connector lines. Default true. */
  readonly connector?: boolean;
  /**
   * Overlap resolution: `'hide'` (default) drops a label that would cover
   * an earlier one, `'shift'` nudges it clear first (and keeps it inside
   * the plot), `'none'` keeps every label.
   */
  readonly overlap?: 'hide' | 'shift' | 'none';
}

/** Per-point overrides — `colorField` and `customizePoint` produce them. */
export interface ChartPointStyle {
  readonly color?: string;
  readonly label?: { readonly visible?: boolean; readonly text?: string };
  readonly marker?: { readonly visible?: boolean; readonly size?: number };
  /**
   * A word for what the colour means (`'over budget'`) — appended to the
   * tooltip, the announcement and the screen-reader table cell, so colour
   * is never the only channel.
   */
  readonly description?: string;
}

/** What `customizePoint` receives. */
export interface ChartPointInfo<T = unknown> {
  readonly seriesIndex: number;
  readonly seriesName: string;
  readonly pointIndex: number;
  readonly argument: unknown;
  readonly value: number | null;
  readonly source: T | undefined;
}

/** Per-point customization hook (dx `customizePoint`). */
export type ChartPointCustomizer<T = unknown> = (
  info: ChartPointInfo<T>,
) => ChartPointStyle | null | undefined | void;

/** A regression / smoothing line drawn over a series. */
export interface ChartTrendlineOptions {
  readonly type: OgeTrendlineType;
  /** Polynomial degree (2–6). Default 2. */
  readonly order?: number;
  /** Moving-average window. Default 3. */
  readonly period?: number;
  /** Default: the series colour. */
  readonly color?: string;
  readonly width?: number;
  /** Default `'dash'`. */
  readonly dashStyle?: 'solid' | 'dash' | 'dot';
  /** Append the trend value and R² to the series' tooltip row. */
  readonly showR2?: boolean;
}

/** The technical indicator an `'indicator'` series computes. */
export interface ChartIndicatorOptions {
  readonly type: 'sma' | 'ema' | 'bollinger' | 'macd' | 'rsi';
  /** SMA/EMA/Bollinger/RSI window. Defaults: 20 (Bollinger), 14 (RSI), 10. */
  readonly period?: number;
  /** Bollinger band width in standard deviations. Default 2. */
  readonly stdDev?: number;
  /** MACD periods. Defaults 12 / 26 / 9. */
  readonly fastPeriod?: number;
  readonly slowPeriod?: number;
  readonly signalPeriod?: number;
  /** Horizontal reference levels (RSI default `[30, 70]`). */
  readonly levels?: readonly number[];
}

export interface ChartSeriesInput<T = unknown> {
  readonly type: ChartSeriesType;
  readonly valueField?: ChartFieldExpr<T>;
  readonly argumentField?: ChartFieldExpr<T>;
  readonly name?: string;
  readonly color?: string;
  /** Index into the `valueAxis` array (multi-axis charts). */
  readonly axis?: number;
  /** Stack group of stacked series; unset = one shared default stack. */
  readonly stack?: string;
  readonly dashStyle?: 'solid' | 'dash' | 'dot';
  readonly width?: number;
  readonly opacity?: number;
  readonly showInLegend?: boolean;
  /** Initially hidden (the legend can re-show it). */
  readonly visible?: boolean;
  /** Value labels next to the points/bars — shorthand for `label.visible`. */
  readonly showLabels?: boolean;
  /** Data labels: position, format, zero handling, overlap resolution. */
  readonly label?: ChartLabelOptions<T>;
  /** Per-point colour read from the data (any CSS colour). */
  readonly colorField?: ChartFieldExpr<T>;
  /** Per-point colour / label / marker overrides (wins over `colorField`). */
  readonly customizePoint?: ChartPointCustomizer<T>;
  /** A trendline over the series: a type, or the full options. */
  readonly trendline?: OgeTrendlineType | ChartTrendlineOptions;
  /** `type: 'indicator'`: what to compute from `valueField` (or `closeField`). */
  readonly indicator?: ChartIndicatorOptions;
  /**
   * waterfall: marks sum points — `'total'` (from zero to the running total)
   * or `'intermediate'` (the subtotal since the previous intermediate sum).
   * `true` means `'total'`.
   */
  readonly summaryField?: ChartFieldExpr<T>;
  /** waterfall colours of rising / falling / sum bars. */
  readonly upColor?: string;
  readonly downColor?: string;
  readonly totalColor?: string;
  /** waterfall: dashed connectors between consecutive bars. Default true. */
  readonly showConnectors?: boolean;
  /** boxPlot from raw values: the field holding a `number[]` per item. */
  readonly valuesField?: ChartFieldExpr<T>;
  /** boxPlot precomputed quartiles (whiskers: `lowField` / `highField`). */
  readonly q1Field?: ChartFieldExpr<T>;
  readonly medianField?: ChartFieldExpr<T>;
  readonly q3Field?: ChartFieldExpr<T>;
  /** boxPlot precomputed outliers: a `number[]` per item. */
  readonly outliersField?: ChartFieldExpr<T>;
  /** boxPlot whiskers from raw values. Default `'tukey'` (1.5 × IQR). */
  readonly whiskers?: 'tukey' | 'minMax';
  /** histogram binning of `valueField`: `count`, `width` or `thresholds`. */
  readonly bins?: OgeHistogramBinning;
  /**
   * pareto: the value axis of the cumulative-% line (declare it with
   * `position: 'end'`); unset or missing → an implicit 0–100% scale.
   */
  readonly cumulativeAxis?: number;
  readonly cumulativeColor?: string;
  /** bubble: the field driving the bubble radius. */
  readonly sizeField?: ChartFieldExpr<T>;
  /** rangeArea / rangeBar bounds. */
  readonly value1Field?: ChartFieldExpr<T>;
  readonly value2Field?: ChartFieldExpr<T>;
  /** candlestick / ohlc OHLC; boxPlot whiskers (`lowField` / `highField`). */
  readonly openField?: ChartFieldExpr<T>;
  readonly highField?: ChartFieldExpr<T>;
  readonly lowField?: ChartFieldExpr<T>;
  readonly closeField?: ChartFieldExpr<T>;
}

/** Derived numbers a point of an analytic series carries. */
export interface ChartPointExtra {
  /** boxPlot quartiles and mean. */
  readonly q1?: number | null;
  readonly median?: number | null;
  readonly q3?: number | null;
  readonly mean?: number | null;
  /** histogram bin edges. */
  readonly binStart?: number | null;
  readonly binEnd?: number | null;
  /** pareto running share, 0–1. */
  readonly cumulative?: number | null;
  /** Bollinger bands. */
  readonly upper?: number | null;
  readonly lower?: number | null;
  /** MACD signal line and histogram. */
  readonly signal?: number | null;
  readonly histogram?: number | null;
  /** waterfall running total after the point. */
  readonly total?: number | null;
}

/** One extracted data point (values may be null → gap). */
export interface ChartPoint<T = unknown> {
  readonly argument: unknown;
  /** Numeric position on the argument axis; null = unplottable. */
  readonly argNumeric: number | null;
  readonly value: number | null;
  /** rangeArea / rangeBar second bound. */
  readonly value2: number | null;
  /** bubble size value. */
  readonly size: number | null;
  /** candlestick extras. */
  readonly open: number | null;
  readonly high: number | null;
  readonly low: number | null;
  readonly close: number | null;
  readonly source: T;
  readonly index: number;
  /** Per-point overrides (`colorField` / `customizePoint`). */
  readonly style?: ChartPointStyle;
  /** Derived numbers of the analytic series. */
  readonly extra?: ChartPointExtra;
  /** boxPlot outliers. */
  readonly outliers?: readonly number[];
  /** Semantic sub-kind: waterfall `'up' | 'down' | 'intermediate' | 'total'`. */
  readonly kind?: 'up' | 'down' | 'intermediate' | 'total';
}

export interface ChartSeries<T = unknown> {
  readonly input: ChartSeriesInput<T>;
  readonly type: ChartSeriesType;
  readonly name: string;
  readonly points: readonly ChartPoint<T>[];
}

/** Types drawn as slotted bars inside the category band. */
export function isBarType(type: ChartSeriesType): boolean {
  return (
    type === 'bar' ||
    type === 'stackedBar' ||
    type === 'fullStackedBar' ||
    type === 'rangeBar' ||
    type === 'waterfall' ||
    type === 'pareto' ||
    type === 'boxPlot'
  );
}

export function isStackedType(type: ChartSeriesType): boolean {
  return (
    type === 'stackedBar' ||
    type === 'fullStackedBar' ||
    type === 'stackedArea' ||
    type === 'fullStackedArea' ||
    type === 'stackedLine' ||
    type === 'fullStackedLine' ||
    type === 'stackedSplineArea' ||
    type === 'fullStackedSplineArea'
  );
}

/** OHLC-shaped types: `value` carries the high. */
export function isFinancialType(type: ChartSeriesType): boolean {
  return type === 'candlestick' || type === 'ohlc';
}

/** Types whose value axis always includes zero (bars, areas, counts). */
export function isZeroBasedType(type: ChartSeriesType): boolean {
  return (
    (isBarType(type) && type !== 'boxPlot') ||
    type === 'area' ||
    type === 'histogram'
  );
}

/** Field expression → accessor (`null` when unset). */
export function chartFieldAccessor<T>(
  expr: ChartFieldExpr<T> | undefined,
): ((item: T) => unknown) | null {
  if (expr === undefined) return null;
  return typeof expr === 'string' ? createFieldAccessor<T>(expr) : expr;
}

const toAccessor = chartFieldAccessor;

/** A raw field value as a finite number, else `null`. */
export function chartNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === 'string' && raw !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const toNumber = chartNumber;

/** Argument → numeric axis position for the given axis kind. */
export function numericArgument(
  argument: unknown,
  kind: ChartScaleKind,
  categoryIndex: ReadonlyMap<unknown, number>,
): number | null {
  if (kind === 'category') return categoryIndex.get(argument) ?? null;
  if (kind === 'time') {
    if (argument instanceof Date) return argument.getTime();
    if (typeof argument === 'string') {
      const date = toLocalDate(argument);
      return date === null ? null : date.getTime();
    }
    return typeof argument === 'number' ? argument : null;
  }
  return toNumber(argument);
}

/**
 * Categories in first-appearance order across every series (dx parity:
 * the union of arguments defines the category axis).
 */
export function collectCategories<T>(
  data: readonly T[],
  seriesInputs: readonly ChartSeriesInput<T>[],
): unknown[] {
  const seen = new Set<unknown>();
  const categories: unknown[] = [];
  for (const input of seriesInputs) {
    const argOf = toAccessor(input.argumentField) ?? (() => undefined);
    for (const item of data) {
      const argument = argOf(item);
      if (argument === undefined || argument === null) continue;
      if (!seen.has(argument)) {
        seen.add(argument);
        categories.push(argument);
      }
    }
  }
  return categories;
}

function colorStyle<T>(
  colorOf: ((item: T) => unknown) | null,
  item: T,
): { style?: ChartPointStyle } {
  if (colorOf === null) return {};
  const color = colorOf(item);
  return typeof color === 'string' && color !== '' ? { style: { color } } : {};
}

/** Extracts and normalizes one series' points. */
export function buildSeries<T>(
  data: readonly T[],
  input: ChartSeriesInput<T>,
  seriesIndex: number,
  axisKind: ChartScaleKind,
  categoryIndex: ReadonlyMap<unknown, number>,
): ChartSeries<T> {
  const argOf = toAccessor(input.argumentField);
  const valueOf = toAccessor(input.valueField);
  const value1Of = toAccessor(input.value1Field);
  const value2Of = toAccessor(input.value2Field);
  const sizeOf = toAccessor(input.sizeField);
  const openOf = toAccessor(input.openField);
  const highOf = toAccessor(input.highField);
  const lowOf = toAccessor(input.lowField);
  const closeOf = toAccessor(input.closeField);
  const colorOf = toAccessor(input.colorField);

  const points: ChartPoint<T>[] = data.map((item, index) => {
    const argument = argOf !== null ? argOf(item) : index;
    const low = lowOf !== null ? toNumber(lowOf(item)) : null;
    const high = highOf !== null ? toNumber(highOf(item)) : null;
    const value =
      input.type === 'rangeArea' || input.type === 'rangeBar'
        ? value2Of !== null
          ? toNumber(value2Of(item))
          : null
        : isFinancialType(input.type)
          ? high
          : valueOf !== null
            ? toNumber(valueOf(item))
            : null;
    return {
      argument,
      argNumeric: numericArgument(argument, axisKind, categoryIndex),
      value,
      value2: value1Of !== null ? toNumber(value1Of(item)) : null,
      size: sizeOf !== null ? toNumber(sizeOf(item)) : null,
      open: openOf !== null ? toNumber(openOf(item)) : null,
      high,
      low,
      close: closeOf !== null ? toNumber(closeOf(item)) : null,
      source: item,
      index,
      ...colorStyle(colorOf, item),
    };
  });
  return {
    input,
    type: input.type,
    name: input.name ?? `Series ${seriesIndex + 1}`,
    points,
  };
}

/** The numeric value extent of a series (stacking handled separately). */
export function seriesValueExtent<T>(
  series: ChartSeries<T>,
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const point of series.points) {
    const candidates =
      isFinancialType(series.type) || series.type === 'boxPlot'
        ? [point.low, point.high, ...(point.outliers ?? [])]
        : series.type === 'rangeArea' || series.type === 'rangeBar'
          ? [point.value2, point.value]
          : series.type === 'indicator' && point.extra !== undefined
            ? [point.value, ...Object.values(point.extra)]
            : [point.value];
    for (const value of candidates) {
      if (value === null) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  return min <= max ? { min, max } : null;
}
