import {
  chooseDockSides,
  dockPoint,
  edgeLabelAnchor,
  routeOrthogonal,
} from './edge-routing';

describe('edge-routing', () => {
  describe('chooseDockSides', () => {
    it('pairs right/left when the horizontal distance dominates', () => {
      expect(
        chooseDockSides(
          { x: 0, y: 0, width: 100, height: 80 },
          { x: 300, y: 20, width: 100, height: 80 },
        ),
      ).toEqual({ source: 'right', target: 'left' });
    });

    it('pairs left/right when the target lies to the left', () => {
      expect(
        chooseDockSides(
          { x: 300, y: 0, width: 100, height: 80 },
          { x: 0, y: 20, width: 100, height: 80 },
        ),
      ).toEqual({ source: 'left', target: 'right' });
    });

    it('pairs bottom/top when the vertical distance dominates', () => {
      expect(
        chooseDockSides(
          { x: 0, y: 0, width: 100, height: 80 },
          { x: 20, y: 300, width: 100, height: 80 },
        ),
      ).toEqual({ source: 'bottom', target: 'top' });
    });

    it('pairs top/bottom when the target lies above', () => {
      expect(
        chooseDockSides(
          { x: 0, y: 300, width: 100, height: 80 },
          { x: 20, y: 0, width: 100, height: 80 },
        ),
      ).toEqual({ source: 'top', target: 'bottom' });
    });
  });

  describe('dockPoint', () => {
    const rect = { x: 10, y: 20, width: 100, height: 80 };

    it('returns side midpoints', () => {
      expect(dockPoint(rect, 'left')).toEqual({ x: 10, y: 60 });
      expect(dockPoint(rect, 'right')).toEqual({ x: 110, y: 60 });
      expect(dockPoint(rect, 'top')).toEqual({ x: 60, y: 20 });
      expect(dockPoint(rect, 'bottom')).toEqual({ x: 60, y: 100 });
    });
  });

  describe('routeOrthogonal', () => {
    it('routes a straight 2-point line between horizontally aligned shapes', () => {
      const waypoints = routeOrthogonal(
        { x: 0, y: 0, width: 100, height: 80 },
        { x: 300, y: 0, width: 100, height: 80 },
      );
      expect(waypoints).toEqual([
        { x: 100, y: 40 },
        { x: 300, y: 40 },
      ]);
    });

    it('routes a 4-point Z through the middle channel when centers differ', () => {
      const waypoints = routeOrthogonal(
        { x: 0, y: 0, width: 100, height: 80 },
        { x: 300, y: 100, width: 100, height: 80 },
      );
      expect(waypoints).toEqual([
        { x: 100, y: 40 },
        { x: 200, y: 40 },
        { x: 200, y: 140 },
        { x: 300, y: 140 },
      ]);
    });

    it('mirrors the Z when the target lies to the left', () => {
      const waypoints = routeOrthogonal(
        { x: 300, y: 100, width: 100, height: 80 },
        { x: 0, y: 0, width: 100, height: 80 },
      );
      expect(waypoints).toEqual([
        { x: 300, y: 140 },
        { x: 200, y: 140 },
        { x: 200, y: 40 },
        { x: 100, y: 40 },
      ]);
    });

    it('routes a 5-point U turn when the target overlaps the source horizontally', () => {
      const waypoints = routeOrthogonal(
        { x: 0, y: 0, width: 100, height: 80 },
        { x: 60, y: 10, width: 100, height: 80 },
      );
      expect(waypoints).toEqual([
        { x: 100, y: 40 },
        { x: 180, y: 40 },
        { x: 180, y: -20 },
        { x: 110, y: -20 },
        { x: 110, y: 10 },
      ]);
    });

    it('routes a straight vertical line between aligned shapes', () => {
      const waypoints = routeOrthogonal(
        { x: 0, y: 0, width: 100, height: 80 },
        { x: 0, y: 300, width: 100, height: 80 },
      );
      expect(waypoints).toEqual([
        { x: 50, y: 80 },
        { x: 50, y: 300 },
      ]);
    });

    it('routes a vertical 4-point Z when centers differ', () => {
      const waypoints = routeOrthogonal(
        { x: 0, y: 0, width: 100, height: 80 },
        { x: 100, y: 300, width: 100, height: 80 },
      );
      expect(waypoints).toEqual([
        { x: 50, y: 80 },
        { x: 50, y: 190 },
        { x: 150, y: 190 },
        { x: 150, y: 300 },
      ]);
    });

    it('routes a vertical 5-point U turn when the target overlaps vertically', () => {
      const waypoints = routeOrthogonal(
        { x: 0, y: 0, width: 100, height: 80 },
        { x: 10, y: 60, width: 100, height: 80 },
      );
      expect(waypoints).toEqual([
        { x: 50, y: 80 },
        { x: 50, y: 160 },
        { x: -20, y: 160 },
        { x: -20, y: 100 },
        { x: 10, y: 100 },
      ]);
    });

    it('is deterministic', () => {
      const source = { x: 0, y: 0, width: 100, height: 80 };
      const target = { x: 300, y: 100, width: 100, height: 80 };
      expect(routeOrthogonal(source, target)).toEqual(
        routeOrthogonal(source, target),
      );
    });
  });

  describe('edgeLabelAnchor', () => {
    it('returns the midpoint of the longest segment', () => {
      expect(
        edgeLabelAnchor([
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 100 },
          { x: 20, y: 100 },
        ]),
      ).toEqual({ x: 10, y: 50 });
    });

    it('uses the single segment of a straight edge', () => {
      expect(
        edgeLabelAnchor([
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ]),
      ).toEqual({ x: 50, y: 0 });
    });

    it('degrades gracefully for short inputs', () => {
      expect(edgeLabelAnchor([])).toEqual({ x: 0, y: 0 });
      expect(edgeLabelAnchor([{ x: 7, y: 8 }])).toEqual({ x: 7, y: 8 });
    });
  });
});
