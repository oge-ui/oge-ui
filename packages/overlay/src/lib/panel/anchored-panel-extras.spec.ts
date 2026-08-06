import { OgeAnchoredPanel } from './anchored-panel';

function element(rect: Partial<DOMRect> = {}): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      width: 100,
      height: 30,
      right: 100,
      bottom: 30,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

function flushFrames(): void {
  vi.advanceTimersByTime(200);
}

describe('OgeAnchoredPanel — virtual anchor & transient mode', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('positions against anchorRect when provided instead of the anchor element', () => {
    const anchor = element({ top: 500, left: 500 });
    const panelEl = element();
    Object.defineProperty(panelEl, 'offsetWidth', { value: 150 });
    Object.defineProperty(panelEl, 'offsetHeight', { value: 80 });
    const panel = new OgeAnchoredPanel({
      anchor: () => anchor,
      panel: () => panelEl,
      placement: () => 'bottom-start',
      anchorRect: () => ({ top: 40, left: 60, width: 0, height: 0 }),
    });
    panel.open();
    flushFrames();
    const position = panel.position();
    expect(position).not.toBeNull();
    expect(position?.left).toBe(60);
    expect(position?.top).toBe(40 + 4);
    panel.destroy();
  });

  it('transient panels never join the Escape stack — Escape reaches the panel below', () => {
    const below = new OgeAnchoredPanel({
      anchor: () => element(),
      panel: () => element(),
    });
    const tooltip = new OgeAnchoredPanel({
      anchor: () => element(),
      panel: () => element(),
      transient: true,
      closeOnEscape: false,
    });
    below.open();
    tooltip.open();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(below.isOpen()).toBe(false);
    expect(tooltip.isOpen()).toBe(true);
    tooltip.destroy();
    below.destroy();
  });
});
