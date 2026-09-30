/**
 * Public types of the charts family — one set for both render layers
 * (`@oge-ui/charts` and `@oge-ui/react-charts` re-export them).
 */
import type { ChartRange, ChartScaleKind } from './scale';
import type {
  ChartPoint,
  ChartSeriesInput,
  ChartSeriesType,
} from './series-model';
import type { PieSmallValuesGrouping } from './pie-layout';
import type { LabelOverlapMode } from './tick-format';

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

/**
 * An annotation anchored on the plot: `'point'` draws a marker dot with a
 * connector into a label box; `'text'` places the label alone. Anchors
 * resolve on the argument axis (+ `value` on the given value axis;
 * without `value` the label sits at the top of the plot).
 */
export interface OgeChartAnnotation {
  readonly type?: 'text' | 'point';
  readonly text: string;
  readonly argument: number | Date | string;
  readonly value?: number;
  /** Index into the `valueAxis` array. Default 0. */
  readonly axis?: number;
  readonly color?: string;
  /** Label offset from the anchor, px. */
  readonly offsetX?: number;
  readonly offsetY?: number;
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

/** A rendered pie slice — the payload of pie events and tooltips. */
export interface OgeChartPieSliceEvent<T = unknown> {
  readonly index: number;
  readonly argument: unknown;
  readonly value: number;
  readonly fraction: number;
  /** Merged sources for the synthetic "others" slice. */
  readonly sources: readonly T[];
  readonly grouped: boolean;
}

/** A legend entry — what a custom legend item renders. */
export interface OgeChartLegendItem {
  readonly name: string;
  readonly color: string;
  readonly hidden: boolean;
}

/**
 * Default palette — concrete hex values (not CSS vars) so exported images
 * carry their colors; chosen to hold up on light and dark surfaces.
 */
export const OGE_CHART_PALETTE: readonly string[] = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#ec4899',
  '#84cc16',
];
