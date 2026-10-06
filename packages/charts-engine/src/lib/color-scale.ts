/**
 * Value → colour scales of the heatmap, the treemap and the map, plus the
 * colour-scale legend they draw. Colours stay CSS: a linear scale blends
 * neighbouring stops with `color-mix()`, so theme tokens
 * (`var(--oge-chart-heat-low)`) work as stops and follow the active theme —
 * the exporters resolve them through the computed style. Pure.
 */
import { ogeNumberFormat } from '@oge-ui/core';
import { niceTicks } from './scale';

/** A value band with an optional colour and label (gauges, bullets, segmented scales). */
export interface OgeChartValueRange {
  readonly start: number;
  readonly end: number;
  /** Any CSS colour, tokens included. */
  readonly color?: string;
  /** Spoken with the value (gauge `aria-valuetext`) and shown in legends. */
  readonly label?: string;
}

/** The colour scale of a heatmap / treemap / map. */
export interface OgeChartColorScale {
  /**
   * `'linear'` (default) blends between `colors` spread evenly over
   * `min..max`; `'segmented'` paints every `ranges` entry in a flat colour.
   */
  readonly type?: 'linear' | 'segmented';
  /** Domain start; default the data minimum. */
  readonly min?: number;
  /** Domain end; default the data maximum. */
  readonly max?: number;
  /**
   * Two or more CSS colours, low → high (three make a diverging scale).
   * Default: the `--oge-chart-heat-low` / `--oge-chart-heat-high` tokens.
   */
  readonly colors?: readonly string[];
  /** `'segmented'`: the bands (a value outside every band is "empty"). */
  readonly ranges?: readonly OgeChartValueRange[];
  /** Fill of a cell / region without a value. Default `--oge-chart-empty`. */
  readonly emptyColor?: string;
  /** Legend tick text; default the locale number. */
  readonly labelFormat?: (value: number) => string;
}

/** One legend tick of a linear scale: `offset` 0..1 along the bar. */
export interface OgeChartColorScaleTick {
  readonly offset: number;
  readonly value: number;
  readonly text: string;
}

/** One swatch of a segmented legend. */
export interface OgeChartColorScaleSegment {
  readonly color: string;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** The colour-scale legend (an HTML gradient bar or swatch row). */
export interface OgeChartColorScaleLegend {
  readonly type: 'linear' | 'segmented';
  /** `linear`: CSS `linear-gradient(...)`, low on the left. */
  readonly gradient: string;
  /** `linear`: the same gradient mirrored (right-to-left layouts). */
  readonly gradientRtl: string;
  readonly ticks: readonly OgeChartColorScaleTick[];
  readonly segments: readonly OgeChartColorScaleSegment[];
}

export interface OgeChartResolvedColorScale {
  readonly min: number;
  readonly max: number;
  /** The fill of `value`; `null` / NaN → the empty colour. */
  readonly colorOf: (value: number | null | undefined) => string;
  readonly legend: OgeChartColorScaleLegend;
}

export const OGE_CHART_HEAT_COLORS: readonly string[] = [
  'var(--oge-chart-heat-low)',
  'var(--oge-chart-heat-high)',
];

export const OGE_CHART_EMPTY_COLOR = 'var(--oge-chart-empty)';

/** `color-mix()` of `a` and `b` at `t` (0 = a, 1 = b), short-circuiting the ends. */
export function chartMixColor(a: string, b: string, t: number): string {
  const share = Math.round(Math.max(0, Math.min(1, t)) * 1000) / 10;
  if (share <= 0) return a;
  if (share >= 100) return b;
  return `color-mix(in srgb, ${b} ${share}%, ${a})`;
}

/** The colour at `t` (0..1) along evenly spread `colors`. */
export function chartRampColor(colors: readonly string[], t: number): string {
  if (colors.length === 0) return OGE_CHART_EMPTY_COLOR;
  if (colors.length === 1) return colors[0];
  const clamped = Math.max(0, Math.min(1, t));
  const segments = colors.length - 1;
  const index = Math.min(segments - 1, Math.floor(clamped * segments));
  return chartMixColor(
    colors[index],
    colors[index + 1],
    clamped * segments - index,
  );
}

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Resolves a colour scale over the data values it colours. A degenerate
 * domain (one distinct value) maps everything to the high end.
 */
export function resolveChartColorScale(
  options: OgeChartColorScale | undefined,
  values: readonly (number | null | undefined)[],
  locale?: string,
): OgeChartResolvedColorScale {
  const scale = options ?? {};
  const present = values.filter(finite);
  const dataMin = present.length > 0 ? Math.min(...present) : 0;
  const dataMax = present.length > 0 ? Math.max(...present) : 0;
  const min = scale.min ?? dataMin;
  const max = scale.max ?? dataMax;
  const empty = scale.emptyColor ?? OGE_CHART_EMPTY_COLOR;
  const colors =
    scale.colors !== undefined && scale.colors.length > 0
      ? scale.colors
      : OGE_CHART_HEAT_COLORS;
  const format =
    scale.labelFormat ??
    ((value: number) =>
      ogeNumberFormat(locale, { maximumFractionDigits: 2 }).format(value));

  if (scale.type === 'segmented') {
    const ranges = [...(scale.ranges ?? [])].sort((a, b) => a.start - b.start);
    const fill = (range: OgeChartValueRange, index: number): string =>
      range.color ??
      chartRampColor(
        colors,
        ranges.length > 1 ? index / (ranges.length - 1) : 1,
      );
    const colorOf = (value: number | null | undefined): string => {
      if (!finite(value)) return empty;
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const last = i === ranges.length - 1;
        if (
          value >= range.start &&
          (value < range.end || (last && value === range.end))
        ) {
          return fill(range, i);
        }
      }
      return empty;
    };
    return {
      min: ranges.length > 0 ? ranges[0].start : min,
      max: ranges.length > 0 ? ranges[ranges.length - 1].end : max,
      colorOf,
      legend: {
        type: 'segmented',
        gradient: '',
        gradientRtl: '',
        ticks: [],
        segments: ranges.map((range, index) => ({
          color: fill(range, index),
          text: range.label ?? `${format(range.start)} – ${format(range.end)}`,
          start: range.start,
          end: range.end,
        })),
      },
    };
  }

  const span = max - min;
  const colorOf = (value: number | null | undefined): string => {
    if (!finite(value)) return empty;
    return chartRampColor(colors, span > 0 ? (value - min) / span : 1);
  };
  const stops = colors
    .map((color, index) => {
      const at = colors.length > 1 ? (index / (colors.length - 1)) * 100 : 0;
      return `${color} ${Math.round(at * 10) / 10}%`;
    })
    .join(', ');
  const ticks =
    span > 0
      ? niceTicks(min, max, 4).map((value) => ({
          offset: (value - min) / span,
          value,
          text: format(value),
        }))
      : [{ offset: 1, value: max, text: format(max) }];
  return {
    min,
    max,
    colorOf,
    legend: {
      type: 'linear',
      gradient: `linear-gradient(to right, ${stops})`,
      gradientRtl: `linear-gradient(to left, ${stops})`,
      ticks,
      segments: [],
    },
  };
}
