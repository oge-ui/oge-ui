import { OGE_DEFAULT_SCHEDULER_MESSAGES } from './config';
import {
  buildPatchFromEditor,
  buildSchedulerEditorItems,
  draftEditorModel,
  editorModelFrom,
  editorRuleFields,
  editorRuleString,
  formatExceptionStamps,
  schedulerExceptionItems,
  schedulerMonthDayItems,
  schedulerRecurrenceSummary,
  schedulerWeekdayKindItems,
  type SchedulerEditorModel,
} from './editor';
import { parseRecurrenceRule } from './rrule';
import { expandRecurrence } from './rrule-expand';
import {
  normalizeAppointment,
  resolveSchedulerFields,
} from './scheduler-model';

interface Item {
  text?: string;
  startDate?: Date;
  endDate?: Date;
  recurrenceRule?: string;
  recurrenceException?: string;
}

const fields = resolveSchedulerFields<Item>({
  textExpr: 'text',
  startDateExpr: 'startDate',
  endDateExpr: 'endDate',
  allDayExpr: 'allDay',
  colorExpr: 'color',
  locationExpr: 'location',
  descriptionExpr: 'description',
  reminderExpr: 'reminder',
  recurrenceRuleExpr: 'recurrenceRule',
  recurrenceExceptionExpr: 'recurrenceException',
  disabledExpr: 'disabled',
});
const messages = OGE_DEFAULT_SCHEDULER_MESSAGES.editor;
const START = new Date(2026, 7, 11, 10); // Tuesday Aug 11 2026, 2nd Tuesday

function modelWith(patch: Partial<SchedulerEditorModel>): SchedulerEditorModel {
  return {
    ...draftEditorModel(START, new Date(2026, 7, 11, 11), false, {}),
    ...patch,
  };
}

describe('recurrence editor — authoring', () => {
  it('defaults the monthly / yearly choices from the start date', () => {
    const fields0 = editorRuleFields(undefined, START);
    expect(fields0).toMatchObject({
      repeatBy: 'day',
      monthDays: [11],
      setPos: 2,
      weekdayKind: 2,
      yearMonth: 8,
    });
    expect(editorRuleFields(undefined, new Date(2026, 7, 31)).setPos).toBe(-1);
  });

  it('monthly on the second Tuesday (ordinal BYDAY)', () => {
    const rule = editorRuleString(
      modelWith({ repeat: 'monthly', repeatBy: 'weekday', setPos: 2, weekdayKind: 2 }),
    );
    expect(rule).toBe('FREQ=MONTHLY;BYDAY=2TU');
    expect(editorRuleFields(rule, START)).toMatchObject({
      repeat: 'monthly',
      repeatBy: 'weekday',
      setPos: 2,
      weekdayKind: 2,
    });
  });

  it('monthly on the last weekday (BYDAY + BYSETPOS)', () => {
    const rule = editorRuleString(
      modelWith({ repeat: 'monthly', repeatBy: 'weekday', setPos: -1, weekdayKind: 'weekday' }),
    );
    expect(rule).toBe('FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1');
    const parsed = parseRecurrenceRule(rule as string);
    expect(
      expandRecurrence(parsed!, START, START, new Date(2026, 10, 1)).map((date) =>
        date.getDate(),
      ),
    ).toEqual([31, 30, 30]); // Aug 31 (Mon), Sep 30 (Wed), Oct 30 (Fri)
    expect(editorRuleFields(rule, START)).toMatchObject({
      repeatBy: 'weekday',
      setPos: -1,
      weekdayKind: 'weekday',
    });
  });

  it('several days of the month, the last one included', () => {
    const rule = editorRuleString(
      modelWith({ repeat: 'monthly', repeatBy: 'day', monthDays: [-1, 15, 1, 15] }),
    );
    expect(rule).toBe('FREQ=MONTHLY;BYMONTHDAY=1,15,-1');
    expect(editorRuleFields(rule, START).monthDays).toEqual([1, 15, -1]);
  });

  it('yearly by month + nth weekday, ending after a count or on a date', () => {
    const rule = editorRuleString(
      modelWith({
        repeat: 'yearly',
        yearMonth: 3,
        repeatBy: 'weekday',
        setPos: 1,
        weekdayKind: 0,
        endMode: 'count',
        count: 5,
      }),
    );
    expect(rule).toBe('FREQ=YEARLY;COUNT=5;BYDAY=1SU;BYMONTH=3');
    const until = editorRuleString(
      modelWith({
        repeat: 'yearly',
        yearMonth: 12,
        repeatBy: 'day',
        monthDays: [24, 31],
        endMode: 'until',
        until: new Date(2030, 0, 1),
      }),
    );
    expect(until).toBe('FREQ=YEARLY;UNTIL=20300101T235959;BYMONTHDAY=24,31;BYMONTH=12');
    const parsed = parseRecurrenceRule(until as string)!;
    // multiple BYMONTHDAY values expand in yearly rules too
    expect(
      expandRecurrence(parsed, new Date(2026, 11, 24, 10), new Date(2026, 11, 1), new Date(2027, 0, 1)),
    ).toHaveLength(2);
  });

  it('keeps a rule it cannot author verbatim while untouched', () => {
    const exotic = 'FREQ=MONTHLY;BYDAY=TU;BYHOUR=9,15';
    const model = modelWith(editorRuleFields(exotic, START));
    expect(editorRuleString(model)).toBe(exotic);
    // touching a field re-serializes from the fields
    expect(editorRuleString({ ...model, interval: 2 })).toContain('INTERVAL=2');
  });
});

describe('recurrence editor — exceptions', () => {
  const item: Item = {
    text: 'Standup',
    startDate: new Date(2026, 7, 3, 9),
    endDate: new Date(2026, 7, 3, 9, 30),
    recurrenceRule: 'FREQ=DAILY;COUNT=5',
    recurrenceException: '20260805T090000',
  };
  const appointment = normalizeAppointment(item, 1, fields)!;

  it('loads exceptions and lists occurrences to skip', () => {
    const model = editorModelFrom(appointment, true, []);
    expect(model.exceptions).toEqual([new Date(2026, 7, 5, 9).getTime()]);
    const items = schedulerExceptionItems(model, 'en-US');
    expect(items).toHaveLength(5); // the 5 occurrences (the exception among them)
    expect(items[0].text).toContain('Aug 3, 2026');
  });

  it('writes the exception list only when it changed', () => {
    const model = editorModelFrom(appointment, true, []);
    expect(
      buildPatchFromEditor(item, model, fields, []).recurrenceException,
    ).toBeUndefined();
    const skipped = {
      ...model,
      exceptions: [...model.exceptions, new Date(2026, 7, 6, 9).getTime()],
    };
    expect(buildPatchFromEditor(item, skipped, fields, []).recurrenceException).toBe(
      '20260805T090000,20260806T090000',
    );
    expect(formatExceptionStamps([])).toBe('');
  });

  it('adds the exceptions picker for a series edit only', () => {
    const series = buildSchedulerEditorItems(
      messages,
      [],
      editorModelFrom(appointment, true, []),
      'en-US',
    );
    expect(series.some((entry) => entry.field === 'exceptions')).toBe(true);
    const fresh = buildSchedulerEditorItems(messages, [], modelWith({}), 'en-US');
    expect(fresh.some((entry) => entry.field === 'exceptions')).toBe(false);
    expect(fresh.map((entry) => entry.field)).toEqual(
      expect.arrayContaining(['repeatBy', 'monthDays', 'setPos', 'weekdayKind', 'yearMonth']),
    );
  });

  it('lists the picker choices', () => {
    expect(schedulerMonthDayItems(messages).at(-1)).toEqual({
      value: -1,
      text: 'Last day',
    });
    const kinds = schedulerWeekdayKindItems(messages, 'en-US');
    expect(kinds[2]).toEqual({ value: 2, text: 'Tuesday' });
    expect(kinds.at(-1)).toEqual({ value: 'weekendDay', text: 'weekend day' });
  });
});

describe('recurrence summary', () => {
  const summary = (patch: Partial<SchedulerEditorModel>, locale = 'en-US') =>
    schedulerRecurrenceSummary(modelWith(patch), messages, locale);

  it('reads like a sentence', () => {
    expect(summary({})).toBe('');
    expect(summary({ repeat: 'daily' })).toBe('Every day');
    expect(summary({ repeat: 'daily', interval: 3 })).toBe('Every 3 days');
    expect(
      summary({ repeat: 'weekly', interval: 2, byDays: [4, 1], endMode: 'count', count: 10 }),
    ).toBe('Every 2 weeks on Monday, Thursday, 10 times');
    expect(summary({ repeat: 'weekly', endMode: 'count', count: 1 })).toBe(
      'Every week on Tuesday, once',
    );
    expect(
      summary({ repeat: 'monthly', repeatBy: 'weekday', setPos: 2, weekdayKind: 2 }),
    ).toBe('Every month on the second Tuesday');
    expect(
      summary({ repeat: 'monthly', repeatBy: 'weekday', setPos: -1, weekdayKind: 'weekday' }),
    ).toBe('Every month on the last weekday');
    expect(summary({ repeat: 'monthly', monthDays: [1, -1] })).toBe(
      'Every month on day 1, Last day',
    );
    expect(
      summary({
        repeat: 'yearly',
        yearMonth: 3,
        monthDays: [15],
        endMode: 'until',
        until: new Date(2027, 11, 31),
      }),
    ).toBe('Every year on March 15, until Dec 31, 2027');
    expect(
      summary({ repeat: 'yearly', yearMonth: 11, repeatBy: 'weekday', setPos: 4, weekdayKind: 4 }),
    ).toBe('Every year on the fourth Thursday of November');
  });
});
