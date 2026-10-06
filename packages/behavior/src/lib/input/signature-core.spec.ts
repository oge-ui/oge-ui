import { describe, expect, it } from 'vitest';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OgeSignatureCore,
  buildOgeSignatureSvg,
  ogeSignatureGeometry,
  ogeSignaturePointFrom,
  ogeSignatureWidths,
  ogeSvgDataUrl,
  parseOgeSignatureSvg,
  renderOgeSignature,
  type OgeSignatureCanvasContext,
  type OgeSignatureStroke,
} from './signature-core';

/** Plain-closure adapter — no memoization, proves no framework caching is assumed. */
const rx: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next) => (value = next);
    return cell;
  },
  derived: (compute) => compute,
};

const size = { width: 200, height: 100 };
const pen = { minWidth: 1, maxWidth: 3 };

function stroke(...coords: [number, number, number][]): OgeSignatureStroke {
  return { points: coords.map(([x, y, t]) => ({ x, y, t })) };
}

function fakeContext() {
  const calls: string[] = [];
  const ctx: OgeSignatureCanvasContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '',
    textBaseline: '',
    textAlign: '',
    beginPath: () => calls.push('beginPath'),
    moveTo: () => calls.push('moveTo'),
    quadraticCurveTo: () => calls.push('quad'),
    arc: () => calls.push('arc'),
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
    fillRect: () => calls.push('fillRect'),
    clearRect: () => calls.push('clearRect'),
    fillText: (text) => calls.push(`text:${text}`),
  };
  return { ctx, calls };
}

describe('ogeSignaturePointFrom', () => {
  it('normalizes against the rect and clamps outside samples', () => {
    const rect = { left: 10, top: 20, width: 200, height: 100 };
    expect(ogeSignaturePointFrom(110, 70, rect, 5)).toEqual({
      x: 0.5,
      y: 0.5,
      t: 5,
    });
    expect(ogeSignaturePointFrom(-50, 500, rect, 0)).toEqual({
      x: 0,
      y: 1,
      t: 0,
    });
  });

  it('survives a zero-size rect (not laid out yet)', () => {
    const point = ogeSignaturePointFrom(
      5,
      5,
      { left: 0, top: 0, width: 0, height: 0 },
      0,
    );
    expect(Number.isFinite(point.x)).toBe(true);
  });
});

describe('ogeSignatureWidths', () => {
  it('thins fast strokes and thickens slow ones within the pen range', () => {
    const fast = ogeSignatureWidths(
      stroke([0, 0, 0], [0.9, 0, 10], [0, 0, 20]).points,
      size,
      pen,
    );
    const slow = ogeSignatureWidths(
      stroke([0, 0, 0], [0.01, 0, 500], [0.02, 0, 1000]).points,
      size,
      pen,
    );
    expect(fast[2]).toBeLessThan(slow[2]);
    for (const w of [...fast, ...slow]) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(3);
    }
  });
});

describe('ogeSignatureGeometry', () => {
  it('turns a single sample into a dot', () => {
    expect(ogeSignatureGeometry(stroke([0.5, 0.5, 0]), size, pen)).toEqual({
      kind: 'dot',
      x: 100,
      y: 50,
      radius: 1.5,
    });
  });

  it('chains quadratic segments that end on the last sample', () => {
    const geometry = ogeSignatureGeometry(
      stroke([0, 0, 0], [0.5, 0.5, 10], [1, 0, 20]),
      size,
      pen,
    );
    expect(geometry?.kind).toBe('curve');
    if (geometry?.kind !== 'curve') return;
    expect(geometry.segments).toHaveLength(2);
    expect(geometry.segments[0].x1).toBe(geometry.segments[1].x0);
    expect(geometry.segments[1].x1).toBe(200);
    expect(geometry.segments[1].y1).toBe(0);
  });

  it('returns null for an empty stroke', () => {
    expect(ogeSignatureGeometry({ points: [] }, size, pen)).toBeNull();
  });
});

describe('renderOgeSignature', () => {
  it('clears, fills the background and draws each stroke', () => {
    const { ctx, calls } = fakeContext();
    renderOgeSignature(ctx, [stroke([0.1, 0.1, 0], [0.5, 0.5, 10])], {
      ...pen,
      size,
      color: '#000',
      background: '#fff',
    });
    expect(calls[0]).toBe('clearRect');
    expect(calls).toContain('fillRect');
    expect(calls).toContain('quad');
  });

  it('draws the typed text instead of the strokes', () => {
    const { ctx, calls } = fakeContext();
    renderOgeSignature(ctx, [stroke([0.1, 0.1, 0])], {
      ...pen,
      size,
      color: '#000',
      typedText: '  Ada Lovelace ',
      fontFamily: 'serif',
    });
    expect(calls).toContain('text:Ada Lovelace');
    expect(calls).not.toContain('arc');
    expect(ctx.font).toBe('42px serif');
  });
});

describe('SVG export', () => {
  const strokes = [
    stroke([0.1, 0.2, 0], [0.4, 0.6, 16], [0.8, 0.3, 32]),
    stroke([0.5, 0.5, 40]),
  ];

  it('builds paths, a dot and escaped attributes', () => {
    const svg = buildOgeSignatureSvg(strokes, {
      ...pen,
      size,
      color: 'rgb(0, 0, 0)" onload="x',
    });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(
      true,
    );
    expect(svg).toContain('<path d="M20 20');
    expect(svg).toContain('<circle');
    expect(svg).not.toContain('" onload="x"');
  });

  it('round-trips strokes through the data URL metadata', () => {
    const url = ogeSvgDataUrl(
      buildOgeSignatureSvg(strokes, { ...pen, size, color: '#000' }),
    );
    expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const data = parseOgeSignatureSvg(url);
    expect(data?.typedText).toBe('');
    expect(data?.strokes).toHaveLength(2);
    expect(data?.strokes[0].points[1]).toEqual({ x: 0.4, y: 0.6, t: 16 });
  });

  it('round-trips a typed signature with non-Latin text', () => {
    const svg = buildOgeSignatureSvg([], {
      ...pen,
      size,
      color: '#000',
      typedText: 'Şükrü <Öz>',
    });
    expect(svg).toContain('Şükrü &lt;Öz&gt;');
    expect(parseOgeSignatureSvg(ogeSvgDataUrl(svg))?.typedText).toBe(
      'Şükrü <Öz>',
    );
  });

  it('rejects anything that is not the pad’s own export', () => {
    expect(parseOgeSignatureSvg(null)).toBeNull();
    expect(parseOgeSignatureSvg('data:image/png;base64,AAAA')).toBeNull();
    expect(
      parseOgeSignatureSvg(ogeSvgDataUrl('<svg><circle r="1"/></svg>')),
    ).toBeNull();
    expect(
      parseOgeSignatureSvg(
        ogeSvgDataUrl(
          '<svg><metadata id="oge-signature">{nope</metadata></svg>',
        ),
      ),
    ).toBeNull();
    expect(
      parseOgeSignatureSvg(
        ogeSvgDataUrl(
          '<svg><metadata id="oge-signature">{"strokes":[{"points":[{"x":"1","y":0,"t":0}]}]}</metadata></svg>',
        ),
      ),
    ).toBeNull();
    expect(parseOgeSignatureSvg('data:image/svg+xml;base64,%%%')).toBeNull();
  });

  it('accepts a URL-encoded SVG and clamps coordinates', () => {
    const svg =
      '<svg><metadata id="oge-signature">{"strokes":[{"points":[{"x":5,"y":-1,"t":0}]}],"typedText":""}</metadata></svg>';
    const data = parseOgeSignatureSvg(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
    expect(data?.strokes[0].points[0]).toEqual({ x: 1, y: 0, t: 0 });
  });
});

describe('OgeSignatureCore', () => {
  it('commits strokes, drops near-duplicate samples and undoes', () => {
    const core = new OgeSignatureCore(rx);
    expect(core.isEmpty('draw')).toBe(true);
    core.beginStroke({ x: 0.1, y: 0.1, t: 0 });
    expect(core.drawing).toBe(true);
    expect(core.addPoint({ x: 0.1001, y: 0.1, t: 1 })).toBe(false);
    expect(core.addPoint({ x: 0.3, y: 0.3, t: 5 })).toBe(true);
    const committed = core.endStroke();
    expect(committed?.points).toHaveLength(2);
    expect(core.hasStrokes()).toBe(true);
    expect(core.isEmpty('draw')).toBe(false);
    expect(core.undo()).toBe(true);
    expect(core.undo()).toBe(false);
    expect(core.hasStrokes()).toBe(false);
  });

  it('cancels a stroke without committing it', () => {
    const core = new OgeSignatureCore(rx);
    core.beginStroke({ x: 0, y: 0, t: 0 });
    core.cancelStroke();
    expect(core.endStroke()).toBeNull();
    expect(core.strokes()).toEqual([]);
    expect(core.addPoint({ x: 1, y: 1, t: 1 })).toBe(false);
  });

  it('tracks typed text emptiness separately and clears both', () => {
    const core = new OgeSignatureCore(rx);
    core.typedText.set('  ');
    expect(core.isEmpty('type')).toBe(true);
    core.typedText.set('Ada');
    expect(core.isEmpty('type')).toBe(false);
    core.beginStroke({ x: 0, y: 0, t: 0 });
    core.endStroke();
    core.clear();
    expect(core.strokes()).toEqual([]);
    expect(core.typedText()).toBe('');
  });

  it('restores a parsed value', () => {
    const core = new OgeSignatureCore(rx);
    core.restore({ strokes: [stroke([0.2, 0.2, 0])], typedText: '' });
    expect(core.strokes()).toHaveLength(1);
  });
});
