import { describe, expect, it } from 'vitest';
import {
  createNumberTypingGrouper,
  formatNumberWhileTyping,
  numberWheelDirection,
} from './number-typing';

const en = { decimal: '.', group: ',', grouping: true };
const de = { decimal: ',', group: '.', grouping: true };

describe('formatNumberWhileTyping', () => {
  it('inserts group separators live and keeps the caret after the typed digit', () => {
    expect(formatNumberWhileTyping('1234', 4, en)).toEqual({
      text: '1,234',
      caret: 5,
    });
    expect(formatNumberWhileTyping('1,2345', 6, en)).toEqual({
      text: '12,345',
      caret: 6,
    });
  });

  it('preserves a mid-text caret across a moved separator', () => {
    // typed "9" after the first digit of 1,234 → "19,234"
    expect(formatNumberWhileTyping('19,234', 2, en)).toEqual({
      text: '19,234',
      caret: 2,
    });
    // typed "5" after "12" in "1,234": "1,2534" → "12,534", caret after 5
    expect(formatNumberWhileTyping('1,2534', 4, en)).toEqual({
      text: '12,534',
      caret: 4,
    });
  });

  it('removes a separator when a digit is deleted', () => {
    expect(formatNumberWhileTyping('1,23', 1, en)).toEqual({
      text: '123',
      caret: 1,
    });
  });

  it('keeps the sign and the fraction untouched by grouping', () => {
    expect(formatNumberWhileTyping('-12345.678', 10, en)).toEqual({
      text: '-12,345.678',
      caret: 11,
    });
    expect(formatNumberWhileTyping('1234567,5', 9, de).text).toBe(
      '1.234.567,5',
    );
  });

  it('caps the fraction while typing', () => {
    expect(
      formatNumberWhileTyping('12.345', 6, { ...en, maxFractionDigits: 2 }),
    ).toEqual({ text: '12.34', caret: 5 });
    expect(
      formatNumberWhileTyping('12.', 3, { ...en, maxFractionDigits: 0 }),
    ).toEqual({ text: '12', caret: 2 });
  });

  it('applies the cap without grouping when grouping is off', () => {
    expect(
      formatNumberWhileTyping('12345.678', 9, {
        ...en,
        grouping: false,
        maxFractionDigits: 1,
      }),
    ).toEqual({ text: '12345.6', caret: 7 });
  });

  it('leaves unreadable text and leading zeros alone', () => {
    expect(formatNumberWhileTyping('12a34', 3, en)).toEqual({
      text: '12a34',
      caret: 3,
    });
    expect(formatNumberWhileTyping('00123', 5, en).text).toBe('00123');
    expect(formatNumberWhileTyping('', 0, en)).toEqual({ text: '', caret: 0 });
  });

  it('accepts a typed space for NBSP-family separators', () => {
    const fr = { decimal: ',', group: ' ', grouping: true };
    expect(formatNumberWhileTyping('12 3456', 7, fr).text).toBe('123 456');
  });

  it('uses a locale grouper when given one', () => {
    const groupDigits = createNumberTypingGrouper('en-IN');
    expect(
      formatNumberWhileTyping('1234567', 7, { ...en, groupDigits }).text,
    ).toBe('12,34,567');
  });
});

describe('createNumberTypingGrouper', () => {
  it('groups without losing precision past 2^53', () => {
    const group = createNumberTypingGrouper('en-US');
    expect(group('12345678901234567890')).toBe('12,345,678,901,234,567,890');
  });
});

describe('numberWheelDirection', () => {
  it('steps only while focused and enabled', () => {
    expect(numberWheelDirection({ deltaY: -100 }, true, true)).toBe(1);
    expect(numberWheelDirection({ deltaY: 100 }, true, true)).toBe(-1);
    expect(numberWheelDirection({ deltaY: 100 }, false, true)).toBe(0);
    expect(numberWheelDirection({ deltaY: 100 }, true, false)).toBe(0);
    expect(numberWheelDirection({ deltaY: 0 }, true, true)).toBe(0);
  });
});
