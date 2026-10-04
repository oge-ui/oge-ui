/**
 * The input-mask engine shared by every masked editor (ADR 0001): the text
 * box's `mask`, the masked text box and anything else that formats typed text
 * against a fixed pattern. Pure and framework-free — the host owns the DOM
 * element, feeds it `beforeinput` decisions and writes back the text and caret
 * this machine returns.
 *
 * **Pattern syntax** (one character per position):
 *
 * | Char | Accepts                         | Required |
 * | ---- | ------------------------------- | -------- |
 * | `0`  | a digit                         | yes      |
 * | `9`  | a digit or a space              | no       |
 * | `#`  | a digit, a space, `+` or `-`    | no       |
 * | `L`  | a letter (any script)           | yes      |
 * | `l`  | a letter or a space             | no       |
 * | `A`  | a letter or a digit             | yes      |
 * | `a`  | a letter, a digit or a space    | no       |
 * | `C`  | any non-space character         | yes      |
 * | `c`  | any character                   | no       |
 * | `\x` | the character `x` as a literal  | —        |
 *
 * Every other character is a literal. Custom rules (`rules`) add or replace
 * single-character keys; a custom rule is a `RegExp` tested against one
 * character, a string listing the allowed characters, or a predicate, and is
 * always required.
 *
 * **Editing model: overwrite, never shift.** Typing fills the slot at the
 * caret (literals are skipped, and a typed character equal to the next
 * literal is consumed by it, which is what makes formatted paste work);
 * Backspace/Delete empty a slot without moving the characters after it —
 * the DevExtreme / Kendo behaviour, which keeps every character in the
 * column it was typed in. Positions are logical (string indices), so the
 * machine is direction-agnostic; RTL is the browser's rendering concern.
 */

/** A custom mask rule: a one-character `RegExp`, an allowed-characters string, or a predicate. */
export type OgeMaskRule = RegExp | string | ((char: string) => boolean);

/** Custom mask rules by single-character key. */
export type OgeMaskRules = Readonly<Record<string, OgeMaskRule>>;

/** When the mask placeholder characters are visible. */
export type OgeMaskShowMode = 'always' | 'onFocus';

/** One compiled position of a mask. */
export type OgeMaskSlot =
  | { readonly kind: 'literal'; readonly char: string }
  | {
      readonly kind: 'edit';
      readonly key: string;
      readonly optional: boolean;
      readonly test: (char: string) => boolean;
    };

/** Construction / reconfiguration options of `OgeMaskCore`. */
export interface OgeMaskOptions {
  /** The pattern — see the syntax table on `OgeMaskCore`. */
  readonly mask: string;
  /** Extra or overriding single-character rules. */
  readonly rules?: OgeMaskRules;
  /** Placeholder shown in empty slots. Default `'_'`. */
  readonly maskChar?: string;
}

/** Payload of the masked editors' `maskCompleted` event. */
export interface OgeMaskCompletedEvent {
  /** The committed value (`rawValue` or `maskedValue` per `includeLiterals`). */
  readonly value: string;
  /** The entered characters without literals. */
  readonly rawValue: string;
  /** The formatted text with literals. */
  readonly maskedValue: string;
}

/** The result of one edit: the text to render, where the caret goes, and whether anything changed. */
export interface OgeMaskEdit {
  readonly text: string;
  readonly caret: number;
  readonly changed: boolean;
}

const LETTER = /^\p{L}$/u;
const DIGIT = /^\p{Nd}$/u;

const isDigit = (c: string): boolean => DIGIT.test(c);
const isLetter = (c: string): boolean => LETTER.test(c);

/** The built-in rules (`0 9 # L l A a C c`) as `[test, optional]` pairs. */
export const OGE_DEFAULT_MASK_RULES: Readonly<
  Record<string, readonly [(char: string) => boolean, boolean]>
> = {
  '0': [isDigit, false],
  '9': [(c) => isDigit(c) || c === ' ', true],
  '#': [(c) => isDigit(c) || c === ' ' || c === '+' || c === '-', true],
  L: [isLetter, false],
  l: [(c) => isLetter(c) || c === ' ', true],
  A: [(c) => isLetter(c) || isDigit(c), false],
  a: [(c) => isLetter(c) || isDigit(c) || c === ' ', true],
  C: [(c) => c.trim() !== '', false],
  c: [() => true, true],
};

function ruleTest(rule: OgeMaskRule): (char: string) => boolean {
  if (typeof rule === 'function') return rule;
  if (typeof rule === 'string') return (c) => rule.includes(c);
  // a fresh, flag-stripped-of-`g` copy so `lastIndex` never leaks state
  const re = new RegExp(rule.source, rule.flags.replace('g', ''));
  return (c) => re.test(c);
}

/** Compiles a pattern into slots. Exported for hosts that render per-slot hints. */
export function parseMask(
  mask: string,
  rules: OgeMaskRules = {},
): readonly OgeMaskSlot[] {
  const slots: OgeMaskSlot[] = [];
  const chars = Array.from(mask);
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char === '\\' && i + 1 < chars.length) {
      slots.push({ kind: 'literal', char: chars[++i] });
      continue;
    }
    const custom = rules[char];
    if (custom !== undefined) {
      slots.push({
        kind: 'edit',
        key: char,
        optional: false,
        test: ruleTest(custom),
      });
      continue;
    }
    const builtIn = OGE_DEFAULT_MASK_RULES[char];
    if (builtIn) {
      slots.push({
        kind: 'edit',
        key: char,
        optional: builtIn[1],
        test: builtIn[0],
      });
      continue;
    }
    slots.push({ kind: 'literal', char });
  }
  return slots;
}

/**
 * The mask machine: compiled slots plus the characters entered so far. Not
 * reactive — the host re-reads `text()` / `value()` after each call.
 */
export class OgeMaskCore {
  private slotList: readonly OgeMaskSlot[] = [];
  private entered: (string | null)[] = [];
  private placeholder = '_';

  constructor(options: OgeMaskOptions) {
    this.configure(options);
  }

  /** Recompiles the pattern; the entered raw characters are re-applied in order. */
  configure(options: OgeMaskOptions): void {
    const raw = this.slotList.length ? this.rawValue() : '';
    this.slotList = parseMask(options.mask, options.rules);
    this.placeholder = Array.from(options.maskChar || '_')[0] ?? '_';
    this.entered = this.slotList.map(() => null);
    if (raw) this.setValue(raw, false);
  }

  /** The compiled slots (literals and edit positions) in display order. */
  get slots(): readonly OgeMaskSlot[] {
    return this.slotList;
  }

  /** The placeholder character of empty slots. */
  get maskChar(): string {
    return this.placeholder;
  }

  // --- reading -----------------------------------------------------------------

  /** The display text: literals, entered characters, `maskChar` in empty slots. */
  text(): string {
    return this.slotList
      .map((slot, i) =>
        slot.kind === 'literal'
          ? slot.char
          : (this.entered[i] ?? this.placeholder),
      )
      .join('');
  }

  /** `true` when no slot holds a character. */
  isEmpty(): boolean {
    return this.entered.every((c) => c === null);
  }

  /** `true` when every required slot is filled. */
  isComplete(): boolean {
    return this.slotList.every(
      (slot, i) =>
        slot.kind === 'literal' || slot.optional || this.entered[i] !== null,
    );
  }

  /**
   * The entered characters without literals. An empty slot before the last
   * filled one reads as a space (so the value maps back position by
   * position); trailing empty slots are dropped.
   */
  rawValue(): string {
    const out: string[] = [];
    for (let i = 0; i < this.slotList.length; i++) {
      if (this.slotList[i].kind === 'edit') out.push(this.entered[i] ?? ' ');
    }
    return trimTrailing(out, this.lastFilledEditOrdinal());
  }

  /**
   * The display text with literals, empty slots as spaces, cut after the
   * last filled slot — `''` while nothing is entered.
   */
  maskedValue(): string {
    const last = this.lastFilledIndex();
    if (last < 0) return '';
    let out = '';
    for (let i = 0; i <= last; i++) {
      const slot = this.slotList[i];
      out += slot.kind === 'literal' ? slot.char : (this.entered[i] ?? ' ');
    }
    return out;
  }

  /** `maskedValue()` when `includeLiterals`, else `rawValue()`. */
  value(includeLiterals: boolean): string {
    return includeLiterals ? this.maskedValue() : this.rawValue();
  }

  // --- writing -----------------------------------------------------------------

  /**
   * Replaces the content from a model value — the exact inverse of
   * `value(includeLiterals)`: raw values fill the edit slots in order,
   * masked values map position by position. Characters a slot rejects
   * leave it empty.
   */
  setValue(value: string, includeLiterals: boolean): void {
    this.entered = this.slotList.map(() => null);
    const chars = Array.from(value ?? '');
    if (includeLiterals) {
      chars.forEach((char, i) => {
        const slot = this.slotList[i];
        if (slot?.kind === 'edit' && char !== ' ' && slot.test(char)) {
          this.entered[i] = char;
        }
      });
      return;
    }
    let k = 0;
    for (let i = 0; i < this.slotList.length && k < chars.length; i++) {
      const slot = this.slotList[i];
      if (slot.kind !== 'edit') continue;
      const char = chars[k++];
      if (char !== ' ' && slot.test(char)) this.entered[i] = char;
      else if (char === ' ' && slot.test(' ')) this.entered[i] = ' ';
    }
  }

  /** Empties every slot. */
  clear(): void {
    this.entered = this.slotList.map(() => null);
  }

  /**
   * Types or pastes `data` over the selection `[start, end)`: the selected
   * slots are emptied first, then each character fills the next slot that
   * accepts it. A character equal to the next literal is consumed by that
   * literal (formatted paste); a character no slot accepts is dropped.
   */
  insert(start: number, end: number, data: string): OgeMaskEdit {
    const before = this.text();
    const [from, to] = this.range(start, end);
    this.clearRange(from, to);
    let pos = from;
    let lastWritten = -1;
    for (const char of Array.from(data)) {
      // a typed literal: consume it when it is the next literal, else skip
      let probe = pos;
      while (probe < this.slotList.length) {
        const slot = this.slotList[probe];
        if (slot.kind === 'literal') {
          if (slot.char === char) break;
          probe++;
          continue;
        }
        break;
      }
      const slot = this.slotList[probe];
      if (!slot) break;
      if (slot.kind === 'literal') {
        pos = probe + 1;
        continue;
      }
      if (slot.test(char)) {
        this.entered[probe] = char;
        lastWritten = probe;
        pos = probe + 1;
      }
      // rejected: dropped, the caret does not move
    }
    const caret =
      lastWritten >= 0
        ? this.skipLiterals(lastWritten + 1)
        : this.skipLiterals(from);
    const text = this.text();
    return { text, caret, changed: text !== before };
  }

  /** Backspace: empties the selection, or the editable slot before a collapsed caret. */
  deleteBackward(start: number, end: number): OgeMaskEdit {
    const before = this.text();
    const [from, to] = this.range(start, end);
    if (to > from) {
      this.clearRange(from, to);
      return this.result(before, from);
    }
    let i = from - 1;
    while (i >= 0 && this.slotList[i].kind === 'literal') i--;
    if (i < 0) return this.result(before, from);
    this.entered[i] = null;
    return this.result(before, i);
  }

  /** Delete: empties the selection, or the editable slot after a collapsed caret. */
  deleteForward(start: number, end: number): OgeMaskEdit {
    const before = this.text();
    const [from, to] = this.range(start, end);
    if (to > from) {
      this.clearRange(from, to);
      return this.result(before, from);
    }
    let i = from;
    while (i < this.slotList.length && this.slotList[i].kind === 'literal') i++;
    if (i >= this.slotList.length) return this.result(before, from);
    this.entered[i] = null;
    return this.result(before, i + 1);
  }

  /**
   * Maps a native `beforeinput` to an edit. Returns `null` for input the
   * host must let through untouched — IME composition, which cannot be
   * cancelled and is applied once at `compositionend` via `insert()`.
   * Every other input type is handled (the host prevents the default).
   */
  beforeInput(
    inputType: string,
    data: string | null,
    start: number,
    end: number,
  ): OgeMaskEdit | null {
    if (inputType === 'insertCompositionText') return null;
    if (inputType.startsWith('insert')) {
      if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
        return this.result(this.text(), start);
      }
      // a collapsed caret types at the first empty slot at the latest, so
      // a click into the placeholder tail never opens a gap
      if (start === end) {
        const caret = this.normalizeCaret(start);
        return this.insert(caret, caret, data ?? '');
      }
      return this.insert(start, end, data ?? '');
    }
    if (inputType.startsWith('delete')) {
      return inputType.endsWith('Forward')
        ? this.deleteForward(start, end)
        : this.deleteBackward(start, end);
    }
    // historyUndo / historyRedo / formatting: not supported on a mask
    return this.result(this.text(), start);
  }

  /**
   * Re-derives the content from arbitrary native text — the fallback for
   * input no `beforeinput` announced (autofill, some virtual keyboards).
   * Text in the mask's own shape maps position by position; anything else
   * is treated as a paste into an empty mask.
   */
  reconcile(text: string, caret?: number): OgeMaskEdit {
    const before = this.text();
    const chars = Array.from(text);
    const sameShape =
      chars.length === this.slotList.length &&
      this.slotList.every(
        (slot, i) => slot.kind === 'edit' || slot.char === chars[i],
      );
    if (sameShape) {
      this.entered = this.slotList.map((slot, i) => {
        const char = chars[i];
        return slot.kind === 'edit' &&
          char !== this.placeholder &&
          slot.test(char)
          ? char
          : null;
      });
      const next = this.text();
      return {
        text: next,
        caret: this.normalizeCaret(caret ?? next.length),
        changed: next !== before,
      };
    }
    this.clear();
    const edit = this.insert(0, 0, text.split(this.placeholder).join(''));
    return { ...edit, changed: edit.text !== before };
  }

  // --- caret -------------------------------------------------------------------

  /** Index of the first empty editable slot, or the text length when full. */
  firstEmptyIndex(): number {
    const i = this.slotList.findIndex(
      (slot, k) => slot.kind === 'edit' && this.entered[k] === null,
    );
    return i < 0 ? this.slotList.length : i;
  }

  /**
   * Where a caret placed at `pos` should really sit: never past the first
   * empty slot (no gaps open by clicking into the tail) and forward over
   * literals onto an editable slot.
   */
  normalizeCaret(pos: number): number {
    const clamped = Math.max(0, Math.min(pos, this.firstEmptyIndex()));
    return this.skipLiterals(clamped);
  }

  // --- internals ---------------------------------------------------------------

  private range(start: number, end: number): [number, number] {
    const len = this.slotList.length;
    const a = Math.max(0, Math.min(start, len));
    const b = Math.max(0, Math.min(end, len));
    return a <= b ? [a, b] : [b, a];
  }

  private clearRange(from: number, to: number): void {
    for (let i = from; i < to; i++) this.entered[i] = null;
  }

  /** Moves forward over literals; stays put when only literals remain. */
  private skipLiterals(pos: number): number {
    let i = pos;
    while (i < this.slotList.length && this.slotList[i].kind === 'literal') i++;
    return i < this.slotList.length ? i : Math.min(pos, this.slotList.length);
  }

  private lastFilledIndex(): number {
    for (let i = this.entered.length - 1; i >= 0; i--) {
      if (this.entered[i] !== null) return i;
    }
    return -1;
  }

  private lastFilledEditOrdinal(): number {
    let ordinal = -1;
    let last = -1;
    for (let i = 0; i < this.slotList.length; i++) {
      if (this.slotList[i].kind !== 'edit') continue;
      ordinal++;
      if (this.entered[i] !== null) last = ordinal;
    }
    return last;
  }

  private result(before: string, caret: number): OgeMaskEdit {
    const text = this.text();
    return { text, caret, changed: text !== before };
  }
}

function trimTrailing(chars: string[], lastFilled: number): string {
  return chars.slice(0, lastFilled + 1).join('');
}

/**
 * `true` when `value` fills every required slot of `mask` — the check a
 * Signal Forms schema or a server validator runs without an editor:
 *
 * ```ts
 * validate(path.phone, ({ value }) =>
 *   ogeMaskComplete('(000) 000-0000', value()) ? null : { kind: 'mask' });
 * ```
 *
 * An empty value is complete (leave emptiness to `required`).
 */
export function ogeMaskComplete(
  mask: string,
  value: string,
  options: { rules?: OgeMaskRules; includeLiterals?: boolean } = {},
): boolean {
  if (!value) return true;
  const core = new OgeMaskCore({ mask, rules: options.rules });
  core.setValue(value, options.includeLiterals ?? false);
  return core.isComplete();
}

/**
 * The native `inputmode` a mask implies: `'numeric'` when every editable
 * slot accepts only digits (phone numbers, card numbers, PINs), else
 * `undefined` (the full keyboard).
 */
export function ogeMaskInputMode(
  mask: string,
  rules?: OgeMaskRules,
): 'numeric' | undefined {
  const edits = parseMask(mask, rules).filter((s) => s.kind === 'edit');
  if (!edits.length) return undefined;
  return edits.every(
    (s) => s.kind === 'edit' && (s.key === '0' || s.key === '9'),
  )
    ? 'numeric'
    : undefined;
}
