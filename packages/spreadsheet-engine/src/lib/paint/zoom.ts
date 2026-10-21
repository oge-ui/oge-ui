/**
 * The paint model at a zoom. Excel keeps the decisions it made for the
 * unzoomed sheet (`####`, spill, fitting) but draws every row and column at
 * its own whole-pixel zoomed size ({@link OgeSheetLayout.zoomed}) and every
 * font at the zoomed pixel size; the text margin, indent and line placement
 * follow the zoomed fonts' metrics.
 */
import { ogeFontMetrics, ogeFontPixelSize } from '../metrics/font-metrics';
import type { OgeAxis } from './axis';
import {
  ogeFontDescent,
  ogeFontLine,
  ogeIndentPixels,
  ogeLineTop,
  ogeTextMargin,
  type OgePaintCell,
} from './paint-window';
import type { OgePaintPicture } from './pictures';
import type { OgePaintFont } from './resolve-style';
import type { OgeSheetLayout } from './sheet-layout';

const zoomedFonts = new WeakMap<OgePaintFont, Map<number, OgePaintFont>>();

/** A paint font at a zoom (percent): the zoomed pixel size and that size's metrics. */
export function ogeZoomFont(font: OgePaintFont, zoom: number): OgePaintFont {
  if (zoom === 100) return font;
  let byZoom = zoomedFonts.get(font);
  if (!byZoom) {
    byZoom = new Map();
    zoomedFonts.set(font, byZoom);
  }
  const known = byZoom.get(zoom);
  if (known) return known;
  const points = (font.sizePt * zoom) / 100;
  const px = ogeFontPixelSize(points);
  const metrics = ogeFontMetrics(font.name, points);
  const drawn = font.vertAlign ? Math.round(px * 0.66 * 100) / 100 : px;
  const zoomed: OgePaintFont = {
    ...font,
    sizePx: px,
    css: `${font.italic ? 'italic ' : ''}${font.bold ? 'bold ' : ''}${drawn}px ${font.family}`,
    maxDigitWidth: metrics.maxDigitWidth,
    lineHeight: metrics.lineHeight,
  };
  byZoom.set(zoom, zoomed);
  return zoomed;
}

/**
 * An unzoomed sheet offset at the zoom: exact on row and column
 * boundaries, proportional inside a row or column.
 */
export function ogeZoomOffset(
  base: OgeAxis,
  zoomed: OgeAxis,
  offset: number,
): number {
  const index = base.indexAt(offset);
  const inside = offset - base.offset(index);
  const size = base.size(index);
  return (
    zoomed.offset(index) + (size > 0 ? (inside * zoomed.size(index)) / size : 0)
  );
}

/** Paint cells (from `ogePaintWindow`) at a zoom (percent). */
export function ogeZoomPaint(
  cells: readonly OgePaintCell[],
  layout: OgeSheetLayout,
  zoom: number,
): readonly OgePaintCell[] {
  if (zoom === 100) return cells;
  const { rows, cols } = layout.zoomed(zoom);
  const factor = zoom / 100;
  const normal = ogeZoomFont(layout.normalFont, zoom);
  const margin = ogeTextMargin(normal.maxDigitWidth);
  const indentStep = ogeIndentPixels(normal.maxDigitWidth);
  return cells.map((cell) => {
    const range = cell.merge ?? {
      top: cell.row,
      left: cell.col,
      bottom: cell.row,
      right: cell.col,
    };
    const x = cols.offset(range.left);
    const y = rows.offset(range.top);
    const width = cols.offset(range.right + 1) - x;
    const height = rows.offset(range.bottom + 1) - y;
    const font = ogeZoomFont(cell.font, zoom);
    // the line box at the zoom: the zoomed font's, or a rich text's tallest run scaled along
    const own = ogeFontLine(cell.font);
    const lineHeight =
      cell.lineHeight === own
        ? ogeFontLine(font)
        : Math.round((cell.lineHeight * ogeFontLine(font)) / Math.max(1, own));
    const ownDescent =
      Math.round((lineHeight - ogeFontLine(font)) / 5) + ogeFontDescent(font);
    return {
      ...cell,
      x,
      y,
      width,
      height,
      font,
      clipLeft: ogeZoomOffset(layout.cols, cols, cell.clipLeft),
      clipRight: ogeZoomOffset(layout.cols, cols, cell.clipRight),
      ...(cell.textWidth !== undefined
        ? { textWidth: cell.textWidth * factor }
        : {}),
      inset: margin + cell.style.indent * indentStep,
      margin,
      lineHeight,
      lineTop:
        cell.rowDescent !== undefined
          ? Math.max(
              0,
              height -
                Math.max(Math.round(cell.rowDescent * factor), ownDescent) -
                lineHeight +
                ownDescent,
            )
          : ogeLineTop(
              cell.style.vertical,
              height,
              lineHeight * (cell.lines?.length ?? 1),
            ),
    };
  });
}

/** Pictures (from `ogePlacePictures`) at a zoom (percent): their corners follow the zoomed cells. */
export function ogeZoomPictures(
  pictures: readonly OgePaintPicture[],
  layout: OgeSheetLayout,
  zoom: number,
): readonly OgePaintPicture[] {
  if (zoom === 100) return pictures;
  const { rows, cols } = layout.zoomed(zoom);
  return pictures.map((placed) => {
    const x = ogeZoomOffset(layout.cols, cols, placed.x);
    const y = ogeZoomOffset(layout.rows, rows, placed.y);
    const right = ogeZoomOffset(layout.cols, cols, placed.x + placed.width);
    const bottom = ogeZoomOffset(layout.rows, rows, placed.y + placed.height);
    return { ...placed, x, y, width: right - x, height: bottom - y };
  });
}
