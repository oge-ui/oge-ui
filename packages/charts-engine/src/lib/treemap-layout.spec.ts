import {
  mirrorTreemapRect,
  sliceAndDice,
  squarify,
  worstAspectRatio,
} from './treemap-layout';

const area = (r: { w: number; h: number }): number => r.w * r.h;

describe('squarify', () => {
  // the worked example of Bruls, Huizing & van Wijk (6×4, values 6,6,4,3,2,2,1)
  const values = [6, 6, 4, 3, 2, 2, 1];
  const rect = { x: 0, y: 0, w: 6, h: 4 };

  it('areas are proportional to the values and fill the rect', () => {
    const tiles = squarify(values, rect);
    const total = values.reduce((sum, v) => sum + v, 0);
    tiles.forEach((tile, index) => {
      expect(area(tile)).toBeCloseTo((24 * values[index]) / total, 6);
    });
    const sum = tiles.reduce((s, t) => s + area(t), 0);
    expect(sum).toBeCloseTo(24, 6);
  });

  it('reproduces the paper: the first row is the two 6s stacked on the left', () => {
    const tiles = squarify(values, rect);
    expect(tiles[0]).toMatchObject({ x: 0, y: 0 });
    expect(tiles[0].w).toBeCloseTo(3);
    expect(tiles[0].h).toBeCloseTo(2);
    expect(tiles[1]).toMatchObject({ x: 0 });
    expect(tiles[1].y).toBeCloseTo(2);
  });

  it('tiles never overlap and stay inside the rect', () => {
    const tiles = squarify([5, 1, 9, 3, 3, 7, 2], {
      x: 10,
      y: 20,
      w: 300,
      h: 120,
    });
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(t.y).toBeGreaterThanOrEqual(20 - 1e-9);
      expect(t.x + t.w).toBeLessThanOrEqual(310 + 1e-6);
      expect(t.y + t.h).toBeLessThanOrEqual(140 + 1e-6);
    }
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const a = tiles[i];
        const b = tiles[j];
        const overlapW = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapH = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(overlapW <= 1e-6 || overlapH <= 1e-6).toBe(true);
      }
    }
  });

  it('beats slice-and-dice on aspect ratio', () => {
    const data = [8, 7, 6, 5, 4, 3, 2, 1];
    const box = { x: 0, y: 0, w: 400, h: 300 };
    const ratio = (t: { w: number; h: number }): number =>
      Math.max(t.w / t.h, t.h / t.w);
    const sq = Math.max(...squarify(data, box).map(ratio));
    const sd = Math.max(...sliceAndDice(data, box, false).map(ratio));
    expect(sq).toBeLessThan(sd);
  });

  it('zero values get empty rects; empty input is fine', () => {
    const tiles = squarify([0, 5], rect);
    expect(area(tiles[0])).toBe(0);
    expect(area(tiles[1])).toBeCloseTo(24);
    expect(squarify([], rect)).toEqual([]);
  });

  it('worstAspectRatio of a perfect square row is 1', () => {
    expect(worstAspectRatio([4], 2)).toBeCloseTo(1);
    expect(worstAspectRatio([], 2)).toBe(Infinity);
  });
});

describe('sliceAndDice / mirrorTreemapRect', () => {
  it('splits along one axis in input order', () => {
    const tiles = sliceAndDice([1, 3], { x: 0, y: 0, w: 100, h: 50 }, false);
    expect(tiles[0]).toEqual({ x: 0, y: 0, w: 25, h: 50 });
    expect(tiles[1]).toEqual({ x: 25, y: 0, w: 75, h: 50 });
    const vertical = sliceAndDice([1, 1], { x: 0, y: 0, w: 100, h: 50 }, true);
    expect(vertical[1]).toEqual({ x: 0, y: 25, w: 100, h: 25 });
  });

  it('mirrors inside the frame', () => {
    expect(
      mirrorTreemapRect(
        { x: 10, y: 0, w: 20, h: 5 },
        { x: 0, y: 0, w: 100, h: 5 },
      ),
    ).toEqual({
      x: 70,
      y: 0,
      w: 20,
      h: 5,
    });
  });
});
