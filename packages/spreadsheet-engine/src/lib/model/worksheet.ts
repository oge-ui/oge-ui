/**
 * A worksheet: sparse cells, row and column formatting, merged ranges and the
 * view settings Excel saves with the sheet.
 *
 * Storage is sparse per row (`Map<row, Map<col, cell>>`): the median workbook
 * fills a few hundred cells of a 1,048,576 × 16,384 grid, and both the painter
 * and the writer walk cells row by row. Column formatting is kept as sorted,
 * non-overlapping spans — the shape of `<col min max>`, where one entry may
 * cover all 16,384 columns.
 *
 * This is the storage layer. Edits that users make go through commands (P2)
 * that call these methods and record their inverse for undo.
 */
import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  isOgeCellInSheet,
  ogeRangeContains,
  ogeRangesIntersect,
  type OgeCellRef,
  type OgeSheetRange,
} from '../address/address';
import { isOgeCellEmpty, type OgeCell, type OgeCellValue } from './cell';
import type { OgeColor } from '../color/color';
import type { OgeSheetChart } from './chart';
import type { OgeTable } from './table';
import {
  OGE_DEFAULT_BASE_COLUMN_WIDTH,
  OGE_DEFAULT_ROW_HEIGHT_POINTS,
} from '../metrics/sheet-metrics';
import type {
  OgeAutoFilter,
  OgeConditionalFormat,
  OgeDataValidation,
  OgeHyperlink,
  OgeNote,
  OgePageSetup,
  OgePicture,
  OgeSheetPassthrough,
  OgeSheetProtection,
} from './sheet-features';

/** Whether a sheet shows in the tab strip (`veryHidden`: only code can show it). */
export type OgeSheetState = 'visible' | 'hidden' | 'veryHidden';

/** Formatting of one row. */
export interface OgeRowInfo {
  /** Height in points; omitted = the sheet's default height. */
  readonly height?: number;
  /** The height was set by hand; otherwise Excel recorded the height it fitted. */
  readonly customHeight?: boolean;
  readonly hidden?: boolean;
  /** Outline (grouping) level, 1–7. */
  readonly outlineLevel?: number;
  readonly collapsed?: boolean;
  /** Style id applied to the row's empty cells. */
  readonly style?: number;
}

/** Formatting of one column. */
export interface OgeColumnInfo {
  /** Stored width in characters (`<col width>`); omitted = the default width. */
  readonly width?: number;
  readonly hidden?: boolean;
  readonly outlineLevel?: number;
  readonly collapsed?: boolean;
  /** Style id applied to the column's empty cells. */
  readonly style?: number;
}

/** Column formatting over the inclusive, zero-based columns `first`–`last`. */
export interface OgeColumnSpan extends OgeColumnInfo {
  readonly first: number;
  readonly last: number;
}

/** What the sheet's window looked like when the file was saved. */
export interface OgeSheetView {
  /** Rows frozen at the top (`pane/@ySplit` with `state="frozen"`). */
  readonly frozenRows: number;
  /** Columns frozen at the start (`pane/@xSplit`). */
  readonly frozenColumns: number;
  /** First visible cell of the scrolling area (`topLeftCell`). */
  readonly topLeft?: OgeCellRef;
  /** Zoom in percent, 10–400. */
  readonly zoom: number;
  readonly showGridLines: boolean;
  readonly showHeaders: boolean;
  readonly showZeros: boolean;
  /** Columns run right to left (`rightToLeft="1"`). */
  readonly rightToLeft: boolean;
  /** The active cell. */
  readonly activeCell: OgeCellRef;
  /** Selected ranges; the active cell lies in the first. */
  readonly selection: readonly OgeSheetRange[];
  /** Show the outline (grouping) buttons. Default `true`. */
  readonly showOutlineSymbols?: boolean;
  /** The window was split (not frozen): `split` panes scroll independently. */
  readonly split?: boolean;
  /** Excel's view mode when saved. */
  readonly viewMode?: 'normal' | 'pageLayout' | 'pageBreakPreview';
}

/** Excel's view for a new sheet. */
export const OGE_DEFAULT_SHEET_VIEW: OgeSheetView = Object.freeze({
  frozenRows: 0,
  frozenColumns: 0,
  zoom: 100,
  showGridLines: true,
  showHeaders: true,
  showZeros: true,
  rightToLeft: false,
  activeCell: Object.freeze({ row: 0, col: 0 }),
  selection: Object.freeze([
    Object.freeze({ top: 0, left: 0, bottom: 0, right: 0 }),
  ]),
});

/** Sheet-wide size defaults (`sheetFormatPr`). */
export interface OgeSheetFormat {
  /** Default row height in points. */
  readonly defaultRowHeight: number;
  /** `baseColWidth`: characters of the default column, before padding. */
  readonly baseColumnWidth: number;
  /** `defaultColWidth`: a stored width that overrides `baseColumnWidth`. */
  readonly defaultColumnWidth?: number;
  /** `customHeight`: rows without a height keep `defaultRowHeight` instead of fitting their content. */
  readonly customHeight?: boolean;
  /** `zeroHeight`: rows without a record are hidden. */
  readonly zeroHeight?: boolean;
  /** Deepest row / column outline level (`outlineLevelRow` / `outlineLevelCol`). */
  readonly outlineLevelRow?: number;
  readonly outlineLevelCol?: number;
}

/** Where outline summary rows and columns sit (`sheetPr/outlinePr`). */
export interface OgeSheetOutline {
  /** Summary rows below their detail (default `true`). */
  readonly summaryBelow: boolean;
  /** Summary columns right of their detail (default `true`). */
  readonly summaryRight: boolean;
}

/** Packs a cell position into one number: rows × 16,384 + column. */
export function ogeCellKey(row: number, col: number): number {
  return row * OGE_SHEET_MAX_COLUMNS + col;
}

/** Rows per bucket of the merge index. */
const MERGE_BUCKET = 64;

/** Excel's defaults for a new sheet (Calibri 11). */
export const OGE_DEFAULT_SHEET_FORMAT: OgeSheetFormat = Object.freeze({
  defaultRowHeight: OGE_DEFAULT_ROW_HEIGHT_POINTS,
  baseColumnWidth: OGE_DEFAULT_BASE_COLUMN_WIDTH,
});

/** A row's cells and their column order, sorted on demand. */
interface RowCells {
  readonly cells: Map<number, OgeCell>;
  order: number[] | null;
}

/** Shallow equality of two formatting records. */
function sameInfo(a: OgeColumnInfo, b: OgeColumnInfo): boolean {
  return (
    a.width === b.width &&
    a.hidden === b.hidden &&
    a.outlineLevel === b.outlineLevel &&
    a.collapsed === b.collapsed &&
    a.style === b.style
  );
}

function infoOf(span: OgeColumnSpan): OgeColumnInfo {
  return {
    width: span.width,
    hidden: span.hidden,
    outlineLevel: span.outlineLevel,
    collapsed: span.collapsed,
    style: span.style,
  };
}

/** The fields worth storing: no `undefined`s, no default style id. */
function storedCell(cell: OgeCell | undefined): OgeCell | undefined {
  if (cell === undefined) return undefined;
  const stored: {
    value?: OgeCellValue;
    formula?: string;
    style?: number;
    array?: OgeCell['array'];
  } = {};
  if (cell.value !== undefined) stored.value = cell.value;
  if (cell.formula !== undefined) stored.formula = cell.formula;
  if (cell.style) stored.style = cell.style;
  if (cell.array) stored.array = cell.array;
  return stored;
}

/** Drops `undefined` fields, so an all-default record reads as no record. */
function compact<T extends object>(info: T): T | undefined {
  const out: Record<string, unknown> = {};
  let any = false;
  for (const [key, value] of Object.entries(info)) {
    if (value === undefined) continue;
    out[key] = value;
    any = true;
  }
  return any ? (out as T) : undefined;
}

/** A worksheet. Create it through the workbook (`addSheet`). */
export class OgeWorksheet {
  /** Sheet name (1–31 characters; renamed through the workbook). */
  name: string;
  state: OgeSheetState = 'visible';
  tabColor: OgeColor | undefined;
  view: OgeSheetView = OGE_DEFAULT_SHEET_VIEW;
  format: OgeSheetFormat = OGE_DEFAULT_SHEET_FORMAT;
  outline: OgeSheetOutline = { summaryBelow: true, summaryRight: true };
  /** Conditional formats, in file order (rule priority decides precedence). */
  conditionalFormats: OgeConditionalFormat[] = [];
  /** Data validations — stored for the editor (P2). */
  dataValidations: OgeDataValidation[] = [];
  autoFilter: OgeAutoFilter | undefined;
  pageSetup: OgePageSetup = {};
  protection: OgeSheetProtection | undefined;
  /** Worksheet elements the engine does not model, kept for the writer. */
  passthrough: OgeSheetPassthrough[] = [];
  /** Pictures over the sheet, in drawing order (read from its drawing part). */
  pictures: OgePicture[] = [];
  /** Charts over the sheet (the drawing part stays opaque). */
  charts: OgeSheetChart[] = [];
  /** Excel tables on the sheet (their parts stay opaque). */
  tables: OgeTable[] = [];
  /**
   * Relationships of the sheet part to parts the engine keeps opaque
   * (drawings, tables, printer settings) — what passed-through elements' `r:id`s mean.
   */
  opaqueRelationships: {
    readonly id: string;
    readonly type: string;
    readonly target: string;
    readonly external: boolean;
  }[] = [];

  private readonly rows = new Map<number, RowCells>();
  private rowOrder: number[] | null = null;
  private readonly rowInfo = new Map<number, OgeRowInfo>();
  private columns: OgeColumnSpan[] = [];
  private mergeList: OgeSheetRange[] = [];
  private mergeIndex: Map<number, OgeSheetRange[]> | null = null;
  private linkList: OgeHyperlink[] = [];
  private linkIndex: Map<number, OgeHyperlink> | null = null;
  private readonly noteMap = new Map<number, OgeNote>();
  private count = 0;
  private extent: OgeSheetRange | null | undefined;

  /** @internal — use the workbook's `addSheet`. */
  constructor(name: string) {
    this.name = name;
  }

  // ── cells ──────────────────────────────────────────────────────────────

  /** Number of stored cells (values, formulas or styles). */
  get cellCount(): number {
    return this.count;
  }

  /** The stored cell, or `undefined` for a blank one. */
  getCell(row: number, col: number): OgeCell | undefined {
    return this.rows.get(row)?.cells.get(col);
  }

  /** The cell's value (`undefined` when blank). */
  getValue(row: number, col: number): OgeCellValue | undefined {
    return this.getCell(row, col)?.value;
  }

  /**
   * Stores a cell; an empty cell (no value, formula or style) removes it.
   * Returns `false` when the position lies outside the sheet.
   */
  setCell(row: number, col: number, cell: OgeCell | undefined): boolean {
    if (!isOgeCellInSheet(row, col)) return false;
    const stored = storedCell(cell);
    let line = this.rows.get(row);
    if (isOgeCellEmpty(stored)) {
      if (line?.cells.delete(col)) {
        this.count--;
        this.extent = undefined;
        line.order = null;
        if (line.cells.size === 0) {
          this.rows.delete(row);
          this.rowOrder = null;
        }
      }
      return true;
    }
    if (!line) {
      line = { cells: new Map(), order: null };
      this.rows.set(row, line);
      this.rowOrder = null;
    }
    if (!line.cells.has(col)) {
      this.count++;
      line.order = null;
    }
    line.cells.set(col, stored as OgeCell);
    this.extent = undefined;
    return true;
  }

  /**
   * Replaces the value the way typing does: the style stays, a formula goes.
   * `undefined` clears the content (the style still stays).
   */
  setValue(row: number, col: number, value: OgeCellValue | undefined): boolean {
    const style = this.getCell(row, col)?.style;
    return this.setCell(row, col, { value, style });
  }

  /**
   * Visits stored cells row by row, columns ascending — inside `range` when
   * given. The visitor must not add or remove cells while it runs.
   */
  forEachCell(
    visit: (cell: OgeCell, row: number, col: number) => void,
    range?: OgeSheetRange,
  ): void {
    for (const row of this.sortedRows()) {
      if (range && (row < range.top || row > range.bottom)) continue;
      const line = this.rows.get(row) as RowCells;
      for (const col of this.sortedColumns(line)) {
        if (range && (col < range.left || col > range.right)) continue;
        visit(line.cells.get(col) as OgeCell, row, col);
      }
    }
  }

  /**
   * Visits one row's stored cells, columns ascending, from `first` to `last`
   * (inclusive) — a binary search into the row, not a scan of the sheet.
   */
  forEachInRow(
    row: number,
    visit: (cell: OgeCell, col: number) => void,
    first = 0,
    last = OGE_SHEET_MAX_COLUMNS - 1,
  ): void {
    const line = this.rows.get(row);
    if (!line) return;
    const order = this.sortedColumns(line);
    let low = 0;
    let high = order.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (order[mid] < first) low = mid + 1;
      else high = mid;
    }
    for (let i = low; i < order.length && order[i] <= last; i++) {
      visit(line.cells.get(order[i]) as OgeCell, order[i]);
    }
  }

  /** Whether a row has stored cells. */
  hasRow(row: number): boolean {
    return this.rows.has(row);
  }

  /**
   * The smallest range holding every stored cell (Excel's `dimension`), or
   * `null` for an empty sheet.
   */
  usedRange(): OgeSheetRange | null {
    if (this.extent !== undefined) return this.extent;
    const rows = this.sortedRows();
    if (rows.length === 0) {
      this.extent = null;
      return null;
    }
    let left = OGE_SHEET_MAX_COLUMNS;
    let right = -1;
    for (const row of rows) {
      const order = this.sortedColumns(this.rows.get(row) as RowCells);
      left = Math.min(left, order[0]);
      right = Math.max(right, order[order.length - 1]);
    }
    this.extent = { top: rows[0], bottom: rows[rows.length - 1], left, right };
    return this.extent;
  }

  private sortedRows(): readonly number[] {
    this.rowOrder ??= [...this.rows.keys()].sort((a, b) => a - b);
    return this.rowOrder;
  }

  private sortedColumns(line: RowCells): readonly number[] {
    line.order ??= [...line.cells.keys()].sort((a, b) => a - b);
    return line.order;
  }

  // ── rows ───────────────────────────────────────────────────────────────

  /** A row's formatting, or `undefined` when it has none. */
  getRow(row: number): OgeRowInfo | undefined {
    return this.rowInfo.get(row);
  }

  /** Sets (or, with `undefined` / an empty record, clears) a row's formatting. */
  setRow(row: number, info: OgeRowInfo | undefined): boolean {
    if (!Number.isInteger(row) || row < 0 || row >= OGE_SHEET_MAX_ROWS)
      return false;
    const stored = info === undefined ? undefined : compact(info);
    if (stored) this.rowInfo.set(row, stored);
    else this.rowInfo.delete(row);
    return true;
  }

  /** Rows with formatting, ascending. */
  formattedRows(): readonly number[] {
    return [...this.rowInfo.keys()].sort((a, b) => a - b);
  }

  /** The row's height in points as painted: 0 when hidden. */
  rowHeight(row: number): number {
    const info = this.rowInfo.get(row);
    if (info?.hidden) return 0;
    return info?.height ?? this.format.defaultRowHeight;
  }

  // ── columns ────────────────────────────────────────────────────────────

  /** A column's formatting, or `undefined` when it has none. */
  getColumn(col: number): OgeColumnInfo | undefined {
    const span = this.spanAt(col);
    return span ? infoOf(span) : undefined;
  }

  /**
   * Sets (or, with `undefined` / an empty record, clears) the formatting of
   * columns `first`–`last` (inclusive, zero-based). Neighbouring spans with
   * equal formatting are joined, as Excel writes them.
   */
  setColumns(
    first: number,
    last: number,
    info: OgeColumnInfo | undefined,
  ): boolean {
    const from = Math.min(first, last);
    const to = Math.max(first, last);
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 0 ||
      to >= OGE_SHEET_MAX_COLUMNS
    ) {
      return false;
    }
    const stored = info === undefined ? undefined : compact(info);
    const next: OgeColumnSpan[] = [];
    for (const span of this.columns) {
      if (span.last < from || span.first > to) {
        next.push(span);
        continue;
      }
      // keep the parts of the old span outside the new one
      if (span.first < from) next.push({ ...span, last: from - 1 });
      if (span.last > to) next.push({ ...span, first: to + 1 });
    }
    if (stored) next.push({ ...stored, first: from, last: to });
    next.sort((a, b) => a.first - b.first);
    // join touching spans that format alike
    const joined: OgeColumnSpan[] = [];
    for (const span of next) {
      const previous = joined[joined.length - 1];
      if (
        previous &&
        previous.last + 1 === span.first &&
        sameInfo(infoOf(previous), infoOf(span))
      ) {
        joined[joined.length - 1] = { ...previous, last: span.last };
      } else joined.push(span);
    }
    this.columns = joined;
    return true;
  }

  /** Formatted column spans, ascending and non-overlapping. */
  columnSpans(): readonly OgeColumnSpan[] {
    return this.columns;
  }

  /**
   * A column's stored width (characters) as painted: 0 when hidden,
   * `undefined` when it falls back to the sheet's default width.
   */
  columnWidth(col: number): number | undefined {
    const span = this.spanAt(col);
    if (span?.hidden) return 0;
    return span?.width ?? this.format.defaultColumnWidth;
  }

  private spanAt(col: number): OgeColumnSpan | undefined {
    let low = 0;
    let high = this.columns.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const span = this.columns[mid];
      if (col < span.first) high = mid - 1;
      else if (col > span.last) low = mid + 1;
      else return span;
    }
    return undefined;
  }

  // ── merged cells ───────────────────────────────────────────────────────

  /** Merged ranges, in the order they were added. */
  get merges(): readonly OgeSheetRange[] {
    return this.mergeList;
  }

  /**
   * Merges a range of two or more cells. Refused (`false`) for one cell, a
   * range outside the sheet, or one overlapping an existing merge — Excel
   * repairs a file with overlapping merges.
   */
  addMerge(range: OgeSheetRange): boolean {
    const valid =
      isOgeCellInSheet(range.top, range.left) &&
      isOgeCellInSheet(range.bottom, range.right) &&
      range.top <= range.bottom &&
      range.left <= range.right &&
      (range.top !== range.bottom || range.left !== range.right);
    if (!valid || this.mergesIn(range).length > 0) return false;
    const merge = {
      top: range.top,
      left: range.left,
      bottom: range.bottom,
      right: range.right,
    };
    this.mergeList.push(merge);
    if (this.mergeIndex) this.indexMerge(this.mergeIndex, merge);
    return true;
  }

  /** Removes the merge holding the cell; `false` when there is none. */
  removeMergeAt(row: number, col: number): boolean {
    const merge = this.mergeAt(row, col);
    if (!merge) return false;
    this.mergeList.splice(this.mergeList.indexOf(merge), 1);
    this.mergeIndex = null;
    return true;
  }

  /** The merged range holding the cell, if any. */
  mergeAt(row: number, col: number): OgeSheetRange | undefined {
    const bucket = this.merges.length
      ? this.mergeBuckets().get(Math.floor(row / MERGE_BUCKET))
      : undefined;
    return bucket?.find((merge) => ogeRangeContains(merge, row, col));
  }

  /** Merged ranges sharing a cell with `range`, in the order they were added. */
  mergesIn(range: OgeSheetRange): OgeSheetRange[] {
    if (this.mergeList.length === 0) return [];
    const index = this.mergeBuckets();
    const found = new Set<OgeSheetRange>();
    const last = Math.floor(range.bottom / MERGE_BUCKET);
    for (let b = Math.floor(range.top / MERGE_BUCKET); b <= last; b++) {
      for (const merge of index.get(b) ?? []) {
        if (ogeRangesIntersect(merge, range)) found.add(merge);
      }
    }
    return this.mergeList.filter((merge) => found.has(merge));
  }

  /** Row buckets → merges touching them, built on first use. */
  private mergeBuckets(): Map<number, OgeSheetRange[]> {
    if (!this.mergeIndex) {
      const index = new Map<number, OgeSheetRange[]>();
      for (const merge of this.mergeList) this.indexMerge(index, merge);
      this.mergeIndex = index;
    }
    return this.mergeIndex;
  }

  private indexMerge(
    index: Map<number, OgeSheetRange[]>,
    merge: OgeSheetRange,
  ): void {
    const last = Math.floor(merge.bottom / MERGE_BUCKET);
    for (let b = Math.floor(merge.top / MERGE_BUCKET); b <= last; b++) {
      const list = index.get(b);
      if (list) list.push(merge);
      else index.set(b, [merge]);
    }
  }

  // ── hyperlinks ─────────────────────────────────────────────────────────

  /** Hyperlinks, in file order. */
  get hyperlinks(): readonly OgeHyperlink[] {
    return this.linkList;
  }

  /** Adds a hyperlink; a later link over the same cell wins, as in Excel. */
  addHyperlink(link: OgeHyperlink): void {
    this.linkList.push(link);
    this.linkIndex = null;
  }

  /** Removes every hyperlink touching the range. */
  removeHyperlinks(range: OgeSheetRange): void {
    this.linkList = this.linkList.filter(
      (link) => !ogeRangesIntersect(link.range, range),
    );
    this.linkIndex = null;
  }

  /** The hyperlink covering a cell, if any. */
  hyperlinkAt(row: number, col: number): OgeHyperlink | undefined {
    if (this.linkList.length === 0) return undefined;
    if (!this.linkIndex) {
      // one entry per covered cell; ranges larger than a screen are rare
      // (Excel writes one `<hyperlink>` per cell) and capped below
      const index = new Map<number, OgeHyperlink>();
      for (const link of this.linkList) {
        const { top, left, bottom, right } = link.range;
        if ((bottom - top + 1) * (right - left + 1) > 65_536) continue;
        for (let r = top; r <= bottom; r++) {
          for (let c = left; c <= right; c++) index.set(ogeCellKey(r, c), link);
        }
      }
      this.linkIndex = index;
    }
    return (
      this.linkIndex.get(ogeCellKey(row, col)) ??
      [...this.linkList]
        .reverse()
        .find((link) => ogeRangeContains(link.range, row, col))
    );
  }

  // ── notes ──────────────────────────────────────────────────────────────

  /** The note on a cell, if any. */
  getNote(row: number, col: number): OgeNote | undefined {
    return this.noteMap.get(ogeCellKey(row, col));
  }

  /** Sets or (with `undefined`) removes a cell's note. */
  setNote(row: number, col: number, note: OgeNote | undefined): boolean {
    if (!isOgeCellInSheet(row, col)) return false;
    if (note) this.noteMap.set(ogeCellKey(row, col), note);
    else this.noteMap.delete(ogeCellKey(row, col));
    return true;
  }

  /** Every note with its cell, row by row. */
  notes(): { row: number; col: number; note: OgeNote }[] {
    return [...this.noteMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([key, note]) => ({
        row: Math.floor(key / OGE_SHEET_MAX_COLUMNS),
        col: key % OGE_SHEET_MAX_COLUMNS,
        note,
      }));
  }

  /** Number of notes. */
  get noteCount(): number {
    return this.noteMap.size;
  }
}
