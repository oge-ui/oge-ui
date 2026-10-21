/**
 * Excel date serials: days since the workbook's epoch, with the time of day
 * as the fraction.
 *
 * Two date systems exist (`workbookPr/@date1904`):
 *
 * - **1900** (the default): serial 1 is 1900-01-01. Excel inherited Lotus
 *   1-2-3's belief that 1900 was a leap year, so serial 60 is the phantom
 *   1900-02-29 and every serial below 61 is one day "late" against the real
 *   calendar. Serial 0 shows as `1900-01-00`. Weekdays follow Excel's own
 *   calendar, so serial 1 is a Sunday.
 * - **1904** (old Mac workbooks): serial 0 is 1904-01-01 — the same date is
 *   1,462 lower than in the 1900 system. No phantom day.
 *
 * Conversions use a pure civil-calendar algorithm (proleptic Gregorian), so
 * nothing here depends on the host's time zone or on `Date`'s range.
 */

/** Which epoch a workbook counts from (`date1904="1"` → `'1904'`). */
export type OgeDateSystem = '1900' | '1904';

/** A serial split into calendar and clock fields. */
export interface OgeDateParts {
  readonly year: number;
  /** 1–12. */
  readonly month: number;
  /** 1–31; 0 only for serial 0 in the 1900 system (`1900-01-00`). */
  readonly day: number;
  /** 0–23. */
  readonly hour: number;
  /** 0–59. */
  readonly minute: number;
  /** 0–59. */
  readonly second: number;
  /** 0–999, at the precision the serial was rounded to. */
  readonly millisecond: number;
  /** 0 = Sunday … 6 = Saturday, in Excel's calendar. */
  readonly weekday: number;
}

/** The calendar part of a date, plus an optional time of day. */
export interface OgeDateInput {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour?: number;
  readonly minute?: number;
  readonly second?: number;
  readonly millisecond?: number;
}

/** Last serial Excel shows as a date (9999-12-31) in each system. */
export const OGE_MAX_DATE_SERIAL: Readonly<Record<OgeDateSystem, number>> = {
  '1900': 2958465,
  '1904': 2957003,
};

/** Unix day number of serial 0, per system (1899-12-30 / 1904-01-01). */
const EPOCH_UNIX_DAYS: Readonly<Record<OgeDateSystem, number>> = {
  '1900': -25569,
  '1904': -24107,
};

const SECONDS_PER_DAY = 86400;

/** Days since 1970-01-01 for a proleptic Gregorian date (Hinnant's algorithm). */
export function ogeDaysFromCivil(
  year: number,
  month: number,
  day: number,
): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** The proleptic Gregorian date of a Unix day number. */
export function ogeCivilFromDays(days: number): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
} {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe -
      Math.floor(doe / 1460) +
      Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) /
      365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
}

/**
 * Splits a serial into date and time fields, rounding the time to
 * `fractionDigits` decimals of a second first (0 rounds to whole seconds, the
 * way Excel displays `h:mm:ss`; 3 keeps milliseconds). `null` for a serial
 * Excel cannot show as a date: negative, past 9999-12-31, or not finite.
 */
export function ogeSerialToDateParts(
  serial: number,
  system: OgeDateSystem = '1900',
  fractionDigits = 3,
): OgeDateParts | null {
  if (!Number.isFinite(serial) || serial < 0) return null;
  const digits = Math.max(0, Math.min(3, Math.trunc(fractionDigits)));
  const scale = 10 ** digits;
  const ticksPerDay = SECONDS_PER_DAY * scale;
  // the day and its fraction separately: `serial × 86400` loses the low
  // bits (45292.500005787 — 12:00:00.4999998 — would land on .5 exactly and
  // round up, where Excel shows 12:00:00)
  let dayNumber = Math.floor(serial);
  let rest = Math.round((serial - dayNumber) * ticksPerDay);
  if (rest >= ticksPerDay) {
    dayNumber++;
    rest -= ticksPerDay;
  }
  if (dayNumber > OGE_MAX_DATE_SERIAL[system]) return null;
  const sub = rest % scale;
  rest = (rest - sub) / scale;
  const second = rest % 60;
  rest = (rest - second) / 60;
  const minute = rest % 60;
  const hour = (rest - minute) / 60;
  const millisecond = Math.round(sub * (1000 / scale));
  const date = serialDayToCivil(dayNumber, system);
  return {
    ...date,
    hour,
    minute,
    second,
    millisecond,
    weekday: ogeSerialWeekday(dayNumber, system),
  };
}

/** Calendar date of a whole serial, with Excel's 1900 quirks. */
function serialDayToCivil(
  dayNumber: number,
  system: OgeDateSystem,
): { readonly year: number; readonly month: number; readonly day: number } {
  if (system === '1900') {
    if (dayNumber === 0) return { year: 1900, month: 1, day: 0 };
    if (dayNumber === 60) return { year: 1900, month: 2, day: 29 };
    // below the phantom day, serials run one day ahead of the real calendar
    if (dayNumber < 60)
      return ogeCivilFromDays(dayNumber + EPOCH_UNIX_DAYS['1900'] + 1);
  }
  return ogeCivilFromDays(dayNumber + EPOCH_UNIX_DAYS[system]);
}

/**
 * Day of the week of a serial (0 = Sunday), as Excel's `WEEKDAY` sees it: in
 * the 1900 system serial 1 (1900-01-01) is a Sunday, although that day was a
 * Monday — the leap-year bug shifts everything before 1900-03-01.
 */
export function ogeSerialWeekday(
  serial: number,
  system: OgeDateSystem = '1900',
): number {
  const day = Math.floor(serial);
  const offset = system === '1900' ? 6 : 5;
  return (((day + offset) % 7) + 7) % 7;
}

/**
 * The serial of a calendar date and time, or `null` for an impossible date.
 * Accepts Excel's two non-dates in the 1900 system: `1900-02-29` (60) and
 * `1900-01-00` (0).
 */
export function ogeDatePartsToSerial(
  input: OgeDateInput,
  system: OgeDateSystem = '1900',
): number | null {
  const { year, month, day } = input;
  const hour = input.hour ?? 0;
  const minute = input.minute ?? 0;
  const second = input.second ?? 0;
  const millisecond = input.millisecond ?? 0;
  if (
    ![year, month, day, hour, minute, second, millisecond].every(
      Number.isInteger,
    ) ||
    month < 1 ||
    month > 12 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59 ||
    millisecond < 0 ||
    millisecond > 999
  ) {
    return null;
  }
  let dayNumber: number;
  if (system === '1900' && year === 1900 && month === 1 && day === 0) {
    dayNumber = 0;
  } else if (system === '1900' && year === 1900 && month === 2 && day === 29) {
    dayNumber = 60;
  } else {
    if (day < 1 || day > daysInMonth(year, month)) return null;
    dayNumber = ogeDaysFromCivil(year, month, day) - EPOCH_UNIX_DAYS[system];
    if (system === '1900') {
      if (dayNumber < 2) return null; // before 1900-01-01
      // below the phantom 1900-02-29 every serial is one lower than the count
      if (dayNumber < 61) dayNumber -= 1;
    }
  }
  if (dayNumber < 0 || dayNumber > OGE_MAX_DATE_SERIAL[system]) return null;
  const time = ((hour * 60 + minute) * 60 + second) * 1000 + millisecond;
  return dayNumber + time / (SECONDS_PER_DAY * 1000);
}

/**
 * Where a JavaScript `Date` (an instant) is read as wall-clock time: the
 * host's zone (`'local'`, what a user typed into a date picker) or UTC.
 */
export type OgeDateZone = 'local' | 'utc';

/** The serial of a JavaScript `Date`, read in `zone`; `null` outside Excel's range. */
export function ogeDateToSerial(
  date: Date,
  system: OgeDateSystem = '1900',
  zone: OgeDateZone = 'local',
): number | null {
  if (Number.isNaN(date.getTime())) return null;
  const utc = zone === 'utc';
  return ogeDatePartsToSerial(
    {
      year: utc ? date.getUTCFullYear() : date.getFullYear(),
      month: (utc ? date.getUTCMonth() : date.getMonth()) + 1,
      day: utc ? date.getUTCDate() : date.getDate(),
      hour: utc ? date.getUTCHours() : date.getHours(),
      minute: utc ? date.getUTCMinutes() : date.getMinutes(),
      second: utc ? date.getUTCSeconds() : date.getSeconds(),
      millisecond: utc ? date.getUTCMilliseconds() : date.getMilliseconds(),
    },
    system,
  );
}

/**
 * A JavaScript `Date` for a serial, built as wall-clock time in `zone`.
 * `null` for serials with no real date — Excel's `1900-01-00` and phantom
 * `1900-02-29` — and for everything {@link ogeSerialToDateParts} rejects.
 */
export function ogeSerialToDate(
  serial: number,
  system: OgeDateSystem = '1900',
  zone: OgeDateZone = 'local',
): Date | null {
  const parts = ogeSerialToDateParts(serial, system, 3);
  const phantom =
    system === '1900' &&
    parts?.year === 1900 &&
    parts.month === 2 &&
    parts.day === 29;
  if (!parts || parts.day === 0 || phantom) return null;
  const { year, month, day, hour, minute, second, millisecond } = parts;
  if (zone === 'utc') {
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, second, millisecond);
    return date;
  }
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, second, millisecond);
  return date;
}
