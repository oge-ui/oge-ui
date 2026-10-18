/**
 * The cartesian chart's animation options: hover/selection transitions, the
 * one-time series draw-in on first render (each series grows from its
 * value-axis baseline) and the data-change / legend-toggle tweens
 * (`chart-tween.ts`). `@oge-ui/behavior`'s `prefersReducedMotion()` is not
 * available here (the engine depends on `core` only), so the reduced-motion
 * check is a local, SSR-safe `matchMedia` read. Pure apart from that read
 * and the token read of {@link chartAnimationEasing}.
 */
import type {
  OgeChartAnimationEasing,
  OgeChartAnimationOptions,
} from './charts-types';
import type { ChartScale } from './scale';

/** Default draw-in duration, ms. */
export const CHART_DRAW_IN_MS = 600;

/** `prefers-reduced-motion: reduce`, SSR-safe (`false` without `matchMedia`). */
export function chartPrefersReducedMotion(): boolean {
  try {
    return (
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

export interface OgeChartResolvedAnimation {
  /** Hover / selection transitions. */
  readonly transitions: boolean;
  /** The first-render draw-in. */
  readonly drawIn: boolean;
  /**
   * Data-change and legend-toggle tweens (marks glide from the previous
   * geometry). On whenever the draw-in is.
   */
  readonly tweens: boolean;
  readonly duration: number;
  /**
   * CSS easing: the preset's motion token with the raw curve as its
   * fallback (`var(--oge-motion-easing-decelerate, cubic-bezier(…))`), so a
   * consumer retiming the suite from `:root` retimes the charts too.
   */
  readonly easing: string;
  /** The motion token the preset maps to; `null` for `'linear'`. */
  readonly easingToken: string | null;
  /** The raw curve — the SSR / no-stylesheet fallback of the token. */
  readonly easingFallback: string;
}

/**
 * Easing presets → motion tokens (`--oge-motion-easing-*`), with the raw
 * curve each preset used before the tokens existed as the fallback.
 */
const EASINGS: Readonly<
  Record<
    OgeChartAnimationEasing,
    { readonly token: string | null; readonly raw: string }
  >
> = {
  linear: { token: null, raw: 'linear' },
  ease: { token: '--oge-motion-easing-standard', raw: 'ease' },
  easeIn: {
    token: '--oge-motion-easing-accelerate',
    raw: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  easeOut: {
    token: '--oge-motion-easing-decelerate',
    raw: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  easeInOut: {
    token: '--oge-motion-easing-standard',
    raw: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

/**
 * The `animation` input (boolean shorthand or options) resolved against the
 * user's motion preference — reduced motion turns everything off.
 */
export function resolveChartAnimation(
  animation: boolean | OgeChartAnimationOptions | undefined,
  reducedMotion: boolean,
): OgeChartResolvedAnimation {
  const options: OgeChartAnimationOptions =
    typeof animation === 'object'
      ? animation
      : { enabled: animation !== false };
  const enabled = options.enabled !== false && !reducedMotion;
  const duration = Math.max(0, options.duration ?? CHART_DRAW_IN_MS);
  const preset = EASINGS[options.easing ?? 'easeOut'] ?? EASINGS.easeOut;
  return {
    transitions: enabled,
    drawIn: enabled && duration > 0,
    tweens: enabled && duration > 0,
    duration,
    easing:
      preset.token === null
        ? preset.raw
        : `var(${preset.token}, ${preset.raw})`,
    easingToken: preset.token,
    easingFallback: preset.raw,
  };
}

/** The CSS custom properties the draw-in keyframes read. */
export function chartAnimationVars(
  resolved: OgeChartResolvedAnimation,
): Readonly<Record<string, string>> {
  return {
    '--oge-chart-anim-duration': `${resolved.duration}ms`,
    '--oge-chart-anim-easing': resolved.easing,
  };
}

/**
 * The resolved easing as `element` sees it: the motion token's computed
 * value, else the raw fallback (SSR, detached nodes, no stylesheet). The
 * script tweens run on this, so they share the CSS draw-in's curve.
 */
export function chartAnimationEasing(
  resolved: OgeChartResolvedAnimation,
  element: Element | null,
): string {
  if (resolved.easingToken === null || element === null) {
    return resolved.easingFallback;
  }
  try {
    const value =
      typeof getComputedStyle === 'function'
        ? getComputedStyle(element).getPropertyValue(resolved.easingToken)
        : '';
    return value.trim() || resolved.easingFallback;
  } catch {
    return resolved.easingFallback;
  }
}

/**
 * `transform-origin` of a series group during the draw-in: the value-axis
 * baseline (0, or the axis minimum) in the series group's logical space —
 * the keyframes scale the value dimension up from there, which reads as
 * bars growing and lines rising in every orientation.
 */
export function chartSeriesEnterOrigin(
  valueScale: ChartScale | undefined,
): string {
  if (valueScale === undefined) return '0px 0px';
  return `0px ${Math.round(chartValueBaselinePx(valueScale) * 100) / 100}px`;
}

/** The value baseline (0 clamped into the axis) in logical px. */
export function chartValueBaselinePx(valueScale: ChartScale): number {
  const lo = Math.min(valueScale.min, valueScale.max);
  const hi = Math.max(valueScale.min, valueScale.max);
  return valueScale.toPx(Math.max(lo, Math.min(hi, 0)));
}

/* ---------------- CSS easing → function ---------------- */

const KEYWORD_CURVES: Readonly<
  Record<string, readonly [number, number, number, number]>
> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/** A CSS `cubic-bezier(x1, y1, x2, y2)` as a progress → value function. */
function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u: number): number => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number): number => ((ay * u + by) * u + cy) * u;
  const slopeX = (u: number): number => (3 * ax * u + 2 * bx) * u + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // Newton first, bisection when the slope is flat
    let u = t;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(u) - t;
      if (Math.abs(error) < 1e-6) return sampleY(u);
      const slope = slopeX(u);
      if (Math.abs(slope) < 1e-6) break;
      u -= error / slope;
    }
    let lo = 0;
    let hi = 1;
    u = t;
    for (let i = 0; i < 40; i++) {
      const x = sampleX(u);
      if (Math.abs(x - t) < 1e-6) break;
      if (x < t) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return sampleY(u);
  };
}

/**
 * A CSS `linear(…)` easing (the sampled springs of the motion tokens):
 * stops with optional percentages, linearly interpolated.
 */
function linearStops(body: string): ((t: number) => number) | null {
  const stops: { value: number; at: number | null }[] = [];
  for (const part of body.split(',')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;
    const value = Number(tokens[0]);
    if (!Number.isFinite(value)) return null;
    const percents = tokens.slice(1).map((token) => parseFloat(token) / 100);
    if (percents.some((p) => !Number.isFinite(p))) return null;
    if (percents.length === 0) stops.push({ value, at: null });
    for (const at of percents) stops.push({ value, at });
  }
  if (stops.length < 2) return null;
  // the spec's defaults: first 0 %, last 100 %, gaps spread evenly
  if (stops[0].at === null) stops[0].at = 0;
  const last = stops[stops.length - 1];
  if (last.at === null) last.at = 1;
  let maxAt = 0;
  for (const stop of stops) {
    if (stop.at !== null) {
      stop.at = Math.max(stop.at, maxAt);
      maxAt = stop.at;
    }
  }
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].at !== null) continue;
    let j = i;
    while (stops[j].at === null) j++;
    const from = stops[i - 1].at as number;
    const to = stops[j].at as number;
    for (let k = i; k < j; k++) {
      stops[k].at = from + ((to - from) * (k - i + 1)) / (j - i + 1);
    }
  }
  const at = stops.map((stop) => stop.at as number);
  return (t) => {
    if (t <= at[0]) return stops[0].value;
    for (let i = 1; i < stops.length; i++) {
      if (t <= at[i]) {
        const span = at[i] - at[i - 1];
        const f = span > 0 ? (t - at[i - 1]) / span : 1;
        return stops[i - 1].value + (stops[i].value - stops[i - 1].value) * f;
      }
    }
    return stops[stops.length - 1].value;
  };
}

const DEFAULT_EASING = cubicBezier(0, 0, 0.2, 1);

/**
 * A CSS easing (`linear`, the `ease*` keywords, `cubic-bezier()`,
 * `linear()`) as a progress → eased-progress function for script tweens.
 * Anything else (`steps()`, an unresolved `var()`) falls back to the charts'
 * default curve. The result may overshoot 1 (springs).
 */
export function chartEasingFunction(css: string): (t: number) => number {
  const text = css.trim().toLowerCase();
  if (text === 'linear') return (t) => Math.max(0, Math.min(1, t));
  const keyword = KEYWORD_CURVES[text];
  if (keyword !== undefined) return cubicBezier(...keyword);
  const bezier = /^cubic-bezier\(([^()]*)\)$/.exec(text);
  if (bezier !== null) {
    const values = bezier[1].split(',').map((part) => Number(part.trim()));
    if (
      values.length === 4 &&
      values.every((value) => Number.isFinite(value))
    ) {
      return cubicBezier(values[0], values[1], values[2], values[3]);
    }
  }
  const linear = /^linear\(([^()]*)\)$/.exec(text);
  if (linear !== null) {
    const fn = linearStops(linear[1]);
    if (fn !== null) return fn;
  }
  return DEFAULT_EASING;
}
