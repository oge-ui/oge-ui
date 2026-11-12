import {
  ogeTourCardPosition,
  ogeTourClampStep,
  ogeTourIsInView,
  ogeTourKeyIntent,
  ogeTourResolveTarget,
  ogeTourReveal,
  ogeTourSpotlight,
} from './tour-core';

const VIEWPORT = { width: 1000, height: 800 };

function box(rect: Partial<DOMRect>): HTMLElement {
  const el = document.createElement('div');
  el.id = 'target';
  el.getBoundingClientRect = () =>
    ({ top: 0, left: 0, width: 0, height: 0, ...rect }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

const key = (k: string, mods: Partial<KeyboardEvent> = {}) => ({
  key: k,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...mods,
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('tour core', () => {
  it('resolves selectors, elements and functions to rendered elements', () => {
    const el = box({ top: 10, left: 10, width: 50, height: 20 });
    expect(ogeTourResolveTarget('#target', document)).toBe(el);
    expect(ogeTourResolveTarget(el, document)).toBe(el);
    expect(ogeTourResolveTarget(() => el, document)).toBe(el);
    expect(ogeTourResolveTarget('#missing', document)).toBeNull();
    expect(ogeTourResolveTarget('##bad', document)).toBeNull();
    expect(ogeTourResolveTarget(undefined, document)).toBeNull();
    expect(ogeTourResolveTarget('#target', null)).toBeNull();
    expect(ogeTourResolveTarget(() => null, document)).toBeNull();
    const hidden = box({});
    hidden.id = 'hidden';
    expect(ogeTourResolveTarget('#hidden', document)).toBeNull();
    const detached = document.createElement('div');
    expect(ogeTourResolveTarget(detached, document)).toBeNull();
  });

  it('grows the spotlight by its padding and clips it to the viewport', () => {
    expect(
      ogeTourSpotlight(
        { top: 100, left: 100, width: 50, height: 20 },
        6,
        VIEWPORT,
      ),
    ).toEqual({ top: 94, left: 94, width: 62, height: 32 });
    expect(
      ogeTourSpotlight(
        { top: -10, left: 990, width: 50, height: 20 },
        4,
        VIEWPORT,
      ),
    ).toEqual({ top: 0, left: 986, width: 14, height: 14 });
    expect(
      ogeTourSpotlight(
        { top: 900, left: 0, width: 50, height: 20 },
        4,
        VIEWPORT,
      ),
    ).toBeNull();
    expect(ogeTourSpotlight(null, 4, VIEWPORT)).toBeNull();
  });

  it('places the card beside the spotlight, flipping to fit, or centers it', () => {
    const card = { width: 300, height: 160 };
    const below = ogeTourCardPosition(
      { top: 100, left: 100, width: 100, height: 40 },
      card,
      VIEWPORT,
    );
    expect(below.placement).toBe('bottom');
    expect(below.top).toBe(152);
    const flipped = ogeTourCardPosition(
      { top: 700, left: 100, width: 100, height: 40 },
      card,
      VIEWPORT,
      'bottom',
    );
    expect(flipped.placement).toBe('top');
    expect(flipped.top).toBe(700 - 12 - 160);
    expect(ogeTourCardPosition(null, card, VIEWPORT)).toEqual({
      top: 320,
      left: 350,
      placement: null,
    });
    expect(
      ogeTourCardPosition(null, { width: 2000, height: 2000 }, VIEWPORT),
    ).toEqual({ top: 8, left: 8, placement: null });
    const rtl = ogeTourCardPosition(
      { top: 100, left: 400, width: 100, height: 40 },
      card,
      VIEWPORT,
      'right',
      true,
    );
    expect(rtl.placement).toBe('right');
    expect(rtl.left).toBeLessThan(400);
  });

  it('maps the step keys, mirrored in RTL', () => {
    expect(ogeTourKeyIntent(key('ArrowRight'))).toBe('next');
    expect(ogeTourKeyIntent(key('ArrowLeft'))).toBe('previous');
    expect(ogeTourKeyIntent(key('ArrowRight'), true)).toBe('previous');
    expect(ogeTourKeyIntent(key('ArrowLeft'), true)).toBe('next');
    expect(ogeTourKeyIntent(key('ArrowRight', { altKey: true }))).toBeNull();
    expect(ogeTourKeyIntent(key('Enter'))).toBeNull();
  });

  it('clamps the step and tells whether a rect is in view', () => {
    expect(ogeTourClampStep(5, 3)).toBe(2);
    expect(ogeTourClampStep(-1, 3)).toBe(0);
    expect(ogeTourClampStep(1.7, 3)).toBe(1);
    expect(ogeTourClampStep(Number.NaN, 3)).toBe(0);
    expect(ogeTourClampStep(2, 0)).toBe(0);
    expect(
      ogeTourIsInView({ top: 0, left: 0, width: 10, height: 10 }, VIEWPORT),
    ).toBe(true);
    expect(
      ogeTourIsInView({ top: 795, left: 0, width: 10, height: 10 }, VIEWPORT),
    ).toBe(false);
  });

  it('scrolls a target into view, instantly under reduced motion', () => {
    const visible = box({ top: 10, left: 10, width: 10, height: 10 });
    visible.scrollIntoView = vi.fn();
    ogeTourReveal(visible);
    expect(visible.scrollIntoView).not.toHaveBeenCalled();
    const below = box({ top: 5000, left: 10, width: 10, height: 10 });
    below.scrollIntoView = vi.fn();
    let reduce = true;
    vi.stubGlobal('matchMedia', () => ({ matches: reduce }) as MediaQueryList);
    ogeTourReveal(below);
    expect(below.scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
      inline: 'nearest',
      behavior: 'auto',
    });
    reduce = false;
    ogeTourReveal(below);
    expect(below.scrollIntoView).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
    vi.unstubAllGlobals();
    ogeTourReveal(null);
  });
});
