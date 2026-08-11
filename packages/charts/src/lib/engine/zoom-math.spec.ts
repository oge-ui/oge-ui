import { createLinearScale } from './scale';
import { panRange, rangeFromSelection, zoomRangeAt } from './zoom-math';

const BOUNDS = { min: 0, max: 1000 };

describe('zoomRangeAt', () => {
  it('keeps the domain value under the cursor fixed', () => {
    const range = { min: 0, max: 1000 };
    // cursor at 25% (value 250), zoom in 2x
    const zoomed = zoomRangeAt(range, 0.25, 0.5, BOUNDS);
    expect(zoomed.max - zoomed.min).toBeCloseTo(500);
    // 250 must still sit at 25% of the new window
    expect(zoomed.min + (zoomed.max - zoomed.min) * 0.25).toBeCloseTo(250);
  });

  it('zooming out clamps into the bounds', () => {
    const zoomed = zoomRangeAt({ min: 400, max: 600 }, 0.5, 10, BOUNDS);
    expect(zoomed).toEqual(BOUNDS);
  });

  it('enforces the minimum span fraction', () => {
    const zoomed = zoomRangeAt({ min: 0, max: 1000 }, 0.5, 1e-9, BOUNDS, 0.01);
    expect(zoomed.max - zoomed.min).toBeCloseTo(10);
  });
});

describe('panRange', () => {
  it('slides by a span fraction and stops at the edges', () => {
    expect(panRange({ min: 100, max: 200 }, 0.5, BOUNDS)).toEqual({
      min: 150,
      max: 250,
    });
    expect(panRange({ min: 900, max: 1000 }, 1, BOUNDS)).toEqual({
      min: 900,
      max: 1000,
    });
  });
});

describe('rangeFromSelection', () => {
  it('maps a px drag to a domain window, order-insensitive', () => {
    const scale = createLinearScale({ min: 0, max: 1000, rangePx: 500 });
    expect(rangeFromSelection(100, 300, scale, BOUNDS)).toEqual({
      min: 200,
      max: 600,
    });
    expect(rangeFromSelection(300, 100, scale, BOUNDS)).toEqual({
      min: 200,
      max: 600,
    });
  });
});
