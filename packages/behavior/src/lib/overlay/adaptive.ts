/**
 * Adaptive (mobile) presentation of popup-based editors, shared by both render
 * layers (ADR 0001). On a narrow viewport an anchored drop-down is a poor fit
 * — it is clipped by the on-screen keyboard, its rows are mouse-sized and a
 * tap outside it is easy to miss — so `adaptiveMode: 'auto'` re-presents the
 * same content as a full-width bottom sheet (lists) or a full-screen dialog
 * (calendars), with a title, a close button and modal semantics.
 *
 * This module is the framework-free half: the vocabulary, the viewport query
 * and `OgeAdaptiveSheetCore`, which owns everything modal about the sheet —
 * scroll lock, inert background, the Tab trap, initial focus, focus restore,
 * visual-viewport tracking (the keyboard) and the swipe-down dismiss. The
 * render layers own the markup (`oge-popup` / `<OgePopup>` with
 * `adaptive`), and the anchored panel keeps owning open/close and Escape.
 */

import { prefersReducedMotion } from '../a11y/motion';
import { inertModalBackground, isModalFocusOrphaned } from './modal-core';
import { getTabbableElements, trapTabKey } from './focus-trap';
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock';
import { ogeVisibleViewport } from './position';

/**
 * Whether a popup-based editor switches to its adaptive presentation on
 * narrow viewports. `'none'` (the default) always renders the anchored
 * drop-down; `'auto'` renders a bottom sheet / full-screen dialog below
 * `adaptiveBreakpoint`.
 */
export type OgeAdaptiveMode = 'auto' | 'none';

/**
 * How a popup is presented right now: anchored (`'popup'`), as a full-width
 * bottom sheet (`'sheet'`, lists and pickers) or as a full-screen dialog
 * (`'fullscreen'`, calendars and date ranges).
 */
export type OgeAdaptivePresentation = 'popup' | 'sheet' | 'fullscreen';

/** Viewport width (px) below which `adaptiveMode: 'auto'` goes adaptive. */
export const OGE_DEFAULT_ADAPTIVE_BREAKPOINT = 600;

/**
 * The adaptive defaults every popup-based family's config carries. A
 * per-instance `adaptiveMode` / `adaptiveBreakpoint` overrides them.
 */
export interface OgeAdaptiveConfig {
  /** Default adaptive mode of the family's popup editors. */
  adaptiveMode: OgeAdaptiveMode;
  /** Viewport width in px below which `'auto'` switches presentation. */
  adaptiveBreakpoint: number;
}

export const OGE_DEFAULT_ADAPTIVE_CONFIG: OgeAdaptiveConfig = {
  adaptiveMode: 'none',
  adaptiveBreakpoint: OGE_DEFAULT_ADAPTIVE_BREAKPOINT,
};

/**
 * Media query matching viewports strictly narrower than `breakpoint` —
 * `600` matches 599.98px and below, so a 600px tablet stays anchored.
 */
export function adaptiveMediaQuery(breakpoint: number): string {
  return `(max-width: ${Math.max(0, breakpoint - 0.02)}px)`;
}

/**
 * Whether the viewport is currently narrower than `breakpoint`. `false`
 * without `matchMedia` (SSR, old jsdom) — the server always renders the
 * anchored presentation, which needs no layout knowledge.
 */
export function matchesAdaptiveViewport(breakpoint: number): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return false;
  return window.matchMedia(adaptiveMediaQuery(breakpoint)).matches;
}

/**
 * Subscribes to crossings of `breakpoint`; returns the unsubscribe. A no-op
 * (that still returns a callable) where `matchMedia` is missing.
 */
export function watchAdaptiveViewport(
  breakpoint: number,
  onChange: (narrow: boolean) => void,
): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return () => undefined;
  const query = window.matchMedia(adaptiveMediaQuery(breakpoint));
  const listener = (event: { matches: boolean }): void =>
    onChange(event.matches);
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }
  // Safari < 14
  query.addListener(listener);
  return () => query.removeListener(listener);
}

/**
 * The presentation an editor renders: anchored unless the mode is `'auto'`
 * and the viewport is narrow; then `kind` — the editor's adaptive shape.
 */
export function resolveAdaptivePresentation(
  mode: OgeAdaptiveMode,
  narrow: boolean,
  kind: Exclude<OgeAdaptivePresentation, 'popup'> = 'sheet',
): OgeAdaptivePresentation {
  return mode === 'auto' && narrow ? kind : 'popup';
}

/**
 * Viewport budget of a virtualized list inside an adaptive sheet: the window
 * height (the sheet is at most that tall), `800` without a window.
 */
export function adaptiveListViewportHeight(): number {
  return typeof window === 'undefined' ? 800 : window.innerHeight;
}

/** Attribute an editor puts on the element that takes focus when a sheet opens. */
export const OGE_SHEET_FOCUS_ATTR = 'data-oge-sheet-focus';

/** Downward travel (px) of the sheet handle that dismisses the sheet. */
export const OGE_SHEET_SWIPE_DISMISS = 72;

export interface OgeAdaptiveSheetCoreOptions {
  /** The adaptive layer — the popup element while adaptive. */
  element: () => HTMLElement | null;
  /** Called for every user dismissal: backdrop tap, swipe down. */
  onDismiss: () => void;
  /**
   * Re-focuses the editor after the sheet closes with focus inside it.
   * Omitted, the element focused before `activate()` (the field) is refocused.
   */
  restoreFocus?: () => void;
}

/**
 * The modal half of an adaptive sheet. `activate()` once the sheet element is
 * rendered, `deactivate()` when it is about to go (or already gone); both are
 * idempotent, so a render layer can call them from any effect.
 *
 * - **Scroll lock + inert background** — the shared ref-counted lock and the
 *   modal's inert walk, so a sheet stacked over a modal releases correctly.
 * - **Tab trap** — Tab / Shift+Tab wrap inside the sheet.
 * - **Initial focus** — an element marked `data-oge-sheet-focus` (the search
 *   field, the listbox), else the first tabbable of the sheet body, else the
 *   first tabbable at all. Focus already inside (a calendar that focused its
 *   own cell) is left where it is.
 * - **Focus restore** — when the sheet goes with focus inside it.
 * - **Visual viewport** — `--oge-sheet-viewport-top` / `-height` follow
 *   `visualViewport`, so the sheet rides above the on-screen keyboard
 *   instead of underneath it (iOS never resizes the layout viewport).
 * - **Swipe down** on the `.oge-popup-sheet-handle` dismisses.
 *
 * Escape is not handled here: the anchored panel already closes the topmost
 * surface on the shared overlay stack.
 */
export class OgeAdaptiveSheetCore {
  private active: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private releaseInert: (() => void) | null = null;
  private swipe: {
    id: number;
    startY: number;
    dy: number;
    sheet: HTMLElement | null;
  } | null = null;

  constructor(private readonly options: OgeAdaptiveSheetCoreOptions) {}

  /** Whether the sheet is currently active. */
  isActive(): boolean {
    return this.active !== null;
  }

  /** Applies the modal behavior to the rendered sheet element. */
  activate(): void {
    if (typeof document === 'undefined') return;
    const el = this.options.element();
    if (!el || this.active === el) return;
    if (this.active) this.deactivate();
    this.active = el;
    const focused = document.activeElement;
    this.previousFocus =
      focused instanceof HTMLElement && focused !== document.body
        ? focused
        : null;
    // Focus moves in *before* the background goes inert: inerting the
    // focused field would blur it with no related target, which editors
    // read as the user leaving.
    if (!el.contains(document.activeElement)) {
      this.initialFocusTarget(el)?.focus({ preventScroll: true });
    }
    lockBodyScroll();
    this.releaseInert = inertModalBackground(el);
    el.addEventListener('keydown', this.onKeyDown);
    el.addEventListener('pointerdown', this.onPointerDown);
    this.syncViewport();
    const visual = window.visualViewport;
    visual?.addEventListener('resize', this.syncViewport);
    visual?.addEventListener('scroll', this.syncViewport);
  }

  /** Releases everything `activate()` took; restores focus when orphaned. */
  deactivate(): void {
    const el = this.active;
    if (!el) return;
    this.active = null;
    this.endSwipe();
    el.removeEventListener('keydown', this.onKeyDown);
    el.removeEventListener('pointerdown', this.onPointerDown);
    const visual = typeof window !== 'undefined' ? window.visualViewport : null;
    visual?.removeEventListener('resize', this.syncViewport);
    visual?.removeEventListener('scroll', this.syncViewport);
    this.releaseInert?.();
    this.releaseInert = null;
    unlockBodyScroll();
    // A detached element no longer contains the (now body) active element;
    // isModalFocusOrphaned treats the body as orphaned too.
    const previous = this.previousFocus;
    this.previousFocus = null;
    if (!isModalFocusOrphaned(el)) return;
    if (this.options.restoreFocus) this.options.restoreFocus();
    else if (previous?.isConnected) previous.focus({ preventScroll: true });
  }

  /** Alias of `deactivate()` for owner teardown hooks. */
  destroy(): void {
    this.deactivate();
  }

  private initialFocusTarget(el: HTMLElement): HTMLElement | null {
    const marked = el.querySelector<HTMLElement>(`[${OGE_SHEET_FOCUS_ATTR}]`);
    if (marked) return marked;
    const body = el.querySelector<HTMLElement>('.oge-popup-sheet-body');
    const inBody = body ? getTabbableElements(body)[0] : undefined;
    return inBody ?? getTabbableElements(el)[0] ?? null;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !this.active) return;
    const sheet =
      this.active.querySelector<HTMLElement>('.oge-popup-sheet') ?? this.active;
    trapTabKey(event, sheet, sheet);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const el = this.active;
    if (!el) return;
    const target = event.target as Element | null;
    // The layer itself is the backdrop: the sheet surface is its child.
    if (target === el) {
      event.preventDefault();
      this.options.onDismiss();
      return;
    }
    const handle = target?.closest?.('.oge-popup-sheet-handle');
    if (handle && el.contains(handle) && event.isPrimary !== false) {
      this.swipe = {
        id: event.pointerId,
        startY: event.clientY,
        dy: 0,
        sheet: el.querySelector<HTMLElement>('.oge-popup-sheet'),
      };
      document.addEventListener('pointermove', this.onSwipeMove);
      document.addEventListener('pointerup', this.onSwipeEnd);
      document.addEventListener('pointercancel', this.onSwipeCancel);
    }
  };

  private readonly onSwipeMove = (event: PointerEvent): void => {
    const swipe = this.swipe;
    if (!swipe || event.pointerId !== swipe.id) return;
    swipe.dy = Math.max(0, event.clientY - swipe.startY);
    if (swipe.sheet && !prefersReducedMotion()) {
      swipe.sheet.style.translate = `0 ${swipe.dy}px`;
    }
  };

  private readonly onSwipeEnd = (event: PointerEvent): void => {
    const swipe = this.swipe;
    if (!swipe || event.pointerId !== swipe.id) return;
    const dismiss = swipe.dy >= OGE_SHEET_SWIPE_DISMISS;
    this.endSwipe();
    if (dismiss) this.options.onDismiss();
  };

  private readonly onSwipeCancel = (event: PointerEvent): void => {
    if (this.swipe && event.pointerId === this.swipe.id) this.endSwipe();
  };

  private endSwipe(): void {
    const swipe = this.swipe;
    if (!swipe) return;
    this.swipe = null;
    if (swipe.sheet) swipe.sheet.style.translate = '';
    document.removeEventListener('pointermove', this.onSwipeMove);
    document.removeEventListener('pointerup', this.onSwipeEnd);
    document.removeEventListener('pointercancel', this.onSwipeCancel);
  }

  private readonly syncViewport = (): void => {
    const el = this.active;
    if (!el) return;
    const visible = ogeVisibleViewport();
    el.style.setProperty('--oge-sheet-viewport-top', `${visible.top}px`);
    el.style.setProperty('--oge-sheet-viewport-height', `${visible.height}px`);
  };
}
