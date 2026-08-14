import { describe, expect, it } from 'vitest';
import { datePartOrder, parseDateText } from './date-parse';

const parts = (date: Date | null) =>
  date === null
    ? null
    : [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
      ];

describe('datePartOrder', () => {
  it('reads the numeric order out of the locale, not out of a hard-coded table', () => {
    expect(datePartOrder('en-US', 'date')).toEqual(['month', 'day', 'year']);
    expect(datePartOrder('en-GB', 'date')).toEqual(['day', 'month', 'year']);
    expect(datePartOrder('tr-TR', 'date')).toEqual(['day', 'month', 'year']);
    expect(datePartOrder('ja-JP', 'date')).toEqual(['year', 'month', 'day']);
  });

  it('lists only the parts the kind asks for', () => {
    expect(datePartOrder('en-US', 'time')).toEqual(['hour', 'minute']);
    expect(datePartOrder('en-US', 'datetime')).toEqual([
      'month',
      'day',
      'year',
      'hour',
      'minute',
    ]);
  });
});

describe('parseDateText — dates', () => {
  it('maps typed digits onto the locale order, so 03/04 differs per locale', () => {
    expect(parts(parseDateText('03/04/2024', 'en-US', 'date'))).toEqual([
      2024, 3, 4, 0, 0,
    ]);
    expect(parts(parseDateText('03/04/2024', 'en-GB', 'date'))).toEqual([
      2024, 4, 3, 0, 0,
    ]);
  });

  it('accepts any separator the user types', () => {
    for (const text of ['3-4-2024', '3.4.2024', '3 4 2024']) {
      expect(parts(parseDateText(text, 'en-US', 'date'))).toEqual([
        2024, 3, 4, 0, 0,
      ]);
    }
  });

  it('reads a two-digit year on the 50-year pivot', () => {
    expect(parseDateText('3/4/24', 'en-US', 'date')?.getFullYear()).toBe(2024);
    expect(parseDateText('3/4/99', 'en-US', 'date')?.getFullYear()).toBe(1999);
    expect(parseDateText('3/4/49', 'en-US', 'date')?.getFullYear()).toBe(2049);
    expect(parseDateText('3/4/50', 'en-US', 'date')?.getFullYear()).toBe(1950);
  });

  it('falls back to the reference year when the year is omitted', () => {
    const reference = new Date(2019, 0, 1);
    expect(
      parseDateText('3/4', 'en-US', 'date', reference)?.getFullYear(),
    ).toBe(2019);
  });

  it('reads a lone number as a day of the reference month', () => {
    const reference = new Date(2019, 5, 20);
    expect(parts(parseDateText('7', 'en-US', 'date', reference))).toEqual([
      2019, 6, 7, 0, 0,
    ]);
  });

  it('matches the locale month names, long and short, case-folded', () => {
    expect(parts(parseDateText('15 March 2024', 'en-US', 'date'))).toEqual([
      2024, 3, 15, 0, 0,
    ]);
    expect(parts(parseDateText('15 mar 2024', 'en-US', 'date'))).toEqual([
      2024, 3, 15, 0, 0,
    ]);
    expect(parts(parseDateText('15 März 2024', 'de-DE', 'date'))).toEqual([
      2024, 3, 15, 0, 0,
    ]);
  });

  it('builds a LOCAL date — never a UTC-shifted Date.parse result', () => {
    const date = parseDateText('3/4/2024', 'en-US', 'date');
    expect(date?.getHours()).toBe(0);
    expect(date?.getDate()).toBe(4);
  });

  it('rejects an overflowed day instead of silently rolling into next month', () => {
    expect(parseDateText('2/30/2024', 'en-US', 'date')).toBe(null);
    expect(parts(parseDateText('2/29/2024', 'en-US', 'date'))).toEqual([
      2024, 2, 29, 0, 0,
    ]); // a real leap day still parses
  });

  it('rejects out-of-range parts', () => {
    expect(parseDateText('13/4/2024', 'en-US', 'date')).toBe(null);
    expect(parseDateText('1/32/2024', 'en-US', 'date')).toBe(null);
  });

  it('yields null for empty or unreadable text rather than a wrong date', () => {
    expect(parseDateText('', 'en-US', 'date')).toBe(null);
    expect(parseDateText('   ', 'en-US', 'date')).toBe(null);
    expect(parseDateText('tomorrow', 'en-US', 'date')).toBe(null);
    expect(parseDateText('12 xyz 2024', 'en-US', 'date')).toBe(null);
  });
});

describe('parseDateText — times', () => {
  const reference = new Date(2019, 5, 20, 8, 15);

  it('reads HH:MM onto the reference day', () => {
    expect(parts(parseDateText('14:30', 'en-GB', 'time', reference))).toEqual([
      2019, 6, 20, 14, 30,
    ]);
  });

  it('applies the locale day period', () => {
    expect(parts(parseDateText('2:30 PM', 'en-US', 'time', reference))).toEqual(
      [2019, 6, 20, 14, 30],
    );
    expect(
      parts(parseDateText('12:30 AM', 'en-US', 'time', reference)),
    ).toEqual([2019, 6, 20, 0, 30]);
    expect(
      parts(parseDateText('12:30 PM', 'en-US', 'time', reference)),
    ).toEqual([2019, 6, 20, 12, 30]);
  });

  it('accepts the bare latin am/pm even where the locale writes something else', () => {
    expect(parts(parseDateText('2:30 pm', 'de-DE', 'time', reference))).toEqual(
      [2019, 6, 20, 14, 30],
    );
  });

  it('reads a bare hour as a whole hour', () => {
    expect(parts(parseDateText('9', 'en-GB', 'time', reference))).toEqual([
      2019, 6, 20, 9, 0,
    ]);
  });

  it('rejects out-of-range times', () => {
    expect(parseDateText('25:00', 'en-GB', 'time', reference)).toBe(null);
    expect(parseDateText('10:75', 'en-GB', 'time', reference)).toBe(null);
  });
});

describe('parseDateText — datetime', () => {
  it('splits the time chunk off the date digits', () => {
    expect(parts(parseDateText('3/4/2024 14:30', 'en-US', 'datetime'))).toEqual(
      [2024, 3, 4, 14, 30],
    );
    expect(parts(parseDateText('4/3/2024 14:30', 'en-GB', 'datetime'))).toEqual(
      [2024, 3, 4, 14, 30],
    );
  });

  it('keeps the day period out of the digit split', () => {
    expect(
      parts(parseDateText('3/4/2024 2:30 PM', 'en-US', 'datetime')),
    ).toEqual([2024, 3, 4, 14, 30]);
  });

  it('falls back to the reference time when only a date is typed', () => {
    const reference = new Date(2019, 5, 20, 8, 15);
    expect(
      parts(parseDateText('3/4/2024', 'en-US', 'datetime', reference)),
    ).toEqual([2024, 3, 4, 8, 15]);
  });
});
