import {
  BPMN_GRID_SIZE,
  snapPoint,
  snapToNeighbors,
  snapValue,
} from './snapping';

describe('snapping', () => {
  describe('snapValue', () => {
    it('rounds to the default 10px grid', () => {
      expect(BPMN_GRID_SIZE).toBe(10);
      expect(snapValue(14)).toBe(10);
      expect(snapValue(15)).toBe(20);
      expect(snapValue(-14)).toBe(-10);
    });

    it('honors a custom grid size', () => {
      expect(snapValue(14, 4)).toBe(16);
    });
  });

  describe('snapPoint', () => {
    it('snaps both coordinates', () => {
      expect(snapPoint({ x: 13, y: 27 })).toEqual({ x: 10, y: 30 });
    });
  });

  describe('snapToNeighbors', () => {
    const moving = { x: 100, y: 100, width: 100, height: 80 };

    it('returns a zero result without neighbors', () => {
      expect(snapToNeighbors(moving, [])).toEqual({ dx: 0, dy: 0, guides: [] });
    });

    it('snaps to a neighbor center on the x axis', () => {
      const neighbor = { x: 103, y: 300, width: 100, height: 80 };
      const result = snapToNeighbors(moving, [neighbor]);
      expect(result.dx).toBe(3);
      expect(result.dy).toBe(0);
      expect(result.guides).toEqual([{ axis: 'x', position: 153 }]);
    });

    it('snaps to a neighbor left edge', () => {
      const neighbor = { x: 96, y: 300, width: 40, height: 40 };
      const result = snapToNeighbors(moving, [neighbor]);
      expect(result.dx).toBe(-4);
      expect(result.guides).toEqual([{ axis: 'x', position: 96 }]);
    });

    it('snaps to a neighbor right edge', () => {
      // moving.right = 200; only the neighbor's right edge (204) is within the threshold.
      const result = snapToNeighbors(moving, [
        { x: 150, y: 300, width: 54, height: 40 },
      ]);
      expect(result.dx).toBe(4);
      expect(result.guides).toEqual([{ axis: 'x', position: 204 }]);
    });

    it('snaps to a neighbor top and bottom on the y axis', () => {
      const topAligned = snapToNeighbors(moving, [
        { x: 400, y: 97, width: 40, height: 40 },
      ]);
      expect(topAligned.dy).toBe(-3);
      expect(topAligned.guides).toEqual([{ axis: 'y', position: 97 }]);

      // moving.bottom = 180; only the neighbor's bottom edge (184) is within the threshold.
      const bottomAligned = snapToNeighbors(moving, [
        { x: 400, y: 124, width: 40, height: 60 },
      ]);
      expect(bottomAligned.dy).toBe(4);
      expect(bottomAligned.guides).toEqual([{ axis: 'y', position: 184 }]);
    });

    it('treats the axes independently', () => {
      const neighbor = { x: 102, y: 103, width: 100, height: 80 };
      const result = snapToNeighbors(moving, [neighbor]);
      expect(result.dx).toBe(2);
      expect(result.dy).toBe(3);
      expect(result.guides).toHaveLength(2);
    });

    it('lets the nearest candidate win per axis', () => {
      const near = { x: 101, y: 300, width: 100, height: 80 };
      const far = { x: 104, y: 300, width: 100, height: 80 };
      expect(snapToNeighbors(moving, [far, near]).dx).toBe(1);
    });

    it('misses alignments beyond the threshold', () => {
      const neighbor = { x: 106, y: 300, width: 100, height: 80 };
      expect(snapToNeighbors(moving, [neighbor])).toEqual({
        dx: 0,
        dy: 0,
        guides: [],
      });
    });

    it('honors a custom threshold', () => {
      const neighbor = { x: 106, y: 300, width: 100, height: 80 };
      expect(snapToNeighbors(moving, [neighbor], 8).dx).toBe(6);
    });
  });
});
