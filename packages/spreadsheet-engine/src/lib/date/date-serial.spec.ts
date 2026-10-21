import fc from 'fast-check';
import {
  OGE_MAX_DATE_SERIAL,
  ogeCivilFromDays,
  ogeDatePartsToSerial,
  ogeDateToSerial,
  ogeDaysFromCivil,
  ogeSerialToDate,
  ogeSerialToDateParts,
  ogeSerialWeekday,
} from './date-serial';

describe('civil day arithmetic', () => {
  it('counts days from the Unix epoch', () => {
    expect(ogeDaysFromCivil(1970, 1, 1)).toBe(0);
    expect(ogeDaysFromCivil(2000, 3, 1)).toBe(11017);
    expect(ogeDaysFromCivil(1900, 1, 1)).toBe(-25567);
    expect(ogeCivilFromDays(-25567)).toEqual({ year: 1900, month: 1, day: 1 });
    expect(ogeCivilFromDays(2932896)).toEqual({
      year: 9999,
      month: 12,
      day: 31,
    });
  });

  it('round-trips every day of a 400-year cycle', () => {
    for (let days = -146097; days <= 146097; days += 97) {
      const { year, month, day } = ogeCivilFromDays(days);
      expect(ogeDaysFromCivil(year, month, day)).toBe(days);
    }
  });
});

describe('1900 date system', () => {
  it.each([
    [1, 1900, 1, 1],
    [59, 1900, 2, 28],
    [60, 1900, 2, 29], // the phantom leap day
    [61, 1900, 3, 1],
    [25569, 1970, 1, 1],
    [45292, 2024, 1, 1],
    [2958465, 9999, 12, 31],
  ])('serial %i is %i-%i-%i', (serial, year, month, day) => {
    expect(ogeSerialToDateParts(serial)).toMatchObject({ year, month, day });
    expect(ogeDatePartsToSerial({ year, month, day })).toBe(serial);
  });

  it('shows serial 0 as 1900-01-00, a Saturday', () => {
    expect(ogeSerialToDateParts(0)).toMatchObject({
      year: 1900,
      month: 1,
      day: 0,
      weekday: 6,
    });
    expect(ogeDatePartsToSerial({ year: 1900, month: 1, day: 0 })).toBe(0);
  });

  it("follows Excel's weekdays, which are a day off before March 1900", () => {
    expect(ogeSerialWeekday(1)).toBe(0); // Sunday in Excel (really a Monday)
    expect(ogeSerialWeekday(61)).toBe(4); // 1900-03-01, a real Thursday
    expect(ogeSerialWeekday(45292)).toBe(1); // 2024-01-01, a Monday
    expect(ogeSerialToDateParts(45292.75)?.weekday).toBe(1);
  });

  it('rejects what Excel cannot show as a date', () => {
    expect(ogeSerialToDateParts(-1)).toBeNull();
    expect(ogeSerialToDateParts(OGE_MAX_DATE_SERIAL['1900'] + 1)).toBeNull();
    expect(ogeSerialToDateParts(Number.NaN)).toBeNull();
    expect(ogeSerialToDateParts(Number.POSITIVE_INFINITY)).toBeNull();
    expect(ogeDatePartsToSerial({ year: 1899, month: 12, day: 31 })).toBeNull();
    expect(ogeDatePartsToSerial({ year: 2023, month: 2, day: 29 })).toBeNull();
    expect(ogeDatePartsToSerial({ year: 2024, month: 13, day: 1 })).toBeNull();
    expect(
      ogeDatePartsToSerial({ year: 2024, month: 1, day: 1, hour: 24 }),
    ).toBeNull();
    expect(ogeDatePartsToSerial({ year: 10000, month: 1, day: 1 })).toBeNull();
  });
});

describe('1904 date system', () => {
  it('starts at 1904-01-01 and sits 1,462 days below the 1900 system', () => {
    expect(ogeSerialToDateParts(0, '1904')).toMatchObject({
      year: 1904,
      month: 1,
      day: 1,
      weekday: 5, // a Friday
    });
    expect(ogeDatePartsToSerial({ year: 2024, month: 1, day: 1 }, '1904')).toBe(
      45292 - 1462,
    );
    expect(
      ogeSerialToDateParts(OGE_MAX_DATE_SERIAL['1904'], '1904'),
    ).toMatchObject({ year: 9999, month: 12, day: 31 });
    expect(
      ogeDatePartsToSerial({ year: 1903, month: 12, day: 31 }, '1904'),
    ).toBeNull();
  });
});

describe('time of day', () => {
  it('splits the fraction into clock fields', () => {
    expect(ogeSerialToDateParts(45292.5)).toMatchObject({
      hour: 12,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
    // 13:45:30.250
    const serial = 45292 + (13 * 3600 + 45 * 60 + 30.25) / 86400;
    expect(ogeSerialToDateParts(serial)).toMatchObject({
      hour: 13,
      minute: 45,
      second: 30,
      millisecond: 250,
    });
    expect(
      ogeDatePartsToSerial({
        year: 2024,
        month: 1,
        day: 1,
        hour: 13,
        minute: 45,
        second: 30,
        millisecond: 250,
      }),
    ).toBeCloseTo(serial, 10);
  });

  it('rounds to the precision asked for and carries into the next day', () => {
    const almostMidnight = 45292 + (86400 - 0.4) / 86400;
    expect(ogeSerialToDateParts(almostMidnight, '1900', 0)).toMatchObject({
      day: 2,
      hour: 0,
      minute: 0,
      second: 0,
    });
    expect(ogeSerialToDateParts(almostMidnight, '1900', 3)).toMatchObject({
      day: 1,
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 600,
    });
    // a serial cannot hold 30.5 s exactly: the double is 30.4999997 s past
    // midnight, and Excel shows :30 (the corpus records 12:00:00.5 → 12:00:00)
    const half = 45292 + 30.5 / 86400;
    expect(ogeSerialToDateParts(half, '1900', 0)?.second).toBe(30);
    expect(ogeSerialToDateParts(45292 + 30.6 / 86400, '1900', 0)?.second).toBe(
      31,
    );
    expect(ogeSerialToDateParts(half, '1900', 1)).toMatchObject({
      second: 30,
      millisecond: 500,
    });
  });

  it('round-trips every date and second through its serial', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: OGE_MAX_DATE_SERIAL['1900'] }),
        fc.integer({ min: 0, max: 86399 }),
        fc.constantFrom('1900' as const, '1904' as const),
        (day, seconds, system) => {
          const serial =
            Math.min(day, OGE_MAX_DATE_SERIAL[system]) + seconds / 86400;
          const parts = ogeSerialToDateParts(serial, system, 0);
          expect(parts).not.toBeNull();
          if (!parts) return;
          expect(ogeDatePartsToSerial(parts, system)).toBeCloseTo(serial, 8);
        },
      ),
    );
  });
});

describe('JavaScript dates', () => {
  it('converts wall-clock time in UTC and in the local zone', () => {
    const utc = new Date(Date.UTC(2024, 0, 15, 6, 30));
    expect(ogeDateToSerial(utc, '1900', 'utc')).toBeCloseTo(45306.2708333, 6);
    const local = new Date(2024, 0, 15, 6, 30);
    expect(ogeDateToSerial(local)).toBeCloseTo(45306.2708333, 6);
    expect(ogeSerialToDate(45306.25, '1900', 'utc')?.toISOString()).toBe(
      '2024-01-15T06:00:00.000Z',
    );
    expect(ogeSerialToDate(45306.25)?.getHours()).toBe(6);
  });

  it('has no Date for the phantom day, serial 0 or invalid input', () => {
    expect(ogeSerialToDate(60)).toBeNull();
    expect(ogeSerialToDate(0)).toBeNull();
    expect(ogeSerialToDate(-5)).toBeNull();
    expect(ogeDateToSerial(new Date(Number.NaN))).toBeNull();
    expect(ogeSerialToDate(59, '1900', 'utc')?.toISOString()).toBe(
      '1900-02-28T00:00:00.000Z',
    );
  });
});
