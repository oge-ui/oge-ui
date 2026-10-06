import {
  parseRecurrenceException,
  parseRecurrenceRule,
  serializeRecurrenceRule,
} from './rrule';

describe('rrule', () => {
  describe('parseRecurrenceRule', () => {
    it('parses the minimal rule with defaults', () => {
      expect(parseRecurrenceRule('FREQ=DAILY')).toEqual({
        freq: 'daily',
        interval: 1,
        weekStart: 1,
      });
    });

    it('accepts the RRULE: prefix and lowercase input', () => {
      expect(parseRecurrenceRule('RRULE:freq=weekly;interval=2')).toEqual({
        freq: 'weekly',
        interval: 2,
        weekStart: 1,
      });
    });

    it('parses COUNT and UNTIL (date, local date-time, Z read as UTC)', () => {
      expect(parseRecurrenceRule('FREQ=DAILY;COUNT=10')?.count).toBe(10);
      expect(parseRecurrenceRule('FREQ=DAILY;UNTIL=20261231')?.until).toEqual(
        new Date(2026, 11, 31, 23, 59, 59),
      );
      expect(
        parseRecurrenceRule('FREQ=DAILY;UNTIL=20261231T140000Z')?.until,
      ).toEqual(new Date(Date.UTC(2026, 11, 31, 14, 0, 0)));
      expect(
        parseRecurrenceRule('FREQ=DAILY;UNTIL=20261231T140000')?.until,
      ).toEqual(new Date(2026, 11, 31, 14, 0, 0));
    });

    it('parses BYHOUR, BYMINUTE and BYSETPOS', () => {
      const rule = parseRecurrenceRule(
        'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1;BYHOUR=9,17;BYMINUTE=0,30',
      );
      expect(rule?.bySetPos).toEqual([-1]);
      expect(rule?.byHour).toEqual([9, 17]);
      expect(rule?.byMinute).toEqual([0, 30]);
      expect(parseRecurrenceRule('FREQ=DAILY;BYHOUR=24')).toBeNull();
      expect(parseRecurrenceRule('FREQ=DAILY;BYMINUTE=60')).toBeNull();
      expect(parseRecurrenceRule('FREQ=MONTHLY;BYSETPOS=0')).toBeNull();
      expect(parseRecurrenceRule('FREQ=MONTHLY;BYSETPOS=367')).toBeNull();
      expect(parseRecurrenceRule('FREQ=MONTHLY;BYSETPOS=+2')?.bySetPos).toEqual(
        [2],
      );
    });

    it('parses an iCalendar block with DTSTART, RDATE and EXDATE lines', () => {
      const rule = parseRecurrenceRule(
        [
          'DTSTART:20260803T093000Z',
          'RRULE:FREQ=WEEKLY;BYDAY=MO',
          'RDATE:20260805T093000,20260806',
          'EXDATE;VALUE=DATE:20260810',
        ].join('\r\n'),
      );
      expect(rule?.freq).toBe('weekly');
      expect(rule?.dtStart).toEqual(new Date(Date.UTC(2026, 7, 3, 9, 30)));
      expect(rule?.rDates).toEqual([
        new Date(2026, 7, 5, 9, 30),
        new Date(2026, 7, 6),
      ]);
      expect(rule?.exDates).toEqual([new Date(2026, 7, 10)]);
    });

    it('unfolds folded content lines and accepts a bare RRULE value line', () => {
      const rule = parseRecurrenceRule(
        'FREQ=DAILY;COU\n NT=3\nEXDATE:20260804T093000',
      );
      expect(rule?.count).toBe(3);
      expect(rule?.exDates).toEqual([new Date(2026, 7, 4, 9, 30)]);
    });

    it('rejects blocks it cannot fully honor', () => {
      // an unknown zone name cannot be converted
      expect(
        parseRecurrenceRule(
          'DTSTART;TZID=Mars/Olympus:20260803T093000\r\nRRULE:FREQ=DAILY',
        ),
      ).toBeNull();
      expect(
        parseRecurrenceRule('RRULE:FREQ=DAILY\r\nRRULE:FREQ=WEEKLY'),
      ).toBeNull();
      expect(
        parseRecurrenceRule('RRULE:FREQ=DAILY\r\nEXRULE:FREQ=WEEKLY'),
      ).toBeNull();
      expect(
        parseRecurrenceRule(
          'RRULE:FREQ=DAILY\r\nRDATE;VALUE=PERIOD:20260803T090000/PT1H',
        ),
      ).toBeNull();
      expect(parseRecurrenceRule('RDATE:20260803T090000')).toBeNull(); // no RRULE
      expect(
        parseRecurrenceRule('RRULE:FREQ=DAILY\r\nRDATE:garbage'),
      ).toBeNull();
    });

    it('rejects COUNT together with UNTIL (xor per RFC)', () => {
      expect(
        parseRecurrenceRule('FREQ=DAILY;COUNT=3;UNTIL=20261231'),
      ).toBeNull();
    });

    it('parses BYDAY plain weekdays for WEEKLY', () => {
      expect(parseRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')?.byDay).toEqual([
        { ordinal: null, weekday: 1 },
        { ordinal: null, weekday: 3 },
        { ordinal: null, weekday: 5 },
      ]);
    });

    it('parses ordinal BYDAY for MONTHLY and rejects it for WEEKLY', () => {
      expect(parseRecurrenceRule('FREQ=MONTHLY;BYDAY=2TU')?.byDay).toEqual([
        { ordinal: 2, weekday: 2 },
      ]);
      expect(parseRecurrenceRule('FREQ=MONTHLY;BYDAY=-1FR')?.byDay).toEqual([
        { ordinal: -1, weekday: 5 },
      ]);
      expect(parseRecurrenceRule('FREQ=WEEKLY;BYDAY=2TU')).toBeNull();
    });

    it('parses BYMONTHDAY (incl. -1) and BYMONTH', () => {
      expect(
        parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=1,15,-1')?.byMonthDay,
      ).toEqual([1, 15, -1]);
      expect(
        parseRecurrenceRule('FREQ=YEARLY;BYMONTH=3,9;BYMONTHDAY=1')?.byMonth,
      ).toEqual([3, 9]);
      expect(parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=0')).toBeNull();
      expect(parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=-2')).toBeNull();
      expect(parseRecurrenceRule('FREQ=YEARLY;BYMONTH=13')).toBeNull();
    });

    it('parses WKST', () => {
      expect(parseRecurrenceRule('FREQ=WEEKLY;WKST=SU')?.weekStart).toBe(0);
    });

    it('rejects unsupported frequencies and parts entirely', () => {
      expect(parseRecurrenceRule('FREQ=HOURLY')).toBeNull();
      expect(parseRecurrenceRule('FREQ=MINUTELY')).toBeNull();
      expect(parseRecurrenceRule('FREQ=DAILY;BYSECOND=9')).toBeNull();
      expect(parseRecurrenceRule('FREQ=DAILY;BYYEARDAY=100')).toBeNull();
      expect(parseRecurrenceRule('FREQ=DAILY;BYWEEKNO=20')).toBeNull();
    });

    it('rejects malformed input', () => {
      expect(parseRecurrenceRule('')).toBeNull();
      expect(parseRecurrenceRule('INTERVAL=2')).toBeNull(); // FREQ required
      expect(parseRecurrenceRule('FREQ=DAILY;')).toBeNull();
      expect(parseRecurrenceRule('FREQ=DAILY;INTERVAL=0')).toBeNull();
      expect(parseRecurrenceRule('FREQ=DAILY;COUNT=abc')).toBeNull();
      expect(parseRecurrenceRule('FREQ=DAILY;UNTIL=2026-12-31')).toBeNull();
      expect(parseRecurrenceRule('FREQ=WEEKLY;BYDAY=XX')).toBeNull();
    });
  });

  it('serialize ↔ parse round-trips', () => {
    const rules = [
      'FREQ=DAILY',
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR',
      'FREQ=MONTHLY;COUNT=12;BYDAY=2TU',
      'FREQ=MONTHLY;BYMONTHDAY=1,15,-1',
      'FREQ=YEARLY;BYMONTHDAY=17;BYMONTH=3;WKST=SU',
      'FREQ=DAILY;UNTIL=20261231T235959',
      'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9;BYMINUTE=15;BYSETPOS=-1',
      'FREQ=WEEKLY;BYDAY=MO\nDTSTART:20260803T093000\nRDATE:20260805T093000\nEXDATE:20260810T093000',
    ];
    for (const text of rules) {
      const parsed = parseRecurrenceRule(text);
      if (parsed === null) throw new Error(`failed to parse ${text}`);
      expect(serializeRecurrenceRule(parsed)).toBe(text);
      // and the serialized form parses back to the same model
      expect(parseRecurrenceRule(serializeRecurrenceRule(parsed))).toEqual(
        parsed,
      );
    }
  });

  it('parseRecurrenceException reads local stamps and Z stamps as UTC', () => {
    expect(
      parseRecurrenceException('20260806T090000,20260813T090000Z'),
    ).toEqual([new Date(2026, 7, 6, 9), new Date(Date.UTC(2026, 7, 13, 9))]);
    expect(parseRecurrenceException('20260806')).toEqual([
      new Date(2026, 7, 6),
    ]);
    // invalid entries are skipped, not fatal
    expect(parseRecurrenceException('garbage,20260806T090000')).toEqual([
      new Date(2026, 7, 6, 9),
    ]);
    expect(parseRecurrenceException('')).toEqual([]);
  });
});
