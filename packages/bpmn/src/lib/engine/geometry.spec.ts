import {
  boundsOfRects,
  distanceToSegment,
  edgeHitTest,
  inflateRect,
  rectCenter,
  rectContainsPoint,
  rectsIntersect,
  translateRect,
} from './geometry';

describe('geometry', () => {
  const rect = { x: 10, y: 20, width: 100, height: 80 };

  describe('rectCenter', () => {
    it('returns the midpoint of the rectangle', () => {
      expect(rectCenter(rect)).toEqual({ x: 60, y: 60 });
    });
  });

  describe('translateRect', () => {
    it('moves the origin and keeps the size', () => {
      expect(translateRect(rect, 5, -10)).toEqual({
        x: 15,
        y: 10,
        width: 100,
        height: 80,
      });
    });

    it('does not mutate the input', () => {
      translateRect(rect, 5, 5);
      expect(rect).toEqual({ x: 10, y: 20, width: 100, height: 80 });
    });
  });

  describe('inflateRect', () => {
    it('grows every side by the amount', () => {
      expect(inflateRect(rect, 4)).toEqual({
        x: 6,
        y: 16,
        width: 108,
        height: 88,
      });
    });

    it('shrinks with a negative amount', () => {
      expect(inflateRect(rect, -5)).toEqual({
        x: 15,
        y: 25,
        width: 90,
        height: 70,
      });
    });
  });

  describe('rectContainsPoint', () => {
    it('accepts interior points', () => {
      expect(rectContainsPoint(rect, { x: 50, y: 50 })).toBe(true);
    });

    it('accepts border points', () => {
      expect(rectContainsPoint(rect, { x: 10, y: 20 })).toBe(true);
      expect(rectContainsPoint(rect, { x: 110, y: 100 })).toBe(true);
    });

    it('rejects outside points', () => {
      expect(rectContainsPoint(rect, { x: 9, y: 50 })).toBe(false);
      expect(rectContainsPoint(rect, { x: 50, y: 101 })).toBe(false);
    });
  });

  describe('rectsIntersect', () => {
    it('detects overlap', () => {
      expect(
        rectsIntersect(rect, { x: 50, y: 50, width: 100, height: 100 }),
      ).toBe(true);
    });

    it('treats touching edges as intersecting', () => {
      expect(
        rectsIntersect(rect, { x: 110, y: 20, width: 10, height: 10 }),
      ).toBe(true);
    });

    it('rejects disjoint rectangles', () => {
      expect(
        rectsIntersect(rect, { x: 200, y: 200, width: 10, height: 10 }),
      ).toBe(false);
    });
  });

  describe('boundsOfRects', () => {
    it('returns null for an empty list', () => {
      expect(boundsOfRects([])).toBeNull();
    });

    it('returns the rectangle itself for a single entry', () => {
      expect(boundsOfRects([rect])).toEqual(rect);
    });

    it('encloses all rectangles', () => {
      expect(
        boundsOfRects([rect, { x: -10, y: 200, width: 30, height: 10 }]),
      ).toEqual({ x: -10, y: 20, width: 120, height: 190 });
    });
  });

  describe('distanceToSegment', () => {
    it('is the perpendicular distance inside the segment span', () => {
      expect(
        distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
      ).toBe(3);
    });

    it('clamps to the nearest endpoint beyond the span', () => {
      expect(
        distanceToSegment({ x: 14, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
      ).toBe(5);
    });

    it('handles degenerate zero-length segments', () => {
      expect(
        distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }),
      ).toBe(5);
    });
  });

  describe('edgeHitTest', () => {
    const waypoints = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
    ];

    it('hits near a middle segment', () => {
      expect(edgeHitTest(waypoints, { x: 98, y: 25 }, 5)).toBe(true);
    });

    it('hits near the first segment', () => {
      expect(edgeHitTest(waypoints, { x: 50, y: 4 }, 5)).toBe(true);
    });

    it('misses beyond the tolerance', () => {
      expect(edgeHitTest(waypoints, { x: 50, y: 10 }, 5)).toBe(false);
    });

    it('never hits an empty or single-point polyline', () => {
      expect(edgeHitTest([], { x: 0, y: 0 }, 5)).toBe(false);
      expect(edgeHitTest([{ x: 0, y: 0 }], { x: 0, y: 0 }, 5)).toBe(false);
    });
  });
});
