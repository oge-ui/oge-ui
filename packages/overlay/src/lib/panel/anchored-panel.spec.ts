import {
  OgeAnchoredPanel,
  type OgeAnchoredPanelOptions,
  type OgePopupCloseReason,
} from './anchored-panel';

function rect(partial: Partial<DOMRect>): DOMRect {
  return {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...partial,
  } as DOMRect;
}

describe('OgeAnchoredPanel', () => {
  beforeEach(() => {
    // Deterministic, synchronous frames.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function setup(options?: Partial<OgeAnchoredPanelOptions>) {
    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    vi.spyOn(anchorEl, 'getBoundingClientRect').mockReturnValue(
      rect({ top: 100, left: 200, width: 120, height: 40 }),
    );
    const panelEl = document.createElement('div');
    document.body.appendChild(panelEl);
    Object.defineProperty(panelEl, 'offsetWidth', {
      value: 200,
      configurable: true,
    });
    Object.defineProperty(panelEl, 'offsetHeight', {
      value: 150,
      configurable: true,
    });
    const closed: OgePopupCloseReason[] = [];
    const panel = new OgeAnchoredPanel({
      anchor: () => anchorEl,
      panel: () => panelEl,
      onClosed: (reason) => closed.push(reason),
      ...options,
    });
    return { anchorEl, panelEl, panel, closed };
  }

  it('open() measures immediately (synchronous frame) and computes the position', () => {
    const { panel } = setup();
    expect(panel.position()).toBeNull();
    panel.open();
    expect(panel.isOpen()).toBe(true);
    expect(panel.position()).toEqual({
      top: 144,
      left: 200,
      placement: 'bottom-start',
    });
  });

  it('registers document/window listeners only while open and removes them on close', () => {
    const docAdd = vi.spyOn(document, 'addEventListener');
    const winAdd = vi.spyOn(window, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const { panel } = setup();
    expect(docAdd).not.toHaveBeenCalled();

    panel.open();
    const docEvents = docAdd.mock.calls.map((c) => c[0]);
    const winEvents = winAdd.mock.calls.map((c) => c[0]);
    expect(docEvents).toEqual(
      expect.arrayContaining(['pointerdown', 'keydown']),
    );
    expect(winEvents).toEqual(expect.arrayContaining(['scroll', 'resize']));

    panel.close();
    expect(docRemove.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['pointerdown', 'keydown']),
    );
    expect(winRemove.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['scroll', 'resize']),
    );
    expect(panel.isOpen()).toBe(false);
    expect(panel.position()).toBeNull();
  });

  it('closes with reason "outside" on pointerdown outside anchor and panel', () => {
    const { panel, closed } = setup();
    panel.open();
    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    expect(panel.isOpen()).toBe(false);
    expect(closed).toEqual(['outside']);
  });

  it('does not close on pointerdown inside the anchor or the panel', () => {
    const { panel, anchorEl, panelEl } = setup();
    panel.open();
    anchorEl.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(panel.isOpen()).toBe(true);
    panelEl.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(panel.isOpen()).toBe(true);
  });

  it('Escape closes with reason "escape" and restores focus when it was inside the panel', () => {
    const restore = vi.fn();
    const { panel, panelEl } = setup({ restoreFocus: restore });
    const inner = document.createElement('button');
    panelEl.appendChild(inner);
    panel.open();
    inner.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(panel.isOpen()).toBe(false);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('does not restore focus on outside closes', () => {
    const restore = vi.fn();
    const { panel } = setup({ restoreFocus: restore });
    panel.open();
    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    expect(restore).not.toHaveBeenCalled();
  });

  it('repositions (does not close) on scroll and resize', () => {
    const { panel, anchorEl } = setup();
    panel.open();
    expect(panel.position()?.top).toBe(144);

    (
      anchorEl.getBoundingClientRect as ReturnType<typeof vi.fn>
    ).mockReturnValue(rect({ top: 50, left: 200, width: 120, height: 40 }));
    window.dispatchEvent(new Event('scroll'));
    expect(panel.isOpen()).toBe(true);
    expect(panel.position()?.top).toBe(94);

    (
      anchorEl.getBoundingClientRect as ReturnType<typeof vi.fn>
    ).mockReturnValue(rect({ top: 60, left: 200, width: 120, height: 40 }));
    window.dispatchEvent(new Event('resize'));
    expect(panel.position()?.top).toBe(104);
  });

  it("width: 'anchor' sets the panel width before measuring and reports it", () => {
    const { panel, panelEl } = setup({ width: () => 'anchor' });
    panel.open();
    expect(panelEl.style.width).toBe('120px');
    expect(panel.position()?.width).toBe(120);
  });

  it('numeric width is applied and reported', () => {
    const { panel, panelEl } = setup({ width: () => 260 });
    panel.open();
    expect(panelEl.style.width).toBe('260px');
    expect(panel.position()?.width).toBe(260);
  });

  it('close(reason) forwards the reason to onClosed; toggle round-trips', () => {
    const { panel, closed } = setup();
    panel.toggle();
    expect(panel.isOpen()).toBe(true);
    panel.close('select');
    expect(closed).toEqual(['select']);
    panel.toggle();
    panel.toggle();
    expect(closed).toEqual(['select', 'api']);
  });

  it('destroy removes listeners without emitting onClosed', () => {
    const docRemove = vi.spyOn(document, 'removeEventListener');
    const { panel, closed } = setup();
    panel.open();
    panel.destroy();
    expect(panel.isOpen()).toBe(false);
    expect(closed).toEqual([]);
    expect(docRemove.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['pointerdown', 'keydown']),
    );
  });

  it('waits for a late-rendered panel element instead of positioning at (0,0)', () => {
    // Panel element not available on the first frames.
    let panelReady = false;
    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    vi.spyOn(anchorEl, 'getBoundingClientRect').mockReturnValue(
      rect({ top: 100, left: 200, width: 120, height: 40 }),
    );
    const panelEl = document.createElement('div');
    document.body.appendChild(panelEl);
    Object.defineProperty(panelEl, 'offsetWidth', { value: 200 });
    Object.defineProperty(panelEl, 'offsetHeight', { value: 150 });

    // Async frames so the retry loop can be observed step by step.
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });

    const panel = new OgeAnchoredPanel({
      anchor: () => anchorEl,
      panel: () => (panelReady ? panelEl : null),
    });
    panel.open();
    expect(panel.position()).toBeNull();
    frames.shift()?.(0); // first measure: panel missing → retry scheduled
    expect(panel.position()).toBeNull();
    panelReady = true;
    frames.shift()?.(0);
    expect(panel.position()).not.toBeNull();
  });
});
