/**
 * A small RFC 5545 (iCalendar) codec for VEVENTs — dependency-free, so the
 * `/export-ical` entry needs no peer. What it writes: `VCALENDAR` with
 * `VERSION:2.0` / `PRODID`, one `VEVENT` per appointment with `UID`,
 * `DTSTAMP`, `DTSTART` / `DTEND` (`VALUE=DATE` for all-day, exclusive end),
 * `SUMMARY`, `LOCATION`, `DESCRIPTION`, `RRULE`, `RDATE`, `EXDATE` and an
 * `X-OGE-COLOR`; TEXT values escaped (`\\ \; \, \n`), lines folded at 75
 * octets with CRLF. Date-times are floating local time — the suite's model
 * (time zones are a later wave): `Z` values read as UTC and convert to the
 * local instant, and a `TZID` parameter is read as local wall time.
 * What it reads: the same, plus `DURATION`, multi-line / comma-listed
 * `EXDATE` and `RECURRENCE-ID` overrides, tolerant of LF-only files and of
 * unknown properties and components.
 */

/** One event as the codec reads and writes it. */
export interface OgeICalEvent {
  readonly uid: string;
  readonly summary: string;
  readonly description?: string;
  readonly location?: string;
  readonly startDate: Date;
  /** Exclusive end (the day after the last one for all-day events). */
  readonly endDate: Date;
  readonly allDay: boolean;
  /** The RRULE value, without the `RRULE:` prefix. */
  readonly recurrenceRule?: string;
  readonly rDates?: readonly Date[];
  readonly exDates?: readonly Date[];
  readonly color?: string;
  /** Set on an override of one occurrence of a series (`RECURRENCE-ID`). */
  readonly recurrenceId?: Date;
}

/** Calendar-level options of {@link buildOgeICalendar}. */
export interface OgeICalendarOptions {
  /** `PRODID`. Default `-//OGE UI//Scheduler//EN`. */
  readonly prodId?: string;
  /** `X-WR-CALNAME` (the calendar's display name in most clients). */
  readonly calendarName?: string;
  /** The `DTSTAMP` instant. Default: now. */
  readonly now?: Date;
}

const pad = (value: number, width = 2): string =>
  String(value).padStart(width, '0');

/** `yyyyMMdd` of a local date. */
export function formatICalDate(date: Date): string {
  return `${pad(date.getFullYear(), 4)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/** Floating local date-time `yyyyMMddTHHmmss`. */
export function formatICalDateTime(date: Date): string {
  return `${formatICalDate(date)}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** UTC date-time `yyyyMMddTHHmmssZ` (DTSTAMP). */
export function formatICalUtc(date: Date): string {
  return (
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Escapes a TEXT value (RFC 5545 §3.3.11). */
export function escapeICalText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Reverses {@link escapeICalText}. */
export function unescapeICalText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_match, char: string) =>
    char === 'n' || char === 'N' ? '\n' : char,
  );
}

function utf8Length(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  return code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
}

/**
 * Folds a content line at 75 octets (RFC 5545 §3.1): continuation lines
 * start with one space, and a multi-byte character is never split.
 */
export function foldICalLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = utf8Length(char);
    const limit = parts.length === 0 ? 75 : 74; // the leading space counts
    if (octets + size > limit) {
      parts.push(current);
      current = '';
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function sanitizeUid(uid: string): string {
  return uid.replace(/[\r\n]/g, ' ').trim() || 'oge-event';
}

/** Serializes events into a VCALENDAR document (CRLF line endings). */
export function buildOgeICalendar(
  events: readonly OgeICalEvent[],
  options: OgeICalendarOptions = {},
): string {
  const stamp = formatICalUtc(options.now ?? new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${options.prodId ?? '-//OGE UI//Scheduler//EN'}`,
    'CALSCALE:GREGORIAN',
  ];
  if (options.calendarName !== undefined) {
    lines.push(`X-WR-CALNAME:${escapeICalText(options.calendarName)}`);
  }
  for (const event of events) {
    const date = (value: Date): string =>
      event.allDay ? formatICalDate(value) : formatICalDateTime(value);
    const valueParam = event.allDay ? ';VALUE=DATE' : '';
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeICalText(sanitizeUid(event.uid))}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART${valueParam}:${date(event.startDate)}`);
    lines.push(`DTEND${valueParam}:${date(event.endDate)}`);
    lines.push(`SUMMARY:${escapeICalText(event.summary)}`);
    if (event.location) lines.push(`LOCATION:${escapeICalText(event.location)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    }
    if (event.recurrenceRule) lines.push(`RRULE:${event.recurrenceRule}`);
    if (event.rDates && event.rDates.length > 0) {
      lines.push(`RDATE${valueParam}:${event.rDates.map(date).join(',')}`);
    }
    if (event.exDates && event.exDates.length > 0) {
      lines.push(`EXDATE${valueParam}:${event.exDates.map(date).join(',')}`);
    }
    if (event.color) lines.push(`X-OGE-COLOR:${escapeICalText(event.color)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldICalLine).join('\r\n')}\r\n`;
}

/* ---------- parsing ---------- */

interface ContentLine {
  readonly name: string;
  readonly params: Readonly<Record<string, string>>;
  readonly value: string;
}

/** Unfolds and splits a document into content lines. */
function contentLines(text: string): ContentLine[] {
  const unfolded: string[] = [];
  for (const raw of text.split(/\r\n|\n|\r/)) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += raw.slice(1);
    } else if (raw.trim() !== '') {
      unfolded.push(raw);
    }
  }
  const lines: ContentLine[] = [];
  for (const line of unfolded) {
    // the value starts at the first ':' outside a quoted parameter value
    let quoted = false;
    let colon = -1;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') quoted = !quoted;
      else if (char === ':' && !quoted) {
        colon = index;
        break;
      }
    }
    if (colon === -1) continue;
    const head = line.slice(0, colon).split(';');
    const params: Record<string, string> = {};
    for (const param of head.slice(1)) {
      const eq = param.indexOf('=');
      if (eq === -1) continue;
      params[param.slice(0, eq).toUpperCase()] = param
        .slice(eq + 1)
        .replace(/^"|"$/g, '');
    }
    lines.push({
      name: head[0].toUpperCase(),
      params,
      value: line.slice(colon + 1),
    });
  }
  return lines;
}

const STAMP = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/;

/** A DATE / DATE-TIME value: `{ date, dateOnly }`, or `null`. */
function parseICalStamp(
  value: string,
  params: Readonly<Record<string, string>>,
): { date: Date; dateOnly: boolean } | null {
  const match = STAMP.exec(value.trim().toUpperCase());
  if (match === null) return null;
  const [, y, m, d, hh, mm, ss, z] = match;
  const year = Number(y);
  const month = Number(m) - 1;
  const day = Number(d);
  if (hh === undefined || params['VALUE'] === 'DATE') {
    return { date: new Date(year, month, day), dateOnly: true };
  }
  const hours = Number(hh);
  const minutes = Number(mm);
  const seconds = Math.min(59, Number(ss ?? '0'));
  if (z === 'Z') {
    return {
      date: new Date(Date.UTC(year, month, day, hours, minutes, seconds)),
      dateOnly: false,
    };
  }
  // floating — and a TZID wall time read as local (time zones: later wave)
  return {
    date: new Date(year, month, day, hours, minutes, seconds),
    dateOnly: false,
  };
}

const DURATION =
  /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/** A DURATION value in milliseconds, or `null`. */
export function parseICalDuration(value: string): number | null {
  const match = DURATION.exec(value.trim().toUpperCase());
  if (match === null) return null;
  const [, sign, weeks, days, hours, minutes, seconds] = match;
  const ms =
    (((Number(weeks ?? 0) * 7 + Number(days ?? 0)) * 24 + Number(hours ?? 0)) *
      60 +
      Number(minutes ?? 0)) *
      60_000 +
    Number(seconds ?? 0) * 1000;
  return sign === '-' ? -ms : ms;
}

function addOneDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/**
 * Parses every `VEVENT` of an iCalendar document. Events without a usable
 * `DTSTART` are skipped; a missing `DTEND` / `DURATION` means one day for
 * all-day events and a zero-length event otherwise. Never throws.
 */
export function parseOgeICalendar(text: string): OgeICalEvent[] {
  const events: OgeICalEvent[] = [];
  let current: ContentLine[] | null = null;
  let depth = 0;
  for (const line of contentLines(text)) {
    if (line.name === 'BEGIN') {
      if (line.value.toUpperCase() === 'VEVENT' && current === null) {
        current = [];
        depth = 0;
      } else if (current !== null) {
        depth++; // a nested component (VALARM): skip its lines
      }
      continue;
    }
    if (line.name === 'END') {
      if (current !== null && depth > 0) {
        depth--;
        continue;
      }
      if (line.value.toUpperCase() === 'VEVENT' && current !== null) {
        const event = buildEvent(current, events.length);
        if (event !== null) events.push(event);
        current = null;
      }
      continue;
    }
    if (current !== null && depth === 0) current.push(line);
  }
  return events;
}

function buildEvent(lines: readonly ContentLine[], index: number): OgeICalEvent | null {
  const first = (name: string): ContentLine | undefined =>
    lines.find((line) => line.name === name);
  const start = first('DTSTART');
  const parsedStart = start ? parseICalStamp(start.value, start.params) : null;
  if (parsedStart === null) return null;
  const allDay = parsedStart.dateOnly;
  let endDate: Date | null = null;
  const end = first('DTEND');
  if (end !== undefined) {
    endDate = parseICalStamp(end.value, end.params)?.date ?? null;
  }
  if (endDate === null) {
    const duration = first('DURATION');
    const ms = duration ? parseICalDuration(duration.value) : null;
    if (ms !== null) endDate = new Date(parsedStart.date.getTime() + ms);
  }
  if (endDate === null || endDate.getTime() < parsedStart.date.getTime()) {
    endDate = allDay ? addOneDay(parsedStart.date) : parsedStart.date;
  }
  const dates = (name: string): Date[] =>
    lines
      .filter((line) => line.name === name && line.params['VALUE'] !== 'PERIOD')
      .flatMap((line) =>
        line.value
          .split(',')
          .map((part) => parseICalStamp(part, line.params)?.date ?? null)
          .filter((date): date is Date => date !== null),
      );
  const text = (name: string): string | undefined => {
    const line = first(name);
    return line === undefined ? undefined : unescapeICalText(line.value);
  };
  const recurrenceIdLine = first('RECURRENCE-ID');
  const recurrenceId = recurrenceIdLine
    ? (parseICalStamp(recurrenceIdLine.value, recurrenceIdLine.params)?.date ??
      undefined)
    : undefined;
  const rDates = dates('RDATE');
  const exDates = dates('EXDATE');
  const rule = first('RRULE')?.value;
  const color = text('X-OGE-COLOR') ?? text('COLOR');
  return {
    uid: text('UID') ?? `oge-import-${index}`,
    summary: text('SUMMARY') ?? '',
    ...(text('DESCRIPTION') !== undefined ? { description: text('DESCRIPTION') } : {}),
    ...(text('LOCATION') !== undefined ? { location: text('LOCATION') } : {}),
    startDate: parsedStart.date,
    endDate,
    allDay,
    ...(rule !== undefined && rule !== '' ? { recurrenceRule: rule } : {}),
    ...(rDates.length > 0 ? { rDates } : {}),
    ...(exDates.length > 0 ? { exDates } : {}),
    ...(color !== undefined ? { color } : {}),
    ...(recurrenceId !== undefined ? { recurrenceId } : {}),
  };
}

/**
 * Folds `RECURRENCE-ID` overrides into their series: each override's
 * original occurrence joins the master's `EXDATE`s and the override itself
 * stays as a standalone event (the suite's occurrence-detach model).
 */
export function resolveICalOverrides(
  events: readonly OgeICalEvent[],
): OgeICalEvent[] {
  const overrides = events.filter((event) => event.recurrenceId !== undefined);
  if (overrides.length === 0) return [...events];
  return events.map((event) => {
    if (event.recurrenceId !== undefined) {
      const standalone: { -readonly [K in keyof OgeICalEvent]?: OgeICalEvent[K] } =
        { ...event, uid: `${event.uid}-${formatICalDateTime(event.recurrenceId)}` };
      delete standalone.recurrenceId;
      delete standalone.recurrenceRule;
      return standalone as OgeICalEvent;
    }
    const own = overrides.filter((override) => override.uid === event.uid);
    if (own.length === 0 || event.recurrenceRule === undefined) return event;
    return {
      ...event,
      exDates: [
        ...(event.exDates ?? []),
        ...own.map((override) => override.recurrenceId as Date),
      ],
    };
  });
}
