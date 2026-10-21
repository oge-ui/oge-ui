/**
 * Decimal digits the way Excel sees a number: at most 15 significant digits,
 * rounded half away from zero on the **decimal** text.
 *
 * Binary floating point is why `(2.675).toFixed(2)` is `"2.67"` in JavaScript
 * while Excel shows `2.68`: the double nearest 2.675 is 2.67499999…, and
 * Excel first reduces every value to 15 significant digits (`2.67500000000000`)
 * and rounds that. Every number the format renderer prints goes through this
 * module, so no display path ever rounds a binary fraction.
 */

/**
 * A non-negative decimal `0.d₁d₂d₃… × 10^exponent`. `digits` has no leading
 * or trailing zeros; zero is `{ digits: '', exponent: 0 }`.
 */
export interface OgeDecimal {
  readonly digits: string;
  readonly exponent: number;
}

/** Zero. */
export const OGE_DECIMAL_ZERO: OgeDecimal = { digits: '', exponent: 0 };

/** Significant digits Excel keeps for a number (IEEE doubles hold 15–17). */
export const OGE_EXCEL_PRECISION = 15;

/** Digits read off the double before reducing it (enough to see a tie). */
const READ_DIGITS = 21;

/**
 * |value| reduced to `significant` digits (default 15, as Excel stores it).
 * The reduction rounds half up except on an exact tie, which goes toward
 * zero the way Excel's does (`1234567890123.3125` keeps `…312`).
 */
export function ogeDecimalOf(
  value: number,
  significant = OGE_EXCEL_PRECISION,
): OgeDecimal {
  const magnitude = Math.abs(value);
  if (magnitude === 0 || !Number.isFinite(magnitude)) return OGE_DECIMAL_ZERO;
  const keep = Math.max(1, Math.min(READ_DIGITS - 1, Math.trunc(significant)));
  const text = magnitude.toExponential(READ_DIGITS - 1);
  const e = text.indexOf('e');
  const all = text.slice(0, e).replace('.', '');
  const exponent = Number(text.slice(e + 1)) + 1;
  const next = all.charCodeAt(keep);
  let up = next > 53; // > '5'
  if (next === 53) {
    // a 5 with anything but zeros after it is past the halfway point
    for (let i = keep + 1; i < all.length && !up; i++)
      up = all.charCodeAt(i) !== 48;
  }
  const head: OgeDecimal = trimmed(all.slice(0, keep), exponent);
  if (!up) return head;
  // add one unit in the last kept place
  return roundToDigits({ digits: all.slice(0, keep) + '9', exponent }, keep);
}

/** Drops trailing zeros (and normalises an all-zero result to zero). */
function trimmed(digits: string, exponent: number): OgeDecimal {
  let end = digits.length;
  while (end > 0 && digits.charCodeAt(end - 1) === 48) end--;
  return end === 0
    ? OGE_DECIMAL_ZERO
    : { digits: digits.slice(0, end), exponent };
}

/** Whether the decimal is zero. */
export function isOgeDecimalZero(value: OgeDecimal): boolean {
  return value.digits.length === 0;
}

/** Keeps the first `keep` digits, rounding half away from zero. */
function roundToDigits(value: OgeDecimal, keep: number): OgeDecimal {
  if (keep >= value.digits.length) return value;
  if (keep < 0) return OGE_DECIMAL_ZERO;
  const up = value.digits.charCodeAt(keep) >= 53; // '5'
  if (!up) return trimmed(value.digits.slice(0, keep), value.exponent);
  const chars = value.digits.slice(0, keep).split('');
  let i = chars.length - 1;
  while (i >= 0 && chars[i] === '9') {
    chars[i] = '0';
    i--;
  }
  if (i < 0) return trimmed('1' + chars.join(''), value.exponent + 1);
  chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
  return trimmed(chars.join(''), value.exponent);
}

/** Rounds to `places` decimal places (negative places round to tens, …). */
export function ogeRoundDecimalPlaces(
  value: OgeDecimal,
  places: number,
): OgeDecimal {
  if (isOgeDecimalZero(value)) return value;
  return roundToDigits(value, value.exponent + places);
}

/** Rounds to `significant` significant digits. */
export function ogeRoundDecimalSignificant(
  value: OgeDecimal,
  significant: number,
): OgeDecimal {
  if (isOgeDecimalZero(value)) return value;
  return roundToDigits(value, significant);
}

/** Multiplies by `10^power` — exact, no rounding. */
export function ogeShiftDecimal(value: OgeDecimal, power: number): OgeDecimal {
  return isOgeDecimalZero(value)
    ? value
    : { digits: value.digits, exponent: value.exponent + power };
}

/** Digits left of the decimal point, without leading zeros (`''` below 1). */
export function ogeDecimalIntegerDigits(value: OgeDecimal): string {
  if (value.exponent <= 0) return '';
  return value.digits.length >= value.exponent
    ? value.digits.slice(0, value.exponent)
    : value.digits + '0'.repeat(value.exponent - value.digits.length);
}

/** The first `places` digits right of the decimal point, zero-padded. */
export function ogeDecimalFractionDigits(
  value: OgeDecimal,
  places: number,
): string {
  if (places <= 0) return '';
  let fraction: string;
  if (value.exponent >= 0) fraction = value.digits.slice(value.exponent);
  else fraction = '0'.repeat(-value.exponent) + value.digits;
  return fraction.length >= places
    ? fraction.slice(0, places)
    : fraction + '0'.repeat(places - fraction.length);
}

/**
 * The power of ten of the leading digit (`1234` → 3, `0.05` → -2). Zero has
 * none; the result is then 0.
 */
export function ogeDecimalMagnitude(value: OgeDecimal): number {
  return isOgeDecimalZero(value) ? 0 : value.exponent - 1;
}

/** Plain decimal text, no exponent (`'0.0012'`, `'1200'`, `'0'`). */
export function formatOgeDecimal(value: OgeDecimal): string {
  if (isOgeDecimalZero(value)) return '0';
  const integer = ogeDecimalIntegerDigits(value) || '0';
  const fractionLength = Math.max(0, value.digits.length - value.exponent);
  const fraction = ogeDecimalFractionDigits(value, fractionLength);
  return fraction ? `${integer}.${fraction}` : integer;
}
