import {
  angleForIndex,
  polarToCartesian,
  radarGridPath,
  radarLoopPath,
} from './polar-layout';

describe('polarToCartesian / angleForIndex', () => {
  it('0 rad points up and angles grow clockwise', () => {
    expect(polarToCartesian(100, 100, 50, 0)).toEqual({ x: 100, y: 50 });
    const right = polarToCartesian(100, 100, 50, Math.PI / 2);
    expect(right.x).toBeCloseTo(150);
    expect(right.y).toBeCloseTo(100);
  });

  it('slots arguments evenly around the circle', () => {
    expect(angleForIndex(0, 4)).toBe(0);
    expect(angleForIndex(1, 4)).toBeCloseTo(Math.PI / 2);
    expect(angleForIndex(2, 4, Math.PI)).toBeCloseTo(Math.PI * 2);
  });
});

describe('radarGridPath', () => {
  it('renders a circle by default and a polygon in spider mode', () => {
    const circle = radarGridPath(100, 100, 40, 5, false);
    expect(circle).toContain('A 40 40');
    const spider = radarGridPath(100, 100, 40, 5, true);
    expect(spider).not.toContain('A');
    expect((spider.match(/L /g) ?? []).length).toBe(4);
    expect(spider.endsWith('Z')).toBe(true);
  });

  it('spider mode needs at least 3 vertices', () => {
    expect(radarGridPath(0, 0, 10, 2, true)).toContain('A 10 10');
  });
});

describe('radarLoopPath', () => {
  const square = [
    { x: 0, y: -10 },
    { x: 10, y: 0 },
    { x: 0, y: 10 },
    { x: -10, y: 0 },
  ];

  it('closes the loop when gap-free', () => {
    const path = radarLoopPath(square, true);
    expect(path.startsWith('M 0 -10')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('gaps break the run and prevent closing', () => {
    const path = radarLoopPath([square[0], null, square[2], square[3]], true);
    expect((path.match(/M /g) ?? []).length).toBe(2);
    expect(path.includes('Z')).toBe(false);
  });

  it('open polylines never close', () => {
    expect(radarLoopPath(square, false).includes('Z')).toBe(false);
  });
});
