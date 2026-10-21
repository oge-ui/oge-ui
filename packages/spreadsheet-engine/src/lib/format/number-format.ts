/**
 * Excel number formats (ECMA-376 Part 1 §18.8.31): parsing a format code once
 * and rendering cell values through it the way Excel displays them.
 *
 * A format code has up to four `;`-separated sections — positive, negative,
 * zero, text — or conditional ones (`[>=100]…;[<0]…;…`). A section is a number
 * section (digit placeholders `0 # ?`, decimal point, grouping and scaling
 * commas, `%`, scientific `E+`, fractions `# ?/?`), a date/time section
 * (`y m d h s`, `AM/PM`, elapsed `[h]`), a text section (`@`) or `General`,
 * plus literals (`"…"`, `\x`, pass-through characters), padding `_x`, a fill
 * `*x`, a colour `[Red]` and a locale `[$€-407]`.
 *
 * The behaviour follows Excel, not the letter of the spec, wherever the two
 * part: the minus sign leads the whole text (`-$5.00`), a single-section
 * format drops it when the rounded result is zero, a condition that can only
 * match negatives shows the magnitude, fractions are continued-fraction
 * convergents (`0.3` → `1/3`, not the closer `2/7`), and a date-only format
 * never rounds the time into the next day.
 *
 * Codes come from files, so compiling and rendering are total: an odd code
 * renders something, nothing throws, and a value no section can show comes
 * back with `overflow` set (Excel fills such a cell with `#`).
 */
import {
  isOgeDecimalZero,
  ogeDecimalFractionDigits,
  ogeDecimalIntegerDigits,
  ogeDecimalMagnitude,
  ogeDecimalOf,
  ogeRoundDecimalPlaces,
  ogeShiftDecimal,
  formatOgeDecimal,
  type OgeDecimal,
} from './decimal';
import { formatOgeGeneral, OGE_GENERAL_MAX_CHARS } from './general';
import {
  OGE_EN_US_FORMAT_LOCALE,
  ogeFormatLocale,
  ogeLcidToLocaleTag,
  type OgeFormatLocale,
} from './format-locale';
import {
  ogeSerialToDateParts,
  type OgeDateParts,
  type OgeDateSystem,
} from '../date/date-serial';
import { OGE_INDEXED_COLORS } from '../color/color';

/** A section's `[<100]`-style condition. */
export interface OgeFormatCondition {
  readonly operator: '<' | '<=' | '>' | '>=' | '=' | '<>';
  readonly value: number;
}

/**
 * A parsed format code, ready to render (see {@link compileOgeNumberFormat}).
 * The compiled sections are internal; these flags are what callers branch on.
 */
export interface OgeNumberFormat {
  /** The code it was compiled from. */
  readonly code: string;
  /** Whether numbers show as dates or times — a reader types such cells as dates. */
  readonly isDate: boolean;
  /** Whether numbers show as percentages (an editor then reads `5` as 5%). */
  readonly isPercent: boolean;
  /** Whether the code has a text section; `@` alone is Excel's "Text" format. */
  readonly isText: boolean;
}

/** The text Excel paints for a value, plus what it paints around it. */
export interface OgeFormattedValue {
  /** Display text: `_x` padding is a space, a `*x` fill is left out (see `fill`). */
  readonly text: string;
  /** Section colour (`[Red]`, `[Color10]`) as `#RRGGBB`. */
  readonly color?: string;
  /** A `*x` fill: `char` repeats at `index` of `text` until the cell is full. */
  readonly fill?: { readonly char: string; readonly index: number };
  /**
   * Excel fills the cell with `#` instead: a date out of range, a negative
   * time, a number no conditional section accepts.
   */
  readonly overflow?: boolean;
}

/** How values are rendered. */
export interface OgeNumberFormatOptions {
  /** Separators, names and system formats. Default: United States English. */
  readonly locale?: OgeFormatLocale;
  /** The workbook's date system. Default `'1900'`. */
  readonly dateSystem?: OgeDateSystem;
  /** General's character budget (a narrow column passes less). Default 11. */
  readonly generalMaxChars?: number;
  /**
   * Month and day names for a `[$-xxxx]` locale prefix. Default: built from
   * `Intl` for the languages Excel ships; `undefined` keeps `locale`'s names.
   */
  readonly resolveLcid?: (lcid: number) => OgeFormatLocale | undefined;
  /**
   * Show the locale's own morning/afternoon markers for `AM/PM`. Excel does
   * that only for the locale's built-in time formats (ids 18 and 19); a code
   * a user wrote always shows `AM`/`PM` — measured in a tr-TR Excel, where
   * `h AM/PM` shows "4 PM" but built-in 18 shows "4:36 ÖS".
   */
  readonly localeMarkers?: boolean;
}

/** A value a cell can hold, as far as formatting goes. */
export type OgeFormattableValue = number | string | boolean;

// ── tokens ────────────────────────────────────────────────────────────────

type DatePart = 'y' | 'M' | 'd' | 'h' | 'm' | 's' | 'e' | 'b' | 'g' | 'a';

type Token =
  | { readonly k: 'lit'; readonly v: string }
  | { readonly k: 'digit'; readonly v: '0' | '#' | '?' }
  | { readonly k: 'num'; readonly v: string }
  | { readonly k: 'point' }
  | { readonly k: 'comma' }
  | { readonly k: 'percent' }
  | { readonly k: 'exp'; readonly plus: boolean; readonly letter: string }
  | { readonly k: 'slash' }
  | { readonly k: 'colon' }
  /** A date section's `/` and `:`: the locale's date and time separators. */
  | { readonly k: 'datesep' }
  | { readonly k: 'timesep' }
  | { readonly k: 'at' }
  | { readonly k: 'general' }
  | { readonly k: 'pad'; readonly v: string }
  | { readonly k: 'fill'; readonly v: string }
  | {
      readonly k: 'date';
      readonly part: DatePart;
      readonly n: number;
      readonly raw: string;
    }
  | { readonly k: 'ampm'; readonly v: string }
  | {
      readonly k: 'elapsed';
      readonly part: 'h' | 'm' | 's';
      readonly n: number;
    }
  | { readonly k: 'sub'; readonly n: number };

type TokenOf<K extends Token['k']> = Extract<Token, { k: K }>;

/** A section as tokenized: tokens plus what its `[…]` blocks said. */
interface RawSection {
  readonly tokens: Token[];
  color?: string;
  condition?: OgeFormatCondition;
  lcid?: number;
  system?: 'date' | 'time';
}

const NAMED_COLORS: ReadonlyMap<string, string> = new Map([
  ['black', '#000000'],
  ['blue', '#0000FF'],
  ['cyan', '#00FFFF'],
  ['green', '#00FF00'],
  ['magenta', '#FF00FF'],
  ['red', '#FF0000'],
  ['white', '#FFFFFF'],
  ['yellow', '#FFFF00'],
]);

const CONDITION_OPERATORS = ['<=', '>=', '<>', '<', '>', '='] as const;

const DATE_LETTERS: ReadonlyMap<string, DatePart> = new Map([
  ['y', 'y'],
  ['m', 'M'],
  ['d', 'd'],
  ['h', 'h'],
  ['s', 's'],
  ['e', 'e'],
  ['b', 'b'],
  ['g', 'g'],
  ['a', 'a'],
]);

/** Splits a code into sections of tokens. Total: every character lands somewhere. */
function tokenize(code: string): RawSection[] {
  const sections: RawSection[] = [];
  let current: RawSection = { tokens: [] };
  const push = (token: Token) => current.tokens.push(token);
  const lit = (text: string) => {
    const last = current.tokens[current.tokens.length - 1];
    if (last && last.k === 'lit') {
      current.tokens[current.tokens.length - 1] = {
        k: 'lit',
        v: last.v + text,
      };
    } else push({ k: 'lit', v: text });
  };
  const len = code.length;
  let i = 0;
  while (i < len) {
    const ch = code[i];
    const lower = ch.toLowerCase();
    if (ch === ';') {
      sections.push(current);
      current = { tokens: [] };
      i++;
    } else if (ch === '"') {
      const close = code.indexOf('"', i + 1);
      const end = close < 0 ? len : close;
      if (end > i + 1) lit(code.slice(i + 1, end));
      i = end + 1;
    } else if (ch === '\\') {
      if (i + 1 < len) lit(code[i + 1]);
      i += 2;
    } else if (ch === '_' || ch === '*') {
      if (i + 1 < len) push({ k: ch === '_' ? 'pad' : 'fill', v: code[i + 1] });
      i += 2;
    } else if (ch === '[') {
      const close = code.indexOf(']', i + 1);
      if (close < 0) {
        lit(code.slice(i));
        i = len;
      } else {
        bracket(code.slice(i + 1, close), current, push, lit);
        i = close + 1;
      }
    } else if (ch === '0' || ch === '#' || ch === '?') {
      push({ k: 'digit', v: ch });
      i++;
    } else if (ch >= '1' && ch <= '9') {
      push({ k: 'num', v: ch });
      i++;
    } else if (ch === '.') {
      push({ k: 'point' });
      i++;
    } else if (ch === ',') {
      push({ k: 'comma' });
      i++;
    } else if (ch === '%') {
      push({ k: 'percent' });
      i++;
    } else if (ch === '@') {
      push({ k: 'at' });
      i++;
    } else if (ch === '/') {
      push({ k: 'slash' });
      i++;
    } else if (ch === ':') {
      push({ k: 'colon' });
      i++;
    } else if (lower === 'e' && (code[i + 1] === '+' || code[i + 1] === '-')) {
      push({ k: 'exp', plus: code[i + 1] === '+', letter: ch });
      i += 2;
    } else if (
      lower === 'g' &&
      code.slice(i, i + 7).toLowerCase() === 'general'
    ) {
      push({ k: 'general' });
      i += 7;
    } else if (
      lower === 'a' &&
      code.slice(i, i + 5).toLowerCase() === 'am/pm'
    ) {
      push({ k: 'ampm', v: code.slice(i, i + 5) });
      i += 5;
    } else if (lower === 'a' && code.slice(i, i + 3).toLowerCase() === 'a/p') {
      push({ k: 'ampm', v: code.slice(i, i + 3) });
      i += 3;
    } else if (lower === 'b' && (code[i + 1] === '1' || code[i + 1] === '2')) {
      // B1 / B2 calendar prefixes (Hijri): accepted, rendered Gregorian
      i += 2;
    } else {
      const part = DATE_LETTERS.get(lower);
      if (part) {
        let n = 1;
        while (i + n < len && code[i + n].toLowerCase() === lower) n++;
        push({ k: 'date', part, n, raw: code.slice(i, i + n) });
        i += n;
      } else {
        // anything else shows as itself — Excel escapes such characters when
        // a user types them, but codes in files may hold them bare
        lit(ch);
        i++;
      }
    }
  }
  sections.push(current);
  return sections;
}

/** Reads one `[…]`: colour, condition, locale, elapsed time or a modifier. */
function bracket(
  body: string,
  section: RawSection,
  push: (token: Token) => void,
  lit: (text: string) => void,
): void {
  const lower = body.toLowerCase();
  const named = NAMED_COLORS.get(lower);
  if (named) {
    section.color ??= named;
    return;
  }
  if (lower.startsWith('color')) {
    const n = Number(lower.slice(5));
    if (Number.isInteger(n) && n >= 1 && n <= 56) {
      section.color ??= `#${OGE_INDEXED_COLORS[n + 7]}`;
    }
    return;
  }
  const condition = parseCondition(body);
  if (condition) {
    section.condition ??= condition;
    return;
  }
  if (body.startsWith('$')) {
    const dash = body.indexOf('-');
    const symbol = dash < 0 ? body.slice(1) : body.slice(1, dash);
    if (symbol) lit(symbol);
    if (dash >= 0) {
      const locale = body.slice(dash + 1).toLowerCase();
      if (locale === 'x-sysdate') section.system = 'date';
      else if (locale === 'x-systime') section.system = 'time';
      else if (/^[0-9a-f]{1,8}$/.test(locale)) {
        const lcid = parseInt(locale, 16);
        const language = lcid & 0xffff;
        if (language === 0xf800) section.system = 'date';
        else if (language === 0xf400) section.system = 'time';
        else section.lcid = lcid;
      }
    }
    return;
  }
  if (/^(h+|m+|s+)$/.test(lower)) {
    push({ k: 'elapsed', part: lower[0] as 'h' | 'm' | 's', n: lower.length });
  }
  // [DBNum1], [NatNum3], …: numeral-system modifiers, ignored (digits stay ASCII)
}

/** `<=100`, `>-5.5`, `=0` → a condition; anything else → `null`. */
function parseCondition(body: string): OgeFormatCondition | null {
  const text = body.trim();
  const operator = CONDITION_OPERATORS.find((op) => text.startsWith(op));
  if (!operator) return null;
  const number = text.slice(operator.length).trim();
  if (!/^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(number)) return null;
  return { operator, value: Number(number) };
}

// ── compiled sections ────────────────────────────────────────────────────

type SectionKind = 'number' | 'date' | 'text' | 'general';

/** Where each digit placeholder of a number section belongs. */
interface NumberPlan {
  /** Token indexes of integer-part placeholders, left to right. */
  readonly integer: readonly number[];
  /** Token indexes of decimal placeholders, left to right. */
  readonly decimals: readonly number[];
  readonly grouping: boolean;
  /** Powers of ten applied before rounding (`%` adds 2, a scaling `,` takes 3). */
  readonly shift: number;
  /** Index of the decimal point token, or -1. */
  readonly point: number;
  readonly exponent: ExponentPlan | null;
  readonly fraction: FractionPlan | null;
}

interface ExponentPlan {
  readonly plus: boolean;
  /** Token indexes of the exponent's placeholders. */
  readonly digits: readonly number[];
}

interface FractionPlan {
  /** Placeholders of the whole-number part (empty: an improper fraction). */
  readonly whole: readonly number[];
  readonly numerator: readonly number[];
  readonly denominator: readonly number[];
  /** A fixed denominator (`# ?/8`, `#/100`), else 0. */
  readonly fixed: number;
  /** Token indexes of the fixed denominator's written digits. */
  readonly fixedDigits: readonly number[];
}

interface Section {
  readonly kind: SectionKind;
  readonly tokens: readonly Token[];
  readonly color?: string;
  readonly condition?: OgeFormatCondition;
  readonly lcid?: number;
  readonly system?: 'date' | 'time';
  readonly plan: NumberPlan | null;
  /** Date sections: sub-second digits shown (0–3). */
  readonly subsecond: number;
  /** Date sections: whether any time-of-day field is shown. */
  readonly hasTime: boolean;
  /** Date sections: hours on a 12-hour clock. */
  readonly twelveHour: boolean;
  /** Date sections: only elapsed and clock fields (`[h]:mm`). */
  readonly elapsedOnly: boolean;
}

interface Compiled {
  readonly sections: readonly Section[];
  /** Sections numbers choose from (the text section excluded). */
  readonly numeric: readonly Section[];
  readonly text: Section | null;
}

const MAX_SECTIONS = 4;

/** A date letter outside a date section shows as itself, in its own case. */
function letterLiteral(token: TokenOf<'date'>): Token {
  return { k: 'lit', v: token.raw };
}

function isDateToken(token: Token): boolean {
  if (token.k === 'ampm' || token.k === 'elapsed') return true;
  if (token.k !== 'date') return false;
  if (token.part === 'g') return false;
  // `aaa`/`aaaa` are weekday names; a lone `a` is a letter
  return token.part !== 'a' || token.n >= 3;
}

function compileSection(raw: RawSection): Section {
  const common = {
    color: raw.color,
    condition: raw.condition,
    lcid: raw.lcid,
    system: raw.system,
    plan: null,
    subsecond: 0,
    hasTime: false,
    twelveHour: false,
    elapsedOnly: false,
  };
  const tokens = raw.tokens;
  if (raw.system !== undefined || tokens.some(isDateToken)) {
    return compileDateSection(tokens, common);
  }
  const plain = tokens.map((t): Token =>
    t.k === 'date'
      ? letterLiteral(t)
      : t.k === 'colon'
        ? { k: 'lit', v: ':' }
        : t,
  );
  // a section holding only a colour or a condition shows the number as General
  if (
    plain.length === 0 &&
    (raw.color !== undefined || raw.condition !== undefined)
  ) {
    return { ...common, kind: 'general', tokens: [{ k: 'general' }] };
  }
  if (plain.some((t) => t.k === 'general'))
    return { ...common, kind: 'general', tokens: plain };
  if (plain.some((t) => t.k === 'at'))
    return { ...common, kind: 'text', tokens: plain };
  const { tokens: numberTokens, plan } = planNumber(plain);
  return { ...common, kind: 'number', tokens: numberTokens, plan };
}

/**
 * Classifies a number section's tokens. Commas between integer placeholders
 * turn grouping on; a run right after the last placeholder scales by 1000
 * each; any other comma is a literal.
 */
function planNumber(input: readonly Token[]): {
  tokens: Token[];
  plan: NumberPlan;
} {
  const tokens = [...input];
  const expIndex = tokens.findIndex((t) => t.k === 'exp');
  const mantissaEnd = expIndex < 0 ? tokens.length : expIndex;
  let point = -1;
  for (let i = 0; i < mantissaEnd; i++) {
    if (tokens[i].k === 'point') {
      point = i;
      break;
    }
  }
  const integerEnd = point < 0 ? mantissaEnd : point;
  const digitAt = (i: number) => tokens[i].k === 'digit';
  let firstInteger = -1;
  let lastInteger = -1;
  for (let i = 0; i < integerEnd; i++) {
    if (!digitAt(i)) continue;
    if (firstInteger < 0) firstInteger = i;
    lastInteger = i;
  }
  let grouping = false;
  let scaling = 0;
  for (let i = 0; i < mantissaEnd; i++) {
    if (tokens[i].k !== 'comma') continue;
    if (firstInteger >= 0 && i > firstInteger && i < lastInteger) {
      grouping = true;
      continue;
    }
    // a scaling run follows a placeholder directly (commas may chain)
    let j = i - 1;
    while (j >= 0 && tokens[j].k === 'comma') j--;
    const afterDigit = j >= 0 && digitAt(j);
    let laterDigit = false;
    for (let k = i + 1; k < integerEnd && !laterDigit; k++)
      laterDigit = digitAt(k);
    if (afterDigit && !laterDigit) scaling++;
    else tokens[i] = { k: 'lit', v: ',' };
  }
  let percent = 0;
  for (let i = 0; i < mantissaEnd; i++)
    if (tokens[i].k === 'percent') percent++;
  const fraction = expIndex < 0 ? planFraction(tokens) : null;
  const integer: number[] = [];
  const decimals: number[] = [];
  for (let i = 0; i < mantissaEnd; i++) {
    if (!digitAt(i)) continue;
    if (point >= 0 && i > point) decimals.push(i);
    else integer.push(i);
  }
  const exponent =
    expIndex < 0
      ? null
      : {
          plus: (tokens[expIndex] as TokenOf<'exp'>).plus,
          digits: tokens.flatMap((t, i) =>
            i > expIndex && t.k === 'digit' ? [i] : [],
          ),
        };
  return {
    tokens,
    plan: {
      integer: fraction ? [] : integer,
      decimals: fraction ? [] : decimals,
      grouping,
      shift: percent * 2 - scaling * 3,
      point: fraction ? -1 : point,
      exponent,
      fraction,
    },
  };
}

/** `# ?/?`, `?/?`, `# ??/16`, `#/100` — or `null` when the slash is a literal. */
function planFraction(tokens: Token[]): FractionPlan | null {
  const slash = tokens.findIndex((t) => t.k === 'slash');
  if (slash < 0) return null;
  // the numerator: the placeholder run right before the slash
  const numerator: number[] = [];
  let j = slash - 1;
  while (j >= 0 && tokens[j].k === 'digit') numerator.unshift(j--);
  if (!numerator.length) return null;
  // the denominator: placeholders, or written digits (a fixed denominator —
  // `#/100` spells its zeros with the placeholder character)
  const denominator: number[] = [];
  const fixedDigits: number[] = [];
  let fixedText = '';
  for (let i = slash + 1; i < tokens.length; i++) {
    const t = tokens[i];
    const fixedDigit =
      t.k === 'num' || (t.k === 'digit' && t.v === '0' && fixedText !== '');
    if (fixedDigit && denominator.length === 0) {
      fixedText += t.v;
      fixedDigits.push(i);
      tokens[i] = { k: 'num', v: t.v };
    } else if (t.k === 'digit' && fixedText === '') denominator.push(i);
    else break;
  }
  const fixed = fixedText ? Number(fixedText) : 0;
  if (!denominator.length && !fixed) return null;
  // the whole part: placeholders before the numerator, past a separator
  const whole: number[] = [];
  for (let w = 0; w < j; w++) if (tokens[w].k === 'digit') whole.push(w);
  return { whole, numerator, denominator, fixed, fixedDigits };
}

function compileDateSection(
  tokens: readonly Token[],
  common: Omit<Section, 'kind' | 'tokens'>,
): Section {
  const out: Token[] = [];
  let subsecond = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // `ss.000`: a point and zeros right after the seconds are sub-seconds
    if (t.k === 'point' && lastField(out) === 's') {
      let n = 0;
      while (
        tokens[i + 1 + n]?.k === 'digit' &&
        (tokens[i + 1 + n] as TokenOf<'digit'>).v === '0'
      )
        n++;
      if (n > 0) {
        const digits = Math.min(3, n);
        subsecond = Math.max(subsecond, digits);
        out.push({ k: 'sub', n: digits });
        i += n;
        continue;
      }
    }
    out.push(asDateToken(t));
  }
  // `m` / `mm` beside an hour or a second are minutes, not months
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    if (t.k !== 'date' || t.part !== 'M' || t.n > 2) continue;
    if (neighbour(out, i, -1) === 'h' || neighbour(out, i, 1) === 's') {
      out[i] = { ...t, part: 'm' };
    }
  }
  const timeField = (t: Token) =>
    t.k === 'ampm' ||
    t.k === 'elapsed' ||
    t.k === 'sub' ||
    (t.k === 'date' && (t.part === 'h' || t.part === 'm' || t.part === 's'));
  const hasTime = common.system === 'time' || out.some(timeField);
  const elapsedOnly =
    out.some((t) => t.k === 'elapsed') &&
    out.every(
      (t) =>
        t.k !== 'date' || t.part === 'm' || t.part === 's' || t.part === 'g',
    );
  return {
    ...common,
    kind: 'date',
    tokens: out,
    subsecond,
    hasTime,
    twelveHour: out.some((t) => t.k === 'ampm'),
    elapsedOnly,
  };
}

/** Number-section tokens inside a date section are plain characters. */
function asDateToken(t: Token): Token {
  switch (t.k) {
    case 'digit':
    case 'num':
      return { k: 'lit', v: t.v };
    case 'point':
      return { k: 'lit', v: '.' };
    case 'comma':
      return { k: 'lit', v: ',' };
    case 'percent':
      return { k: 'lit', v: '%' };
    case 'slash':
      // Excel shows the locale's date separator (tr-TR: `m/d/yy` → "1.2.24")
      return { k: 'datesep' };
    case 'colon':
      return { k: 'timesep' };
    case 'exp':
      return { k: 'lit', v: t.letter + (t.plus ? '+' : '-') };
    case 'at':
    case 'general':
      return { k: 'lit', v: '' };
    case 'date':
      return t.part === 'a' && t.n < 3 ? letterLiteral(t) : t;
    default:
      return t;
  }
}

/** The unit of the last field so far (elapsed fields count as their unit). */
function lastField(tokens: readonly Token[]): string | null {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.k === 'date' || t.k === 'elapsed') return t.part;
    if (t.k === 'sub' || t.k === 'ampm') return null;
  }
  return null;
}

/** The nearest field's unit in `direction`, skipping literals and padding. */
function neighbour(
  tokens: readonly Token[],
  from: number,
  direction: 1 | -1,
): string | null {
  for (let i = from + direction; i >= 0 && i < tokens.length; i += direction) {
    const t = tokens[i];
    if (t.k === 'date' || t.k === 'elapsed') return t.part;
    if (t.k === 'ampm' || t.k === 'sub') return null;
  }
  return null;
}

// ── compile + cache ──────────────────────────────────────────────────────

const compiledOf = new WeakMap<OgeNumberFormat, Compiled>();
const cache = new Map<string, OgeNumberFormat>();
const CACHE_LIMIT = 2048;

/**
 * Parses a format code once (cached per code). Never throws: an unknown
 * character shows as itself and sections past the fourth are ignored.
 */
export function compileOgeNumberFormat(code: string): OgeNumberFormat {
  const hit = cache.get(code);
  if (hit) return hit;
  const sections = buildSections(code);
  const format: OgeNumberFormat = {
    code,
    isDate: sections.numeric.some((s) => s.kind === 'date'),
    isPercent: sections.numeric.some((s) =>
      s.tokens.some((t) => t.k === 'percent'),
    ),
    isText: sections.text !== null,
  };
  compiledOf.set(format, sections);
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(code, format);
  return format;
}

function buildSections(code: string): Compiled {
  const sections = tokenize(code).slice(0, MAX_SECTIONS).map(compileSection);
  const text = textSectionOf(sections);
  return { sections, numeric: sections.filter((s) => s !== text), text };
}

/** The fourth section, else the last one with `@` (a lone `@` is "Text"). */
function textSectionOf(sections: readonly Section[]): Section | null {
  if (sections.length === MAX_SECTIONS) return sections[3];
  for (let i = sections.length - 1; i >= 0; i--) {
    if (sections[i].kind === 'text') return sections[i];
  }
  return null;
}

/** The sections behind a format (rebuilt for a look-alike object built by hand). */
function compiled(format: OgeNumberFormat): Compiled {
  return compiledOf.get(format) ?? buildSections(format.code);
}

/** Whether a format code shows numbers as dates or times. */
export function isOgeDateFormat(code: string): boolean {
  return compileOgeNumberFormat(code).isDate;
}

// ── rendering ────────────────────────────────────────────────────────────

/**
 * Renders a cell value through a format code the way Excel displays it.
 * Booleans show as `TRUE`/`FALSE` under any format; text uses the text
 * section, or shows unchanged; numbers pick their section by sign or condition.
 */
export function formatOgeCellValue(
  value: OgeFormattableValue,
  format: string | OgeNumberFormat,
  options: OgeNumberFormatOptions = {},
): OgeFormattedValue {
  const parsed =
    typeof format === 'string' ? compileOgeNumberFormat(format) : format;
  if (typeof value === 'boolean') return { text: value ? 'TRUE' : 'FALSE' };
  if (typeof value === 'string') return renderText(value, compiled(parsed));
  return renderNumber(value, compiled(parsed), options);
}

function renderText(value: string, format: Compiled): OgeFormattedValue {
  const section = format.text;
  if (!section) return { text: value };
  return emit(section, (token, out) => {
    if (token.k === 'at') out.push(value);
  });
}

/** The section a number shows in, and whether it shows the number's own sign. */
interface Choice {
  readonly section: Section;
  readonly signed: boolean;
}

/** Whether a condition can only hold for negative numbers. */
function negativeOnly(condition: OgeFormatCondition): boolean {
  const { operator, value } = condition;
  return (
    (operator === '<' && value <= 0) ||
    (operator === '<=' && value < 0) ||
    (operator === '=' && value < 0)
  );
}

function chooseSection(
  value: number,
  sections: readonly Section[],
): Choice | null {
  const [first, second, third] = sections;
  if (!first.condition && !second?.condition) {
    if (!second) return { section: first, signed: true };
    if (value < 0) return { section: second, signed: false };
    if (value === 0 && third) return { section: third, signed: false };
    return { section: first, signed: false };
  }
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    let condition = section.condition;
    if (!condition) {
      if (i === 0) condition = { operator: '>=', value: 0 };
      else if (i === 1 && sections.length > 2)
        condition = { operator: '<', value: 0 };
      else {
        // the unconditioned rest: a third section always shows the sign; a
        // bare second one only after a first that took positives or a value
        const firstCondition = first.condition;
        const signed =
          i > 1 ||
          !firstCondition ||
          firstCondition.operator === '=' ||
          firstCondition.operator === '<>' ||
          ((firstCondition.operator === '>' ||
            firstCondition.operator === '>=') &&
            firstCondition.value >= 0);
        return { section, signed };
      }
    }
    if (matches(value, condition))
      return { section, signed: !negativeOnly(condition) };
  }
  return null;
}

function matches(value: number, condition: OgeFormatCondition): boolean {
  const limit = condition.value;
  switch (condition.operator) {
    case '<':
      return value < limit;
    case '<=':
      return value <= limit;
    case '>':
      return value > limit;
    case '>=':
      return value >= limit;
    case '=':
      return value === limit;
    default:
      return value !== limit;
  }
}

/** A section's rendering plus whether the number it shows came out as zero. */
interface Rendered {
  readonly value: OgeFormattedValue;
  readonly zero: boolean;
}

function renderNumber(
  value: number,
  format: Compiled,
  options: OgeNumberFormatOptions,
): OgeFormattedValue {
  if (!Number.isFinite(value)) return { text: '#NUM!' };
  const maxChars = options.generalMaxChars ?? OGE_GENERAL_MAX_CHARS;
  const baseLocale = options.locale ?? OGE_EN_US_FORMAT_LOCALE;
  if (format.numeric.length === 0) {
    // a text-only format (`@`) shows numbers as General, without its literals
    const general = formatOgeGeneral(value, maxChars, baseLocale.decimal);
    return general === null ? { text: '', overflow: true } : { text: general };
  }
  const choice = chooseSection(value, format.numeric);
  if (!choice) return { text: '', overflow: true };
  const { section, signed } = choice;
  const locale = localeFor(section, baseLocale, options);
  const magnitude = Math.abs(value);
  if (section.kind === 'date') {
    return renderDate(signed ? value : magnitude, section, locale, options);
  }
  let rendered: Rendered;
  if (section.kind === 'general')
    rendered = renderGeneral(magnitude, section, locale, maxChars);
  else rendered = renderNumeric(magnitude, section, locale);
  const result = rendered.value;
  // the minus leads the whole text — and a negative that rounded to zero has none
  if (value >= 0 || !signed || result.overflow || rendered.zero) return result;
  return {
    ...result,
    text: `-${result.text}`,
    ...(result.fill
      ? { fill: { char: result.fill.char, index: result.fill.index + 1 } }
      : {}),
  };
}

/** A `[$-xxxx]` prefix swaps in that language's names; separators stay the caller's. */
function localeFor(
  section: Section,
  base: OgeFormatLocale,
  options: OgeNumberFormatOptions,
): OgeFormatLocale {
  if (section.lcid === undefined) return base;
  let names: OgeFormatLocale | undefined;
  if (options.resolveLcid) names = options.resolveLcid(section.lcid);
  else {
    const tag = ogeLcidToLocaleTag(section.lcid);
    names = tag ? ogeFormatLocale(tag) : undefined;
  }
  if (!names) return base;
  return {
    ...base,
    months: names.months,
    monthsShort: names.monthsShort,
    days: names.days,
    daysShort: names.daysShort,
    am: names.am,
    pm: names.pm,
  };
}

/** Collects one section's output; the value-dependent tokens go to `custom`. */
function emit(
  section: Section,
  custom: (token: Token, out: string[], index: number) => void,
): OgeFormattedValue {
  const out: string[] = [];
  let length = 0;
  let fill: { char: string; index: number } | undefined;
  section.tokens.forEach((token, index) => {
    const before = out.length;
    switch (token.k) {
      case 'lit':
        out.push(token.v);
        break;
      case 'pad':
        out.push(' ');
        break;
      case 'fill':
        fill ??= { char: token.v, index: length };
        break;
      default:
        custom(token, out, index);
    }
    for (let i = before; i < out.length; i++) length += out[i].length;
  });
  return {
    text: out.join(''),
    ...(section.color ? { color: section.color } : {}),
    ...(fill ? { fill } : {}),
  };
}

function renderGeneral(
  magnitude: number,
  section: Section,
  locale: OgeFormatLocale,
  maxChars: number,
): Rendered {
  const general = formatOgeGeneral(magnitude, maxChars, locale.decimal);
  if (general === null)
    return { value: { text: '', overflow: true }, zero: false };
  return {
    value: emit(section, (token, out) => {
      if (token.k === 'general') out.push(general);
    }),
    zero: magnitude === 0,
  };
}

/** Plain, grouped, scaled, percent, scientific or fraction rendering. */
function renderNumeric(
  magnitude: number,
  section: Section,
  locale: OgeFormatLocale,
): Rendered {
  const plan = section.plan;
  if (!plan) return { value: { text: '' }, zero: false };
  if (plan.fraction)
    return renderFraction(magnitude, section, plan.fraction, locale);
  const shifted = ogeShiftDecimal(ogeDecimalOf(magnitude), plan.shift);
  if (plan.exponent)
    return renderScientific(shifted, section, plan, plan.exponent, locale);
  const rounded = ogeRoundDecimalPlaces(shifted, plan.decimals.length);
  const integerDigits = ogeDecimalIntegerDigits(rounded);
  const assigned = new Map<number, string>();
  assignInteger(
    integerDigits,
    plan.integer,
    section.tokens,
    plan.grouping,
    locale.group,
    assigned,
  );
  assignDecimals(
    ogeDecimalFractionDigits(rounded, plan.decimals.length),
    plan.decimals,
    section.tokens,
    assigned,
  );
  const hasDigits = plan.integer.length + plan.decimals.length > 0;
  const value = emit(section, (token, out, index) => {
    switch (token.k) {
      case 'digit':
        out.push(assigned.get(index) ?? '');
        break;
      case 'point':
        // integer digits with no integer placeholder still show, before the point
        if (plan.integer.length === 0 && index === plan.point)
          out.push(integerDigits);
        out.push(locale.decimal);
        break;
      case 'percent':
        out.push('%');
        break;
      case 'num':
        out.push(token.v);
        break;
      case 'slash':
        out.push('/');
        break;
      default:
        break;
    }
  });
  return { value, zero: hasDigits && isOgeDecimalZero(rounded) };
}

/**
 * Distributes integer digits over the placeholders right to left; the leftmost
 * placeholder takes every digit left over. `0` pads with a zero, `?` with a
 * space, `#` with nothing. Grouping separators go between shown digits.
 */
function assignInteger(
  digits: string,
  placeholders: readonly number[],
  tokens: readonly Token[],
  grouping: boolean,
  separator: string,
  assigned: Map<number, string>,
): void {
  let remaining = digits;
  let position = 0;
  for (let p = placeholders.length - 1; p >= 0; p--) {
    const index = placeholders[p];
    const kind = (tokens[index] as TokenOf<'digit'>).v;
    const take = p === 0 ? remaining : remaining.slice(-1);
    remaining = p === 0 ? '' : remaining.slice(0, -1);
    let text = '';
    if (take.length === 0) {
      if (kind === '0')
        text = withSeparator('0', position++, grouping, separator);
      else if (kind === '?') text = ' ';
    } else {
      for (let c = take.length - 1; c >= 0; c--) {
        text = withSeparator(take[c], position++, grouping, separator) + text;
      }
    }
    assigned.set(index, text);
  }
}

/** A digit at `position` (0 = units) with the separator after it when due. */
function withSeparator(
  digit: string,
  position: number,
  grouping: boolean,
  separator: string,
): string {
  return grouping && position > 0 && position % 3 === 0
    ? digit + separator
    : digit;
}

/** Fills decimal placeholders; trailing zeros vanish under `#`, become spaces under `?`. */
function assignDecimals(
  digits: string,
  placeholders: readonly number[],
  tokens: readonly Token[],
  assigned: Map<number, string>,
): void {
  let trailing = true;
  for (let p = placeholders.length - 1; p >= 0; p--) {
    const index = placeholders[p];
    const kind = (tokens[index] as TokenOf<'digit'>).v;
    const digit = digits[p] ?? '0';
    if (trailing && digit === '0' && kind !== '0') {
      assigned.set(index, kind === '?' ? ' ' : '');
      continue;
    }
    trailing = false;
    assigned.set(index, digit);
  }
}

/**
 * Scientific notation. With one integer placeholder the mantissa has one
 * digit; with several, the exponent moves in steps of their count —
 * `##0.0E+0` is engineering notation (multiples of 3), `00.00E+00` keeps
 * even exponents. `E+` always shows the exponent's sign, `E-` only a minus.
 */
function renderScientific(
  value: OgeDecimal,
  section: Section,
  plan: NumberPlan,
  exp: ExponentPlan,
  locale: OgeFormatLocale,
): Rendered {
  const step = Math.max(1, plan.integer.length);
  const decimals = plan.decimals.length;
  let exponent = 0;
  let mantissa = value;
  if (!isOgeDecimalZero(value)) {
    const magnitude = ogeDecimalMagnitude(value);
    exponent = step > 1 ? Math.floor(magnitude / step) * step : magnitude;
    mantissa = ogeRoundDecimalPlaces(
      ogeShiftDecimal(value, -exponent),
      decimals,
    );
    // rounding 9.99 up to 10.0 moves to the next exponent
    if (ogeDecimalIntegerDigits(mantissa).length > step) {
      exponent += step;
      mantissa = ogeRoundDecimalPlaces(
        ogeShiftDecimal(value, -exponent),
        decimals,
      );
    }
  }
  const assigned = new Map<number, string>();
  assignInteger(
    ogeDecimalIntegerDigits(mantissa),
    plan.integer,
    section.tokens,
    plan.grouping,
    locale.group,
    assigned,
  );
  assignDecimals(
    ogeDecimalFractionDigits(mantissa, decimals),
    plan.decimals,
    section.tokens,
    assigned,
  );
  assignInteger(
    String(Math.abs(exponent)),
    exp.digits,
    section.tokens,
    false,
    '',
    assigned,
  );
  const rendered = emit(section, (token, out, index) => {
    switch (token.k) {
      case 'digit':
        out.push(assigned.get(index) ?? '');
        break;
      case 'point':
        out.push(locale.decimal);
        break;
      case 'exp':
        out.push(token.letter + (exponent < 0 ? '-' : exp.plus ? '+' : ''));
        break;
      case 'percent':
        out.push('%');
        break;
      case 'num':
        out.push(token.v);
        break;
      case 'slash':
        out.push('/');
        break;
      default:
        break;
    }
  });
  return { value: rendered, zero: isOgeDecimalZero(mantissa) };
}

/**
 * The last continued-fraction convergent of `x` whose denominator fits —
 * Excel's choice, which is not always the closest fraction (`0.3` with one
 * digit is `1/3`, although `2/7` is nearer).
 */
function convergent(x: number, maxDenominator: number): [number, number] {
  let h0 = 0;
  let h1 = 1;
  let k0 = 1;
  let k1 = 0;
  let rest = x;
  for (let i = 0; i < 64; i++) {
    const a = Math.floor(rest);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > maxDenominator) break;
    h0 = h1;
    h1 = h2;
    k0 = k1;
    k1 = k2;
    const fraction = rest - a;
    if (fraction < 1e-12) break;
    rest = 1 / fraction;
  }
  return k1 === 0 ? [0, 1] : [h1, k1];
}

function renderFraction(
  magnitude: number,
  section: Section,
  plan: FractionPlan,
  locale: OgeFormatLocale,
): Rendered {
  const value = Number(formatOgeDecimal(ogeDecimalOf(magnitude)));
  const mixed = plan.whole.length > 0;
  let whole = mixed ? Math.floor(value) : 0;
  const part = mixed ? value - whole : value;
  let numerator: number;
  let denominator: number;
  if (plan.fixed > 0) {
    denominator = plan.fixed;
    numerator = Math.round(part * denominator);
  } else {
    [numerator, denominator] = convergent(
      part,
      10 ** plan.denominator.length - 1,
    );
  }
  if (mixed && numerator !== 0 && numerator === denominator) {
    whole += 1;
    numerator = 0;
  }
  const tokens = section.tokens;
  const assigned = new Map<number, string>();
  const noFraction = mixed && numerator === 0;
  if (mixed) {
    // a value that is all whole number shows its digits, even a lone zero
    const wholeText = whole === 0 && !noFraction ? '' : String(whole);
    assignInteger(wholeText, plan.whole, tokens, false, '', assigned);
  }
  if (noFraction) {
    // no fractional part: Excel blanks it and keeps its width with spaces
    for (const index of [...plan.numerator, ...plan.denominator]) {
      const kind = (tokens[index] as TokenOf<'digit'>).v;
      assigned.set(index, kind === '0' ? '0' : kind === '?' ? ' ' : '');
    }
  } else {
    assignInteger(
      String(numerator),
      plan.numerator,
      tokens,
      false,
      '',
      assigned,
    );
    assignLeft(String(denominator), plan.denominator, tokens, assigned);
  }
  const fixedDigits = new Set(plan.fixedDigits);
  const rendered = emit(section, (token, out, index) => {
    switch (token.k) {
      case 'digit':
        out.push(assigned.get(index) ?? '');
        break;
      case 'slash':
        out.push(noFraction ? ' ' : '/');
        break;
      case 'num':
        // a fixed denominator blanks out with the rest of the fraction
        out.push(noFraction && fixedDigits.has(index) ? ' ' : token.v);
        break;
      case 'percent':
        out.push('%');
        break;
      case 'point':
        out.push(locale.decimal);
        break;
      default:
        break;
    }
  });
  return { value: rendered, zero: whole === 0 && numerator === 0 };
}

/** Left-aligns digits over placeholders; the last placeholder takes the rest. */
function assignLeft(
  digits: string,
  placeholders: readonly number[],
  tokens: readonly Token[],
  assigned: Map<number, string>,
): void {
  for (let p = 0; p < placeholders.length; p++) {
    const index = placeholders[p];
    const kind = (tokens[index] as TokenOf<'digit'>).v;
    const pad = kind === '?' ? ' ' : kind === '0' ? '0' : '';
    const text =
      p === placeholders.length - 1 ? digits.slice(p) : (digits[p] ?? '');
    assigned.set(index, text || pad);
  }
}

function renderDate(
  value: number,
  section: Section,
  locale: OgeFormatLocale,
  options: OgeNumberFormatOptions,
): OgeFormattedValue {
  const system = options.dateSystem ?? '1900';
  // a negative time shows only for elapsed formats in the 1904 system
  if (value < 0 && !(section.elapsedOnly && system === '1904')) {
    return { text: '', overflow: true };
  }
  if (section.system) {
    // [$-F800] / [$-F400]: the locale's own long date or time replaces the code
    const code = section.system === 'date' ? locale.longDate : locale.longTime;
    const inner = compiled(compileOgeNumberFormat(code)).sections[0];
    if (!inner || inner.kind !== 'date' || inner.system)
      return { text: '', overflow: true };
    return renderDate(
      value,
      { ...inner, color: section.color },
      locale,
      options,
    );
  }
  const magnitude = Math.abs(value);
  // the serial is rounded to the format's precision (whole seconds unless it
  // shows fractions) before the date is read — even for a date-only format:
  // Excel shows 45292.9999999 as 1/2/24 (measured, Excel 2024). Past Excel's
  // last date (9999-12-31) even an elapsed time shows as #
  const parts = ogeSerialToDateParts(magnitude, system, section.subsecond);
  if (!parts) return { text: '', overflow: true };
  const scale = 10 ** section.subsecond;
  const ticks = Math.round(magnitude * 86400 * scale);
  const totalSeconds = Math.floor(ticks / scale);
  const clock = parts;
  const result = emit(section, (token, out) => {
    switch (token.k) {
      case 'date':
        out.push(
          dateField(token.part, token.n, clock, section.twelveHour, locale),
        );
        break;
      case 'elapsed': {
        const total =
          token.part === 'h'
            ? Math.floor(totalSeconds / 3600)
            : token.part === 'm'
              ? Math.floor(totalSeconds / 60)
              : totalSeconds;
        out.push(String(total).padStart(token.n, '0'));
        break;
      }
      case 'sub': {
        const sub = ticks % scale;
        out.push(
          locale.decimal +
            String(sub).padStart(section.subsecond, '0').slice(0, token.n),
        );
        break;
      }
      case 'datesep':
        out.push(locale.dateSeparator ?? '/');
        break;
      case 'timesep':
        out.push(locale.timeSeparator ?? ':');
        break;
      case 'ampm': {
        const afternoon = clock.hour >= 12;
        const marker = options.localeMarkers
          ? afternoon
            ? locale.pm
            : locale.am
          : afternoon
            ? 'PM'
            : 'AM';
        if (token.v.length === 3) {
          // A/P: the marker's first letter, in the case the code was written
          const letter = Array.from(marker)[0] ?? '';
          const upper = token.v[0] === token.v[0].toUpperCase();
          out.push(upper ? letter.toUpperCase() : letter.toLowerCase());
        } else {
          // AM/PM in any case shows the marker upper case ("am/pm" → "PM")
          out.push(marker);
        }
        break;
      }
      default:
        break;
    }
  });
  return value < 0 ? { ...result, text: `-${result.text}` } : result;
}

function dateField(
  part: DatePart,
  n: number,
  parts: OgeDateParts,
  twelveHour: boolean,
  locale: OgeFormatLocale,
): string {
  const pad2 = (value: number) => String(value).padStart(2, '0');
  switch (part) {
    case 'y':
      return n <= 2
        ? pad2(parts.year % 100)
        : String(parts.year).padStart(4, '0');
    case 'e':
      return String(parts.year);
    case 'b':
      return n <= 2 ? pad2((parts.year + 543) % 100) : String(parts.year + 543);
    case 'M':
      if (n === 1) return String(parts.month);
      if (n === 2) return pad2(parts.month);
      if (n === 3) return locale.monthsShort[parts.month - 1] ?? '';
      if (n === 5)
        return Array.from(locale.months[parts.month - 1] ?? '')[0] ?? '';
      return locale.months[parts.month - 1] ?? '';
    case 'd':
      if (n === 1) return String(parts.day);
      if (n === 2) return pad2(parts.day);
      if (n === 3) return locale.daysShort[parts.weekday] ?? '';
      return locale.days[parts.weekday] ?? '';
    case 'a':
      return n === 3
        ? (locale.daysShort[parts.weekday] ?? '')
        : (locale.days[parts.weekday] ?? '');
    case 'h': {
      const hour = twelveHour ? parts.hour % 12 || 12 : parts.hour;
      return n >= 2 ? pad2(hour) : String(hour);
    }
    case 'm':
      return n >= 2 ? pad2(parts.minute) : String(parts.minute);
    case 's':
      return n >= 2 ? pad2(parts.second) : String(parts.second);
    default:
      // `g` eras: Gregorian calendars have none to show
      return '';
  }
}

// ── built-in formats ─────────────────────────────────────────────────────

/**
 * The format codes Excel implies for built-in `numFmtId`s (ECMA-376
 * §18.8.30), as United States Excel shows them. Ids 14 and 22 follow the
 * locale's short date; 5–8 and 37–44 are the en-US currency and accounting
 * formats (other locales write them out as custom formats).
 */
const BUILTIN_FORMATS: ReadonlyMap<number, string> = new Map([
  [0, 'General'],
  [1, '0'],
  [2, '0.00'],
  [3, '#,##0'],
  [4, '#,##0.00'],
  [5, '"$"#,##0_);\\("$"#,##0\\)'],
  [6, '"$"#,##0_);[Red]\\("$"#,##0\\)'],
  [7, '"$"#,##0.00_);\\("$"#,##0.00\\)'],
  [8, '"$"#,##0.00_);[Red]\\("$"#,##0.00\\)'],
  [9, '0%'],
  [10, '0.00%'],
  [11, '0.00E+00'],
  [12, '# ?/?'],
  [13, '# ??/??'],
  [15, 'd-mmm-yy'],
  [16, 'd-mmm'],
  [17, 'mmm-yy'],
  [18, 'h:mm AM/PM'],
  [19, 'h:mm:ss AM/PM'],
  [20, 'h:mm'],
  [21, 'h:mm:ss'],
  [37, '#,##0 ;(#,##0)'],
  [38, '#,##0 ;[Red](#,##0)'],
  [39, '#,##0.00;(#,##0.00)'],
  [40, '#,##0.00;[Red](#,##0.00)'],
  [41, '_(* #,##0_);_(* \\(#,##0\\);_(* "-"_);_(@_)'],
  [42, '_("$"* #,##0_);_("$"* \\(#,##0\\);_("$"* "-"_);_(@_)'],
  [43, '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)'],
  [44, '_("$"* #,##0.00_);_("$"* \\(#,##0.00\\);_("$"* "-"??_);_(@_)'],
  [45, 'mm:ss'],
  [46, '[h]:mm:ss'],
  // ECMA-376 lists "mmss.0"; Excel shows 47 as mm:ss.0 ("05:09.0")
  [47, 'mm:ss.0'],
  [48, '##0.0E+0'],
  [49, '@'],
]);

/**
 * The code behind a built-in `numFmtId`, or `undefined` for an id Excel
 * leaves to the reader's locale (27–36 and 50–81 are East Asian dates).
 */
export function ogeBuiltinNumberFormat(
  id: number,
  locale: OgeFormatLocale = OGE_EN_US_FORMAT_LOCALE,
): string | undefined {
  const own = locale.builtins?.[id];
  if (own !== undefined) return own;
  if (id === 14) return locale.shortDate;
  if (id === 22) return `${locale.shortDate} h:mm`;
  return BUILTIN_FORMATS.get(id);
}
