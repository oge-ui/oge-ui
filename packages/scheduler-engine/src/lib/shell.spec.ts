import { OGE_DEFAULT_SCHEDULER_MESSAGES } from './config';
import { resolveSchedulerFields } from './scheduler-model';
import {
  canNavigateScheduler,
  dayWeekViewOf,
  dueSchedulerReminders,
  fillSchedulerTemplate,
  isTodayInSchedulerView,
  mergeSchedulerMessages,
  normalizeSchedulerStore,
  resolveActiveSchedulerView,
  resolveColorResource,
  resolveGroupResource,
  resolveSchedulerViews,
  schedulerKeyReader,
  schedulerPeriodTitle,
  scrollOffsetForTime,
  visibleSchedulerAppointments,
} from './shell';

const toolbar = OGE_DEFAULT_SCHEDULER_MESSAGES.toolbar;
const defaults = { dayStartHour: 8, dayEndHour: 18, cellDuration: 30 };

interface Item {
  id?: number;
  text: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  ownerId?: string;
  recurrenceRule?: string;
  reminder?: number;
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

describe('scheduler shell derivations', () => {
  it('resolves view options with per-view overrides and names', () => {
    const views = resolveSchedulerViews(
      ['week', { type: 'day', name: 'Office', dayStartHour: 9 }],
      toolbar,
      defaults,
    );
    expect(views[0]).toEqual({
      type: 'week',
      name: 'Week',
      dayStartHour: 8,
      dayEndHour: 18,
      cellDuration: 30,
      intervalCount: 1,
      index: 0,
    });
    expect(views[1]).toMatchObject({ name: 'Office', dayStartHour: 9 });
    expect(
      resolveActiveSchedulerView('month', views, toolbar, defaults).name,
    ).toBe('Month');
    expect(dayWeekViewOf('agenda')).toBe('week');
    expect(dayWeekViewOf('workWeek')).toBe('workWeek');
  });

  it('merges per-instance messages per top-level block', () => {
    const merged = mergeSchedulerMessages(OGE_DEFAULT_SCHEDULER_MESSAGES, {
      popup: { edit: 'E', deleteAppointment: 'D', close: 'C' },
    });
    expect(merged.popup.edit).toBe('E');
    expect(merged.toolbar).toEqual(OGE_DEFAULT_SCHEDULER_MESSAGES.toolbar);
  });

  it('picks the color and grouping resources', () => {
    const owner = {
      fieldExpr: 'ownerId',
      items: [{ id: 'a', text: 'A', color: '#f00' }],
    };
    const room = { fieldExpr: 'roomId', items: [], useColorAsDefault: true };
    expect(resolveColorResource([owner, room])).toBe(room);
    expect(resolveColorResource([owner])).toBe(owner);
    expect(resolveGroupResource([owner, room], ['roomId'])).toBe(room);
    expect(resolveGroupResource([owner], ['nope'])).toBeNull();
  });

  it('keys by field, falling back to the index, or by selector', () => {
    const byId = schedulerKeyReader<Item>(undefined);
    expect(
      byId({ id: 7, text: '', startDate: new Date(), endDate: new Date() }, 3),
    ).toBe(7);
    expect(
      byId({ text: '', startDate: new Date(), endDate: new Date() }, 3),
    ).toBe(3);
    expect(
      schedulerKeyReader<Item>((item) => item.text)(
        {
          text: 'k',
          startDate: new Date(),
          endDate: new Date(),
        },
        0,
      ),
    ).toBe('k');
  });

  it('normalizes the store with resource fallback colors', () => {
    const owner = {
      fieldExpr: 'ownerId',
      items: [{ id: 'a', text: 'A', color: '#f00' }],
    };
    const [appointment] = normalizeSchedulerStore<Item>(
      [
        {
          id: 1,
          text: 'X',
          startDate: new Date(2026, 7, 6, 9),
          endDate: new Date(2026, 7, 6, 10),
          ownerId: 'a',
        },
      ],
      fields,
      schedulerKeyReader<Item>(undefined),
      owner,
    );
    expect(appointment.color).toBe('#f00');
  });

  it('windows and expands recurring appointments to the visible period', () => {
    const [series] = normalizeSchedulerStore<Item>(
      [
        {
          id: 1,
          text: 'Daily',
          startDate: new Date(2026, 7, 3, 9),
          endDate: new Date(2026, 7, 3, 10),
          recurrenceRule: 'FREQ=DAILY',
        },
      ],
      fields,
      schedulerKeyReader<Item>(undefined),
      null,
    );
    const visible = visibleSchedulerAppointments(
      [series],
      'week',
      new Date(2026, 7, 6),
      1,
      7,
    );
    expect(visible).toHaveLength(7);
  });

  it('formats period titles, honoring a custom formatter', () => {
    expect(
      schedulerPeriodTitle('month', new Date(2026, 7, 6), 'en-US', 1, 7),
    ).toBe('August 2026');
    expect(
      schedulerPeriodTitle('year', new Date(2026, 7, 6), 'en-US', 1, 7),
    ).toBe('2026');
    expect(
      schedulerPeriodTitle(
        'week',
        new Date(2026, 7, 6),
        'en-US',
        1,
        7,
        (start, end) => `${start.getDate()}-${end.getDate()}`,
      ),
    ).toBe('3-9');
  });

  it('knows whether today is visible and whether navigation stays in bounds', () => {
    const now = new Date(2026, 7, 6, 12).getTime();
    expect(
      isTodayInSchedulerView('week', new Date(2026, 7, 4), 1, 7, now),
    ).toBe(true);
    expect(isTodayInSchedulerView('day', new Date(2026, 7, 4), 1, 7, now)).toBe(
      false,
    );
    expect(
      canNavigateScheduler(
        'week',
        new Date(2026, 7, 6),
        -1,
        1,
        7,
        new Date(2026, 7, 3),
        undefined,
      ),
    ).toBe(false);
    expect(
      canNavigateScheduler(
        'week',
        new Date(2026, 7, 6),
        1,
        1,
        7,
        undefined,
        new Date(2026, 7, 20),
      ),
    ).toBe(true);
  });

  it('fills message templates and computes scroll offsets', () => {
    expect(
      fillSchedulerTemplate('{text} moved to {start}', {
        text: 'A',
        start: 'noon',
      }),
    ).toBe('A moved to noon');
    expect(scrollOffsetForTime(12, 0, 8 * 60, 18 * 60, 1000)).toBe(400);
    expect(scrollOffsetForTime(3, 0, 8 * 60, 18 * 60, 1000)).toBe(0);
    expect(scrollOffsetForTime(3, 0, 60, 60, 1000)).toBeNull();
  });

  it('reports due reminders once', () => {
    const [appointment] = normalizeSchedulerStore<Item>(
      [
        {
          id: 1,
          text: 'R',
          startDate: new Date(2026, 7, 6, 9),
          endDate: new Date(2026, 7, 6, 10),
          reminder: 10,
        },
      ],
      fields,
      schedulerKeyReader<Item>(undefined),
      null,
    );
    const fired = new Set<unknown>();
    expect(
      dueSchedulerReminders([appointment], new Date(2026, 7, 6, 8, 49), fired),
    ).toHaveLength(0);
    expect(
      dueSchedulerReminders([appointment], new Date(2026, 7, 6, 8, 52), fired),
    ).toHaveLength(1);
    expect(
      dueSchedulerReminders([appointment], new Date(2026, 7, 6, 8, 55), fired),
    ).toHaveLength(0);
  });
});
