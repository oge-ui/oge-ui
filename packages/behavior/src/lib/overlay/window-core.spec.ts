import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { pushOverlay, removeOverlay } from './overlay-stack';
import {
  OgeWindowCore,
  clampOgeWindowPosition,
  ogeWindowKeyCommand,
  ogeWindowStateStep,
  ogeWindowZIndex,
  resizeOgeWindowRect,
  resolveOgeWindowInitialFocus,
  resolveOgeWindowPlacement,
  type OgeWindowCoreOptions,
  type OgeWindowCoreProps,
} from './window-core';
import {
  bringOgeWindowToFront,
  isOgeFrontWindow,
  ogeOpenWindowCount,
  ogeWindowLayer,
  registerOgeWindow,
  subscribeOgeWindows,
  unregisterOgeWindow,
} from './window-stack';

const adapter: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: <T>(compute: () => T) => compute,
};

const VIEWPORT = { width: 1000, height: 800 };

describe('placement arithmetic', () => {
  const size = { width: 200, height: 100 };

  it('resolves every placement, mirroring start/end in RTL', () => {
    const at = (
      p: Parameters<typeof resolveOgeWindowPlacement>[0],
      rtl = false,
    ) => resolveOgeWindowPlacement(p, size, VIEWPORT, rtl);
    expect(at('center')).toEqual({ x: 400, y: 350 });
    expect(at('top')).toEqual({ x: 400, y: 16 });
    expect(at('bottom')).toEqual({ x: 400, y: 684 });
    expect(at('start')).toEqual({ x: 16, y: 350 });
    expect(at('end')).toEqual({ x: 784, y: 350 });
    expect(at('top-start')).toEqual({ x: 16, y: 16 });
    expect(at('bottom-end')).toEqual({ x: 784, y: 684 });
    expect(at('start', true)).toEqual({ x: 784, y: 350 });
    expect(at('bottom-end', true)).toEqual({ x: 16, y: 684 });
  });

  it('never places above or left of the viewport', () => {
    expect(
      resolveOgeWindowPlacement(
        'center',
        { width: 2000, height: 900 },
        VIEWPORT,
      ),
    ).toEqual({ x: 0, y: 0 });
  });

  it('contain keeps the whole box inside; otherwise the title bar stays reachable', () => {
    expect(
      clampOgeWindowPosition({ x: -50, y: 900 }, size, VIEWPORT, true),
    ).toEqual({
      x: 0,
      y: 700,
    });
    expect(
      clampOgeWindowPosition({ x: 2000, y: -5 }, size, VIEWPORT, true),
    ).toEqual({
      x: 800,
      y: 0,
    });
    // free mode: 48px of the title bar stay on screen, never above the top
    expect(
      clampOgeWindowPosition({ x: -500, y: -5 }, size, VIEWPORT, false, 40),
    ).toEqual({
      x: -152,
      y: 0,
    });
    expect(
      clampOgeWindowPosition({ x: 5000, y: 5000 }, size, VIEWPORT, false, 40),
    ).toEqual({
      x: 952,
      y: 760,
    });
  });

  it('resizes from every edge with the opposite edge fixed and limits applied', () => {
    const start = { x: 100, y: 100, width: 300, height: 200 };
    const r = (
      edge: Parameters<typeof resizeOgeWindowRect>[1],
      dx: number,
      dy: number,
      contain = true,
    ) => resizeOgeWindowRect(start, edge, dx, dy, {}, VIEWPORT, contain);
    expect(r('e', 50, 99)).toEqual({ x: 100, y: 100, width: 350, height: 200 });
    expect(r('w', 50, 0)).toEqual({ x: 150, y: 100, width: 250, height: 200 });
    expect(r('s', 0, 30)).toEqual({ x: 100, y: 100, width: 300, height: 230 });
    expect(r('n', 0, -30)).toEqual({ x: 100, y: 70, width: 300, height: 230 });
    expect(r('se', 10, 10)).toEqual({
      x: 100,
      y: 100,
      width: 310,
      height: 210,
    });
    expect(r('nw', -10, -10)).toEqual({
      x: 90,
      y: 90,
      width: 310,
      height: 210,
    });
    expect(r('ne', 10, -10)).toEqual({
      x: 100,
      y: 90,
      width: 310,
      height: 210,
    });
    expect(r('sw', -10, 10)).toEqual({
      x: 90,
      y: 100,
      width: 310,
      height: 210,
    });
    // the minimum wins; the left edge does not move further than the minimum allows
    expect(r('w', 500, 0)).toEqual({ x: 200, y: 100, width: 200, height: 200 });
    // contain: never past the viewport edge dragged towards
    expect(r('w', -500, 0)).toEqual({ x: 0, y: 100, width: 400, height: 200 });
    expect(r('e', 5000, 0).width).toBe(900);
    expect(r('e', 5000, 0, false).width).toBe(1000);
    expect(
      resizeOgeWindowRect(
        start,
        'se',
        500,
        500,
        { maxWidth: 320, maxHeight: 210, minWidth: 50 },
        VIEWPORT,
        true,
      ),
    ).toMatchObject({ width: 320, height: 210 });
  });

  it('maps the keyboard twin', () => {
    expect(ogeWindowKeyCommand({ key: 'ArrowLeft', target: null })).toEqual({
      type: 'move',
      dx: -10,
      dy: 0,
    });
    expect(
      ogeWindowKeyCommand({ key: 'ArrowDown', target: null, shiftKey: true }),
    ).toEqual({
      type: 'move',
      dx: 0,
      dy: 1,
    });
    expect(
      ogeWindowKeyCommand({ key: 'ArrowRight', target: null, ctrlKey: true }),
    ).toEqual({
      type: 'resize',
      dw: 10,
      dh: 0,
    });
    expect(
      ogeWindowKeyCommand({ key: 'ArrowUp', target: null, metaKey: true }),
    ).toEqual({
      type: 'resize',
      dw: 0,
      dh: -10,
    });
    expect(
      ogeWindowKeyCommand({ key: 'ArrowUp', target: null, altKey: true }),
    ).toEqual({
      type: 'state',
      direction: 'up',
    });
    expect(
      ogeWindowKeyCommand({ key: 'ArrowLeft', target: null, altKey: true }),
    ).toBeNull();
    expect(ogeWindowKeyCommand({ key: 'Enter', target: null })).toBeNull();
    expect(ogeWindowStateStep('normal', 'up')).toBe('maximized');
    expect(ogeWindowStateStep('minimized', 'up')).toBe('normal');
    expect(ogeWindowStateStep('normal', 'down')).toBe('minimized');
    expect(ogeWindowStateStep('maximized', 'down')).toBe('normal');
  });

  it('z-index sits on the token unless a base is given', () => {
    expect(ogeWindowZIndex(undefined, 2)).toBe('calc(var(--oge-z-window) + 2)');
    expect(ogeWindowZIndex(500, 2)).toBe('502');
    expect(ogeWindowZIndex(500, -1)).toBe('500');
  });
});

describe('resolveOgeWindowInitialFocus', () => {
  it('starts in the body, never on the title-bar buttons, and falls back to the frame', () => {
    const panel = document.createElement('div');
    panel.innerHTML =
      '<div class="oge-window-header"><button>min</button></div><div class="oge-window-body"><input id="f" /></div>';
    document.body.append(panel);
    expect(resolveOgeWindowInitialFocus(panel, 'first-tabbable')?.id).toBe('f');
    expect(resolveOgeWindowInitialFocus(panel, 'panel')).toBe(panel);
    expect(resolveOgeWindowInitialFocus(panel, false)).toBeNull();
    panel.querySelector('input')!.remove();
    expect(resolveOgeWindowInitialFocus(panel, 'first-tabbable')).toBe(panel);
    panel.remove();
  });
});

describe('window stack', () => {
  it('orders, raises and notifies', () => {
    const a = {};
    const b = {};
    const listener = vi.fn();
    const off = subscribeOgeWindows(listener);
    registerOgeWindow(a);
    registerOgeWindow(b);
    expect(ogeWindowLayer(a)).toBe(0);
    expect(isOgeFrontWindow(b)).toBe(true);
    expect(bringOgeWindowToFront(a)).toBe(true);
    expect(bringOgeWindowToFront(a)).toBe(false);
    expect(isOgeFrontWindow(a)).toBe(true);
    expect(ogeWindowLayer(b)).toBe(0);
    unregisterOgeWindow(a);
    unregisterOgeWindow(a);
    expect(isOgeFrontWindow(b)).toBe(true);
    unregisterOgeWindow(b);
    expect(ogeOpenWindowCount()).toBe(0);
    expect(listener).toHaveBeenCalledTimes(5);
    off();
  });
});

/** A dispatched `pointer*` MouseEvent with the pointer fields jsdom lacks. */
function pointer(
  type: string,
  x: number,
  y: number,
  target: EventTarget = document,
): MouseEvent {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  target.dispatchEvent(event);
  return event;
}

describe('OgeWindowCore', () => {
  let cores: OgeWindowCore[] = [];
  afterEach(() => {
    for (const core of cores) core.detach();
    cores = [];
    document.body.innerHTML = '';
  });

  function make(
    props: Partial<OgeWindowCoreProps> = {},
    extra: Partial<OgeWindowCoreOptions> = {},
  ) {
    const panel = document.createElement('div');
    panel.tabIndex = 0;
    const header = document.createElement('div');
    header.className = 'oge-window-header';
    const close = document.createElement('button');
    header.append(close);
    panel.append(header);
    document.body.append(panel);
    Object.defineProperty(panel, 'offsetWidth', {
      value: 200,
      configurable: true,
    });
    Object.defineProperty(panel, 'offsetHeight', {
      value: 100,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 800,
      configurable: true,
    });
    const state = {
      props: {
        draggable: true,
        resizable: true,
        keepInViewport: true,
        placement: 'center',
        closeOnEscape: true,
        ...props,
      } as OgeWindowCoreProps,
    };
    const events = {
      moved: vi.fn(),
      resized: vi.fn(),
      changing: vi.fn(),
      changed: vi.fn(),
      activated: vi.fn(),
      escape: vi.fn(),
      announce: vi.fn(),
    };
    const core = new OgeWindowCore({
      adapter,
      props: () => state.props,
      panel: () => panel,
      onMoved: events.moved,
      onResized: events.resized,
      onStateChanging: events.changing,
      onStateChanged: events.changed,
      onActivated: events.activated,
      onEscape: events.escape,
      announce: events.announce,
      ...extra,
    });
    cores.push(core);
    return { core, panel, header, close, events, state };
  }

  it('touches nothing until attached; attach puts it on top and activates it', () => {
    const { core, events } = make();
    expect(core.layer()).toBe(-1);
    core.attach();
    expect(core.layer()).toBe(0);
    expect(core.active()).toBe(true);
    expect(events.activated).toHaveBeenCalledTimes(1);
    const second = make();
    second.core.attach();
    expect(core.active()).toBe(false);
    expect(second.core.layer()).toBe(1);
    core.bringToFront();
    expect(core.layer()).toBe(1);
    expect(core.active()).toBe(true);
    expect(events.activated).toHaveBeenCalledTimes(2);
    core.detach();
    expect(core.layer()).toBe(-1);
    expect(second.core.active()).toBe(true);
  });

  it('places by placement, position, then the last box', () => {
    const { core, state } = make({ placement: 'top-start' });
    core.attach();
    core.place();
    expect(core.rect()).toEqual({ x: 16, y: 16, width: null, height: null });
    core.moveTo(300, 200);
    core.place(); // reopen keeps the last box
    expect(core.rect()).toMatchObject({ x: 300, y: 200 });
    state.props = { ...state.props, position: { x: 50, y: 60 } };
    core.syncPosition();
    expect(core.rect()).toMatchObject({ x: 50, y: 60 });
    core.center();
    expect(core.rect()).toMatchObject({ x: 400, y: 350 });
    // a new placement (without a position) re-places the window
    state.props = { ...state.props, position: null, placement: 'top-end' };
    core.syncPosition();
    expect(core.rect()).toMatchObject({ x: 784, y: 16 });
  });

  it('drags by the title bar, clamps, emits moved, and Escape reverts', () => {
    const { core, header, close, events, panel } = make();
    core.attach();
    core.place();
    const down = pointer('pointerdown', 500, 400, header);
    core.startDrag(down as unknown as PointerEvent);
    expect(document.activeElement).toBe(panel);
    pointer('pointermove', 550, 420);
    expect(core.interaction()).toBe('move');
    expect(core.rect()).toMatchObject({ x: 450, y: 370 });
    pointer('pointermove', -900, 420); // clamped at the left edge
    expect(core.rect()).toMatchObject({ x: 0 });
    pointer('pointerup', -900, 420);
    expect(events.moved).toHaveBeenCalledWith({
      x: 0,
      y: 370,
      source: 'pointer',
    });
    expect(core.interaction()).toBeNull();

    core.startDrag(
      pointer('pointerdown', 100, 400, header) as unknown as PointerEvent,
    );
    pointer('pointermove', 300, 400);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(core.rect()).toMatchObject({ x: 0, y: 370 });

    // never from a title-bar button
    core.startDrag(
      pointer('pointerdown', 10, 10, close) as unknown as PointerEvent,
    );
    pointer('pointermove', 300, 300);
    expect(core.rect()).toMatchObject({ x: 0, y: 370 });
  });

  it('does not drag when maximized or not draggable', () => {
    const { core, header, state } = make();
    core.attach();
    core.place();
    core.maximize();
    core.startDrag(
      pointer('pointerdown', 500, 400, header) as unknown as PointerEvent,
    );
    pointer('pointermove', 600, 500);
    pointer('pointerup', 600, 500);
    expect(core.rect()).toMatchObject({ x: 400, y: 350 });
    core.restore();
    state.props = { ...state.props, draggable: false };
    core.startDrag(
      pointer('pointerdown', 500, 400, header) as unknown as PointerEvent,
    );
    pointer('pointermove', 600, 500);
    expect(core.rect()).toMatchObject({ x: 400, y: 350 });
  });

  it('resizes from a handle and emits resized with the edge', () => {
    const { core, panel, events } = make();
    core.attach();
    core.place();
    const handle = document.createElement('div');
    panel.append(handle);
    core.startResize(
      pointer('pointerdown', 400, 350, handle) as unknown as PointerEvent,
      'nw',
    );
    pointer('pointermove', 380, 330);
    expect(core.rect()).toEqual({ x: 380, y: 330, width: 220, height: 120 });
    pointer('pointerup', 380, 330);
    expect(events.resized).toHaveBeenCalledWith({
      width: 220,
      height: 120,
      edge: 'nw',
      source: 'pointer',
    });
    core.minimize();
    core.startResize(
      pointer('pointerdown', 400, 350, handle) as unknown as PointerEvent,
      'se',
    );
    pointer('pointermove', 500, 450);
    expect(core.rect()).toMatchObject({ width: 220 });
  });

  it('keyboard twin acts on the focused panel only and announces', () => {
    const { core, panel, header, events } = make({
      messages: { windowMoved: 'at {x},{y}' },
      minHeight: 50,
    });
    core.attach();
    core.place();
    expect(core.keydown({ key: 'ArrowRight', target: header })).toBe(false);
    expect(core.keydown({ key: 'ArrowRight', target: panel })).toBe(true);
    expect(core.rect()).toMatchObject({ x: 410, y: 350 });
    expect(events.moved).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 410, y: 350, source: 'keyboard' }),
    );
    expect(events.announce).toHaveBeenLastCalledWith('at 410,350');
    core.keydown({
      key: 'ArrowDown',
      target: panel,
      ctrlKey: true,
      shiftKey: true,
    });
    expect(core.rect()).toMatchObject({ width: 200, height: 101 });
    expect(events.announce).toHaveBeenLastCalledWith(
      'Window resized to 200 by 101',
    );
    core.keydown({ key: 'ArrowUp', target: panel, altKey: true });
    expect(core.state()).toBe('maximized');
    // no move while maximized
    expect(core.keydown({ key: 'ArrowLeft', target: panel })).toBe(false);
    core.keydown({ key: 'ArrowDown', target: panel, altKey: true });
    expect(core.state()).toBe('normal');
  });

  it('Escape closes only when no overlay is open and closeOnEscape is on', () => {
    const { core, header, events, state } = make();
    core.attach();
    const popup = {};
    pushOverlay(popup);
    expect(core.keydown({ key: 'Escape', target: header })).toBe(false);
    removeOverlay(popup);
    expect(core.keydown({ key: 'Escape', target: header })).toBe(true);
    expect(events.escape).toHaveBeenCalledTimes(1);
    state.props = { ...state.props, closeOnEscape: false };
    expect(core.keydown({ key: 'Escape', target: header })).toBe(false);
  });

  it('state changes are cancelable and fire past-tense events', () => {
    const { core, events } = make();
    core.attach();
    events.changing.mockImplementationOnce((e: { cancel: boolean }) => {
      e.cancel = true;
    });
    expect(core.minimize()).toBe(false);
    expect(core.state()).toBe('normal');
    expect(core.minimize()).toBe(true);
    expect(events.changed).toHaveBeenLastCalledWith({
      state: 'minimized',
      previousState: 'normal',
    });
    expect(core.toggleMaximize()).toBe(true);
    expect(core.state()).toBe('maximized');
    expect(core.toggleMaximize()).toBe(true);
    expect(core.state()).toBe('normal');
    expect(core.restore()).toBe(false);
  });

  it('re-clamps when the viewport shrinks', () => {
    const { core } = make();
    core.attach();
    core.place();
    core.moveTo(780, 680);
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 600,
      configurable: true,
    });
    window.dispatchEvent(new Event('resize'));
    expect(core.rect()).toMatchObject({ x: 400 });
  });
});
