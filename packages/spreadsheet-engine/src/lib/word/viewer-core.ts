/**
 * The Word document viewer: loading, page layout, which pages are near the
 * viewport, navigation and labels. The Angular and React components bind this
 * and compute nothing themselves (ADR 0006).
 */
import type { OgeImportIssue } from '../codec/import-issues';
import { ogeCreateSlideCanvasMeasurer } from '../powerpoint/canvas-measurer';
import { ogeSlideFontFamily } from '../powerpoint/render';
import type { OgeSlideTextMeasurer } from '../powerpoint/text-layout';
import { OgeObjectUrls, ogeFetchWorkbook } from '../view/browser';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '../view/reactivity';
import { ogeLayoutWordDocument, type OgeWordLaidPage } from './layout';
import type { OgeWordDocument } from './model';
import { OgeDocxError, readOgeDocx, type OgeDocxErrorCode } from './read-docx';

/** What the viewer accepts: bytes, a blob, or a URL to fetch. */
export type OgeWordDocumentSource = ArrayBuffer | Uint8Array | Blob | string;

/** Why a document did not open. */
export type OgeWordDocumentErrorCode = OgeDocxErrorCode | 'fetch-failed';

/** The viewer's text. `{current}` and `{total}` are replaced. */
export interface OgeWordDocumentMessages {
  /** Accessible name of the viewer. */
  readonly viewerLabel: string;
  /** Names a page and announces the current one. */
  readonly pageLabel: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly loading: string;
  readonly empty: string;
  readonly loadError: string;
  readonly encryptedOrLegacy: string;
}

/** The English defaults. */
export const OGE_DEFAULT_WORD_DOCUMENT_MESSAGES: OgeWordDocumentMessages = {
  viewerLabel: 'Document',
  pageLabel: 'Page {current} of {total}',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  loading: 'Opening the document…',
  empty: 'No document to show',
  loadError: 'The document could not be opened',
  encryptedOrLegacy:
    'This file is password-protected or in the old .doc format, which cannot be previewed',
};

/** Resolved viewer defaults. */
export interface OgeWordDocumentConfig {
  readonly messages: OgeWordDocumentMessages;
}

/** What a config provider accepts: `messages` merge over the defaults. */
export interface OgeWordDocumentConfigInput {
  readonly messages?: Partial<OgeWordDocumentMessages>;
}

/** The defaults of every viewer without a provider. */
export const OGE_DEFAULT_WORD_DOCUMENT_CONFIG: OgeWordDocumentConfig = {
  messages: OGE_DEFAULT_WORD_DOCUMENT_MESSAGES,
};

/** Merges a config input over `base`. */
export function resolveOgeWordDocumentConfig(
  config: OgeWordDocumentConfigInput | undefined,
  base: OgeWordDocumentConfig = OGE_DEFAULT_WORD_DOCUMENT_CONFIG,
): OgeWordDocumentConfig {
  if (config === undefined) return base;
  return { messages: { ...base.messages, ...config.messages } };
}

/** Reported after a document opened. */
export interface OgeWordDocumentLoadedEvent {
  readonly pageCount: number;
  readonly issues: readonly OgeImportIssue[];
}

/** Reported when a document did not open. */
export interface OgeWordDocumentLoadErrorEvent {
  readonly code: OgeWordDocumentErrorCode;
  readonly message: string;
}

/** What the core needs from its render layer. */
export interface OgeWordDocumentCoreOptions {
  readonly reactivity: OgeSpreadsheetReactivity;
  readonly messages: OgeWordDocumentMessages;
  /** Gradient id prefix, unique per viewer on the page. */
  readonly idPrefix: string;
  readonly onLoaded?: (event: OgeWordDocumentLoadedEvent) => void;
  readonly onLoadError?: (event: OgeWordDocumentLoadErrorEvent) => void;
  readonly onPageChange?: (index: number) => void;
  /** Scrolls a page into view (the layer owns the DOM). */
  readonly scrollToPage?: (index: number) => void;
  /** Replaces the canvas measurer (tests, servers). */
  readonly measurer?: OgeSlideTextMeasurer;
}

/** Pages kept drawn on either side of the visible ones. */
const OVERSCAN = 2;

const ESTIMATING_MEASURER: OgeSlideTextMeasurer = {
  width: (text, font) => text.length * font.size * 0.5,
  extent: (font) => ({ ascent: font.size * 0.95, descent: font.size * 0.25 }),
};

/** Which pages a scroller shows; `null` before they are laid out. */
export function ogeVisibleWordPages(
  scroller: HTMLElement,
  selector: string,
): { current: number; first: number; last: number } | null {
  const pages = Array.from(scroller.querySelectorAll<HTMLElement>(selector));
  if (pages.length === 0) return null;
  const box = scroller.getBoundingClientRect();
  const middle = box.top + box.height / 2;
  let first = -1;
  let last = -1;
  let current = 0;
  let best = Infinity;
  pages.forEach((page, index) => {
    const rect = page.getBoundingClientRect();
    if (rect.bottom >= box.top && rect.top <= box.bottom) {
      if (first < 0) first = index;
      last = index;
    }
    const distance =
      rect.top <= middle && rect.bottom >= middle
        ? 0
        : Math.min(Math.abs(rect.top - middle), Math.abs(rect.bottom - middle));
    if (distance < best) {
      best = distance;
      current = index;
    }
  });
  return {
    current,
    first: first < 0 ? current : first,
    last: last < 0 ? current : last,
  };
}

/** The viewer's state machine. */
export class OgeWordDocumentCore {
  private readonly statusCell: OgeSpreadsheetReactiveCell<
    'empty' | 'loading' | 'ready' | 'error'
  >;
  private readonly pagesCell: OgeSpreadsheetReactiveCell<
    readonly OgeWordLaidPage[]
  >;
  private readonly indexCell: OgeSpreadsheetReactiveCell<number>;
  private readonly rangeCell: OgeSpreadsheetReactiveCell<{
    first: number;
    last: number;
  }>;
  private readonly errorCell: OgeSpreadsheetReactiveCell<string>;
  private readonly messagesCell: OgeSpreadsheetReactiveCell<OgeWordDocumentMessages>;
  private readonly urls = new OgeObjectUrls();
  private document: OgeWordDocument | null = null;
  private loadId = 0;
  private abort: AbortController | null = null;

  readonly status: () => 'empty' | 'loading' | 'ready' | 'error';
  /** The laid-out pages. */
  readonly pages: () => readonly OgeWordLaidPage[];
  /** 0-based page nearest the viewport's middle. */
  readonly index: () => number;
  readonly errorText: () => string;
  readonly pageCount: () => number;
  readonly currentLabel: () => string;
  readonly canGoBack: () => boolean;
  readonly canGoForward: () => boolean;
  readonly messages: () => OgeWordDocumentMessages;

  constructor(private readonly options: OgeWordDocumentCoreOptions) {
    const rx = options.reactivity;
    this.statusCell = rx.cell<'empty' | 'loading' | 'ready' | 'error'>('empty');
    this.pagesCell = rx.cell<readonly OgeWordLaidPage[]>([]);
    this.indexCell = rx.cell(0);
    this.rangeCell = rx.cell({ first: 0, last: OVERSCAN });
    this.errorCell = rx.cell('');
    this.messagesCell = rx.cell(options.messages);
    this.status = this.statusCell;
    this.pages = this.pagesCell;
    this.index = this.indexCell;
    this.errorText = this.errorCell;
    this.messages = this.messagesCell;
    this.pageCount = rx.derived(() => this.pagesCell().length);
    this.currentLabel = rx.derived(() =>
      this.labelFor(this.indexCell(), this.messagesCell()),
    );
    this.canGoBack = rx.derived(() => this.indexCell() > 0);
    this.canGoForward = rx.derived(
      () => this.indexCell() < this.pageCount() - 1,
    );
  }

  setMessages(messages: OgeWordDocumentMessages): void {
    this.messagesCell.set(messages);
  }

  private labelFor(index: number, messages: OgeWordDocumentMessages): string {
    return messages.pageLabel
      .replace('{current}', String(index + 1))
      .replace('{total}', String(this.pageCount()));
  }

  /** Names a page. */
  labelOf(index: number): string {
    return this.labelFor(index, this.messagesCell());
  }

  /** Whether a page is close enough to the viewport to be drawn. */
  isDrawn(index: number): boolean {
    const { first, last } = this.rangeCell();
    return index >= first - OVERSCAN && index <= last + OVERSCAN;
  }

  /** The object URL of a picture part. */
  mediaUrl(key: string): string | null {
    return this.urls.url(key, () => {
      const media = this.document?.media.get(key);
      return media
        ? new Blob([media.bytes as BlobPart], { type: media.contentType })
        : null;
    });
  }

  /** The layer reports what its scroller shows. */
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
  async load(source: OgeWordDocumentSource | null): Promise<void> {
    const id = ++this.loadId;
    this.abort?.abort();
    this.abort = null;
    this.urls.release();
    this.document = null;
    this.pagesCell.set([]);
    this.errorCell.set('');
    this.indexCell.set(0);
    this.rangeCell.set({ first: 0, last: OVERSCAN });
    if (source === null) {
      this.statusCell.set('empty');
      return;
    }
    this.statusCell.set('loading');
    const abort = new AbortController();
    this.abort = abort;
    try {
      const data =
        typeof source === 'string'
          ? await ogeFetchWorkbook(source, abort.signal)
          : source;
      if (id !== this.loadId) return;
      if (data === null) {
        this.fail('fetch-failed', 'The document could not be fetched');
        return;
      }
      const { document, issues } = await readOgeDocx(data, {
        signal: abort.signal,
      });
      if (id !== this.loadId) return;
      this.document = document;
      const measurer =
        this.options.measurer ??
        ogeCreateSlideCanvasMeasurer() ??
        ESTIMATING_MEASURER;
      const pages = ogeLayoutWordDocument(document, measurer, {
        idPrefix: this.options.idPrefix,
        fontFamily: ogeSlideFontFamily,
      });
      this.pagesCell.set(pages);
      this.statusCell.set('ready');
      this.options.onLoaded?.({ pageCount: pages.length, issues });
    } catch (error) {
      if (id !== this.loadId) return;
      if (error instanceof OgeDocxError) {
        if (error.code !== 'aborted') this.fail(error.code, error.message);
        return;
      }
      throw error;
    }
  }

  private fail(code: OgeWordDocumentErrorCode, message: string): void {
    const text = this.messagesCell();
    this.errorCell.set(
      code === 'encrypted-or-legacy' ? text.encryptedOrLegacy : text.loadError,
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

  /** Page keys move between pages; arrows stay native scrolling. */
  keydown(event: { readonly key: string; preventDefault(): void }): void {
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
      default:
        return;
    }
    event.preventDefault();
  }

  destroy(): void {
    this.loadId++;
    this.abort?.abort();
    this.urls.release();
  }
}
