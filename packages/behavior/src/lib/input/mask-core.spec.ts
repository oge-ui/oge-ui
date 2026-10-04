import { describe, expect, it } from 'vitest';
import {
  OgeMaskCore,
  ogeMaskComplete,
  ogeMaskInputMode,
  parseMask,
} from './mask-core';

const PHONE = '(000) 000-0000';

describe('parseMask', () => {
  it('compiles built-in rules, literals and escapes', () => {
    const slots = parseMask('\\0L-9');
    expect(slots.map((s) => s.kind)).toEqual([
      'literal',
      'edit',
      'literal',
      'edit',
    ]);
    expect(slots[0]).toMatchObject({ kind: 'literal', char: '0' });
    expect(slots[1]).toMatchObject({ key: 'L', optional: false });
    expect(slots[3]).toMatchObject({ key: '9', optional: true });
  });

  it('applies custom rules (RegExp, character set, predicate) as required slots', () => {
    const slots = parseMask('HXP', {
      H: /[0-9a-f]/i,
      X: 'xyz',
      P: (c) => c === '!',
    });
    const tests = slots.map((s) => (s.kind === 'edit' ? s : null));
    expect(tests[0]?.test('B')).toBe(true);
    expect(tests[0]?.test('g')).toBe(false);
    expect(tests[1]?.test('y')).toBe(true);
    expect(tests[1]?.test('a')).toBe(false);
    expect(tests[2]?.test('!')).toBe(true);
    expect(tests.every((t) => t?.optional === false)).toBe(true);
  });

  it('a global-flag RegExp rule does not carry lastIndex between tests', () => {
    const [slot] = parseMask('H', { H: /[a-f]/g });
    if (slot.kind !== 'edit') throw new Error('expected an edit slot');
    expect([slot.test('a'), slot.test('a'), slot.test('a')]).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('accepts letters of any script for L and digits for 0', () => {
    const [letter, digit] = parseMask('L0');
    if (letter.kind !== 'edit' || digit.kind !== 'edit') throw new Error();
    expect(letter.test('ş')).toBe(true);
    expect(letter.test('Ж')).toBe(true);
    expect(letter.test('1')).toBe(false);
    expect(digit.test('7')).toBe(true);
    expect(digit.test('x')).toBe(false);
  });
});

describe('OgeMaskCore — display and values', () => {
  it('renders the placeholder in empty slots', () => {
    const core = new OgeMaskCore({ mask: PHONE });
    expect(core.text()).toBe('(___) ___-____');
    expect(core.isEmpty()).toBe(true);
    expect(core.rawValue()).toBe('');
    expect(core.maskedValue()).toBe('');
  });

  it('honours a custom maskChar (first grapheme only)', () => {
    const core = new OgeMaskCore({ mask: '00', maskChar: '•x' });
    expect(core.text()).toBe('••');
  });

  it('round-trips raw and masked values', () => {
    const core = new OgeMaskCore({ mask: PHONE });
    core.setValue('5551234567', false);
    expect(core.text()).toBe('(555) 123-4567');
    expect(core.rawValue()).toBe('5551234567');
    expect(core.maskedValue()).toBe('(555) 123-4567');
    expect(core.isComplete()).toBe(true);

    core.setValue('(555) 12', true);
    expect(core.rawValue()).toBe('55512');
    expect(core.maskedValue()).toBe('(555) 12');
    expect(core.isComplete()).toBe(false);
  });

  it('drops characters a slot rejects when writing a value', () => {
    const core = new OgeMaskCore({ mask: '000' });
    core.setValue('1a3', false);
    expect(core.text()).toBe('1_3');
    expect(core.rawValue()).toBe('1 3');
  });

  it('treats optional slots as not required for completeness', () => {
    const core = new OgeMaskCore({ mask: '0009' });
    core.setValue('123', false);
    expect(core.isComplete()).toBe(true);
  });

  it('re-applies the entered characters when reconfigured', () => {
    const core = new OgeMaskCore({ mask: '000-000' });
    core.setValue('123456', false);
    core.configure({ mask: '00 00 00', maskChar: '*' });
    expect(core.text()).toBe('12 34 56');
  });
});

describe('OgeMaskCore — editing', () => {
  it('typing fills the slot at the caret and skips literals', () => {
    const core = new OgeMaskCore({ mask: PHONE });
    let edit = core.insert(0, 0, '5');
    expect(edit.text).toBe('(5__) ___-____');
    expect(edit.caret).toBe(2);
    edit = core.insert(2, 2, '5');
    edit = core.insert(edit.caret, edit.caret, '5');
    // the caret jumps over ") " onto the next editable slot
    expect(edit.caret).toBe(6);
  });

  it('rejects a character no slot accepts and keeps the caret', () => {
    const core = new OgeMaskCore({ mask: PHONE });
    const edit = core.insert(1, 1, 'x');
    expect(edit.changed).toBe(false);
    expect(edit.caret).toBe(1);
  });

  it('consumes a typed literal that matches the next literal', () => {
    const core = new OgeMaskCore({ mask: '00-00' });
    core.insert(0, 0, '12');
    const edit = core.insert(2, 2, '-');
    expect(edit.caret).toBe(3);
    expect(core.text()).toBe('12-__');
  });

  it('pastes raw and formatted text alike', () => {
    const raw = new OgeMaskCore({ mask: PHONE });
    raw.insert(0, 0, '5551234567');
    expect(raw.text()).toBe('(555) 123-4567');

    const formatted = new OgeMaskCore({ mask: PHONE });
    formatted.insert(0, 0, '(555) 123-4567');
    expect(formatted.text()).toBe('(555) 123-4567');

    const noisy = new OgeMaskCore({ mask: PHONE });
    noisy.insert(0, 0, '+1 555.123.4567');
    // "+" and "." are dropped; every digit lands in order
    expect(noisy.rawValue()).toBe('1555123456');
  });

  it('overwrites the selection instead of shifting', () => {
    const core = new OgeMaskCore({ mask: '0000' });
    core.setValue('1234', false);
    const edit = core.insert(1, 3, '9');
    expect(edit.text).toBe('19_4');
    expect(edit.caret).toBe(2);
  });

  it('backspace empties the previous editable slot across literals', () => {
    const core = new OgeMaskCore({ mask: PHONE });
    core.setValue('5551', false);
    // caret right after "(555) 1": index 7
    let edit = core.deleteBackward(7, 7);
    expect(edit.text).toBe('(555) ___-____');
    expect(edit.caret).toBe(6);
    // next backspace crosses ") " and empties the third digit
    edit = core.deleteBackward(6, 6);
    expect(edit.text).toBe('(55_) ___-____');
    expect(edit.caret).toBe(3);
  });

  it('delete empties the next editable slot and steps past it', () => {
    const core = new OgeMaskCore({ mask: '00-00' });
    core.setValue('1234', false);
    const edit = core.deleteForward(2, 2);
    expect(edit.text).toBe('12-_4');
    expect(edit.caret).toBe(4);
  });

  it('deleting a selection empties every slot in it', () => {
    const core = new OgeMaskCore({ mask: '00-00' });
    core.setValue('1234', false);
    expect(core.deleteBackward(0, 5).text).toBe('__-__');
    expect(core.isEmpty()).toBe(true);
  });

  it('backspace at the start is a no-op', () => {
    const core = new OgeMaskCore({ mask: '(00)' });
    const edit = core.deleteBackward(1, 1);
    expect(edit.changed).toBe(false);
    expect(edit.caret).toBe(1);
  });
});

describe('OgeMaskCore — beforeinput mapping', () => {
  it('lets IME composition through untouched', () => {
    const core = new OgeMaskCore({ mask: 'LLL' });
    expect(core.beforeInput('insertCompositionText', 'あ', 0, 0)).toBeNull();
  });

  it('maps insert, paste, drop and delete input types', () => {
    const core = new OgeMaskCore({ mask: '000' });
    expect(core.beforeInput('insertText', '1', 0, 0)?.text).toBe('1__');
    expect(core.beforeInput('insertFromPaste', '23', 1, 1)?.text).toBe('123');
    expect(core.beforeInput('deleteContentBackward', null, 3, 3)?.text).toBe(
      '12_',
    );
    expect(core.beforeInput('deleteContentForward', null, 0, 0)?.text).toBe(
      '_2_',
    );
    expect(core.beforeInput('deleteWordBackward', null, 0, 3)?.text).toBe(
      '___',
    );
    expect(core.beforeInput('insertFromDrop', '9', 0, 0)?.text).toBe('9__');
  });

  it('types at the first empty slot when the caret sits past it', () => {
    const core = new OgeMaskCore({ mask: '00-00' });
    core.setValue('1', false);
    expect(core.beforeInput('insertText', '2', 4, 4)?.text).toBe('12-__');
  });

  it('swallows line breaks and history edits without changing text', () => {
    const core = new OgeMaskCore({ mask: '000' });
    core.setValue('12', false);
    expect(core.beforeInput('insertLineBreak', null, 2, 2)?.changed).toBe(
      false,
    );
    expect(core.beforeInput('historyUndo', null, 2, 2)?.changed).toBe(false);
    expect(core.text()).toBe('12_');
  });
});

describe('OgeMaskCore — reconcile and caret', () => {
  it('reconciles text in the mask shape position by position', () => {
    const core = new OgeMaskCore({ mask: '00-00' });
    const edit = core.reconcile('1_-3_');
    expect(edit.text).toBe('1_-3_');
    expect(core.rawValue()).toBe('1 3');
  });

  it('reconciles foreign text (autofill) as a paste', () => {
    const core = new OgeMaskCore({ mask: PHONE });
    core.reconcile('555 123 4567');
    expect(core.text()).toBe('(555) 123-4567');
  });

  it('normalizes the caret onto the first empty slot', () => {
    const core = new OgeMaskCore({ mask: PHONE });
    expect(core.normalizeCaret(0)).toBe(1);
    expect(core.normalizeCaret(10)).toBe(1);
    core.setValue('555', false);
    expect(core.firstEmptyIndex()).toBe(6);
    expect(core.normalizeCaret(4)).toBe(6);
    expect(core.normalizeCaret(2)).toBe(2);
  });
});

describe('helpers', () => {
  it('ogeMaskComplete checks a value without an editor', () => {
    expect(ogeMaskComplete(PHONE, '5551234567')).toBe(true);
    expect(ogeMaskComplete(PHONE, '555')).toBe(false);
    expect(ogeMaskComplete(PHONE, '')).toBe(true);
    expect(
      ogeMaskComplete(PHONE, '(555) 123-4567', { includeLiterals: true }),
    ).toBe(true);
  });

  it('ogeMaskInputMode suggests the numeric keyboard for digit-only masks', () => {
    expect(ogeMaskInputMode(PHONE)).toBe('numeric');
    expect(ogeMaskInputMode('LL-000')).toBeUndefined();
    expect(ogeMaskInputMode('---')).toBeUndefined();
  });
});
