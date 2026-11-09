/**
 * Measures slide text through an `OffscreenCanvas`, which exists in browsers
 * and Web Workers. Sizes go in as points and come back as points: canvas
 * text scales linearly, so the unit does not matter.
 */
import { ogeSlideFontFamily } from './render';
import type { OgeSlideFont, OgeSlideTextMeasurer } from './text-layout';

interface Context2D {
  font: string;
  measureText(text: string): {
    width: number;
    fontBoundingBoxAscent?: number;
    fontBoundingBoxDescent?: number;
  };
}

const CACHE_LIMIT = 20_000;

/** A canvas measurer, or `null` where the platform has no canvas. */
export function ogeCreateSlideCanvasMeasurer(): OgeSlideTextMeasurer | null {
  const Offscreen = (
    globalThis as {
      OffscreenCanvas?: new (
        w: number,
        h: number,
      ) => { getContext(kind: '2d'): Context2D | null };
    }
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
  const widths = new Map<string, number>();
  const extents = new Map<string, { ascent: number; descent: number }>();
  const css = (font: OgeSlideFont): string =>
    `${font.italic ? 'italic ' : ''}${font.bold ? 'bold ' : ''}${font.size}px ${ogeSlideFontFamily(font.family)}`;
  return {
    width(text, font) {
      if (text === '') return 0;
      const style = css(font);
      const key = `${style}\u0001${text}`;
      const known = widths.get(key);
      if (known !== undefined) return known;
      ctx.font = style;
      const width = ctx.measureText(text).width;
      if (widths.size >= CACHE_LIMIT) widths.clear();
      widths.set(key, width);
      return width;
    },
    extent(font) {
      const style = css(font);
      const known = extents.get(style);
      if (known) return known;
      ctx.font = style;
      const metrics = ctx.measureText('Hg');
      const extent = {
        ascent: metrics.fontBoundingBoxAscent ?? font.size * 0.95,
        descent: metrics.fontBoundingBoxDescent ?? font.size * 0.25,
      };
      extents.set(style, extent);
      return extent;
    },
  };
}
