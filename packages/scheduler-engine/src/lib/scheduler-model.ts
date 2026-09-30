/**
 * The normalized appointment model and the field-mapping layer between user
 * data (arbitrary item shapes addressed via `*Expr` accessors) and the
 * scheduler engine. Dates normalize through `@oge-ui/core`'s `toLocalDate`
 * and write back through `serializeLikeOriginal`, so string-dated stores
 * round-trip without silently changing their storage shape.
 */
import {
  createFieldAccessor,
  serializeLikeOriginal,
  toLocalDate,
  type ValueAccessor,
} from '@oge-ui/core';
import { addMinutes } from '@oge-ui/core';
import { parseRecurrenceException, parseRecurrenceRule } from './rrule';
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
  | 'disabled';

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
    },
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
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
  const startDate = toLocalDate(fields.startDate(item));
  if (startDate === null) return null;
  const endRaw = toLocalDate(fields.endDate(item));
  const endDate =
    endRaw !== null && endRaw.getTime() >= startDate.getTime()
      ? endRaw
      : startDate;
  const allDay = fields.allDay(item) === true;
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
  const rule = parseRecurrenceRule(appointment.recurrenceRule);
  if (rule === null) return [appointment];
  const exceptions =
    appointment.recurrenceException === undefined
      ? []
      : parseRecurrenceException(appointment.recurrenceException);
  const length = durationMinutes(appointment.startDate, appointment.endDate);
  return expandRecurrence(
    rule,
    appointment.startDate,
    rangeStart,
    rangeEnd,
    exceptions,
  ).map((start) => ({
    ...appointment,
    key: `${String(appointment.key)}::${start.getTime()}`,
    startDate: start,
    endDate: addMinutes(start, length),
    seriesKey: appointment.key,
  }));
}

/** A date/flag change produced by editing, dragging or resizing. */
export interface SchedulerAppointmentChange {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly allDay?: boolean;
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
  const startField = fields.fieldNames.startDate;
  if (startField !== null) {
    patch[startField] = serializeLikeOriginal(
      change.startDate,
      fields.startDate(original),
    );
  }
  const endField = fields.fieldNames.endDate;
  if (endField !== null) {
    patch[endField] = serializeLikeOriginal(
      change.endDate,
      fields.endDate(original),
    );
  }
  const allDayField = fields.fieldNames.allDay;
  if (change.allDay !== undefined && allDayField !== null) {
    patch[allDayField] = change.allDay;
  }
  return patch as Partial<T>;
}
