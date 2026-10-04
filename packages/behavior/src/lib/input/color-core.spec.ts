import { parseColor, rgbaToHsva } from '@oge-ui/core';
import {
  OGE_COLOR_PALETTE_PRESETS,
  applyColorChannelText,
  colorPaletteNavIndex,
  compositeColorOver,
  contrastLevels,
  contrastRatio,
} from './color-core';

const rgba = (text: string) => {
  const parsed = parseColor(text);
  if (!parsed) throw new Error(text);
  return parsed;
};

describe('color core — standalone components', () => {
  describe('contrastRatio', () => {
    it('is 21 for black on white and 1 for identical colors', () => {
      expect(contrastRatio(rgba('#000'), rgba('#fff'))).toBeCloseTo(21, 5);
      expect(contrastRatio(rgba('#fff'), rgba('#000'))).toBeCloseTo(21, 5);
      expect(contrastRatio(rgba('#777'), rgba('#777'))).toBeCloseTo(1, 5);
    });

    it('matches the WCAG reference value for #767676 on white', () => {
      // the classic "lightest gray passing AA" — 4.54:1
      expect(contrastRatio(rgba('#767676'), rgba('#fff'))).toBeCloseTo(4.54, 2);
    });

    it('composites a translucent foreground over the background first', () => {
      const half = rgba('rgba(0, 0, 0, 0.5)');
      expect(compositeColorOver(half, rgba('#fff'))).toEqual({
        r: 128,
        g: 128,
        b: 128,
        a: 1,
      });
      expect(contrastRatio(half, rgba('#fff'))).toBeCloseTo(
        contrastRatio(rgba('#808080'), rgba('#fff')),
        5,
      );
    });
  });

  describe('contrastLevels', () => {
    it('classifies against the AA / AAA thresholds', () => {
      expect(contrastLevels(21)).toEqual({
        ratio: 21,
        aa: true,
        aaLarge: true,
        aaa: true,
        aaaLarge: true,
      });
      expect(contrastLevels(3.2)).toMatchObject({
        aa: false,
        aaLarge: true,
        aaa: false,
      });
    });

    it('never rounds a failing ratio up into a pass', () => {
      const levels = contrastLevels(4.4999);
      expect(levels.aa).toBe(false);
      expect(levels.ratio).toBe(4.49);
    });
  });

  describe('applyColorChannelText', () => {
    const red = { ...rgbaToHsva(rgba('#ff0000')), a: 0.5 };

    it('applies a hex edit and keeps the working alpha', () => {
      const next = applyColorChannelText(red, 'hex', '#00ff00');
      expect(next).toMatchObject({ h: 120, s: 100, v: 100, a: 0.5 });
    });

    it('takes the alpha a hex edit spells', () => {
      const next = applyColorChannelText(red, 'hex', '#00ff0080');
      expect(next?.a).toBeCloseTo(0.5, 1);
      expect(applyColorChannelText(red, 'hex', '#00ff00ff')?.a).toBe(1);
    });

    it('clamps a channel edit and keeps alpha', () => {
      expect(applyColorChannelText(red, 'b', '999')).toMatchObject({
        a: 0.5,
        h: 300,
      });
      expect(applyColorChannelText(red, 'a', '150')?.a).toBe(1);
      expect(applyColorChannelText(red, 'a', '25')?.a).toBe(0.25);
    });

    it('returns null for unusable text (the caller reverts)', () => {
      expect(applyColorChannelText(red, 'hex', 'nope')).toBeNull();
      expect(applyColorChannelText(red, 'r', 'x')).toBeNull();
    });
  });

  describe('palette presets', () => {
    it('ship parseable colors that fill whole rows', () => {
      for (const [name, preset] of Object.entries(OGE_COLOR_PALETTE_PRESETS)) {
        for (const color of preset.colors) {
          expect(parseColor(color), `${name} ${color}`).not.toBeNull();
        }
        expect(preset.colors.length % preset.columns, name).toBe(0);
      }
    });
  });

  describe('colorPaletteNavIndex', () => {
    // 3 columns, 8 cells: rows [0 1 2] [3 4 5] [6 7]
    const nav = (key: string, index: number, rtl = false, ctrl = false) =>
      colorPaletteNavIndex(key, index, 8, 3, rtl, ctrl);

    it('moves by cell and by row without wrapping', () => {
      expect(nav('ArrowRight', 0)).toBe(1);
      expect(nav('ArrowDown', 1)).toBe(4);
      expect(nav('ArrowUp', 1)).toBeNull();
      expect(nav('ArrowDown', 5)).toBeNull();
      expect(nav('ArrowLeft', 0)).toBeNull();
      // row edges: no crossing into the next / previous row
      expect(nav('ArrowRight', 2)).toBeNull();
      expect(nav('ArrowLeft', 3)).toBeNull();
      expect(nav('ArrowRight', 7)).toBeNull();
    });

    it('mirrors the horizontal arrows in RTL', () => {
      expect(nav('ArrowRight', 1, true)).toBe(0);
      expect(nav('ArrowLeft', 1, true)).toBe(2);
    });

    it('jumps to row edges and, with Ctrl, to the grid corners', () => {
      expect(nav('Home', 4)).toBe(3);
      expect(nav('End', 6)).toBe(7);
      expect(nav('Home', 4, false, true)).toBe(0);
      expect(nav('End', 1, false, true)).toBe(7);
    });

    it('ignores other keys and empty grids', () => {
      expect(nav('a', 0)).toBeNull();
      expect(colorPaletteNavIndex('ArrowRight', 0, 0, 3, false, false)).toBe(
        null,
      );
    });
  });
});
