import {
  diagramToScreen,
  fitViewport,
  screenToDiagram,
  zoomAt,
} from './viewport';

describe('viewport', () => {
  describe('screenToDiagram / diagramToScreen', () => {
    const viewport = { x: 100, y: 50, zoom: 2 };

    it('converts screen coordinates into diagram coordinates', () => {
      expect(screenToDiagram(viewport, { x: 300, y: 250 })).toEqual({
        x: 100,
        y: 100,
      });
    });

    it('converts diagram coordinates into screen coordinates', () => {
      expect(diagramToScreen(viewport, { x: 100, y: 100 })).toEqual({
        x: 300,
        y: 250,
      });
    });

    it('round-trips', () => {
      const point = { x: 37, y: -12 };
      expect(
        screenToDiagram(viewport, diagramToScreen(viewport, point)),
      ).toEqual(point);
    });
  });

  describe('zoomAt', () => {
    it('keeps the diagram point under the cursor fixed', () => {
      const viewport = { x: 40, y: 30, zoom: 1 };
      const cursor = { x: 200, y: 150 };
      const before = screenToDiagram(viewport, cursor);
      const zoomed = zoomAt(viewport, cursor, 1.5);
      expect(zoomed.zoom).toBe(1.5);
      const after = screenToDiagram(zoomed, cursor);
      expect(after.x).toBeCloseTo(before.x, 10);
      expect(after.y).toBeCloseTo(before.y, 10);
    });

    it('keeps the cursor fixed across repeated zooms in both directions', () => {
      let viewport = { x: -20, y: 80, zoom: 0.8 };
      const cursor = { x: 123, y: 456 };
      const anchor = screenToDiagram(viewport, cursor);
      for (const factor of [1.25, 1.25, 0.8, 0.5, 2]) {
        viewport = zoomAt(viewport, cursor, factor);
        const point = screenToDiagram(viewport, cursor);
        expect(point.x).toBeCloseTo(anchor.x, 8);
        expect(point.y).toBeCloseTo(anchor.y, 8);
      }
    });

    it('clamps the zoom to the given bounds', () => {
      expect(zoomAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 100).zoom).toBe(4);
      expect(zoomAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 0.001).zoom).toBe(
        0.2,
      );
      expect(
        zoomAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 100, 0.5, 2).zoom,
      ).toBe(2);
    });

    it('returns the same viewport when already clamped', () => {
      const viewport = { x: 10, y: 10, zoom: 4 };
      expect(zoomAt(viewport, { x: 0, y: 0 }, 2)).toBe(viewport);
    });
  });

  describe('fitViewport', () => {
    it('centers the content and fits it inside the padding', () => {
      const content = { x: 100, y: 100, width: 400, height: 200 };
      const viewport = fitViewport(content, { width: 880, height: 480 });
      expect(viewport.zoom).toBe(1.5);
      // Content center (300, 200) maps to the host center (440, 240).
      expect(diagramToScreen(viewport, { x: 300, y: 200 })).toEqual({
        x: 440,
        y: 240,
      });
    });

    it('scales large content down to fit', () => {
      const content = { x: 0, y: 0, width: 2000, height: 500 };
      const viewport = fitViewport(content, { width: 1040, height: 580 }, 20);
      expect(viewport.zoom).toBe(0.5);
      expect(diagramToScreen(viewport, { x: 1000, y: 250 })).toEqual({
        x: 520,
        y: 290,
      });
    });

    it('caps the zoom at 1.5 for small content', () => {
      const viewport = fitViewport(
        { x: 0, y: 0, width: 10, height: 10 },
        { width: 1000, height: 1000 },
      );
      expect(viewport.zoom).toBe(1.5);
    });

    it('clamps the zoom to at least 0.2 for huge content', () => {
      const viewport = fitViewport(
        { x: 0, y: 0, width: 100000, height: 100000 },
        { width: 800, height: 600 },
      );
      expect(viewport.zoom).toBe(0.2);
    });

    it('falls back to zoom 1 for empty content', () => {
      const viewport = fitViewport(
        { x: 0, y: 0, width: 0, height: 0 },
        { width: 800, height: 600 },
      );
      expect(viewport.zoom).toBe(1);
      expect(viewport.x).toBe(400);
      expect(viewport.y).toBe(300);
    });
  });
});
