import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ogeApplyAttributes,
  ogeClassNames,
  ogeSafeAttributes,
} from './safe-attributes';

describe('ogeSafeAttributes', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps data, aria and plain attributes', () => {
    expect(
      ogeSafeAttributes({
        'data-testid': 'edit-dialog',
        'aria-describedby': 'hint',
        id: 'panel-1',
        title: 'Edit',
      }),
    ).toEqual({
      'data-testid': 'edit-dialog',
      'aria-describedby': 'hint',
      id: 'panel-1',
      title: 'Edit',
    });
  });

  it('drops event handlers in any case, and warns once per key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bag = { onclick: 'alert(1)', ONMOUSEOVER: 'x', onFocus: 'x' };
    expect(ogeSafeAttributes(bag)).toEqual({});
    ogeSafeAttributes(bag);
    expect(warn).toHaveBeenCalledTimes(3);
    expect(String(warn.mock.calls[0][0])).toContain('onclick');
  });

  it('drops srcdoc, style, class and invalid names', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(
      ogeSafeAttributes({
        srcdoc: '<script>alert(1)</script>',
        style: 'color:red',
        class: 'x',
        'bad name': 'x',
        '"><img': 'x',
      }),
    ).toEqual({});
  });

  it('keeps safe URLs and drops script and markup URLs', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(
      ogeSafeAttributes({
        href: 'javascript:alert(1)',
        'xlink:href': 'java\tscript:alert(1)',
        formaction: 'data:text/html,<script>alert(1)</script>',
        src: 'data:image/svg+xml,<svg onload=alert(1)>',
        poster: 'data:image/png;base64,AAAA',
        action: '/save',
        cite: 'https://example.test/source',
      }),
    ).toEqual({
      poster: 'data:image/png;base64,AAAA',
      action: '/save',
      cite: 'https://example.test/source',
    });
  });

  it('leaves the names the component reserves to the component', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(
      ogeSafeAttributes({ role: 'button', 'aria-modal': 'false', lang: 'tr' }, [
        'role',
        'ARIA-MODAL',
      ]),
    ).toEqual({ lang: 'tr' });
  });

  it('treats a missing bag as empty and stringifies values', () => {
    expect(ogeSafeAttributes(undefined)).toEqual({});
    expect(ogeSafeAttributes(null)).toEqual({});
    expect(
      ogeSafeAttributes({
        'data-n': 3 as unknown as string,
        'data-null': null as unknown as string,
      }),
    ).toEqual({ 'data-n': '3', 'data-null': '' });
  });
});

describe('ogeClassNames', () => {
  it('joins strings and arrays, skipping empties and duplicates', () => {
    expect(
      ogeClassNames('a  b', ['b', 'c d'], undefined, null, false, '', 'a'),
    ).toBe('a b c d');
  });

  it('gives an empty string for nothing', () => {
    expect(ogeClassNames()).toBe('');
    expect(ogeClassNames(undefined, [])).toBe('');
  });
});

describe('ogeApplyAttributes', () => {
  it('sets the new names and removes the ones no longer present', () => {
    const el = document.createElement('div');
    let applied = ogeApplyAttributes(el, { 'data-a': '1', title: 't' }, []);
    expect(el.getAttribute('data-a')).toBe('1');
    applied = ogeApplyAttributes(el, { 'data-a': '2' }, applied);
    expect(el.getAttribute('data-a')).toBe('2');
    expect(el.hasAttribute('title')).toBe(false);
    applied = ogeApplyAttributes(el, {}, applied);
    expect(el.hasAttribute('data-a')).toBe(false);
    expect(applied).toEqual([]);
  });

  it('leaves attributes it never set alone', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'dialog');
    ogeApplyAttributes(el, {}, ogeApplyAttributes(el, { lang: 'tr' }, []));
    expect(el.getAttribute('role')).toBe('dialog');
  });
});
