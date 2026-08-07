import { isTopOverlay, pushOverlay, removeOverlay } from './overlay-stack';
import { OgeAnchoredPanel } from './panel/anchored-panel';

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

describe('overlay-stack — anchored panel regression', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('Escape closes only the topmost of two stacked panels', () => {
    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    const closed: string[] = [];
    const bottom = new OgeAnchoredPanel({
      anchor: () => anchorEl,
      panel: () => null,
      onClosed: () => closed.push('bottom'),
    });
    const top = new OgeAnchoredPanel({
      anchor: () => anchorEl,
      panel: () => null,
      onClosed: () => closed.push('top'),
    });
    bottom.open();
    top.open();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toEqual(['top']);
    expect(bottom.isOpen()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toEqual(['top', 'bottom']);

    bottom.destroy();
    top.destroy();
  });
});
