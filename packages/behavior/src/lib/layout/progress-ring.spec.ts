import { describe, expect, it } from 'vitest';
import {
  OGE_PROGRESS_RING_DEFAULT_SIZE,
  OGE_PROGRESS_RING_DEFAULT_THICKNESS,
  ogeProgressAriaNow,
  ogeProgressLabel,
  ogeProgressRatio,
  ogeProgressRingGeometry,
} from './progress-ring';

describe('ogeProgressRatio', () => {
  it('maps the value linearly into [0, 1] and clamps', () => {
    expect(ogeProgressRatio(50, 0, 100)).toBe(0.5);
    expect(ogeProgressRatio(150, 100, 200)).toBe(0.5);
    expect(ogeProgressRatio(-5, 0, 100)).toBe(0);
    expect(ogeProgressRatio(250, 0, 200)).toBe(1);
  });

  it('is 0 while indeterminate and for a degenerate range', () => {
    expect(ogeProgressRatio(null, 0, 100)).toBe(0);
    expect(ogeProgressRatio(undefined, 0, 100)).toBe(0);
    expect(ogeProgressRatio(NaN, 0, 100)).toBe(0);
    expect(ogeProgressRatio(5, 10, 10)).toBe(0);
    expect(ogeProgressRatio(5, 10, 0)).toBe(0);
  });
});

describe('ogeProgressAriaNow', () => {
  it('omits the value while indeterminate — never a sentinel', () => {
    expect(ogeProgressAriaNow(null, 0, 100)).toBeNull();
    expect(ogeProgressAriaNow(undefined, 0, 100)).toBeNull();
  });

  it('clamps a determinate value into [min, max]', () => {
    expect(ogeProgressAriaNow(120, 0, 100)).toBe(100);
    expect(ogeProgressAriaNow(-3, 0, 100)).toBe(0);
    expect(ogeProgressAriaNow(42, 0, 100)).toBe(42);
  });
});

describe('ogeProgressLabel', () => {
  it('defaults to the rounded percentage', () => {
    expect(ogeProgressLabel(1, 1 / 3)).toBe('33%');
  });

  it('lets formatLabel replace it, with the house argument order', () => {
    expect(
      ogeProgressLabel(120, 0.6, (value, ratio) => `${value} (${ratio})`),
    ).toBe('120 (0.6)');
  });

  it('is empty while indeterminate', () => {
    expect(ogeProgressLabel(null, 0)).toBe('');
  });
});

describe('ogeProgressRingGeometry', () => {
  it('centres the stroke inside the box', () => {
    const g = ogeProgressRingGeometry({ ratio: 0, size: 40, thickness: 4 });
    expect(g.center).toBe(20);
    expect(g.radius).toBe(18);
    expect(g.viewBox).toBe('0 0 40 40');
    expect(g.circumference).toBeCloseTo(2 * Math.PI * 18);
  });

  it('maps the ratio onto the dash offset', () => {
    const empty = ogeProgressRingGeometry({ ratio: 0 });
    const half = ogeProgressRingGeometry({ ratio: 0.5 });
    const full = ogeProgressRingGeometry({ ratio: 1 });
    expect(empty.dashOffset).toBeCloseTo(empty.circumference);
    expect(half.dashOffset).toBeCloseTo(half.circumference / 2);
    expect(full.dashOffset).toBeCloseTo(0);
    expect(full.dashArray).toBe(`${full.circumference}`);
  });

  it('clamps the ratio and the thickness', () => {
    const over = ogeProgressRingGeometry({ ratio: 3, size: 20 });
    expect(over.dashOffset).toBeCloseTo(0);
    const thick = ogeProgressRingGeometry({
      ratio: 0,
      size: 20,
      thickness: 50,
    });
    expect(thick.thickness).toBe(10);
    expect(thick.radius).toBe(5);
  });

  it('falls back to the defaults for missing or non-positive sizes', () => {
    const g = ogeProgressRingGeometry({ ratio: 0, size: 0, thickness: -1 });
    expect(g.size).toBe(OGE_PROGRESS_RING_DEFAULT_SIZE);
    expect(g.thickness).toBe(OGE_PROGRESS_RING_DEFAULT_THICKNESS);
  });
});
