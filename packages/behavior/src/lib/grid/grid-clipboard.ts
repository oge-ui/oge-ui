import { escapeCsvCell, foldText, toLocalDate } from '@oge-ui/core';
import { parseDateText } from '../input/date-parse';
import type { LookupItem, OgeDataType } from './grid-columns';
import {
  ogeRangeBounds,
  type OgeGridCellCoord,
  type OgeGridCellRange,
  type OgeGridRangeBounds,
  type OgeGridRangeLattice,
} from './grid-range-selection';

/**
 * The spreadsheet half of cell range selection — copy as TSV, paste a TSV
 * block, fill a range — as pure functions both grid render layers call
 * (ADR 0001). Nothing here touches the DOM or the clipboard API; the hosts
 * read and write the clipboard and hand text in and out.
 */

/** Options of the range copy (`rangeSelection.copyHeaders`). */
export interface OgeRangeTsvOptions {
  /** Prepend the columns' captions as the first line. Default `false`. */
  headers?: boolean;
  /**
   * Neutralize cells a spreadsheet would evaluate as a formula (the CSV
   * export's `guardCsvFormula`). Default `true` — a pasted `=HYPERLINK(…)` is
   * exactly the injection the export guards against.
   */
  formulaGuard?: boolean;
}

/**
 * Builds the TSV a range copy puts on the clipboard: one line per selected
 * data row, one tab-separated cell per selected column, RFC 4180 quoting and
 * the formula guard on every cell (headers included). Lattice points no range
 * covers copy as empty cells, so several ranges paste back as one rectangle.
 */
export function buildOgeRangeTsv(
  lattice: OgeGridRangeLattice,
  text: (row: number, col: number) => string,
  caption: (col: number) => string,
  options: OgeRangeTsvOptions = {},
): string {
  const guard = options.formulaGuard !== false;
  const lines: string[] = [];
  if (options.headers) {
    lines.push(
      lattice.cols
        .map((col) => escapeCsvCell(caption(col), '\t', guard))
        .join('\t'),
    );
  }
  for (const row of lattice.rows) {
    lines.push(
      lattice.cols
        .map((col) =>
          lattice.isSelected(row, col)
            ? escapeCsvCell(text(row, col), '\t', guard)
            : '',
        )
        .join('\t'),
    );
  }
  return lines.join('\r\n');
}

/**
 * Parses clipboard TSV (what Excel, Sheets and the grid's own copy write)
 * into a matrix of cell texts: tabs separate cells, CR/LF separate lines,
 * double-quoted cells may contain tabs, newlines and `""` escapes. A single
 * trailing line break — Excel always writes one — does not add an empty row.
 */
export function parseOgeTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let atCellStart = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && atCellStart) {
      quoted = true;
      atCellStart = false;
      continue;
    }
    if (ch === '\t') {
      row.push(cell);
      cell = '';
      atCellStart = true;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      atCellStart = true;
      continue;
    }
    cell += ch;
    atCellStart = false;
  }
  if (cell !== '' || row.length || !atCellStart) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** One cell a paste or fill writes. */
export interface OgeGridCellWrite<V = unknown> {
  readonly row: number;
  readonly col: number;
  readonly value: V;
}

/** What {@link planOgeGridPaste} decided. */
export interface OgeGridPastePlan {
  /** Cells inside existing data rows, with their raw clipboard text. */
  readonly cells: readonly OgeGridCellWrite<string>[];
  /**
   * Clipboard lines that ran past the last data row, column-aligned from the
   * start column — new rows when `pasteAddsRows` is on, dropped otherwise.
   */
  readonly extraRows: readonly (readonly OgeGridCellWrite<string>[])[];
}

/** Inputs of {@link planOgeGridPaste}. */
export interface OgeGridPasteContext {
  /** Flat row count of the view. */
  rowCount: number;
  /** Visible column count. */
  columnCount: number;
  isDataRow(row: number): boolean;
  /**
   * The selected range, when there is one: a single copied value fills every
   * selected cell (Excel's behavior); a block starts at its top-start corner.
   */
  selection?: OgeGridCellRange | null;
}

/**
 * Lays a parsed clipboard block onto the grid: line *n* goes to the *n*-th
 * data row at or below the start row (group and detail rows are skipped, not
 * written), cell *m* to the column *m* places right of the start column;
 * columns past the last one are dropped. A 1×1 block with a multi-cell
 * selection fills the selection instead.
 */
export function planOgeGridPaste(
  matrix: readonly (readonly string[])[],
  start: OgeGridCellCoord,
  context: OgeGridPasteContext,
): OgeGridPastePlan {
  if (!matrix.length) return { cells: [], extraRows: [] };
  const selection = context.selection
    ? ogeRangeBounds(context.selection)
    : null;
  if (
    selection &&
    matrix.length === 1 &&
    matrix[0].length === 1 &&
    (selection.bottom > selection.top || selection.right > selection.left)
  ) {
    const cells: OgeGridCellWrite<string>[] = [];
    for (let row = selection.top; row <= selection.bottom; row++) {
      if (!context.isDataRow(row)) continue;
      for (let col = selection.left; col <= selection.right; col++)
        cells.push({ row, col, value: matrix[0][0] });
    }
    return { cells, extraRows: [] };
  }
  const origin = selection
    ? { row: selection.top, col: selection.left }
    : start;
  const cells: OgeGridCellWrite<string>[] = [];
  const extraRows: OgeGridCellWrite<string>[][] = [];
  let row = origin.row;
  for (const line of matrix) {
    while (row < context.rowCount && !context.isDataRow(row)) row++;
    const target = row < context.rowCount ? row : -1;
    const lineCells: OgeGridCellWrite<string>[] = [];
    line.forEach((text, offset) => {
      const col = origin.col + offset;
      if (col < context.columnCount)
        lineCells.push({ row: target, col, value: text });
    });
    if (target < 0) extraRows.push(lineCells);
    else cells.push(...lineCells);
    row++;
  }
  return { cells, extraRows };
}

/** What a pasted / typed text means for one column. */
export type OgeCellTextParse =
  { readonly ok: true; readonly value: unknown } | { readonly ok: false };

/** The column facts {@link parseOgeCellText} needs. */
export interface OgeCellTextColumn {
  readonly dataType: OgeDataType;
  readonly lookupItems?: readonly LookupItem[] | undefined;
}

/** Words a boolean cell accepts besides `true` / `false`. */
export interface OgeCellTextMessages {
  readonly booleanTrue: string;
  readonly booleanFalse: string;
  readonly booleanTrueLabel: string;
  readonly booleanFalseLabel: string;
}

const TRUE_WORDS = ['true', 'yes', '1'];
const FALSE_WORDS = ['false', 'no', '0'];

/**
 * Parses one clipboard cell for a column, the way its editor would: numbers
 * accept the locale's group and decimal separators, dates go through the
 * date box's own parser (ISO first), booleans accept their glyphs and words,
 * lookups match an item's display text (accent- and case-insensitively) or
 * its stored value. Blank text is `null` for every type but `string`.
 * `{ ok: false }` means the text is not a value of that type — the paste
 * skips the cell instead of writing garbage.
 */
export function parseOgeCellText(
  text: string,
  column: OgeCellTextColumn,
  messages: OgeCellTextMessages,
  locale?: string,
): OgeCellTextParse {
  const trimmed = text.trim();
  if (column.lookupItems) {
    if (!trimmed) return { ok: true, value: null };
    const folded = foldText(trimmed);
    const match =
      column.lookupItems.find((item) => foldText(item.text) === folded) ??
      column.lookupItems.find((item) => String(item.value) === trimmed);
    return match ? { ok: true, value: match.value } : { ok: false };
  }
  switch (column.dataType) {
    case 'number': {
      if (!trimmed) return { ok: true, value: null };
      const value = parseLocaleNumber(trimmed, locale);
      return value === null ? { ok: false } : { ok: true, value };
    }
    case 'date':
    case 'datetime': {
      if (!trimmed) return { ok: true, value: null };
      const date =
        toLocalDate(trimmed) ??
        parseDateText(
          trimmed,
          locale,
          column.dataType === 'datetime' ? 'datetime' : 'date',
        );
      return date ? { ok: true, value: date } : { ok: false };
    }
    case 'boolean': {
      if (!trimmed) return { ok: true, value: null };
      const folded = foldText(trimmed);
      const yes = [
        ...TRUE_WORDS,
        foldText(messages.booleanTrue),
        foldText(messages.booleanTrueLabel),
      ];
      const no = [
        ...FALSE_WORDS,
        foldText(messages.booleanFalse),
        foldText(messages.booleanFalseLabel),
      ];
      if (yes.includes(folded)) return { ok: true, value: true };
      if (no.includes(folded)) return { ok: true, value: false };
      return { ok: false };
    }
    default:
      return { ok: true, value: text };
  }
}

/** The locale's group and decimal characters (cached per locale). */
const separatorCache = /* @__PURE__ */ new Map<
  string,
  { group: string; decimal: string }
>();

function separatorsOf(locale: string | undefined): {
  group: string;
  decimal: string;
} {
  const id = locale ?? '';
  let cached = separatorCache.get(id);
  if (!cached) {
    let group = ',';
    let decimal = '.';
    try {
      for (const part of new Intl.NumberFormat(locale).formatToParts(12345.6)) {
        if (part.type === 'group') group = part.value;
        if (part.type === 'decimal') decimal = part.value;
      }
    } catch {
      // unknown locale: keep the C defaults
    }
    cached = { group, decimal };
    separatorCache.set(id, cached);
  }
  return cached;
}

/**
 * `1234.5`, `1,234.5` (en) or `1.234,5` (de/tr) → 1234.5; `null` when the
 * text is not a number. A plain JS number literal always parses, so data a
 * program wrote round-trips under every locale.
 */
export function parseLocaleNumber(
  text: string,
  locale?: string,
): number | null {
  const compact = text.replace(/[\s\u00A0\u202F]/g, '');
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(compact))
    return Number(compact);
  const { group, decimal } = separatorsOf(locale);
  const normalized = compact
    .split(group)
    .join('')
    .split(decimal)
    .join('.')
    .replace(/^\((.*)\)$/, '-$1');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  return Number(normalized);
}

/**
 * Whether a fill / copy value fits a column of `dataType` — a fill across
 * columns never writes a text into a number column. `null` fits everywhere.
 */
export function ogeValueFits(value: unknown, dataType: OgeDataType): boolean {
  if (value == null) return true;
  switch (dataType) {
    case 'number':
      return typeof value === 'number';
    case 'date':
    case 'datetime':
      return value instanceof Date || typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return true;
  }
}

// --- fill -------------------------------------------------------------------

/** Which way a fill extends a range. */
export type OgeFillDirection = 'down' | 'up' | 'right' | 'left';

/** A fill gesture's outcome: the cells to write and the grown range. */
export interface OgeFillPlan {
  readonly direction: OgeFillDirection;
  /** Source + filled cells — the range after the fill. */
  readonly range: OgeGridRangeBounds;
  /** Bounds of the cells being written (no source cells). */
  readonly target: OgeGridRangeBounds;
}

/**
 * Where a fill-handle drag over `hover` extends `source`: along the axis the
 * pointer left the range on (down/up before right/left, as in Excel), or
 * `null` while it is still inside.
 */
export function ogeFillTarget(
  source: OgeGridRangeBounds,
  hover: OgeGridCellCoord,
): OgeFillPlan | null {
  if (hover.row > source.bottom) {
    return {
      direction: 'down',
      range: { ...source, bottom: hover.row },
      target: { ...source, top: source.bottom + 1, bottom: hover.row },
    };
  }
  if (hover.row < source.top) {
    return {
      direction: 'up',
      range: { ...source, top: hover.row },
      target: { ...source, top: hover.row, bottom: source.top - 1 },
    };
  }
  if (hover.col > source.right) {
    return {
      direction: 'right',
      range: { ...source, right: hover.col },
      target: { ...source, left: source.right + 1, right: hover.col },
    };
  }
  if (hover.col < source.left) {
    return {
      direction: 'left',
      range: { ...source, left: hover.col },
      target: { ...source, left: hover.col, right: source.left - 1 },
    };
  }
  return null;
}

const DAY_MS = 86_400_000;

/** Whole local-day distance between two dates (DST-safe). */
function dayDiff(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / DAY_MS);
}

function sameTimeOfDay(a: Date, b: Date): boolean {
  return (
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes() &&
    a.getSeconds() === b.getSeconds() &&
    a.getMilliseconds() === b.getMilliseconds()
  );
}

/** A constant step between consecutive values, or `null`. */
function constantStep(steps: readonly number[]): number | null {
  if (!steps.length) return null;
  const first = steps[0];
  return steps.every((step) => Math.abs(step - first) < 1e-9) ? first : null;
}

const TEXT_SERIES = /^(.*?)(\d+)$/;

/**
 * The values a fill writes after (or, `reverse`, before) `source`, Excel
 * style: two or more numbers / dates / `Item 3`-style texts in a constant
 * step extend that series — dates by whole days when they share a time of
 * day — and anything else (a single value included) repeats the source
 * pattern. `reverse` walks the series backwards (fill up / left).
 */
export function ogeFillSeries(
  source: readonly unknown[],
  count: number,
  reverse = false,
): unknown[] {
  if (count <= 0 || !source.length) return [];
  const ordered = reverse ? [...source].reverse() : source;
  const out: unknown[] = [];
  if (ordered.length >= 2) {
    if (ordered.every((v) => typeof v === 'number' && Number.isFinite(v))) {
      const nums = ordered as readonly number[];
      const step = constantStep(nums.slice(1).map((v, i) => v - nums[i]));
      if (step !== null) {
        const last = nums[nums.length - 1];
        for (let i = 1; i <= count; i++)
          out.push(roundLike(last + step * i, nums));
        return out;
      }
    }
    if (ordered.every((v) => v instanceof Date && !Number.isNaN(v.getTime()))) {
      const dates = ordered as readonly Date[];
      const sameTime = dates.every((d) => sameTimeOfDay(d, dates[0]));
      const last = dates[dates.length - 1];
      if (sameTime) {
        const step = constantStep(
          dates.slice(1).map((d, i) => dayDiff(dates[i], d)),
        );
        if (step !== null) {
          for (let i = 1; i <= count; i++) {
            const next = new Date(last);
            next.setDate(next.getDate() + step * i);
            out.push(next);
          }
          return out;
        }
      }
      const step = constantStep(
        dates.slice(1).map((d, i) => d.getTime() - dates[i].getTime()),
      );
      if (step !== null) {
        for (let i = 1; i <= count; i++)
          out.push(new Date(last.getTime() + step * i));
        return out;
      }
    }
    if (ordered.every((v) => typeof v === 'string' && TEXT_SERIES.test(v))) {
      const parts = (ordered as readonly string[]).map(
        (v) => TEXT_SERIES.exec(v) as RegExpExecArray,
      );
      const prefix = parts[0][1];
      if (parts.every((p) => p[1] === prefix)) {
        const nums = parts.map((p) => Number(p[2]));
        const step = constantStep(nums.slice(1).map((v, i) => v - nums[i]));
        if (step !== null && Number.isInteger(step)) {
          const width = parts[parts.length - 1][2].length;
          const last = nums[nums.length - 1];
          for (let i = 1; i <= count; i++) {
            const n = last + step * i;
            out.push(
              n < 0
                ? `${prefix}${n}`
                : `${prefix}${String(n).padStart(width, '0')}`,
            );
          }
          return out;
        }
      }
    }
  }
  for (let i = 0; i < count; i++) out.push(ordered[i % ordered.length]);
  return out;
}

/** Keeps a series at the decimals its source shows (no `0.30000000000000004`). */
function roundLike(value: number, source: readonly number[]): number {
  const decimals = Math.max(
    ...source.map((v) => {
      const text = String(v);
      const dot = text.indexOf('.');
      return dot < 0 || text.includes('e') ? 0 : text.length - dot - 1;
    }),
  );
  const factor = 10 ** Math.min(decimals, 10);
  return Math.round(value * factor) / factor;
}

/**
 * Ctrl+D / Ctrl+R: the copy-fill of a range. With more than one row
 * (column), the first row (column) is copied into the rest; a single row
 * (column) copies the row above it (the column before it) in — Excel's rule.
 * Returns `null` when there is nothing to copy from.
 */
export function ogeKeyboardFillPlan(
  bounds: OgeGridRangeBounds,
  axis: 'down' | 'right',
  previousDataRow: (row: number) => number,
): { source: OgeGridRangeBounds; target: OgeGridRangeBounds } | null {
  if (axis === 'down') {
    if (bounds.bottom > bounds.top) {
      return {
        source: { ...bounds, bottom: bounds.top },
        target: { ...bounds, top: bounds.top + 1 },
      };
    }
    const above = previousDataRow(bounds.top);
    if (above < 0) return null;
    return { source: { ...bounds, top: above, bottom: above }, target: bounds };
  }
  if (bounds.right > bounds.left) {
    return {
      source: { ...bounds, right: bounds.left },
      target: { ...bounds, left: bounds.left + 1 },
    };
  }
  if (bounds.left === 0) return null;
  return {
    source: { ...bounds, left: bounds.left - 1, right: bounds.left - 1 },
    target: bounds,
  };
}

/** Undo / redo / fill / paste shortcuts of a cell range, as one decision. */
export type OgeGridEditShortcut = 'undo' | 'redo' | 'fillDown' | 'fillRight';

/**
 * Ctrl/Cmd+Z → undo, Ctrl+Y or Ctrl/Cmd+Shift+Z → redo, Ctrl+D → fill down,
 * Ctrl+R → fill right. `null` for anything else.
 */
export function ogeGridEditShortcut(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}): OgeGridEditShortcut | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && !event.shiftKey) return 'redo';
  if (key === 'd' && !event.shiftKey) return 'fillDown';
  if (key === 'r' && !event.shiftKey) return 'fillRight';
  return null;
}
