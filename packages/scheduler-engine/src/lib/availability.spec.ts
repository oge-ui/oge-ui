import {
  blockedIntervals,
  isDayBlocked,
  isOffWorkHours,
  isRangeBlocked,
  snapProposalToWorkHours,
} from './availability';
import { findSchedulerConflicts } from './conflicts';
import {
  normalizeAppointment,
  resolveSchedulerFields,
  type SchedulerAppointment,
} from './scheduler-model';
import type { OgeSchedulerBlockedRange } from './scheduler-types';

interface Item {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  room?: string;
  recurrenceRule?: string;
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
const appt = (item: Item): SchedulerAppointment<Item> =>
  normalizeAppointment(item, item.id, fields) as SchedulerAppointment<Item>;

const LUNCH: OgeSchedulerBlockedRange = {
  startDate: new Date(2026, 7, 3, 12),
  endDate: new Date(2026, 7, 3, 13),
  recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
  text: 'Lunch',
};
const MAINTENANCE: OgeSchedulerBlockedRange = {
  startDate: new Date(2026, 7, 6),
  endDate: new Date(2026, 7, 7),
  resources: { room: ['b', 'c'] },
};

describe('blocked slots', () => {
  it('expands recurring ranges and filters by resource', () => {
    const week = blockedIntervals(
      [LUNCH, MAINTENANCE],
      new Date(2026, 7, 3),
      new Date(2026, 7, 10),
      { room: 'a' },
      30,
    );
    expect(week).toHaveLength(5); // weekday lunches only — room a
    expect(week[4].startDate).toEqual(new Date(2026, 7, 7, 12));
    const forB = blockedIntervals(
      [MAINTENANCE],
      new Date(2026, 7, 3),
      new Date(2026, 7, 10),
      { room: 'b' },
      30,
    );
    expect(forB).toHaveLength(1);
  });

  it('samples a predicate and merges consecutive blocked slots', () => {
    const predicate = (date: Date) => date.getHours() === 12;
    expect(
      blockedIntervals(
        predicate,
        new Date(2026, 7, 3, 8),
        new Date(2026, 7, 3, 18),
        {},
        30,
      ),
    ).toEqual([
      { startDate: new Date(2026, 7, 3, 12), endDate: new Date(2026, 7, 3, 13) },
    ]);
    expect(
      isRangeBlocked(predicate, new Date(2026, 7, 3, 11), new Date(2026, 7, 3, 12), {}, 30),
    ).toBe(false);
    expect(
      isRangeBlocked(predicate, new Date(2026, 7, 3, 11, 45), new Date(2026, 7, 3, 12, 15), {}, 30),
    ).toBe(true);
    // a zero-length range tests its instant
    expect(
      isRangeBlocked(predicate, new Date(2026, 7, 3, 12, 10), new Date(2026, 7, 3, 12, 10), {}, 30),
    ).toBe(true);
  });

  it('tests ranges, days and resources', () => {
    expect(
      isRangeBlocked([LUNCH], new Date(2026, 7, 4, 12, 30), new Date(2026, 7, 4, 14), {}, 30),
    ).toBe(true);
    expect(
      isRangeBlocked([LUNCH], new Date(2026, 7, 8, 12, 30), new Date(2026, 7, 8, 14), {}, 30),
    ).toBe(false); // Saturday
    expect(isDayBlocked([MAINTENANCE], new Date(2026, 7, 6), { room: 'c' })).toBe(true);
    expect(isDayBlocked([MAINTENANCE], new Date(2026, 7, 6), { room: 'a' })).toBe(false);
    expect(isDayBlocked([LUNCH], new Date(2026, 7, 4), {})).toBe(false);
    expect(isDayBlocked((date) => date.getDay() === 0, new Date(2026, 7, 9), {})).toBe(true);
    expect(isRangeBlocked(null, new Date(), new Date(), {}, 30)).toBe(false);
  });
});

describe('working hours', () => {
  it('tells off-hours cells', () => {
    const hours = { start: 9, end: 17, days: [1, 2, 3, 4, 5] };
    expect(isOffWorkHours(hours, new Date(2026, 7, 3), 8 * 60)).toBe(true);
    expect(isOffWorkHours(hours, new Date(2026, 7, 3), 9 * 60)).toBe(false);
    expect(isOffWorkHours(hours, new Date(2026, 7, 8), 10 * 60)).toBe(true);
    expect(isOffWorkHours(null, new Date(2026, 7, 8), 0)).toBe(false);
  });

  it('snaps timed proposals into the working window', () => {
    const hours = { start: 9, end: 17 };
    const early = snapProposalToWorkHours(
      {
        startDate: new Date(2026, 7, 3, 7),
        endDate: new Date(2026, 7, 3, 8),
        allDay: false,
      },
      hours,
    );
    expect(early.startDate).toEqual(new Date(2026, 7, 3, 9));
    expect(early.endDate).toEqual(new Date(2026, 7, 3, 10));
    const late = snapProposalToWorkHours(
      {
        startDate: new Date(2026, 7, 3, 16, 30),
        endDate: new Date(2026, 7, 3, 18),
        allDay: false,
      },
      hours,
    );
    expect(late.startDate).toEqual(new Date(2026, 7, 3, 15, 30));
    const long = snapProposalToWorkHours(
      {
        startDate: new Date(2026, 7, 3, 6),
        endDate: new Date(2026, 7, 3, 20),
        allDay: false,
      },
      hours,
    );
    expect(long.endDate).toEqual(new Date(2026, 7, 3, 17));
    const allDay = {
      startDate: new Date(2026, 7, 3),
      endDate: new Date(2026, 7, 4),
      allDay: true,
    };
    expect(snapProposalToWorkHours(allDay, hours)).toBe(allDay);
  });
});

describe('conflicts', () => {
  const store = [
    appt({
      id: 1,
      text: 'Review',
      startDate: new Date(2026, 7, 3, 10),
      endDate: new Date(2026, 7, 3, 11),
      room: 'a',
    }),
    appt({
      id: 2,
      text: 'Standup',
      startDate: new Date(2026, 7, 3, 9),
      endDate: new Date(2026, 7, 3, 9, 15),
      recurrenceRule: 'FREQ=DAILY',
      room: 'b',
    }),
  ];

  it('finds overlaps (half-open) and expands series', () => {
    const at = (hour: number, minute = 0) => new Date(2026, 7, 5, hour, minute);
    expect(
      findSchedulerConflicts(
        { startDate: at(9, 10), endDate: at(9, 40), values: {} },
        store,
        [],
      ).map((entry) => entry.text),
    ).toEqual(['Standup']);
    expect(
      findSchedulerConflicts(
        { startDate: at(9, 15), endDate: at(9, 45), values: {} },
        store,
        [],
      ),
    ).toEqual([]);
  });

  it('counts only the same resource when grouped and skips the moved item', () => {
    const level = [{ fieldExpr: 'room', items: [{ id: 'a', text: 'A' }] }];
    const candidate = {
      startDate: new Date(2026, 7, 3, 10, 30),
      endDate: new Date(2026, 7, 3, 11, 30),
    };
    expect(
      findSchedulerConflicts({ ...candidate, values: { room: 'b' } }, store, level),
    ).toEqual([]);
    expect(
      findSchedulerConflicts({ ...candidate, values: { room: 'a' } }, store, level),
    ).toHaveLength(1);
    expect(
      findSchedulerConflicts(
        { ...candidate, values: { room: 'a' }, source: store[0].source },
        store,
        level,
      ),
    ).toEqual([]);
  });
});
