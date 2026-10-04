/**
 * The suite's one cache of `Intl` formatters.
 *
 * Constructing an `Intl.NumberFormat` / `DateTimeFormat` costs far more than
 * calling `format()` on one — `Date#toLocaleDateString()` builds a fresh
 * formatter per call, a real cost when thousands of grid cells render. Every
 * package asks this module instead of writing `new Intl.*`: one instance per
 * `(locale, options)` pair, shared across components, render layers and
 * engines.
 *
 * SSR-safe: nothing runs at import time, there is no DOM access, and a locale
 * the runtime rejects (`RangeError`) falls back to the runtime default instead
 * of throwing out of a render.
 */

/** A BCP 47 tag, a list of them, or `undefined` for the runtime default. */
export type OgeLocaleInput = string | readonly string[] | undefined;

/** Entries per formatter kind before the cache starts over (a leak guard). */
const MAX_ENTRIES = 256;

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();
const relativeTimeFormats = new Map<string, Intl.RelativeTimeFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();

/** Stable key for an options bag: keys sorted, `undefined` values dropped. */
function optionsKey(options: object | undefined): string {
  if (!options) return '';
  const record = options as Record<string, unknown>;
  let key = '';
  for (const name of Object.keys(record).sort()) {
    const value = record[name];
    if (value === undefined) continue;
    key += `${name}=${String(value)};`;
  }
  return key;
}

function localeKey(locale: OgeLocaleInput): string {
  if (locale === undefined) return '';
  return typeof locale === 'string' ? locale : locale.join(',');
}

function cached<F, O extends object>(
  store: Map<string, F>,
  locale: OgeLocaleInput,
  options: O | undefined,
  create: (locale: string | string[] | undefined, options?: O) => F,
): F {
  const key = `${localeKey(locale)}|${optionsKey(options)}`;
  let formatter = store.get(key);
  if (formatter) return formatter;
  const tags =
    locale === undefined || typeof locale === 'string' ? locale : [...locale];
  try {
    formatter = create(tags, options);
  } catch {
    // an unknown / malformed locale tag, or options the engine rejects:
    // degrade to the runtime default rather than break the render
    try {
      formatter = create(undefined, options);
    } catch {
      formatter = create(undefined);
    }
  }
  if (store.size >= MAX_ENTRIES) store.clear();
  store.set(key, formatter);
  return formatter;
}

/** A shared `Intl.NumberFormat` for `(locale, options)`. */
export function ogeNumberFormat(
  locale?: OgeLocaleInput,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  return cached(
    numberFormats,
    locale,
    options,
    (tags, opts) => new Intl.NumberFormat(tags, opts),
  );
}

/** A shared `Intl.DateTimeFormat` for `(locale, options)`. */
export function ogeDateTimeFormat(
  locale?: OgeLocaleInput,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return cached(
    dateTimeFormats,
    locale,
    options,
    (tags, opts) => new Intl.DateTimeFormat(tags, opts),
  );
}

/** A shared `Intl.RelativeTimeFormat` for `(locale, options)`. */
export function ogeRelativeTimeFormat(
  locale?: OgeLocaleInput,
  options?: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat {
  return cached(
    relativeTimeFormats,
    locale,
    options,
    (tags, opts) => new Intl.RelativeTimeFormat(tags, opts),
  );
}

/** A shared `Intl.PluralRules` for `(locale, options)`. */
export function ogePluralRules(
  locale?: OgeLocaleInput,
  options?: Intl.PluralRulesOptions,
): Intl.PluralRules {
  return cached(
    pluralRules,
    locale,
    options,
    (tags, opts) => new Intl.PluralRules(tags, opts),
  );
}

/**
 * The environment's locale for render layers without an app-level one (the
 * React components): `navigator.language` in a browser, `undefined` — the
 * runtime default — on a server.
 */
export function ogeDefaultLocale(): string | undefined {
  return typeof navigator !== 'undefined' && navigator.language
    ? navigator.language
    : undefined;
}

/** Number of cached formatters, per kind — for specs and leak checks. */
export function ogeIntlCacheSize(): {
  number: number;
  dateTime: number;
  relativeTime: number;
  plural: number;
} {
  return {
    number: numberFormats.size,
    dateTime: dateTimeFormats.size,
    relativeTime: relativeTimeFormats.size,
    plural: pluralRules.size,
  };
}

/** Empties every formatter cache (tests; never needed in an app). */
export function clearOgeIntlCache(): void {
  numberFormats.clear();
  dateTimeFormats.clear();
  relativeTimeFormats.clear();
  pluralRules.clear();
}

interface NumberSymbols {
  group: string;
  decimal: string;
  minus: string;
  digits: string;
}

const symbolCache = new Map<string, NumberSymbols>();

function numberSymbols(locale: OgeLocaleInput): NumberSymbols {
  const key = localeKey(locale);
  let symbols = symbolCache.get(key);
  if (symbols) return symbols;
  const parts = ogeNumberFormat(locale).formatToParts(-12345.6);
  const digitText = ogeNumberFormat(locale, { useGrouping: false }).format(
    9876543210,
  );
  symbols = {
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    minus: parts.find((p) => p.type === 'minusSign')?.value ?? '-',
    // the locale's own digits, 0…9 (Arabic-Indic for ar-EG)
    digits: [...digitText].reverse().join(''),
  };
  if (symbolCache.size >= MAX_ENTRIES) symbolCache.clear();
  symbolCache.set(key, symbols);
  return symbols;
}

/** No-break space and narrow no-break space: fr-FR / de-CH style groups. */
const SPACE_GROUPS = [String.fromCharCode(0xa0), String.fromCharCode(0x202f)];
/** MINUS SIGN (U+2212), which some locales format negatives with. */
const MINUS_SIGN = String.fromCharCode(0x2212);

/**
 * Parses number text typed in `locale` with the number box's rules: the
 * locale's group separator is ignored (a typed space too where it groups with
 * a no-break space), its decimal separator reads as the point, native digits
 * are read (Arabic-Indic in ar-EG) and currency / percent affixes are dropped.
 * Text the locale rules cannot read falls back to `Number()`. `NaN` when
 * blank or not a number.
 *
 * ```ts
 * ogeParseNumber('1.234,5', 'de-DE'); // 1234.5
 * ogeParseNumber('1,5', 'tr-TR');     // 1.5
 * ```
 */
export function ogeParseNumber(text: string, locale?: OgeLocaleInput): number {
  const trimmed = text.trim();
  if (!trimmed) return NaN;
  const { group, decimal, minus, digits } = numberSymbols(locale);
  const spaceGroup = SPACE_GROUPS.includes(group);
  let normalized = '';
  for (const char of trimmed) {
    const digit = digits.length === 10 ? digits.indexOf(char) : -1;
    if (digit >= 0) normalized += String(digit);
    else if (char === group || (spaceGroup && char === ' ')) continue;
    else if (char === decimal) normalized += '.';
    else if (char === minus || char === MINUS_SIGN) normalized += '-';
    else normalized += char;
  }
  normalized = normalized.replace(/[^0-9eE+.-]/g, '');
  const value =
    !normalized || normalized === '-' || normalized === '.'
      ? NaN
      : Number(normalized);
  if (!Number.isNaN(value)) return value;
  const ascii = Number(trimmed);
  return Number.isNaN(ascii) ? NaN : ascii;
}
