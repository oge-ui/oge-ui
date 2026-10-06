/**
 * Framework-free half of the context menu (ADR 0001): which element a
 * request targets (selector delegation), where the menu opens, and the
 * cancelable `opening` pipeline that may swap the items per target. Both
 * render layers call `ogeResolveContextMenuOpen` from their `contextmenu` /
 * keyboard handlers and imperative `open()`; the menu itself is the shared
 * menu-list machine inside an anchored panel.
 */

import type { OgeMenuItem } from '../menu/menu-types';

/**
 * Cancelable pre-event of a context menu, fired for every open request
 * (right-click, <kbd>Shift+F10</kbd> / menu key, imperative `open()`).
 * Handlers may replace `items` to build the menu for this `target`.
 */
export interface OgeContextMenuOpeningEvent {
  /**
   * The element the menu is for: the host, or — with a selector `target` —
   * the closest matching element inside it (a row, a card).
   */
  readonly target: Element;
  /** Items the menu will show; assign a new array to build them per target. */
  items: readonly OgeMenuItem[];
  /** Set `true` to keep the menu closed (the browser menu stays suppressed). */
  cancel: boolean;
  /** The originating DOM event; `null` for `open(x, y)`. */
  readonly event: Event | null;
}

/** A viewport point (client coordinates). */
export interface OgeContextMenuPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Pointer location of a `contextmenu` event, or `null` for one the keyboard
 * synthesized (`detail === 0`, or a 0/0 position) — those anchor to the
 * target element instead of a stale pointer position.
 */
export function ogeContextMenuPoint(event: {
  readonly detail: number;
  readonly clientX: number;
  readonly clientY: number;
}): OgeContextMenuPoint | null {
  if (event.detail === 0 || (event.clientX === 0 && event.clientY === 0)) {
    return null;
  }
  return { x: event.clientX, y: event.clientY };
}

/**
 * The element a request inside `host` targets. Without a `selector` it is
 * the host itself; with one it is the closest element matching it between
 * the event target and the host (the host included) — `null` when the
 * request landed outside every match, so the browser menu stays in charge.
 * An invalid selector never throws; it matches nothing.
 */
export function ogeContextMenuTarget(
  host: Element,
  eventTarget: EventTarget | null,
  selector: string | null | undefined,
): Element | null {
  if (!selector) return host;
  const start =
    eventTarget && (eventTarget as Node).nodeType === 1
      ? (eventTarget as Element)
      : ((eventTarget as Node | null)?.parentElement ?? null);
  if (!start || !host.contains(start)) return null;
  let match: Element | null;
  try {
    match = start.closest(selector);
  } catch {
    return null;
  }
  return match && host.contains(match) ? match : null;
}

/**
 * Where an imperative `open(x, y)` / `open(event)` request lands, for the
 * selector delegation: the candidate (an event's target) when it lies inside
 * the host, else whatever is under `point` inside the host, else the host.
 */
export function ogeContextMenuApiTarget(
  host: Element,
  candidate: EventTarget | null,
  point: OgeContextMenuPoint | null,
): EventTarget {
  if (candidate && host.contains(candidate as Node)) return candidate;
  if (
    point &&
    typeof document !== 'undefined' &&
    typeof document.elementFromPoint === 'function'
  ) {
    const hit = document.elementFromPoint(point.x, point.y);
    if (hit && host.contains(hit)) return hit;
  }
  return host;
}

export interface OgeContextMenuOpenRequest {
  /** The element carrying the context menu. */
  host: Element;
  /** Where the request landed (`event.target`); the host for `open(x, y)`. */
  eventTarget: EventTarget | null;
  /** Optional CSS selector delegating the menu to matches inside the host. */
  selector?: string | null;
  /** The configured items. */
  items: readonly OgeMenuItem[];
  /** Whether the menu is disabled. */
  disabled?: boolean;
  /** The originating DOM event; `null` for `open(x, y)`. */
  event: Event | null;
  /** Emits the cancelable `opening` event (handlers may swap `items`). */
  emitOpening?: (event: OgeContextMenuOpeningEvent) => void;
}

/**
 * Outcome of an open request: `'open'` (show these items for this target),
 * `'cancelled'` (an `opening` handler vetoed — suppress the browser menu but
 * show nothing) or `'ignored'` (disabled, outside every selector match or no
 * items — leave the browser menu in charge).
 */
export type OgeContextMenuOpenResult =
  | {
      readonly kind: 'open';
      /** The element the menu is for — anchor, outside-click owner, focus return. */
      readonly target: Element;
      /** The items to show (possibly replaced by an `opening` handler). */
      readonly items: readonly OgeMenuItem[];
    }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'ignored' };

/**
 * Decides an open request: resolves the target (selector delegation), runs
 * the cancelable `opening` event — whose handler may swap the items, so an
 * empty configured list can still be built per target — and reports what the
 * caller should do.
 */
export function ogeResolveContextMenuOpen(
  request: OgeContextMenuOpenRequest,
): OgeContextMenuOpenResult {
  if (request.disabled) return { kind: 'ignored' };
  const target = ogeContextMenuTarget(
    request.host,
    request.eventTarget,
    request.selector,
  );
  if (!target) return { kind: 'ignored' };
  const opening: OgeContextMenuOpeningEvent = {
    target,
    items: request.items,
    cancel: false,
    event: request.event,
  };
  request.emitOpening?.(opening);
  if (opening.cancel) return { kind: 'cancelled' };
  if (opening.items.length === 0) return { kind: 'ignored' };
  return { kind: 'open', target, items: opening.items };
}
