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
import type { OgeWorksheet } from '../model/worksheet';
import {
  OGE_ESTIMATING_MEASURER,
  type OgeTextMeasurer,
} from '../paint/cell-text';
import { OgeConditionalFormatter } from '../paint/conditional';
import { OgeTableFormatter } from '../paint/table-format';
import { ogePaintWindow, type OgePaintCell } from '../paint/paint-window';
import {
  ogePlaceCharts,
  ogePlacePictures,
  type OgePaintChart,
  type OgePaintPicture,
} from '../paint/pictures';
import { OgeStyleResolver } from '../paint/resolve-style';
import { OgeSheetLayout } from '../paint/sheet-layout';
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
import { ogeRenderPane, type OgeRenderPane } from './render';
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
  'none' | 'copy' | 'find' | 'goto' | 'open-link';

/** The fields of a pointer event the gestures read (a DOM or React event fits). */
export interface OgeGridPointerInput {
  readonly pointerId: number;
  readonly button: number;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
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

/** A popup list of the chrome: every sheet (the strip's), or the defined names (the name box's). */
export type OgeSpreadsheetMenuKind = 'sheets' | 'names';

/** The chrome's popup list. */
export interface OgeSpreadsheetMenuState {
  /** The open list; `null` while none is. */
  readonly kind: OgeSpreadsheetMenuKind | null;
  /** The focused item's position in `menuItems()`. */
  readonly focus: number;
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
    kind: 'cells' | 'rows' | 'columns';
    pointer: number;
    moved: boolean;
    start: OgeCellRef;
    last: OgeCellRef;
  } | null = null;
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
   * Shows a workbook built or read elsewhere. A sheet or zoom requested
   * before it opened (`requestSheet`, `requestZoom`) wins over the file's.
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
    if (!workbook) return;
    this.enterSheet(workbook.activeSheet, false);
    if (this.pendingSheet !== undefined) this.selectSheet(this.pendingSheet);
    if (this.pendingZoom !== undefined) this.setZoom(this.pendingZoom);
    this.pendingSheet = undefined;
    this.pendingZoom = undefined;
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
    if (announce) {
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
    let tables = this.tableFormatters.get(sheet);
    if (!tables && sheet.tables.length) {
      tables = new OgeTableFormatter(workbook, sheet, this.resolver);
      this.tableFormatters.set(sheet, tables);
    }
    const cells = ogePaintWindow(sheet, layout, this.resolver, range, {
      measurer: this.measurer,
      locale: this.locale,
      dateSystem: workbook.dateSystem,
      ...(formatter ? { conditional: formatter } : {}),
      ...(tables?.active ? { tables } : {}),
    });
    return ogeZoomPaint(cells, layout, zoom);
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
            ogeZoomFont(
              resolver.font({ ...cell.font.source, ...run.font }),
              zoom,
            ),
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
    input: Pick<OgeGridPointerInput, 'pointerId'>,
  ): void {
    const sheet = this.sheet();
    if (!sheet) return;
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

  /** The pointer was taken away (`pointercancel`): the drag ends where it is. */
  pointerCancel(): void {
    this.drag = null;
  }

  /** The pointer left the grid. */
  pointerLeave(): void {
    if (this.hover()) this.hover.set(null);
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
    // table stripes count the visible rows and columns
    this.tableFormatters.delete(sheet);
    this.bump();
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

/** A reference without `$`, quotes or case, for comparing a name with a selection. */
function normalizeReference(text: string): string {
  return text.replace(/\$/g, '').replace(/'/g, '').toUpperCase();
}
