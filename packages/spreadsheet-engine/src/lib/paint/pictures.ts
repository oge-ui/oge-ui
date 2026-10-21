/**
 * Where a sheet's pictures paint, in sheet pixels at 100% zoom. A picture
 * anchored to two cells stretches with them (it shrinks when rows between
 * its corners are hidden, as in Excel); one anchored to a cell moves with
 * it and keeps its size; an absolute one stays put.
 */
import type { OgePicture, OgePictureCorner } from '../model/sheet-features';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeSheetLayout } from './sheet-layout';

/** A picture with its box. */
export interface OgePaintPicture {
  readonly picture: OgePicture;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function point(
  layout: OgeSheetLayout,
  corner: OgePictureCorner,
): { x: number; y: number } {
  const { rows, cols } = layout;
  // an offset never reaches past its own cell (a hidden cell has none)
  return {
    x:
      cols.offset(corner.col) +
      Math.min(corner.colOffset, cols.size(corner.col)),
    y:
      rows.offset(corner.row) +
      Math.min(corner.rowOffset, rows.size(corner.row)),
  };
}

/** The boxes of a sheet's visible pictures. */
export function ogePlacePictures(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
): OgePaintPicture[] {
  const out: OgePaintPicture[] = [];
  for (const picture of sheet.pictures) {
    if (picture.hidden) continue;
    const anchor = picture.anchor;
    let box: { x: number; y: number; width: number; height: number };
    if ('x' in anchor) {
      box = {
        x: anchor.x,
        y: anchor.y,
        width: anchor.width,
        height: anchor.height,
      };
    } else if ('to' in anchor) {
      const from = point(layout, anchor.from);
      const to = point(layout, anchor.to);
      box = {
        x: from.x,
        y: from.y,
        width: to.x - from.x,
        height: to.y - from.y,
      };
    } else {
      const from = point(layout, anchor.from);
      box = {
        x: from.x,
        y: from.y,
        width: anchor.width,
        height: anchor.height,
      };
    }
    if (box.width <= 0 || box.height <= 0) continue;
    out.push({ picture, ...box });
  }
  return out;
}
