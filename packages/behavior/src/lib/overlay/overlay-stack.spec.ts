import {
  claimOverlayEscape,
  isOverlayEscapeClaimed,
  isTopOverlay,
  pushOverlay,
  removeOverlay,
} from './overlay-stack';

describe('overlay-stack', () => {
  const a = {};
  const b = {};

  afterEach(() => {
    removeOverlay(a);
    removeOverlay(b);
  });

  it('reports only the topmost surface as top', () => {
    pushOverlay(a);
    pushOverlay(b);
    expect(isTopOverlay(b)).toBe(true);
    expect(isTopOverlay(a)).toBe(false);
  });

  it('never reports an absent surface as top', () => {
    expect(isTopOverlay(a)).toBe(false);
    pushOverlay(a);
    removeOverlay(a);
    expect(isTopOverlay(a)).toBe(false);
  });

  it('deduplicates pushes and tolerates removing absent surfaces', () => {
    pushOverlay(a);
    pushOverlay(a);
    removeOverlay(b); // never pushed — must not throw
    removeOverlay(a);
    expect(isTopOverlay(a)).toBe(false);
  });

  it('re-pushing an existing surface keeps its original position', () => {
    pushOverlay(a);
    pushOverlay(b);
    pushOverlay(a);
    expect(isTopOverlay(b)).toBe(true);
  });
});

describe('claimOverlayEscape', () => {
  const lower = {};
  const upper = {};

  afterEach(() => {
    removeOverlay(lower);
    removeOverlay(upper);
  });

  it('lets only the topmost surface act, once per key press', () => {
    pushOverlay(lower);
    pushOverlay(upper);
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    expect(claimOverlayEscape(event, lower)).toBe(false);
    expect(claimOverlayEscape(event, upper)).toBe(true);
    expect(isOverlayEscapeClaimed(event)).toBe(true);
    // upper closes during the same event: lower is now on top but the
    // press is spent
    removeOverlay(upper);
    expect(claimOverlayEscape(event, lower)).toBe(false);
    const next = new KeyboardEvent('keydown', { key: 'Escape' });
    expect(claimOverlayEscape(next, lower)).toBe(true);
  });

  it('closes one layer per press whatever order the listeners were added in', () => {
    const closed: string[] = [];
    const listen = (name: string, surface: object) => {
      const handler = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || !claimOverlayEscape(event, surface)) {
          return;
        }
        closed.push(name);
        removeOverlay(surface);
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    };
    // the upper layer's listener is registered first (an app-wide handler)
    const offUpper = listen('upper', upper);
    const offLower = listen('lower', lower);
    pushOverlay(lower);
    pushOverlay(upper);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toEqual(['upper']);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toEqual(['upper', 'lower']);
    offUpper();
    offLower();
  });
});
