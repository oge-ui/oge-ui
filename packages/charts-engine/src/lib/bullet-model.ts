/**
 * The bullet chart's view model (Stephen Few's bullet graph) — what
 * `<oge-bullet-chart>` / `<OgeBulletChart>` draw: qualitative range bands,
 * the value bar, the target marker and the scale, horizontal or vertical,
 * mirrored in RTL. Framework-free and pure.
 */
import { ogeNumberFormat } from '@oge-ui/core';
import { niceStep } from './scale';
import { formatOgeChartMessage, type OgeChartsMessages } from './charts-config';
import type { OgeChartValueRange } from './color-scale';
import {
  gaugeFraction,
  resolveGaugeScale,
  type OgeGaugeLabelVm,
  type OgeGaugeOrientation,
  type OgeGaugeScaleOptions,
  type OgeGaugeSrRow,
  type OgeGaugeTickVm,
} from './gauge-model';

export interface OgeBulletSceneInput {
  readonly value: number | null;
  readonly target?: number | null;
  /** Qualitative bands, low → high. */
  readonly ranges?: readonly OgeChartValueRange[];
  /** `min`/`max` default to 0 and the nice ceiling of the data. */
  readonly scale?: OgeGaugeScaleOptions;
  readonly orientation?: OgeGaugeOrientation;
  readonly rtl?: boolean;
  /** Value-bar thickness as a fraction of the band. Default 0.36. */
  readonly barThickness?: number;
  /** Target-line length as a fraction of the band. Default 0.72. */
  readonly targetLength?: number;
  readonly valueFormat?: (value: number) => string;
  readonly title?: string;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
  readonly messages: OgeChartsMessages;
}

export interface OgeBulletRangeVm {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** CSS colour; the defaults are shades of `--oge-muted-color`. */
  readonly color: string;
  readonly label: string;
}

export interface OgeBulletRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface OgeBulletScene {
  readonly orientation: OgeGaugeOrientation;
  readonly ranges: readonly OgeBulletRangeVm[];
  readonly bar: OgeBulletRect | null;
  readonly target: {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  } | null;
  readonly ticks: readonly OgeGaugeTickVm[];
  readonly labels: readonly OgeGaugeLabelVm[];
  /** `role="img"` label (value + target spoken). */
  readonly ariaLabel: string;
  /** Tooltip / sr text of the value and the target. */
  readonly valueText: string;
  readonly targetText: string;
  readonly srRows: readonly OgeGaugeSrRow[];
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** The default band shades, darkest first (poor → good). */
export function bulletRangeShade(index: number, count: number): string {
  const strongest = 38;
  const weakest = 12;
  const share =
    count <= 1 ? 24 : strongest - ((strongest - weakest) * index) / (count - 1);
  return `color-mix(in srgb, var(--oge-muted-color) ${Math.round(share)}%, transparent)`;
}

export function buildBulletScene(input: OgeBulletSceneInput): OgeBulletScene {
  const orientation = input.orientation ?? 'horizontal';
  const horizontal = orientation === 'horizontal';
  const rtl = input.rtl === true;
  const ranges = [...(input.ranges ?? [])].sort((a, b) => a.start - b.start);
  const value =
    input.value !== null && Number.isFinite(input.value) ? input.value : null;
  const target =
    input.target !== null &&
    input.target !== undefined &&
    Number.isFinite(input.target)
      ? input.target
      : null;
  const dataMax = Math.max(
    0,
    ...ranges.map((r) => Math.max(r.start, r.end)),
    value ?? 0,
    target ?? 0,
  );
  const dataMin = Math.min(
    0,
    ...ranges.map((r) => Math.min(r.start, r.end)),
    value ?? 0,
    target ?? 0,
  );
  const step = niceStep(dataMax - dataMin || 1, 5);
  const scale = resolveGaugeScale(
    {
      ...input.scale,
      min: input.scale?.min ?? Math.floor(dataMin / step) * step,
      max: input.scale?.max ?? (Math.ceil(dataMax / step) * step || 1),
      minorTickInterval: input.scale?.minorTickInterval ?? 0,
    },
    input.locale,
  );
  const format =
    input.valueFormat ??
    ((v: number) =>
      ogeNumberFormat(input.locale, { maximumFractionDigits: 2 }).format(v));
  const visuals = input.messages.visuals;

  const showAxis = scale.visible;
  const axisSize = showAxis ? (horizontal ? 22 : 40) : 0;
  const pad = 4;
  const alongSize = horizontal ? input.width : input.height;
  const crossSize = horizontal ? input.height : input.width;
  const alongPad = horizontal && showAxis ? 12 : pad;
  const length = Math.max(10, alongSize - alongPad * 2);
  const band = Math.max(8, Math.min(48, crossSize - axisSize - pad * 2));
  const crossStart = Math.max(pad, (crossSize - axisSize - band) / 2);
  const frac = (v: number): number => gaugeFraction(v, scale);

  /** A logical rect (along a0..a1, cross c0..c1) on screen. */
  const rect = (
    a0: number,
    a1: number,
    c0: number,
    c1: number,
  ): OgeBulletRect => {
    const lo = Math.min(a0, a1);
    const hi = Math.max(a0, a1);
    if (horizontal) {
      return {
        x: round(rtl ? alongPad + length - hi : alongPad + lo),
        y: round(c0),
        width: round(hi - lo),
        height: round(c1 - c0),
      };
    }
    // vertical: min at the bottom; the axis sits at the inline end
    return {
      x: round(rtl ? crossSize - c1 : c0),
      y: round(alongPad + length - hi),
      width: round(c1 - c0),
      height: round(hi - lo),
    };
  };
  const point = (along: number, cross: number): { x: number; y: number } =>
    horizontal
      ? {
          x: round(rtl ? alongPad + length - along : alongPad + along),
          y: round(cross),
        }
      : {
          x: round(rtl ? crossSize - cross : cross),
          y: round(alongPad + length - along),
        };

  const rangeText = (range: OgeChartValueRange): string =>
    formatOgeChartMessage(visuals.range, {
      start: scale.label(range.start),
      end: scale.label(range.end),
    });
  const rangeVms: OgeBulletRangeVm[] = ranges.map((range, index) => ({
    ...rect(
      frac(Math.min(range.start, range.end)) * length,
      frac(Math.max(range.start, range.end)) * length,
      crossStart,
      crossStart + band,
    ),
    color: range.color ?? bulletRangeShade(index, ranges.length),
    label: range.label ?? rangeText(range),
  }));

  const barT = Math.max(2, band * (input.barThickness ?? 0.36));
  const barC0 = crossStart + (band - barT) / 2;
  const zero = frac(Math.max(scale.min, Math.min(scale.max, 0)));
  const bar =
    value === null
      ? null
      : rect(zero * length, frac(value) * length, barC0, barC0 + barT);
  const targetL = band * (input.targetLength ?? 0.72);
  const targetC0 = crossStart + (band - targetL) / 2;
  let targetVm: OgeBulletScene['target'] = null;
  if (target !== null) {
    const p = point(frac(target) * length, targetC0);
    const q = point(frac(target) * length, targetC0 + targetL);
    targetVm = { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
  }

  const ticks: OgeGaugeTickVm[] = [];
  const labels: OgeGaugeLabelVm[] = [];
  if (showAxis) {
    const tickCross = crossStart + band + 3;
    for (const v of scale.major) {
      const p = point(frac(v) * length, tickCross);
      const q = point(frac(v) * length, tickCross + 4);
      ticks.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, major: true });
    }
    if (scale.labelsVisible) {
      const longest = Math.max(
        ...scale.major.map((v) => scale.label(v).length),
        1,
      );
      const stepPx =
        scale.major.length > 1
          ? (frac(scale.major[1]) - frac(scale.major[0])) * length
          : Infinity;
      const minGap = horizontal ? longest * 7 + 8 : 16;
      const every =
        stepPx < minGap ? Math.ceil(minGap / Math.max(1, stepPx)) : 1;
      scale.major.forEach((v, index) => {
        if (index % every !== 0) return;
        const p = point(frac(v) * length, tickCross + (horizontal ? 16 : 8));
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

  const valueText = value === null ? visuals.noValue : format(value);
  const targetText =
    target === null
      ? visuals.noValue
      : formatOgeChartMessage(visuals.target, { value: format(target) });
  const srRows: OgeGaugeSrRow[] = [
    { header: visuals.valueHeader, cell: valueText },
    {
      header: visuals.targetHeader,
      cell: target === null ? visuals.noValue : format(target),
    },
    ...ranges.map((range) => ({
      header: range.label ?? rangeText(range),
      cell: rangeText(range),
    })),
  ];
  return {
    orientation,
    ranges: rangeVms,
    bar,
    target: targetVm,
    ticks,
    labels,
    ariaLabel: formatOgeChartMessage(visuals.bulletLabel, {
      title: input.title ?? '',
      value: valueText,
      target: target === null ? visuals.noValue : format(target),
    }).trim(),
    valueText,
    targetText,
    srRows,
  };
}
