import { describe, expect, it, vi } from 'vitest';
import {
  OGE_SLIDER_MAX_TICKS,
  sliderKeyboardTarget,
  sliderPercent,
  sliderTicks,
  sliderValueFromPointer,
  startSliderDrag,
  type OgeSliderAxis,
  type OgeSliderScale,
} from './slider-core';

const scale: OgeSliderScale = { min: 0, max: 100, step: 1 };
const ltr: OgeSliderAxis = { vertical: false, rtl: false };
const rtl: OgeSliderAxis = { vertical: false, rtl: true };
const vertical: OgeSliderAxis = { vertical: true, rtl: false };

describe('sliderTicks', () => {
  it('places a stop every spacing and always marks the far end', () => {
    expect(sliderTicks(scale, 25)).toEqual([0, 25, 50, 75, 100]);
  });

  it('adds the max stop when the spacing does not divide the range', () => {
    expect(sliderTicks(scale, 30)).toEqual([0, 30, 60, 90, 100]);
  });

  it('returns nothing for a non-positive spacing or an empty range', () => {
    expect(sliderTicks(scale, 0)).toEqual([]);
    expect(sliderTicks(scale, -5)).toEqual([]);
    expect(sliderTicks({ min: 5, max: 5, step: 1 }, 1)).toEqual([]);
  });

  it('caps the stop count so a tiny spacing cannot flood the DOM', () => {
    const ticks = sliderTicks({ min: 0, max: 10_000, step: 1 }, 1);
    expect(ticks).toHaveLength(OGE_SLIDER_MAX_TICKS);
  });

  it('keeps fractional stops free of float drift', () => {
    // 0.1 accumulated eight times is 0.7999999999999999 unsnapped
    expect(sliderTicks({ min: 0, max: 1, step: 0.1 }, 0.1)).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
    ]);
  });

  it('spaces the stops by the spacing, independently of the value step', () => {
    // ticks are a scale annotation: they mark every `spacing`, they do not
    // have to coincide with the values the thumb can take
    expect(sliderTicks({ min: 0, max: 60, step: 10 }, 15)).toEqual([
      0, 15, 30, 45, 60,
    ]);
  });
});

describe('sliderKeyboardTarget', () => {
  it('maps Home and End to the ends of the scale', () => {
    expect(sliderKeyboardTarget(50, 'Home', scale, 10, ltr)).toBe(0);
    expect(sliderKeyboardTarget(50, 'End', scale, 10, ltr)).toBe(100);
  });

  it('steps the arrows by one step', () => {
    expect(sliderKeyboardTarget(50, 'ArrowRight', scale, 10, ltr)).toBe(51);
    expect(sliderKeyboardTarget(50, 'ArrowLeft', scale, 10, ltr)).toBe(49);
    expect(sliderKeyboardTarget(50, 'ArrowUp', scale, 10, ltr)).toBe(51);
    expect(sliderKeyboardTarget(50, 'ArrowDown', scale, 10, ltr)).toBe(49);
  });

  it('pages by the large step', () => {
    expect(sliderKeyboardTarget(50, 'PageUp', scale, 10, ltr)).toBe(60);
    expect(sliderKeyboardTarget(50, 'PageDown', scale, 10, ltr)).toBe(40);
  });

  it('flips only the horizontal arrows in RTL', () => {
    expect(sliderKeyboardTarget(50, 'ArrowRight', scale, 10, rtl)).toBe(49);
    expect(sliderKeyboardTarget(50, 'ArrowLeft', scale, 10, rtl)).toBe(51);
    // up/down keep meaning "more"/"less" in either direction
    expect(sliderKeyboardTarget(50, 'ArrowUp', scale, 10, rtl)).toBe(51);
  });

  it('ignores RTL on the vertical axis', () => {
    const verticalRtl: OgeSliderAxis = { vertical: true, rtl: true };
    expect(sliderKeyboardTarget(50, 'ArrowRight', scale, 10, verticalRtl)).toBe(
      51,
    );
  });

  it('clamps at the ends instead of running past them', () => {
    expect(sliderKeyboardTarget(100, 'ArrowRight', scale, 10, ltr)).toBe(100);
    expect(sliderKeyboardTarget(0, 'PageDown', scale, 10, ltr)).toBe(0);
  });

  it('snaps onto the step grid', () => {
    const coarse: OgeSliderScale = { min: 0, max: 100, step: 25 };
    expect(sliderKeyboardTarget(0, 'ArrowRight', coarse, 10, ltr)).toBe(25);
  });

  it('returns null for keys outside the pattern, so the host can ignore them', () => {
    expect(sliderKeyboardTarget(50, 'Enter', scale, 10, ltr)).toBe(null);
    expect(sliderKeyboardTarget(50, 'a', scale, 10, ltr)).toBe(null);
  });
});

describe('sliderValueFromPointer', () => {
  const rect = { left: 100, bottom: 300, width: 200, height: 200 };

  it('projects along the horizontal track', () => {
    expect(
      sliderValueFromPointer({ clientX: 200, clientY: 0 }, rect, scale, ltr),
    ).toBe(50);
  });

  it('mirrors the projection in RTL', () => {
    expect(
      sliderValueFromPointer({ clientX: 150, clientY: 0 }, rect, scale, rtl),
    ).toBe(75);
  });

  it('measures a vertical track upward from its bottom edge', () => {
    expect(
      sliderValueFromPointer(
        { clientX: 0, clientY: 200 },
        rect,
        scale,
        vertical,
      ),
    ).toBe(50);
  });

  it('clamps a pointer dragged past either end of the track', () => {
    expect(
      sliderValueFromPointer({ clientX: -500, clientY: 0 }, rect, scale, ltr),
    ).toBe(0);
    expect(
      sliderValueFromPointer({ clientX: 5000, clientY: 0 }, rect, scale, ltr),
    ).toBe(100);
  });

  it('survives a zero-size track (hidden panel) without NaN', () => {
    const collapsed = { left: 0, bottom: 0, width: 0, height: 0 };
    expect(
      sliderValueFromPointer(
        { clientX: 10, clientY: 0 },
        collapsed,
        scale,
        ltr,
      ),
    ).toBe(0);
  });

  it('snaps the projected value onto the step grid', () => {
    const coarse: OgeSliderScale = { min: 0, max: 100, step: 25 };
    expect(
      sliderValueFromPointer({ clientX: 220, clientY: 0 }, rect, coarse, ltr),
    ).toBe(50);
  });
});

describe('sliderPercent', () => {
  it('projects a value onto the track as a percentage', () => {
    expect(sliderPercent(50, scale)).toBe(50);
    expect(sliderPercent(0, scale)).toBe(0);
    expect(sliderPercent(100, scale)).toBe(100);
    expect(sliderPercent(5, { min: 0, max: 20, step: 1 })).toBe(25);
  });
});

describe('startSliderDrag', () => {
  /** jsdom has no PointerEvent; the gesture only reads clientX/pointerId. */
  const pointer = (type: string, clientX = 0): PointerEvent => {
    const event = new MouseEvent(type, {
      clientX,
      bubbles: true,
      cancelable: true,
    }) as unknown as PointerEvent;
    Object.defineProperty(event, 'pointerId', { value: 1 });
    return event;
  };

  function gesture() {
    const thumb = document.createElement('div');
    document.body.append(thumb);
    const applied: number[] = [];
    const finish = vi.fn();
    const down = pointer('pointerdown', 10);
    Object.defineProperty(down, 'target', { value: thumb });
    const detach = startSliderDrag(down, {
      valueAt: (event) => event.clientX,
      apply: (value) => applied.push(value),
      finish,
    });
    return { applied, finish, detach, thumb };
  }

  const move = (clientX: number) =>
    document.dispatchEvent(pointer('pointermove', clientX));

  it('applies once at the start position before any move', () => {
    const g = gesture();
    expect(g.applied).toEqual([10]);
    g.detach();
  });

  it('tracks pointer moves on the document, not just the thumb', () => {
    const g = gesture();
    move(40);
    move(70);
    expect(g.applied).toEqual([10, 40, 70]);
    g.detach();
  });

  it('finishes uncancelled on pointerup and stops listening', () => {
    const g = gesture();
    document.dispatchEvent(pointer('pointerup', 60));
    expect(g.finish).toHaveBeenCalledWith(expect.anything(), false);
    move(90);
    expect(g.applied).toEqual([10]); // detached
  });

  it('finishes cancelled on pointercancel', () => {
    const g = gesture();
    document.dispatchEvent(pointer('pointercancel'));
    expect(g.finish).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('cancels on Escape and swallows the key', () => {
    const g = gesture();
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
    expect(g.finish).toHaveBeenCalledWith(expect.anything(), true);
    expect(event.defaultPrevented).toBe(true);
    // an overlay above the slider must not also close on this Escape
    move(90);
    expect(g.applied).toEqual([10]);
  });

  it('cancels when the window loses focus mid-drag (alt-tab)', () => {
    const g = gesture();
    window.dispatchEvent(new Event('blur'));
    expect(g.finish).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('detaches on teardown without reporting a finish', () => {
    const g = gesture();
    g.detach();
    move(90);
    expect(g.applied).toEqual([10]);
    expect(g.finish).not.toHaveBeenCalled();
  });

  it('finishes exactly once even if more end events arrive', () => {
    const g = gesture();
    document.dispatchEvent(pointer('pointerup'));
    document.dispatchEvent(pointer('pointerup'));
    document.dispatchEvent(pointer('pointercancel'));
    expect(g.finish).toHaveBeenCalledTimes(1);
  });
});
