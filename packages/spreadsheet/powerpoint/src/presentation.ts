import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  OgePresentationCore,
  ogeCheckSpreadsheetLicense,
  type OgePresentationLoadErrorEvent,
  type OgePresentationLoadedEvent,
  type OgePresentationMessages,
  type OgePresentationSource,
  type OgeSlideRender,
} from '@oge-ui/spreadsheet-engine/powerpoint';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '@oge-ui/spreadsheet-engine';

import { OGE_PRESENTATION_CONFIG } from './config';

const SIGNAL_ADAPTER: OgeSpreadsheetReactivity = {
  cell<T>(initial: T): OgeSpreadsheetReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeSpreadsheetReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

let nextId = 0;

/** Draws one slide; the engine's drawing, bound element for element. */
@Component({
  selector: 'oge-slide-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <svg
      class="oge-presentation-canvas"
      preserveAspectRatio="xMidYMid meet"
      [attr.viewBox]="'0 0 ' + render().width + ' ' + render().height"
    >
      <defs>
        @for (gradient of render().gradients; track gradient.id) {
          <linearGradient
            [attr.id]="gradient.id"
            [attr.gradientTransform]="gradient.transform"
          >
            @for (stop of gradient.stops; track $index) {
              <stop
                [attr.offset]="stop.offset"
                [attr.stop-color]="stop.color"
                [attr.stop-opacity]="stop.opacity"
              />
            }
          </linearGradient>
        }
      </defs>
      @for (node of render().nodes; track $index) {
        @if (node.kind === 'path') {
          <path
            [attr.d]="node.d"
            [attr.transform]="node.transform || null"
            [attr.fill]="node.fill?.paint ?? 'none'"
            [attr.fill-opacity]="node.fill?.opacity ?? null"
            [attr.stroke]="node.stroke?.paint ?? 'none'"
            [attr.stroke-opacity]="node.stroke?.opacity ?? null"
            [attr.stroke-width]="node.strokeWidth"
            [attr.stroke-dasharray]="node.dash"
            [attr.stroke-linecap]="node.cap"
          />
        } @else if (node.kind === 'image') {
          <svg
            preserveAspectRatio="none"
            [attr.x]="node.x"
            [attr.y]="node.y"
            [attr.width]="node.width"
            [attr.height]="node.height"
            [attr.viewBox]="node.viewBox"
            [attr.transform]="node.transform || null"
          >
            <image
              width="1"
              height="1"
              preserveAspectRatio="none"
              [attr.href]="mediaUrl()(node.media)"
              [attr.aria-label]="node.label || null"
            />
          </svg>
        } @else if (node.link) {
          <a [attr.href]="node.link" target="_blank" rel="noopener noreferrer">
            <text
              [attr.x]="node.x"
              [attr.y]="node.y"
              [attr.transform]="node.transform || null"
              [attr.font-family]="node.fontFamily"
              [attr.font-size]="node.fontSize"
              [attr.font-weight]="node.fontWeight"
              [attr.font-style]="node.fontStyle"
              [attr.fill]="node.fill.paint"
              [attr.fill-opacity]="node.fill.opacity"
              [attr.text-decoration]="node.decoration"
              [textContent]="node.text"
            ></text>
          </a>
        } @else {
          <text
            [attr.x]="node.x"
            [attr.y]="node.y"
            [attr.transform]="node.transform || null"
            [attr.font-family]="node.fontFamily"
            [attr.font-size]="node.fontSize"
            [attr.font-weight]="node.fontWeight"
            [attr.font-style]="node.fontStyle"
            [attr.fill]="node.fill.paint"
            [attr.fill-opacity]="node.fill.opacity"
            [attr.text-decoration]="node.decoration"
            [textContent]="node.text"
          ></text>
        }
      }
    </svg>
  `,
})
export class OgeSlideCanvas {
  /** The engine's drawing of the slide. */
  readonly render = input.required<OgeSlideRender>();
  /** Resolves a picture part to a URL. */
  readonly mediaUrl = input.required<(key: string) => string | null>();
}

/**
 * Shows a `.pptx` presentation the way PowerPoint does, with a slide rail and
 * keyboard navigation. Read-only; macros and embedded objects never run and
 * external targets are never fetched (ADR 0006).
 *
 * ```html
 * <oge-presentation [source]="fileOrUrl" [(slideIndex)]="slide" />
 * ```
 */
@Component({
  selector: 'oge-presentation',
  exportAs: 'ogePresentation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeSlideCanvas],
  styleUrl: './presentation.scss',
  template: `
    <div
      class="oge-presentation"
      role="group"
      tabindex="0"
      [attr.aria-label]="core.messages().viewerLabel"
      (keydown)="core.keydown($event)"
    >
      @if (core.status() === 'ready') {
        @if (thumbnails()) {
          <ol
            class="oge-presentation-rail"
            [attr.aria-label]="core.messages().thumbnails"
          >
            @for (i of slideIndices(); track i) {
              <li>
                <button
                  type="button"
                  class="oge-presentation-thumb"
                  [class.oge-presentation-thumb-current]="i === core.index()"
                  [attr.aria-current]="i === core.index() ? 'true' : null"
                  [attr.aria-label]="core.labelOf(i)"
                  (click)="core.go(i)"
                >
                  <span
                    class="oge-presentation-thumb-number"
                    aria-hidden="true"
                    >{{ i + 1 }}</span
                  >
                  @if (core.renderOf(i); as drawing) {
                    <oge-slide-canvas
                      aria-hidden="true"
                      [render]="drawing"
                      [mediaUrl]="mediaUrl"
                    />
                  }
                </button>
              </li>
            }
          </ol>
        }
        <div class="oge-presentation-main">
          <div
            class="oge-presentation-stage"
            role="group"
            aria-roledescription="slide"
            [attr.aria-label]="core.currentLabel()"
          >
            @if (core.current(); as drawing) {
              <oge-slide-canvas [render]="drawing" [mediaUrl]="mediaUrl" />
            }
          </div>
          <div class="oge-presentation-bar">
            <button
              type="button"
              class="oge-presentation-nav"
              [disabled]="!core.canGoBack()"
              [attr.aria-label]="core.messages().previousSlide"
              [attr.title]="core.messages().previousSlide"
              (click)="core.previous()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M10 3L5 8l5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <span class="oge-presentation-position" aria-live="polite">{{
              core.currentLabel()
            }}</span>
            <button
              type="button"
              class="oge-presentation-nav"
              [disabled]="!core.canGoForward()"
              [attr.aria-label]="core.messages().nextSlide"
              [attr.title]="core.messages().nextSlide"
              (click)="core.next()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M6 3l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
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
export class OgePresentation {
  private readonly config = inject(OGE_PRESENTATION_CONFIG);

  /** The file: bytes, a `Blob`, or a URL to fetch. */
  readonly source = input<OgePresentationSource | null>(null);
  /** 0-based current slide (two-way). */
  readonly slideIndex = model(0);
  /** Shows the slide rail. Default `true`. */
  readonly thumbnails = input(true);
  /** Overrides of the message catalog. */
  readonly messages = input<Partial<OgePresentationMessages>>({});

  /** After a presentation opened, with what could not be shown. */
  readonly loaded = output<OgePresentationLoadedEvent>();
  /** When a presentation did not open. */
  readonly loadError = output<OgePresentationLoadErrorEvent>();

  /** The viewer state the template binds. */
  protected readonly core = new OgePresentationCore({
    reactivity: SIGNAL_ADAPTER,
    messages: this.config.messages,
    idPrefix: `oge-presentation-${nextId++}`,
    onLoaded: (event) => this.loaded.emit(event),
    onLoadError: (event) => this.loadError.emit(event),
    onSlideChange: (index) => this.slideIndex.set(index),
  });

  protected readonly mediaUrl = (key: string): string | null =>
    this.core.mediaUrl(key);

  protected readonly slideIndices = computed(() =>
    Array.from({ length: this.core.slideCount() }, (_, i) => i),
  );

  constructor() {
    ogeCheckSpreadsheetLicense();
    effect(() => {
      const source = this.source();
      untracked(() => void this.core.load(source));
    });
    effect(() => {
      const index = this.slideIndex();
      // read too, so an index set before the file opened still applies
      this.core.slideCount();
      untracked(() => this.core.go(index));
    });
    effect(() =>
      this.core.setMessages({
        ...this.config.messages,
        ...this.messages(),
      }),
    );
    inject(DestroyRef).onDestroy(() => this.core.destroy());
  }
}
