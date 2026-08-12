import { signal, type Signal } from '@angular/core';
import {
  isTopOverlay,
  pushOverlay,
  removeOverlay,
  resolvePopupPosition,
  type OgePopupPlacement,
  type OgeRect,
  type OgeResolvedPopupPosition,
} from '@oge-ui/behavior';

/**
 * Why an anchored panel closed. `'back'` is a nested submenu closing toward
 * its parent level; it deliberately does not trigger `restoreFocus` — the
 * parent menu refocuses itself.
 */
export type OgePopupCloseReason =
  'api' | 'outside' | 'escape' | 'select' | 'tab' | 'back';

export interface OgeAnchoredPanelOptions {
  /** Anchor element getter (`null` while not rendered). */
  anchor: () => HTMLElement | null;
  /** Panel element getter (`null` while closed / not yet rendered). */
  panel: () => HTMLElement | null;
  /** Reactive getters — read signals inside so the next update sees changes. */
  placement?: () => OgePopupPlacement;
  /** Panel width: a fixed pixel value or `'anchor'` to match the anchor. */
  width?: () => number | 'anchor' | undefined;
  offset?: () => number | undefined;
  viewportPadding?: () => number | undefined;
  /** Close on document pointerdown outside anchor+panel. Default `true`. */
  closeOnOutsidePointerDown?: boolean;
  /** Close on Escape (document listener, active only while open). Default `true`. */
  closeOnEscape?: boolean;
  /** Restores focus after closes caused by `escape`/`select`. */
  restoreFocus?: () => void;
  /** Notified after every close with its reason. */
  onClosed?: (reason: OgePopupCloseReason) => void;
  /**
   * Virtual anchor rectangle (viewport-relative) used for positioning when it
   * returns a rect — e.g. the pointer location of a context menu. Falls back
   * to the `anchor` element's rect when `undefined`/`null`. The `anchor`
   * element is still required for outside-click and RTL detection.
   */
  anchorRect?: () => OgeRect | null;
  /**
   * Transient surfaces (tooltips) skip the Escape stack so an open tooltip
   * never swallows the Escape meant for the popup underneath. Default `false`.
   */
  transient?: boolean;
}

declare const ngDevMode: boolean | undefined;

let nextPanelId = 0;

/** Frames to wait for the owner to render the panel element after `open()`. */
const MAX_MEASURE_RETRIES = 60;

/**
 * Anchored-panel behavior as a DI-free model class (slice pattern): open/close
 * state, viewport-aware positioning (flip + clamp, RTL-aware), outside-click
 * and Escape closing, scroll/resize repositioning and focus restore. The
 * owning component renders the panel DOM inline (typically inside an
 * `<oge-popup>`) and calls `destroy()` from its `DestroyRef.onDestroy`.
 *
 * ```ts
 * readonly panel = new OgeAnchoredPanel({
 *   anchor: () => this.trigger()?.nativeElement ?? null,
 *   panel: () => this.panelRef()?.nativeElement ?? null,
 *   restoreFocus: () => this.trigger()?.nativeElement.focus(),
 * });
 * ```
 */
export class OgeAnchoredPanel {
  /** Unique id applied to the panel element — wire to `aria-controls`. */
  readonly panelId = `oge-popup-${nextPanelId++}`;

  private readonly _isOpen = signal(false);
  readonly isOpen: Signal<boolean> = this._isOpen.asReadonly();

  /** `null` until the first measure after open; hide the panel while `null`. */
  private readonly _position = signal<OgeResolvedPopupPosition | null>(null);
  readonly position: Signal<OgeResolvedPopupPosition | null> =
    this._position.asReadonly();

  private rafId: number | null = null;
  private framePending = false;
  private measureRetries = 0;
  private listenersActive = false;
  private resizeObserver: ResizeObserver | null = null;
  private observedPanel: HTMLElement | null = null;

  constructor(private readonly options: OgeAnchoredPanelOptions) {}

  open(): void {
    if (typeof window === 'undefined') return; // SSR: nothing to anchor to
    if (this._isOpen()) return;
    this._isOpen.set(true);
    this._position.set(null);
    this.measureRetries = 0;
    if (!this.options.transient) pushOverlay(this);
    this.addListeners();
    this.updatePosition();
  }

  close(reason: OgePopupCloseReason = 'api'): void {
    if (!this._isOpen()) return;
    const panelEl = this.options.panel();
    const anchorEl = this.options.anchor();
    removeOverlay(this);
    this.removeListeners();
    this.cancelFrame();
    this.disconnectResizeObserver();
    this._isOpen.set(false);
    this._position.set(null);
    if (
      (reason === 'escape' || reason === 'select') &&
      this.options.restoreFocus
    ) {
      // Only restore when focus would otherwise be lost — never steal the
      // user's new focus target after an outside click or Tab.
      const active = document.activeElement;
      const orphaned =
        !active ||
        active === document.body ||
        (panelEl?.contains(active) ?? false) ||
        (anchorEl?.contains(active) ?? false);
      if (orphaned) this.options.restoreFocus();
    }
    this.options.onClosed?.(reason);
  }

  toggle(): void {
    if (this._isOpen()) this.close();
    else this.open();
  }

  /** Re-measures anchor/panel and recomputes the position (rAF-coalesced). */
  updatePosition(): void {
    // A separate flag (not rafId) so synchronously-invoked frames — as in
    // tests stubbing requestAnimationFrame — never wedge the scheduler.
    if (this.framePending) return;
    this.framePending = true;
    this.rafId = requestAnimationFrame(() => {
      this.framePending = false;
      this.measure();
    });
  }

  /** Removes every listener and pending frame; call on owner destroy. */
  destroy(): void {
    removeOverlay(this);
    this.removeListeners();
    this.cancelFrame();
    this.disconnectResizeObserver();
    this._isOpen.set(false);
    this._position.set(null);
  }

  private disconnectResizeObserver(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedPanel = null;
  }

  private measure(): void {
    if (!this._isOpen()) return;
    const anchorEl = this.options.anchor();
    const panelEl = this.options.panel();
    if (!anchorEl || !panelEl) {
      // The panel renders on the owner's next change detection — retry briefly.
      if (++this.measureRetries <= MAX_MEASURE_RETRIES) {
        this.updatePosition();
      } else if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.warn(
          '[oge-overlay] anchored panel is open but its anchor/panel element never appeared — render the popup behind `@if (panel.isOpen())`.',
        );
      }
      return;
    }
    this.measureRetries = 0;
    // Reposition when the panel content changes size (async menu items etc.).
    if (
      this.observedPanel !== panelEl &&
      typeof ResizeObserver !== 'undefined'
    ) {
      this.resizeObserver?.disconnect();
      this.resizeObserver = new ResizeObserver(() => this.updatePosition());
      this.resizeObserver.observe(panelEl);
      this.observedPanel = panelEl;
    }
    const width = this.options.width?.();
    const anchorRect: OgeRect =
      this.options.anchorRect?.() ?? anchorEl.getBoundingClientRect();
    // Apply the width before measuring so flip math sees the true panel size;
    // write only on change to avoid layout thrash in the scroll hot path.
    const resolvedWidth =
      width === 'anchor'
        ? anchorRect.width
        : typeof width === 'number'
          ? width
          : undefined;
    if (resolvedWidth !== undefined) {
      const px = `${resolvedWidth}px`;
      if (panelEl.style.width !== px) panelEl.style.width = px;
    } else if (panelEl.style.width) {
      panelEl.style.width = '';
    }
    const position = resolvePopupPosition({
      anchor: {
        top: anchorRect.top,
        left: anchorRect.left,
        width: anchorRect.width,
        height: anchorRect.height,
      },
      panel: { width: panelEl.offsetWidth, height: panelEl.offsetHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      placement: this.options.placement?.() ?? 'bottom-start',
      offset: this.options.offset?.(),
      viewportPadding: this.options.viewportPadding?.(),
      rtl: getComputedStyle(anchorEl).direction === 'rtl',
    });
    this._position.set(
      resolvedWidth !== undefined
        ? { ...position, width: resolvedWidth }
        : position,
    );
  }

  private cancelFrame(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.framePending = false;
  }

  private readonly onPointerDown = (event: Event): void => {
    const anchorEl = this.options.anchor();
    const panelEl = this.options.panel();
    const path =
      typeof (event as { composedPath?: unknown }).composedPath === 'function'
        ? event.composedPath()
        : null;
    const inside = (el: HTMLElement | null): boolean =>
      !!el && (path ? path.includes(el) : el.contains(event.target as Node));
    if (!inside(anchorEl) && !inside(panelEl)) this.close('outside');
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    // With stacked overlays (popup inside popup/modal) only the topmost closes.
    if (!isTopOverlay(this)) return;
    event.stopPropagation();
    this.close('escape');
  };

  private readonly onReposition = (): void => this.updatePosition();

  private addListeners(): void {
    if (this.listenersActive) return;
    this.listenersActive = true;
    if (this.options.closeOnOutsidePointerDown !== false) {
      document.addEventListener('pointerdown', this.onPointerDown, true);
    }
    if (this.options.closeOnEscape !== false) {
      document.addEventListener('keydown', this.onKeyDown);
    }
    window.addEventListener('scroll', this.onReposition, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', this.onReposition, { passive: true });
  }

  private removeListeners(): void {
    if (!this.listenersActive) return;
    this.listenersActive = false;
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    document.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('scroll', this.onReposition, true);
    window.removeEventListener('resize', this.onReposition);
  }
}
