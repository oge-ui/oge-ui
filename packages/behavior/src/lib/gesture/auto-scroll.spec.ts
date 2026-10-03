import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAutoScroller, ogeEdgeScrollVelocity } from './auto-scroll';

describe('ogeEdgeScrollVelocity', () => {
  it('is zero in the neutral zone and ramps toward each edge', () => {
    expect(ogeEdgeScrollVelocity(200, 0, 400)).toBe(0);
    expect(ogeEdgeScrollVelocity(0, 0, 400)).toBe(-24);
    expect(ogeEdgeScrollVelocity(400, 0, 400)).toBe(24);
    const shallow = ogeEdgeScrollVelocity(40, 0, 400);
    const deep = ogeEdgeScrollVelocity(10, 0, 400);
    expect(shallow).toBeLessThan(0);
    expect(Math.abs(deep)).toBeGreaterThan(Math.abs(shallow));
  });

  it('clamps outside the container and never scrolls a tiny one', () => {
    expect(ogeEdgeScrollVelocity(-50, 0, 400)).toBe(-24);
    expect(ogeEdgeScrollVelocity(500, 0, 400, 48, 10)).toBe(10);
    expect(ogeEdgeScrollVelocity(5, 0, 90)).toBe(0);
  });
});

describe('createAutoScroller', () => {
  afterEach(() => vi.useRealTimers());

  function container(): HTMLElement {
    const el = document.createElement('div');
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300 }) as DOMRect;
    let left = 100;
    let top = 100;
    Object.defineProperty(el, 'scrollLeft', {
      get: () => left,
      set: (value: number) => (left = Math.max(0, Math.min(1000, value))),
    });
    Object.defineProperty(el, 'scrollTop', {
      get: () => top,
      set: (value: number) => (top = Math.max(0, Math.min(1000, value))),
    });
    return el;
  }

  it('scrolls toward the edge every frame while the pointer rests there', () => {
    const raf: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => raf.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => raf.splice(0));
    const el = container();
    const onScroll = vi.fn();
    const scroller = createAutoScroller(el, { onScroll });
    scroller.update(200, 299);
    expect(raf).toHaveLength(1);
    raf.shift()?.(0);
    expect(el.scrollTop).toBeGreaterThan(100);
    expect(el.scrollLeft).toBe(100);
    expect(onScroll).toHaveBeenCalledTimes(1);
    // the loop keeps going without further pointer events
    raf.shift()?.(0);
    expect(onScroll).toHaveBeenCalledTimes(2);
    scroller.stop();
    expect(raf).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('does not start in the neutral zone and stops when the pointer leaves the band', () => {
    const raf: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => raf.push(cb));
    const el = container();
    const scroller = createAutoScroller(el, { axis: 'x' });
    scroller.update(200, 150);
    expect(raf).toHaveLength(0);
    scroller.update(2, 299);
    raf.shift()?.(0);
    expect(el.scrollLeft).toBeLessThan(100);
    expect(el.scrollTop).toBe(100); // axis 'x' only
    scroller.update(200, 150);
    raf.shift()?.(0);
    expect(raf).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('skips onScroll when the container is already at its limit', () => {
    const raf: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => raf.push(cb));
    const el = container();
    el.scrollTop = 0;
    const onScroll = vi.fn();
    createAutoScroller(el, { axis: 'y', onScroll }).update(200, 0);
    raf.shift()?.(0);
    expect(onScroll).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
