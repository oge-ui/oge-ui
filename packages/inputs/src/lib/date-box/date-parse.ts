/**
 * Locale-aware, dependency-free date parsing: the expected part ORDER is
 * derived from `Intl.DateTimeFormat(locale).formatToParts()`, typed digit
 * groups are mapped onto those parts positionally (solving dd/mm vs mm/dd per
 * locale), month names match case-folded against the locale's own long/short
 * names, and the result is constructed as a LOCAL `new Date(...)` — never
 * `Date.parse`. Unparseable text yields `null` (the date box shows the
 * invalid state and reverts on blur; a wrong date is never produced).
 */

export type DateParseKind = 'date' | 'time' | 'datetime';

interface ParsedParts {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  dayPeriod?: 'am' | 'pm';
}

const fold = (text: string): string =>
  text.toLocaleLowerCase().normalize('NFKD');

/** The locale's numeric part order for the given kind (e.g. `['month','day','year']`). */
export function datePartOrder(
  locale: string | undefined,
  kind: DateParseKind,
): string[] {
  const options: Intl.DateTimeFormatOptions =
    kind === 'time'
      ? { hour: 'numeric', minute: 'numeric' }
      : kind === 'datetime'
        ? {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
          }
        : { year: 'numeric', month: 'numeric', day: 'numeric' };
  return new Intl.DateTimeFormat(locale, options)
    .formatToParts(new Date(2001, 10, 22, 13, 45))
    .filter((part) =>
      ['year', 'month', 'day', 'hour', 'minute'].includes(part.type),
    )
    .map((part) => part.type);
}

/** Month-name lookup table of the locale (long + short, folded). */
function monthNames(locale: string | undefined): Map<string, number> {
  const map = new Map<string, number>();
  for (const width of ['long', 'short'] as const) {
    const format = new Intl.DateTimeFormat(locale, { month: width });
    for (let month = 0; month < 12; month++) {
      map.set(fold(format.format(new Date(2001, month, 1))), month + 1);
    }
  }
  return map;
}

function twoDigitYear(value: number): number {
  return value < 50 ? 2000 + value : 1900 + value;
}

/**
 * Parses user-typed text into a local `Date`, or `null` when it cannot be
 * read unambiguously. `reference` supplies the untouched fields (e.g. the
 * date part while parsing `'time'`).
 */
export function parseDateText(
  text: string,
  locale: string | undefined,
  kind: DateParseKind,
  reference?: Date | null,
): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const parts: ParsedParts = {};
  let working = ` ${fold(trimmed)} `;

  // day period first — its words would otherwise pollute the token split
  const dayPeriods = detectDayPeriods(locale);
  for (const [token, period] of dayPeriods) {
    if (working.includes(token)) {
      parts.dayPeriod = period;
      working = working.replaceAll(token, ' ');
      break;
    }
  }

  // month names next (letters remaining after this fail the parse)
  if (kind !== 'time') {
    for (const [name, month] of [...monthNames(locale)].sort(
      (a, b) => b[0].length - a[0].length,
    )) {
      if (working.includes(name)) {
        parts.month = month;
        working = working.replace(name, ' ');
        break;
      }
    }
  }

  if (/\p{L}/u.test(working)) return null; // leftover letters → unparseable

  const numbers = (working.match(/\d+/g) ?? []).map(Number);
  if (!numbers.length) return null;

  // a time chunk (`HH:MM`) inside a datetime is detected via the separator
  const timeMatch = /(\d{1,2}):(\d{2})/.exec(trimmed);
  if (timeMatch && kind !== 'date') {
    parts.hour = Number(timeMatch[1]);
    parts.minute = Number(timeMatch[2]);
  }

  const dateNumbers =
    timeMatch && kind !== 'date'
      ? numbers.filter(
          (_, index) =>
            !isTimeNumberIndex(working, numbers, index, timeMatch[0]),
        )
      : numbers;

  if (kind !== 'time') {
    const order = datePartOrder(locale, 'date').filter(
      (part) => !(part === 'month' && parts.month !== undefined),
    );
    const dateDigits = kind === 'datetime' ? dateNumbers : numbers;
    const usable = dateDigits.slice(0, order.length);
    if (parts.month === undefined && usable.length < 2) {
      // a single number is the day of the reference month
      if (usable.length === 1 && reference) {
        parts.day = usable[0];
      } else if (usable.length === 1) {
        parts.day = usable[0];
      } else {
        return null;
      }
    } else {
      order
        .slice(0, usable.length)
        .forEach((part, index) => setPart(parts, part, usable[index]));
      // year omitted → reference/current year
      if (parts.year === undefined) {
        parts.year = (reference ?? new Date()).getFullYear();
      }
    }
  } else if (parts.hour === undefined) {
    parts.hour = numbers[0];
    parts.minute = numbers[1] ?? 0;
  }

  if (parts.hour !== undefined && parts.dayPeriod) {
    if (parts.dayPeriod === 'pm' && parts.hour < 12) parts.hour += 12;
    if (parts.dayPeriod === 'am' && parts.hour === 12) parts.hour = 0;
  }

  const ref = reference ?? new Date();
  const year = parts.year ?? ref.getFullYear();
  const month = (parts.month ?? ref.getMonth() + 1) - 1;
  const day = parts.day ?? ref.getDate();
  const hour = parts.hour ?? (kind === 'date' ? 0 : ref.getHours());
  const minute = parts.minute ?? (kind === 'date' ? 0 : ref.getMinutes());

  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const result = new Date(year, month, day, hour, minute);
  // reject overflowed days (Feb 30 → Mar 2)
  if (kind !== 'time' && result.getMonth() !== month) return null;
  return result;
}

function setPart(parts: ParsedParts, part: string, value: number): void {
  if (part === 'year') {
    parts.year = value < 100 ? twoDigitYear(value) : value;
  } else if (part === 'month') {
    parts.month = value;
  } else if (part === 'day') {
    parts.day = value;
  }
}

function isTimeNumberIndex(
  working: string,
  numbers: number[],
  index: number,
  timeToken: string,
): boolean {
  // the two numbers forming HH:MM are the pair that appears joined by ':'
  const [hh, mm] = timeToken.split(':').map(Number);
  const hourIndex = numbers.findIndex(
    (value, i) => value === hh && numbers[i + 1] === mm,
  );
  return index === hourIndex || index === hourIndex + 1;
}

function detectDayPeriods(
  locale: string | undefined,
): Array<[string, 'am' | 'pm']> {
  const format = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
  const partOf = (date: Date): string | undefined =>
    format.formatToParts(date).find((part) => part.type === 'dayPeriod')?.value;
  const am = partOf(new Date(2001, 0, 1, 9));
  const pm = partOf(new Date(2001, 0, 1, 21));
  const result: Array<[string, 'am' | 'pm']> = [];
  if (am) result.push([fold(am), 'am']);
  if (pm) result.push([fold(pm), 'pm']);
  // always accept the bare latin forms too
  result.push(['am', 'am'], ['pm', 'pm']);
  return result;
}
