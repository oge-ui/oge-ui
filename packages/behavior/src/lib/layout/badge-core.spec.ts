import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_BADGE_MESSAGES,
  ogeAddDescribedBy,
  ogeBadgeAriaTarget,
  ogeBadgeDescription,
  ogeBadgeText,
  ogeBadgeVisible,
  ogeRemoveDescribedBy,
  resolveOgeBadgeConfig,
  syncOgeBadgeHostAria,
} from './badge-core';

const messages = OGE_DEFAULT_BADGE_MESSAGES;

describe('ogeBadgeVisible', () => {
  it('hides empty and zero counts unless asked', () => {
    expect(ogeBadgeVisible({ value: null })).toBe(false);
    expect(ogeBadgeVisible({ value: 0 })).toBe(false);
    expect(ogeBadgeVisible({ value: 0, showZero: true })).toBe(true);
    expect(ogeBadgeVisible({ value: 3 })).toBe(true);
    expect(ogeBadgeVisible({ value: '  ' })).toBe(false);
    expect(ogeBadgeVisible({ value: 'New' })).toBe(true);
    expect(ogeBadgeVisible({ value: Number.NaN })).toBe(false);
  });

  it('always shows a dot, never an invisible badge', () => {
    expect(ogeBadgeVisible({ dot: true })).toBe(true);
    expect(ogeBadgeVisible({ dot: true, invisible: true })).toBe(false);
    expect(ogeBadgeVisible({ value: 4, invisible: true })).toBe(false);
  });
});

describe('ogeBadgeText', () => {
  it('caps at max with the overflow pattern', () => {
    expect(ogeBadgeText({ value: 5, messages, locale: 'en' })).toBe('5');
    expect(ogeBadgeText({ value: 99, messages, locale: 'en' })).toBe('99');
    expect(ogeBadgeText({ value: 100, messages, locale: 'en' })).toBe('99+');
    expect(ogeBadgeText({ value: 12, max: 9, messages, locale: 'en' })).toBe(
      '9+',
    );
  });

  it('falls back to 99 for an invalid max and keeps strings verbatim', () => {
    expect(ogeBadgeText({ value: 150, max: 0, messages, locale: 'en' })).toBe(
      '99+',
    );
    expect(ogeBadgeText({ value: 'Beta', messages })).toBe('Beta');
    expect(ogeBadgeText({ value: 3, dot: true, messages })).toBe('');
    expect(ogeBadgeText({ value: null, messages })).toBe('');
  });

  it('formats digits in the locale', () => {
    expect(
      ogeBadgeText({ value: 1500, max: 9999, messages, locale: 'en' }),
    ).toBe('1,500');
  });
});

describe('ogeBadgeDescription', () => {
  it('reads a plural count, an overflow, a dot and a string', () => {
    expect(ogeBadgeDescription({ value: 1, messages, locale: 'en' })).toBe(
      '1 new item',
    );
    expect(ogeBadgeDescription({ value: 5, messages, locale: 'en' })).toBe(
      '5 new items',
    );
    expect(ogeBadgeDescription({ value: 120, messages, locale: 'en' })).toBe(
      'More than 99 new items',
    );
    expect(ogeBadgeDescription({ dot: true, messages })).toBe('New');
    expect(ogeBadgeDescription({ value: 'Beta', messages })).toBe('Beta');
    expect(ogeBadgeDescription({ value: null, messages })).toBe('');
  });

  it('lets an explicit description win', () => {
    expect(
      ogeBadgeDescription({
        value: 5,
        description: '5 unread mails',
        messages,
      }),
    ).toBe('5 unread mails');
  });
});

describe('aria-describedby wiring', () => {
  it('adds and removes its own id, keeping the control’s ids', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-describedby', 'hint');
    ogeAddDescribedBy(el, 'b1');
    ogeAddDescribedBy(el, 'b1');
    expect(el.getAttribute('aria-describedby')).toBe('hint b1');
    ogeRemoveDescribedBy(el, 'b1');
    expect(el.getAttribute('aria-describedby')).toBe('hint');
    ogeRemoveDescribedBy(el, 'hint');
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  it('targets the first focusable control, else the first element', () => {
    const anchor = document.createElement('span');
    anchor.innerHTML = '<span class="wrap"><a href="#x">Inbox</a></span>';
    expect(ogeBadgeAriaTarget(anchor)?.tagName).toBe('A');
    const avatar = document.createElement('span');
    avatar.innerHTML = '<span role="img" aria-label="Ada"></span>';
    expect(ogeBadgeAriaTarget(avatar)?.getAttribute('role')).toBe('img');
    expect(ogeBadgeAriaTarget(document.createElement('span'))).toBeNull();
  });

  it('moves the reference when the target or the id changes', () => {
    const anchor = document.createElement('span');
    anchor.innerHTML = '<button>Inbox</button>';
    const button = anchor.querySelector('button') as HTMLButtonElement;
    let state = syncOgeBadgeHostAria(anchor, 'd1', null);
    expect(button.getAttribute('aria-describedby')).toBe('d1');
    state = syncOgeBadgeHostAria(anchor, 'd2', state);
    expect(button.getAttribute('aria-describedby')).toBe('d2');
    state = syncOgeBadgeHostAria(anchor, null, state);
    expect(state).toBeNull();
    expect(button.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('resolveOgeBadgeConfig', () => {
  it('merges messages and passes defaults', () => {
    const config = resolveOgeBadgeConfig({ max: 9, messages: { dot: 'Yeni' } });
    expect(config.max).toBe(9);
    expect(config.messages.dot).toBe('Yeni');
    expect(config.messages.overflow).toBe('{max}+');
  });
});
