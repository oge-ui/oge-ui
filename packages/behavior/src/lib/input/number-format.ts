/** Locale-aware formatting/parsing used by the number box. Pure — no Angular. */
export interface OgeNumberFormatter {
  /** Display formatting (grouping, currency, …) applied while unfocused. */
  format(value: number): string;
  /** Editable raw form — locale decimal separator, no grouping. */
  formatEditable(value: number): string;
  /** `''` parses to `{ value: null, ok: true }`; garbage to `{ ok: false }`. */
  parse(text: string): { value: number | null; ok: boolean };
  readonly decimal: string;
  readonly group: string;
}

export function createNumberFormatter(
  locale: string,
  options?: Intl.NumberFormatOptions,
): OgeNumberFormatter {
  const display = new Intl.NumberFormat(locale, options);
  // Latin digits while editing — native-digit locales (ar/fa/bn) would emit
  // text the ASCII-based parse cannot round-trip.
  const editable = new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 15,
    numberingSystem: 'latn',
  });
  const probe = new Intl.NumberFormat(locale).formatToParts(-12345.6);
  const group = probe.find((p) => p.type === 'group')?.value ?? ',';
  const decimal = probe.find((p) => p.type === 'decimal')?.value ?? '.';
  const minus = probe.find((p) => p.type === 'minusSign')?.value ?? '-';

  const groupChars = new Set([group]);
  // NBSP-family group separators (fr-FR etc.) — accept a typed regular space too.
  if (group === '\u00a0' || group === '\u202f') groupChars.add(' ');

  const parse = (text: string): { value: number | null; ok: boolean } => {
    const trimmed = text.trim();
    if (!trimmed) return { value: null, ok: true };
    let s = '';
    for (const char of trimmed) {
      if (!groupChars.has(char)) s += char;
    }
    s = s.split(decimal).join('.');
    s = s.split(minus).join('-').split('\u2212').join('-');
    // strip currency/percent affixes — keep digits, sign, decimal, exponent
    s = s.replace(/[^0-9eE+.-]/g, '');
    if (!s || s === '-' || s === '.') return { value: null, ok: false };
    const value = Number(s);
    return Number.isFinite(value)
      ? { value, ok: true }
      : { value: null, ok: false };
  };

  return {
    format: (value) => display.format(value),
    formatEditable: (value) => editable.format(value),
    parse,
    decimal,
    group,
  };
}

export function clampNumber(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

/**
 * Steps a value up/down with float-error correction (`0.3 + 0.1 → 0.4`, not
 * `0.4000…04`) and clamping. A `null` value starts from `clamp(0, min, max)`.
 */
export function offsetByStep(
  value: number | null,
  dir: 1 | -1,
  step: number,
  min?: number,
  max?: number,
): number {
  if (value === null) return clampNumber(0, min, max);
  // Correct float drift only — round to the finer of the two precisions so
  // off-grid values (0.5 with step 1) are preserved, not snapped. Exponential
  // notation escapes the digit-counting heuristic → skip the correction.
  const stepStr = String(step);
  const valueStr = String(value);
  if (stepStr.includes('e') || valueStr.includes('e')) {
    return clampNumber(value + dir * step + 0, min, max);
  }
  const fractionDigits = (s: string): number => (s.split('.')[1] ?? '').length;
  const decimals = Math.max(fractionDigits(stepStr), fractionDigits(valueStr));
  const factor = 10 ** decimals;
  const next = Math.round((value + dir * step) * factor) / factor;
  // `+ 0` normalizes a possible negative zero.
  return clampNumber(next + 0, min, max);
}
