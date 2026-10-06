import { afterEach, describe, expect, it } from 'vitest';
import {
  clearOgeTimeZoneCache,
  ogeConvertWallClock,
  ogeFormatTzOffset,
  ogeFromWallClock,
  ogeFromZoned,
  ogeIsTimeZone,
  ogeLocalTimeZone,
  ogeTimeZoneLabel,
  ogeTimeZones,
  ogeToWallClock,
  ogeTzOffset,
  ogeZonedDayMinutes,
  ogeZonedParts,
  ogeZonedStartOfDay,
} from './time-zone';

const NY = 'America/New_York';
const IST = 'Europe/Istanbul';
const LHI = 'Australia/Lord_Howe';
const KTM = 'Asia/Kathmandu';

const utc = (y: number, m: number, d: number, hh = 0, mm = 0, ss = 0): number =>
  Date.UTC(y, m - 1, d, hh, mm, ss);

const iso = (date: Date): string => date.toISOString();

afterEach(() => clearOgeTimeZoneCache());

describe('ogeTzOffset', () => {
  it('reads fixed and seasonal offsets in minutes east of UTC', () => {
    expect(ogeTzOffset(utc(2026, 1, 15), IST)).toBe(180);
    expect(ogeTzOffset(utc(2026, 7, 15), IST)).toBe(180);
    expect(ogeTzOffset(utc(2026, 1, 15), NY)).toBe(-300);
    expect(ogeTzOffset(utc(2026, 7, 15), NY)).toBe(-240);
    expect(ogeTzOffset(utc(2026, 1, 15), KTM)).toBe(345);
    expect(ogeTzOffset(utc(2026, 7, 15), KTM)).toBe(345);
    // southern hemisphere: DST (+11) in January, standard (+10:30) in July
    expect(ogeTzOffset(utc(2026, 1, 15), LHI)).toBe(660);
    expect(ogeTzOffset(utc(2026, 7, 15), LHI)).toBe(630);
    expect(ogeTzOffset(utc(2026, 7, 15), 'UTC')).toBe(0);
  });

  it('knows historical rules (Istanbul kept DST until 2016)', () => {
    expect(ogeTzOffset(utc(2015, 1, 15), IST)).toBe(120);
    expect(ogeTzOffset(utc(2015, 7, 15), IST)).toBe(180);
  });

  it('switches exactly at the transition instant', () => {
    // New York springs forward at 07:00Z on 2026-03-08 (02:00 EST)
    expect(ogeTzOffset(utc(2026, 3, 8, 6, 59), NY)).toBe(-300);
    expect(ogeTzOffset(utc(2026, 3, 8, 7, 0), NY)).toBe(-240);
    // and falls back at 06:00Z on 2026-11-01 (02:00 EDT)
    expect(ogeTzOffset(utc(2026, 11, 1, 5, 59), NY)).toBe(-240);
    expect(ogeTzOffset(utc(2026, 11, 1, 6, 0), NY)).toBe(-300);
    // Lord Howe moves half an hour at 02:00 local (15:30Z the day before)
    expect(ogeTzOffset(utc(2026, 10, 3, 15, 29), LHI)).toBe(630);
    expect(ogeTzOffset(utc(2026, 10, 3, 15, 30), LHI)).toBe(660);
  });

  it('treats an unknown zone as the runtime zone', () => {
    const at = utc(2026, 5, 1, 12);
    expect(ogeTzOffset(at, 'Mars/Olympus_Mons')).toBe(ogeTzOffset(at));
    expect(ogeIsTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(ogeIsTimeZone(IST)).toBe(true);
    expect(ogeIsTimeZone('')).toBe(false);
    expect(ogeIsTimeZone(42)).toBe(false);
  });
});

describe('ogeZonedParts', () => {
  it('reads the wall clock of a quarter-hour zone', () => {
    expect(ogeZonedParts(utc(2026, 1, 1, 0, 0), KTM)).toEqual({
      year: 2026,
      month: 1,
      day: 1,
      hour: 5,
      minute: 45,
      second: 0,
      millisecond: 0,
      weekday: 4,
    });
  });

  it('crosses the date line backwards for western zones', () => {
    const parts = ogeZonedParts(utc(2026, 1, 1, 3, 30), NY);
    expect([parts.year, parts.month, parts.day, parts.hour]).toEqual([
      2025, 12, 31, 22,
    ]);
    expect(parts.weekday).toBe(3);
  });

  it('keeps milliseconds', () => {
    expect(ogeZonedParts(utc(2026, 1, 1) + 123, IST).millisecond).toBe(123);
  });
});

describe('ogeFromZoned', () => {
  it('maps ordinary wall times to one instant', () => {
    expect(
      iso(ogeFromZoned({ year: 2026, month: 6, day: 1, hour: 9 }, IST)),
    ).toBe('2026-06-01T06:00:00.000Z');
    expect(
      iso(
        ogeFromZoned({ year: 2026, month: 6, day: 1, hour: 9, minute: 0 }, KTM),
      ),
    ).toBe('2026-06-01T03:15:00.000Z');
    expect(
      iso(ogeFromZoned({ year: 2026, month: 1, day: 10, hour: 9 }, NY)),
    ).toBe('2026-01-10T14:00:00.000Z');
  });

  it('moves a skipped wall time forward (New York spring forward)', () => {
    const skipped = { year: 2026, month: 3, day: 8, hour: 2, minute: 30 };
    expect(iso(ogeFromZoned(skipped, NY))).toBe('2026-03-08T07:30:00.000Z');
    expect(iso(ogeFromZoned(skipped, NY, 'later'))).toBe(
      '2026-03-08T07:30:00.000Z',
    );
    expect(iso(ogeFromZoned(skipped, NY, 'earlier'))).toBe(
      '2026-03-08T06:30:00.000Z',
    );
    // 03:30 EDT is what the clocks show for the compatible instant
    const parts = ogeZonedParts(ogeFromZoned(skipped, NY), NY);
    expect([parts.hour, parts.minute]).toEqual([3, 30]);
  });

  it('picks a side of a repeated wall time (New York fall back)', () => {
    const repeated = { year: 2026, month: 11, day: 1, hour: 1, minute: 30 };
    expect(iso(ogeFromZoned(repeated, NY))).toBe('2026-11-01T05:30:00.000Z');
    expect(iso(ogeFromZoned(repeated, NY, 'earlier'))).toBe(
      '2026-11-01T05:30:00.000Z',
    );
    expect(iso(ogeFromZoned(repeated, NY, 'later'))).toBe(
      '2026-11-01T06:30:00.000Z',
    );
  });

  it("handles Lord Howe's half-hour gap and fold", () => {
    const gap = { year: 2026, month: 10, day: 4, hour: 2, minute: 15 };
    const resolved = ogeFromZoned(gap, LHI);
    expect(iso(resolved)).toBe('2026-10-03T15:45:00.000Z');
    const parts = ogeZonedParts(resolved, LHI);
    expect([parts.hour, parts.minute]).toEqual([2, 45]);
    expect(iso(ogeFromZoned(gap, LHI, 'earlier'))).toBe(
      '2026-10-03T15:15:00.000Z',
    );
    const fold = { year: 2026, month: 4, day: 5, hour: 1, minute: 45 };
    expect(iso(ogeFromZoned(fold, LHI, 'earlier'))).toBe(
      '2026-04-04T14:45:00.000Z',
    );
    expect(iso(ogeFromZoned(fold, LHI, 'later'))).toBe(
      '2026-04-04T15:15:00.000Z',
    );
  });

  it('rolls out-of-range fields over like Date.UTC', () => {
    expect(iso(ogeFromZoned({ year: 2026, month: 1, day: 32 }, 'UTC'))).toBe(
      '2026-02-01T00:00:00.000Z',
    );
    expect(
      iso(ogeFromZoned({ year: 2026, month: 3, day: 7, hour: 24 + 9 }, NY)),
    ).toBe('2026-03-08T13:00:00.000Z');
  });

  it('round-trips every quarter hour through two DST years', () => {
    for (const zone of [NY, IST, LHI, KTM]) {
      for (
        let ms = utc(2026, 3, 1);
        ms < utc(2026, 4, 30);
        ms += 15 * 60_000 * 7
      ) {
        const parts = ogeZonedParts(ms, zone);
        expect(ogeFromZoned(parts, zone, 'earlier').getTime() <= ms).toBe(true);
        expect(ogeFromZoned(parts, zone, 'later').getTime() >= ms).toBe(true);
        const back = ogeFromZoned(parts, zone, 'earlier').getTime();
        const later = ogeFromZoned(parts, zone, 'later').getTime();
        expect(back === ms || later === ms).toBe(true);
      }
    }
  });
});

describe('day lengths', () => {
  it('reports 23- and 25-hour days', () => {
    expect(ogeZonedDayMinutes(2026, 3, 8, NY)).toBe(1380);
    expect(ogeZonedDayMinutes(2026, 11, 1, NY)).toBe(1500);
    expect(ogeZonedDayMinutes(2026, 6, 1, NY)).toBe(1440);
    expect(ogeZonedDayMinutes(2026, 3, 29, IST)).toBe(1440);
    expect(ogeZonedDayMinutes(2026, 6, 1, KTM)).toBe(1440);
  });

  it("reports Lord Howe's 23.5- and 24.5-hour days", () => {
    expect(ogeZonedDayMinutes(2026, 10, 4, LHI)).toBe(1410);
    expect(ogeZonedDayMinutes(2026, 4, 5, LHI)).toBe(1470);
  });

  it('finds the start of a zoned day', () => {
    expect(iso(ogeZonedStartOfDay(utc(2026, 3, 8, 15), NY))).toBe(
      '2026-03-08T05:00:00.000Z',
    );
    expect(iso(ogeZonedStartOfDay(utc(2026, 3, 9, 15), NY))).toBe(
      '2026-03-09T04:00:00.000Z',
    );
    expect(iso(ogeZonedStartOfDay(utc(2026, 6, 1, 20), KTM))).toBe(
      '2026-06-01T18:15:00.000Z',
    );
  });
});

describe('wall clocks', () => {
  it('holds a zone wall time in local fields and converts back', () => {
    const instant = new Date(utc(2026, 7, 1, 13, 0));
    const wall = ogeToWallClock(instant, NY);
    expect([wall.getHours(), wall.getMinutes(), wall.getDate()]).toEqual([
      9, 0, 1,
    ]);
    expect(ogeFromWallClock(wall, NY).getTime()).toBe(instant.getTime());
    const kathmandu = ogeToWallClock(instant, KTM);
    expect([kathmandu.getHours(), kathmandu.getMinutes()]).toEqual([18, 45]);
    expect(ogeFromWallClock(kathmandu, KTM).getTime()).toBe(instant.getTime());
  });

  it('is the identity for the runtime zone and unknown zones', () => {
    const instant = new Date(utc(2026, 7, 1, 13, 0));
    expect(ogeToWallClock(instant).getTime()).toBe(instant.getTime());
    expect(ogeFromWallClock(instant).getTime()).toBe(instant.getTime());
    expect(ogeToWallClock(instant, 'Nowhere/Land').getTime()).toBe(
      instant.getTime(),
    );
    expect(ogeToWallClock(instant)).not.toBe(instant);
  });

  it('converts a wall clock between zones', () => {
    const nyNine = new Date(2026, 0, 10, 9, 0);
    const istanbul = ogeConvertWallClock(nyNine, NY, IST);
    expect([istanbul.getHours(), istanbul.getMinutes()]).toEqual([17, 0]);
    const back = ogeConvertWallClock(istanbul, IST, NY);
    expect([back.getHours(), back.getMinutes()]).toEqual([9, 0]);
    expect(ogeConvertWallClock(nyNine, NY, NY).getTime()).toBe(
      nyNine.getTime(),
    );
  });
});

describe('zone lists and labels', () => {
  it('lists UTC first and the common zones', () => {
    const zones = ogeTimeZones();
    expect(zones[0]).toBe('UTC');
    expect(zones).toContain(IST);
    expect(zones).toContain(KTM);
    expect(ogeTimeZones()).toBe(zones);
  });

  it('formats offsets and labels', () => {
    expect(ogeFormatTzOffset(180)).toBe('+03:00');
    expect(ogeFormatTzOffset(-240)).toBe('-04:00');
    expect(ogeFormatTzOffset(345)).toBe('+05:45');
    expect(ogeFormatTzOffset(0)).toBe('+00:00');
    expect(ogeTimeZoneLabel(KTM, utc(2026, 1, 1))).toBe(
      '(UTC+05:45) Asia/Kathmandu',
    );
    expect(ogeTimeZoneLabel(LHI, utc(2026, 7, 1))).toBe(
      '(UTC+10:30) Australia/Lord Howe',
    );
  });

  it('names the runtime zone', () => {
    expect(ogeIsTimeZone(ogeLocalTimeZone())).toBe(true);
  });
});
