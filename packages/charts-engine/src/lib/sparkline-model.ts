/**
 * The sparkline's view model — what `<oge-sparkline>` / `<OgeSparkline>`
 * draw: one line / area path, or bars, or win-loss ticks, with the
 * first / last / min / max markers, a hover index and a one-sentence text
 * alternative. Deliberately small: it imports nothing from the cartesian
 * chart, so the sparkline entry stays a few kilobytes. Pure.
 */
import {
  createFieldAccessor,
  ogeDateTimeFormat,
  ogeFormatMessage,
  ogeNumberFormat,
} from '@oge-ui/core';
import type { OgeChartsMessages } from './charts-config';

export type OgeSparklineType = 'line' | 'area' | 'bar' | 'winloss';

/** Which special points carry a marker (`true` = all four). */
export interface OgeSparklineMarkers {
  readonly first?: boolean;
  readonly last?: boolean;
  readonly min?: boolean;
  readonly max?: boolean;
}

export interface OgeSparklineSceneInput<T> {
  /** Numbers, or items read through `valueField`. */
  readonly dataSource: readonly (T | number | null)[];
  /** Default `'value'`; ignored for plain numbers. */
  readonly valueField?: string | ((item: T) => unknown);
  /** Tooltip / sr argument; default the point's position (1-based). */
  readonly argumentField?: string | ((item: T) => unknown);
  readonly type?: OgeSparklineType;
  readonly markers?: boolean | OgeSparklineMarkers;
  /** Win-loss: values above win, below lose, equal draw. Default 0. */
  readonly winlossThreshold?: number;
  /** Fixed value range; default the data range (bars include 0). */
  readonly minValue?: number;
  readonly maxValue?: number;
  /** Mirrors the argument direction (newest on the left). */
  readonly rtl?: boolean;
  readonly width: number;
  readonly height: number;
  readonly lineWidth?: number;
  readonly valueFormat?: (value: number) => string;
  readonly title?: string;
  readonly locale?: string;
  readonly messages: OgeChartsMessages;
}

export interface OgeSparklinePointVm {
  readonly index: number;
  readonly x: number;
  readonly y: number | null;
  readonly value: number | null;
  readonly argument: string;
}

export interface OgeSparklineBarVm {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** `'negative'` below 0 (bar) / a loss (winloss); `'draw'` = winloss tie. */
  readonly kind: 'positive' | 'negative' | 'draw';
}

export interface OgeSparklineMarkerVm {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly kind: 'first' | 'last' | 'min' | 'max';
}

export interface OgeSparklineScene {
  readonly type: OgeSparklineType;
  readonly points: readonly OgeSparklinePointVm[];
  /** `line` / `area`: the stroke path. */
  readonly linePath: string;
  /** `area`: the filled path down to the baseline. */
  readonly areaPath: string;
  readonly bars: readonly OgeSparklineBarVm[];
  readonly markers: readonly OgeSparklineMarkerVm[];
  /** `role="img"` text alternative: count, first, last, low, high. */
  readonly ariaLabel: string;
}

const round = (value: number): number => Math.round(value * 100) / 100;

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function buildSparklineScene<T>(
  input: OgeSparklineSceneInput<T>,
): OgeSparklineScene {
  const type = input.type ?? 'line';
  const valueField = input.valueField ?? 'value';
  const valueOf =
    typeof valueField === 'string'
      ? createFieldAccessor<T>(valueField)
      : valueField;
  const argumentOf =
    input.argumentField === undefined
      ? null
      : typeof input.argumentField === 'string'
        ? createFieldAccessor<T>(input.argumentField)
        : input.argumentField;
  const format =
    input.valueFormat ??
    ((v: number) =>
      ogeNumberFormat(input.locale, { maximumFractionDigits: 2 }).format(v));

  const values = input.dataSource.map((item): number | null => {
    if (item === null || item === undefined) return null;
    if (typeof item === 'number') return Number.isFinite(item) ? item : null;
    const raw = valueOf(item as T);
    return finite(raw) ? raw : null;
  });
  const args = input.dataSource.map((item, index) => {
    if (argumentOf === null || item === null || typeof item === 'number') {
      return String(index + 1);
    }
    const raw = argumentOf(item as T);
    return raw instanceof Date
      ? ogeDateTimeFormat(input.locale, { dateStyle: 'medium' }).format(raw)
      : String(raw ?? index + 1);
  });
  const present = values.filter(finite);
  const count = values.length;
  const pad = Math.max(2, (input.lineWidth ?? 1.5) + 1.5);
  const width = Math.max(1, input.width);
  const height = Math.max(1, input.height);
  const bars = type === 'bar' || type === 'winloss';
  const slot = count > 0 ? (width - pad * 2) / count : 0;
  const xAt = (index: number): number => {
    const logical = bars
      ? pad + slot * (index + 0.5)
      : pad +
        (count > 1
          ? ((width - pad * 2) * index) / (count - 1)
          : (width - pad * 2) / 2);
    return round(input.rtl === true ? width - logical : logical);
  };

  let lo = input.minValue ?? (present.length > 0 ? Math.min(...present) : 0);
  let hi = input.maxValue ?? (present.length > 0 ? Math.max(...present) : 1);
  if (type === 'bar') {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const yAt = (value: number): number =>
    round(pad + (1 - (value - lo) / (hi - lo)) * (height - pad * 2));

  const points: OgeSparklinePointVm[] = values.map((value, index) => ({
    index,
    x: xAt(index),
    y: value === null ? null : yAt(Math.max(lo, Math.min(hi, value))),
    value,
    argument: args[index],
  }));

  let linePath = '';
  let areaPath = '';
  const barVms: OgeSparklineBarVm[] = [];
  if (type === 'line' || type === 'area') {
    let penDown = false;
    const runs: OgeSparklinePointVm[][] = [];
    for (const point of points) {
      if (point.y === null) {
        penDown = false;
        continue;
      }
      if (!penDown) runs.push([]);
      runs[runs.length - 1].push(point);
      penDown = true;
    }
    linePath = runs
      .map((run) =>
        run.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '),
      )
      .join(' ');
    if (type === 'area') {
      const baseline = yAt(
        Math.max(lo, Math.min(hi, 0 >= lo && 0 <= hi ? 0 : lo)),
      );
      areaPath = runs
        .map((run) => {
          const first = run[0];
          const last = run[run.length - 1];
          const body = run.map((p) => `L ${p.x} ${p.y}`).join(' ');
          return `M ${first.x} ${baseline} ${body} L ${last.x} ${baseline} Z`;
        })
        .join(' ');
    }
  } else {
    const barW = Math.max(1, slot * 0.72);
    const threshold = input.winlossThreshold ?? 0;
    values.forEach((value, index) => {
      if (value === null) return;
      const center = xAt(index);
      const x = round(center - barW / 2);
      if (type === 'winloss') {
        const mid = height / 2;
        const tall = (height - pad * 2) / 2 - 1;
        const kind: OgeSparklineBarVm['kind'] =
          value > threshold
            ? 'positive'
            : value < threshold
              ? 'negative'
              : 'draw';
        const h = kind === 'draw' ? 2 : tall;
        barVms.push({
          index,
          x,
          y: round(
            kind === 'negative'
              ? mid + 1
              : kind === 'draw'
                ? mid - 1
                : mid - 1 - tall,
          ),
          width: round(barW),
          height: round(h),
          kind,
        });
        return;
      }
      const zero = yAt(0);
      const y = yAt(Math.max(lo, Math.min(hi, value)));
      barVms.push({
        index,
        x,
        y: Math.min(zero, y),
        width: round(barW),
        height: round(Math.max(1, Math.abs(zero - y))),
        kind: value < 0 ? 'negative' : 'positive',
      });
    });
  }

  const markerSpec: OgeSparklineMarkers =
    input.markers === true
      ? { first: true, last: true, min: true, max: true }
      : input.markers === false || input.markers === undefined
        ? {}
        : input.markers;
  const markers: OgeSparklineMarkerVm[] = [];
  if (present.length > 0 && type !== 'winloss') {
    const indexed = points.filter((p) => p.value !== null);
    const minPoint = indexed.reduce((a, b) =>
      (b.value as number) < (a.value as number) ? b : a,
    );
    const maxPoint = indexed.reduce((a, b) =>
      (b.value as number) > (a.value as number) ? b : a,
    );
    const add = (
      point: OgeSparklinePointVm,
      kind: OgeSparklineMarkerVm['kind'],
    ): void => {
      if (markers.some((m) => m.index === point.index)) return;
      const bar = barVms.find((b) => b.index === point.index);
      const y =
        bar === undefined
          ? (point.y as number)
          : (point.value as number) < 0
            ? bar.y + bar.height
            : bar.y;
      markers.push({ index: point.index, x: point.x, y, kind });
    };
    if (markerSpec.max) add(maxPoint, 'max');
    if (markerSpec.min) add(minPoint, 'min');
    if (markerSpec.first) add(indexed[0], 'first');
    if (markerSpec.last) add(indexed[indexed.length - 1], 'last');
  }

  const firstValue = values.find(finite);
  const lastValue = [...values].reverse().find(finite);
  const text = (v: number | undefined): string =>
    v === undefined ? input.messages.visuals.noValue : format(v);
  const ariaLabel = ogeFormatMessage(
    input.messages.visuals.sparklineLabel,
    {
      title: input.title ?? '',
      count: present.length,
      first: text(firstValue),
      last: text(lastValue),
      min: text(present.length > 0 ? Math.min(...present) : undefined),
      max: text(present.length > 0 ? Math.max(...present) : undefined),
    },
    input.locale,
  ).trim();

  return {
    type,
    points,
    linePath,
    areaPath,
    bars: barVms,
    markers,
    ariaLabel,
  };
}

/** The point nearest to a pointer x (svg px); `-1` without points. */
export function sparklineIndexAt(scene: OgeSparklineScene, x: number): number {
  let best = -1;
  let bestDistance = Infinity;
  for (const point of scene.points) {
    if (point.value === null) continue;
    const distance = Math.abs(point.x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point.index;
    }
  }
  return best;
}

export interface OgeSparklineTooltipVm {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  /** Opens towards the inline start when the point is in the right half. */
  readonly flip: boolean;
}

/** The hover balloon of point `index`. */
export function sparklineTooltip(
  scene: OgeSparklineScene,
  index: number,
  width: number,
  locale: string | undefined,
  valueFormat?: (value: number) => string,
): OgeSparklineTooltipVm | null {
  const point = scene.points[index];
  if (point === undefined || point.value === null) return null;
  const format =
    valueFormat ??
    ((v: number) =>
      ogeNumberFormat(locale, { maximumFractionDigits: 2 }).format(v));
  return {
    x: point.x,
    y: point.y ?? 0,
    text: `${point.argument}: ${format(point.value)}`,
    flip: point.x > width / 2,
  };
}
