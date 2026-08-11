/**
 * Series normalization and point extraction: field mapping (names with
 * dotted paths, or getter functions — core `createFieldAccessor`),
 * argument resolution per axis kind (number / epoch ms / category index)
 * and the empty-value policy (null/NaN → gap). Pure.
 */
import { createFieldAccessor, toLocalDate } from '@oge-ui/core';
import type { ChartScaleKind } from './scale';

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
  | 'candlestick';

export type ChartFieldExpr<T> = string | ((item: T) => unknown);

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
  /** Value labels next to the points/bars (small series only). */
  readonly showLabels?: boolean;
  /** bubble: the field driving the bubble radius. */
  readonly sizeField?: ChartFieldExpr<T>;
  /** rangeArea / rangeBar bounds. */
  readonly value1Field?: ChartFieldExpr<T>;
  readonly value2Field?: ChartFieldExpr<T>;
  /** candlestick OHLC. */
  readonly openField?: ChartFieldExpr<T>;
  readonly highField?: ChartFieldExpr<T>;
  readonly lowField?: ChartFieldExpr<T>;
  readonly closeField?: ChartFieldExpr<T>;
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
}

export interface ChartSeries<T = unknown> {
  readonly input: ChartSeriesInput<T>;
  readonly type: ChartSeriesType;
  readonly name: string;
  readonly points: readonly ChartPoint<T>[];
}

export function isBarType(type: ChartSeriesType): boolean {
  return (
    type === 'bar' ||
    type === 'stackedBar' ||
    type === 'fullStackedBar' ||
    type === 'rangeBar'
  );
}

export function isStackedType(type: ChartSeriesType): boolean {
  return (
    type === 'stackedBar' ||
    type === 'fullStackedBar' ||
    type === 'stackedArea' ||
    type === 'fullStackedArea'
  );
}

function toAccessor<T>(
  expr: ChartFieldExpr<T> | undefined,
): ((item: T) => unknown) | null {
  if (expr === undefined) return null;
  return typeof expr === 'string' ? createFieldAccessor<T>(expr) : expr;
}

function toNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === 'string' && raw !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

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

  const points: ChartPoint<T>[] = data.map((item, index) => {
    const argument = argOf !== null ? argOf(item) : index;
    const low = lowOf !== null ? toNumber(lowOf(item)) : null;
    const high = highOf !== null ? toNumber(highOf(item)) : null;
    const value =
      input.type === 'rangeArea' || input.type === 'rangeBar'
        ? value2Of !== null
          ? toNumber(value2Of(item))
          : null
        : input.type === 'candlestick'
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
      series.type === 'candlestick'
        ? [point.low, point.high]
        : series.type === 'rangeArea' || series.type === 'rangeBar'
          ? [point.value2, point.value]
          : [point.value];
    for (const value of candidates) {
      if (value === null) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  return min <= max ? { min, max } : null;
}
