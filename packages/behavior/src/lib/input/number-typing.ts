/**
 * Format-while-typing for the number box, shared by both render layers
 * (ADR 0001). Pure — the host passes the native input's text and caret,
 * writes back the returned text and caret.
 *
 * The rules:
 * - group separators are re-inserted live (locale grouping, Indian 2-digit
 *   groups included, because the integer part is grouped by `Intl` itself);
 * - the caret keeps its place among the *significant* characters (digits,
 *   the decimal separator, the minus sign), so a separator appearing or
 *   vanishing in front of it never moves it across a digit;
 * - `maxFractionDigits` caps the fraction while typing (extra digits are
 *   dropped, the caret clamps to the end of what is left);
 * - text the formatter cannot read (letters, a second decimal separator) is
 *   returned unchanged — the parse step flags it as invalid.
 */
export interface OgeNumberTypingOptions {
  /** Locale decimal separator (`OgeNumberFormatter.decimal`). */
  readonly decimal: string;
  /** Locale group separator (`OgeNumberFormatter.group`). */
  readonly group: string;
  /** Live grouping on/off — off still applies `maxFractionDigits`. */
  readonly grouping: boolean;
  /** Fraction cap while typing; `undefined` = unlimited. */
  readonly maxFractionDigits?: number;
  /**
   * Groups a run of integer digits (`'1234567'` → `'1,234,567'`). Defaults to
   * three-digit groups; `createNumberTypingGrouper(locale)` gives the locale's.
   */
  readonly groupDigits?: (digits: string) => string;
}

export interface OgeNumberTypingResult {
  readonly text: string;
  readonly caret: number;
}

const DIGIT = /[0-9]/;

/** Three-digit grouping with the given separator — the default grouper. */
function groupByThree(digits: string, group: string): string {
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += group;
    out += digits[i];
  }
  return out;
}

/**
 * The locale's own integer grouping (Indian `12,34,567`, none for locales
 * that never group four digits…), in Latin digits so the parse round-trips.
 */
export function createNumberTypingGrouper(
  locale: string | undefined,
): (digits: string) => string {
  const format = new Intl.NumberFormat(locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  });
  return (digits) => {
    if (!digits) return digits;
    // BigInt keeps every digit — a Number would round past 2^53
    try {
      return format.format(BigInt(digits));
    } catch {
      return digits;
    }
  };
}

/** Re-formats the typed text; see the module comment for the rules. */
export function formatNumberWhileTyping(
  text: string,
  caret: number,
  options: OgeNumberTypingOptions,
): OgeNumberTypingResult {
  const { decimal, group, grouping, maxFractionDigits } = options;
  const groupChars = new Set([group]);
  if (group === ' ' || group === ' ') groupChars.add(' ');

  // 1. strip group separators, remembering how many significant characters
  //    sit before the caret
  let clean = '';
  let significantBefore = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (groupChars.has(char)) continue;
    clean += char;
    if (i < caret) significantBefore++;
  }

  // 2. anything that is not [-]digits[decimal digits] stays untouched
  let sign = '';
  let body = clean;
  if (body.startsWith('-') || body.startsWith('−')) {
    sign = body[0];
    body = body.slice(1);
  }
  const decimalAt = body.indexOf(decimal);
  const intPart = decimalAt < 0 ? body : body.slice(0, decimalAt);
  let fracPart = decimalAt < 0 ? '' : body.slice(decimalAt + decimal.length);
  const allDigits = (s: string): boolean =>
    [...s].every((char) => DIGIT.test(char));
  if (!allDigits(intPart) || !allDigits(fracPart)) {
    return { text, caret };
  }

  // 3. fraction cap
  if (maxFractionDigits !== undefined && maxFractionDigits >= 0) {
    if (maxFractionDigits === 0 && decimalAt >= 0) {
      // no fraction allowed — the decimal separator itself is dropped
      fracPart = '';
    } else {
      fracPart = fracPart.slice(0, maxFractionDigits);
    }
  }
  const keepDecimal =
    decimalAt >= 0 && !(maxFractionDigits === 0 && decimalAt >= 0);

  // 4. group the integer digits (leading zeros are left alone — "007" is
  //    mid-typing text, not a number to normalize under the caret)
  let groupedInt = intPart;
  if (grouping && intPart.length > 3 && !intPart.startsWith('0')) {
    groupedInt = options.groupDigits
      ? options.groupDigits(intPart)
      : groupByThree(intPart, group);
  }

  const out =
    sign +
    groupedInt +
    (keepDecimal ? decimal : '') +
    (keepDecimal ? fracPart : '');

  // 5. caret: after the same number of significant characters
  let seen = 0;
  let nextCaret = out.length;
  if (significantBefore === 0) {
    nextCaret = 0;
  } else {
    for (let i = 0; i < out.length; i++) {
      if (!groupChars.has(out[i])) seen++;
      if (seen === significantBefore) {
        nextCaret = i + 1;
        break;
      }
    }
  }
  return { text: out, caret: Math.min(nextCaret, out.length) };
}

/**
 * Direction of a mouse-wheel step: `1` up (wheel away from the user), `-1`
 * down, `0` when the wheel must be left to the page — not focused, disabled,
 * or no vertical delta. The host calls `preventDefault()` only for non-zero.
 */
export function numberWheelDirection(
  event: { readonly deltaY: number },
  focused: boolean,
  enabled: boolean,
): 1 | -1 | 0 {
  if (!focused || !enabled || event.deltaY === 0) return 0;
  return event.deltaY < 0 ? 1 : -1;
}
