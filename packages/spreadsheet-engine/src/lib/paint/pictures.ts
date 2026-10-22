/**
 * Where a sheet's pictures paint, in sheet pixels at 100% zoom. A picture
 * anchored to two cells stretches with them (it shrinks when rows between
 * its corners are hidden, as in Excel); one anchored to a cell moves with
 * it and keeps its size; an absolute one stays put.
 */
import type { OgeSheetChart } from '../model/chart';
import type {
  OgePicture,
  OgePictureAnchor,
  OgePictureCorner,
} from '../model/sheet-features';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeSheetLayout } from './sheet-layout';

/** A box in sheet pixels. */
export interface OgePaintBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A picture with its box. */
export interface OgePaintPicture extends OgePaintBox {
  readonly picture: OgePicture;
}

/** A chart with its box. */
export interface OgePaintChart extends OgePaintBox {
  readonly chart: OgeSheetChart;
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

/** Where an anchor puts its object, in sheet pixels at 100% zoom. */
export function ogeAnchorBox(
  layout: OgeSheetLayout,
  anchor: OgePictureAnchor,
): OgePaintBox {
  if ('x' in anchor) {
    return {
      x: anchor.x,
      y: anchor.y,
      width: anchor.width,
      height: anchor.height,
    };
  }
  const from = point(layout, anchor.from);
  if ('to' in anchor) {
    const to = point(layout, anchor.to);
    return {
      x: from.x,
      y: from.y,
      width: to.x - from.x,
      height: to.y - from.y,
    };
  }
  return { x: from.x, y: from.y, width: anchor.width, height: anchor.height };
}

/** The boxes of a sheet's visible pictures. */
export function ogePlacePictures(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
): OgePaintPicture[] {
  const out: OgePaintPicture[] = [];
  for (const picture of sheet.pictures) {
    if (picture.hidden) continue;
    const box = ogeAnchorBox(layout, picture.anchor);
    if (box.width <= 0 || box.height <= 0) continue;
    out.push({ picture, ...box });
  }
  return out;
}

/** The boxes of a sheet's visible charts — anchored as pictures are. */
export function ogePlaceCharts(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
): OgePaintChart[] {
  const out: OgePaintChart[] = [];
  for (const chart of sheet.charts) {
    if (chart.hidden) continue;
    const box = ogeAnchorBox(layout, chart.anchor);
    if (box.width <= 0 || box.height <= 0) continue;
    out.push({ chart, ...box });
  }
  return out;
}
