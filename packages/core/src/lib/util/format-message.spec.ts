import {
  isOgeIcuMessage,
  ogeFormatMessage,
  warnOgeDeprecatedMessage,
} from './format-message';

const ROWS = '{count, plural, =0 {No rows} one {# row} other {# rows}}';

describe('ogeFormatMessage — interpolation', () => {
  it('substitutes names and keeps unknown placeholders visible', () => {
    expect(ogeFormatMessage('{column} moved', { column: 'City' })).toBe(
      'City moved',
    );
    expect(ogeFormatMessage('{a} and {b}', { a: 'x' })).toBe('x and {b}');
    expect(ogeFormatMessage('No braces at all')).toBe('No braces at all');
  });

  it('formats numbers and dates in the locale', () => {
    expect(ogeFormatMessage('{n} items', { n: 1234.5 }, 'de-DE')).toBe(
      '1.234,5 items',
    );
    expect(ogeFormatMessage('{n} items', { n: '1234' }, 'de-DE')).toBe(
      '1234 items',
    );
    expect(
      ogeFormatMessage(
        '{d, date, short}',
        { d: new Date(2024, 0, 5) },
        'en-US',
      ),
    ).toBe('1/5/24');
    expect(ogeFormatMessage('{p, number, percent}', { p: 0.5 }, 'en-US')).toBe(
      '50%',
    );
  });

  it('renders null values as empty text', () => {
    expect(ogeFormatMessage('[{x}]', { x: null })).toBe('[]');
  });
});

describe('ogeFormatMessage — plural', () => {
  it('exact matches win over categories', () => {
    expect(ogeFormatMessage(ROWS, { count: 0 }, 'en')).toBe('No rows');
    expect(ogeFormatMessage(ROWS, { count: 1 }, 'en')).toBe('1 row');
    expect(ogeFormatMessage(ROWS, { count: 2 }, 'en')).toBe('2 rows');
  });

  it('# is the count in the locale digits', () => {
    expect(ogeFormatMessage(ROWS, { count: 1500 }, 'en-US')).toBe('1,500 rows');
    expect(ogeFormatMessage(ROWS, { count: 1500 }, 'de-DE')).toBe('1.500 rows');
  });

  it('accepts numeric strings as the count', () => {
    expect(ogeFormatMessage(ROWS, { count: '1' }, 'en')).toBe('1 row');
  });

  it('tr: one / other', () => {
    const tr = '{n, plural, one {# satır} other {# satır}}';
    expect(ogeFormatMessage(tr, { n: 1 }, 'tr')).toBe('1 satır');
    expect(ogeFormatMessage(tr, { n: 7 }, 'tr')).toBe('7 satır');
  });

  it('ar: zero / one / two / few / many / other', () => {
    const ar =
      '{n, plural, zero {zero} one {one} two {two} few {few} many {many} other {other}}';
    expect(ogeFormatMessage(ar, { n: 0 }, 'ar')).toBe('zero');
    expect(ogeFormatMessage(ar, { n: 1 }, 'ar')).toBe('one');
    expect(ogeFormatMessage(ar, { n: 2 }, 'ar')).toBe('two');
    expect(ogeFormatMessage(ar, { n: 5 }, 'ar')).toBe('few');
    expect(ogeFormatMessage(ar, { n: 11 }, 'ar')).toBe('many');
    expect(ogeFormatMessage(ar, { n: 100 }, 'ar')).toBe('other');
  });

  it('pl: one / few / many', () => {
    const pl =
      '{n, plural, one {# plik} few {# pliki} many {# plików} other {# pliku}}';
    expect(ogeFormatMessage(pl, { n: 1 }, 'pl')).toBe('1 plik');
    expect(ogeFormatMessage(pl, { n: 3 }, 'pl')).toBe('3 pliki');
    expect(ogeFormatMessage(pl, { n: 5 }, 'pl')).toBe('5 plików');
    expect(ogeFormatMessage(pl, { n: 22 }, 'pl')).toBe('22 pliki');
    expect(ogeFormatMessage(pl, { n: 1.5 }, 'pl')).toBe('1,5 pliku');
  });

  it('ru: one / few / many', () => {
    const ru =
      '{n, plural, one {# строка} few {# строки} many {# строк} other {# строки}}';
    expect(ogeFormatMessage(ru, { n: 21 }, 'ru')).toBe('21 строка');
    expect(ogeFormatMessage(ru, { n: 23 }, 'ru')).toBe('23 строки');
    expect(ogeFormatMessage(ru, { n: 25 }, 'ru')).toBe('25 строк');
    expect(ogeFormatMessage(ru, { n: 11 }, 'ru')).toBe('11 строк');
  });

  it('falls back to other when a category has no branch', () => {
    expect(ogeFormatMessage('{n, plural, other {# x}}', { n: 1 }, 'en')).toBe(
      '1 x',
    );
  });

  it('offset shifts the category and #, not the exact match', () => {
    const template =
      '{n, plural, offset:1 =0 {nobody} =1 {only {name}} one {{name} and # other} other {{name} and # others}}';
    expect(ogeFormatMessage(template, { n: 1, name: 'Ada' }, 'en')).toBe(
      'only Ada',
    );
    expect(ogeFormatMessage(template, { n: 2, name: 'Ada' }, 'en')).toBe(
      'Ada and 1 other',
    );
    expect(ogeFormatMessage(template, { n: 4, name: 'Ada' }, 'en')).toBe(
      'Ada and 3 others',
    );
  });

  it('selectordinal', () => {
    const template =
      '{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}';
    expect(ogeFormatMessage(template, { n: 1 }, 'en')).toBe('1st');
    expect(ogeFormatMessage(template, { n: 22 }, 'en')).toBe('22nd');
    expect(ogeFormatMessage(template, { n: 13 }, 'en')).toBe('13th');
  });

  it('a missing count takes the other branch', () => {
    expect(ogeFormatMessage(ROWS, {}, 'en')).toBe(' rows');
  });
});

describe('ogeFormatMessage — select and nesting', () => {
  it('select picks a branch, other as fallback', () => {
    const template = '{g, select, female {She} male {He} other {They}} left';
    expect(ogeFormatMessage(template, { g: 'female' })).toBe('She left');
    expect(ogeFormatMessage(template, { g: 'x' })).toBe('They left');
  });

  it('nested braces: plural inside select, # reaches the plural', () => {
    const template =
      '{kind, select, file {{n, plural, one {# file} other {# files}}} other {{n, plural, one {# item} other {# items}}}} selected';
    expect(ogeFormatMessage(template, { kind: 'file', n: 1 }, 'en')).toBe(
      '1 file selected',
    );
    expect(ogeFormatMessage(template, { kind: 'row', n: 3 }, 'en')).toBe(
      '3 items selected',
    );
  });

  it('select inside plural keeps #', () => {
    const template =
      '{n, plural, one {{g, select, a {# A} other {# B}}} other {{g, select, a {# As} other {# Bs}}}}';
    expect(ogeFormatMessage(template, { n: 2, g: 'a' }, 'en')).toBe('2 As');
  });

  it('# outside a plural is plain text', () => {
    expect(ogeFormatMessage('Row #{n}', { n: 4 })).toBe('Row #4');
  });
});

describe('ogeFormatMessage — escaping and errors', () => {
  it('ICU apostrophe quoting', () => {
    expect(ogeFormatMessage("'{literal}' {x}", { x: 1 })).toBe('{literal} 1');
    expect(ogeFormatMessage("It''s {x}", { x: 'ok' })).toBe("It's ok");
    expect(ogeFormatMessage("Don't {x}", { x: 'stop' })).toBe("Don't stop");
    expect(
      ogeFormatMessage("{n, plural, other {'#' is #}}", { n: 3 }, 'en'),
    ).toBe('# is 3');
  });

  it('a malformed template never throws and still substitutes names', () => {
    expect(ogeFormatMessage('{count, plural, one {# x}', { count: 1 })).toBe(
      '{count, plural, one {# x}',
    );
    expect(ogeFormatMessage('{a} }', { a: 'x' })).toBe('x }');
    expect(
      ogeFormatMessage('{n, plural, one {# x}} {n}', { n: 2 }), // no other
    ).toBe('{n, plural, one {# x}} 2');
  });

  it('isOgeIcuMessage', () => {
    expect(isOgeIcuMessage(ROWS)).toBe(true);
    expect(isOgeIcuMessage('{count} rows')).toBe(false);
  });
});

describe('warnOgeDeprecatedMessage', () => {
  it('warns once per key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warnOgeDeprecatedMessage('specOnlyKey', 'specKey');
    warnOgeDeprecatedMessage('specOnlyKey', 'specKey');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('specOnlyKey');
    warn.mockRestore();
  });

  it('gives generic advice that holds for every key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warnOgeDeprecatedMessage('specSuffixKey', 'specInfo');
    const text = String(warn.mock.calls[0][0]);
    expect(text).toContain('supply "specInfo" instead.');
    expect(text).not.toContain('singular branch');
    warn.mockRestore();
  });

  it('appends the per-key advice', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warnOgeDeprecatedMessage(
      'specOneKey',
      'specCount',
      'put the singular branch into it as an ICU plural.',
    );
    expect(String(warn.mock.calls[0][0])).toContain(
      'supply "specCount" instead — put the singular branch into it as an ICU plural.',
    );
    warn.mockRestore();
  });
});
