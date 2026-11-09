'use client';
import {
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  type CSSProperties,
  type ReactElement,
} from 'react';
import {
  OgeWordDocumentCore,
  ogeCheckSpreadsheetLicense,
  ogeVisibleWordPages,
  type OgeWordDocumentLoadErrorEvent,
  type OgeWordDocumentLoadedEvent,
  type OgeWordDocumentMessages,
  type OgeWordDocumentSource,
} from '@oge-ui/spreadsheet-engine/word';
import { OgeSlideCanvas } from './presentation';
import { createSpreadsheetRxAdapter } from './rx-adapter';
import { useOgeWordDocumentConfig } from './word-document-config';

/** Props of {@link OgeWordDocument}. */
export interface OgeWordDocumentProps {
  /** The file: bytes, a `Blob`, or a URL to fetch. */
  source?: OgeWordDocumentSource | null;
  /** 0-based page to show. Controlled when given with `onPageIndexChange`. */
  pageIndex?: number;
  /** Fires when the page nearest the viewport's middle changes. */
  onPageIndexChange?: (index: number) => void;
  /** Overrides of the message catalog. */
  messages?: Partial<OgeWordDocumentMessages>;
  /** After a document opened, with what could not be shown. */
  onLoaded?: (event: OgeWordDocumentLoadedEvent) => void;
  /** When a document did not open. */
  onLoadError?: (event: OgeWordDocumentLoadErrorEvent) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE_SELECTOR = '.oge-word-page';

/**
 * Shows a `.docx` document the way Word does: Word's line breaks and page
 * breaks, measured against Word itself. Read-only; macros and embedded objects
 * never run and external targets are never fetched (ADR 0006).
 */
export function OgeWordDocument(props: OgeWordDocumentProps): ReactElement {
  const { source = null, pageIndex, messages, className, style } = props;
  const config = useOgeWordDocumentConfig();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const id = useId();
  const latest = useRef(props);
  latest.current = props;
  const scroller = useRef<HTMLDivElement>(null);

  const coreRef = useRef<OgeWordDocumentCore | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new OgeWordDocumentCore({
      reactivity: createSpreadsheetRxAdapter(() => rerender()),
      messages: config.messages,
      idPrefix: `oge-word-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
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

  useEffect(() => {
    ogeCheckSpreadsheetLicense();
  }, []);

  useEffect(() => {
    void core.load(source);
  }, [core, source]);

  const pageCount = core.pageCount();
  useEffect(() => {
    if (pageIndex !== undefined && pageCount > 0 && pageIndex !== core.index())
      core.go(pageIndex);
  }, [core, pageIndex, pageCount]);

  useEffect(() => {
    core.setMessages({ ...config.messages, ...messages });
  }, [core, config, messages]);

  const reportViewport = (): void => {
    const element = scroller.current;
    const range = element && ogeVisibleWordPages(element, PAGE_SELECTOR);
    if (range) core.viewport(range);
  };
  // once the pages exist, say which of them show
  useEffect(reportViewport, [core, pageCount]);

  useEffect(() => () => core.destroy(), [core]);

  const mediaUrl = useMemo(
    () =>
      (key: string): string | null =>
        core.mediaUrl(key),
    [core],
  );
  const text = core.messages();
  const status = core.status();

  return (
    <div
      className={['oge-word', className].filter(Boolean).join(' ')}
      style={style}
      role="group"
      tabIndex={0}
      aria-label={text.viewerLabel}
      onKeyDown={(event) => core.keydown(event)}
    >
      {status === 'ready' ? (
        <>
          <div
            ref={scroller}
            className="oge-word-scroller"
            onScroll={reportViewport}
          >
            {core.pages().map((page, index) => (
              <div
                key={index}
                className="oge-word-page"
                role="group"
                aria-roledescription="page"
                aria-label={core.labelOf(index)}
                style={{
                  width: (page.width * 4) / 3,
                  aspectRatio: `${page.width} / ${page.height}`,
                }}
              >
                {core.isDrawn(index) && (
                  <OgeSlideCanvas render={page.render} mediaUrl={mediaUrl} />
                )}
              </div>
            ))}
          </div>
          <div className="oge-presentation-bar">
            <button
              type="button"
              className="oge-presentation-nav"
              disabled={!core.canGoBack()}
              aria-label={text.previousPage}
              title={text.previousPage}
              onClick={() => core.previous()}
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
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span aria-live="polite">{core.currentLabel()}</span>
            <button
              type="button"
              className="oge-presentation-nav"
              disabled={!core.canGoForward()}
              aria-label={text.nextPage}
              title={text.nextPage}
              onClick={() => core.next()}
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
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <div className="oge-presentation-status" role="status">
          {status === 'loading'
            ? text.loading
            : status === 'error'
              ? core.errorText()
              : text.empty}
        </div>
      )}
    </div>
  );
}
