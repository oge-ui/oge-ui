import { isTopOverlay, pushOverlay, removeOverlay } from './overlay-stack';

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
