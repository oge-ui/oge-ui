/**
 * The charts' keyboard maps. No WAI-ARIA APG chart pattern exists; the plot
 * region is a focusable group where arrows walk arguments (Left/Right) and
 * series (Up/Down) — Up/Down and Left/Right swap on a rotated chart, and
 * the horizontal pair mirrors in RTL — Home/End jump, Enter/Space activate and Escape resets the
 * zoom. The range selector's handles follow the APG slider pattern.
 *
 * Pure: each map turns a key + the current state into a command, and the
 * render layer applies it (and calls `preventDefault()` whenever a command
 * comes back).
 */
import type { ChartRange } from './scale';

export type OgeChartKeyCommand =
  /** Move the active argument; `clearPointer` drops the pointer y snap. */
  | {
      readonly type: 'argument';
      readonly position: number;
      readonly clearPointer: boolean;
    }
  /** Move the active series. */
  | { readonly type: 'series'; readonly seriesIndex: number }
  /** Enter / Space on the active point. */
  | { readonly type: 'activate' }
  /** Escape while zoomed. */
  | { readonly type: 'resetZoom' };

export interface OgeChartKeyContext {
  /** Number of arguments (cartesian) or categories (polar). */
  readonly argCount: number;
  /** Active argument position; `null` before the first move. */
  readonly position: number | null;
  readonly seriesIndex: number;
  readonly seriesCount: number;
  readonly isSeriesVisible: (seriesIndex: number) => boolean;
  /** Cartesian only: a zoom window is applied. */
  readonly zoomed?: boolean;
  /**
   * Cartesian only: the argument axis runs vertically — Up/Down walk the
   * arguments (first on top) and Left/Right the series.
   */
  readonly rotated?: boolean;
  /** Mirrored layout: the horizontal arrow keys swap (visual order). */
  readonly rtl?: boolean;
}

/** Next visible series in `delta` direction, wrapping (stays put if none). */
function stepSeries(ctx: OgeChartKeyContext, delta: number): number {
  let next = ctx.seriesIndex;
  for (let i = 0; i < ctx.seriesCount; i++) {
    next = (next + delta + ctx.seriesCount) % ctx.seriesCount;
    if (ctx.isSeriesVisible(next)) break;
  }
  return next;
}

/** The cartesian plot: arguments clamp at both ends. */
export function cartesianKeyCommand(
  key: string,
  ctx: OgeChartKeyContext,
): OgeChartKeyCommand | null {
  const count = ctx.argCount;
  if (count === 0) return null;
  const step = (delta: number): OgeChartKeyCommand => ({
    type: 'argument',
    position: Math.max(
      0,
      Math.min(count - 1, (ctx.position ?? -delta) + delta),
    ),
    clearPointer: true,
  });
  // arrows follow the screen: the argument axis' own direction walks the
  // arguments, the cross direction walks the series
  const forward = ctx.rtl === true ? 'ArrowLeft' : 'ArrowRight';
  const backward = ctx.rtl === true ? 'ArrowRight' : 'ArrowLeft';
  const argNext = ctx.rotated === true ? 'ArrowDown' : forward;
  const argPrev = ctx.rotated === true ? 'ArrowUp' : backward;
  const seriesNext = ctx.rotated === true ? forward : 'ArrowDown';
  const seriesPrev = ctx.rotated === true ? backward : 'ArrowUp';
  switch (key) {
    case argNext:
      return step(1);
    case argPrev:
      return step(-1);
    case seriesNext:
      return { type: 'series', seriesIndex: stepSeries(ctx, 1) };
    case seriesPrev:
      return { type: 'series', seriesIndex: stepSeries(ctx, -1) };
    case 'Home':
      return { type: 'argument', position: 0, clearPointer: false };
    case 'End':
      return { type: 'argument', position: count - 1, clearPointer: false };
    case 'Enter':
    case ' ':
      return ctx.position === null ? null : { type: 'activate' };
    case 'Escape':
      return ctx.zoomed === true ? { type: 'resetZoom' } : null;
    default:
      return null;
  }
}

/** The polar plot: categories wrap around the circle; no Home/End/Escape. */
export function polarKeyCommand(
  key: string,
  ctx: OgeChartKeyContext,
): OgeChartKeyCommand | null {
  const count = ctx.argCount;
  if (count === 0) return null;
  const step = (delta: number): OgeChartKeyCommand => ({
    type: 'argument',
    position: ((ctx.position ?? -delta) + delta + count) % count,
    clearPointer: true,
  });
  switch (key) {
    case 'ArrowRight':
      return step(1);
    case 'ArrowLeft':
      return step(-1);
    case 'ArrowDown':
      return { type: 'series', seriesIndex: stepSeries(ctx, 1) };
    case 'ArrowUp':
      return { type: 'series', seriesIndex: stepSeries(ctx, -1) };
    case 'Enter':
    case ' ':
      return ctx.position === null ? null : { type: 'activate' };
    default:
      return null;
  }
}

/**
 * A range-selector handle key (APG slider): arrows move the handle by 2% of
 * the bounds, Home/End jump. Returns the unclamped next window, or `null`
 * for keys the handle does not own.
 */
export function rangeHandleKeyRange(
  side: 'start' | 'end',
  key: string,
  range: ChartRange,
  bounds: ChartRange,
): ChartRange | null {
  const step = (bounds.max - bounds.min) / 50;
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return side === 'start'
        ? { min: range.min - step, max: range.max }
        : { min: range.min, max: Math.max(range.max - step, range.min) };
    case 'ArrowRight':
    case 'ArrowUp':
      return side === 'start'
        ? { min: Math.min(range.min + step, range.max), max: range.max }
        : { min: range.min, max: range.max + step };
    case 'Home':
      return side === 'start'
        ? { min: bounds.min, max: range.max }
        : { min: range.min, max: range.min };
    case 'End':
      return side === 'start'
        ? { min: range.max, max: range.max }
        : { min: range.min, max: bounds.max };
    default:
      return null;
  }
}
