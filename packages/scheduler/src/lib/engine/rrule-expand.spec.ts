import { parseRecurrenceException, parseRecurrenceRule } from './rrule';
import { appendException, expandRecurrence } from './rrule-expand';

function expand(
  rule: string,
  seriesStart: Date,
  rangeStart: Date,
  rangeEnd: Date,
  exceptions: readonly Date[] = [],
): Date[] {
  const parsed = parseRecurrenceRule(rule);
  if (parsed === null) throw new Error(`bad rule ${rule}`);
  return expandRecurrence(parsed, seriesStart, rangeStart, rangeEnd, exceptions);
}

describe('rrule-expand', () => {
  const start = new Date(2026, 7, 3, 9, 30); // Monday Aug 3, 09:30

  it('expands DAILY with INTERVAL inside the window', () => {
    const dates = expand(
      'FREQ=DAILY;INTERVAL=2',
      start,
      new Date(2026, 7, 3),
      new Date(2026, 7, 10),
    );
    expect(dates).toEqual([
      new Date(2026, 7, 3, 9, 30),
      new Date(2026, 7, 5, 9, 30),
      new Date(2026, 7, 7, 9, 30),
      new Date(2026, 7, 9, 9, 30),
    ]);
  });

  it('honors COUNT from the series start even for later windows', () => {
    const dates = expand(
      'FREQ=DAILY;COUNT=5',
      start,
      new Date(2026, 7, 6),
      new Date(2026, 7, 20),
    );
    // occurrences 1–5 are Aug 3..7; the window sees only 6 and 7
    expect(dates).toEqual([
      new Date(2026, 7, 6, 9, 30),
      new Date(2026, 7, 7, 9, 30),
    ]);
  });

  it('honors UNTIL inclusively', () => {
    const dates = expand(
      'FREQ=DAILY;UNTIL=20260805T235959',
      start,
      new Date(2026, 7, 1),
      new Date(2026, 7, 31),
    );
    expect(dates).toHaveLength(3); // 3rd, 4th, 5th
  });

  it('expands WEEKLY BYDAY across the week, filtering pre-start days', () => {
    const dates = expand(
      'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      new Date(2026, 7, 5, 14), // series starts Wednesday
      new Date(2026, 7, 3),
      new Date(2026, 7, 15),
    );
    // week 1: We 5, Fr 7 (Mo 3 precedes the series start); week 2: Mo 10, We 12, Fr 14
    expect(dates).toEqual([
      new Date(2026, 7, 5, 14),
      new Date(2026, 7, 7, 14),
      new Date(2026, 7, 10, 14),
      new Date(2026, 7, 12, 14),
      new Date(2026, 7, 14, 14),
    ]);
  });

  it('does not lose early-week candidates at the window edge', () => {
    // anchor weekday is Friday; the following week's Monday must still appear
    const dates = expand(
      'FREQ=WEEKLY;BYDAY=MO,FR',
      new Date(2026, 7, 7, 8), // Friday
      new Date(2026, 7, 9),
      new Date(2026, 7, 11), // window covers only Mon Aug 10
    );
    expect(dates).toEqual([new Date(2026, 7, 10, 8)]);
  });

  it('expands MONTHLY BYMONTHDAY incl. -1 and skips short months', () => {
    const dates = expand(
      'FREQ=MONTHLY;BYMONTHDAY=31,-1',
      new Date(2026, 0, 31, 12),
      new Date(2026, 0, 1),
      new Date(2026, 3, 1),
    );
    // Jan: 31 (twice deduped? no — 31 and last are both Jan 31 → two stamps same minute)
    expect(dates.map((d) => `${d.getMonth()}-${d.getDate()}`)).toEqual([
      '0-31',
      '0-31',
      '1-28',
      '2-31',
      '2-31',
    ]);
  });

  it('expands MONTHLY ordinal BYDAY (2TU, -1FR)', () => {
    const second = expand(
      'FREQ=MONTHLY;BYDAY=2TU',
      new Date(2026, 7, 11, 10), // 2nd Tuesday of Aug 2026
      new Date(2026, 7, 1),
      new Date(2026, 9, 1),
    );
    expect(second).toEqual([
      new Date(2026, 7, 11, 10),
      new Date(2026, 8, 8, 10),
    ]);
    const last = expand(
      'FREQ=MONTHLY;BYDAY=-1FR',
      new Date(2026, 7, 28, 16), // last Friday of Aug 2026
      new Date(2026, 7, 1),
      new Date(2026, 9, 1),
    );
    expect(last).toEqual([
      new Date(2026, 7, 28, 16),
      new Date(2026, 8, 25, 16),
    ]);
  });

  it('expands YEARLY BYMONTH+BYMONTHDAY', () => {
    const dates = expand(
      'FREQ=YEARLY;BYMONTHDAY=17;BYMONTH=3',
      new Date(2026, 2, 17, 9),
      new Date(2026, 0, 1),
      new Date(2028, 0, 1),
    );
    expect(dates).toEqual([
      new Date(2026, 2, 17, 9),
      new Date(2027, 2, 17, 9),
    ]);
  });

  it('skips exceptions (exact-minute and date-only stamps)', () => {
    const exceptions = parseRecurrenceException('20260805T093000,20260807');
    const dates = expand(
      'FREQ=DAILY',
      start,
      new Date(2026, 7, 3),
      new Date(2026, 7, 9),
      exceptions,
    );
    expect(dates).toEqual([
      new Date(2026, 7, 3, 9, 30),
      new Date(2026, 7, 4, 9, 30),
      new Date(2026, 7, 6, 9, 30),
      new Date(2026, 7, 8, 9, 30),
    ]);
  });

  it('appendException builds a comma-separated EXDATE list', () => {
    const first = appendException(undefined, new Date(2026, 7, 5, 9, 30));
    expect(first).toBe('20260805T093000');
    const second = appendException(first, new Date(2026, 7, 12, 9, 30));
    expect(second).toBe('20260805T093000,20260812T093000');
    expect(parseRecurrenceException(second)).toHaveLength(2);
  });

  it('caps runaway series', () => {
    const dates = expand(
      'FREQ=DAILY',
      start,
      new Date(2026, 7, 3),
      new Date(2036, 7, 3),
    );
    expect(dates.length).toBeLessThanOrEqual(1000);
  });
});
