import type { Point, Rect } from './geometry';

/** Pan offset (in screen pixels) and zoom factor of the canvas. */
export interface BpmnViewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** Converts a screen-space point into diagram coordinates. */
export function screenToDiagram(viewport: BpmnViewport, point: Point): Point {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

/** Converts a diagram-space point into screen coordinates. */
export function diagramToScreen(viewport: BpmnViewport, point: Point): Point {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  };
}

/**
 * Multiplies the zoom by `factor`, clamped to [min, max], while keeping the diagram point
 * under the screen-space `cursor` fixed in place.
 */
export function zoomAt(
  viewport: BpmnViewport,
  cursor: Point,
  factor: number,
  min = 0.2,
  max = 4,
): BpmnViewport {
  const zoom = Math.min(max, Math.max(min, viewport.zoom * factor));
  if (zoom === viewport.zoom) {
    return viewport;
  }
  const anchor = screenToDiagram(viewport, cursor);
  return {
    x: cursor.x - anchor.x * zoom,
    y: cursor.y - anchor.y * zoom,
    zoom,
  };
}

/**
 * Computes the viewport that centers the content rectangle in the host with the given padding.
 * The fitted zoom is capped at 1.5 and clamped to at least 0.2.
 */
export function fitViewport(
  content: Rect,
  host: { readonly width: number; readonly height: number },
  padding = 40,
): BpmnViewport {
  let zoom = 1;
  if (content.width > 0 && content.height > 0) {
    zoom = Math.min(
      (host.width - 2 * padding) / content.width,
      (host.height - 2 * padding) / content.height,
    );
  }
  zoom = Math.min(zoom, 1.5);
  zoom = Math.max(zoom, 0.2);
  return {
    x: (host.width - content.width * zoom) / 2 - content.x * zoom,
    y: (host.height - content.height * zoom) / 2 - content.y * zoom,
    zoom,
  };
}
