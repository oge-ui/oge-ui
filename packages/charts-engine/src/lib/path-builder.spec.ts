import {
  areaPath,
  baselineAreaPath,
  linePath,
  splinePath,
} from './path-builder';

describe('linePath', () => {
  it('draws a polyline and is deterministic', () => {
    const path = linePath([
      { x: 0, y: 10 },
      { x: 50, y: 20 },
      { x: 100, y: 5 },
    ]);
    expect(path).toBe('M 0 10 L 50 20 L 100 5');
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 50, y: 20 },
        { x: 100, y: 5 },
      ]),
    ).toBe(path);
  });

  it('splits subpaths at gaps and rounds to 2 decimals', () => {
    const path = linePath([
      { x: 0, y: 1.234567 },
      { x: 10, y: null },
      { x: 20, y: 3 },
      { x: 30, y: 4 },
    ]);
    expect(path).toBe('M 0 1.23 M 20 3 L 30 4');
  });

  it('returns an empty string for all-gap input', () => {
    expect(linePath([{ x: 0, y: null }])).toBe('');
  });
});

describe('splinePath', () => {
  it('emits cubic segments through every point', () => {
    const path = splinePath([
      { x: 0, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 0 },
    ]);
    expect(path.startsWith('M 0 0 C ')).toBe(true);
    expect((path.match(/C /g) ?? []).length).toBe(2);
    expect(path.endsWith('100 0')).toBe(true);
  });

  it('gap runs become separate M subpaths', () => {
    const path = splinePath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: null },
      { x: 30, y: 5 },
      { x: 40, y: 15 },
    ]);
    expect((path.match(/M /g) ?? []).length).toBe(2);
  });
});

describe('areaPath / baselineAreaPath', () => {
  it('closes the ribbon between the two edges', () => {
    const path = areaPath(
      [
        { x: 0, y: 10 },
        { x: 100, y: 20 },
      ],
      [
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ],
    );
    expect(path).toBe('M 0 10 L 100 20 L 100 50 L 0 50 Z');
  });

  it('baseline area drops to the axis line', () => {
    const path = baselineAreaPath(
      [
        { x: 0, y: 10 },
        { x: 100, y: 20 },
      ],
      200,
    );
    expect(path).toBe('M 0 10 L 100 20 L 100 200 L 0 200 Z');
  });

  it('gaps produce one closed ribbon per run', () => {
    const top = [
      { x: 0, y: 10 },
      { x: 10, y: null },
      { x: 20, y: 30 },
      { x: 30, y: 40 },
    ];
    const path = baselineAreaPath(top, 100);
    expect((path.match(/Z/g) ?? []).length).toBe(2);
  });
});
