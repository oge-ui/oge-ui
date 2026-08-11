import {
  colorsEqual,
  contrastForeground,
  formatColor,
  hsvaToRgba,
  normalizeColor,
  parseColor,
  relativeLuminance,
  rgbaToHsva,
} from './color-math';

describe('parseColor', () => {
  it('parses 6-digit hex', () => {
    expect(parseColor('#3aa0ff')).toEqual({ r: 58, g: 160, b: 255, a: 1 });
  });

  it('parses 3-digit hex by doubling digits', () => {
    expect(parseColor('#f80')).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it('parses 8-digit hex with alpha', () => {
    expect(parseColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
  });

  it('parses 4-digit hex with alpha', () => {
    expect(parseColor('#f008')).toEqual({ r: 255, g: 0, b: 0, a: 0.53 });
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(parseColor('  #FF0000  ')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('parses comma rgb()', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it('parses comma rgba() with fractional alpha', () => {
    expect(parseColor('rgba(255, 0, 0, 0.25)')).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 0.25,
    });
  });

  it('parses space/slash rgb() syntax', () => {
    expect(parseColor('rgb(255 0 0 / 50%)')).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 0.5,
    });
  });

  it('parses percentage rgb channels', () => {
    expect(parseColor('rgb(100%, 0%, 50%)')).toEqual({
      r: 255,
      g: 0,
      b: 128,
      a: 1,
    });
  });

  it('clamps out-of-range channels', () => {
    expect(parseColor('rgb(300, -5, 12)')).toEqual({
      r: 255,
      g: 0,
      b: 12,
      a: 1,
    });
  });

  it('parses hsl()', () => {
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual({
      r: 0,
      g: 255,
      b: 0,
      a: 1,
    });
  });

  it('parses hsla() and space syntax', () => {
    expect(parseColor('hsla(0, 100%, 50%, 0.5)')).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 0.5,
    });
    expect(parseColor('hsl(240 100% 50% / 25%)')).toEqual({
      r: 0,
      g: 0,
      b: 255,
      a: 0.25,
    });
  });

  it('parses CSS named colors and transparent', () => {
    expect(parseColor('rebeccapurple')).toEqual({
      r: 102,
      g: 51,
      b: 153,
      a: 1,
    });
    expect(parseColor('White')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('returns null for garbage', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor('   ')).toBeNull();
    expect(parseColor('#12345')).toBeNull();
    expect(parseColor('#gggggg')).toBeNull();
    expect(parseColor('rgb(1,2)')).toBeNull();
    expect(parseColor('notacolor')).toBeNull();
    expect(parseColor('rgb 1 2 3')).toBeNull();
  });
});

describe('rgbaToHsva / hsvaToRgba', () => {
  it('converts primaries', () => {
    expect(rgbaToHsva({ r: 255, g: 0, b: 0, a: 1 })).toEqual({
      h: 0,
      s: 100,
      v: 100,
      a: 1,
    });
    expect(rgbaToHsva({ r: 0, g: 255, b: 0, a: 1 })).toEqual({
      h: 120,
      s: 100,
      v: 100,
      a: 1,
    });
    expect(rgbaToHsva({ r: 0, g: 0, b: 255, a: 1 })).toEqual({
      h: 240,
      s: 100,
      v: 100,
      a: 1,
    });
  });

  it('keeps h at 0 for grayscale (s or v zero)', () => {
    expect(rgbaToHsva({ r: 0, g: 0, b: 0, a: 1 })).toEqual({
      h: 0,
      s: 0,
      v: 0,
      a: 1,
    });
    expect(rgbaToHsva({ r: 128, g: 128, b: 128, a: 0.5 })).toEqual({
      h: 0,
      s: 0,
      v: 50.2,
      a: 0.5,
    });
  });

  it('treats h=360 as h=0', () => {
    expect(hsvaToRgba({ h: 360, s: 100, v: 100, a: 1 })).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 1,
    });
  });

  it('round-trips channel values', () => {
    const samples = [
      { r: 58, g: 160, b: 255, a: 1 },
      { r: 12, g: 200, b: 100, a: 0.4 },
      { r: 250, g: 250, b: 5, a: 1 },
      { r: 1, g: 2, b: 3, a: 0.01 },
    ];
    for (const rgba of samples) {
      const back = hsvaToRgba(rgbaToHsva(rgba));
      expect(Math.abs(back.r - rgba.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - rgba.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - rgba.b)).toBeLessThanOrEqual(1);
      expect(back.a).toBe(rgba.a);
    }
  });
});

describe('formatColor', () => {
  const red = { r: 255, g: 0, b: 0, a: 1 };
  const redHalf = { r: 255, g: 0, b: 0, a: 0.5 };

  it('formats opaque hex lowercase', () => {
    expect(formatColor(red, 'hex', true)).toBe('#ff0000');
  });

  it('widens hex to #rrggbbaa only when alpha < 1 and included', () => {
    expect(formatColor(redHalf, 'hex', true)).toBe('#ff000080');
    expect(formatColor(redHalf, 'hex', false)).toBe('#ff0000');
  });

  it('formats rgb and widens to rgba on translucent alpha', () => {
    expect(formatColor(red, 'rgb', true)).toBe('rgb(255, 0, 0)');
    expect(formatColor(redHalf, 'rgb', true)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('formats rgba even when opaque', () => {
    expect(formatColor(red, 'rgba', true)).toBe('rgba(255, 0, 0, 1)');
  });

  it('formats hsl / hsla with integer rounding', () => {
    expect(formatColor({ r: 0, g: 255, b: 0, a: 1 }, 'hsl', true)).toBe(
      'hsl(120, 100%, 50%)',
    );
    expect(formatColor(redHalf, 'hsl', true)).toBe('hsla(0, 100%, 50%, 0.5)');
  });
});

describe('normalizeColor', () => {
  it('parses and reformats in one step', () => {
    expect(normalizeColor('RED', 'hex', true)).toBe('#ff0000');
    expect(normalizeColor('rgb(255,0,0)', 'rgba', true)).toBe(
      'rgba(255, 0, 0, 1)',
    );
  });

  it('returns null for unparseable text', () => {
    expect(normalizeColor('nope', 'hex', true)).toBeNull();
  });
});

describe('relativeLuminance / contrastForeground', () => {
  it('computes the WCAG anchors', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0, a: 1 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(1);
  });

  it('picks white on dark colors, black on light ones', () => {
    expect(contrastForeground({ r: 0, g: 0, b: 0, a: 1 })).toBe('white');
    expect(contrastForeground({ r: 20, g: 40, b: 120, a: 1 })).toBe('white');
    expect(contrastForeground({ r: 255, g: 255, b: 255, a: 1 })).toBe('black');
    expect(contrastForeground({ r: 255, g: 230, b: 0, a: 1 })).toBe('black');
  });
});

describe('colorsEqual', () => {
  it('matches after integer rounding of channels and 2-decimal alpha', () => {
    expect(
      colorsEqual(
        { r: 10.4, g: 20, b: 30, a: 0.501 },
        { r: 10, g: 20, b: 30, a: 0.5 },
      ),
    ).toBe(true);
    expect(
      colorsEqual({ r: 10, g: 20, b: 30, a: 1 }, { r: 11, g: 20, b: 30, a: 1 }),
    ).toBe(false);
  });
});
