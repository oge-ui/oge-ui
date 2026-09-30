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

export type LabelOverlapMode = 'rotate' | 'skip' | 'none';

export interface LabelLayoutDecision {
  /** Render every n-th label (1 = all). */
  readonly skipEvery: number;
  readonly rotated: boolean;
}

/**
 * Overlap resolution: if the widest label at `estimatedWidthPx` does not
 * fit the per-tick slot, either rotate (fits in the row height footprint)
 * or skip every n-th label. `'none'` renders everything regardless.
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
  const skipEvery = Math.max(2, Math.ceil((estimatedWidthPx + 6) / slot));
  return { skipEvery, rotated: false };
}
