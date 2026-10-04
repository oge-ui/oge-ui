/**
 * Layout pieces of the cartesian scene that sit around the series: panes
 * and the value-axis ↔ pane ↔ series binding, the value-axis slots per
 * pane side, constant lines and strips (with edge-aware labels), axis-break
 * markers and grid lines. Everything comes out in plot-local screen px,
 * already mapped through the {@link OgeChartFrame}. Pure.
 */
import {
  frameLine,
  framePoint,
  frameRect,
  type OgeChartFrame,
  type OgeChartLineVm,
  type OgeChartRectVm,
} from './chart-frame';
import { CHART_BREAK_GAP_PX } from './axis-scale';
import type { ChartScale } from './scale';
import {
  computeBarSlots,
  computeStacks,
  type BarSlot,
  type StackedValue,
} from './series-layout';
import type { ChartSeries } from './series-model';
import type {
  OgeChartAxisOptions,
  OgeChartAxisStrip,
  OgeChartConstantLine,
  OgeChartPane,
  OgeChartStripLine,
} from './charts-types';

/** Gap between two panes, px. */
export const CHART_PANE_GAP = 16;

/* ------------------------------------------------------------------ */
/* panes                                                               */
/* ------------------------------------------------------------------ */

/** One laid-out pane: its band along the logical value axis. */
export interface OgeChartPaneVm {
  readonly index: number;
  readonly name: string;
  /** Band start along the value axis (logical px). */
  readonly start: number;
  readonly size: number;
  /** The pane's clip box in logical coordinates (the series group's space). */
  readonly clip: OgeChartRectVm;
}

/** The pane definitions, never empty (a chart without panes has one). */
export function chartPaneList(
  panes: readonly OgeChartPane[] | undefined,
): readonly OgeChartPane[] {
  return panes !== undefined && panes.length > 0 ? panes : [{ name: '' }];
}

/**
 * Splits the value axis into pane bands by their `height` ratios with a
 * {@link CHART_PANE_GAP} between them. The first pane is on top — or on the
 * start side when rotated (the logical order reverses so the rotation does
 * not flip it).
 */
export function layoutChartPanes(
  panes: readonly OgeChartPane[],
  valLen: number,
  argLen: number,
  rotated: boolean,
): readonly OgeChartPaneVm[] {
  const count = panes.length;
  const gap = count > 1 ? CHART_PANE_GAP : 0;
  const usable = Math.max(10 * count, valLen - gap * (count - 1));
  const ratios = panes.map((pane) =>
    pane.height !== undefined && pane.height > 0 ? pane.height : 1,
  );
  const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
  const sizes = ratios.map((ratio) => (usable * ratio) / total);
  const order = panes.map((_, index) => index);
  if (rotated) order.reverse();
  const starts = new Array<number>(count).fill(0);
  let cursor = 0;
  for (const index of order) {
    starts[index] = cursor;
    cursor += sizes[index] + gap;
  }
  return panes.map((pane, index) => ({
    index,
    name: pane.name,
    start: starts[index],
    size: sizes[index],
    clip: { x: 0, y: starts[index], w: argLen, h: sizes[index] },
  }));
}

/** The pane band containing logical value px `v` (nearest when in a gap). */
export function chartPaneAt(
  panes: readonly OgeChartPaneVm[],
  v: number,
): OgeChartPaneVm | undefined {
  let best: OgeChartPaneVm | undefined;
  let bestDist = Infinity;
  for (const pane of panes) {
    const dist =
      v < pane.start
        ? pane.start - v
        : v > pane.start + pane.size
          ? v - pane.start - pane.size
          : 0;
    if (dist < bestDist) {
      bestDist = dist;
      best = pane;
    }
  }
  return best;
}

export interface OgeChartAxisBinding {
  /** Value axes — the given ones, plus a default axis per pane that had none. */
  readonly axes: readonly OgeChartAxisOptions[];
  /** Pane index per value axis. */
  readonly axisPane: readonly number[];
  /** Value-axis index per series. */
  readonly seriesAxis: readonly number[];
  /** Pane index per series. */
  readonly seriesPane: readonly number[];
}

/**
 * Binds series → value axis → pane. An explicit series `axis` wins (the
 * series draws in that axis' pane); otherwise a series `pane` picks the
 * first value axis of that pane, appending a default axis when the pane has
 * none. Unknown pane names fall back to the first pane.
 */
export function bindChartPaneAxes(
  valueAxes: readonly OgeChartAxisOptions[],
  panes: readonly OgeChartPane[],
  seriesList: readonly ChartSeries<unknown>[],
): OgeChartAxisBinding {
  const paneIndexOf = (name: string | undefined): number => {
    if (name === undefined) return 0;
    const index = panes.findIndex((pane) => pane.name === name);
    return index === -1 ? 0 : index;
  };
  const axes = [...valueAxes];
  const axisPane = axes.map((axis) => paneIndexOf(axis.pane));
  const seriesAxis = seriesList.map((series) => {
    const explicit = series.input.axis;
    if (
      explicit !== undefined &&
      explicit >= 0 &&
      explicit < valueAxes.length
    ) {
      return explicit;
    }
    if (series.input.pane === undefined) return 0;
    const pane = paneIndexOf(series.input.pane);
    const found = axisPane.indexOf(pane);
    if (found !== -1) return found;
    axes.push({ pane: panes[pane]?.name });
    axisPane.push(pane);
    return axes.length - 1;
  });
  return {
    axes,
    axisPane,
    seriesAxis,
    seriesPane: seriesAxis.map((axis) => axisPane[axis] ?? 0),
  };
}

/** Stacks accumulated per pane (series in different panes never stack). */
export function paneChartStacks<T>(
  seriesList: readonly ChartSeries<T>[],
  seriesPane: readonly number[],
): readonly (readonly (StackedValue | null)[] | null)[] {
  const result: (readonly (StackedValue | null)[] | null)[] = seriesList.map(
    () => null,
  );
  for (const pane of new Set(seriesPane)) {
    const members = seriesList
      .map((series, index) => ({ series, index }))
      .filter(({ index }) => seriesPane[index] === pane);
    const stacks = computeStacks(members.map(({ series }) => series));
    members.forEach(({ index }, position) => {
      result[index] = stacks[position];
    });
  }
  return result;
}

/** Bar slots computed per pane (bars of other panes take no band room). */
export function paneChartBarSlots<T>(
  seriesList: readonly ChartSeries<T>[],
  seriesPane: readonly number[],
  bandPx: number,
): readonly (BarSlot | null)[] {
  const result: (BarSlot | null)[] = seriesList.map(() => null);
  for (const pane of new Set(seriesPane)) {
    const members = seriesList
      .map((series, index) => ({ series, index }))
      .filter(({ index }) => seriesPane[index] === pane);
    const slots = computeBarSlots(
      members.map(({ series }) => series),
      bandPx,
    );
    members.forEach(({ index }, position) => {
      result[index] = slots[position];
    });
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* value-axis slots                                                    */
/* ------------------------------------------------------------------ */

/** Where each value axis sits: its side and its slot (0 = nearest the plot). */
export interface OgeChartAxisSlots {
  readonly side: readonly ('start' | 'end')[];
  readonly slot: readonly number[];
  /** Most axes any pane stacks on the start / end side. */
  readonly startCount: number;
  readonly endCount: number;
}

export function chartValueAxisSlots(
  axes: readonly OgeChartAxisOptions[],
  axisPane: readonly number[],
): OgeChartAxisSlots {
  const counters = new Map<string, number>();
  const side = axes.map((axis) =>
    axis.position === 'end' ? ('end' as const) : ('start' as const),
  );
  const slot = axes.map((_, index) => {
    const key = `${axisPane[index]}:${side[index]}`;
    const next = counters.get(key) ?? 0;
    counters.set(key, next + 1);
    return next;
  });
  let startCount = 0;
  let endCount = 0;
  for (const [key, count] of counters) {
    if (key.endsWith(':start')) startCount = Math.max(startCount, count);
    else endCount = Math.max(endCount, count);
  }
  return { side, slot, startCount, endCount };
}

/* ------------------------------------------------------------------ */
/* guides: constant lines + strips                                     */
/* ------------------------------------------------------------------ */

export interface OgeChartGuideLabelVm {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
  /** Printed in the margin past the plot edge. */
  readonly outside: boolean;
}

/**
 * A strip band or a line across the plot, in plot-local screen px.
 * `variant: 'strip'` is a `stripLines` / `strips` entry (band, or a line for
 * a `stripLines` entry without `end`); `'constant'` is a constant line.
 */
export interface OgeChartGuideVm {
  readonly kind: 'band' | 'line';
  readonly variant: 'strip' | 'constant';
  readonly axis: 'argument' | 'value';
  /** Band rect (`kind: 'band'`). */
  readonly rect: OgeChartRectVm;
  /** Line segment (`kind: 'line'`). */
  readonly line: OgeChartLineVm;
  readonly color: string | undefined;
  readonly dashArray: string | null;
  readonly strokeWidth: number;
  readonly label: OgeChartGuideLabelVm | null;
}

/** Rough label width (px) for edge clamping — 11px UI font. */
export function chartGuideLabelWidth(text: string): number {
  return text.length * 6.2 + 4;
}

export function chartDashArray(
  dash: 'solid' | 'dash' | 'dot' | undefined,
): string | null {
  return dash === 'solid' ? null : dash === 'dot' ? '2 3' : '6 4';
}

interface GuideContext {
  readonly frame: OgeChartFrame;
  readonly plotW: number;
  readonly plotH: number;
}

/**
 * The label of a line guide, kept clear of the plot edges: inside labels
 * sit at the line's end (horizontal) or top (vertical) and flip to the
 * other side of the line near an edge; outside labels go to the end margin
 * (horizontal) or the top margin (vertical).
 */
function lineGuideLabel(
  ctx: GuideContext,
  line: OgeChartLineVm,
  text: string | undefined,
  outside: boolean,
): OgeChartGuideLabelVm | null {
  if (text === undefined || text === '') return null;
  const { plotW, plotH } = ctx;
  const rtl = ctx.frame.rtl;
  const width = chartGuideLabelWidth(text);
  const horizontal = Math.abs(line.y1 - line.y2) < 0.5;
  if (horizontal) {
    const y = line.y1;
    if (outside) {
      return {
        x: rtl ? -6 : plotW + 6,
        y: Math.max(10, Math.min(plotH, y + 4)),
        text,
        anchor: rtl ? 'end' : 'start',
        outside: true,
      };
    }
    // above the line; below it when the top edge is too close
    const above = y - 4;
    return {
      x: rtl ? 4 : plotW - 4,
      y: above - 10 < 0 ? Math.min(plotH - 2, y + 13) : above,
      text,
      anchor: rtl ? 'start' : 'end',
      outside: false,
    };
  }
  const x = line.x1;
  if (outside) {
    return {
      x: Math.max(width / 2, Math.min(plotW - width / 2, x)),
      y: -5,
      text,
      anchor: 'middle',
      outside: true,
    };
  }
  const preferStart = !rtl;
  const fitsAfter = x + 4 + width <= plotW;
  const fitsBefore = x - 4 - width >= 0;
  const after = preferStart
    ? fitsAfter || !fitsBefore
    : !fitsBefore && fitsAfter;
  return {
    x: after ? x + 4 : x - 4,
    y: 12,
    text,
    anchor: after ? 'start' : 'end',
    outside: false,
  };
}

/** The label of a band guide: inside, at the band's inline-start corner. */
function bandGuideLabel(
  ctx: GuideContext,
  rect: OgeChartRectVm,
  text: string | undefined,
): OgeChartGuideLabelVm | null {
  if (text === undefined || text === '') return null;
  const { plotW, plotH } = ctx;
  const rtl = ctx.frame.rtl;
  const width = chartGuideLabelWidth(text);
  const spansWidth = rect.w >= plotW - 0.5;
  if (spansWidth) {
    // a horizontal band: label at the start edge, inside its top
    return {
      x: rtl ? plotW - 4 : 4,
      y: Math.max(10, Math.min(plotH - 2, rect.y + 12)),
      text,
      anchor: rtl ? 'end' : 'start',
      outside: false,
    };
  }
  const startX = rtl ? rect.x + rect.w - 4 : rect.x + 4;
  const fits = rtl ? startX - width >= 0 : startX + width <= plotW;
  return {
    x: fits ? startX : rtl ? rect.x + 4 : rect.x + rect.w - 4,
    y: 12,
    text,
    anchor: fits === !rtl ? 'start' : 'end',
    outside: false,
  };
}

export interface OgeChartGuideAxis {
  readonly axis: 'argument' | 'value';
  /** Domain value → logical px along the axis; `null` = unplottable. */
  readonly toPx: (value: number | Date | string) => number | null;
  /** Logical extent of the guide across the other axis. */
  readonly crossStart: number;
  readonly crossEnd: number;
  /** Logical extent along the axis the guide must fall inside. */
  readonly alongStart: number;
  readonly alongEnd: number;
  readonly strips: readonly OgeChartAxisStrip[];
  readonly constantLines: readonly OgeChartConstantLine[];
  /** The legacy top-level `stripLines` (argument axis only). */
  readonly stripLines?: readonly OgeChartStripLine[];
}

/** Every strip and constant line of one axis, in plot-local screen px. */
export function layoutChartGuides(
  frame: OgeChartFrame,
  plotW: number,
  plotH: number,
  spec: OgeChartGuideAxis,
): OgeChartGuideVm[] {
  const ctx: GuideContext = { frame, plotW, plotH };
  const along = (px: number): number =>
    Math.max(spec.alongStart, Math.min(spec.alongEnd, px));
  const isArg = spec.axis === 'argument';
  const box = (p0: number, p1: number): OgeChartRectVm =>
    isArg
      ? frameRect(frame, p0, p1, spec.crossStart, spec.crossEnd)
      : frameRect(frame, spec.crossStart, spec.crossEnd, p0, p1);
  const segment = (p: number): OgeChartLineVm =>
    isArg
      ? frameLine(frame, p, spec.crossStart, p, spec.crossEnd)
      : frameLine(frame, spec.crossStart, p, spec.crossEnd, p);
  const inside = (px: number): boolean =>
    px >= spec.alongStart - 0.5 && px <= spec.alongEnd + 0.5;
  const noLine: OgeChartLineVm = { x1: 0, y1: 0, x2: 0, y2: 0 };
  const noRect: OgeChartRectVm = { x: 0, y: 0, w: 0, h: 0 };

  const guides: OgeChartGuideVm[] = [];
  const pushBand = (
    startPx: number,
    endPx: number,
    label: string | undefined,
    color: string | undefined,
  ): void => {
    const a = along(Math.min(startPx, endPx));
    const b = along(Math.max(startPx, endPx));
    if (b - a <= 0) return;
    const rect = box(a, b);
    guides.push({
      kind: 'band',
      variant: 'strip',
      axis: spec.axis,
      rect,
      line: noLine,
      color,
      dashArray: null,
      strokeWidth: 0,
      label: bandGuideLabel(ctx, rect, label),
    });
  };
  for (const strip of spec.stripLines ?? []) {
    const start = spec.toPx(strip.start);
    if (start === null) continue;
    const end = strip.end === undefined ? null : spec.toPx(strip.end);
    if (end !== null) {
      pushBand(start, end, strip.label, strip.color);
      continue;
    }
    if (!inside(start)) continue;
    const line = segment(start);
    guides.push({
      kind: 'line',
      variant: 'strip',
      axis: spec.axis,
      rect: noRect,
      line,
      color: strip.color,
      dashArray: null,
      strokeWidth: 1.5,
      label: lineGuideLabel(ctx, line, strip.label, false),
    });
  }
  for (const strip of spec.strips) {
    const start = spec.toPx(strip.start);
    const end = spec.toPx(strip.end);
    if (start === null || end === null) continue;
    pushBand(start, end, strip.label, strip.color);
  }
  for (const constant of spec.constantLines) {
    const px = spec.toPx(constant.value);
    if (px === null || !inside(px)) continue;
    const line = segment(px);
    guides.push({
      kind: 'line',
      variant: 'constant',
      axis: spec.axis,
      rect: noRect,
      line,
      color: constant.color,
      dashArray: chartDashArray(constant.dash),
      strokeWidth: constant.width ?? 1.5,
      label: lineGuideLabel(
        ctx,
        line,
        constant.label,
        constant.position === 'outside',
      ),
    });
  }
  return guides;
}

/**
 * Margin the outside constant-line labels need: `end` px past the end edge
 * for lines that run horizontally on screen, and whether the top margin
 * must hold labels of vertical lines.
 */
export function chartOutsideLabelMargins(
  argumentLines: readonly OgeChartConstantLine[],
  valueLines: readonly OgeChartConstantLine[],
  rotated: boolean,
): { readonly end: number; readonly top: boolean } {
  const outside = (lines: readonly OgeChartConstantLine[]) =>
    lines.filter((line) => line.position === 'outside' && line.label);
  // value lines are horizontal unless rotated; argument lines the opposite
  const horizontal = outside(rotated ? argumentLines : valueLines);
  const vertical = outside(rotated ? valueLines : argumentLines);
  const end = horizontal.reduce(
    (acc, line) =>
      Math.max(acc, Math.min(140, chartGuideLabelWidth(line.label ?? '') + 10)),
    0,
  );
  return { end, top: vertical.length > 0 };
}

/* ------------------------------------------------------------------ */
/* axis breaks                                                         */
/* ------------------------------------------------------------------ */

/** A break marker: the gap band (`fillD`) and its two zig-zag edges (`lineD`). */
export interface OgeChartBreakMarkerVm {
  readonly fillD: string;
  readonly lineD: string;
}

const fmt = (value: number): string => String(Math.round(value * 100) / 100);

/**
 * The zig-zag marker of a value-axis break centered at logical value px
 * `v`, across the argument axis.
 */
export function chartBreakMarker(
  frame: OgeChartFrame,
  v: number,
  gapPx = CHART_BREAK_GAP_PX,
): OgeChartBreakMarkerVm {
  const amplitude = 2.5;
  const period = 8;
  const half = gapPx / 2 - 1.5;
  const steps = Math.max(2, Math.ceil(frame.argLen / (period / 2)));
  const edge = (offset: number): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = Math.min(frame.argLen, (i * period) / 2);
      const wiggle = i % 2 === 0 ? -amplitude : amplitude;
      points.push(framePoint(frame, a, v + offset + wiggle));
    }
    return points;
  };
  const top = edge(-half);
  const bottom = edge(half);
  const path = (points: readonly { x: number; y: number }[]): string =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${fmt(point.x)} ${fmt(point.y)}`,
      )
      .join(' ');
  const fillD = `${path(top)} ${[...bottom]
    .reverse()
    .map((point) => `L ${fmt(point.x)} ${fmt(point.y)}`)
    .join(' ')} Z`;
  return { fillD, lineD: `${path(top)} ${path(bottom)}` };
}

/* ------------------------------------------------------------------ */
/* grid                                                                */
/* ------------------------------------------------------------------ */

export interface OgeChartGridLineVm extends OgeChartLineVm {
  readonly minor: boolean;
}

/** Value-axis grid lines of one pane (major + minor), screen px. */
export function chartValueGridLines(
  frame: OgeChartFrame,
  scale: ChartScale,
  pane: OgeChartPaneVm,
): OgeChartGridLineVm[] {
  const lines: OgeChartGridLineVm[] = [];
  const inPane = (px: number): boolean =>
    px >= pane.start - 0.5 && px <= pane.start + pane.size + 0.5;
  for (const tick of scale.ticks) {
    const px = scale.toPx(tick);
    if (!inPane(px)) continue;
    lines.push({ ...frameLine(frame, 0, px, frame.argLen, px), minor: false });
  }
  for (const tick of scale.minorTicks ?? []) {
    const px = scale.toPx(tick);
    if (!inPane(px)) continue;
    lines.push({ ...frameLine(frame, 0, px, frame.argLen, px), minor: true });
  }
  return lines;
}

/** Argument-axis grid lines across every pane band, screen px. */
export function chartArgumentGridLines(
  frame: OgeChartFrame,
  scale: ChartScale,
  panes: readonly OgeChartPaneVm[],
  ticks: readonly number[],
): OgeChartGridLineVm[] {
  const lines: OgeChartGridLineVm[] = [];
  const add = (value: number, minor: boolean): void => {
    const px = scale.toPx(value);
    if (px < -0.5 || px > frame.argLen + 0.5) return;
    for (const pane of panes) {
      lines.push({
        ...frameLine(frame, px, pane.start, px, pane.start + pane.size),
        minor,
      });
    }
  };
  for (const tick of ticks) add(tick, false);
  for (const tick of scale.minorTicks ?? []) add(tick, true);
  return lines;
}
