/**
 * The PDF viewer: loading through pdf.js, page sizes and zoom, which pages are
 * near the viewport, drawing pages and thumbnails, text search with
 * highlights, printing, navigation and labels. The Angular and React
 * components bind this and compute nothing themselves (ADR 0006).
 *
 * pdf.js is loaded on first use from the `pdfjs` loader of the config (default
 * `import('pdfjs-dist')`, an optional peer dependency), so an application that
 * never shows a PDF never downloads it. Documents open with font evaluation
 * off (`isEvalSupported: false`); scripts and form actions never run.
 */
import { foldText } from '@oge-ui/core';
import { ogeFetchWorkbook } from '../view/browser';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '../view/reactivity';
import type {
  OgePdfJs,
  OgePdfJsDocument,
  OgePdfJsPage,
  OgePdfJsRenderTask,
  OgePdfJsTextItem,
} from './pdfjs-types';

/** What the viewer accepts: bytes, a blob, or a URL to fetch. */
export type OgePdfSource = ArrayBuffer | Uint8Array | Blob | string;

/** Why a document did not open. */
export type OgePdfErrorCode =
  'fetch-failed' | 'password' | 'invalid' | 'pdfjs-missing';

/** A zoom: a scale (`1` = 100 %), or a fit to the viewer's width or page. */
export type OgePdfZoom = number | 'fit-width' | 'fit-page';

/** The viewer's text. `{current}`, `{total}` and `{zoom}` are replaced. */
export interface OgePdfViewerMessages {
  /** Accessible name of the viewer. */
  readonly viewerLabel: string;
  /** Names a page and announces the current one. */
  readonly pageLabel: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly fitWidth: string;
  readonly fitPage: string;
  /** The zoom readout, `{zoom}` = the percentage. */
  readonly zoomLevel: string;
  readonly thumbnails: string;
  readonly search: string;
  readonly searchNext: string;
  readonly searchPrevious: string;
  /** `{current}` of `{total}` matches. */
  readonly matchCount: string;
  readonly noMatches: string;
  readonly print: string;
  readonly loading: string;
  readonly empty: string;
  readonly loadError: string;
  readonly passwordProtected: string;
}

/** The English defaults. */
export const OGE_DEFAULT_PDF_VIEWER_MESSAGES: OgePdfViewerMessages = {
  viewerLabel: 'PDF document',
  pageLabel: 'Page {current} of {total}',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fitWidth: 'Fit to width',
  fitPage: 'Fit page',
  zoomLevel: '{zoom}%',
  thumbnails: 'Page thumbnails',
  search: 'Find in document',
  searchNext: 'Next match',
  searchPrevious: 'Previous match',
  matchCount: '{current} of {total}',
  noMatches: 'No matches',
  print: 'Print',
  loading: 'Opening the document…',
  empty: 'No document to show',
  loadError: 'The document could not be opened',
  passwordProtected: 'This PDF is password-protected and cannot be previewed',
};

/** Resolved viewer defaults. */
export interface OgePdfViewerConfig {
  readonly messages: OgePdfViewerMessages;
  /** Loads pdf.js. Default `() => import('pdfjs-dist')`. */
  readonly pdfjs: () => Promise<OgePdfJs>;
  /**
   * URL of pdf.js's worker script (`pdf.worker.min.mjs`), served by your app.
   * Without one pdf.js runs on the main thread (slower on large files).
   */
  readonly workerSrc: string | undefined;
}

/** What a config provider accepts. */
export interface OgePdfViewerConfigInput {
  readonly messages?: Partial<OgePdfViewerMessages>;
  readonly pdfjs?: () => Promise<OgePdfJs>;
  readonly workerSrc?: string;
}

/** The defaults of every viewer without a provider. */
export const OGE_DEFAULT_PDF_VIEWER_CONFIG: OgePdfViewerConfig = {
  messages: OGE_DEFAULT_PDF_VIEWER_MESSAGES,
  pdfjs: () => import('pdfjs-dist') as unknown as Promise<OgePdfJs>,
  workerSrc: undefined,
};

/** Merges a config input over `base`. */
export function resolveOgePdfViewerConfig(
  config: OgePdfViewerConfigInput | undefined,
  base: OgePdfViewerConfig = OGE_DEFAULT_PDF_VIEWER_CONFIG,
): OgePdfViewerConfig {
  if (config === undefined) return base;
  return {
    messages: { ...base.messages, ...config.messages },
    pdfjs: config.pdfjs ?? base.pdfjs,
    workerSrc: config.workerSrc ?? base.workerSrc,
  };
}

/** Reported after a document opened. */
export interface OgePdfLoadedEvent {
  readonly pageCount: number;
}

/** Reported when a document did not open. */
export interface OgePdfLoadErrorEvent {
  readonly code: OgePdfErrorCode;
  readonly message: string;
}

/** A page's size in PDF points (1/72 in) at 100 %. */
export interface OgePdfPageSize {
  readonly width: number;
  readonly height: number;
}

/** A highlight box in PDF points, measured from the page's top-left corner. */
export interface OgePdfRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One search hit. */
export interface OgePdfMatch {
  /** 0-based page. */
  readonly page: number;
  readonly rects: readonly OgePdfRect[];
}

/** The text runs of one page, as {@link ogePdfFindMatches} reads them. */
export interface OgePdfPageText {
  readonly items: readonly OgePdfJsTextItem[];
  /** Page height in points: PDF y runs up, highlights run down. */
  readonly height: number;
}

/**
 * Every occurrence of `query` in the pages' text runs — case-, accent- and
 * dotless-i-insensitive (the suite's `foldText`), within one run. Each hit
 * gets the slice of its run, assuming evenly wide characters (exact enough
 * to mark the words).
 */
export function ogePdfFindMatches(
  pages: readonly OgePdfPageText[],
  query: string,
): OgePdfMatch[] {
  const needle = foldText(query.trim());
  if (!needle) return [];
  const out: OgePdfMatch[] = [];
  pages.forEach((page, pageIndex) => {
    for (const item of page.items) {
      if (!item.str) continue;
      const hay = foldText(item.str);
      // folding can change the length (ﬁ, İ): map back proportionally
      const ratio = item.str.length / Math.max(1, hay.length);
      const fontSize =
        Math.hypot(item.transform[2] ?? 0, item.transform[3] ?? 0) ||
        item.height;
      const charWidth = item.width / Math.max(1, item.str.length);
      let from = hay.indexOf(needle);
      while (from >= 0) {
        const start = Math.round(from * ratio);
        const length = Math.max(1, Math.round(needle.length * ratio));
        out.push({
          page: pageIndex,
          rects: [
            {
              x: (item.transform[4] ?? 0) + start * charWidth,
              // the box sits on the baseline, one font size tall
              y: page.height - (item.transform[5] ?? 0) - fontSize,
              width: length * charWidth,
              height: fontSize,
            },
          ],
        });
        from = hay.indexOf(needle, from + needle.length);
      }
    }
  });
  return out;
}

/** The scales `zoomIn` / `zoomOut` step through. */
export const OGE_PDF_ZOOM_STEPS: readonly number[] = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4,
];

/** CSS pixels per PDF point at 100 % (96 / 72). */
const PX_PER_POINT = 96 / 72;

/** Gap the fit modes leave around a page, in CSS px. */
const FIT_MARGIN = 24;

/**
 * The scale a zoom resolves to for a page in a viewer of `container` CSS px:
 * fit-width fills the width, fit-page shows the whole page.
 */
export function ogePdfScale(
  zoom: OgePdfZoom,
  page: OgePdfPageSize,
  container: { readonly width: number; readonly height: number },
): number {
  if (typeof zoom === 'number') return zoom;
  // not measured yet (first frame, hidden tab): 100 % until it is
  if (container.width <= 0) return 1;
  const width = Math.max(1, container.width - FIT_MARGIN);
  const byWidth = width / (page.width * PX_PER_POINT);
  if (zoom === 'fit-width' || container.height <= 0) return byWidth;
  const byHeight =
    Math.max(1, container.height - FIT_MARGIN) / (page.height * PX_PER_POINT);
  return Math.min(byWidth, byHeight);
}

/** What the core needs from its render layer. */
export interface OgePdfViewerCoreOptions {
  readonly reactivity: OgeSpreadsheetReactivity;
  readonly config: OgePdfViewerConfig;
  readonly onLoaded?: (event: OgePdfLoadedEvent) => void;
  readonly onLoadError?: (event: OgePdfLoadErrorEvent) => void;
  readonly onPageChange?: (index: number) => void;
  /** Scrolls a page into view (the layer owns the DOM). */
  readonly scrollToPage?: (index: number) => void;
}

/** Pages kept drawn on either side of the visible ones. */
const OVERSCAN = 2;

const format = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  );

/** The viewer's state machine. */
export class OgePdfViewerCore {
  private readonly statusCell: OgeSpreadsheetReactiveCell<
    'empty' | 'loading' | 'ready' | 'error'
  >;
  private readonly sizesCell: OgeSpreadsheetReactiveCell<
    readonly OgePdfPageSize[]
  >;
  private readonly indexCell: OgeSpreadsheetReactiveCell<number>;
  private readonly rangeCell: OgeSpreadsheetReactiveCell<{
    first: number;
    last: number;
  }>;
  private readonly errorCell: OgeSpreadsheetReactiveCell<string>;
  private readonly configCell: OgeSpreadsheetReactiveCell<OgePdfViewerConfig>;
  private readonly zoomCell: OgeSpreadsheetReactiveCell<OgePdfZoom>;
  private readonly containerCell: OgeSpreadsheetReactiveCell<{
    width: number;
    height: number;
  }>;
  private readonly queryCell: OgeSpreadsheetReactiveCell<string>;
  private readonly matchesCell: OgeSpreadsheetReactiveCell<
    readonly OgePdfMatch[]
  >;
  private readonly matchIndexCell: OgeSpreadsheetReactiveCell<number>;
  /** The query the current matches answer (behind `queryCell` while searching). */
  private readonly searchedCell: OgeSpreadsheetReactiveCell<string>;

  private document: OgePdfJsDocument | null = null;
  private pdfjs: OgePdfJs | null = null;
  private readonly pageCache = new Map<number, Promise<OgePdfJsPage>>();
  private readonly textCache = new Map<number, Promise<OgePdfPageText>>();
  private readonly tasks = new WeakMap<object, OgePdfJsRenderTask>();
  private loadId = 0;
  private searchId = 0;
  private abort: AbortController | null = null;

  readonly status: () => 'empty' | 'loading' | 'ready' | 'error';
  /** Page sizes in points at 100 %. */
  readonly pageSizes: () => readonly OgePdfPageSize[];
  readonly pageCount: () => number;
  /** 0-based page nearest the viewport's middle. */
  readonly index: () => number;
  readonly errorText: () => string;
  readonly currentLabel: () => string;
  readonly canGoBack: () => boolean;
  readonly canGoForward: () => boolean;
  readonly messages: () => OgePdfViewerMessages;
  readonly zoom: () => OgePdfZoom;
  /** The zoom of the current page as a whole percentage. */
  readonly zoomPercent: () => number;
  readonly zoomLabel: () => string;
  readonly canZoomIn: () => boolean;
  readonly canZoomOut: () => boolean;
  readonly searchQuery: () => string;
  readonly matches: () => readonly OgePdfMatch[];
  /** The current match, `-1` with none. */
  readonly matchIndex: () => number;
  readonly matchLabel: () => string;

  constructor(private readonly options: OgePdfViewerCoreOptions) {
    const rx = options.reactivity;
    this.statusCell = rx.cell<'empty' | 'loading' | 'ready' | 'error'>('empty');
    this.sizesCell = rx.cell<readonly OgePdfPageSize[]>([]);
    this.indexCell = rx.cell(0);
    this.rangeCell = rx.cell({ first: 0, last: OVERSCAN });
    this.errorCell = rx.cell('');
    this.configCell = rx.cell(options.config);
    this.zoomCell = rx.cell<OgePdfZoom>('fit-width');
    this.containerCell = rx.cell({ width: 0, height: 0 });
    this.queryCell = rx.cell('');
    this.matchesCell = rx.cell<readonly OgePdfMatch[]>([]);
    this.matchIndexCell = rx.cell(-1);
    this.searchedCell = rx.cell('');

    this.status = () => this.statusCell();
    this.pageSizes = () => this.sizesCell();
    this.pageCount = rx.derived(() => this.sizesCell().length);
    this.index = () => this.indexCell();
    this.errorText = () => this.errorCell();
    this.messages = () => this.configCell().messages;
    this.currentLabel = rx.derived(() => this.labelOf(this.indexCell()));
    this.canGoBack = rx.derived(() => this.indexCell() > 0);
    this.canGoForward = rx.derived(
      () => this.indexCell() < this.sizesCell().length - 1,
    );
    this.zoom = () => this.zoomCell();
    this.zoomPercent = rx.derived(() =>
      Math.round(this.scaleOf(this.indexCell()) * 100),
    );
    this.zoomLabel = rx.derived(() =>
      format(this.configCell().messages.zoomLevel, {
        zoom: this.zoomPercent(),
      }),
    );
    this.canZoomIn = rx.derived(
      () =>
        this.currentScale() < OGE_PDF_ZOOM_STEPS[OGE_PDF_ZOOM_STEPS.length - 1],
    );
    this.canZoomOut = rx.derived(
      () => this.currentScale() > OGE_PDF_ZOOM_STEPS[0],
    );
    this.searchQuery = () => this.queryCell();
    this.matches = () => this.matchesCell();
    this.matchIndex = () => this.matchIndexCell();
    this.matchLabel = rx.derived(() => {
      const total = this.matchesCell().length;
      // nothing to say before a query, or while its search is still running
      if (!this.queryCell().trim()) return '';
      if (this.searchedCell() !== this.queryCell()) return '';
      return total === 0
        ? this.configCell().messages.noMatches
        : format(this.configCell().messages.matchCount, {
            current: this.matchIndexCell() + 1,
            total,
          });
    });
  }

  /** New messages or loader settings (a live config). */
  setConfig(config: OgePdfViewerConfig): void {
    this.configCell.set(config);
  }

  /** The accessible label of page `index`. */
  labelOf(index: number): string {
    return format(this.configCell().messages.pageLabel, {
      current: index + 1,
      total: this.sizesCell().length,
    });
  }

  /** Whether page `index` is close enough to the viewport to draw. */
  isDrawn(index: number): boolean {
    const { first, last } = this.rangeCell();
    return index >= first - OVERSCAN && index <= last + OVERSCAN;
  }

  /** The scale page `index` shows at under the current zoom. */
  scaleOf(index: number): number {
    const size = this.sizesCell()[index];
    if (!size)
      return typeof this.zoomCell() === 'number'
        ? (this.zoomCell() as number)
        : 1;
    return ogePdfScale(this.zoomCell(), size, this.containerCell());
  }

  /** CSS px box of page `index` under the current zoom. */
  boxOf(index: number): { width: number; height: number } {
    const size = this.sizesCell()[index] ?? { width: 0, height: 0 };
    const scale = this.scaleOf(index) * PX_PER_POINT;
    // to 1/100 px, the precision the canvas is sized with
    const px = (n: number) => Math.round(n * 100) / 100;
    return { width: px(size.width * scale), height: px(size.height * scale) };
  }

  private currentScale(): number {
    return this.scaleOf(this.indexCell());
  }

  /** The viewer's scroll box in CSS px (the fit modes read it). */
  setContainer(width: number, height: number): void {
    const known = this.containerCell();
    if (known.width !== width || known.height !== height) {
      this.containerCell.set({ width, height });
    }
  }

  setZoom(zoom: OgePdfZoom): void {
    const next =
      typeof zoom === 'number'
        ? Math.min(
            OGE_PDF_ZOOM_STEPS[OGE_PDF_ZOOM_STEPS.length - 1],
            Math.max(OGE_PDF_ZOOM_STEPS[0], zoom),
          )
        : zoom;
    this.zoomCell.set(next);
  }

  zoomIn(): void {
    const scale = this.currentScale();
    const next = OGE_PDF_ZOOM_STEPS.find((step) => step > scale + 0.001);
    if (next !== undefined) this.setZoom(next);
  }

  zoomOut(): void {
    const scale = this.currentScale();
    const next = [...OGE_PDF_ZOOM_STEPS]
      .reverse()
      .find((step) => step < scale - 0.001);
    if (next !== undefined) this.setZoom(next);
  }

  /** Which pages the scroller shows, as {@link ogeVisiblePdfPages} reports. */
  viewport(range: { current: number; first: number; last: number }): void {
    const known = this.rangeCell();
    if (known.first !== range.first || known.last !== range.last) {
      this.rangeCell.set({ first: range.first, last: range.last });
    }
    if (range.current !== this.indexCell()) {
      this.indexCell.set(range.current);
      this.options.onPageChange?.(range.current);
    }
  }

  /** Opens a document; `null` empties the viewer. */
  async load(source: OgePdfSource | null): Promise<void> {
    const id = ++this.loadId;
    this.abort?.abort();
    this.abort = null;
    await this.closeDocument();
    this.sizesCell.set([]);
    this.errorCell.set('');
    this.indexCell.set(0);
    this.rangeCell.set({ first: 0, last: OVERSCAN });
    this.clearSearch();
    if (source === null) {
      this.statusCell.set('empty');
      return;
    }
    this.statusCell.set('loading');
    const abort = new AbortController();
    this.abort = abort;
    const raw =
      typeof source === 'string'
        ? await ogeFetchWorkbook(source, abort.signal)
        : source;
    if (id !== this.loadId) return;
    if (raw === null) {
      this.fail('fetch-failed', 'The document could not be fetched');
      return;
    }
    const data = await toBytes(raw);
    if (id !== this.loadId) return;
    let pdfjs: OgePdfJs;
    try {
      pdfjs = this.pdfjs ?? (await this.configCell().pdfjs());
    } catch (error) {
      if (id !== this.loadId) return;
      this.fail(
        'pdfjs-missing',
        `pdf.js could not be loaded — install pdfjs-dist (${String(error)})`,
      );
      return;
    }
    this.pdfjs = pdfjs;
    const workerSrc = this.configCell().workerSrc;
    if (workerSrc && pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }
    try {
      const task = pdfjs.getDocument({ data, isEvalSupported: false });
      const document = await task.promise;
      if (id !== this.loadId) {
        void document.destroy();
        return;
      }
      this.document = document;
      const sizes: OgePdfPageSize[] = [];
      for (let n = 0; n < document.numPages; n++) {
        const page = await this.page(n);
        if (id !== this.loadId) return;
        const viewport = page.getViewport({ scale: 1 });
        sizes.push({ width: viewport.width, height: viewport.height });
      }
      this.sizesCell.set(sizes);
      this.statusCell.set('ready');
      this.options.onLoaded?.({ pageCount: sizes.length });
    } catch (error) {
      if (id !== this.loadId) return;
      const name = (error as { name?: string } | null)?.name ?? '';
      this.fail(
        name === 'PasswordException' ? 'password' : 'invalid',
        String((error as Error | null)?.message ?? error),
      );
    }
  }

  private page(index: number): Promise<OgePdfJsPage> {
    let page = this.pageCache.get(index);
    if (!page) {
      if (!this.document) return Promise.reject(new Error('no document'));
      page = this.document.getPage(index + 1);
      this.pageCache.set(index, page);
    }
    return page;
  }

  /**
   * Draws page `index` into `canvas` at the current zoom (sharp on high-DPI
   * screens) and, when a container is given and pdf.js has a text layer,
   * lays the selectable, screen-reader-readable text over it. A newer draw
   * into the same canvas cancels the older one.
   */
  async renderPage(
    index: number,
    canvas: HTMLCanvasElement,
    textLayer?: HTMLElement | null,
  ): Promise<void> {
    await this.draw(index, canvas, this.scaleOf(index), textLayer ?? null);
  }

  /** Draws a thumbnail of page `index`, `width` CSS px wide. */
  async renderThumbnail(
    index: number,
    canvas: HTMLCanvasElement,
    width: number,
  ): Promise<void> {
    const size = this.sizesCell()[index];
    if (!size) return;
    await this.draw(index, canvas, width / (size.width * PX_PER_POINT), null);
  }

  private async draw(
    index: number,
    canvas: HTMLCanvasElement,
    scale: number,
    textLayer: HTMLElement | null,
  ): Promise<void> {
    const id = this.loadId;
    let page: OgePdfJsPage;
    try {
      page = await this.page(index);
    } catch {
      return;
    }
    if (id !== this.loadId) return;
    this.tasks.get(canvas)?.cancel();
    const ratio = canvas.ownerDocument?.defaultView?.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * PX_PER_POINT });
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    // CSS size rounded to 1/100 px: float noise must not reach the style
    canvas.style.width = `${Math.round(viewport.width * 100) / 100}px`;
    canvas.style.height = `${Math.round(viewport.height * 100) / 100}px`;
    const context = canvas.getContext('2d');
    if (!context) return;
    const task = page.render({
      canvasContext: context,
      viewport,
      ...(ratio !== 1 ? { transform: [ratio, 0, 0, ratio, 0, 0] } : {}),
    });
    this.tasks.set(canvas, task);
    try {
      await task.promise;
    } catch {
      return; // cancelled by a newer draw
    }
    if (textLayer && this.pdfjs?.TextLayer && id === this.loadId) {
      textLayer.replaceChildren();
      const layer = new this.pdfjs.TextLayer({
        textContentSource: await page.getTextContent(),
        container: textLayer,
        viewport,
      });
      await layer.render().catch(() => undefined);
    }
  }

  private pageText(index: number): Promise<OgePdfPageText> {
    let text = this.textCache.get(index);
    if (!text) {
      text = this.page(index).then(async (page) => {
        const content = await page.getTextContent();
        return {
          items: content.items.filter(
            (item): item is OgePdfJsTextItem => 'str' in item,
          ),
          height: page.getViewport({ scale: 1 }).height,
        };
      });
      this.textCache.set(index, text);
    }
    return text;
  }

  /**
   * Finds `query` in every page (text read once per document) and moves to
   * the first match; an empty query clears the search.
   */
  async search(query: string): Promise<void> {
    const id = ++this.searchId;
    this.queryCell.set(query);
    if (!query.trim() || this.statusCell() !== 'ready') {
      this.matchesCell.set([]);
      this.matchIndexCell.set(-1);
      this.searchedCell.set(query);
      return;
    }
    let matches: OgePdfMatch[];
    try {
      const pages = await Promise.all(
        this.sizesCell().map((_size, index) => this.pageText(index)),
      );
      matches = ogePdfFindMatches(pages, query);
    } catch {
      matches = []; // the document closed or a page would not read
    }
    if (id !== this.searchId) return;
    this.searchedCell.set(query);
    this.matchesCell.set(matches);
    this.matchIndexCell.set(matches.length ? 0 : -1);
    if (matches.length) this.go(matches[0].page);
  }

  nextMatch(): void {
    this.stepMatch(1);
  }

  previousMatch(): void {
    this.stepMatch(-1);
  }

  private stepMatch(delta: number): void {
    const total = this.matchesCell().length;
    if (!total) return;
    const next = (this.matchIndexCell() + delta + total) % total;
    this.matchIndexCell.set(next);
    this.go(this.matchesCell()[next].page);
  }

  private clearSearch(): void {
    this.searchId++;
    this.queryCell.set('');
    this.searchedCell.set('');
    this.matchesCell.set([]);
    this.matchIndexCell.set(-1);
  }

  /** The highlights of page `index` in CSS px, the current match flagged. */
  highlightsOf(
    index: number,
  ): readonly (OgePdfRect & { readonly current: boolean })[] {
    const matches = this.matchesCell();
    if (!matches.length) return [];
    const scale = this.scaleOf(index) * PX_PER_POINT;
    const current = this.matchIndexCell();
    const out: (OgePdfRect & { current: boolean })[] = [];
    matches.forEach((match, n) => {
      if (match.page !== index) return;
      for (const rect of match.rects) {
        out.push({
          x: rect.x * scale,
          y: rect.y * scale,
          width: rect.width * scale,
          height: rect.height * scale,
          current: n === current,
        });
      }
    });
    return out;
  }

  /**
   * Prints the document: every page drawn at print resolution into a hidden
   * frame, one page per sheet, then the browser's print dialog. `within` is
   * any element of the page the viewer lives in (the engine never reaches for
   * a global `document`).
   */
  async print(within: { readonly ownerDocument: Document }): Promise<void> {
    const owner = within.ownerDocument;
    if (this.statusCell() !== 'ready') return;
    const images: string[] = [];
    for (let index = 0; index < this.sizesCell().length; index++) {
      const canvas = owner.createElement('canvas');
      await this.draw(index, canvas, 2, null);
      images.push(canvas.toDataURL('image/png'));
    }
    const frame = owner.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText =
      'position:fixed;width:0;height:0;border:0;right:0;bottom:0;visibility:hidden';
    owner.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      frame.remove();
      return;
    }
    doc.open();
    doc.write(
      `<!doctype html><title>${escapeHtml(this.configCell().messages.viewerLabel)}</title>` +
        '<style>@page{margin:0}body{margin:0}img{display:block;width:100%;page-break-after:always;break-after:page}</style>' +
        images.map((src) => `<img src="${src}" alt="">`).join(''),
    );
    doc.close();
    const cleanup = () => setTimeout(() => frame.remove(), 0);
    win.addEventListener('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
  }

  private fail(code: OgePdfErrorCode, message: string): void {
    const text = this.configCell().messages;
    this.errorCell.set(
      code === 'password' ? text.passwordProtected : text.loadError,
    );
    this.statusCell.set('error');
    this.options.onLoadError?.({ code, message });
  }

  /** Scrolls to a page; out-of-range indices clamp. */
  go(index: number): void {
    const last = Math.max(0, this.pageCount() - 1);
    const next = Math.min(last, Math.max(0, Math.trunc(index)));
    this.rangeCell.set({ first: next, last: next });
    this.options.scrollToPage?.(next);
    if (next !== this.indexCell()) {
      this.indexCell.set(next);
      this.options.onPageChange?.(next);
    }
  }

  next(): void {
    this.go(this.indexCell() + 1);
  }

  previous(): void {
    this.go(this.indexCell() - 1);
  }

  /**
   * Page keys move between pages, Ctrl/⌘ + / − zoom, Ctrl/⌘ 0 fits the width;
   * arrows stay native scrolling.
   */
  keydown(event: {
    readonly key: string;
    readonly ctrlKey?: boolean;
    readonly metaKey?: boolean;
    readonly target?: EventTarget | null;
    preventDefault(): void;
  }): void {
    const mod = event.ctrlKey || event.metaKey;
    // the find box keeps its own caret keys
    const target = event.target as { closest?: (s: string) => unknown } | null;
    if (!mod && target?.closest?.('input, textarea')) return;
    switch (event.key) {
      case 'PageDown':
        this.next();
        break;
      case 'PageUp':
        this.previous();
        break;
      case 'Home':
        this.go(0);
        break;
      case 'End':
        this.go(this.pageCount() - 1);
        break;
      case '+':
      case '=':
        if (!mod) return;
        this.zoomIn();
        break;
      case '-':
        if (!mod) return;
        this.zoomOut();
        break;
      case '0':
        if (!mod) return;
        this.setZoom('fit-width');
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private async closeDocument(): Promise<void> {
    const document = this.document;
    this.document = null;
    this.pageCache.clear();
    this.textCache.clear();
    if (document) await document.destroy().catch(() => undefined);
  }

  destroy(): void {
    this.loadId++;
    this.searchId++;
    this.abort?.abort();
    void this.closeDocument();
  }
}

/** Which pages a scroller shows; `null` before they are laid out. */
export function ogeVisiblePdfPages(
  scroller: HTMLElement,
  selector: string,
): { current: number; first: number; last: number } | null {
  const pages = Array.from(scroller.querySelectorAll<HTMLElement>(selector));
  if (pages.length === 0) return null;
  const box = scroller.getBoundingClientRect();
  const middle = box.top + box.height / 2;
  let first = -1;
  let last = -1;
  let middlePage = -1;
  let nearest = 0;
  let best = Infinity;
  pages.forEach((page, index) => {
    const rect = page.getBoundingClientRect();
    if (rect.bottom >= box.top && rect.top <= box.bottom) {
      if (first < 0) first = index;
      last = index;
    }
    if (rect.top <= middle && rect.bottom >= middle && middlePage < 0) {
      middlePage = index;
    }
    const distance = Math.min(
      Math.abs(rect.top - middle),
      Math.abs(rect.bottom - middle),
    );
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  // the page under the middle; with small pages that all fit, the first one
  // in view (not whichever ends nearest the middle); off screen, the nearest
  const current = middlePage >= 0 ? middlePage : first >= 0 ? first : nearest;
  return {
    current,
    first: first < 0 ? current : first,
    last: last < 0 ? current : last,
  };
}

async function toBytes(
  source: ArrayBuffer | Uint8Array | Blob,
): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(await source.arrayBuffer());
}
