/**
 * Touch swipe-to-open / swipe-to-close for the drawer (`swipeEnabled`),
 * shared by both render layers.
 *
 * - **Touch only.** Mouse and pen never swipe a drawer; they have the
 *   trigger, the backdrop and Escape.
 * - **Edge swipe opens.** While closed, a swipe has to start within
 *   {@link OGE_DRAWER_SWIPE_EDGE} px of the drawer's edge and travel away
 *   from it; while open, a swipe anywhere on the drawer toward the edge
 *   closes it.
 * - **Distance or velocity.** The gesture commits past
 *   {@link ogeDrawerSwipeDistance} along the drawer's axis, or on a flick
 *   faster than {@link OGE_DRAWER_SWIPE_VELOCITY} px/ms.
 * - **Wrong axis lets go.** A gesture that moves more across the axis than
 *   along it cancels itself, so the content keeps scrolling — which is why
 *   it runs with `touchLock: false` and the stylesheet declares the allowed
 *   pan (`touch-action: pan-y` for side drawers).
 * - **Logical edges.** `start` / `end` resolve against the direction
 *   (`ogeResolveDirection`), so an RTL page swipes from the right.
 *
 * The panel snaps on release — it does not track the finger — so reduced
 * motion needs nothing beyond the drawer's own CSS. Opening and closing go
 * through the drawer's ordinary pipelines (`opening`, `closing`,
 * `closeGuard`); a swipe close reports reason `'swipe'`.
 */
import {
  OGE_GESTURE_THRESHOLD,
  beginPointerGesture,
  type OgePointerGestureHandle,
  type OgePointerGestureInput,
} from '../gesture/pointer-gesture';
import type { OgeDirection } from '../a11y/direction';
import type { OgeDrawerPosition } from './drawer-core';

/** Width (px) of the strip along the edge an opening swipe must start in. */
export const OGE_DRAWER_SWIPE_EDGE = 24;

/** Flick speed (px/ms) that commits a swipe regardless of its distance. */
export const OGE_DRAWER_SWIPE_VELOCITY = 0.4;

/** The screen edge a drawer is attached to, after resolving the direction. */
export type OgeDrawerPhysicalEdge = 'left' | 'right' | 'top' | 'bottom';

/** `start` / `end` mapped onto the screen for this direction. */
export function ogeDrawerPhysicalEdge(
  position: OgeDrawerPosition,
  direction: OgeDirection,
): OgeDrawerPhysicalEdge {
  if (position === 'top' || position === 'bottom') return position;
  const startIsLeft = direction !== 'rtl';
  if (position === 'start') return startIsLeft ? 'left' : 'right';
  return startIsLeft ? 'right' : 'left';
}

/**
 * Side a mini-rail tooltip opens on: away from the edge the drawer hugs, so
 * it never covers the rail itself.
 */
export function ogeDrawerRailTooltipPlacement(
  edge: OgeDrawerPhysicalEdge,
): 'left' | 'right' | 'top' | 'bottom' {
  switch (edge) {
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
  }
}

/** Distance (px) a swipe has to travel: a third of the panel, 40–96 px. */
export function ogeDrawerSwipeDistance(panelSize: number): number {
  const size = Number.isFinite(panelSize) && panelSize > 0 ? panelSize : 240;
  return Math.max(40, Math.min(96, size / 3));
}

/** Movement along the opening direction (positive = away from the edge). */
export function ogeDrawerSwipeAlong(
  edge: OgeDrawerPhysicalEdge,
  dx: number,
  dy: number,
): { along: number; across: number } {
  switch (edge) {
    case 'left':
      return { along: dx, across: dy };
    case 'right':
      return { along: -dx, across: dy };
    case 'top':
      return { along: dy, across: dx };
    case 'bottom':
      return { along: -dy, across: dx };
  }
}

/**
 * Whether a touch at `point` may start a swipe: anywhere on the drawer while
 * it is open, only inside the edge strip of `rect` while it is closed.
 */
export function ogeDrawerSwipeStarts(input: {
  edge: OgeDrawerPhysicalEdge;
  opened: boolean;
  point: { x: number; y: number };
  rect: { left: number; top: number; right: number; bottom: number };
  edgeZone?: number;
}): boolean {
  if (input.opened) return true;
  const zone = input.edgeZone ?? OGE_DRAWER_SWIPE_EDGE;
  const { point, rect } = input;
  switch (input.edge) {
    case 'left':
      return point.x - rect.left <= zone;
    case 'right':
      return rect.right - point.x <= zone;
    case 'top':
      return point.y - rect.top <= zone;
    case 'bottom':
      return rect.bottom - point.y <= zone;
  }
}

/**
 * What a finished swipe means: `'open'` / `'close'`, or `null` when it was
 * too short, too slow, on the wrong axis or in the wrong direction for the
 * current state.
 */
export function ogeDrawerSwipeOutcome(input: {
  edge: OgeDrawerPhysicalEdge;
  opened: boolean;
  dx: number;
  dy: number;
  /** Speed along the opening direction at release, px/ms (signed). */
  velocity: number;
  panelSize: number;
}): 'open' | 'close' | null {
  const { along, across } = ogeDrawerSwipeAlong(input.edge, input.dx, input.dy);
  if (Math.abs(across) > Math.abs(along)) return null;
  const distance = ogeDrawerSwipeDistance(input.panelSize);
  const flick = OGE_GESTURE_THRESHOLD * 4;
  if (!input.opened) {
    const far = along >= distance;
    const fast = along >= flick && input.velocity >= OGE_DRAWER_SWIPE_VELOCITY;
    return far || fast ? 'open' : null;
  }
  const far = -along >= distance;
  const fast = -along >= flick && -input.velocity >= OGE_DRAWER_SWIPE_VELOCITY;
  return far || fast ? 'close' : null;
}

/** Options of {@link beginOgeDrawerSwipe}. */
export interface OgeDrawerSwipeOptions {
  edge: OgeDrawerPhysicalEdge;
  opened: boolean;
  /** The drawer host's box (`getBoundingClientRect()`). */
  rect: { left: number; top: number; right: number; bottom: number };
  /** The open panel's size along its axis, px. */
  panelSize: number;
  onOpen(): void;
  onClose(): void;
  /** Clock in ms — injectable for specs. Default `performance.now()`. */
  now?: () => number;
}

/**
 * Starts a swipe from a `pointerdown`, or returns `null` when the press is
 * not a touch or does not start where a swipe may (see
 * {@link ogeDrawerSwipeStarts}). Runs on `beginPointerGesture` without the
 * touch lock, never `preventDefault`s the press (taps still click), and
 * cancels itself as soon as the movement turns out to be a cross-axis scroll.
 */
export function beginOgeDrawerSwipe(
  event: OgePointerGestureInput,
  options: OgeDrawerSwipeOptions,
): OgePointerGestureHandle | null {
  if (event.pointerType !== 'touch') return null;
  if (
    !ogeDrawerSwipeStarts({
      edge: options.edge,
      opened: options.opened,
      point: { x: event.clientX, y: event.clientY },
      rect: options.rect,
    })
  ) {
    return null;
  }
  const now =
    options.now ??
    (() =>
      typeof performance !== 'undefined' ? performance.now() : Date.now());
  let lastAlong = 0;
  let lastTime = now();
  let velocity = 0;
  let dx = 0;
  let dy = 0;
  let decided = false;
  const handle = beginPointerGesture(event, {
    preventDefault: false,
    touchAction: false,
    touchLock: false,
    onMove(deltaX, deltaY) {
      dx = deltaX;
      dy = deltaY;
      const { along, across } = ogeDrawerSwipeAlong(options.edge, dx, dy);
      if (!decided) {
        decided = true;
        if (Math.abs(across) > Math.abs(along)) {
          handle.cancel();
          return;
        }
      }
      const time = now();
      const elapsed = time - lastTime;
      if (elapsed > 0) {
        // a light exponential smoothing — one jittery sample must not flick
        const sample = (along - lastAlong) / elapsed;
        velocity = velocity === 0 ? sample : velocity * 0.4 + sample * 0.6;
      }
      lastAlong = along;
      lastTime = time;
    },
    onFinish(commit) {
      if (!commit) return;
      const outcome = ogeDrawerSwipeOutcome({
        edge: options.edge,
        opened: options.opened,
        dx,
        dy,
        velocity,
        panelSize: options.panelSize,
      });
      if (outcome === 'open') options.onOpen();
      else if (outcome === 'close') options.onClose();
    },
  });
  return handle;
}
