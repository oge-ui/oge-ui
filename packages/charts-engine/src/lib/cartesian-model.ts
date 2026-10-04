/**
 * The cartesian chart's view model — everything `<oge-chart>` (Angular) and
 * `<OgeChart>` (React) draw, computed once, framework-free.
 *
 * Three stages, so each render layer can memoize them independently (a hover
 * must not rebuild the series, a zoom must not re-normalize the data):
 *
 * 1. {@link buildCartesianData} — data + series definitions → normalized
 *    series, categories, stacks and the argument index.
 * 2. {@link buildCartesianScene} — data + axis/visibility/zoom/size options →
 *    scales, render geometry, ticks, strips, annotations, legend.
 * 3. {@link cartesianActivePoints} and friends — scene + hover state →
 *    tooltip, crosshair and the nearest series.
 */
import { toLocalDate } from '@oge-ui/core';
import {
  categoryBandPx,
  clampRange,
  createCategoryScale,
  createLinearScale,
  createLogScale,
  createTimeScale,
  type ChartRange,
  type ChartScale,
  type ChartScaleKind,
} from './scale';
import {
  buildSeries,
  collectCategories,
  isBarType,
  isFinancialType,
  isZeroBasedType,
  numericArgument,
  seriesValueExtent,
  type ChartPoint,
  type ChartSeries,
  type ChartSeriesInput,
} from './series-model';
import {
  candleGeometry,
  computeBarSlots,
  computeStacks,
  type StackedValue,
} from './series-layout';
import {
  areaPath,
  baselineAreaPath,
  linePath,
  splinePath,
  steppedPoints,
  type PathPoint,
} from './path-builder';
import {
  chartTrendlineOptions,
  deriveChartSeries,
  paretoCategoryOrder,
} from './series-derive';
import type { OgeTrendlineFit } from './analytics';
import {
  chartBarLabelAnchor,
  chartContrastText,
  chartLabelOptions,
  chartLabelText,
  chartPointHasLabel,
  chartPointLabelAnchor,
  resolveChartLabels,
  type ChartLabelCandidate,
  type OgeChartRenderLabel,
} from './data-labels';
import { downsamplePath } from './downsample';
import {
  decideLabelLayout,
  numberFormat,
  siFormat,
  timeTickFormatter,
} from './tick-format';
import {
  buildArgumentIndex,
  nearestIndex,
  type ArgumentIndex,
} from './hit-test';
import { panRange, rangeFromSelection, zoomRangeAt } from './zoom-math';
import {
  OGE_CHART_PALETTE,
  type OgeChartAnnotation,
  type OgeChartAxisOptions,
  type OgeChartCrosshairOptions,
  type OgeChartExportData,
  type OgeChartPointEvent,
  type OgeChartPointRef,
  type OgeChartStripLine,
  type OgeChartTooltipOptions,
} from './charts-types';
import {
  OGE_DEFAULT_CHARTS_MESSAGES,
  formatOgeChartMessage,
  type OgeChartsMessages,
  type OgeChartsValueMessages,
} from './charts-config';

export type { OgeChartRenderLabel } from './data-labels';

const MARGIN_TOP = 16;
const MARGIN_BOTTOM = 34;
const AXIS_W = 52;

/* ------------------------------------------------------------------ */
/* stage 1 — data                                                      */
/* ------------------------------------------------------------------ */

/** Series definitions with `commonSeries` merged under each entry. */
export function mergeChartSeriesInputs<T>(
  series: readonly ChartSeriesInput<T>[],
  common: Partial<ChartSeriesInput<T>> | undefined,
): readonly ChartSeriesInput<T>[] {
  return series.map(
    (entry) => ({ ...(common ?? {}), ...entry }) as ChartSeriesInput<T>,
  );
}

/**
 * The argument axis kind: explicit, or auto-detected from the first
 * plottable argument (number → linear, `Date` or date string → time,
 * anything else → category).
 */
export function detectArgumentKind<T>(
  dataSource: readonly T[],
  series: readonly ChartSeriesInput<T>[],
  explicit: ChartScaleKind | undefined,
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
      if (typeof raw === 'number') return 'linear';
      if (raw instanceof Date) return 'time';
      if (typeof raw === 'string') {
        return toLocalDate(raw) !== null ? 'time' : 'category';
      }
      return 'category';
    }
  }
  return 'linear';
}

export interface OgeCartesianDataInput<T> {
  readonly dataSource: readonly T[];
  readonly series: readonly ChartSeriesInput<T>[];
  readonly commonSeries?: Partial<ChartSeriesInput<T>>;
  /** `argumentAxis.type`; unset auto-detects. */
  readonly argumentType?: ChartScaleKind;
  /** The resolved messages (indicator names, value texts). Default: English. */
  readonly messages?: OgeChartsMessages;
}

/** Stage 1: the normalized data the scene is drawn from. */
export interface OgeCartesianData<T> {
  readonly argKind: ChartScaleKind;
  readonly categories: readonly unknown[];
  readonly categoryIndex: ReadonlyMap<unknown, number>;
  readonly seriesList: readonly ChartSeries<T>[];
  readonly stacks: readonly (readonly (StackedValue | null)[] | null)[];
  readonly argIndex: ArgumentIndex;
  /** Distinct numeric arguments, ascending — the keyboard/hover walk. */
  readonly sortedArgs: readonly number[];
  readonly hasBars: boolean;
  /** Trendline fit per series (`null` = no trendline). */
  readonly trends: readonly (OgeTrendlineFit | null)[];
  readonly messages: OgeChartsMessages;
}

export function buildCartesianData<T>(
  input: OgeCartesianDataInput<T>,
): OgeCartesianData<T> {
  const merged = mergeChartSeriesInputs(input.series, input.commonSeries);
  // detected from the MERGED inputs: an `argumentField` that only
  // `commonSeries` carries is the argument field of every series
  const argKind = detectArgumentKind(
    input.dataSource,
    merged,
    input.argumentType,
  );
  const collected =
    argKind === 'category' ? collectCategories(input.dataSource, merged) : [];
  // a pareto series sorts the category axis by its values, descending
  const categories =
    argKind === 'category'
      ? (paretoCategoryOrder(input.dataSource, merged, collected) ?? collected)
      : collected;
  const categoryIndex = new Map(
    categories.map((category, index) => [category, index] as const),
  );
  const messages = input.messages ?? OGE_DEFAULT_CHARTS_MESSAGES;
  const derived = deriveChartSeries(
    merged.map((entry, index) =>
      buildSeries(input.dataSource, entry, index, argKind, categoryIndex),
    ),
    { dataSource: input.dataSource, messages },
  );
  const seriesList = derived.seriesList;
  const argIndex = buildArgumentIndex(
    seriesList.map((series) => series.points.map((point) => point.argNumeric)),
  );
  const stacks = computeStacks(seriesList).map(
    (entry, index) => derived.waterfallStacks[index] ?? entry,
  );
  return {
    argKind,
    categories,
    categoryIndex,
    seriesList,
    stacks,
    argIndex,
    sortedArgs: argIndex.sortedArgs,
    hasBars: seriesList.some(
      (series) => isBarType(series.type) || series.type === 'histogram',
    ),
    trends: derived.trends,
    messages,
  };
}

/* ------------------------------------------------------------------ */
/* stage 2 — scene                                                     */
/* ------------------------------------------------------------------ */

export interface OgeChartRenderBar {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly seriesIndex: number;
  readonly pointIndex: number;
  /** Per-point fill (`colorField`, `customizePoint`, waterfall kinds); `null` = the series colour. */
  readonly color?: string | null;
  /** Outline (box-plot boxes); `null` = none. */
  readonly stroke?: string | null;
  /** Extra class: `oge-chart-box`, `oge-chart-waterfall-up`, `oge-chart-indicator-hist`, … */
  readonly cls?: string | null;
}

export interface OgeChartRenderCandle {
  readonly x: number;
  readonly bodyY: number;
  readonly bodyH: number;
  readonly wickY1: number;
  readonly wickY2: number;
  readonly w: number;
  readonly rising: boolean;
  readonly pointIndex: number;
  /** Per-point body fill; `null` = the rising/falling theme colour. */
  readonly color?: string | null;
}

export interface OgeChartRenderMarker {
  readonly x: number;
  readonly y: number;
  readonly seriesIndex: number;
  readonly pointIndex: number;
  /** Bubble radius; undefined = the default marker size of the type. */
  readonly r?: number;
  /** Per-point fill; `null` = the series colour. */
  readonly color?: string | null;
}

/**
 * A line mark that is not a series path: OHLC ticks, box-plot whiskers and
 * medians, waterfall connectors, indicator reference levels.
 */
export interface OgeChartRenderSegment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** `oge-chart-ohlc`, `oge-chart-box-whisker`, `oge-chart-box-median`, `oge-chart-waterfall-connector`, `oge-chart-indicator-level`. */
  readonly cls: string;
  /** Stroke override; `null` = the class's theme colour. */
  readonly color: string | null;
}

/** A small non-interactive dot (box-plot outliers, pareto line points). */
export interface OgeChartRenderDot {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly color: string | null;
}

/**
 * An extra path drawn with a series: trendlines, Bollinger bands and
 * lines, the MACD signal, the pareto cumulative line.
 */
export interface OgeChartRenderPath {
  readonly d: string;
  /** `oge-chart-trendline`, `oge-chart-indicator-band`, `oge-chart-indicator-line`, `oge-chart-pareto-line`. */
  readonly cls: string;
  readonly fill: string | null;
  readonly stroke: string | null;
  readonly strokeWidth: number;
  readonly dashArray: string | null;
  readonly opacity: number;
}

/** One visible series, as drawn. */
export interface OgeChartRenderSeries {
  readonly seriesIndex: number;
  readonly name: string;
  readonly color: string;
  readonly type: ChartSeries['type'];
  readonly linePathD: string | null;
  readonly areaPathD: string | null;
  readonly bars: readonly OgeChartRenderBar[];
  readonly candles: readonly OgeChartRenderCandle[];
  readonly markers: readonly OgeChartRenderMarker[];
  /** Data labels after overlap resolution and clipping. */
  readonly labels: readonly OgeChartRenderLabel[];
  readonly segments: readonly OgeChartRenderSegment[];
  readonly dots: readonly OgeChartRenderDot[];
  /** Drawn under the series line (bands, trendlines, signal lines). */
  readonly extraPaths: readonly OgeChartRenderPath[];
  readonly dashArray: string | null;
  readonly strokeWidth: number;
  readonly opacity: number;
}

/** Marker radius when a render marker carries none (bubbles do). */
export function chartMarkerRadius(
  marker: OgeChartRenderMarker,
  type: ChartSeries['type'],
): number {
  return marker.r ?? (type === 'scatter' ? 4 : 3.5);
}

export interface OgeChartAxisTick {
  readonly px: number;
  readonly label: string;
}

export interface OgeChartValueAxisVm {
  readonly index: number;
  readonly anchor: 'start' | 'end';
  readonly labelX: number;
  readonly title: string;
  readonly titleTransform: string;
  readonly ticks: readonly OgeChartAxisTick[];
}

export interface OgeChartStripRect {
  readonly px: number;
  /** 0 = a line; otherwise a band this wide. */
  readonly widthPx: number;
  readonly label: string | undefined;
  readonly color: string | undefined;
}

export interface OgeChartAnnotationVm {
  readonly x: number;
  readonly y: number;
  readonly isPoint: boolean;
  readonly text: string;
  readonly color: string | undefined;
  readonly labelX: number;
  readonly labelY: number;
  readonly labelW: number;
}

export interface OgeChartLegendEntry {
  readonly seriesIndex: number;
  readonly name: string;
  readonly color: string;
  readonly hidden: boolean;
  /**
   * The marker's CSS `background`: the series colour, or — when points carry
   * their own colours (`colorField`, `customizePoint`, waterfall kinds) — a
   * striped swatch of the distinct colours.
   */
  readonly swatch: string;
}

/** The legend swatch of a set of colours (one colour → that colour). */
export function chartLegendSwatch(colors: readonly string[]): string {
  const distinct = [...new Set(colors)].slice(0, 6);
  if (distinct.length <= 1) return distinct[0] ?? 'transparent';
  const step = 100 / distinct.length;
  const stops = distinct
    .map(
      (color, index) =>
        `${color} ${Math.round(index * step)}% ${Math.round((index + 1) * step)}%`,
    )
    .join(', ');
  return `linear-gradient(90deg, ${stops})`;
}

const WATERFALL_UP = '#10b981';
const WATERFALL_DOWN = '#ef4444';

/** A point's own colour (per-point style, waterfall kind), else `null`. */
export function chartPointColor<T>(
  series: ChartSeries<T>,
  point: ChartPoint<T> | undefined,
  seriesColor: string,
): string | null {
  if (point === undefined) return null;
  if (point.style?.color !== undefined) return point.style.color;
  if (series.type === 'waterfall' && point.kind !== undefined) {
    if (point.kind === 'up') return series.input.upColor ?? WATERFALL_UP;
    if (point.kind === 'down') return series.input.downColor ?? WATERFALL_DOWN;
    return series.input.totalColor ?? seriesColor;
  }
  return null;
}

export interface OgeChartPlotRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface OgeCartesianSceneInput<T> {
  readonly data: OgeCartesianData<T>;
  readonly argumentAxis?: OgeChartAxisOptions;
  readonly valueAxis?: OgeChartAxisOptions | readonly OgeChartAxisOptions[];
  readonly stripLines?: readonly OgeChartStripLine[];
  readonly annotations?: readonly OgeChartAnnotation[];
  readonly palette?: readonly string[];
  /** The zoom window; `null` = the full extent. */
  readonly visualRange: ChartRange | null;
  /** Legend-toggle overrides; unset = the series input's `visible` flag. */
  readonly visibilityOverrides: ReadonlyMap<number, boolean>;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
  readonly markerThreshold?: number;
}

/** Stage 2: everything the SVG draws, bar the hover layer. */
export interface OgeCartesianScene<T> {
  readonly data: OgeCartesianData<T>;
  readonly locale: string | undefined;
  readonly width: number;
  readonly height: number;
  readonly plot: OgeChartPlotRect;
  readonly argBounds: ChartRange;
  readonly effectiveRange: ChartRange;
  /** Whether a zoom window is applied. */
  readonly zoomed: boolean;
  readonly argScale: ChartScale;
  readonly valueAxesOptions: readonly OgeChartAxisOptions[];
  readonly valueScales: readonly ChartScale[];
  readonly visibility: readonly boolean[];
  readonly colors: readonly string[];
  readonly renderSeries: readonly OgeChartRenderSeries[];
  readonly argGrid: boolean;
  readonly argAxisTitle: string;
  readonly argTicks: readonly OgeChartAxisTick[];
  readonly argRotated: boolean;
  /** Horizontal grid lines (first value axis). */
  readonly valueGridTicks: readonly OgeChartAxisTick[];
  readonly valueAxes: readonly OgeChartValueAxisVm[];
  readonly stripRects: readonly OgeChartStripRect[];
  readonly annotations: readonly OgeChartAnnotationVm[];
  readonly legendItems: readonly OgeChartLegendEntry[];
  /** Nothing to plot: no visible series or no arguments. */
  readonly empty: boolean;
}

/** The value axes as a list (a single object is one axis; `[]` is one default). */
export function chartValueAxesList(
  valueAxis: OgeChartAxisOptions | readonly OgeChartAxisOptions[] | undefined,
): readonly OgeChartAxisOptions[] {
  const axis = valueAxis ?? {};
  const list = Array.isArray(axis)
    ? (axis as readonly OgeChartAxisOptions[])
    : [axis as OgeChartAxisOptions];
  return list.length > 0 ? list : [{}];
}

const toEpoch = (value: number | Date | undefined): number | null =>
  value === undefined ? null : value instanceof Date ? value.getTime() : value;

/** The series color: its own `color`, else the palette slot. */
export function chartSeriesColor(
  series: ChartSeries<unknown> | undefined,
  seriesIndex: number,
  palette: readonly string[] | undefined,
): string {
  const colors = palette ?? OGE_CHART_PALETTE;
  return series?.input.color ?? colors[seriesIndex % colors.length];
}

export function buildCartesianScene<T>(
  input: OgeCartesianSceneInput<T>,
): OgeCartesianScene<T> {
  const { data } = input;
  const argumentAxis = input.argumentAxis ?? {};
  const locale = input.locale;
  const { argKind, categories, categoryIndex, seriesList, stacks } = data;

  const visibility = seriesList.map((series, index) => {
    const override = input.visibilityOverrides.get(index);
    return override !== undefined ? override : series.input.visible !== false;
  });
  const colors = seriesList.map((series, index) =>
    chartSeriesColor(series as ChartSeries<unknown>, index, input.palette),
  );

  /* plot rect */
  const valueAxesOptions = chartValueAxesList(input.valueAxis);
  const rightAxisCount = valueAxesOptions.filter(
    (axis) => axis.position === 'end',
  ).length;
  const leftAxisCount = valueAxesOptions.length - rightAxisCount;
  const argAxisTitle = argumentAxis.title ?? '';
  const plotX = Math.max(1, leftAxisCount) * AXIS_W;
  const plotY = MARGIN_TOP;
  const plotW = Math.max(
    10,
    input.width - plotX - Math.max(rightAxisCount * AXIS_W, 12),
  );
  const plotH = Math.max(
    10,
    input.height - MARGIN_TOP - MARGIN_BOTTOM - (argAxisTitle ? 14 : 0),
  );

  /* argument bounds + scale */
  const argBounds = ((): ChartRange => {
    if (argKind === 'category') {
      return { min: -0.5, max: Math.max(0.5, categories.length - 0.5) };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const series of seriesList) {
      for (const point of series.points) {
        if (point.argNumeric === null) continue;
        if (point.argNumeric < min) min = point.argNumeric;
        if (point.argNumeric > max) max = point.argNumeric;
      }
    }
    if (min > max) return { min: 0, max: 1 };
    min = toEpoch(argumentAxis.min) ?? min;
    max = toEpoch(argumentAxis.max) ?? max;
    if (min === max) max = min + 1;
    // bars need half a band of headroom on both sides
    if (data.hasBars) {
      const pad = (max - min) * 0.03;
      min -= pad;
      max += pad;
    }
    return { min, max };
  })();
  const effectiveRange =
    input.visualRange === null
      ? argBounds
      : clampRange(input.visualRange, argBounds);

  const argScale = ((): ChartScale => {
    const range = effectiveRange;
    const rangePx = plotW;
    const inverted = argumentAxis.inverted;
    if (argKind === 'time') {
      return createTimeScale({
        min: range.min,
        max: range.max,
        rangePx,
        inverted,
      });
    }
    if (argKind === 'category') {
      if (input.visualRange === null) {
        return createCategoryScale({
          count: categories.length,
          rangePx,
          inverted,
        });
      }
      const linear = createLinearScale({
        min: range.min,
        max: range.max,
        rangePx,
        inverted,
      });
      const ticks: number[] = [];
      for (
        let i = Math.max(0, Math.ceil(range.min));
        i <= Math.min(categories.length - 1, Math.floor(range.max));
        i++
      ) {
        ticks.push(i);
      }
      return { ...linear, kind: 'category', ticks };
    }
    if (argKind === 'logarithmic') {
      return createLogScale({
        min: range.min,
        max: range.max,
        rangePx,
        inverted,
      });
    }
    return createLinearScale({
      min: range.min,
      max: range.max,
      rangePx,
      inverted,
    });
  })();

  /* value scales */
  const valueScales = valueAxesOptions.map((axis, axisIndex) => {
    let min = Infinity;
    let max = -Infinity;
    seriesList.forEach((series, seriesIndex) => {
      if (!visibility[seriesIndex]) return;
      if (paretoCumulativeAxis(series, valueAxesOptions.length) === axisIndex) {
        min = Math.min(min, 0);
        max = Math.max(max, 100);
      }
      if ((series.input.axis ?? 0) !== axisIndex) return;
      const stacked = stacks[seriesIndex];
      if (stacked !== null) {
        for (const entry of stacked) {
          if (entry === null) continue;
          min = Math.min(min, entry.base, entry.top);
          max = Math.max(max, entry.base, entry.top);
        }
      } else {
        const extent = seriesValueExtent(series);
        if (extent !== null) {
          min = Math.min(min, extent.min);
          max = Math.max(max, extent.max);
        }
      }
      if (isZeroBasedType(series.type)) {
        min = Math.min(min, 0);
        max = Math.max(max, 0);
      }
    });
    if (min > max) {
      min = 0;
      max = 1;
    }
    const pad = (max - min || 1) * 0.05;
    let lo = min === 0 ? 0 : min - pad;
    let hi = max === 0 ? 0 : max + pad;
    lo = toEpoch(axis.min) ?? lo;
    hi = toEpoch(axis.max) ?? hi;
    if (lo === hi) hi = lo + 1;
    // value axes render top-down: inverted mapping unless the user flips
    const inverted = axis.inverted !== true;
    if (axis.type === 'logarithmic') {
      return createLogScale({
        min: Math.max(lo, Number.MIN_VALUE),
        max: hi,
        rangePx: plotH,
        inverted,
      });
    }
    return createLinearScale({ min: lo, max: hi, rangePx: plotH, inverted });
  });

  /* bar band */
  const barBandPx = ((): number => {
    if (argKind === 'category') {
      const visible =
        (effectiveRange.max - effectiveRange.min) /
        Math.max(1, categories.length);
      const count =
        input.visualRange === null
          ? categories.length
          : Math.max(1, categories.length * visible);
      return categoryBandPx(argScale, Math.round(count));
    }
    // continuous axes: the smallest px gap between adjacent arguments
    const args = data.sortedArgs;
    if (args.length < 2) return Math.min(40, plotW / 2);
    let minDelta = Infinity;
    for (let i = 1; i < args.length; i++) {
      minDelta = Math.min(minDelta, args[i] - args[i - 1]);
    }
    return Math.max(
      2,
      Math.abs(argScale.toPx(args[0] + minDelta) - argScale.toPx(args[0])),
    );
  })();

  const renderSeries = buildRenderSeries({
    seriesList,
    visibility,
    colors,
    palette: input.palette ?? OGE_CHART_PALETTE,
    stacks,
    trends: data.trends,
    argScale,
    valueScales,
    barBandPx,
    plotW,
    plotH,
    markerThreshold: input.markerThreshold ?? 200,
    locale,
  });

  /* axes */
  const argLabelOf = (tickValue: number): string => {
    if (argumentAxis.labelFormat !== undefined) {
      const raw = argKind === 'category' ? categories[tickValue] : tickValue;
      return argumentAxis.labelFormat(
        argKind === 'time' ? new Date(tickValue) : raw,
      );
    }
    if (argKind === 'category') return String(categories[tickValue] ?? '');
    if (argKind === 'time') {
      return timeTickFormatter(argScale.tickUnit ?? 'day', locale)(tickValue);
    }
    return numberFormat(tickValue, locale);
  };
  const allArgLabels = argScale.ticks.map((tick) => argLabelOf(tick));
  const widest = allArgLabels.reduce(
    (acc, label) => Math.max(acc, label.length * 7),
    0,
  );
  const layout = decideLabelLayout(
    argScale.ticks.length,
    plotW,
    widest,
    argumentAxis.labelOverlap ?? 'skip',
  );
  const argTicks = argScale.ticks
    .map((tick, index) => ({ tick, index }))
    .filter(({ index }) => index % layout.skipEvery === 0)
    .map(({ tick, index }) => ({
      px: argScale.toPx(tick),
      label: allArgLabels[index],
    }));

  const firstValueScale = valueScales[0];
  const valueGridTicks =
    firstValueScale === undefined
      ? []
      : firstValueScale.ticks.map((tick) => ({
          px: firstValueScale.toPx(tick),
          label: '',
        }));

  let leftSlot = 0;
  let rightSlot = 0;
  const valueAxes = valueAxesOptions.map((axis, index): OgeChartValueAxisVm => {
    const scale = valueScales[index];
    const right = axis.position === 'end';
    const slot = right ? rightSlot++ : leftSlot++;
    const labelX = right
      ? plotX + plotW + 8 + slot * AXIS_W
      : plotX - 8 - slot * AXIS_W;
    const format = (value: number): string => {
      if (axis.labelFormat !== undefined) return axis.labelFormat(value);
      return axis.abbreviate === false
        ? numberFormat(value, locale)
        : siFormat(value, locale);
    };
    const titleX = right ? labelX + AXIS_W - 14 : labelX - AXIS_W + 14;
    const titleY = plotY + plotH / 2;
    return {
      index,
      anchor: right ? 'start' : 'end',
      labelX,
      title: axis.title ?? '',
      titleTransform: `translate(${titleX},${titleY}) rotate(${right ? 90 : -90})`,
      ticks:
        scale === undefined
          ? []
          : scale.ticks.map((tick) => ({
              px: scale.toPx(tick),
              label: format(tick),
            })),
    };
  });

  /* strips + annotations */
  const toNumeric = (value: number | Date | string): number | null =>
    numericArgument(value, argKind, categoryIndex);
  const stripRects: OgeChartStripRect[] = [];
  for (const strip of input.stripLines ?? []) {
    const start = toNumeric(strip.start);
    if (start === null) continue;
    const px = argScale.toPx(start);
    const end = strip.end === undefined ? null : toNumeric(strip.end);
    stripRects.push({
      px,
      widthPx: end === null ? 0 : Math.max(0, argScale.toPx(end) - px),
      label: strip.label,
      color: strip.color,
    });
  }
  const annotations: OgeChartAnnotationVm[] = [];
  for (const annotation of input.annotations ?? []) {
    const arg = toNumeric(annotation.argument);
    if (arg === null) continue;
    const x = argScale.toPx(arg);
    const valueScale = valueScales[annotation.axis ?? 0] ?? valueScales[0];
    const anchorY =
      annotation.value === undefined ? 14 : valueScale.toPx(annotation.value);
    annotations.push({
      x,
      y: anchorY,
      isPoint: annotation.type !== 'text',
      text: annotation.text,
      color: annotation.color,
      labelX: x + (annotation.offsetX ?? 12),
      labelY: anchorY + (annotation.offsetY ?? -12),
      labelW: annotation.text.length * 6.6 + 12,
    });
  }

  const legendItems = seriesList
    .map((series, seriesIndex) => ({
      seriesIndex,
      name: series.name,
      color: colors[seriesIndex],
      hidden: !visibility[seriesIndex],
      inLegend: series.input.showInLegend !== false,
      swatch: chartLegendSwatch(
        seriesSwatchColors(series, colors[seriesIndex]),
      ),
    }))
    .filter((item) => item.inLegend)
    .map(({ seriesIndex, name, color, hidden, swatch }) => ({
      seriesIndex,
      name,
      color,
      hidden,
      swatch,
    }));

  return {
    data,
    locale,
    width: input.width,
    height: input.height,
    plot: { x: plotX, y: plotY, w: plotW, h: plotH },
    argBounds,
    effectiveRange,
    zoomed: input.visualRange !== null,
    argScale,
    valueAxesOptions,
    valueScales,
    visibility,
    colors,
    renderSeries,
    argGrid: argumentAxis.grid === true,
    argAxisTitle,
    argTicks,
    argRotated: layout.rotated,
    valueGridTicks,
    valueAxes,
    stripRects,
    annotations,
    legendItems,
    empty: !visibility.some(Boolean) || data.sortedArgs.length === 0,
  };
}

/** The value axis of a pareto series' cumulative line, when it exists. */
function paretoCumulativeAxis<T>(
  series: ChartSeries<T>,
  axisCount: number,
): number | null {
  if (series.type !== 'pareto') return null;
  const axis = series.input.cumulativeAxis;
  return axis !== undefined && axis >= 0 && axis < axisCount ? axis : null;
}

/** The colours a series' legend swatch shows (distinct, first 500 points). */
function seriesSwatchColors<T>(
  series: ChartSeries<T>,
  seriesColor: string,
): string[] {
  const colors: string[] = [];
  const limit = Math.min(series.points.length, 500);
  for (let i = 0; i < limit; i++) {
    const point = series.points[i];
    if (point.value === null && !isFinancialType(series.type)) continue;
    colors.push(chartPointColor(series, point, seriesColor) ?? seriesColor);
  }
  return colors.length > 0 ? colors : [seriesColor];
}

const dashOf = (style: 'solid' | 'dash' | 'dot' | undefined): string | null =>
  style === 'dash' ? '6 4' : style === 'dot' ? '2 3' : null;

const SPLINE_TYPES = new Set<ChartSeries['type']>([
  'spline',
  'splineArea',
  'stackedSplineArea',
  'fullStackedSplineArea',
]);

const AREA_TYPES = new Set<ChartSeries['type']>([
  'area',
  'splineArea',
  'stepArea',
  'stackedArea',
  'fullStackedArea',
  'rangeArea',
  'stackedSplineArea',
  'fullStackedSplineArea',
]);

function buildRenderSeries<T>(ctx: {
  seriesList: readonly ChartSeries<T>[];
  visibility: readonly boolean[];
  colors: readonly string[];
  palette: readonly string[];
  stacks: OgeCartesianData<T>['stacks'];
  trends: OgeCartesianData<T>['trends'];
  argScale: ChartScale;
  valueScales: readonly ChartScale[];
  barBandPx: number;
  plotW: number;
  plotH: number;
  markerThreshold: number;
  locale: string | undefined;
}): OgeChartRenderSeries[] {
  const { argScale: scale, valueScales: scales, stacks } = ctx;
  const barSlots = computeBarSlots(ctx.seriesList, ctx.barBandPx);
  const result: OgeChartRenderSeries[] = [];
  const candidates: ChartLabelCandidate[] = [];
  ctx.seriesList.forEach((series, seriesIndex) => {
    if (!ctx.visibility[seriesIndex]) return;
    const valueScale = scales[series.input.axis ?? 0] ?? scales[0];
    const color = ctx.colors[seriesIndex];
    const stacked = stacks[seriesIndex];
    const slot = barSlots[seriesIndex];
    const xOf = (point: ChartPoint<T>): number | null =>
      point.argNumeric === null ? null : scale.toPx(point.argNumeric);
    const pointColor = (point: ChartPoint<T>): string | null =>
      chartPointColor(series, point, color);
    const labelOptions = chartLabelOptions(series);
    const labelPosition = labelOptions.position ?? 'outside';
    const overlap = labelOptions.overlap ?? 'hide';
    const pushLabel = (
      point: ChartPoint<T>,
      pointIndex: number,
      anchor: { x: number; y: number; inside: boolean },
      percent: number | null,
      markColor: string | null,
      defaultText?: string,
    ): void => {
      if (!chartPointHasLabel(series, point)) return;
      candidates.push({
        overlap,
        label: {
          x: anchor.x,
          y: anchor.y,
          text: chartLabelText(
            series,
            point,
            seriesIndex,
            pointIndex,
            percent,
            ctx.locale,
            defaultText,
          ),
          anchor: 'middle',
          inside: anchor.inside,
          textColor: anchor.inside
            ? chartContrastText(markColor ?? color)
            : null,
          seriesIndex,
          pointIndex,
          seriesName: series.name,
          argument: point.argument,
          value: point.value,
        },
      });
    };
    const markerRadius = (point: ChartPoint<T>, fallback: number): number => {
      const size = point.style?.marker?.size;
      return size !== undefined ? size / 2 : fallback;
    };
    const dashArray = dashOf(series.input.dashStyle);
    const strokeWidth = series.input.width ?? 2;
    const opacity = series.input.opacity ?? 1;

    let linePathD: string | null = null;
    let areaPathD: string | null = null;
    const bars: OgeChartRenderBar[] = [];
    const candles: OgeChartRenderCandle[] = [];
    const markers: OgeChartRenderMarker[] = [];
    const segments: OgeChartRenderSegment[] = [];
    const dots: OgeChartRenderDot[] = [];
    const extraPaths: OgeChartRenderPath[] = [];

    const type = series.type;
    if (type === 'boxPlot') {
      series.points.forEach((point, pointIndex) => {
        const x = xOf(point);
        const q1 = point.extra?.q1;
        const q3 = point.extra?.q3;
        if (
          x === null ||
          slot === null ||
          q1 === undefined ||
          q1 === null ||
          q3 === undefined ||
          q3 === null ||
          point.value === null
        ) {
          return;
        }
        const w = Math.max(3, slot.widthPx * 0.7);
        const bx = x + slot.offsetPx + (slot.widthPx - w) / 2;
        const cx = bx + w / 2;
        const q1Px = valueScale.toPx(q1);
        const q3Px = valueScale.toPx(q3);
        const medianPx = valueScale.toPx(point.value);
        const fill = pointColor(point) ?? color;
        bars.push({
          x: bx,
          y: Math.min(q1Px, q3Px),
          w,
          h: Math.max(1, Math.abs(q3Px - q1Px)),
          seriesIndex,
          pointIndex,
          color: fill,
          stroke: fill,
          cls: 'oge-chart-box',
        });
        segments.push({
          x1: bx,
          y1: medianPx,
          x2: bx + w,
          y2: medianPx,
          cls: 'oge-chart-box-median',
          color: fill,
        });
        const cap = w / 4;
        for (const [whisker, edge] of [
          [point.high, q3Px],
          [point.low, q1Px],
        ] as const) {
          if (whisker === null) continue;
          const whiskerPx = valueScale.toPx(whisker);
          segments.push(
            {
              x1: cx,
              y1: edge,
              x2: cx,
              y2: whiskerPx,
              cls: 'oge-chart-box-whisker',
              color: fill,
            },
            {
              x1: cx - cap,
              y1: whiskerPx,
              x2: cx + cap,
              y2: whiskerPx,
              cls: 'oge-chart-box-whisker',
              color: fill,
            },
          );
        }
        for (const outlier of point.outliers ?? []) {
          dots.push({ x: cx, y: valueScale.toPx(outlier), r: 3, color: fill });
        }
        const topPx = valueScale.toPx(point.high ?? q3);
        pushLabel(
          point,
          pointIndex,
          chartPointLabelAnchor(cx, topPx, 0, labelPosition),
          null,
          null,
        );
      });
    } else if (type === 'histogram') {
      const basePx = valueScale.toPx(
        Math.max(valueScale.min, Math.min(valueScale.max, 0)),
      );
      series.points.forEach((point, pointIndex) => {
        const start = point.extra?.binStart;
        const end = point.extra?.binEnd;
        if (
          start === undefined ||
          start === null ||
          end === undefined ||
          end === null ||
          point.value === null
        ) {
          return;
        }
        const x1 = scale.toPx(start);
        const x2 = scale.toPx(end);
        const topPx = valueScale.toPx(point.value);
        const fill = pointColor(point);
        bars.push({
          x: Math.min(x1, x2) + 0.5,
          y: Math.min(topPx, basePx),
          w: Math.max(1, Math.abs(x2 - x1) - 1),
          h: Math.max(1, Math.abs(basePx - topPx)),
          seriesIndex,
          pointIndex,
          color: fill,
          cls: 'oge-chart-histogram-bar',
        });
        pushLabel(
          point,
          pointIndex,
          chartBarLabelAnchor((x1 + x2) / 2, topPx, basePx, labelPosition),
          null,
          fill,
        );
      });
    } else if (isBarType(type)) {
      const barEnds: { x: number; right: number; level: number }[] = [];
      series.points.forEach((point, pointIndex) => {
        const x = xOf(point);
        if (x === null || slot === null) return;
        const segment =
          type === 'rangeBar'
            ? point.value === null || point.value2 === null
              ? null
              : { base: point.value2, top: point.value }
            : (stacked?.[pointIndex] ??
              (point.value === null ? null : { base: 0, top: point.value }));
        if (segment === null) return;
        const y1 = valueScale.toPx(segment.base);
        const y2 = valueScale.toPx(segment.top);
        const fill = pointColor(point);
        bars.push({
          x: x + slot.offsetPx,
          y: Math.min(y1, y2),
          w: slot.widthPx,
          h: Math.max(1, Math.abs(y2 - y1)),
          seriesIndex,
          pointIndex,
          color: fill,
          cls:
            type === 'waterfall' && point.kind !== undefined
              ? `oge-chart-waterfall-${point.kind}`
              : null,
        });
        barEnds.push({
          x: x + slot.offsetPx,
          right: x + slot.offsetPx + slot.widthPx,
          level: y2,
        });
        if (point.value !== null) {
          const percent =
            type === 'fullStackedBar'
              ? segment.top - segment.base
              : type === 'pareto'
                ? (point.extra?.cumulative ?? null)
                : null;
          pushLabel(
            point,
            pointIndex,
            chartBarLabelAnchor(
              x + slot.offsetPx + slot.widthPx / 2,
              y2,
              y1,
              labelPosition,
            ),
            percent,
            fill,
          );
        }
      });
      if (type === 'waterfall' && series.input.showConnectors !== false) {
        const ordered = [...barEnds].sort((a, b) => a.x - b.x);
        for (let i = 0; i + 1 < ordered.length; i++) {
          segments.push({
            x1: ordered[i].right,
            y1: ordered[i].level,
            x2: ordered[i + 1].x,
            y2: ordered[i].level,
            cls: 'oge-chart-waterfall-connector',
            color: null,
          });
        }
      }
      if (type === 'pareto' && slot !== null) {
        const axis = paretoCumulativeAxis(series, scales.length);
        const cumScale =
          axis !== null
            ? scales[axis]
            : createLinearScale({
                min: 0,
                max: 105,
                rangePx: ctx.plotH,
                inverted: true,
              });
        const lineColor =
          series.input.cumulativeColor ??
          ctx.palette[(seriesIndex + 1) % ctx.palette.length];
        const linePoints = series.points
          .map((point) => ({ point, x: xOf(point) }))
          .filter(
            (entry): entry is { point: ChartPoint<T>; x: number } =>
              entry.x !== null &&
              entry.point.extra?.cumulative !== undefined &&
              entry.point.extra.cumulative !== null,
          )
          .sort((a, b) => a.x - b.x)
          .map((entry) => ({
            x: entry.x + slot.offsetPx + slot.widthPx / 2,
            y: cumScale.toPx((entry.point.extra?.cumulative ?? 0) * 100),
          }));
        if (linePoints.length > 0) {
          extraPaths.push({
            d: linePath(linePoints),
            cls: 'oge-chart-pareto-line',
            fill: null,
            stroke: lineColor,
            strokeWidth: 2,
            dashArray: null,
            opacity: 1,
          });
          for (const entry of linePoints) {
            dots.push({ x: entry.x, y: entry.y, r: 3, color: lineColor });
          }
        }
      }
    } else if (type === 'bubble') {
      let sizeMin = Infinity;
      let sizeMax = -Infinity;
      for (const point of series.points) {
        if (point.size === null) continue;
        sizeMin = Math.min(sizeMin, point.size);
        sizeMax = Math.max(sizeMax, point.size);
      }
      const sizeSpan = sizeMax - sizeMin || 1;
      series.points.forEach((point, pointIndex) => {
        const x = xOf(point);
        if (x === null || point.value === null) return;
        if (point.style?.marker?.visible === false) return;
        const frac =
          point.size === null ? 0.5 : (point.size - sizeMin) / sizeSpan;
        // sqrt so AREA (not radius) tracks the size value
        const r = markerRadius(point, 4 + Math.sqrt(frac) * 14);
        const y = valueScale.toPx(point.value);
        const fill = pointColor(point);
        markers.push({ x, y, seriesIndex, pointIndex, r, color: fill });
        pushLabel(
          point,
          pointIndex,
          chartPointLabelAnchor(x, y, r, labelPosition),
          null,
          fill,
        );
      });
    } else if (isFinancialType(type)) {
      const w = Math.max(3, ctx.barBandPx * 0.5);
      series.points.forEach((point, pointIndex) => {
        const x = xOf(point);
        const geometry = candleGeometry(point);
        if (x === null || geometry === null) return;
        const fill = pointColor(point);
        const highPx = valueScale.toPx(geometry.wickTop);
        if (type === 'ohlc') {
          const cls = geometry.rising
            ? 'oge-chart-ohlc'
            : 'oge-chart-ohlc oge-chart-ohlc-falling';
          const openPx = valueScale.toPx(point.open as number);
          const closePx = valueScale.toPx(point.close as number);
          segments.push(
            {
              x1: x,
              y1: highPx,
              x2: x,
              y2: valueScale.toPx(geometry.wickBottom),
              cls,
              color: fill,
            },
            { x1: x - w / 2, y1: openPx, x2: x, y2: openPx, cls, color: fill },
            {
              x1: x,
              y1: closePx,
              x2: x + w / 2,
              y2: closePx,
              cls,
              color: fill,
            },
          );
        } else {
          const bodyY1 = valueScale.toPx(geometry.bodyTop);
          const bodyY2 = valueScale.toPx(geometry.bodyBottom);
          candles.push({
            x,
            bodyY: Math.min(bodyY1, bodyY2),
            bodyH: Math.max(1, Math.abs(bodyY2 - bodyY1)),
            wickY1: highPx,
            wickY2: valueScale.toPx(geometry.wickBottom),
            w,
            rising: geometry.rising,
            pointIndex,
            color: fill,
          });
        }
        pushLabel(
          point,
          pointIndex,
          chartPointLabelAnchor(x, highPx, 0, 'outside'),
          null,
          null,
          point.close === null ? undefined : siFormat(point.close, ctx.locale),
        );
      });
    } else if (type === 'scatter') {
      series.points.forEach((point, pointIndex) => {
        const x = xOf(point);
        if (x === null || point.value === null) return;
        if (point.style?.marker?.visible === false) return;
        const y = valueScale.toPx(point.value);
        const r = markerRadius(point, 4);
        const fill = pointColor(point);
        markers.push({
          x,
          y,
          seriesIndex,
          pointIndex,
          ...(point.style?.marker?.size !== undefined ? { r } : {}),
          color: fill,
        });
        pushLabel(
          point,
          pointIndex,
          chartPointLabelAnchor(x, y, r, labelPosition),
          null,
          fill,
        );
      });
    } else {
      // line-family (incl. stacked lines / spline areas and indicators)
      const spline = SPLINE_TYPES.has(type);
      const step = type === 'stepLine' || type === 'stepArea';
      const top: PathPoint[] = series.points.map((point, pointIndex) => {
        const x = xOf(point);
        const value =
          stacked !== null ? (stacked[pointIndex]?.top ?? null) : point.value;
        return {
          x: x ?? 0,
          y: x === null || value === null ? null : valueScale.toPx(value),
        };
      });
      // big series: LTTB-downsample the PATH only (markers/hit-testing keep
      // the full data) so one path never carries more points than the plot
      // has pixels
      const budget = Math.max(200, Math.ceil(ctx.plotW * 1.5));
      const pathTop = step
        ? steppedPoints(top)
        : top.length > budget
          ? downsamplePath(top, budget)
          : top;
      linePathD = spline ? splinePath(pathTop) : linePath(pathTop);
      if (AREA_TYPES.has(type)) {
        if (type === 'rangeArea') {
          const bottom: PathPoint[] = series.points.map((point) => {
            const x = xOf(point);
            return {
              x: x ?? 0,
              y:
                x === null || point.value2 === null
                  ? null
                  : valueScale.toPx(point.value2),
            };
          });
          const back = reversePathPoints(bottom);
          areaPathD =
            linePathD !== '' && back !== '' ? `${linePathD} ${back} Z` : null;
        } else if (stacked !== null) {
          const bottom: PathPoint[] = series.points.map((point, pointIndex) => {
            const x = xOf(point);
            const segment = stacked[pointIndex];
            return {
              x: x ?? 0,
              y:
                x === null || segment === null
                  ? null
                  : valueScale.toPx(segment.base),
            };
          });
          areaPathD = spline
            ? areaPath(top, bottom, true)
            : `${linePathD} ${reversePathPoints(bottom)} Z`;
        } else {
          const baselineY = valueScale.toPx(
            Math.max(valueScale.min, Math.min(valueScale.max, 0)),
          );
          areaPathD = baselineAreaPath(pathTop, baselineY, spline);
        }
      }
      if (type === 'indicator') {
        renderIndicatorExtras(series, {
          xOf,
          valueScale,
          color,
          altColor: ctx.palette[(seriesIndex + 1) % ctx.palette.length],
          barBandPx: ctx.barBandPx,
          plotW: ctx.plotW,
          seriesIndex,
          extraPaths,
          bars,
          segments,
        });
      }
      if (series.points.length <= ctx.markerThreshold) {
        series.points.forEach((point, pointIndex) => {
          const pathPoint = top[pointIndex];
          if (pathPoint.y === null) return;
          const forced = point.style?.marker?.visible;
          if (forced === false || (type === 'indicator' && forced !== true)) {
            return;
          }
          const r = markerRadius(point, 3.5);
          markers.push({
            x: pathPoint.x,
            y: pathPoint.y,
            seriesIndex,
            pointIndex,
            ...(point.style?.marker?.size !== undefined ? { r } : {}),
            color: pointColor(point),
          });
          if (point.value !== null) {
            const segment = stacked?.[pointIndex] ?? null;
            pushLabel(
              point,
              pointIndex,
              chartPointLabelAnchor(pathPoint.x, pathPoint.y, r, labelPosition),
              type.startsWith('fullStacked') && segment !== null
                ? segment.top - segment.base
                : null,
              pointColor(point),
            );
          }
        });
      }
    }

    // trendline: sampled densely so curved fits stay smooth
    const trend = ctx.trends[seriesIndex];
    const trendOptions = chartTrendlineOptions(
      series.input as ChartSeriesInput<unknown>,
    );
    if (trend !== null && trend !== undefined && trendOptions !== null) {
      const first = trend.points[0];
      const last = trend.points[trend.points.length - 1];
      const samples =
        trend.type === 'linear' || trend.type === 'movingAverage'
          ? trend.points
          : Array.from({ length: 64 }, (_, i) => {
              const x = first.x + ((last.x - first.x) * i) / 63;
              return { x, y: trend.predict(x) };
            });
      const d = linePath(
        samples.map((sample) => ({
          x: scale.toPx(sample.x),
          y:
            sample.y === null || !Number.isFinite(sample.y)
              ? null
              : valueScale.toPx(sample.y),
        })),
      );
      if (d !== '') {
        extraPaths.push({
          d,
          cls: 'oge-chart-trendline',
          fill: null,
          stroke: trendOptions.color ?? color,
          strokeWidth: trendOptions.width ?? 1.5,
          dashArray: dashOf(trendOptions.dashStyle ?? 'dash'),
          opacity: 0.9,
        });
      }
    }

    result.push({
      seriesIndex,
      name: series.name,
      color,
      type,
      linePathD: linePathD === '' ? null : linePathD,
      areaPathD: areaPathD === '' ? null : areaPathD,
      bars,
      candles,
      markers,
      labels: [],
      segments,
      dots,
      extraPaths,
      dashArray,
      strokeWidth,
      opacity,
    });
  });
  if (candidates.length === 0) return result;
  // one overlap pass across the whole chart, then back into the series
  const kept = resolveChartLabels(candidates, ctx.plotW, ctx.plotH);
  return result.map((entry) => ({
    ...entry,
    labels: kept.filter((label) => label.seriesIndex === entry.seriesIndex),
  }));
}

/** Bollinger band + lines, MACD signal + histogram, reference levels. */
function renderIndicatorExtras<T>(
  series: ChartSeries<T>,
  ctx: {
    xOf: (point: ChartPoint<T>) => number | null;
    valueScale: ChartScale;
    color: string;
    altColor: string;
    barBandPx: number;
    plotW: number;
    seriesIndex: number;
    extraPaths: OgeChartRenderPath[];
    bars: OgeChartRenderBar[];
    segments: OgeChartRenderSegment[];
  },
): void {
  const options = series.input.indicator ?? { type: 'sma' as const };
  const lineOf = (key: 'upper' | 'lower' | 'signal'): PathPoint[] =>
    series.points.map((point) => {
      const x = ctx.xOf(point);
      const value = point.extra?.[key] ?? null;
      return {
        x: x ?? 0,
        y: x === null || value === null ? null : ctx.valueScale.toPx(value),
      };
    });
  if (options.type === 'bollinger') {
    const upper = lineOf('upper');
    const lower = lineOf('lower');
    ctx.extraPaths.push(
      {
        d: areaPath(upper, lower),
        cls: 'oge-chart-indicator-band',
        fill: ctx.color,
        stroke: null,
        strokeWidth: 0,
        dashArray: null,
        opacity: 0.12,
      },
      ...[upper, lower].map((line): OgeChartRenderPath => ({
        d: linePath(line),
        cls: 'oge-chart-indicator-line',
        fill: null,
        stroke: ctx.color,
        strokeWidth: 1,
        dashArray: null,
        opacity: 0.7,
      })),
    );
  }
  if (options.type === 'macd') {
    ctx.extraPaths.push({
      d: linePath(lineOf('signal')),
      cls: 'oge-chart-indicator-line',
      fill: null,
      stroke: ctx.altColor,
      strokeWidth: 1.5,
      dashArray: null,
      opacity: 1,
    });
    const w = Math.max(1, ctx.barBandPx * 0.5);
    const basePx = ctx.valueScale.toPx(
      Math.max(ctx.valueScale.min, Math.min(ctx.valueScale.max, 0)),
    );
    series.points.forEach((point, pointIndex) => {
      const x = ctx.xOf(point);
      const value = point.extra?.histogram ?? null;
      if (x === null || value === null) return;
      const topPx = ctx.valueScale.toPx(value);
      ctx.bars.push({
        x: x - w / 2,
        y: Math.min(topPx, basePx),
        w,
        h: Math.max(1, Math.abs(basePx - topPx)),
        seriesIndex: ctx.seriesIndex,
        pointIndex,
        color: value >= 0 ? WATERFALL_UP : WATERFALL_DOWN,
        cls: 'oge-chart-indicator-hist',
      });
    });
  }
  const levels =
    options.levels ?? (options.type === 'rsi' ? [30, 70] : undefined) ?? [];
  for (const level of levels) {
    const y = ctx.valueScale.toPx(level);
    ctx.segments.push({
      x1: 0,
      y1: y,
      x2: ctx.plotW,
      y2: y,
      cls: 'oge-chart-indicator-level',
      color: null,
    });
  }
}

/** Bottom edge of a ribbon: reversed point order, joined with L commands. */
function reversePathPoints(points: readonly PathPoint[]): string {
  const solid = points.filter(
    (point): point is { x: number; y: number } => point.y !== null,
  );
  return [...solid]
    .reverse()
    .map(
      (point) =>
        `L ${Math.round(point.x * 100) / 100} ${Math.round(point.y * 100) / 100}`,
    )
    .join(' ');
}

/* ------------------------------------------------------------------ */
/* text                                                                */
/* ------------------------------------------------------------------ */

/** The argument as the tooltip / announcements / sr table spell it. */
export function chartArgumentText<T>(
  argKind: ChartScaleKind,
  point: ChartPoint<T>,
  locale: string | undefined,
  words: OgeChartsValueMessages = OGE_DEFAULT_CHARTS_MESSAGES.values,
): string {
  const binStart = point.extra?.binStart;
  const binEnd = point.extra?.binEnd;
  if (
    binStart !== undefined &&
    binStart !== null &&
    binEnd !== undefined &&
    binEnd !== null
  ) {
    return formatOgeChartMessage(words.bin, {
      start: numberFormat(binStart, locale),
      end: numberFormat(binEnd, locale),
    });
  }
  if (argKind === 'time' && point.argNumeric !== null) {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      new Date(point.argNumeric),
    );
  }
  return String(point.argument);
}

/**
 * The value(s) of a point: OHLC, a `low – high` range, box statistics, or
 * the value — with the analytic parts (waterfall kind, pareto share,
 * indicator bands) and a `customizePoint` `description` appended.
 */
export function chartValueText<T>(
  point: ChartPoint<T>,
  locale: string | undefined,
  words: OgeChartsValueMessages = OGE_DEFAULT_CHARTS_MESSAGES.values,
): string {
  const format = (value: number | null | undefined): string =>
    value === null || value === undefined ? '' : numberFormat(value, locale);
  const extra = point.extra;
  let text: string;
  if (extra?.q1 !== undefined && extra.q3 !== undefined) {
    const parts = [
      `${words.low} ${format(point.low)}`,
      `${words.q1} ${format(extra.q1)}`,
      `${words.median} ${format(extra.median ?? point.value)}`,
      `${words.q3} ${format(extra.q3)}`,
      `${words.high} ${format(point.high)}`,
    ];
    const outliers = point.outliers?.length ?? 0;
    if (outliers > 0) {
      parts.push(
        formatOgeChartMessage(words.outliers, { count: String(outliers) }),
      );
    }
    text = parts.join(', ');
  } else if (point.open !== null && point.close !== null) {
    text = `O ${format(point.open)} H ${format(point.high)} L ${format(point.low)} C ${format(point.close)}`;
  } else if (point.value2 !== null && point.value !== null) {
    text = `${format(point.value2)} – ${format(point.value)}`;
  } else {
    text = format(point.value);
    const details: string[] = [];
    if (point.kind !== undefined) {
      details.push(
        point.kind === 'up'
          ? words.increase
          : point.kind === 'down'
            ? words.decrease
            : point.kind === 'intermediate'
              ? words.intermediate
              : words.total,
      );
    }
    if (extra?.cumulative !== undefined && extra.cumulative !== null) {
      details.push(
        formatOgeChartMessage(words.cumulative, {
          value: new Intl.NumberFormat(locale, {
            style: 'percent',
            maximumFractionDigits: 1,
          }).format(extra.cumulative),
        }),
      );
    }
    for (const key of ['upper', 'lower', 'signal', 'histogram'] as const) {
      const value = extra?.[key];
      if (value !== undefined && value !== null) {
        details.push(`${words[key]} ${format(value)}`);
      }
    }
    if (details.length > 0 && text !== '') {
      text = `${text} (${details.join(', ')})`;
    }
  }
  const description = point.style?.description;
  return description !== undefined && text !== ''
    ? `${text}, ${description}`
    : text;
}

/** The group/plot label: `{title}`, `{count}` + the keyboard hint. */
export function cartesianAriaLabel(
  messages: OgeChartsMessages,
  title: string,
  seriesCount: number,
): string {
  const label = messages.aria.chartLabel
    .replace('{title}', title || 'Data')
    .replace('{count}', String(seriesCount));
  return `${label}. ${messages.aria.plotHint}`;
}

export interface OgeChartSrRow {
  readonly argText: string;
  readonly cells: readonly string[];
}

/** The screen-reader data table (first `limit` arguments × legend series). */
export function cartesianSrRows<T>(
  scene: OgeCartesianScene<T>,
  limit: number,
): readonly OgeChartSrRow[] {
  const { argIndex: index, seriesList, argKind } = scene.data;
  const items = scene.legendItems;
  return index.sortedArgs.slice(0, limit).map((arg, position) => {
    const cells = items.map((item) => {
      const pointIndex = index.pointIndexAt(position, item.seriesIndex);
      if (pointIndex === -1) return '';
      return chartValueText(
        seriesList[item.seriesIndex].points[pointIndex],
        scene.locale,
        scene.data.messages.values,
      );
    });
    const first = items.find(
      (item) => index.pointIndexAt(position, item.seriesIndex) !== -1,
    );
    const argText =
      first === undefined
        ? String(arg)
        : chartArgumentText(
            argKind,
            seriesList[first.seriesIndex].points[
              index.pointIndexAt(position, first.seriesIndex)
            ],
            scene.locale,
            scene.data.messages.values,
          );
    return { argText, cells };
  });
}

/** The live-region text for the keyboard-active point. */
export function cartesianPointAnnouncement<T>(
  scene: OgeCartesianScene<T>,
  messages: OgeChartsMessages,
  position: number,
  seriesIndex: number,
): string | null {
  const series = scene.data.seriesList[seriesIndex];
  if (series === undefined) return null;
  const pointIndex = scene.data.argIndex.pointIndexAt(position, seriesIndex);
  const point = pointIndex === -1 ? null : series.points[pointIndex];
  return formatOgeChartMessage(messages.announcements.point, {
    series: series.name,
    argument:
      point === null
        ? ''
        : chartArgumentText(
            scene.data.argKind,
            point,
            scene.locale,
            messages.values,
          ),
    value:
      point === null
        ? ''
        : chartValueText(point, scene.locale, messages.values),
  });
}

/**
 * One tooltip row: `{series}: {value}` with the analytic parts, plus the
 * trend value and R² when the series' trendline asks for it (`showR2`).
 */
export function cartesianTooltipRowText<T>(
  scene: OgeCartesianScene<T>,
  event: OgeChartPointEvent<T>,
): string {
  const words = scene.data.messages.values;
  const series = scene.data.seriesList[event.seriesIndex];
  let text = `${event.seriesName}: ${chartValueText(event.point, scene.locale, words)}`;
  const trend = scene.data.trends[event.seriesIndex];
  const options =
    series === undefined
      ? null
      : chartTrendlineOptions(series.input as ChartSeriesInput<unknown>);
  if (
    trend !== null &&
    trend !== undefined &&
    options?.showR2 === true &&
    event.point.argNumeric !== null
  ) {
    const estimate = trend.predict(event.point.argNumeric);
    text += ` · ${formatOgeChartMessage(words.trend, {
      value: estimate === null ? '' : numberFormat(estimate, scene.locale),
      r2:
        trend.r2 === null
          ? '–'
          : new Intl.NumberFormat(scene.locale, {
              maximumFractionDigits: 3,
            }).format(trend.r2),
    })}`;
  }
  return text;
}

/** The marker colour of a tooltip row: the point's own colour, else the series'. */
export function cartesianPointEventColor<T>(
  scene: OgeCartesianScene<T>,
  event: OgeChartPointEvent<T>,
): string {
  const series = scene.data.seriesList[event.seriesIndex];
  const seriesColor = scene.colors[event.seriesIndex] ?? OGE_CHART_PALETTE[0];
  return series === undefined
    ? seriesColor
    : (chartPointColor(series, event.point, seriesColor) ?? seriesColor);
}

/* ------------------------------------------------------------------ */
/* stage 3 — hover                                                     */
/* ------------------------------------------------------------------ */

export interface OgeCartesianHoverState {
  /** Hovered/keyboard argument position (index into `sortedArgs`). */
  readonly activeArgPos: number | null;
  /** Pointer y inside the plot; `null` after keyboard moves. */
  readonly pointerY: number | null;
  /** Keyboard-focused series (crosshair value snap + announcements). */
  readonly activeSeriesIndex: number;
}

/** Non-shared tooltips snap to the series whose value is nearest the cursor. */
export function cartesianNearestSeries<T>(
  scene: OgeCartesianScene<T>,
  state: OgeCartesianHoverState,
): number {
  const { activeArgPos: position, pointerY: y } = state;
  if (position === null || y === null) return state.activeSeriesIndex;
  const index = scene.data.argIndex;
  const scales = scene.valueScales;
  let best = 0;
  let bestDist = Infinity;
  scene.data.seriesList.forEach((series, seriesIndex) => {
    if (!scene.visibility[seriesIndex]) return;
    const pointIndex = index.pointIndexAt(position, seriesIndex);
    if (pointIndex === -1) return;
    const value = series.points[pointIndex].value;
    if (value === null) return;
    const scale = scales[series.input.axis ?? 0] ?? scales[0];
    const dist = Math.abs(scale.toPx(value) - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = seriesIndex;
    }
  });
  return best;
}

/** Point events at the active argument (shared → every visible series). */
export function cartesianActivePoints<T>(
  scene: OgeCartesianScene<T>,
  state: OgeCartesianHoverState,
  shared: boolean,
): readonly OgeChartPointEvent<T>[] {
  const position = state.activeArgPos;
  if (position === null) return [];
  const index = scene.data.argIndex;
  const nearest = shared ? -1 : cartesianNearestSeries(scene, state);
  const list: OgeChartPointEvent<T>[] = [];
  scene.data.seriesList.forEach((series, seriesIndex) => {
    if (!scene.visibility[seriesIndex]) return;
    if (!shared && seriesIndex !== nearest) return;
    const pointIndex = index.pointIndexAt(position, seriesIndex);
    if (pointIndex === -1) return;
    const point = series.points[pointIndex];
    if (point.value === null && !isFinancialType(series.type)) return;
    list.push({
      seriesIndex,
      seriesName: series.name,
      pointIndex,
      point,
      event: new MouseEvent('pointermove'),
    });
  });
  return list;
}

export interface OgeChartCrosshairVm {
  readonly x: number;
  readonly y: number | null;
}

export function cartesianCrosshair<T>(
  scene: OgeCartesianScene<T>,
  state: OgeCartesianHoverState,
  options: OgeChartCrosshairOptions | undefined,
): OgeChartCrosshairVm | null {
  if (options?.enabled === false) return null;
  const position = state.activeArgPos;
  if (position === null) return null;
  const arg = scene.data.sortedArgs[position];
  if (arg === undefined) return null;
  return { x: scene.argScale.toPx(arg), y: state.pointerY };
}

export interface OgeChartTooltipVm<T> {
  readonly x: number;
  readonly y: number;
  readonly points: readonly OgeChartPointEvent<T>[];
  readonly argumentText: string;
}

/**
 * The tooltip balloon: positioned beside the crosshair, flipped to the left
 * in the last third of the plot. `suppressed` covers a drag in progress and
 * a cancelled `tooltipShowing`.
 */
export function cartesianTooltip<T>(
  scene: OgeCartesianScene<T>,
  state: OgeCartesianHoverState,
  points: readonly OgeChartPointEvent<T>[],
  options: OgeChartTooltipOptions | undefined,
  suppressed: boolean,
): OgeChartTooltipVm<T> | null {
  if (options?.enabled === false || suppressed) return null;
  const position = state.activeArgPos;
  if (points.length === 0 || position === null) return null;
  const arg = scene.data.sortedArgs[position];
  const x = scene.plot.x + scene.argScale.toPx(arg);
  const flip = x > scene.plot.x + scene.plot.w * 0.66;
  return {
    x: flip ? x - 12 : x + 12,
    y: scene.plot.y + 8,
    points,
    argumentText: chartArgumentText(
      scene.data.argKind,
      points[0].point,
      scene.locale,
      scene.data.messages.values,
    ),
  };
}

/* ------------------------------------------------------------------ */
/* pointer, zoom & selection                                           */
/* ------------------------------------------------------------------ */

/**
 * Where a pointer at plot coordinates `(x, y)` lands: the nearest argument
 * position, or `null` when outside the plot (or no data).
 */
export function cartesianHoverAt<T>(
  scene: OgeCartesianScene<T>,
  x: number,
  y: number,
): { readonly position: number | null; readonly pointerY: number | null } {
  if (x < 0 || x > scene.plot.w || y < 0 || y > scene.plot.h) {
    return { position: null, pointerY: null };
  }
  const position = nearestIndex(
    scene.data.sortedArgs,
    scene.argScale.fromPx(x),
  );
  return { position: position === -1 ? null : position, pointerY: y };
}

/** Whether a wheel zoom applies in this mode. */
export function chartWheelZoomEnabled(
  zoomEnabled: 'none' | 'wheel' | 'drag' | 'both',
): boolean {
  return zoomEnabled === 'wheel' || zoomEnabled === 'both';
}

/**
 * The window after one wheel notch at plot x (cursor-centered); `null` when
 * the pointer is outside the plot.
 */
export function cartesianWheelRange<T>(
  scene: OgeCartesianScene<T>,
  x: number,
  deltaY: number,
): ChartRange | null {
  if (x < 0 || x > scene.plot.w) return null;
  return zoomRangeAt(
    scene.effectiveRange,
    x / scene.plot.w,
    deltaY < 0 ? 0.8 : 1.25,
    scene.argBounds,
  );
}

/** What a primary-button press on the plot starts: pan, drag-zoom or nothing. */
export function chartDragMode(
  zoomEnabled: 'none' | 'wheel' | 'drag' | 'both',
  panEnabled: boolean,
  shiftKey: boolean,
): 'pan' | 'zoom' | null {
  if (panEnabled && shiftKey) return 'pan';
  if ((zoomEnabled === 'drag' || zoomEnabled === 'both') && !shiftKey) {
    return 'zoom';
  }
  return null;
}

/** The pan window after dragging `deltaX` px from `startRange`. */
export function cartesianPanRange<T>(
  scene: OgeCartesianScene<T>,
  startRange: ChartRange,
  deltaX: number,
): ChartRange {
  return panRange(startRange, -deltaX / scene.plot.w, scene.argBounds);
}

/** The committed drag-select window; `null` under the 8px threshold. */
export function cartesianSelectionRange<T>(
  scene: OgeCartesianScene<T>,
  startPx: number,
  endPx: number,
): ChartRange | null {
  if (Math.abs(endPx - startPx) < 8) return null;
  return rangeFromSelection(startPx, endPx, scene.argScale, scene.argBounds);
}

/** The zoom-drag rectangle between two plot x coordinates. */
export function chartZoomSelectionRect(
  startPx: number,
  px: number,
): { readonly x: number; readonly w: number } {
  return { x: Math.min(startPx, px), w: Math.abs(px - startPx) };
}

/**
 * The selection after activating `target`: series mode toggles the whole
 * series, point mode toggles the point (with `multi` — Ctrl/⌘ — adding to
 * the set). `null` when selection is off.
 */
export function nextChartSelection(
  mode: 'point' | 'series' | 'none',
  current: readonly OgeChartPointRef[],
  target: OgeChartPointRef,
  seriesPointCount: number,
  multi: boolean,
): OgeChartPointRef[] | null {
  if (mode === 'none') return null;
  if (mode === 'series') {
    const already =
      current.length > 0 && current[0].seriesIndex === target.seriesIndex;
    return already
      ? []
      : Array.from({ length: seriesPointCount }, (_, pointIndex) => ({
          seriesIndex: target.seriesIndex,
          pointIndex,
        }));
  }
  const same = (ref: OgeChartPointRef): boolean =>
    ref.seriesIndex === target.seriesIndex &&
    ref.pointIndex === target.pointIndex;
  const single = {
    seriesIndex: target.seriesIndex,
    pointIndex: target.pointIndex,
  };
  if (current.some(same)) return current.filter((ref) => !same(ref));
  return multi ? [...current, single] : [single];
}

/** Whether a point is in a selection. */
export function isChartPointSelected(
  selected: readonly OgeChartPointRef[],
  seriesIndex: number,
  pointIndex: number,
): boolean {
  return selected.some(
    (ref) => ref.seriesIndex === seriesIndex && ref.pointIndex === pointIndex,
  );
}

/** The window a programmatic `zoomToRange()` applies. */
export function cartesianZoomTo<T>(
  scene: OgeCartesianScene<T>,
  range: ChartRange,
): ChartRange {
  return clampRange(range, scene.argBounds);
}

/** Legend hover spotlight: the hovered series full, the rest dimmed. */
export function chartSeriesGroupOpacity(
  hoveredLegend: number | null,
  seriesIndex: number,
): number {
  return hoveredLegend === null || hoveredLegend === seriesIndex ? 1 : 0.25;
}

/** Snapshot for the image exporters and custom pipelines. */
export function cartesianExportData<T>(
  scene: OgeCartesianScene<T>,
  title: string,
): OgeChartExportData<T> {
  return {
    title,
    series: scene.data.seriesList.map((series, seriesIndex) => ({
      name: series.name,
      type: series.type,
      color: scene.colors[seriesIndex],
      visible: scene.visibility[seriesIndex],
      points: series.points,
    })),
    argumentRange: scene.effectiveRange,
    argumentKind: scene.data.argKind,
  };
}
