import { afterEach, describe, expect, it, vi } from 'vitest';
import { ogePagerInfoText } from './grid-pager';

describe('ogePagerInfoText', () => {
  afterEach(() => vi.restoreAllMocks());

  it('formats the plural-aware pagerInfo message', () => {
    expect(
      ogePagerInfoText(
        { pagerInfo: '{count, plural, one {# row} other {# rows}}' },
        1,
        'en-US',
      ),
    ).toBe('1 row');
  });

  it('keeps a deprecated rowsSuffix and gives advice that fits it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(
      ogePagerInfoText(
        { pagerInfo: '{count} rows', rowsSuffix: 'satır' },
        2,
        'tr-TR',
      ),
    ).toBe('2 satır');
    const text = String(warn.mock.calls[0]?.[0]);
    expect(text).toContain('"rowsSuffix"');
    expect(text).toContain('supply "pagerInfo" instead');
    // a suffix never was a singular branch — that advice would be wrong here
    expect(text).not.toContain('singular branch');
  });
});
