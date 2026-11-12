import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '@oge-ui/spreadsheet-engine';
import {
  OgePdfViewerCore,
  ogeCheckSpreadsheetLicense,
  ogeVisiblePdfPages,
  resolveOgePdfViewerConfig,
  type OgePdfLoadErrorEvent,
  type OgePdfLoadedEvent,
  type OgePdfSource,
  type OgePdfViewerMessages,
  type OgePdfZoom,
} from '@oge-ui/spreadsheet-engine/pdf';
import { OGE_PDF_VIEWER_CONFIG } from './config';

const SIGNAL_ADAPTER: OgeSpreadsheetReactivity = {
  cell<T>(initial: T): OgeSpreadsheetReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeSpreadsheetReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

const PAGE_SELECTOR = '.oge-pdf-page';
/** Thumbnail width in CSS px. */
const THUMB_WIDTH = 120;

/**
 * Shows a PDF with pdf.js: pages drawn as they near the viewport, page
 * thumbnails, find-in-document with highlights, zoom (steps, fit width, fit
 * page) and printing. Read-only: font evaluation is off and scripts and form
 * actions never run.
 *
 * pdf.js (`pdfjs-dist`, an optional peer dependency) loads on first use; give
 * its worker URL through `provideOgePdfViewerConfig({ workerSrc })`.
 *
 * ```html
 * <oge-pdf-viewer [source]="file" [(pageIndex)]="page" [(showThumbnails)]="thumbs" />
 * ```
 */
@Component({
  selector: 'oge-pdf-viewer',
  exportAs: 'ogePdfViewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './pdf-viewer.scss',
  template: `
    <div
      class="oge-pdf"
      role="group"
      [attr.aria-label]="core.messages().viewerLabel"
      (keydown)="core.keydown($event)"
    >
      @if (toolbar() && core.status() === 'ready') {
        <div class="oge-pdf-toolbar" role="toolbar">
          <span class="oge-pdf-group">
            <button
              type="button"
              class="oge-pdf-button oge-pdf-thumbs-toggle"
              [attr.aria-pressed]="showThumbnails()"
              [attr.aria-label]="core.messages().thumbnails"
              [attr.title]="core.messages().thumbnails"
              (click)="showThumbnails.set(!showThumbnails())"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M2 2.5h4v4H2zM2 9.5h4v4H2zM8.5 3.5H14M8.5 5.5H12M8.5 10.5H14M8.5 12.5H12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.3"
                />
              </svg>
            </button>
          </span>
          <span class="oge-pdf-group">
            <button
              type="button"
              class="oge-pdf-button oge-pdf-prev"
              [disabled]="!core.canGoBack()"
              [attr.aria-label]="core.messages().previousPage"
              [attr.title]="core.messages().previousPage"
              (click)="core.previous()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M3 10l5-5 5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <span
              class="oge-pdf-readout oge-pdf-page-label"
              aria-live="polite"
              >{{ core.currentLabel() }}</span
            >
            <button
              type="button"
              class="oge-pdf-button oge-pdf-next"
              [disabled]="!core.canGoForward()"
              [attr.aria-label]="core.messages().nextPage"
              [attr.title]="core.messages().nextPage"
              (click)="core.next()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M3 6l5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </span>
          <span class="oge-pdf-group">
            <button
              type="button"
              class="oge-pdf-button oge-pdf-zoom-out"
              [disabled]="!core.canZoomOut()"
              [attr.aria-label]="core.messages().zoomOut"
              [attr.title]="core.messages().zoomOut"
              (click)="core.zoomOut()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8h9"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <span class="oge-pdf-readout oge-pdf-zoom-label">{{
              core.zoomLabel()
            }}</span>
            <button
              type="button"
              class="oge-pdf-button oge-pdf-zoom-in"
              [disabled]="!core.canZoomIn()"
              [attr.aria-label]="core.messages().zoomIn"
              [attr.title]="core.messages().zoomIn"
              (click)="core.zoomIn()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8h9M8 3.5v9"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              class="oge-pdf-button oge-pdf-fit-width"
              [attr.aria-pressed]="core.zoom() === 'fit-width'"
              [attr.aria-label]="core.messages().fitWidth"
              [attr.title]="core.messages().fitWidth"
              (click)="core.setZoom('fit-width')"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              class="oge-pdf-button oge-pdf-fit-page"
              [attr.aria-pressed]="core.zoom() === 'fit-page'"
              [attr.aria-label]="core.messages().fitPage"
              [attr.title]="core.messages().fitPage"
              (click)="core.setZoom('fit-page')"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="2"
                  width="8"
                  height="12"
                  rx="1"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                />
              </svg>
            </button>
          </span>
          <span class="oge-pdf-spacer"></span>
          <span class="oge-pdf-group">
            <input
              class="oge-pdf-search"
              type="search"
              [attr.aria-label]="core.messages().search"
              [attr.placeholder]="core.messages().search"
              [value]="core.searchQuery()"
              (input)="core.search($any($event.target).value)"
              (keydown)="onSearchKey($event)"
            />
            <span
              class="oge-pdf-readout oge-pdf-match-label"
              aria-live="polite"
              >{{ core.matchLabel() }}</span
            >
            <button
              type="button"
              class="oge-pdf-button oge-pdf-match-prev"
              [disabled]="!core.matches().length"
              [attr.aria-label]="core.messages().searchPrevious"
              [attr.title]="core.messages().searchPrevious"
              (click)="core.previousMatch()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M3 10l5-5 5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              class="oge-pdf-button oge-pdf-match-next"
              [disabled]="!core.matches().length"
              [attr.aria-label]="core.messages().searchNext"
              [attr.title]="core.messages().searchNext"
              (click)="core.nextMatch()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M3 6l5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </span>
          <button
            type="button"
            class="oge-pdf-button oge-pdf-print"
            [attr.aria-label]="core.messages().print"
            [attr.title]="core.messages().print"
            (click)="print()"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M4.5 6V2.5h7V6M4.5 11.5h-2v-5h11v5h-2M4.5 9.5h7v4h-7z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      }
      @if (core.status() === 'ready') {
        <div class="oge-pdf-body">
          @if (showThumbnails()) {
            <nav
              class="oge-pdf-thumbnails"
              [attr.aria-label]="core.messages().thumbnails"
            >
              @for (size of core.pageSizes(); track $index) {
                <button
                  type="button"
                  class="oge-pdf-thumbnail"
                  [attr.aria-current]="$index === core.index() ? 'page' : null"
                  [attr.aria-label]="core.labelOf($index)"
                  (click)="core.go($index)"
                >
                  <canvas
                    #thumb
                    [attr.data-index]="$index"
                    [style.width.px]="thumbWidth"
                    [style.aspect-ratio]="size.width + ' / ' + size.height"
                  ></canvas>
                  <span aria-hidden="true">{{ $index + 1 }}</span>
                </button>
              }
            </nav>
          }
          <div
            #scroller
            class="oge-pdf-scroller"
            role="group"
            tabindex="0"
            [attr.aria-label]="core.currentLabel()"
            (scroll)="reportViewport()"
          >
            @for (size of core.pageSizes(); track $index) {
              <div
                class="oge-pdf-page"
                role="group"
                aria-roledescription="page"
                [attr.aria-label]="core.labelOf($index)"
                [style.width.px]="core.boxOf($index).width"
                [style.height.px]="core.boxOf($index).height"
              >
                @if (core.isDrawn($index)) {
                  <canvas #page [attr.data-index]="$index"></canvas>
                  <div class="oge-pdf-text" [attr.data-index]="$index"></div>
                }
                @for (box of core.highlightsOf($index); track $index) {
                  <span
                    class="oge-pdf-highlight"
                    [class.oge-pdf-highlight-current]="box.current"
                    [style.left.px]="box.x"
                    [style.top.px]="box.y"
                    [style.width.px]="box.width"
                    [style.height.px]="box.height"
                  ></span>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="oge-pdf-status" role="status">
          @switch (core.status()) {
            @case ('loading') {
              {{ core.messages().loading }}
            }
            @case ('error') {
              {{ core.errorText() }}
            }
            @default {
              {{ core.messages().empty }}
            }
          }
        </div>
      }
    </div>
  `,
})
export class OgePdfViewer {
  private readonly config = inject(OGE_PDF_VIEWER_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly pageCanvases =
    viewChildren<ElementRef<HTMLCanvasElement>>('page');
  private readonly thumbCanvases =
    viewChildren<ElementRef<HTMLCanvasElement>>('thumb');

  /** The file: bytes, a `Blob`, or a URL to fetch. */
  readonly source = input<OgePdfSource | null>(null);
  /** 0-based page nearest the viewport's middle (two-way). */
  readonly pageIndex = model(0);
  /** A scale (`1` = 100 %), `'fit-width'` (default) or `'fit-page'` (two-way). */
  readonly zoom = model<OgePdfZoom>('fit-width');
  /** The page thumbnail sidebar (two-way). Default `false`. */
  readonly showThumbnails = model(false);
  /** The toolbar (pages, zoom, find, print). Default `true`. */
  readonly toolbar = input(true);
  /** Overrides of the message catalog. */
  readonly messages = input<Partial<OgePdfViewerMessages>>({});

  /** After a document opened. */
  readonly loaded = output<OgePdfLoadedEvent>();
  /** When a document did not open. */
  readonly loadError = output<OgePdfLoadErrorEvent>();

  protected readonly thumbWidth = THUMB_WIDTH;

  /** The viewer state the template binds. */
  protected readonly core = new OgePdfViewerCore({
    reactivity: SIGNAL_ADAPTER,
    config: this.config,
    onLoaded: (event) => this.loaded.emit(event),
    onLoadError: (event) => this.loadError.emit(event),
    onPageChange: (index) => this.pageIndex.set(index),
    scrollToPage: (index) => this.scrollTo(index),
  });

  /** What each canvas last drew, so a redraw only follows a real change. */
  private readonly drawn = new WeakMap<HTMLCanvasElement, string>();

  constructor() {
    ogeCheckSpreadsheetLicense();
    effect(() => {
      const source = this.source();
      untracked(() => void this.core.load(source));
    });
    effect(() => {
      const index = this.pageIndex();
      const count = this.core.pageCount();
      untracked(() => {
        if (count > 0 && index !== this.core.index()) this.core.go(index);
      });
    });
    effect(() => {
      const zoom = this.zoom();
      untracked(() => {
        if (zoom !== this.core.zoom()) this.core.setZoom(zoom);
      });
    });
    effect(() => {
      const zoom = this.core.zoom();
      untracked(() => {
        if (zoom !== this.zoom()) this.zoom.set(zoom);
      });
    });
    effect(() =>
      this.core.setConfig(
        resolveOgePdfViewerConfig({ messages: this.messages() }, this.config),
      ),
    );
    // the fit modes follow the scroller's size
    afterRenderEffect(() => {
      const element = this.scroller()?.nativeElement;
      if (!element || typeof ResizeObserver === 'undefined') {
        if (element) {
          this.core.setContainer(element.clientWidth, element.clientHeight);
        }
        return;
      }
      untracked(() => this.observe(element));
    });
    // draw what came into view, or what a zoom changed
    afterRenderEffect(() => {
      const canvases = this.pageCanvases();
      for (const ref of canvases) {
        const canvas = ref.nativeElement;
        const index = Number(canvas.dataset['index']);
        const key = `${index}@${this.core.scaleOf(index)}`;
        if (this.drawn.get(canvas) === key) continue;
        this.drawn.set(canvas, key);
        const text = canvas.nextElementSibling as HTMLElement | null;
        void untracked(() => this.core.renderPage(index, canvas, text));
      }
      this.core.pageCount();
      if (this.scroller()) untracked(() => this.reportViewport());
    });
    afterRenderEffect(() => {
      for (const ref of this.thumbCanvases()) {
        const canvas = ref.nativeElement;
        const index = Number(canvas.dataset['index']);
        if (this.drawn.get(canvas) === `${index}`) continue;
        this.drawn.set(canvas, `${index}`);
        void untracked(() =>
          this.core.renderThumbnail(index, canvas, THUMB_WIDTH),
        );
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.resize?.disconnect();
      this.core.destroy();
    });
  }

  private resize: ResizeObserver | null = null;
  private observed: HTMLElement | null = null;

  private observe(element: HTMLElement): void {
    if (this.observed === element) return;
    this.resize?.disconnect();
    this.observed = element;
    this.resize = new ResizeObserver(() =>
      this.core.setContainer(element.clientWidth, element.clientHeight),
    );
    this.resize.observe(element);
    this.core.setContainer(element.clientWidth, element.clientHeight);
  }

  /** Prints the document (every page at print resolution). */
  print(): Promise<void> {
    return this.core.print(this.host.nativeElement);
  }

  /** Finds `query` and moves to the first match. */
  search(query: string): Promise<void> {
    return this.core.search(query);
  }

  protected onSearchKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (event.shiftKey) this.core.previousMatch();
    else this.core.nextMatch();
  }

  protected reportViewport(): void {
    const element = this.scroller()?.nativeElement;
    const range = element && ogeVisiblePdfPages(element, PAGE_SELECTOR);
    if (range) this.core.viewport(range);
  }

  private scrollTo(index: number): void {
    const element = this.scroller()?.nativeElement;
    element
      ?.querySelectorAll<HTMLElement>(PAGE_SELECTOR)
      [index]?.scrollIntoView?.({ block: 'start' });
  }
}
