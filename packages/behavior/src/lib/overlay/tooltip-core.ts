/**
 * Framework-free half of the tooltip (ADR 0001): the show/hide timing
 * machine, the "can it show" decision and the `aria-describedby` bookkeeping.
 * Both render layers drive it from their own hover/focus handlers and own the
 * bubble element; the panel positioning itself is the shared
 * `OgeAnchoredPanelCore`, configured with `OGE_TOOLTIP_PANEL_OPTIONS`.
 */

/**
 * Anchored-panel options every tooltip uses: tooltips are transient — no
 * Escape stack, no outside-click handling — the trigger owns every hide.
 */
export const OGE_TOOLTIP_PANEL_OPTIONS = {
  transient: true,
  closeOnEscape: false,
  closeOnOutsidePointerDown: false,
} as const;

export interface OgeTooltipCoreOptions {
  /** Current tooltip text; blank disables the tooltip. */
  text: () => string;
  /** Suppresses showing without detaching the trigger. */
  disabled?: () => boolean;
  /** Hover dwell before showing, in ms (focus shows immediately). */
  showDelay: () => number;
  /** Grace period before hiding after the pointer leaves, in ms. */
  hideDelay: () => number;
  /** The anchored panel's open state. */
  isOpen: () => boolean;
  /** Opens the anchored panel (the host renders the bubble first). */
  open: () => void;
  /** Closes the anchored panel. */
  close: () => void;
  /** Element the trigger's `aria-describedby` is written on. */
  describedByTarget: () => HTMLElement | null;
  /** Id of the bubble element (the anchored panel's `panelId`). */
  panelId: string;
}

/**
 * Show/hide state machine of a tooltip trigger: pointer enter/leave go
 * through the dwell and grace timers, focus/blur/Escape act immediately, and
 * every open appends the bubble id to the trigger's `aria-describedby`
 * (preserving existing ids) while every close removes it.
 */
export class OgeTooltipCore {
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  /** The element written to last, so removal always hits the same node. */
  private describedByEl: HTMLElement | null = null;

  constructor(private readonly options: OgeTooltipCoreOptions) {}

  /** Whether the tooltip may show right now (enabled and non-blank text). */
  canShow(): boolean {
    return (
      !(this.options.disabled?.() ?? false) &&
      this.options.text().trim().length > 0
    );
  }

  /** Pointer path: shows after the hover dwell. */
  scheduleShow(): void {
    this.clearTimer('hide');
    if (this.options.isOpen() || !this.canShow()) return;
    this.clearTimer('show');
    this.showTimer = setTimeout(() => this.show(), this.options.showDelay());
  }

  /** Pointer path: hides after the grace period. */
  scheduleHide(): void {
    this.clearTimer('show');
    if (!this.options.isOpen()) return;
    this.clearTimer('hide');
    this.hideTimer = setTimeout(() => this.hide(), this.options.hideDelay());
  }

  /** Keyboard path: shows immediately. */
  show(): void {
    this.clearTimers();
    if (this.options.isOpen() || !this.canShow()) return;
    this.options.open();
    this.addDescribedBy();
  }

  hide(): void {
    this.clearTimers();
    this.options.close();
  }

  /**
   * Re-evaluates after the text or disabled state changed: an open tooltip
   * whose text emptied or that was disabled hides.
   */
  sync(): void {
    if (!this.canShow() && this.options.isOpen()) this.hide();
  }

  /** Call from the panel's `onClosed` so the id leaves `aria-describedby`. */
  onPanelClosed(): void {
    this.removeDescribedBy();
  }

  /** Clears timers and the describedby link; the host closes the panel. */
  destroy(): void {
    this.clearTimers();
    this.removeDescribedBy();
  }

  private addDescribedBy(): void {
    const el = this.options.describedByTarget();
    if (!el) return;
    this.describedByEl = el;
    const existing = el.getAttribute('aria-describedby');
    const ids = existing ? existing.split(/\s+/) : [];
    if (!ids.includes(this.options.panelId)) {
      ids.push(this.options.panelId);
      el.setAttribute('aria-describedby', ids.join(' '));
    }
  }

  private removeDescribedBy(): void {
    const el = this.describedByEl;
    this.describedByEl = null;
    const existing = el?.getAttribute('aria-describedby');
    if (!el || !existing) return;
    const ids = existing
      .split(/\s+/)
      .filter((id) => id !== this.options.panelId);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
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

/**
 * Screen readers only announce `aria-describedby` on the focused element, so
 * on composite hosts (a custom-element button wrapper) the id must land on
 * the inner native control, not the wrapper.
 */
export function tooltipDescribedByTarget(host: HTMLElement): HTMLElement {
  if (host.matches('button, input, select, textarea, a[href], [tabindex]')) {
    return host;
  }
  return (
    host.querySelector<HTMLElement>(
      'button, input, select, textarea, a[href]',
    ) ?? host
  );
}
