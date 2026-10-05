/**
 * Overlap detection for `allowOverlap: false` and the `conflictCheck` hook:
 * which existing appointments (recurring series expanded) a proposed
 * extent would overlap — on the same grouped resource when the scheduler is
 * grouped. Half-open ranges, so back-to-back appointments never conflict.
 */
import { rangesOverlap } from '@oge-ui/core';
import { expandAppointment, type SchedulerAppointment } from './scheduler-model';
import type { OgeSchedulerResource } from './scheduler-types';

/** The proposed extent of an appointment being created or changed. */
export interface SchedulerConflictCandidate<T> {
  readonly startDate: Date;
  readonly endDate: Date;
  /** The item being changed (excluded from its own conflicts); absent on create. */
  readonly source?: T;
  /** The candidate's grouped resource values (after the change). */
  readonly values: Readonly<Record<string, unknown>>;
}

/**
 * The appointments `candidate` would overlap. With grouping `levels`, only
 * appointments assigned to the same value on every level count; ungrouped,
 * every overlap counts. All-day appointments count like any other — an
 * all-day "Holiday" blocks a timed booking under `allowOverlap: false`.
 */
export function findSchedulerConflicts<T>(
  candidate: SchedulerConflictCandidate<T>,
  appointments: readonly SchedulerAppointment<T>[],
  levels: readonly OgeSchedulerResource[],
): SchedulerAppointment<T>[] {
  const start = candidate.startDate;
  // a zero-length candidate still occupies its instant
  const end =
    candidate.endDate.getTime() > start.getTime()
      ? candidate.endDate
      : new Date(start.getTime() + 1);
  const conflicts: SchedulerAppointment<T>[] = [];
  for (const appointment of appointments) {
    if (candidate.source !== undefined && appointment.source === candidate.source) {
      continue;
    }
    if (
      levels.some(
        (level) =>
          (appointment.source as Record<string, unknown>)[level.fieldExpr] !==
          candidate.values[level.fieldExpr],
      )
    ) {
      continue;
    }
    // look back one appointment length, so an occurrence that started
    // before the candidate but still runs into it is found
    const length = Math.max(
      0,
      appointment.endDate.getTime() - appointment.startDate.getTime(),
    );
    const lookBack = new Date(start.getTime() - length);
    for (const instance of expandAppointment(appointment, lookBack, end)) {
      const instanceEnd =
        instance.endDate.getTime() > instance.startDate.getTime()
          ? instance.endDate
          : new Date(instance.startDate.getTime() + 1);
      if (rangesOverlap(instance.startDate, instanceEnd, start, end)) {
        conflicts.push(instance);
      }
    }
  }
  return conflicts;
}
