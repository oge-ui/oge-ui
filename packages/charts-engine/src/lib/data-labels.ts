/**
 * Data labels: the text (custom `format`, per-point override or the
 * SI-formatted value), the anchor for each position next to a bar or a
 * point, contrast-picked text colour for labels drawn on a coloured mark,
 * and the overlap / clipping pass across every label of a chart. Pure.
 */
import { siFormat } from './tick-format';
import type {
  ChartLabelInfo,
  ChartLabelOptions,
  ChartLabelPosition,
  ChartPoint,
  ChartSeries,
} from './series-model';

/** A drawn data label (`x`, `y` = the text anchor point / baseline). */
export interface OgeChartRenderLabel {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
  /** Drawn on the mark (inside a bar/slice) rather than beside it. */
  readonly inside: boolean;
  /** Contrast-picked fill for inside labels; `null` = the theme colour. */
  readonly textColor: string | null;
  readonly seriesIndex: number;
  readonly pointIndex: number;
  /** The labelled point — what a label template renders from. */
  readonly seriesName: string;
  readonly argument: unknown;
  readonly value: number | null;
}

/** Approximate text box of an 11px label (no DOM measuring). */
export function chartLabelBox(label: {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
}): { x: number; y: number; w: number; h: number } {
  const w = label.text.length * 6.2 + 4;
  const h = 13;
  const x =
    label.anchor === 'middle'
      ? label.x - w / 2
      : label.anchor === 'end'
        ? label.x - w
        : label.x;
  return { x, y: label.y - 10, w, h };
}

/**
 * The `foreignObject` box a label template renders into (120 × 22 px,
 * aligned like the text it replaces). Overlap resolution measured the
 * default text, so keep templated labels compact.
 */
export function chartLabelTemplateBox(label: {
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
}): { x: number; y: number; w: number; h: number } {
  const w = 120;
  const x =
    label.anchor === 'middle'
      ? label.x - w / 2
      : label.anchor === 'end'
        ? label.x - w
        : label.x;
  return { x, y: label.y - 15, w, h: 22 };
}

/** Whether a series draws labels, and its resolved options. */
export function chartLabelOptions<T>(
  series: ChartSeries<T>,
): ChartLabelOptions<T> & { readonly visible: boolean } {
  const label = series.input.label ?? {};
  return {
    ...label,
    visible: label.visible ?? series.input.showLabels ?? false,
  };
}

/** Whether `point` gets a label (series flag, per-point override, zero rule). */
export function chartPointHasLabel<T>(
  series: ChartSeries<T>,
  point: ChartPoint<T>,
): boolean {
  const options = chartLabelOptions(series);
  const override = point.style?.label?.visible;
  if (override === false) return false;
  if (!options.visible && override !== true) return false;
  if (point.value === null) return false;
  if (options.showForZero === false && point.value === 0) return false;
  return true;
}

/** The label text of a point. */
export function chartLabelText<T>(
  series: ChartSeries<T>,
  point: ChartPoint<T>,
  seriesIndex: number,
  pointIndex: number,
  percent: number | null,
  locale: string | undefined,
  defaultText?: string,
): string {
  const override = point.style?.label?.text;
  if (override !== undefined) return override;
  const text =
    defaultText ?? (point.value === null ? '' : siFormat(point.value, locale));
  const format = series.input.label?.format;
  if (format === undefined) return text;
  const info: ChartLabelInfo<T> = {
    seriesIndex,
    seriesName: series.name,
    pointIndex,
    argument: point.argument,
    value: point.value,
    percent,
    source: point.source,
    text,
  };
  return format(info);
}

/**
 * The label anchor next to a bar. `endPx` is the value end of the bar,
 * `basePx` its base; positions flip for bars that grow downward. Inside
 * positions fall back to `'outside'` when the bar is too short.
 */
export function chartBarLabelAnchor(
  x: number,
  endPx: number,
  basePx: number,
  position: ChartLabelPosition,
): { x: number; y: number; inside: boolean } {
  const up = endPx <= basePx;
  const length = Math.abs(basePx - endPx);
  const outside = { x, y: up ? endPx - 4 : endPx + 12, inside: false };
  if (position === 'outside' || length < 16) return outside;
  if (position === 'center') {
    return { x, y: (endPx + basePx) / 2 + 4, inside: true };
  }
  if (position === 'insideBase') {
    return { x, y: up ? basePx - 4 : basePx + 12, inside: true };
  }
  // 'inside' / 'insideEnd'
  return { x, y: up ? endPx + 13 : endPx - 5, inside: true };
}

/** The label anchor next to a point marker of radius `r`. */
export function chartPointLabelAnchor(
  x: number,
  y: number,
  r: number,
  position: ChartLabelPosition,
): { x: number; y: number; inside: boolean } {
  if (position === 'center') return { x, y: y + 4, inside: false };
  if (position === 'inside' || position === 'insideBase') {
    return { x, y: y + r + 12, inside: false };
  }
  return { x, y: y - r - 5, inside: false };
}

function parseColor(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (hex !== null) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map((digit) => digit + digit)
            .join('')
        : hex[1];
    return [0, 2, 4].map((offset) =>
      parseInt(digits.slice(offset, offset + 2), 16),
    ) as [number, number, number];
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(color.trim());
  if (rgb !== null) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return null;
}

/**
 * A readable text colour on top of `background` (WCAG relative luminance):
 * near-black on light marks, white on dark ones; `null` for colours it
 * cannot parse (named colours, CSS variables).
 */
export function chartContrastText(background: string): string | null {
  const rgb = parseColor(background);
  if (rgb === null) return null;
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // contrast vs white (1.05) and vs #111827 (luminance ≈ 0.0116)
  const onWhite = 1.05 / (luminance + 0.05);
  const onDark = (luminance + 0.05) / 0.0616;
  return onWhite >= onDark ? '#ffffff' : '#111827';
}

const intersects = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** A label waiting for the overlap pass, with its series' resolution mode. */
export interface ChartLabelCandidate {
  readonly label: OgeChartRenderLabel;
  readonly overlap: 'hide' | 'shift' | 'none';
}

/**
 * Overlap resolution and clipping across a chart's labels, first come
 * first served (series order, then point order): `'none'` keeps the label
 * as is; `'hide'` and `'shift'` first pull it inside the `width × height`
 * plot, then `'shift'` tries nudging it up and down by a label height
 * before `'hide'` (and an unresolvable `'shift'`) drops it.
 */
export function resolveChartLabels(
  candidates: readonly ChartLabelCandidate[],
  width: number,
  height: number,
): OgeChartRenderLabel[] {
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const result: OgeChartRenderLabel[] = [];
  for (const { label, overlap } of candidates) {
    if (overlap === 'none') {
      result.push(label);
      placed.push(chartLabelBox(label));
      continue;
    }
    // clip: keep the whole box inside the plot
    let candidate = label;
    const box = chartLabelBox(candidate);
    const dx =
      box.x < 0 ? -box.x : box.x + box.w > width ? width - box.x - box.w : 0;
    const dy =
      box.y < 0 ? -box.y : box.y + box.h > height ? height - box.y - box.h : 0;
    if (dx !== 0 || dy !== 0) {
      if (box.w > width || box.h > height) continue;
      candidate = { ...candidate, x: candidate.x + dx, y: candidate.y + dy };
    }
    const offsets = overlap === 'shift' ? [0, -13, 13, -26, 26] : [0];
    let accepted: OgeChartRenderLabel | null = null;
    for (const offset of offsets) {
      const moved =
        offset === 0 ? candidate : { ...candidate, y: candidate.y + offset };
      const movedBox = chartLabelBox(moved);
      if (movedBox.y < 0 || movedBox.y + movedBox.h > height) continue;
      if (!placed.some((other) => intersects(other, movedBox))) {
        accepted = moved;
        break;
      }
    }
    if (accepted === null) continue;
    result.push(accepted);
    placed.push(chartLabelBox(accepted));
  }
  return result;
}
