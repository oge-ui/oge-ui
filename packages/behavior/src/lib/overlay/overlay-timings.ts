/**
 * Behavioral timing/geometry defaults of the anchored overlay primitives,
 * shared by every render layer (ADR 0001) so a menu cannot feel different in
 * React than it does in Angular. The Angular `OGE_DEFAULT_OVERLAY_CONFIG`
 * spreads these; the React overlay's config context reads them directly.
 */
export interface OgeOverlayTimings {
  /** Gap between anchor and panel on the main axis. */
  offset: number;
  /** Minimum distance kept from viewport edges when clamping. */
  viewportPadding: number;
  /** Idle time after which the menu type-ahead buffer resets. */
  typeAheadMs: number;
  /** Hover dwell time before a submenu parent row opens its submenu. */
  menuShowDelayMs: number;
  /** Grace period before an open submenu closes after hovering a sibling. */
  menuHideDelayMs: number;
  /** Hover dwell time before a tooltip shows (focus shows immediately). */
  tooltipShowDelayMs: number;
  /** Grace period before a tooltip hides after the pointer leaves. */
  tooltipHideDelayMs: number;
}

export const OGE_DEFAULT_OVERLAY_TIMINGS: OgeOverlayTimings = {
  offset: 4,
  viewportPadding: 8,
  typeAheadMs: 500,
  menuShowDelayMs: 50,
  menuHideDelayMs: 300,
  tooltipShowDelayMs: 400,
  tooltipHideDelayMs: 100,
};
