import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  Injector,
  type ElementRef,
  type Signal,
} from '@angular/core';
import { OGE_OVERLAY_CONFIG } from '../config';
import { isTopOverlay, pushOverlay, removeOverlay } from '../overlay-stack';
import { getTabbableElements, trapTabKey } from './focus-trap';
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock';
import {
  OgeModalFooter,
  OgeModalHeaderActions,
  OgeModalTitle,
} from './modal-templates';
import type {
  OgeModalAutoFocus,
  OgeModalClosedEvent,
  OgeModalCloseReason,
  OgeModalClosingEvent,
  OgeModalOpeningEvent,
  OgeModalPlacement,
  OgeModalResizeEvent,
  OgeModalSlotContext,
} from './modal-types';
import type { OgeOverlayMessages } from '../config';

declare const ngDevMode: boolean | undefined;

let nextModalId = 0;

/**
 * Centered modal dialog: backdrop, focus trap, body scroll lock, Escape/
 * backdrop closing and focus restore. Content renders lazily behind the
 * `opened` model and participates in the shared overlay Escape stack, so a
 * popup opened inside the modal closes before the modal itself.
 *
 * ```html
 * <oge-button text="Edit" (clicked)="modal.open()" />
 * <oge-modal #modal title="Edit row" [(opened)]="visible" [closeGuard]="confirmDiscard">
 *   <form>…</form>
 *   <div *ogeModalFooter="let close">
 *     <oge-button text="Save" (clicked)="close(form.value)" />
 *   </div>
 * </oge-modal>
 * ```
 *
 * User gestures (Escape, backdrop, ✕) and `close()` run the full pipeline —
 * cancelable `closing` event, then the async `closeGuard` — while a direct
 * `opened.set(false)` model write closes immediately (the app already
 * decided). The modal renders inline where declared: keep it away from
 * `transform`ed ancestors, which break `position: fixed`.
 */
@Component({
  selector: 'oge-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './modal.scss',
  template: `
    @if (opened()) {
      <!-- backdrop layer: handlers only delegate — the panel owns focus -->
      <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
      <div
        #layer
        class="oge-modal-layer"
        [class.oge-modal-layer-ready]="ready()"
        [class.oge-modal-layer-top]="placement() === 'top' && !fullScreen()"
        [class.oge-modal-layer-unshaded]="!shading()"
        [class.oge-modal-layer-fullscreen]="fullScreen()"
        (pointerdown)="onLayerPointerDown($event)"
        (click)="onLayerClick($event)"
        (keydown)="onLayerKeydown($event)"
      >
        <div
          #panel
          class="oge-modal"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          [class.oge-modal-fullscreen]="fullScreen()"
          [attr.aria-labelledby]="labelledBy()"
          [attr.aria-label]="ariaLabelAttr()"
          [attr.aria-busy]="busy() || null"
          [style.width]="cssWidth()"
          [style.height]="cssHeight()"
          [style.min-width]="cssMinWidth()"
          [style.min-height]="cssMinHeight()"
          [style.max-width]="cssMaxWidth()"
          [style.max-height]="cssMaxHeight()"
          [style.transform]="dragTransform()"
        >
          @if (hasHeader()) {
            <!-- drag surface only; buttons inside keep their own semantics -->
            <div
              class="oge-modal-header"
              [class.oge-modal-header-draggable]="
                dragEnabled() && !fullScreen()
              "
              (pointerdown)="onHeaderPointerDown($event)"
            >
              <h2 class="oge-modal-title" [id]="titleId">
                @if (titleTemplate(); as t) {
                  <ng-container
                    [ngTemplateOutlet]="t.templateRef"
                    [ngTemplateOutletContext]="slotContext"
                  />
                } @else {
                  {{ title() }}
                }
              </h2>
              @if (headerActionsTemplate(); as actions) {
                <div class="oge-modal-header-actions">
                  <ng-container
                    [ngTemplateOutlet]="actions.templateRef"
                    [ngTemplateOutletContext]="slotContext"
                  />
                </div>
              }
              @if (showMaximizeButton()) {
                <button
                  type="button"
                  class="oge-modal-maximize"
                  [attr.aria-label]="
                    fullScreen()
                      ? mergedMessages().modalRestore
                      : mergedMessages().modalMaximize
                  "
                  (click)="toggleFullScreen()"
                >
                  @if (fullScreen()) {
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                    >
                      <path
                        d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4"
                        stroke="currentColor"
                        stroke-width="1.4"
                        stroke-linecap="round"
                        fill="none"
                      />
                    </svg>
                  } @else {
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                    >
                      <path
                        d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
                        stroke="currentColor"
                        stroke-width="1.4"
                        stroke-linecap="round"
                        fill="none"
                      />
                    </svg>
                  }
                </button>
              }
              @if (showCloseButton()) {
                <button
                  type="button"
                  class="oge-modal-close"
                  [disabled]="busy() || closePending()"
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
          }
          <div class="oge-modal-body" [class.oge-modal-body-flush]="!padding()">
            <ng-content />
          </div>
          @if (footerTemplate(); as f) {
            <div class="oge-modal-footer">
              <ng-container
                [ngTemplateOutlet]="f.templateRef"
                [ngTemplateOutletContext]="slotContext"
              />
            </div>
          }
          @if (busy()) {
            <div class="oge-modal-busy-veil" aria-hidden="true">
              <span class="oge-modal-spinner"></span>
            </div>
          }
          @if (resizeEnabled() && !fullScreen()) {
            <!-- pointer-only affordance, like every reference library -->
            <div
              class="oge-modal-resize-handle"
              aria-hidden="true"
              (pointerdown)="onResizeHandlePointerDown($event)"
            ></div>
          }
        </div>
      </div>
    }
  `,
})
export class OgeModal<R = unknown> {
  private readonly config = inject(OGE_OVERLAY_CONFIG);
  private readonly injector = inject(Injector);

  /** Id of the title element — wired to `aria-labelledby`. */
  protected readonly titleId = `oge-modal-title-${nextModalId++}`;

  /** Two-way open state. Setting it `false` directly closes without the guard pipeline. */
  readonly opened = model(false);

  /** Two-way full-screen state; size inputs are ignored while `true`. */
  readonly fullScreen = model(false);

  /** Header text; also the aria-label fallback when the header is hidden. */
  readonly title = input<string>();
  /** Accessible name override for headerless modals. */
  readonly ariaLabel = input<string>();
  /** Panel width — number = px, string passed through. Default `min(560px, 100%)`. */
  readonly width = input<number | string>();
  /** Fixed panel height — number = px, string passed through. Default: content. */
  readonly height = input<number | string>();
  /** Max panel height — number = px, string passed through. Default: layer height. */
  readonly maxHeight = input<number | string>();
  /** Min panel width — number = px, string passed through. */
  readonly minWidth = input<number | string>();
  /** Min panel height — number = px, string passed through. */
  readonly minHeight = input<number | string>();
  /** Max panel width — number = px, string passed through. Default: layer width. */
  readonly maxWidth = input<number | string>();
  /** Where the panel sits: viewport center or pinned near the top. Default `'center'`. */
  readonly placement = input<OgeModalPlacement>('center');
  /** Dims the page behind the modal. `false` keeps the backdrop transparent (still modal). Default `true`. */
  readonly shading = input(true);
  /** Shows the header ✕ button. Default `true`. */
  readonly showCloseButton = input(true);
  /** Shows a maximize/restore toggle in the header, driving `fullScreen`. Default `false`. */
  readonly showMaximizeButton = input(false);
  /** Lets the user drag the panel by its header. Default `false`. */
  readonly dragEnabled = input(false);
  /** Allows dragging the panel beyond the viewport edges. Default `false`. */
  readonly dragOutsideBoundary = input(false);
  /** Resets drag offset and resized size on every reopen. Default `true`. */
  readonly restorePosition = input(true);
  /** Shows a bottom-end resize handle. Default `false`. */
  readonly resizeEnabled = input(false);
  /** Marks everything outside the modal `inert` while open (opt-in — content appended to `body` after opening is not covered). Default `false`. */
  readonly inertBackground = input(false);
  /** Escape closes the modal when it is the topmost overlay. Default `true`. */
  readonly closeOnEscape = input(true);
  /** A click that starts and ends on the backdrop closes the modal. Default `true`. */
  readonly closeOnBackdropClick = input(true);
  /** Locks body scroll while open (scrollbar-width compensated). Default `true`. */
  readonly scrollLock = input(true);
  /** Initial focus target. Default `'first-tabbable'`. */
  readonly autoFocus = input<OgeModalAutoFocus>('first-tabbable');
  /** Restores focus to the opener on close (only when focus would be lost). Default `true`. */
  readonly restoreFocus = input(true);
  /** Default body padding; `false` for flush content (grids, custom layouts). */
  readonly padding = input(true);
  /** Busy state: spinner veil, `aria-busy`, user-initiated closes blocked. */
  readonly busy = input(false);
  /** Veto hook run before every close in the pipeline; may be async (single-flight). */
  readonly closeGuard = input<(() => boolean | Promise<boolean>) | undefined>();
  /** Per-instance message overrides (merged over the overlay config). */
  readonly messages = input<Partial<OgeOverlayMessages>>();

  /** Cancelable: fires before the modal opens (any open path). */
  readonly opening = output<OgeModalOpeningEvent>();
  /** Cancelable: fires before any pipeline close (escape/backdrop/✕/`close()`). */
  readonly closing = output<OgeModalClosingEvent>();
  /** Fires after the modal closed, with reason and optional result. */
  readonly closed = output<OgeModalClosedEvent<R>>();
  /** Fires when a resize gesture starts, with the starting size. */
  readonly resizeStarted = output<OgeModalResizeEvent>();
  /** Fires when a resize gesture ends, with the final size. */
  readonly resized = output<OgeModalResizeEvent>();

  private readonly _closePending = signal(false);
  /** `true` while an async `closeGuard` is pending — disable footer actions with it. */
  readonly closePending: Signal<boolean> = this._closePending.asReadonly();

  /** Entrance-transition state; set one frame after the layer mounts. */
  protected readonly ready = signal(false);

  protected readonly titleTemplate = contentChild(OgeModalTitle);
  protected readonly headerActionsTemplate = contentChild(
    OgeModalHeaderActions,
  );
  protected readonly footerTemplate = contentChild(OgeModalFooter);
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly layerRef = viewChild<ElementRef<HTMLElement>>('layer');

  /** Stable slot context — one allocation for the component's lifetime. */
  protected readonly slotContext: OgeModalSlotContext = {
    $implicit: (result?: unknown) => this.close(result as R),
  };

  protected readonly hasHeader = computed(
    () =>
      this.title() !== undefined ||
      this.titleTemplate() !== undefined ||
      this.headerActionsTemplate() !== undefined ||
      this.showCloseButton(),
  );
  protected readonly labelledBy = computed(() =>
    this.title() !== undefined || this.titleTemplate() !== undefined
      ? this.titleId
      : null,
  );
  protected readonly ariaLabelAttr = computed(() =>
    this.labelledBy() ? null : (this.ariaLabel() ?? this.title() ?? null),
  );
  protected readonly mergedMessages = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));
  /** Drag offset applied to the panel; `null` while undragged. */
  private readonly dragOffset = signal<{ x: number; y: number } | null>(null);
  /** Explicit size set by a resize gesture; wins over the size inputs. */
  private readonly resizeSize = signal<{
    width: number;
    height: number;
  } | null>(null);

  protected readonly dragTransform = computed(() => {
    const offset = this.dragOffset();
    return offset && !this.fullScreen()
      ? `translate(${offset.x}px, ${offset.y}px)`
      : null;
  });

  // Size inputs bind `null` while full-screen so the CSS class wins.
  protected readonly cssWidth = computed(() => {
    if (this.fullScreen()) return null;
    const resized = this.resizeSize();
    return resized ? `${resized.width}px` : toCssSize(this.width());
  });
  protected readonly cssHeight = computed(() => {
    if (this.fullScreen()) return null;
    const resized = this.resizeSize();
    return resized ? `${resized.height}px` : toCssSize(this.height());
  });
  protected readonly cssMinWidth = computed(() =>
    this.fullScreen() ? null : toCssSize(this.minWidth()),
  );
  protected readonly cssMinHeight = computed(() =>
    this.fullScreen() ? null : toCssSize(this.minHeight()),
  );
  protected readonly cssMaxWidth = computed(() =>
    this.fullScreen() ? null : toCssSize(this.maxWidth()),
  );
  protected readonly cssMaxHeight = computed(() =>
    this.fullScreen() ? null : toCssSize(this.maxHeight()),
  );

  /** Mirrors the DOM-side open state (listeners, stack, lock). */
  private shown = false;
  private holdingScrollLock = false;
  private previouslyFocused: HTMLElement | null = null;
  private backdropPress = false;
  /** Removes the document listeners of an in-flight drag/resize gesture. */
  private activeGestureCleanup: (() => void) | null = null;
  private inertedElements: Element[] = [];

  constructor() {
    // `opened` model ↔ DOM-side state, loop-guarded by comparing states first.
    effect(() => {
      const shouldOpen = this.opened();
      untracked(() => {
        if (shouldOpen && !this.shown) this.doOpen();
        else if (!shouldOpen && this.shown) this.finalizeClose('api');
      });
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.shown) this.teardown();
    });
  }

  /** Opens the modal. */
  open(): void {
    this.opened.set(true);
  }

  /** Closes through the full pipeline (`closing` → `closeGuard`); reason `'api'`. */
  close(result?: R): void {
    this.requestClose('api', result);
  }

  /** Toggles between open and closed. */
  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  /** Re-applies the initial-focus resolution. No-op while closed. */
  focus(): void {
    if (this.shown) this.applyInitialFocus();
  }

  /** Switches between windowed and full-screen (the maximize button's action). */
  toggleFullScreen(): void {
    this.fullScreen.set(!this.fullScreen());
  }

  private doOpen(): void {
    if (typeof window === 'undefined') return; // SSR: nothing to show
    const openingEvent: OgeModalOpeningEvent = { cancel: false };
    this.opening.emit(openingEvent);
    if (openingEvent.cancel) {
      if (this.opened()) this.opened.set(false);
      return;
    }
    this.shown = true;
    if (this.restorePosition()) {
      this.dragOffset.set(null);
      this.resizeSize.set(null);
    }
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    pushOverlay(this);
    if (this.scrollLock()) {
      lockBodyScroll();
      this.holdingScrollLock = true;
    }
    document.addEventListener('keydown', this.onDocumentKeydown);
    afterNextRender(
      () => {
        // One frame after mount: play the entrance transition and move focus.
        this.ready.set(true);
        this.applyInitialFocus();
        if (this.inertBackground()) this.applyInertBackground();
      },
      { injector: this.injector },
    );
  }

  /** Runs the close pipeline for user gestures and `close()`. */
  protected requestClose(reason: OgeModalCloseReason, result?: R): void {
    if (!this.shown || this._closePending()) return;
    if (this.busy() && reason !== 'api') return;
    const closingEvent: OgeModalClosingEvent = { reason, cancel: false };
    this.closing.emit(closingEvent);
    if (closingEvent.cancel) return;
    const guard = this.closeGuard();
    if (!guard) {
      this.finalizeClose(reason, result);
      return;
    }
    let verdict: boolean | Promise<boolean>;
    try {
      verdict = guard();
    } catch {
      this.warnGuardFailure();
      return;
    }
    if (typeof verdict === 'boolean') {
      if (verdict) this.finalizeClose(reason, result);
      return;
    }
    this._closePending.set(true);
    verdict.then(
      (allowed) => {
        this._closePending.set(false);
        if (allowed && this.shown) this.finalizeClose(reason, result);
      },
      () => {
        this._closePending.set(false);
        this.warnGuardFailure();
      },
    );
  }

  private finalizeClose(reason: OgeModalCloseReason, result?: R): void {
    if (!this.shown) return;
    const panelEl = this.panelRef()?.nativeElement ?? null;
    this.teardown();
    if (this.restoreFocus() && this.previouslyFocused) {
      // Only restore when focus would otherwise be lost — never steal the
      // user's new focus target.
      const active = document.activeElement;
      const orphaned =
        !active ||
        active === document.body ||
        (panelEl?.contains(active) ?? false);
      if (orphaned) this.previouslyFocused.focus();
    }
    this.previouslyFocused = null;
    if (this.opened()) this.opened.set(false);
    this.closed.emit({ reason, result });
  }

  /** Releases stack/lock/listeners; shared by close and destroy. */
  private teardown(): void {
    this.shown = false;
    this.ready.set(false);
    this.backdropPress = false;
    this.activeGestureCleanup?.();
    this.activeGestureCleanup = null;
    for (const el of this.inertedElements) el.removeAttribute('inert');
    this.inertedElements = [];
    removeOverlay(this);
    if (this.holdingScrollLock) {
      unlockBodyScroll();
      this.holdingScrollLock = false;
    }
    document.removeEventListener('keydown', this.onDocumentKeydown);
  }

  /**
   * Marks siblings of every ancestor of the layer `inert`, so assistive tech
   * and Tab can never reach the page behind the modal. Elements already inert
   * are skipped, keeping stacked modals' bookkeeping independent.
   */
  private applyInertBackground(): void {
    let node: HTMLElement | null = this.layerRef()?.nativeElement ?? null;
    while (node?.parentElement && node !== document.body) {
      for (const sibling of Array.from(node.parentElement.children)) {
        if (sibling !== node && !sibling.hasAttribute('inert')) {
          sibling.setAttribute('inert', '');
          this.inertedElements.push(sibling);
        }
      }
      node = node.parentElement;
    }
  }

  private applyInitialFocus(): void {
    const panelEl = this.panelRef()?.nativeElement;
    if (!panelEl) return;
    const mode = this.autoFocus();
    let target: HTMLElement | null = panelEl.querySelector('[autofocus]');
    if (!target && mode !== 'first-tabbable' && mode !== 'panel') {
      target = panelEl.querySelector(mode);
    }
    if (!target && mode !== 'panel') {
      target = getTabbableElements(panelEl)[0] ?? null;
    }
    (target ?? panelEl).focus({ preventScroll: true });
  }

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    if (!isTopOverlay(this)) return;
    if (!this.closeOnEscape()) return;
    event.stopPropagation();
    this.requestClose('escape');
  };

  protected onLayerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const panelEl = this.panelRef()?.nativeElement;
    if (panelEl) trapTabKey(event, panelEl, panelEl);
  }

  protected onLayerPointerDown(event: PointerEvent): void {
    this.backdropPress = event.target === this.layerRef()?.nativeElement;
  }

  /** Starts a header drag; buttons inside the header keep their clicks. */
  protected onHeaderPointerDown(event: PointerEvent): void {
    if (!this.dragEnabled() || this.fullScreen()) return;
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button')) return;
    const panelEl = this.panelRef()?.nativeElement;
    if (!panelEl) return;
    event.preventDefault(); // no text selection mid-drag
    const start = this.dragOffset() ?? { x: 0, y: 0 };
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = panelEl.getBoundingClientRect();
    // Base position without the current offset — clamp against it so the
    // panel can always be dragged back.
    const baseLeft = rect.left - start.x;
    const baseTop = rect.top - start.y;
    const onMove = (e: PointerEvent): void => {
      let dx = start.x + (e.clientX - startX);
      let dy = start.y + (e.clientY - startY);
      if (!this.dragOutsideBoundary()) {
        const minX = -baseLeft;
        const minY = -baseTop;
        const maxX = Math.max(minX, window.innerWidth - rect.width - baseLeft);
        const maxY = Math.max(minY, window.innerHeight - rect.height - baseTop);
        dx = Math.min(Math.max(dx, minX), maxX);
        dy = Math.min(Math.max(dy, minY), maxY);
      }
      this.dragOffset.set({ x: dx, y: dy });
    };
    this.trackGesture(onMove);
  }

  /** Starts a bottom-end resize gesture. */
  protected onResizeHandlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const panelEl = this.panelRef()?.nativeElement;
    if (!panelEl) return;
    event.preventDefault();
    const startWidth = panelEl.offsetWidth;
    const startHeight = panelEl.offsetHeight;
    const startX = event.clientX;
    const startY = event.clientY;
    this.resizeStarted.emit({ width: startWidth, height: startHeight, event });
    const onMove = (e: PointerEvent): void => {
      this.resizeSize.set({
        width: Math.min(
          Math.max(160, startWidth + (e.clientX - startX)),
          window.innerWidth,
        ),
        height: Math.min(
          Math.max(120, startHeight + (e.clientY - startY)),
          window.innerHeight,
        ),
      });
    };
    this.trackGesture(onMove, (e) => {
      const size = this.resizeSize();
      this.resized.emit({
        width: size?.width ?? startWidth,
        height: size?.height ?? startHeight,
        event: e,
      });
    });
  }

  /** Document-level move/up tracking with teardown-safe cleanup. */
  private trackGesture(
    onMove: (e: PointerEvent) => void,
    onEnd?: (e: PointerEvent) => void,
  ): void {
    this.activeGestureCleanup?.();
    const onUp = (e: PointerEvent): void => {
      cleanup();
      onEnd?.(e);
    };
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    this.activeGestureCleanup = cleanup;
  }

  protected onLayerClick(event: MouseEvent): void {
    const onLayer = event.target === this.layerRef()?.nativeElement;
    // Both press and release must land on the backdrop itself — a
    // text-selection drag ending outside the panel must not close the modal.
    if (onLayer && this.backdropPress && this.closeOnBackdropClick()) {
      this.requestClose('backdrop');
    }
    this.backdropPress = false;
  }

  private warnGuardFailure(): void {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.warn(
        '[oge-overlay] modal closeGuard threw or rejected — treating it as a veto.',
      );
    }
  }
}

function toCssSize(value: number | string | undefined): string | null {
  if (value === undefined) return null;
  return typeof value === 'number' ? `${value}px` : value;
}
