/**
 * What the viewer takes and tells, in either render layer: the source it
 * opens and the payloads of its events (Angular outputs, React callbacks).
 */
import type { OgeSheetRange } from '../address/address';
import type { OgeImportIssue } from '../codec/import-issues';
import type { OgeXlsxError, OgeXlsxSource } from '../codec/read-xlsx';
import type { OgeHyperlink } from '../model/sheet-features';
import type { OgeWorkbook } from '../model/workbook';

/**
 * What the viewer opens: the workbook's bytes, a `Blob` / `File`, or a URL
 * it fetches (same-origin credentials).
 */
export type OgeSpreadsheetSource = OgeXlsxSource | string;

/** Emitted once a workbook is open. */
export interface OgeSpreadsheetLoadedEvent {
  readonly workbook: OgeWorkbook;
  /** What the reader could not show as Excel does (aggregated per code and place). */
  readonly issues: readonly OgeImportIssue[];
}

/** Emitted when opening a workbook fails. */
export interface OgeSpreadsheetLoadErrorEvent {
  readonly error: OgeXlsxError;
}

/** Emitted after the selection changed. */
export interface OgeSpreadsheetSelectionChangeEvent {
  /** Index of the active sheet. */
  readonly sheet: number;
  readonly ranges: readonly OgeSheetRange[];
  /** The active cell (zero-based). */
  readonly active: { readonly row: number; readonly col: number };
  /** The active cell's address, `B4`. */
  readonly address: string;
}

/**
 * Emitted before an external hyperlink opens (the target is sanitised).
 * Set `cancel` to open it yourself, or not at all.
 */
export interface OgeSpreadsheetHyperlinkClickEvent {
  readonly href: string;
  readonly link: OgeHyperlink;
  cancel: boolean;
}

/** Emitted when a cell is clicked. */
export interface OgeSpreadsheetCellClickEvent {
  readonly row: number;
  readonly col: number;
  readonly address: string;
  /** What the cell shows, as text. */
  readonly text: string;
  readonly event: MouseEvent;
}
