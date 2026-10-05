import { ogeFormatMessage } from '@oge-ui/core';
import * as locales from './index';
import {
  OGE_LOCALE_NAMES,
  en,
  ogeLocalePacks,
  ogeMergeMessages,
  type OgeLocaleCode,
  type OgeLocalePack,
} from './index';

const CODES = Object.keys(OGE_LOCALE_NAMES) as OgeLocaleCode[];

describe('@oge-ui/locales barrel', () => {
  it.each(['en', 'OGE_LOCALE_NAMES', 'ogeLocalePacks', 'ogeMergeMessages'])(
    'exports %s',
    (name) => {
      expect((locales as Record<string, unknown>)[name]).toBeDefined();
    },
  );

  it('carries no translations itself', () => {
    expect(Object.keys(en)).toEqual(['locale', 'dir']);
  });
});

describe('ogeLocalePacks', () => {
  it('has a loader for every named language', () => {
    expect(Object.keys(ogeLocalePacks).sort()).toEqual([...CODES].sort());
  });

  it.each(CODES)('%s loads a pack for its own locale', async (code) => {
    const pack: OgeLocalePack = await ogeLocalePacks[code]();
    expect(pack.locale).toBe(code);
    expect(pack.dir).toBe(code === 'ar' || code === 'he' ? 'rtl' : 'ltr');
    if (code !== 'en') {
      expect(pack.grid?.noData).toBeTruthy();
      expect(pack.scheduler?.toolbar?.today).toBeTruthy();
    }
  });

  it.each(CODES.filter((c) => c !== 'en'))(
    '%s renders its plural messages through ogeFormatMessage',
    async (code) => {
      const pack = await ogeLocalePacks[code]();
      for (const count of [0, 1, 2, 3, 11, 100]) {
        const text = ogeFormatMessage(
          pack.grid?.rowCountAnnouncement ?? '',
          { count },
          pack.locale,
        );
        expect(text).not.toContain('{');
        expect(text).not.toContain('plural');
      }
    },
  );
});

describe('ogeMergeMessages', () => {
  const defaults = {
    title: 'Title',
    nested: { a: 'A', b: 'B' },
    other: { c: 'C' },
  };

  it('keeps every default the slice does not carry, nested blocks included', () => {
    expect(ogeMergeMessages(defaults, { nested: { a: 'Ä' } })).toEqual({
      title: 'Title',
      nested: { a: 'Ä', b: 'B' },
      other: { c: 'C' },
    });
  });

  it('returns the defaults for no slice and never mutates', () => {
    expect(ogeMergeMessages(defaults, undefined)).toBe(defaults);
    const merged = ogeMergeMessages(defaults, { title: 'T', other: {} });
    expect(merged.title).toBe('T');
    expect(merged.other).toEqual({ c: 'C' });
    expect(defaults.title).toBe('Title');
  });

  it('ignores undefined values', () => {
    expect(ogeMergeMessages(defaults, { title: undefined }).title).toBe(
      'Title',
    );
  });
});
