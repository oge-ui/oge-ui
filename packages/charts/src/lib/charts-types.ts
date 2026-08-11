/** Public types of `@oge-ui/charts`. */
import type { ChartRange, ChartScaleKind } from './engine/scale';
import type {
  ChartPoint,
  ChartSeriesInput,
  ChartSeriesType,
} from './engine/series-model';
import type { PieSmallValuesGrouping } from './engine/pie-layout';
import type { LabelOverlapMode } from './engine/tick-format';

/** Series types: `'line' | 'spline' | 'area' | … | 'candlestick'`. */
export type OgeChartSeriesType = ChartSeriesType;

/** One series definition (field mapping via names, dotted paths or getters). */
export type OgeChartSeriesInput<T = unknown> = ChartSeriesInput<T>;

/** A normalized data point — the payload of events and tooltips. */
export type OgeChartPoint<T = unknown> = ChartPoint<T>;

/** Axis kinds. The argument axis auto-detects when unset. */
export type OgeChartAxisType = ChartScaleKind;

/** A numeric axis window (time axes: epoch ms; category: index space). */
export type OgeChartRange = ChartRange;

/** Small-slice grouping of the pie (`topN` / `smallValueThreshold`). */
export type OgeChartSmallValuesGrouping = PieSmallValuesGrouping;

/** A vertical marker or shaded band on the argument axis. */
export interface OgeChartStripLine {
  readonly start: number | Date | string;
  /** With `end`, a shaded band; without, a line. */
  readonly end?: number | Date | string;
  readonly label?: string;
  readonly color?: string;
}

/** Axis options (argument axis and each value axis). */
export interface OgeChartAxisOptions {
  /** Unset argument axis auto-detects: numbers / dates / categories. */
  readonly type?: OgeChartAxisType;
  readonly min?: number | Date;
  readonly max?: number | Date;
  readonly inverted?: boolean;
  /** Grid lines across the plot. Default: value axes yes, argument no. */
  readonly grid?: boolean;
  readonly title?: string;
  /** Custom tick label text; wins over the built-in Intl formatting. */
  readonly labelFormat?: (value: unknown) => string;
  /** Overlap resolution of argument labels. Default `'skip'`. */
  readonly labelOverlap?: LabelOverlapMode;
  /** Value axes: `'end'` renders on the right. */
  readonly position?: 'start' | 'end';
  /** SI-abbreviated value labels (`1.2K`). Default true for value axes. */
  readonly abbreviate?: boolean;
}

export interface OgeChartLegendOptions {
  readonly visible?: boolean;
  readonly position?: 'top' | 'bottom' | 'start' | 'end';
  /** Clicking toggles series visibility. Default true. */
  readonly interactive?: boolean;
}

export interface OgeChartTooltipOptions {
  readonly enabled?: boolean;
  /** One balloon listing every series at the hovered argument. */
  readonly shared?: boolean;
}

export interface OgeChartCrosshairOptions {
  readonly enabled?: boolean;
  readonly horizontal?: boolean;
}

/** A selected point address. */
export interface OgeChartPointRef {
  readonly seriesIndex: number;
  readonly pointIndex: number;
}

/** Point interaction payload. */
export interface OgeChartPointEvent<T = unknown> {
  readonly seriesIndex: number;
  readonly seriesName: string;
  readonly pointIndex: number;
  readonly point: OgeChartPoint<T>;
  readonly event: MouseEvent | KeyboardEvent;
}

export interface OgeChartSeriesEvent {
  readonly seriesIndex: number;
  readonly seriesName: string;
  readonly event: MouseEvent;
}

/** Cancelable: before a legend click toggles the series. */
export interface OgeChartLegendClickEvent {
  readonly seriesIndex: number;
  readonly seriesName: string;
  /** The visibility the toggle would apply. */
  readonly willHide: boolean;
  cancel: boolean;
}

/** Cancelable: before the tooltip shows. */
export interface OgeChartTooltipShowingEvent<T = unknown> {
  readonly points: readonly OgeChartPointEvent<T>[];
  cancel: boolean;
}

/**
 * Snapshot of the widget for exporters (`@oge-ui/charts/export-image`):
 * per-series names/points plus the plotted ranges.
 */
export interface OgeChartExportData<T = unknown> {
  readonly title: string;
  readonly series: readonly {
    readonly name: string;
    readonly type: OgeChartSeriesType;
    readonly color: string;
    readonly visible: boolean;
    readonly points: readonly OgeChartPoint<T>[];
  }[];
  readonly argumentRange: OgeChartRange;
  readonly argumentKind: OgeChartAxisType;
}
