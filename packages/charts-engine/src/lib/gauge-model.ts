/**
 * The gauges' view models — what `<oge-circular-gauge>` / `<OgeCircularGauge>`
 * and `<oge-linear-gauge>` / `<OgeLinearGauge>` draw: the scale (ticks,
 * labels), coloured ranges, the value indicator (needle, bar or marker),
 * subvalue markers and the `role="meter"` semantics (`aria-valuenow`,
 * `aria-valuetext`) with a screen-reader table. Angles are degrees, 0 at
 * 12 o'clock, clockwise. Framework-free and pure.
 *
 * The indicator is positioned through CSS (`transform: rotate()` for the
 * needle, `stroke-dasharray` over a fixed `pathLength` for the bar), so a
 * value change animates with a plain CSS transition and reduced motion
 * turns it off in the stylesheet.
 */
import { ogeNumberFormat } from '@oge-ui/core';
import { niceStep } from './scale';
import { formatOgeChartMessage, type OgeChartsMessages } from './charts-config';
import type { OgeChartValueRange } from './color-scale';

/** The scale of a gauge or a bullet chart. */
export interface OgeGaugeScaleOptions {
  /** Default 0. */
  readonly min?: number;
  /** Default 100. */
  readonly max?: number;
  /** Major tick step; default a 1-2-5 step giving about five intervals. */
  readonly tickInterval?: number;
  /** Minor tick step; default a fifth of the major step. `0` hides them. */
  readonly minorTickInterval?: number;
  /** Ticks and labels on/off. Default true. */
  readonly visible?: boolean;
  /** Tick labels on/off (ticks stay). Default true. */
  readonly labelsVisible?: boolean;
  /** Tick label text; default the locale number. */
  readonly labelFormat?: (value: number) => string;
}

export type OgeCircularGaugeIndicator = 'needle' | 'bar' | 'marker';
export type OgeLinearGaugeIndicator = 'bar' | 'marker';
export type OgeGaugeOrientation = 'horizontal' | 'vertical';

/** Default range colours, in order (any `range.color` wins). */
export const OGE_GAUGE_RANGE_COLORS: readonly string[] = [
  'var(--oge-success)',
  'var(--oge-warning)',
  'var(--oge-danger)',
];

/** `pathLength` of the bar indicator's stroke (the dash maths' unit). */
export const GAUGE_BAR_LENGTH = 1000;

export interface OgeGaugeTickVm {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly major: boolean;
}

export interface OgeGaugeLabelVm {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly value: number;
}

export interface OgeGaugeRangeVm {
  /** Filled band path (circular) or rect path (linear). */
  readonly path: string;
  readonly color: string;
  readonly start: number;
  readonly end: number;
  readonly label: string;
}

/** The meter semantics both layers bind (`role="meter"`). */
export interface OgeGaugeAria {
  readonly label: string;
  /** Clamped into the scale (`aria-valuetext` speaks the real value). */
  readonly valueNow: number;
  readonly valueMin: number;
  readonly valueMax: number;
  readonly valueText: string;
}

export interface OgeGaugeSrRow {
  readonly header: string;
  readonly cell: string;
}

interface GaugeBaseInput {
  /** The reading; `null` draws the scale without an indicator. */
  readonly value: number | null;
  /**
   * The value the indicator is drawn at — `value` once the first-render
   * sweep has run (the components start it at the scale minimum).
   */
  readonly displayValue?: number | null;
  /** Secondary readings drawn as small markers. */
  readonly subvalues?: readonly number[];
  readonly scale?: OgeGaugeScaleOptions;
  readonly ranges?: readonly OgeChartValueRange[];
  /** Where the bar indicator starts. Default the scale minimum. */
  readonly barBase?: number;
  /** Value text drawn on the gauge. Default true. */
  readonly showValue?: boolean;
  /** Value text / `aria-valuetext`; default the locale number. */
  readonly valueFormat?: (value: number) => string;
  readonly title?: string;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
  readonly messages: OgeChartsMessages;
}

export interface OgeCircularGaugeSceneInput extends GaugeBaseInput {
  /** Degrees; 0 = 12 o'clock, clockwise. Default -120. */
  readonly startAngle?: number;
  /** Degrees. Default 120. */
  readonly endAngle?: number;
  readonly indicator?: OgeCircularGaugeIndicator;
}

export interface OgeLinearGaugeSceneInput extends GaugeBaseInput {
  readonly orientation?: OgeGaugeOrientation;
  readonly indicator?: OgeLinearGaugeIndicator;
  /** Mirrors a horizontal gauge (minimum on the right). */
  readonly rtl?: boolean;
}

interface ResolvedScale {
  readonly min: number;
  readonly max: number;
  readonly major: readonly number[];
  readonly minor: readonly number[];
  readonly visible: boolean;
  readonly labelsVisible: boolean;
  readonly label: (value: number) => string;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** Tick values of a gauge / bullet scale. Pure. */
export function resolveGaugeScale(
  options: OgeGaugeScaleOptions | undefined,
  locale: string | undefined,
): ResolvedScale {
  const min = options?.min ?? 0;
  const rawMax = options?.max ?? 100;
  const max = rawMax > min ? rawMax : min + 1;
  const span = max - min;
  const step =
    options?.tickInterval !== undefined && options.tickInterval > 0
      ? options.tickInterval
      : niceStep(span, 5);
  const major: number[] = [];
  const epsilon = step * 1e-6;
  const first = Math.ceil((min - epsilon) / step) * step;
  for (let v = first; v <= max + epsilon && major.length < 200; v += step) {
    major.push(Math.abs(v) < epsilon ? 0 : round(v * 1e6) / 1e6);
  }
  const minorStep =
    options?.minorTickInterval !== undefined
      ? options.minorTickInterval
      : step / 5;
  const minor: number[] = [];
  if (minorStep > 0 && span / minorStep <= 400) {
    const firstMinor = Math.ceil((min - epsilon) / minorStep) * minorStep;
    for (let v = firstMinor; v <= max + epsilon; v += minorStep) {
      if (!major.some((tick) => Math.abs(tick - v) < minorStep * 1e-3)) {
        minor.push(v);
      }
    }
  }
  const format =
    options?.labelFormat ??
    ((value: number) =>
      ogeNumberFormat(locale, { maximumFractionDigits: 2 }).format(value));
  return {
    min,
    max,
    major,
    minor,
    visible: options?.visible !== false,
    labelsVisible: options?.labelsVisible !== false,
    label: format,
  };
}

const clampTo = (value: number, scale: ResolvedScale): number =>
  Math.max(scale.min, Math.min(scale.max, value));

/** Fraction 0..1 of `value` along the scale (clamped). */
export function gaugeFraction(
  value: number,
  scale: { readonly min: number; readonly max: number },
): number {
  const span = scale.max - scale.min || 1;
  return Math.max(0, Math.min(1, (value - scale.min) / span));
}

/**
 * `stroke-dasharray` drawing `from..to` of a stroke whose `pathLength` is
 * {@link GAUGE_BAR_LENGTH}: an empty dash, a gap up to `from`, the bar,
 * then the rest. Four entries always, so CSS can interpolate it.
 */
export function gaugeBarDash(fromFraction: number, toFraction: number): string {
  const a = Math.min(fromFraction, toFraction) * GAUGE_BAR_LENGTH;
  const b = Math.abs(toFraction - fromFraction) * GAUGE_BAR_LENGTH;
  return `0 ${round(a)} ${round(b)} ${GAUGE_BAR_LENGTH}`;
}

function rangeVms(
  ranges: readonly OgeChartValueRange[] | undefined,
  scale: ResolvedScale,
  path: (from: number, to: number) => string,
  rangeText: (range: OgeChartValueRange) => string,
): OgeGaugeRangeVm[] {
  return (ranges ?? [])
    .map((range, index) => {
      const start = clampTo(Math.min(range.start, range.end), scale);
      const end = clampTo(Math.max(range.start, range.end), scale);
      return {
        path: end > start ? path(start, end) : '',
        color:
          range.color ??
          OGE_GAUGE_RANGE_COLORS[index % OGE_GAUGE_RANGE_COLORS.length],
        start: range.start,
        end: range.end,
        label: range.label ?? rangeText(range),
      };
    })
    .filter((vm) => vm.path !== '');
}

function valueTextOf(input: GaugeBaseInput): (value: number) => string {
  return (
    input.valueFormat ??
    ((value: number) =>
      ogeNumberFormat(input.locale, { maximumFractionDigits: 2 }).format(value))
  );
}

/** The meter semantics + the sr table rows, shared by both gauges. */
function gaugeAria(
  input: GaugeBaseInput,
  scale: ResolvedScale,
): { aria: OgeGaugeAria; srRows: OgeGaugeSrRow[]; valueText: string } {
  const visuals = input.messages.visuals;
  const format = valueTextOf(input);
  const rangeText = (range: OgeChartValueRange): string =>
    formatOgeChartMessage(visuals.range, {
      start: scale.label(range.start),
      end: scale.label(range.end),
    });
  const value =
    input.value !== null && Number.isFinite(input.value) ? input.value : null;
  const valueText = value === null ? visuals.noValue : format(value);
  const labelled = (input.ranges ?? []).find(
    (range) =>
      range.label !== undefined &&
      value !== null &&
      value >= Math.min(range.start, range.end) &&
      value <= Math.max(range.start, range.end),
  );
  const ariaValueText =
    labelled?.label !== undefined
      ? formatOgeChartMessage(visuals.gaugeValueInRange, {
          value: valueText,
          range: labelled.label,
        })
      : valueText;
  const srRows: OgeGaugeSrRow[] = [
    { header: visuals.valueHeader, cell: ariaValueText },
    { header: input.messages.values.low, cell: scale.label(scale.min) },
    { header: input.messages.values.high, cell: scale.label(scale.max) },
    ...(input.ranges ?? []).map((range) => ({
      header: range.label ?? rangeText(range),
      cell: rangeText(range),
    })),
    ...(input.subvalues ?? []).map((sub) => ({
      header: visuals.valueHeader,
      cell: format(sub),
    })),
  ];
  return {
    aria: {
      label: formatOgeChartMessage(visuals.gaugeLabel, {
        title: input.title ?? '',
      }).trim(),
      // `role="meter"` requires a value inside the range; the text carries the real one
      valueNow: value === null ? scale.min : clampTo(value, scale),
      valueMin: scale.min,
      valueMax: scale.max,
      valueText: ariaValueText,
    },
    srRows,
    valueText,
  };
}

/* ------------------------------------------------------------------ */
/* circular                                                            */
/* ------------------------------------------------------------------ */

const rad = (deg: number): number => (deg * Math.PI) / 180;

const polar = (
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } => ({
  x: cx + r * Math.sin(rad(deg)),
  y: cy - r * Math.cos(rad(deg)),
});

/** A stroke-able arc from `a0` to `a1` (degrees, clockwise). */
export function gaugeArcPath(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): string {
  const sweep = a1 - a0;
  if (sweep <= 0) return '';
  if (sweep >= 360 - 1e-6) {
    const top = polar(cx, cy, r, a0);
    const bottom = polar(cx, cy, r, a0 + 180);
    return `M ${round(top.x)} ${round(top.y)} A ${round(r)} ${round(r)} 0 1 1 ${round(bottom.x)} ${round(bottom.y)} A ${round(r)} ${round(r)} 0 1 1 ${round(top.x)} ${round(top.y)}`;
  }
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  return `M ${round(p0.x)} ${round(p0.y)} A ${round(r)} ${round(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${round(p1.x)} ${round(p1.y)}`;
}

/** A filled annular band between radii (ranges), degrees. */
export function gaugeBandPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  a0: number,
  a1: number,
): string {
  if (a1 - a0 <= 0) return '';
  const large = a1 - a0 > 180 ? 1 : 0;
  const o0 = polar(cx, cy, outerR, a0);
  const o1 = polar(cx, cy, outerR, a1);
  const i0 = polar(cx, cy, innerR, a0);
  const i1 = polar(cx, cy, innerR, a1);
  return `M ${round(o0.x)} ${round(o0.y)} A ${round(outerR)} ${round(outerR)} 0 ${large} 1 ${round(o1.x)} ${round(o1.y)} L ${round(i1.x)} ${round(i1.y)} A ${round(innerR)} ${round(innerR)} 0 ${large} 0 ${round(i0.x)} ${round(i0.y)} Z`;
}

/**
 * The unit-circle bounding box of an arc from `a0` to `a1` plus the hub —
 * what the radius is fitted against, so a half gauge fills its box.
 */
export function gaugeArcBounds(
  a0: number,
  a1: number,
  extraPoints: readonly { x: number; y: number }[] = [],
): { minX: number; maxX: number; minY: number; maxY: number } {
  const points = [{ x: 0, y: 0 }, ...extraPoints];
  const add = (deg: number): void => {
    points.push({ x: Math.sin(rad(deg)), y: -Math.cos(rad(deg)) });
  };
  add(a0);
  add(a1);
  for (let k = Math.ceil(a0 / 90); k * 90 <= a1; k++) add(k * 90);
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

export interface OgeCircularGaugeScene {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly indicator: OgeCircularGaugeIndicator;
  readonly ranges: readonly OgeGaugeRangeVm[];
  readonly ticks: readonly OgeGaugeTickVm[];
  readonly labels: readonly OgeGaugeLabelVm[];
  /** The bar indicator's track (full scale), a stroke path. */
  readonly trackPath: string;
  readonly barWidth: number;
  /** `stroke-dasharray` of the bar over `trackPath` (`pathLength` 1000). */
  readonly barDash: string;
  /** Needle polygon drawn pointing at 12 o'clock — rotate by `indicatorAngle`. */
  readonly needlePath: string;
  readonly hubRadius: number;
  /** Marker triangle at 12 o'clock — rotate by `indicatorAngle`. */
  readonly markerPath: string;
  /** Subvalue triangle at 12 o'clock — rotate by each angle. */
  readonly subvaluePath: string;
  readonly subvalueAngles: readonly number[];
  /** Rotation of the needle / marker, degrees; `null` = no value. */
  readonly indicatorAngle: number | null;
  /** `transform-origin` of the rotating indicator, CSS px. */
  readonly origin: string;
  readonly valueText: {
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly size: number;
  } | null;
  readonly aria: OgeGaugeAria;
  readonly srRows: readonly OgeGaugeSrRow[];
}

export function buildCircularGaugeScene(
  input: OgeCircularGaugeSceneInput,
): OgeCircularGaugeScene {
  const scale = resolveGaugeScale(input.scale, input.locale);
  let a0 = input.startAngle ?? -120;
  let a1 = input.endAngle ?? 120;
  if (a1 < a0) [a0, a1] = [a1, a0];
  if (a1 - a0 > 360) a1 = a0 + 360;
  if (a1 - a0 < 1) a1 = a0 + 1;
  const indicator = input.indicator ?? 'needle';
  const showValue = input.showValue !== false;
  const pad = 6;
  const bounds = gaugeArcBounds(
    a0,
    a1,
    showValue ? [{ x: 0, y: 0.48 }] : [{ x: 0, y: 0.1 }],
  );
  const w = Math.max(1, input.width - pad * 2);
  const h = Math.max(1, input.height - pad * 2);
  const radius = Math.max(
    10,
    Math.min(w / (bounds.maxX - bounds.minX), h / (bounds.maxY - bounds.minY)),
  );
  const cx =
    pad + (w - radius * (bounds.maxX - bounds.minX)) / 2 - radius * bounds.minX;
  const cy =
    pad + (h - radius * (bounds.maxY - bounds.minY)) / 2 - radius * bounds.minY;
  const angleOf = (value: number): number =>
    a0 + gaugeFraction(value, scale) * (a1 - a0);

  const rangeW = Math.max(4, radius * 0.07);
  const barW = Math.max(6, radius * 0.13);
  const gap = Math.max(2, radius * 0.03);
  // bands from the rim inwards: ranges, the bar (bar indicator), ticks, labels
  const rangeInner = radius - rangeW;
  const barCenter = rangeInner - gap - barW / 2;
  const tickOuter =
    indicator === 'bar' ? barCenter - barW / 2 - gap : rangeInner - gap;
  const majorLen = Math.max(5, radius * 0.08);
  const minorLen = majorLen / 2;
  const labelR = tickOuter - majorLen - Math.max(9, radius * 0.11);
  const { aria, srRows, valueText } = gaugeAria(input, scale);
  const rangeText = (range: OgeChartValueRange): string =>
    formatOgeChartMessage(input.messages.visuals.range, {
      start: scale.label(range.start),
      end: scale.label(range.end),
    });

  const ranges = rangeVms(
    input.ranges,
    scale,
    (from, to) =>
      gaugeBandPath(cx, cy, radius, rangeInner, angleOf(from), angleOf(to)),
    rangeText,
  );

  const ticks: OgeGaugeTickVm[] = [];
  const labels: OgeGaugeLabelVm[] = [];
  if (scale.visible) {
    const tick = (value: number, len: number, major: boolean): void => {
      const angle = angleOf(value);
      const p0 = polar(cx, cy, tickOuter, angle);
      const p1 = polar(cx, cy, tickOuter - len, angle);
      ticks.push({
        x1: round(p0.x),
        y1: round(p0.y),
        x2: round(p1.x),
        y2: round(p1.y),
        major,
      });
    };
    if (radius >= 50) for (const v of scale.minor) tick(v, minorLen, false);
    for (const v of scale.major) tick(v, majorLen, true);
    if (scale.labelsVisible && labelR > 8) {
      // thin out labels closer than ~28px along the label circle
      const stepPx =
        scale.major.length > 1
          ? rad(angleOf(scale.major[1]) - angleOf(scale.major[0])) * labelR
          : Infinity;
      const every = stepPx < 28 ? Math.ceil(28 / Math.max(1, stepPx)) : 1;
      const full = a1 - a0 >= 360 - 1e-6;
      scale.major.forEach((v, index) => {
        if (index % every !== 0) return;
        // a full circle would draw max on top of min
        if (
          full &&
          index === scale.major.length - 1 &&
          v === scale.max &&
          index > 0
        ) {
          return;
        }
        const angle = angleOf(v);
        const p = polar(cx, cy, labelR, angle);
        const s = Math.sin(rad(angle));
        labels.push({
          x: round(p.x),
          y: round(p.y + 4),
          text: scale.label(v),
          anchor: s > 0.35 ? 'end' : s < -0.35 ? 'start' : 'middle',
          value: v,
        });
      });
    }
  }

  const display =
    input.displayValue === undefined ? input.value : input.displayValue;
  const shown =
    display !== null && Number.isFinite(display)
      ? clampTo(display, scale)
      : null;
  const base = clampTo(input.barBase ?? scale.min, scale);
  const needleLen = Math.max(
    8,
    tickOuter - (indicator === 'needle' ? 0 : majorLen),
  );
  const needleW = Math.max(2, radius * 0.045);
  const hubRadius = Math.max(3, radius * 0.07);
  const markerSize = Math.max(5, radius * 0.08);
  const markerTip = rangeInner - 1;
  const subSize = Math.max(4, radius * 0.05);
  const valueSize = Math.round(Math.max(13, Math.min(40, radius * 0.24)));

  return {
    cx: round(cx),
    cy: round(cy),
    radius: round(radius),
    startAngle: a0,
    endAngle: a1,
    indicator,
    ranges,
    ticks,
    labels,
    trackPath: gaugeArcPath(cx, cy, barCenter, a0, a1),
    barWidth: round(barW),
    barDash:
      shown === null
        ? gaugeBarDash(0, 0)
        : gaugeBarDash(gaugeFraction(base, scale), gaugeFraction(shown, scale)),
    needlePath: `M ${round(cx - needleW)} ${round(cy)} L ${round(cx)} ${round(cy - needleLen)} L ${round(cx + needleW)} ${round(cy)} Z`,
    hubRadius: round(hubRadius),
    markerPath: `M ${round(cx)} ${round(cy - markerTip)} L ${round(cx - markerSize * 0.7)} ${round(cy - markerTip + markerSize * 1.4)} L ${round(cx + markerSize * 0.7)} ${round(cy - markerTip + markerSize * 1.4)} Z`,
    subvaluePath: `M ${round(cx)} ${round(cy - radius + 0.5)} L ${round(cx - subSize * 0.7)} ${round(cy - radius - subSize)} L ${round(cx + subSize * 0.7)} ${round(cy - radius - subSize)} Z`,
    subvalueAngles: (input.subvalues ?? [])
      .filter((v) => Number.isFinite(v))
      .map((v) => round(angleOf(v))),
    indicatorAngle: shown === null ? null : round(angleOf(shown)),
    origin: `${round(cx)}px ${round(cy)}px`,
    valueText:
      showValue && input.value !== null && Number.isFinite(input.value)
        ? {
            x: round(cx),
            y: round(cy + Math.max(hubRadius + valueSize, radius * 0.36)),
            text: valueText,
            size: valueSize,
          }
        : null,
    aria,
    srRows,
  };
}

/* ------------------------------------------------------------------ */
/* linear                                                              */
/* ------------------------------------------------------------------ */

export interface OgeLinearGaugeScene {
  readonly orientation: OgeGaugeOrientation;
  readonly indicator: OgeLinearGaugeIndicator;
  readonly ranges: readonly OgeGaugeRangeVm[];
  readonly ticks: readonly OgeGaugeTickVm[];
  readonly labels: readonly OgeGaugeLabelVm[];
  /** The track / bar line (full scale), drawn with `stroke-width` = `barWidth`. */
  readonly track: {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  };
  readonly barWidth: number;
  readonly barDash: string;
  /** Marker triangle drawn at the scale minimum — translate by `markerOffset`. */
  readonly markerPath: string;
  /** CSS `translate()` of the marker; `null` = no value. */
  readonly markerOffset: string | null;
  readonly subvalues: readonly OgeGaugeTickVm[];
  readonly valueText: {
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly anchor: 'start' | 'middle' | 'end';
  } | null;
  readonly aria: OgeGaugeAria;
  readonly srRows: readonly OgeGaugeSrRow[];
}

export function buildLinearGaugeScene(
  input: OgeLinearGaugeSceneInput,
): OgeLinearGaugeScene {
  const scale = resolveGaugeScale(input.scale, input.locale);
  const orientation = input.orientation ?? 'horizontal';
  const indicator = input.indicator ?? 'bar';
  const horizontal = orientation === 'horizontal';
  const rtl = input.rtl === true;
  const showValue = input.showValue !== false;
  const { aria, srRows, valueText } = gaugeAria(input, scale);
  const rangeText = (range: OgeChartValueRange): string =>
    formatOgeChartMessage(input.messages.visuals.range, {
      start: scale.label(range.start),
      end: scale.label(range.end),
    });

  const barW = 12;
  const rangeW = 6;
  const gap = 4;
  const majorLen = 7;
  const labelH = 14;
  const valueH = showValue ? 22 : 0;
  const markerH = indicator === 'marker' ? 10 : 0;
  // cross-axis stack: value text, marker, bar, ranges, ticks, labels
  const stack =
    valueH + markerH + barW + gap + rangeW + gap + majorLen + 2 + labelH;
  const crossSize = horizontal ? input.height : input.width;
  const alongSize = horizontal ? input.width : input.height;
  const longest = Math.max(
    scale.label(scale.min).length,
    scale.label(scale.max).length,
  );
  const alongPad = horizontal ? Math.max(14, longest * 3.6 + 6) : 12;
  const crossStart = horizontal
    ? Math.max(4, (crossSize - stack) / 2)
    : Math.max(4, (crossSize - (stack - valueH)) / 2);
  const along0 = alongPad + (horizontal ? 0 : valueH);
  const length = Math.max(10, alongSize - along0 - alongPad);
  const frac = (value: number): number => gaugeFraction(value, scale);

  /** Logical (along, cross) → screen (x, y). */
  const at = (along: number, cross: number): { x: number; y: number } => {
    if (horizontal) {
      return {
        x: round(rtl ? alongSize - along0 - along : along0 + along),
        y: round(cross),
      };
    }
    return {
      x: round(rtl ? crossSize - cross : cross),
      y: round(along0 + length - along),
    };
  };
  const barCross = crossStart + (horizontal ? valueH : 0) + markerH + barW / 2;
  const rangeCross = barCross + barW / 2 + gap;
  const tickCross = rangeCross + rangeW + gap;
  const labelCross = tickCross + majorLen + 2;

  const rectPath = (a0: number, a1: number, c0: number, c1: number): string => {
    const p = at(a0, c0);
    const q = at(a1, c1);
    const x = Math.min(p.x, q.x);
    const y = Math.min(p.y, q.y);
    const w = Math.abs(q.x - p.x);
    const h = Math.abs(q.y - p.y);
    return `M ${x} ${y} H ${round(x + w)} V ${round(y + h)} H ${x} Z`;
  };

  const ranges = rangeVms(
    input.ranges,
    scale,
    (from, to) =>
      rectPath(
        frac(from) * length,
        frac(to) * length,
        rangeCross,
        rangeCross + rangeW,
      ),
    rangeText,
  );

  const ticks: OgeGaugeTickVm[] = [];
  const labels: OgeGaugeLabelVm[] = [];
  if (scale.visible) {
    const tick = (value: number, len: number, major: boolean): void => {
      const p = at(frac(value) * length, tickCross);
      const q = at(frac(value) * length, tickCross + len);
      ticks.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, major });
    };
    if (length >= 120)
      for (const v of scale.minor) tick(v, majorLen / 2, false);
    for (const v of scale.major) tick(v, majorLen, true);
    if (scale.labelsVisible) {
      const stepPx =
        scale.major.length > 1
          ? (frac(scale.major[1]) - frac(scale.major[0])) * length
          : Infinity;
      const minGap = horizontal ? longest * 7 + 8 : 16;
      const every =
        stepPx < minGap ? Math.ceil(minGap / Math.max(1, stepPx)) : 1;
      scale.major.forEach((v, index) => {
        if (index % every !== 0) return;
        const p = at(
          frac(v) * length,
          labelCross + (horizontal ? labelH - 3 : 0),
        );
        labels.push({
          x: p.x,
          y: horizontal ? p.y : round(p.y + 4),
          text: scale.label(v),
          anchor: horizontal ? 'middle' : rtl ? 'end' : 'start',
          value: v,
        });
      });
    }
  }

  const display =
    input.displayValue === undefined ? input.value : input.displayValue;
  const shown =
    display !== null && Number.isFinite(display)
      ? clampTo(display, scale)
      : null;
  const base = clampTo(input.barBase ?? scale.min, scale);
  const t0 = at(0, barCross);
  const t1 = at(length, barCross);
  const markerTipCross = barCross - barW / 2 - 1;
  const markerBase = markerTipCross - markerH;
  const m0 = at(0, markerTipCross);
  const m1 = at(0, markerBase);
  const half = 6;
  const side = (p: { x: number; y: number }, d: number): string =>
    horizontal ? `${round(p.x + d)} ${p.y}` : `${p.x} ${round(p.y + d)}`;
  const markerPath = `M ${m0.x} ${m0.y} L ${side(m1, -half)} L ${side(m1, half)} Z`;
  let markerOffset: string | null = null;
  if (shown !== null) {
    const p = at(frac(shown) * length, markerTipCross);
    markerOffset = `translate(${round(p.x - m0.x)}px, ${round(p.y - m0.y)}px)`;
  }
  const subvalues: OgeGaugeTickVm[] = (input.subvalues ?? [])
    .filter((v) => Number.isFinite(v))
    .map((v) => {
      const p = at(frac(v) * length, barCross - barW / 2 - 3);
      const q = at(frac(v) * length, barCross + barW / 2 + 3);
      return { x1: p.x, y1: p.y, x2: q.x, y2: q.y, major: true };
    });

  let valueTextVm: OgeLinearGaugeScene['valueText'] = null;
  if (showValue && input.value !== null && Number.isFinite(input.value)) {
    if (horizontal) {
      const p = at(frac(clampTo(input.value, scale)) * length, crossStart + 15);
      const text = valueText;
      const halfW = text.length * 4.2;
      const x = Math.max(halfW + 2, Math.min(input.width - halfW - 2, p.x));
      valueTextVm = { x: round(x), y: p.y, text, anchor: 'middle' };
    } else {
      const p = at(length, barCross);
      valueTextVm = {
        x: p.x,
        y: round(Math.max(16, along0 - 10)),
        text: valueText,
        anchor: 'middle',
      };
    }
  }

  return {
    orientation,
    indicator,
    ranges,
    ticks,
    labels,
    track: { x1: t0.x, y1: t0.y, x2: t1.x, y2: t1.y },
    barWidth: barW,
    barDash:
      shown === null
        ? gaugeBarDash(0, 0)
        : gaugeBarDash(frac(base), frac(shown)),
    markerPath,
    markerOffset,
    subvalues,
    valueText: valueTextVm,
    aria,
    srRows,
  };
}
