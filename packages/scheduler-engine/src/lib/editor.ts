/**
 * The appointment editor's framework-free half: the working model, its
 * mapping to and from a user item (recurrence rule included), and the
 * default data-driven form items both render layers hand to their form
 * component. The Angular dialog renders them with `<oge-form>`, the React
 * one with `<OgeForm>` — the items are the same objects.
 *
 * The recurrence section authors what the engine expands: daily, weekly on
 * chosen weekdays, monthly / yearly on one or more days of the month
 * (BYMONTHDAY, `-1` = last day) or on the nth weekday ("second Tuesday",
 * "last weekday" — ordinal BYDAY or BYDAY + BYSETPOS), yearly in a chosen
 * month, ending never / after a count / on a date, plus the skipped
 * occurrences of a series (EXDATE). A rule the section cannot author
 * (BYHOUR, several months, …) round-trips verbatim while its fields stay
 * untouched.
 *
 * Time zones: the model's dates are wall clocks of the display zone, or —
 * with `timeZoneFrame` (the scheduler's `showTimeZoneEditor`) — of the
 * appointment's own start / end zones, which the editor then offers as
 * pickers. Saving converts back to instants (`editorZones`); all-day dates
 * are calendar days and never shift.
 */
import {
  ogeConvertWallClock,
  ogeDateTimeFormat,
  ogeFormatMessage,
  ogeFromWallClock,
  ogeTimeZoneLabel,
  ogeTimeZones,
} from '@oge-ui/core';
import type { OgeFormItemDataBase } from '@oge-ui/behavior';
import {
  OGE_DEFAULT_SCHEDULER_MESSAGES,
  type OgeSchedulerEditorMessages,
} from './config';
import {
  parseRecurrenceException,
  parseRecurrenceRule,
  recurrenceRuleTimeZone,
  serializeRecurrenceRule,
  type RecurrenceByDay,
  type RecurrenceRule,
} from './rrule';
import { expandRecurrence } from './rrule-expand';
import {
  appointmentPatch,
  schedulerRecurrenceZone,
  type ResolvedSchedulerFields,
  type SchedulerAppointment,
} from './scheduler-model';
import type { OgeSchedulerResource } from './scheduler-types';

/** The weekday choice of the nth-weekday mode. */
export type SchedulerWeekdayKind = number | 'day' | 'weekday' | 'weekendDay';

/** The editor's working model (independent of the user's item shape). */
export interface SchedulerEditorModel {
  text: string;
  allDay: boolean;
  startDate: Date;
  endDate: Date;
  color?: string;
  location?: string;
  description?: string;
  /** Recurrence section (mapped to/from the RRULE by the shell). */
  repeat: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  /** Weekly BYDAY weekdays (0 = Sunday). */
  byDays: number[];
  /** Monthly / yearly: a day of the month, or the nth weekday. */
  repeatBy: 'day' | 'weekday';
  /** Monthly / yearly days of the month (1–31, `-1` = the last day). */
  monthDays: number[];
  /** nth-weekday ordinal: `1`–`4`, `-1` = last. */
  setPos: number;
  /** nth-weekday day: a weekday (0 = Sunday) or any day / weekday / weekend day. */
  weekdayKind: SchedulerWeekdayKind;
  /** Yearly: the month (1–12). */
  yearMonth: number;
  endMode: 'never' | 'count' | 'until';
  count: number;
  until?: Date;
  /** Skipped occurrence starts of the series (EXDATE), as epoch ms. */
  exceptions: number[];
  /**
   * The rule the editor opened with and a fingerprint of its fields: an
   * untouched recurrence section saves the rule verbatim, so parts the
   * section cannot author survive an edit of the subject.
   */
  sourceRule?: string;
  sourceRuleKey?: string;
  /** The exceptions the editor opened with (same fingerprint idea). */
  sourceExceptionsKey?: string;
  /** Minutes before start a reminder fires; `null` = none. */
  reminder: number | null;
  /** Assigned resource ids, keyed by the resource `fieldExpr`. */
  resourceValues: Record<string, unknown>;
  /** The appointment's start zone (`null` = it follows the scheduler's). */
  startTimeZone?: string | null;
  /** The appointment's end zone (`null` = its start zone). */
  endTimeZone?: string | null;
  /**
   * `true` when the dates are wall clocks of `startTimeZone` /
   * `endTimeZone` and the editor shows the zone pickers
   * (`showTimeZoneEditor`); otherwise they are display-zone wall clocks.
   */
  timeZoneFrame?: boolean;
  /** The scheduler's display zone (placeholder of the zone pickers). */
  viewTimeZone?: string;
}

/** The zones an editor model's dates and recurrence are expressed in. */
export interface SchedulerEditorZones {
  /** The frame of `startDate`. */
  readonly start: string | undefined;
  /** The frame of `endDate`. */
  readonly end: string | undefined;
  /** The zone the saved rule recurs in (its EXDATE stamps' frame). */
  readonly rule: string | undefined;
}

/**
 * The frames of an editor model: its own zones under `timeZoneFrame`, the
 * display zone otherwise; the rule zone follows the saved rule's `TZID`,
 * else the start zone.
 */
export function editorZones(
  model: Pick<
    SchedulerEditorModel,
    'startTimeZone' | 'endTimeZone' | 'timeZoneFrame'
  >,
  viewZone: string | undefined,
  rule?: string,
): SchedulerEditorZones {
  const own = model.startTimeZone ?? undefined;
  const start = model.timeZoneFrame === true ? (own ?? viewZone) : viewZone;
  const end =
    model.timeZoneFrame === true
      ? (model.endTimeZone ?? own ?? viewZone)
      : viewZone;
  const ruleZone =
    (rule === undefined ? undefined : recurrenceRuleTimeZone(rule)) ??
    own ??
    viewZone;
  return { start, end, rule: ruleZone };
}

/** The dialog's save payload. */
export interface SchedulerEditorResult {
  readonly model: SchedulerEditorModel;
  readonly isNew: boolean;
}

/** The recurrence half of the editor model. */
export type SchedulerEditorRuleFields = Pick<
  SchedulerEditorModel,
  | 'repeat'
  | 'interval'
  | 'byDays'
  | 'repeatBy'
  | 'monthDays'
  | 'setPos'
  | 'weekdayKind'
  | 'yearMonth'
  | 'endMode'
  | 'count'
  | 'until'
  | 'sourceRule'
  | 'sourceRuleKey'
>;

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

/** The nth-weekday defaults a start date suggests ("the 2nd Tuesday"). */
function nthWeekdayOf(date: Date): { setPos: number; weekdayKind: number } {
  const ordinal = Math.ceil(date.getDate() / 7);
  return { setPos: ordinal > 4 ? -1 : ordinal, weekdayKind: date.getDay() };
}

/** Parses the nth-weekday parts of a monthly / yearly rule, if it has them. */
function nthWeekdayFields(
  rule: RecurrenceRule,
): { setPos: number; weekdayKind: SchedulerWeekdayKind } | null {
  const byDay = rule.byDay ?? [];
  if (byDay.length === 1 && byDay[0].ordinal !== null && !rule.bySetPos) {
    return { setPos: byDay[0].ordinal, weekdayKind: byDay[0].weekday };
  }
  if (
    byDay.length > 0 &&
    byDay.every((entry) => entry.ordinal === null) &&
    rule.bySetPos?.length === 1 &&
    [1, 2, 3, 4, -1].includes(rule.bySetPos[0])
  ) {
    const days = byDay.map((entry) => entry.weekday);
    const kind: SchedulerWeekdayKind | null = sameSet(days, ALL_DAYS)
      ? 'day'
      : sameSet(days, WEEKDAYS)
        ? 'weekday'
        : sameSet(days, WEEKEND)
          ? 'weekendDay'
          : days.length === 1
            ? days[0]
            : null;
    if (kind !== null) return { setPos: rule.bySetPos[0], weekdayKind: kind };
  }
  return null;
}

/** A stable fingerprint of the authorable recurrence fields. */
function ruleFieldsKey(fields: SchedulerEditorRuleFields): string {
  return JSON.stringify([
    fields.repeat,
    fields.interval,
    [...fields.byDays].sort(),
    fields.repeatBy,
    [...fields.monthDays].sort((a, b) => a - b),
    fields.setPos,
    fields.weekdayKind,
    fields.yearMonth,
    fields.endMode,
    fields.count,
    fields.until instanceof Date ? fields.until.getTime() : null,
  ]);
}

/**
 * Maps an RRULE string onto the editor's recurrence fields; `startDate`
 * seeds the monthly / yearly choices a rule does not set (the start's day,
 * its nth weekday and month).
 */
export function editorRuleFields(
  ruleString: string | undefined,
  startDate: Date = new Date(),
): SchedulerEditorRuleFields {
  const nth = nthWeekdayOf(startDate);
  const defaults = {
    repeatBy: 'day' as const,
    monthDays: [startDate.getDate()],
    setPos: nth.setPos,
    weekdayKind: nth.weekdayKind as SchedulerWeekdayKind,
    yearMonth: startDate.getMonth() + 1,
  };
  const rule =
    ruleString === undefined ? null : parseRecurrenceRule(ruleString);
  if (rule === null) {
    return {
      repeat: 'never',
      interval: 1,
      byDays: [],
      endMode: 'never',
      count: 10,
      until: undefined,
      ...defaults,
    };
  }
  const monthly = rule.freq === 'monthly' || rule.freq === 'yearly';
  const nthFields = monthly ? nthWeekdayFields(rule) : null;
  const fields: SchedulerEditorRuleFields = {
    repeat: rule.freq,
    interval: rule.interval,
    byDays:
      rule.freq === 'weekly'
        ? (rule.byDay?.map((entry) => entry.weekday) ?? [])
        : [],
    repeatBy: nthFields !== null ? 'weekday' : 'day',
    monthDays:
      monthly && rule.byMonthDay !== undefined && rule.byMonthDay.length > 0
        ? [...rule.byMonthDay]
        : defaults.monthDays,
    setPos: nthFields?.setPos ?? defaults.setPos,
    weekdayKind: nthFields?.weekdayKind ?? defaults.weekdayKind,
    yearMonth:
      rule.freq === 'yearly' && rule.byMonth !== undefined
        ? rule.byMonth[0]
        : defaults.yearMonth,
    endMode:
      rule.count !== undefined
        ? 'count'
        : rule.until !== undefined
          ? 'until'
          : 'never',
    count: rule.count ?? 10,
    until: rule.until,
  };
  return {
    ...fields,
    sourceRule: ruleString,
    sourceRuleKey: ruleFieldsKey(fields),
  };
}

/** The BYDAY / BYSETPOS parts of the nth-weekday mode. */
function nthWeekdayRuleParts(
  setPos: number,
  kind: SchedulerWeekdayKind,
): Pick<RecurrenceRule, 'byDay' | 'bySetPos'> {
  const ordinal = [1, 2, 3, 4, -1].includes(setPos) ? setPos : 1;
  if (typeof kind === 'number') {
    return { byDay: [{ ordinal, weekday: ((kind % 7) + 7) % 7 }] };
  }
  const days =
    kind === 'day' ? ALL_DAYS : kind === 'weekday' ? WEEKDAYS : WEEKEND;
  return {
    byDay: days.map((weekday): RecurrenceByDay => ({ ordinal: null, weekday })),
    bySetPos: [ordinal],
  };
}

/** Serializes the editor's recurrence fields; `undefined` = no recurrence. */
export function editorRuleString(
  model: SchedulerEditorModel,
): string | undefined {
  if (model.repeat === 'never') return undefined;
  if (
    model.sourceRule !== undefined &&
    model.sourceRuleKey !== undefined &&
    ruleFieldsKey(model) === model.sourceRuleKey
  ) {
    return model.sourceRule;
  }
  const monthDays = [...new Set(model.monthDays ?? [])]
    .filter((day) => day === -1 || (day >= 1 && day <= 31))
    .sort((a, b) => (a === -1 ? 32 : a) - (b === -1 ? 32 : b));
  const dayParts: Partial<RecurrenceRule> =
    model.repeat !== 'monthly' && model.repeat !== 'yearly'
      ? {}
      : model.repeatBy === 'weekday'
        ? nthWeekdayRuleParts(model.setPos, model.weekdayKind)
        : {
            byMonthDay:
              monthDays.length > 0 ? monthDays : [model.startDate.getDate()],
          };
  const rule: RecurrenceRule = {
    freq: model.repeat,
    interval: Math.max(1, Math.round(model.interval || 1)),
    ...(model.endMode === 'count'
      ? { count: Math.max(1, Math.round(model.count || 1)) }
      : {}),
    ...(model.endMode === 'until' && model.until instanceof Date
      ? {
          until: new Date(
            model.until.getFullYear(),
            model.until.getMonth(),
            model.until.getDate(),
            23,
            59,
            59,
          ),
        }
      : {}),
    ...(model.repeat === 'weekly' && model.byDays.length > 0
      ? {
          byDay: [...model.byDays]
            .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
            .map((weekday) => ({ ordinal: null, weekday })),
        }
      : {}),
    ...(model.repeat === 'yearly'
      ? {
          byMonth: [
            Math.min(12, Math.max(1, Math.round(model.yearMonth || 1))),
          ],
        }
      : {}),
    ...dayParts,
    weekStart: 1,
  };
  return serializeRecurrenceRule(rule);
}

/** The assigned resource ids of an item, keyed by resource field. */
export function resourceValuesOf<T>(
  item: T,
  resources: readonly OgeSchedulerResource[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const resource of resources) {
    values[resource.fieldExpr] = (item as Record<string, unknown>)[
      resource.fieldExpr
    ];
  }
  return values;
}

const exceptionsKey = (values: readonly number[]): string =>
  [...values].sort((a, b) => a - b).join(',');

/**
 * Formats epoch-ms exception starts as an EXDATE stamp list. `from` / `to`
 * re-express the values from the editor's start frame in the rule zone.
 */
export function formatExceptionStamps(
  values: readonly number[],
  from?: string,
  to?: string,
): string {
  return [...values]
    .sort((a, b) => a - b)
    .map((value) => {
      const date = ogeConvertWallClock(new Date(value), from, to);
      const pad = (part: number): string => String(part).padStart(2, '0');
      return (
        `${String(date.getFullYear()).padStart(4, '0')}${pad(date.getMonth() + 1)}` +
        `${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}` +
        `${pad(date.getSeconds())}`
      );
    })
    .join(',');
}

/** Options of {@link editorModelFrom} / {@link draftEditorModel}. */
export interface SchedulerEditorModelOptions {
  /** Express the dates in the appointment's own zones (zone pickers shown). */
  readonly timeZoneEditor?: boolean;
  /** The display zone (drafts; an appointment carries its own). */
  readonly viewTimeZone?: string;
}

/** Editor model of an appointment; `withRecurrence` maps its rule too. */
export function editorModelFrom<T>(
  appointment: SchedulerAppointment<T>,
  withRecurrence: boolean,
  resources: readonly OgeSchedulerResource[],
  options: SchedulerEditorModelOptions = {},
): SchedulerEditorModel {
  const view = appointment.viewTimeZone ?? options.viewTimeZone;
  const zoneFields = {
    startTimeZone: appointment.startTimeZone ?? null,
    endTimeZone: appointment.endTimeZone ?? null,
    timeZoneFrame: options.timeZoneEditor === true,
  };
  const zones = editorZones(
    zoneFields,
    view,
    withRecurrence ? appointment.recurrenceRule : undefined,
  );
  const timed = !appointment.allDay;
  const startDate = timed
    ? ogeConvertWallClock(appointment.startDate, view, zones.start)
    : appointment.startDate;
  const endDate = timed
    ? ogeConvertWallClock(appointment.endDate, view, zones.end)
    : appointment.endDate;
  const ruleZone = timed ? schedulerRecurrenceZone(appointment) : view;
  const exceptions =
    withRecurrence && appointment.recurrenceException !== undefined
      ? parseRecurrenceException(appointment.recurrenceException, {
          timeZone: ruleZone,
        }).map((date) =>
          (timed
            ? ogeConvertWallClock(date, ruleZone, zones.start)
            : date
          ).getTime(),
        )
      : [];
  return {
    text: appointment.text,
    allDay: appointment.allDay,
    startDate,
    endDate,
    color: appointment.color,
    location: appointment.location,
    description: appointment.description,
    reminder: appointment.reminderMinutes ?? null,
    resourceValues: resourceValuesOf(appointment.source, resources),
    exceptions,
    ...(withRecurrence
      ? { sourceExceptionsKey: exceptionsKey(exceptions) }
      : {}),
    ...zoneFields,
    ...(view !== undefined ? { viewTimeZone: view } : {}),
    ...editorRuleFields(
      withRecurrence ? appointment.recurrenceRule : undefined,
      startDate,
    ),
  };
}

/** A blank create-editor model for `[startDate, endDate)`. */
export function draftEditorModel(
  startDate: Date,
  endDate: Date,
  allDay: boolean,
  resourceValues: Record<string, unknown>,
  options: SchedulerEditorModelOptions = {},
): SchedulerEditorModel {
  const view = options.viewTimeZone;
  return {
    text: '',
    allDay,
    startDate,
    endDate,
    reminder: null,
    resourceValues,
    exceptions: [],
    startTimeZone: null,
    endTimeZone: null,
    // a draft has no zones yet: its frame is the display zone either way
    timeZoneFrame: options.timeZoneEditor === true,
    ...(view !== undefined ? { viewTimeZone: view } : {}),
    ...editorRuleFields(undefined, startDate),
  };
}

/** The model's dates as instants (all-day dates stay calendar days). */
export function editorModelInstants(
  model: SchedulerEditorModel,
  viewZone: string | undefined,
): { startDate: Date; endDate: Date } {
  if (model.allDay)
    return { startDate: model.startDate, endDate: model.endDate };
  const zones = editorZones(model, viewZone);
  return {
    startDate: ogeFromWallClock(model.startDate, zones.start),
    endDate: ogeFromWallClock(model.endDate, zones.end),
  };
}

/** Builds a new item from the editor model using the string field names. */
export function buildItemFromEditor<T>(
  editorModel: SchedulerEditorModel,
  fields: ResolvedSchedulerFields<T>,
  resources: readonly OgeSchedulerResource[],
): T {
  const item: Record<string, unknown> = {};
  const set = (field: string | null, value: unknown): void => {
    if (field !== null && value !== undefined) item[field] = value;
  };
  const instants = editorModelInstants(editorModel, fields.timeZone);
  set(fields.fieldNames.text, editorModel.text);
  set(fields.fieldNames.startDate, instants.startDate);
  set(fields.fieldNames.endDate, instants.endDate);
  if (editorModel.allDay) set(fields.fieldNames.allDay, true);
  set(fields.fieldNames.color, editorModel.color);
  set(fields.fieldNames.location, editorModel.location);
  set(fields.fieldNames.description, editorModel.description);
  set(fields.fieldNames.startTimeZone, editorModel.startTimeZone ?? undefined);
  set(fields.fieldNames.endTimeZone, editorModel.endTimeZone ?? undefined);
  const rule = editorRuleString(editorModel);
  set(fields.fieldNames.recurrenceRule, rule);
  if (rule !== undefined && (editorModel.exceptions ?? []).length > 0) {
    const zones = editorZones(editorModel, fields.timeZone, rule);
    set(
      fields.fieldNames.recurrenceException,
      editorModel.allDay
        ? formatExceptionStamps(editorModel.exceptions)
        : formatExceptionStamps(
            editorModel.exceptions,
            zones.start,
            zones.rule,
          ),
    );
  }
  set(fields.fieldNames.reminder, editorModel.reminder ?? undefined);
  for (const resource of resources) {
    set(resource.fieldExpr, editorModel.resourceValues[resource.fieldExpr]);
  }
  return item as T;
}

/** The update patch an editor save applies to `original`. */
export function buildPatchFromEditor<T>(
  original: T,
  editorModel: SchedulerEditorModel,
  fields: ResolvedSchedulerFields<T>,
  resources: readonly OgeSchedulerResource[],
): Partial<T> {
  const zones = editorZones(editorModel, fields.timeZone);
  const view = fields.timeZone;
  const change = editorModel.allDay
    ? editorModel
    : {
        ...editorModel,
        startDate: ogeConvertWallClock(
          editorModel.startDate,
          zones.start,
          view,
        ),
        endDate: ogeConvertWallClock(editorModel.endDate, zones.end, view),
      };
  const patch: Record<string, unknown> = {
    ...(appointmentPatch(original, change, fields) as Record<string, unknown>),
  };
  const set = (field: string | null, value: unknown): void => {
    if (field !== null && value !== undefined) patch[field] = value;
  };
  if (editorModel.timeZoneFrame === true) {
    // a cleared picker removes a zone the item had; absent stays absent
    const zoneValue = (
      field: string | null,
      value: string | null | undefined,
      accessor: (item: T) => unknown,
    ): void => {
      if (value) set(field, value);
      else if (accessor(original) != null) set(field, null);
    };
    zoneValue(
      fields.fieldNames.startTimeZone,
      editorModel.startTimeZone,
      fields.startTimeZone,
    );
    zoneValue(
      fields.fieldNames.endTimeZone,
      editorModel.endTimeZone,
      fields.endTimeZone,
    );
  }
  set(fields.fieldNames.text, editorModel.text);
  set(fields.fieldNames.allDay, editorModel.allDay);
  set(fields.fieldNames.color, editorModel.color);
  set(fields.fieldNames.location, editorModel.location);
  set(fields.fieldNames.description, editorModel.description);
  const ruleString = editorRuleString(editorModel);
  set(fields.fieldNames.recurrenceRule, ruleString ?? '');
  if (ruleString === undefined) {
    set(fields.fieldNames.recurrenceException, '');
  } else if (
    editorModel.sourceExceptionsKey !== undefined &&
    exceptionsKey(editorModel.exceptions ?? []) !==
      editorModel.sourceExceptionsKey
  ) {
    const ruleZones = editorZones(editorModel, fields.timeZone, ruleString);
    set(
      fields.fieldNames.recurrenceException,
      editorModel.allDay
        ? formatExceptionStamps(editorModel.exceptions ?? [])
        : formatExceptionStamps(
            editorModel.exceptions ?? [],
            ruleZones.start,
            ruleZones.rule,
          ),
    );
  }
  set(fields.fieldNames.reminder, editorModel.reminder);
  for (const resource of resources) {
    set(resource.fieldExpr, editorModel.resourceValues[resource.fieldExpr]);
  }
  return patch as Partial<T>;
}

/** Reminder lead-time presets of the editor's reminder select. */
export function schedulerReminderItems(
  messages: OgeSchedulerEditorMessages,
): { value: number | null; text: string }[] {
  return [
    { value: null, text: messages.reminderNone },
    { value: 0, text: messages.reminderAtStart },
    ...[5, 10, 15, 30, 60].map((minutes) => ({
      value: minutes,
      text: messages.reminderBefore.replace('{minutes}', String(minutes)),
    })),
  ];
}

/** Localized weekday choices (Sunday first) for the weekly BYDAY picker. */
export function schedulerWeekdayItems(
  locale: string | undefined,
  style: 'short' | 'long' = 'short',
): { value: number; text: string }[] {
  const format = ogeDateTimeFormat(locale, { weekday: style });
  // Jan 4–10 2026 is a Sunday-first week
  return Array.from({ length: 7 }, (_, weekday) => ({
    value: weekday,
    text: format.format(new Date(2026, 0, 4 + weekday)),
  }));
}

/** The full editor catalog: optional recurrence keys filled from the defaults. */
function fullEditorMessages(
  messages: OgeSchedulerEditorMessages,
): Required<OgeSchedulerEditorMessages> {
  const filled: Record<string, unknown> = {
    ...OGE_DEFAULT_SCHEDULER_MESSAGES.editor,
  };
  for (const [key, value] of Object.entries(messages)) {
    if (value !== undefined) filled[key] = value;
  }
  return filled as Required<OgeSchedulerEditorMessages>;
}

/** Day-of-month choices (1–31 and "last day"). */
export function schedulerMonthDayItems(
  messages: OgeSchedulerEditorMessages,
): { value: number; text: string }[] {
  const full = fullEditorMessages(messages);
  return [
    ...Array.from({ length: 31 }, (_, index) => ({
      value: index + 1,
      text: String(index + 1),
    })),
    { value: -1, text: full.lastDayOfMonth },
  ];
}

/** Ordinal choices of the nth-weekday mode. */
export function schedulerOrdinalItems(
  messages: OgeSchedulerEditorMessages,
): { value: number; text: string }[] {
  const ordinals = fullEditorMessages(messages).ordinals;
  return [
    { value: 1, text: ordinals.first },
    { value: 2, text: ordinals.second },
    { value: 3, text: ordinals.third },
    { value: 4, text: ordinals.fourth },
    { value: -1, text: ordinals.last },
  ];
}

/** Weekday-kind choices: the seven weekdays, then day / weekday / weekend day. */
export function schedulerWeekdayKindItems(
  messages: OgeSchedulerEditorMessages,
  locale: string | undefined,
): { value: SchedulerWeekdayKind; text: string }[] {
  const kinds = fullEditorMessages(messages).dayKinds;
  return [
    ...schedulerWeekdayItems(locale, 'long'),
    { value: 'day', text: kinds.day },
    { value: 'weekday', text: kinds.weekday },
    { value: 'weekendDay', text: kinds.weekendDay },
  ];
}

/** Localized month choices (1–12). */
export function schedulerMonthItems(
  locale: string | undefined,
): { value: number; text: string }[] {
  const format = ogeDateTimeFormat(locale, { month: 'long' });
  return Array.from({ length: 12 }, (_, month) => ({
    value: month + 1,
    text: format.format(new Date(2026, month, 1)),
  }));
}

/**
 * The skipped-occurrence choices of a series: its next occurrences (from
 * the series start, at most `limit`) plus every existing exception, each a
 * formatted date / time. Picking one skips that occurrence (EXDATE);
 * removing a chip restores it.
 */
export function schedulerExceptionItems(
  model: Pick<
    SchedulerEditorModel,
    'sourceRule' | 'startDate' | 'exceptions' | 'allDay'
  > &
    Partial<
      Pick<
        SchedulerEditorModel,
        'startTimeZone' | 'endTimeZone' | 'timeZoneFrame' | 'viewTimeZone'
      >
    >,
  locale: string | undefined,
  limit = 60,
): { value: number; text: string }[] {
  const format = ogeDateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: model.allDay ? undefined : 'short',
  });
  const values = new Set<number>(model.exceptions ?? []);
  // the series recurs on its rule zone's clocks; the choices are shown in
  // the editor's start frame
  const zones = model.allDay
    ? { start: undefined, rule: undefined }
    : editorZones(model, model.viewTimeZone, model.sourceRule);
  const rule =
    model.sourceRule === undefined
      ? null
      : parseRecurrenceRule(model.sourceRule, { timeZone: zones.rule });
  if (rule !== null) {
    const seriesStart = ogeConvertWallClock(
      model.startDate,
      zones.start,
      zones.rule,
    );
    const horizon = new Date(seriesStart.getTime());
    horizon.setFullYear(horizon.getFullYear() + 3);
    for (const date of expandRecurrence(
      { ...rule, exDates: undefined },
      seriesStart,
      seriesStart,
      horizon,
    ).slice(0, limit)) {
      values.add(ogeConvertWallClock(date, zones.rule, zones.start).getTime());
    }
  }
  return [...values]
    .sort((a, b) => a - b)
    .map((value) => ({ value, text: format.format(new Date(value)) }));
}

type RecurrenceData = Pick<
  SchedulerEditorModel,
  'repeat' | 'repeatBy' | 'endMode'
>;
const recurrenceOf = (data: Record<string, unknown>): RecurrenceData =>
  data as unknown as RecurrenceData;

/**
 * The time-zone picker choices: every runtime zone as
 * `(UTC+03:00) Europe/Istanbul`, offsets taken at `at`.
 */
export function schedulerTimeZoneItems(
  at: Date | number = Date.now(),
): { value: string; text: string }[] {
  return ogeTimeZones().map((zone) => ({
    value: zone,
    text: ogeTimeZoneLabel(zone, at),
  }));
}

/**
 * The default editor form: subject, location, start/end (with the
 * end-after-start rule), the start / end time-zone pickers (a model with
 * `timeZoneFrame`), all-day, color, one select per resource, reminder,
 * the recurrence section (shown live through `visibleWhen`, so switching
 * "Repeat" reveals its fields without reopening) and the description.
 */
export function buildSchedulerEditorItems(
  messages: OgeSchedulerEditorMessages,
  resources: readonly OgeSchedulerResource[],
  model: SchedulerEditorModel | null,
  locale: string | undefined,
): OgeFormItemDataBase[] {
  const m = fullEditorMessages(messages);
  const allDay = model?.allDay === true;
  const repeats = (data: Record<string, unknown>): boolean =>
    recurrenceOf(data).repeat !== undefined &&
    recurrenceOf(data).repeat !== 'never';
  const monthlyOrYearly = (data: Record<string, unknown>): boolean =>
    recurrenceOf(data).repeat === 'monthly' ||
    recurrenceOf(data).repeat === 'yearly';
  const seriesEdit = model?.sourceRule !== undefined;
  return [
    {
      field: 'text',
      label: m.subjectLabel,
      placeholder: m.subjectPlaceholder,
      isRequired: true,
      colSpan: 2,
    },
    {
      field: 'location',
      label: m.locationLabel,
      placeholder: m.locationPlaceholder,
      colSpan: 2,
    },
    {
      field: 'startDate',
      label: m.startDateLabel,
      editorType: 'dateBox',
      editorOptions: { type: allDay ? 'date' : 'datetime' },
    },
    {
      field: 'endDate',
      label: m.endDateLabel,
      editorType: 'dateBox',
      editorOptions: { type: allDay ? 'date' : 'datetime' },
      validationRules: [
        {
          type: 'custom',
          validate: (context) => {
            const data = context.data as unknown as SchedulerEditorModel;
            return data.endDate instanceof Date &&
              data.startDate instanceof Date &&
              data.endDate.getTime() <= data.startDate.getTime()
              ? m.endBeforeStart
              : null;
          },
        },
      ],
    },
    ...(model?.timeZoneFrame === true ? timeZoneEditorItems(m, model) : []),
    {
      field: 'allDay',
      label: m.allDayLabel,
      editorType: 'switch',
    },
    {
      field: 'color',
      label: m.colorLabel,
      editorType: 'colorBox',
    },
    ...resources.map((resource) => ({
      field: `resourceValues.${resource.fieldExpr}`,
      label: resource.label ?? resource.fieldExpr,
      editorType: 'selectBox' as const,
      editorOptions: {
        items: resource.items as unknown as readonly unknown[],
        valueExpr: 'id',
        displayExpr: 'text',
        showClearButton: true,
      },
    })),
    {
      field: 'reminder',
      label: m.reminderLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: schedulerReminderItems(m),
        valueExpr: 'value',
        displayExpr: 'text',
      },
    },
    {
      field: 'repeat',
      label: m.repeatLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: (['never', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(
          (value) => ({ value, text: m.repeatOptions[value] }),
        ),
        valueExpr: 'value',
        displayExpr: 'text',
      },
    },
    {
      field: 'interval',
      label: m.intervalLabel,
      editorType: 'numberBox',
      editorOptions: { min: 1, max: 99, showSpinButtons: true },
      visibleWhen: repeats,
    },
    {
      field: 'byDays',
      label: m.repeatOnLabel,
      editorType: 'tagBox',
      editorOptions: {
        items: schedulerWeekdayItems(locale),
        valueExpr: 'value',
        displayExpr: 'text',
      },
      colSpan: 2,
      visibleWhen: { field: 'repeat', equals: 'weekly' },
    },
    {
      field: 'yearMonth',
      label: m.yearMonthLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: schedulerMonthItems(locale),
        valueExpr: 'value',
        displayExpr: 'text',
      },
      visibleWhen: { field: 'repeat', equals: 'yearly' },
    },
    {
      field: 'repeatBy',
      label: m.repeatByLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: (['day', 'weekday'] as const).map((value) => ({
          value,
          text: m.repeatByOptions[value],
        })),
        valueExpr: 'value',
        displayExpr: 'text',
      },
      visibleWhen: monthlyOrYearly,
    },
    {
      field: 'monthDays',
      label: m.monthDaysLabel,
      editorType: 'tagBox',
      editorOptions: {
        items: schedulerMonthDayItems(m),
        valueExpr: 'value',
        displayExpr: 'text',
      },
      colSpan: 2,
      visibleWhen: (data) =>
        monthlyOrYearly(data) && recurrenceOf(data).repeatBy !== 'weekday',
    },
    {
      field: 'setPos',
      label: m.setPosLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: schedulerOrdinalItems(m),
        valueExpr: 'value',
        displayExpr: 'text',
      },
      visibleWhen: (data) =>
        monthlyOrYearly(data) && recurrenceOf(data).repeatBy === 'weekday',
    },
    {
      field: 'weekdayKind',
      label: m.weekdayKindLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: schedulerWeekdayKindItems(m, locale),
        valueExpr: 'value',
        displayExpr: 'text',
      },
      visibleWhen: (data) =>
        monthlyOrYearly(data) && recurrenceOf(data).repeatBy === 'weekday',
    },
    {
      field: 'endMode',
      label: m.endLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: (['never', 'count', 'until'] as const).map((value) => ({
          value,
          text: m.endOptions[value],
        })),
        valueExpr: 'value',
        displayExpr: 'text',
      },
      visibleWhen: repeats,
    },
    {
      field: 'count',
      label: m.countLabel,
      editorType: 'numberBox',
      editorOptions: { min: 1, max: 999, showSpinButtons: true },
      visibleWhen: (data) =>
        repeats(data) && recurrenceOf(data).endMode === 'count',
    },
    {
      field: 'until',
      label: m.untilLabel,
      editorType: 'dateBox',
      editorOptions: { type: 'date' },
      visibleWhen: (data) =>
        repeats(data) && recurrenceOf(data).endMode === 'until',
    },
    ...(seriesEdit && model !== null
      ? [
          {
            field: 'exceptions',
            label: m.exceptionsLabel,
            editorType: 'tagBox' as const,
            editorOptions: {
              items: schedulerExceptionItems(model, locale),
              valueExpr: 'value',
              displayExpr: 'text',
              searchEnabled: true,
            },
            colSpan: 2,
            visibleWhen: repeats,
          },
        ]
      : []),
    {
      field: 'description',
      label: m.descriptionLabel,
      placeholder: m.descriptionPlaceholder,
      editorType: 'textArea',
      editorOptions: { rows: 3, autoResize: true },
      colSpan: 2,
    },
  ];
}

/** The start / end zone pickers of a `timeZoneFrame` model. */
function timeZoneEditorItems(
  m: Required<OgeSchedulerEditorMessages>,
  model: SchedulerEditorModel,
): OgeFormItemDataBase[] {
  const items = schedulerTimeZoneItems(model.startDate);
  const placeholder = m.timeZonePlaceholder.replace(
    '{zone}',
    model.viewTimeZone ?? ogeDateTimeFormat().resolvedOptions().timeZone,
  );
  const picker = (field: string, label: string): OgeFormItemDataBase => ({
    field,
    label,
    placeholder,
    editorType: 'selectBox',
    editorOptions: {
      items,
      valueExpr: 'value',
      displayExpr: 'text',
      searchEnabled: true,
      showClearButton: true,
    },
    visibleWhen: (data) => (data as { allDay?: boolean }).allDay !== true,
  });
  return [
    picker('startTimeZone', m.startTimeZoneLabel),
    picker('endTimeZone', m.endTimeZoneLabel),
  ];
}

/* ---------- live recurrence summary ---------- */

function ordinalText(
  setPos: number,
  ordinals: Required<OgeSchedulerEditorMessages>['ordinals'],
): string {
  switch (setPos) {
    case 1:
      return ordinals.first;
    case 2:
      return ordinals.second;
    case 3:
      return ordinals.third;
    case 4:
      return ordinals.fourth;
    default:
      return ordinals.last;
  }
}

/**
 * The human summary of the recurrence fields — "Every 2 weeks on Monday,
 * Thursday, 10 times", "Every month on the last weekday", "Every year on
 * March 15, until Dec 31, 2027" — through the catalog's ICU templates
 * (`ogeFormatMessage`, so plurals and digits follow the locale). Empty for
 * a non-recurring model.
 */
export function schedulerRecurrenceSummary(
  model: Pick<
    SchedulerEditorModel,
    | 'repeat'
    | 'interval'
    | 'byDays'
    | 'repeatBy'
    | 'monthDays'
    | 'setPos'
    | 'weekdayKind'
    | 'yearMonth'
    | 'endMode'
    | 'count'
    | 'until'
    | 'startDate'
  >,
  messages: OgeSchedulerEditorMessages,
  locale: string | undefined,
): string {
  if (model.repeat === 'never') return '';
  const m = fullEditorMessages(messages);
  const summary = m.summary;
  const interval = Math.max(1, Math.round(model.interval || 1));
  const weekdayNames = schedulerWeekdayItems(locale, 'long');
  const monthName = (month: number): string =>
    ogeDateTimeFormat(locale, { month: 'long' }).format(
      new Date(2026, Math.min(11, Math.max(0, month - 1)), 1),
    );
  const dayList = (): string =>
    [...new Set(model.monthDays ?? [])]
      .sort((a, b) => (a === -1 ? 32 : a) - (b === -1 ? 32 : b))
      .map((day) => (day === -1 ? m.lastDayOfMonth : String(day)))
      .join(', ') || String(model.startDate.getDate());
  const kindText = (): string =>
    typeof model.weekdayKind === 'number'
      ? (weekdayNames[model.weekdayKind]?.text ?? '')
      : m.dayKinds[model.weekdayKind];
  let text: string;
  switch (model.repeat) {
    case 'daily':
      text = ogeFormatMessage(summary.daily, { interval }, locale);
      break;
    case 'weekly': {
      const days = (
        model.byDays.length > 0 ? model.byDays : [model.startDate.getDay()]
      )
        .slice()
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
        .map((day) => weekdayNames[day]?.text ?? '')
        .join(', ');
      text = ogeFormatMessage(summary.weeklyOn, { interval, days }, locale);
      break;
    }
    case 'monthly':
      text =
        model.repeatBy === 'weekday'
          ? ogeFormatMessage(
              summary.monthlyWeekday,
              {
                interval,
                ordinal: ordinalText(model.setPos, m.ordinals),
                day: kindText(),
              },
              locale,
            )
          : ogeFormatMessage(
              summary.monthlyDay,
              { interval, days: dayList() },
              locale,
            );
      break;
    default:
      text =
        model.repeatBy === 'weekday'
          ? ogeFormatMessage(
              summary.yearlyWeekday,
              {
                interval,
                ordinal: ordinalText(model.setPos, m.ordinals),
                day: kindText(),
                month: monthName(model.yearMonth),
              },
              locale,
            )
          : ogeFormatMessage(
              summary.yearlyDay,
              {
                interval,
                month: monthName(model.yearMonth),
                days: dayList(),
              },
              locale,
            );
  }
  if (model.endMode === 'count') {
    return ogeFormatMessage(
      summary.count,
      { summary: text, count: Math.max(1, Math.round(model.count || 1)) },
      locale,
    );
  }
  if (model.endMode === 'until' && model.until instanceof Date) {
    return ogeFormatMessage(
      summary.until,
      {
        summary: text,
        date: ogeDateTimeFormat(locale, { dateStyle: 'medium' }).format(
          model.until,
        ),
      },
      locale,
    );
  }
  return text;
}
