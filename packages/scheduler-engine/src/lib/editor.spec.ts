import { OGE_DEFAULT_SCHEDULER_MESSAGES } from './config';
import {
  buildItemFromEditor,
  buildPatchFromEditor,
  buildSchedulerEditorItems,
  draftEditorModel,
  editorModelFrom,
  editorRuleFields,
  editorRuleString,
  schedulerReminderItems,
  schedulerWeekdayItems,
} from './editor';
import {
  normalizeAppointment,
  resolveSchedulerFields,
} from './scheduler-model';

interface Item {
  text?: string;
  startDate?: Date;
  endDate?: Date;
  allDay?: boolean;
  recurrenceRule?: string;
  recurrenceException?: string;
  roomId?: string;
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
const rooms = [
  { fieldExpr: 'roomId', label: 'Room', items: [{ id: 'r1', text: 'One' }] },
];

describe('scheduler editor mapping', () => {
  it('round-trips a weekly rule through the editor fields', () => {
    const ruleFields = editorRuleFields(
      'FREQ=WEEKLY;INTERVAL=2;COUNT=8;BYDAY=MO,TH',
    );
    expect(ruleFields).toMatchObject({
      repeat: 'weekly',
      interval: 2,
      byDays: [1, 4],
      endMode: 'count',
      count: 8,
    });
    const model = {
      ...draftEditorModel(
        new Date(2026, 7, 6, 9),
        new Date(2026, 7, 6, 10),
        false,
        {},
      ),
      ...ruleFields,
    };
    expect(editorRuleString(model)).toBe(
      'FREQ=WEEKLY;INTERVAL=2;COUNT=8;BYDAY=MO,TH',
    );
    expect(
      editorRuleString(draftEditorModel(new Date(), new Date(), false, {})),
    ).toBe(undefined);
  });

  it('maps an appointment onto the editor model (resources included)', () => {
    const item: Item = {
      text: 'Sync',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 10),
      recurrenceRule: 'FREQ=DAILY',
      roomId: 'r1',
    };
    const appointment = normalizeAppointment(item, 1, fields)!;
    const model = editorModelFrom(appointment, true, rooms);
    expect(model).toMatchObject({
      text: 'Sync',
      repeat: 'daily',
      resourceValues: { roomId: 'r1' },
    });
    expect(editorModelFrom(appointment, false, rooms).repeat).toBe('never');
  });

  it('builds new items and update patches in the storage field names', () => {
    const model = {
      ...draftEditorModel(
        new Date(2026, 7, 6, 9),
        new Date(2026, 7, 6, 10),
        true,
        { roomId: 'r1' },
      ),
      text: 'Offsite',
    };
    expect(buildItemFromEditor<Item>(model, fields, rooms)).toEqual({
      text: 'Offsite',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 10),
      allDay: true,
      roomId: 'r1',
    });
    const original: Item = {
      text: 'Old',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 10),
      recurrenceRule: 'FREQ=DAILY',
      recurrenceException: '20260807T090000',
    };
    const patch = buildPatchFromEditor<Item>(original, model, fields, rooms);
    // dropping the recurrence clears the rule and its exceptions
    expect(patch.recurrenceRule).toBe('');
    expect(patch.recurrenceException).toBe('');
    expect(patch.text).toBe('Offsite');
  });

  it('builds the default form items with recurrence visibility from the model', () => {
    const plain = buildSchedulerEditorItems(messages, rooms, null, 'en-US');
    expect(plain.map((item) => item.field)).toContain('resourceValues.roomId');
    expect(plain.find((item) => item.field === 'interval')?.visible).toBe(
      false,
    );
    const weekly = buildSchedulerEditorItems(
      messages,
      [],
      {
        ...draftEditorModel(new Date(), new Date(), true, {}),
        repeat: 'weekly',
        endMode: 'until',
      },
      'en-US',
    );
    expect(weekly.find((item) => item.field === 'byDays')?.visible).toBe(true);
    expect(weekly.find((item) => item.field === 'until')?.visible).toBe(true);
    expect(weekly.find((item) => item.field === 'count')?.visible).toBe(false);
    expect(
      weekly.find((item) => item.field === 'startDate')?.editorOptions,
    ).toEqual({ type: 'date' });
  });

  it('validates end-after-start through the custom rule', () => {
    const items = buildSchedulerEditorItems(messages, [], null, 'en-US');
    const rule = items.find((item) => item.field === 'endDate')
      ?.validationRules?.[0] as {
      validate: (context: { data: unknown; value: unknown }) => string | null;
    };
    const start = new Date(2026, 7, 6, 10);
    expect(
      rule.validate({
        data: { startDate: start, endDate: new Date(2026, 7, 6, 9) },
        value: null,
      }),
    ).toBe(messages.endBeforeStart);
    expect(
      rule.validate({
        data: { startDate: start, endDate: new Date(2026, 7, 6, 11) },
        value: null,
      }),
    ).toBeNull();
  });

  it('lists reminder presets and Sunday-first weekdays', () => {
    expect(schedulerReminderItems(messages).map((item) => item.value)).toEqual([
      null,
      0,
      5,
      10,
      15,
      30,
      60,
    ]);
    expect(schedulerWeekdayItems('en-US')[0]).toEqual({
      value: 0,
      text: 'Sun',
    });
  });
});
