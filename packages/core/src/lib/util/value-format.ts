import {
  ogeDateTimeFormat,
  ogeNumberFormat,
  type OgeLocaleInput,
} from './intl-cache';

/** What a declarative {@link OgeValueFormat} formats a value as. */
export type OgeValueFormatType =
  'number' | 'decimal' | 'currency' | 'percent' | 'date' | 'time' | 'datetime';

/**
 * A declarative value format — the data alternative to a `format` function on
 * a grid / tree-list column, a summary or a pivot field. Rendered through the
 * shared `Intl` cache in the component's `locale`:
 *
 * - `'number'` — locale digits with grouping (`1,234.5` / `1.234,5`);
 * - `'decimal'` — locale digits, no grouping (`1234,5`);
 * - `'currency'` — `currency` (ISO 4217, default `'USD'`) in the locale's
 *   currency layout;
 * - `'percent'` — a ratio as a percentage (`0.25` → `25%`);
 * - `'date'` / `'time'` / `'datetime'` — `dateStyle` / `timeStyle`, or the
 *   locale's numeric date and short time when unset.
 *
 * `pattern` overrides the Intl options with a small LDML subset — numbers:
 * `#,##0.00` (grouping, minimum integer and fraction digits; a `%` multiplies
 * by 100; text around it is kept); dates: `yyyy yy MMMM MMM MM M dd d EEEE EEE
 * HH H hh h mm ss a` with `'quoted'` literals. Digits, month and day names
 * still come from the locale.
 */
export interface OgeValueFormat {
  readonly type: OgeValueFormatType;
  /** ISO 4217 code for `'currency'` (default `'USD'`). */
  readonly currency?: string;
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  /** Date part of `'date'` / `'datetime'`. */
  readonly dateStyle?: 'full' | 'long' | 'medium' | 'short';
  /** Time part of `'time'` / `'datetime'`. */
  readonly timeStyle?: 'full' | 'long' | 'medium' | 'short';
  /** LDML-subset pattern; wins over the style options. */
  readonly pattern?: string;
}

/** Whether a format type renders dates. */
export function isOgeDateFormatType(type: OgeValueFormatType): boolean {
  return type === 'date' || type === 'time' || type === 'datetime';
}

/** Reads a cell value as a `Date`, or `null` when it is not one. */
export function ogeToDate(value: unknown): Date | null {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' || typeof value === 'string') {
    if (typeof value === 'string' && !value.trim()) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function numberOptions(format: OgeValueFormat): Intl.NumberFormatOptions {
  const digits = {
    minimumFractionDigits: format.minimumFractionDigits,
    maximumFractionDigits: format.maximumFractionDigits,
  };
  // Intl throws when max < min; let an explicit min raise the max
  if (
    digits.minimumFractionDigits !== undefined &&
    digits.maximumFractionDigits !== undefined &&
    digits.maximumFractionDigits < digits.minimumFractionDigits
  )
    digits.maximumFractionDigits = digits.minimumFractionDigits;
  switch (format.type) {
    case 'currency':
      return {
        style: 'currency',
        currency: format.currency ?? 'USD',
        ...digits,
      };
    case 'percent':
      return { style: 'percent', ...digits };
    case 'decimal':
      return { useGrouping: false, ...digits };
    default:
      return digits;
  }
}

function dateOptions(format: OgeValueFormat): Intl.DateTimeFormatOptions {
  switch (format.type) {
    case 'time':
      return { timeStyle: format.timeStyle ?? 'short' };
    case 'datetime':
      return {
        dateStyle: format.dateStyle ?? 'short',
        timeStyle: format.timeStyle ?? 'short',
      };
    default:
      // unset = the locale's numeric date, what an unformatted date cell shows
      return format.dateStyle ? { dateStyle: format.dateStyle } : {};
  }
}

/**
 * Compiles a declarative format into a `(value) => string` for `locale`. The
 * formatters come from the shared `Intl` cache, so compiling is cheap and the
 * returned function allocates nothing per call. `null` / `undefined` format
 * to `''`; a value of the wrong kind (text in a number column) is shown as is.
 */
export function ogeValueFormatter(
  format: OgeValueFormat,
  locale?: OgeLocaleInput,
): (value: unknown) => string {
  if (isOgeDateFormatType(format.type)) {
    const formatDate: (date: Date) => string = format.pattern
      ? compileDatePattern(format.pattern, locale)
      : bindFormat(ogeDateTimeFormat(locale, dateOptions(format)));
    return (value) => {
      if (value == null || value === '') return '';
      const date = ogeToDate(value);
      return date ? formatDate(date) : String(value);
    };
  }
  const formatNumber: (value: number) => string = format.pattern
    ? compileNumberPattern(format.pattern, format, locale)
    : bindFormat(ogeNumberFormat(locale, numberOptions(format)));
  return (value) => {
    if (value == null || value === '') return '';
    const number = toNumber(value);
    return number === null ? String(value) : formatNumber(number);
  };
}

function bindFormat<V>(formatter: {
  format(value: V): string;
}): (value: V) => string {
  return (value) => formatter.format(value);
}

/** One-shot {@link ogeValueFormatter}: formats `value` with `format` in `locale`. */
export function ogeFormatValue(
  value: unknown,
  format: OgeValueFormat,
  locale?: OgeLocaleInput,
): string {
  return ogeValueFormatter(format, locale)(value);
}

// ---------------------------------------------------------------- patterns

function compileNumberPattern(
  pattern: string,
  format: OgeValueFormat,
  locale: OgeLocaleInput,
): (value: number) => string {
  const match = /[#0][#0,.]*/.exec(pattern);
  if (!match) return (value) => ogeNumberFormat(locale).format(value);
  const body = match[0];
  const prefix = unquote(pattern.slice(0, match.index));
  const suffix = unquote(pattern.slice(match.index + body.length));
  const [integer, fraction = ''] = body.split('.');
  const percent = prefix.includes('%') || suffix.includes('%');
  const minFraction = (fraction.match(/0/g) ?? []).length;
  const options: Intl.NumberFormatOptions = {
    useGrouping: integer.includes(','),
    minimumIntegerDigits: Math.max(1, (integer.match(/0/g) ?? []).length),
    minimumFractionDigits: minFraction,
    maximumFractionDigits: Math.max(minFraction, fraction.length),
  };
  if (format.type === 'currency') {
    options.style = 'currency';
    options.currency = format.currency ?? 'USD';
  }
  const formatter = ogeNumberFormat(locale, options);
  return (value) =>
    prefix + formatter.format(percent ? value * 100 : value) + suffix;
}

function unquote(text: string): string {
  return text.replace(/'([^']*)'/g, (_, inner: string) => inner || "'");
}

const DATE_TOKEN =
  /'([^']*)'|yyyy|yy|y|MMMM|MMM|MM|M|dd|d|EEEE|EEE|HH|H|hh|h|mm|m|ss|s|a/g;

function compileDatePattern(
  pattern: string,
  locale: OgeLocaleInput,
): (date: Date) => string {
  const pieces: ((date: Date) => string)[] = [];
  let last = 0;
  for (const match of pattern.matchAll(DATE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) {
      const literal = pattern.slice(last, index);
      pieces.push(() => literal);
    }
    pieces.push(datePiece(match[0], match[1], locale));
    last = index + match[0].length;
  }
  if (last < pattern.length) {
    const literal = pattern.slice(last);
    pieces.push(() => literal);
  }
  return (date) => pieces.map((piece) => piece(date)).join('');
}

function datePiece(
  token: string,
  quoted: string | undefined,
  locale: OgeLocaleInput,
): (date: Date) => string {
  if (quoted !== undefined) {
    const literal = quoted || "'";
    return () => literal;
  }
  const digits = (min: number) =>
    ogeNumberFormat(locale, { minimumIntegerDigits: min, useGrouping: false });
  const two = digits(2);
  const one = digits(1);
  const name = (options: Intl.DateTimeFormatOptions) => {
    const formatter = ogeDateTimeFormat(locale, options);
    return (date: Date) => formatter.format(date);
  };
  switch (token) {
    case 'yyyy':
      return (date) => digits(4).format(date.getFullYear());
    case 'yy':
      return (date) => two.format(date.getFullYear() % 100);
    case 'y':
      return (date) => one.format(date.getFullYear());
    case 'MMMM':
      return name({ month: 'long' });
    case 'MMM':
      return name({ month: 'short' });
    case 'MM':
      return (date) => two.format(date.getMonth() + 1);
    case 'M':
      return (date) => one.format(date.getMonth() + 1);
    case 'dd':
      return (date) => two.format(date.getDate());
    case 'd':
      return (date) => one.format(date.getDate());
    case 'EEEE':
      return name({ weekday: 'long' });
    case 'EEE':
      return name({ weekday: 'short' });
    case 'HH':
      return (date) => two.format(date.getHours());
    case 'H':
      return (date) => one.format(date.getHours());
    case 'hh':
      return (date) => two.format(date.getHours() % 12 || 12);
    case 'h':
      return (date) => one.format(date.getHours() % 12 || 12);
    case 'mm':
      return (date) => two.format(date.getMinutes());
    case 'm':
      return (date) => one.format(date.getMinutes());
    case 'ss':
      return (date) => two.format(date.getSeconds());
    case 's':
      return (date) => one.format(date.getSeconds());
    default: {
      // 'a' — the locale's day period (AM / PM, ÖÖ / ÖS, ص / م)
      const formatter = ogeDateTimeFormat(locale, {
        hour: 'numeric',
        hour12: true,
      });
      return (date) =>
        formatter.formatToParts(date).find((part) => part.type === 'dayPeriod')
          ?.value ?? '';
    }
  }
}
