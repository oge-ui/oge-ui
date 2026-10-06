import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
  type ElementRef,
} from '@angular/core';
import {
  OGE_WINDOW_KEY_SHORTCUTS,
  OGE_WINDOW_RESIZE_EDGES,
  OgeWindowCore,
  isModalFocusOrphaned,
  modalCssSize,
  ogeOverlayMessage,
  ogeWindowZIndex,
  resolveOgeWindowInitialFocus,
  type OgeWindowAutoFocus,
  type OgeWindowCloseReason,
  type OgeWindowClosedEvent,
  type OgeWindowClosingEvent,
  type OgeWindowMovedEvent,
  type OgeWindowOpeningEvent,
  type OgeWindowPlacement,
  type OgeWindowPosition,
  type OgeWindowResizedEvent,
  type OgeWindowState,
  type OgeWindowStateChangedEvent,
  type OgeWindowStateChangingEvent,
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG, type OgeOverlayMessages } from '../config';
import { OgeLiveAnnouncer } from '../live-announcer/live-announcer';
import { SIGNAL_ADAPTER } from '../signal-adapter';

let nextWindowId = 0;

/**
 * Non-modal floating window: no backdrop, no focus trap, no scroll lock —
 * the page stays usable and several windows can be open at once. A press or
 * focus brings a window to the front (one z-order shared by every window of
 * both render layers); the title bar drags it, eight edge handles resize it,
 * and the title-bar buttons minimize (to the title bar), maximize (to the
 * viewport) and restore it.
 *
 * ```html
 * <oge-button text="Inspector" (clicked)="inspector.open()" />
 * <oge-window #inspector title="Inspector" placement="end" [width]="320"
 *             (moved)="save($event)">
 *   …
 * </oge-window>
 * ```
 *
 * Keyboard (focus on the window frame — Tab reaches it, a title-bar press
 * focuses it): arrows move by 10px, Ctrl/⌘ + arrows resize, Shift makes
 * either step 1px, Alt+↑ maximizes, Alt+↓ minimizes, Escape closes while
 * focus is inside and no popup is open. Escape is local: a window never
 * joins the modal Escape stack.
 */
@Component({
  selector: 'oge-window',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './window.scss',
  template: `
    @if (opened()) {
      <div
        #panel
        class="oge-window"
        role="dialog"
        tabindex="0"
        [class.oge-window-placed]="core.rect() !== null"
        [class.oge-window-active]="core.active()"
        [class.oge-window-minimized]="core.state() === 'minimized'"
        [class.oge-window-maximized]="core.state() === 'maximized'"
        [class.oge-window-moving]="core.interaction() === 'move'"
        [class.oge-window-resizing]="core.interaction() === 'resize'"
        [attr.aria-labelledby]="title() !== undefined ? titleId : null"
        [attr.aria-label]="title() !== undefined ? null : (ariaLabel() ?? null)"
        [attr.aria-keyshortcuts]="keyShortcuts"
        [style.left.px]="left()"
        [style.top.px]="top()"
        [style.width]="cssWidth()"
        [style.height]="cssHeight()"
        [style.min-width.px]="limit(minWidth())"
        [style.min-height.px]="
          state() === 'minimized' ? null : limit(minHeight())
        "
        [style.max-width.px]="limit(maxWidth())"
        [style.max-height.px]="limit(maxHeight())"
        [style.z-index]="zIndexStyle()"
        (pointerdown)="core.bringToFront()"
        (focusin)="core.bringToFront()"
        (keydown)="onKeydown($event)"
      >
        <!-- drag surface; the buttons inside keep their own semantics -->
        <div
          class="oge-window-header"
          [class.oge-window-header-draggable]="
            draggable() && core.state() !== 'maximized'
          "
          (pointerdown)="core.startDrag($event)"
          (dblclick)="onHeaderDoubleClick($event)"
        >
          <h2 class="oge-window-title" [id]="titleId">{{ title() }}</h2>
          <div class="oge-window-controls">
            @if (showMinimizeButton()) {
              <button
                type="button"
                class="oge-window-button oge-window-minimize"
                [attr.aria-label]="
                  core.state() === 'minimized'
                    ? mergedMessages().modalRestore
                    : minimizeLabel()
                "
                (click)="core.state() === 'minimized' ? restore() : minimize()"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                >
                  @if (core.state() === 'minimized') {
                    <path
                      d="M3 10l5-5 5 5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      fill="none"
                    />
                  } @else {
                    <path
                      d="M3 12h10"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      fill="none"
                    />
                  }
                </svg>
              </button>
            }
            @if (showMaximizeButton()) {
              <button
                type="button"
                class="oge-window-button oge-window-maximize"
                [attr.aria-label]="
                  core.state() === 'maximized'
                    ? mergedMessages().modalRestore
                    : mergedMessages().modalMaximize
                "
                (click)="core.state() === 'maximized' ? restore() : maximize()"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                >
                  @if (core.state() === 'maximized') {
                    <path
                      d="M5 5V3h8v8h-2M3 5h8v8H3z"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linejoin="round"
                      fill="none"
                    />
                  } @else {
                    <rect
                      x="3"
                      y="3"
                      width="10"
                      height="10"
                      rx="1.5"
                      stroke="currentColor"
                      stroke-width="1.4"
                      fill="none"
                    />
                  }
                </svg>
              </button>
            }
            @if (showCloseButton()) {
              <button
                type="button"
                class="oge-window-button oge-window-close"
                [attr.aria-label]="mergedMessages().modalClose"
                (click)="requestClose('closeButton')"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                >
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    fill="none"
                  />
                </svg>
              </button>
            }
          </div>
        </div>
        <div
          class="oge-window-body"
          [class.oge-window-body-flush]="!padding()"
          [hidden]="core.state() === 'minimized'"
        >
          <ng-content />
        </div>
        @if (resizable() && core.state() === 'normal') {
          @for (edge of edges; track edge) {
            <!-- pointer affordance; the keyboard twin is Ctrl+arrows on the frame -->
            <div
              aria-hidden="true"
              [class]="'oge-window-resize oge-window-resize-' + edge"
              (pointerdown)="core.startResize($event, edge)"
            ></div>
          }
        }
      </div>
    }
  `,
})
export class OgeWindow {
  private readonly config = inject(OGE_OVERLAY_CONFIG);
  private readonly injector = inject(Injector);
  private readonly announcer = inject(OgeLiveAnnouncer);

  /** Id of the title element — wired to `aria-labelledby`. */
  protected readonly titleId = `oge-window-title-${nextWindowId++}`;
  protected readonly edges = OGE_WINDOW_RESIZE_EDGES;
  protected readonly keyShortcuts = OGE_WINDOW_KEY_SHORTCUTS;

  /** Two-way open state. Setting it `false` directly closes without the `closing` event. */
  readonly opened = model(false);
  /** Two-way display state: `'normal'`, `'minimized'` (title bar only) or `'maximized'` (fills the viewport). */
  readonly state = model<OgeWindowState>('normal');
  /** Title-bar text; also the accessible name. */
  readonly title = input<string>();
  /** Accessible name when there is no `title`. */
  readonly ariaLabel = input<string>();
  /** Explicit top-left corner in viewport px; wins over `placement`, and moves the window when it changes. */
  readonly position = input<OgeWindowPosition | null>();
  /** Where the window opens when no `position` is given (RTL-aware). Default `'center'`. */
  readonly placement = input<OgeWindowPlacement>('center');
  /** Initial width — number = px, string passed through. Default `min(420px, 100vw - 32px)`. */
  readonly width = input<number | string>();
  /** Initial height — number = px, string passed through. Default: content. */
  readonly height = input<number | string>();
  /** Smallest width (px) a resize may reach. Default `200`. */
  readonly minWidth = input<number>();
  /** Smallest height (px) a resize may reach. Default `120`. */
  readonly minHeight = input<number>();
  /** Largest width (px). Default: the viewport. */
  readonly maxWidth = input<number>();
  /** Largest height (px). Default: the viewport. */
  readonly maxHeight = input<number>();
  /** Base z-index; the window's stacking layer is added to it. Default: the `--oge-z-window` token. */
  readonly zIndex = input<number>();
  /** The title bar drags the window (pointer and arrow keys). Default `true`. */
  readonly draggable = input(true);
  /** Eight edge handles resize the window (pointer and Ctrl+arrows). Default `true`. */
  readonly resizable = input(true);
  /** Keeps the whole window inside the viewport; `false` lets it hang off the edges but always keeps the title bar reachable. Default `true`. */
  readonly keepInViewport = input(true);
  /** Shows the minimize/restore title-bar button. Default `true`. */
  readonly showMinimizeButton = input(true);
  /** Shows the maximize/restore title-bar button (a title-bar double-click toggles too). Default `true`. */
  readonly showMaximizeButton = input(true);
  /** Shows the ✕ title-bar button. Default `true`. */
  readonly showCloseButton = input(true);
  /** Escape closes the window while focus is inside it and no popup is open. Default `true`. */
  readonly closeOnEscape = input(true);
  /** Where focus lands on open; `false` leaves focus where it is. Default `'first-tabbable'`. */
  readonly autoFocus = input<OgeWindowAutoFocus>('first-tabbable');
  /** Restores focus to the opener on close (only when focus would be lost). Default `true`. */
  readonly restoreFocus = input(true);
  /** Default body padding; `false` for flush content. */
  readonly padding = input(true);
  /** Per-instance message overrides (merged over the overlay config). */
  readonly messages = input<Partial<OgeOverlayMessages>>();

  /** Cancelable: fires before the window opens (any open path). */
  readonly opening = output<OgeWindowOpeningEvent>();
  /** Cancelable: fires before Escape / ✕ / `close()` closes the window. */
  readonly closing = output<OgeWindowClosingEvent>();
  /** Fires after the window closed, with the reason. */
  readonly closed = output<OgeWindowClosedEvent>();
  /** Fires after a drag, a keyboard move, `center()` or a `position` change. */
  readonly moved = output<OgeWindowMovedEvent>();
  /** Fires after a resize gesture or a keyboard resize. */
  readonly resized = output<OgeWindowResizedEvent>();
  /** Cancelable: fires before minimize / maximize / restore. */
  readonly stateChanging = output<OgeWindowStateChangingEvent>();
  /** Fires after the display state changed. */
  readonly stateChanged = output<OgeWindowStateChangedEvent>();
  /** Fires when the window becomes the frontmost (active) one. */
  readonly activated = output<void>();

  protected readonly mergedMessages = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));
  protected readonly minimizeLabel = computed(() =>
    ogeOverlayMessage(this.mergedMessages(), 'windowMinimize'),
  );

  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

  /** The shared machine: geometry, state, z-order, gestures, keyboard. */
  protected readonly core = new OgeWindowCore({
    adapter: SIGNAL_ADAPTER,
    props: () =>
      untracked(() => ({
        draggable: this.draggable(),
        resizable: this.resizable(),
        keepInViewport: this.keepInViewport(),
        placement: this.placement(),
        position: this.position(),
        minWidth: this.minWidth(),
        minHeight: this.minHeight(),
        maxWidth: this.maxWidth(),
        maxHeight: this.maxHeight(),
        closeOnEscape: this.closeOnEscape(),
        messages: this.mergedMessages(),
      })),
    panel: () => this.panelRef()?.nativeElement ?? null,
    onMoved: (event) => this.moved.emit(event),
    onResized: (event) => this.resized.emit(event),
    onStateChanging: (event) => this.stateChanging.emit(event),
    onStateChanged: (event) => {
      this.state.set(event.state);
      this.stateChanged.emit(event);
    },
    onActivated: () => this.activated.emit(),
    onEscape: () => this.requestClose('escape'),
    announce: (message) => this.announcer.announce(message),
  });

  protected readonly left = computed(() => {
    const rect = this.core.rect();
    return rect && this.core.state() !== 'maximized' ? rect.x : null;
  });
  protected readonly top = computed(() => {
    const rect = this.core.rect();
    return rect && this.core.state() !== 'maximized' ? rect.y : null;
  });
  protected readonly cssWidth = computed(() => {
    if (this.core.state() === 'maximized') return null;
    const width = this.core.rect()?.width;
    return width != null ? `${width}px` : modalCssSize(this.width());
  });
  protected readonly cssHeight = computed(() => {
    if (this.core.state() !== 'normal') return null;
    const height = this.core.rect()?.height;
    return height != null ? `${height}px` : modalCssSize(this.height());
  });
  protected readonly zIndexStyle = computed(() =>
    ogeWindowZIndex(this.zIndex(), this.core.layer()),
  );

  private shown = false;
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const shouldOpen = this.opened();
      untracked(() => {
        if (shouldOpen && !this.shown) this.doOpen();
        else if (!shouldOpen && this.shown) this.finalizeClose('api');
      });
    });
    // two-way `state`: an outside write runs the cancelable pipeline
    effect(() => {
      const wanted = this.state();
      untracked(() => {
        if (wanted === this.core.state()) return;
        if (!this.core.setState(wanted)) this.state.set(this.core.state());
      });
    });
    effect(() => {
      this.position();
      this.placement();
      untracked(() => {
        if (this.shown) this.core.syncPosition();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.shown) this.teardown();
    });
  }

  /** Opens the window. */
  open(): void {
    this.opened.set(true);
  }

  /** Closes through the cancelable `closing` event; reason `'api'`. */
  close(): void {
    this.requestClose('api');
  }

  /** Toggles between open and closed. */
  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  /** Collapses the window to its title bar; `false` when vetoed. */
  minimize(): boolean {
    return this.core.minimize();
  }

  /** Fills the viewport; `false` when vetoed. */
  maximize(): boolean {
    return this.core.maximize();
  }

  /** Back to the normal box; `false` when vetoed or already normal. */
  restore(): boolean {
    return this.core.restore();
  }

  /** Raises the window above the other open windows. */
  bringToFront(): void {
    this.core.bringToFront();
  }

  /** Re-centres the window in the viewport (fires `moved`). */
  center(): void {
    this.core.center();
  }

  /** Moves the top-left corner to `(x, y)` viewport px (clamped; fires `moved`). */
  moveTo(x: number, y: number): void {
    this.core.moveTo(x, y);
  }

  /** Resizes to `width × height` px (min/max-limited; fires `resized`). */
  resizeTo(width: number, height: number): void {
    this.core.resizeTo(width, height);
  }

  /** Moves focus into the window (the `autoFocus` resolution) and raises it. */
  focus(): void {
    const panel = this.panelRef()?.nativeElement;
    if (!panel) return;
    const mode = this.autoFocus();
    resolveOgeWindowInitialFocus(panel, mode === false ? 'panel' : mode)?.focus(
      { preventScroll: true },
    );
  }

  private doOpen(): void {
    if (typeof window === 'undefined') return; // SSR: nothing to show
    const opening: OgeWindowOpeningEvent = { cancel: false };
    this.opening.emit(opening);
    if (opening.cancel) {
      if (this.opened()) this.opened.set(false);
      return;
    }
    this.shown = true;
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.core.attach();
    afterNextRender(
      () => {
        if (!this.shown) return;
        this.core.place();
        // the frame is `visibility: hidden` until the placed class renders,
        // and a hidden element cannot take focus — wait one more render
        afterNextRender(
          () => {
            if (this.shown && this.autoFocus() !== false) this.focus();
          },
          { injector: this.injector },
        );
      },
      { injector: this.injector },
    );
  }

  /** Runs the close pipeline for Escape, ✕ and `close()`. */
  protected requestClose(reason: OgeWindowCloseReason): void {
    if (!this.shown) return;
    const closing: OgeWindowClosingEvent = { reason, cancel: false };
    this.closing.emit(closing);
    if (closing.cancel) return;
    this.finalizeClose(reason);
  }

  private finalizeClose(reason: OgeWindowCloseReason): void {
    if (!this.shown) return;
    const panel = this.panelRef()?.nativeElement ?? null;
    this.teardown();
    if (this.restoreFocus() && this.previouslyFocused) {
      if (isModalFocusOrphaned(panel)) this.previouslyFocused.focus();
    }
    this.previouslyFocused = null;
    if (this.opened()) this.opened.set(false);
    this.closed.emit({ reason });
  }

  private teardown(): void {
    this.shown = false;
    this.core.detach();
  }

  protected limit(value: number | undefined): number | null {
    return this.core.state() === 'maximized' ? null : (value ?? null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.core.keydown(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  protected onHeaderDoubleClick(event: MouseEvent): void {
    if (!this.showMaximizeButton()) return;
    if ((event.target as Element).closest('button')) return;
    this.core.toggleMaximize();
  }
}
