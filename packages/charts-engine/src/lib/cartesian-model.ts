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
  baselineAreaPath,
  linePath,
  splinePath,
  steppedPoints,
  type PathPoint,
} from './path-builder';
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
import { formatOgeChartMessage, type OgeChartsMessages } from './charts-config';

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
  const categories =
    argKind === 'category' ? collectCategories(input.dataSource, merged) : [];
  const categoryIndex = new Map(
    categories.map((category, index) => [category, index] as const),
  );
  const seriesList = merged.map((entry, index) =>
    buildSeries(input.dataSource, entry, index, argKind, categoryIndex),
  );
  const argIndex = buildArgumentIndex(
    seriesList.map((series) => series.points.map((point) => point.argNumeric)),
  );
  return {
    argKind,
    categories,
    categoryIndex,
    seriesList,
    stacks: computeStacks(seriesList),
    argIndex,
    sortedArgs: argIndex.sortedArgs,
    hasBars: seriesList.some((series) => isBarType(series.type)),
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
}

export interface OgeChartRenderMarker {
  readonly x: number;
  readonly y: number;
  readonly seriesIndex: number;
  readonly pointIndex: number;
  /** Bubble radius; undefined = the default marker size of the type. */
  readonly r?: number;
}

export interface OgeChartRenderLabel {
  readonly x: number;
  readonly y: number;
  readonly text: string;
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
  readonly labels: readonly OgeChartRenderLabel[];
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
      if (isBarType(series.type) || series.type === 'area') {
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
    stacks,
    argScale,
    valueScales,
    barBandPx,
    plotW,
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
    }))
    .filter((item) => item.inLegend)
    .map(({ inLegend: _inLegend, ...item }) => item);

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

function buildRenderSeries<T>(ctx: {
  seriesList: readonly ChartSeries<T>[];
  visibility: readonly boolean[];
  colors: readonly string[];
  stacks: OgeCartesianData<T>['stacks'];
  argScale: ChartScale;
  valueScales: readonly ChartScale[];
  barBandPx: number;
  plotW: number;
  markerThreshold: number;
  locale: string | undefined;
}): OgeChartRenderSeries[] {
  const { argScale: scale, valueScales: scales, stacks } = ctx;
  const barSlots = computeBarSlots(ctx.seriesList, ctx.barBandPx);
  const result: OgeChartRenderSeries[] = [];
  ctx.seriesList.forEach((series, seriesIndex) => {
    if (!ctx.visibility[seriesIndex]) return;
    const valueScale = scales[series.input.axis ?? 0] ?? scales[0];
    const color = ctx.colors[seriesIndex];
    const stacked = stacks[seriesIndex];
    const slot = barSlots[seriesIndex];
    const xOf = (point: ChartPoint<T>): number | null =>
      point.argNumeric === null ? null : scale.toPx(point.argNumeric);
    const showLabels = series.input.showLabels === true;
    const labels: OgeChartRenderLabel[] = [];
    const labelText = (value: number): string => siFormat(value, ctx.locale);
    const dashArray =
      series.input.dashStyle === 'dash'
        ? '6 4'
        : series.input.dashStyle === 'dot'
          ? '2 3'
          : null;
    const strokeWidth = series.input.width ?? 2;
    const opacity = series.input.opacity ?? 1;

    let linePathD: string | null = null;
    let areaPathD: string | null = null;
    const bars: OgeChartRenderBar[] = [];
    const candles: OgeChartRenderCandle[] = [];
    const markers: OgeChartRenderMarker[] = [];

    const type = series.type;
    if (isBarType(type)) {
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
        bars.push({
          x: x + slot.offsetPx,
          y: Math.min(y1, y2),
          w: slot.widthPx,
          h: Math.max(1, Math.abs(y2 - y1)),
          seriesIndex,
          pointIndex,
        });
        if (showLabels && point.value !== null) {
          labels.push({
            x: x + slot.offsetPx + slot.widthPx / 2,
            y: Math.min(y1, y2) - 4,
            text: labelText(point.value),
          });
        }
      });
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
        const frac =
          point.size === null ? 0.5 : (point.size - sizeMin) / sizeSpan;
        // sqrt so AREA (not radius) tracks the size value
        const r = 4 + Math.sqrt(frac) * 14;
        const y = valueScale.toPx(point.value);
        markers.push({ x, y, seriesIndex, pointIndex, r });
        if (showLabels) {
          labels.push({ x, y: y - r - 4, text: labelText(point.value) });
        }
      });
    } else if (type === 'candlestick') {
      const w = Math.max(3, ctx.barBandPx * 0.5);
      series.points.forEach((point, pointIndex) => {
        const x = xOf(point);
        const geometry = candleGeometry(point);
        if (x === null || geometry === null) return;
        const bodyY1 = valueScale.toPx(geometry.bodyTop);
        const bodyY2 = valueScale.toPx(geometry.bodyBottom);
        candles.push({
          x,
          bodyY: Math.min(bodyY1, bodyY2),
          bodyH: Math.max(1, Math.abs(bodyY2 - bodyY1)),
          wickY1: valueScale.toPx(geometry.wickTop),
          wickY2: valueScale.toPx(geometry.wickBottom),
          w,
          rising: geometry.rising,
          pointIndex,
        });
      });
    } else if (type === 'scatter') {
      series.points.forEach((point, pointIndex) => {
        const x = xOf(point);
        if (x === null || point.value === null) return;
        const y = valueScale.toPx(point.value);
        markers.push({ x, y, seriesIndex, pointIndex });
        if (showLabels) {
          labels.push({ x, y: y - 8, text: labelText(point.value) });
        }
      });
    } else {
      // line-family
      const spline = type === 'spline' || type === 'splineArea';
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
      if (
        type === 'area' ||
        type === 'splineArea' ||
        type === 'stepArea' ||
        type === 'stackedArea' ||
        type === 'fullStackedArea' ||
        type === 'rangeArea'
      ) {
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
        } else if (
          (type === 'stackedArea' || type === 'fullStackedArea') &&
          stacked !== null
        ) {
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
          areaPathD = `${linePathD} ${reversePathPoints(bottom)} Z`;
        } else {
          const baselineY = valueScale.toPx(
            Math.max(valueScale.min, Math.min(valueScale.max, 0)),
          );
          areaPathD = baselineAreaPath(pathTop, baselineY, spline);
        }
      }
      if (series.points.length <= ctx.markerThreshold) {
        series.points.forEach((point, pointIndex) => {
          const pathPoint = top[pointIndex];
          if (pathPoint.y === null) return;
          markers.push({
            x: pathPoint.x,
            y: pathPoint.y,
            seriesIndex,
            pointIndex,
          });
          if (showLabels && point.value !== null) {
            labels.push({
              x: pathPoint.x,
              y: pathPoint.y - 8,
              text: labelText(point.value),
            });
          }
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
      labels,
      dashArray,
      strokeWidth,
      opacity,
    });
  });
  return result;
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
): string {
  if (argKind === 'time' && point.argNumeric !== null) {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      new Date(point.argNumeric),
    );
  }
  return String(point.argument);
}

/** The value(s) of a point: OHLC, a `low – high` range, or the value. */
export function chartValueText<T>(
  point: ChartPoint<T>,
  locale: string | undefined,
): string {
  if (point.open !== null && point.close !== null) {
    const format = (value: number | null): string =>
      value === null ? '' : numberFormat(value, locale);
    return `O ${format(point.open)} H ${format(point.high)} L ${format(point.low)} C ${format(point.close)}`;
  }
  if (point.value2 !== null && point.value !== null) {
    return `${numberFormat(point.value2, locale)} – ${numberFormat(point.value, locale)}`;
  }
  return point.value === null ? '' : numberFormat(point.value, locale);
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
        : chartArgumentText(scene.data.argKind, point, scene.locale),
    value: point === null ? '' : chartValueText(point, scene.locale),
  });
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
    if (point.value === null && series.type !== 'candlestick') return;
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
