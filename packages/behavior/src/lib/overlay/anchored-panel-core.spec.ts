import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OgeAnchoredPanelCore } from './anchored-panel-core';
import { isTopOverlay } from './overlay-stack';

/** Waits out the machine's rAF-coalesced measure pass. */
const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

interface Harness {
  core: OgeAnchoredPanelCore;
  anchor: HTMLElement;
  panel: HTMLElement;
  closed: string[];
  opens: boolean[];
  restoreFocus: ReturnType<typeof vi.fn>;
}

function harness(
  options: Partial<ConstructorParameters<typeof OgeAnchoredPanelCore>[0]> = {},
  { renderPanel = true } = {},
): Harness {
  const anchor = document.createElement('button');
  const panel = document.createElement('div');
  anchor.getBoundingClientRect = () =>
    ({ top: 100, left: 50, width: 200, height: 30 }) as DOMRect;
  Object.defineProperty(panel, 'offsetWidth', { value: 150 });
  Object.defineProperty(panel, 'offsetHeight', { value: 80 });
  document.body.append(anchor, panel);

  const closed: string[] = [];
  const opens: boolean[] = [];
  const restoreFocus = vi.fn();
  const core = new OgeAnchoredPanelCore({
    anchor: () => anchor,
    panel: () => (renderPanel ? panel : null),
    restoreFocus,
    onClosed: (reason) => closed.push(reason),
    onOpenChange: (open) => opens.push(open),
    ...options,
  });
  return { core, anchor, panel, closed, opens, restoreFocus };
}

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    value: 1024,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: 768,
    configurable: true,
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('open / close state', () => {
  it('starts closed with no position', () => {
    const h = harness();
    expect(h.core.isOpen()).toBe(false);
    expect(h.core.position()).toBe(null);
    h.core.destroy();
  });

  it('gives every panel a unique id for aria-controls', () => {
    const a = harness();
    const b = harness();
    expect(a.core.panelId).not.toBe(b.core.panelId);
    expect(a.core.panelId).toMatch(/^oge-popup-\d+$/);
    a.core.destroy();
    b.core.destroy();
  });

  it('pushes the open state out once per transition, not per call', () => {
    const h = harness();
    h.core.open();
    h.core.open();
    h.core.close();
    h.core.close();
    expect(h.opens).toEqual([true, false]);
    h.core.destroy();
  });

  it('toggles', () => {
    const h = harness();
    h.core.toggle();
    expect(h.core.isOpen()).toBe(true);
    h.core.toggle();
    expect(h.core.isOpen()).toBe(false);
    h.core.destroy();
  });

  it('reports the close reason, defaulting to api', () => {
    const h = harness();
    h.core.open();
    h.core.close();
    h.core.open();
    h.core.close('select');
    expect(h.closed).toEqual(['api', 'select']);
    h.core.destroy();
  });

  it('reports nothing for a close while already closed', () => {
    const h = harness();
    h.core.close();
    expect(h.closed).toEqual([]);
    h.core.destroy();
  });
});

describe('positioning', () => {
  it('measures a frame after open and drops the position on close', async () => {
    const h = harness();
    h.core.open();
    expect(h.core.position()).toBe(null); // hide the panel until measured
    await frame();
    expect(h.core.position()).not.toBe(null);
    h.core.close();
    expect(h.core.position()).toBe(null);
    h.core.destroy();
  });

  it('places a bottom-start panel under the anchor by the offset', async () => {
    const h = harness({ placement: () => 'bottom-start', offset: () => 4 });
    h.core.open();
    await frame();
    expect(h.core.position()).toMatchObject({ top: 134, left: 50 });
    h.core.destroy();
  });

  it('matches the anchor width when asked, and reports it', async () => {
    const h = harness({ width: () => 'anchor' });
    h.core.open();
    await frame();
    expect(h.panel.style.width).toBe('200px');
    expect(h.core.position()?.width).toBe(200);
    h.core.destroy();
  });

  it('applies a fixed pixel width and clears it when the width goes away', async () => {
    let width: number | 'anchor' | undefined = 320;
    const h = harness({ width: () => width });
    h.core.open();
    await frame();
    expect(h.panel.style.width).toBe('320px');
    width = undefined;
    h.core.updatePosition();
    await frame();
    expect(h.panel.style.width).toBe('');
    h.core.destroy();
  });

  it('positions against a virtual rect — the context-menu case', async () => {
    const h = harness({
      anchorRect: () => ({ top: 300, left: 400, width: 0, height: 0 }),
      placement: () => 'bottom-start',
      offset: () => 0,
    });
    h.core.open();
    await frame();
    expect(h.core.position()).toMatchObject({ top: 300, left: 400 });
    h.core.destroy();
  });

  it('coalesces repeated update requests into one frame', async () => {
    const h = harness();
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    h.core.open();
    h.core.updatePosition();
    h.core.updatePosition();
    expect(raf).toHaveBeenCalledTimes(1);
    await frame();
    h.core.destroy();
  });

  it('repositions on scroll and resize while open, and stops after close', async () => {
    const h = harness();
    h.core.open();
    await frame();
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    window.dispatchEvent(new Event('resize'));
    expect(raf).toHaveBeenCalledTimes(1);
    await frame();
    h.core.close();
    window.dispatchEvent(new Event('resize'));
    expect(raf).toHaveBeenCalledTimes(2); // the awaited frame above, nothing new
    h.core.destroy();
  });

  it('retries while the owner has not rendered the panel yet', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const h = harness({}, { renderPanel: false });
    h.core.open();
    await frame();
    await frame();
    expect(h.core.position()).toBe(null);
    expect(warn).not.toHaveBeenCalled(); // still retrying, not yet an error
    h.core.destroy();
  });
});

describe('outside pointerdown', () => {
  it('closes on a pointerdown outside anchor and panel', () => {
    const h = harness();
    h.core.open();
    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    expect(h.core.isOpen()).toBe(false);
    expect(h.closed).toEqual(['outside']);
    h.core.destroy();
  });

  it('stays open for a pointerdown on the anchor or inside the panel', () => {
    const h = harness();
    h.core.open();
    h.anchor.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(h.core.isOpen()).toBe(true);
    const child = document.createElement('span');
    h.panel.append(child);
    child.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(h.core.isOpen()).toBe(true);
    h.core.destroy();
  });

  it('can be opted out of', () => {
    const h = harness({ closeOnOutsidePointerDown: false });
    h.core.open();
    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    expect(h.core.isOpen()).toBe(true);
    h.core.destroy();
  });
});

describe('Escape', () => {
  const escape = () =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

  it('closes on Escape', () => {
    const h = harness();
    h.core.open();
    escape();
    expect(h.closed).toEqual(['escape']);
    h.core.destroy();
  });

  it('closes only the topmost of a stack', () => {
    const outer = harness();
    const inner = harness();
    outer.core.open();
    inner.core.open();
    escape();
    expect(inner.core.isOpen()).toBe(false);
    expect(outer.core.isOpen()).toBe(true);
    escape();
    expect(outer.core.isOpen()).toBe(false);
    outer.core.destroy();
    inner.core.destroy();
  });

  it('leaves a transient surface out of the stack, so it never swallows Escape', () => {
    const popup = harness();
    const tooltip = harness({ transient: true });
    popup.core.open();
    tooltip.core.open();
    expect(isTopOverlay(popup.core)).toBe(true);
    escape();
    expect(popup.core.isOpen()).toBe(false);
    popup.core.destroy();
    tooltip.core.destroy();
  });

  it('can be opted out of', () => {
    const h = harness({ closeOnEscape: false });
    h.core.open();
    escape();
    expect(h.core.isOpen()).toBe(true);
    h.core.destroy();
  });

  it('uses the host’s stack token, so consumers can stack-test their wrapper', () => {
    const wrapper = {};
    const h = harness({ stackToken: wrapper });
    h.core.open();
    expect(isTopOverlay(wrapper)).toBe(true);
    h.core.destroy();
    expect(isTopOverlay(wrapper)).toBe(false);
  });
});

describe('focus restore', () => {
  it('restores focus after Escape and after a selection', () => {
    const h = harness();
    h.core.open();
    h.core.close('escape');
    h.core.open();
    h.core.close('select');
    expect(h.restoreFocus).toHaveBeenCalledTimes(2);
    h.core.destroy();
  });

  it('never steals the focus an outside click just moved elsewhere', () => {
    const h = harness();
    const other = document.createElement('input');
    document.body.append(other);
    h.core.open();
    other.focus();
    h.core.close('outside');
    expect(h.restoreFocus).not.toHaveBeenCalled();
    h.core.destroy();
  });

  it('leaves focus alone on Escape when it already moved out of the panel', () => {
    const h = harness();
    const other = document.createElement('input');
    document.body.append(other);
    h.core.open();
    other.focus();
    h.core.close('escape');
    expect(h.restoreFocus).not.toHaveBeenCalled();
    h.core.destroy();
  });

  it('restores focus when it sits inside the panel about to unmount', () => {
    const h = harness();
    const inner = document.createElement('input');
    h.panel.append(inner);
    h.core.open();
    inner.focus();
    h.core.close('escape');
    expect(h.restoreFocus).toHaveBeenCalledTimes(1);
    h.core.destroy();
  });

  it('does not restore for a submenu closing back toward its parent', () => {
    const h = harness();
    h.core.open();
    h.core.close('back');
    expect(h.restoreFocus).not.toHaveBeenCalled();
    expect(h.closed).toEqual(['back']);
    h.core.destroy();
  });
});

describe('destroy', () => {
  it('detaches every listener and leaves the stack', () => {
    const h = harness();
    h.core.open();
    h.core.destroy();
    expect(h.core.isOpen()).toBe(false);
    expect(isTopOverlay(h.core)).toBe(false);
    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(h.closed).toEqual([]); // destroy is not a close event
  });

  it('is safe to call twice', () => {
    const h = harness();
    h.core.open();
    h.core.destroy();
    expect(() => h.core.destroy()).not.toThrow();
  });
});
