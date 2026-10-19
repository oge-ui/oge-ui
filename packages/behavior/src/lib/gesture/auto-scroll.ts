/**
 * Edge auto-scroll for drags: while the pointer rests inside an edge band of
 * a scroll container, the container scrolls toward that edge, faster the
 * deeper the pointer sits in the band. An rAF loop independent of pointer
 * events, so the container keeps scrolling while the pointer is still.
 */

/** Edge band width (px) where auto-scroll starts. */
export const OGE_AUTO_SCROLL_EDGE = 48;

/** Top auto-scroll speed (px per frame) at the container boundary. */
export const OGE_AUTO_SCROLL_MAX_SPEED = 24;

/**
 * Signed auto-scroll velocity (px per frame) for a pointer at `pos` inside
 * `[min, max]`: 0 outside the `edge` bands, ramping quadratically to
 * ±`maxSpeed` at the boundary. Quadratic, so the ramp feels gentle until
 * the pointer is truly at the edge. A container narrower than both bands
 * never scrolls (there is no neutral zone to rest in).
 */
export function ogeEdgeScrollVelocity(
  pos: number,
  min: number,
  max: number,
  edge = OGE_AUTO_SCROLL_EDGE,
  maxSpeed = OGE_AUTO_SCROLL_MAX_SPEED,
): number {
  if (max - min <= 2 * edge) return 0;
  if (pos < min + edge) {
    const t = Math.min(1, Math.max(0, (min + edge - pos) / edge));
    return -maxSpeed * t * t;
  }
  if (pos > max - edge) {
    const t = Math.min(1, Math.max(0, (pos - (max - edge)) / edge));
    return maxSpeed * t * t;
  }
  return 0;
}

/** Options of {@link createAutoScroller}. */
export interface OgeAutoScrollOptions {
  /** Which axes may scroll. Default `'both'`. */
  axis?: 'x' | 'y' | 'both';
  /** Edge band width in px. Default {@link OGE_AUTO_SCROLL_EDGE}. */
  edge?: number;
  /** Top speed in px per frame. Default {@link OGE_AUTO_SCROLL_MAX_SPEED}. */
  maxSpeed?: number;
  /** Called after every frame that actually scrolled (re-run hit-tests here). */
  onScroll?(): void;
}

/** A running auto-scroller; feed it pointer positions, stop it at drop. */
export interface OgeAutoScroller {
  /** The pointer moved: starts (or keeps) the loop while inside an edge band. */
  update(clientX: number, clientY: number): void;
  /** Stops the loop; later `update()` calls start it again. */
  stop(): void;
}

const raf = (cb: () => void): number =>
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(cb)
    : (setTimeout(cb, 16) as unknown as number);
const caf = (id: number): void => {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
};

/**
 * Creates an edge auto-scroller for `container`. Horizontal edges are
 * visual, so the loop works unchanged in RTL (`scrollLeft` grows toward the
 * visual right in every engine's current RTL model).
 */
export function createAutoScroller(
  container: HTMLElement,
  options: OgeAutoScrollOptions = {},
): OgeAutoScroller {
  const axis = options.axis ?? 'both';
  const edge = options.edge ?? OGE_AUTO_SCROLL_EDGE;
  const maxSpeed = options.maxSpeed ?? OGE_AUTO_SCROLL_MAX_SPEED;
  let x = 0;
  let y = 0;
  let frame: number | null = null;

  const doc = container.ownerDocument;
  // the page scroller's own box is the whole document — its edges are the viewport's
  const isPage =
    !!doc &&
    (container === doc.scrollingElement ||
      container === doc.documentElement ||
      container === doc.body);
  const velocity = (): { vx: number; vy: number } => {
    const rect = isPage
      ? {
          left: 0,
          top: 0,
          right: doc.defaultView?.innerWidth ?? 0,
          bottom: doc.defaultView?.innerHeight ?? 0,
        }
      : container.getBoundingClientRect();
    return {
      vx:
        axis === 'y'
          ? 0
          : ogeEdgeScrollVelocity(x, rect.left, rect.right, edge, maxSpeed),
      vy:
        axis === 'x'
          ? 0
          : ogeEdgeScrollVelocity(y, rect.top, rect.bottom, edge, maxSpeed),
    };
  };

  const tick = (): void => {
    frame = null;
    const { vx, vy } = velocity();
    if (vx === 0 && vy === 0) return;
    const left = container.scrollLeft;
    const top = container.scrollTop;
    if (vx !== 0) container.scrollLeft = left + vx;
    if (vy !== 0) container.scrollTop = top + vy;
    if (container.scrollLeft !== left || container.scrollTop !== top)
      options.onScroll?.();
    frame = raf(tick);
  };

  return {
    update(clientX: number, clientY: number): void {
      x = clientX;
      y = clientY;
      if (frame !== null) return;
      const { vx, vy } = velocity();
      if (vx !== 0 || vy !== 0) frame = raf(tick);
    },
    stop(): void {
      if (frame !== null) caf(frame);
      frame = null;
    },
  };
}

/**
 * The element that scrolls `element` — the nearest ancestor whose overflow
 * scrolls and that has something to scroll, else the page scroller. Feed it
 * to {@link createAutoScroller} for drags that may leave the visible area.
 */
export function ogeScrollParent(element: Element): HTMLElement | null {
  const doc = element.ownerDocument;
  const view = doc?.defaultView;
  if (!doc || !view) return null;
  for (
    let node = element.parentElement;
    node && node !== doc.body && node !== doc.documentElement;
    node = node.parentElement
  ) {
    const style = view.getComputedStyle(node);
    const scrolls = (value: string) => value === 'auto' || value === 'scroll';
    if (
      (scrolls(style.overflowY) && node.scrollHeight > node.clientHeight) ||
      (scrolls(style.overflowX) && node.scrollWidth > node.clientWidth)
    )
      return node;
  }
  return (doc.scrollingElement as HTMLElement | null) ?? doc.documentElement;
}
