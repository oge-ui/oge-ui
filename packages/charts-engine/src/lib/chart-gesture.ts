/**
 * The shared pointer-gesture machine (the bpmn five-part pattern): closure
 * state, pointer capture as a progressive enhancement, document listeners
 * incl. a capture-phase Escape, a single `finish(cancelled)` and a 3px
 * movement threshold so a plain click never commits a drag.
 *
 * Deliberately a local twin of `@oge-ui/behavior`'s `beginPointerGesture`,
 * not a wrapper: `charts-engine` depends on `core` only (its published
 * dependency set is part of the "dependency-free engine" stance, like
 * `bpmn-engine`'s), and zoom/pan never needs the shared machine's long press
 * or drop hit-testing — the chart surfaces declare their `touch-action` in
 * `chart.scss` (the plot pans vertically, the range selector not). Only
 * the pointer that started a gesture drives it, so a second finger never
 * jerks a drag; {@link createChartPinchTracker} turns two fingers into a
 * pinch-zoom / two-finger pan instead. Keep the
 * two in step when the cancel rules change (docs/ARCHITECTURE.md → shared
 * gestures).
 */
export interface ChartGestureCallbacks {
  onMove(deltaX: number, deltaY: number, event: PointerEvent): void;
  onFinish(commit: boolean, cancelled: boolean): void;
}

const MOVE_THRESHOLD = 3;

/** A running single-pointer gesture. */
export interface ChartGestureHandle {
  /** Ends the gesture as cancelled (a second finger turned it into a pinch). */
  cancel(): void;
}

export function beginChartGesture(
  event: PointerEvent,
  callbacks: ChartGestureCallbacks,
): ChartGestureHandle {
  // A native selection drag would auto-scroll the chart under the gesture.
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  let finished = false;

  const target = event.target as HTMLElement;
  try {
    target.setPointerCapture(event.pointerId);
  } catch {
    // jsdom / detached elements — capture is a progressive enhancement
  }

  // multi-touch: only the pointer that started the gesture drives it
  const own = (other: PointerEvent): boolean =>
    other.pointerId === undefined || other.pointerId === event.pointerId;
  const onPointerMove = (moveEvent: PointerEvent): void => {
    if (!own(moveEvent)) return;
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;
    if (!moved && Math.hypot(deltaX, deltaY) <= MOVE_THRESHOLD) return;
    moved = true;
    callbacks.onMove(deltaX, deltaY, moveEvent);
  };
  const onPointerUp = (upEvent: PointerEvent): void => {
    if (own(upEvent)) finish(false);
  };
  const onPointerCancel = (cancelEvent: PointerEvent): void => {
    if (own(cancelEvent)) finish(true);
  };
  const onKeyDown = (keyEvent: KeyboardEvent): void => {
    if (keyEvent.key !== 'Escape') return;
    keyEvent.preventDefault();
    keyEvent.stopPropagation();
    finish(true);
  };
  const onBlur = (): void => finish(true);

  function cleanup(): void {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('blur', onBlur);
  }

  function finish(cancelled: boolean): void {
    if (finished) return;
    finished = true;
    cleanup();
    callbacks.onFinish(!cancelled && moved, cancelled);
  }

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('blur', onBlur);
  return { cancel: () => finish(true) };
}

/* ------------------------------------------------------------------ */
/* two-finger pinch / pan                                              */
/* ------------------------------------------------------------------ */

export interface ChartPinchPoint {
  readonly clientX: number;
  readonly clientY: number;
}

export interface ChartPinchCallbacks {
  /** The second finger landed: a pinch begins (cancel any one-finger drag). */
  onPinchStart(a: ChartPinchPoint, b: ChartPinchPoint): void;
  /** Both fingers' start and current positions (client px). */
  onPinch(
    startA: ChartPinchPoint,
    startB: ChartPinchPoint,
    a: ChartPinchPoint,
    b: ChartPinchPoint,
  ): void;
  /** A finger lifted (or the gesture was cancelled). */
  onPinchEnd(cancelled: boolean): void;
}

/** Multi-touch tracking for one plot surface. */
export interface ChartPinchTracker {
  /**
   * Feed every touch `pointerdown` of the surface; returns `true` when this
   * pointer turned the gesture into a pinch (two fingers down).
   */
  pointerDown(event: PointerEvent): boolean;
  /** Whether two fingers are down. */
  readonly active: boolean;
  /** Drops every tracked pointer and listener (component teardown). */
  dispose(): void;
}

/**
 * Tracks touch pointers on a plot: one finger is left to the regular
 * gesture, a second one starts a pinch — pinch-zoom when the fingers spread
 * or close, two-finger pan when they move together. Document listeners only
 * live while a finger is down; the surface declares `touch-action` so the
 * browser leaves the gesture to the chart.
 */
export function createChartPinchTracker(
  callbacks: ChartPinchCallbacks,
): ChartPinchTracker {
  const pointers = new Map<number, ChartPinchPoint>();
  let start: [ChartPinchPoint, ChartPinchPoint] | null = null;
  let ids: [number, number] | null = null;
  let listening = false;

  const onMove = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
    if (start === null || ids === null) return;
    const a = pointers.get(ids[0]);
    const b = pointers.get(ids[1]);
    if (a === undefined || b === undefined) return;
    event.preventDefault();
    callbacks.onPinch(start[0], start[1], a, b);
  };
  const release = (event: PointerEvent, cancelled: boolean): void => {
    if (!pointers.delete(event.pointerId)) return;
    if (ids !== null && ids.includes(event.pointerId)) {
      start = null;
      ids = null;
      callbacks.onPinchEnd(cancelled);
    }
    if (pointers.size === 0) detach();
  };
  const onUp = (event: PointerEvent): void => release(event, false);
  const onCancel = (event: PointerEvent): void => release(event, true);

  function attach(): void {
    if (listening) return;
    listening = true;
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
  }
  function detach(): void {
    if (!listening) return;
    listening = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
  }

  return {
    pointerDown(event: PointerEvent): boolean {
      if (event.pointerType !== 'touch') return false;
      pointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
      attach();
      if (start !== null || pointers.size !== 2) return false;
      const [first, second] = [...pointers.entries()];
      ids = [first[0], second[0]];
      start = [first[1], second[1]];
      callbacks.onPinchStart(first[1], second[1]);
      return true;
    },
    get active(): boolean {
      return start !== null;
    },
    dispose(): void {
      pointers.clear();
      start = null;
      ids = null;
      detach();
    },
  };
}
