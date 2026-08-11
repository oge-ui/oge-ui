/**
 * RFC 5545 RRULE parsing/serialization — the documented OGE subset.
 *
 * Supported: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY, INTERVAL, COUNT xor UNTIL
 * (DATE and DATE-TIME forms; a trailing `Z` is accepted and interpreted as
 * LOCAL wall time — the suite is Intl-only with no TZ database, documented
 * honestly), BYDAY (plain weekdays for WEEKLY; ordinal −1..4 prefixes for
 * MONTHLY/YEARLY), BYMONTHDAY (1..31 and −1 = last day), BYMONTH (1..12),
 * WKST.
 *
 * Excluded (parse returns `null`): BYSETPOS, BYYEARDAY, BYWEEKNO,
 * BYHOUR/BYMINUTE/BYSECOND, RDATE/EXRULE, true-UTC/TZID semantics, multiple
 * RRULE lines, SECONDLY/MINUTELY/HOURLY frequencies.
 *
 * The v0.2 expansion engine (`rrule-expand.ts`) will consume this model:
 * `expandRecurrence(appointment, rule, rangeStart, rangeEnd): Date[]`.
 */

/** Supported recurrence frequencies (string union, house rule). */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** A BYDAY entry: `2TU` → `{ ordinal: 2, weekday: 2 }`; plain `TU` → ordinal `null`. */
export interface RecurrenceByDay {
  /** `-1`..`4`, or `null` for an unqualified weekday. */
  readonly ordinal: number | null;
  /** `0` (Sunday) – `6` (Saturday). */
  readonly weekday: number;
}

/** The parsed recurrence rule (OGE subset of RFC 5545). */
export interface RecurrenceRule {
  readonly freq: RecurrenceFrequency;
  readonly interval: number;
  readonly count?: number;
  /** Local wall time, inclusive. */
  readonly until?: Date;
  readonly byDay?: readonly RecurrenceByDay[];
  readonly byMonthDay?: readonly number[];
  readonly byMonth?: readonly number[];
  /** WKST as `0`–`6` (Sunday-first); RFC default is Monday (`1`). */
  readonly weekStart: number;
}

const WEEKDAYS: Readonly<Record<string, number>> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};
const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

function parseUntil(value: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(
    value,
  );
  if (!match) return null;
  const [, y, m, d, hh, mm, ss] = match;
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(
    Number(y),
    month - 1,
    day,
    Number(hh ?? 23),
    Number(mm ?? 59),
    Number(ss ?? 59),
  );
}

function parseByDay(value: string): RecurrenceByDay[] | null {
  const entries: RecurrenceByDay[] = [];
  for (const part of value.split(',')) {
    const match = /^(-?\d)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(part);
    if (!match) return null;
    const ordinal = match[1] === undefined ? null : Number(match[1]);
    if (ordinal !== null && (ordinal < -1 || ordinal > 4 || ordinal === 0)) {
      return null;
    }
    entries.push({ ordinal, weekday: WEEKDAYS[match[2]] });
  }
  return entries.length > 0 ? entries : null;
}

function parseIntList(
  value: string,
  min: number,
  max: number,
  allowNegativeOne: boolean,
): number[] | null {
  const entries: number[] = [];
  for (const part of value.split(',')) {
    if (!/^-?\d+$/.test(part)) return null;
    const num = Number(part);
    const valid =
      (num >= min && num <= max) || (allowNegativeOne && num === -1);
    if (!valid) return null;
    entries.push(num);
  }
  return entries.length > 0 ? entries : null;
}

/**
 * Parses an RRULE string (with or without the `RRULE:` prefix) into the OGE
 * subset model. Returns `null` on ANY invalid or unsupported part — a rule
 * is either fully understood or rejected, never silently truncated.
 */
export function parseRecurrenceRule(rule: string): RecurrenceRule | null {
  const body = rule.trim().replace(/^RRULE:/i, '');
  if (body === '' || body.includes('\n')) return null;

  let freq: RecurrenceFrequency | null = null;
  let interval = 1;
  let count: number | undefined;
  let until: Date | undefined;
  let byDay: RecurrenceByDay[] | undefined;
  let byMonthDay: number[] | undefined;
  let byMonth: number[] | undefined;
  let weekStart = 1;

  for (const pair of body.split(';')) {
    if (pair === '') return null;
    const eq = pair.indexOf('=');
    if (eq === -1) return null;
    const key = pair.slice(0, eq).toUpperCase();
    const value = pair.slice(eq + 1).toUpperCase();
    switch (key) {
      case 'FREQ': {
        if (
          value !== 'DAILY' &&
          value !== 'WEEKLY' &&
          value !== 'MONTHLY' &&
          value !== 'YEARLY'
        ) {
          return null;
        }
        freq = value.toLowerCase() as RecurrenceFrequency;
        break;
      }
      case 'INTERVAL': {
        if (!/^\d+$/.test(value)) return null;
        interval = Number(value);
        if (interval < 1) return null;
        break;
      }
      case 'COUNT': {
        if (!/^\d+$/.test(value)) return null;
        count = Number(value);
        if (count < 1) return null;
        break;
      }
      case 'UNTIL': {
        const parsed = parseUntil(value);
        if (parsed === null) return null;
        until = parsed;
        break;
      }
      case 'BYDAY': {
        const parsed = parseByDay(value);
        if (parsed === null) return null;
        byDay = parsed;
        break;
      }
      case 'BYMONTHDAY': {
        const parsed = parseIntList(value, 1, 31, true);
        if (parsed === null) return null;
        byMonthDay = parsed;
        break;
      }
      case 'BYMONTH': {
        const parsed = parseIntList(value, 1, 12, false);
        if (parsed === null) return null;
        byMonth = parsed;
        break;
      }
      case 'WKST': {
        const day = WEEKDAYS[value];
        if (day === undefined) return null;
        weekStart = day;
        break;
      }
      default:
        // unsupported part (BYSETPOS, BYHOUR, …) → whole rule rejected
        return null;
    }
  }

  if (freq === null) return null;
  if (count !== undefined && until !== undefined) return null; // xor per RFC
  // ordinal BYDAY entries only make sense for MONTHLY/YEARLY
  if (
    byDay?.some((entry) => entry.ordinal !== null) &&
    freq !== 'monthly' &&
    freq !== 'yearly'
  ) {
    return null;
  }

  return {
    freq,
    interval,
    ...(count !== undefined ? { count } : {}),
    ...(until !== undefined ? { until } : {}),
    ...(byDay !== undefined ? { byDay } : {}),
    ...(byMonthDay !== undefined ? { byMonthDay } : {}),
    ...(byMonth !== undefined ? { byMonth } : {}),
    weekStart,
  };
}

/** Serializes a rule model back into RRULE text (no `RRULE:` prefix). */
export function serializeRecurrenceRule(rule: RecurrenceRule): string {
  const parts = [`FREQ=${rule.freq.toUpperCase()}`];
  if (rule.interval !== 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`);
  if (rule.until !== undefined) {
    const u = rule.until;
    const y = String(u.getFullYear()).padStart(4, '0');
    const m = String(u.getMonth() + 1).padStart(2, '0');
    const d = String(u.getDate()).padStart(2, '0');
    const hh = String(u.getHours()).padStart(2, '0');
    const mm = String(u.getMinutes()).padStart(2, '0');
    const ss = String(u.getSeconds()).padStart(2, '0');
    parts.push(`UNTIL=${y}${m}${d}T${hh}${mm}${ss}`);
  }
  if (rule.byDay !== undefined && rule.byDay.length > 0) {
    parts.push(
      `BYDAY=${rule.byDay
        .map(
          (entry) =>
            `${entry.ordinal ?? ''}${WEEKDAY_CODES[entry.weekday]}`,
        )
        .join(',')}`,
    );
  }
  if (rule.byMonthDay !== undefined && rule.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
  }
  if (rule.byMonth !== undefined && rule.byMonth.length > 0) {
    parts.push(`BYMONTH=${rule.byMonth.join(',')}`);
  }
  if (rule.weekStart !== 1) {
    parts.push(`WKST=${WEEKDAY_CODES[rule.weekStart]}`);
  }
  return parts.join(';');
}

/**
 * Parses a recurrence-exception value: comma-separated `yyyyMMddTHHmmss`
 * stamps (trailing `Z` accepted, read as local wall time). Invalid entries
 * are skipped rather than failing the list.
 */
export function parseRecurrenceException(value: string): Date[] {
  const dates: Date[] = [];
  for (const part of value.split(',')) {
    const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(
      part.trim(),
    );
    if (!match) continue;
    const [, y, m, d, hh, mm, ss] = match;
    dates.push(
      new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(hh ?? 0),
        Number(mm ?? 0),
        Number(ss ?? 0),
      ),
    );
  }
  return dates;
}
