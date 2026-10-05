/**
 * Dragging things into (and between) schedulers. A mounted scheduler
 * registers its host as a drop target; an external draggable
 * (`[ogeSchedulerDraggable]` / `useOgeSchedulerDraggable`) runs the shared
 * `beginPointerDragDrop` gesture, hit-tests the registered hosts under the
 * pointer and asks the innermost one for the slot there — the scheduler
 * previews it and, on release, builds an appointment through its normal
 * insert pipeline (`appointmentDropped`). An appointment dragged out of one
 * scheduler and released over another lands the same way.
 *
 * The keyboard and single-pointer twin (WCAG 2.1.1 / 2.5.7) runs the same
 * drop: Enter / Space on a draggable — or a click — "picks it up"
 * (announced), and the next Enter / click on a scheduler cell places it
 * there; Escape cancels. No HTML5 drag and drop anywhere (house rule).
 */
import {
  OGE_LONG_PRESS_DELAY,
  beginPointerDragDrop,
  getOgeLiveAnnouncer,
  type OgePointerGestureHandle,
  type OgePointerGestureInput,
} from '@oge-ui/behavior';

/** Where a drop lands inside a scheduler. */
export interface OgeSchedulerDropSlot {
  readonly startDate: Date;
  readonly allDay: boolean;
  /** The grouped resource values of the slot (`{}` ungrouped). */
  readonly resources: Readonly<Record<string, unknown>>;
}

/** What a drop carries: the item and how long it should last. */
export interface OgeSchedulerDragPayload {
  /** The external item (or the dragged appointment's item). */
  readonly data: unknown;
  /** Length in minutes; omitted = the scheduler's cell duration. */
  readonly durationMinutes?: number;
  /** A label for announcements (the item's subject). */
  readonly text?: string;
  /** The scheduler the payload came from (its own drops are moves, not adds). */
  readonly sourceHost?: Element | null;
}

/** A mounted scheduler's drop-target registration. */
export interface OgeSchedulerDropTarget {
  /** The scheduler host element. */
  readonly element: Element;
  /** The slot at a viewport point (`hit` = the element under it), or `null`. */
  resolve(clientX: number, clientY: number, hit: Element | null): OgeSchedulerDropSlot | null;
  /** Drives the drop preview (`null` clears it). */
  over(slot: OgeSchedulerDropSlot | null, payload: OgeSchedulerDragPayload | null): void;
  /** A committed drop; returns whether the item was added. */
  drop(payload: OgeSchedulerDragPayload, slot: OgeSchedulerDropSlot): boolean;
}

const targets = new Set<OgeSchedulerDropTarget>();

/** Registers a scheduler as a drop target; returns the unregister function. */
export function registerOgeSchedulerDropTarget(
  target: OgeSchedulerDropTarget,
): () => void {
  targets.add(target);
  return () => {
    targets.delete(target);
  };
}

/** The innermost registered scheduler containing `hit`, or `null`. */
export function findOgeSchedulerDropTarget(
  hit: Element | null,
): OgeSchedulerDropTarget | null {
  if (hit === null) return null;
  let best: OgeSchedulerDropTarget | null = null;
  for (const target of targets) {
    if (!target.element.contains(hit)) continue;
    if (best === null || best.element.contains(target.element)) best = target;
  }
  return best;
}

/**
 * Whether a released pointer lies outside a view's rect — a chip drag
 * released there is a drag-out, not a move. An unmeasured (zero-size) rect
 * never counts as outside (SSR, jsdom, a hidden host).
 */
export function isOgeSchedulerDragOut(
  rect: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly width: number;
    readonly height: number;
  },
  clientX: number,
  clientY: number,
): boolean {
  if (rect.width <= 0 && rect.height <= 0) return false;
  return (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  );
}

/* ---------- the keyboard / single-pointer twin ---------- */

let armed: OgeSchedulerDragPayload | null = null;
const armedListeners = new Set<(payload: OgeSchedulerDragPayload | null) => void>();

/** The payload picked up from the keyboard (or a click), if any. */
export function armedOgeSchedulerPayload(): OgeSchedulerDragPayload | null {
  return armed;
}

/**
 * Picks a payload up for the keyboard twin; `announcement` (built from the
 * scheduler catalog's `pickedUp`) is spoken politely. `null` cancels.
 */
export function armOgeSchedulerPayload(
  payload: OgeSchedulerDragPayload | null,
  announcement?: string,
): void {
  armed = payload;
  if (payload !== null && announcement) {
    getOgeLiveAnnouncer().announce(announcement);
  }
  for (const listener of armedListeners) listener(payload);
}

/** Takes (and clears) the armed payload — a scheduler cell placing it. */
export function takeArmedOgeSchedulerPayload(): OgeSchedulerDragPayload | null {
  const payload = armed;
  if (payload !== null) armOgeSchedulerPayload(null);
  return payload;
}

/** Follows the armed payload (draggables mark themselves "picked up"). */
export function onArmedOgeSchedulerPayload(
  listener: (payload: OgeSchedulerDragPayload | null) => void,
): () => void {
  armedListeners.add(listener);
  return () => {
    armedListeners.delete(listener);
  };
}

/* ---------- the pointer gesture ---------- */

/** Options of {@link beginOgeSchedulerExternalDrag}. */
export interface OgeSchedulerExternalDragOptions {
  readonly payload: OgeSchedulerDragPayload;
  /** The draggable element (pointer capture, the ghost). */
  readonly source: Element;
  /** Called once the drag started (past the threshold). */
  onStart?(): void;
  /** Called last; `dropped` when a scheduler accepted the item. */
  onEnd?(result: { readonly dropped: boolean; readonly cancelled: boolean }): void;
}

interface Hit {
  readonly target: OgeSchedulerDropTarget;
  readonly slot: OgeSchedulerDropSlot;
}

/**
 * Starts an external drag from a `pointerdown`: the shared drag-drop
 * gesture (ghost preview, touch long press, Escape cancel) hit-testing the
 * registered schedulers.
 */
export function beginOgeSchedulerExternalDrag(
  event: OgePointerGestureInput,
  options: OgeSchedulerExternalDragOptions,
): OgePointerGestureHandle {
  let current: OgeSchedulerDropTarget | null = null;
  let dropped = false;
  const clear = (): void => {
    current?.over(null, null);
    current = null;
  };
  return beginPointerDragDrop<Hit>(event, {
    source: options.source,
    longPress: OGE_LONG_PRESS_DELAY,
    resolve: (hit, pointer) => {
      const target = findOgeSchedulerDropTarget(hit);
      const slot =
        target === null ? null : target.resolve(pointer.clientX, pointer.clientY, hit);
      return target !== null && slot !== null ? { target, slot } : null;
    },
    onStart: () => options.onStart?.(),
    onOver: (hit) => {
      if (hit === null || hit.target !== current) clear();
      if (hit !== null) {
        current = hit.target;
        hit.target.over(hit.slot, options.payload);
      }
    },
    onDrop: (hit) => {
      clear();
      dropped = hit.target.drop(options.payload, hit.slot);
    },
    onEnd: (result) => {
      clear();
      options.onEnd?.({ dropped: dropped && result.dropped, cancelled: result.cancelled });
    },
  });
}

/**
 * The keyboard half of a draggable: Enter / Space picks the payload up
 * (announced), Escape puts it down. Returns whether the key was handled
 * (the caller then calls `preventDefault`).
 */
export function ogeSchedulerDraggableKey(
  key: string,
  payload: OgeSchedulerDragPayload,
  announcement: string,
  isArmed: boolean = armed !== null && armed.data === payload.data,
): boolean {
  if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
    armOgeSchedulerPayload(isArmed ? null : payload, announcement);
    return true;
  }
  if (key === 'Escape' && armed !== null) {
    armOgeSchedulerPayload(null);
    return true;
  }
  return false;
}
