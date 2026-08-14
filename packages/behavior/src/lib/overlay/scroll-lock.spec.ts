import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  lockBodyScroll,
  resetScrollLockForTests,
  unlockBodyScroll,
} from './scroll-lock';

/** jsdom reports 0 for both, so the scrollbar width is faked per test. */
function withScrollbar(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    value: 1000,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: 1000 - width,
    configurable: true,
  });
}

beforeEach(() => {
  resetScrollLockForTests();
  // drop the whole attribute rather than assigning `''` per property: jsdom's
  // CSSOM keeps a longhand assigned an empty string, which would carry the
  // previous test's padding forward
  document.body.removeAttribute('style');
  withScrollbar(0);
});

afterEach(() => resetScrollLockForTests());

describe('lockBodyScroll / unlockBodyScroll', () => {
  it('hides body overflow and restores it', () => {
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
  });

  it('compensates the vanished scrollbar width', () => {
    withScrollbar(15);
    lockBodyScroll();
    expect(document.body.style.paddingRight).toBe('15px');
    unlockBodyScroll();
    expect(document.body.style.paddingRight).toBe('');
  });

  it('adds to an existing inline padding instead of overwriting it', () => {
    document.body.style.paddingRight = '10px';
    withScrollbar(15);
    lockBodyScroll();
    expect(document.body.style.paddingRight).toBe('25px');
    unlockBodyScroll();
    expect(document.body.style.paddingRight).toBe('10px');
  });

  it('leaves padding alone where there is no scrollbar (overlay scrollbars)', () => {
    lockBodyScroll();
    expect(document.body.style.paddingRight).toBe('');
  });

  it('restores the app’s own inline styles verbatim', () => {
    document.body.style.overflow = 'auto';
    lockBodyScroll();
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('ref-counts, so stacked modals do not unlock the page early', () => {
    withScrollbar(15);
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.paddingRight).toBe('15px');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.paddingRight).toBe('');
  });

  it('does not measure again on the nested acquire (no double padding)', () => {
    withScrollbar(15);
    lockBodyScroll();
    lockBodyScroll();
    expect(document.body.style.paddingRight).toBe('15px');
  });

  it('ignores an unbalanced release rather than going negative', () => {
    unlockBodyScroll();
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
  });
});
