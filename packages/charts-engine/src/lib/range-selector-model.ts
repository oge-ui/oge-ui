/**
 * The range selector's view model and window arithmetic — what
 * `<oge-range-selector>` and `<OgeRangeSelector>` draw and how their drags,
 * track clicks and handle keys move the window. Framework-free.
 */
import { toLocalDate } from '@oge-ui/core';
import {
  clampRange,
  createLinearScale,
  createTimeScale,
  type ChartRange,
  type ChartScale,
  type ChartScaleKind,
} from './scale';
import { baselineAreaPath, linePath, type PathPoint } from './path-builder';
import {
  buildSeries,
  type ChartSeries,
  type ChartSeriesInput,
} from './series-model';
import { numberFormat, timeTickFormatter } from './tick-format';
import { chartSeriesColor } from './cartesian-model';
import type {
  OgeChartsMessages,
  OgeChartsPeriodMessages,
} from './charts-config';
import { addChartDateInterval, isChartDateInterval } from './axis-scale';
import type { OgeChartCustomPeriod, OgeChartPeriod } from './charts-types';

/** Height of the tick-label strip under the mini chart. */
const H_SCALE = 18;

/**
 * `'time' | 'linear'`: explicit, or detected from the first argument (a
 * `Date` or a date string → time; anything else → linear).
 */
export function detectRangeSelectorKind<T>(
  dataSource: readonly T[],
  series: readonly ChartSeriesInput<T>[],
  explicit: 'time' | 'linear' | undefined,
): ChartScaleKind {
  if (explicit !== undefined) return explicit;
  for (const item of dataSource) {
    for (const seriesInput of series) {
      const expr = seriesInput.argumentField;
      if (expr === undefined) return 'linear';
      const raw =
        typeof expr === 'string'
          ? (item as Record<string, unknown>)[expr]
          : expr(item);
      if (raw === undefined || raw === null) continue;
      if (raw instanceof Date) return 'time';
      if (typeof raw === 'string' && toLocalDate(raw) !== null) return 'time';
      return 'linear';
    }
  }
  return 'linear';
}

export interface OgeRangeSelectorDataInput<T> {
  readonly dataSource: readonly T[];
  readonly series: readonly ChartSeriesInput<T>[];
  readonly scaleType?: 'time' | 'linear';
}

export interface OgeRangeSelectorData<T> {
  readonly kind: ChartScaleKind;
  readonly seriesList: readonly ChartSeries<T>[];
  /** The full argument extent. */
  readonly bounds: ChartRange;
}

export function buildRangeSelectorData<T>(
  input: OgeRangeSelectorDataInput<T>,
): OgeRangeSelectorData<T> {
  const kind = detectRangeSelectorKind(
    input.dataSource,
    input.series,
    input.scaleType,
  );
  const seriesList = input.series.map((entry, index) =>
    buildSeries(input.dataSource, entry, index, kind, new Map()),
  );
  let min = Infinity;
  let max = -Infinity;
  for (const series of seriesList) {
    for (const point of series.points) {
      if (point.argNumeric === null) continue;
      if (point.argNumeric < min) min = point.argNumeric;
      if (point.argNumeric > max) max = point.argNumeric;
    }
  }
  return {
    kind,
    seriesList,
    bounds: min <= max ? { min, max } : { min: 0, max: 1 },
  };
}

export interface OgeRangeSelectorSceneInput<T> {
  readonly data: OgeRangeSelectorData<T>;
  readonly palette?: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
}

export interface OgeRangeSelectorSeriesVm {
  readonly index: number;
  readonly color: string;
  readonly linePathD: string | null;
  readonly areaPathD: string | null;
}

export interface OgeRangeSelectorScene<T> {
  readonly data: OgeRangeSelectorData<T>;
  readonly locale: string | undefined;
  readonly width: number;
  readonly height: number;
  /** Height of the mini chart (the rest is the tick strip). */
  readonly plotH: number;
  readonly scale: ChartScale;
  readonly backgroundSeries: readonly OgeRangeSelectorSeriesVm[];
  readonly ticks: readonly { readonly px: number; readonly label: string }[];
}

export function buildRangeSelectorScene<T>(
  input: OgeRangeSelectorSceneInput<T>,
): OgeRangeSelectorScene<T> {
  const { data, locale } = input;
  const plotH = input.height - H_SCALE;
  const options = {
    min: data.bounds.min,
    max: data.bounds.max,
    rangePx: input.width,
  };
  const scale =
    data.kind === 'time'
      ? createTimeScale(options)
      : createLinearScale(options);

  let valueMin = Infinity;
  let valueMax = -Infinity;
  for (const series of data.seriesList) {
    for (const point of series.points) {
      if (point.value === null) continue;
      if (point.value < valueMin) valueMin = point.value;
      if (point.value > valueMax) valueMax = point.value;
    }
  }
  const backgroundSeries: OgeRangeSelectorSeriesVm[] = [];
  if (valueMin <= valueMax) {
    const valueScale = createLinearScale({
      min: Math.min(0, valueMin),
      max: valueMax,
      rangePx: plotH - 6,
      inverted: true,
    });
    data.seriesList.forEach((series, index) => {
      const points: PathPoint[] = series.points.map((point) => ({
        x: point.argNumeric === null ? 0 : scale.toPx(point.argNumeric),
        y:
          point.argNumeric === null || point.value === null
            ? null
            : valueScale.toPx(point.value) + 3,
      }));
      const isArea = series.type === 'area' || series.type === 'splineArea';
      backgroundSeries.push({
        index,
        color: chartSeriesColor(
          series as ChartSeries<unknown>,
          index,
          input.palette,
        ),
        linePathD: linePath(points) || null,
        areaPathD: isArea ? baselineAreaPath(points, plotH) || null : null,
      });
    });
  }

  const format =
    data.kind === 'time'
      ? timeTickFormatter(scale.tickUnit ?? 'day', locale)
      : (value: number): string => numberFormat(value, locale);
  const ticks = scale.ticks
    .filter((_, index, all) => index % Math.ceil(all.length / 8) === 0)
    .map((tick) => ({ px: scale.toPx(tick), label: format(tick) }));

  return {
    data,
    locale,
    width: input.width,
    height: input.height,
    plotH,
    scale,
    backgroundSeries,
    ticks,
  };
}

/** The window actually shown: `value` clamped into the bounds, or all of it. */
export function rangeSelectorEffective<T>(
  data: OgeRangeSelectorData<T>,
  value: ChartRange | null,
): ChartRange {
  return value === null ? data.bounds : clampRange(value, data.bounds);
}

/** The window's pixel edges. */
export function rangeSelectorWindowPx<T>(
  scene: OgeRangeSelectorScene<T>,
  effective: ChartRange,
): { readonly start: number; readonly end: number } {
  return {
    start: scene.scale.toPx(effective.min),
    end: scene.scale.toPx(effective.max),
  };
}

/** A handle's value text: a medium date on time axes, a number otherwise. */
export function rangeSelectorLabel(
  kind: ChartScaleKind,
  value: number,
  locale: string | undefined,
): string {
  return kind === 'time'
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
        new Date(value),
      )
    : numberFormat(value, locale);
}

/** A window about to be committed: clamped into the bounds, at least 1% wide. */
export function commitRangeSelection(
  range: ChartRange,
  bounds: ChartRange,
): ChartRange {
  return clampRange(range, bounds, (bounds.max - bounds.min) * 0.01);
}

/** A pixel drag distance in axis units. */
export function rangeSelectorDeltaValue(
  scale: ChartScale,
  deltaX: number,
): number {
  return scale.fromPx(deltaX) - scale.fromPx(0);
}

/** Dragging one handle: that edge moves, never past the other. */
export function rangeHandleDragRange(
  side: 'start' | 'end',
  startRange: ChartRange,
  deltaValue: number,
): ChartRange {
  return side === 'start'
    ? {
        min: Math.min(startRange.min + deltaValue, startRange.max),
        max: startRange.max,
      }
    : {
        min: startRange.min,
        max: Math.max(startRange.max + deltaValue, startRange.min),
      };
}

/** Dragging the window: both edges move together. */
export function rangeWindowDragRange(
  startRange: ChartRange,
  deltaValue: number,
): ChartRange {
  return { min: startRange.min + deltaValue, max: startRange.max + deltaValue };
}

/** A track click: the same-width window centered at the clicked value. */
export function rangeCenteredAt(range: ChartRange, center: number): ChartRange {
  const span = range.max - range.min;
  return { min: center - span / 2, max: center + span / 2 };
}

/** The live-region text after a handle key moved the window. */
export function rangeSelectorAnnouncement(
  messages: OgeChartsMessages,
  kind: ChartScaleKind,
  effective: ChartRange,
  locale: string | undefined,
): string {
  return `${messages.aria.rangeWindow}: ${rangeSelectorLabel(kind, effective.min, locale)} – ${rangeSelectorLabel(kind, effective.max, locale)}`;
}

/* ------------------------------------------------------------------ */
/* period buttons                                                      */
/* ------------------------------------------------------------------ */

/** One rendered period button. */
export interface OgeRangeSelectorPeriodVm {
  /** Stable key: the built-in code or `custom-<index>`. */
  readonly key: string;
  /** Visible text. */
  readonly text: string;
  /** Accessible name. */
  readonly label: string;
  /** The window it applies; `null` = the full range. */
  readonly range: ChartRange | null;
  /** The current window is this period's (`aria-pressed`). */
  readonly active: boolean;
}

type PeriodKey = keyof OgeChartsPeriodMessages;

const BUILT_IN: Readonly<
  Record<
    OgeChartPeriod,
    {
      readonly text: PeriodKey;
      readonly label: PeriodKey;
      readonly months: number;
    }
  >
> = {
  '1M': { text: 'month1', label: 'month1Label', months: 1 },
  '3M': { text: 'month3', label: 'month3Label', months: 3 },
  '6M': { text: 'month6', label: 'month6Label', months: 6 },
  YTD: { text: 'yearToDate', label: 'yearToDateLabel', months: 0 },
  '1Y': { text: 'year1', label: 'year1Label', months: 12 },
  All: { text: 'all', label: 'allLabel', months: 0 },
};

/**
 * The window a period selects, ending at the data end: calendar months back
 * (`1M`/`3M`/`6M`/`1Y`, real month lengths), January 1st of the end's year
 * (`YTD`), the full range (`All` → `null`), or a custom span. `undefined`
 * when the period does not apply to the axis (calendar periods on a linear
 * axis) — such buttons are not rendered.
 */
export function rangeSelectorPeriodRange(
  period: OgeChartPeriod | OgeChartCustomPeriod,
  kind: ChartScaleKind,
  bounds: ChartRange,
): ChartRange | null | undefined {
  const end = bounds.max;
  const clamp = (min: number): ChartRange => ({
    min: Math.max(bounds.min, Math.min(min, end)),
    max: end,
  });
  if (typeof period === 'string') {
    if (period === 'All') return null;
    if (kind !== 'time') return undefined;
    if (period === 'YTD') {
      return clamp(new Date(new Date(end).getFullYear(), 0, 1).getTime());
    }
    return clamp(
      addChartDateInterval(end, { months: BUILT_IN[period].months }, -1),
    );
  }
  const range = period.range;
  if (typeof range === 'number') return clamp(end - Math.abs(range));
  if (isChartDateInterval(range)) {
    return kind === 'time'
      ? clamp(addChartDateInterval(end, range, -1))
      : undefined;
  }
  const window = range as ChartRange;
  return clampRange(
    {
      min: Math.min(window.min, window.max),
      max: Math.max(window.min, window.max),
    },
    bounds,
  );
}

/** The period buttons to render, with the one matching `value` pressed. */
export function rangeSelectorPeriods<T>(
  periods: readonly (OgeChartPeriod | OgeChartCustomPeriod)[],
  data: OgeRangeSelectorData<T>,
  value: ChartRange | null,
  messages: OgeChartsMessages,
): readonly OgeRangeSelectorPeriodVm[] {
  const effective = rangeSelectorEffective(data, value);
  const span = data.bounds.max - data.bounds.min || 1;
  const close = (a: number, b: number): boolean =>
    Math.abs(a - b) <= span * 0.002;
  const result: OgeRangeSelectorPeriodVm[] = [];
  periods.forEach((period, index) => {
    const range = rangeSelectorPeriodRange(period, data.kind, data.bounds);
    if (range === undefined) return;
    const target = range ?? data.bounds;
    const active =
      close(effective.min, target.min) && close(effective.max, target.max);
    if (typeof period === 'string') {
      const keys = BUILT_IN[period];
      result.push({
        key: period,
        text: messages.periods[keys.text],
        label: messages.periods[keys.label],
        range,
        active,
      });
    } else {
      result.push({
        key: `custom-${index}`,
        text: period.label,
        label: period.label,
        range,
        active,
      });
    }
  });
  return result;
}
