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
import {
  chartLegendSwatch,
  chartPointColor,
  chartSeriesColor,
  chartValueText,
  mergeChartSeriesInputs,
} from './cartesian-model';
import type { OgeChartAxisOptions } from './charts-types';
import {
  OGE_DEFAULT_CHARTS_MESSAGES,
  formatOgeChartMessage,
  type OgeChartsMessages,
} from './charts-config';
import type { OgeChartLegendEntry, OgeChartSrRow } from './cartesian-model';
import { deriveChartSeries } from './series-derive';
import {
  chartContrastText,
  chartLabelOptions,
  chartLabelText,
  chartPointHasLabel,
  chartPointLabelAnchor,
  resolveChartLabels,
  type ChartLabelCandidate,
  type OgeChartRenderLabel,
} from './data-labels';

export interface OgePolarDataInput<T> {
  readonly dataSource: readonly T[];
  readonly series: readonly ChartSeriesInput<T>[];
  readonly commonSeries?: Partial<ChartSeriesInput<T>>;
  /** The resolved messages (value texts). Default: English. */
  readonly messages?: OgeChartsMessages;
}

export interface OgePolarData<T> {
  readonly categories: readonly unknown[];
  readonly seriesList: readonly ChartSeries<T>[];
  readonly messages: OgeChartsMessages;
}

export function buildPolarData<T>(
  input: OgePolarDataInput<T>,
): OgePolarData<T> {
  const merged = mergeChartSeriesInputs(input.series, input.commonSeries);
  const categories = collectCategories(input.dataSource, merged);
  const categoryIndex = new Map(
    categories.map((category, index) => [category, index] as const),
  );
  const messages = input.messages ?? OGE_DEFAULT_CHARTS_MESSAGES;
  return {
    categories,
    // the derive pass applies `customizePoint` (the polar types need no
    // other derivation)
    seriesList: deriveChartSeries(
      merged.map((entry, index) =>
        buildSeries(input.dataSource, entry, index, 'category', categoryIndex),
      ),
      { dataSource: input.dataSource, messages },
    ).seriesList,
    messages,
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
  /** Per-point fill; `null` = the series colour. */
  readonly color?: string | null;
  /** Radius (`customizePoint` marker size); default 4. */
  readonly r?: number;
}

export interface OgePolarSectorVm {
  readonly path: string;
  readonly pointIndex: number;
  /** Per-point fill; `null` = the series colour. */
  readonly color?: string | null;
}

export interface OgePolarSeriesVm {
  readonly seriesIndex: number;
  readonly name: string;
  readonly color: string;
  readonly linePathD: string | null;
  readonly areaPathD: string | null;
  readonly sectors: readonly OgePolarSectorVm[];
  readonly markers: readonly OgePolarMarkerVm[];
  /** Data labels after overlap resolution. */
  readonly labels: readonly OgeChartRenderLabel[];
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
  /** Radial-bar background rings (one per category; empty otherwise). */
  readonly tracks: readonly string[];
  /** Whether the chart draws radial bars (concentric category rings). */
  readonly radial: boolean;
  readonly renderSeries: readonly OgePolarSeriesVm[];
  readonly legendItems: readonly OgeChartLegendEntry[];
  readonly colors: readonly string[];
  readonly hiddenSeries: ReadonlySet<number>;
  /** Nothing to plot: no legend series or no categories. */
  readonly empty: boolean;
}

/** Radial-bar band of category `index` for series slot `slot` of `slots`. */
function radialBand(
  radius: number,
  count: number,
  index: number,
  slot: number,
  slots: number,
): { inner: number; outer: number } {
  const hole = radius * 0.22;
  const band = (radius - hole) / Math.max(1, count);
  const inner = hole + band * index + band * 0.12;
  const usable = band * 0.76;
  const width = usable / Math.max(1, slots);
  return {
    inner: inner + width * slot,
    outer: inner + width * (slot + 1) - (slots > 1 ? 1 : 0),
  };
}

const TAU = Math.PI * 2;

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
  const radial = seriesList.some(
    (series, index) => series.type === 'radialBar' && !hiddenSeries.has(index),
  );
  const radialSlots = seriesList
    .map((series, index) => ({ series, index }))
    .filter(
      ({ series, index }) =>
        series.type === 'radialBar' && !hiddenSeries.has(index),
    )
    .map(({ index }) => index);

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
  const rings = radial
    ? []
    : niceTicks(0, valueMax, 4)
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
          label:
            format !== undefined ? format(tick) : numberFormat(tick, locale),
        }));

  const spokes = categories.map((category, index): OgePolarSpokeVm => {
    if (radial) {
      // radial bars: the category label sits left of each ring's start
      const band = radialBand(radius, count, index, 0, 1);
      const mid = (band.inner + band.outer) / 2;
      return {
        index,
        x: cx,
        y: cy,
        labelX: cx - 6,
        labelY: cy - mid + 4,
        anchor: 'end',
        label: String(category),
      };
    }
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

  const tracks = radial
    ? categories.map((_, index) => {
        const band = radialBand(radius, count, index, 0, 1);
        return sliceArcPath(cx, cy, band.outer, band.inner, 0, TAU);
      })
    : [];

  const colors = seriesList.map((series, index) =>
    chartSeriesColor(series as ChartSeries<unknown>, index, input.palette),
  );

  const candidates: ChartLabelCandidate[] = [];
  const renderSeries: OgePolarSeriesVm[] = [];
  seriesList.forEach((series, seriesIndex) => {
    if (hiddenSeries.has(seriesIndex)) return;
    const type = series.type;
    const color = colors[seriesIndex];
    const labelOptions = chartLabelOptions(series);
    const position = labelOptions.position ?? 'outside';
    const overlap = labelOptions.overlap ?? 'hide';
    const pointColor = (point: (typeof series.points)[number]): string | null =>
      chartPointColor(series, point, color);
    const pushLabel = (
      pointIndex: number,
      anchor: { x: number; y: number; inside: boolean },
    ): void => {
      const point = series.points[pointIndex];
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
            null,
            locale,
          ),
          anchor: 'middle',
          inside: anchor.inside,
          textColor: anchor.inside
            ? chartContrastText(pointColor(point) ?? color)
            : null,
          seriesIndex,
          pointIndex,
          seriesName: series.name,
          argument: point.argument,
          value: point.value,
        },
      });
    };
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
    const sectors: OgePolarSectorVm[] = [];
    if (type === 'radialBar') {
      const slot = radialSlots.indexOf(seriesIndex);
      series.points.forEach((point, pointIndex) => {
        if (point.argNumeric === null || point.value === null) return;
        const band = radialBand(
          radius,
          count,
          point.argNumeric,
          slot,
          radialSlots.length,
        );
        const sweep = Math.min(
          TAU * 0.9999,
          (Math.max(0, point.value) / valueMax) * TAU,
        );
        if (sweep <= 0) return;
        sectors.push({
          path: sliceArcPath(
            cx,
            cy,
            band.outer,
            band.inner,
            input.startAngle,
            input.startAngle + sweep,
          ),
          pointIndex,
          color: pointColor(point),
        });
        const end = polarToCartesian(
          cx,
          cy,
          (band.inner + band.outer) / 2,
          input.startAngle + sweep,
        );
        pushLabel(pointIndex, { x: end.x + 12, y: end.y + 4, inside: false });
      });
    } else if (type === 'bar') {
      const half = Math.PI / Math.max(3, count) / 1.6;
      series.points.forEach((point, pointIndex) => {
        if (point.argNumeric === null || point.value === null) return;
        const angle = angleForIndex(point.argNumeric, count, input.startAngle);
        const r = radiusOf(Math.max(0, point.value));
        sectors.push({
          path: sliceArcPath(cx, cy, r, 0, angle - half, angle + half),
          pointIndex,
          color: pointColor(point),
        });
        const inside = position !== 'outside' && r > 28;
        const at = polarToCartesian(cx, cy, inside ? r * 0.65 : r + 10, angle);
        pushLabel(pointIndex, { x: at.x, y: at.y + 4, inside });
      });
    } else {
      points.forEach((point, pointIndex) => {
        if (point === null) return;
        const style = series.points[pointIndex].style;
        if (style?.marker?.visible !== false) {
          markers.push({
            x: point.x,
            y: point.y,
            seriesIndex,
            pointIndex,
            color: pointColor(series.points[pointIndex]),
            ...(style?.marker?.size !== undefined
              ? { r: style.marker.size / 2 }
              : {}),
          });
        }
        pushLabel(pointIndex, chartPointLabelAnchor(point.x, point.y, 4, position));
      });
    }
    const loop = type === 'line' || type === 'area';
    renderSeries.push({
      seriesIndex,
      name: series.name,
      color,
      linePathD: loop ? radarLoopPath(points, true) || null : null,
      areaPathD:
        type === 'area' ? `${radarLoopPath(points, true)}` || null : null,
      sectors,
      markers,
      labels: [],
      strokeWidth: series.input.width ?? 2,
      opacity: series.input.opacity ?? 1,
    });
  });
  const kept =
    candidates.length === 0
      ? []
      : resolveChartLabels(candidates, input.width, input.height);

  const legendItems = seriesList
    .map((series, seriesIndex) => ({
      seriesIndex,
      name: series.name,
      color: colors[seriesIndex],
      hidden: hiddenSeries.has(seriesIndex),
      inLegend: series.input.showInLegend !== false,
      swatch: chartLegendSwatch(
        series.points
          .slice(0, 500)
          .map(
            (point) =>
              chartPointColor(series, point, colors[seriesIndex]) ??
              colors[seriesIndex],
          ),
      ),
    }))
    .filter((item) => item.inLegend)
    .map(({ seriesIndex, name, color, hidden, swatch }) => ({
      seriesIndex,
      name,
      color,
      hidden,
      swatch: swatch === 'transparent' ? color : swatch,
    }));

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
    tracks,
    radial,
    renderSeries: renderSeries.map((entry) => ({
      ...entry,
      labels: kept.filter((label) => label.seriesIndex === entry.seriesIndex),
    })),
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
  const count = scene.data.categories.length;
  const position =
    series.type === 'radialBar'
      ? polarToCartesian(
          scene.cx,
          scene.cy,
          scene.radius * 0.6,
          scene.startAngle +
            Math.min(1, Math.max(0, point.value) / scene.valueMax) * TAU,
        )
      : polarToCartesian(
          scene.cx,
          scene.cy,
          (point.value / scene.valueMax) * scene.radius,
          angleForIndex(point.argNumeric ?? 0, count, scene.startAngle),
        );
  const seriesColor = scene.colors[hover.seriesIndex];
  return {
    x: position.x + 12,
    y: position.y - 8,
    argument: String(point.argument),
    seriesName: series.name,
    color: chartPointColor(series, point, seriesColor) ?? seriesColor,
    valueText: chartValueText(point, scene.locale, scene.data.messages.values),
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
    value:
      point?.value == null
        ? ''
        : chartValueText(point, scene.locale, messages.values),
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
        : chartValueText(point, scene.locale, scene.data.messages.values);
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
