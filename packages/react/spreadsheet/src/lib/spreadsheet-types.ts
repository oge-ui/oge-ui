import type { CSSProperties } from 'react';
import type {
  OgeFindOptions,
  OgeSpreadsheetCellClickEvent,
  OgeSpreadsheetCore,
  OgeSpreadsheetHyperlinkClickEvent,
  OgeSpreadsheetLoadedEvent,
  OgeSpreadsheetLoadErrorEvent,
  OgeSpreadsheetMessages,
  OgeSpreadsheetSelectionChangeEvent,
  OgeSpreadsheetSource,
  OgeWorkbook,
} from '@oge-ui/spreadsheet-engine';

/** Props of `<OgeSpreadsheet>` — the Angular `<oge-spreadsheet>` inputs, models and outputs. */
export interface OgeSpreadsheetProps {
  /**
   * The workbook to open: bytes, a `Blob` / `File`, or a URL. Back to `null`,
   * it closes what it opened (a `workbook` given directly stays).
   */
  source?: OgeSpreadsheetSource | null;
  /** A workbook built or read elsewhere (wins over `source` when both change). */
  workbook?: OgeWorkbook | null;
  /** Overrides of the message catalog (merged over the configured one). */
  messages?: Partial<OgeSpreadsheetMessages>;
  /**
   * BCP 47 locale of the built-in number formats, separators and month names
   * — Excel takes them from the reader's region. Default: the configured
   * locale, else the browser's.
   */
  locale?: string;
  /** The name box and formula bar. Default `true`. */
  showFormulaBar?: boolean;
  /** The sheet tabs. Default: the workbook's own setting. */
  showSheetTabs?: boolean;
  /** The status bar: the selection's Average, Count and Sum, and the zoom. Default `true`. */
  showStatusBar?: boolean;
  /** Row and column headers. Default: each sheet's own setting. */
  showHeaders?: boolean;
  /** Gridlines. Default: each sheet's own setting. */
  showGridLines?: boolean;
  /** The outline's brackets and buttons beside the headers. Default: each sheet's own setting. */
  showOutlineSymbols?: boolean;
  /** The active sheet's index; the viewer shows a sheet when it changes. */
  activeSheet?: number;
  /** The first active sheet (uncontrolled); default: the workbook's own. */
  defaultActiveSheet?: number;
  /** The active sheet changed (a tab, a key, find, a link). */
  onActiveSheetChange?: (index: number) => void;
  /** The active sheet's zoom in percent; each sheet keeps its own. */
  zoom?: number;
  /** The first zoom (uncontrolled); default: the sheet's own. */
  defaultZoom?: number;
  /** The zoom changed (the status bar, Ctrl+wheel, Ctrl+= / Ctrl+−, a sheet). */
  onZoomChange?: (zoom: number) => void;
  /** A workbook opened. */
  onLoaded?: (event: OgeSpreadsheetLoadedEvent) => void;
  /** Opening a workbook failed. */
  onLoadError?: (event: OgeSpreadsheetLoadErrorEvent) => void;
  /** The selection changed. */
  onSelectionChange?: (event: OgeSpreadsheetSelectionChangeEvent) => void;
  /** An external hyperlink is about to open (set `cancel` to open it yourself). */
  onHyperlinkClick?: (event: OgeSpreadsheetHyperlinkClickEvent) => void;
  /** A cell was clicked. */
  onCellClick?: (event: OgeSpreadsheetCellClickEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** What a `ref` on `<OgeSpreadsheet>` exposes — the Angular component's public methods. */
export interface OgeSpreadsheetHandle {
  /** The controller (ADR 0003): everything that is not markup. */
  readonly core: OgeSpreadsheetCore;
  /** Opens a workbook: bytes, a `Blob` / `File`, or a URL. */
  open(source: OgeSpreadsheetSource): Promise<void>;
  /** The open workbook, or `null`. */
  getWorkbook(): OgeWorkbook | null;
  /** Shows a sheet by index; hidden sheets are refused (`false`). */
  selectSheet(index: number): boolean;
  /** Goes to a reference (`B4`, `Sheet2!A1:C3`, a defined name). `false` when unknown. */
  goTo(reference: string): boolean;
  /** Sets the zoom (10–400%). */
  setZoom(percent: number): void;
  /** Searches the sheet (or the workbook) and selects the first match. */
  find(query: string, options?: OgeFindOptions): void;
  /** Copies the selection to the clipboard (text and Excel-compatible HTML). */
  copy(): Promise<boolean>;
  /** Prints the active sheet's used range as a table. */
  print(): void;
  /** Focuses the grid. */
  focus(): void;
}
