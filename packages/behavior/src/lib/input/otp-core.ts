import { ogeFormatMessage } from '@oge-ui/core';

/**
 * The one-time-code editor's text rules, shared by the Angular
 * `oge-otp-input` and the React `<OgeOtpInput>` (ADR 0001). Pure functions
 * over the committed string — no DOM.
 *
 * **The value is always a contiguous prefix.** Cells fill left to right
 * (inline-start to inline-end), a removed character closes its gap, and the
 * caret can never sit beyond the first empty cell. So `value` is exactly the
 * characters typed, `value.length === length` means complete, and there is
 * no "hole" a form layer would have to model.
 */

/** Which characters a cell accepts. */
export type OgeOtpInputType = 'numeric' | 'alphanumeric' | 'alphabetic';

/** Letter case applied to accepted letters. */
export type OgeOtpInputCase = 'none' | 'upper' | 'lower';

/** Options every OTP operation reads. */
export interface OgeOtpOptions {
  /** Number of cells. */
  length: number;
  type: OgeOtpInputType;
  /** Letter case applied to accepted letters (default `'none'`). */
  letterCase?: OgeOtpInputCase;
}

/** The result of an edit: the new value and the cell to focus. */
export interface OgeOtpEdit {
  value: string;
  /** Zero-based cell to move the focus to. */
  focusIndex: number;
  /** `value.length === length`. */
  complete: boolean;
}

/** A usable cell count: a whole number between 1 and 12 (default 6). */
export function normalizeOtpLength(length: number): number {
  if (!Number.isFinite(length) || length < 1) return 6;
  return Math.min(12, Math.round(length));
}

const NUMERIC = /^\p{Nd}$/u;
const ALPHABETIC = /^\p{L}$/u;

/** Whether one character is allowed by `type`. */
export function otpAcceptsChar(char: string, type: OgeOtpInputType): boolean {
  if (type === 'numeric') return NUMERIC.test(char);
  if (type === 'alphabetic') return ALPHABETIC.test(char);
  return NUMERIC.test(char) || ALPHABETIC.test(char);
}

/**
 * Keeps only the characters `type` accepts and applies `letterCase`.
 * Non-ASCII decimal digits (Arabic-Indic, full-width…) are folded to ASCII,
 * so a code typed on an Arabic keyboard still matches the server's.
 */
export function sanitizeOtpText(
  text: string,
  type: OgeOtpInputType,
  letterCase: OgeOtpInputCase = 'none',
): string {
  let out = '';
  for (const char of Array.from(text ?? '')) {
    if (!otpAcceptsChar(char, type)) continue;
    let next = char;
    if (NUMERIC.test(char)) {
      next = foldDigit(char);
    } else if (letterCase === 'upper') {
      next = char.toLocaleUpperCase('en-US');
    } else if (letterCase === 'lower') {
      next = char.toLocaleLowerCase('en-US');
    }
    out += next;
  }
  return out;
}

/**
 * Maps one Unicode decimal digit to its ASCII digit. NFKD folds the
 * compatibility forms (full-width, mathematical); for the script digits
 * (Arabic-Indic, Devanagari, …) the value is the distance to the block's
 * zero — every `Nd` block is ten consecutive code points.
 */
function foldDigit(char: string): string {
  const folded = char.normalize('NFKD');
  if (/^[0-9]$/.test(folded)) return folded;
  const code = char.codePointAt(0) ?? 0;
  let zero = code;
  while (code - zero < 9 && NUMERIC.test(String.fromCodePoint(zero - 1))) {
    zero--;
  }
  return String(code - zero);
}

/** Normalizes an externally written value: sanitized and cut to `length`. */
export function normalizeOtpValue(
  value: unknown,
  options: OgeOtpOptions,
): string {
  if (value == null) return '';
  const text = sanitizeOtpText(String(value), options.type, options.letterCase);
  return Array.from(text).slice(0, normalizeOtpLength(options.length)).join('');
}

/** The cell texts for `value` — one entry per cell, `''` for empty cells. */
export function otpCells(value: string, length: number): string[] {
  const chars = Array.from(value ?? '');
  return Array.from(
    { length: normalizeOtpLength(length) },
    (_, index) => chars[index] ?? '',
  );
}

/**
 * The cell the caret may occupy: never past the first empty cell, never past
 * the last cell.
 */
export function clampOtpFocus(
  index: number,
  value: string,
  length: number,
): number {
  const cells = normalizeOtpLength(length);
  const filled = Array.from(value ?? '').length;
  const limit = Math.min(filled, cells - 1);
  return Math.max(0, Math.min(Math.round(index) || 0, limit));
}

function edit(chars: string[], focusIndex: number, cells: number): OgeOtpEdit {
  const value = chars.slice(0, cells).join('');
  return {
    value,
    focusIndex: clampOtpFocus(focusIndex, value, cells),
    complete: chars.length >= cells,
  };
}

/**
 * Types or pastes `text` at cell `index`: rejected characters are dropped,
 * the accepted ones overwrite from `index` onwards and the focus lands after
 * the last one written. A paste that carries a whole code (at least `length`
 * accepted characters) always fills from the first cell — the autofill and
 * "paste the SMS" cases — whatever cell had the focus.
 */
export function otpInsert(
  value: string,
  index: number,
  text: string,
  options: OgeOtpOptions,
): OgeOtpEdit {
  const cells = normalizeOtpLength(options.length);
  const incoming = Array.from(
    sanitizeOtpText(text, options.type, options.letterCase),
  );
  const chars = Array.from(value ?? '').slice(0, cells);
  if (incoming.length === 0) {
    return edit(chars, clampOtpFocus(index, value, cells), cells);
  }
  const start =
    incoming.length >= cells ? 0 : clampOtpFocus(index, value, cells);
  for (let i = 0; i < incoming.length && start + i < cells; i++) {
    chars[start + i] = incoming[i];
  }
  return edit(chars, start + incoming.length, cells);
}

/**
 * Backspace at cell `index`: a filled cell loses its character (the later
 * ones close the gap) and keeps the focus; an empty cell moves back and
 * clears the previous one.
 */
export function otpBackspace(
  value: string,
  index: number,
  options: Pick<OgeOtpOptions, 'length'>,
): OgeOtpEdit {
  const cells = normalizeOtpLength(options.length);
  const chars = Array.from(value ?? '').slice(0, cells);
  const at = clampOtpFocus(index, value, cells);
  if (at < chars.length) {
    chars.splice(at, 1);
    // removing the last character of a full code leaves the caret there
    return edit(chars, at, cells);
  }
  if (at === 0) return edit(chars, 0, cells);
  chars.splice(at - 1, 1);
  return edit(chars, at - 1, cells);
}

/** Delete at cell `index`: removes that character, the later ones shift back. */
export function otpDelete(
  value: string,
  index: number,
  options: Pick<OgeOtpOptions, 'length'>,
): OgeOtpEdit {
  const cells = normalizeOtpLength(options.length);
  const chars = Array.from(value ?? '').slice(0, cells);
  const at = clampOtpFocus(index, value, cells);
  if (at < chars.length) chars.splice(at, 1);
  return edit(chars, at, cells);
}

/**
 * The cell a navigation key moves to: ArrowLeft/ArrowRight follow the
 * reading direction (mirrored in RTL), Home/End go to the first cell / the
 * caret limit. `undefined` for other keys.
 */
export function otpNavigationTarget(
  key: string,
  index: number,
  value: string,
  length: number,
  rtl: boolean,
): number | undefined {
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case forward:
      return clampOtpFocus(index + 1, value, length);
    case backward:
      return clampOtpFocus(index - 1, value, length);
    case 'Home':
      return 0;
    case 'End':
      return clampOtpFocus(Number.MAX_SAFE_INTEGER, value, length);
    default:
      return undefined;
  }
}

/**
 * The text a cell's native `input` event inserted. Cells select their
 * character on focus, so typing usually replaces it; when the browser kept
 * the old character (caret placed after it), the one occurrence of it is
 * stripped so only the new text is inserted — unless the text is a whole
 * code (`length` characters or more), which is taken as is.
 */
export function otpTypedText(
  nativeValue: string,
  previousChar: string,
  length?: number,
): string {
  // a whole code (autofill, a paste the browser inserted) is taken as is
  if (length !== undefined && Array.from(nativeValue).length >= length) {
    return nativeValue;
  }
  if (!previousChar || nativeValue.length <= previousChar.length) {
    return nativeValue;
  }
  if (nativeValue.startsWith(previousChar)) {
    return nativeValue.slice(previousChar.length);
  }
  if (nativeValue.endsWith(previousChar)) {
    return nativeValue.slice(0, nativeValue.length - previousChar.length);
  }
  return nativeValue;
}

/** Native `inputmode` hint for the on-screen keyboard. */
export function otpInputMode(type: OgeOtpInputType): 'numeric' | 'text' {
  return type === 'numeric' ? 'numeric' : 'text';
}

/** Accessible name of cell `index` — the catalog's `otpCellLabel` pattern. */
export function otpCellLabel(
  template: string,
  index: number,
  length: number,
  locale?: string,
): string {
  return ogeFormatMessage(
    template,
    { index: index + 1, length: normalizeOtpLength(length) },
    locale,
  );
}

/**
 * Whether a visual separator follows cell `index` for a `groupSize`
 * (`3` → `123-456`); `0` / undefined never separates.
 */
export function otpSeparatorAfter(
  index: number,
  length: number,
  groupSize: number | undefined,
): boolean {
  if (!groupSize || groupSize < 1) return false;
  return (
    (index + 1) % groupSize === 0 && index < normalizeOtpLength(length) - 1
  );
}
