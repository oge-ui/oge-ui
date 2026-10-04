/**
 * The pure `.xlsx` builder, shared by both render layers.
 *
 * It lives here rather than in `@oge-ui/grid/export-excel` because it is
 * non-trivial and framework-free — the workspace's rule for what gets
 * extracted instead of copied. The Angular and React grid packages keep only
 * the three lines that turn a grid instance into a download, and both re-export
 * this builder so their public API is unchanged.
 *
 * What it writes: a banded (merged) header block, frozen header rows and
 * left-pinned columns, column widths from the grid (or auto-fitted), typed
 * numbers and dates with Excel number formats, group rows with collapsible
 * outline levels, group-footer and total summary rows (values or `SUBTOTAL`
 * formulas), cell styles from `cellStyle` / `customizeCell`, and an
 * auto-filter.
 *
 * `exceljs` is an **optional peer**: nothing pulls this entry point in unless a
 * consumer imports it, so an app that never exports an Excel file never
 * installs the dependency.
 */
import { Workbook, type Cell, type Worksheet } from 'exceljs';
import {
  mergeOgeExportStyles,
  ogeExportCellText,
  ogeExportHeaderCells,
  ogeExportItemsOf,
} from './lib/grid/grid-export';
import type {
  OgeExportCellStyle,
  OgeExportColumn,
  OgeExportData,
  OgeExportItem,
  OgeExportOptions,
  OgeExportRowKind,
  OgeExportSummaryCell,
} from './lib/grid/grid-options';
import type { OgeTreeExportData } from './lib/tree-list/tree-list-core';

export interface OgeExcelExportOptions<
  T = unknown,
> extends OgeExportOptions<T> {
  /** Download file name. Default: `grid.xlsx`. */
  filename?: string;
  /** Worksheet name. Default: `Data`. */
  sheetName?: string;
  /** Adds an Excel auto-filter over the (last) header row. Default: true. */
  autoFilter?: boolean;
  /** Freezes the header rows so they stay on screen. Default: true. */
  freezeHeader?: boolean;
  /** Frozen leading columns. Default: the number of left-pinned columns. */
  freezeColumns?: number;
  /**
   * Group and tree rows get Excel outline levels (collapsible with the
   * sheet's +/- buttons). Default: true.
   */
  outline?: boolean;
  /**
   * Summary cells hold `SUBTOTAL` formulas over their data range (sum, avg,
   * min, max, count) instead of plain values; Excel recalculates them and
   * the cached result keeps them readable everywhere. Default: false.
   */
  summaryFormulas?: boolean;
  /**
   * `'grid'` uses the on-screen width (px) where the column has one and
   * auto-fits the rest; `'auto'` fits every column to its content.
   * Default: `'grid'`.
   */
  columnWidths?: 'grid' | 'auto';
  /** Excel number format for date columns. Default: `yyyy-mm-dd`. */
  dateFormat?: string;
  /** Excel number format for number columns. Default: Excel's `General`. */
  numberFormat?: string;
  /** Per-field Excel number formats (win over the dataType defaults). */
  columnFormats?: Readonly<Record<string, string>>;
  /** Style of the header block (merged over the bold default). */
  headerStyle?: OgeExportCellStyle;
  /** Style of group header rows. */
  groupStyle?: OgeExportCellStyle;
  /** Style of group-footer and total rows. */
  summaryStyle?: OgeExportCellStyle;
}

const DEFAULT_HEADER: OgeExportCellStyle = {
  bold: true,
  background: '#f1f3f5',
  border: '#d0d5dd',
  verticalAlignment: 'middle',
};
const DEFAULT_GROUP: OgeExportCellStyle = {
  bold: true,
  background: '#f6f7f9',
};
const DEFAULT_SUMMARY: OgeExportCellStyle = {
  bold: true,
  background: '#fafbfc',
};

/** `#rgb` / `#rrggbb` → exceljs ARGB. */
function argb(color: string): string {
  let hex = color.trim().replace(/^#/, '');
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  return `FF${hex.slice(0, 6).toUpperCase()}`;
}

const H_ALIGN = { start: 'left', center: 'center', end: 'right' } as const;

/** Writes an {@link OgeExportCellStyle} onto an exceljs cell. */
function applyStyle(cell: Cell, style: OgeExportCellStyle): void {
  if (
    style.bold ||
    style.italic ||
    style.underline ||
    style.color ||
    style.fontSize
  ) {
    cell.font = {
      ...(style.bold ? { bold: true } : {}),
      ...(style.italic ? { italic: true } : {}),
      ...(style.underline ? { underline: true } : {}),
      ...(style.color ? { color: { argb: argb(style.color) } } : {}),
      ...(style.fontSize ? { size: style.fontSize } : {}),
    };
  }
  if (style.background) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argb(style.background) },
    };
  }
  if (style.alignment || style.verticalAlignment || style.wrap) {
    cell.alignment = {
      ...(style.alignment ? { horizontal: H_ALIGN[style.alignment] } : {}),
      ...(style.verticalAlignment ? { vertical: style.verticalAlignment } : {}),
      ...(style.wrap ? { wrapText: true } : {}),
    };
  }
  if (style.border) {
    const side = {
      style: 'thin' as const,
      ...(typeof style.border === 'string'
        ? { color: { argb: argb(style.border) } }
        : {}),
    };
    cell.border = { top: side, left: side, bottom: side, right: side };
  }
  if (style.numFmt) cell.numFmt = style.numFmt;
}

/** Cell value per data type: numbers/dates stay typed, lookups/booleans use their display text. */
function typedValue<T>(column: OgeExportColumn<T>, raw: unknown): unknown {
  if (raw == null) return '';
  if (column.dataType === 'number' && typeof raw === 'number') return raw;
  if (column.dataType === 'date') {
    const date = raw instanceof Date ? raw : new Date(String(raw));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return column.format ? column.format(raw) : raw;
}

function formatOf<T>(
  column: OgeExportColumn<T>,
  options: OgeExcelExportOptions<T>,
): string | undefined {
  const own = column.field ? options.columnFormats?.[column.field] : undefined;
  if (own) return own;
  if (column.dataType === 'date') return options.dateFormat ?? 'yyyy-mm-dd';
  if (column.dataType === 'number') return options.numberFormat;
  return undefined;
}

/** Excel's column width unit is roughly one `0` glyph ≈ 7px. */
function widthChars(px: number): number {
  return Math.max(4, Math.round(px / 7));
}

function autoWidth<T>(column: OgeExportColumn<T>, rows: readonly T[]): number {
  let longest = column.caption.length;
  const sample = rows.length > 500 ? rows.slice(0, 500) : rows;
  for (const row of sample) {
    longest = Math.max(longest, ogeExportCellText(column, row).length);
  }
  return Math.min(60, Math.max(10, longest + 2));
}

const SUBTOTAL_CODE: Partial<Record<OgeExportSummaryCell['type'], number>> = {
  sum: 9,
  avg: 1,
  min: 5,
  max: 4,
  count: 3,
};

function columnLetter(index: number): string {
  let n = index;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Excel outline levels stop at 7. */
const MAX_OUTLINE = 7;

/**
 * Writes the export model into a worksheet — the one routine behind the grid
 * and tree-list workbooks.
 */
function writeSheet<T>(
  sheet: Worksheet,
  data: OgeExportData<T>,
  options: OgeExcelExportOptions<T>,
  defaults: { autoFilter: boolean },
): void {
  const columns = data.columns;
  const count = columns.length;
  const header = ogeExportHeaderCells(columns);
  const headerStyle = mergeOgeExportStyles(DEFAULT_HEADER, options.headerStyle);
  const groupStyle = mergeOgeExportStyles(DEFAULT_GROUP, options.groupStyle);
  const summaryStyle = mergeOgeExportStyles(
    DEFAULT_SUMMARY,
    options.summaryStyle,
  );
  const outline = options.outline !== false;
  const styleFor = (
    base: OgeExportCellStyle,
    column: OgeExportColumn<T>,
    row: T | undefined,
    value: unknown,
    kind: OgeExportRowKind,
    level: number,
  ): OgeExportCellStyle =>
    mergeOgeExportStyles(
      base,
      options.cellStyle?.({ row, column, value, kind, level }),
    );

  // --- columns + header block ---
  columns.forEach((column, index) => {
    const excelColumn = sheet.getColumn(index + 1);
    excelColumn.key = column.field ?? column.caption;
    excelColumn.width =
      options.columnWidths !== 'auto' && column.width
        ? widthChars(column.width)
        : autoWidth(column, data.rows);
  });
  for (let r = 1; r <= header.rows; r++) sheet.getRow(r).font = { bold: true };
  for (const cell of header.cells) {
    const target = sheet.getCell(cell.row, cell.column);
    target.value = cell.caption;
    const column =
      cell.columnIndex !== undefined ? columns[cell.columnIndex] : undefined;
    applyStyle(
      target,
      column
        ? styleFor(
            mergeOgeExportStyles(headerStyle, {
              alignment: headerStyle.alignment ?? column.alignment,
            }),
            column,
            undefined,
            column.caption,
            'header',
            0,
          )
        : mergeOgeExportStyles(headerStyle, { alignment: 'center' }),
    );
    if (cell.rowSpan > 1 || cell.colSpan > 1) {
      sheet.mergeCells(
        cell.row,
        cell.column,
        cell.row + cell.rowSpan - 1,
        cell.column + cell.colSpan - 1,
      );
    }
  }
  const firstBodyRow = header.rows + 1;

  // --- body ---
  const items: readonly OgeExportItem<T>[] = ogeExportItemsOf(data);
  /** Row number of the most recent group header per level (formula ranges). */
  const groupStart: number[] = [];
  let rowNumber = firstBodyRow;
  let lastDataRow = firstBodyRow - 1;
  for (const item of items) {
    const excelRow = sheet.getRow(rowNumber);
    switch (item.kind) {
      case 'data': {
        columns.forEach((column, index) => {
          const raw = column.accessor(item.row);
          const text = raw == null ? '' : ogeExportCellText(column, item.row);
          const style = styleFor(
            {
              alignment: column.alignment,
              numFmt: formatOf(column, options),
            },
            column,
            item.row,
            raw,
            'data',
            item.level,
          );
          let value = typedValue(column, raw);
          if (options.customizeCell) {
            const out = options.customizeCell({
              row: item.row,
              field: column.field,
              caption: column.caption,
              value: raw,
              text,
              column,
              level: item.level,
              style,
            });
            if (out !== undefined) value = out;
          }
          const cell = excelRow.getCell(index + 1);
          cell.value = value as Cell['value'];
          applyStyle(cell, style);
        });
        lastDataRow = rowNumber;
        break;
      }
      case 'group': {
        groupStart[item.level] = rowNumber;
        groupStart.length = item.level + 1;
        const cell = excelRow.getCell(1);
        cell.value = item.text;
        const first = columns[0];
        applyStyle(
          cell,
          first
            ? styleFor(
                groupStyle,
                first,
                undefined,
                item.value,
                'group',
                item.level,
              )
            : groupStyle,
        );
        if (count > 1) sheet.mergeCells(rowNumber, 1, rowNumber, count);
        break;
      }
      case 'groupFooter':
      case 'total': {
        // a footer's range starts below its group header; a tree's
        // per-parent footer has no header line, so it carries values only
        const opener =
          item.kind === 'total' ? firstBodyRow - 1 : groupStart[item.level - 1];
        const from = opener === undefined ? Infinity : opener + 1;
        const to = item.kind === 'total' ? lastDataRow : rowNumber - 1;
        columns.forEach((column, index) => {
          const summaries = item.summaries.filter(
            (summary) => summary.field === column.field,
          );
          const cell = excelRow.getCell(index + 1);
          const style = styleFor(
            mergeOgeExportStyles(summaryStyle, {
              alignment: column.alignment,
            }),
            column,
            undefined,
            summaries[0]?.value,
            item.kind,
            item.kind === 'total' ? 0 : item.level,
          );
          if (
            summaries.length === 1 &&
            typeof summaries[0].value === 'number'
          ) {
            const summary = summaries[0];
            const code = SUBTOTAL_CODE[summary.type];
            const letter = columnLetter(index + 1);
            cell.value =
              options.summaryFormulas && code !== undefined && to >= from
                ? {
                    formula: `SUBTOTAL(${code},${letter}${from}:${letter}${to})`,
                    result: summary.value as number,
                  }
                : (summary.value as number);
            const base =
              summary.type === 'count'
                ? '0'
                : (formatOf(column, options) ?? 'General');
            if (!style.numFmt) {
              style.numFmt = summary.label
                ? `"${summary.label.replace(/"/g, '')}: "${base}`
                : base;
            }
          } else if (summaries.length) {
            cell.value = summaries.map((summary) => summary.text).join(' · ');
          }
          applyStyle(cell, style);
        });
        break;
      }
    }
    if (outline) {
      const level =
        item.kind === 'total' ? 0 : Math.min(MAX_OUTLINE, item.level);
      if (level > 0) excelRow.outlineLevel = level;
    }
    rowNumber += 1;
  }

  // --- sheet-level settings ---
  if (outline) {
    // group headers sit above their rows, so the +/- control belongs there
    sheet.properties.outlineProperties = {
      summaryBelow: false,
      summaryRight: false,
    };
  }
  const autoFilter = options.autoFilter ?? defaults.autoFilter;
  if (autoFilter && count) {
    sheet.autoFilter = {
      from: { row: header.rows, column: 1 },
      to: { row: header.rows, column: count },
    };
  }
  const leadingPinned = columns.findIndex((column) => column.pinned !== 'left');
  const frozenColumns = Math.max(
    0,
    options.freezeColumns ?? (leadingPinned < 0 ? 0 : leadingPinned),
  );
  const ySplit = options.freezeHeader === false ? 0 : header.rows;
  if (ySplit || frozenColumns) {
    sheet.views = [
      {
        state: 'frozen',
        xSplit: frozenColumns,
        ySplit,
        topLeftCell: `${columnLetter(frozenColumns + 1)}${ySplit + 1}`,
      },
    ];
  }
}

/**
 * Builds an exceljs Workbook from export data — pure and testable. The
 * one-call grid → download flow is `exportGridToExcel` in
 * `@oge-ui/grid/export-excel` (Angular) or `@oge-ui/react-grid/export-excel`.
 */
export function buildExcelWorkbook<T>(
  data: OgeExportData<T>,
  options: OgeExcelExportOptions<T> = {},
): Workbook {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? 'Data');
  writeSheet(sheet, data, options, { autoFilter: true });
  return workbook;
}

// --- tree list ----------------------------------------------------------------

/** Options of {@link buildTreeExcelWorkbook} and the tree-list download helpers. */
export interface OgeTreeExcelExportOptions<T = unknown> extends Omit<
  OgeExcelExportOptions<T>,
  'scope' | 'groups' | 'groupStyle'
> {
  /** Download file name. Default: `tree-list.xlsx`. */
  filename?: string;
  /** Worksheet name. Default: `Data`. */
  sheetName?: string;
  /** Adds an Excel auto-filter over the header row. Default: false. */
  autoFilter?: boolean;
}

/**
 * Builds an exceljs Workbook from tree export data — pure and testable; the
 * one-call tree list → download flow is `exportOgeTreeListToExcel` in
 * `@oge-ui/tree-list/export-excel` (Angular) or
 * `@oge-ui/react-tree-list/export-excel`.
 *
 * Each data row's `outlineLevel` is set to its tree depth so Excel's native
 * row outlining (collapse/expand groups) mirrors the on-screen hierarchy —
 * no whitespace indentation in the first column. Total summaries close the
 * sheet; recursive (per-parent) summaries follow each parent's subtree.
 */
export function buildTreeExcelWorkbook<T>(
  data: OgeTreeExportData<T>,
  options: OgeTreeExcelExportOptions<T> = {},
): Workbook {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? 'Data');
  const items =
    data.items ??
    data.rows.map((row, index) => ({
      kind: 'data' as const,
      row,
      level: data.levels[index] ?? 0,
    }));
  writeSheet(sheet, { ...data, items }, options, { autoFilter: false });
  return workbook;
}
