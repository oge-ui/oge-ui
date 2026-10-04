/**
 * Tick label formatting — Intl-only (house rule): locale-aware numbers
 * with optional SI abbreviation, calendar-aware time labels per tick
 * unit, and the axis label overlap decision. Pure.
 */
import type { TimeTickUnit } from './scale';

/** `1234` → `1.2K`, `-3400000` → `-3.4M` (locale decimal separator). */
export function siFormat(value: number, locale?: string): string {
  const abs = Math.abs(value);
  const format = (scaled: number, suffix: string): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(scaled)}${suffix}`;
  if (abs >= 1e9) return format(value / 1e9, 'B');
  if (abs >= 1e6) return format(value / 1e6, 'M');
  if (abs >= 1e4) return format(value / 1e3, 'K');
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);
}

/** Plain locale number without abbreviation. */
export function numberFormat(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 3,
  }).format(value);
}

/** A formatter for time-axis tick labels, matched to the tick unit. */
export function timeTickFormatter(
  unit: TimeTickUnit,
  locale?: string,
): (ms: number) => string {
  const options: Intl.DateTimeFormatOptions =
    unit === 'minute' || unit === 'hour'
      ? { hour: 'numeric', minute: '2-digit' }
      : unit === 'day' || unit === 'week'
        ? { day: 'numeric', month: 'short' }
        : unit === 'month'
          ? { month: 'short', year: '2-digit' }
          : { year: 'numeric' };
  const format = new Intl.DateTimeFormat(locale, options);
  return (ms: number) => format.format(new Date(ms));
}

export type LabelOverlapMode = 'rotate' | 'stagger' | 'hide' | 'skip' | 'none';

export interface LabelLayoutDecision {
  /** Render every n-th label (1 = all). */
  readonly skipEvery: number;
  readonly rotated: boolean;
  /** Alternate labels drop to a second row. */
  readonly staggered?: boolean;
  /** Drop each label that collides with the last one kept. */
  readonly hideOverlapping?: boolean;
}

/**
 * Overlap resolution: if the widest label at `estimatedWidthPx` does not
 * fit the per-tick slot, rotate (fits in the row height footprint),
 * stagger into two rows (falls back to skipping when even two rows
 * collide), hide colliding labels, or skip every n-th label. `'none'`
 * renders everything regardless.
 */
export function decideLabelLayout(
  tickCount: number,
  rangePx: number,
  estimatedWidthPx: number,
  mode: LabelOverlapMode,
): LabelLayoutDecision {
  if (mode === 'none' || tickCount <= 1) {
    return { skipEvery: 1, rotated: false };
  }
  const slot = rangePx / tickCount;
  if (estimatedWidthPx + 6 <= slot) return { skipEvery: 1, rotated: false };
  if (mode === 'rotate') return { skipEvery: 1, rotated: true };
  if (mode === 'hide') {
    return { skipEvery: 1, rotated: false, hideOverlapping: true };
  }
  if (mode === 'stagger') {
    // two rows double the room per label
    const skipEvery = Math.max(
      1,
      Math.ceil((estimatedWidthPx + 6) / (slot * 2)),
    );
    return { skipEvery, rotated: false, staggered: true };
  }
  const skipEvery = Math.max(2, Math.ceil((estimatedWidthPx + 6) / slot));
  return { skipEvery, rotated: false };
}

/**
 * Greedy `'hide'` overlap resolution over label centers along the axis
 * (px, ascending or descending): keeps a label only when it clears the last
 * kept one by `extentPx`. Returns the kept indexes.
 */
export function hideOverlappingLabels(
  centers: readonly number[],
  extents: readonly number[],
  gapPx = 6,
): number[] {
  const kept: number[] = [];
  let lastCenter: number | null = null;
  let lastExtent = 0;
  centers.forEach((center, index) => {
    const extent = extents[index] ?? 0;
    if (
      lastCenter === null ||
      Math.abs(center - lastCenter) >= (lastExtent + extent) / 2 + gapPx
    ) {
      kept.push(index);
      lastCenter = center;
      lastExtent = extent;
    }
  });
  return kept;
}
