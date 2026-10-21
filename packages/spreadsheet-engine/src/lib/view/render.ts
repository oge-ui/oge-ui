/**
 * The render model of the spreadsheet: what each pane of the grid draws, as
 * plain data both render layers loop over (ADR 0003 — the render layers are
 * templates). Positions are in the pane's pixels at the zoom. Styles are
 * objects of camelCase CSS properties with string values, which Angular's
 * `[style]` and React's `style` both take as they are.
 *
 * Layers, bottom to top: gridlines, fills, text, borders, marks (data bars,
 * icons, note markers, AutoFilter buttons), then the selection and pictures.
 * Text paints above every fill, so text spilling over an empty neighbour
 * that has a fill shows on it, as in Excel.
 */
import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  ogeColumnName,
  type OgeSheetRange,
} from '../address/address';
import type { OgeTextRun } from '../model/cell';
import type { OgeWorksheet } from '../model/worksheet';
import {
  ogeBorderStrokes,
  ogeGridlinePath,
  type OgeStroke,
} from '../paint/draw';
import type { OgePaintCell } from '../paint/paint-window';
import type { OgePaintFont } from '../paint/resolve-style';
import type { OgeZoomedAxes } from '../paint/sheet-layout';
import type { OgeSheetSelection } from './navigation';
import type { OgeIndexSpan } from './viewport';

/** CSS properties, camelCase, string values. */
export type OgeCss = Readonly<Record<string, string>>;

/** The four panes of a sheet with frozen rows and columns. */
export type OgePaneKey = 'corner' | 'top' | 'left' | 'main';

/** A cell background. */
export interface OgeRenderFill {
  readonly key: string;
  readonly style: OgeCss;
}

/** A run of rich text, or a line of wrapped text. */
export interface OgeRenderSpan {
  readonly text: string;
  readonly style: OgeCss;
}

/** A cell's text. */
export interface OgeRenderText {
  readonly key: string;
  readonly row: number;
  readonly col: number;
  /** The clip box: the cell, or wider where the text spills. */
  readonly clip: OgeCss;
  /** The text box inside the clip box. */
  readonly style: OgeCss;
  /** One line of plain text… */
  readonly text: string | null;
  /** …or of rich text runs… */
  readonly runs: readonly OgeRenderSpan[] | null;
  /** …or wrapped lines (plain text). */
  readonly lines: readonly OgeRenderSpan[] | null;
  /** A `*x` repeat: text before, the repeated character, text after. */
  readonly repeat: {
    readonly before: string;
    readonly char: string;
    readonly after: string;
  } | null;
}

/** Something drawn over a cell. */
export interface OgeRenderMark {
  readonly key: string;
  readonly kind: 'note' | 'filter' | 'icon' | 'dataBar' | 'underline';
  readonly row: number;
  readonly col: number;
  /** The mark's box. */
  readonly style: OgeCss;
  /** `note`: the red triangle as SVG polygon points in its box. */
  readonly points?: string;
  /** `filter`: the column has criteria (a funnel instead of the arrow). */
  readonly filtered?: boolean;
  /** `icon`: the icon set and the icon's index (0 = lowest). */
  readonly icon?: { readonly set: string; readonly index: number };
}

/** What a pane draws. */
export interface OgeRenderPane {
  readonly key: OgePaneKey;
  readonly rows: OgeIndexSpan;
  readonly cols: OgeIndexSpan;
  /** Sheet offset of the pane's top-left (pixels at the zoom). */
  readonly originX: number;
  readonly originY: number;
  readonly width: number;
  readonly height: number;
  /** SVG path data of the gridlines (`''` when hidden). */
  readonly gridlines: string;
  readonly fills: readonly OgeRenderFill[];
  readonly texts: readonly OgeRenderText[];
  readonly borders: readonly OgeStroke[];
  readonly marks: readonly OgeRenderMark[];
}

/** What {@link ogeRenderPane} needs. */
export interface OgeRenderPaneInput {
  readonly key: OgePaneKey;
  readonly sheet: OgeWorksheet;
  readonly axes: OgeZoomedAxes;
  /** The pane's paint cells, at the zoom. */
  readonly cells: readonly OgePaintCell[];
  readonly rows: OgeIndexSpan;
  readonly cols: OgeIndexSpan;
  readonly originX: number;
  readonly originY: number;
  readonly width: number;
  readonly height: number;
  readonly showGridLines: boolean;
  readonly zoom: number;
  /** A rich-text run's font at the zoom. */
  readonly runFont: (cell: OgePaintCell, run: OgeTextRun) => OgePaintFont;
  /** Where the sheet's top-left sits in the grid window (the header sizes): anchors dash patterns. */
  readonly dashOriginX?: number;
  readonly dashOriginY?: number;
}

const px = (value: number) => `${Math.round(value * 100) / 100}px`;

function box(
  left: number,
  top: number,
  width: number,
  height: number,
): Record<string, string> {
  return {
    left: px(left),
    top: px(top),
    width: px(Math.max(0, width)),
    height: px(Math.max(0, height)),
  };
}

/**
 * The CSS of a paint font: face, size, weight, slant, decoration and colour
 * (`null` = automatic, black). Underlines sit where Excel draws them for
 * Calibri 11 — single 2 px below the baseline, double 1 px below with a 1 px
 * gap — scaled with the size. Accounting underlines run the cell's width,
 * so the render model draws them as marks (`accounting: false` here).
 */
export function ogeFontCss(
  font: OgePaintFont,
  color: string | null,
  accounting = true,
): Record<string, string> {
  // longhands only: a `font` shorthand resets line-height, and a renderer that
  // updates only changed properties would then lose the line box
  const css: Record<string, string> = {
    fontFamily: font.family,
    fontSize: px(
      font.vertAlign ? Math.round(font.sizePx * 0.66 * 100) / 100 : font.sizePx,
    ),
    fontWeight: font.bold ? '700' : '400',
    fontStyle: font.italic ? 'italic' : 'normal',
    color: color ?? '#000000',
  };
  const decorations: string[] = [];
  const underline =
    font.underline && (accounting || !font.underline.endsWith('Accounting'))
      ? font.underline
      : undefined;
  if (underline) decorations.push('underline');
  if (font.strike) decorations.push('line-through');
  if (decorations.length) {
    css['textDecorationLine'] = decorations.join(' ');
    css['textDecorationThickness'] = px(
      Math.max(1, Math.round(font.sizePx / 15)),
    );
    if (underline === 'double' || underline === 'doubleAccounting') {
      css['textDecorationStyle'] = 'double';
      css['textUnderlineOffset'] = px(
        Math.max(1, Math.round(font.sizePx / 15)),
      );
    } else if (underline) {
      css['textUnderlineOffset'] = px(
        Math.max(1, Math.round((2 * font.sizePx) / 15)),
      );
    }
  }
  // a raised or lowered run must not grow the line box (the `sup { line-height: 0 }` rule)
  if (font.vertAlign === 'superscript') {
    css['verticalAlign'] = 'super';
    css['lineHeight'] = '0';
  } else if (font.vertAlign === 'subscript') {
    css['verticalAlign'] = 'sub';
    css['lineHeight'] = '0';
  }
  return css;
}

/** Where a box of `size` px sits in a cell `height` px tall, by vertical alignment. */
function verticalOffset(
  vertical: OgePaintCell['style']['vertical'],
  height: number,
  size: number,
): number {
  const room = Math.max(0, height - 1 - size);
  if (
    vertical === 'top' ||
    vertical === 'justify' ||
    vertical === 'distributed'
  )
    return 0;
  return vertical === 'center' ? Math.floor(room / 2) : room;
}

/** Builds a pane's render model from its paint cells. */
export function ogeRenderPane(input: OgeRenderPaneInput): OgeRenderPane {
  const { cells, originX, originY } = input;
  const pane = {
    top: input.rows.first,
    left: input.cols.first,
    bottom: input.rows.last,
    right: input.cols.last,
    originX,
    originY,
    dashOriginX: input.dashOriginX ?? 0,
    dashOriginY: input.dashOriginY ?? 0,
  };
  const fills: OgeRenderFill[] = [];
  const texts: OgeRenderText[] = [];
  const marks: OgeRenderMark[] = [];
  const scale = input.zoom / 100;
  // accounting underlines become marks: renderText adds them here
  const textInput = { ...input, underlines: marks };
  for (const cell of cells) {
    const id = `${cell.row}:${cell.col}`;
    const x = cell.x - originX;
    const y = cell.y - originY;
    // a fill starts a pixel up and left: it paints over the gridlines there (measured)
    if (cell.fill) {
      const area = box(x - 1, y - 1, cell.width + 1, cell.height + 1);
      if (cell.fill.tile) {
        // the 8 × 8 tile repeats on the sheet's grid, offset by the headers (measured)
        const tileX = mod(cell.x - 1 + (input.dashOriginX ?? 0), 8);
        const tileY = mod(cell.y - 1 + (input.dashOriginY ?? 0), 8);
        fills.push({
          key: id,
          style: {
            ...area,
            background: `${cell.fill.tile} ${-tileX}px ${-tileY}px / 8px 8px repeat, ${cell.fill.color}`,
          },
        });
      } else {
        fills.push({ key: id, style: { ...area, background: cell.fill.css } });
      }
    }
    if (cell.dataBar) {
      const room = Math.max(0, cell.width - 3);
      const from = Math.min(cell.dataBar.from, cell.dataBar.to);
      const to = Math.max(cell.dataBar.from, cell.dataBar.to);
      const color = cell.dataBar.color;
      marks.push({
        key: `${id}:bar`,
        kind: 'dataBar',
        row: cell.row,
        col: cell.col,
        style: {
          ...box(
            x + 1 + from * room,
            y + 1,
            (to - from) * room,
            cell.height - 3,
          ),
          // Excel's gradient bar: the colour fading to white, no outline
          background: `linear-gradient(90deg, ${color}, #ffffff)`,
        },
      });
    }
    if (cell.icon) {
      const size = Math.max(8, Math.round(16 * scale));
      marks.push({
        key: `${id}:icon`,
        kind: 'icon',
        row: cell.row,
        col: cell.col,
        style: box(
          x + cell.margin,
          y + verticalOffset(cell.style.vertical, cell.height, size),
          size,
          size,
        ),
        icon: { set: cell.icon.set, index: cell.icon.index },
      });
    }
    if (cell.note) {
      // a red right triangle with 6 px legs in the top-right corner, inside the gridline
      const leg = Math.max(3, Math.round(6 * scale));
      marks.push({
        key: `${id}:note`,
        kind: 'note',
        row: cell.row,
        col: cell.col,
        style: box(x + cell.width - 1 - leg, y, leg, leg),
        points: `0,0 ${leg},0 ${leg},${leg}`,
      });
    }
    const text = renderText(cell, textInput, x, y);
    if (text) texts.push(text);
  }
  // AutoFilter buttons on the filter range's header row
  const filter = input.sheet.autoFilter;
  if (
    filter &&
    filter.range.top >= pane.top &&
    filter.range.top <= pane.bottom
  ) {
    const { rows, cols } = input.axes;
    const row = filter.range.top;
    const size = Math.max(10, Math.round(17 * scale));
    for (
      let col = Math.max(filter.range.left, pane.left);
      col <= Math.min(filter.range.right, pane.right);
      col++
    ) {
      if (cols.size(col) === 0 || rows.size(row) === 0) continue;
      const right = cols.offset(col + 1) - 1 - originX;
      const bottom = rows.offset(row + 1) - 1 - originY;
      marks.push({
        key: `${row}:${col}:filter`,
        kind: 'filter',
        row,
        col,
        style: box(right - size, bottom - size, size, size),
        filtered: filter.columns.some(
          (c) => c.offset === col - filter.range.left,
        ),
      });
    }
  }
  return {
    key: input.key,
    rows: input.rows,
    cols: input.cols,
    originX,
    originY,
    width: input.width,
    height: input.height,
    gridlines: input.showGridLines
      ? ogeGridlinePath(input.sheet, input.axes, pane, cells)
      : '',
    fills,
    texts,
    borders: ogeBorderStrokes(cells, pane),
    marks,
  };
}

function renderText(
  cell: OgePaintCell,
  input: OgeRenderPaneInput & { readonly underlines: OgeRenderMark[] },
  x: number,
  y: number,
): OgeRenderText | null {
  const display = cell.display;
  if (
    !display ||
    (cell.icon && !cell.icon.showValue) ||
    (cell.dataBar && !cell.dataBar.showValue)
  )
    return null;
  if (display.text === '' && !display.rich) return null;
  const clipLeft = cell.clipLeft - input.originX;
  // the cell's own right gridline is not the text's to paint over; a spill's end is
  const ownRight = cell.x + cell.width;
  const clipRight =
    (cell.clipRight === ownRight ? ownRight - 1 : cell.clipRight) -
    input.originX;
  const clipWidth = clipRight - clipLeft;
  const clip = box(clipLeft, y, clipWidth, cell.height - 1);
  const font = cell.font;
  const accounting =
    !display.rich && !cell.lines && !!font.underline?.endsWith('Accounting');
  const base: Record<string, string> = {
    ...ogeFontCss(font, cell.color, !accounting),
    position: 'absolute',
    top: px(cell.lineTop),
    lineHeight: px(cell.lineHeight),
    whiteSpace: 'pre',
  };
  if (cell.scale < 1) base['fontSize'] = px(font.sizePx * cell.scale);
  if (cell.style.rotation === 255) {
    base['writingMode'] = 'vertical-rl';
    base['textOrientation'] = 'upright';
  } else if (cell.style.rotation !== 0) {
    // Excel stores 1–90 counter-clockwise and 91–180 clockwise
    const degrees =
      cell.style.rotation <= 90
        ? -cell.style.rotation
        : cell.style.rotation - 90;
    base['transform'] = `rotate(${degrees}deg)`;
    base['transformOrigin'] = 'center';
  }
  // the text area, in clip-box pixels: the leading inset (margin + indent), the margin on the other side
  const align = cell.align;
  const textLeft = x + cell.inset - clipLeft;
  // right-aligned text ends a pixel further in than the left margin (measured on screen)
  const textRight =
    x +
    cell.width -
    1 -
    (align === 'right' ? cell.inset + 1 : cell.margin) -
    clipLeft;
  const area = Math.max(0, textRight - textLeft);
  const key = `${cell.row}:${cell.col}`;
  if (cell.lines) {
    const last = cell.lines.length - 1;
    return {
      key,
      row: cell.row,
      col: cell.col,
      clip,
      style: { ...base, left: px(textLeft), width: px(area) },
      text: null,
      runs: null,
      lines: cell.lines.map((line, index) => {
        const justified =
          align === 'distributed' || (align === 'justify' && index < last);
        return {
          text: line,
          style: {
            display: 'block',
            height: px(cell.lineHeight),
            textAlign: justified
              ? 'justify'
              : align === 'right'
                ? 'right'
                : align === 'center'
                  ? 'center'
                  : 'left',
            textAlignLast: justified ? 'justify' : 'auto',
          },
        };
      }),
      repeat: null,
    };
  }
  let placement: Record<string, string>;
  let repeat: OgeRenderText['repeat'] = null;
  if (display.fill) {
    // `*x`: the character repeats across the free width, between its text
    repeat = {
      before: display.text.slice(0, display.fill.index),
      char: display.fill.char,
      after: display.text.slice(display.fill.index),
    };
    placement = {
      left: px(textLeft),
      width: px(area),
      display: 'flex',
      overflow: 'hidden',
    };
  } else if (align === 'right') {
    placement = { right: px(clipWidth - textRight) };
  } else if (align === 'center' || align === 'centerContinuous') {
    // centred on the cell (a blocked side cuts the text), or across the centre-continuous run
    const centre =
      align === 'centerContinuous'
        ? clipWidth / 2
        : x - clipLeft + (cell.width - 1) / 2;
    const half = Math.max(centre, clipWidth - centre) + 1;
    placement = {
      left: px(centre - half),
      width: px(2 * half),
      textAlign: 'center',
    };
  } else if (align === 'fill') {
    placement = { left: px(textLeft), width: px(area), overflow: 'hidden' };
  } else {
    placement = { left: px(textLeft) };
  }
  if (accounting) {
    // across the text area, 3 px above the row's gridline (double: 4 and 2), measured
    const thickness = Math.max(1, Math.round(font.sizePx / 15));
    const bottom = y + cell.height - 1;
    const color = cell.color ?? '#000000';
    const offsets = font.underline === 'doubleAccounting' ? [4, 2] : [3];
    offsets.forEach((offset, index) => {
      input.underlines.push({
        key: `${key}:u${index}`,
        kind: 'underline',
        row: cell.row,
        col: cell.col,
        style: {
          ...box(
            x + cell.inset,
            bottom - offset * thickness,
            cell.width - 1 - cell.inset - cell.margin,
            thickness,
          ),
          background: color,
        },
      });
    });
  }
  let runs: OgeRenderSpan[] | null = display.rich
    ? display.rich.runs.map((run) => {
        const runFont = input.runFont(cell, run);
        // a run's font shorthand would reset its line-height: keep the cell's line box
        const css = ogeFontCss(runFont, runFont.color ?? cell.color);
        return {
          text: run.text,
          style: runFont.vertAlign
            ? css
            : { ...css, lineHeight: px(cell.lineHeight) },
        };
      })
    : null;
  if (!runs && font.vertAlign && !repeat) {
    // a whole-cell super/subscript: a small run raised in a full-size line box
    // (vertical-align does nothing on the positioned text box itself)
    base['fontSize'] = px(font.sizePx);
    runs = [{ text: display.text, style: ogeFontCss(font, cell.color) }];
  }
  return {
    key,
    row: cell.row,
    col: cell.col,
    clip,
    style: { ...base, ...placement },
    text: runs || repeat ? null : display.text,
    runs,
    lines: null,
    repeat,
  };
}

// ── selection ──────────────────────────────────────────────────────────

/** The selection's shapes in a pane (pane pixels; `null` when not shown). */
export interface OgeSelectionShapes {
  /** SVG path data of the grey overlay; the active cell is a hole (draw with `fill-rule: nonzero`). */
  readonly overlay: string;
  /** The 2 px border's outer box (a single range only). */
  readonly frame: OgeCss | null;
  /** The 1 px white line inside the border. */
  readonly inner: OgeCss | null;
  /** The fill handle, and the white moat that cuts the border around it. */
  readonly handle: OgeCss | null;
  readonly moat: OgeCss | null;
  /** Several ranges: a thin line around the active cell instead. */
  readonly active: OgeCss | null;
  /** A dynamic array spilling over the active cell: Excel's thin blue frame (over its boundary gridlines). */
  readonly spill: OgeCss | null;
}

/**
 * The selection as Excel draws it (measured): a 22% black overlay over the
 * ranges except inside the active cell; for one range, a 2 px border over
 * the boundary gridlines and one pixel out, a 1 px white line inside it, and
 * a 5 × 5 fill handle on the bottom-right corner with a white moat.
 * Boxes are clamped to the pane (plus a margin), so a whole column at 400%
 * never asks for a box taller than browsers draw.
 */
export function ogeSelectionShapes(
  sheet: OgeWorksheet,
  axes: OgeZoomedAxes,
  selection: OgeSheetSelection,
  pane: {
    readonly originX: number;
    readonly originY: number;
    readonly width: number;
    readonly height: number;
  },
  spill: OgeSheetRange | null = null,
): OgeSelectionShapes {
  const { rows, cols } = axes;
  const lowX = -8;
  const lowY = -8;
  const highX = pane.width + 8;
  const highY = pane.height + 8;
  const boxOf = (range: OgeSheetRange) => {
    const left = cols.offset(range.left) - pane.originX;
    const top = rows.offset(range.top) - pane.originY;
    const right = cols.offset(range.right + 1) - pane.originX;
    const bottom = rows.offset(range.bottom + 1) - pane.originY;
    // clamp far edges: they stay off-screen, and the box stays drawable
    const l = Math.max(left, lowX);
    const t = Math.max(top, lowY);
    return {
      left: l,
      top: t,
      width: Math.min(right, highX) - l,
      height: Math.min(bottom, highY) - t,
    };
  };
  const active = selection.active;
  const activeRange = sheet.mergeAt(active.row, active.col) ?? {
    top: active.row,
    left: active.col,
    bottom: active.row,
    right: active.col,
  };
  const hole = boxOf(activeRange);
  const parts: string[] = [];
  let around = false;
  for (const range of selection.ranges) {
    if (rangeEquals(range, activeRange)) continue;
    const b = boxOf(range);
    parts.push(rect(b.left + 1, b.top + 1, b.width - 3, b.height - 3));
    around ||=
      active.row >= range.top &&
      active.row <= range.bottom &&
      active.col >= range.left &&
      active.col <= range.right;
  }
  // the active cell's inside, counter-clockwise: a hole in the shaded range under the nonzero rule
  if (around && hole.width > 1 && hole.height > 1) {
    parts.push(
      `M${hole.left} ${hole.top}v${hole.height - 1}h${hole.width - 1}v${-(hole.height - 1)}Z`,
    );
  }
  const overlay = parts.join('');
  const spillBox = spill ? boxOf(spill) : null;
  const spillFrame = spillBox
    ? box(
        spillBox.left - 1,
        spillBox.top - 1,
        spillBox.width + 1,
        spillBox.height + 1,
      )
    : null;
  if (selection.ranges.length !== 1) {
    return {
      overlay,
      frame: null,
      inner: null,
      handle: null,
      moat: null,
      active: box(hole.left - 1, hole.top - 1, hole.width + 1, hole.height + 1),
      spill: spillFrame,
    };
  }
  const range = selection.ranges[0];
  const b = boxOf(range);
  const whole =
    (range.top === 0 && range.bottom === OGE_SHEET_MAX_ROWS - 1) ||
    (range.left === 0 && range.right === OGE_SHEET_MAX_COLUMNS - 1);
  return {
    overlay,
    frame: box(b.left - 2, b.top - 2, b.width + 3, b.height + 3),
    inner: box(b.left, b.top, b.width - 1, b.height - 1),
    handle: whole
      ? null
      : box(b.left + b.width - 3, b.top + b.height - 3, 5, 5),
    moat: whole ? null : box(b.left + b.width - 4, b.top + b.height - 4, 6, 6),
    active: null,
    spill: spillFrame,
  };
}

function mod(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): string {
  if (width <= 0 || height <= 0) return '';
  return `M${left} ${top}h${width}v${height}h${-width}Z`;
}

function rangeEquals(a: OgeSheetRange, b: OgeSheetRange): boolean {
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.bottom === b.bottom &&
    a.right === b.right
  );
}

// ── headers ────────────────────────────────────────────────────────────

/** A row or column header cell. */
export interface OgeHeaderCell {
  readonly index: number;
  /** `A`…`XFD`, or the row number. */
  readonly label: string;
  /** Offset and size along the axis, in the pane's pixels. */
  readonly offset: number;
  readonly size: number;
  /** `selected`: part of the selection; `full`: the whole row or column is selected. */
  readonly state: 'none' | 'selected' | 'full';
}

/** The header cells of a span of rows or columns. */
export function ogeHeaderCells(
  kind: 'rows' | 'columns',
  axes: OgeZoomedAxes,
  span: OgeIndexSpan,
  origin: number,
  selection: OgeSheetSelection,
): OgeHeaderCell[] {
  const axis = kind === 'rows' ? axes.rows : axes.cols;
  const out: OgeHeaderCell[] = [];
  for (let index = span.first; index <= span.last; index++) {
    const size = axis.size(index);
    if (size === 0) continue;
    let state: OgeHeaderCell['state'] = 'none';
    for (const range of selection.ranges) {
      const inside =
        kind === 'rows'
          ? index >= range.top && index <= range.bottom
          : index >= range.left && index <= range.right;
      if (!inside) continue;
      const full =
        kind === 'rows'
          ? range.left === 0 && range.right === OGE_SHEET_MAX_COLUMNS - 1
          : range.top === 0 && range.bottom === OGE_SHEET_MAX_ROWS - 1;
      if (full) state = 'full';
      else if (state === 'none') state = 'selected';
    }
    out.push({
      index,
      label: kind === 'rows' ? String(index + 1) : ogeColumnName(index),
      offset: axis.offset(index) - origin,
      size,
      state,
    });
  }
  return out;
}
