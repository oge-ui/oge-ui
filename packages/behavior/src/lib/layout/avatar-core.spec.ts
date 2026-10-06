import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_AVATAR_MESSAGES,
  ogeAvatarGroupWindow,
  ogeAvatarInitials,
  ogeAvatarLabel,
  ogeAvatarOverflowLabel,
  ogeAvatarOverflowText,
  ogeResolveAvatarContent,
  resolveOgeAvatarConfig,
} from './avatar-core';

const messages = OGE_DEFAULT_AVATAR_MESSAGES;

describe('ogeAvatarInitials', () => {
  it('takes the first letters of the first and last word', () => {
    expect(ogeAvatarInitials('Ada King Lovelace')).toBe('AL');
    expect(ogeAvatarInitials('  grace   hopper ')).toBe('GH');
  });

  it('uses one letter for a one-word name and honours max', () => {
    expect(ogeAvatarInitials('Plato')).toBe('P');
    expect(ogeAvatarInitials('Ada Lovelace', undefined, 1)).toBe('A');
    expect(ogeAvatarInitials('Ada Lovelace', undefined, 0)).toBe('');
  });

  it('skips leading punctuation and keeps surrogate pairs intact', () => {
    expect(ogeAvatarInitials('(Ada) "Lovelace"')).toBe('AL');
    expect(ogeAvatarInitials('𝒜da Lovelace')).toBe('𝒜L');
    expect(ogeAvatarInitials('— —')).toBe('');
  });

  it('upper-cases in the locale (Turkish dotted i)', () => {
    expect(ogeAvatarInitials('ilker irmak', 'tr')).toBe('İİ');
    expect(ogeAvatarInitials('ilker irmak', 'en')).toBe('II');
  });

  it('returns empty for no name', () => {
    expect(ogeAvatarInitials(undefined)).toBe('');
    expect(ogeAvatarInitials('')).toBe('');
  });
});

describe('ogeResolveAvatarContent', () => {
  it('runs the image → initials → icon fallback chain', () => {
    expect(ogeResolveAvatarContent({ src: 'a.png', name: 'Ada' })).toBe(
      'image',
    );
    expect(
      ogeResolveAvatarContent({ src: 'a.png', imageFailed: true, name: 'Ada' }),
    ).toBe('initials');
    expect(ogeResolveAvatarContent({ initials: 'XY' })).toBe('initials');
    expect(ogeResolveAvatarContent({ src: 'a.png', imageFailed: true })).toBe(
      'icon',
    );
    expect(ogeResolveAvatarContent({ initials: '  ' })).toBe('icon');
  });
});

describe('ogeAvatarLabel', () => {
  it('prefers ariaLabel, then name, then the catalog fallback', () => {
    expect(ogeAvatarLabel({ ariaLabel: 'Me', name: 'Ada', messages })).toBe(
      'Me',
    );
    expect(ogeAvatarLabel({ name: 'Ada', messages })).toBe('Ada');
    expect(ogeAvatarLabel({ messages })).toBe('Avatar');
  });

  it('appends the presence because the dot is decoration', () => {
    expect(ogeAvatarLabel({ name: 'Ada', status: 'busy', messages })).toBe(
      'Ada (Busy)',
    );
    expect(
      ogeAvatarLabel({
        name: 'Ada',
        status: 'online',
        messages: { ...messages, withStatus: '{status}: {name}' },
      }),
    ).toBe('Online: Ada');
  });
});

describe('ogeAvatarGroupWindow', () => {
  it('shows everything without a max', () => {
    expect(ogeAvatarGroupWindow(5)).toEqual({ visible: 5, overflow: 0 });
  });

  it('counts the surplus avatar inside max', () => {
    expect(ogeAvatarGroupWindow(7, 4)).toEqual({ visible: 3, overflow: 4 });
    expect(ogeAvatarGroupWindow(4, 4)).toEqual({ visible: 4, overflow: 0 });
  });

  it('clamps max to 2 so a lone +N never renders', () => {
    expect(ogeAvatarGroupWindow(5, 1)).toEqual({ visible: 1, overflow: 4 });
    expect(ogeAvatarGroupWindow(5, 0)).toEqual({ visible: 1, overflow: 4 });
  });

  it('adds a partially loaded population through total', () => {
    expect(ogeAvatarGroupWindow(3, 4, 24)).toEqual({
      visible: 3,
      overflow: 21,
    });
    expect(ogeAvatarGroupWindow(3, undefined, 10)).toEqual({
      visible: 3,
      overflow: 7,
    });
    expect(ogeAvatarGroupWindow(3, 4, 2)).toEqual({ visible: 3, overflow: 0 });
  });
});

describe('overflow text and label', () => {
  it('formats the visible +N and the plural label', () => {
    expect(ogeAvatarOverflowText(4, 'en')).toBe('+4');
    expect(ogeAvatarOverflowText(1200, 'en')).toBe('+1,200');
    expect(ogeAvatarOverflowLabel(1, messages, 'en')).toBe('1 more');
    expect(ogeAvatarOverflowLabel(4, messages, 'en')).toBe('4 more');
  });
});

describe('resolveOgeAvatarConfig', () => {
  it('merges messages one level deep', () => {
    const config = resolveOgeAvatarConfig({
      size: 'lg',
      messages: { busy: 'Meşgul' },
    });
    expect(config.size).toBe('lg');
    expect(config.messages.busy).toBe('Meşgul');
    expect(config.messages.online).toBe('Online');
  });
});
