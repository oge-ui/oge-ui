/**
 * The scheduler shell's pure derivations — everything the Angular
 * `<oge-scheduler>` and the React `<OgeScheduler>` compute from their inputs
 * before any view renders: the resolved view switcher, the visible period and
 * its title, navigation bounds, resource lookups and the normalized,
 * recurrence-expanded appointment window. Framework-free, so both render
 * layers run this one copy (ADR 0003).
 */
import { rangesOverlap, startOfDay } from '@oge-ui/core';
import type {
  OgeSchedulerMessages,
  OgeSchedulerToolbarMessages,
} from './config';
import {
  expandAppointment,
  normalizeAppointment,
  type ResolvedSchedulerFields,
  type SchedulerAppointment,
} from './scheduler-model';
import type {
  OgeSchedulerResource,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
} from './scheduler-types';
import { navigateDate, viewRange } from './view-model';

/** A resolved view-switcher entry. */
export interface ResolvedSchedulerView {
  readonly type: OgeSchedulerView;
  readonly name: string;
  readonly dayStartHour: number;
  readonly dayEndHour: number;
  readonly cellDuration: number;
}

/** The scheduler-wide time window every view falls back to. */
export interface SchedulerViewDefaults {
  readonly dayStartHour: number;
  readonly dayEndHour: number;
  readonly cellDuration: number;
}

/** Resolves the `views` input into switcher entries with per-view overrides. */
export function resolveSchedulerViews(
  views: readonly (OgeSchedulerView | OgeSchedulerViewOptions)[],
  toolbar: OgeSchedulerToolbarMessages,
  defaults: SchedulerViewDefaults,
): readonly ResolvedSchedulerView[] {
  return views.map((entry) => {
    const options: OgeSchedulerViewOptions =
      typeof entry === 'string' ? { type: entry } : entry;
    return {
      type: options.type,
      name: options.name ?? toolbar.viewNames[options.type],
      dayStartHour: options.dayStartHour ?? defaults.dayStartHour,
      dayEndHour: options.dayEndHour ?? defaults.dayEndHour,
      cellDuration: options.cellDuration ?? defaults.cellDuration,
    };
  });
}

/**
 * The active view's entry; a `currentView` missing from the switcher still
 * resolves (with the scheduler-wide window).
 */
export function resolveActiveSchedulerView(
  view: OgeSchedulerView,
  resolved: readonly ResolvedSchedulerView[],
  toolbar: OgeSchedulerToolbarMessages,
  defaults: SchedulerViewDefaults,
): ResolvedSchedulerView {
  return (
    resolved.find((entry) => entry.type === view) ?? {
      type: view,
      name: toolbar.viewNames[view],
      dayStartHour: defaults.dayStartHour,
      dayEndHour: defaults.dayEndHour,
      cellDuration: defaults.cellDuration,
    }
  );
}

/** The time-grid variant rendered for a view (`'week'` for non-grid views). */
export function dayWeekViewOf(
  view: OgeSchedulerView,
): 'day' | 'week' | 'workWeek' {
  return view === 'day' || view === 'week' || view === 'workWeek'
    ? view
    : 'week';
}

/** Per-instance messages merged over the configured ones (per block). */
export function mergeSchedulerMessages(
  config: OgeSchedulerMessages,
  overrides: Partial<OgeSchedulerMessages> | undefined,
): OgeSchedulerMessages {
  return { ...config, ...overrides };
}

/** The resource that colors uncolored appointments, if any. */
export function resolveColorResource(
  resources: readonly OgeSchedulerResource[],
): OgeSchedulerResource | null {
  return (
    resources.find((resource) => resource.useColorAsDefault) ??
    resources[0] ??
    null
  );
}

/** The grouping resource (first `groups` field), if it names a resource. */
export function resolveGroupResource(
  resources: readonly OgeSchedulerResource[],
  groups: readonly string[],
): OgeSchedulerResource | null {
  const field = groups[0];
  if (field === undefined) return null;
  return resources.find((resource) => resource.fieldExpr === field) ?? null;
}

/** Reads the grouping resource id of an item (`null` without grouping). */
export function groupResourceIdReader<T>(
  resource: OgeSchedulerResource | null,
): (item: T) => unknown {
  if (resource === null) return () => null;
  return (item) => (item as Record<string, unknown>)[resource.fieldExpr];
}

/** An appointment's fallback color from the color resource. */
export function resourceColorOf<T>(
  resource: OgeSchedulerResource | null,
  item: T,
): string | undefined {
  if (resource === null) return undefined;
  const id = (item as Record<string, unknown>)[resource.fieldExpr];
  return resource.items.find((entry) => entry.id === id)?.color;
}

/** The item key reader: a selector, or a field (`id`) falling back to the index. */
export function schedulerKeyReader<T>(
  keyExpr: string | ((item: T) => unknown) | undefined,
): (item: T, index: number) => unknown {
  if (typeof keyExpr === 'function') return (item) => keyExpr(item);
  const field = keyExpr ?? 'id';
  return (item, index) => {
    const value = (item as Record<string, unknown>)[field];
    return value === undefined ? index : value;
  };
}

/** Every item normalized into an appointment (resource colors applied). */
export function normalizeSchedulerStore<T>(
  store: readonly T[],
  fields: ResolvedSchedulerFields<T>,
  keyOf: (item: T, index: number) => unknown,
  colorResource: OgeSchedulerResource | null,
): readonly SchedulerAppointment<T>[] {
  const result: SchedulerAppointment<T>[] = [];
  store.forEach((item, index) => {
    const appointment = normalizeAppointment(item, keyOf(item, index), fields);
    if (appointment === null) return;
    result.push(
      appointment.color === undefined
        ? { ...appointment, color: resourceColorOf(colorResource, item) }
        : appointment,
    );
  });
  return result;
}

/**
 * The client-side window: every appointment (recurring series expanded into
 * occurrences) overlapping the visible period; zero-length appointments count
 * when their instant falls inside it.
 */
export function visibleSchedulerAppointments<T>(
  appointments: readonly SchedulerAppointment<T>[],
  view: OgeSchedulerView,
  anchorDate: Date,
  firstDayOfWeek: number,
  agendaDuration: number,
): readonly SchedulerAppointment<T>[] {
  const { start, end } = viewRange(
    view,
    anchorDate,
    firstDayOfWeek,
    agendaDuration,
  );
  return appointments
    .flatMap((appointment) => expandAppointment(appointment, start, end))
    .filter(
      (appointment) =>
        rangesOverlap(appointment.startDate, appointment.endDate, start, end) ||
        (appointment.startDate.getTime() === appointment.endDate.getTime() &&
          appointment.startDate.getTime() >= start.getTime() &&
          appointment.startDate.getTime() < end.getTime()),
    );
}

/** The toolbar's period title, or the custom `dateNavigatorText` result. */
export function schedulerPeriodTitle(
  view: OgeSchedulerView,
  date: Date,
  locale: string | undefined,
  firstDayOfWeek: number,
  agendaDuration: number,
  custom?: (start: Date, end: Date, view: OgeSchedulerView) => string,
): string {
  if (custom !== undefined) {
    const range = viewRange(view, date, firstDayOfWeek, agendaDuration);
    return custom(range.start, new Date(range.end.getTime() - 1), view);
  }
  if (view === 'day') {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date);
  }
  if (view === 'month') {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
  if (view === 'year') {
    return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date);
  }
  const { start, end } = viewRange(
    view === 'agenda' ? 'agenda' : 'week',
    date,
    firstDayOfWeek,
    agendaDuration,
  );
  const last = new Date(end.getTime() - 1);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatRange(start, last);
}

/** Whether `now` falls inside the visible period (disables "Today"). */
export function isTodayInSchedulerView(
  view: OgeSchedulerView,
  date: Date,
  firstDayOfWeek: number,
  agendaDuration: number,
  now: number = Date.now(),
): boolean {
  const { start, end } = viewRange(view, date, firstDayOfWeek, agendaDuration);
  return now >= start.getTime() && now < end.getTime();
}

/** Whether stepping one period keeps some of `[min, max]` visible. */
export function canNavigateScheduler(
  view: OgeSchedulerView,
  date: Date,
  direction: -1 | 1,
  firstDayOfWeek: number,
  agendaDuration: number,
  min: Date | undefined,
  max: Date | undefined,
): boolean {
  const candidate = navigateDate(view, date, direction, agendaDuration);
  const { start, end } = viewRange(view, candidate, firstDayOfWeek);
  if (min !== undefined && end.getTime() <= startOfDay(min).getTime()) {
    return false;
  }
  if (max !== undefined && start.getTime() > max.getTime()) return false;
  return true;
}

/** Replaces each `{token}` (first occurrence) in a message template. */
export function fillSchedulerTemplate(
  template: string,
  tokens: Readonly<Record<string, string>>,
): string {
  let text = template;
  for (const [token, value] of Object.entries(tokens)) {
    text = text.replace(`{${token}}`, value);
  }
  return text;
}

/** The time-grid scroll offset (px) that puts `hours:minutes` at the top. */
export function scrollOffsetForTime(
  hours: number,
  minutes: number,
  windowStartMinutes: number,
  windowEndMinutes: number,
  scrollHeight: number,
): number | null {
  const span = windowEndMinutes - windowStartMinutes;
  if (span <= 0) return null;
  const fraction = Math.min(
    1,
    Math.max(0, (hours * 60 + minutes - windowStartMinutes) / span),
  );
  return fraction * scrollHeight;
}

/**
 * Reminder scan: every occurrence (24h look-ahead) whose lead time has been
 * reached and that has not fired yet. Marks the returned ones as fired.
 */
export function dueSchedulerReminders<T>(
  appointments: readonly SchedulerAppointment<T>[],
  now: Date,
  fired: Set<unknown>,
): SchedulerAppointment<T>[] {
  const horizon = new Date(now.getTime() + 86_400_000);
  const due: SchedulerAppointment<T>[] = [];
  for (const base of appointments) {
    for (const appointment of expandAppointment(base, now, horizon)) {
      const lead = appointment.reminderMinutes;
      if (lead === undefined) continue;
      const dueAt = appointment.startDate.getTime() - lead * 60_000;
      if (
        now.getTime() >= dueAt &&
        now.getTime() < appointment.startDate.getTime() &&
        !fired.has(appointment.key)
      ) {
        fired.add(appointment.key);
        due.push(appointment);
      }
    }
  }
  return due;
}
