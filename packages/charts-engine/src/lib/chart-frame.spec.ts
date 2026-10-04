import { vi } from 'vitest';
import {
  createChartFrame,
  detectChartRtl,
  observeChartRtl,
  frameLabelAnchor,
  frameLabelBaseline,
  frameLine,
  frameLogical,
  framePoint,
  frameRect,
  frameTextTransform,
} from './chart-frame';

/** Applies an SVG `matrix(a b c d e f)` to a point. */
function applyMatrix(transform: string, x: number, y: number) {
  const [a, b, c, d, e, f] = (transform.match(/-?[\d.]+/g) ?? []).map(Number);
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

describe('chart frame', () => {
  it('is the identity unrotated (RTL mirrors through the scale instead)', () => {
    for (const rtl of [false, true]) {
      const frame = createChartFrame(false, rtl, 400, 300);
      expect(frame.transform).toBeNull();
      expect(framePoint(frame, 10, 20)).toEqual({ x: 10, y: 20 });
      expect(frameLogical(frame, 10, 20)).toEqual({ a: 10, v: 20 });
    }
  });

  it('rotates: argument axis down the left, values growing to the right', () => {
    const frame = createChartFrame(true, false, 300, 400);
    // the first argument (a = 0) is at the top, the highest value (v = 0) right
    expect(framePoint(frame, 0, 0)).toEqual({ x: 400, y: 0 });
    expect(framePoint(frame, 300, 400)).toEqual({ x: 0, y: 300 });
    expect(frameLogical(frame, 400, 0)).toEqual({ a: 0, v: 0 });
    // the group transform agrees with framePoint
    const transform = frame.transform ?? '';
    expect(applyMatrix(transform, 120, 80)).toEqual(framePoint(frame, 120, 80));
  });

  it('mirrors the rotation in RTL: values grow to the left', () => {
    const frame = createChartFrame(true, true, 300, 400);
    expect(framePoint(frame, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(framePoint(frame, 50, 400)).toEqual({ x: 400, y: 50 });
    expect(frameLogical(frame, 30, 70)).toEqual({ a: 70, v: 30 });
    const transform = frame.transform ?? '';
    expect(applyMatrix(transform, 120, 80)).toEqual(framePoint(frame, 120, 80));
  });

  it('maps lines and normalizes rects', () => {
    const frame = createChartFrame(true, false, 300, 400);
    expect(frameLine(frame, 10, 0, 10, 400)).toEqual({
      x1: 400,
      y1: 10,
      x2: 0,
      y2: 10,
    });
    expect(frameRect(frame, 10, 30, 100, 300)).toEqual({
      x: 100,
      y: 10,
      w: 200,
      h: 20,
    });
  });

  it('counter-transforms in-group text so glyphs stay upright', () => {
    const plain = createChartFrame(false, false, 400, 300);
    expect(frameTextTransform(plain, 1, 2)).toBeNull();
    expect(frameLabelAnchor(plain)).toBe('middle');
    expect(frameLabelBaseline(plain)).toBeNull();

    const rotated = createChartFrame(true, false, 300, 400);
    expect(frameTextTransform(rotated, 12, 30)).toBe('rotate(-90 12 30)');
    expect(frameLabelAnchor(rotated)).toBe('start');
    expect(frameLabelBaseline(rotated)).toBe('central');

    const mirrored = createChartFrame(true, true, 300, 400);
    const counter = frameTextTransform(mirrored, 12, 30) ?? '';
    // group ∘ counter maps the anchor where framePoint does, glyphs unchanged
    const inner = applyMatrix(counter, 12, 30);
    expect(applyMatrix(mirrored.transform ?? '', inner.x, inner.y)).toEqual(
      framePoint(mirrored, 12, 30),
    );
    expect(frameLabelAnchor(mirrored)).toBe('end');
  });
});

describe('detectChartRtl', () => {
  it('reads the nearest dir attribute (and is false for null)', () => {
    const outer = document.createElement('div');
    outer.setAttribute('dir', 'rtl');
    const inner = document.createElement('span');
    outer.appendChild(inner);
    document.body.appendChild(outer);
    expect(detectChartRtl(inner)).toBe(true);
    outer.setAttribute('dir', 'ltr');
    expect(detectChartRtl(inner)).toBe(false);
    expect(detectChartRtl(null)).toBe(false);
    outer.remove();
  });
});

describe('observeChartRtl', () => {
  it('reports dir flips on an ancestor until disconnected', async () => {
    const outer = document.createElement('div');
    const inner = document.createElement('span');
    outer.append(inner);
    document.body.append(outer);
    const seen = vi.fn();
    const stop = observeChartRtl(inner, seen);
    outer.setAttribute('dir', 'rtl');
    await Promise.resolve();
    expect(seen).toHaveBeenLastCalledWith(true);
    stop();
    outer.setAttribute('dir', 'ltr');
    await Promise.resolve();
    expect(seen).toHaveBeenCalledTimes(1);
    expect(observeChartRtl(null, seen)).toBeTypeOf('function');
    outer.remove();
  });
});
