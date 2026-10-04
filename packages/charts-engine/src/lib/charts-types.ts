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

/**
 * A threshold / target line across the plot at one axis value, with an
 * optional label. Value-axis lines run parallel to the argument axis;
 * argument-axis lines cross it.
 */
export interface OgeChartConstantLine {
  /** Axis value (argument axes also take dates and category names). */
  readonly value: number | Date | string;
  readonly label?: string;
  /** Any CSS colour — a theme token such as `var(--oge-danger)` included. */
  readonly color?: string;
  /** Stroke pattern. Default `'dash'`. */
  readonly dash?: 'solid' | 'dash' | 'dot';
  /** Stroke width, px. Default 1.5. */
  readonly width?: number;
  /**
   * `'inside'` (default) prints the label inside the plot beside the line;
   * `'outside'` prints it in the margin past the plot edge.
   */
  readonly position?: 'inside' | 'outside';
}

/** A shaded band between two axis values, with an optional label. */
export interface OgeChartAxisStrip {
  readonly start: number | Date | string;
  readonly end: number | Date | string;
  readonly label?: string;
  /** Any CSS colour; default the `--oge-chart-strip-bg` token. */
  readonly color?: string;
}

/** A value range the value axis skips, drawn with a zig-zag marker. */
export interface OgeChartAxisBreak {
  readonly start: number;
  readonly end: number;
}

/**
 * A calendar interval (time axes): ticks step by real months and years,
 * never by a fixed number of milliseconds.
 */
export interface OgeChartDateInterval {
  readonly years?: number;
  readonly months?: number;
  readonly weeks?: number;
  readonly days?: number;
  readonly hours?: number;
  readonly minutes?: number;
}

/**
 * The distance between major ticks: a number in axis units (milliseconds
 * on a time axis, every n-th category on a category axis) or a calendar
 * interval on a time axis.
 */
export type OgeChartTickInterval = number | OgeChartDateInterval;

/** Minor ticks between the major ones. */
export interface OgeChartMinorTickOptions {
  readonly visible?: boolean;
  /** Minor ticks per major interval. Default 4. */
  readonly count?: number;
}

/**
 * How overlapping axis labels resolve: `'rotate'` tilts them, `'stagger'`
 * alternates two rows, `'hide'` drops the ones that collide, `'skip'`
 * keeps every n-th, `'none'` draws all of them.
 */
export type OgeChartLabelOverlap = LabelOverlapMode;

/**
 * Tick-label text: a function, or `Intl` options (number options on
 * numeric axes, date options on time axes).
 */
export type OgeChartLabelFormat =
  | ((value: unknown) => string)
  | Intl.NumberFormatOptions
  | Intl.DateTimeFormatOptions;

/** Tick-label options of an axis. */
export interface OgeChartAxisLabelOptions {
  /** Default true. */
  readonly visible?: boolean;
  readonly format?: OgeChartLabelFormat;
  /** Text around the formatted value: `'{value} km'`. */
  readonly template?: string;
  readonly overlap?: OgeChartLabelOverlap;
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
  /** Tick labels: `format`, `template`, `overlap`, `visible`. */
  readonly label?: OgeChartAxisLabelOptions;
  /** Value axes: `'end'` renders on the far side (right, or top when rotated). */
  readonly position?: 'start' | 'end';
  /** SI-abbreviated value labels (`1.2K`). Default true for value axes. */
  readonly abbreviate?: boolean;
  /** Value axes: the pane (`panes[].name`) the axis belongs to. */
  readonly pane?: string;
  /** Threshold / target lines at axis values. */
  readonly constantLines?: readonly OgeChartConstantLine[];
  /** Shaded bands between axis values. */
  readonly strips?: readonly OgeChartAxisStrip[];
  /** Fixed distance between major ticks (replaces the automatic ladder). */
  readonly tickInterval?: OgeChartTickInterval;
  /** Minor ticks (and minor grid lines when `grid` is on). */
  readonly minorTicks?: boolean | OgeChartMinorTickOptions;
  /** Linear value axes: value ranges skipped with a zig-zag marker. */
  readonly breaks?: readonly OgeChartAxisBreak[];
  /** `false` keeps ticks on whole numbers. Default true. */
  readonly allowDecimals?: boolean;
}

/**
 * A plot area stacked over the shared argument axis (price + volume):
 * series and value axes pick theirs by `name`.
 */
export interface OgeChartPane {
  readonly name: string;
  /** Height ratio against the other panes. Default 1. */
  readonly height?: number;
}

/** Easing of the initial draw-in. */
export type OgeChartAnimationEasing =
  'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut';

/**
 * Animation: hover/selection transitions plus the series draw-in on the
 * first render. `prefers-reduced-motion: reduce` always wins.
 */
export interface OgeChartAnimationOptions {
  readonly enabled?: boolean;
  /** Draw-in duration, ms. Default 600. */
  readonly duration?: number;
  /** Default `'easeOut'`. */
  readonly easing?: OgeChartAnimationEasing;
}

/** A built-in range-selector period. */
export type OgeChartPeriod = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'All';

/**
 * A custom range-selector period: a fixed window, a span in axis units
 * back from the data end, or a calendar interval back from it.
 */
export interface OgeChartCustomPeriod {
  readonly label: string;
  readonly range: ChartRange | number | OgeChartDateInterval;
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
