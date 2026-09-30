/**
 * Fixed-height card windowing, one independent window per column cell.
 * Fixed `cardHeight` keeps this to arithmetic (no offset tree needed) and
 * is what makes drag hit-testing agree with what is rendered. Pure.
 */

export interface KanbanColumnWindow {
  /** First rendered card index (inclusive). */
  readonly start: number;
  /** Last rendered card index (exclusive). */
  readonly end: number;
  /** translateY for the rendered block. */
  readonly offsetY: number;
  /** Total scrollable content height (spacer). */
  readonly totalHeight: number;
}

/** The window over one cell's cards; `gap` is the inter-card margin. */
export function computeColumnWindow(
  scrollTop: number,
  viewportHeight: number,
  count: number,
  cardHeight: number,
  gap = 0,
  overscan = 3,
): KanbanColumnWindow {
  const slot = cardHeight + gap;
  const totalHeight = count > 0 ? count * slot - gap : 0;
  if (count === 0 || viewportHeight <= 0 || slot <= 0) {
    return { start: 0, end: count, offsetY: 0, totalHeight };
  }
  const clampedTop = Math.min(
    Math.max(0, scrollTop),
    Math.max(0, totalHeight - viewportHeight),
  );
  const firstVisible = Math.floor(clampedTop / slot);
  const lastVisible = Math.floor((clampedTop + viewportHeight) / slot);
  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(count, lastVisible + 1 + overscan);
  return { start, end, offsetY: start * slot, totalHeight };
}
