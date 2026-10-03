/**
 * RFC 5545 RRULE parsing/serialization — the documented OGE subset.
 *
 * Supported: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY, INTERVAL, COUNT xor UNTIL
 * (DATE and DATE-TIME forms), BYDAY (plain weekdays for every frequency —
 * "every such weekday of the period" for MONTHLY/YEARLY; ordinal −1..4
 * prefixes for MONTHLY/YEARLY), BYMONTHDAY (1..31 and −1 = last day),
 * BYMONTH (1..12), BYHOUR (0..23), BYMINUTE (0..59), BYSETPOS (±1..366,
 * applied to each period's candidate set), WKST.
 *
 * Date-times: a value WITHOUT a trailing `Z` is floating local wall time; a
 * value WITH `Z` is UTC and is converted to the matching local `Date`
 * instant (so `UNTIL=20261231T140000Z` ends at 14:00 UTC, whatever the
 * viewer's zone). DATE-only values are local days.
 *
 * Multi-line content: besides a bare RRULE value, the rule text may be an
 * iCalendar property block — one `RRULE:` line plus optional `DTSTART:`,
 * `RDATE:` and `EXDATE:` lines (CRLF or LF, RFC line folding honored,
 * `VALUE=DATE`/`VALUE=DATE-TIME` parameters accepted). RDATE adds extra
 * occurrences, EXDATE removes them (merged with the appointment's own
 * recurrence-exception field). DTSTART is validated and kept on the model,
 * but the appointment's start date remains the series start.
 *
 * Still excluded (parse returns `null`): BYYEARDAY, BYWEEKNO, BYSECOND,
 * EXRULE, `TZID=` parameters (no TZ database — the suite is Intl-only),
 * multiple RRULE lines, RDATE `VALUE=PERIOD`, and the
 * SECONDLY/MINUTELY/HOURLY frequencies.
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
  /** Inclusive end, as a local `Date` (a `Z` value is converted from UTC). */
  readonly until?: Date;
  readonly byDay?: readonly RecurrenceByDay[];
  readonly byMonthDay?: readonly number[];
  readonly byMonth?: readonly number[];
  /** BYHOUR: `0`–`23`; each candidate day is expanded to these hours. */
  readonly byHour?: readonly number[];
  /** BYMINUTE: `0`–`59`; each candidate hour is expanded to these minutes. */
  readonly byMinute?: readonly number[];
  /** BYSETPOS: 1-based positions (negative = from the end) within each period. */
  readonly bySetPos?: readonly number[];
  /** WKST as `0`–`6` (Sunday-first); RFC default is Monday (`1`). */
  readonly weekStart: number;
  /** DTSTART line of a property block (informational; the appointment start wins). */
  readonly dtStart?: Date;
  /** RDATE values: extra occurrence starts added to the set. */
  readonly rDates?: readonly Date[];
  /** EXDATE values from the property block: occurrences removed from the set. */
  readonly exDates?: readonly Date[];
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

const STAMP = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;

/**
 * Parses one DATE / DATE-TIME stamp. `Z` → UTC converted to the local
 * instant; no `Z` → floating local wall time. `dateOnlyEnd` fills a DATE
 * value with 23:59:59 (inclusive UNTIL) instead of midnight.
 */
function parseStamp(value: string, dateOnlyEnd: boolean): Date | null {
  const match = STAMP.exec(value.trim().toUpperCase());
  if (!match) return null;
  const [, y, m, d, hh, mm, ss, z] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hh === undefined) {
    return dateOnlyEnd
      ? new Date(year, month - 1, day, 23, 59, 59)
      : new Date(year, month - 1, day);
  }
  const hours = Number(hh);
  const minutes = Number(mm);
  const seconds = Number(ss);
  if (hours > 23 || minutes > 59 || seconds > 60) return null;
  if (z === 'Z') {
    return new Date(
      Date.UTC(year, month - 1, day, hours, minutes, Math.min(seconds, 59)),
    );
  }
  return new Date(year, month - 1, day, hours, minutes, Math.min(seconds, 59));
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

function parseSetPos(value: string): number[] | null {
  const entries: number[] = [];
  for (const part of value.split(',')) {
    if (!/^[+-]?\d+$/.test(part)) return null;
    const num = Number(part);
    if (num === 0 || num < -366 || num > 366) return null;
    entries.push(num);
  }
  return entries.length > 0 ? entries : null;
}

/** The RRULE value (`FREQ=…;…`) → model, or null. */
function parseRuleValue(body: string): RecurrenceRule | null {
  if (body === '') return null;

  let freq: RecurrenceFrequency | null = null;
  let interval = 1;
  let count: number | undefined;
  let until: Date | undefined;
  let byDay: RecurrenceByDay[] | undefined;
  let byMonthDay: number[] | undefined;
  let byMonth: number[] | undefined;
  let byHour: number[] | undefined;
  let byMinute: number[] | undefined;
  let bySetPos: number[] | undefined;
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
        const parsed = parseStamp(value, true);
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
      case 'BYHOUR': {
        const parsed = parseIntList(value, 0, 23, false);
        if (parsed === null) return null;
        byHour = parsed;
        break;
      }
      case 'BYMINUTE': {
        const parsed = parseIntList(value, 0, 59, false);
        if (parsed === null) return null;
        byMinute = parsed;
        break;
      }
      case 'BYSETPOS': {
        const parsed = parseSetPos(value);
        if (parsed === null) return null;
        bySetPos = parsed;
        break;
      }
      case 'WKST': {
        const day = WEEKDAYS[value];
        if (day === undefined) return null;
        weekStart = day;
        break;
      }
      default:
        // unsupported part (BYYEARDAY, BYSECOND, …) → whole rule rejected
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
    ...(byHour !== undefined ? { byHour } : {}),
    ...(byMinute !== undefined ? { byMinute } : {}),
    ...(bySetPos !== undefined ? { bySetPos } : {}),
    weekStart,
  };
}

/**
 * Parses a DTSTART/RDATE/EXDATE property value with its parameters.
 * Only `VALUE=DATE` / `VALUE=DATE-TIME` are understood; anything else
 * (`TZID=…`, `VALUE=PERIOD`) rejects the block.
 */
function parseDateList(params: string, value: string): Date[] | null {
  for (const param of params.split(';')) {
    if (param === '') continue;
    const upper = param.toUpperCase();
    if (upper !== 'VALUE=DATE' && upper !== 'VALUE=DATE-TIME') return null;
  }
  const dates: Date[] = [];
  for (const part of value.split(',')) {
    const parsed = parseStamp(part, false);
    if (parsed === null) return null;
    dates.push(parsed);
  }
  return dates.length > 0 ? dates : null;
}

/** Unfolds RFC 5545 content lines (CRLF/LF; a leading space/tab continues). */
function contentLines(text: string): string[] {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += raw.slice(1);
    } else if (raw.trim() !== '') {
      lines.push(raw.trim());
    }
  }
  return lines;
}

/**
 * Parses an RRULE string (with or without the `RRULE:` prefix), or an
 * iCalendar property block (RRULE + optional DTSTART/RDATE/EXDATE lines),
 * into the OGE subset model. Returns `null` on ANY invalid or unsupported
 * part — a rule is either fully understood or rejected, never silently
 * truncated.
 */
export function parseRecurrenceRule(rule: string): RecurrenceRule | null {
  const lines = contentLines(rule);
  if (lines.length === 0) return null;

  let ruleValue: string | null = null;
  let dtStart: Date | undefined;
  const rDates: Date[] = [];
  const exDates: Date[] = [];

  for (const line of lines) {
    const named = /^([A-Za-z-]+)((?:;[^:]*)?):(.*)$/.exec(line);
    const name = named?.[1].toUpperCase();
    if (
      named === null ||
      (name !== 'RRULE' &&
        name !== 'DTSTART' &&
        name !== 'RDATE' &&
        name !== 'EXDATE')
    ) {
      // a bare `FREQ=…` value line is the RRULE itself
      if (ruleValue !== null || line.includes(':')) return null;
      ruleValue = line;
      continue;
    }
    const params = named[2].replace(/^;/, '');
    const value = named[3];
    if (name === 'RRULE') {
      if (ruleValue !== null || params !== '') return null;
      ruleValue = value;
      continue;
    }
    const dates = parseDateList(params, value);
    if (dates === null) return null;
    if (name === 'DTSTART') {
      if (dtStart !== undefined || dates.length !== 1) return null;
      dtStart = dates[0];
    } else if (name === 'RDATE') {
      rDates.push(...dates);
    } else {
      exDates.push(...dates);
    }
  }

  if (ruleValue === null) return null;
  const parsed = parseRuleValue(ruleValue);
  if (parsed === null) return null;
  return {
    ...parsed,
    ...(dtStart !== undefined ? { dtStart } : {}),
    ...(rDates.length > 0 ? { rDates } : {}),
    ...(exDates.length > 0 ? { exDates } : {}),
  };
}

function formatStamp(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

/**
 * Serializes a rule model back into RRULE text (no `RRULE:` prefix). Rules
 * carrying DTSTART/RDATE/EXDATE values serialize as a property block: the
 * RRULE value on the first line, then one `DTSTART:` / `RDATE:` / `EXDATE:`
 * line each (local floating stamps).
 */
export function serializeRecurrenceRule(rule: RecurrenceRule): string {
  const parts = [`FREQ=${rule.freq.toUpperCase()}`];
  if (rule.interval !== 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`);
  if (rule.until !== undefined) {
    parts.push(`UNTIL=${formatStamp(rule.until)}`);
  }
  if (rule.byDay !== undefined && rule.byDay.length > 0) {
    parts.push(
      `BYDAY=${rule.byDay
        .map((entry) => `${entry.ordinal ?? ''}${WEEKDAY_CODES[entry.weekday]}`)
        .join(',')}`,
    );
  }
  if (rule.byMonthDay !== undefined && rule.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
  }
  if (rule.byMonth !== undefined && rule.byMonth.length > 0) {
    parts.push(`BYMONTH=${rule.byMonth.join(',')}`);
  }
  if (rule.byHour !== undefined && rule.byHour.length > 0) {
    parts.push(`BYHOUR=${rule.byHour.join(',')}`);
  }
  if (rule.byMinute !== undefined && rule.byMinute.length > 0) {
    parts.push(`BYMINUTE=${rule.byMinute.join(',')}`);
  }
  if (rule.bySetPos !== undefined && rule.bySetPos.length > 0) {
    parts.push(`BYSETPOS=${rule.bySetPos.join(',')}`);
  }
  if (rule.weekStart !== 1) {
    parts.push(`WKST=${WEEKDAY_CODES[rule.weekStart]}`);
  }
  const lines = [parts.join(';')];
  if (rule.dtStart !== undefined) {
    lines.push(`DTSTART:${formatStamp(rule.dtStart)}`);
  }
  if (rule.rDates !== undefined && rule.rDates.length > 0) {
    lines.push(`RDATE:${rule.rDates.map(formatStamp).join(',')}`);
  }
  if (rule.exDates !== undefined && rule.exDates.length > 0) {
    lines.push(`EXDATE:${rule.exDates.map(formatStamp).join(',')}`);
  }
  return lines.join('\n');
}

/**
 * Parses a recurrence-exception value: comma-separated `yyyyMMdd` or
 * `yyyyMMddTHHmmss` stamps. A trailing `Z` marks UTC and is converted to the
 * local instant; without it the stamp is local wall time. Invalid entries
 * are skipped rather than failing the list.
 */
export function parseRecurrenceException(value: string): Date[] {
  const dates: Date[] = [];
  for (const part of value.split(',')) {
    const parsed = parseStamp(part, false);
    if (parsed !== null) dates.push(parsed);
  }
  return dates;
}
