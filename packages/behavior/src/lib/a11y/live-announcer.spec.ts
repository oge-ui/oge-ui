import {
  OGE_LIVE_ANNOUNCER_ATTR,
  OgeLiveAnnouncerCore,
  getOgeLiveAnnouncer,
} from './live-announcer';
import { inertModalBackground } from '../overlay/modal-core';

const region = (mode: 'polite' | 'assertive'): HTMLElement | null =>
  document.querySelector(`[${OGE_LIVE_ANNOUNCER_ATTR}="${mode}"]`);

describe('OgeLiveAnnouncerCore', () => {
  let announcer: OgeLiveAnnouncerCore;

  beforeEach(() => {
    vi.useFakeTimers();
    announcer = new OgeLiveAnnouncerCore();
  });

  afterEach(() => {
    announcer.destroy();
    vi.useRealTimers();
  });

  it('creates no region before the first announcement', () => {
    expect(region('polite')).toBeNull();
    expect(region('assertive')).toBeNull();
  });

  it('writes after the delay into a visually hidden polite region', () => {
    announcer.announce('Sorted by Name, ascending');
    const el = region('polite');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('aria-live')).toBe('polite');
    expect(el?.getAttribute('aria-atomic')).toBe('true');
    expect(el?.hasAttribute('role')).toBe(false);
    expect(el?.style.clipPath).toBe('inset(50%)');
    expect(el?.textContent).toBe('');
    vi.advanceTimersByTime(100);
    expect(el?.textContent).toBe('Sorted by Name, ascending');
  });

  it('routes assertive messages to the alert region', () => {
    announcer.announce('Name: This field is required', 'assertive');
    vi.advanceTimersByTime(100);
    expect(region('assertive')?.getAttribute('aria-live')).toBe('assertive');
    expect(region('assertive')?.textContent).toBe(
      'Name: This field is required',
    );
    expect(region('polite')).toBeNull();
  });

  it('owns one region per politeness, however many messages arrive', () => {
    announcer.announce('a');
    announcer.announce('b', 'assertive');
    vi.advanceTimersByTime(100);
    announcer.announce('c');
    vi.advanceTimersByTime(100);
    expect(
      document.querySelectorAll(`[${OGE_LIVE_ANNOUNCER_ATTR}]`),
    ).toHaveLength(2);
  });

  it('debounces: a newer message inside the delay supersedes the pending one', () => {
    announcer.announce('12 rows', { delay: 500 });
    vi.advanceTimersByTime(300);
    announcer.announce('3 rows', { delay: 500 });
    vi.advanceTimersByTime(300);
    expect(region('polite')?.textContent).toBe('');
    vi.advanceTimersByTime(200);
    expect(region('polite')?.textContent).toBe('3 rows');
  });

  it('drops an identical message while it is pending or just written', () => {
    const write = vi.spyOn(Node.prototype, 'textContent', 'set');
    announcer.announce('Page 2 of 5');
    announcer.announce('Page 2 of 5');
    vi.advanceTimersByTime(100);
    announcer.announce('Page 2 of 5');
    vi.advanceTimersByTime(100);
    // one clear + one write
    expect(write.mock.calls.map(([value]) => value)).toEqual([
      '',
      'Page 2 of 5',
    ]);
    write.mockRestore();
  });

  it('clears after clearAfter so a repeat is announced again', () => {
    announcer.announce('Group Germany expanded', { clearAfter: 2000 });
    vi.advanceTimersByTime(100);
    expect(region('polite')?.textContent).toBe('Group Germany expanded');
    vi.advanceTimersByTime(2000);
    expect(region('polite')?.textContent).toBe('');
    vi.advanceTimersByTime(1000);
    announcer.announce('Group Germany expanded');
    vi.advanceTimersByTime(100);
    expect(region('polite')?.textContent).toBe('Group Germany expanded');
  });

  it('re-announces a repeat once the dedupe window passed, even before the clear', () => {
    announcer.announce('Saved');
    vi.advanceTimersByTime(1200);
    announcer.announce('Saved');
    expect(region('polite')?.textContent).toBe('');
    vi.advanceTimersByTime(100);
    expect(region('polite')?.textContent).toBe('Saved');
  });

  it('clear() empties the region and cancels a pending write', () => {
    announcer.announce('pending');
    announcer.clear();
    vi.advanceTimersByTime(500);
    expect(region('polite')?.textContent).toBe('');
  });

  it('ignores empty messages', () => {
    announcer.announce('   ');
    expect(region('polite')).toBeNull();
  });

  it('recreates its region when the host replaced the body content', () => {
    announcer.announce('first');
    vi.advanceTimersByTime(100);
    document.body.innerHTML = '';
    announcer.announce('second');
    vi.advanceTimersByTime(100);
    expect(region('polite')?.textContent).toBe('second');
  });

  it('is a no-op without a document (SSR)', () => {
    const ssr = new OgeLiveAnnouncerCore({ document: null });
    expect(() => {
      ssr.announce('hello');
      vi.advanceTimersByTime(500);
      ssr.clear();
      ssr.destroy();
    }).not.toThrow();
    expect(region('polite')).toBeNull();
  });

  it('touches no DOM on construction', () => {
    const create = vi.spyOn(document, 'createElement');
    const instance = new OgeLiveAnnouncerCore();
    expect(create).not.toHaveBeenCalled();
    instance.destroy();
    create.mockRestore();
  });

  it('a destroyed announcer ignores further calls', () => {
    announcer.announce('x');
    announcer.destroy();
    vi.advanceTimersByTime(200);
    expect(region('polite')).toBeNull();
    announcer.announce('y');
    expect(region('polite')).toBeNull();
  });
});

describe('inertModalBackground and the live regions', () => {
  it('never inerts the shared regions, so a modal can still be heard', () => {
    const announcer = new OgeLiveAnnouncerCore();
    announcer.announce('x');
    const layer = document.createElement('div');
    const sibling = document.createElement('main');
    document.body.append(sibling, layer);
    const release = inertModalBackground(layer);
    expect(sibling.hasAttribute('inert')).toBe(true);
    expect(region('polite')?.hasAttribute('inert')).toBe(false);
    release();
    announcer.destroy();
    layer.remove();
    sibling.remove();
  });
});

describe('getOgeLiveAnnouncer', () => {
  it('returns one shared instance per document', () => {
    expect(getOgeLiveAnnouncer()).toBe(getOgeLiveAnnouncer(document));
  });

  it('returns an inert instance for a null document', () => {
    const inert = getOgeLiveAnnouncer(null);
    expect(() => inert.announce('nothing')).not.toThrow();
  });

  it('replaces a destroyed shared instance', () => {
    const first = getOgeLiveAnnouncer();
    first.destroy();
    const second = getOgeLiveAnnouncer();
    expect(second).not.toBe(first);
    expect(second.isDestroyed).toBe(false);
  });
});
