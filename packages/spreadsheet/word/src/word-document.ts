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
} from '@angular/core';
import { OgeSlideCanvas } from '@oge-ui/spreadsheet/powerpoint';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '@oge-ui/spreadsheet-engine';
import {
  OgeWordDocumentCore,
  ogeCheckSpreadsheetLicense,
  ogeVisibleWordPages,
  type OgeWordDocumentLoadErrorEvent,
  type OgeWordDocumentLoadedEvent,
  type OgeWordDocumentMessages,
  type OgeWordDocumentSource,
} from '@oge-ui/spreadsheet-engine/word';
import { OGE_WORD_DOCUMENT_CONFIG } from './config';

const SIGNAL_ADAPTER: OgeSpreadsheetReactivity = {
  cell<T>(initial: T): OgeSpreadsheetReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeSpreadsheetReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

const PAGE_SELECTOR = '.oge-word-page';

let nextId = 0;

/**
 * Shows a `.docx` document the way Word does: Word's line breaks and page
 * breaks, measured against Word itself. Read-only; macros and embedded objects
 * never run and external targets are never fetched (ADR 0006).
 *
 * ```html
 * <oge-word-document [source]="fileOrUrl" [(pageIndex)]="page" />
 * ```
 */
@Component({
  selector: 'oge-word-document',
  exportAs: 'ogeWordDocument',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeSlideCanvas],
  styleUrl: './word-document.scss',
  template: `
    <div
      class="oge-word"
      role="group"
      tabindex="0"
      [attr.aria-label]="core.messages().viewerLabel"
      (keydown)="core.keydown($event)"
    >
      @if (core.status() === 'ready') {
        <div #scroller class="oge-word-scroller" (scroll)="reportViewport()">
          @for (page of core.pages(); track $index) {
            <div
              class="oge-word-page"
              role="group"
              aria-roledescription="page"
              [attr.aria-label]="core.labelOf($index)"
              [style.width.px]="(page.width * 4) / 3"
              [style.aspect-ratio]="page.width + ' / ' + page.height"
            >
              @if (core.isDrawn($index)) {
                <oge-slide-canvas
                  [render]="page.render"
                  [mediaUrl]="mediaUrl"
                />
              }
            </div>
          }
        </div>
        <div class="oge-presentation-bar">
          <button
            type="button"
            class="oge-presentation-nav"
            [disabled]="!core.canGoBack()"
            [attr.aria-label]="core.messages().previousPage"
            [attr.title]="core.messages().previousPage"
            (click)="core.previous()"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M3 10l5-5 5 5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <span aria-live="polite">{{ core.currentLabel() }}</span>
          <button
            type="button"
            class="oge-presentation-nav"
            [disabled]="!core.canGoForward()"
            [attr.aria-label]="core.messages().nextPage"
            [attr.title]="core.messages().nextPage"
            (click)="core.next()"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M3 6l5 5 5-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      } @else {
        <div class="oge-presentation-status" role="status">
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
export class OgeWordDocument {
  private readonly config = inject(OGE_WORD_DOCUMENT_CONFIG);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  /** The file: bytes, a `Blob`, or a URL to fetch. */
  readonly source = input<OgeWordDocumentSource | null>(null);
  /** 0-based page nearest the viewport's middle (two-way). */
  readonly pageIndex = model(0);
  /** Overrides of the message catalog. */
  readonly messages = input<Partial<OgeWordDocumentMessages>>({});

  /** After a document opened, with what could not be shown. */
  readonly loaded = output<OgeWordDocumentLoadedEvent>();
  /** When a document did not open. */
  readonly loadError = output<OgeWordDocumentLoadErrorEvent>();

  /** The viewer state the template binds. */
  protected readonly core = new OgeWordDocumentCore({
    reactivity: SIGNAL_ADAPTER,
    messages: this.config.messages,
    idPrefix: `oge-word-${nextId++}`,
    onLoaded: (event) => this.loaded.emit(event),
    onLoadError: (event) => this.loadError.emit(event),
    onPageChange: (index) => this.pageIndex.set(index),
    scrollToPage: (index) => this.scrollTo(index),
  });

  protected readonly mediaUrl = (key: string): string | null =>
    this.core.mediaUrl(key);

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
    effect(() =>
      this.core.setMessages({
        ...this.config.messages,
        ...this.messages(),
      }),
    );
    // Once the pages exist, say which of them show.
    afterRenderEffect(() => {
      this.core.pageCount();
      if (this.scroller()) untracked(() => this.reportViewport());
    });
    inject(DestroyRef).onDestroy(() => this.core.destroy());
  }

  protected reportViewport(): void {
    const element = this.scroller()?.nativeElement;
    const range = element && ogeVisibleWordPages(element, PAGE_SELECTOR);
    if (range) this.core.viewport(range);
  }

  private scrollTo(index: number): void {
    const element = this.scroller()?.nativeElement;
    element
      ?.querySelectorAll<HTMLElement>(PAGE_SELECTOR)
      [index]?.scrollIntoView?.({ block: 'start' });
  }
}
