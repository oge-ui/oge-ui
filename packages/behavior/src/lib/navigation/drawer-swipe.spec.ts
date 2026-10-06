import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginOgeDrawerSwipe,
  ogeDrawerPhysicalEdge,
  ogeDrawerRailTooltipPlacement,
  ogeDrawerSwipeDistance,
  ogeDrawerSwipeOutcome,
  ogeDrawerSwipeStarts,
} from './drawer-swipe';

const rect = { left: 0, top: 0, right: 400, bottom: 300 };

function pointer(
  type: string,
  x: number,
  y: number,
  pointerType = 'touch',
): PointerEvent {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  }) as unknown as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('drawer swipe decisions', () => {
  it('maps logical positions onto the screen per direction', () => {
    expect(ogeDrawerPhysicalEdge('start', 'ltr')).toBe('left');
    expect(ogeDrawerPhysicalEdge('start', 'rtl')).toBe('right');
    expect(ogeDrawerPhysicalEdge('end', 'ltr')).toBe('right');
    expect(ogeDrawerPhysicalEdge('end', 'rtl')).toBe('left');
    expect(ogeDrawerPhysicalEdge('top', 'rtl')).toBe('top');
    expect(ogeDrawerPhysicalEdge('bottom', 'ltr')).toBe('bottom');
  });

  it('opens rail tooltips away from the edge', () => {
    expect(ogeDrawerRailTooltipPlacement('left')).toBe('right');
    expect(ogeDrawerRailTooltipPlacement('right')).toBe('left');
    expect(ogeDrawerRailTooltipPlacement('top')).toBe('bottom');
    expect(ogeDrawerRailTooltipPlacement('bottom')).toBe('top');
  });

  it('needs a start inside the edge strip while closed, anywhere while open', () => {
    const at = (x: number, y = 100) => ({ x, y });
    expect(
      ogeDrawerSwipeStarts({
        edge: 'left',
        opened: false,
        point: at(10),
        rect,
      }),
    ).toBe(true);
    expect(
      ogeDrawerSwipeStarts({
        edge: 'left',
        opened: false,
        point: at(80),
        rect,
      }),
    ).toBe(false);
    expect(
      ogeDrawerSwipeStarts({
        edge: 'right',
        opened: false,
        point: at(390),
        rect,
      }),
    ).toBe(true);
    expect(
      ogeDrawerSwipeStarts({
        edge: 'bottom',
        opened: false,
        point: at(5, 290),
        rect,
      }),
    ).toBe(true);
    expect(
      ogeDrawerSwipeStarts({
        edge: 'left',
        opened: true,
        point: at(200),
        rect,
      }),
    ).toBe(true);
  });

  it('clamps the distance to a third of the panel within 40–96px', () => {
    expect(ogeDrawerSwipeDistance(60)).toBe(40);
    expect(ogeDrawerSwipeDistance(240)).toBe(80);
    expect(ogeDrawerSwipeDistance(600)).toBe(96);
    expect(ogeDrawerSwipeDistance(Number.NaN)).toBe(80);
  });

  it('opens on distance or a flick, away from the edge only', () => {
    const base = {
      edge: 'left' as const,
      opened: false,
      dy: 0,
      panelSize: 240,
    };
    expect(ogeDrawerSwipeOutcome({ ...base, dx: 90, velocity: 0 })).toBe(
      'open',
    );
    expect(
      ogeDrawerSwipeOutcome({ ...base, dx: 30, velocity: 0.1 }),
    ).toBeNull();
    expect(ogeDrawerSwipeOutcome({ ...base, dx: 30, velocity: 0.8 })).toBe(
      'open',
    );
    expect(
      ogeDrawerSwipeOutcome({ ...base, dx: -90, velocity: -1 }),
    ).toBeNull();
    expect(
      ogeDrawerSwipeOutcome({ ...base, edge: 'right', dx: -90, velocity: 0 }),
    ).toBe('open');
  });

  it('closes toward the edge and ignores cross-axis movement', () => {
    const base = { edge: 'left' as const, opened: true, panelSize: 240 };
    expect(
      ogeDrawerSwipeOutcome({ ...base, dx: -90, dy: 0, velocity: 0 }),
    ).toBe('close');
    expect(
      ogeDrawerSwipeOutcome({ ...base, dx: 90, dy: 0, velocity: 1 }),
    ).toBeNull();
    expect(
      ogeDrawerSwipeOutcome({ ...base, dx: -90, dy: 120, velocity: 0 }),
    ).toBeNull();
    expect(
      ogeDrawerSwipeOutcome({
        ...base,
        edge: 'top',
        dx: 0,
        dy: -90,
        velocity: 0,
      }),
    ).toBe('close');
  });
});

describe('beginOgeDrawerSwipe', () => {
  function host(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
  }

  it('ignores mouse and pen', () => {
    const el = host();
    const down = pointer('pointerdown', 5, 100, 'mouse');
    Object.defineProperty(down, 'target', { value: el });
    expect(
      beginOgeDrawerSwipe(down, {
        edge: 'left',
        opened: false,
        rect,
        panelSize: 240,
        onOpen: vi.fn(),
        onClose: vi.fn(),
      }),
    ).toBeNull();
  });

  it('ignores a closed-state touch outside the edge strip', () => {
    const el = host();
    const down = pointer('pointerdown', 120, 100);
    Object.defineProperty(down, 'target', { value: el });
    expect(
      beginOgeDrawerSwipe(down, {
        edge: 'left',
        opened: false,
        rect,
        panelSize: 240,
        onOpen: vi.fn(),
        onClose: vi.fn(),
      }),
    ).toBeNull();
  });

  it('opens on an edge swipe and does not cancel the press', () => {
    const el = host();
    const onOpen = vi.fn();
    const down = pointer('pointerdown', 5, 100);
    Object.defineProperty(down, 'target', { value: el });
    let time = 0;
    beginOgeDrawerSwipe(down, {
      edge: 'left',
      opened: false,
      rect,
      panelSize: 240,
      onOpen,
      onClose: vi.fn(),
      now: () => (time += 16),
    });
    expect(down.defaultPrevented).toBe(false);
    el.dispatchEvent(pointer('pointermove', 40, 102));
    el.dispatchEvent(pointer('pointermove', 120, 104));
    el.dispatchEvent(pointer('pointerup', 120, 104));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('closes on a swipe toward the edge', () => {
    const el = host();
    const onClose = vi.fn();
    const down = pointer('pointerdown', 200, 100);
    Object.defineProperty(down, 'target', { value: el });
    beginOgeDrawerSwipe(down, {
      edge: 'left',
      opened: true,
      rect,
      panelSize: 240,
      onOpen: vi.fn(),
      onClose,
    });
    el.dispatchEvent(pointer('pointermove', 150, 100));
    el.dispatchEvent(pointer('pointermove', 90, 100));
    el.dispatchEvent(pointer('pointerup', 90, 100));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lets a vertical scroll go as soon as the axis is clear', () => {
    const el = host();
    const onOpen = vi.fn();
    const down = pointer('pointerdown', 5, 100);
    Object.defineProperty(down, 'target', { value: el });
    beginOgeDrawerSwipe(down, {
      edge: 'left',
      opened: false,
      rect,
      panelSize: 240,
      onOpen,
      onClose: vi.fn(),
    });
    el.dispatchEvent(pointer('pointermove', 7, 140));
    el.dispatchEvent(pointer('pointermove', 120, 150));
    el.dispatchEvent(pointer('pointerup', 120, 150));
    expect(onOpen).not.toHaveBeenCalled();
  });
});
