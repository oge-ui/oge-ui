/**
 * Time-of-day vocabulary shared by the date box, the date range box and the
 * masked date entry in both render layers (ADR 0001): the 12/24-hour
 * decision, the Intl display options per editor type, the picker column
 * options (hour / minute / second / AM-PM) and the merge of a picked part
 * into a date. Pure — native `Date` + `Intl`, local time only.
 */

/** What the date range box edits: day ranges, time ranges or both. */
export type OgeDateRangeBoxType = 'date' | 'time' | 'datetime';

/** One option of a time picker column. */
export interface OgeTimeColumnOption {
  /** Hour 0–23, minute/second 0–59, or `0`/`1` for AM/PM. */
  readonly value: number;
  readonly text: string;
}

/** The time part a picker column edits. */
export type OgeTimePart = 'hour' | 'minute' | 'second' | 'dayPeriod';

/**
 * The effective clock: an explicit `hour12` wins, otherwise the locale's own
 * convention (`en-US` → 12h, `de-DE` → 24h).
 */
export function resolveHour12(
  locale: string | undefined,
  hour12: boolean | undefined,
): boolean {
  if (hour12 !== undefined) return hour12;
  const options = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
  }).resolvedOptions();
  if (options.hour12 !== undefined) return options.hour12;
  return options.hourCycle === 'h11' || options.hourCycle === 'h12';
}

/**
 * `Intl` options for an editor's display text. A custom options object from
 * the app is returned untouched; otherwise the per-type default, with
 * `hour12` / seconds applied.
 */
export function timeDisplayOptions(
  type: 'date' | 'time' | 'datetime',
  hour12: boolean | undefined,
  showSeconds: boolean,
): Intl.DateTimeFormatOptions {
  if (type === 'date') return { dateStyle: 'short' };
  // `timeStyle` keeps the locale's own layout; `hour12` combines with it
  const time: Intl.DateTimeFormatOptions = {
    timeStyle: showSeconds ? 'medium' : 'short',
    ...(hour12 !== undefined ? { hour12 } : {}),
  };
  return type === 'time' ? time : { dateStyle: 'short', ...time };
}

/**
 * Hour column. `true`: `12, 1 … 11` (value 0–11) beside an AM/PM column;
 * `false`: `00`–`23`; `undefined`: 24 entries in the locale's own hour words
 * (`12 AM` … `11 PM` in en-US) — the single-column layout of the default.
 */
export function hourColumnOptions(
  locale: string | undefined,
  hour12: boolean | undefined,
): OgeTimeColumnOption[] {
  if (hour12 === undefined) {
    const format = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
    return Array.from({ length: 24 }, (_, value) => ({
      value,
      text: format.format(new Date(2001, 0, 1, value)),
    }));
  }
  const format = new Intl.DateTimeFormat(locale, {
    hour: hour12 ? 'numeric' : '2-digit',
    hour12,
    numberingSystem: 'latn',
  });
  const hourText = (hour: number): string =>
    format
      .formatToParts(new Date(2001, 0, 1, hour))
      .find((part) => part.type === 'hour')?.value ?? String(hour);
  const count = hour12 ? 12 : 24;
  return Array.from({ length: count }, (_, value) => ({
    value,
    text: hourText(value),
  }));
}

/** Minute (or second) column on a step grid: `:00`, `:15`, … */
export function minuteColumnOptions(step: number): OgeTimeColumnOption[] {
  const by = Math.min(Math.max(1, Math.floor(step) || 1), 60);
  const options: OgeTimeColumnOption[] = [];
  for (let value = 0; value < 60; value += by) {
    options.push({ value, text: `:${String(value).padStart(2, '0')}` });
  }
  return options;
}

/** The locale's AM / PM words (`['AM', 'PM']`, `['ÖÖ', 'ÖS']`…). */
export function dayPeriodLabels(
  locale: string | undefined,
): readonly [string, string] {
  const format = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hour12: true,
  });
  const period = (hour: number, fallback: string): string =>
    format
      .formatToParts(new Date(2001, 0, 1, hour))
      .find((part) => part.type === 'dayPeriod')?.value ?? fallback;
  return [period(9, 'AM'), period(21, 'PM')];
}

/** AM/PM column options (`value` 0 = AM, 1 = PM). */
export function dayPeriodColumnOptions(
  locale: string | undefined,
): OgeTimeColumnOption[] {
  const [am, pm] = dayPeriodLabels(locale);
  return [
    { value: 0, text: am },
    { value: 1, text: pm },
  ];
}

/**
 * Whether a column option is the selected one for `date`. In 12h mode the
 * hour column compares `hours % 12`; the AM/PM column compares the half-day.
 */
export function isTimePartSelected(
  date: Date | null,
  part: OgeTimePart,
  value: number,
  hour12: boolean,
): boolean {
  if (date === null) return false;
  switch (part) {
    case 'hour':
      return hour12
        ? date.getHours() % 12 === value
        : date.getHours() === value;
    case 'minute':
      return date.getMinutes() === value;
    case 'second':
      return date.getSeconds() === value;
    case 'dayPeriod':
      return (date.getHours() >= 12 ? 1 : 0) === value;
  }
}

/**
 * `base` with one time part replaced. 12h hour picks keep the current
 * half-day; AM/PM picks keep the hour on the clock face. `showSeconds: false`
 * zeroes the seconds — a picked time never carries invisible seconds.
 */
export function withTimePart(
  base: Date,
  part: OgeTimePart,
  value: number,
  hour12: boolean,
  showSeconds = true,
): Date {
  let hours = base.getHours();
  let minutes = base.getMinutes();
  let seconds = showSeconds ? base.getSeconds() : 0;
  switch (part) {
    case 'hour':
      hours = hour12 ? (value % 12) + (hours >= 12 ? 12 : 0) : value;
      break;
    case 'minute':
      minutes = value;
      break;
    case 'second':
      seconds = value;
      break;
    case 'dayPeriod':
      hours = (hours % 12) + (value === 1 ? 12 : 0);
      break;
  }
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hours,
    minutes,
    seconds,
  );
}

/**
 * "Now" for a time editor: the current time, seconds dropped unless shown.
 * `type: 'date'` gets today's midnight — the Today button's value.
 */
export function nowForType(
  type: 'date' | 'time' | 'datetime',
  showSeconds: boolean,
  now: Date = new Date(),
): Date {
  if (type === 'date') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    showSeconds ? now.getSeconds() : 0,
  );
}
