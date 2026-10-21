/**
 * Column widths and row heights in Excel's units.
 *
 * - **Column widths** are stored in "characters of the maximum digit width"
 *   (MDW: the widest of `0`–`9` in the workbook's Normal-style font, 7 px for
 *   Calibri 11 at 96 dpi), padded by 2 × ceil(MDW / 4) + 1 px (5 for Calibri 11,
 *   measured in Excel) and truncated to 1/256 of a
 *   character (ECMA-376 §18.3.1.13). The UI shows a different number: the
 *   default column is "8.43" in the column-width dialog, `width="9.140625"`
 *   in the file and 64 px on screen.
 * - **Row heights** are points (1/72 in); at 96 dpi a point is 4/3 px, so
 *   Excel's default 15 pt row is 20 px.
 */

import { ogeColumnPadding } from './font-metrics';

/** Maximum digit width of Calibri 11 at 96 dpi, Excel's default Normal font. */
export const OGE_DEFAULT_MAX_DIGIT_WIDTH = 7;

/** Excel's default row height, in points (Calibri 11). */
export const OGE_DEFAULT_ROW_HEIGHT_POINTS = 15;

/** `sheetFormatPr/@baseColWidth` when a sheet does not state it. */
export const OGE_DEFAULT_BASE_COLUMN_WIDTH = 8;

/** Screen pixels of a stored column width (`<col width>`). Hidden = 0. */
export function ogeColumnWidthToPixels(
  width: number,
  maxDigitWidth = OGE_DEFAULT_MAX_DIGIT_WIDTH,
): number {
  if (!(width > 0)) return 0;
  return Math.trunc(
    ((256 * width + Math.trunc(128 / maxDigitWidth)) / 256) * maxDigitWidth,
  );
}

/**
 * The column-width dialog's number ("8.43") for a pixel width: characters
 * of MDW after the padding, rounded to 1/100.
 */
export function ogePixelsToColumnCharacters(
  pixels: number,
  maxDigitWidth = OGE_DEFAULT_MAX_DIGIT_WIDTH,
): number {
  const padding = ogeColumnPadding(maxDigitWidth);
  if (!(pixels > padding)) return 0;
  return Math.trunc(((pixels - padding) / maxDigitWidth) * 100 + 0.5) / 100;
}

/** The stored width (`<col width>`) for a dialog width in characters. */
export function ogeColumnCharactersToWidth(
  characters: number,
  maxDigitWidth = OGE_DEFAULT_MAX_DIGIT_WIDTH,
): number {
  if (!(characters > 0)) return 0;
  const padding = ogeColumnPadding(maxDigitWidth);
  return (
    Math.trunc(((characters * maxDigitWidth + padding) / maxDigitWidth) * 256) /
    256
  );
}

/** The stored width (`<col width>`) that paints `pixels` wide. */
export function ogePixelsToColumnWidth(
  pixels: number,
  maxDigitWidth = OGE_DEFAULT_MAX_DIGIT_WIDTH,
): number {
  return ogeColumnCharactersToWidth(
    ogePixelsToColumnCharacters(pixels, maxDigitWidth),
    maxDigitWidth,
  );
}

/** The column-width dialog's number for a stored width. */
export function ogeColumnWidthToCharacters(
  width: number,
  maxDigitWidth = OGE_DEFAULT_MAX_DIGIT_WIDTH,
): number {
  return ogePixelsToColumnCharacters(
    ogeColumnWidthToPixels(width, maxDigitWidth),
    maxDigitWidth,
  );
}

/**
 * Pixel width of a column with no `<col>` entry, from `baseColWidth`
 * (characters, default 8): the characters plus the padding (margins and
 * gridline, {@link ogeColumnPadding}), rounded up to a multiple of 8 px as
 * Excel does — 64 px for the default sheet. A sheet's explicit `defaultColWidth` is a stored width instead;
 * convert that with {@link ogeColumnWidthToPixels}.
 */
export function ogeDefaultColumnWidthPixels(
  baseColumnWidth = OGE_DEFAULT_BASE_COLUMN_WIDTH,
  maxDigitWidth = OGE_DEFAULT_MAX_DIGIT_WIDTH,
): number {
  const raw = Math.trunc(
    baseColumnWidth * maxDigitWidth + ogeColumnPadding(maxDigitWidth),
  );
  return Math.ceil(raw / 8) * 8;
}

/** Pixels for a height or size in points (rounded to whole pixels). */
export function ogePointsToPixels(points: number, dpi = 96): number {
  if (!(points > 0)) return 0;
  return Math.round((points * dpi) / 72);
}

/** Points for a pixel height, to Excel's 1/4-point step at 96 dpi. */
export function ogePixelsToPoints(pixels: number, dpi = 96): number {
  if (!(pixels > 0)) return 0;
  return Math.round(((pixels * 72) / dpi) * 4) / 4;
}
