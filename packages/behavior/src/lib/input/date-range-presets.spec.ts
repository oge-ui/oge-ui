import { describe, expect, it } from 'vitest';
import {
  dateRangePresetActive,
  dateRangePresetLabel,
  ogeDateRangePresets,
} from './date-range-presets';
import { OGE_DEFAULT_INPUTS_MESSAGES } from './input-config';

// Wednesday 2026-03-18, mid-afternoon — the range is whole days regardless
const now = () => new Date(2026, 2, 18, 15, 45);
const days = (range: readonly [Date | null, Date | null]) =>
  range.map(
    (date) => date && [date.getFullYear(), date.getMonth() + 1, date.getDate()],
  );

describe('ogeDateRangePresets', () => {
  it('computes the rolling ranges, today included', () => {
    expect(days(ogeDateRangePresets.today({ now }).range())).toEqual([
      [2026, 3, 18],
      [2026, 3, 18],
    ]);
    expect(days(ogeDateRangePresets.yesterday({ now }).range())).toEqual([
      [2026, 3, 17],
      [2026, 3, 17],
    ]);
    expect(days(ogeDateRangePresets.last7Days({ now }).range())).toEqual([
      [2026, 3, 12],
      [2026, 3, 18],
    ]);
    expect(days(ogeDateRangePresets.last30Days({ now }).range())).toEqual([
      [2026, 2, 17],
      [2026, 3, 18],
    ]);
  });

  it('computes calendar months and years', () => {
    expect(days(ogeDateRangePresets.thisMonth({ now }).range())).toEqual([
      [2026, 3, 1],
      [2026, 3, 31],
    ]);
    expect(days(ogeDateRangePresets.lastMonth({ now }).range())).toEqual([
      [2026, 2, 1],
      [2026, 2, 28],
    ]);
    expect(days(ogeDateRangePresets.thisYear({ now }).range())).toEqual([
      [2026, 1, 1],
      [2026, 12, 31],
    ]);
    expect(days(ogeDateRangePresets.lastYear({ now }).range())).toEqual([
      [2025, 1, 1],
      [2025, 12, 31],
    ]);
  });

  it('crosses a year boundary for last month in January', () => {
    const january = () => new Date(2026, 0, 10);
    expect(
      days(ogeDateRangePresets.lastMonth({ now: january }).range()),
    ).toEqual([
      [2025, 12, 1],
      [2025, 12, 31],
    ]);
  });

  it('honours the week start', () => {
    expect(
      days(ogeDateRangePresets.thisWeek({ now, firstDayOfWeek: 1 }).range()),
    ).toEqual([
      [2026, 3, 16],
      [2026, 3, 22],
    ]);
    expect(
      days(ogeDateRangePresets.lastWeek({ now, firstDayOfWeek: 0 }).range()),
    ).toEqual([
      [2026, 3, 8],
      [2026, 3, 14],
    ]);
  });

  it('evaluates lazily, so a long-lived page gets the current day', () => {
    let clock = new Date(2026, 2, 18);
    const item = ogeDateRangePresets.today({ now: () => clock });
    clock = new Date(2026, 2, 19);
    expect(days(item.range())[0]).toEqual([2026, 3, 19]);
  });
});

describe('dateRangePresetLabel', () => {
  it('prefers the explicit label, then the message, then the id', () => {
    const msg = OGE_DEFAULT_INPUTS_MESSAGES;
    expect(dateRangePresetLabel(ogeDateRangePresets.last7Days(), msg)).toBe(
      msg.presetLast7Days,
    );
    expect(
      dateRangePresetLabel(
        ogeDateRangePresets.thisMonth({ label: 'MTD' }),
        msg,
      ),
    ).toBe('MTD');
    expect(
      dateRangePresetLabel({ id: 'q1', range: () => [null, null] }, msg),
    ).toBe('q1');
  });
});

describe('dateRangePresetActive', () => {
  it('matches whole days only', () => {
    const item = ogeDateRangePresets.thisMonth({ now });
    expect(
      dateRangePresetActive(item, [
        new Date(2026, 2, 1, 9),
        new Date(2026, 2, 31, 18),
      ]),
    ).toBe(true);
    expect(dateRangePresetActive(item, [new Date(2026, 2, 2), null])).toBe(
      false,
    );
  });
});
