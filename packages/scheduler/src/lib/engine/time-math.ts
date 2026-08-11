/**
 * Slot math for the scheduler's day/week time grid. All functions are pure
 * and operate on "minutes of day" (0–1440) so the layout and gesture engines
 * never touch `Date` construction — that stays in view-model.ts, built on
 * `@oge-ui/core` date-utils (Intl-only, local wall time, no date library).
 */

/** Minutes since local midnight (`14:30` → `870`). */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * A new `Date` on `day`'s calendar date at `minutes` past midnight, local
 * wall time. Values ≥ 1440 roll into the next day (used by segment math).
 */
export function setMinutesOfDay(day: Date, minutes: number): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
  );
}

/** Wall-clock duration in minutes; midnight-crossing ranges use calendar days. */
export function durationMinutes(start: Date, end: Date): number {
  const days =
    (new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() -
      new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
      ).getTime()) /
    86_400_000;
  return Math.round(days) * 1440 + minutesOfDay(end) - minutesOfDay(start);
}

/**
 * Snaps a minutes-of-day value to the slot raster: `floor` for "which slot
 * contains this point" (hit testing), `round` for "nearest slot edge"
 * (drag/resize previews).
 */
export function snapToSlot(
  minutes: number,
  cellDuration: number,
  mode: 'floor' | 'round',
): number {
  const slots =
    mode === 'floor'
      ? Math.floor(minutes / cellDuration)
      : Math.round(minutes / cellDuration);
  return slots * cellDuration;
}

/** Number of rendered slot rows between `dayStartHour` and `dayEndHour`. */
export function slotCount(
  dayStartHour: number,
  dayEndHour: number,
  cellDuration: number,
): number {
  return Math.max(
    0,
    Math.ceil(((dayEndHour - dayStartHour) * 60) / cellDuration),
  );
}

/** Clamps a minutes-of-day value into the visible `[start, end]` window. */
export function clampMinutesToWindow(
  minutes: number,
  dayStartHour: number,
  dayEndHour: number,
): number {
  return Math.min(Math.max(minutes, dayStartHour * 60), dayEndHour * 60);
}
