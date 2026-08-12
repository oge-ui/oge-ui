import { OgeAnchoredPanel } from './anchored-panel';

/**
 * The Escape-ordering regression for stacked panels. The stack arithmetic
 * itself is unit-tested in `@oge-ui/behavior`; what this covers is the part
 * that cannot move there — that the Angular panel actually *joins* that one
 * shared stack, so two panels do not each believe they are topmost.
 */
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
