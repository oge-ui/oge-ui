/**
 * The grid frame both render layers draw (ADR 0005, P1): where each pane,
 * header strip and the select-all corner sit in the scroller's 3 × 3 CSS
 * grid, the pictures and notes placed over the panes, the pointer → cell
 * mapping, the sheet tabs' keys and the zoom slider's scale. Pure functions
 * over the viewport panes; the render layers bind the styles as they are.
 */
import type { OgeCellRef, OgeSheetRange } from '../address/address';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgePaintPicture } from '../paint/pictures';
import type { OgeSheetSelection } from './navigation';
import {
  ogeHeaderCells,
  ogeSelectionShapes,
  type OgeCss,
  type OgeHeaderCell,
  type OgePaneKey,
  type OgeRenderPane,
  type OgeSelectionShapes,
} from './render';
import { ogeCellAt, type OgeViewportPanes } from './viewport';

/** A strip of row or column headers: the scrolling part, or the frozen part over it. */
export interface OgeHeaderStrip {
  readonly key: 'scrolling' | 'frozen';
  readonly frozen: boolean;
  readonly style: OgeCss;
  readonly cells: readonly OgeHeaderCell[];
  /** The selection's marks over the cells (`ogeHeaderMarks`). */
  readonly marks: readonly OgeHeaderMark[];
}

/** A mark of the selection on a header strip, in the strip's pixels. */
export interface OgeHeaderMark {
  readonly key: string;
  /**
   * `edge`: the 2 px line toward the cells under a run of selected headers;
   * `separator`: the line just before the run, in the selected colour.
   */
  readonly kind: 'edge' | 'separator';
  readonly style: OgeCss;
}

/** A picture placed in a pane: its frame (the crop window, turned and flipped) and the image inside it. */
export interface OgePanePicture {
  readonly key: string;
  readonly url: string;
  readonly alt: string;
  readonly frame: OgeCss;
  readonly image: OgeCss;
}

/** A pane with what is drawn over its cells. */
export interface OgeGridPane {
  readonly pane: OgeRenderPane;
  readonly style: OgeCss;
  readonly selection: OgeSelectionShapes;
  readonly pictures: readonly OgePanePicture[];
}

/** The grid's layout for one frame: the panes with their render models, the headers and the corner. */
export interface OgeGridView {
  readonly panes: OgeViewportPanes;
  readonly render: readonly OgeGridPane[];
  /** The scroller's content: the whole sheet's size and the 3 × 3 grid's tracks. */
  readonly sizer: OgeCss;
  readonly columnHeaders: readonly OgeHeaderStrip[];
  readonly rowHeaders: readonly OgeHeaderStrip[];
  /** The select-all corner. */
  readonly corner: OgeCss;
  /** The header labels' font: the Normal style's, one Normal row tall (longhands). */
  readonly headerFont: OgeCss;
}

/** What `ogeGridView` composes. */
export interface OgeGridViewInput {
  readonly panes: OgeViewportPanes;
  /** The panes' render models (`OgeSpreadsheetCore.render`). */
  readonly render: readonly OgeRenderPane[];
  readonly sheet: OgeWorksheet;
  readonly selection: OgeSheetSelection;
  /** The dynamic array the active cell is in, framed as Excel frames a spill. */
  readonly spill: OgeSheetRange | null;
  /** The pictures of each pane (`ogePanePictures`). */
  readonly pictures: ReadonlyMap<OgePaneKey, readonly OgePanePicture[]>;
  /** The Normal style's CSS font family. */
  readonly fontFamily: string;
  /** Draws the selection's fill handle (an editor); a viewer has none. */
  readonly fillHandle?: boolean;
}

/** A note shown over the grid. */
export interface OgeNoteBox {
  readonly key: string;
  readonly row: number;
  readonly col: number;
  /** The note's text: Excel's own author line is its first, bold run. */
  readonly runs: readonly OgeNoteRun[];
  /** Where it opens, from the grid's start edge (`insetInlineStart`, `top`). */
  readonly style: OgeCss;
}

/** A run of a note's text. */
export interface OgeNoteRun {
  readonly text: string;
  readonly bold: boolean;
  readonly italic: boolean;
}

/** A header a pointer went down on (`ogeGridHeaderAt` reads it from the event target). */
export type OgeGridHeaderTarget =
  | { readonly kind: 'select-all' }
  | { readonly kind: 'row-header'; readonly row: number }
  | { readonly kind: 'column-header'; readonly col: number };

/** A scroller's scroll offsets (`scrollLeft` may be negative in a right-to-left scroller). */
export interface OgeScrollPosition {
  readonly scrollTop: number;
  readonly scrollLeft: number;
}

/** A pointer over the grid, in viewport coordinates, with the scroller under it. */
export interface OgeGridPointerPoint extends OgeScrollPosition {
  readonly clientX: number;
  readonly clientY: number;
  /** The scroller's bounding rectangle. */
  readonly rect: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
  };
}

const px = (value: number) => `${value}px`;

/** Where a pane sits in the sizer's 3 × 3 grid, and how it sticks. */
export function ogePaneStyle(key: OgePaneKey, panes: OgeViewportPanes): OgeCss {
  const { rowHeaderWidth, columnHeaderHeight } = panes.headers;
  switch (key) {
    case 'main':
      return {
        gridRow: '3',
        gridColumn: '3',
        width: px(panes.scrollWidth),
        height: px(panes.scrollHeight),
      };
    case 'top':
      return {
        gridRow: '2 / 4',
        gridColumn: '3',
        alignSelf: 'start',
        width: px(panes.scrollWidth),
        height: px(panes.frozenHeight),
        position: 'sticky',
        top: px(columnHeaderHeight),
        zIndex: '2',
      };
    case 'left':
      return {
        gridRow: '3',
        gridColumn: '2 / 4',
        justifySelf: 'start',
        width: px(panes.frozenWidth),
        height: px(panes.scrollHeight),
        position: 'sticky',
        insetInlineStart: px(rowHeaderWidth),
        zIndex: '2',
      };
    case 'corner':
      return {
        gridRow: '2 / 4',
        gridColumn: '2 / 4',
        alignSelf: 'start',
        justifySelf: 'start',
        width: px(panes.frozenWidth),
        height: px(panes.frozenHeight),
        position: 'sticky',
        top: px(columnHeaderHeight),
        insetInlineStart: px(rowHeaderWidth),
        zIndex: '3',
      };
  }
}

/**
 * The selection's marks on a header strip, as the current Excel draws them
 * (measured in Excel for the web, 16.0.20611): under each run of selected
 * headers the 2 px edge toward the cells, as long as the selection frame
 * below it — one pixel past the separator on either end — and the separator
 * just before the run in the selected headers' colour. Whole rows and
 * columns draw their own fill. `depth` is the strip's height (columns) or
 * width (rows).
 */
export function ogeHeaderMarks(
  kind: 'rows' | 'columns',
  cells: readonly OgeHeaderCell[],
  depth: number,
): OgeHeaderMark[] {
  const marks: OgeHeaderMark[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].state !== 'selected') continue;
    const first = cells[i];
    let last = first;
    while (
      i + 1 < cells.length &&
      cells[i + 1].state === 'selected' &&
      cells[i + 1].offset === last.offset + last.size
    ) {
      last = cells[++i];
    }
    const start = first.offset - 2;
    const length = last.offset + last.size - first.offset + 3;
    const columns = kind === 'columns';
    marks.push(
      {
        key: `edge-${first.index}`,
        kind: 'edge',
        style: columns
          ? {
              left: px(start),
              top: px(depth - 2),
              width: px(length),
              height: '2px',
            }
          : {
              left: px(depth - 2),
              top: px(start),
              width: '2px',
              height: px(length),
            },
      },
      {
        key: `separator-${first.index}`,
        kind: 'separator',
        style: columns
          ? {
              left: px(first.offset - 1),
              top: '0',
              width: '1px',
              height: px(depth - 2),
            }
          : {
              left: '0',
              top: px(first.offset - 1),
              width: px(depth - 2),
              height: '1px',
            },
      },
    );
  }
  return marks;
}

/** The column and row header strips: the scrolling ones and, over frozen panes, the frozen ones. */
export function ogeHeaderStrips(
  panes: OgeViewportPanes,
  selection: OgeSheetSelection,
): {
  readonly columns: readonly OgeHeaderStrip[];
  readonly rows: readonly OgeHeaderStrip[];
} {
  const { rowHeaderWidth, columnHeaderHeight } = panes.headers;
  const columns: OgeHeaderStrip[] = [];
  const rows: OgeHeaderStrip[] = [];
  const strip = (
    kind: 'rows' | 'columns',
    key: OgeHeaderStrip['key'],
    style: OgeCss,
    cells: OgeHeaderCell[],
  ): OgeHeaderStrip => ({
    key,
    frozen: key === 'frozen',
    style,
    cells,
    marks: ogeHeaderMarks(
      kind,
      cells,
      kind === 'columns' ? columnHeaderHeight : rowHeaderWidth,
    ),
  });
  if (columnHeaderHeight > 0) {
    columns.push(
      strip(
        'columns',
        'scrolling',
        {
          gridRow: '1 / 4',
          gridColumn: '3',
          alignSelf: 'start',
          width: px(panes.scrollWidth),
          height: px(columnHeaderHeight),
          position: 'sticky',
          top: '0',
          zIndex: '4',
        },
        ogeHeaderCells(
          'columns',
          panes.axes,
          panes.cols,
          panes.originX,
          selection,
        ),
      ),
    );
    if (panes.frozenColumns > 0) {
      columns.push(
        strip(
          'columns',
          'frozen',
          {
            gridRow: '1 / 4',
            gridColumn: '2 / 4',
            alignSelf: 'start',
            justifySelf: 'start',
            width: px(panes.frozenWidth),
            height: px(columnHeaderHeight),
            position: 'sticky',
            top: '0',
            insetInlineStart: px(rowHeaderWidth),
            zIndex: '5',
          },
          ogeHeaderCells(
            'columns',
            panes.axes,
            panes.frozenColSpan,
            0,
            selection,
          ),
        ),
      );
    }
  }
  if (rowHeaderWidth > 0) {
    rows.push(
      strip(
        'rows',
        'scrolling',
        {
          gridRow: '3',
          gridColumn: '1 / 4',
          justifySelf: 'start',
          width: px(rowHeaderWidth),
          height: px(panes.scrollHeight),
          position: 'sticky',
          insetInlineStart: '0',
          zIndex: '4',
        },
        ogeHeaderCells(
          'rows',
          panes.axes,
          panes.rows,
          panes.originY,
          selection,
        ),
      ),
    );
    if (panes.frozenRows > 0) {
      rows.push(
        strip(
          'rows',
          'frozen',
          {
            gridRow: '2 / 4',
            gridColumn: '1 / 4',
            alignSelf: 'start',
            justifySelf: 'start',
            width: px(rowHeaderWidth),
            height: px(panes.frozenHeight),
            position: 'sticky',
            top: px(columnHeaderHeight),
            insetInlineStart: '0',
            zIndex: '5',
          },
          ogeHeaderCells('rows', panes.axes, panes.frozenRowSpan, 0, selection),
        ),
      );
    }
  }
  return { columns, rows };
}

/** The grid frame: each pane with its style, selection and pictures, the header strips, the sizer and the corner. */
export function ogeGridView(input: OgeGridViewInput): OgeGridView {
  const { panes, sheet, selection, spill } = input;
  const { rowHeaderWidth, columnHeaderHeight, fontPx } = panes.headers;
  const strips = ogeHeaderStrips(panes, selection);
  return {
    panes,
    render: input.render.map((pane) => ({
      pane,
      style: ogePaneStyle(pane.key, panes),
      selection: ogeSelectionShapes(sheet, panes.axes, selection, pane, spill, {
        fillHandle: input.fillHandle === true,
      }),
      pictures: input.pictures.get(pane.key) ?? [],
    })),
    sizer: {
      width: px(rowHeaderWidth + panes.frozenWidth + panes.scrollWidth),
      height: px(columnHeaderHeight + panes.frozenHeight + panes.scrollHeight),
      gridTemplateColumns: `${rowHeaderWidth}px ${panes.frozenWidth}px ${panes.scrollWidth}px`,
      gridTemplateRows: `${columnHeaderHeight}px ${panes.frozenHeight}px ${panes.scrollHeight}px`,
    },
    columnHeaders: strips.columns,
    rowHeaders: strips.rows,
    corner: {
      gridRow: '1 / 4',
      gridColumn: '1 / 4',
      alignSelf: 'start',
      justifySelf: 'start',
      width: px(rowHeaderWidth),
      height: px(columnHeaderHeight),
      position: 'sticky',
      top: '0',
      insetInlineStart: '0',
      zIndex: '6',
    },
    // a label's line box is one Normal-font row, as a cell's
    headerFont: {
      fontFamily: input.fontFamily,
      fontSize: px(fontPx),
      lineHeight: px(columnHeaderHeight),
    },
  };
}

/**
 * Places pictures in the pane holding their top-left corner, cropped,
 * turned and flipped. `url` gives a picture's image (`null` leaves it out);
 * a right-to-left pane is mirrored, so its pictures are mirrored back.
 */
export function ogePanePictures(
  pictures: readonly OgePaintPicture[],
  panes: OgeViewportPanes,
  options: {
    readonly rtl: boolean;
    readonly url: (picture: OgePaintPicture) => string | null;
  },
): ReadonlyMap<OgePaneKey, readonly OgePanePicture[]> {
  const byPane = new Map<OgePaneKey, OgePanePicture[]>();
  pictures.forEach((placed, index) => {
    const url = options.url(placed);
    if (!url) return;
    const inTop = placed.y < panes.originY;
    const inLeft = placed.x < panes.originX;
    const key: OgePaneKey = inTop
      ? inLeft
        ? 'corner'
        : 'top'
      : inLeft
        ? 'left'
        : 'main';
    const originX = key === 'main' || key === 'top' ? panes.originX : 0;
    const originY = key === 'main' || key === 'left' ? panes.originY : 0;
    const { crop, rotation, flipH, flipV } = placed.picture;
    const mirrored = options.rtl !== !!flipH;
    const transforms = [
      rotation ? `rotate(${rotation}deg)` : '',
      mirrored ? 'scaleX(-1)' : '',
      flipV ? 'scaleY(-1)' : '',
    ].filter(Boolean);
    const visibleX = 1 - (crop?.left ?? 0) - (crop?.right ?? 0);
    const visibleY = 1 - (crop?.top ?? 0) - (crop?.bottom ?? 0);
    const imageWidth = placed.width / Math.max(0.01, visibleX);
    const imageHeight = placed.height / Math.max(0.01, visibleY);
    const list = byPane.get(key) ?? [];
    list.push({
      key: `${index}:${placed.picture.image}`,
      url,
      alt: placed.picture.description ?? placed.picture.name ?? '',
      frame: {
        left: px(placed.x - originX),
        top: px(placed.y - originY),
        width: px(placed.width),
        height: px(placed.height),
        ...(transforms.length ? { transform: transforms.join(' ') } : {}),
      },
      image: {
        width: px(imageWidth),
        height: px(imageHeight),
        left: px(-(crop?.left ?? 0) * imageWidth),
        top: px(-(crop?.top ?? 0) * imageHeight),
      },
    });
    byPane.set(key, list);
  });
  return byPane;
}

/**
 * The notes to show — those pinned open in the file, plus `open` (the one
 * under the pointer, the one opened with Shift+F2) — beside their cell's
 * top-right corner, as Excel opens a note.
 */
export function ogeNoteBoxes(
  sheet: OgeWorksheet,
  panes: OgeViewportPanes,
  open: readonly (OgeCellRef | null)[],
  scroll: OgeScrollPosition,
): OgeNoteBox[] {
  const shown = new Map<string, OgeCellRef>();
  for (const { row, col, note } of sheet.notes()) {
    if (note.visible) shown.set(`${row}:${col}`, { row, col });
  }
  for (const at of open) {
    if (at && sheet.getNote(at.row, at.col))
      shown.set(`${at.row}:${at.col}`, { row: at.row, col: at.col });
  }
  const { rows, cols } = panes.axes;
  const out: OgeNoteBox[] = [];
  for (const [key, { row, col }] of shown) {
    const note = sheet.getNote(row, col);
    if (!note) continue;
    const frozenRow = row < panes.frozenRows;
    const frozenCol = col < panes.frozenColumns;
    const x =
      cols.offset(col + 1) -
      (frozenCol
        ? 0
        : panes.originX + Math.abs(scroll.scrollLeft) - panes.frozenWidth) +
      panes.headers.rowHeaderWidth +
      10;
    const y =
      rows.offset(row) -
      (frozenRow ? 0 : panes.originY + scroll.scrollTop - panes.frozenHeight) +
      panes.headers.columnHeaderHeight -
      6;
    const runs =
      typeof note.text === 'string'
        ? [{ text: note.text, bold: false, italic: false }]
        : note.text.runs.map((run) => ({
            text: run.text,
            bold: !!run.font?.bold,
            italic: !!run.font?.italic,
          }));
    out.push({
      key,
      row,
      col,
      runs,
      style: { insetInlineStart: px(Math.max(0, x)), top: px(Math.max(0, y)) },
    });
  }
  return out;
}

/**
 * The cell under a pointer, from the pane it is over; `null` over the
 * headers or past the cells — or, with `nearest` (a drag), the closest
 * visible cell. A right-to-left sheet's grid starts at the scroller's right edge.
 */
export function ogePointerCell(
  sheet: OgeWorksheet,
  panes: OgeViewportPanes,
  pointer: OgeGridPointerPoint,
  nearest = false,
): OgeCellRef | null {
  const fromStart = sheet.view.rightToLeft
    ? pointer.rect.right - pointer.clientX
    : pointer.clientX - pointer.rect.left;
  let x = fromStart - panes.headers.rowHeaderWidth;
  let y = pointer.clientY - pointer.rect.top - panes.headers.columnHeaderHeight;
  if (panes.cellWidth <= 0 || panes.cellHeight <= 0) return null;
  if (nearest) {
    x = Math.max(0, Math.min(panes.cellWidth - 1, x));
    y = Math.max(0, Math.min(panes.cellHeight - 1, y));
  }
  if (x < 0 || y < 0 || x >= panes.cellWidth || y >= panes.cellHeight)
    return null;
  const sheetX =
    x < panes.frozenWidth
      ? x
      : x - panes.frozenWidth + panes.originX + Math.abs(pointer.scrollLeft);
  const sheetY =
    y < panes.frozenHeight
      ? y
      : y - panes.frozenHeight + panes.originY + pointer.scrollTop;
  return ogeCellAt(sheet, panes.axes, sheetX, sheetY);
}

/** The zoom slider's position (0–200) for a zoom (10–400%): Excel's slider has 100% in the middle. */
export function ogeZoomToSlider(zoom: number): number {
  return zoom <= 100
    ? Math.round((zoom - 10) / 0.9)
    : Math.round(100 + (zoom - 100) / 3);
}

/** The zoom (10–400%) at a zoom slider position (0–200). */
export function ogeSliderToZoom(value: number): number {
  return value <= 100
    ? Math.round(10 + value * 0.9)
    : Math.round(100 + (value - 100) * 3);
}

/**
 * The sheet a key moves to from the tab strip — the arrow keys (mirrored on
 * a right-to-left page), Home and End; `null` for other keys.
 */
export function ogeTabKeyTarget(
  tabs: readonly { readonly index: number }[],
  active: number,
  key: string,
  rtl: boolean,
): number | null {
  if (!tabs.length) return null;
  const at = tabs.findIndex((tab) => tab.index === active);
  let next = -1;
  if (key === (rtl ? 'ArrowLeft' : 'ArrowRight'))
    next = Math.min(tabs.length - 1, at + 1);
  else if (key === (rtl ? 'ArrowRight' : 'ArrowLeft'))
    next = Math.max(0, at - 1);
  else if (key === 'Home') next = 0;
  else if (key === 'End') next = tabs.length - 1;
  return next < 0 ? null : tabs[next].index;
}
