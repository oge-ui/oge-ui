import {
  OGE_INDEXED_COLORS,
  OGE_OFFICE_THEME_COLORS,
  OGE_THEME_COLOR_SLOTS,
  ogeApplyTint,
  resolveOgeColor,
} from './color';

/** Channel-wise distance, so Excel's own HLS rounding (±1) does not fail a spec. */
function distance(a: string, b: string): number {
  const channels = (hex: string) =>
    [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16));
  const x = channels(a);
  const y = channels(b);
  return Math.max(...x.map((v, i) => Math.abs(v - y[i])));
}

describe('colour resolution', () => {
  it('reads explicit RGB and ARGB, ignoring alpha', () => {
    expect(resolveOgeColor({ rgb: 'FF4472C4' })).toBe('#4472C4');
    expect(resolveOgeColor({ rgb: '00ff0000' })).toBe('#FF0000');
    expect(resolveOgeColor({ rgb: '4472c4' })).toBe('#4472C4');
    expect(resolveOgeColor({ rgb: 'nonsense' })).toBeNull();
  });

  it('maps theme indexes with the first two pairs swapped', () => {
    expect(OGE_THEME_COLOR_SLOTS.slice(0, 4)).toEqual([
      'lt1',
      'dk1',
      'lt2',
      'dk2',
    ]);
    expect(resolveOgeColor({ theme: 0 })).toBe('#FFFFFF'); // Background 1
    expect(resolveOgeColor({ theme: 1 })).toBe('#000000'); // Text 1
    expect(resolveOgeColor({ theme: 4 })).toBe('#4472C4'); // Accent 1
    expect(resolveOgeColor({ theme: 12 })).toBeNull();
    const custom = { ...OGE_OFFICE_THEME_COLORS, accent1: '156082' };
    expect(resolveOgeColor({ theme: 4 }, { theme: custom })).toBe('#156082');
  });

  it('reads the indexed palette, custom palettes and the system colours', () => {
    expect(OGE_INDEXED_COLORS).toHaveLength(66);
    expect(resolveOgeColor({ indexed: 10 })).toBe('#FF0000');
    expect(resolveOgeColor({ indexed: 22 })).toBe('#C0C0C0');
    expect(resolveOgeColor({ indexed: 64 })).toBe('#000000');
    expect(resolveOgeColor({ indexed: 65 })).toBe('#FFFFFF');
    expect(resolveOgeColor({ indexed: 99 })).toBeNull();
    const palette = [...OGE_INDEXED_COLORS.slice(0, 64)];
    palette[10] = 'FF123456';
    expect(resolveOgeColor({ indexed: 10 }, { indexed: palette })).toBe(
      '#123456',
    );
    expect(resolveOgeColor({ indexed: 65 }, { indexed: palette })).toBe(
      '#FFFFFF',
    );
  });

  it('resolves automatic colours by context', () => {
    expect(resolveOgeColor({ auto: true })).toBe('#000000');
    expect(resolveOgeColor({ auto: true }, { auto: 'FFFFFF' })).toBe('#FFFFFF');
    expect(resolveOgeColor({})).toBeNull();
  });
});

describe('tint', () => {
  // Excel's theme picker tints ("Background 1, Darker 5%" …) and the colours
  // Excel paints for them with the Office 2013–2022 theme. Excel's integer
  // rounding is not public, so the spec formula is held to 2/255 per channel.
  it.each([
    ['FFFFFF', -0.0499893185216834, 'F2F2F2'],
    ['FFFFFF', -0.149998474074526, 'D9D9D9'],
    ['FFFFFF', -0.249977111117893, 'BFBFBF'],
    ['FFFFFF', -0.349986266670736, 'A6A6A6'],
    ['000000', 0.349986266670736, '595959'],
    ['000000', 0.249977111117893, '404040'],
    ['000000', 0.0499893185216834, '0D0D0D'],
    ['4472C4', 0.799981688894314, 'D9E1F2'],
    ['4472C4', 0.599993896298105, 'B4C6E7'],
    ['4472C4', 0.399975585192419, '8EA9DB'],
    ['4472C4', -0.249977111117893, '2F5597'],
    ['4472C4', -0.499984740745262, '203864'],
    ['ED7D31', 0.799981688894314, 'FCE4D6'],
    ['A5A5A5', 0.799981688894314, 'EDEDED'],
    ['FFC000', 0.799981688894314, 'FFF2CC'],
    ['70AD47', 0.799981688894314, 'E2EFDA'],
    ['5B9BD5', 0.799981688894314, 'DDEBF7'],
    ['70AD47', -0.499984740745262, '375623'],
  ])('%s with tint %d is close to %s', (base, tint, expected) => {
    expect(distance(ogeApplyTint(base, tint), expected)).toBeLessThanOrEqual(2);
  });

  it('applies the tint during resolution and leaves bad input alone', () => {
    expect(
      distance(
        resolveOgeColor({ theme: 0, tint: -0.149998474074526 }) ?? '',
        'D9D9D9',
      ),
    ).toBeLessThanOrEqual(1);
    expect(ogeApplyTint('xyz', 0.5)).toBe('xyz');
    expect(ogeApplyTint('808080', 2)).toBe('FFFFFF'); // clamped to +1
    expect(ogeApplyTint('808080', -2)).toBe('000000');
  });
});
