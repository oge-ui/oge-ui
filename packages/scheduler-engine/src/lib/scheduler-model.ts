/**
 * The normalized appointment model and the field-mapping layer between user
 * data (arbitrary item shapes addressed via `*Expr` accessors) and the
 * scheduler engine. Dates normalize through `@oge-ui/core`'s `toLocalDate`
 * and write back through `serializeLikeOriginal`, so string-dated stores
 * round-trip without silently changing their storage shape.
 *
 * Time zones: stored values are instants. With a display `timeZone` the
 * model holds **wall clocks** of that zone (core's `ogeToWallClock`) — every
 * view, gesture and layout computes in local wall time and never sees a
 * zone — and each write converts back (`ogeFromWallClock`). Recurrence runs
 * on the clocks of the series' own zone (`TZID`, else `startTimeZone`, else
 * the display zone).
 */
import {
  createFieldAccessor,
  ogeConvertWallClock,
  ogeFromWallClock,
  ogeIsTimeZone,
  ogeToWallClock,
  serializeLikeOriginal,
  toLocalDate,
  type ValueAccessor,
} from '@oge-ui/core';
import { addDays, addMinutes } from '@oge-ui/core';
import {
  parseRecurrenceException,
  parseRecurrenceRule,
  recurrenceRuleTimeZone,
} from './rrule';
import { expandRecurrence } from './rrule-expand';
import { durationMinutes } from './time-math';

/** A user item's field accessors: a field name or a getter function. */
export type SchedulerFieldExpr<T, V> = string | ((item: T) => V);

/** The `*Expr` bundle mapping user items onto the appointment model. */
export interface SchedulerFieldExprs<T> {
  readonly textExpr: SchedulerFieldExpr<T, unknown>;
  readonly startDateExpr: SchedulerFieldExpr<T, unknown>;
  readonly endDateExpr: SchedulerFieldExpr<T, unknown>;
  readonly allDayExpr: SchedulerFieldExpr<T, unknown>;
  readonly colorExpr: SchedulerFieldExpr<T, unknown>;
  readonly locationExpr: SchedulerFieldExpr<T, unknown>;
  readonly descriptionExpr: SchedulerFieldExpr<T, unknown>;
  readonly reminderExpr: SchedulerFieldExpr<T, unknown>;
  readonly recurrenceRuleExpr: SchedulerFieldExpr<T, unknown>;
  readonly recurrenceExceptionExpr: SchedulerFieldExpr<T, unknown>;
  readonly disabledExpr: SchedulerFieldExpr<T, unknown>;
  /** The IANA zone the appointment starts in (editor, recurrence). */
  readonly startTimeZoneExpr?: SchedulerFieldExpr<T, unknown>;
  /** The IANA zone the appointment ends in (editor). */
  readonly endTimeZoneExpr?: SchedulerFieldExpr<T, unknown>;
  /**
   * The display zone: model dates are wall clocks of this IANA zone.
   * `undefined` = the runtime's local zone (no conversion).
   */
  readonly timeZone?: string;
}

/** Resolved accessor set (see `resolveSchedulerFields`). */
export interface ResolvedSchedulerFields<T> {
  readonly text: ValueAccessor<T>;
  readonly startDate: ValueAccessor<T>;
  readonly endDate: ValueAccessor<T>;
  readonly allDay: ValueAccessor<T>;
  readonly color: ValueAccessor<T>;
  readonly location: ValueAccessor<T>;
  readonly description: ValueAccessor<T>;
  readonly reminder: ValueAccessor<T>;
  readonly recurrenceRule: ValueAccessor<T>;
  readonly recurrenceException: ValueAccessor<T>;
  readonly disabled: ValueAccessor<T>;
  readonly startTimeZone: ValueAccessor<T>;
  readonly endTimeZone: ValueAccessor<T>;
  /** The display zone (validated; `undefined` = runtime zone). */
  readonly timeZone: string | undefined;
  /** Field names for write-back; `null` when the expr is a function. */
  readonly fieldNames: Readonly<Record<SchedulerFieldKey, string | null>>;
}

export type SchedulerFieldKey =
  | 'text'
  | 'startDate'
  | 'endDate'
  | 'allDay'
  | 'color'
  | 'location'
  | 'description'
  | 'reminder'
  | 'recurrenceRule'
  | 'recurrenceException'
  | 'disabled'
  | 'startTimeZone'
  | 'endTimeZone';

/**
 * A user item normalized into the engine's shape. `source` keeps the original
 * item so events and write-backs can hand it back unchanged.
 */
export interface SchedulerAppointment<T = unknown> {
  readonly key: unknown;
  readonly source: T;
  readonly text: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly allDay: boolean;
  /**
   * Rendered in the all-day strip: explicitly `allDay`, or spanning ≥ 24h
   * (dx parity) — a display decision that never mutates the model.
   */
  readonly displayAllDay: boolean;
  readonly color: string | undefined;
  readonly location: string | undefined;
  readonly description: string | undefined;
  /** Minutes before the start a reminder fires; `undefined` = none. */
  readonly reminderMinutes: number | undefined;
  /** RFC 5545 RRULE string (reserved in v0.1; expanded by the v0.2 engine). */
  readonly recurrenceRule: string | undefined;
  /** Comma-separated exception dates (reserved in v0.1). */
  readonly recurrenceException: string | undefined;
  readonly disabled: boolean;
  /** The appointment's own start zone (`startTimeZoneExpr`), if valid. */
  readonly startTimeZone?: string;
  /** The appointment's own end zone (`endTimeZoneExpr`), if valid. */
  readonly endTimeZone?: string;
  /**
   * The display zone `startDate` / `endDate` are wall clocks of
   * (`undefined` = the runtime zone).
   */
  readonly viewTimeZone?: string;
  /**
   * Set on expanded occurrence instances: the series appointment's key.
   * `null` for plain appointments and the series template itself.
   */
  readonly seriesKey: unknown | null;
}

function toAccessor<T>(expr: SchedulerFieldExpr<T, unknown>): ValueAccessor<T> {
  return typeof expr === 'string'
    ? createFieldAccessor<T>(expr)
    : (expr as ValueAccessor<T>);
}

/** Resolves every `*Expr` into a callable accessor + write-back field names. */
export function resolveSchedulerFields<T>(
  exprs: SchedulerFieldExprs<T>,
): ResolvedSchedulerFields<T> {
  const name = (expr: SchedulerFieldExpr<T, unknown>): string | null =>
    typeof expr === 'string' ? expr : null;
  return {
    text: toAccessor(exprs.textExpr),
    startDate: toAccessor(exprs.startDateExpr),
    endDate: toAccessor(exprs.endDateExpr),
    allDay: toAccessor(exprs.allDayExpr),
    color: toAccessor(exprs.colorExpr),
    location: toAccessor(exprs.locationExpr),
    description: toAccessor(exprs.descriptionExpr),
    reminder: toAccessor(exprs.reminderExpr),
    recurrenceRule: toAccessor(exprs.recurrenceRuleExpr),
    recurrenceException: toAccessor(exprs.recurrenceExceptionExpr),
    disabled: toAccessor(exprs.disabledExpr),
    startTimeZone: toAccessor(exprs.startTimeZoneExpr ?? 'startTimeZone'),
    endTimeZone: toAccessor(exprs.endTimeZoneExpr ?? 'endTimeZone'),
    timeZone: ogeIsTimeZone(exprs.timeZone) ? exprs.timeZone : undefined,
    fieldNames: {
      text: name(exprs.textExpr),
      startDate: name(exprs.startDateExpr),
      endDate: name(exprs.endDateExpr),
      allDay: name(exprs.allDayExpr),
      color: name(exprs.colorExpr),
      location: name(exprs.locationExpr),
      description: name(exprs.descriptionExpr),
      reminder: name(exprs.reminderExpr),
      recurrenceRule: name(exprs.recurrenceRuleExpr),
      recurrenceException: name(exprs.recurrenceExceptionExpr),
      disabled: name(exprs.disabledExpr),
      startTimeZone: name(exprs.startTimeZoneExpr ?? 'startTimeZone'),
      endTimeZone: name(exprs.endTimeZoneExpr ?? 'endTimeZone'),
    },
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function asZone(value: unknown): string | undefined {
  return ogeIsTimeZone(value) ? value : undefined;
}

/** A stored instant → the display zone's wall clock (identity without one). */
export function toSchedulerView(
  instant: Date,
  timeZone: string | undefined,
): Date {
  return timeZone === undefined ? instant : ogeToWallClock(instant, timeZone);
}

/** A display-zone wall clock → the instant it stands for. */
export function fromSchedulerView(
  wall: Date,
  timeZone: string | undefined,
): Date {
  return timeZone === undefined ? wall : ogeFromWallClock(wall, timeZone);
}

/**
 * The zone a series recurs in: the rule's `DTSTART;TZID=`, else the
 * appointment's `startTimeZone`, else the display zone.
 */
export function schedulerRecurrenceZone(
  appointment: Pick<
    SchedulerAppointment,
    'recurrenceRule' | 'startTimeZone' | 'viewTimeZone'
  >,
): string | undefined {
  return (
    (appointment.recurrenceRule === undefined
      ? undefined
      : recurrenceRuleTimeZone(appointment.recurrenceRule)) ??
    appointment.startTimeZone ??
    appointment.viewTimeZone
  );
}

/**
 * An occurrence start (display wall clock) as the series' recurrence-zone
 * wall clock — the frame EXDATE stamps of that series are written in.
 */
export function occurrenceSeriesStart(
  appointment: Pick<
    SchedulerAppointment,
    'recurrenceRule' | 'startTimeZone' | 'viewTimeZone' | 'allDay'
  >,
  occurrenceStart: Date,
): Date {
  if (appointment.allDay) return occurrenceStart;
  const zone = schedulerRecurrenceZone(appointment);
  return zone === appointment.viewTimeZone
    ? occurrenceStart
    : ogeConvertWallClock(occurrenceStart, appointment.viewTimeZone, zone);
}

/**
 * Normalizes one user item. Returns `null` when the start date is missing or
 * unparseable (the item is skipped, matching how references drop invalid
 * rows). A missing end date defaults to the start (zero-length; the layout
 * gives it a minimum render height).
 */
export function normalizeAppointment<T>(
  item: T,
  key: unknown,
  fields: ResolvedSchedulerFields<T>,
): SchedulerAppointment<T> | null {
  const startInstant = toLocalDate(fields.startDate(item));
  if (startInstant === null) return null;
  const endRaw = toLocalDate(fields.endDate(item));
  const endInstant =
    endRaw !== null && endRaw.getTime() >= startInstant.getTime()
      ? endRaw
      : startInstant;
  const allDay = fields.allDay(item) === true;
  const zone = fields.timeZone;
  // all-day values are calendar days, never shifted between zones
  const startDate = allDay ? startInstant : toSchedulerView(startInstant, zone);
  const endDate = allDay ? endInstant : toSchedulerView(endInstant, zone);
  const startTimeZone = asZone(fields.startTimeZone(item));
  const endTimeZone = asZone(fields.endTimeZone(item));
  return {
    key,
    source: item,
    text: asString(fields.text(item)) ?? '',
    startDate,
    endDate,
    allDay,
    displayAllDay: allDay || durationMinutes(startDate, endDate) >= 1440,
    color: asString(fields.color(item)),
    location: asString(fields.location(item)),
    description: asString(fields.description(item)),
    reminderMinutes: (() => {
      const raw = fields.reminder(item);
      return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0
        ? raw
        : undefined;
    })(),
    recurrenceRule: asString(fields.recurrenceRule(item)),
    recurrenceException: asString(fields.recurrenceException(item)),
    disabled: fields.disabled(item) === true,
    ...(startTimeZone !== undefined ? { startTimeZone } : {}),
    ...(endTimeZone !== undefined ? { endTimeZone } : {}),
    ...(zone !== undefined ? { viewTimeZone: zone } : {}),
    seriesKey: null,
  };
}

/**
 * Expands a recurring appointment into its occurrence instances inside the
 * half-open window; non-recurring (or unparseable-rule) appointments return
 * themselves. Occurrences share the series' `source` and carry
 * `seriesKey` + a composite key, so editing flows can route to
 * occurrence-vs-series semantics.
 */
export function expandAppointment<T>(
  appointment: SchedulerAppointment<T>,
  rangeStart: Date,
  rangeEnd: Date,
): SchedulerAppointment<T>[] {
  if (appointment.recurrenceRule === undefined) return [appointment];
  const view = appointment.viewTimeZone;
  // all-day series recur on calendar days: the display frame is theirs
  const zone = appointment.allDay ? view : schedulerRecurrenceZone(appointment);
  const rule = parseRecurrenceRule(appointment.recurrenceRule, {
    timeZone: zone,
  });
  if (rule === null) return [appointment];
  const exceptions =
    appointment.recurrenceException === undefined
      ? []
      : parseRecurrenceException(appointment.recurrenceException, {
          timeZone: zone,
        });
  const occurrence = (start: Date, endDate: Date): SchedulerAppointment<T> => ({
    ...appointment,
    key: `${String(appointment.key)}::${start.getTime()}`,
    startDate: start,
    endDate,
    seriesKey: appointment.key,
  });
  if (zone === view) {
    const length = durationMinutes(appointment.startDate, appointment.endDate);
    return expandRecurrence(
      rule,
      appointment.startDate,
      rangeStart,
      rangeEnd,
      exceptions,
    ).map((start) => occurrence(start, addMinutes(start, length)));
  }
  // the series recurs on another zone's clocks: expand there (the window
  // padded by a day each side), convert each start back to the display
  const toZone = (wall: Date): Date => ogeConvertWallClock(wall, view, zone);
  const toView = (wall: Date): Date => ogeConvertWallClock(wall, zone, view);
  const seriesStart = toZone(appointment.startDate);
  const length = durationMinutes(seriesStart, toZone(appointment.endDate));
  const result: SchedulerAppointment<T>[] = [];
  for (const start of expandRecurrence(
    rule,
    seriesStart,
    addDays(toZone(rangeStart), -1),
    addDays(toZone(rangeEnd), 1),
    exceptions,
  )) {
    const viewStart = toView(start);
    if (
      viewStart.getTime() < rangeStart.getTime() ||
      viewStart.getTime() >= rangeEnd.getTime()
    ) {
      continue;
    }
    result.push(occurrence(viewStart, toView(addMinutes(start, length))));
  }
  return result;
}

/** A date/flag change produced by editing, dragging or resizing. */
export interface SchedulerAppointmentChange {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly allDay?: boolean;
}

/**
 * Serializes a display-zone wall clock in `original`'s storage shape: the
 * instant for timed values, the calendar day itself for all-day ones.
 */
export function serializeSchedulerDate<T>(
  wall: Date,
  original: unknown,
  fields: Pick<ResolvedSchedulerFields<T>, 'timeZone'>,
  allDay: boolean,
): unknown {
  return serializeLikeOriginal(
    allDay ? wall : fromSchedulerView(wall, fields.timeZone),
    original,
  );
}

/**
 * Builds the write-back patch for `change` against `original`, re-serializing
 * dates in the item's own storage shape. Function-valued exprs have no field
 * name to write into — those fields are silently omitted (the host receives
 * the change through events instead).
 */
export function appointmentPatch<T>(
  original: T,
  change: SchedulerAppointmentChange,
  fields: ResolvedSchedulerFields<T>,
): Partial<T> {
  const patch: Record<string, unknown> = {};
  const allDay = change.allDay ?? fields.allDay(original) === true;
  const startField = fields.fieldNames.startDate;
  if (startField !== null) {
    patch[startField] = serializeSchedulerDate(
      change.startDate,
      fields.startDate(original),
      fields,
      allDay,
    );
  }
  const endField = fields.fieldNames.endDate;
  if (endField !== null) {
    patch[endField] = serializeSchedulerDate(
      change.endDate,
      fields.endDate(original),
      fields,
      allDay,
    );
  }
  const allDayField = fields.fieldNames.allDay;
  if (change.allDay !== undefined && allDayField !== null) {
    patch[allDayField] = change.allDay;
  }
  return patch as Partial<T>;
}
