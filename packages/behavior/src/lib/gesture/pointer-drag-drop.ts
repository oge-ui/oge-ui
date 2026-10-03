/**
 * Pointer drag & drop on top of {@link beginPointerGesture} — the
 * replacement for HTML5 drag and drop (`draggable` / `dragstart` / `drop`),
 * which never fires for touch, cannot be cancelled with Escape, and draws a
 * ghost the page cannot style. One session = one drag: the drop target
 * under the pointer is hit-tested on every move (and after every auto-scroll
 * frame), a floating ghost follows the pointer, and a committed drop hands
 * the last resolved target to `onDrop`.
 *
 * The consumer owns the meaning of a target: `resolve` maps the element
 * under the pointer to whatever the host's drop path takes (a column id, a
 * row key + position, an area), so the pointer drop can run the exact
 * command the keyboard alternative runs.
 */
import {
  OGE_LONG_PRESS_DELAY,
  beginPointerGesture,
  type OgePointerGestureHandle,
  type OgePointerGestureInput,
} from './pointer-gesture';
import {
  createAutoScroller,
  type OgeAutoScrollOptions,
  type OgeAutoScroller,
} from './auto-scroll';

/** Options of {@link beginPointerDragDrop}. */
export interface OgePointerDragDropOptions<TTarget> {
  /** Maps the element under the pointer to a drop target (`null`: none). */
  resolve(hit: Element | null, event: PointerEvent): TTarget | null;
  /** The drag started (first move past the threshold). */
  onStart?(): void;
  /**
   * The resolved target after every move / auto-scroll frame — drive the
   * drop indicator from here (it may repeat the same target).
   */
  onOver?(target: TTarget | null): void;
  /** A committed drop over a non-null target. */
  onDrop(target: TTarget): void;
  /**
   * Always last: `dropped` when `onDrop` ran, `cancelled` for Escape / blur
   * / `pointercancel`. Clear the indicator here.
   */
  onEnd?(result: { dropped: boolean; cancelled: boolean }): void;
  /** Element the gesture belongs to (capture, `touch-action`). Default: the event target. */
  source?: Element | null;
  /**
   * The floating preview: `true` (default) clones `source`, an element
   * clones that element instead, `false` draws none.
   */
  ghost?: boolean | Element | null;
  /** Scroll container to edge-auto-scroll while dragging. */
  autoScroll?: HTMLElement | null;
  /** Auto-scroll tuning. */
  autoScrollOptions?: Omit<OgeAutoScrollOptions, 'onScroll'>;
  /**
   * Touch hold (ms) before a touch pointer may drag. Default
   * {@link OGE_LONG_PRESS_DELAY}; `0` drags immediately (drag handles that
   * declare `touch-action: none`).
   */
  longPress?: number;
  /** Movement threshold in px. */
  threshold?: number;
  /** `preventDefault()` the `pointerdown`. Default `false` (keeps focus-on-press). */
  preventDefault?: boolean;
}

/**
 * The element under a viewport point, falling back to `fallback` where the
 * environment cannot hit-test (jsdom has no `elementFromPoint`).
 */
export function ogeElementAtPoint(
  clientX: number,
  clientY: number,
  fallback: EventTarget | null = null,
): Element | null {
  const doc = typeof document === 'undefined' ? null : document;
  const hit =
    doc && typeof doc.elementFromPoint === 'function'
      ? doc.elementFromPoint(clientX, clientY)
      : null;
  if (hit) return hit;
  return fallback instanceof Element ? fallback : null;
}

/** A floating drag preview that follows the pointer. */
export interface OgeDragGhost {
  move(clientX: number, clientY: number): void;
  destroy(): void;
}

/**
 * Clones `element` into a fixed-position, pointer-transparent, `aria-hidden`
 * preview at its current place; `move()` offsets it by the pointer travel.
 * Ids are stripped from the clone so the document keeps unique ids.
 */
export function createDragGhost(
  element: Element,
  startX: number,
  startY: number,
): OgeDragGhost {
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.classList.add('oge-drag-ghost');
  const computed =
    typeof getComputedStyle === 'function' ? getComputedStyle(element) : null;
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    zIndex: '10000',
    opacity: '0.85',
    font: computed?.font ?? '',
    color: 'var(--oge-text-color)',
    background: 'var(--oge-bg)',
    border: '1px solid var(--oge-border-color)',
    borderRadius: 'var(--oge-radius)',
    boxShadow: 'var(--oge-shadow-popup)',
    overflow: 'hidden',
    transform: 'translate(0px, 0px)',
  } satisfies Partial<CSSStyleDeclaration>);
  (element.ownerDocument ?? document).body.appendChild(clone);
  return {
    move(clientX, clientY) {
      clone.style.transform = `translate(${clientX - startX}px, ${clientY - startY}px)`;
    },
    destroy() {
      clone.remove();
    },
  };
}

/**
 * Starts a pointer drag & drop session from `pointerdown`. Touch pointers
 * need a long press first (unless `longPress: 0`), so swiping over draggable
 * items still scrolls the page.
 */
export function beginPointerDragDrop<TTarget>(
  event: OgePointerGestureInput,
  options: OgePointerDragDropOptions<TTarget>,
): OgePointerGestureHandle {
  const source = options.source ?? (event.target as Element | null);
  const ghostSource =
    options.ghost === false || options.ghost === null
      ? null
      : options.ghost === true || options.ghost === undefined
        ? source
        : options.ghost;
  let ghost: OgeDragGhost | null = null;
  let scroller: OgeAutoScroller | null = null;
  let target: TTarget | null = null;
  let lastX = event.clientX;
  let lastY = event.clientY;
  let lastEvent: PointerEvent | null = null;
  let started = false;

  const hitTest = (): void => {
    if (!lastEvent) return;
    target = options.resolve(
      ogeElementAtPoint(lastX, lastY, lastEvent.target),
      lastEvent,
    );
    options.onOver?.(target);
  };

  return beginPointerGesture(event, {
    source,
    threshold: options.threshold,
    longPress: options.longPress ?? OGE_LONG_PRESS_DELAY,
    preventDefault: options.preventDefault ?? false,
    suppressClick: true,
    onMove: (_dx, _dy, moveEvent) => {
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
      lastEvent = moveEvent;
      if (!started) {
        started = true;
        options.onStart?.();
        if (ghostSource) ghost = createDragGhost(ghostSource, event.clientX, event.clientY);
        if (options.autoScroll)
          scroller = createAutoScroller(options.autoScroll, {
            ...options.autoScrollOptions,
            onScroll: hitTest,
          });
        // the browser selection a press may have started would extend
        // under the drag
        if (typeof window !== 'undefined')
          window.getSelection?.()?.removeAllRanges();
      }
      ghost?.move(lastX, lastY);
      scroller?.update(lastX, lastY);
      hitTest();
    },
    onFinish: (commit, cancelled) => {
      scroller?.stop();
      ghost?.destroy();
      const dropped = commit && target !== null;
      if (dropped) options.onDrop(target as TTarget);
      options.onEnd?.({ dropped, cancelled });
    },
  });
}
