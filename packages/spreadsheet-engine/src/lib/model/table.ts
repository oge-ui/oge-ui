/**
 * Excel tables (ListObjects, `xl/tables/tableN.xml`) and the table styles
 * that format them: the workbook's own (`styles.xml` → `tableStyles`) and
 * Excel's built-in ones (`TableStyleMedium2` …), which files only name.
 */
import type { OgeSheetRange } from '../address/address';
import type { OgeAutoFilter } from './sheet-features';

/** The parts of a table a table style formats (`tableStyleElement/@type`). */
export type OgeTableStyleElementType =
  | 'wholeTable'
  | 'headerRow'
  | 'totalRow'
  | 'firstColumn'
  | 'lastColumn'
  | 'firstRowStripe'
  | 'secondRowStripe'
  | 'firstColumnStripe'
  | 'secondColumnStripe'
  | 'firstHeaderCell'
  | 'lastHeaderCell'
  | 'firstTotalCell'
  | 'lastTotalCell';

/** One element of a workbook's table style. */
export interface OgeTableStyleElement {
  /**
   * An {@link OgeTableStyleElementType}, or one of the PivotTable elements
   * (`pageFieldLabels`, `firstSubtotalRow` …), kept as stored.
   */
  readonly type: string;
  /** Index into the workbook's differential formats (`dxfs`). */
  readonly dxf?: number;
  /** Rows or columns per stripe (`size`, 1–9); omitted = 1. */
  readonly size?: number;
}

/** A table style the workbook defines (`tableStyles/tableStyle`). */
export interface OgeTableStyle {
  readonly name: string;
  /** Usable on PivotTables (`pivot`, default `true`). */
  readonly pivot: boolean;
  /** Usable on tables (`table`, default `true`). */
  readonly table: boolean;
  readonly elements: readonly OgeTableStyleElement[];
}

/** Which style a table shows and which of its parts (`tableStyleInfo`). */
export interface OgeTableStyleInfo {
  /** A built-in style (`TableStyleMedium2`) or one of the workbook's; omitted = none. */
  readonly name?: string;
  readonly showFirstColumn: boolean;
  readonly showLastColumn: boolean;
  readonly showRowStripes: boolean;
  readonly showColumnStripes: boolean;
}

/** A column of a table (`tableColumn`). */
export interface OgeTableColumn {
  readonly id: number;
  /** The header text. */
  readonly name: string;
  /** What the totals row computes: `sum`, `average`, `count`, `custom` …; omitted = nothing. */
  readonly totalsRowFunction?: string;
  /** The totals row's text in this column (usually the first). */
  readonly totalsRowLabel?: string;
}

/** An Excel table (a ListObject). */
export interface OgeTable {
  readonly id: number;
  readonly name: string;
  /** The name formulas use (`displayName`). */
  readonly displayName: string;
  /** The whole table: header row, data and totals row. */
  readonly range: OgeSheetRange;
  /** Header rows: 0 or 1 (`headerRowCount`, default 1). */
  readonly headerRowCount: number;
  /** Totals rows: 0 or 1 (`totalsRowCount`, default 0). */
  readonly totalsRowCount: number;
  readonly columns: readonly OgeTableColumn[];
  readonly style?: OgeTableStyleInfo;
  /** The header's filter buttons and criteria; absent when the table shows no buttons. */
  readonly autoFilter?: OgeAutoFilter;
  /** The part it was read from (`xl/tables/table1.xml`). */
  readonly part?: string;
}
