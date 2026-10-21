/**
 * A text measurer on `OffscreenCanvas` — available in browsers and Web
 * Workers alike, so the engine stays DOM-free. Widths are cached per font
 * and text: a sheet repeats the same few fonts and many texts.
 */
import type { OgeTextMeasurer } from './cell-text';
import type { OgePaintFont } from './resolve-style';

interface Context2D {
  font: string;
  measureText(text: string): { width: number };
}

interface CanvasLike {
  getContext(kind: '2d'): Context2D | null;
}

const CACHE_LIMIT = 20_000;

/** A canvas measurer, or `null` where there is no `OffscreenCanvas` (Node, old browsers). */
export function ogeCreateCanvasMeasurer(): OgeTextMeasurer | null {
  const Offscreen = (
    globalThis as { OffscreenCanvas?: new (w: number, h: number) => CanvasLike }
  ).OffscreenCanvas;
  if (!Offscreen) return null;
  let context: Context2D | null = null;
  try {
    context = new Offscreen(1, 1).getContext('2d');
  } catch {
    return null;
  }
  if (!context) return null;
  const ctx = context;
  const cache = new Map<string, number>();
  return {
    measure(text: string, font: OgePaintFont): number {
      if (text === '') return 0;
      const key = `${font.css}\u0001${text}`;
      const known = cache.get(key);
      if (known !== undefined) return known;
      if (ctx.font !== font.css) ctx.font = font.css;
      const width = ctx.measureText(text).width;
      if (cache.size >= CACHE_LIMIT) cache.clear();
      cache.set(key, width);
      return width;
    },
  };
}
