import { ogeSlideGeometryPath } from './geometry';
import { ogeSlideLineEnds } from './line-ends';

const end = (type: string, width = 'med', length = 'med') => ({
  type,
  width,
  length,
});

describe('ogeSlideLineEnds', () => {
  it('puts a triangle on the end of a line and pulls the line back under it', () => {
    const { d, heads } = ogeSlideLineEnds(
      'M0 0 L100 0',
      1,
      undefined,
      end('triangle'),
    );
    // a thin line's head is sized as if it were ~2 pt wide: 3 × 1.98
    expect(heads).toEqual([
      { d: 'M100 0 L94.06 2.97 L94.06 -2.97 Z', filled: true },
    ]);
    expect(d).toBe('M0 0 L94.654 0');
  });

  it('points the head along the last segment, and the tail end of a curve at its control point', () => {
    const bent = ogeSlideLineEnds(
      ogeSlideGeometryPath('bentConnector3', 100, 50, {}),
      3,
      undefined,
      end('triangle', 'sm', 'lg'),
    );
    // the last leg runs right: the head's base is behind x = 100
    expect(bent.heads[0].d).toBe('M100 50 L85 53 L85 47 Z');
    const curved = ogeSlideLineEnds(
      'M0 0 C50 0 100 50 100 100',
      2,
      end('arrow'),
      undefined,
    );
    // the start leaves toward its first control point (+x): an open V behind it
    expect(curved.heads).toEqual([{ d: 'M6 -3 L0 0 L6 3', filled: false }]);
    expect(curved.d).toBe('M0 0 C50 0 100 50 100 100');
  });

  it('draws stealth, diamond and oval heads, and ignores none and unknown types', () => {
    const line = 'M0 0 L0 100';
    const kinds = ['stealth', 'diamond', 'oval'].map(
      (type) => ogeSlideLineEnds(line, 4, end(type), end(type)).heads,
    );
    expect(kinds.every((heads) => heads.length === 2)).toBe(true);
    expect(kinds.flat().every((head) => head.filled)).toBe(true);
    expect(kinds[2][0].d).toMatch(/A6 6 -90 1 1/);
    // a stealth head pulls the line back half its length; diamonds and ovals sit on the end
    expect(ogeSlideLineEnds(line, 4, undefined, end('stealth')).d).toBe(
      'M0 0 L0 94',
    );
    expect(ogeSlideLineEnds(line, 4, end('diamond'), end('oval')).d).toBe(
      'M0 0 L0 100',
    );
    expect(ogeSlideLineEnds(line, 1, end('mystery'), undefined).heads).toEqual(
      [],
    );
  });

  it('leaves closed, degenerate and unended paths alone', () => {
    expect(ogeSlideLineEnds('M0 0 L1 1', 1, undefined, undefined)).toEqual({
      d: 'M0 0 L1 1',
      heads: [],
    });
    expect(
      ogeSlideLineEnds('M0 0 L10 0 L10 10 Z', 1, end('triangle'), undefined)
        .heads,
    ).toEqual([]);
    expect(
      ogeSlideLineEnds('M5 5 L5 5', 1, end('triangle'), end('triangle')).heads,
    ).toEqual([]);
    expect(
      ogeSlideLineEnds('L1 1', 1, end('triangle'), undefined).heads,
    ).toEqual([]);
    expect(
      ogeSlideLineEnds('M0 0', 1, end('triangle'), undefined).heads,
    ).toEqual([]);
  });
});

describe('flowchart and connector presets', () => {
  const names = [
    'flowChartInternalStorage',
    'flowChartDocument',
    'flowChartMultidocument',
    'flowChartManualInput',
    'flowChartPunchedCard',
    'flowChartPunchedTape',
    'flowChartSummingJunction',
    'flowChartOr',
    'flowChartCollate',
    'flowChartSort',
    'flowChartExtract',
    'flowChartMerge',
    'flowChartOnlineStorage',
    'flowChartDelay',
    'flowChartMagneticTape',
    'flowChartMagneticDisk',
    'flowChartMagneticDrum',
    'flowChartDisplay',
    'bentConnector4',
    'bentConnector5',
    'curvedConnector2',
  ];

  it.each(names)('%s draws inside its box', (name) => {
    const d = ogeSlideGeometryPath(name, 120, 60, {});
    expect(d.startsWith('M')).toBe(true);
    expect(d).not.toMatch(/NaN|Infinity/);
    // every coordinate pair (arc radii aside) stays within the box
    const numbers = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(120);
  });

  it('documents dip below their straight edge, as Excel draws them', () => {
    expect(ogeSlideGeometryPath('flowChartDocument', 216, 216, {})).toBe(
      'M0 0 L216 0 L216 173.22 C108 173.22 108 239.22 0 201.72 Z',
    );
    expect(
      ogeSlideGeometryPath('bentConnector4', 100, 100, {
        adj1: 25000,
        adj2: 75000,
      }),
    ).toBe('M0 0 L25 0 L25 75 L100 75 L100 100');
  });
});
