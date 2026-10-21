/**
 * The locale data the number-format renderer needs: separators, month and day
 * names, AM/PM, and the codes behind Excel's locale-dependent built-in
 * formats (the short date of `numFmtId` 14, the "system" long date and time).
 *
 * The renderer never consults the host: a workbook renders the same on every
 * machine unless the caller passes a locale. {@link OGE_EN_US_FORMAT_LOCALE}
 * is the default because it is what an Excel file's built-in codes mean when
 * nothing else is known. {@link ogeFormatLocale} builds the data for any BCP 47
 * tag from the platform's `Intl` (through `@oge-ui/core`'s formatter cache).
 */
import { ogeDateTimeFormat, ogeNumberFormat } from '@oge-ui/core';

/** Locale data for rendering Excel number formats. */
export interface OgeFormatLocale {
  /** BCP 47 tag the data came from (`'en-US'`). */
  readonly tag: string;
  /** Decimal separator shown for `.` in a format code. */
  readonly decimal: string;
  /** Thousands separator shown for a grouping `,`. */
  readonly group: string;
  /** January … December (`mmmm`). */
  readonly months: readonly string[];
  /** Jan … Dec (`mmm`). */
  readonly monthsShort: readonly string[];
  /** Sunday … Saturday (`dddd`). */
  readonly days: readonly string[];
  /** Sun … Sat (`ddd`). */
  readonly daysShort: readonly string[];
  /** Morning marker for `AM/PM`. */
  readonly am: string;
  /** Afternoon marker for `AM/PM`. */
  readonly pm: string;
  /** Format code of the locale's short date — what `numFmtId` 14 shows. */
  readonly shortDate: string;
  /** Format code of the locale's long date — `[$-F800]`, `[$-x-sysdate]`. */
  readonly longDate: string;
  /** Format code of the locale's long time — `[$-F400]`, `[$-x-systime]`. */
  readonly longTime: string;
  /** What a date section's `/` shows. Default `/`. */
  readonly dateSeparator?: string;
  /** What a date section's `:` shows. Default `:`. */
  readonly timeSeparator?: string;
  /**
   * Codes of the built-in format ids this locale defines differently. Excel
   * renders the currency (5–8, 37–44), date and time (14–22) built-ins in the
   * reader's regional format; a host that knows it passes the codes here.
   */
  readonly builtins?: Readonly<Partial<Record<number, string>>>;
}

/** United States English — Excel's meaning of the built-in format ids. */
export const OGE_EN_US_FORMAT_LOCALE: OgeFormatLocale = {
  tag: 'en-US',
  decimal: '.',
  group: ',',
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  monthsShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  days: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
  daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  am: 'AM',
  pm: 'PM',
  shortDate: 'm/d/yyyy',
  longDate: 'dddd, mmmm d, yyyy',
  longTime: 'h:mm:ss AM/PM',
  dateSeparator: '/',
  timeSeparator: ':',
};

/**
 * Windows locale ids (LCIDs) of the `[$-xxxx]` format prefix, for the
 * languages Excel ships. Only the low 16 bits name the language; the high
 * bits select a calendar or digit system and are masked off before lookup.
 */
const LCID_TAGS: ReadonlyMap<number, string> = new Map([
  [0x0401, 'ar-SA'],
  [0x0402, 'bg-BG'],
  [0x0404, 'zh-TW'],
  [0x0405, 'cs-CZ'],
  [0x0406, 'da-DK'],
  [0x0407, 'de-DE'],
  [0x0408, 'el-GR'],
  [0x0409, 'en-US'],
  [0x040b, 'fi-FI'],
  [0x040c, 'fr-FR'],
  [0x040d, 'he-IL'],
  [0x040e, 'hu-HU'],
  [0x0410, 'it-IT'],
  [0x0411, 'ja-JP'],
  [0x0412, 'ko-KR'],
  [0x0413, 'nl-NL'],
  [0x0414, 'nb-NO'],
  [0x0415, 'pl-PL'],
  [0x0416, 'pt-BR'],
  [0x0418, 'ro-RO'],
  [0x0419, 'ru-RU'],
  [0x041a, 'hr-HR'],
  [0x041b, 'sk-SK'],
  [0x041d, 'sv-SE'],
  [0x041e, 'th-TH'],
  [0x041f, 'tr-TR'],
  [0x0421, 'id-ID'],
  [0x0422, 'uk-UA'],
  [0x0424, 'sl-SI'],
  [0x042a, 'vi-VN'],
  [0x0439, 'hi-IN'],
  [0x0804, 'zh-CN'],
  [0x0807, 'de-CH'],
  [0x0809, 'en-GB'],
  [0x080a, 'es-MX'],
  [0x080c, 'fr-BE'],
  [0x0810, 'it-CH'],
  [0x0816, 'pt-PT'],
  [0x0c07, 'de-AT'],
  [0x0c09, 'en-AU'],
  [0x0c0a, 'es-ES'],
  [0x0c0c, 'fr-CA'],
  [0x1009, 'en-CA'],
  [0x100c, 'fr-CH'],
  [0x1409, 'en-NZ'],
  [0x1809, 'en-IE'],
  [0x1c09, 'en-ZA'],
  [0x2c0a, 'es-AR'],
  [0x4009, 'en-IN'],
]);

/** BCP 47 tag for a `[$-xxxx]` locale id, or `undefined` when unknown. */
export function ogeLcidToLocaleTag(lcid: number): string | undefined {
  return LCID_TAGS.get(lcid & 0xffff);
}

const localeCache = new Map<string, OgeFormatLocale>();

/**
 * Format locale data for a BCP 47 tag, from the platform's `Intl`. Cached per
 * tag; `en-US` returns {@link OGE_EN_US_FORMAT_LOCALE} so the default never
 * depends on the host's ICU build.
 */
export function ogeFormatLocale(tag: string): OgeFormatLocale {
  if (tag === 'en-US') return OGE_EN_US_FORMAT_LOCALE;
  const cached = localeCache.get(tag);
  if (cached) return cached;
  const locale = buildLocale(tag);
  if (localeCache.size >= 64) localeCache.clear();
  localeCache.set(tag, locale);
  return locale;
}

/**
 * A sample whose fields cannot be confused and show their padding:
 * Friday 2024-01-05 09:05:09 — single-digit month, day and hour.
 */
const SAMPLE = Date.UTC(2024, 0, 5, 9, 5, 9);
const SAMPLE_WEEKDAY = 5;

function buildLocale(tag: string): OgeFormatLocale {
  const utc = { timeZone: 'UTC' } as const;
  const monthLong = ogeDateTimeFormat(tag, { ...utc, month: 'long' });
  const monthShort = ogeDateTimeFormat(tag, { ...utc, month: 'short' });
  const dayLong = ogeDateTimeFormat(tag, { ...utc, weekday: 'long' });
  const dayShort = ogeDateTimeFormat(tag, { ...utc, weekday: 'short' });
  const months: string[] = [];
  const monthsShort: string[] = [];
  for (let m = 0; m < 12; m++) {
    const date = new Date(Date.UTC(2024, m, 15));
    months.push(monthLong.format(date));
    monthsShort.push(monthShort.format(date));
  }
  const days: string[] = [];
  const daysShort: string[] = [];
  for (let d = 0; d < 7; d++) {
    // 2024-01-14 is a Sunday
    const date = new Date(Date.UTC(2024, 0, 14 + d));
    days.push(dayLong.format(date));
    daysShort.push(dayShort.format(date));
  }
  const numberParts = ogeNumberFormat(tag).formatToParts(1234567.5);
  const decimal =
    numberParts.find((part) => part.type === 'decimal')?.value ?? '.';
  const group = numberParts.find((part) => part.type === 'group')?.value ?? ',';
  const period = (hour: number) =>
    ogeDateTimeFormat(tag, { ...utc, hour: 'numeric', hour12: true })
      .formatToParts(Date.UTC(2024, 0, 15, hour))
      .find((part) => part.type === 'dayPeriod')?.value;
  const separator = (
    parts: readonly Intl.DateTimeFormatPart[],
    after: Intl.DateTimeFormatPartTypes,
    fallback: string,
  ) => {
    const at = parts.findIndex((part) => part.type === after);
    const next = parts[at + 1];
    const text = next?.type === 'literal' ? next.value.trim() : '';
    return text.length === 1 ? text : fallback;
  };
  const numericDate = ogeDateTimeFormat(tag, {
    ...utc,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(SAMPLE);
  const firstDatePart =
    numericDate.find((part) => part.type !== 'literal')?.type ?? 'month';
  const time = ogeDateTimeFormat(tag, {
    ...utc,
    timeStyle: 'medium',
  }).formatToParts(SAMPLE);
  const names: Names = {
    month: months[0],
    monthShort: monthsShort[0],
    day: days[SAMPLE_WEEKDAY],
    dayShort: daysShort[SAMPLE_WEEKDAY],
  };
  return {
    tag,
    decimal,
    group,
    months,
    monthsShort,
    days,
    daysShort,
    am: period(9) ?? 'AM',
    pm: period(15) ?? 'PM',
    dateSeparator: separator(numericDate, firstDatePart, '/'),
    timeSeparator: separator(time, 'hour', ':'),
    shortDate: codeFromParts(
      ogeDateTimeFormat(tag, {
        ...utc,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).formatToParts(SAMPLE),
      names,
      OGE_EN_US_FORMAT_LOCALE.shortDate,
    ),
    longDate: codeFromParts(
      ogeDateTimeFormat(tag, { ...utc, dateStyle: 'full' }).formatToParts(
        SAMPLE,
      ),
      names,
      OGE_EN_US_FORMAT_LOCALE.longDate,
    ),
    longTime: codeFromParts(
      ogeDateTimeFormat(tag, { ...utc, timeStyle: 'medium' }).formatToParts(
        SAMPLE,
      ),
      names,
      OGE_EN_US_FORMAT_LOCALE.longTime,
    ),
  };
}

/** The sample's month and weekday names, long and short. */
interface Names {
  readonly month: string;
  readonly monthShort: string;
  readonly day: string;
  readonly dayShort: string;
}

/**
 * Turns `Intl` date parts of the sample into an Excel format code: fields
 * become tokens (padding read off the single-digit sample fields, names told
 * apart by comparing with the locale's own name lists), everything else a
 * quoted literal.
 */
function codeFromParts(
  parts: readonly Intl.DateTimeFormatPart[],
  names: Names,
  fallback: string,
): string {
  let code = '';
  for (const part of parts) {
    const { type, value } = part;
    switch (type) {
      case 'year':
        code += value.length <= 2 ? 'yy' : 'yyyy';
        break;
      case 'month':
        // any script's digits (ar-SA prints Arabic-Indic ones)
        if (/^\p{Nd}+$/u.test(value)) code += value.length === 2 ? 'mm' : 'm';
        else
          code +=
            value === names.monthShort && value !== names.month
              ? 'mmm'
              : 'mmmm';
        break;
      case 'day':
        code += value.length === 2 ? 'dd' : 'd';
        break;
      case 'weekday':
        code +=
          value === names.dayShort && value !== names.day ? 'ddd' : 'dddd';
        break;
      case 'hour':
        code += value.length === 2 ? 'hh' : 'h';
        break;
      case 'minute':
        code += 'mm';
        break;
      case 'second':
        code += 'ss';
        break;
      case 'dayPeriod':
        code += 'AM/PM';
        break;
      case 'literal':
        code += `"${value.replace(/"/g, '')}"`;
        break;
      default:
        // eras, time zone names, …: nothing an Excel code can express
        break;
    }
  }
  return code || fallback;
}
