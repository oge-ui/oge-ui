/**
 * The image viewer's state machine, shared by both render layers: a gallery
 * of images with zoom (buttons, wheel, double click, pinch), pan (drag and
 * arrow keys while zoomed), rotation in quarter turns, thumbnails and
 * full screen. The layers own only markup, pointer capture and the
 * Fullscreen API call.
 */
import { ogeFormatMessage } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/** One image of the gallery. */
export interface OgeImageViewerItem {
  readonly src: string;
  /** Text alternative, read out and shown when the image fails. */
  readonly alt: string;
  /** Shown under the image. */
  readonly caption?: string;
  /** A smaller file for the thumbnail strip (default: `src`). */
  readonly thumbnail?: string;
}

export interface OgeImageViewerMessages {
  readonly label: string;
  readonly previous: string;
  readonly next: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly resetZoom: string;
  readonly rotateLeft: string;
  readonly rotateRight: string;
  readonly fullscreen: string;
  readonly exitFullscreen: string;
  readonly thumbnails: string;
  /** `{index}` of `{count}`. */
  readonly counter: string;
  /** `{zoom}` percent. */
  readonly zoomLevel: string;
  /** Live-region text when the image changes: `{alt}`, `{index}`, `{count}`. */
  readonly announce: string;
  readonly empty: string;
}

export const OGE_DEFAULT_IMAGE_VIEWER_MESSAGES: OgeImageViewerMessages = {
  label: 'Image viewer',
  previous: 'Previous image',
  next: 'Next image',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Fit to view',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  fullscreen: 'Full screen',
  exitFullscreen: 'Exit full screen',
  thumbnails: 'Images',
  counter: '{index} of {count}',
  zoomLevel: '{zoom}%',
  announce: '{alt}, image {index} of {count}',
  empty: 'No images',
};

export interface OgeImageViewerConfig {
  messages: OgeImageViewerMessages;
  /** Largest zoom (default 8 = 800 %). */
  maxZoom?: number;
  /** Go from the last image to the first and back (default `false`). */
  loop?: boolean;
}

export type OgeImageViewerConfigInput = Partial<
  Omit<OgeImageViewerConfig, 'messages'>
> & {
  messages?: Partial<OgeImageViewerMessages>;
};

export const OGE_DEFAULT_IMAGE_VIEWER_CONFIG: OgeImageViewerConfig = {
  messages: OGE_DEFAULT_IMAGE_VIEWER_MESSAGES,
};

export function resolveOgeImageViewerConfig(
  input: OgeImageViewerConfigInput | undefined,
  base: OgeImageViewerConfig = OGE_DEFAULT_IMAGE_VIEWER_CONFIG,
): OgeImageViewerConfig {
  return {
    ...base,
    ...input,
    messages: { ...base.messages, ...input?.messages },
  };
}

/** Zoom steps of the buttons and Ctrl + / −. */
export const OGE_IMAGE_ZOOM_STEPS: readonly number[] = [1, 1.5, 2, 3, 4, 6, 8];

export interface OgeImageViewerCoreOptions {
  readonly reactivity: OgeReactivityAdapter;
  readonly messages: OgeImageViewerMessages;
  readonly onIndexChange?: (index: number) => void;
  readonly onZoomChange?: (zoom: number) => void;
  /** Asks the layer to enter or leave full screen. */
  readonly requestFullscreen?: (on: boolean) => void;
}

/** How far an arrow key pans, in CSS px. */
const PAN_STEP = 60;

/** The image viewer's state machine. */
export class OgeImageViewerCore {
  private readonly itemsCell: OgeReactiveCell<readonly OgeImageViewerItem[]>;
  private readonly indexCell: OgeReactiveCell<number>;
  private readonly zoomCell: OgeReactiveCell<number>;
  private readonly panCell: OgeReactiveCell<{
    readonly x: number;
    readonly y: number;
  }>;
  private readonly rotationCell: OgeReactiveCell<number>;
  private readonly fullscreenCell: OgeReactiveCell<boolean>;
  private readonly messagesCell: OgeReactiveCell<OgeImageViewerMessages>;
  private readonly stageCell: OgeReactiveCell<{
    readonly width: number;
    readonly height: number;
  }>;
  private readonly maxZoomCell: OgeReactiveCell<number>;
  private readonly loopCell: OgeReactiveCell<boolean>;
  private drag: { x: number; y: number; panX: number; panY: number } | null =
    null;

  readonly items: () => readonly OgeImageViewerItem[];
  readonly index: () => number;
  readonly current: () => OgeImageViewerItem | undefined;
  readonly zoom: () => number;
  readonly pan: () => { readonly x: number; readonly y: number };
  readonly rotation: () => number;
  readonly fullscreen: () => boolean;
  readonly messages: () => OgeImageViewerMessages;
  readonly canGoBack: () => boolean;
  readonly canGoForward: () => boolean;
  readonly canZoomIn: () => boolean;
  readonly canZoomOut: () => boolean;
  readonly zoomed: () => boolean;
  /** `translate(…) rotate(…) scale(…)` for the image. */
  readonly transform: () => string;
  readonly counterText: () => string;
  readonly zoomText: () => string;
  /** What the live region says about the current image. */
  readonly announcement: () => string;

  constructor(private readonly options: OgeImageViewerCoreOptions) {
    const rx = options.reactivity;
    this.itemsCell = rx.cell<readonly OgeImageViewerItem[]>([]);
    this.indexCell = rx.cell(0);
    this.zoomCell = rx.cell(1);
    this.panCell = rx.cell({ x: 0, y: 0 });
    this.rotationCell = rx.cell(0);
    this.fullscreenCell = rx.cell(false);
    this.messagesCell = rx.cell(options.messages);
    this.stageCell = rx.cell({ width: 0, height: 0 });
    this.maxZoomCell = rx.cell(8);
    this.loopCell = rx.cell(false);

    this.items = () => this.itemsCell();
    this.index = () => this.indexCell();
    this.current = () => this.itemsCell()[this.indexCell()];
    this.zoom = () => this.zoomCell();
    this.pan = () => this.panCell();
    this.rotation = () => this.rotationCell();
    this.fullscreen = () => this.fullscreenCell();
    this.messages = () => this.messagesCell();
    this.canGoBack = rx.derived(() =>
      this.loopCell() ? this.itemsCell().length > 1 : this.indexCell() > 0,
    );
    this.canGoForward = rx.derived(() =>
      this.loopCell()
        ? this.itemsCell().length > 1
        : this.indexCell() < this.itemsCell().length - 1,
    );
    this.canZoomIn = rx.derived(() => this.zoomCell() < this.maxZoomCell());
    this.canZoomOut = rx.derived(() => this.zoomCell() > 1);
    this.zoomed = rx.derived(() => this.zoomCell() > 1);
    this.transform = rx.derived(() => {
      const { x, y } = this.panCell();
      return `translate(${round(x)}px, ${round(y)}px) rotate(${this.rotationCell()}deg) scale(${round(this.zoomCell())})`;
    });
    this.counterText = rx.derived(() =>
      ogeFormatMessage(this.messagesCell().counter, {
        index: this.indexCell() + 1,
        count: this.itemsCell().length,
      }),
    );
    this.zoomText = rx.derived(() =>
      ogeFormatMessage(this.messagesCell().zoomLevel, {
        zoom: Math.round(this.zoomCell() * 100),
      }),
    );
    this.announcement = rx.derived(() => {
      const item = this.current();
      return item
        ? ogeFormatMessage(this.messagesCell().announce, {
            alt: item.alt,
            index: this.indexCell() + 1,
            count: this.itemsCell().length,
          })
        : this.messagesCell().empty;
    });
  }

  setItems(items: readonly OgeImageViewerItem[]): void {
    this.itemsCell.set(items);
    if (this.indexCell() >= items.length)
      this.go(Math.max(0, items.length - 1));
  }

  setConfig(config: OgeImageViewerConfig): void {
    this.messagesCell.set(config.messages);
    this.maxZoomCell.set(Math.max(1, config.maxZoom ?? 8));
    this.loopCell.set(config.loop ?? false);
    if (this.zoomCell() > this.maxZoomCell()) this.setZoom(this.maxZoomCell());
  }

  /** The stage's size, for clamping the pan. */
  setStage(width: number, height: number): void {
    const stage = this.stageCell();
    if (stage.width === width && stage.height === height) return;
    this.stageCell.set({ width, height });
    this.setPan(this.panCell().x, this.panCell().y);
  }

  /** Shows image `index`, at fit zoom. */
  go(index: number): void {
    const count = this.itemsCell().length;
    if (!count) return;
    const next = this.loopCell()
      ? ((index % count) + count) % count
      : Math.max(0, Math.min(count - 1, index));
    this.resetView();
    if (next === this.indexCell()) return;
    this.indexCell.set(next);
    this.options.onIndexChange?.(next);
  }

  next(): void {
    this.go(this.indexCell() + 1);
  }

  previous(): void {
    this.go(this.indexCell() - 1);
  }

  /** Zoom 1 (fit), no pan, no rotation. */
  resetView(): void {
    this.panCell.set({ x: 0, y: 0 });
    this.rotationCell.set(0);
    this.setZoom(1);
  }

  /**
   * Sets the zoom; with `at` (a point relative to the stage centre) the point
   * under the pointer stays where it is.
   */
  setZoom(zoom: number, at?: { readonly x: number; readonly y: number }): void {
    const old = this.zoomCell();
    const next = Math.max(1, Math.min(this.maxZoomCell(), zoom));
    if (next === old) return;
    this.zoomCell.set(next);
    if (next === 1) this.panCell.set({ x: 0, y: 0 });
    else if (at) {
      const ratio = next / old;
      const { x, y } = this.panCell();
      this.setPan(at.x - (at.x - x) * ratio, at.y - (at.y - y) * ratio);
    } else {
      this.setPan(this.panCell().x, this.panCell().y);
    }
    this.options.onZoomChange?.(next);
  }

  zoomIn(at?: { x: number; y: number }): void {
    const next =
      OGE_IMAGE_ZOOM_STEPS.find((s) => s > this.zoomCell() + 1e-6) ??
      this.maxZoomCell();
    this.setZoom(next, at);
  }

  zoomOut(at?: { x: number; y: number }): void {
    const lower =
      [...OGE_IMAGE_ZOOM_STEPS]
        .reverse()
        .find((s) => s < this.zoomCell() - 1e-6) ?? 1;
    this.setZoom(lower, at);
  }

  /** Wheel zoom: proportional to the scroll, around the pointer. */
  wheel(deltaY: number, at: { x: number; y: number }): void {
    this.setZoom(this.zoomCell() * Math.exp(-deltaY * 0.0015), at);
  }

  /** Double click: 2× around the point, or back to fit. */
  toggleZoom(at: { x: number; y: number }): void {
    if (this.zoomCell() > 1) this.resetView();
    else this.setZoom(2, at);
  }

  /** Pinch: scale the zoom by the change of the finger distance. */
  pinch(scale: number, at: { x: number; y: number }): void {
    this.setZoom(this.zoomCell() * scale, at);
  }

  rotate(quarterTurns: number): void {
    const next =
      (((this.rotationCell() + quarterTurns * 90) % 360) + 360) % 360;
    this.rotationCell.set(next);
  }

  setFullscreen(on: boolean): void {
    if (on === this.fullscreenCell()) return;
    this.fullscreenCell.set(on);
  }

  toggleFullscreen(): void {
    this.options.requestFullscreen?.(!this.fullscreenCell());
  }

  /** Keeps the scaled image covering the stage: no empty band beyond its edge. */
  private setPan(x: number, y: number): void {
    const { width, height } = this.stageCell();
    const zoom = this.zoomCell();
    const maxX = width ? (width * (zoom - 1)) / 2 : Infinity;
    const maxY = height ? (height * (zoom - 1)) / 2 : Infinity;
    const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
    const next = { x: clamp(x, maxX), y: clamp(y, maxY) };
    const pan = this.panCell();
    if (next.x !== pan.x || next.y !== pan.y) this.panCell.set(next);
  }

  /** Pointer down on the stage: start a drag when zoomed. */
  pointerDown(x: number, y: number): boolean {
    if (this.zoomCell() <= 1) return false;
    this.drag = { x, y, panX: this.panCell().x, panY: this.panCell().y };
    return true;
  }

  pointerMove(x: number, y: number): void {
    if (!this.drag) return;
    this.setPan(
      this.drag.panX + x - this.drag.x,
      this.drag.panY + y - this.drag.y,
    );
  }

  pointerUp(): void {
    this.drag = null;
  }

  /** The viewer's keyboard map. */
  keydown(event: {
    readonly key: string;
    readonly ctrlKey?: boolean;
    readonly metaKey?: boolean;
    preventDefault(): void;
  }): void {
    const zoomed = this.zoomCell() > 1;
    const { x, y } = this.panCell();
    switch (event.key) {
      case 'ArrowRight':
        if (zoomed) this.setPan(x - PAN_STEP, y);
        else this.next();
        break;
      case 'ArrowLeft':
        if (zoomed) this.setPan(x + PAN_STEP, y);
        else this.previous();
        break;
      case 'ArrowUp':
        if (!zoomed) return;
        this.setPan(x, y + PAN_STEP);
        break;
      case 'ArrowDown':
        if (!zoomed) return;
        this.setPan(x, y - PAN_STEP);
        break;
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
        this.go(this.itemsCell().length - 1);
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
        this.zoomOut();
        break;
      case '0':
        this.resetView();
        break;
      case 'r':
        this.rotate(1);
        break;
      case 'R':
        this.rotate(-1);
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      default:
        return;
    }
    event.preventDefault();
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
