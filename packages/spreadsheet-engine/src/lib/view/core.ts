/**
 * `OgeSpreadsheetCore`: the whole viewer controller both render layers run
 * (ADR 0005, phase P1) — the open workbook, the active sheet, selection,
 * Excel's keyboard map, find, copy, hyperlinks, zoom and screen-reader
 * announcements, the grid frame, pointer gestures and the find bar — on an
 * injected reactivity (signals in Angular, a versioned store in React). It
 * never touches the DOM: the render layers measure the scroller, scroll it
 * and focus on its instructions; fetching, object URLs, the clipboard,
 * links and printing go through `browser.ts`, which is guarded off the browser.
 */
import { sanitizeUrl } from '@oge-ui/behavior';
import {
  contrastForeground,
  ogeFormatMessage,
  parseColor,
  type OgeMessageValues,
} from '@oge-ui/core';
import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  formatOgeCellAddress,
  ogeColumnName,
  ogeRangeContains,
  parseOgeRangeAddress,
  type OgeCellRef,
  type OgeSheetRange,
} from '../address/address';
import { ogeDisplayFormula } from '../codec/formula-text';
import type { OgeImportIssue } from '../codec/import-issues';
import {
  OgeXlsxError,
  readOgeXlsx,
  type OgeXlsxReadOptions,
  type OgeXlsxSource,
} from '../codec/read-xlsx';
import { OGE_OFFICE_THEME_COLORS } from '../color/color';
import { OGE_GENERAL_MAX_CHARS, formatOgeGeneral } from '../format/general';
import { formatOgeCellValue } from '../format/number-format';
import {
  OGE_EN_US_FORMAT_LOCALE,
  type OgeFormatLocale,
} from '../format/format-locale';
import {
  isOgeCellError,
  isOgeRichText,
  ogeRichTextToString,
  type OgeCell,
} from '../model/cell';
import type { OgeSheetChart } from '../model/chart';
import type { OgeHyperlink } from '../model/sheet-features';
import type { OgeWorkbook } from '../model/workbook';
import type { OgeSparklineType } from '../model/sparkline';
import type { OgeColumnInfo, OgeWorksheet } from '../model/worksheet';
import {
  OGE_ESTIMATING_MEASURER,
  type OgeTextMeasurer,
} from '../paint/cell-text';
import { OgeConditionalFormatter } from '../paint/conditional';
import { OgeSparklineFormatter } from '../paint/sparkline-format';
import { OgeTableFormatter } from '../paint/table-format';
import { ogeAutofitColumnWidth, ogeAutofitRowHeight } from '../paint/autofit';
import { ogeColumnPadding } from '../metrics/font-metrics';
import { ogePixelsToPoints } from '../metrics/sheet-metrics';
import { ogePaintWindow, type OgePaintCell } from '../paint/paint-window';
import {
  ogePlaceCharts,
  ogePlacePictures,
  type OgePaintChart,
  type OgePaintPicture,
} from '../paint/pictures';
import { OgeStyleResolver } from '../paint/resolve-style';
import {
  OgeSheetLayout,
  ogeListedRows,
  ogeRowHeightPixels,
} from '../paint/sheet-layout';
import { ogeZoomFont, ogeZoomPaint, ogeZoomPictures } from '../paint/zoom';
import {
  OgeObjectUrls,
  ogeFetchWorkbook,
  ogePrintSheetTable,
  ogeWriteClipboard,
} from './browser';
import {
  ogeChartLabel,
  ogeChartView,
  type OgeSpreadsheetChartView,
} from './chart-view';
import {
  ogeCopyRange,
  ogeCellText,
  ogePrintTable,
  type OgeClipboardContent,
} from './clipboard';
import type { OgeSpreadsheetSource } from './events';
import { ogeFindAll, type OgeFindMatch, type OgeFindOptions } from './find';
import {
  ogeGridView,
  ogeNoteBoxes,
  ogePaneCharts,
  ogePanePictures,
  ogePointerCell,
  ogePointerSheetPoint,
  ogeResizeLine,
  ogeTabKeyTarget,
  type OgeGridHeaderTarget,
  type OgeGridPointerPoint,
  type OgeGridView,
  type OgeNoteBox,
  type OgeScrollPosition,
} from './grid-view';
import {
  resolveOgeSpreadsheetMessages,
  type OgeSpreadsheetMessages,
} from './messages';
import {
  ogeApplyOutlineEdit,
  ogeAxisOutline,
  ogeOutlineLevel,
  ogeOutlineToggle,
  type OgeAxisOutline,
  type OgeOutlineEdit,
  type OgeOutlineGroup,
} from './outline';
import {
  ogeCellSelection,
  ogeCurrentRegion,
  ogeDataEdge,
  ogeLastCell,
  ogeMoveCell,
  ogeMovePage,
  ogeOwnerCell,
  ogeSelectionSize,
  ogeSpanRange,
  type OgeSheetSelection,
} from './navigation';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from './reactivity';
import { ogeRenderPane, type OgeCss, type OgeRenderPane } from './render';
import { ogeSelectionSummary } from './summary';
import {
  ogeScrollToCell,
  ogeViewportPanes,
  type OgeViewportInput,
  type OgeViewportPanes,
} from './viewport';

/** The fields of a keyboard event the core reads (a DOM or React event fits). */
export interface OgeSpreadsheetKeyInput {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

/**
 * What the render layer does after a key the core handled: nothing more
 * (`'none'`), let the browser fire `copy`, focus the find bar it opened,
 * focus the name box, or follow the active cell's link.
 */
export type OgeSpreadsheetKeyAction =
  'none' | 'copy' | 'find' | 'goto' | 'open-link' | 'header-menu';

/** The fields of a pointer event the gestures read (a DOM or React event fits). */
export interface OgeGridPointerInput {
  readonly pointerId: number;
  readonly button: number;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  /** `mouse`, `pen` or `touch`: a finger gets a wider header edge to grab. */
  readonly pointerType?: string;
}

/** A row's or column's far edge, which a drag on its header resizes. */
export interface OgeResizeTarget {
  readonly axis: 'rows' | 'columns';
  readonly index: number;
}

/** A header edge being dragged, as the grid shows it (`OgeSpreadsheetCore.resizeGuide`). */
export interface OgeResizeGuide {
  readonly axis: 'rows' | 'columns';
  /** The line where the edge will be, from the grid's start corner. */
  readonly line: OgeCss;
  /** Excel's tooltip: `Width: 8.43 (64 pixels)`, `Height: 15.00 (20 pixels)`. */
  readonly tip: string;
  /** Where the tooltip sits, from the grid's start corner. */
  readonly tipStyle: OgeCss;
}

/** A click on a cell: down and up on it without a drag. */
export interface OgeGridClick {
  readonly row: number;
  readonly col: number;
  readonly address: string;
  /** What the cell shows, as text. */
  readonly text: string;
  /** A plain click (no Shift, Ctrl or ⌘) follows the cell's link. */
  readonly follow: boolean;
}

/** The visible window's size in cells, for Page Up/Down. */
export interface OgeSpreadsheetPage {
  readonly rows: number;
  readonly cols: number;
}

/** A tab of the sheet strip. */
export interface OgeSpreadsheetTab {
  readonly index: number;
  readonly name: string;
  /** `#RRGGBB` tab colour, if any. */
  readonly color?: string;
  /** The label that reads on the tab colour: dark or light (WCAG contrast). */
  readonly ink?: 'dark' | 'light';
}

/**
 * A popup list: every sheet (the strip's), the defined names (the name
 * box's), or the whole selected columns' or rows' header menu.
 */
export type OgeSpreadsheetMenuKind = 'sheets' | 'names' | 'columns' | 'rows';

/** The chrome's popup list. */
export interface OgeSpreadsheetMenuState {
  /** The open list; `null` while none is. */
  readonly kind: OgeSpreadsheetMenuKind | null;
  /** The focused item's position in `menuItems()`. */
  readonly focus: number;
  /** A header menu's place, from the grid's start corner (`insetInlineStart`, `top`). */
  readonly style?: OgeCss;
}

/** The column width or row height dialog (`openSizeDialog`), as Excel's asks. */
export interface OgeSizeDialog {
  readonly axis: 'rows' | 'columns';
  /** The columns or rows it sizes. */
  readonly targets: readonly number[];
  /** The field's text: the first one's width in characters, or height in points. */
  readonly value: string;
  /** The text last tried is not a size: 0–255 characters, 0–409 points. */
  readonly invalid: boolean;
}

/** An item of the open popup list. */
export interface OgeSpreadsheetMenuItem {
  readonly key: string;
  readonly label: string;
  /** The sheet list's active sheet. */
  readonly checked: boolean;
}

/**
 * What the render layer does after a key in a popup list: focus the focused
 * item, give focus back to the opener (`close`; on Tab, `leave`, the browser
 * then moves on), or to the grid once an item was picked.
 */
export type OgeSpreadsheetMenuKeyAction =
  'focus' | 'close' | 'leave' | 'picked';

/** The formula bar's content. */
export interface OgeFormulaBarContent {
  readonly text: string;
  /** A dynamic array's follower shows its anchor's formula, greyed. */
  readonly ghost: boolean;
}

/** What following a hyperlink means. */
export type OgeHyperlinkAction =
  | {
      readonly kind: 'external';
      readonly href: string;
      readonly link: OgeHyperlink;
    }
  | {
      readonly kind: 'internal';
      readonly location: string;
      readonly link: OgeHyperlink;
    };

/** The find state. */
export interface OgeFindState {
  readonly open: boolean;
  readonly query: string;
  readonly options: OgeFindOptions;
  readonly matches: readonly OgeFindMatch[];
  /** Current match, `-1` before the first. */
  readonly index: number;
}

/** A request to scroll a cell into view; `token` changes for every request. */
export interface OgeRevealRequest {
  readonly row: number;
  readonly col: number;
  readonly token: number;
}

/** One item of the status bar's selection summary. */
export interface OgeStatusItem {
  readonly kind: 'average' | 'count' | 'sum';
  /** Worded and formatted (`Sum: 9.300,50`). */
  readonly text: string;
}

/** Load state. */
export type OgeSpreadsheetStatus = 'empty' | 'loading' | 'ready' | 'error';

/** Options of {@link OgeSpreadsheetCore}. */
export interface OgeSpreadsheetCoreOptions {
  readonly reactivity: OgeSpreadsheetReactivity;
  readonly messages?: Partial<OgeSpreadsheetMessages>;
  /** Format locale for built-in formats and separators. Default en-US. */
  readonly locale?: OgeFormatLocale;
  /** Measures text (the render layers pass a canvas measurer). */
  readonly measurer?: OgeTextMeasurer;
  /** Options of the xlsx reader. */
  readonly read?: Omit<OgeXlsxReadOptions, 'signal'>;
  /** "Today" for date conditional formats. */
  readonly now?: () => Date;
}

const ZOOM_STEPS = [
  10, 25, 50, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400,
];

/** The spreadsheet viewer controller. */
export class OgeSpreadsheetCore {
  readonly workbook: OgeSpreadsheetReactiveCell<OgeWorkbook | null>;
  readonly issues: OgeSpreadsheetReactiveCell<readonly OgeImportIssue[]>;
  readonly status: OgeSpreadsheetReactiveCell<OgeSpreadsheetStatus>;
  readonly error: OgeSpreadsheetReactiveCell<OgeXlsxError | null>;
  readonly activeSheet: OgeSpreadsheetReactiveCell<number>;
  readonly selection: OgeSpreadsheetReactiveCell<OgeSheetSelection>;
  readonly zoom: OgeSpreadsheetReactiveCell<number>;
  readonly findState: OgeSpreadsheetReactiveCell<OgeFindState>;
  readonly announcement: OgeSpreadsheetReactiveCell<string>;
  readonly reveal: OgeSpreadsheetReactiveCell<OgeRevealRequest>;
  /** Bumps whenever geometry or paint inputs change (measurer, workbook). */
  readonly version: OgeSpreadsheetReactiveCell<number>;
  /** Shift+F8 add mode: arrows move without extending, clicks add ranges. */
  readonly addMode: OgeSpreadsheetReactiveCell<boolean>;
  /** The cell under the pointer (its note shows, its link sets the cursor). */
  readonly hover: OgeSpreadsheetReactiveCell<OgeCellRef | null>;
  /** The cell whose note Shift+F2 opened, until Escape. */
  readonly openNote: OgeSpreadsheetReactiveCell<OgeCellRef | null>;
  /** The chrome's open popup list: the sheet list or the name box's names. */
  readonly menu: OgeSpreadsheetReactiveCell<OgeSpreadsheetMenuState>;
  /** The formula bar shows its whole text, on several lines. */
  readonly formulaExpanded: OgeSpreadsheetReactiveCell<boolean>;
  /** The header edge under the pointer, which a drag resizes (the grid shows a resize cursor). */
  readonly resizeHover: OgeSpreadsheetReactiveCell<OgeResizeTarget | null>;
  /** The header edge being dragged, and its size so far in px at 100% zoom. */
  readonly resizing: OgeSpreadsheetReactiveCell<
    (OgeResizeTarget & { readonly pixels: number }) | null
  >;
  /** The column width or row height dialog, while it is open. */
  readonly sizeDialog: OgeSpreadsheetReactiveCell<OgeSizeDialog | null>;

  private readonly catalog: OgeSpreadsheetReactiveCell<OgeSpreadsheetMessages>;
  private locale: OgeFormatLocale;
  private measurer: OgeTextMeasurer;
  private resolver: OgeStyleResolver | null = null;
  private readonly layouts = new Map<OgeWorksheet, OgeSheetLayout>();
  private readonly formatters = new Map<
    OgeWorksheet,
    OgeConditionalFormatter
  >();
  private readonly tableFormatters = new Map<OgeWorksheet, OgeTableFormatter>();
  private readonly sparklineFormatters = new Map<
    OgeWorksheet,
    OgeSparklineFormatter
  >();
  private readonly arrays = new Map<OgeWorksheet, OgeCell[]>();
  private readonly chartViews = new Map<
    OgeSheetChart,
    { readonly key: string; readonly view: OgeSpreadsheetChartView }
  >();
  private readonly outlines = new Map<
    OgeWorksheet,
    { readonly rows: OgeAxisOutline; readonly columns: OgeAxisOutline }
  >();
  private readonly selections = new Map<number, OgeSheetSelection>();
  private readonly zooms = new Map<number, number>();
  private readonly scrolls = new Map<number, OgeScrollPosition>();
  private readonly objectUrls = new OgeObjectUrls();
  private lastScroll: OgeScrollPosition = { scrollTop: 0, scrollLeft: 0 };
  private pendingSheet: number | undefined;
  private pendingZoom: number | undefined;
  private drag: {
    kind: 'cells' | 'rows' | 'columns' | 'resize';
    pointer: number;
    moved: boolean;
    start: OgeCellRef;
    last: OgeCellRef;
    /** A header edge's drag: what it resizes, where the pointer and the size started (px at the zoom). */
    resize?: {
      readonly axis: 'rows' | 'columns';
      readonly index: number;
      readonly targets: readonly number[];
      readonly origin: number;
      readonly size: number;
      readonly zoom: number;
    };
  } | null = null;
  /** The columns or rows the open header menu acts on. */
  private headerTargets: readonly number[] = [];
  private loading: AbortController | null = null;
  private revealToken = 0;
  private selectAllStage = 0;

  constructor(private readonly options: OgeSpreadsheetCoreOptions) {
    const r = options.reactivity;
    this.workbook = r.cell<OgeWorkbook | null>(null);
    this.issues = r.cell<readonly OgeImportIssue[]>([]);
    this.status = r.cell<OgeSpreadsheetStatus>('empty');
    this.error = r.cell<OgeXlsxError | null>(null);
    this.activeSheet = r.cell(0);
    this.selection = r.cell(ogeCellSelection(0, 0));
    this.zoom = r.cell(100);
    this.findState = r.cell<OgeFindState>({
      open: false,
      query: '',
      options: {},
      matches: [],
      index: -1,
    });
    this.announcement = r.cell('');
    this.reveal = r.cell<OgeRevealRequest>({ row: 0, col: 0, token: 0 });
    this.version = r.cell(0);
    this.addMode = r.cell(false);
    this.hover = r.cell<OgeCellRef | null>(null);
    this.openNote = r.cell<OgeCellRef | null>(null);
    this.menu = r.cell<OgeSpreadsheetMenuState>({ kind: null, focus: 0 });
    this.formulaExpanded = r.cell(false);
    this.resizeHover = r.cell<OgeResizeTarget | null>(null);
    this.sizeDialog = r.cell<OgeSizeDialog | null>(null);
    this.resizing = r.cell<
      (OgeResizeTarget & { readonly pixels: number }) | null
    >(null);
    this.catalog = r.cell(resolveOgeSpreadsheetMessages(options.messages));
    this.locale = options.locale ?? OGE_EN_US_FORMAT_LOCALE;
    this.measurer = options.measurer ?? OGE_ESTIMATING_MEASURER;
  }

  // ── configuration ──────────────────────────────────────────────────────

  /** Replaces the messages (a live language switch). */
  setMessages(messages: Partial<OgeSpreadsheetMessages> | undefined): void {
    this.catalog.set(resolveOgeSpreadsheetMessages(messages));
  }

  /** The current messages. */
  get text(): OgeSpreadsheetMessages {
    return this.catalog();
  }

  private get messages(): OgeSpreadsheetMessages {
    return this.catalog();
  }

  /**
   * Fills one of the catalog's templates (`{name}` placeholders, ICU
   * plurals) in the viewer's locale — for a host showing, say,
   * `text.issuesSummary`.
   */
  formatMessage(template: string, values: OgeMessageValues = {}): string {
    return ogeFormatMessage(template, values, this.locale.tag);
  }

  /** Why the workbook could not be opened, or empty. */
  errorText(): string {
    const error = this.error();
    return error ? this.messages.errors[error.code] : '';
  }

  /** The find bar's count: `2 of 5`, `No matches`, or empty before a search. */
  findCount(): string {
    const state = this.findState();
    if (!state.query) return '';
    return state.matches.length
      ? this.formatMessage(this.messages.findResult, {
          index: state.index + 1,
          total: state.matches.length,
        })
      : this.messages.noMatches;
  }

  /** The zoom slider's accessible name at the current zoom. */
  zoomText(): string {
    return this.formatMessage(this.messages.zoomLabel, {
      percent: this.zoom(),
    });
  }

  /** The format locale built-in formats and separators follow. */
  get formatLocale(): OgeFormatLocale {
    return this.locale;
  }

  /** Replaces the format locale; styles resolve again. */
  setLocale(locale: OgeFormatLocale): void {
    this.locale = locale;
    this.rebuild();
  }

  /** Replaces the text measurer (once fonts load); geometry recomputes. */
  setMeasurer(measurer: OgeTextMeasurer): void {
    this.measurer = measurer;
    this.layouts.clear();
    this.chartViews.clear();
    this.bump();
  }

  // ── loading ────────────────────────────────────────────────────────────

  /**
   * Opens a workbook from bytes, a `Blob`, or a URL (fetched with same-origin
   * credentials). A newer call cancels an older one.
   */
  async open(source: OgeSpreadsheetSource): Promise<void> {
    this.loading?.abort();
    const controller = new AbortController();
    this.loading = controller;
    this.status.set('loading');
    this.error.set(null);
    this.announcement.set(this.messages.loading);
    try {
      let bytes: OgeXlsxSource;
      if (typeof source === 'string') {
        const fetched = await ogeFetchWorkbook(source, controller.signal);
        if (controller.signal.aborted) return;
        if (!fetched)
          throw new OgeXlsxError('fetch-failed', `Cannot fetch ${source}`);
        bytes = fetched;
      } else {
        bytes = source;
      }
      const result = await readOgeXlsx(bytes, {
        ...this.options.read,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      this.setWorkbook(result.workbook, result.issues);
    } catch (error) {
      if (controller.signal.aborted) return;
      const failure =
        error instanceof OgeXlsxError
          ? error
          : new OgeXlsxError('corrupt', String(error));
      this.workbook.set(null);
      this.error.set(failure);
      this.status.set('error');
      this.announcement.set(this.messages.errors[failure.code]);
    } finally {
      if (this.loading === controller) this.loading = null;
    }
  }

  /**
   * Shows a workbook built or read elsewhere, or none (`null`). A sheet or
   * zoom requested before it opened (`requestSheet`, `requestZoom`) wins
   * over the file's; the sheet it opens at is announced.
   */
  setWorkbook(
    workbook: OgeWorkbook | null,
    issues: readonly OgeImportIssue[] = [],
  ): void {
    this.loading?.abort();
    // the old workbook's pictures and remembered positions go with it
    this.objectUrls.release();
    this.scrolls.clear();
    this.lastScroll = { scrollTop: 0, scrollLeft: 0 };
    this.drag = null;
    this.closeMenu();
    this.workbook.set(workbook);
    this.issues.set(issues);
    this.error.set(null);
    this.status.set(workbook ? 'ready' : 'empty');
    this.selections.clear();
    this.zooms.clear();
    this.rebuild();
    if (!workbook) {
      // nothing open: no "Opening workbook…" or old sheet left to be read
      this.announcement.set('');
      return;
    }
    this.enterSheet(workbook.activeSheet, false);
    if (this.pendingSheet !== undefined) this.selectSheet(this.pendingSheet);
    if (this.pendingZoom !== undefined) this.setZoom(this.pendingZoom);
    this.pendingSheet = undefined;
    this.pendingZoom = undefined;
    // the sheet it opens at replaces "Opening workbook…"
    this.announceSheet(this.activeSheet());
  }

  /** Shows a sheet now, or — before a workbook is open — once one opens. */
  requestSheet(index: number): void {
    if (this.workbook()) this.selectSheet(index);
    else this.pendingSheet = index;
  }

  /** Sets the zoom now, or — before a workbook is open — once one opens. */
  requestZoom(percent: number): void {
    if (this.workbook()) this.setZoom(percent);
    else this.pendingZoom = percent;
  }

  /** Cancels a pending open and lets the pictures' object URLs go. */
  destroy(): void {
    this.loading?.abort();
    this.loading = null;
    this.drag = null;
    this.objectUrls.release();
  }

  /**
   * Undoes `destroy` for an instance that mounts again (React StrictMode
   * remounts the same one): the next render makes the pictures' URLs anew.
   */
  revive(): void {
    this.bump();
  }

  private rebuild(): void {
    const workbook = this.workbook();
    this.resolver = workbook
      ? new OgeStyleResolver(workbook, { locale: this.locale })
      : null;
    this.layouts.clear();
    this.formatters.clear();
    this.tableFormatters.clear();
    this.sparklineFormatters.clear();
    this.arrays.clear();
    this.outlines.clear();
    this.chartViews.clear();
    this.bump();
  }

  /** The sheet's row and column outlines, made once per sheet and edit. */
  outline(sheet: OgeWorksheet | null = this.sheet()): {
    readonly rows: OgeAxisOutline;
    readonly columns: OgeAxisOutline;
  } | null {
    if (!sheet) return null;
    let known = this.outlines.get(sheet);
    if (!known) {
      known = {
        rows: ogeAxisOutline(sheet, 'rows'),
        columns: ogeAxisOutline(sheet, 'columns'),
      };
      this.outlines.set(sheet, known);
    }
    return known;
  }

  private bump(): void {
    this.version.set(this.version() + 1);
  }

  // ── sheets ─────────────────────────────────────────────────────────────

  /** The active sheet, or `null` without a workbook. */
  sheet(): OgeWorksheet | null {
    return this.workbook()?.sheets[this.activeSheet()] ?? null;
  }

  /** The tabs of the visible sheets. */
  tabs(): OgeSpreadsheetTab[] {
    const workbook = this.workbook();
    if (!workbook) return [];
    const resolver = this.styles();
    return workbook.sheets.flatMap((sheet, index) => {
      if (sheet.state !== 'visible') return [];
      const color =
        sheet.tabColor && resolver
          ? resolver.color(sheet.tabColor, null)
          : null;
      const rgba = color ? parseColor(color) : null;
      if (!color || !rgba) return [{ index, name: sheet.name }];
      const ink: OgeSpreadsheetTab['ink'] =
        contrastForeground(rgba) === 'white' ? 'light' : 'dark';
      return [{ index, name: sheet.name, color, ink }];
    });
  }

  /** Shows another sheet; hidden sheets are refused. */
  selectSheet(index: number): boolean {
    const workbook = this.workbook();
    const sheet = workbook?.sheets[index];
    if (!workbook || !sheet || sheet.state !== 'visible') return false;
    if (index === this.activeSheet()) return true;
    this.selections.set(this.activeSheet(), this.selection());
    this.zooms.set(this.activeSheet(), this.zoom());
    this.scrolls.set(this.activeSheet(), this.lastScroll);
    this.enterSheet(index, true);
    return true;
  }

  /**
   * A key on the sheet tabs: the arrow keys (mirrored on a right-to-left
   * page), Home and End show another sheet. Returns its index — the render
   * layer focuses that tab — or `null` for a key the tabs leave alone.
   */
  tabKeydown(key: string, rtl: boolean): number | null {
    const target = ogeTabKeyTarget(this.tabs(), this.activeSheet(), key, rtl);
    if (target === null) return null;
    this.selectSheet(target);
    return target;
  }

  /**
   * Records where the grid is scrolled (the scroller's own offsets) — call it
   * on every scroll and after scrolling it — so a sheet reopens where it was left.
   */
  rememberScroll(position: OgeScrollPosition): void {
    this.lastScroll = {
      scrollTop: position.scrollTop,
      scrollLeft: Math.abs(position.scrollLeft),
    };
  }

  /**
   * Where to scroll as the active sheet opens: where it was left, else at
   * its saved top-left cell. `scrollLeft` counts from the start edge (negate
   * it for a right-to-left scroller).
   */
  sheetScroll(panes: OgeViewportPanes): OgeScrollPosition {
    const saved = this.scrolls.get(this.activeSheet());
    if (saved) return saved;
    const topLeft = this.sheet()?.view.topLeft;
    return topLeft
      ? ogeScrollToCell(panes, topLeft)
      : { scrollTop: 0, scrollLeft: 0 };
  }

  private enterSheet(index: number, announce: boolean): void {
    const workbook = this.workbook();
    const sheet = workbook?.sheets[index];
    if (!workbook || !sheet) return;
    this.activeSheet.set(index);
    this.hover.set(null);
    this.openNote.set(null);
    const saved = this.selections.get(index);
    const view = sheet.view;
    const active = ogeOwnerCell(sheet, view.activeCell);
    const selection = saved ?? {
      ranges: view.selection.length
        ? view.selection.map((r) =>
            ogeSpanRange(
              sheet,
              { row: r.top, col: r.left },
              { row: r.bottom, col: r.right },
            ),
          )
        : [ogeSpanRange(sheet, active, active)],
      active,
      anchor: active,
    };
    this.selection.set(selection);
    this.zoom.set(this.zooms.get(index) ?? view.zoom);
    this.selectAllStage = 0;
    this.requestReveal(selection.active);
    if (announce) this.announceSheet(index);
  }

  /** "Sheet {name}, {index} of {total}" for the sheet now shown. */
  private announceSheet(index: number): void {
    const sheet = this.workbook()?.sheets[index];
    if (!sheet) return;
    const tabs = this.tabs();
    const position = tabs.findIndex((t) => t.index === index);
    this.announcement.set(
      this.formatMessage(this.messages.sheetAnnouncement, {
        name: sheet.name,
        index: position + 1,
        total: tabs.length,
      }),
    );
  }

  // ── geometry and paint ─────────────────────────────────────────────────

  /** The style resolver of the open workbook. */
  styles(): OgeStyleResolver | null {
    return this.resolver;
  }

  /** The geometry of a sheet (the active one by default), at 100% zoom. */
  layout(sheet: OgeWorksheet | null = this.sheet()): OgeSheetLayout | null {
    if (!sheet || !this.resolver) return null;
    let layout = this.layouts.get(sheet);
    if (!layout) {
      layout = new OgeSheetLayout(sheet, this.resolver, {
        measurer: this.measurer,
      });
      this.layouts.set(sheet, layout);
    }
    return layout;
  }

  /**
   * The panes of the active sheet for a grid of `width` × `height` px (headers
   * included) at a scroll position; zoom and active cell come from the core.
   */
  panes(
    input: Omit<OgeViewportInput, 'zoom' | 'active'>,
  ): OgeViewportPanes | null {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    if (!sheet || !layout) return null;
    return ogeViewportPanes(sheet, layout, {
      ...input,
      zoom: this.zoom(),
      active: this.selection().active,
      outlines: this.outline(sheet) ?? undefined,
    });
  }

  /** The cells to paint in a range of the active sheet, at the zoom (the current one by default). */
  paint(
    range: OgeSheetRange,
    zoom: number = this.zoom(),
  ): readonly OgePaintCell[] {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    const workbook = this.workbook();
    if (!sheet || !layout || !this.resolver || !workbook) return [];
    let formatter = this.formatters.get(sheet);
    if (!formatter && sheet.conditionalFormats.length) {
      formatter = new OgeConditionalFormatter(workbook, sheet, this.resolver, {
        now: this.options.now?.(),
      });
      this.formatters.set(sheet, formatter);
    }
    const tables = this.tableFormatter(sheet, workbook, this.resolver);
    let sparklines = this.sparklineFormatters.get(sheet);
    if (!sparklines && sheet.sparklineGroups.length) {
      sparklines = new OgeSparklineFormatter(workbook, sheet, this.resolver);
      this.sparklineFormatters.set(sheet, sparklines);
    }
    const cells = ogePaintWindow(sheet, layout, this.resolver, range, {
      measurer: this.measurer,
      locale: this.locale,
      dateSystem: workbook.dateSystem,
      ...(formatter ? { conditional: formatter } : {}),
      ...(tables?.active ? { tables } : {}),
      ...(sparklines?.active ? { sparklines } : {}),
    });
    return ogeZoomPaint(cells, layout, zoom);
  }

  /** The sheet's table styles, made once per sheet; `undefined` without tables. */
  private tableFormatter(
    sheet: OgeWorksheet,
    workbook: OgeWorkbook,
    resolver: OgeStyleResolver,
  ): OgeTableFormatter | undefined {
    let tables = this.tableFormatters.get(sheet);
    if (!tables && sheet.tables.length) {
      tables = new OgeTableFormatter(workbook, sheet, resolver);
      this.tableFormatters.set(sheet, tables);
    }
    return tables;
  }

  /**
   * The render model of the visible panes — the scrolling one, then the
   * frozen top, frozen start and frozen corner when there are frozen rows
   * or columns.
   */
  render(
    panes: OgeViewportPanes,
    options: { readonly showGridLines?: boolean } = {},
  ): readonly OgeRenderPane[] {
    const sheet = this.sheet();
    const resolver = this.resolver;
    if (!sheet || !resolver) return [];
    const zoom = panes.zoom;
    const showGridLines = options.showGridLines ?? sheet.view.showGridLines;
    const out: OgeRenderPane[] = [];
    const make = (
      key: OgeRenderPane['key'],
      rows: OgeViewportPanes['rows'],
      cols: OgeViewportPanes['cols'],
      originX: number,
      originY: number,
      width: number,
      height: number,
    ) => {
      if (rows.last < rows.first || cols.last < cols.first) return;
      out.push(
        ogeRenderPane({
          key,
          sheet,
          axes: panes.axes,
          cells: this.paint(
            {
              top: rows.first,
              left: cols.first,
              bottom: rows.last,
              right: cols.last,
            },
            zoom,
          ),
          rows,
          cols,
          originX,
          originY,
          width,
          height,
          showGridLines,
          zoom,
          runFont: (cell, run) =>
            ogeZoomFont(resolver.runFont(cell.font, run.font ?? {}), zoom),
          dashOriginX: panes.startX,
          dashOriginY: panes.startY,
        }),
      );
    };
    make(
      'main',
      panes.rows,
      panes.cols,
      panes.originX,
      panes.originY,
      panes.scrollWidth,
      panes.scrollHeight,
    );
    make(
      'top',
      panes.frozenRowSpan,
      panes.cols,
      panes.originX,
      0,
      panes.scrollWidth,
      panes.frozenHeight,
    );
    make(
      'left',
      panes.rows,
      panes.frozenColSpan,
      0,
      panes.originY,
      panes.frozenWidth,
      panes.scrollHeight,
    );
    make(
      'corner',
      panes.frozenRowSpan,
      panes.frozenColSpan,
      0,
      0,
      panes.frozenWidth,
      panes.frozenHeight,
    );
    return out;
  }

  /** The active sheet's pictures, at the zoom (the current one by default). */
  pictures(zoom: number = this.zoom()): readonly OgePaintPicture[] {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    return sheet && layout
      ? ogeZoomPictures(ogePlacePictures(sheet, layout), layout, zoom)
      : [];
  }

  /** What assistive tech hears for each of the active sheet's charts (`ogeChartLabel`). */
  chartLabels(): readonly string[] {
    return (this.sheet()?.charts ?? [])
      .filter((chart) => !chart.hidden)
      .map(ogeChartLabel)
      .filter((label) => label !== '');
  }

  /** The active sheet's charts, placed at the zoom. */
  charts(zoom: number = this.zoom()): readonly OgePaintChart[] {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    return sheet && layout
      ? ogeZoomPictures(ogePlaceCharts(sheet, layout), layout, zoom)
      : [];
  }

  /**
   * A placed chart drawn as Excel draws it (`ogeChartView`) — made once per
   * chart, size and zoom, so a scroll redraws nothing.
   */
  chartView(
    placed: OgePaintChart,
    zoom: number = this.zoom(),
  ): OgeSpreadsheetChartView {
    const width = Math.round(placed.width);
    const height = Math.round(placed.height);
    const key = `${zoom}|${width}|${height}`;
    const known = this.chartViews.get(placed.chart);
    if (known?.key === key) return known.view;
    const workbook = this.workbook();
    const view = ogeChartView({
      chart: placed.chart.chart,
      width,
      height,
      zoom,
      theme: workbook?.theme ?? OGE_OFFICE_THEME_COLORS,
      ...(workbook?.themeFonts.minor
        ? { bodyFont: workbook.themeFonts.minor }
        : {}),
      locale: this.locale,
      measurer: this.measurer,
    });
    this.chartViews.set(placed.chart, { key, view });
    return view;
  }

  /**
   * The grid frame for the panes: the render models with their selection
   * shapes, pictures and charts, the header strips, the sizer and the corner.
   */
  gridView(
    panes: OgeViewportPanes,
    options: { readonly showGridLines?: boolean } = {},
  ): OgeGridView | null {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    if (!sheet || !layout) return null;
    return ogeGridView({
      panes,
      render: this.render(panes, options),
      sheet,
      selection: this.selection(),
      spill: this.spillRange(),
      pictures: ogePanePictures(this.pictures(panes.zoom), panes, {
        rtl: sheet.view.rightToLeft,
        url: (placed) => this.pictureUrl(placed.picture.image),
      }),
      charts: ogePaneCharts(this.charts(panes.zoom), panes, {
        rtl: sheet.view.rightToLeft,
        view: (placed) => this.chartView(placed, panes.zoom),
      }),
      fontFamily: layout.normalFont.family,
    });
  }

  /**
   * An object URL for a picture's media part, made once per workbook and
   * revoked with it; `null` for a part a browser cannot show as a picture.
   */
  pictureUrl(path: string): string | null {
    return this.objectUrls.url(path, () => {
      const media = this.media(path);
      if (
        !media ||
        !media.type.startsWith('image/') ||
        media.type === 'image/svg+xml'
      )
        return null;
      return new Blob([media.data as BlobPart], { type: media.type });
    });
  }

  /**
   * The notes shown over the panes: those pinned open in the file, the one
   * under the pointer and the one Shift+F2 opened.
   */
  notes(
    panes: OgeViewportPanes,
    scroll: OgeScrollPosition,
  ): readonly OgeNoteBox[] {
    const sheet = this.sheet();
    return sheet
      ? ogeNoteBoxes(sheet, panes, [this.hover(), this.openNote()], scroll)
      : [];
  }

  /** Whether the pointer is over a cell with a hyperlink (the grid shows a hand). */
  hoverLink(): boolean {
    const at = this.hover();
    return !!at && !!this.sheet()?.hyperlinkAt(at.row, at.col);
  }

  /** What a cell of the active sheet shows, as text. */
  cellText(row: number, col: number): string {
    const sheet = this.sheet();
    const workbook = this.workbook();
    return sheet && workbook && this.resolver
      ? ogeCellText(workbook, sheet, this.resolver, row, col, this.locale)
      : '';
  }

  /**
   * The status bar's summary of the selection — Average, Count and Sum as
   * Excel shows them (`summary.ts` has the measured rules); empty when Excel
   * shows none.
   */
  statusItems(): readonly OgeStatusItem[] {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    const workbook = this.workbook();
    const resolver = this.resolver;
    if (!sheet || !layout || !workbook || !resolver) return [];
    const selection = this.selection();
    const summary = ogeSelectionSummary(sheet, layout, selection.ranges);
    if (summary.count < 2) return [];
    // the numbers take the active cell's format
    const { row, col } = selection.active;
    const stored = sheet.getCell(row, col);
    const style = resolver.get(
      stored
        ? stored.style
        : (sheet.getRow(row)?.style ?? sheet.getColumn(col)?.style),
    );
    const text = (value: number) =>
      style.format
        ? formatOgeCellValue(value, style.format, {
            locale: this.locale,
            dateSystem: workbook.dateSystem,
            localeMarkers: style.localeMarkers,
          }).text
        : (formatOgeGeneral(
            value,
            OGE_GENERAL_MAX_CHARS,
            this.locale.decimal,
          ) ?? String(value));
    const items: OgeStatusItem[] = [];
    if (summary.average !== null)
      items.push({
        kind: 'average',
        text: this.formatMessage(this.messages.statusAverage, {
          value: text(summary.average),
        }),
      });
    items.push({
      kind: 'count',
      text: this.formatMessage(this.messages.statusCount, {
        count: summary.count,
      }),
    });
    if (summary.sum !== null)
      items.push({
        kind: 'sum',
        text: this.formatMessage(this.messages.statusSum, {
          value: text(summary.sum),
        }),
      });
    return items;
  }

  /** A media part's bytes and type, for a picture (the render layer makes an object URL). */
  media(
    path: string,
  ): { readonly data: Uint8Array; readonly type: string } | undefined {
    const part = this.workbook()?.opaqueParts.find(
      (p) => p.path.toLowerCase() === path.toLowerCase(),
    );
    if (!part) return undefined;
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    const type =
      part.contentType ??
      (
        {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          bmp: 'image/bmp',
          webp: 'image/webp',
          svg: 'image/svg+xml',
          tif: 'image/tiff',
          tiff: 'image/tiff',
        } as Record<string, string>
      )[ext] ??
      'application/octet-stream';
    return { data: part.data, type };
  }

  // ── zoom ───────────────────────────────────────────────────────────────

  /** Sets the zoom (10–400%). */
  setZoom(percent: number): void {
    const value = Math.max(10, Math.min(400, Math.round(percent)));
    this.zoom.set(value);
    this.announcement.set(
      this.formatMessage(this.messages.zoomLabel, { percent: value }),
    );
  }

  /** One zoom step in or out. */
  stepZoom(direction: 1 | -1): void {
    const current = this.zoom();
    const next =
      direction > 0
        ? (ZOOM_STEPS.find((z) => z > current) ?? 400)
        : ([...ZOOM_STEPS].reverse().find((z) => z < current) ?? 10);
    this.setZoom(next);
  }

  // ── selection ──────────────────────────────────────────────────────────

  /**
   * Selects a cell: `replace` starts over, `extend` grows the active range
   * from its anchor (Shift), `add` starts a new range beside the others (Ctrl).
   */
  selectCell(
    row: number,
    col: number,
    mode: 'replace' | 'extend' | 'add' = 'replace',
  ): void {
    const sheet = this.sheet();
    if (!sheet) return;
    const target = {
      row: clamp(row, OGE_SHEET_MAX_ROWS),
      col: clamp(col, OGE_SHEET_MAX_COLUMNS),
    };
    const current = this.selection();
    const effective = mode === 'replace' && this.addMode() ? 'add' : mode;
    if (effective === 'extend') {
      const range = ogeSpanRange(sheet, current.anchor, target);
      this.setSelection(
        {
          ranges: [...current.ranges.slice(0, -1), range],
          active: current.active,
          anchor: current.anchor,
        },
        target,
      );
      return;
    }
    const owner = ogeOwnerCell(sheet, target);
    const range = ogeSpanRange(sheet, owner, owner);
    this.setSelection(
      {
        ranges: effective === 'add' ? [...current.ranges, range] : [range],
        active: owner,
        anchor: owner,
      },
      owner,
    );
  }

  /** Selects a range (its top-left becomes active unless `active` is given). */
  selectRange(range: OgeSheetRange, active?: OgeCellRef): void {
    const sheet = this.sheet();
    if (!sheet) return;
    const grown = ogeSpanRange(
      sheet,
      { row: range.top, col: range.left },
      { row: range.bottom, col: range.right },
    );
    const cell = active ?? { row: grown.top, col: grown.left };
    this.setSelection({ ranges: [grown], active: cell, anchor: cell }, cell);
  }

  /** Whole rows (Shift+Space, a row header). */
  selectRows(
    top: number,
    bottom: number,
    mode: 'replace' | 'extend' | 'add' = 'replace',
    active?: OgeCellRef,
  ): void {
    this.selectBand(
      {
        top: Math.min(top, bottom),
        bottom: Math.max(top, bottom),
        left: 0,
        right: OGE_SHEET_MAX_COLUMNS - 1,
      },
      mode,
      active,
    );
  }

  /** Whole columns (Ctrl+Space, a column header). */
  selectColumns(
    left: number,
    right: number,
    mode: 'replace' | 'extend' | 'add' = 'replace',
    active?: OgeCellRef,
  ): void {
    this.selectBand(
      {
        top: 0,
        bottom: OGE_SHEET_MAX_ROWS - 1,
        left: Math.min(left, right),
        right: Math.max(left, right),
      },
      mode,
      active,
    );
  }

  /** The whole sheet. */
  selectAll(): void {
    this.selectBand(
      {
        top: 0,
        left: 0,
        bottom: OGE_SHEET_MAX_ROWS - 1,
        right: OGE_SHEET_MAX_COLUMNS - 1,
      },
      'replace',
    );
  }

  // ── pointer ────────────────────────────────────────────────────────────

  /**
   * A pointer went down on the grid — on `header` (`ogeGridHeaderAt`), else
   * on the cell under `point`: selects the cell, rows or columns (Shift
   * extends, Ctrl / ⌘ adds) and starts a drag. `true` when the layer should
   * prevent the default, take focus and capture the pointer.
   */
  pointerDown(
    panes: OgeViewportPanes,
    point: OgeGridPointerPoint,
    header: OgeGridHeaderTarget | null,
    input: OgeGridPointerInput,
  ): boolean {
    const sheet = this.sheet();
    if (input.button !== 0 || !sheet) return false;
    const mode = input.shiftKey
      ? 'extend'
      : input.ctrlKey || input.metaKey
        ? 'add'
        : 'replace';
    // a header's edge: the drag resizes its row or column
    const edge = this.edgeAt(panes, point, header, input.pointerType);
    const sized = this.layout(sheet);
    if (edge && sized) {
      const at = ogePointerSheetPoint(sheet, panes, point);
      const axes = edge.axis === 'columns' ? panes.axes.cols : panes.axes.rows;
      this.drag = {
        kind: 'resize',
        pointer: input.pointerId,
        moved: false,
        start: { row: 0, col: 0 },
        last: { row: 0, col: 0 },
        resize: {
          ...edge,
          targets: this.resizeTargets(edge),
          origin: edge.axis === 'columns' ? at.x : at.y,
          size: axes.size(edge.index),
          zoom: panes.zoom,
        },
      };
      const lengths = edge.axis === 'columns' ? sized.cols : sized.rows;
      this.resizing.set({ ...edge, pixels: lengths.size(edge.index) });
      return true;
    }
    const active = this.selection().active;
    const start = (kind: 'cells' | 'rows' | 'columns', cell: OgeCellRef) => {
      this.drag = {
        kind,
        pointer: input.pointerId,
        moved: false,
        start: cell,
        last: cell,
      };
      return true;
    };
    if (header?.kind === 'select-all') {
      this.drag = null;
      this.selectAll();
      return true;
    }
    if (header?.kind === 'outline') {
      this.drag = null;
      this.toggleOutlineGroup(header.axis, header.group);
      return true;
    }
    if (header?.kind === 'outline-level') {
      this.drag = null;
      this.showOutlineLevel(header.axis, header.level);
      return true;
    }
    // a header click makes the band's first visible cell active, as Excel
    // does (measured in Excel for the web: D1 after a click on column D's
    // header far down the sheet, A90 on row 90's), without scrolling to it
    const layout = this.layout(sheet);
    if (header?.kind === 'column-header') {
      this.selectColumns(
        mode === 'extend' ? active.col : header.col,
        header.col,
        mode,
        layout && mode !== 'extend'
          ? ogeOwnerCell(sheet, {
              row: layout.rows.firstVisibleFrom(0),
              col: header.col,
            })
          : undefined,
      );
      return start('columns', { row: 0, col: header.col });
    }
    if (header?.kind === 'row-header') {
      this.selectRows(
        mode === 'extend' ? active.row : header.row,
        header.row,
        mode,
        layout && mode !== 'extend'
          ? ogeOwnerCell(sheet, {
              row: header.row,
              col: layout.cols.firstVisibleFrom(0),
            })
          : undefined,
      );
      return start('rows', { row: header.row, col: 0 });
    }
    const cell = ogePointerCell(sheet, panes, point);
    if (!cell) return false;
    this.selectCell(cell.row, cell.col, mode);
    return start('cells', cell);
  }

  /**
   * The pointer moved: the hover cell follows it, and a drag extends the
   * selection to the cell under it — or, past the cells or along the
   * headers, to the nearest one.
   */
  pointerMove(
    panes: OgeViewportPanes,
    point: OgeGridPointerPoint,
    input: Pick<OgeGridPointerInput, 'pointerId' | 'pointerType'>,
    header: OgeGridHeaderTarget | null = null,
  ): void {
    const sheet = this.sheet();
    if (!sheet) return;
    const resize = this.drag?.resize;
    if (resize) {
      // an edge follows the pointer; Excel's tooltip says the size
      if (this.drag?.pointer !== input.pointerId) return;
      const at = ogePointerSheetPoint(sheet, panes, point);
      const size = Math.max(
        0,
        resize.size + (resize.axis === 'columns' ? at.x : at.y) - resize.origin,
      );
      const pixels = Math.min(
        this.maxSize(resize.axis),
        Math.round((size * 100) / resize.zoom),
      );
      (this.drag as { moved: boolean }).moved = true;
      if (pixels !== this.resizing()?.pixels)
        this.resizing.set({ axis: resize.axis, index: resize.index, pixels });
      return;
    }
    const edge = this.drag
      ? null
      : this.edgeAt(panes, point, header, input.pointerType);
    const over = this.resizeHover();
    if (edge?.axis !== over?.axis || edge?.index !== over?.index)
      this.resizeHover.set(edge);
    const cell = ogePointerCell(sheet, panes, point);
    const hovered = this.hover();
    if (cell?.row !== hovered?.row || cell?.col !== hovered?.col)
      this.hover.set(cell);
    const drag = this.drag;
    if (!drag || drag.pointer !== input.pointerId) return;
    const to = ogePointerCell(sheet, panes, point, true);
    if (!to || (to.row === drag.last.row && to.col === drag.last.col)) return;
    drag.moved = true;
    drag.last = to;
    if (drag.kind === 'cells') this.selectCell(to.row, to.col, 'extend');
    else if (drag.kind === 'rows')
      this.selectRows(drag.start.row, to.row, 'extend');
    else this.selectColumns(drag.start.col, to.col, 'extend');
  }

  /** The pointer went up: the click it ends — down and up on one cell, no drag — or `null`. */
  pointerUp(
    panes: OgeViewportPanes,
    point: OgeGridPointerPoint,
    input: OgeGridPointerInput,
  ): OgeGridClick | null {
    const drag = this.drag;
    this.drag = null;
    if (drag?.resize) {
      // the edge lands: the row or column, and the selected ones with it, take the size
      const done = this.resizing();
      this.resizing.set(null);
      const layout = this.layout(this.sheet());
      if (drag.moved && done && layout) {
        const lengths = done.axis === 'columns' ? layout.cols : layout.rows;
        if (done.pixels !== lengths.size(done.index)) {
          if (done.axis === 'columns')
            this.resizeColumns(drag.resize.targets, done.pixels);
          else this.resizeRows(drag.resize.targets, done.pixels);
        }
      }
      return null;
    }
    const sheet = this.sheet();
    if (!sheet || !drag || drag.kind !== 'cells' || drag.moved) return null;
    const cell = ogePointerCell(sheet, panes, point);
    if (!cell || cell.row !== drag.start.row || cell.col !== drag.start.col)
      return null;
    return {
      row: cell.row,
      col: cell.col,
      address: formatOgeCellAddress(cell),
      text: this.cellText(cell.row, cell.col),
      follow: !input.shiftKey && !input.ctrlKey && !input.metaKey,
    };
  }

  /** The pointer was taken away (`pointercancel`): the drag ends where it is, an edge where it was. */
  pointerCancel(): void {
    this.drag = null;
    if (this.resizing()) this.resizing.set(null);
  }

  /** The pointer left the grid. */
  pointerLeave(): void {
    if (this.hover()) this.hover.set(null);
    if (this.resizeHover() && !this.drag) this.resizeHover.set(null);
  }

  /**
   * A double-click on the grid: on a header's edge it AutoFits the row or
   * column, and the selected ones with it, as Excel does. `true` when it did.
   */
  doubleClick(
    panes: OgeViewportPanes,
    point: OgeGridPointerPoint,
    header: OgeGridHeaderTarget | null,
    input: Pick<OgeGridPointerInput, 'pointerType'> = {},
  ): boolean {
    // the grid captured the pointer at the first press: the double-click
    // targets the grid, so its header comes from where it is
    const edge = this.edgeAt(
      panes,
      point,
      header ?? this.headerAt(panes, point),
      input.pointerType,
    );
    if (!edge) return false;
    const targets = this.resizeTargets(edge);
    return edge.axis === 'columns'
      ? this.autofitColumns(targets)
      : this.autofitRows(targets);
  }

  /**
   * The header edge a pointer is on: a column header's far edge, or its near
   * edge — the visible column before it — within a few pixels; the same for
   * rows. `null` elsewhere, and on a sheet protected against it.
   */
  private edgeAt(
    panes: OgeViewportPanes,
    point: OgeGridPointerPoint,
    header: OgeGridHeaderTarget | null,
    pointerType: string | undefined,
  ): OgeResizeTarget | null {
    const sheet = this.sheet();
    if (!sheet || !header) return null;
    if (header.kind !== 'column-header' && header.kind !== 'row-header')
      return null;
    const axis = header.kind === 'column-header' ? 'columns' : 'rows';
    if (!this.canResize(axis)) return null;
    // a finger gets more room than a mouse
    const slop = pointerType && pointerType !== 'mouse' ? 8 : 3;
    const at = ogePointerSheetPoint(sheet, panes, point);
    const lengths = axis === 'columns' ? panes.axes.cols : panes.axes.rows;
    const index = header.kind === 'column-header' ? header.col : header.row;
    const position = axis === 'columns' ? at.x : at.y;
    if (Math.abs(position - lengths.offset(index + 1)) <= slop)
      return { axis, index };
    if (Math.abs(position - lengths.offset(index)) <= slop)
      for (let i = index - 1; i >= 0; i--)
        if (lengths.size(i) > 0) return { axis, index: i };
    return null;
  }

  /**
   * A right-click on the grid: on a column or row header it selects that
   * column or row — unless it is selected already, as Excel does — and opens
   * its header menu at the pointer. `true` when it did (the layer keeps the
   * browser's own menu away).
   */
  contextMenu(
    panes: OgeViewportPanes,
    point: OgeGridPointerPoint,
    header: OgeGridHeaderTarget | null,
    scroll: OgeScrollPosition,
  ): boolean {
    const target = header ?? this.headerAt(panes, point);
    if (target?.kind !== 'column-header' && target?.kind !== 'row-header')
      return false;
    const axis = target.kind === 'column-header' ? 'columns' : 'rows';
    if (!this.canResize(axis)) return false;
    const index = target.kind === 'column-header' ? target.col : target.row;
    if (!this.wholeSelected(axis, index)) this.selectHeader(axis, index);
    return this.openHeaderMenu(panes, scroll, point);
  }

  /**
   * Opens the header menu of the whole selected columns or rows the active
   * cell is in — Column width…, AutoFit, Hide, Unhide — under the active
   * cell's header, as Shift+F10 does (`keydown` says `header-menu`), or at
   * a right-click's `point`. `false` when there is no such selection.
   */
  openHeaderMenu(
    panes: OgeViewportPanes,
    scroll: OgeScrollPosition,
    point?: OgeGridPointerPoint,
  ): boolean {
    const sheet = this.sheet();
    const axis = this.wholeAxis();
    if (!sheet || !axis || !this.canResize(axis)) return false;
    const active = this.selection().active;
    const index = axis === 'columns' ? active.col : active.row;
    this.headerTargets = this.resizeTargets({ axis, index });
    let x: number;
    let y: number;
    if (point) {
      x = sheet.view.rightToLeft
        ? point.rect.right - point.clientX
        : point.clientX - point.rect.left;
      y = point.clientY - point.rect.top;
    } else if (axis === 'columns') {
      // under the active column's header
      x =
        panes.axes.cols.offset(index) -
        (index < panes.frozenColumns
          ? 0
          : panes.originX + Math.abs(scroll.scrollLeft) - panes.frozenWidth) +
        panes.startX;
      y = panes.startY;
    } else {
      x = panes.startX;
      y =
        panes.axes.rows.offset(index + 1) -
        (index < panes.frozenRows
          ? 0
          : panes.originY + scroll.scrollTop - panes.frozenHeight) +
        panes.startY;
    }
    this.menu.set({
      kind: axis,
      focus: 0,
      style: {
        insetInlineStart: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`,
      },
    });
    return true;
  }

  /** Which whole selected columns or rows the active cell is in: their header menu's axis. */
  private wholeAxis(): 'rows' | 'columns' | null {
    const { active } = this.selection();
    if (this.wholeSelected('columns', active.col)) return 'columns';
    if (this.wholeSelected('rows', active.row)) return 'rows';
    return null;
  }

  /** Whether a column or row is selected whole. */
  private wholeSelected(axis: 'rows' | 'columns', index: number): boolean {
    return this.selection().ranges.some((r) =>
      axis === 'columns'
        ? r.top === 0 &&
          r.bottom === OGE_SHEET_MAX_ROWS - 1 &&
          index >= r.left &&
          index <= r.right
        : r.left === 0 &&
          r.right === OGE_SHEET_MAX_COLUMNS - 1 &&
          index >= r.top &&
          index <= r.bottom,
    );
  }

  /** Selects a column or row as a click on its header does: the band's first visible cell active. */
  private selectHeader(axis: 'rows' | 'columns', index: number): void {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    if (!sheet) return;
    if (axis === 'columns')
      this.selectColumns(
        index,
        index,
        'replace',
        layout
          ? ogeOwnerCell(sheet, {
              row: layout.rows.firstVisibleFrom(0),
              col: index,
            })
          : undefined,
      );
    else
      this.selectRows(
        index,
        index,
        'replace',
        layout
          ? ogeOwnerCell(sheet, {
              row: index,
              col: layout.cols.firstVisibleFrom(0),
            })
          : undefined,
      );
  }

  /** The row or column header under a point, found by where it is. */
  private headerAt(
    panes: OgeViewportPanes,
    point: OgeGridPointerPoint,
  ): OgeGridHeaderTarget | null {
    const sheet = this.sheet();
    if (!sheet) return null;
    const x = sheet.view.rightToLeft
      ? point.rect.right - point.clientX
      : point.clientX - point.rect.left;
    const y = point.clientY - point.rect.top;
    const at = ogePointerSheetPoint(sheet, panes, point);
    const { rowHeaderWidth, columnHeaderHeight } = panes.headers;
    if (
      y >= panes.startY - columnHeaderHeight &&
      y < panes.startY &&
      x >= panes.startX
    )
      return { kind: 'column-header', col: panes.axes.cols.indexAt(at.x) };
    if (
      x >= panes.startX - rowHeaderWidth &&
      x < panes.startX &&
      y >= panes.startY
    )
      return { kind: 'row-header', row: panes.axes.rows.indexAt(at.y) };
    return null;
  }

  /** What dragging an edge resizes: its row or column, or every selected one when it is selected whole. */
  private resizeTargets({ axis, index }: OgeResizeTarget): number[] {
    const whole = this.selection().ranges.filter((r) =>
      axis === 'columns'
        ? r.top === 0 && r.bottom === OGE_SHEET_MAX_ROWS - 1
        : r.left === 0 && r.right === OGE_SHEET_MAX_COLUMNS - 1,
    );
    const span = (r: OgeSheetRange) =>
      axis === 'columns' ? [r.left, r.right] : [r.top, r.bottom];
    if (!whole.some((r) => index >= span(r)[0] && index <= span(r)[1]))
      return [index];
    const out = new Set<number>();
    for (const r of whole) {
      const [first, last] = span(r);
      for (let i = first; i <= last; i++) out.add(i);
    }
    return [...out].sort((a, b) => a - b);
  }

  /** Excel's largest column (255 characters) or row (409.5 pt), px at 100%. */
  private maxSize(axis: 'rows' | 'columns'): number {
    const mdw = this.layout(this.sheet())?.maxDigitWidth ?? 7;
    return axis === 'columns' ? 255 * mdw + ogeColumnPadding(mdw) : 546;
  }

  /**
   * The edge being dragged as the grid shows it: the line where it will be
   * and Excel's tooltip beside it; `null` when none is.
   */
  resizeGuide(
    panes: OgeViewportPanes,
    scroll: OgeScrollPosition,
  ): OgeResizeGuide | null {
    const state = this.resizing();
    if (!state) return null;
    const size = Math.round((state.pixels * panes.zoom) / 100);
    const line = ogeResizeLine(panes, state.axis, state.index, size, scroll);
    return {
      axis: state.axis,
      line,
      tip: this.sizeTip(state.axis, state.pixels),
      // past the line's far side, along the headers
      tipStyle:
        state.axis === 'columns'
          ? {
              insetInlineStart: `${parseFloat(line['insetInlineStart']) + 6}px`,
              top: '2px',
            }
          : {
              insetInlineStart: `${panes.startX + 2}px`,
              top: `${parseFloat(line['top']) + 4}px`,
            },
    };
  }

  private selectBand(
    range: OgeSheetRange,
    mode: 'replace' | 'extend' | 'add',
    at?: OgeCellRef,
  ): void {
    const current = this.selection();
    const active =
      mode === 'extend'
        ? current.active
        : (at ?? {
            row:
              range.top === 0 && range.bottom === OGE_SHEET_MAX_ROWS - 1
                ? current.active.row
                : range.top,
            col:
              range.left === 0 && range.right === OGE_SHEET_MAX_COLUMNS - 1
                ? current.active.col
                : range.left,
          });
    const ranges =
      mode === 'add'
        ? [...current.ranges, range]
        : mode === 'extend'
          ? [...current.ranges.slice(0, -1), range]
          : [range];
    this.setSelection(
      { ranges, active, anchor: mode === 'extend' ? current.anchor : active },
      active,
      false,
    );
  }

  private setSelection(
    selection: OgeSheetSelection,
    focus: OgeCellRef,
    reveal = true,
  ): void {
    this.selection.set(selection);
    if (reveal) this.requestReveal(focus);
    this.announceSelection(selection);
  }

  private requestReveal(cell: OgeCellRef): void {
    this.revealToken++;
    this.reveal.set({ row: cell.row, col: cell.col, token: this.revealToken });
  }

  private announceSelection(selection: OgeSheetSelection): void {
    const active = selection.ranges[selection.ranges.length - 1];
    const single =
      selection.ranges.length === 1 &&
      active.top === active.bottom &&
      active.left === active.right;
    const merged = this.sheet()?.mergeAt(
      selection.active.row,
      selection.active.col,
    );
    if (
      single ||
      (merged && selection.ranges.length === 1 && sameRange(merged, active))
    ) {
      this.announcement.set(
        this.describeCell(selection.active.row, selection.active.col),
      );
    } else {
      this.announcement.set(
        this.formatMessage(this.messages.selectionAnnouncement, {
          range: this.rangeLabel(active),
          cells: ogeSelectionSize({ ...selection, ranges: [active] }),
        }),
      );
    }
  }

  /** What a screen reader hears for a cell. */
  describeCell(row: number, col: number): string {
    const sheet = this.sheet();
    const workbook = this.workbook();
    const resolver = this.resolver;
    if (!sheet || !workbook || !resolver) return '';
    const address = formatOgeCellAddress({ row, col });
    const text = ogeCellText(workbook, sheet, resolver, row, col, this.locale);
    const parts = [
      this.formatMessage(this.messages.cellAnnouncement, {
        address,
        text: text === '' ? this.messages.emptyCell : text,
      }),
    ];
    const cell = sheet.getCell(row, col);
    if (cell?.formula !== undefined)
      parts.push(
        this.formatMessage(this.messages.hasFormula, {
          formula: `=${ogeDisplayFormula(cell.formula)}`,
        }),
      );
    const merge = sheet.mergeAt(row, col);
    if (merge)
      parts.push(
        this.formatMessage(this.messages.mergedCell, {
          range: this.rangeLabel(merge),
        }),
      );
    // the panes are hidden from assistive tech: a sparkline is named here
    const sparkline = sparklineAt(sheet, row, col);
    if (sparkline?.ref)
      parts.push(
        this.formatMessage(this.messages.hasSparkline, {
          type: sparkline.type,
          range: sparkline.ref,
        }),
      );
    const link = sheet.hyperlinkAt(row, col);
    if (link)
      parts.push(
        this.formatMessage(this.messages.hasLink, {
          target: link.target ?? link.location ?? '',
        }),
      );
    const note = sheet.getNote(row, col);
    if (note) {
      const noteText =
        typeof note.text === 'string'
          ? note.text
          : ogeRichTextToString(note.text);
      parts.push(
        note.author
          ? this.formatMessage(this.messages.hasNoteBy, {
              author: note.author,
              text: noteText,
            })
          : this.formatMessage(this.messages.hasNote, { text: noteText }),
      );
    }
    // a collapsed group's summary: its details are hidden, and how to show them
    if (
      this.outlineGroupAt('rows', row, true) >= 0 ||
      this.outlineGroupAt('columns', col, true) >= 0
    )
      parts.push(this.messages.hasCollapsedDetail);
    return parts.join(this.messages.announcementSeparator);
  }

  private rangeLabel(range: OgeSheetRange): string {
    const whole =
      range.left === 0 && range.right === OGE_SHEET_MAX_COLUMNS - 1
        ? `${range.top + 1}:${range.bottom + 1}`
        : range.top === 0 && range.bottom === OGE_SHEET_MAX_ROWS - 1
          ? `${ogeColumnName(range.left)}:${ogeColumnName(range.right)}`
          : null;
    if (whole) return whole;
    const a = formatOgeCellAddress({ row: range.top, col: range.left });
    return range.top === range.bottom && range.left === range.right
      ? a
      : `${a}:${formatOgeCellAddress({ row: range.bottom, col: range.right })}`;
  }

  /**
   * The name box: a defined name matching the selection exactly, else the
   * active cell — Excel shows the active cell, not the range, after a selection.
   */
  nameBox(): string {
    const workbook = this.workbook();
    const selection = this.selection();
    const active = selection.ranges[selection.ranges.length - 1];
    if (!workbook || !active) return '';
    const sheet = this.sheet();
    const label = this.rangeLabel(active);
    // a name defined exactly as the selection shows instead (Excel does)
    const absolute = `${sheet?.name ?? ''}!${label}`;
    const named = workbook.names.find(
      (n) =>
        !n.hidden &&
        !n.name.startsWith('_xlnm.') &&
        (n.sheet === undefined || n.sheet === this.activeSheet()) &&
        normalizeReference(n.formula) === normalizeReference(absolute),
    );
    return named ? named.name : formatOgeCellAddress(selection.active);
  }

  /** What the formula bar shows for the active cell. */
  formulaBar(): OgeFormulaBarContent {
    const sheet = this.sheet();
    const workbook = this.workbook();
    if (!sheet || !workbook || !this.resolver)
      return { text: '', ghost: false };
    const { row, col } = this.selection().active;
    const cell = sheet.getCell(row, col);
    const style = this.resolver.get(cell?.style);
    if (style.formulaHidden && sheet.protection)
      return { text: '', ghost: false };
    if (cell?.formula !== undefined) {
      const text = `=${ogeDisplayFormula(cell.formula)}`;
      return {
        text: cell.array && !cell.array.dynamic ? `{${text}}` : text,
        ghost: false,
      };
    }
    // a cell inside an array: a legacy array shows its formula, a spill greys it
    const anchor = this.arrayAnchor(sheet, row, col);
    if (anchor?.formula !== undefined) {
      const text = `=${ogeDisplayFormula(anchor.formula)}`;
      return anchor.array?.dynamic
        ? { text, ghost: true }
        : { text: `{${text}}`, ghost: false };
    }
    const value = cell?.value;
    if (value === undefined) return { text: '', ghost: false };
    if (typeof value === 'boolean')
      return { text: value ? 'TRUE' : 'FALSE', ghost: false };
    if (isOgeCellError(value)) return { text: value.code, ghost: false };
    if (typeof value === 'string' || isOgeRichText(value)) {
      const text =
        typeof value === 'string' ? value : ogeRichTextToString(value);
      return { text: style.quotePrefix ? `'${text}` : text, ghost: false };
    }
    // numbers: dates as the short date (and time), percentages with %, else full precision
    const format = style.format;
    if (format?.isDate) {
      const hasTime = Math.abs(value % 1) > 1e-9;
      const code = hasTime
        ? `${this.locale.shortDate} h:mm:ss`
        : this.locale.shortDate;
      return {
        text: formatOgeCellValue(value, code, {
          locale: this.locale,
          dateSystem: workbook.dateSystem,
        }).text,
        ghost: false,
      };
    }
    if (format?.isPercent) {
      return {
        text: `${formatOgeGeneral(value * 100, 17, this.locale.decimal) ?? value * 100}%`,
        ghost: false,
      };
    }
    return {
      text: formatOgeGeneral(value, 17, this.locale.decimal) ?? String(value),
      ghost: false,
    };
  }

  private arrayAnchor(
    sheet: OgeWorksheet,
    row: number,
    col: number,
  ): OgeCell | undefined {
    // array formulas are rare: index the sheet's anchors once
    let anchors = this.arrays.get(sheet);
    if (!anchors) {
      const found: OgeCell[] = [];
      sheet.forEachCell((cell) => {
        if (cell.array) found.push(cell);
      });
      anchors = found;
      this.arrays.set(sheet, anchors);
    }
    return anchors.find(
      (cell) => cell.array && ogeRangeContains(cell.array.range, row, col),
    );
  }

  /** The dynamic array spilling over the active cell, if any — Excel frames it in blue. */
  spillRange(): OgeSheetRange | null {
    const sheet = this.sheet();
    if (!sheet) return null;
    const { row, col } = this.selection().active;
    const anchor = this.arrayAnchor(sheet, row, col);
    return anchor?.array?.dynamic ? anchor.array.range : null;
  }

  // ── navigation ─────────────────────────────────────────────────────────

  /** Goes to a reference (`B4`, `Sheet2!A1:C3`, a defined name). `false` when unknown. */
  goTo(reference: string): boolean {
    const workbook = this.workbook();
    if (!workbook) return false;
    const text = reference.trim();
    const name = workbook.findName(text, this.activeSheet());
    const target = name ? name.formula : text;
    const parsed = parseOgeRangeAddress(target.replace(/^=/, ''));
    if (!parsed) return false;
    if (parsed.sheet !== undefined) {
      const index = workbook.sheets.findIndex(
        (s) => s.name.toUpperCase() === parsed.sheet?.toUpperCase(),
      );
      if (index < 0 || !this.selectSheet(index)) return false;
    }
    const range =
      parsed.kind === 'columns'
        ? {
            top: 0,
            bottom: OGE_SHEET_MAX_ROWS - 1,
            left: parsed.left,
            right: parsed.right,
          }
        : parsed.kind === 'rows'
          ? {
              top: parsed.top,
              bottom: parsed.bottom,
              left: 0,
              right: OGE_SHEET_MAX_COLUMNS - 1,
            }
          : parsed;
    this.selectRange(range);
    return true;
  }

  /**
   * Handles a key the way Excel does. Returns the action the render layer
   * must take (`'none'` when the key was handled entirely, `null` when the
   * core does not handle it and the browser should).
   */
  keydown(
    event: OgeSpreadsheetKeyInput,
    page: OgeSpreadsheetPage,
  ): OgeSpreadsheetKeyAction | null {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    if (!sheet || !layout) return null;
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;
    const key = event.key;
    // Escape drops an edge being dragged, where it was
    if (key === 'Escape' && this.drag?.resize) {
      this.drag = null;
      this.resizing.set(null);
      return 'none';
    }
    // Shift+F10 or the menu key on whole columns or rows: their header's
    // menu (the layer opens it where it belongs, `openHeaderMenu`)
    if (
      (key === 'F10' && shift && !ctrl && !event.altKey) ||
      key === 'ContextMenu'
    ) {
      const axis = this.wholeAxis();
      return axis && this.canResize(axis) ? 'header-menu' : null;
    }
    const selection = this.selection();
    // Shift extends from the anchor's opposite corner: track the moving end
    const moving = shift ? this.movingEnd(selection) : selection.active;
    const move = (to: OgeCellRef) => {
      if (shift) this.selectCell(to.row, to.col, 'extend');
      else this.selectCell(to.row, to.col, 'replace');
      this.selectAllStage = 0;
      return 'none' as const;
    };
    const arrow: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, sheet.view.rightToLeft ? 1 : -1],
      ArrowRight: [0, sheet.view.rightToLeft ? -1 : 1],
    };
    // Alt+Shift+Down / Up: a group's details show / hide
    if (
      event.altKey &&
      shift &&
      !ctrl &&
      (key === 'ArrowDown' || key === 'ArrowUp')
    )
      return this.outlineKey(key === 'ArrowDown') ? 'none' : null;
    if (arrow[key] && !event.altKey) {
      const [dr, dc] = arrow[key];
      return move(
        ctrl
          ? ogeDataEdge(sheet, layout, moving, dr, dc)
          : ogeMoveCell(sheet, layout, moving, dr, dc),
      );
    }
    switch (key) {
      case 'Home':
        if (ctrl) {
          const frozen = {
            row: sheet.view.frozenRows,
            col: sheet.view.frozenColumns,
          };
          return move(
            ogeOwnerCell(sheet, {
              row: layout.rows.firstVisibleFrom(frozen.row),
              col: layout.cols.firstVisibleFrom(frozen.col),
            }),
          );
        }
        return move(
          ogeOwnerCell(sheet, {
            row: moving.row,
            col: layout.cols.firstVisibleFrom(0),
          }),
        );
      case 'End':
        if (ctrl) return move(ogeOwnerCell(sheet, ogeLastCell(sheet)));
        return null;
      case 'PageDown':
      case 'PageUp': {
        if (ctrl) {
          // Ctrl+Page Down / Up: next / previous visible sheet
          const tabs = this.tabs();
          const at = tabs.findIndex((t) => t.index === this.activeSheet());
          const next = tabs[at + (key === 'PageDown' ? 1 : -1)];
          if (next) this.selectSheet(next.index);
          return 'none';
        }
        const direction = key === 'PageDown' ? 1 : -1;
        const to = event.altKey
          ? ogeMovePage(layout, moving, 0, direction * Math.max(1, page.cols))
          : ogeMovePage(layout, moving, direction * Math.max(1, page.rows), 0);
        return move(ogeOwnerCell(sheet, to));
      }
      case 'Tab':
      case 'Enter': {
        if (key === 'Enter' && event.altKey)
          return this.hyperlinkAt(selection.active.row, selection.active.col)
            ? 'open-link'
            : 'none';
        if (ctrl) return null;
        const back = shift;
        const along = key === 'Tab';
        return this.stepInSelection(sheet, layout, along, back) ?? 'none';
      }
      case ' ':
        if (shift && !ctrl) {
          const range = selection.ranges[selection.ranges.length - 1];
          this.selectRows(range.top, range.bottom);
          return 'none';
        }
        if (ctrl && !shift) {
          const range = selection.ranges[selection.ranges.length - 1];
          this.selectColumns(range.left, range.right);
          return 'none';
        }
        if (ctrl && shift) {
          this.selectAll();
          return 'none';
        }
        return null;
      case 'Backspace':
        if (ctrl) {
          this.requestReveal(selection.active);
          return 'none';
        }
        return null;
      case 'F8':
        if (shift) {
          this.addMode.set(!this.addMode());
          return 'none';
        }
        return null;
      case 'F2': {
        if (!shift) return null;
        // Shift+F2 shows the active cell's note until Escape
        const { row, col } = selection.active;
        this.openNote.set(sheet.getNote(row, col) ? { row, col } : null);
        return 'none';
      }
      case 'F5':
        return 'goto';
      case 'Escape': {
        // only what is open closes; else the key is the page's (a dialog's, say)
        const open =
          this.findState().open || this.addMode() || this.openNote() !== null;
        if (this.findState().open) this.closeFind();
        if (this.addMode()) this.addMode.set(false);
        if (this.openNote()) this.openNote.set(null);
        return open ? 'none' : null;
      }
    }
    if (ctrl && !event.altKey) {
      switch (key.toLowerCase()) {
        case 'a': {
          // first press: the current region; again (or in an empty area): everything
          const region = ogeCurrentRegion(sheet, selection.active);
          const same =
            selection.ranges.length === 1 &&
            sameRange(selection.ranges[0], region);
          if (
            this.selectAllStage === 0 &&
            !same &&
            (region.top !== region.bottom || region.left !== region.right)
          ) {
            this.selectRange(region, selection.active);
            this.selectAllStage = 1;
          } else {
            this.selectAll();
            this.selectAllStage = 0;
          }
          return 'none';
        }
        case 'c':
          return 'copy';
        case 'f':
          this.openFind();
          return 'find';
        case 'g':
          return 'goto';
        case 'u':
          // Ctrl+Shift+U: the formula bar shows its whole text, or one line
          if (!shift) return null;
          this.toggleFormulaBar();
          return 'none';
        case '+':
        case '=':
          this.stepZoom(1);
          return 'none';
        case '-':
          this.stepZoom(-1);
          return 'none';
      }
    }
    return null;
  }

  /** The end of the active range opposite its anchor (where Shift+arrow moves from). */
  private movingEnd(selection: OgeSheetSelection): OgeCellRef {
    const range = selection.ranges[selection.ranges.length - 1];
    return {
      row: selection.anchor.row === range.top ? range.bottom : range.top,
      col: selection.anchor.col === range.left ? range.right : range.left,
    };
  }

  /** Tab / Enter: inside a multi-cell selection they cycle within it, else they move. */
  private stepInSelection(
    sheet: OgeWorksheet,
    layout: OgeSheetLayout,
    along: boolean,
    back: boolean,
  ): OgeSpreadsheetKeyAction | undefined {
    const selection = this.selection();
    const range = selection.ranges[selection.ranges.length - 1];
    const single = range.top === range.bottom && range.left === range.right;
    const merged = sheet.mergeAt(selection.active.row, selection.active.col);
    if (
      single ||
      (merged && sameRange(merged, range) && selection.ranges.length === 1)
    ) {
      const to = along
        ? ogeMoveCell(
            sheet,
            layout,
            selection.active,
            0,
            back !== sheet.view.rightToLeft ? -1 : 1,
          )
        : ogeMoveCell(sheet, layout, selection.active, back ? -1 : 1, 0);
      this.selectCell(to.row, to.col);
      return 'none';
    }
    // cycle through the cells of the selection, keeping it
    let { row, col } = selection.active;
    const step = back ? -1 : 1;
    for (let guard = 0; guard < 1_000_000; guard++) {
      if (along) {
        col += step;
        if (col > range.right) {
          col = range.left;
          row = row + 1 > range.bottom ? range.top : row + 1;
        } else if (col < range.left) {
          col = range.right;
          row = row - 1 < range.top ? range.bottom : row - 1;
        }
      } else {
        row += step;
        if (row > range.bottom) {
          row = range.top;
          col = col + 1 > range.right ? range.left : col + 1;
        } else if (row < range.top) {
          row = range.bottom;
          col = col - 1 < range.left ? range.right : col - 1;
        }
      }
      const owner = ogeOwnerCell(sheet, { row, col });
      if (
        owner.row === row &&
        owner.col === col &&
        layout.rows.size(row) > 0 &&
        layout.cols.size(col) > 0
      )
        break;
    }
    this.selection.set({ ...selection, active: { row, col } });
    this.requestReveal({ row, col });
    this.announcement.set(this.describeCell(row, col));
    return 'none';
  }

  // ── copy ───────────────────────────────────────────────────────────────

  /** The clipboard content of the active range, or `null` (with an announcement) when it cannot be copied. */
  copy(): OgeClipboardContent | null {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    const workbook = this.workbook();
    if (!sheet || !layout || !workbook || !this.resolver) return null;
    const selection = this.selection();
    if (selection.ranges.length > 1) {
      this.announcement.set(this.messages.multipleSelectionCopy);
      return null;
    }
    const range = selection.ranges[0];
    // a whole row or column copies the used part only
    const used = sheet.usedRange() ?? { top: 0, left: 0, bottom: 0, right: 0 };
    const bounded = {
      top: range.top,
      left: range.left,
      bottom: Math.min(range.bottom, Math.max(range.top, used.bottom)),
      right: Math.min(range.right, Math.max(range.left, used.right)),
    };
    const content = ogeCopyRange(
      workbook,
      sheet,
      layout,
      this.resolver,
      bounded,
      this.locale,
    );
    this.announcement.set(
      this.formatMessage(this.messages.copied, { cells: content.cells }),
    );
    return content;
  }

  /** Copies the active range to the clipboard (text and Excel-compatible HTML). `false` when nothing was written. */
  async copyToClipboard(): Promise<boolean> {
    const content = this.copy();
    return content ? ogeWriteClipboard(content) : false;
  }

  /**
   * Prints the active sheet's used range as a table (the sheet's page setup
   * decides the gridlines) from the render layer's document. `false` when
   * there is nothing to print.
   */
  print(host: Document | null | undefined): boolean {
    const workbook = this.workbook();
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    const used = sheet?.usedRange();
    if (!host || !workbook || !sheet || !layout || !this.resolver || !used)
      return false;
    return ogePrintSheetTable(
      host,
      ogePrintTable(workbook, sheet, layout, this.resolver, used, this.locale),
      sheet.name,
    );
  }

  // ── outline ────────────────────────────────────────────────────────────

  /**
   * A group's button in the outline gutter (`group`: its index in the axis
   * outline's groups): an expanded group hides its details, a collapsed one
   * shows them again — Excel's Hide and Show Detail. `false` for no group.
   */
  toggleOutlineGroup(axis: 'rows' | 'columns', group: number): boolean {
    const sheet = this.sheet();
    const outline = this.outline(sheet)?.[axis];
    const target = outline?.groups[group];
    if (!sheet || !outline || !target) return false;
    this.applyOutline(sheet, axis, ogeOutlineToggle(outline, target));
    const label = (index: number) =>
      axis === 'rows' ? String(index + 1) : ogeColumnName(index);
    const message =
      axis === 'rows'
        ? target.collapsed
          ? this.messages.rowsShown
          : this.messages.rowsHidden
        : target.collapsed
          ? this.messages.columnsShown
          : this.messages.columnsHidden;
    this.announcement.set(
      this.formatMessage(message, {
        first: label(target.first),
        last: label(target.last),
      }),
    );
    return true;
  }

  /**
   * Alt+Shift+Down / Up: shows the details of the collapsed group the active
   * cell sums up, or hides those of the innermost expanded group it is in —
   * rows first, then columns. `false` when there is none.
   */
  private outlineKey(show: boolean): boolean {
    const { row, col } = this.selection().active;
    for (const axis of ['rows', 'columns'] as const) {
      const index = axis === 'rows' ? row : col;
      const group = this.outlineGroupAt(axis, index, show);
      if (group >= 0) return this.toggleOutlineGroup(axis, group);
    }
    return false;
  }

  /** The deepest group a row or column belongs to: collapsed with it as summary (`collapsed`), else expanded around it. */
  private outlineGroupAt(
    axis: 'rows' | 'columns',
    index: number,
    collapsed: boolean,
  ): number {
    const groups = this.outline()?.[axis].groups ?? [];
    let best = -1;
    groups.forEach((g: OgeOutlineGroup, i) => {
      const fits = collapsed
        ? g.collapsed && g.summary === index
        : !g.collapsed &&
          ((index >= g.first && index <= g.last) || g.summary === index);
      if (fits && (best < 0 || g.level > groups[best].level)) best = i;
    });
    return best;
  }

  /**
   * A level button: shows the rows (columns) down to `level` — 1 leaves only
   * the outermost summaries, the last shows every detail — and says so.
   */
  showOutlineLevel(axis: 'rows' | 'columns', level: number): boolean {
    const sheet = this.sheet();
    const outline = this.outline(sheet)?.[axis];
    if (!sheet || !outline) return false;
    if (!Number.isInteger(level) || level < 1 || level > outline.buttons)
      return false;
    this.applyOutline(
      sheet,
      axis,
      ogeOutlineLevel(sheet, axis, outline, level),
    );
    this.announcement.set(
      this.formatMessage(this.messages.outlineLevelShown, { level }),
    );
    return true;
  }

  /** Writes an outline edit into the sheet and lays it out again. */
  private applyOutline(
    sheet: OgeWorksheet,
    axis: 'rows' | 'columns',
    edit: OgeOutlineEdit,
  ): void {
    ogeApplyOutlineEdit(sheet, axis, edit);
    this.layouts.delete(sheet);
    this.outlines.delete(sheet);
    // table stripes count the visible rows and columns; sparklines leave out
    // hidden data, on any sheet
    this.tableFormatters.delete(sheet);
    this.sparklineFormatters.clear();
    this.bump();
  }

  // ── column widths and row heights ──────────────────────────────────────

  /**
   * Whether the sheet lets its columns or rows be resized: a protected sheet
   * only when it allows formatting them (`formatColumns="0"`).
   */
  canResize(axis: 'rows' | 'columns'): boolean {
    const attributes = this.sheet()?.protection?.attributes;
    const on = (value: string | undefined) => value === '1' || value === 'true';
    if (!attributes || !on(attributes['sheet'])) return true;
    const allowed =
      attributes[axis === 'columns' ? 'formatColumns' : 'formatRows'];
    return allowed === '0' || allowed === 'false';
  }

  /**
   * Gives columns of the active sheet a width, px at 100% zoom — 0 hides
   * them — as dragging a column header's edge does; announced. `false` when
   * nothing changed.
   */
  resizeColumns(cols: readonly number[], pixels: number): boolean {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    if (!sheet || !layout || !cols.length || !this.canResize('columns'))
      return false;
    const px = Math.max(
      0,
      Math.min(this.maxSize('columns'), Math.round(pixels)),
    );
    const width = px ? columnWidthOf(px, layout.maxDigitWidth) : 0;
    let changed = false;
    for (const [first, last] of runs(cols)) {
      // span by span, keeping what else a column carries (style, outline)
      let at = first;
      const set = (from: number, to: number, info: OgeColumnInfo) => {
        const { hidden, width: old, ...rest } = info;
        if (px === 0 ? hidden : !hidden && old === width) return;
        sheet.setColumns(
          from,
          to,
          px === 0 ? { ...info, hidden: true } : { ...rest, width },
        );
        changed = true;
      };
      for (const span of sheet.columnSpans()) {
        if (span.last < at || span.first > last) continue;
        if (span.first > at) set(at, span.first - 1, {});
        const { first: _f, last: _l, ...info } = span;
        set(Math.max(at, span.first), Math.min(last, span.last), info);
        at = Math.min(last, span.last) + 1;
        if (at > last) break;
      }
      if (at <= last) set(at, last, {});
    }
    if (!changed) return false;
    if (px > 0) this.refitWrapped(sheet, cols);
    this.sizesChanged(sheet);
    this.announceSize('columns', cols, px);
    return true;
  }

  /**
   * Gives rows of the active sheet a height, px at 100% zoom — 0 hides them
   * — as dragging a row header's edge does; announced. Every row selected
   * changes the sheet's default height. `false` when nothing changed.
   */
  resizeRows(rows: readonly number[], pixels: number): boolean {
    const sheet = this.sheet();
    if (!sheet || !rows.length || !this.canResize('rows')) return false;
    const px = Math.max(0, Math.min(this.maxSize('rows'), Math.round(pixels)));
    const points = ogePixelsToPoints(px);
    let changed = false;
    if (rows.length === OGE_SHEET_MAX_ROWS && px > 0) {
      // all of them: the sheet's default height and every row it lists,
      // custom and shown, as Excel writes it
      const { zeroHeight: _z, ...format } = sheet.format;
      sheet.format = {
        ...format,
        defaultRowHeight: points,
        customHeight: true,
      };
      for (const row of ogeListedRows(sheet)) {
        const {
          height: _h,
          customHeight: _c,
          hidden: _x,
          ...rest
        } = sheet.getRow(row) ?? {};
        sheet.setRow(row, { ...rest, height: points, customHeight: true });
      }
      changed = true;
    } else {
      for (const row of rows) {
        const info = sheet.getRow(row) ?? {};
        if (px === 0) {
          if (info.hidden) continue;
          sheet.setRow(row, { ...info, hidden: true });
        } else {
          if (!info.hidden && info.height === points && info.customHeight)
            continue;
          const { hidden: _h, ...rest } = info;
          sheet.setRow(row, { ...rest, height: points, customHeight: true });
        }
        changed = true;
      }
    }
    if (!changed) return false;
    this.sizesChanged(sheet);
    this.announceSize('rows', rows, px);
    return true;
  }

  /**
   * Fits columns of the active sheet to their contents, as Excel's AutoFit
   * does (a double-click on a column header's edge); a column with nothing
   * to fit, or hidden, keeps its width. `false` when nothing changed.
   */
  autofitColumns(cols: readonly number[]): boolean {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    const workbook = this.workbook();
    const resolver = this.resolver;
    if (!sheet || !layout || !workbook || !resolver) return false;
    if (!this.canResize('columns')) return false;
    const options = this.autofitOptions(sheet, workbook, resolver);
    let changed = false;
    for (const col of cols) {
      if (layout.cols.size(col) === 0) continue;
      const px = ogeAutofitColumnWidth(sheet, layout, resolver, col, options);
      if (px === null || px === layout.cols.size(col)) continue;
      const {
        first: _f,
        last: _l,
        ...info
      } = sheet.columnSpans().find((s) => col >= s.first && col <= s.last) ?? {
        first: 0,
        last: 0,
      };
      sheet.setColumns(col, col, {
        ...info,
        width: columnWidthOf(px, layout.maxDigitWidth),
      });
      changed = true;
    }
    if (!changed) return false;
    this.refitWrapped(sheet, cols);
    this.sizesChanged(sheet);
    this.announceFit('columns', cols);
    return true;
  }

  /**
   * Fits rows of the active sheet to their contents, as Excel's AutoFit
   * does (a double-click on a row header's edge); the height is no longer a
   * custom one. A hidden row keeps its height. `false` when nothing changed.
   */
  autofitRows(rows: readonly number[]): boolean {
    const sheet = this.sheet();
    const layout = this.layout(sheet);
    const workbook = this.workbook();
    const resolver = this.resolver;
    if (!sheet || !layout || !workbook || !resolver) return false;
    if (!this.canResize('rows')) return false;
    const options = this.autofitOptions(sheet, workbook, resolver);
    let changed = false;
    for (const row of rows) {
      if (layout.rows.size(row) === 0) continue;
      const px = ogeAutofitRowHeight(sheet, layout, resolver, row, options);
      const info = sheet.getRow(row) ?? {};
      if (px === layout.rows.size(row) && !info.customHeight) continue;
      const { customHeight: _c, ...rest } = info;
      sheet.setRow(row, { ...rest, height: ogePixelsToPoints(px) });
      changed = true;
    }
    if (!changed) return false;
    this.sizesChanged(sheet);
    this.announceFit('rows', rows);
    return true;
  }

  private autofitOptions(
    sheet: OgeWorksheet,
    workbook: OgeWorkbook,
    resolver: OgeStyleResolver,
  ) {
    const tables = this.tableFormatter(sheet, workbook, resolver);
    return {
      measurer: this.measurer,
      locale: this.locale,
      dateSystem: workbook.dateSystem,
      ...(tables?.active ? { tables } : {}),
    };
  }

  /**
   * Shows the hidden columns or rows among some, at their own size, as
   * Excel's Unhide does; announced. `false` when none of them was hidden.
   */
  unhide(axis: 'rows' | 'columns', targets: readonly number[]): boolean {
    const sheet = this.sheet();
    if (!sheet || !this.canResize(axis)) return false;
    const shown: number[] = [];
    for (const i of targets) {
      if (axis === 'columns') {
        const info = sheet.getColumn(i);
        if (!info?.hidden && info?.width !== 0) continue;
        // a column hidden by a zero width gets the default one back
        const { hidden: _h, width, ...rest } = info;
        sheet.setColumns(i, i, width ? { ...rest, width } : rest);
      } else {
        const info = sheet.getRow(i);
        const zero = info?.height === 0 && info.customHeight === true;
        if (!info?.hidden && !zero) continue;
        // a row hidden by a zero height fits again
        const { hidden: _h, height, customHeight, ...rest } = info;
        sheet.setRow(i, zero ? rest : { ...rest, height, customHeight });
      }
      shown.push(i);
    }
    if (!shown.length) return false;
    this.sizesChanged(sheet);
    const m = this.messages;
    this.announcement.set(
      this.formatMessage(
        axis === 'columns' ? m.columnsShown : m.rowsShown,
        this.ends(axis, shown),
      ),
    );
    return true;
  }

  /**
   * Opens the column width or row height dialog for some columns or rows —
   * the header menu's first item — on the first one's size, in characters
   * or points as Excel's dialog shows it.
   */
  openSizeDialog(axis: 'rows' | 'columns', targets: readonly number[]): void {
    const layout = this.layout(this.sheet());
    if (!layout || !targets.length || !this.canResize(axis)) return;
    const px = (axis === 'columns' ? layout.cols : layout.rows).size(
      targets[0],
    );
    const value =
      axis === 'columns'
        ? columnCharacters(px, layout.maxDigitWidth)
        : ogePixelsToPoints(px);
    this.sizeDialog.set({
      axis,
      targets,
      value: String(value).replace('.', this.locale.decimal),
      invalid: false,
    });
  }

  /**
   * Takes the size dialog's text: a size in range — 0–255 characters,
   * 0–409 points, either decimal mark — resizes and closes it (`true`);
   * anything else marks it invalid and keeps it open.
   */
  submitSizeDialog(text: string): boolean {
    const dialog = this.sizeDialog();
    const layout = this.layout(this.sheet());
    if (!dialog || !layout) return false;
    const trimmed = text.trim();
    const value = Number(
      trimmed.replace(this.locale.decimal, '.').replace(',', '.'),
    );
    const max = dialog.axis === 'columns' ? 255 : 409;
    if (!trimmed || !Number.isFinite(value) || value < 0 || value > max) {
      this.sizeDialog.set({ ...dialog, value: text, invalid: true });
      return false;
    }
    this.sizeDialog.set(null);
    if (dialog.axis === 'columns') {
      // measured: a width of at least one character is chars × MDW plus the
      // padding, rounded; under one, chars × (MDW + padding) (0.5 is 6 px)
      const mdw = layout.maxDigitWidth;
      const padding = ogeColumnPadding(mdw);
      this.resizeColumns(
        dialog.targets,
        Math.round(
          value >= 1 ? value * mdw + padding : value * (mdw + padding),
        ),
      );
    } else this.resizeRows(dialog.targets, ogeRowHeightPixels(value));
    return true;
  }

  /** Closes the size dialog without a change. */
  closeSizeDialog(): void {
    if (this.sizeDialog()) this.sizeDialog.set(null);
  }

  /** Excel's tooltip for a size, px at 100%: `Width: 8.43 (64 pixels)`, `Height: 15.00 (20 pixels)`. */
  sizeTip(axis: 'rows' | 'columns', pixels: number): string {
    const mdw = this.layout(this.sheet())?.maxDigitWidth ?? 7;
    const value =
      axis === 'columns'
        ? columnCharacters(pixels, mdw)
        : ogePixelsToPoints(pixels);
    const text = value.toFixed(2).replace('.', this.locale.decimal);
    return axis === 'columns'
      ? this.formatMessage(this.messages.columnWidthTip, {
          width: text,
          pixels,
        })
      : this.formatMessage(this.messages.rowHeightTip, {
          height: text,
          pixels,
        });
  }

  /**
   * Rows with wrapped text in resized columns fit again, as Excel refits
   * them: they drop the height the file stored, which the layout keeps
   * while a row's fit hangs on measuring text.
   */
  private refitWrapped(sheet: OgeWorksheet, cols: readonly number[]): void {
    const resolver = this.resolver;
    if (!resolver) return;
    const resized = new Set(cols);
    const rows = new Set<number>();
    sheet.forEachCell((cell, row, col) => {
      if (!resized.has(col) || rows.has(row)) return;
      const info = sheet.getRow(row);
      if (info?.height === undefined || info.customHeight) return;
      const style = resolver.get(cell.style ?? 0);
      if (
        style.wrap ||
        style.horizontal === 'justify' ||
        style.horizontal === 'distributed'
      )
        rows.add(row);
    });
    for (const row of rows) {
      const { height: _h, ...rest } = sheet.getRow(row) ?? {};
      sheet.setRow(row, rest);
    }
  }

  /** Sizes changed: the sheet lays out again, and what counts visible rows and columns redraws. */
  private sizesChanged(sheet: OgeWorksheet): void {
    this.layouts.delete(sheet);
    this.outlines.delete(sheet);
    this.tableFormatters.delete(sheet);
    this.sparklineFormatters.clear();
    this.bump();
  }

  private label(axis: 'rows' | 'columns', index: number): string {
    return axis === 'columns' ? ogeColumnName(index) : String(index + 1);
  }

  /** The first and last of some rows or columns, labelled (a million of them too). */
  private ends(
    axis: 'rows' | 'columns',
    indices: readonly number[],
  ): { first: string; last: string } {
    let low = Infinity;
    let high = -Infinity;
    for (const i of indices) {
      if (i < low) low = i;
      if (i > high) high = i;
    }
    return { first: this.label(axis, low), last: this.label(axis, high) };
  }

  private announceSize(
    axis: 'rows' | 'columns',
    indices: readonly number[],
    pixels: number,
  ): void {
    const { first, last } = this.ends(axis, indices);
    const m = this.messages;
    this.announcement.set(
      pixels === 0
        ? this.formatMessage(
            axis === 'columns' ? m.columnsHidden : m.rowsHidden,
            {
              first,
              last,
            },
          )
        : this.formatMessage(
            axis === 'columns' ? m.columnsResized : m.rowsResized,
            {
              count: indices.length,
              first,
              last,
              size: this.sizeTip(axis, pixels),
            },
          ),
    );
  }

  private announceFit(
    axis: 'rows' | 'columns',
    indices: readonly number[],
  ): void {
    const m = this.messages;
    this.announcement.set(
      this.formatMessage(axis === 'columns' ? m.columnsFitted : m.rowsFitted, {
        count: indices.length,
        ...this.ends(axis, indices),
      }),
    );
  }

  // ── the chrome's popup lists ───────────────────────────────────────────

  /**
   * The names the name box lists, as Excel's does: the workbook's and the
   * active sheet's visible names that refer to a range, sorted.
   */
  definedNames(): readonly string[] {
    const workbook = this.workbook();
    if (!workbook) return [];
    const sheet = this.activeSheet();
    const names = new Set<string>();
    for (const n of workbook.names) {
      if (n.hidden || n.name.startsWith('_xlnm.')) continue;
      if (n.sheet !== undefined && n.sheet !== sheet) continue;
      if (parseOgeRangeAddress(n.formula.replace(/^=/, ''))) names.add(n.name);
    }
    return [...names].sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' }),
    );
  }

  /** The open popup list's items (none while it is closed). */
  menuItems(): readonly OgeSpreadsheetMenuItem[] {
    return this.itemsOf(this.menu().kind);
  }

  /**
   * Opens a popup list on its checked item — the sheet list on the active
   * sheet — else on its first; `first` / `last` start at an end (the opener's
   * Down and Up keys). A list with no items stays closed.
   */
  openMenu(
    kind: OgeSpreadsheetMenuKind,
    focus: 'checked' | 'first' | 'last' = 'checked',
  ): void {
    const items = this.itemsOf(kind);
    if (!items.length) {
      this.closeMenu();
      return;
    }
    const checked = items.findIndex((item) => item.checked);
    this.menu.set({
      kind,
      focus:
        focus === 'last'
          ? items.length - 1
          : focus === 'first'
            ? 0
            : Math.max(0, checked),
    });
  }

  /** Closes the open popup list. */
  closeMenu(): void {
    if (this.menu().kind !== null) this.menu.set({ kind: null, focus: 0 });
  }

  /**
   * A key in the open popup list, as a menu takes it (WAI-ARIA APG): the
   * arrows move round, Home and End go to the ends, a character to the next
   * item it starts, Enter and Space pick, Escape and Tab close. `null` for a
   * key the list leaves alone.
   */
  menuKeydown(key: string): OgeSpreadsheetMenuKeyAction | null {
    const state = this.menu();
    const items = this.menuItems();
    if (state.kind === null || !items.length) return null;
    const kind = state.kind;
    const move = (focus: number): OgeSpreadsheetMenuKeyAction => {
      this.menu.set({ kind, focus });
      return 'focus';
    };
    const count = items.length;
    switch (key) {
      case 'ArrowDown':
        return move((state.focus + 1) % count);
      case 'ArrowUp':
        return move((state.focus - 1 + count) % count);
      case 'Home':
        return move(0);
      case 'End':
        return move(count - 1);
      case 'Enter':
      case ' ':
        this.pickMenuItem(state.focus);
        return 'picked';
      case 'Escape':
        this.closeMenu();
        return 'close';
      case 'Tab':
        this.closeMenu();
        return 'leave';
    }
    if (Array.from(key).length !== 1 || !key.trim()) return null;
    const start = key.toUpperCase();
    for (let step = 1; step <= count; step++) {
      const at = (state.focus + step) % count;
      if (items[at].label.toUpperCase().startsWith(start)) return move(at);
    }
    return 'focus';
  }

  /** Picks an item of the open popup list — shows that sheet, or goes to that name — and closes the list. */
  pickMenuItem(position: number): void {
    const kind = this.menu().kind;
    const item = this.menuItems()[position];
    this.closeMenu();
    if (!item) return;
    if (kind === 'sheets') {
      const tab = this.tabs()[position];
      if (tab) this.selectSheet(tab.index);
    } else if (kind === 'names') {
      this.goTo(item.label);
    } else if (kind === 'columns' || kind === 'rows') {
      const targets = this.headerTargets;
      if (item.key === 'size') this.openSizeDialog(kind, targets);
      else if (item.key === 'autofit') {
        if (kind === 'columns') this.autofitColumns(targets);
        else this.autofitRows(targets);
      } else if (item.key === 'hide') {
        if (kind === 'columns') this.resizeColumns(targets, 0);
        else this.resizeRows(targets, 0);
      } else this.unhide(kind, targets);
    }
  }

  private itemsOf(
    kind: OgeSpreadsheetMenuKind | null,
  ): readonly OgeSpreadsheetMenuItem[] {
    if (kind === 'sheets') {
      const active = this.activeSheet();
      return this.tabs().map((tab) => ({
        key: `sheet-${tab.index}`,
        label: tab.name,
        checked: tab.index === active,
      }));
    }
    if (kind === 'names') {
      return this.definedNames().map((name) => ({
        key: `name-${name}`,
        label: name,
        checked: false,
      }));
    }
    if (kind === 'columns' || kind === 'rows') {
      const m = this.messages;
      const columns = kind === 'columns';
      return [
        { key: 'size', label: columns ? m.columnWidthItem : m.rowHeightItem },
        {
          key: 'autofit',
          label: columns ? m.autofitColumnsItem : m.autofitRowsItem,
        },
        { key: 'hide', label: m.hideItem },
        { key: 'unhide', label: m.unhideItem },
      ].map((item) => ({ ...item, checked: false }));
    }
    return [];
  }

  /** Shows the formula bar's whole text on several lines, or one line again. */
  toggleFormulaBar(): void {
    this.formulaExpanded.set(!this.formulaExpanded());
  }

  // ── find ───────────────────────────────────────────────────────────────

  /** Opens the find bar. */
  openFind(): void {
    this.findState.set({ ...this.findState(), open: true });
  }

  /** Searches; the first match after the active cell becomes active. */
  find(query: string, options: OgeFindOptions = {}): void {
    const workbook = this.workbook();
    if (!workbook || !this.resolver) return;
    const matches = ogeFindAll(
      workbook,
      this.resolver,
      query,
      this.activeSheet(),
      this.locale,
      options,
    );
    const active = this.selection().active;
    const sheet = this.activeSheet();
    let index = matches.findIndex(
      (m) =>
        m.sheet === sheet &&
        (m.row > active.row || (m.row === active.row && m.col >= active.col)),
    );
    if (index < 0) index = matches.length ? 0 : -1;
    this.findState.set({ open: true, query, options, matches, index });
    this.showMatch();
  }

  /** The next (`1`) or previous (`-1`) match. */
  findNext(step: 1 | -1 = 1): void {
    const state = this.findState();
    if (state.matches.length === 0) {
      this.announcement.set(this.messages.noMatches);
      return;
    }
    const index =
      (state.index + step + state.matches.length) % state.matches.length;
    this.findState.set({ ...state, index });
    this.showMatch();
  }

  /**
   * The find bar's query, submitted (Enter, or its arrows): the next match —
   * the previous with `-1` — when it is the query already found, else a new
   * search with the bar's options.
   */
  submitFind(query: string, step: 1 | -1 = 1): void {
    const state = this.findState();
    if (state.query === query && state.matches.length) this.findNext(step);
    else this.find(query, state.options);
  }

  /** Turns a find option on or off; with a query, searches again. */
  toggleFindOption(option: keyof OgeFindOptions, query: string): void {
    const state = this.findState();
    const options = { ...state.options, [option]: !state.options[option] };
    if (query) this.find(query, options);
    else this.findState.set({ ...state, options });
  }

  /** Closes the find bar. */
  closeFind(): void {
    this.findState.set({ ...this.findState(), open: false });
  }

  private showMatch(): void {
    const state = this.findState();
    const match = state.matches[state.index];
    if (!match) {
      this.announcement.set(this.messages.noMatches);
      return;
    }
    if (match.sheet !== this.activeSheet()) this.selectSheet(match.sheet);
    this.selectCell(match.row, match.col);
    this.announcement.set(
      this.formatMessage(this.messages.findResult, {
        index: state.index + 1,
        total: state.matches.length,
      }) +
        this.messages.announcementSeparator +
        this.describeCell(match.row, match.col),
    );
  }

  // ── hyperlinks and notes ───────────────────────────────────────────────

  /** What following the hyperlink on a cell does; `null` for none. Targets are sanitised. */
  hyperlinkAt(row: number, col: number): OgeHyperlinkAction | null {
    const link = this.sheet()?.hyperlinkAt(row, col);
    if (!link) return null;
    if (link.target) {
      const full = link.location
        ? `${link.target}#${link.location}`
        : link.target;
      const href = sanitizeUrl(full);
      return href && href !== 'about:blank'
        ? { kind: 'external', href, link }
        : null;
    }
    return link.location
      ? { kind: 'internal', location: link.location, link }
      : null;
  }

  /** Follows a hyperlink: an internal one navigates; an external one is returned for the host to open. */
  followHyperlink(row: number, col: number): OgeHyperlinkAction | null {
    const action = this.hyperlinkAt(row, col);
    if (action?.kind === 'internal') this.goTo(action.location);
    return action;
  }
}

function clamp(value: number, size: number): number {
  return Math.max(0, Math.min(size - 1, Math.trunc(value)));
}

function sameRange(a: OgeSheetRange, b: OgeSheetRange): boolean {
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.bottom === b.bottom &&
    a.right === b.right
  );
}

/** The sparkline drawn in a cell: the last group's that places one there, as the formatter takes it. */
function sparklineAt(
  sheet: OgeWorksheet,
  row: number,
  col: number,
): { readonly type: OgeSparklineType; readonly ref?: string } | undefined {
  let found: { type: OgeSparklineType; ref?: string } | undefined;
  for (const group of sheet.sparklineGroups)
    for (const { cell, ref } of group.sparklines)
      if (cell.row === row && cell.col === col)
        found = { type: group.type, ref };
  return found;
}

/**
 * The characters Excel's dialog and tooltip give a column width: past one
 * character, the digit widths after the padding; under it, the part of a
 * one-character column (measured: 6 px is 0.50, 11 px 0.92).
 */
function columnCharacters(pixels: number, mdw: number): number {
  const padding = ogeColumnPadding(mdw);
  const value =
    pixels < mdw + padding
      ? pixels / (mdw + padding)
      : (pixels - padding) / mdw;
  return Math.round(value * 100) / 100;
}

/** The `width` Excel stores for a column of `pixels`: px / MDW, cut to 1/256 (measured). */
function columnWidthOf(pixels: number, mdw: number): number {
  return Math.trunc((pixels / mdw) * 256) / 256;
}

/** Sorted indices as runs of consecutive ones, `[first, last]`. */
function runs(indices: readonly number[]): [number, number][] {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i === last[1] + 1) last[1] = i;
    else out.push([i, i]);
  }
  return out;
}

/** A reference without `$`, quotes or case, for comparing a name with a selection. */
function normalizeReference(text: string): string {
  return text.replace(/\$/g, '').replace(/'/g, '').toUpperCase();
}
