/**
 * The framework-free half of the load panel (ADR 0001): the timing machine
 * behind `showDelay` / `minDisplayTime`, the target resolution rule and the
 * `aria-busy` bookkeeping on the covered container. Both render layers drive
 * the same machine, so "does the panel flash?" and "what happens to the
 * target's own `aria-busy`?" have one answer.
 */

/** Where the pane (indicator + message) sits inside the covered area. */
export type OgeLoadPanelPosition = 'center' | 'top' | 'bottom';

/** Delays of one load panel, in milliseconds. */
export interface OgeLoadPanelTimings {
  /**
   * How long `visible` must stay `true` before the panel appears — a load
   * that finishes inside it never flashes a panel at all.
   */
  readonly showDelay: number;
  /**
   * Once shown, the panel stays up at least this long, so a load finishing
   * just after the delay does not blink the panel for a frame.
   */
  readonly minDisplayTime: number;
}

/** What the machine asks its render layer to do. */
export interface OgeLoadPanelCoreHost {
  /** Paint the panel (and announce it). */
  show(): void;
  /** Remove the panel. */
  hide(): void;
}

/** Clock seam — the global timers by default; specs use fake timers. */
export interface OgeLoadPanelClock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const GLOBAL_CLOCK: OgeLoadPanelClock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) =>
    clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * The show / hide timing machine. Not reactive: the render layer calls
 * {@link update} whenever `visible` or the timings change and paints from
 * the `show()` / `hide()` callbacks.
 *
 * - `visible: true` shows after `showDelay` (at once when it is `0`);
 *   turning `false` inside the delay cancels it — no `shown`, no `hidden`.
 * - `visible: false` hides at once, or once `minDisplayTime` has passed
 *   since the panel appeared; turning `true` again meanwhile keeps it up.
 * - {@link destroy} drops pending timers without calling `hide()`;
 *   {@link revive} re-arms a destroyed machine with its painted state kept
 *   (React StrictMode remounts the same instance while the panel is still
 *   on screen).
 */
export class OgeLoadPanelCore {
  private shownAt = 0;
  private visibleRequested = false;
  private showTimer: unknown = null;
  private hideTimer: unknown = null;
  private alive = true;
  private _shown = false;

  constructor(
    private readonly host: OgeLoadPanelCoreHost,
    private readonly clock: OgeLoadPanelClock = GLOBAL_CLOCK,
  ) {}

  /** Whether the panel is currently painted. */
  get shown(): boolean {
    return this._shown;
  }

  /** Feeds the current `visible` request and timings. */
  update(visible: boolean, timings: Partial<OgeLoadPanelTimings> = {}): void {
    if (!this.alive) return;
    this.visibleRequested = visible;
    const showDelay = Math.max(timings.showDelay ?? 0, 0);
    const minDisplayTime = Math.max(timings.minDisplayTime ?? 0, 0);
    if (visible) {
      this.cancelHide();
      if (this._shown || this.showTimer !== null) return;
      if (showDelay === 0) {
        this.commitShow();
        return;
      }
      this.showTimer = this.clock.setTimeout(() => {
        this.showTimer = null;
        if (this.alive && this.visibleRequested) this.commitShow();
      }, showDelay);
      return;
    }
    this.cancelShow();
    if (!this._shown || this.hideTimer !== null) return;
    const remaining = minDisplayTime - (this.clock.now() - this.shownAt);
    if (remaining <= 0) {
      this.commitHide();
      return;
    }
    this.hideTimer = this.clock.setTimeout(() => {
      this.hideTimer = null;
      if (this.alive && !this.visibleRequested) this.commitHide();
    }, remaining);
  }

  /** Clears pending timers; the painted state is left to the host's teardown. */
  destroy(): void {
    this.alive = false;
    this.cancelShow();
    this.cancelHide();
  }

  /**
   * Re-arms the machine after {@link destroy}; the painted state is kept, and
   * the host replays its current `visible` through {@link update} afterwards
   * (a pending hide is re-armed from the original `shownAt`).
   */
  revive(): void {
    this.alive = true;
  }

  private commitShow(): void {
    this._shown = true;
    this.shownAt = this.clock.now();
    this.host.show();
  }

  private commitHide(): void {
    this._shown = false;
    this.host.hide();
  }

  private cancelShow(): void {
    if (this.showTimer === null) return;
    this.clock.clearTimeout(this.showTimer);
    this.showTimer = null;
  }

  private cancelHide(): void {
    if (this.hideTimer === null) return;
    this.clock.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }
}

// --- target ----------------------------------------------------------------

/** The structural element contract the target helpers touch. */
export interface OgeLoadPanelTargetElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  readonly classList: {
    add(token: string): void;
    remove(token: string): void;
  };
}

/**
 * The container a load panel covers: an explicit element, the first match of
 * a selector, or — the default — the panel's own parent. `null` when nothing
 * resolves (an unmatched selector, a detached panel, the server).
 */
export function ogeResolveLoadPanelTarget(
  target: Element | string | null | undefined,
  host: Element | null,
): Element | null {
  if (target && typeof target !== 'string') return target;
  if (typeof target === 'string' && target.trim() !== '') {
    const doc = host?.ownerDocument ?? null;
    try {
      return doc?.querySelector(target) ?? null;
    } catch {
      // an invalid selector resolves nothing rather than throwing in render
      return null;
    }
  }
  return host?.parentElement ?? null;
}

/**
 * The element `aria-busy` goes on: the covered container. A full-screen panel
 * without an explicit `target` marks nothing — `aria-busy` on `<body>` would
 * also silence the document's shared live regions, which is where the
 * panel's own announcement goes.
 */
export function ogeLoadPanelBusyTarget(options: {
  readonly fullScreen: boolean;
  readonly explicitTarget: boolean;
  readonly resolved: Element | null;
}): Element | null {
  if (options.fullScreen && !options.explicitTarget) return null;
  return options.resolved;
}

/** Class a static container receives so the absolute panel can cover it. */
export const OGE_LOAD_PANEL_TARGET_CLASS = 'oge-load-panel-target';

interface BusyRecord {
  count: number;
  previousBusy: string | null;
  positioned: boolean;
}

const busyRecords = new WeakMap<OgeLoadPanelTargetElement, BusyRecord>();

/**
 * Marks `target` busy for one load panel and returns the release. Ref-counted
 * per element: two panels over the same container keep it `aria-busy` until
 * the last one releases, and the very first release restores whatever
 * `aria-busy` value the container had before (or removes the attribute).
 * `positioned` adds {@link OGE_LOAD_PANEL_TARGET_CLASS} (`position: relative`)
 * for a statically positioned container, and takes it off again on release.
 * Calling the returned function twice is a no-op.
 */
export function ogeAcquireLoadPanelTarget(
  target: OgeLoadPanelTargetElement,
  options: { readonly positioned?: boolean } = {},
): () => void {
  let record = busyRecords.get(target);
  if (!record) {
    record = {
      count: 0,
      previousBusy: target.getAttribute('aria-busy'),
      positioned: false,
    };
    busyRecords.set(target, record);
  }
  record.count += 1;
  target.setAttribute('aria-busy', 'true');
  if (options.positioned && !record.positioned) {
    record.positioned = true;
    target.classList.add(OGE_LOAD_PANEL_TARGET_CLASS);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = busyRecords.get(target);
    if (!current) return;
    current.count -= 1;
    if (current.count > 0) return;
    busyRecords.delete(target);
    if (current.previousBusy === null) target.removeAttribute('aria-busy');
    else target.setAttribute('aria-busy', current.previousBusy);
    if (current.positioned)
      target.classList.remove(OGE_LOAD_PANEL_TARGET_CLASS);
  };
}

/**
 * Whether a container needs {@link OGE_LOAD_PANEL_TARGET_CLASS}: only a
 * `static` one — an absolutely, fixed or sticky positioned container is
 * already a containing block and must keep its own position.
 */
export function ogeLoadPanelNeedsPositioning(target: Element): boolean {
  const view = target.ownerDocument?.defaultView;
  if (!view?.getComputedStyle) return false;
  const position = view.getComputedStyle(target).position;
  // engines without a cascade default (jsdom) report '' for an unset position
  return position === 'static' || position === '';
}
