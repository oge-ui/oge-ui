import {
  clampOtpFocus,
  normalizeOtpLength,
  normalizeOtpValue,
  otpAcceptsChar,
  otpBackspace,
  otpCellLabel,
  otpCells,
  otpDelete,
  otpInputMode,
  otpInsert,
  otpNavigationTarget,
  otpSeparatorAfter,
  otpTypedText,
  sanitizeOtpText,
  type OgeOtpOptions,
} from './otp-core';

const numeric: OgeOtpOptions = { length: 6, type: 'numeric' };

describe('otp core', () => {
  it('normalizes the cell count', () => {
    expect(normalizeOtpLength(4)).toBe(4);
    expect(normalizeOtpLength(0)).toBe(6);
    expect(normalizeOtpLength(40)).toBe(12);
  });

  it('filters characters by type', () => {
    expect(otpAcceptsChar('7', 'numeric')).toBe(true);
    expect(otpAcceptsChar('a', 'numeric')).toBe(false);
    expect(otpAcceptsChar('a', 'alphabetic')).toBe(true);
    expect(otpAcceptsChar('7', 'alphabetic')).toBe(false);
    expect(otpAcceptsChar('ç', 'alphanumeric')).toBe(true);
    expect(otpAcceptsChar('-', 'alphanumeric')).toBe(false);
    expect(sanitizeOtpText('12-34 56', 'numeric')).toBe('123456');
    expect(sanitizeOtpText('ab1c', 'alphanumeric', 'upper')).toBe('AB1C');
    expect(sanitizeOtpText('AbC', 'alphabetic', 'lower')).toBe('abc');
  });

  it('folds script and full-width digits to ASCII', () => {
    expect(sanitizeOtpText('٣٤٥', 'numeric')).toBe('345');
    expect(sanitizeOtpText('１２', 'numeric')).toBe('12');
    expect(sanitizeOtpText('۰۹', 'numeric')).toBe('09');
    expect(sanitizeOtpText('०७', 'numeric')).toBe('07');
  });

  it('normalizes written values', () => {
    expect(normalizeOtpValue('12345678', numeric)).toBe('123456');
    expect(normalizeOtpValue(null, numeric)).toBe('');
    expect(normalizeOtpValue(42, numeric)).toBe('42');
  });

  it('splits the value into cells', () => {
    expect(otpCells('12', 4)).toEqual(['1', '2', '', '']);
  });

  it('never lets the caret pass the first empty cell', () => {
    expect(clampOtpFocus(5, '12', 6)).toBe(2);
    expect(clampOtpFocus(-1, '12', 6)).toBe(0);
    expect(clampOtpFocus(9, '123456', 6)).toBe(5);
  });

  it('types one character and advances', () => {
    expect(otpInsert('12', 2, '3', numeric)).toEqual({
      value: '123',
      focusIndex: 3,
      complete: false,
    });
    // overwriting a filled cell keeps the rest
    expect(otpInsert('123', 1, '9', numeric).value).toBe('193');
    // rejected text changes nothing
    expect(otpInsert('12', 2, 'x', numeric)).toEqual({
      value: '12',
      focusIndex: 2,
      complete: false,
    });
    // typing into a cell past the caret limit lands in the first empty one
    expect(otpInsert('1', 4, '2', numeric).value).toBe('12');
  });

  it('distributes a paste and completes', () => {
    expect(otpInsert('', 0, '123 456', numeric)).toEqual({
      value: '123456',
      focusIndex: 5,
      complete: true,
    });
    // a whole code always fills from the first cell
    expect(otpInsert('98', 2, '123456', numeric).value).toBe('123456');
    // a partial paste fills from the caret
    expect(otpInsert('12', 2, '34', numeric).value).toBe('1234');
    // overflow is cut
    expect(otpInsert('1234', 4, '5678', numeric).value).toBe('123456');
  });

  it('handles Backspace on filled and empty cells', () => {
    expect(otpBackspace('123', 3, numeric)).toEqual({
      value: '12',
      focusIndex: 2,
      complete: false,
    });
    expect(otpBackspace('123', 1, numeric)).toEqual({
      value: '13',
      focusIndex: 1,
      complete: false,
    });
    expect(otpBackspace('123456', 5, numeric)).toEqual({
      value: '12345',
      focusIndex: 5,
      complete: false,
    });
    expect(otpBackspace('', 0, numeric).value).toBe('');
  });

  it('handles Delete by closing the gap', () => {
    expect(otpDelete('1234', 1, numeric).value).toBe('134');
    expect(otpDelete('12', 2, numeric).value).toBe('12');
  });

  it('navigates with RTL-mirrored arrows', () => {
    expect(otpNavigationTarget('ArrowRight', 1, '123', 6, false)).toBe(2);
    expect(otpNavigationTarget('ArrowRight', 3, '123', 6, false)).toBe(3);
    expect(otpNavigationTarget('ArrowLeft', 1, '123', 6, false)).toBe(0);
    expect(otpNavigationTarget('ArrowLeft', 1, '123', 6, true)).toBe(2);
    expect(otpNavigationTarget('Home', 3, '123', 6, false)).toBe(0);
    expect(otpNavigationTarget('End', 0, '123', 6, false)).toBe(3);
    expect(otpNavigationTarget('End', 0, '123456', 6, false)).toBe(5);
    expect(otpNavigationTarget('a', 0, '1', 6, false)).toBeUndefined();
  });

  it('extracts the typed text from a native input value', () => {
    expect(otpTypedText('7', '3')).toBe('7');
    expect(otpTypedText('37', '3')).toBe('7');
    expect(otpTypedText('73', '3')).toBe('7');
    expect(otpTypedText('123456', '')).toBe('123456');
    expect(otpTypedText('', '3')).toBe('');
    // a whole code replacing a filled cell is not trimmed
    expect(otpTypedText('654321', '1', 6)).toBe('654321');
    expect(otpTypedText('21', '1', 6)).toBe('2');
  });

  it('names cells, separators and the keyboard', () => {
    expect(otpCellLabel('Character {index} of {length}', 0, 6, 'en-US')).toBe(
      'Character 1 of 6',
    );
    expect(otpSeparatorAfter(2, 6, 3)).toBe(true);
    expect(otpSeparatorAfter(5, 6, 3)).toBe(false);
    expect(otpSeparatorAfter(1, 6, 0)).toBe(false);
    expect(otpInputMode('numeric')).toBe('numeric');
    expect(otpInputMode('alphanumeric')).toBe('text');
  });
});
