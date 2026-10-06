/**
 * Framework-free half of the popover (ADR 0001): trigger timing (click,
 * hover intent with a grace period that survives moving into the panel,
 * focus), the cancelable open/close pipeline with reasons, initial focus and
 * focus restore, the modal Tab trap, the non-modal "Tab as if inline" focus
 * order of a panel portaled to `document.body`, and the ARIA attribute
 * decisions for trigger and panel. Both render layers own the DOM and an
 * `OgeAnchoredPanelCore` (positioning, Escape stack, outside click) and route
 * every trigger/panel event through this machine.
 */

import type { OgePopupCloseReason } from './anchored-panel-core';
import { getTabbableElements, trapTabKey } from './focus-trap';

// --- vocabulary -------------------------------------------------------------

/**
 * What opens a popover from its trigger: `'click'` (activation toggles — the
 * APG disclosure), `'hover'` (pointer dwell with a grace period that lets the
 * pointer travel into the panel; keyboard focus opens it too, so the content
 * is never pointer-only), `'focus'` (focus only) or `'manual'` (only the
 * imperative API and the two-way open state).
 */
export type OgePopoverShowOn = 'click' | 'hover' | 'focus' | 'manual';

/** Why a popover opened. */
export type OgePopoverOpenReason = 'api' | 'click' | 'hover' | 'focus';

/**
 * Why a popover closed: `'api'` (`close()` / the open state), `'trigger'`
 * (the trigger was activated again), `'pointerLeave'` (hover mode, the
 * pointer left trigger and panel), `'focusOut'` (focus moved outside trigger
 * and panel), `'outside'` (pointer-down outside), `'escape'` or
 * `'closeButton'` (the ✕ in the header, or a slot's `close()`).
 */
export type OgePopoverCloseReason =
  | 'api'
  | 'trigger'
  | 'pointerLeave'
  | 'focusOut'
  | 'outside'
  | 'escape'
  | 'closeButton';

/**
 * Where focus goes when the popover opens by click or API: `'auto'` (the
 * first tabbable element when `modal`, nowhere otherwise — the APG
 * disclosure keeps focus on its button), `'none'`, `'first-tabbable'`,
 * `'panel'` or a CSS selector resolved inside the panel. Hover and focus
 * opens never move focus. An `[autofocus]` element inside always wins.
 */
export type OgePopoverInitialFocus =
  'auto' | 'none' | 'first-tabbable' | 'panel' | (string & {});

/** Cancelable pre-event fired before the popover opens. */
export interface OgePopoverOpeningEvent {
  /** What asked the popover to open. */
  readonly reason: OgePopoverOpenReason;
  /** Set `true` to keep the popover closed. */
  cancel: boolean;
}

/** Fired after the popover opened. */
export interface OgePopoverOpenedEvent {
  /** What opened the popover. */
  readonly reason: OgePopoverOpenReason;
}

/** Cancelable pre-event fired before the popover closes for any reason. */
export interface OgePopoverClosingEvent {
  /** What asked the popover to close. */
  readonly reason: OgePopoverCloseReason;
  /** Set `true` to keep the popover open. */
  cancel: boolean;
}

/** Fired after the popover closed. */
export interface OgePopoverClosedEvent {
  /** What closed the popover. */
  readonly reason: OgePopoverCloseReason;
}

/** ARIA attributes the trigger carries (`null` = absent). */
export interface OgePopoverTriggerAria {
  /** `'dialog'` for click / manual triggers; absent for hover / focus. */
  readonly 'aria-haspopup': 'dialog' | null;
  /** `'true'` / `'false'` — the disclosure state. */
  readonly 'aria-expanded': 'true' | 'false';
  /** The panel id while open (the panel only exists then). */
  readonly 'aria-controls': string | null;
}

/** ARIA attributes of the panel itself. */
export interface OgePopoverPanelAria {
  /** Always `'dialog'` — a modal or non-modal dialog (APG). */
  readonly role: 'dialog';
  /** `'true'` for a modal popover; absent otherwise. */
  readonly 'aria-modal': 'true' | null;
}

// --- machine ----------------------------------------------------------------

export interface OgePopoverCoreOptions {
  /** Trigger interaction model. */
  showOn: () => OgePopoverShowOn;
  /** Modal: Tab is trapped in the panel and focus moves in on open. */
  modal: () => boolean;
  /** Suppresses opening (and closes an open popover on `sync()`). */
  disabled?: () => boolean;
  /** Hover dwell before opening, in ms (hover mode). */
  showDelay: () => number;
  /** Grace period before closing after the pointer left, in ms (hover mode). */
  hideDelay: () => number;
  /** Initial-focus strategy for click / API opens. Default `'auto'`. */
  initialFocus?: () => OgePopoverInitialFocus;
  /** Whether focus returns to the trigger after a close. Default `true`. */
  restoreFocus?: () => boolean;
  /** Whether Escape closes the popover. Default `true`. */
  closeOnEscape?: () => boolean;
  /** Whether a pointer-down outside trigger and panel closes it. Default `true`. */
  closeOnOutsideClick?: () => boolean;
  /** The anchored panel's open state. */
  isOpen: () => boolean;
  /** Opens the anchored panel and the host's open state. */
  commitOpen: (reason: OgePopoverOpenReason) => void;
  /** Closes the anchored panel and the host's open state. */
  commitClose: (reason: OgePopoverCloseReason) => void;
  /** The element the popover is anchored to (the active trigger). */
  trigger: () => HTMLElement | null;
  /** The panel element (`null` while closed / not rendered yet). */
  panel: () => HTMLElement | null;
  /** Emits the cancelable `opening` event. */
  onOpening?: (event: OgePopoverOpeningEvent) => void;
  /** Emits `opened`. */
  onOpened?: (event: OgePopoverOpenedEvent) => void;
  /** Emits the cancelable `closing` event. */
  onClosing?: (event: OgePopoverClosingEvent) => void;
  /** Emits `closed`. */
  onClosed?: (event: OgePopoverClosedEvent) => void;
}

type FocusEventLike = { readonly relatedTarget: EventTarget | null };
type KeyEventLike = {
  readonly key: string;
  readonly shiftKey: boolean;
  preventDefault(): void;
};

/**
 * Popover state machine shared by `oge-popover` / `[ogePopover]` and
 * `<OgePopover>`. Host contract:
 *
 * - wire the trigger's `click`, `pointerenter`, `pointerleave`, `focusin`,
 *   `focusout` and `keydown` to the `trigger*` methods, and the panel's
 *   `pointerenter`, `pointerleave`, `focusout` and `keydown` to the `panel*`
 *   methods;
 * - pass `beforePanelClose` as the anchored panel's `beforeClose` — Escape
 *   and outside clicks then run through the cancelable `closing` event;
 * - call `panelReady()` once the open panel was first positioned (initial
 *   focus), and `sync()` when `disabled` changes.
 */
export class OgePopoverCore {
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  /** Reason of the open in flight — initial focus applies to click / API. */
  private pendingFocusReason: OgePopoverOpenReason | null = null;
  /** Set while focus is restored to the trigger, so `'focus'` cannot reopen. */
  private restoringFocus = false;
  private pointerInPanel = false;

  constructor(private readonly options: OgePopoverCoreOptions) {}

  /** Whether the popover may open now. */
  canOpen(): boolean {
    return !(this.options.disabled?.() ?? false);
  }

  /** The resolved trigger interaction model. */
  showOn(): OgePopoverShowOn {
    return this.options.showOn();
  }

  // --- imperative pipeline --------------------------------------------------

  /**
   * Runs the cancelable `opening` event and opens. Returns whether the
   * popover is open afterwards.
   */
  open(reason: OgePopoverOpenReason = 'api'): boolean {
    this.clearTimers();
    if (this.options.isOpen()) return true;
    if (!this.canOpen()) return false;
    const opening: OgePopoverOpeningEvent = { reason, cancel: false };
    this.options.onOpening?.(opening);
    if (opening.cancel) return false;
    this.pendingFocusReason = reason;
    this.pointerInPanel = false;
    this.options.commitOpen(reason);
    this.options.onOpened?.({ reason });
    return true;
  }

  /**
   * Runs the cancelable `closing` event and closes, restoring focus to the
   * trigger when it would otherwise be lost. Returns whether the popover is
   * closed afterwards.
   */
  close(reason: OgePopoverCloseReason = 'api'): boolean {
    this.clearTimers();
    if (!this.options.isOpen()) return true;
    const closing: OgePopoverClosingEvent = { reason, cancel: false };
    this.options.onClosing?.(closing);
    if (closing.cancel) return false;
    const refocus = this.shouldRestoreFocus(reason);
    this.pendingFocusReason = null;
    this.pointerInPanel = false;
    this.options.commitClose(reason);
    if (refocus) this.focusTrigger();
    this.options.onClosed?.({ reason });
    return true;
  }

  /** Open ⇄ close (`'api'` reasons unless given). */
  toggle(
    openReason: OgePopoverOpenReason = 'api',
    closeReason: OgePopoverCloseReason = 'api',
  ): void {
    if (this.options.isOpen()) this.close(closeReason);
    else this.open(openReason);
  }

  /**
   * Applies a two-way open state written from outside (`[(visible)]`, a
   * controlled `open` prop) through the same pipeline, reason `'api'`.
   * Returns the state actually reached — a vetoed change reports the old one
   * so the host can write it back.
   */
  syncOpenState(open: boolean): boolean {
    if (open === this.options.isOpen()) return open;
    return open ? this.open('api') : !this.close('api');
  }

  /** Re-evaluates after `disabled` changed: an open, disabled popover closes. */
  sync(): void {
    if (!this.canOpen() && this.options.isOpen()) this.close('api');
  }

  /**
   * The anchored panel's `beforeClose`: Escape and outside clicks run
   * through `close()` (cancelable, focus restore) — the panel machine itself
   * never closes on its own.
   */
  beforePanelClose(reason: OgePopupCloseReason): boolean {
    if (reason === 'escape') {
      if (this.options.closeOnEscape?.() !== false) this.close('escape');
    } else if (this.options.closeOnOutsideClick?.() !== false) {
      this.close('outside');
    }
    return false;
  }

  /**
   * Call once the open panel was first positioned: moves focus in for click
   * and API opens per `initialFocus` (`'auto'` → first tabbable when modal).
   */
  panelReady(): void {
    const reason = this.pendingFocusReason;
    this.pendingFocusReason = null;
    if (reason !== 'click' && reason !== 'api') return;
    const panel = this.options.panel();
    if (!panel) return;
    const target = resolvePopoverInitialFocus(
      panel,
      this.options.initialFocus?.() ?? 'auto',
      this.options.modal(),
    );
    target?.focus();
  }

  // --- trigger events -------------------------------------------------------

  /** Trigger `click`: toggles in click mode. */
  triggerClick(): void {
    if (this.showOn() !== 'click') return;
    if (this.options.isOpen()) this.close('trigger');
    else this.open('click');
  }

  /** Trigger `pointerenter`: hover dwell (and cancels a pending hide). */
  triggerPointerEnter(): void {
    if (this.showOn() !== 'hover') return;
    this.clearTimer('hide');
    if (this.options.isOpen() || !this.canOpen()) return;
    this.clearTimer('show');
    this.showTimer = setTimeout(
      () => this.open('hover'),
      this.options.showDelay(),
    );
  }

  /** Trigger `pointerleave`: hover grace period. */
  triggerPointerLeave(): void {
    if (this.showOn() !== 'hover') return;
    this.clearTimer('show');
    this.scheduleHoverClose();
  }

  /** Trigger `focusin`: opens in hover and focus modes. */
  triggerFocusIn(): void {
    if (this.restoringFocus) return;
    const mode = this.showOn();
    if (mode === 'hover' || mode === 'focus') this.open('focus');
  }

  /** Trigger `focusout`: closes when focus left trigger and panel. */
  triggerFocusOut(event: FocusEventLike): void {
    this.handleFocusOut(event);
  }

  /**
   * Trigger `keydown`: <kbd>Tab</kbd> on the trigger of an open non-modal
   * popover moves into the panel (it is portaled, so DOM order would skip
   * it) — the panel reads as if it followed the trigger inline.
   */
  triggerKeyDown(event: KeyEventLike): void {
    if (event.key !== 'Tab' || event.shiftKey) return;
    if (!this.options.isOpen()) return;
    const panel = this.options.panel();
    if (!panel) return;
    const first = getTabbableElements(panel)[0];
    if (!first) return;
    event.preventDefault();
    first.focus();
  }

  // --- panel events ---------------------------------------------------------

  /** Panel `pointerenter`: hovering the panel keeps a hover popover open. */
  panelPointerEnter(): void {
    this.pointerInPanel = true;
    this.clearTimer('hide');
  }

  /** Panel `pointerleave`: hover grace period. */
  panelPointerLeave(): void {
    this.pointerInPanel = false;
    if (this.showOn() === 'hover') this.scheduleHoverClose();
  }

  /** Panel `focusout`: closes when focus left trigger and panel. */
  panelFocusOut(event: FocusEventLike): void {
    this.handleFocusOut(event);
  }

  /**
   * Panel `keydown`: modal → <kbd>Tab</kbd> wraps inside the panel; non-modal
   * → <kbd>Shift+Tab</kbd> from the first stop returns to the trigger and
   * <kbd>Tab</kbd> from the last stop continues after the trigger, so focus
   * order matches the visual order of an inline disclosure.
   */
  panelKeyDown(event: KeyEventLike): void {
    if (event.key !== 'Tab') return;
    const panel = this.options.panel();
    if (!panel) return;
    if (this.options.modal()) {
      trapTabKey(event as unknown as KeyboardEvent, panel, panel);
      return;
    }
    const tabbables = getTabbableElements(panel);
    const active =
      typeof document !== 'undefined' ? document.activeElement : null;
    const trigger = this.options.trigger();
    if (event.shiftKey) {
      if (!tabbables.length || active === tabbables[0] || active === panel) {
        if (!trigger) return;
        event.preventDefault();
        trigger.focus();
      }
      return;
    }
    if (!tabbables.length || active === tabbables[tabbables.length - 1]) {
      const next = trigger ? nextTabbableAfter(trigger, panel) : null;
      if (!next) return;
      event.preventDefault();
      next.focus();
    }
  }

  /** Clears timers; the host closes / destroys the anchored panel. */
  destroy(): void {
    this.clearTimers();
    this.pendingFocusReason = null;
  }

  // --- a11y decisions -------------------------------------------------------

  /** ARIA attributes for the trigger (APG disclosure / dialog button). */
  triggerAria(panelId: string): OgePopoverTriggerAria {
    return popoverTriggerAria(this.showOn(), this.options.isOpen(), panelId);
  }

  /** ARIA attributes for the panel. */
  panelAria(): OgePopoverPanelAria {
    return popoverPanelAria(this.options.modal());
  }

  // --- internals ------------------------------------------------------------

  private scheduleHoverClose(): void {
    if (!this.options.isOpen() || this.pointerInPanel) return;
    // A keyboard user working inside the panel keeps it, wherever the
    // pointer drifts.
    const panel = this.options.panel();
    if (
      panel &&
      typeof document !== 'undefined' &&
      panel.contains(document.activeElement)
    ) {
      return;
    }
    this.clearTimer('hide');
    this.hideTimer = setTimeout(
      () => this.close('pointerLeave'),
      this.options.hideDelay(),
    );
  }

  private handleFocusOut(event: FocusEventLike): void {
    if (!this.options.isOpen() || this.showOn() === 'manual') return;
    if (this.options.modal()) return; // the trap keeps focus inside
    const next = event.relatedTarget as Node | null;
    // Focus going nowhere (a click on non-focusable content, the window
    // losing focus) is not a decision to leave — outside clicks have their
    // own path.
    if (!next) return;
    const trigger = this.options.trigger();
    const panel = this.options.panel();
    if (trigger?.contains(next) || panel?.contains(next)) return;
    this.close('focusOut');
  }

  private shouldRestoreFocus(reason: OgePopoverCloseReason): boolean {
    if (this.options.restoreFocus?.() === false) return false;
    if (reason === 'outside' || reason === 'focusOut') return false;
    if (typeof document === 'undefined') return false;
    const active = document.activeElement;
    const panel = this.options.panel();
    return (
      !active || active === document.body || (panel?.contains(active) ?? false)
    );
  }

  private focusTrigger(): void {
    const trigger = this.options.trigger();
    if (!trigger) return;
    this.restoringFocus = true;
    try {
      trigger.focus();
    } finally {
      this.restoringFocus = false;
    }
  }

  private clearTimer(kind: 'show' | 'hide'): void {
    const timer = kind === 'show' ? this.showTimer : this.hideTimer;
    if (timer !== null) clearTimeout(timer);
    if (kind === 'show') this.showTimer = null;
    else this.hideTimer = null;
  }

  private clearTimers(): void {
    this.clearTimer('show');
    this.clearTimer('hide');
  }
}

// --- pure helpers -----------------------------------------------------------

/** Trigger ARIA for a show mode and open state. */
export function popoverTriggerAria(
  showOn: OgePopoverShowOn,
  open: boolean,
  panelId: string,
): OgePopoverTriggerAria {
  return {
    'aria-haspopup':
      showOn === 'click' || showOn === 'manual' ? 'dialog' : null,
    'aria-expanded': open ? 'true' : 'false',
    'aria-controls': open ? panelId : null,
  };
}

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'submit',
  'reset',
  'image',
  'checkbox',
  'radio',
]);

/**
 * Whether `aria-expanded` is valid ARIA on the element. A text field without
 * an explicit role is a `textbox` (or `searchbox`), which does not support
 * the state — a focus-mode popover on an `<input>` must not claim it (axe
 * `aria-allowed-attr`); `aria-controls` is global and stays.
 */
export function supportsAriaExpanded(element: Element): boolean {
  if (element.hasAttribute('role')) {
    return !/^(textbox|searchbox)$/.test(element.getAttribute('role') ?? '');
  }
  const tag = element.tagName.toLowerCase();
  if (tag === 'textarea') return false;
  if (tag === 'input') {
    const type = (element.getAttribute('type') ?? 'text').toLowerCase();
    return NON_TEXT_INPUT_TYPES.has(type);
  }
  return true;
}

/**
 * Writes trigger ARIA onto an element (removing `null` attributes). Both
 * render layers write it imperatively onto the trigger's focusable control
 * (`tooltipDescribedByTarget`): a wrapper component such as `oge-button`
 * renders the real `<button>` inside, and `aria-expanded` on the wrapper
 * would be invalid ARIA that no screen reader announces. On a text field
 * (`supportsAriaExpanded`) the expanded state is left out.
 */
export function syncPopoverTriggerAria(
  element: HTMLElement,
  aria: OgePopoverTriggerAria,
): void {
  const expandable = supportsAriaExpanded(element);
  for (const [name, raw] of Object.entries(aria) as [string, string | null][]) {
    const value = name === 'aria-expanded' && !expandable ? null : raw;
    if (value === null) element.removeAttribute(name);
    else if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }
}

/** Panel ARIA for the modal flag. */
export function popoverPanelAria(modal: boolean): OgePopoverPanelAria {
  return { role: 'dialog', 'aria-modal': modal ? 'true' : null };
}

/**
 * Resolves the initial-focus target inside `panel`; `null` means "leave
 * focus where it is". An `[autofocus]` descendant always wins.
 */
export function resolvePopoverInitialFocus(
  panel: HTMLElement,
  mode: OgePopoverInitialFocus,
  modal: boolean,
): HTMLElement | null {
  const autofocus = panel.querySelector<HTMLElement>('[autofocus]');
  if (autofocus) return autofocus;
  const resolved = mode === 'auto' ? (modal ? 'first-tabbable' : 'none') : mode;
  if (resolved === 'none') return null;
  if (resolved === 'panel') return panel;
  if (resolved !== 'first-tabbable') {
    let match: HTMLElement | null = null;
    try {
      match = panel.querySelector<HTMLElement>(resolved);
    } catch {
      match = null;
    }
    if (match) return match;
  }
  return getTabbableElements(panel)[0] ?? panel;
}

/**
 * The first tabbable element after `trigger` in document order, skipping
 * everything inside `exclude` (the portaled panel) — where Tab continues from
 * the last stop of a non-modal popover.
 */
export function nextTabbableAfter(
  trigger: HTMLElement,
  exclude: HTMLElement | null,
): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const all = getTabbableElements(document.body);
  for (const el of all) {
    if (exclude?.contains(el) || trigger.contains(el)) continue;
    // DOCUMENT_POSITION_FOLLOWING
    if (trigger.compareDocumentPosition(el) & 4) return el;
  }
  return null;
}
