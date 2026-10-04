/**
 * The appointment editor's framework-free half: the working model, its
 * mapping to and from a user item (recurrence rule included), and the
 * default data-driven form items both render layers hand to their form
 * component. The Angular dialog renders them with `<oge-form>`, the React
 * one with `<OgeForm>` — the items are the same objects.
 */
import { ogeDateTimeFormat } from '@oge-ui/core';
import type { OgeFormItemDataBase } from '@oge-ui/behavior';
import type { OgeSchedulerEditorMessages } from './config';
import {
  parseRecurrenceRule,
  serializeRecurrenceRule,
  type RecurrenceRule,
} from './rrule';
import {
  appointmentPatch,
  type ResolvedSchedulerFields,
  type SchedulerAppointment,
} from './scheduler-model';
import type { OgeSchedulerResource } from './scheduler-types';

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
  endMode: 'never' | 'count' | 'until';
  count: number;
  until?: Date;
  /** Minutes before start a reminder fires; `null` = none. */
  reminder: number | null;
  /** Assigned resource ids, keyed by the resource `fieldExpr`. */
  resourceValues: Record<string, unknown>;
}

/** The dialog's save payload. */
export interface SchedulerEditorResult {
  readonly model: SchedulerEditorModel;
  readonly isNew: boolean;
}

/** The recurrence half of the editor model. */
export type SchedulerEditorRuleFields = Pick<
  SchedulerEditorModel,
  'repeat' | 'interval' | 'byDays' | 'endMode' | 'count' | 'until'
>;

/** Maps an RRULE string onto the editor's recurrence fields. */
export function editorRuleFields(
  ruleString: string | undefined,
): SchedulerEditorRuleFields {
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
    };
  }
  return {
    repeat: rule.freq,
    interval: rule.interval,
    byDays: rule.byDay?.map((entry) => entry.weekday) ?? [],
    endMode:
      rule.count !== undefined
        ? 'count'
        : rule.until !== undefined
          ? 'until'
          : 'never',
    count: rule.count ?? 10,
    until: rule.until,
  };
}

/** Serializes the editor's recurrence fields; `undefined` = no recurrence. */
export function editorRuleString(
  model: SchedulerEditorModel,
): string | undefined {
  if (model.repeat === 'never') return undefined;
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
          byDay: model.byDays.map((weekday) => ({
            ordinal: null,
            weekday,
          })),
        }
      : {}),
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

/** Editor model of an appointment; `withRecurrence` maps its rule too. */
export function editorModelFrom<T>(
  appointment: SchedulerAppointment<T>,
  withRecurrence: boolean,
  resources: readonly OgeSchedulerResource[],
): SchedulerEditorModel {
  return {
    text: appointment.text,
    allDay: appointment.allDay,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    color: appointment.color,
    location: appointment.location,
    description: appointment.description,
    reminder: appointment.reminderMinutes ?? null,
    resourceValues: resourceValuesOf(appointment.source, resources),
    ...editorRuleFields(
      withRecurrence ? appointment.recurrenceRule : undefined,
    ),
  };
}

/** A blank create-editor model for `[startDate, endDate)`. */
export function draftEditorModel(
  startDate: Date,
  endDate: Date,
  allDay: boolean,
  resourceValues: Record<string, unknown>,
): SchedulerEditorModel {
  return {
    text: '',
    allDay,
    startDate,
    endDate,
    reminder: null,
    resourceValues,
    ...editorRuleFields(undefined),
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
  set(fields.fieldNames.text, editorModel.text);
  set(fields.fieldNames.startDate, editorModel.startDate);
  set(fields.fieldNames.endDate, editorModel.endDate);
  if (editorModel.allDay) set(fields.fieldNames.allDay, true);
  set(fields.fieldNames.color, editorModel.color);
  set(fields.fieldNames.location, editorModel.location);
  set(fields.fieldNames.description, editorModel.description);
  set(fields.fieldNames.recurrenceRule, editorRuleString(editorModel));
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
  const patch: Record<string, unknown> = {
    ...(appointmentPatch(original, editorModel, fields) as Record<
      string,
      unknown
    >),
  };
  const set = (field: string | null, value: unknown): void => {
    if (field !== null && value !== undefined) patch[field] = value;
  };
  set(fields.fieldNames.text, editorModel.text);
  set(fields.fieldNames.allDay, editorModel.allDay);
  set(fields.fieldNames.color, editorModel.color);
  set(fields.fieldNames.location, editorModel.location);
  set(fields.fieldNames.description, editorModel.description);
  const ruleString = editorRuleString(editorModel);
  set(fields.fieldNames.recurrenceRule, ruleString ?? '');
  if (ruleString === undefined) {
    set(fields.fieldNames.recurrenceException, '');
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
): { value: number; text: string }[] {
  const format = ogeDateTimeFormat(locale, { weekday: 'short' });
  // Jan 4–10 2026 is a Sunday-first week
  return Array.from({ length: 7 }, (_, weekday) => ({
    value: weekday,
    text: format.format(new Date(2026, 0, 4 + weekday)),
  }));
}

/**
 * The default editor form: subject, location, start/end (with the
 * end-after-start rule), all-day, color, one select per resource, reminder,
 * the recurrence section (visibility follows `model`) and the description.
 */
export function buildSchedulerEditorItems(
  messages: OgeSchedulerEditorMessages,
  resources: readonly OgeSchedulerResource[],
  model: SchedulerEditorModel | null,
  locale: string | undefined,
): OgeFormItemDataBase[] {
  const allDay = model?.allDay === true;
  const repeat = model?.repeat ?? 'never';
  const endMode = model?.endMode ?? 'never';
  return [
    {
      field: 'text',
      label: messages.subjectLabel,
      placeholder: messages.subjectPlaceholder,
      isRequired: true,
      colSpan: 2,
    },
    {
      field: 'location',
      label: messages.locationLabel,
      placeholder: messages.locationPlaceholder,
      colSpan: 2,
    },
    {
      field: 'startDate',
      label: messages.startDateLabel,
      editorType: 'dateBox',
      editorOptions: { type: allDay ? 'date' : 'datetime' },
    },
    {
      field: 'endDate',
      label: messages.endDateLabel,
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
              ? messages.endBeforeStart
              : null;
          },
        },
      ],
    },
    {
      field: 'allDay',
      label: messages.allDayLabel,
      editorType: 'switch',
    },
    {
      field: 'color',
      label: messages.colorLabel,
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
      label: messages.reminderLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: schedulerReminderItems(messages),
        valueExpr: 'value',
        displayExpr: 'text',
      },
    },
    {
      field: 'repeat',
      label: messages.repeatLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: (['never', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(
          (value) => ({ value, text: messages.repeatOptions[value] }),
        ),
        valueExpr: 'value',
        displayExpr: 'text',
      },
    },
    {
      field: 'interval',
      label: messages.intervalLabel,
      editorType: 'numberBox',
      editorOptions: { min: 1, max: 99, showSpinButtons: true },
      visible: repeat !== 'never',
    },
    {
      field: 'byDays',
      label: messages.repeatOnLabel,
      editorType: 'tagBox',
      editorOptions: {
        items: schedulerWeekdayItems(locale),
        valueExpr: 'value',
        displayExpr: 'text',
      },
      colSpan: 2,
      visible: repeat === 'weekly',
    },
    {
      field: 'endMode',
      label: messages.endLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: (['never', 'count', 'until'] as const).map((value) => ({
          value,
          text: messages.endOptions[value],
        })),
        valueExpr: 'value',
        displayExpr: 'text',
      },
      visible: repeat !== 'never',
    },
    {
      field: 'count',
      label: messages.countLabel,
      editorType: 'numberBox',
      editorOptions: { min: 1, max: 999, showSpinButtons: true },
      visible: repeat !== 'never' && endMode === 'count',
    },
    {
      field: 'until',
      label: messages.untilLabel,
      editorType: 'dateBox',
      editorOptions: { type: 'date' },
      visible: repeat !== 'never' && endMode === 'until',
    },
    {
      field: 'description',
      label: messages.descriptionLabel,
      placeholder: messages.descriptionPlaceholder,
      editorType: 'textArea',
      editorOptions: { rows: 3, autoResize: true },
      colSpan: 2,
    },
  ];
}
