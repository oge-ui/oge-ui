import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeDirection, ogeIsRtl, ogeResolveDirection } from './direction';

describe('writing direction', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir');
    document.body.innerHTML = '';
  });

  it('answers ltr without an element (SSR) and for an unmarked tree', () => {
    expect(ogeResolveDirection(null)).toBe('ltr');
    expect(ogeIsRtl(undefined)).toBe(false);
    const el = document.createElement('div');
    document.body.append(el);
    expect(ogeIsRtl(el)).toBe(false);
  });

  it('reads the nearest dir attribute', () => {
    const outer = document.createElement('section');
    outer.setAttribute('dir', 'RTL');
    const inner = document.createElement('span');
    outer.append(inner);
    document.body.append(outer);
    expect(ogeIsRtl(inner)).toBe(true);
    const ltr = document.createElement('div');
    ltr.setAttribute('dir', 'ltr');
    const deep = document.createElement('i');
    ltr.append(deep);
    outer.append(ltr);
    expect(ogeResolveDirection(deep)).toBe('ltr');
  });

  it('reads a CSS-only computed direction', () => {
    const el = document.createElement('div');
    el.style.direction = 'rtl';
    document.body.append(el);
    expect(ogeIsRtl(el)).toBe(true);
  });

  it('lets an explicit override win both ways', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    const el = document.createElement('div');
    document.body.append(el);
    expect(ogeIsRtl(el)).toBe(true);
    expect(ogeIsRtl(el, false)).toBe(false);
    expect(ogeResolveDirection(el, 'ltr')).toBe('ltr');
    expect(ogeIsRtl(null, true)).toBe(true);
    expect(ogeResolveDirection(null, 'rtl')).toBe('rtl');
    expect(ogeIsRtl(el, null)).toBe(true);
  });

  it('observes dir changes on <html> and on an ancestor, once per change', async () => {
    const host = document.createElement('div');
    const el = document.createElement('div');
    host.append(el);
    document.body.append(host);
    const seen = vi.fn();
    const stop = observeDirection(el, seen);

    document.documentElement.setAttribute('dir', 'rtl');
    await Promise.resolve();
    expect(seen).toHaveBeenLastCalledWith('rtl');

    host.setAttribute('dir', 'rtl');
    await Promise.resolve();
    expect(seen).toHaveBeenCalledTimes(1); // still rtl → no call

    host.setAttribute('dir', 'ltr');
    await Promise.resolve();
    expect(seen).toHaveBeenLastCalledWith('ltr');

    // an unrelated subtree does not wake the callback
    const other = document.createElement('p');
    document.body.append(other);
    other.setAttribute('dir', 'rtl');
    await Promise.resolve();
    expect(seen).toHaveBeenCalledTimes(2);

    stop();
    host.removeAttribute('dir');
    await Promise.resolve();
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it('is a no-op without an element', () => {
    expect(observeDirection(null, () => undefined)).toBeTypeOf('function');
  });
});
