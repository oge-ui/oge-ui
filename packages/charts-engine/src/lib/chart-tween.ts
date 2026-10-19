/**
 * Data-change and legend-toggle tweens: after the first-render draw-in, an
 * update never jumps. The previous geometry is matched to the new one by
 * key — series by name, marks by category (the point's argument) — and
 * glides there: new marks grow from the value baseline, removed marks
 * shrink to it, line and area paths morph point by point
 * (`chart-path-tween.ts`), a series the legend hides fades out while the
 * value axis re-scales (ticks slide to their new place, new ticks fade in).
 *
 * Everything here is pure geometry over the scene's view models, apart from
 * {@link createChartTweenDriver} — the requestAnimationFrame loop both render
 * layers share. A tween is retargeted by starting the next one from the
 * frame on screen, so new data arriving mid-tween continues from there.
 */
import type {
  OgeCartesianScene,
  OgeChartAnnotationVm,
  OgeChartAxisLabelVm,
  OgeChartRenderBar,
  OgeChartRenderCandle,
  OgeChartRenderDot,
  OgeChartRenderMarker,
  OgeChartRenderPath,
  OgeChartRenderSeries,
} from './cartesian-model';
import { chartMarkerRadius } from './cartesian-model';
import type { OgeChartGridLineVm, OgeChartGuideVm } from './cartesian-layout';
import type { OgeChartRenderLabel } from './data-labels';
import { chartValueBaselinePx } from './chart-animation';
import { interpolateChartPath } from './chart-path-tween';
import type { OgePieLabelVm, OgePieScene, OgePieSliceVm } from './pie-model';
import { sliceArcPath } from './pie-layout';

/* ------------------------------------------------------------------ */
/* frames                                                              */
/* ------------------------------------------------------------------ */

/** One series of a tween frame: its drawn geometry plus the match keys. */
export interface OgeChartTweenSeries {
  /** Series identity across updates: the name (+ `#n` for repeats). */
  readonly key: string;
  readonly render: OgeChartRenderSeries;
  /** The value baseline (logical px) marks grow from and shrink to. */
  readonly baseline: number;
  /** Per-mark category keys, parallel to `render.bars` / `markers` / … */
  readonly barKeys: readonly string[];
  readonly markerKeys: readonly string[];
  readonly candleKeys: readonly string[];
  readonly labelKeys: readonly string[];
  /** Series fade: 0 → 1 entering, 1 → 0 leaving (a legend toggle). */
  readonly fade: number;
}

/**
 * What a cartesian chart draws, as a tween sees it: the series geometry
 * and the axis parts that move when the value axis re-scales. The render
 * layers draw `renderSeries` / `axisLabels` / `gridLines` / `guides` /
 * `annotations` of the frame on screen instead of the scene's while a
 * tween runs.
 */
export interface OgeChartTweenFrame {
  readonly series: readonly OgeChartTweenSeries[];
  readonly renderSeries: readonly OgeChartRenderSeries[];
  readonly axisLabels: readonly OgeChartAxisLabelVm[];
  readonly gridLines: readonly OgeChartGridLineVm[];
  readonly guides: readonly OgeChartGuideVm[];
  readonly annotations: readonly OgeChartAnnotationVm[];
}

/** Above this many marks (both frames together) updates jump instead. */
export const CHART_TWEEN_MAX_MARKS = 6000;

/** A stable string key for an argument value (dates by time). */
export function chartArgumentKey(argument: unknown): string {
  if (argument instanceof Date) return `d${argument.getTime()}`;
  if (typeof argument === 'number') return `n${argument}`;
  return `s${String(argument)}`;
}

/** Repeated keys get `#1`, `#2`, … so every key in a list is unique. */
function uniqueKeys(keys: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return keys.map((key) => {
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return n === 0 ? key : `${key}#${n}`;
  });
}

/** The scene's drawn state as a keyed tween frame. */
export function cartesianTweenFrame<T>(
  scene: OgeCartesianScene<T>,
): OgeChartTweenFrame {
  const names = uniqueKeys(scene.renderSeries.map((rs) => rs.name));
  const series = scene.renderSeries.map((rs, order): OgeChartTweenSeries => {
    const points = scene.data.seriesList[rs.seriesIndex]?.points ?? [];
    const argKey = (pointIndex: number): string =>
      chartArgumentKey(points[pointIndex]?.argument);
    const scale =
      scene.valueScales[scene.seriesAxis[rs.seriesIndex] ?? 0] ??
      scene.valueScales[0];
    return {
      key: names[order],
      // explicit radii, so a marker can grow from 0 to its default size
      render: {
        ...rs,
        markers: rs.markers.map((marker) => ({
          ...marker,
          r: chartMarkerRadius(marker, rs.type),
        })),
      },
      baseline: scale === undefined ? 0 : chartValueBaselinePx(scale),
      barKeys: uniqueKeys(rs.bars.map((bar) => argKey(bar.pointIndex))),
      markerKeys: uniqueKeys(rs.markers.map((m) => argKey(m.pointIndex))),
      candleKeys: uniqueKeys(rs.candles.map((c) => argKey(c.pointIndex))),
      labelKeys: uniqueKeys(
        rs.labels.map((label) => chartArgumentKey(label.argument)),
      ),
      fade: 1,
    };
  });
  return {
    series,
    renderSeries: scene.renderSeries,
    axisLabels: scene.axisLabels,
    gridLines: scene.gridLines,
    guides: scene.guides,
    annotations: scene.annotations,
  };
}

function markCount(frame: OgeChartTweenFrame): number {
  let count = 0;
  for (const s of frame.series) {
    count +=
      s.render.bars.length + s.render.markers.length + s.render.candles.length;
  }
  return count;
}

/**
 * Whether going from scene `prev` to `next` is an update worth a tween:
 * the data or the series visibility changed while the chart kept its size
 * and orientation. Resizes, zoom and pan stay immediate.
 */
export function cartesianShouldTween<T>(
  prev: OgeCartesianScene<T> | null,
  next: OgeCartesianScene<T>,
): boolean {
  if (prev === null || prev === next) return false;
  if (prev.empty && next.empty) return false;
  if (
    prev.width !== next.width ||
    prev.height !== next.height ||
    prev.rotated !== next.rotated ||
    prev.rtl !== next.rtl
  ) {
    return false;
  }
  const visibilityChanged =
    prev.visibility.length !== next.visibility.length ||
    prev.visibility.some((visible, i) => visible !== next.visibility[i]);
  if (prev.data === next.data && !visibilityChanged) return false;
  let marks = 0;
  for (const scene of [prev, next]) {
    for (const rs of scene.renderSeries) {
      marks += rs.bars.length + rs.markers.length + rs.candles.length;
    }
  }
  return marks <= CHART_TWEEN_MAX_MARKS;
}

/* ------------------------------------------------------------------ */
/* interpolation helpers                                               */
/* ------------------------------------------------------------------ */

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Identity / data fields a shape lerp copies from the target. */
const NON_GEOMETRY = new Set([
  'pointIndex',
  'seriesIndex',
  'axisIndex',
  'pane',
  'value',
  'ringIndex',
  'index',
]);

/**
 * Lerps every numeric geometry field of two same-shaped view models
 * (nested objects too); everything else comes from the target.
 */
function lerpShape<V>(a: V, b: V, t: number): V {
  if (typeof a === 'number' && typeof b === 'number') {
    return lerp(a, b, t) as V;
  }
  if (
    a === null ||
    b === null ||
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Array.isArray(a) ||
    Array.isArray(b)
  ) {
    return b;
  }
  const from = a as Record<string, unknown>;
  const to = b as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(to)) {
    out[key] =
      NON_GEOMETRY.has(key) || !(key in from)
        ? to[key]
        : lerpShape(from[key], to[key], t);
  }
  return out as V;
}

/** Sizes never go negative (springs overshoot). */
function positiveBar(bar: OgeChartRenderBar): OgeChartRenderBar {
  return bar.w >= 0 && bar.h >= 0
    ? bar
    : { ...bar, w: Math.max(0, bar.w), h: Math.max(0, bar.h) };
}
const positiveMarker = (m: OgeChartRenderMarker): OgeChartRenderMarker =>
  m.r !== undefined && m.r < 0 ? { ...m, r: 0 } : m;
const positiveCandle = (c: OgeChartRenderCandle): OgeChartRenderCandle =>
  c.bodyH < 0 ? { ...c, bodyH: 0 } : c;
const positiveDot = (d: OgeChartRenderDot): OgeChartRenderDot =>
  d.r < 0 ? { ...d, r: 0 } : d;

const collapseBar = (
  bar: OgeChartRenderBar,
  baseline: number,
): OgeChartRenderBar => ({ ...bar, y: baseline, h: 0 });
const collapseMarker = (
  marker: OgeChartRenderMarker,
  baseline: number,
): OgeChartRenderMarker => ({ ...marker, y: baseline, r: 0 });
const collapseCandle = (
  candle: OgeChartRenderCandle,
  baseline: number,
): OgeChartRenderCandle => ({
  ...candle,
  bodyY: baseline,
  bodyH: 0,
  wickY1: baseline,
  wickY2: baseline,
});
const collapseLabel = (
  label: OgeChartRenderLabel,
  baseline: number,
): OgeChartRenderLabel => ({ ...label, y: baseline });

/**
 * Keyed marks: matched ones lerp, new ones grow from `collapse(new)`,
 * removed ones shrink to `collapse(old)` (kept with a negative
 * `pointIndex` so they never collide with a live mark).
 */
function keyedMarks<M extends { readonly pointIndex: number }>(
  fromMarks: readonly M[] | null,
  fromKeys: readonly string[],
  toMarks: readonly M[],
  toKeys: readonly string[],
  collapse: (mark: M, baseline: number) => M,
  baseline: number,
  keepExits: boolean,
): (t: number) => { marks: M[]; keys: string[] } {
  const before = new Map<string, M>();
  fromMarks?.forEach((mark, i) => before.set(fromKeys[i], mark));
  const pairs: { from: M; to: M; key: string }[] = [];
  const live = new Set<string>();
  toMarks.forEach((mark, i) => {
    const key = toKeys[i];
    live.add(key);
    pairs.push({
      from: before.get(key) ?? collapse(mark, baseline),
      to: mark,
      key,
    });
  });
  let exitIndex = 0;
  if (keepExits) {
    fromMarks?.forEach((mark, i) => {
      const key = fromKeys[i];
      if (live.has(key)) return;
      const exiting = { ...mark, pointIndex: -1 - exitIndex++ };
      pairs.push({ from: exiting, to: collapse(exiting, baseline), key });
    });
  }
  return (t) => ({
    marks: pairs.map((pair) => lerpShape(pair.from, pair.to, t)),
    keys: pairs.map((pair) => pair.key),
  });
}

/** Unkeyed extras (segments, dots, guides): by index when counts match. */
function indexed<V>(
  from: readonly V[],
  to: readonly V[],
): (t: number) => readonly V[] {
  if (from.length !== to.length || from === to) return () => to;
  return (t) => to.map((item, i) => lerpShape(from[i], item, t));
}

function collapsedRender(
  render: OgeChartRenderSeries,
  baseline: number,
): OgeChartRenderSeries {
  return {
    ...render,
    segments: render.segments.map((s) => ({
      ...s,
      y1: baseline,
      y2: baseline,
    })),
    dots: render.dots.map((d) => ({ ...d, y: baseline, r: 0 })),
  };
}

function extraPathsTween(
  from: readonly OgeChartRenderPath[],
  to: readonly OgeChartRenderPath[],
  baseline: number,
  entering: boolean,
): (t: number) => readonly OgeChartRenderPath[] {
  if (from.length !== to.length && !entering) return () => to;
  const paths = to.map((path, i) =>
    interpolateChartPath(entering ? null : from[i].d, path.d, baseline),
  );
  return (t) =>
    to.map((path, i) => ({
      ...path,
      d: paths[i](t) ?? path.d,
      ...(entering
        ? {}
        : {
            strokeWidth: lerp(from[i].strokeWidth, path.strokeWidth, t),
            opacity: lerp(from[i].opacity, path.opacity, t),
          }),
    }));
}

/** A matched (`from` set) or entering (`from` null) series' tween. */
function seriesTween(
  from: OgeChartTweenSeries | null,
  to: OgeChartTweenSeries,
): (t: number) => OgeChartTweenSeries {
  const a = from?.render ?? null;
  const b = to.render;
  const fromBaseline = from?.baseline ?? to.baseline;
  const baseline = to.baseline;
  const bars = keyedMarks(
    a?.bars ?? null,
    from?.barKeys ?? [],
    b.bars,
    to.barKeys,
    collapseBar,
    baseline,
    true,
  );
  const markers = keyedMarks(
    a?.markers ?? null,
    from?.markerKeys ?? [],
    b.markers,
    to.markerKeys,
    collapseMarker,
    baseline,
    true,
  );
  const candles = keyedMarks(
    a?.candles ?? null,
    from?.candleKeys ?? [],
    b.candles,
    to.candleKeys,
    collapseCandle,
    baseline,
    true,
  );
  // text: removed labels go at once, they never shrink
  const labels = keyedMarks(
    a?.labels ?? null,
    from?.labelKeys ?? [],
    b.labels,
    to.labelKeys,
    collapseLabel,
    baseline,
    false,
  );
  const line = interpolateChartPath(
    a?.linePathD ?? null,
    b.linePathD,
    baseline,
  );
  const area = interpolateChartPath(
    a?.areaPathD ?? null,
    b.areaPathD,
    baseline,
  );
  const source = a ?? collapsedRender(b, baseline);
  const segments = indexed(source.segments, b.segments);
  const dots = indexed(source.dots, b.dots);
  const extras = extraPathsTween(
    a?.extraPaths ?? [],
    b.extraPaths,
    baseline,
    a === null,
  );
  const fromFade = from?.fade ?? 0;
  const fromOpacity = a?.opacity ?? b.opacity;
  return (t) => {
    const barsNow = bars(t);
    const markersNow = markers(t);
    const candlesNow = candles(t);
    const labelsNow = labels(t);
    return {
      key: to.key,
      baseline: lerp(fromBaseline, baseline, t),
      fade: clamp01(lerp(fromFade, 1, t)),
      barKeys: barsNow.keys,
      markerKeys: markersNow.keys,
      candleKeys: candlesNow.keys,
      labelKeys: labelsNow.keys,
      render: {
        ...b,
        linePathD: line(t),
        areaPathD: area(t),
        bars: barsNow.marks.map(positiveBar),
        markers: markersNow.marks.map(positiveMarker),
        candles: candlesNow.marks.map(positiveCandle),
        labels: labelsNow.marks,
        segments: segments(t),
        dots: dots(t).map(positiveDot),
        extraPaths: extras(t),
        opacity: lerp(fromOpacity, b.opacity, t),
      },
    };
  };
}

/**
 * A leaving series' tween (removed from the data, or hidden from the
 * legend): it fades out while its marks shrink to its baseline.
 */
function leavingSeriesTween(
  from: OgeChartTweenSeries,
  seriesIndex: number,
): (t: number) => OgeChartTweenSeries {
  const a = from.render;
  const baseline = from.baseline;
  const shrink = <M>(marks: readonly M[], collapse: (m: M, b: number) => M) => {
    const targets = marks.map((mark) => collapse(mark, baseline));
    return (t: number): M[] =>
      marks.map((mark, i) => lerpShape(mark, targets[i], t));
  };
  const bars = shrink(a.bars, collapseBar);
  const markers = shrink(a.markers, collapseMarker);
  const candles = shrink(a.candles, collapseCandle);
  const line = interpolateChartPath(a.linePathD, null, baseline);
  const area = interpolateChartPath(a.areaPathD, null, baseline);
  const collapsed = collapsedRender(a, baseline);
  const segments = indexed(a.segments, collapsed.segments);
  const dots = indexed(a.dots, collapsed.dots);
  return (t) => ({
    ...from,
    fade: clamp01(lerp(from.fade, 0, t)),
    labelKeys: [],
    render: {
      ...a,
      seriesIndex,
      linePathD: line(t),
      areaPathD: area(t),
      bars: bars(t).map(positiveBar),
      markers: markers(t).map(positiveMarker),
      candles: candles(t).map(positiveCandle),
      labels: [],
      segments: segments(t),
      dots: dots(t).map(positiveDot),
    },
  });
}

/* ------------------------------------------------------------------ */
/* axis parts                                                          */
/* ------------------------------------------------------------------ */

interface AxisItem {
  readonly value?: number;
  readonly opacity?: number;
}

/**
 * Least-squares `field = slope · value + intercept` over the items of one
 * axis, per field; `null` without two distinct values or when the axis is
 * not linear (log axes: a residual over 1px) — those ticks fade in place.
 */
function fitAxis<V extends AxisItem>(
  items: readonly V[],
  fields: readonly (keyof V)[],
): ((value: number) => Partial<Record<keyof V, number>>) | null {
  const withValue = items.filter((item) => item.value !== undefined);
  if (new Set(withValue.map((item) => item.value)).size < 2) return null;
  const xs = withValue.map((item) => item.value as number);
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const varX = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  if (varX === 0) return null;
  const lines: { field: keyof V; slope: number; intercept: number }[] = [];
  for (const field of fields) {
    const ys = withValue.map((item) => item[field] as unknown as number);
    if (ys.some((y) => typeof y !== 'number')) return null;
    const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
    let cov = 0;
    for (let i = 0; i < xs.length; i++)
      cov += (xs[i] - meanX) * (ys[i] - meanY);
    const slope = cov / varX;
    const intercept = meanY - slope * meanX;
    for (let i = 0; i < xs.length; i++) {
      if (Math.abs(slope * xs[i] + intercept - ys[i]) > 1) return null;
    }
    lines.push({ field, slope, intercept });
  }
  return (value) => {
    const out: Partial<Record<keyof V, number>> = {};
    for (const line of lines)
      out[line.field] = line.slope * value + line.intercept;
    return out;
  };
}

/**
 * Axis labels / grid lines: matched by `group + value` (or the text) they
 * slide; new ones fade in from where their value sat on the old axis,
 * removed ones fade out towards where it sits on the new one.
 */
function axisItemsTween<V extends AxisItem>(
  from: readonly V[],
  to: readonly V[],
  groupOf: (item: V) => string,
  idOf: (item: V) => string,
  fields: readonly (keyof V)[],
  movable: (item: V) => boolean,
): (t: number) => V[] {
  if (from === to) return () => to as V[];
  const keysOf = (items: readonly V[]): string[] =>
    uniqueKeys(items.map((item) => `${groupOf(item)}|${idOf(item)}`));
  const fromKeys = keysOf(from);
  const toKeys = keysOf(to);
  const fits = (items: readonly V[]) => {
    const groups = new Map<string, V[]>();
    for (const item of items) {
      const group = groupOf(item);
      const list = groups.get(group) ?? [];
      list.push(item);
      groups.set(group, list);
    }
    const result = new Map<string, ReturnType<typeof fitAxis<V>>>();
    for (const [group, list] of groups)
      result.set(group, fitAxis(list, fields));
    return result;
  };
  const fromFits = fits(from);
  const toFits = fits(to);
  const before = new Map<string, V>();
  from.forEach((item, i) => before.set(fromKeys[i], item));
  const pairs: { from: V; to: V }[] = [];
  const live = new Set<string>();
  to.forEach((item, i) => {
    live.add(toKeys[i]);
    const old = before.get(toKeys[i]);
    if (old !== undefined) {
      pairs.push({
        from:
          movable(old) && movable(item)
            ? old
            : { ...item, opacity: old.opacity ?? 1 },
        to: { ...item, opacity: 1 },
      });
      return;
    }
    const fit = fromFits.get(groupOf(item));
    const start =
      fit && item.value !== undefined && movable(item)
        ? { ...item, ...fit(item.value) }
        : item;
    pairs.push({ from: { ...start, opacity: 0 }, to: { ...item, opacity: 1 } });
  });
  from.forEach((item, i) => {
    if (live.has(fromKeys[i])) return;
    const fit = toFits.get(groupOf(item));
    const end =
      fit && item.value !== undefined && movable(item)
        ? { ...item, ...fit(item.value) }
        : item;
    pairs.push({
      from: { ...item, opacity: item.opacity ?? 1 },
      to: { ...end, opacity: 0 },
    });
  });
  return (t) =>
    pairs.map((pair) => {
      const item = lerpShape(pair.from, pair.to, t);
      const opacity = clamp01(item.opacity ?? 1);
      return { ...item, opacity };
    });
}

/* ------------------------------------------------------------------ */
/* the frame tween                                                     */
/* ------------------------------------------------------------------ */

/**
 * Prepares the tween from frame `from` (the scene before the update, or
 * the frame on screen when a tween is retargeted) to `to` (the new scene's
 * frame) and returns the frame function (`t` 0 → 1, eased; it may
 * overshoot). At `t >= 1` it returns `to` itself.
 */
export function interpolateChartFrames(
  from: OgeChartTweenFrame,
  to: OgeChartTweenFrame,
): (t: number) => OgeChartTweenFrame {
  if (from === to) return () => to;
  const before = new Map(from.series.map((s) => [s.key, s]));
  const live = new Set(to.series.map((s) => s.key));
  const tweens = to.series.map((s) =>
    seriesTween(before.get(s.key) ?? null, s),
  );
  const usedIndexes = new Set(to.series.map((s) => s.render.seriesIndex));
  let exitIndex = 0;
  for (const s of from.series) {
    if (live.has(s.key)) continue;
    // a leaving series keeps its index unless a live series now has it
    const seriesIndex = usedIndexes.has(s.render.seriesIndex)
      ? -1 - exitIndex++
      : s.render.seriesIndex;
    tweens.push(leavingSeriesTween(s, seriesIndex));
  }
  const labels = axisItemsTween<OgeChartAxisLabelVm>(
    from.axisLabels,
    to.axisLabels,
    (label) => `${label.axis}:${label.axisIndex}`,
    (label) =>
      label.value !== undefined ? `v${label.value}` : `t${label.text}`,
    ['x', 'y'],
    (label) => label.transform === null,
  );
  const grid = axisItemsTween<OgeChartGridLineVm>(
    from.gridLines,
    to.gridLines,
    (line) => `${line.axis ?? 'value'}:${line.pane ?? 0}`,
    (line) =>
      `${line.minor ? 'm' : 'M'}${line.value !== undefined ? line.value : ''}`,
    ['x1', 'y1', 'x2', 'y2'],
    () => true,
  );
  const guides = indexed(from.guides, to.guides);
  const annotations = indexed(from.annotations, to.annotations);
  if (markCount(from) + markCount(to) > CHART_TWEEN_MAX_MARKS) return () => to;
  return (t) => {
    if (t >= 1) return to;
    const series = tweens.map((tween) => tween(t));
    return {
      series,
      renderSeries: series.map((s) =>
        s.fade < 1 ? { ...s.render, fade: s.fade } : s.render,
      ),
      axisLabels: labels(t),
      gridLines: grid(t),
      guides: guides(t),
      annotations: annotations(t),
    };
  };
}

/* ------------------------------------------------------------------ */
/* pie / doughnut                                                      */
/* ------------------------------------------------------------------ */

/** One slice of a pie tween frame: its arc and the match key. */
export interface OgePieTweenSlice<T> {
  readonly key: string;
  readonly vm: OgePieSliceVm<T>;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly cx: number;
  readonly cy: number;
  readonly outerR: number;
  readonly innerR: number;
}

/** What a pie draws, as a tween sees it. */
export interface OgePieTweenFrame<T> {
  readonly slices: readonly OgePieTweenSlice<T>[];
  readonly sliceVms: readonly OgePieSliceVm<T>[];
  readonly labelVms: readonly OgePieLabelVm[];
  /** Label match keys, parallel to `labelVms`. */
  readonly labelKeys: readonly string[];
}

/** The slice explode offset (px) — the selected-slice nudge. */
const PIE_EXPLODE = 8;

/** The pie scene's drawn state as a keyed tween frame. */
export function pieTweenFrame<T>(scene: OgePieScene<T>): OgePieTweenFrame<T> {
  const ring = new Map(scene.rings.map((r) => [r.index, r]));
  const keys = uniqueKeys(
    scene.slices.map(
      (vm) => `${vm.ringIndex}|${chartArgumentKey(vm.payload.argument)}`,
    ),
  );
  return {
    slices: scene.slices.map((vm, i) => {
      const r = ring.get(vm.ringIndex);
      return {
        key: keys[i],
        vm,
        startAngle: vm.slice.startAngle,
        endAngle: vm.slice.endAngle,
        cx: scene.geometry.cx,
        cy: scene.geometry.cy,
        outerR: r?.outerR ?? scene.geometry.outerR,
        innerR: r?.innerR ?? scene.geometry.innerR,
      };
    }),
    sliceVms: scene.slices,
    labelVms: scene.labelVms,
    labelKeys: uniqueKeys(
      scene.labelVms.map(
        (label) => `${label.seriesIndex}|${chartArgumentKey(label.argument)}`,
      ),
    ),
  };
}

/**
 * Whether a pie update is worth a tween: the slices changed while the pie
 * kept its centre and radius (a resize redraws at once).
 */
export function pieShouldTween<T>(
  prev: OgePieScene<T> | null,
  next: OgePieScene<T>,
): boolean {
  if (prev === null || prev === next) return false;
  if (prev.slices.length === 0 && next.slices.length === 0) return false;
  const a = prev.geometry;
  const b = next.geometry;
  return a.cx === b.cx && a.cy === b.cy && a.outerR === b.outerR;
}

function sliceVmAt<T>(
  slice: OgePieTweenSlice<T>,
  startAngle: number,
  endAngle: number,
  geometry: { cx: number; cy: number; outerR: number; innerR: number },
  key: string,
  index: number,
): OgePieSliceVm<T> {
  const end = Math.max(startAngle, endAngle);
  const mid = (startAngle + end) / 2;
  const dx = PIE_EXPLODE * Math.sin(mid);
  const dy = -PIE_EXPLODE * Math.cos(mid);
  const { cx, cy, outerR, innerR } = geometry;
  return {
    ...slice.vm,
    key,
    slice: { ...slice.vm.slice, index, startAngle, endAngle: end },
    path: sliceArcPath(cx, cy, outerR, innerR, startAngle, end),
    explodedPath: sliceArcPath(
      cx + dx,
      cy + dy,
      outerR,
      innerR,
      startAngle,
      end,
    ),
  };
}

/** The connector's points lerped when both have the same count. */
function lerpConnector(
  a: string | null,
  b: string | null,
  t: number,
): string | null {
  if (a === null || b === null || a === b) return b;
  const pa = a
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  const pb = b
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (pa.length !== pb.length || pb.length % 2 !== 0) return b;
  const pts: string[] = [];
  for (let i = 0; i < pb.length; i += 2) {
    const x = Math.round(lerp(pa[i], pb[i], t) * 100) / 100;
    const y = Math.round(lerp(pa[i + 1], pb[i + 1], t) * 100) / 100;
    pts.push(`${x},${y}`);
  }
  return pts.join(' ');
}

/**
 * The arc tween: slices matched by ring + argument sweep to their new
 * angles; a new slice opens from the seam where it appears, a removed one
 * closes onto the seam its neighbours meet at. Labels of matched slices
 * glide, new ones appear at their place and removed ones go at once.
 */
export function interpolatePieFrames<T>(
  from: OgePieTweenFrame<T>,
  to: OgePieTweenFrame<T>,
): (t: number) => OgePieTweenFrame<T> {
  if (from === to) return () => to;
  const before = new Map(from.slices.map((s) => [s.key, s]));
  const after = new Map(to.slices.map((s) => [s.key, s]));
  type Pair = {
    from: OgePieTweenSlice<T>;
    fromStart: number;
    fromEnd: number;
    to: OgePieTweenSlice<T>;
    toStart: number;
    toEnd: number;
    key: string;
    index: number;
  };
  const pairs: Pair[] = [];
  const sameRing = (a: OgePieTweenSlice<T>, b: OgePieTweenSlice<T>): boolean =>
    a.vm.ringIndex === b.vm.ringIndex;
  to.slices.forEach((slice, i) => {
    const old = before.get(slice.key);
    if (old !== undefined) {
      pairs.push({
        from: old,
        fromStart: old.startAngle,
        fromEnd: old.endAngle,
        to: slice,
        toStart: slice.startAngle,
        toEnd: slice.endAngle,
        key: slice.vm.key,
        index: slice.vm.slice.index,
      });
      return;
    }
    // open from the old seam: the previous surviving slice's old end, else
    // the next one's old start
    const survivor = (s: OgePieTweenSlice<T>) => {
      const old = before.get(s.key);
      return old !== undefined && sameRing(old, slice) ? old : undefined;
    };
    let seam = slice.startAngle;
    const prevOld = to.slices.slice(0, i).reverse().map(survivor).find(Boolean);
    const nextOld = to.slices
      .slice(i + 1)
      .map(survivor)
      .find(Boolean);
    if (prevOld !== undefined) seam = prevOld.endAngle;
    else if (nextOld !== undefined) seam = nextOld.startAngle;
    pairs.push({
      from: slice,
      fromStart: seam,
      fromEnd: seam,
      to: slice,
      toStart: slice.startAngle,
      toEnd: slice.endAngle,
      key: slice.vm.key,
      index: slice.vm.slice.index,
    });
  });
  let exitIndex = 0;
  from.slices.forEach((slice, i) => {
    if (after.has(slice.key)) return;
    // close onto the new seam: the next surviving slice's new start
    let seam = (slice.startAngle + slice.endAngle) / 2;
    const next = from.slices
      .slice(i + 1)
      .map((s) => after.get(s.key))
      .find((s) => s !== undefined && sameRing(s, slice));
    if (next !== undefined) seam = next.startAngle;
    else {
      const prev = from.slices
        .slice(0, i)
        .reverse()
        .map((s) => after.get(s.key))
        .find((s) => s !== undefined && sameRing(s, slice));
      if (prev !== undefined) seam = prev.endAngle;
    }
    pairs.push({
      from: slice,
      fromStart: slice.startAngle,
      fromEnd: slice.endAngle,
      to: slice,
      toStart: seam,
      toEnd: seam,
      key: `~${slice.key}`,
      index: -1 - exitIndex++,
    });
  });
  const labelsBefore = new Map<string, OgePieLabelVm>();
  from.labelVms.forEach((label, i) =>
    labelsBefore.set(from.labelKeys[i], label),
  );
  return (t) => {
    if (t >= 1) return to;
    const slices = pairs.map((pair): OgePieTweenSlice<T> => {
      const startAngle = lerp(pair.fromStart, pair.toStart, t);
      const endAngle = lerp(pair.fromEnd, pair.toEnd, t);
      const geometry = {
        cx: lerp(pair.from.cx, pair.to.cx, t),
        cy: lerp(pair.from.cy, pair.to.cy, t),
        outerR: lerp(pair.from.outerR, pair.to.outerR, t),
        innerR: Math.max(0, lerp(pair.from.innerR, pair.to.innerR, t)),
      };
      return {
        ...pair.to,
        ...geometry,
        key: pair.to.key,
        startAngle,
        endAngle,
        vm: sliceVmAt(
          pair.to,
          startAngle,
          endAngle,
          geometry,
          pair.key,
          pair.index,
        ),
      };
    });
    const labelVms = to.labelVms.map((label, i) => {
      const old = labelsBefore.get(to.labelKeys[i]);
      if (old === undefined) return label;
      return {
        ...label,
        x: lerp(old.x, label.x, t),
        y: lerp(old.y, label.y, t),
        connector: lerpConnector(old.connector, label.connector, t),
      };
    });
    return {
      slices,
      sliceVms: slices
        .filter((slice) => slice.endAngle - slice.startAngle > 1e-6)
        .map((slice) => slice.vm),
      labelVms,
      labelKeys: to.labelKeys,
    };
  };
}

/* ------------------------------------------------------------------ */
/* the frame loop                                                      */
/* ------------------------------------------------------------------ */

/** Duration (ms) and eased progress of one tween. */
export interface OgeChartTweenTiming {
  readonly duration: number;
  /** Progress 0 → 1 to eased progress (`chartEasingFunction`). */
  readonly easing: (t: number) => number;
}

/** Overridable clock — specs drive the loop by hand. */
export interface OgeChartTweenClock {
  readonly now: () => number;
  readonly request: (callback: (time: number) => void) => unknown;
  readonly cancel: (handle: unknown) => void;
}

/** The requestAnimationFrame loop of a chart's tweens. */
export interface OgeChartTweenDriver<F> {
  /**
   * Tweens to `to`. `from` is the frame drawn before the update; while a
   * tween is running the frame on screen is used instead, so a retarget
   * continues from where the marks are and never jumps.
   */
  run(from: F, to: F, timing: OgeChartTweenTiming): void;
  /** Stops at once; the next frame drawn is the scene's own. */
  cancel(): void;
  /** Whether a tween is in flight. */
  readonly running: boolean;
}

function defaultClock(): OgeChartTweenClock | null {
  if (typeof requestAnimationFrame !== 'function') return null;
  return {
    now: () =>
      typeof performance !== 'undefined' ? performance.now() : Date.now(),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle as number),
  };
}

/**
 * Creates the tween loop: `onFrame` receives every interpolated frame and
 * `null` when the tween ends or is cancelled (draw the scene again). The
 * first frame is emitted synchronously from `run`, so the update never
 * paints the target for one frame first. Without requestAnimationFrame
 * (SSR) `run` emits `null` at once.
 */
export function createChartTweenDriver<F>(
  interpolate: (from: F, to: F) => (t: number) => F,
  onFrame: (frame: F | null) => void,
  clock: OgeChartTweenClock | null = defaultClock(),
): OgeChartTweenDriver<F> {
  let current: F | null = null;
  let handle: unknown = null;
  const stop = (): void => {
    if (handle !== null) clock?.cancel(handle);
    handle = null;
  };
  return {
    get running() {
      return current !== null;
    },
    run(from, to, timing) {
      stop();
      if (clock === null || timing.duration <= 0) {
        current = null;
        onFrame(null);
        return;
      }
      const frameAt = interpolate(current ?? from, to);
      const start = clock.now();
      const step = (): void => {
        const progress = Math.min(1, (clock.now() - start) / timing.duration);
        if (progress >= 1) {
          handle = null;
          current = null;
          onFrame(null);
          return;
        }
        current = frameAt(timing.easing(progress));
        onFrame(current);
        handle = clock.request(step);
      };
      current = frameAt(0);
      onFrame(current);
      handle = clock.request(step);
    },
    cancel() {
      stop();
      if (current !== null) {
        current = null;
        onFrame(null);
      }
    },
  };
}
