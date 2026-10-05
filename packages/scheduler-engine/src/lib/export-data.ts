/**
 * The one model every scheduler export reads (the grid family's rule: the
 * file builders never read a component). `getExportData()` on both render
 * layers returns it; the iCalendar builder walks the unexpanded
 * `appointments` (series stay series, with their RRULE and EXDATE), the
 * PDF / Excel list builders the expanded, chronological `rows` of a range.
 */
import { rangesOverlap } from '@oge-ui/core';
import type { OgeSchedulerExportMessages } from './config';
import {
  expandAppointment,
  type ResolvedSchedulerFields,
  type SchedulerAppointment,
} from './scheduler-model';
import type { OgeSchedulerResource } from './scheduler-types';

/** One exported line: an appointment or one occurrence of a series. */
export interface OgeSchedulerExportRow<T = unknown> {
  readonly appointment: SchedulerAppointment<T>;
  readonly text: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly allDay: boolean;
  readonly location: string | undefined;
  readonly description: string | undefined;
  readonly recurring: boolean;
  /** Assigned resources: the resource label and the item text, per kind. */
  readonly resources: readonly {
    readonly label: string;
    readonly text: string;
  }[];
}

/** Everything a scheduler export needs. */
export interface OgeSchedulerExportData<T = unknown> {
  /** The visible period's title (the PDF heading default). */
  readonly title: string;
  /** Half-open range the rows cover. */
  readonly rangeStart: Date;
  readonly rangeEnd: Date;
  readonly locale: string | undefined;
  /** Expanded, chronological rows inside the range. */
  readonly rows: readonly OgeSchedulerExportRow<T>[];
  /** Every appointment, series unexpanded — the iCalendar source. */
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly fields: ResolvedSchedulerFields<T>;
  readonly resources: readonly OgeSchedulerResource[];
  readonly messages: OgeSchedulerExportMessages;
}

/** The resource label / text pairs an item is assigned to. */
export function exportResourcesOf<T>(
  item: T,
  resources: readonly OgeSchedulerResource[],
): { label: string; text: string }[] {
  const pairs: { label: string; text: string }[] = [];
  for (const resource of resources) {
    const id = (item as Record<string, unknown>)[resource.fieldExpr];
    if (id === undefined || id === null) continue;
    const ids = Array.isArray(id) ? (id as unknown[]) : [id];
    const texts = ids
      .map((entry) => resource.items.find((item) => item.id === entry)?.text)
      .filter((text): text is string => text !== undefined);
    if (texts.length > 0) {
      pairs.push({
        label: resource.label ?? resource.fieldExpr,
        text: texts.join(', '),
      });
    }
  }
  return pairs;
}

/** Builds the export model for `[rangeStart, rangeEnd)`. */
export function buildSchedulerExportData<T>(options: {
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly rangeStart: Date;
  readonly rangeEnd: Date;
  readonly title: string;
  readonly locale: string | undefined;
  readonly fields: ResolvedSchedulerFields<T>;
  readonly resources: readonly OgeSchedulerResource[];
  readonly messages: OgeSchedulerExportMessages;
}): OgeSchedulerExportData<T> {
  const { rangeStart, rangeEnd } = options;
  const rows = options.appointments
    .flatMap((appointment) =>
      expandAppointment(appointment, rangeStart, rangeEnd),
    )
    .filter(
      (appointment) =>
        rangesOverlap(
          appointment.startDate,
          appointment.endDate,
          rangeStart,
          rangeEnd,
        ) ||
        (appointment.startDate.getTime() === appointment.endDate.getTime() &&
          appointment.startDate.getTime() >= rangeStart.getTime() &&
          appointment.startDate.getTime() < rangeEnd.getTime()),
    )
    .sort(
      (a, b) =>
        a.startDate.getTime() - b.startDate.getTime() ||
        Number(b.displayAllDay) - Number(a.displayAllDay),
    )
    .map((appointment) => ({
      appointment,
      text: appointment.text,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      allDay: appointment.allDay,
      location: appointment.location,
      description: appointment.description,
      recurring: appointment.seriesKey !== null,
      resources: exportResourcesOf(appointment.source, options.resources),
    }));
  return {
    title: options.title,
    rangeStart,
    rangeEnd,
    locale: options.locale,
    rows,
    appointments: options.appointments,
    fields: options.fields,
    resources: options.resources,
    messages: options.messages,
  };
}
