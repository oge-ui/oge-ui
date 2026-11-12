'use client';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useReducer,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
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
import { createSpreadsheetRxAdapter } from './rx-adapter';
import { useOgePdfViewerConfig } from './pdf-viewer-config';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** What a `ref` on {@link OgePdfViewer} reaches. */
export interface OgePdfViewerHandle {
  /** Prints every page at print resolution. */
  print(): Promise<void>;
  /** Finds `query` on every page and moves to the first match. */
  search(query: string): Promise<void>;
}

/** Props of {@link OgePdfViewer}. */
export interface OgePdfViewerProps {
  /** The file: bytes, a `Blob`, or a URL to fetch. */
  source?: OgePdfSource | null;
  /** 0-based page to show. Controlled when given with `onPageIndexChange`. */
  pageIndex?: number;
  /** Fires when the page nearest the viewport's middle changes. */
  onPageIndexChange?: (index: number) => void;
  /** A scale (`1` = 100 %), `'fit-width'` (default) or `'fit-page'`. */
  zoom?: OgePdfZoom;
  /** Fires when the toolbar or the keyboard changes the zoom. */
  onZoomChange?: (zoom: OgePdfZoom) => void;
  /** The page thumbnail sidebar. Uncontrolled default `false`. */
  showThumbnails?: boolean;
  /** Fires when the toolbar toggles the thumbnails. */
  onShowThumbnailsChange?: (show: boolean) => void;
  /** The toolbar (pages, zoom, find, print). Default `true`. */
  toolbar?: boolean;
  /** Overrides of the message catalog. */
  messages?: Partial<OgePdfViewerMessages>;
  /** After a document opened. */
  onLoaded?: (event: OgePdfLoadedEvent) => void;
  /** When a document did not open. */
  onLoadError?: (event: OgePdfLoadErrorEvent) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE_SELECTOR = '.oge-pdf-page';
/** Thumbnail width in CSS px. */
const THUMB_WIDTH = 120;

const Icon = ({ d, fill }: { d: string; fill?: boolean }): ReactElement => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path
      d={d}
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UP = 'M3 10l5-5 5 5';
const DOWN = 'M3 6l5 5 5-5';

/** A page's canvas, redrawn when its scale changes. */
function PdfCanvas({
  core,
  index,
  scale,
}: {
  core: OgePdfViewerCore;
  index: number;
  scale: number;
}): ReactNode {
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (canvas.current) {
      void core.renderPage(index, canvas.current, text.current);
    }
  }, [core, index, scale]);
  return (
    <>
      <canvas ref={canvas} data-index={index} />
      <div ref={text} className="oge-pdf-text" data-index={index} />
    </>
  );
}

function PdfThumbnail({
  core,
  index,
  size,
}: {
  core: OgePdfViewerCore;
  index: number;
  size: { width: number; height: number };
}): ReactNode {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) {
      void core.renderThumbnail(index, canvas.current, THUMB_WIDTH);
    }
  }, [core, index]);
  return (
    <canvas
      ref={canvas}
      data-index={index}
      style={{
        width: THUMB_WIDTH,
        aspectRatio: `${size.width} / ${size.height}`,
      }}
    />
  );
}

/**
 * Shows a PDF with pdf.js: pages drawn as they near the viewport, page
 * thumbnails, find-in-document with highlights, zoom (steps, fit width, fit
 * page) and printing. Read-only: font evaluation is off and scripts and form
 * actions never run. pdf.js (`pdfjs-dist`, an optional peer dependency) loads
 * on first use; give its worker URL through `<OgePdfViewerConfigProvider>`.
 */
export const OgePdfViewer = forwardRef<OgePdfViewerHandle, OgePdfViewerProps>(
  function OgePdfViewerRender(props, ref): ReactElement {
    const {
      source = null,
      pageIndex,
      zoom,
      toolbar = true,
      messages,
      className,
      style,
    } = props;
    const config = useOgePdfViewerConfig();
    const [, rerender] = useReducer((n: number) => n + 1, 0);
    const latest = useRef(props);
    latest.current = props;
    const scroller = useRef<HTMLDivElement>(null);
    const root = useRef<HTMLDivElement>(null);
    const [ownThumbs, setOwnThumbs] = useState(false);
    const showThumbnails = props.showThumbnails ?? ownThumbs;

    const coreRef = useRef<OgePdfViewerCore | null>(null);
    if (coreRef.current === null) {
      coreRef.current = new OgePdfViewerCore({
        reactivity: createSpreadsheetRxAdapter(() => rerender()),
        config,
        onLoaded: (event) => latest.current.onLoaded?.(event),
        onLoadError: (event) => latest.current.onLoadError?.(event),
        onPageChange: (index) => latest.current.onPageIndexChange?.(index),
        scrollToPage: (index) =>
          scroller.current
            ?.querySelectorAll<HTMLElement>(PAGE_SELECTOR)
            [index]?.scrollIntoView?.({ block: 'start' }),
      });
    }
    const core = coreRef.current;
    const print = (): Promise<void> =>
      root.current ? core.print(root.current) : Promise.resolve();

    useImperativeHandle(
      ref,
      () => ({
        print: () => print(),
        search: (query: string) => core.search(query),
      }),
      [core],
    );

    useEffect(() => {
      ogeCheckSpreadsheetLicense();
    }, []);

    useEffect(() => {
      core.setConfig(resolveOgePdfViewerConfig({ messages }, config));
    }, [core, config, messages]);

    useEffect(() => {
      void core.load(source);
    }, [core, source]);

    const pageCount = core.pageCount();
    useEffect(() => {
      if (
        pageIndex !== undefined &&
        pageCount > 0 &&
        pageIndex !== core.index()
      )
        core.go(pageIndex);
    }, [core, pageIndex, pageCount]);

    useEffect(() => {
      if (zoom !== undefined && zoom !== core.zoom()) core.setZoom(zoom);
    }, [core, zoom]);

    const setZoom = (next: OgePdfZoom | 'in' | 'out'): void => {
      if (next === 'in') core.zoomIn();
      else if (next === 'out') core.zoomOut();
      else core.setZoom(next);
      latest.current.onZoomChange?.(core.zoom());
    };

    const toggleThumbnails = (): void => {
      const next = !showThumbnails;
      setOwnThumbs(next);
      latest.current.onShowThumbnailsChange?.(next);
    };

    const status = core.status();
    // the fit modes follow the scroller's size
    useIsomorphicLayoutEffect(() => {
      const element = scroller.current;
      if (!element) return;
      const measure = () =>
        core.setContainer(element.clientWidth, element.clientHeight);
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }, [core, status]);

    const reportViewport = (): void => {
      const element = scroller.current;
      const range = element && ogeVisiblePdfPages(element, PAGE_SELECTOR);
      if (range) core.viewport(range);
    };
    // once the pages exist, say which of them show
    useEffect(reportViewport, [core, pageCount]);

    useEffect(() => () => core.destroy(), [core]);

    const text = core.messages();
    const zoomValue = core.zoom();

    return (
      <div
        ref={root}
        className={['oge-pdf', className].filter(Boolean).join(' ')}
        style={style}
        role="group"
        aria-label={text.viewerLabel}
        onKeyDown={(event) => {
          const before = core.zoom();
          core.keydown(event);
          if (core.zoom() !== before)
            latest.current.onZoomChange?.(core.zoom());
        }}
      >
        {toolbar && status === 'ready' && (
          <div className="oge-pdf-toolbar" role="toolbar">
            <span className="oge-pdf-group">
              <button
                type="button"
                className="oge-pdf-button oge-pdf-thumbs-toggle"
                aria-pressed={showThumbnails}
                aria-label={text.thumbnails}
                title={text.thumbnails}
                onClick={toggleThumbnails}
              >
                <Icon d="M2 2.5h4v4H2zM2 9.5h4v4H2zM8.5 3.5H14M8.5 5.5H12M8.5 10.5H14M8.5 12.5H12" />
              </button>
            </span>
            <span className="oge-pdf-group">
              <button
                type="button"
                className="oge-pdf-button oge-pdf-prev"
                disabled={!core.canGoBack()}
                aria-label={text.previousPage}
                title={text.previousPage}
                onClick={() => core.previous()}
              >
                <Icon d={UP} />
              </button>
              <span
                className="oge-pdf-readout oge-pdf-page-label"
                aria-live="polite"
              >
                {core.currentLabel()}
              </span>
              <button
                type="button"
                className="oge-pdf-button oge-pdf-next"
                disabled={!core.canGoForward()}
                aria-label={text.nextPage}
                title={text.nextPage}
                onClick={() => core.next()}
              >
                <Icon d={DOWN} />
              </button>
            </span>
            <span className="oge-pdf-group">
              <button
                type="button"
                className="oge-pdf-button oge-pdf-zoom-out"
                disabled={!core.canZoomOut()}
                aria-label={text.zoomOut}
                title={text.zoomOut}
                onClick={() => setZoom('out')}
              >
                <Icon d="M3.5 8h9" />
              </button>
              <span className="oge-pdf-readout oge-pdf-zoom-label">
                {core.zoomLabel()}
              </span>
              <button
                type="button"
                className="oge-pdf-button oge-pdf-zoom-in"
                disabled={!core.canZoomIn()}
                aria-label={text.zoomIn}
                title={text.zoomIn}
                onClick={() => setZoom('in')}
              >
                <Icon d="M3.5 8h9M8 3.5v9" />
              </button>
              <button
                type="button"
                className="oge-pdf-button oge-pdf-fit-width"
                aria-pressed={zoomValue === 'fit-width'}
                aria-label={text.fitWidth}
                title={text.fitWidth}
                onClick={() => setZoom('fit-width')}
              >
                <Icon d="M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5" />
              </button>
              <button
                type="button"
                className="oge-pdf-button oge-pdf-fit-page"
                aria-pressed={zoomValue === 'fit-page'}
                aria-label={text.fitPage}
                title={text.fitPage}
                onClick={() => setZoom('fit-page')}
              >
                <Icon d="M5 2h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
              </button>
            </span>
            <span className="oge-pdf-spacer" />
            <span className="oge-pdf-group">
              <input
                className="oge-pdf-search"
                type="search"
                aria-label={text.search}
                placeholder={text.search}
                value={core.searchQuery()}
                onChange={(event) => void core.search(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  if (event.shiftKey) core.previousMatch();
                  else core.nextMatch();
                }}
              />
              <span
                className="oge-pdf-readout oge-pdf-match-label"
                aria-live="polite"
              >
                {core.matchLabel()}
              </span>
              <button
                type="button"
                className="oge-pdf-button oge-pdf-match-prev"
                disabled={!core.matches().length}
                aria-label={text.searchPrevious}
                title={text.searchPrevious}
                onClick={() => core.previousMatch()}
              >
                <Icon d={UP} />
              </button>
              <button
                type="button"
                className="oge-pdf-button oge-pdf-match-next"
                disabled={!core.matches().length}
                aria-label={text.searchNext}
                title={text.searchNext}
                onClick={() => core.nextMatch()}
              >
                <Icon d={DOWN} />
              </button>
            </span>
            <button
              type="button"
              className="oge-pdf-button oge-pdf-print"
              aria-label={text.print}
              title={text.print}
              onClick={() => void print()}
            >
              <Icon d="M4.5 6V2.5h7V6M4.5 11.5h-2v-5h11v5h-2M4.5 9.5h7v4h-7z" />
            </button>
          </div>
        )}
        {status === 'ready' ? (
          <div className="oge-pdf-body">
            {showThumbnails && (
              <nav className="oge-pdf-thumbnails" aria-label={text.thumbnails}>
                {core.pageSizes().map((size, index) => (
                  <button
                    key={index}
                    type="button"
                    className="oge-pdf-thumbnail"
                    aria-current={index === core.index() ? 'page' : undefined}
                    aria-label={core.labelOf(index)}
                    onClick={() => core.go(index)}
                  >
                    <PdfThumbnail core={core} index={index} size={size} />
                    <span aria-hidden="true">{index + 1}</span>
                  </button>
                ))}
              </nav>
            )}
            <div
              ref={scroller}
              className="oge-pdf-scroller"
              role="group"
              tabIndex={0}
              aria-label={core.currentLabel()}
              onScroll={reportViewport}
            >
              {core.pageSizes().map((_, index) => {
                const box = core.boxOf(index);
                return (
                  <div
                    key={index}
                    className="oge-pdf-page"
                    role="group"
                    aria-roledescription="page"
                    aria-label={core.labelOf(index)}
                    style={{ width: box.width, height: box.height }}
                  >
                    {core.isDrawn(index) && (
                      <PdfCanvas
                        core={core}
                        index={index}
                        scale={core.scaleOf(index)}
                      />
                    )}
                    {core.highlightsOf(index).map((hit, n) => (
                      <span
                        key={n}
                        className={
                          hit.current
                            ? 'oge-pdf-highlight oge-pdf-highlight-current'
                            : 'oge-pdf-highlight'
                        }
                        style={{
                          left: hit.x,
                          top: hit.y,
                          width: hit.width,
                          height: hit.height,
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="oge-pdf-status" role="status">
            {status === 'loading'
              ? text.loading
              : status === 'error'
                ? core.errorText()
                : text.empty}
          </div>
        )}
      </div>
    );
  },
);
