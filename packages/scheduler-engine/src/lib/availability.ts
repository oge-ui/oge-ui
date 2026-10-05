/**
 * Availability, framework-free: blocked (non-bookable) slots from
 * `disabledSlots` — a predicate or a list of possibly recurring ranges,
 * optionally per resource — and the working-hours decisions (per-resource
 * shading, `snapToWorkHours`). Every create / move / resize / drop path of
 * both render layers asks these functions, so a refusal is identical
 * everywhere.
 */
import { addMinutes, rangesOverlap, startOfDay } from '@oge-ui/core';
import type { AppointmentProposal } from './gesture-math';
import { parseRecurrenceRule } from './rrule';
import { expandRecurrence } from './rrule-expand';
import type {
  OgeSchedulerBlockedRange,
  OgeSchedulerDisabledSlots,
  OgeSchedulerWorkHours,
} from './scheduler-types';
import { minutesOfDay } from './time-math';

/** A concrete blocked interval (recurrences expanded). */
export interface SchedulerBlockedInterval {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly text?: string;
}

/** Whether a blocked range applies to a slot with these resource values. */
function rangeAppliesTo(
  range: OgeSchedulerBlockedRange,
  values: Readonly<Record<string, unknown>>,
): boolean {
  if (range.resources === undefined) return true;
  for (const [field, wanted] of Object.entries(range.resources)) {
    const actual = values[field];
    const matches = Array.isArray(wanted)
      ? (wanted as readonly unknown[]).includes(actual)
      : wanted === actual;
    if (!matches) return false;
  }
  return true;
}

/** Every occurrence of a blocked range overlapping `[start, end)`. */
function rangeIntervals(
  range: OgeSchedulerBlockedRange,
  start: Date,
  end: Date,
): SchedulerBlockedInterval[] {
  const length = range.endDate.getTime() - range.startDate.getTime();
  if (!(length > 0)) return [];
  const rule =
    range.recurrenceRule === undefined
      ? null
      : parseRecurrenceRule(range.recurrenceRule);
  if (rule === null) {
    return rangesOverlap(range.startDate, range.endDate, start, end)
      ? [{ startDate: range.startDate, endDate: range.endDate, text: range.text }]
      : [];
  }
  // look back one occurrence length so a block started earlier still counts
  return expandRecurrence(
    rule,
    range.startDate,
    new Date(start.getTime() - length),
    end,
  )
    .map((occurrence) => ({
      startDate: occurrence,
      endDate: new Date(occurrence.getTime() + length),
      text: range.text,
    }))
    .filter((interval) =>
      rangesOverlap(interval.startDate, interval.endDate, start, end),
    );
}

/** The predicate is sampled at most this often per check (a runaway guard). */
const MAX_SAMPLES = 2000;

/**
 * The blocked intervals inside `[start, end)` for a slot with `values`:
 * range lists expand their recurrences; a predicate is sampled every
 * `stepMinutes` and consecutive blocked samples merge into one interval.
 */
export function blockedIntervals(
  disabled: OgeSchedulerDisabledSlots | null | undefined,
  start: Date,
  end: Date,
  values: Readonly<Record<string, unknown>>,
  stepMinutes: number,
): readonly SchedulerBlockedInterval[] {
  if (disabled === null || disabled === undefined) return [];
  if (end.getTime() <= start.getTime()) return [];
  if (typeof disabled !== 'function') {
    return disabled
      .filter((range) => rangeAppliesTo(range, values))
      .flatMap((range) => rangeIntervals(range, start, end))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }
  const step = Math.max(1, stepMinutes);
  const intervals: { startDate: Date; endDate: Date }[] = [];
  let cursor = start;
  for (
    let samples = 0;
    cursor.getTime() < end.getTime() && samples < MAX_SAMPLES;
    samples++
  ) {
    const next = addMinutes(cursor, step);
    if (disabled(cursor, values)) {
      const last = intervals[intervals.length - 1];
      if (last !== undefined && last.endDate.getTime() === cursor.getTime()) {
        last.endDate = next;
      } else {
        intervals.push({ startDate: cursor, endDate: next });
      }
    }
    cursor = next;
  }
  return intervals;
}

/**
 * Whether anything in `[start, end)` is blocked for these resource values.
 * A zero-length range tests the instant itself.
 */
export function isRangeBlocked(
  disabled: OgeSchedulerDisabledSlots | null | undefined,
  start: Date,
  end: Date,
  values: Readonly<Record<string, unknown>>,
  stepMinutes: number,
): boolean {
  if (disabled === null || disabled === undefined) return false;
  const effectiveEnd =
    end.getTime() > start.getTime() ? end : addMinutes(start, 1);
  if (typeof disabled === 'function') {
    // sample at slot starts aligned to the raster, plus the range start
    const step = Math.max(1, stepMinutes);
    if (disabled(start, values)) return true;
    const offset = minutesOfDay(start) % step;
    let cursor = addMinutes(start, offset === 0 ? step : step - offset);
    for (
      let samples = 0;
      cursor.getTime() < effectiveEnd.getTime() && samples < MAX_SAMPLES;
      samples++
    ) {
      if (disabled(cursor, values)) return true;
      cursor = addMinutes(cursor, step);
    }
    return false;
  }
  return (
    blockedIntervals(disabled, start, effectiveEnd, values, stepMinutes)
      .length > 0
  );
}

/** Whether a whole day (month / all-day cell) is blocked from start to end. */
export function isDayBlocked(
  disabled: OgeSchedulerDisabledSlots | null | undefined,
  day: Date,
  values: Readonly<Record<string, unknown>>,
): boolean {
  if (disabled === null || disabled === undefined) return false;
  const start = startOfDay(day);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  if (typeof disabled === 'function') return disabled(start, values);
  return blockedIntervals(disabled, start, end, values, 30).some(
    (interval) =>
      interval.startDate.getTime() <= start.getTime() &&
      interval.endDate.getTime() >= end.getTime(),
  );
}

/** Whether a cell sits outside the given working hours. */
export function isOffWorkHours(
  workHours: OgeSchedulerWorkHours | null,
  day: Date,
  minutes: number,
): boolean {
  if (workHours === null) return false;
  if (workHours.days !== undefined && !workHours.days.includes(day.getDay())) {
    return true;
  }
  return minutes < workHours.start * 60 || minutes >= workHours.end * 60;
}

/**
 * `snapToWorkHours`: a timed proposal is shifted into the working-hours
 * window of its day (keeping its length when it fits, else clipped to the
 * window); a proposal on a non-working day, an all-day one or one with no
 * hours to honour is returned unchanged.
 */
export function snapProposalToWorkHours(
  proposal: AppointmentProposal,
  workHours: OgeSchedulerWorkHours | null,
): AppointmentProposal {
  if (workHours === null || proposal.allDay) return proposal;
  const day = startOfDay(proposal.startDate);
  if (workHours.days !== undefined && !workHours.days.includes(day.getDay())) {
    return proposal;
  }
  const windowStart = addMinutes(day, Math.round(workHours.start * 60));
  const windowEnd = addMinutes(day, Math.round(workHours.end * 60));
  const length = proposal.endDate.getTime() - proposal.startDate.getTime();
  const windowLength = windowEnd.getTime() - windowStart.getTime();
  if (!(windowLength > 0)) return proposal;
  let start = proposal.startDate.getTime();
  if (length >= windowLength) {
    return { ...proposal, startDate: windowStart, endDate: windowEnd };
  }
  if (start < windowStart.getTime()) start = windowStart.getTime();
  if (start + length > windowEnd.getTime()) start = windowEnd.getTime() - length;
  if (start === proposal.startDate.getTime()) return proposal;
  return {
    ...proposal,
    startDate: new Date(start),
    endDate: new Date(start + length),
  };
}
