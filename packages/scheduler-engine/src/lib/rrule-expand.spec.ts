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
  return expandRecurrence(
    parsed,
    seriesStart,
    rangeStart,
    rangeEnd,
    exceptions,
  );
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
    // Jan: 31 and "last" are both Jan 31 — the recurrence SET holds it once
    expect(dates.map((d) => `${d.getMonth()}-${d.getDate()}`)).toEqual([
      '0-31',
      '1-28',
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
    expect(dates).toEqual([new Date(2026, 2, 17, 9), new Date(2027, 2, 17, 9)]);
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

  it('ends at a Z-suffixed UNTIL read as UTC', () => {
    const until = new Date(Date.UTC(2026, 7, 5, 12, 0, 0));
    const dates = expand(
      'FREQ=DAILY;UNTIL=20260805T120000Z',
      start,
      new Date(2026, 7, 1),
      new Date(2026, 7, 31),
    );
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every((d) => d.getTime() <= until.getTime())).toBe(true);
    const next = new Date(dates[dates.length - 1]);
    next.setDate(next.getDate() + 1);
    expect(next.getTime()).toBeGreaterThan(until.getTime());
  });

  it('expands plain MONTHLY BYDAY to every such weekday', () => {
    const dates = expand(
      'FREQ=MONTHLY;BYDAY=MO',
      start, // Mon Aug 3
      new Date(2026, 7, 1),
      new Date(2026, 8, 1),
    );
    expect(dates.map((d) => d.getDate())).toEqual([3, 10, 17, 24, 31]);
  });

  it('BYSETPOS picks positions within each period (last workday of month)', () => {
    const dates = expand(
      'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
      new Date(2026, 6, 31, 9), // Fri Jul 31 2026
      new Date(2026, 6, 1),
      new Date(2026, 9, 1),
    );
    expect(dates).toEqual([
      new Date(2026, 6, 31, 9),
      new Date(2026, 7, 31, 9), // Mon Aug 31
      new Date(2026, 8, 30, 9), // Wed Sep 30
    ]);
    const firstAndThird = expand(
      'FREQ=MONTHLY;BYDAY=TU;BYSETPOS=1,3',
      new Date(2026, 7, 4, 9), // Tue Aug 4
      new Date(2026, 7, 1),
      new Date(2026, 8, 1),
    );
    expect(firstAndThird.map((d) => d.getDate())).toEqual([4, 18]);
  });

  it('BYHOUR / BYMINUTE fan each day out to the listed times', () => {
    const dates = expand(
      'FREQ=DAILY;BYHOUR=9,14;BYMINUTE=0,30;COUNT=6',
      new Date(2026, 7, 3, 9, 0),
      new Date(2026, 7, 1),
      new Date(2026, 7, 31),
    );
    expect(dates).toEqual([
      new Date(2026, 7, 3, 9, 0),
      new Date(2026, 7, 3, 9, 30),
      new Date(2026, 7, 3, 14, 0),
      new Date(2026, 7, 3, 14, 30),
      new Date(2026, 7, 4, 9, 0),
      new Date(2026, 7, 4, 9, 30),
    ]);
    const lastSlot = expand(
      'FREQ=WEEKLY;BYDAY=MO;BYHOUR=8,12,16;BYSETPOS=-1',
      new Date(2026, 7, 3, 8),
      new Date(2026, 7, 1),
      new Date(2026, 7, 15),
    );
    expect(lastSlot).toEqual([
      new Date(2026, 7, 3, 16),
      new Date(2026, 7, 10, 16),
    ]);
  });

  it('merges RDATE values and removes EXDATE lines', () => {
    const dates = expand(
      [
        'RRULE:FREQ=WEEKLY;BYDAY=MO',
        'RDATE:20260805T093000,20260803T093000',
        'EXDATE:20260810T093000',
      ].join('\n'),
      start,
      new Date(2026, 7, 1),
      new Date(2026, 7, 20),
      parseRecurrenceException('20260817'),
    );
    // Aug 3 (rule + duplicate RDATE once), Aug 5 (RDATE); 10 and 17 excluded
    expect(dates).toEqual([
      new Date(2026, 7, 3, 9, 30),
      new Date(2026, 7, 5, 9, 30),
    ]);
  });

  it('RDATE does not consume COUNT and respects the window', () => {
    const dates = expand(
      'FREQ=DAILY;COUNT=2\r\nRDATE:20260901T093000,20260720T093000',
      start,
      new Date(2026, 7, 1),
      new Date(2026, 8, 30),
    );
    expect(dates).toEqual([
      new Date(2026, 7, 3, 9, 30),
      new Date(2026, 7, 4, 9, 30),
      new Date(2026, 8, 1, 9, 30),
    ]);
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
