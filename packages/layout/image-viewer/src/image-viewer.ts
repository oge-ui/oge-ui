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
import { DOCUMENT } from '@angular/common';
import {
  OgeImageViewerCore,
  resolveOgeImageViewerConfig,
  type OgeImageViewerItem,
  type OgeImageViewerMessages,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';
import { OGE_IMAGE_VIEWER_CONFIG } from './config';

const SIGNAL_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

/**
 * An image viewer: a gallery with zoom (buttons, wheel, double click,
 * pinch), pan (drag, or the arrow keys while zoomed), quarter-turn rotation,
 * thumbnails and full screen.
 *
 * ```html
 * <oge-image-viewer [images]="photos" [(index)]="current" />
 * ```
 */
@Component({
  selector: 'oge-image-viewer',
  exportAs: 'ogeImageViewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './image-viewer.scss',
  template: `
    <div
      class="oge-image-viewer"
      role="group"
      aria-roledescription="image viewer"
      tabindex="0"
      [class.oge-image-viewer-fullscreen]="core.fullscreen()"
      [attr.aria-label]="core.messages().label"
      (keydown)="core.keydown($event)"
    >
      @if (toolbar()) {
        <div
          class="oge-image-viewer-toolbar"
          role="toolbar"
          [attr.aria-label]="core.messages().label"
        >
          <span class="oge-image-viewer-group">
            <button
              type="button"
              class="oge-image-viewer-button oge-image-viewer-prev"
              [disabled]="!core.canGoBack()"
              [attr.aria-label]="core.messages().previous"
              [attr.title]="core.messages().previous"
              (click)="core.previous()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M10 3 5 8l5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <span class="oge-image-viewer-readout">{{
              core.counterText()
            }}</span>
            <button
              type="button"
              class="oge-image-viewer-button oge-image-viewer-next"
              [disabled]="!core.canGoForward()"
              [attr.aria-label]="core.messages().next"
              [attr.title]="core.messages().next"
              (click)="core.next()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="m6 3 5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </span>
          <span class="oge-image-viewer-group">
            <button
              type="button"
              class="oge-image-viewer-button oge-image-viewer-zoom-out"
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
            <span class="oge-image-viewer-readout oge-image-viewer-zoom">{{
              core.zoomText()
            }}</span>
            <button
              type="button"
              class="oge-image-viewer-button oge-image-viewer-zoom-in"
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
              class="oge-image-viewer-button oge-image-viewer-reset"
              [disabled]="!core.zoomed() && !core.rotation()"
              [attr.aria-label]="core.messages().resetZoom"
              [attr.title]="core.messages().resetZoom"
              (click)="core.resetView()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </span>
          <span class="oge-image-viewer-group">
            <button
              type="button"
              class="oge-image-viewer-button oge-image-viewer-rotate-left"
              [attr.aria-label]="core.messages().rotateLeft"
              [attr.title]="core.messages().rotateLeft"
              (click)="core.rotate(-1)"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M3 7a5 5 0 1 1 1.5 4M3 3v4h4"
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
              class="oge-image-viewer-button oge-image-viewer-rotate-right"
              [attr.aria-label]="core.messages().rotateRight"
              [attr.title]="core.messages().rotateRight"
              (click)="core.rotate(1)"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M13 7a5 5 0 1 0-1.5 4M13 3v4H9"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </span>
          <span class="oge-image-viewer-spacer"></span>
          <button
            type="button"
            class="oge-image-viewer-button oge-image-viewer-fullscreen-toggle"
            [attr.aria-pressed]="core.fullscreen()"
            [attr.aria-label]="
              core.fullscreen()
                ? core.messages().exitFullscreen
                : core.messages().fullscreen
            "
            [attr.title]="
              core.fullscreen()
                ? core.messages().exitFullscreen
                : core.messages().fullscreen
            "
            (click)="core.toggleFullscreen()"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      }
      <div
        #stage
        class="oge-image-viewer-stage"
        [class.oge-image-viewer-zoomed]="core.zoomed()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
        (wheel)="onWheel($event)"
        (dblclick)="onDoubleClick($event)"
      >
        @if (core.current(); as image) {
          <img
            class="oge-image-viewer-image"
            draggable="false"
            [src]="image.src"
            [alt]="image.alt"
            [style.transform]="core.transform()"
          />
        } @else {
          <p class="oge-image-viewer-empty">{{ core.messages().empty }}</p>
        }
      </div>
      @if (core.current()?.caption; as caption) {
        <p class="oge-image-viewer-caption">{{ caption }}</p>
      }
      @if (thumbnails() && core.items().length > 1) {
        <div
          class="oge-image-viewer-thumbnails"
          role="group"
          [attr.aria-label]="core.messages().thumbnails"
        >
          @for (image of core.items(); track $index) {
            <button
              type="button"
              class="oge-image-viewer-thumbnail"
              [attr.aria-current]="$index === core.index() ? 'true' : null"
              [attr.aria-label]="image.alt"
              (click)="core.go($index)"
            >
              <img
                [src]="image.thumbnail ?? image.src"
                alt=""
                draggable="false"
              />
            </button>
          }
        </div>
      }
      <span class="oge-image-viewer-sr-only" role="status" aria-live="polite">{{
        core.announcement()
      }}</span>
    </div>
  `,
})
export class OgeImageViewer {
  private readonly config = inject(OGE_IMAGE_VIEWER_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  /** The gallery. */
  readonly images = input.required<readonly OgeImageViewerItem[]>();
  /** The shown image (two-way). */
  readonly index = model(0);
  /** Go from the last image to the first and back. Default from the config (`false`). */
  readonly loop = input<boolean | undefined>(undefined);
  /** Largest zoom (default 8 = 800 %). */
  readonly maxZoom = input<number | undefined>(undefined);
  /** The thumbnail strip (shown for two images or more). Default `true`. */
  readonly thumbnails = input(true);
  /** The toolbar. Default `true`. */
  readonly toolbar = input(true);
  /** Overrides of the message catalog. */
  readonly messages = input<Partial<OgeImageViewerMessages>>({});

  /** After the zoom changed (1 = fit). */
  readonly zoomChange = output<number>();

  /** The state the template binds. */
  protected readonly core = new OgeImageViewerCore({
    reactivity: SIGNAL_ADAPTER,
    messages: this.config.messages,
    onIndexChange: (i) => this.index.set(i),
    onZoomChange: (z) => this.zoomChange.emit(z),
    requestFullscreen: (on) => this.requestFullscreen(on),
  });

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;

  constructor() {
    effect(() => {
      const images = this.images();
      untracked(() => this.core.setItems(images));
    });
    effect(() => {
      const index = this.index();
      untracked(() => {
        if (index !== this.core.index()) this.core.go(index);
      });
    });
    effect(() => {
      const config = resolveOgeImageViewerConfig(
        {
          messages: this.messages(),
          ...(this.loop() !== undefined ? { loop: this.loop() } : {}),
          ...(this.maxZoom() !== undefined ? { maxZoom: this.maxZoom() } : {}),
        },
        this.config,
      );
      untracked(() => this.core.setConfig(config));
    });
    afterRenderEffect(() => {
      const element = this.stage()?.nativeElement;
      if (!element || typeof ResizeObserver === 'undefined') return;
      untracked(() => this.observe(element));
    });
    const onFullscreen = () =>
      this.core.setFullscreen(
        this.document.fullscreenElement === this.host.nativeElement,
      );
    this.document.addEventListener('fullscreenchange', onFullscreen);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('fullscreenchange', onFullscreen);
      this.resize?.disconnect();
    });
  }

  private resize: ResizeObserver | null = null;
  private observed: HTMLElement | null = null;

  private observe(element: HTMLElement): void {
    if (this.observed === element) return;
    this.resize?.disconnect();
    this.observed = element;
    this.resize = new ResizeObserver(() =>
      this.core.setStage(element.clientWidth, element.clientHeight),
    );
    this.resize.observe(element);
    this.core.setStage(element.clientWidth, element.clientHeight);
  }

  /** Shows the next image. */
  next(): void {
    this.core.next();
  }

  /** Shows the previous image. */
  previous(): void {
    this.core.previous();
  }

  /** Back to fit: zoom 1, no pan, no rotation. */
  resetView(): void {
    this.core.resetView();
  }

  private requestFullscreen(on: boolean): void {
    const element = this.host.nativeElement;
    if (on)
      void element
        .requestFullscreen?.()
        .catch(() => this.core.setFullscreen(true));
    else if (this.document.fullscreenElement)
      void this.document.exitFullscreen?.();
    else this.core.setFullscreen(false);
  }

  /** A point relative to the stage centre. */
  private point(event: { clientX: number; clientY: number }): {
    x: number;
    y: number;
  } {
    const box = this.stage()?.nativeElement.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: event.clientX - box.left - box.width / 2,
      y: event.clientY - box.top - box.height / 2,
    };
  }

  protected onPointerDown(event: PointerEvent): void {
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      this.core.pointerUp();
      return;
    }
    if (this.core.pointerDown(event.clientX, event.clientY)) {
      (event.target as Element).setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.pointers.has(event.pointerId)) {
      this.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }
    if (this.pointers.size === 2 && this.pinchDistance) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      this.core.pinch(
        distance / this.pinchDistance,
        this.point({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }),
      );
      this.pinchDistance = distance;
      return;
    }
    this.core.pointerMove(event.clientX, event.clientY);
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = 0;
    this.core.pointerUp();
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.core.wheel(event.deltaY, this.point(event));
  }

  protected onDoubleClick(event: MouseEvent): void {
    this.core.toggleZoom(this.point(event));
  }
}
