/**
 * The polar/radar view model — what `<oge-polar-chart>` and
 * `<OgePolarChart>` draw: nice-tick rings, category spokes, radar loops,
 * sectors and markers, the tooltip, announcements and the sr table.
 * Framework-free, in two stages like the cartesian model (data, then scene).
 */
import {
  angleForIndex,
  polarToCartesian,
  radarGridPath,
  radarLoopPath,
  type PolarXY,
} from './polar-layout';
import { sliceArcPath } from './pie-layout';
import { niceTicks } from './scale';
import {
  buildSeries,
  collectCategories,
  type ChartSeries,
  type ChartSeriesInput,
} from './series-model';
import { numberFormat } from './tick-format';
import { chartSeriesColor, mergeChartSeriesInputs } from './cartesian-model';
import type { OgeChartAxisOptions } from './charts-types';
import { formatOgeChartMessage, type OgeChartsMessages } from './charts-config';
import type { OgeChartLegendEntry, OgeChartSrRow } from './cartesian-model';

export interface OgePolarDataInput<T> {
  readonly dataSource: readonly T[];
  readonly series: readonly ChartSeriesInput<T>[];
  readonly commonSeries?: Partial<ChartSeriesInput<T>>;
}

export interface OgePolarData<T> {
  readonly categories: readonly unknown[];
  readonly seriesList: readonly ChartSeries<T>[];
}

export function buildPolarData<T>(
  input: OgePolarDataInput<T>,
): OgePolarData<T> {
  const merged = mergeChartSeriesInputs(input.series, input.commonSeries);
  const categories = collectCategories(input.dataSource, merged);
  const categoryIndex = new Map(
    categories.map((category, index) => [category, index] as const),
  );
  return {
    categories,
    seriesList: merged.map((entry, index) =>
      buildSeries(input.dataSource, entry, index, 'category', categoryIndex),
    ),
  };
}

export interface OgePolarSceneInput<T> {
  readonly data: OgePolarData<T>;
  /** `max` / `labelFormat` of the radial axis. */
  readonly valueAxis?: OgeChartAxisOptions;
  readonly spider: boolean;
  readonly startAngle: number;
  readonly palette?: readonly string[];
  readonly hiddenSeries: ReadonlySet<number>;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
}

export interface OgePolarRingVm {
  readonly radius: number;
  readonly path: string;
  readonly label: string;
}

export interface OgePolarSpokeVm {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly labelX: number;
  readonly labelY: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly label: string;
}

export interface OgePolarMarkerVm {
  readonly x: number;
  readonly y: number;
  readonly seriesIndex: number;
  readonly pointIndex: number;
}

export interface OgePolarSeriesVm {
  readonly seriesIndex: number;
  readonly name: string;
  readonly color: string;
  readonly linePathD: string | null;
  readonly areaPathD: string | null;
  readonly sectors: readonly {
    readonly path: string;
    readonly pointIndex: number;
  }[];
  readonly markers: readonly OgePolarMarkerVm[];
  readonly strokeWidth: number;
  readonly opacity: number;
}

export interface OgePolarScene<T> {
  readonly data: OgePolarData<T>;
  readonly locale: string | undefined;
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly startAngle: number;
  readonly valueMax: number;
  readonly rings: readonly OgePolarRingVm[];
  readonly spokes: readonly OgePolarSpokeVm[];
  readonly renderSeries: readonly OgePolarSeriesVm[];
  readonly legendItems: readonly OgeChartLegendEntry[];
  readonly colors: readonly string[];
  readonly hiddenSeries: ReadonlySet<number>;
  /** Nothing to plot: no legend series or no categories. */
  readonly empty: boolean;
}

export function buildPolarScene<T>(
  input: OgePolarSceneInput<T>,
): OgePolarScene<T> {
  const { data, hiddenSeries } = input;
  const { categories, seriesList } = data;
  const locale = input.locale;
  const cx = input.width / 2;
  const cy = input.height / 2;
  const radius = Math.max(30, Math.min(input.width, input.height) / 2 - 42);
  const count = categories.length;
  const valueAxis = input.valueAxis ?? {};

  const valueMax = ((): number => {
    const override = valueAxis.max;
    if (typeof override === 'number') return override;
    let max = 0;
    seriesList.forEach((series, index) => {
      if (hiddenSeries.has(index)) return;
      for (const point of series.points) {
        if (point.value !== null && point.value > max) max = point.value;
      }
    });
    return max > 0 ? max : 1;
  })();
  const radiusOf = (value: number): number => (value / valueMax) * radius;

  const format = valueAxis.labelFormat;
  const rings = niceTicks(0, valueMax, 4)
    .filter((tick) => tick > 0)
    .map((tick) => ({
      radius: radiusOf(tick),
      path: radarGridPath(
        cx,
        cy,
        radiusOf(tick),
        count,
        input.spider,
        input.startAngle,
      ),
      label: format !== undefined ? format(tick) : numberFormat(tick, locale),
    }));

  const spokes = categories.map((category, index): OgePolarSpokeVm => {
    const angle = angleForIndex(index, count, input.startAngle);
    const edge = polarToCartesian(cx, cy, radius, angle);
    const label = polarToCartesian(cx, cy, radius + 14, angle);
    const sin = Math.sin(angle);
    return {
      index,
      x: edge.x,
      y: edge.y,
      labelX: label.x,
      labelY: label.y + 4,
      anchor: Math.abs(sin) < 0.3 ? 'middle' : sin > 0 ? 'start' : 'end',
      label: String(category),
    };
  });

  const colors = seriesList.map((series, index) =>
    chartSeriesColor(series as ChartSeries<unknown>, index, input.palette),
  );

  const renderSeries: OgePolarSeriesVm[] = [];
  seriesList.forEach((series, seriesIndex) => {
    if (hiddenSeries.has(seriesIndex)) return;
    const type = series.type;
    const points: (PolarXY | null)[] = series.points.map((point) => {
      if (point.argNumeric === null || point.value === null) return null;
      return polarToCartesian(
        cx,
        cy,
        radiusOf(Math.max(0, point.value)),
        angleForIndex(point.argNumeric, count, input.startAngle),
      );
    });
    const markers: OgePolarMarkerVm[] = [];
    points.forEach((point, pointIndex) => {
      if (point !== null) {
        markers.push({ x: point.x, y: point.y, seriesIndex, pointIndex });
      }
    });
    const sectors: { path: string; pointIndex: number }[] = [];
    if (type === 'bar') {
      const half = Math.PI / Math.max(3, count) / 1.6;
      series.points.forEach((point, pointIndex) => {
        if (point.argNumeric === null || point.value === null) return;
        const angle = angleForIndex(point.argNumeric, count, input.startAngle);
        sectors.push({
          path: sliceArcPath(
            cx,
            cy,
            radiusOf(Math.max(0, point.value)),
            0,
            angle - half,
            angle + half,
          ),
          pointIndex,
        });
      });
    }
    const loop = type === 'line' || type === 'area';
    renderSeries.push({
      seriesIndex,
      name: series.name,
      color: colors[seriesIndex],
      linePathD: loop ? radarLoopPath(points, true) || null : null,
      areaPathD:
        type === 'area' ? `${radarLoopPath(points, true)}` || null : null,
      sectors,
      markers: type === 'bar' ? [] : markers,
      strokeWidth: series.input.width ?? 2,
      opacity: series.input.opacity ?? 1,
    });
  });

  const legendItems = seriesList
    .map((series, seriesIndex) => ({
      seriesIndex,
      name: series.name,
      color: colors[seriesIndex],
      hidden: hiddenSeries.has(seriesIndex),
      inLegend: series.input.showInLegend !== false,
    }))
    .filter((item) => item.inLegend)
    .map(({ inLegend: _inLegend, ...item }) => item);

  return {
    data,
    locale,
    cx,
    cy,
    radius,
    startAngle: input.startAngle,
    valueMax,
    rings,
    spokes,
    renderSeries,
    legendItems,
    colors,
    hiddenSeries,
    empty: legendItems.length === 0 || count === 0,
  };
}

export interface OgePolarHover {
  readonly seriesIndex: number;
  readonly pointIndex: number;
}

export interface OgePolarTooltipVm {
  readonly x: number;
  readonly y: number;
  readonly argument: string;
  readonly seriesName: string;
  readonly color: string;
  readonly valueText: string;
}

export function polarTooltip<T>(
  scene: OgePolarScene<T>,
  hover: OgePolarHover | null,
): OgePolarTooltipVm | null {
  if (hover === null) return null;
  const series = scene.data.seriesList[hover.seriesIndex];
  const point = series?.points[hover.pointIndex];
  if (point === undefined || point.value === null) return null;
  const position = polarToCartesian(
    scene.cx,
    scene.cy,
    (point.value / scene.valueMax) * scene.radius,
    angleForIndex(
      point.argNumeric ?? 0,
      scene.data.categories.length,
      scene.startAngle,
    ),
  );
  return {
    x: position.x + 12,
    y: position.y - 8,
    argument: String(point.argument),
    seriesName: series.name,
    color: scene.colors[hover.seriesIndex],
    valueText: numberFormat(point.value, scene.locale),
  };
}

/** The point of `seriesIndex` at category `argPosition` (`-1` = none). */
export function polarPointIndex<T>(
  scene: OgePolarScene<T>,
  seriesIndex: number,
  argPosition: number,
): number {
  const series = scene.data.seriesList[seriesIndex];
  if (series === undefined) return -1;
  return series.points.findIndex((point) => point.argNumeric === argPosition);
}

/** The live-region text for the keyboard-active category. */
export function polarPointAnnouncement<T>(
  scene: OgePolarScene<T>,
  messages: OgeChartsMessages,
  argPosition: number,
  seriesIndex: number,
): string {
  const series = scene.data.seriesList[seriesIndex];
  const point = series?.points.find(
    (entry) => entry.argNumeric === argPosition,
  );
  return formatOgeChartMessage(messages.announcements.point, {
    series: series?.name ?? '',
    argument: String(scene.data.categories[argPosition] ?? ''),
    value: point?.value == null ? '' : numberFormat(point.value, scene.locale),
  });
}

/** The screen-reader data table (first `limit` categories × legend series). */
export function polarSrRows<T>(
  scene: OgePolarScene<T>,
  limit: number,
): readonly OgeChartSrRow[] {
  return scene.data.categories.slice(0, limit).map((category, argPosition) => ({
    argText: String(category),
    cells: scene.legendItems.map((item) => {
      const point = scene.data.seriesList[item.seriesIndex].points.find(
        (entry) => entry.argNumeric === argPosition,
      );
      return point?.value == null
        ? ''
        : numberFormat(point.value, scene.locale);
    }),
  }));
}

/**
 * Point-mode selection after Enter on a polar point: toggles it off when
 * selected, otherwise replaces the selection with it.
 */
export function nextPolarSelection(
  current: readonly { seriesIndex: number; pointIndex: number }[],
  seriesIndex: number,
  pointIndex: number,
): { seriesIndex: number; pointIndex: number }[] {
  const same = (ref: { seriesIndex: number; pointIndex: number }): boolean =>
    ref.seriesIndex === seriesIndex && ref.pointIndex === pointIndex;
  return current.some(same)
    ? current.filter((ref) => !same(ref))
    : [{ seriesIndex, pointIndex }];
}
