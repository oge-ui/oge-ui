import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  isWorkingDay,
  nextWorkingDay,
  workingDaysBetween,
  type GanttWorkCalendar,
} from './work-calendar';

// 2026-08-03 is a Monday
const MON = new Date(2026, 7, 3);
const FRI = new Date(2026, 7, 7);
const SAT = new Date(2026, 7, 8);
const SUN = new Date(2026, 7, 9);

describe('isWorkingDay', () => {
  it('defaults to Monday-Friday', () => {
    expect(isWorkingDay(MON, {})).toBe(true);
    expect(isWorkingDay(FRI, {})).toBe(true);
    expect(isWorkingDay(SAT, {})).toBe(false);
    expect(isWorkingDay(SUN, {})).toBe(false);
  });

  it('honors a custom working week', () => {
    const calendar: GanttWorkCalendar = { workingDays: [0, 6] };
    expect(isWorkingDay(SAT, calendar)).toBe(true);
    expect(isWorkingDay(MON, calendar)).toBe(false);
  });

  it('holidays are non-working regardless of the weekday', () => {
    const calendar: GanttWorkCalendar = { holidays: [new Date(2026, 7, 5)] };
    expect(isWorkingDay(new Date(2026, 7, 5), calendar)).toBe(false);
    expect(isWorkingDay(new Date(2026, 7, 6), calendar)).toBe(true);
  });

  it('an empty or seven-day working week degenerates to Monday-Friday', () => {
    expect(isWorkingDay(SAT, { workingDays: [] })).toBe(false);
    expect(isWorkingDay(SAT, { workingDays: [0, 1, 2, 3, 4, 5, 6] })).toBe(
      false,
    );
  });
});

describe('nextWorkingDay', () => {
  it('returns the same day when it is working', () => {
    expect(nextWorkingDay(MON, {})).toEqual(MON);
  });

  it('rolls a weekend to Monday preserving the time of day', () => {
    const satNoon = new Date(2026, 7, 8, 12, 30);
    const rolled = nextWorkingDay(satNoon, {});
    expect(rolled).toEqual(new Date(2026, 7, 10, 12, 30));
  });

  it('skips consecutive holidays', () => {
    const calendar: GanttWorkCalendar = {
      holidays: [new Date(2026, 7, 10), new Date(2026, 7, 11)],
    };
    expect(nextWorkingDay(SAT, calendar)).toEqual(new Date(2026, 7, 12));
  });
});

describe('workingDaysBetween', () => {
  it('counts working days in a half-open range', () => {
    // Mon..Fri (exclusive Sat) = 5 working days
    expect(workingDaysBetween(MON, SAT, {})).toBe(5);
    // full week Mon..next Mon = still 5
    expect(workingDaysBetween(MON, new Date(2026, 7, 10), {})).toBe(5);
  });

  it('returns 0 for empty or inverted ranges', () => {
    expect(workingDaysBetween(MON, MON, {})).toBe(0);
    expect(workingDaysBetween(FRI, MON, {})).toBe(0);
  });

  it('subtracts holidays', () => {
    const calendar: GanttWorkCalendar = { holidays: [new Date(2026, 7, 5)] };
    expect(workingDaysBetween(MON, SAT, calendar)).toBe(4);
  });
});

describe('addWorkingDays', () => {
  it('spans a plain working stretch', () => {
    // 3 working days from Monday -> end Thursday 00:00
    expect(addWorkingDays(MON, 3, {})).toEqual(new Date(2026, 7, 6));
  });

  it('skips the weekend', () => {
    // 2 working days from Friday: Fri + Mon -> end Tuesday 00:00
    expect(addWorkingDays(FRI, 2, {})).toEqual(new Date(2026, 7, 11));
  });

  it('rolls a non-working start first', () => {
    // starting Saturday, 1 working day = Monday -> end Tuesday 00:00
    expect(addWorkingDays(SAT, 1, {})).toEqual(new Date(2026, 7, 11));
  });

  it('zero days returns the rolled start (milestone)', () => {
    expect(addWorkingDays(SAT, 0, {})).toEqual(new Date(2026, 7, 10));
  });

  it('round-trips with workingDaysBetween', () => {
    const end = addWorkingDays(MON, 7, {});
    expect(workingDaysBetween(MON, end, {})).toBe(7);
  });
});
