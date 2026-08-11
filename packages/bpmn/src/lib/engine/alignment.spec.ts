import { alignElements, distributeElements } from './alignment';
import type { Rect } from './geometry';

const RECTS: Readonly<Record<string, Rect>> = {
  a: { x: 100, y: 100, width: 100, height: 80 },
  b: { x: 300, y: 200, width: 50, height: 50 },
  c: { x: 500, y: 400, width: 36, height: 36 },
};

describe('alignElements', () => {
  it('aligns to the leftmost left edge', () => {
    const deltas = alignElements(RECTS, 'left');
    expect(deltas['a']).toEqual({ x: 0, y: 0 });
    expect(deltas['b']).toEqual({ x: -200, y: 0 });
    expect(deltas['c']).toEqual({ x: -400, y: 0 });
  });

  it('aligns to the rightmost right edge', () => {
    const deltas = alignElements(RECTS, 'right');
    // max right = 536.
    expect(deltas['a']).toEqual({ x: 336, y: 0 });
    expect(deltas['b']).toEqual({ x: 186, y: 0 });
    expect(deltas['c']).toEqual({ x: 0, y: 0 });
  });

  it('centers horizontally on the bounding-box center', () => {
    const deltas = alignElements(RECTS, 'centerX');
    // bbox = 100..536 → center 318.
    expect(deltas['a']).toEqual({ x: 168, y: 0 });
    expect(deltas['b']).toEqual({ x: -7, y: 0 });
    expect(deltas['c']).toEqual({ x: -200, y: 0 });
  });

  it('aligns top, bottom and vertical center', () => {
    expect(alignElements(RECTS, 'top')['c']).toEqual({ x: 0, y: -300 });
    // max bottom = 436.
    expect(alignElements(RECTS, 'bottom')['a']).toEqual({ x: 0, y: 256 });
    // bbox 100..436 → center 268; a center 140 → +128.
    expect(alignElements(RECTS, 'centerY')['a']).toEqual({ x: 0, y: 128 });
  });

  it('returns an empty result for fewer than 2 rectangles', () => {
    expect(alignElements({ a: RECTS['a'] }, 'left')).toEqual({});
    expect(alignElements({}, 'top')).toEqual({});
  });
});

describe('distributeElements', () => {
  it('spaces the middle centers evenly, keeping the outermost fixed', () => {
    const deltas = distributeElements(RECTS, 'x');
    // centers: a=150, b=325, c=518 → target middle = (150+518)/2 = 334.
    expect(deltas['a']).toEqual({ x: 0, y: 0 });
    expect(deltas['b']).toEqual({ x: 9, y: 0 });
    expect(deltas['c']).toEqual({ x: 0, y: 0 });
  });

  it('distributes on the y axis independently of x positions', () => {
    const deltas = distributeElements(RECTS, 'y');
    // centers: a=140, b=225, c=418 → target middle = 279.
    expect(deltas['a']).toEqual({ x: 0, y: 0 });
    expect(deltas['b']).toEqual({ x: 0, y: 54 });
    expect(deltas['c']).toEqual({ x: 0, y: 0 });
  });

  it('sorts by center before distributing', () => {
    const shuffled: Readonly<Record<string, Rect>> = {
      right: { x: 400, y: 0, width: 20, height: 20 },
      left: { x: 0, y: 0, width: 20, height: 20 },
      mid: { x: 100, y: 0, width: 20, height: 20 },
    };
    const deltas = distributeElements(shuffled, 'x');
    // centers 10, 110, 410 → mid target 210 → +100.
    expect(deltas['left']).toEqual({ x: 0, y: 0 });
    expect(deltas['mid']).toEqual({ x: 100, y: 0 });
    expect(deltas['right']).toEqual({ x: 0, y: 0 });
  });

  it('returns an empty result for fewer than 3 rectangles', () => {
    expect(distributeElements({ a: RECTS['a'], b: RECTS['b'] }, 'x')).toEqual(
      {},
    );
  });
});
