/**
 * The cartesian chart's animation options: hover/selection transitions and
 * the one-time series draw-in on first render (each series grows from its
 * value-axis baseline). `@oge-ui/behavior`'s `prefersReducedMotion()` is not
 * available here (the engine depends on `core` only), so the reduced-motion
 * check is a local, SSR-safe `matchMedia` read. Pure apart from that read.
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
  readonly duration: number;
  /** CSS easing function. */
  readonly easing: string;
}

const EASINGS: Readonly<Record<OgeChartAnimationEasing, string>> = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
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
  return {
    transitions: enabled,
    drawIn: enabled && duration > 0,
    duration,
    easing: EASINGS[options.easing ?? 'easeOut'] ?? EASINGS.easeOut,
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
 * `transform-origin` of a series group during the draw-in: the value-axis
 * baseline (0, or the axis minimum) in the series group's logical space —
 * the keyframes scale the value dimension up from there, which reads as
 * bars growing and lines rising in every orientation.
 */
export function chartSeriesEnterOrigin(
  valueScale: ChartScale | undefined,
): string {
  if (valueScale === undefined) return '0px 0px';
  const lo = Math.min(valueScale.min, valueScale.max);
  const hi = Math.max(valueScale.min, valueScale.max);
  const base = valueScale.toPx(Math.max(lo, Math.min(hi, 0)));
  return `0px ${Math.round(base * 100) / 100}px`;
}
