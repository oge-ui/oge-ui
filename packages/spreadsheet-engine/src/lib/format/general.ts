/**
 * Excel's "General" number display.
 *
 * General shows a number in as few characters as it takes, within a budget —
 * 11 characters in a wide column (what `TEXT(x, "General")` returns), fewer in
 * a narrow one. It weighs a plain decimal against scientific notation and
 * keeps whichever shows more significant digits, the decimal on a tie:
 * `0.00001` stays a decimal, `0.000012345678` becomes `1.23457E-05`, twelve
 * integer digits never fit and always go scientific. The value is reduced to
 * 15 significant digits first (`0.1 + 0.2` shows `0.3`) and rounded half away
 * from zero to fit. The minus sign is outside the budget; a caller fitting a
 * narrow column subtracts it.
 */
import {
  isOgeDecimalZero,
  ogeDecimalFractionDigits,
  ogeDecimalIntegerDigits,
  ogeDecimalMagnitude,
  ogeDecimalOf,
  ogeRoundDecimalPlaces,
  ogeRoundDecimalSignificant,
  type OgeDecimal,
} from './decimal';

/** Characters General uses when the column is wide enough. */
export const OGE_GENERAL_MAX_CHARS = 11;

/**
 * A candidate rendering and its precision: the decimal exponent of the last
 * place it can show (fixed: its decimal places; scientific: its last shown
 * mantissa digit, counted from the number's own exponent).
 */
interface Candidate {
  readonly text: string;
  readonly precision: number;
}

/**
 * The General text of `value`, or `null` when not even scientific notation
 * fits in `maxChars` (Excel then fills the cell with `#`). In fewer than five
 * characters a number below 0.5 that has no room for a digit shows as `0`
 * (`-0` when negative), as Excel shows it in a narrow column.
 */
export function formatOgeGeneral(
  value: number,
  maxChars = OGE_GENERAL_MAX_CHARS,
  decimalSeparator = '.',
): string | null {
  if (!Number.isFinite(value)) return null;
  const decimal = ogeDecimalOf(value);
  if (isOgeDecimalZero(decimal)) return '0';
  const fixed = fixedText(decimal, maxChars, decimalSeparator);
  const scientific = scientificText(decimal, maxChars, decimalSeparator);
  const pick =
    fixed && scientific
      ? fixed.precision <= scientific.precision
        ? fixed
        : scientific
      : (fixed ?? scientific);
  // with fewer than five characters not even `1E-05` fits: a number below
  // 0.5 rounds to 0 there; with five or more, a number no form fits is #
  const text = pick
    ? pick.text
    : Math.abs(value) < 0.5 && maxChars < 5
      ? '0'
      : null;
  if (text === null) return null;
  return value < 0 ? `-${text}` : text;
}

/** Plain decimal text within the budget, or `null` when it shows no digit. */
function fixedText(
  decimal: OgeDecimal,
  maxChars: number,
  separator: string,
): Candidate | null {
  const magnitude = ogeDecimalMagnitude(decimal);
  const integerLength = magnitude >= 0 ? magnitude + 1 : 1;
  if (integerLength > maxChars) return null;
  const places = Math.max(0, maxChars - integerLength - 1);
  const rounded = ogeRoundDecimalPlaces(decimal, places);
  // a number that rounds away entirely says nothing as a decimal
  if (isOgeDecimalZero(rounded)) return null;
  const integer = ogeDecimalIntegerDigits(rounded) || '0';
  // rounding can carry into one more integer digit (99.96 → 100.0)
  if (integer.length > maxChars) return null;
  const room = Math.max(0, maxChars - integer.length - 1);
  const fraction = stripZeros(
    ogeDecimalFractionDigits(rounded, Math.min(places, room)),
  );
  return {
    text: fraction ? `${integer}${separator}${fraction}` : integer,
    precision: -places,
  };
}

/** `d.ddddE±xx` text within the budget, or `null` when it cannot fit. */
function scientificText(
  decimal: OgeDecimal,
  maxChars: number,
  separator: string,
): Candidate | null {
  const own = ogeDecimalMagnitude(decimal);
  let exponent = own;
  for (let attempt = 0; attempt < 2; attempt++) {
    const expDigits = Math.max(2, String(Math.abs(exponent)).length);
    // mantissa digit, point, "E±", exponent digits
    const decimals = maxChars - 1 - 1 - 2 - expDigits;
    if (maxChars < 1 + 2 + expDigits) return null; // not even "1E+15"
    const rounded = ogeRoundDecimalSignificant(
      decimal,
      Math.max(1, decimals + 1),
    );
    const roundedExponent = ogeDecimalMagnitude(rounded);
    if (roundedExponent !== exponent) {
      // 9.99999E+99 rounding to 1E+100 needs the exponent's new width
      exponent = roundedExponent;
      continue;
    }
    const digits = rounded.digits;
    const tail = decimals > 0 ? stripZeros(digits.slice(1, 1 + decimals)) : '';
    const mantissa = tail ? `${digits[0]}${separator}${tail}` : digits[0];
    const expText = String(Math.abs(exponent)).padStart(2, '0');
    return {
      text: `${mantissa}E${exponent < 0 ? '-' : '+'}${expText}`,
      precision: own - tail.length,
    };
  }
  return null;
}

function stripZeros(text: string): string {
  let end = text.length;
  while (end > 0 && text.charCodeAt(end - 1) === 48) end--;
  return text.slice(0, end);
}
