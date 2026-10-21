import fc from 'fast-check';
import {
  OGE_DEFAULT_ROW_HEIGHT_POINTS,
  ogeColumnCharactersToWidth,
  ogeColumnWidthToCharacters,
  ogeColumnWidthToPixels,
  ogeDefaultColumnWidthPixels,
  ogePixelsToColumnCharacters,
  ogePixelsToColumnWidth,
  ogePixelsToPoints,
  ogePointsToPixels,
} from './sheet-metrics';

describe('column widths', () => {
  it("reproduces Excel's default column: 8.43 characters, width 9.140625, 64 px", () => {
    expect(ogeColumnCharactersToWidth(8.43)).toBe(9.140625);
    expect(ogeColumnWidthToPixels(9.140625)).toBe(64);
    expect(ogePixelsToColumnCharacters(64)).toBe(8.43);
    expect(ogePixelsToColumnWidth(64)).toBe(9.140625);
    expect(ogeColumnWidthToCharacters(9.140625)).toBe(8.43);
    expect(ogeDefaultColumnWidthPixels()).toBe(64);
  });

  it.each([
    // dialog characters → stored width → pixels, Calibri 11 (MDW 7)
    [1, 1.7109375, 12],
    [10, 10.7109375, 75],
    [20, 20.7109375, 145],
    [50.71, 51.421875, 360],
  ])('%d characters store as %d and paint %i px', (chars, width, px) => {
    expect(ogeColumnCharactersToWidth(chars)).toBe(width);
    expect(ogeColumnWidthToPixels(width)).toBe(px);
  });

  it('scales with the maximum digit width of the Normal font', () => {
    // Calibri 12 on a Mac (MDW 8): the default column grows to 72 px
    expect(ogeDefaultColumnWidthPixels(8, 8)).toBe(72);
    expect(ogeColumnWidthToPixels(9.140625, 8)).toBe(73);
  });

  it('treats hidden and zero widths as zero pixels', () => {
    expect(ogeColumnWidthToPixels(0)).toBe(0);
    expect(ogeColumnWidthToPixels(-3)).toBe(0);
    expect(ogeColumnWidthToPixels(Number.NaN)).toBe(0);
    expect(ogePixelsToColumnCharacters(5)).toBe(0);
    expect(ogeColumnCharactersToWidth(0)).toBe(0);
  });

  it('keeps a pixel width stable through a store-and-reload cycle', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 2000 }), (px) => {
        expect(ogeColumnWidthToPixels(ogePixelsToColumnWidth(px))).toBe(px);
      }),
    );
  });
});

describe('row heights', () => {
  it('converts points at 96 dpi', () => {
    expect(ogePointsToPixels(OGE_DEFAULT_ROW_HEIGHT_POINTS)).toBe(20);
    expect(ogePointsToPixels(12.75)).toBe(17);
    expect(ogePointsToPixels(409.5)).toBe(546); // Excel's maximum row height
    expect(ogePixelsToPoints(20)).toBe(15);
    expect(ogePixelsToPoints(17)).toBe(12.75);
    expect(ogePointsToPixels(0)).toBe(0);
    expect(ogePixelsToPoints(-1)).toBe(0);
  });

  it('follows the dpi', () => {
    expect(ogePointsToPixels(15, 144)).toBe(30);
    expect(ogePixelsToPoints(30, 144)).toBe(15);
  });
});
