/**
 * The presentation viewer: loading, slide navigation, keyboard map, labels
 * and the per-slide drawings. The Angular and React components bind this and
 * compute nothing themselves (ADR 0006).
 */
import type { OgeImportIssue } from '../codec/import-issues';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '../view/reactivity';
import { OgeObjectUrls, ogeFetchWorkbook } from '../view/browser';
import { ogeCreateSlideCanvasMeasurer } from './canvas-measurer';
import type { OgePresentation } from './model';
import { OgePptxError, readOgePptx, type OgePptxErrorCode } from './read-pptx';
import { ogeRenderSlide, type OgeSlideRender } from './render';
import type { OgeSlideTextMeasurer } from './text-layout';

/** What the viewer accepts: bytes, a blob, or a URL to fetch. */
export type OgePresentationSource = ArrayBuffer | Uint8Array | Blob | string;

/** Why a presentation did not open. */
export type OgePresentationErrorCode = OgePptxErrorCode | 'fetch-failed';

/** The viewer's text. `{current}` and `{total}` are replaced. */
export interface OgePresentationMessages {
  /** Accessible name of the viewer. */
  readonly viewerLabel: string;
  /** Names a slide and announces a slide change. */
  readonly slideLabel: string;
  readonly previousSlide: string;
  readonly nextSlide: string;
  /** Accessible name of the thumbnail list. */
  readonly thumbnails: string;
  readonly loading: string;
  readonly empty: string;
  readonly loadError: string;
  readonly encryptedOrLegacy: string;
}

/** The English defaults. */
export const OGE_DEFAULT_PRESENTATION_MESSAGES: OgePresentationMessages = {
  viewerLabel: 'Presentation',
  slideLabel: 'Slide {current} of {total}',
  previousSlide: 'Previous slide',
  nextSlide: 'Next slide',
  thumbnails: 'Slides',
  loading: 'Opening the presentation…',
  empty: 'No presentation to show',
  loadError: 'The presentation could not be opened',
  encryptedOrLegacy:
    'This file is password-protected or in the old .ppt format, which cannot be previewed',
};

/** Resolved viewer defaults. */
export interface OgePresentationConfig {
  readonly messages: OgePresentationMessages;
}

/** What a config provider accepts: `messages` merge over the defaults. */
export interface OgePresentationConfigInput {
  readonly messages?: Partial<OgePresentationMessages>;
}

/** The defaults of every viewer without a provider. */
export const OGE_DEFAULT_PRESENTATION_CONFIG: OgePresentationConfig = {
  messages: OGE_DEFAULT_PRESENTATION_MESSAGES,
};

/** Merges a config input over `base`. */
export function resolveOgePresentationConfig(
  config: OgePresentationConfigInput | undefined,
  base: OgePresentationConfig = OGE_DEFAULT_PRESENTATION_CONFIG,
): OgePresentationConfig {
  if (config === undefined) return base;
  return { messages: { ...base.messages, ...config.messages } };
}

/** Reported after a presentation opened. */
export interface OgePresentationLoadedEvent {
  readonly slideCount: number;
  readonly issues: readonly OgeImportIssue[];
}

/** Reported when a presentation did not open. */
export interface OgePresentationLoadErrorEvent {
  readonly code: OgePresentationErrorCode;
  readonly message: string;
}

/** What the core needs from its render layer. */
export interface OgePresentationCoreOptions {
  readonly reactivity: OgeSpreadsheetReactivity;
  readonly messages: OgePresentationMessages;
  /** Gradient id prefix, unique per viewer on the page. */
  readonly idPrefix: string;
  readonly onLoaded?: (event: OgePresentationLoadedEvent) => void;
  readonly onLoadError?: (event: OgePresentationLoadErrorEvent) => void;
  readonly onSlideChange?: (index: number) => void;
  /** Replaces the canvas measurer (tests, servers). */
  readonly measurer?: OgeSlideTextMeasurer;
}

/** Without a canvas: plausible proportions, so a slide still lays out. */
const ESTIMATING_MEASURER: OgeSlideTextMeasurer = {
  width: (text, font) => text.length * font.size * 0.5,
  extent: (font) => ({ ascent: font.size * 0.95, descent: font.size * 0.25 }),
};

/** The viewer's state machine. */
export class OgePresentationCore {
  private readonly statusCell: OgeSpreadsheetReactiveCell<
    'empty' | 'loading' | 'ready' | 'error'
  >;
  private readonly presentationCell: OgeSpreadsheetReactiveCell<OgePresentation | null>;
  private readonly indexCell: OgeSpreadsheetReactiveCell<number>;
  private readonly errorCell: OgeSpreadsheetReactiveCell<string>;
  private readonly messagesCell: OgeSpreadsheetReactiveCell<OgePresentationMessages>;
  private readonly urls = new OgeObjectUrls();
  private readonly renders = new Map<number, OgeSlideRender>();
  private measurer: OgeSlideTextMeasurer | null = null;
  private loadId = 0;
  private abort: AbortController | null = null;

  /** `'empty'`, `'loading'`, `'ready'` or `'error'`. */
  readonly status: () => 'empty' | 'loading' | 'ready' | 'error';
  /** The open presentation. */
  readonly presentation: () => OgePresentation | null;
  /** 0-based current slide. */
  readonly index: () => number;
  /** The failure's text, when `status` is `'error'`. */
  readonly errorText: () => string;
  readonly slideCount: () => number;
  /** Names the current slide. */
  readonly currentLabel: () => string;
  readonly canGoBack: () => boolean;
  readonly canGoForward: () => boolean;
  /** The current drawing, once a presentation is open. */
  readonly current: () => OgeSlideRender | null;
  readonly messages: () => OgePresentationMessages;

  constructor(private readonly options: OgePresentationCoreOptions) {
    const rx = options.reactivity;
    this.statusCell = rx.cell<'empty' | 'loading' | 'ready' | 'error'>('empty');
    this.presentationCell = rx.cell<OgePresentation | null>(null);
    this.indexCell = rx.cell(0);
    this.errorCell = rx.cell('');
    this.messagesCell = rx.cell(options.messages);
    this.status = this.statusCell;
    this.presentation = this.presentationCell;
    this.index = this.indexCell;
    this.errorText = this.errorCell;
    this.messages = this.messagesCell;
    this.slideCount = rx.derived(
      () => this.presentationCell()?.slides.length ?? 0,
    );
    this.currentLabel = rx.derived(() =>
      this.slideLabel(this.indexCell(), this.messagesCell()),
    );
    this.canGoBack = rx.derived(() => this.indexCell() > 0);
    this.canGoForward = rx.derived(
      () => this.indexCell() < this.slideCount() - 1,
    );
    this.current = rx.derived(() => {
      if (!this.presentationCell()) return null;
      return this.renderOf(this.indexCell());
    });
  }

  setMessages(messages: OgePresentationMessages): void {
    this.messagesCell.set(messages);
  }

  private slideLabel(index: number, messages: OgePresentationMessages): string {
    return messages.slideLabel
      .replace('{current}', String(index + 1))
      .replace('{total}', String(this.slideCount()));
  }

  /** Names a slide (for its thumbnail). */
  labelOf(index: number): string {
    return this.slideLabel(index, this.messagesCell());
  }

  /** A slide's drawing; each is computed once. */
  renderOf(index: number): OgeSlideRender | null {
    const presentation = this.presentationCell();
    const slide = presentation?.slides[index];
    if (!presentation || !slide) return null;
    const known = this.renders.get(index);
    if (known) return known;
    this.measurer ??=
      this.options.measurer ??
      ogeCreateSlideCanvasMeasurer() ??
      ESTIMATING_MEASURER;
    const render = ogeRenderSlide(presentation, slide, this.measurer, {
      idPrefix: `${this.options.idPrefix}-s${index}`,
    });
    this.renders.set(index, render);
    return render;
  }

  /** The object URL of a picture part. */
  mediaUrl(key: string): string | null {
    return this.urls.url(key, () => {
      const media = this.presentationCell()?.media.get(key);
      return media
        ? new Blob([media.bytes as BlobPart], { type: media.contentType })
        : null;
    });
  }

  /** Opens a presentation; `null` empties the viewer. */
  async load(source: OgePresentationSource | null): Promise<void> {
    const id = ++this.loadId;
    this.abort?.abort();
    this.abort = null;
    this.reset();
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
        this.fail('fetch-failed', 'The presentation could not be fetched');
        return;
      }
      const { presentation, issues } = await readOgePptx(data, {
        signal: abort.signal,
      });
      if (id !== this.loadId) return;
      this.presentationCell.set(presentation);
      this.indexCell.set(
        Math.min(this.indexCell(), Math.max(0, presentation.slides.length - 1)),
      );
      this.statusCell.set('ready');
      this.options.onLoaded?.({
        slideCount: presentation.slides.length,
        issues,
      });
    } catch (error) {
      if (id !== this.loadId) return;
      if (error instanceof OgePptxError) {
        if (error.code !== 'aborted') this.fail(error.code, error.message);
        return;
      }
      throw error;
    }
  }

  private fail(code: OgePresentationErrorCode, message: string): void {
    const text = this.messagesCell();
    this.errorCell.set(
      code === 'encrypted-or-legacy' ? text.encryptedOrLegacy : text.loadError,
    );
    this.statusCell.set('error');
    this.options.onLoadError?.({ code, message });
  }

  private reset(): void {
    this.urls.release();
    this.renders.clear();
    this.presentationCell.set(null);
    this.errorCell.set('');
  }

  /** Shows a slide; out-of-range indices clamp. */
  go(index: number): void {
    const last = Math.max(0, this.slideCount() - 1);
    const next = this.presentationCell()
      ? Math.min(last, Math.max(0, Math.trunc(index)))
      : Math.max(0, Math.trunc(index));
    if (next === this.indexCell()) return;
    this.indexCell.set(next);
    this.options.onSlideChange?.(next);
  }

  next(): void {
    this.go(this.indexCell() + 1);
  }

  previous(): void {
    this.go(this.indexCell() - 1);
  }

  /** The viewer's key map, as in PowerPoint's reading view. */
  keydown(event: { readonly key: string; preventDefault(): void }): void {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        this.next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        this.previous();
        break;
      case 'Home':
        this.go(0);
        break;
      case 'End':
        this.go(this.slideCount() - 1);
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
