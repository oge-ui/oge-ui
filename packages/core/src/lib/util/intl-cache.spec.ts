import {
  clearOgeIntlCache,
  ogeDateTimeFormat,
  ogeIntlCacheSize,
  ogeNumberFormat,
  ogeParseNumber,
  ogePluralRules,
  ogeRelativeTimeFormat,
} from './intl-cache';

describe('Intl formatter cache', () => {
  beforeEach(() => clearOgeIntlCache());

  it('returns one instance per locale + options, whatever the key order', () => {
    const a = ogeNumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const b = ogeNumberFormat('de-DE', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
    expect(a).toBe(b);
    expect(a.format(1234.5)).toBe('1.234,50');
    expect(ogeNumberFormat('en-US', { maximumFractionDigits: 2 })).not.toBe(a);
    expect(ogeIntlCacheSize().number).toBe(2);
  });

  it('ignores undefined option values in the key', () => {
    expect(ogeNumberFormat('en-US', { style: undefined })).toBe(
      ogeNumberFormat('en-US'),
    );
  });

  it('caches date, relative-time and plural formatters separately', () => {
    const date = ogeDateTimeFormat('tr-TR', { dateStyle: 'short' });
    expect(ogeDateTimeFormat('tr-TR', { dateStyle: 'short' })).toBe(date);
    expect(date.format(new Date(2024, 0, 5))).toBe('5.01.2024');
    expect(
      ogeRelativeTimeFormat('en', { numeric: 'auto' }).format(-1, 'day'),
    ).toBe('yesterday');
    expect(ogePluralRules('ar').select(3)).toBe('few');
    expect(ogeIntlCacheSize()).toEqual({
      number: 0,
      dateTime: 1,
      relativeTime: 1,
      plural: 1,
    });
  });

  it('falls back to the runtime default for a locale the engine rejects', () => {
    const formatter = ogeNumberFormat('not a locale!!');
    expect(formatter.format(1)).toBe(new Intl.NumberFormat().format(1));
    // and the bad key is cached, not retried per call
    expect(ogeNumberFormat('not a locale!!')).toBe(formatter);
  });

  it('falls back when options are invalid instead of throwing', () => {
    expect(() =>
      ogeNumberFormat('en-US', { style: 'currency' }).format(1),
    ).not.toThrow();
  });

  it('accepts locale lists', () => {
    expect(ogeNumberFormat(['de-DE', 'en-US']).format(1.5)).toBe('1,5');
  });
});

describe('ogeParseNumber', () => {
  it('reads each locale’s separators', () => {
    expect(ogeParseNumber('1.234,5', 'de-DE')).toBe(1234.5);
    expect(ogeParseNumber('1,5', 'tr-TR')).toBe(1.5);
    expect(ogeParseNumber('1,234.5', 'en-US')).toBe(1234.5);
    expect(ogeParseNumber('-12', 'en-US')).toBe(-12);
    expect(ogeParseNumber('0', 'de-DE')).toBe(0);
  });

  it('accepts a typed space where the locale groups with a no-break space', () => {
    expect(ogeParseNumber('1 234,5', 'fr-FR')).toBe(1234.5);
  });

  it('reads native digits', () => {
    const arabic = ogeNumberFormat('ar-EG').format(12.5);
    expect(ogeParseNumber(arabic, 'ar-EG')).toBe(12.5);
  });

  it('is NaN for blank or non-numeric text', () => {
    expect(ogeParseNumber('', 'en-US')).toBeNaN();
    expect(ogeParseNumber('   ', 'en-US')).toBeNaN();
    expect(ogeParseNumber('abc', 'en-US')).toBeNaN();
  });
});
