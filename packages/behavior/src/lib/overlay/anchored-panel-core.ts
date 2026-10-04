import { ogeIsRtl } from '../a11y/direction';
import { isTopOverlay, pushOverlay, removeOverlay } from './overlay-stack';
import {
  ogeVisibleViewport,
  popupAvailableHeight,
  resolvePopupPosition,
  type OgePopupPlacement,
  type OgeRect,
  type OgeResolvedPopupPosition,
} from './position';

/**
 * Why an anchored panel closed. `'back'` is a nested submenu closing toward
 * its parent level; it deliberately does not trigger `restoreFocus` — the
 * parent menu refocuses itself.
 */
export type OgePopupCloseReason =
  'api' | 'outside' | 'escape' | 'select' | 'tab' | 'back';

export interface OgeAnchoredPanelCoreOptions {
  /** Anchor element getter (`null` while not rendered). */
  anchor: () => HTMLElement | null;
  /** Panel element getter (`null` while closed / not yet rendered). */
  panel: () => HTMLElement | null;
  /** Reactive getters — read live host state inside so updates see changes. */
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
   * Consulted before the machine closes **itself** (outside pointer-down,
   * Escape); return `false` to keep the panel open. Owner-initiated `close()`
   * calls are not routed through it — the owner runs its own veto first
   * (the dropdown editors' cancelable `closing` event).
   */
  beforeClose?: (reason: OgePopupCloseReason) => boolean;
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

  /**
   * State sinks — how the host's reactivity learns about the machine. The
   * Angular wrapper mirrors these into `signal()`s, the React hook into
   * `useState`/`useSyncExternalStore`. Synchronous getters (`isOpen()`,
   * `position()`) work regardless.
   */
  onOpenChange?: (open: boolean) => void;
  onPositionChange?: (position: OgeResolvedPopupPosition | null) => void;

  /**
   * Identity pushed onto the shared overlay Escape stack. Defaults to the
   * machine itself; a wrapper (the Angular `OgeAnchoredPanel`) passes its own
   * instance so `isTopOverlay(wrapper)` keeps working for consumers that
   * stack-test against the object they hold.
   */
  stackToken?: object;
}

let nextPanelId = 0;

/**
 * Custom property the machine writes on the panel: the height left on the
 * resolved side of the anchor inside the visible viewport (`.oge-popup` caps
 * its `max-height` with it).
 */
export const OGE_POPUP_AVAILABLE_HEIGHT_VAR = '--oge-popup-available-height';
const AVAILABLE_HEIGHT_VAR = OGE_POPUP_AVAILABLE_HEIGHT_VAR;

/** Frames to wait for the owner to render the panel element after `open()`. */
const MAX_MEASURE_RETRIES = 60;

/**
 * Anchored-panel behavior as a framework-free machine (ADR 0001 Faz 3):
 * open/close state, viewport-aware positioning (flip + clamp, RTL-aware),
 * outside-click and Escape closing (via the shared overlay Escape stack),
 * scroll/resize repositioning, content-resize observation and focus restore.
 *
 * The render layers own the DOM: they render the panel element while open
 * and call `destroy()` from their teardown hook. `@oge-ui/overlay`'s
 * `OgeAnchoredPanel` wraps this with Angular signals; the React overlay's
 * `useAnchoredPanel` wraps it with React state — both run this exact code,
 * which is what keeps popup behavior identical across the suite's render
 * layers.
 */
export class OgeAnchoredPanelCore {
  /** Unique id applied to the panel element — wire to `aria-controls`. */
  readonly panelId = `oge-popup-${nextPanelId++}`;

  private open_ = false;
  private position_: OgeResolvedPopupPosition | null = null;

  private rafId: number | null = null;
  private framePending = false;
  private measureRetries = 0;
  private listenersActive = false;
  private resizeObserver: ResizeObserver | null = null;
  private observedPanel: HTMLElement | null = null;

  /** The identity on the shared Escape stack — see `stackToken`. */
  private readonly stackHandle: object;

  constructor(private readonly options: OgeAnchoredPanelCoreOptions) {
    this.stackHandle = options.stackToken ?? this;
  }

  /** Current open state (synchronous; also pushed to `onOpenChange`). */
  isOpen(): boolean {
    return this.open_;
  }

  /** `null` until the first measure after open; hide the panel while `null`. */
  position(): OgeResolvedPopupPosition | null {
    return this.position_;
  }

  open(): void {
    if (typeof window === 'undefined') return; // SSR: nothing to anchor to
    if (this.open_) return;
    this.setOpen(true);
    this.setPosition(null);
    this.measureRetries = 0;
    if (!this.options.transient) pushOverlay(this.stackHandle);
    this.addListeners();
    this.updatePosition();
  }

  close(reason: OgePopupCloseReason = 'api'): void {
    if (!this.open_) return;
    const panelEl = this.options.panel();
    const anchorEl = this.options.anchor();
    removeOverlay(this.stackHandle);
    this.removeListeners();
    this.cancelFrame();
    this.disconnectResizeObserver();
    this.setOpen(false);
    this.setPosition(null);
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
    if (this.open_) this.close();
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
    removeOverlay(this.stackHandle);
    this.removeListeners();
    this.cancelFrame();
    this.disconnectResizeObserver();
    this.setOpen(false);
    this.setPosition(null);
  }

  private setOpen(open: boolean): void {
    if (this.open_ === open) return;
    this.open_ = open;
    this.options.onOpenChange?.(open);
  }

  private setPosition(position: OgeResolvedPopupPosition | null): void {
    if (this.position_ === position) return;
    this.position_ = position;
    this.options.onPositionChange?.(position);
  }

  private disconnectResizeObserver(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedPanel = null;
  }

  private measure(): void {
    if (!this.open_) return;
    const anchorEl = this.options.anchor();
    const panelEl = this.options.panel();
    if (!anchorEl || !panelEl) {
      // The panel renders on the owner's next render pass — retry briefly.
      if (++this.measureRetries <= MAX_MEASURE_RETRIES) {
        this.updatePosition();
      } else {
        // An integration bug in any environment: open, but nothing rendered.
        console.warn(
          '[oge-overlay] anchored panel is open but its anchor/panel element never appeared — render the popup while the panel is open.',
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
    // Position against the *visible* viewport: with the on-screen keyboard up
    // or a pinch zoom, the layout viewport (`innerHeight`, what `fixed`
    // resolves against) is larger than what the user sees. Anchor and result
    // are translated in and out of visual-viewport coordinates.
    const visible = ogeVisibleViewport();
    const offset = this.options.offset?.();
    const viewportPadding = this.options.viewportPadding?.();
    const anchor: OgeRect = {
      top: anchorRect.top - visible.top,
      left: anchorRect.left - visible.left,
      width: anchorRect.width,
      height: anchorRect.height,
    };
    const viewport = { width: visible.width, height: visible.height };
    const resolved = resolvePopupPosition({
      anchor,
      panel: { width: panelEl.offsetWidth, height: panelEl.offsetHeight },
      viewport,
      placement: this.options.placement?.() ?? 'bottom-start',
      offset,
      viewportPadding,
      rtl: ogeIsRtl(anchorEl),
    });
    // The room left on the chosen side, as a custom property the popup
    // surface caps itself with — a list shrinks above the keyboard instead
    // of running underneath it.
    const available = `${Math.floor(
      popupAvailableHeight({
        anchor,
        viewport,
        placement: resolved.placement,
        offset,
        viewportPadding,
      }),
    )}px`;
    if (panelEl.style.getPropertyValue(AVAILABLE_HEIGHT_VAR) !== available) {
      panelEl.style.setProperty('--oge-popup-available-height', available);
    }
    const position: OgeResolvedPopupPosition = {
      ...resolved,
      top: resolved.top + visible.top,
      left: resolved.left + visible.left,
    };
    this.setPosition(
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
    if (!inside(anchorEl) && !inside(panelEl)) this.selfClose('outside');
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    // With stacked overlays (popup inside popup/modal) only the topmost closes.
    if (!isTopOverlay(this.stackHandle)) return;
    event.stopPropagation();
    this.selfClose('escape');
  };

  /** A close the machine initiates — the owner's `beforeClose` may veto it. */
  private selfClose(reason: OgePopupCloseReason): void {
    if (this.options.beforeClose?.(reason) === false) return;
    this.close(reason);
  }

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
    // The on-screen keyboard and pinch zoom resize / pan only the visual
    // viewport — no window `resize` fires on iOS for either.
    const visual = window.visualViewport;
    visual?.addEventListener('resize', this.onReposition, { passive: true });
    visual?.addEventListener('scroll', this.onReposition, { passive: true });
  }

  private removeListeners(): void {
    if (!this.listenersActive) return;
    this.listenersActive = false;
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    document.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('scroll', this.onReposition, true);
    window.removeEventListener('resize', this.onReposition);
    const visual = window.visualViewport;
    visual?.removeEventListener('resize', this.onReposition);
    visual?.removeEventListener('scroll', this.onReposition);
  }
}
