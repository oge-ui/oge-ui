import type { OgePopupPlacement, OgePopupSide, OgeRect } from './position';

/**
 * Length of a callout arrow along the main axis, in px — how far its tip
 * reaches out of the panel edge. Hosts add it to the anchored panel's
 * `offset` while an arrow is shown, so the tip touches the gap instead of
 * the anchor.
 */
export const OGE_POPUP_ARROW_SIZE = 7;

/**
 * Where a callout arrow sits on a positioned panel: the panel edge that faces
 * the anchor (physical, after RTL and flipping) and the arrow centre's
 * distance from that edge's start (`left` for top/bottom edges, `top` for
 * left/right edges), in px.
 */
export interface OgePopupArrow {
  /** Panel edge carrying the arrow — the one facing the anchor. */
  side: OgePopupSide;
  /** Arrow centre along that edge, from its physical start, in px. */
  offset: number;
}

export interface OgePopupArrowRequest {
  /** Anchor rect, in the same coordinates as `panel`. */
  anchor: OgeRect;
  /** The positioned panel's rect (resolved `top`/`left` + measured size). */
  panel: OgeRect;
  /** The placement actually used (after flipping), as resolved. */
  placement: OgePopupPlacement;
  /** Resolves logical `left`/`right` sides against RTL. Default `false`. */
  rtl?: boolean;
  /**
   * Minimum distance kept between the arrow centre and the panel corners, so
   * the arrow never rides over a rounded corner. Default `12`.
   */
  edgePadding?: number;
}

function oppositeSide(side: OgePopupSide): OgePopupSide {
  switch (side) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

/**
 * Callout-arrow geometry shared by the popover and the tooltip (both render
 * layers): the arrow sits on the panel edge facing the anchor and points at
 * the anchor's centre, clamped inside the edge so it survives the viewport
 * clamp that shifted the panel. Pure — no DOM.
 */
export function resolvePopupArrow(req: OgePopupArrowRequest): OgePopupArrow {
  const { anchor, panel } = req;
  const padding = req.edgePadding ?? 12;
  const logicalSide = req.placement.split('-')[0] as OgePopupSide;
  const horizontal = logicalSide === 'left' || logicalSide === 'right';
  // The panel's physical side of the anchor; RTL swaps left/right sides the
  // same way `resolvePopupPosition` does.
  const panelSide: OgePopupSide =
    horizontal && req.rtl ? oppositeSide(logicalSide) : logicalSide;
  const side = oppositeSide(panelSide);
  const vertical = side === 'top' || side === 'bottom';
  const start = vertical ? panel.left : panel.top;
  const size = vertical ? panel.width : panel.height;
  const anchorCentre = vertical
    ? anchor.left + anchor.width / 2
    : anchor.top + anchor.height / 2;
  // A panel too small for both paddings centres the arrow.
  const min = Math.min(padding, size / 2);
  const max = Math.max(size - padding, size / 2);
  const offset = Math.min(max, Math.max(min, anchorCentre - start));
  return { side, offset };
}

/**
 * The inline coordinate an arrow element takes from its geometry: `left`
 * for an arrow on the top/bottom edge, `top` for one on the left/right edge
 * (the stylesheet supplies the other axis from `data-side`).
 */
export function popupArrowInset(arrow: OgePopupArrow): {
  left: number | null;
  top: number | null;
} {
  const vertical = arrow.side === 'top' || arrow.side === 'bottom';
  return {
    left: vertical ? arrow.offset : null,
    top: vertical ? null : arrow.offset,
  };
}
