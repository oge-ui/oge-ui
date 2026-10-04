import { describe, expect, it } from 'vitest';
import {
  dayPeriodColumnOptions,
  hourColumnOptions,
  isTimePartSelected,
  minuteColumnOptions,
  nowForType,
  resolveHour12,
  timeDisplayOptions,
  withTimePart,
} from './time-parts';

describe('resolveHour12', () => {
  it('follows the locale unless set explicitly', () => {
    expect(resolveHour12('en-US', undefined)).toBe(true);
    expect(resolveHour12('de-DE', undefined)).toBe(false);
    expect(resolveHour12('de-DE', true)).toBe(true);
    expect(resolveHour12('en-US', false)).toBe(false);
  });
});

describe('timeDisplayOptions', () => {
  it('keeps the short styles by default and adds seconds / clock on request', () => {
    expect(timeDisplayOptions('date', undefined, false)).toEqual({
      dateStyle: 'short',
    });
    expect(timeDisplayOptions('time', undefined, false)).toEqual({
      timeStyle: 'short',
    });
    expect(timeDisplayOptions('datetime', false, true)).toEqual({
      dateStyle: 'short',
      timeStyle: 'medium',
      hour12: false,
    });
  });
});

describe('time picker columns', () => {
  it('builds 24 or 12 hour options', () => {
    const legacy = hourColumnOptions('en-US', undefined);
    expect(legacy).toHaveLength(24);
    expect(legacy[14].text).toBe('2 PM');
    const h24 = hourColumnOptions('en-US', false);
    expect(h24).toHaveLength(24);
    expect(h24[9].text).toBe('09');
    const twelve = hourColumnOptions('en-US', true);
    expect(twelve).toHaveLength(12);
    expect(twelve[0]).toEqual({ value: 0, text: '12' });
    expect(twelve[1].text).toBe('1');
  });

  it('builds minute/second options on a step grid', () => {
    expect(minuteColumnOptions(15).map((o) => o.value)).toEqual([
      0, 15, 30, 45,
    ]);
    expect(minuteColumnOptions(0)).toHaveLength(60);
  });

  it('reads the locale AM/PM words', () => {
    expect(dayPeriodColumnOptions('en-US').map((o) => o.text)).toEqual([
      'AM',
      'PM',
    ]);
  });

  it('marks the selected option per part and clock', () => {
    const at = new Date(2026, 0, 1, 15, 30, 5);
    expect(isTimePartSelected(at, 'hour', 3, true)).toBe(true);
    expect(isTimePartSelected(at, 'hour', 15, false)).toBe(true);
    expect(isTimePartSelected(at, 'dayPeriod', 1, true)).toBe(true);
    expect(isTimePartSelected(at, 'second', 5, false)).toBe(true);
    expect(isTimePartSelected(null, 'minute', 30, false)).toBe(false);
  });
});

describe('withTimePart', () => {
  const base = new Date(2026, 0, 1, 15, 30, 5);

  it('keeps the half-day for 12h hour picks and the clock face for AM/PM', () => {
    expect(withTimePart(base, 'hour', 2, true).getHours()).toBe(14);
    expect(withTimePart(base, 'dayPeriod', 0, true).getHours()).toBe(3);
    expect(withTimePart(base, 'hour', 9, false).getHours()).toBe(9);
  });

  it('drops invisible seconds', () => {
    expect(withTimePart(base, 'minute', 0, false, false).getSeconds()).toBe(0);
    expect(withTimePart(base, 'second', 40, false).getSeconds()).toBe(40);
  });
});

describe('nowForType', () => {
  it('is today at midnight for dates and the current time otherwise', () => {
    const now = new Date(2026, 4, 6, 10, 20, 30);
    expect(nowForType('date', false, now)).toEqual(new Date(2026, 4, 6));
    expect(nowForType('time', false, now)).toEqual(
      new Date(2026, 4, 6, 10, 20, 0),
    );
    expect(nowForType('datetime', true, now)).toEqual(now);
  });
});
