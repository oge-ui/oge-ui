/**
 * Zoned date math without a time-zone database — the suite stays Intl-only.
 *
 * Every helper derives a zone's UTC offset from `Intl.DateTimeFormat` with a
 * `timeZone` option (through the shared `ogeDateTimeFormat` cache), so any
 * IANA zone the runtime knows works: DST transitions, 23- and 25-hour days,
 * Lord Howe's half-hour DST and Kathmandu's +5:45 come straight from ICU.
 *
 * Two representations meet here:
 *
 * - an **instant** — a plain `Date`, the moment that is stored;
 * - a **wall clock** — a `Date` whose *local* fields (`getHours()`, …) read
 *   as the time on the clocks of a zone. Engines that compute calendar
 *   layouts in local wall time (the scheduler, the Gantt) run unchanged on
 *   wall clocks: convert at the edges with {@link ogeToWallClock} /
 *   {@link ogeFromWallClock} and the inside never learns about zones.
 *
 * `timeZone` is optional everywhere: `undefined` is the runtime's own zone,
 * for which both conversions are the identity. An unknown zone name also
 * falls back to the runtime zone instead of throwing out of a render.
 */
import { ogeDateTimeFormat } from './intl-cache';

/** The calendar fields of an instant on a zone's clocks. */
export interface OgeZonedParts {
  readonly year: number;
  /** `1`–`12`. */
  readonly month: number;
  readonly day: number;
  /** `0`–`23`. */
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
  /** `0` (Sunday) – `6` (Saturday). */
  readonly weekday: number;
}

/** The wall-clock fields {@link ogeFromZoned} reads (time parts default to 0). */
export interface OgeZonedPartsInput {
  readonly year: number;
  /** `1`–`12`; out-of-range values roll over like `Date.UTC`. */
  readonly month: number;
  readonly day: number;
  readonly hour?: number;
  readonly minute?: number;
  readonly second?: number;
  readonly millisecond?: number;
}

/**
 * How a wall time that does not exist once is resolved (Temporal's names):
 * `'compatible'` (default) — a skipped time moves forward by the gap, a
 * repeated time takes the earlier instant; `'earlier'` / `'later'` pick that
 * side in both cases.
 */
export type OgeZoneDisambiguation = 'compatible' | 'earlier' | 'later';

const MINUTE = 60_000;
const DAY = 86_400_000;
const MAX_CACHE = 4096;

const validity = new Map<string, boolean>();
const offsetCache = new Map<string, number>();

/** Whether `timeZone` is an IANA zone (or `UTC`) the runtime accepts. */
export function ogeIsTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || timeZone === '') return false;
  let known = validity.get(timeZone);
  if (known === undefined) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
      known = true;
    } catch {
      known = false;
    }
    if (validity.size >= MAX_CACHE) validity.clear();
    validity.set(timeZone, known);
  }
  return known;
}

/** `timeZone` when the runtime knows it, else `undefined` (the local zone). */
function zoneOf(timeZone: string | undefined): string | undefined {
  return timeZone !== undefined && ogeIsTimeZone(timeZone)
    ? timeZone
    : undefined;
}

/** The runtime's own IANA zone (`Intl` resolved options), or `'UTC'`. */
export function ogeLocalTimeZone(): string {
  try {
    return ogeDateTimeFormat('en-US').resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function partsFormatter(timeZone: string | undefined): Intl.DateTimeFormat {
  return ogeDateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    era: 'short',
  });
}

const WEEKDAY_INDEX: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Fields of `ms` on `timeZone`'s clocks, seconds precision. */
function rawParts(ms: number, timeZone: string | undefined): OgeZonedParts {
  let year = 0;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;
  let weekday = 0;
  let bc = false;
  for (const part of partsFormatter(timeZone).formatToParts(ms)) {
    switch (part.type) {
      case 'year':
        year = Number(part.value);
        break;
      case 'month':
        month = Number(part.value);
        break;
      case 'day':
        day = Number(part.value);
        break;
      case 'hour':
        // some engines still print midnight as 24 under h23
        hour = Number(part.value) % 24;
        break;
      case 'minute':
        minute = Number(part.value);
        break;
      case 'second':
        second = Number(part.value);
        break;
      case 'weekday':
        weekday = WEEKDAY_INDEX[part.value] ?? 0;
        break;
      case 'era':
        bc = part.value.startsWith('B');
        break;
    }
  }
  if (bc) year = 1 - year;
  const millisecond = ((ms % 1000) + 1000) % 1000;
  return { year, month, day, hour, minute, second, millisecond, weekday };
}

function utcOf(parts: OgeZonedPartsInput): number {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
    parts.millisecond ?? 0,
  );
  return date.getTime();
}

/**
 * The zone's offset from UTC at `instant`, in minutes east of Greenwich
 * (`Europe/Istanbul` → `180`, `America/New_York` in July → `-240`,
 * `Asia/Kathmandu` → `345`).
 */
export function ogeTzOffset(instant: Date | number, timeZone?: string): number {
  const ms = typeof instant === 'number' ? instant : instant.getTime();
  if (!Number.isFinite(ms)) return 0;
  const zone = zoneOf(timeZone);
  // offsets change on whole minutes; seconds-level LMT offsets are rounded
  const bucket = Math.floor(ms / MINUTE);
  const key = `${zone ?? ''}|${bucket}`;
  const cached = offsetCache.get(key);
  if (cached !== undefined) return cached;
  const at = bucket * MINUTE;
  const parts = rawParts(at, zone);
  const offset = Math.round((utcOf(parts) - at) / MINUTE);
  if (offsetCache.size >= MAX_CACHE) offsetCache.clear();
  offsetCache.set(key, offset);
  return offset;
}

/** The calendar fields of `instant` on `timeZone`'s clocks. */
export function ogeZonedParts(
  instant: Date | number,
  timeZone?: string,
): OgeZonedParts {
  const ms = typeof instant === 'number' ? instant : instant.getTime();
  const wall = new Date(ms + ogeTzOffset(ms, timeZone) * MINUTE);
  return {
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
    hour: wall.getUTCHours(),
    minute: wall.getUTCMinutes(),
    second: wall.getUTCSeconds(),
    millisecond: wall.getUTCMilliseconds(),
    weekday: wall.getUTCDay(),
  };
}

/**
 * The instant whose wall clock in `timeZone` reads `parts`. Wall times a DST
 * transition skips or repeats resolve through `disambiguation` (default
 * `'compatible'`: 02:30 on a spring-forward night is 03:30, 01:30 on a
 * fall-back night is the first 01:30).
 */
export function ogeFromZoned(
  parts: OgeZonedPartsInput,
  timeZone?: string,
  disambiguation: OgeZoneDisambiguation = 'compatible',
): Date {
  const local = utcOf(parts);
  if (!Number.isFinite(local)) return new Date(NaN);
  const before = ogeTzOffset(local - DAY, timeZone);
  const after = ogeTzOffset(local + DAY, timeZone);
  const candidates: number[] = [];
  for (const offset of before === after ? [before] : [before, after]) {
    const instant = local - offset * MINUTE;
    if (instant + ogeTzOffset(instant, timeZone) * MINUTE === local) {
      candidates.push(instant);
    }
  }
  if (candidates.length === 0 && before === after) {
    // a transition outside the ±1 day window probe: trust the probe
    const offset = ogeTzOffset(local - before * MINUTE, timeZone);
    candidates.push(local - offset * MINUTE);
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => a - b);
    return new Date(
      disambiguation === 'later'
        ? candidates[candidates.length - 1]
        : candidates[0],
    );
  }
  // a gap: the clocks jumped over this wall time
  const earlier = local - after * MINUTE;
  const later = local - before * MINUTE;
  return new Date(disambiguation === 'earlier' ? earlier : later);
}

/**
 * A `Date` whose **local** fields read as `instant`'s wall clock in
 * `timeZone` — the frame local-time engines compute in. Identity (a copy)
 * for the runtime zone.
 *
 * The one limit of the frame: a wall time the *runtime's* own zone skips
 * (its spring-forward hour) cannot be held by a local `Date`, so such a
 * value shifts by the runtime's gap.
 */
export function ogeToWallClock(
  instant: Date | number,
  timeZone?: string,
): Date {
  const ms = typeof instant === 'number' ? instant : instant.getTime();
  const zone = zoneOf(timeZone);
  if (zone === undefined || !Number.isFinite(ms)) return new Date(ms);
  const p = ogeZonedParts(ms, zone);
  const wall = new Date(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
    p.millisecond,
  );
  if (p.year < 100) wall.setFullYear(p.year);
  return wall;
}

/**
 * The instant a wall-clock `Date` (local fields = `timeZone`'s clocks)
 * stands for — the inverse of {@link ogeToWallClock}. Identity (a copy) for
 * the runtime zone.
 */
export function ogeFromWallClock(
  wall: Date,
  timeZone?: string,
  disambiguation: OgeZoneDisambiguation = 'compatible',
): Date {
  const zone = zoneOf(timeZone);
  if (zone === undefined || Number.isNaN(wall.getTime())) {
    return new Date(wall.getTime());
  }
  return ogeFromZoned(
    {
      year: wall.getFullYear(),
      month: wall.getMonth() + 1,
      day: wall.getDate(),
      hour: wall.getHours(),
      minute: wall.getMinutes(),
      second: wall.getSeconds(),
      millisecond: wall.getMilliseconds(),
    },
    zone,
    disambiguation,
  );
}

/**
 * Re-expresses a wall clock of zone `from` as the wall clock of zone `to`
 * for the same instant (`09:00` New York → `16:00` Istanbul in winter).
 */
export function ogeConvertWallClock(
  wall: Date,
  from: string | undefined,
  to: string | undefined,
): Date {
  if (zoneOf(from) === zoneOf(to)) return new Date(wall.getTime());
  return ogeToWallClock(ogeFromWallClock(wall, from), to);
}

/** The first instant of the calendar day `instant` falls on in `timeZone`. */
export function ogeZonedStartOfDay(
  instant: Date | number,
  timeZone?: string,
): Date {
  const p = ogeZonedParts(instant, timeZone);
  return ogeFromZoned({ year: p.year, month: p.month, day: p.day }, timeZone);
}

/**
 * Real minutes in a calendar day of `timeZone`: `1440`, `1380` / `1500` on
 * DST nights, `1410` / `1470` for Lord Howe's half hour.
 */
export function ogeZonedDayMinutes(
  year: number,
  month: number,
  day: number,
  timeZone?: string,
): number {
  const start = ogeFromZoned({ year, month, day }, timeZone);
  const end = ogeFromZoned({ year, month, day: day + 1 }, timeZone);
  return Math.round((end.getTime() - start.getTime()) / MINUTE);
}

/** `+03:00` / `-04:00` / `+05:45` for an offset in minutes. */
export function ogeFormatTzOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(Math.round(offsetMinutes));
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

/** A small, always-available zone list for runtimes without `supportedValuesOf`. */
const FALLBACK_ZONES: readonly string[] = [
  'UTC',
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Atlantic/Azores',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Adelaide',
  'Australia/Sydney',
  'Australia/Lord_Howe',
  'Pacific/Auckland',
];

let zoneList: readonly string[] | null = null;

/**
 * The IANA zones the runtime supports (`Intl.supportedValuesOf`) plus a
 * curated list of common names, sorted, with `UTC` first.
 */
export function ogeTimeZones(): readonly string[] {
  if (zoneList !== null) return zoneList;
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  let zones: string[] = [];
  try {
    zones = intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    zones = [];
  }
  // ICU lists canonical names only (`Asia/Katmandu`); the curated list adds
  // the current spellings people search for
  const merged = new Set(zones);
  for (const zone of FALLBACK_ZONES) {
    if (zones.length === 0 || ogeIsTimeZone(zone)) merged.add(zone);
  }
  merged.delete('UTC');
  zoneList = ['UTC', ...[...merged].sort()];
  return zoneList;
}

/**
 * A picker label: `(UTC+03:00) Europe/Istanbul`, the offset taken at `at`
 * (default now), underscores shown as spaces.
 */
export function ogeTimeZoneLabel(
  timeZone: string,
  at: Date | number = Date.now(),
): string {
  return `(UTC${ogeFormatTzOffset(ogeTzOffset(at, timeZone))}) ${timeZone.replace(/_/g, ' ')}`;
}

/** Empties the zone caches (tests; never needed in an app). */
export function clearOgeTimeZoneCache(): void {
  validity.clear();
  offsetCache.clear();
  zoneList = null;
}
