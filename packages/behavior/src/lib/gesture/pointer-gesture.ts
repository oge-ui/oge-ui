/**
 * The suite's one pointer-gesture machine. Every drag interaction in the MIT
 * packages (grid, tree list, pivot field chips) and in the engine packages
 * that may depend on `behavior` (kanban, Gantt, scheduler) starts here, so
 * mouse, pen and touch share the same rules:
 *
 * - **Threshold.** Nothing counts as a drag until the pointer moved more than
 *   `threshold` px (3 by default) — a plain click never commits a drag.
 * - **Long press for touch.** With `longPress` set, a touch pointer only
 *   arms the drag after a hold without moving past the threshold. Moving
 *   earlier abandons the gesture so the browser scrolls the page, exactly as
 *   a user swiping a list expects. Once armed, the document's touch guard
 *   ({@link prepareTouchDrag}) prevents `touchmove`, so the drag — not the
 *   page — follows the finger.
 * - **`touch-action`.** The source carries `touch-action: none` while the
 *   gesture is armed or active, and gets its previous inline value back
 *   afterwards. (A browser decides about panning at `touchstart`, so drag
 *   *handles* also declare it in CSS; this keeps the declaration honest for
 *   sources that must stay scrollable at rest.)
 * - **Cancel paths.** `pointercancel`, a capture-phase Escape (so a
 *   mid-gesture Escape never reaches the host's own key handlers) and window
 *   blur all finish the gesture as cancelled. `finish` runs at most once.
 * - **Pointer capture** is a progressive enhancement (jsdom and detached
 *   elements throw), listeners live on the document.
 *
 * Framework-free and structurally typed: the Angular layer hands it the
 * native `PointerEvent`, the React layer its synthetic one.
 */

/** Movement (px) a pointer must exceed before a gesture counts as a drag. */
export const OGE_GESTURE_THRESHOLD = 3;

/** The house long-press delay (ms) for touch drags. */
export const OGE_LONG_PRESS_DELAY = 300;

/** The slice of a `pointerdown` event the gesture reads. */
export interface OgePointerGestureInput {
  readonly clientX: number;
  readonly clientY: number;
  readonly pointerId: number;
  readonly pointerType?: string;
  readonly target: EventTarget | null;
  preventDefault(): void;
}

/** Options of {@link beginPointerGesture}. */
export interface OgePointerGestureOptions {
  /** Every pointer move once the gesture is a drag; deltas from the start point. */
  onMove(deltaX: number, deltaY: number, event: PointerEvent): void;
  /**
   * Called exactly once when the gesture ends. `commit` is true only for a
   * non-cancelled gesture that actually moved past the threshold.
   */
  onFinish(commit: boolean, cancelled: boolean): void;
  /** Called when a touch long press elapses and the drag is armed. */
  onLongPress?(): void;
  /** Movement threshold in px. Default {@link OGE_GESTURE_THRESHOLD}. */
  threshold?: number;
  /**
   * Hold time (ms) a **touch** pointer needs before it may drag; `0` (the
   * default) starts touch drags immediately. Mouse and pen never wait.
   */
  longPress?: number;
  /** Sets `touch-action: none` on the source while armed. Default `true`. */
  touchAction?: boolean;
  /**
   * Element that receives pointer capture and the `touch-action` override.
   * Defaults to the event target.
   */
  source?: Element | null;
  /**
   * `preventDefault()` the `pointerdown` (keeps a native text-selection drag
   * from scrolling the host under the gesture). Default `true`.
   */
  preventDefault?: boolean;
  /**
   * Swallows the `click` the browser fires after a committed drag (headers
   * would otherwise sort, labels toggle their checkbox). Default `false`.
   */
  suppressClick?: boolean;
}

/** A running gesture. */
export interface OgePointerGestureHandle {
  /** Finishes the gesture as cancelled (teardown, programmatic abort). */
  cancel(): void;
  /** True once the pointer moved past the threshold. */
  readonly moved: boolean;
}

type Styled = Element & { style?: CSSStyleDeclaration };

/** Starts a gesture from `pointerdown`; manages listeners and cleanup. */
export function beginPointerGesture(
  event: OgePointerGestureInput,
  options: OgePointerGestureOptions,
): OgePointerGestureHandle {
  const threshold = options.threshold ?? OGE_GESTURE_THRESHOLD;
  const touch = event.pointerType === 'touch';
  const holdMs = touch ? Math.max(0, options.longPress ?? 0) : 0;
  if (options.preventDefault !== false) event.preventDefault();

  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;
  let moved = false;
  let finished = false;
  let armed = holdMs === 0;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;

  const source = (options.source ??
    (event.target as Element | null)) as Styled | null;
  try {
    (source as HTMLElement | null)?.setPointerCapture?.(pointerId);
  } catch {
    // jsdom / detached elements — capture is a progressive enhancement
  }

  let restoreTouchAction: (() => void) | null = null;
  if (options.touchAction !== false && source?.style) {
    const style = source.style;
    const previous = style.touchAction;
    style.touchAction = 'none';
    restoreTouchAction = () => {
      style.touchAction = previous;
    };
  }

  let touchLocked = false;
  const lockTouch = (): void => {
    if (!touch || touchLocked) return;
    touchLocked = true;
    lockedTouchGestures++;
  };
  function releaseTouchLock(): void {
    if (!touchLocked) return;
    touchLocked = false;
    lockedTouchGestures--;
  }

  if (armed) lockTouch();
  else {
    holdTimer = setTimeout(() => {
      holdTimer = null;
      if (finished) return;
      armed = true;
      lockTouch();
      options.onLongPress?.();
    }, holdMs);
  }

  const samePointer = (moveEvent: PointerEvent): boolean =>
    // a second finger must not steer the drag; synthetic events in specs
    // often carry no pointer type, so only touch is filtered by id
    !touch ||
    moveEvent.pointerType !== 'touch' ||
    moveEvent.pointerId === pointerId;

  const onPointerMove = (moveEvent: PointerEvent): void => {
    if (!samePointer(moveEvent)) return;
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;
    if (!moved && Math.hypot(deltaX, deltaY) <= threshold) return;
    if (!armed) {
      // moved before the hold elapsed: this is a scroll, not a drag
      finish(false);
      return;
    }
    moved = true;
    options.onMove(deltaX, deltaY, moveEvent);
  };
  const onPointerUp = (upEvent: PointerEvent): void => {
    if (!samePointer(upEvent)) return;
    finish(false);
  };
  const onPointerCancel = (cancelEvent: PointerEvent): void => {
    if (!samePointer(cancelEvent)) return;
    finish(true);
  };
  const onKeyDown = (keyEvent: KeyboardEvent): void => {
    if (keyEvent.key !== 'Escape') return;
    keyEvent.preventDefault();
    keyEvent.stopPropagation();
    finish(true);
  };
  const onBlur = (): void => finish(true);
  // a touch hold would otherwise open the platform context menu
  const onContextMenu = (menuEvent: Event): void => {
    if (touch) menuEvent.preventDefault();
  };

  function cleanup(): void {
    if (holdTimer !== null) clearTimeout(holdTimer);
    holdTimer = null;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('contextmenu', onContextMenu, true);
    window.removeEventListener('blur', onBlur);
    restoreTouchAction?.();
    restoreTouchAction = null;
    releaseTouchLock();
  }

  function finish(cancelled: boolean): void {
    if (finished) return;
    finished = true;
    cleanup();
    const commit = !cancelled && moved;
    if (commit && options.suppressClick) suppressNextClick();
    options.onFinish(commit, cancelled);
  }

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
  document.addEventListener('keydown', onKeyDown, true);
  if (touch) {
    prepareTouchDrag();
    document.addEventListener('contextmenu', onContextMenu, true);
  }
  window.addEventListener('blur', onBlur);

  return {
    cancel: () => finish(true),
    get moved() {
      return moved;
    },
  };
}

/** Armed touch gestures; while non-zero the document guard blocks panning. */
let lockedTouchGestures = 0;
const guardedDocuments = new WeakSet<Document>();

/**
 * Installs the document's touch-drag guard: one non-passive `touchmove`
 * listener that prevents panning while a touch gesture is armed and is a
 * no-op otherwise. Chrome decides at `touchstart` whether a touch sequence
 * may block scrolling, so a listener added on `pointerdown` comes too late
 * for that sequence — components with touch drags call this once on mount
 * (it is idempotent and SSR-safe); {@link beginPointerGesture} calls it too.
 */
export function prepareTouchDrag(doc?: Document): void {
  const target = doc ?? (typeof document === 'undefined' ? null : document);
  if (!target || guardedDocuments.has(target)) return;
  guardedDocuments.add(target);
  target.addEventListener(
    'touchmove',
    (event) => {
      if (lockedTouchGestures > 0 && event.cancelable) event.preventDefault();
    },
    { passive: false },
  );
}

/**
 * Swallows the one `click` the browser dispatches right after a drag's
 * `pointerup`; the listener is gone after the current task either way.
 */
function suppressNextClick(): void {
  const swallow = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    remove();
  };
  const remove = (): void => {
    window.removeEventListener('click', swallow, true);
  };
  window.addEventListener('click', swallow, true);
  setTimeout(remove, 0);
}
