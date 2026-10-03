/**
 * The suite's one screen-reader announcer (framework-free, ADR 0001).
 *
 * Every live announcement — a grid's "Sorted by Name, ascending", a toast, a
 * validation error — goes through {@link OgeLiveAnnouncerCore}. It owns
 * exactly one polite and one assertive visually hidden live region per
 * document, so components never mount their own: a page with five grids and
 * a toast host still has two live regions, and an announcement can never be
 * lost to a region that was rendered in the same frame it was written to.
 *
 * SSR-safe by construction: nothing touches the DOM until the first
 * `announce()`, and without a document every call is a no-op.
 */

/** Which live region an announcement goes to. */
export type OgeLivePoliteness = 'polite' | 'assertive';

/** Per-call options of {@link OgeLiveAnnouncerCore.announce}. */
export interface OgeLiveAnnounceOptions {
  /** Live region to speak through. Default `'polite'`. */
  politeness?: OgeLivePoliteness;
  /**
   * Milliseconds before the text is written. A newer announcement to the same
   * region inside this window supersedes this one — the debounce a burst of
   * changes (typing into a filter) needs. `0` writes synchronously — for a
   * caller that already cleared the region and waited itself. Default: the
   * announcer's `delay`.
   */
  delay?: number;
  /** Milliseconds the text stays before the region is cleared. Default: the announcer's `clearAfter`. */
  clearAfter?: number;
}

/** Construction options of {@link OgeLiveAnnouncerCore}. */
export interface OgeLiveAnnouncerOptions {
  /**
   * The document whose regions to own. Default: the global `document`, read
   * lazily on the first announcement; `null` makes the announcer inert.
   */
  document?: Document | null;
  /** Default write delay in ms (clear-then-set needs a tick). Default `100`. */
  delay?: number;
  /** Default ms before a written message is cleared again. Default `5000`. */
  clearAfter?: number;
  /**
   * Window in ms in which the identical message to the same region is
   * dropped instead of re-announced. Default `1000`.
   */
  dedupeWindow?: number;
}

/** Attribute marking the shared regions — also what `inertModalBackground` skips. */
export const OGE_LIVE_ANNOUNCER_ATTR = 'data-oge-live-announcer';

/** Class of the shared live regions (visually hidden by inline style). */
export const OGE_LIVE_ANNOUNCER_CLASS = 'oge-live-announcer';

interface RegionState {
  el: HTMLElement | null;
  /** Message waiting for its write timer. */
  pending: string | null;
  /** Message currently in the region. */
  current: string | null;
  writtenAt: number;
  writeTimer: ReturnType<typeof setTimeout> | null;
  clearTimer: ReturnType<typeof setTimeout> | null;
}

const VISUALLY_HIDDEN: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  insetInlineStart: '0',
  insetBlockStart: '0',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: '0',
  border: '0',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

function emptyRegion(): RegionState {
  return {
    el: null,
    pending: null,
    current: null,
    writtenAt: 0,
    writeTimer: null,
    clearTimer: null,
  };
}

/**
 * Owns the document's polite + assertive live regions and the write rules:
 * clear-then-set after `delay` (so an unchanged region still re-announces),
 * latest-wins inside the delay window, identical messages inside
 * `dedupeWindow` dropped, and the region cleared `clearAfter` ms later so the
 * same text spoken again later is announced again.
 *
 * Prefer the shared per-document instance from {@link getOgeLiveAnnouncer};
 * constructing one directly is for tests and custom documents.
 */
export class OgeLiveAnnouncerCore {
  private readonly regions: Record<OgeLivePoliteness, RegionState> = {
    polite: emptyRegion(),
    assertive: emptyRegion(),
  };
  private readonly delay: number;
  private readonly clearAfter: number;
  private readonly dedupeWindow: number;
  private destroyed = false;

  constructor(private readonly options: OgeLiveAnnouncerOptions = {}) {
    this.delay = options.delay ?? 100;
    this.clearAfter = options.clearAfter ?? 5000;
    this.dedupeWindow = options.dedupeWindow ?? 1000;
  }

  /**
   * Speaks `message` through the polite (default) or assertive region. Empty
   * messages and calls without a document are ignored.
   */
  announce(
    message: string,
    options?: OgeLiveAnnounceOptions | OgeLivePoliteness,
  ): void {
    const opts: OgeLiveAnnounceOptions =
      typeof options === 'string' ? { politeness: options } : (options ?? {});
    const text = message.trim();
    if (!text || this.destroyed) return;
    const doc = this.doc();
    if (!doc) return;
    const mode = opts.politeness ?? 'polite';
    const region = this.regions[mode];
    if (region.pending === text) return;
    if (
      region.pending === null &&
      region.current === text &&
      Date.now() - region.writtenAt < this.dedupeWindow
    ) {
      return;
    }
    this.cancelTimers(region);
    const clearAfter = opts.clearAfter ?? this.clearAfter;
    const write = (): void => {
      region.writeTimer = null;
      region.pending = null;
      if (this.destroyed) return;
      // the host may have replaced <body> (test teardown, SPA shells)
      const target = this.regionElement(doc, mode);
      target.textContent = text;
      region.current = text;
      region.writtenAt = Date.now();
      region.clearTimer = setTimeout(() => {
        region.clearTimer = null;
        target.textContent = '';
        region.current = null;
      }, clearAfter);
    };
    const delay = opts.delay ?? this.delay;
    if (delay <= 0) {
      // the caller ran its own clear-then-wait (the toast engine does)
      write();
      return;
    }
    this.regionElement(doc, mode).textContent = '';
    region.current = null;
    region.pending = text;
    region.writeTimer = setTimeout(write, delay);
  }

  /** Empties one region (or both) and drops anything still pending. */
  clear(politeness?: OgeLivePoliteness): void {
    const modes: OgeLivePoliteness[] = politeness
      ? [politeness]
      : ['polite', 'assertive'];
    for (const mode of modes) {
      const region = this.regions[mode];
      this.cancelTimers(region);
      region.pending = null;
      region.current = null;
      if (region.el) region.el.textContent = '';
    }
  }

  /** Whether `destroy()` ran — a destroyed announcer ignores every call. */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /** Clears timers and removes the regions this instance created. */
  destroy(): void {
    this.clear();
    this.destroyed = true;
    for (const region of Object.values(this.regions)) {
      region.el?.remove();
      region.el = null;
    }
  }

  private doc(): Document | null {
    if (this.options.document !== undefined) return this.options.document;
    return typeof document === 'undefined' ? null : document;
  }

  private cancelTimers(region: RegionState): void {
    if (region.writeTimer !== null) clearTimeout(region.writeTimer);
    if (region.clearTimer !== null) clearTimeout(region.clearTimer);
    region.writeTimer = null;
    region.clearTimer = null;
  }

  /** The region element, reused from the document or created on demand. */
  private regionElement(doc: Document, mode: OgeLivePoliteness): HTMLElement {
    const region = this.regions[mode];
    if (region.el?.isConnected) return region.el;
    const existing = doc.querySelector<HTMLElement>(
      `[${OGE_LIVE_ANNOUNCER_ATTR}="${mode}"]`,
    );
    if (existing) {
      region.el = existing;
      return existing;
    }
    const el = doc.createElement('div');
    el.className = OGE_LIVE_ANNOUNCER_CLASS;
    el.setAttribute(OGE_LIVE_ANNOUNCER_ATTR, mode);
    // aria-live alone, no `status`/`alert` role: the regions are plumbing,
    // not landmarks a page's own status messages should be confused with
    el.setAttribute('aria-live', mode);
    el.setAttribute('aria-atomic', 'true');
    Object.assign(el.style, VISUALLY_HIDDEN);
    (doc.body ?? doc.documentElement).appendChild(el);
    region.el = el;
    return el;
  }
}

const shared = new WeakMap<Document, OgeLiveAnnouncerCore>();
let inert: OgeLiveAnnouncerCore | null = null;

/**
 * The shared announcer of `doc` (default: the global document). Without a
 * document (SSR) it returns an inert instance whose calls are no-ops, so
 * callers never need a platform check.
 */
export function getOgeLiveAnnouncer(
  doc?: Document | null,
): OgeLiveAnnouncerCore {
  const target =
    doc === undefined
      ? typeof document === 'undefined'
        ? null
        : document
      : doc;
  if (!target) {
    inert ??= new OgeLiveAnnouncerCore({ document: null });
    return inert;
  }
  let announcer = shared.get(target);
  if (!announcer || announcer.isDestroyed) {
    announcer = new OgeLiveAnnouncerCore({ document: target });
    shared.set(target, announcer);
  }
  return announcer;
}
