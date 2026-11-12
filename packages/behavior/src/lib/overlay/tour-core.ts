import {
  resolvePopupPosition,
  type OgePopupPlacement,
  type OgeRect,
} from './position';
import { motionScrollBehavior } from '../a11y/motion';

/**
 * The tour's framework-free half: target lookup, the spotlight and card
 * geometry, the step keys and the reduced-motion scroll. Both render layers
 * hold the open state and the step index themselves and drive the modal
 * surface through `OgeActionSheetCore` (the shared dialog shell).
 */

/** One step of a tour. */
export interface OgeTourStep {
  /**
   * What the step points at: a CSS selector, an element, or a function that
   * returns one. Without a target — or when it is missing or hidden — the
   * card is centered over a plain backdrop.
   */
  readonly target?: string | Element | (() => Element | null);
  /** Heading of the card — also the dialog's accessible name. */
  readonly title: string;
  /** Body text of the card (the dialog's description). */
  readonly content?: string;
  /** Where the card sits around the target (default `'bottom'`; flips to fit). */
  readonly placement?: OgePopupPlacement;
  /** Space between the target and the spotlight's edge, in px (default 6). */
  readonly padding?: number;
}

/** Why a tour closed. */
export type OgeTourCloseReason =
  'done' | 'skip' | 'escape' | 'backdrop' | 'api';

/** Payload of the tour's `closed` event. */
export interface OgeTourClosedEvent {
  readonly reason: OgeTourCloseReason;
  /** The step that was showing (0-based). */
  readonly step: number;
}

/** The element a step points at, or `null` when it is missing or not rendered. */
export function ogeTourResolveTarget(
  target: OgeTourStep['target'],
  doc: Document | null | undefined,
): Element | null {
  if (!target || !doc) return null;
  let element: Element | null = null;
  if (typeof target === 'string') {
    try {
      element = doc.querySelector(target);
    } catch {
      return null; // not a valid selector
    }
  } else if (typeof target === 'function') {
    element = target();
  } else {
    element = target;
  }
  if (!element?.isConnected) return null;
  const rect = element.getBoundingClientRect();
  // display: none (or detached layout) — nothing to point at
  return rect.width === 0 && rect.height === 0 ? null : element;
}

/**
 * The spotlight around a target rect: grown by `padding`, then clipped to the
 * viewport. `null` without a target or when it lies entirely off screen.
 */
export function ogeTourSpotlight(
  rect: OgeRect | null,
  padding: number,
  viewport: { width: number; height: number },
): OgeRect | null {
  if (!rect) return null;
  const top = Math.max(0, rect.top - padding);
  const left = Math.max(0, rect.left - padding);
  const bottom = Math.min(viewport.height, rect.top + rect.height + padding);
  const right = Math.min(viewport.width, rect.left + rect.width + padding);
  if (bottom <= top || right <= left) return null;
  return { top, left, width: right - left, height: bottom - top };
}

/** Where the card goes: next to the spotlight, or centered without one. */
export interface OgeTourCardPosition {
  readonly top: number;
  readonly left: number;
  /** The placement used after flipping; `null` when centered. */
  readonly placement: OgePopupPlacement | null;
}

/** Positions the card around the spotlight (flipping and clamping like every popup). */
export function ogeTourCardPosition(
  spotlight: OgeRect | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  placement: OgePopupPlacement = 'bottom',
  rtl = false,
): OgeTourCardPosition {
  if (!spotlight) {
    return {
      top: Math.max(8, (viewport.height - card.height) / 2),
      left: Math.max(8, (viewport.width - card.width) / 2),
      placement: null,
    };
  }
  const resolved = resolvePopupPosition({
    anchor: spotlight,
    panel: card,
    viewport,
    placement,
    offset: 12,
    viewportPadding: 12,
    rtl,
  });
  return {
    top: resolved.top,
    left: resolved.left,
    placement: resolved.placement,
  };
}

/** Whether a rect lies fully inside the viewport. */
export function ogeTourIsInView(
  rect: OgeRect,
  viewport: { width: number; height: number },
): boolean {
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.top + rect.height <= viewport.height &&
    rect.left + rect.width <= viewport.width
  );
}

/**
 * Brings a step's target into view — centered, smoothly unless the user
 * prefers reduced motion. A target already fully visible stays put.
 */
export function ogeTourReveal(element: Element | null): void {
  if (!element) return;
  const win = element.ownerDocument.defaultView;
  if (!win) return;
  const viewport = { width: win.innerWidth, height: win.innerHeight };
  if (ogeTourIsInView(element.getBoundingClientRect(), viewport)) return;
  element.scrollIntoView?.({
    block: 'center',
    inline: 'nearest',
    behavior: motionScrollBehavior(),
  });
}

/** The step keys: → next, ← back (mirrored in RTL). `null` for anything else. */
export function ogeTourKeyIntent(
  event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey'>,
  rtl = false,
): 'next' | 'previous' | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === 'ArrowRight') return rtl ? 'previous' : 'next';
  if (event.key === 'ArrowLeft') return rtl ? 'next' : 'previous';
  return null;
}

/** The step index clamped to the steps (`0` for an empty tour). */
export function ogeTourClampStep(step: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(0, Math.trunc(step) || 0), count - 1);
}
