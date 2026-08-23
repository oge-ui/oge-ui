/**
 * Framework-free half of the modal dialog (ADR 0001): the vocabulary, the
 * initial-focus resolution, the focus-restore decision, the inert-background
 * walk and the drag/resize arithmetic. The render layers own the DOM and the
 * open/close lifecycle; the Escape stack, focus trap and scroll lock are the
 * shared primitives next to this file.
 */

import { getTabbableElements } from './focus-trap';

// --- vocabulary -------------------------------------------------------------

/** Why the modal closed. */
export type OgeModalCloseReason = 'api' | 'escape' | 'backdrop' | 'closeButton';

/** Cancelable pre-event fired before the modal opens. */
export interface OgeModalOpeningEvent {
  /** Set `true` to keep the modal closed. */
  cancel: boolean;
}

/** Payload of the resize events. */
export interface OgeModalResizeEvent {
  /** Panel width in px (start size for `resizeStarted`, final for `resized`). */
  readonly width: number;
  /** Panel height in px (start size for `resizeStarted`, final for `resized`). */
  readonly height: number;
  /** The originating pointer event. */
  readonly event: PointerEvent;
}

/** Cancelable pre-event fired before the modal closes for any reason. */
export interface OgeModalClosingEvent {
  /** What triggered the close. */
  readonly reason: OgeModalCloseReason;
  /** Set `true` to keep the modal open. */
  cancel: boolean;
}

/** Fired after the modal closed. */
export interface OgeModalClosedEvent<R = unknown> {
  /** What triggered the close. */
  readonly reason: OgeModalCloseReason;
  /** Value passed to `close(result)` or the slot close function, if any. */
  readonly result?: R;
}

/**
 * Initial-focus strategy: the first tabbable element, the panel itself, or a
 * CSS selector resolved inside the panel.
 */
export type OgeModalAutoFocus = 'first-tabbable' | 'panel' | (string & {});

/** Where the panel sits in the viewport. */
export type OgeModalPlacement = 'center' | 'top';

/** Smallest size a resize gesture can shrink the panel to. */
export const OGE_MODAL_MIN_RESIZE = { width: 160, height: 120 } as const;

// --- sizing -----------------------------------------------------------------

/** `number` → px, strings verbatim, `undefined` → `null` (unset). */
export function modalCssSize(
  value: number | string | undefined,
): string | null {
  if (value === undefined) return null;
  return typeof value === 'number' ? `${value}px` : value;
}

// --- focus ------------------------------------------------------------------

/**
 * Resolves where focus lands when the modal opens: an `[autofocus]` element
 * always wins, then the selector mode, then the first tabbable, then the
 * panel itself.
 */
export function resolveModalInitialFocus(
  panel: HTMLElement,
  mode: OgeModalAutoFocus,
): HTMLElement {
  let target: HTMLElement | null = panel.querySelector('[autofocus]');
  if (!target && mode !== 'first-tabbable' && mode !== 'panel') {
    target = panel.querySelector(mode);
  }
  if (!target && mode !== 'panel') {
    target = getTabbableElements(panel)[0] ?? null;
  }
  return target ?? panel;
}

/**
 * Whether focus would be lost after the panel goes away — only then is the
 * opener refocused, never stealing a focus target the user chose meanwhile.
 */
export function isModalFocusOrphaned(panel: HTMLElement | null): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  return (
    !active || active === document.body || (panel?.contains(active) ?? false)
  );
}

// --- inert background -------------------------------------------------------

/**
 * Marks siblings of every ancestor of `layer` `inert`, so assistive tech and
 * Tab can never reach the page behind the modal. Elements already inert are
 * skipped, keeping stacked modals' bookkeeping independent. Returns the
 * release function.
 */
export function inertModalBackground(layer: HTMLElement): () => void {
  const inerted: Element[] = [];
  let node: HTMLElement | null = layer;
  while (node?.parentElement && node !== document.body) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling !== node && !sibling.hasAttribute('inert')) {
        sibling.setAttribute('inert', '');
        inerted.push(sibling);
      }
    }
    node = node.parentElement;
  }
  return () => {
    for (const el of inerted) el.removeAttribute('inert');
  };
}

// --- drag & resize arithmetic ----------------------------------------------

export interface OgeModalDragRequest {
  /** Offset the panel had when the gesture started. */
  readonly start: { x: number; y: number };
  /** Pointer travel since the gesture started. */
  readonly dx: number;
  readonly dy: number;
  /** Panel rect at gesture start (viewport-relative). */
  readonly rect: { left: number; top: number; width: number; height: number };
  readonly viewport: { width: number; height: number };
  /** Allows dragging beyond the viewport edges. */
  readonly allowOutside: boolean;
}

/**
 * Next drag offset for a header drag, clamped so the panel stays inside the
 * viewport unless `allowOutside`. Clamping is computed against the base
 * position (without the current offset) so the panel can always be dragged
 * back.
 */
export function clampModalDrag(req: OgeModalDragRequest): {
  x: number;
  y: number;
} {
  let x = req.start.x + req.dx;
  let y = req.start.y + req.dy;
  if (!req.allowOutside) {
    const baseLeft = req.rect.left - req.start.x;
    const baseTop = req.rect.top - req.start.y;
    const minX = -baseLeft;
    const minY = -baseTop;
    const maxX = Math.max(minX, req.viewport.width - req.rect.width - baseLeft);
    const maxY = Math.max(
      minY,
      req.viewport.height - req.rect.height - baseTop,
    );
    x = Math.min(Math.max(x, minX), maxX);
    y = Math.min(Math.max(y, minY), maxY);
  }
  return { x, y };
}

export interface OgeModalResizeRequest {
  /** Panel size at gesture start. */
  readonly start: { width: number; height: number };
  /** Pointer travel since the gesture started. */
  readonly dx: number;
  readonly dy: number;
  readonly viewport: { width: number; height: number };
}

/** Next panel size for a bottom-end resize: min-capped, viewport-capped. */
export function clampModalResize(req: OgeModalResizeRequest): {
  width: number;
  height: number;
} {
  return {
    width: Math.min(
      Math.max(OGE_MODAL_MIN_RESIZE.width, req.start.width + req.dx),
      req.viewport.width,
    ),
    height: Math.min(
      Math.max(OGE_MODAL_MIN_RESIZE.height, req.start.height + req.dy),
      req.viewport.height,
    ),
  };
}

/**
 * Document-level pointer tracking for a drag/resize gesture. Returns the
 * cleanup — call it on teardown so a gesture never outlives its surface.
 */
export function trackPointerGesture(
  onMove: (event: PointerEvent) => void,
  onEnd?: (event: PointerEvent) => void,
): () => void {
  const onUp = (event: PointerEvent): void => {
    cleanup();
    onEnd?.(event);
  };
  const cleanup = (): void => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  return cleanup;
}
