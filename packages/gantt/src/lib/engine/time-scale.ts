/**
 * The Gantt timeline scale: converts the task date range + a scale type
 * into tick lists (a major header row and a minor one) and the date↔pixel
 * mapping every render/gesture computation shares. Pure, Intl-only.
 */
import { addDays, addMonths, startOfDay, startOfWeek } from '@oge-ui/core';

/** Zoomable scale units (dx `scaleType` parity). */
export type GanttScaleType = 'hours' | 'days' | 'weeks' | 'months';

/** One rendered tick (minor cell or major header segment). */
export interface GanttTick {
  readonly date: Date;
  readonly px: number;
  readonly widthPx: number;
}

export interface GanttScale {
  readonly type: GanttScaleType;
  readonly start: Date;
  readonly end: Date;
  readonly totalPx: number;
  /** Minor cells (one per unit). */
  readonly ticks: readonly GanttTick[];
  /** Major header segments (day for hours, week for days, …). */
  readonly majorTicks: readonly GanttTick[];
  readonly msPerPx: number;
}

const MS_PER_UNIT: Record<GanttScaleType, number> = {
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 7 * 86_400_000,
  months: 30 * 86_400_000, // months tick per calendar month; px math via ms
};

/** Default minor tick width per scale (px) — tuned for readability. */
export const GANTT_TICK_WIDTH: Record<GanttScaleType, number> = {
  hours: 48,
  days: 40,
  weeks: 80,
  months: 96,
};

function unitFloor(
  date: Date,
  type: GanttScaleType,
  firstDayOfWeek: number,
): Date {
  switch (type) {
    case 'hours':
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
      );
    case 'days':
      return startOfDay(date);
    case 'weeks':
      return startOfWeek(date, firstDayOfWeek);
    case 'months':
      return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}

function unitNext(date: Date, type: GanttScaleType): Date {
  switch (type) {
    case 'hours':
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours() + 1,
      );
    case 'days':
      return addDays(date, 1);
    case 'weeks':
      return addDays(date, 7);
    case 'months':
      return addMonths(date, 1);
  }
}

function majorFloor(
  date: Date,
  type: GanttScaleType,
  firstDayOfWeek: number,
): Date {
  switch (type) {
    case 'hours':
      return startOfDay(date);
    case 'days':
      return startOfWeek(date, firstDayOfWeek);
    case 'weeks':
    case 'months':
      return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}

function majorNext(date: Date, type: GanttScaleType): Date {
  switch (type) {
    case 'hours':
      return addDays(date, 1);
    case 'days':
      return addDays(date, 7);
    case 'weeks':
    case 'months':
      return addMonths(date, 1);
  }
}

/** The zoom ladder (`zoomIn` walks left, `zoomOut` right). */
export const GANTT_SCALE_ORDER: readonly GanttScaleType[] = [
  'hours',
  'days',
  'weeks',
  'months',
];

/**
 * Builds the scale for `[rangeStart, rangeEnd]`, padded one unit on both
 * sides so bars never touch the edges. `tickWidth` overrides the default
 * minor cell width.
 */
export function buildGanttScale(
  rangeStart: Date,
  rangeEnd: Date,
  type: GanttScaleType,
  firstDayOfWeek: number,
  tickWidth = GANTT_TICK_WIDTH[type],
): GanttScale {
  let cursor = unitFloor(rangeStart, type, firstDayOfWeek);
  cursor = new Date(
    Math.min(cursor.getTime(), unitFloor(rangeStart, type, firstDayOfWeek).getTime()),
  );
  // one padding unit before the range
  cursor = unitFloorBack(cursor, type);
  const hardEnd = unitNext(
    unitNext(unitFloor(rangeEnd, type, firstDayOfWeek), type),
    type,
  );

  const ticks: GanttTick[] = [];
  const scaleStart = cursor;
  let px = 0;
  const guard = 5000; // runaway backstop
  let iterations = 0;
  while (cursor.getTime() < hardEnd.getTime() && iterations++ < guard) {
    ticks.push({ date: cursor, px, widthPx: tickWidth });
    cursor = unitNext(cursor, type);
    px += tickWidth;
  }
  const scaleEnd = cursor;
  const totalPx = px;
  const totalMs = scaleEnd.getTime() - scaleStart.getTime();
  const msPerPx = totalMs / Math.max(1, totalPx);

  // major segments spanning their minor ticks
  const majorTicks: GanttTick[] = [];
  let major = majorFloor(scaleStart, type, firstDayOfWeek);
  iterations = 0;
  while (major.getTime() < scaleEnd.getTime() && iterations++ < guard) {
    const next = majorNext(major, type);
    const fromPx = dateToPxIn(scaleStart, ticks, tickWidth, type, major);
    const toPx = dateToPxIn(scaleStart, ticks, tickWidth, type, next);
    const clampedFrom = Math.max(0, fromPx);
    const clampedTo = Math.min(totalPx, toPx);
    if (clampedTo > clampedFrom) {
      majorTicks.push({
        date: major,
        px: clampedFrom,
        widthPx: clampedTo - clampedFrom,
      });
    }
    major = next;
  }

  return {
    type,
    start: scaleStart,
    end: scaleEnd,
    totalPx,
    ticks,
    majorTicks,
    msPerPx,
  };

  function unitFloorBack(date: Date, scaleType: GanttScaleType): Date {
    switch (scaleType) {
      case 'hours':
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours() - 1,
        );
      case 'days':
        return addDays(date, -1);
      case 'weeks':
        return addDays(date, -7);
      case 'months':
        return addMonths(date, -1);
    }
  }
}

/** Linear interpolation inside the (possibly month-uneven) tick list. */
function dateToPxIn(
  scaleStart: Date,
  ticks: readonly GanttTick[],
  tickWidth: number,
  type: GanttScaleType,
  date: Date,
): number {
  if (ticks.length === 0) return 0;
  if (date.getTime() <= scaleStart.getTime()) {
    return (
      ((date.getTime() - scaleStart.getTime()) / MS_PER_UNIT[type]) * tickWidth
    );
  }
  for (let i = ticks.length - 1; i >= 0; i--) {
    const tick = ticks[i];
    if (date.getTime() >= tick.date.getTime()) {
      const next =
        i + 1 < ticks.length
          ? ticks[i + 1].date
          : new Date(tick.date.getTime() + MS_PER_UNIT[type]);
      const unitMs = Math.max(1, next.getTime() - tick.date.getTime());
      return (
        tick.px +
        ((date.getTime() - tick.date.getTime()) / unitMs) * tick.widthPx
      );
    }
  }
  return 0;
}

/** Date → x pixel inside the scale. */
export function dateToPx(scale: GanttScale, date: Date): number {
  return dateToPxIn(scale.start, scale.ticks, scale.ticks[0]?.widthPx ?? 1, scale.type, date);
}

/** x pixel → date (linear within the containing tick). */
export function pxToDate(scale: GanttScale, px: number): Date {
  const ticks = scale.ticks;
  if (ticks.length === 0) return scale.start;
  const clamped = Math.min(Math.max(px, 0), scale.totalPx);
  for (let i = ticks.length - 1; i >= 0; i--) {
    const tick = ticks[i];
    if (clamped >= tick.px) {
      const next =
        i + 1 < ticks.length
          ? ticks[i + 1].date
          : scale.end;
      const unitMs = next.getTime() - tick.date.getTime();
      return new Date(
        tick.date.getTime() +
          ((clamped - tick.px) / Math.max(1, tick.widthPx)) * unitMs,
      );
    }
  }
  return scale.start;
}

/** Snaps a date to the scale unit (round). */
export function snapToUnit(
  scale: GanttScale,
  date: Date,
  firstDayOfWeek: number,
): Date {
  const floor = unitFloor(date, scale.type, firstDayOfWeek);
  const next = unitNext(floor, scale.type);
  return date.getTime() - floor.getTime() <
    next.getTime() - date.getTime()
    ? floor
    : next;
}
