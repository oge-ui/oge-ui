import { OGE_ICON_SETS, ogeIconParts } from './icons';

describe('ogeIconParts', () => {
  it('draws every icon of all twenty sets', () => {
    expect(OGE_ICON_SETS).toHaveLength(20);
    for (const set of OGE_ICON_SETS) {
      const size = Number.parseInt(set, 10);
      for (let index = 0; index < size; index++) {
        const parts = ogeIconParts(set, index);
        expect(parts.length, `${set} ${index}`).toBeGreaterThan(0);
        for (const part of parts) expect(part.d).toMatch(/^M/);
      }
    }
  });

  it('uses Excel’s colours, low to high', () => {
    expect(ogeIconParts('3Arrows', 0)[0]).toMatchObject({
      fill: '#D86344',
      transform: 'rotate(180 8 8)',
    });
    expect(ogeIconParts('3Arrows', 2)[0]).toMatchObject({ fill: '#76A797' });
    expect(ogeIconParts('3Arrows', 2)[0].transform).toBeUndefined();
    expect(ogeIconParts('4Rating', 0).map((p) => p.fill)).toEqual([
      '#4D82B8',
      '#B3B3B3',
      '#B3B3B3',
      '#B3B3B3',
    ]);
    expect(ogeIconParts('5Rating', 0).every((p) => p.fill === '#B3B3B3')).toBe(
      true,
    );
    expect(ogeIconParts('5Boxes', 1).map((p) => p.fill)).toEqual([
      '#4D82B8',
      '#B3B3B3',
      '#B3B3B3',
      '#B3B3B3',
    ]);
    expect(ogeIconParts('3Signs', 0)[0].stroke).toBe('#AD4F36');
  });

  it('draws nothing for unknown sets, out-of-range icons and prototype keys', () => {
    expect(ogeIconParts('NoIcons', 0)).toEqual([]);
    expect(ogeIconParts('3Arrows', 3)).toEqual([]);
    expect(ogeIconParts('3Arrows', -1)).toEqual([]);
    expect(ogeIconParts('3Arrows', 0.5)).toEqual([]);
    expect(ogeIconParts('constructor', 0)).toEqual([]);
    expect(ogeIconParts('__proto__', 0)).toEqual([]);
  });
});
