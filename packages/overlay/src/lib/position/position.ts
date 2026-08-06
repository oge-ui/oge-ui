/** Side of the anchor the panel prefers. */
export type OgePopupSide = 'top' | 'bottom' | 'left' | 'right';

/** Logical alignment along the anchor's edge; RTL-aware for horizontal edges. */
export type OgePopupAlign = 'start' | 'end' | 'center';

/**
 * Preferred panel placement relative to the anchor. A bare side (`'top'`)
 * centers the panel along that edge — the natural placement for tooltips.
 */
export type OgePopupPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end';

/** Minimal rectangle — structurally compatible with `DOMRect`. */
export interface OgeRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface OgePopupPositionRequest {
  anchor: OgeRect;
  panel: { width: number; height: number };
  viewport: { width: number; height: number };
  placement: OgePopupPlacement;
  /** Gap between anchor and panel on the main axis. Default `4`. */
  offset?: number;
  /** Minimum distance kept from viewport edges when clamping. Default `8`. */
  viewportPadding?: number;
  /** Resolves logical `start`/`end` (and `left`/`right` sides) against RTL. Default `false`. */
  rtl?: boolean;
}

export interface OgeResolvedPopupPosition {
  /** Viewport-relative — apply with `position: fixed`. */
  top: number;
  left: number;
  /** Logical placement actually used after flipping. */
  placement: OgePopupPlacement;
  /** Panel width when the caller requested anchor-width matching or a fixed width. */
  width?: number;
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

function oppositeAlign(align: OgePopupAlign): OgePopupAlign {
  if (align === 'center') return 'center';
  return align === 'start' ? 'end' : 'start';
}

/** Total pixels a coordinate span sticks out of `[padding, limit - size - padding]`. */
function overflow(
  coord: number,
  size: number,
  limit: number,
  padding: number,
): number {
  return (
    Math.max(0, padding - coord) + Math.max(0, coord + size - (limit - padding))
  );
}

/**
 * Pure anchored-popup placement: preferred side with flip when the opposite
 * side has more room, cross-axis alignment fallback, and a final clamp into
 * the viewport. Coordinates are viewport-relative (`position: fixed`).
 */
export function resolvePopupPosition(
  req: OgePopupPositionRequest,
): OgeResolvedPopupPosition {
  const { anchor, panel, viewport } = req;
  const offset = req.offset ?? 4;
  const padding = req.viewportPadding ?? 8;
  const rtl = req.rtl ?? false;
  const [side, align = 'center'] = req.placement.split('-') as [
    OgePopupSide,
    OgePopupAlign | undefined,
  ];
  const horizontal = side === 'left' || side === 'right';

  // Logical → physical: RTL swaps left/right *sides*, and start/end along
  // horizontal edges. Vertical alignment (left/right sides) is unaffected.
  let physSide: OgePopupSide = horizontal && rtl ? oppositeSide(side) : side;
  const physAlign: OgePopupAlign =
    !horizontal && rtl ? oppositeAlign(align) : align;

  const anchorBottom = anchor.top + anchor.height;
  const anchorRight = anchor.left + anchor.width;

  // --- main axis (with flip) ---
  let flipped = false;
  if (!horizontal) {
    const spaceBelow = viewport.height - anchorBottom - offset - padding;
    const spaceAbove = anchor.top - offset - padding;
    const pref = physSide === 'bottom' ? spaceBelow : spaceAbove;
    const opp = physSide === 'bottom' ? spaceAbove : spaceBelow;
    if (panel.height > pref && opp > pref) {
      physSide = oppositeSide(physSide);
      flipped = true;
    }
  } else {
    const spaceRight = viewport.width - anchorRight - offset - padding;
    const spaceLeft = anchor.left - offset - padding;
    const pref = physSide === 'right' ? spaceRight : spaceLeft;
    const opp = physSide === 'right' ? spaceLeft : spaceRight;
    if (panel.width > pref && opp > pref) {
      physSide = oppositeSide(physSide);
      flipped = true;
    }
  }

  // --- coordinates ---
  let top: number;
  let left: number;
  let alignFlipped = false;

  if (!horizontal) {
    top =
      physSide === 'bottom'
        ? anchorBottom + offset
        : anchor.top - offset - panel.height;
    if (physAlign === 'center') {
      // Centered placements never swap alignment — the final clamp shifts
      // them into the viewport instead.
      left = anchor.left + (anchor.width - panel.width) / 2;
    } else {
      const startLeft = anchor.left;
      const endLeft = anchorRight - panel.width;
      const preferred = physAlign === 'start' ? startLeft : endLeft;
      const fallback = physAlign === 'start' ? endLeft : startLeft;
      const prefOverflow = overflow(
        preferred,
        panel.width,
        viewport.width,
        padding,
      );
      if (
        prefOverflow > 0 &&
        overflow(fallback, panel.width, viewport.width, padding) < prefOverflow
      ) {
        left = fallback;
        alignFlipped = true;
      } else {
        left = preferred;
      }
    }
  } else {
    left =
      physSide === 'right'
        ? anchorRight + offset
        : anchor.left - offset - panel.width;
    if (physAlign === 'center') {
      top = anchor.top + (anchor.height - panel.height) / 2;
    } else {
      const startTop = anchor.top;
      const endTop = anchorBottom - panel.height;
      const preferred = physAlign === 'start' ? startTop : endTop;
      const fallback = physAlign === 'start' ? endTop : startTop;
      const prefOverflow = overflow(
        preferred,
        panel.height,
        viewport.height,
        padding,
      );
      if (
        prefOverflow > 0 &&
        overflow(fallback, panel.height, viewport.height, padding) <
          prefOverflow
      ) {
        top = fallback;
        alignFlipped = true;
      } else {
        top = preferred;
      }
    }
  }

  // --- clamp (lower bound wins when the panel is larger than the viewport) ---
  top = Math.max(
    padding,
    Math.min(top, viewport.height - panel.height - padding),
  );
  left = Math.max(
    padding,
    Math.min(left, viewport.width - panel.width - padding),
  );

  const finalSide = flipped ? oppositeSide(side) : side;
  const finalAlign = alignFlipped ? oppositeAlign(align) : align;
  return {
    top,
    left,
    placement:
      finalAlign === 'center' ? finalSide : `${finalSide}-${finalAlign}`,
  };
}
