/**
 * Framework-free half of the non-modal floating window (ADR 0001): the
 * vocabulary, the placement / clamping / resize arithmetic, the keyboard
 * twin of every pointer gesture, the z-order wiring and the state machine
 * (normal ⇄ minimized ⇄ maximized). The render layers own the markup and
 * the open/close lifecycle and feed this core their props.
 *
 * Geometry is in **viewport pixels** (`x` = the left edge, like `clientX`):
 * a floating window is placed in absolute screen space, the way the BPMN
 * canvas keeps diagram coordinates. Direction matters only where a
 * *placement* names an inline edge — `'start'` / `'end'` resolve to the left
 * or right edge through `ogeIsRtl` — and arrow keys are visual in both
 * directions, like dragging.
 */

import { getOgeLiveAnnouncer } from '../a11y/live-announcer';
import { ogeIsRtl } from '../a11y/direction';
import { formatPattern } from '../input/error-messages';
import {
  beginPointerGesture,
  type OgePointerGestureHandle,
  type OgePointerGestureInput,
} from '../gesture/pointer-gesture';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  resolveModalInitialFocus,
  type OgeModalAutoFocus,
  type OgeModalPlacement,
} from './modal-core';
import { ogeOverlayMessage, type OgeOverlayMessages } from './overlay-config';
import { overlayStackSize } from './overlay-stack';
import {
  bringOgeWindowToFront,
  isOgeFrontWindow,
  ogeWindowLayer,
  registerOgeWindow,
  subscribeOgeWindows,
  unregisterOgeWindow,
} from './window-stack';

// --- vocabulary -------------------------------------------------------------

/** Display state of a window. */
export type OgeWindowState = 'normal' | 'minimized' | 'maximized';

/** Where a window opens when no `position` is given — the modal's placements. */
export type OgeWindowPlacement = OgeModalPlacement;

/** Initial-focus strategy of a window; `false` leaves focus where it is. */
export type OgeWindowAutoFocus = OgeModalAutoFocus | false;

/** Top-left corner of a window in viewport px. */
export interface OgeWindowPosition {
  readonly x: number;
  readonly y: number;
}

/**
 * A window's box in viewport px. `width` / `height` stay `null` — sized by
 * the `width` / `height` props or the content — until the user resizes.
 */
export interface OgeWindowRect {
  readonly x: number;
  readonly y: number;
  readonly width: number | null;
  readonly height: number | null;
}

/** A box with both dimensions known (resize arithmetic). */
export interface OgeWindowBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One of the eight resize handles (compass edges, physical). */
export type OgeWindowResizeEdge =
  'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** All handles in render order. */
export const OGE_WINDOW_RESIZE_EDGES: readonly OgeWindowResizeEdge[] = [
  'n',
  's',
  'e',
  'w',
  'ne',
  'nw',
  'se',
  'sw',
];

/** Why a window closed. */
export type OgeWindowCloseReason = 'api' | 'escape' | 'closeButton';

/** What moved or resized a window. */
export type OgeWindowChangeSource = 'pointer' | 'keyboard' | 'api';

/** Cancelable pre-event fired before a window opens. */
export interface OgeWindowOpeningEvent {
  /** Set `true` to keep the window closed. */
  cancel: boolean;
}

/** Cancelable pre-event fired before a window closes. */
export interface OgeWindowClosingEvent {
  /** What triggered the close. */
  readonly reason: OgeWindowCloseReason;
  /** Set `true` to keep the window open. */
  cancel: boolean;
}

/** Fired after a window closed. */
export interface OgeWindowClosedEvent {
  /** What triggered the close. */
  readonly reason: OgeWindowCloseReason;
}

/** Fired after a drag, a keyboard move or `center()` / `moveTo()`. */
export interface OgeWindowMovedEvent {
  /** New left edge in viewport px. */
  readonly x: number;
  /** New top edge in viewport px. */
  readonly y: number;
  /** What moved the window. */
  readonly source: OgeWindowChangeSource;
  /** The originating DOM event (pointer up / keydown), when there is one. */
  readonly event?: Event;
}

/** Fired after a resize gesture, a keyboard resize or `resizeTo()`. */
export interface OgeWindowResizedEvent {
  /** New width in px. */
  readonly width: number;
  /** New height in px. */
  readonly height: number;
  /** The handle that was dragged; absent for keyboard and API resizes. */
  readonly edge?: OgeWindowResizeEdge;
  /** What resized the window. */
  readonly source: OgeWindowChangeSource;
  /** The originating DOM event, when there is one. */
  readonly event?: Event;
}

/** Cancelable pre-event fired before minimize / maximize / restore. */
export interface OgeWindowStateChangingEvent {
  /** The state about to be entered. */
  readonly state: OgeWindowState;
  /** The current state. */
  readonly previousState: OgeWindowState;
  /** Set `true` to keep the current state. */
  cancel: boolean;
}

/** Fired after the state changed. */
export interface OgeWindowStateChangedEvent {
  /** The new state. */
  readonly state: OgeWindowState;
  /** The state before the change. */
  readonly previousState: OgeWindowState;
}

/** Smallest size a resize may shrink a window to, unless `minWidth`/`minHeight` say otherwise. */
export const OGE_WINDOW_MIN_SIZE = { width: 200, height: 120 } as const;

/** Distance kept from the viewport edges by the edge placements. */
export const OGE_WINDOW_GUTTER = 16;

/** Pixels of the title bar that stay on screen when the window may leave the viewport. */
export const OGE_WINDOW_TITLE_REACH = 48;

/** Arrow-key step in px (Shift: 1px). */
export const OGE_WINDOW_KEY_STEP = 10;

/** `aria-keyshortcuts` of the window panel. */
export const OGE_WINDOW_KEY_SHORTCUTS =
  'ArrowUp ArrowDown ArrowLeft ArrowRight Control+ArrowUp Control+ArrowDown Control+ArrowLeft Control+ArrowRight Alt+ArrowUp Alt+ArrowDown Escape';

// --- arithmetic ---------------------------------------------------------------

interface Size {
  readonly width: number;
  readonly height: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Top-left corner for a placement: `center`; `top` / `bottom` centred on the
 * inline axis; `start` / `end` centred on the block axis, mirrored in RTL; the
 * corners combine both. Edge placements keep {@link OGE_WINDOW_GUTTER} away
 * from the viewport edge; nothing ends up above or left of the viewport.
 */
export function resolveOgeWindowPlacement(
  placement: OgeWindowPlacement,
  size: Size,
  viewport: Size,
  rtl = false,
  gutter = OGE_WINDOW_GUTTER,
): OgeWindowPosition {
  const [block, inline] = placement.includes('-')
    ? (placement.split('-') as [string, string])
    : placement === 'start' || placement === 'end'
      ? ['center', placement]
      : [placement, 'center'];
  const centreX = (viewport.width - size.width) / 2;
  const centreY = (viewport.height - size.height) / 2;
  const left = gutter;
  const right = viewport.width - size.width - gutter;
  const x =
    inline === 'start'
      ? rtl
        ? right
        : left
      : inline === 'end'
        ? rtl
          ? left
          : right
        : centreX;
  const y =
    block === 'top'
      ? gutter
      : block === 'bottom'
        ? viewport.height - size.height - gutter
        : centreY;
  return { x: Math.round(Math.max(0, x)), y: Math.round(Math.max(0, y)) };
}

/**
 * Keeps a window reachable. `contain` keeps the whole box inside the viewport
 * (a box larger than the viewport sticks to the top-left); otherwise the
 * window may hang off the sides and bottom but always keeps
 * {@link OGE_WINDOW_TITLE_REACH} px of its title bar on screen and never goes
 * above the top edge, so it can always be dragged back.
 */
export function clampOgeWindowPosition(
  position: OgeWindowPosition,
  size: Size,
  viewport: Size,
  contain: boolean,
  titleHeight = 40,
): OgeWindowPosition {
  if (contain) {
    return {
      x: clamp(position.x, 0, viewport.width - size.width),
      y: clamp(position.y, 0, viewport.height - size.height),
    };
  }
  const reach = Math.min(size.width, OGE_WINDOW_TITLE_REACH);
  return {
    x: clamp(position.x, reach - size.width, viewport.width - reach),
    y: clamp(
      position.y,
      0,
      viewport.height - Math.min(titleHeight, size.height),
    ),
  };
}

/** Size limits of a resize; unset maxima fall back to the viewport. */
export interface OgeWindowSizeLimits {
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
}

/**
 * Next box for a resize from `edge` by `(dx, dy)`: min/max-limited, the
 * opposite edge fixed, and — with `contain` — never past the viewport edge
 * being dragged towards.
 */
export function resizeOgeWindowRect(
  start: OgeWindowBox,
  edge: OgeWindowResizeEdge,
  dx: number,
  dy: number,
  limits: OgeWindowSizeLimits,
  viewport: Size,
  contain: boolean,
): OgeWindowBox {
  const minWidth = limits.minWidth ?? OGE_WINDOW_MIN_SIZE.width;
  const minHeight = limits.minHeight ?? OGE_WINDOW_MIN_SIZE.height;
  let maxWidth = limits.maxWidth ?? viewport.width;
  let maxHeight = limits.maxHeight ?? viewport.height;
  const east = edge.includes('e');
  const west = edge.includes('w');
  const south = edge.includes('s');
  const north = edge.includes('n');
  if (contain) {
    if (east) maxWidth = Math.min(maxWidth, viewport.width - start.x);
    if (west) maxWidth = Math.min(maxWidth, start.x + start.width);
    if (south) maxHeight = Math.min(maxHeight, viewport.height - start.y);
    if (north) maxHeight = Math.min(maxHeight, start.y + start.height);
  }
  let width = start.width;
  let height = start.height;
  if (east) width = start.width + dx;
  if (west) width = start.width - dx;
  if (south) height = start.height + dy;
  if (north) height = start.height - dy;
  width = Math.round(clamp(width, minWidth, maxWidth));
  height = Math.round(clamp(height, minHeight, maxHeight));
  return {
    x: west ? start.x + start.width - width : start.x,
    y: north ? start.y + start.height - height : start.y,
    width,
    height,
  };
}

/** The keyboard twin of the window's pointer gestures. */
export type OgeWindowKeyCommand =
  | { readonly type: 'move'; readonly dx: number; readonly dy: number }
  | { readonly type: 'resize'; readonly dw: number; readonly dh: number }
  | { readonly type: 'state'; readonly direction: 'up' | 'down' };

/** The slice of a keydown the window reads. */
export interface OgeWindowKeyInput {
  readonly key: string;
  readonly target: EventTarget | null;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
  readonly defaultPrevented?: boolean;
}

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Maps a keydown on the focused window panel (Kendo Window's scheme): arrows
 * move by {@link OGE_WINDOW_KEY_STEP} px, Ctrl/⌘ + arrows resize (right/down
 * grow), Shift makes either step 1px, Alt+↑ maximizes (or restores a
 * minimized window) and Alt+↓ minimizes (or restores a maximized one).
 * Arrows are visual — they mean the same screen direction in RTL.
 */
export function ogeWindowKeyCommand(
  event: OgeWindowKeyInput,
): OgeWindowKeyCommand | null {
  const arrow = ARROWS[event.key];
  if (!arrow) return null;
  if (event.altKey) {
    if (event.ctrlKey || event.metaKey || arrow[1] === 0) return null;
    return { type: 'state', direction: arrow[1] < 0 ? 'up' : 'down' };
  }
  const step = event.shiftKey ? 1 : OGE_WINDOW_KEY_STEP;
  if (event.ctrlKey || event.metaKey) {
    return { type: 'resize', dw: arrow[0] * step, dh: arrow[1] * step };
  }
  return { type: 'move', dx: arrow[0] * step, dy: arrow[1] * step };
}

/** Next state for Alt+↑ / Alt+↓. */
export function ogeWindowStateStep(
  state: OgeWindowState,
  direction: 'up' | 'down',
): OgeWindowState {
  if (direction === 'up') return state === 'minimized' ? 'normal' : 'maximized';
  return state === 'maximized' ? 'normal' : 'minimized';
}

/**
 * Inline `z-index` for a stacking layer: `base + layer` with an explicit
 * base, otherwise on top of the `--oge-z-window` token (below anchored
 * popups, so a select opened inside a window still shows above it).
 */
export function ogeWindowZIndex(
  base: number | undefined,
  layer: number,
): string {
  const offset = Math.max(0, layer);
  return base === undefined
    ? `calc(var(--oge-z-window) + ${offset})`
    : String(base + offset);
}

/**
 * Where focus lands when a window opens: the modal's resolution applied to
 * the window **body** (the title-bar buttons are not where a user wants to
 * start), falling back to the frame itself, whose arrow keys move it.
 * `false` → `null` (leave focus alone).
 */
export function resolveOgeWindowInitialFocus(
  panel: HTMLElement,
  mode: OgeWindowAutoFocus,
): HTMLElement | null {
  if (mode === false) return null;
  if (mode === 'panel') return panel;
  const body = panel.querySelector<HTMLElement>('.oge-window-body');
  if (!body) return resolveModalInitialFocus(panel, mode);
  const target = resolveModalInitialFocus(body, mode);
  return target === body ? panel : target;
}

// --- the machine ------------------------------------------------------------

/** The props the core reads on every decision. */
export interface OgeWindowCoreProps {
  readonly draggable: boolean;
  readonly resizable: boolean;
  readonly keepInViewport: boolean;
  readonly placement: OgeWindowPlacement;
  readonly position?: OgeWindowPosition | null;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
  readonly closeOnEscape: boolean;
  readonly messages?: Partial<OgeOverlayMessages>;
}

/** Wiring of {@link OgeWindowCore} to its render layer. */
export interface OgeWindowCoreOptions {
  readonly adapter: OgeReactivityAdapter;
  /** Current props (read lazily, never cached). */
  readonly props: () => OgeWindowCoreProps;
  /** The rendered panel, `null` while closed. */
  readonly panel: () => HTMLElement | null;
  readonly onMoved?: (event: OgeWindowMovedEvent) => void;
  readonly onResized?: (event: OgeWindowResizedEvent) => void;
  readonly onStateChanging?: (event: OgeWindowStateChangingEvent) => void;
  readonly onStateChanged?: (event: OgeWindowStateChangedEvent) => void;
  /** The window became the frontmost one. */
  readonly onActivated?: () => void;
  /** Escape pressed inside the window while no overlay is open. */
  readonly onEscape?: (event: OgeWindowKeyInput) => void;
  /** Speaks keyboard moves/resizes; default: the shared live announcer. */
  readonly announce?: (message: string) => void;
  /** Display state before any change (no events fire for it). Default `'normal'`. */
  readonly initialState?: OgeWindowState;
}

/** A `pointerdown` the window reads (native or React synthetic). */
export type OgeWindowPointerInput = OgePointerGestureInput & {
  readonly button: number;
};

/**
 * One floating window's state: its box, display state and stacking layer,
 * plus the drag / resize / keyboard pipelines. Construct it freely (React
 * builds it during render); it touches no global until {@link attach}.
 */
export class OgeWindowCore {
  /** The window's box; `null` until the first {@link place}. */
  readonly rect: OgeReactiveCell<OgeWindowRect | null>;
  /** Display state. */
  readonly state: OgeReactiveCell<OgeWindowState>;
  /** Stacking layer among the open windows (`0` = back, `-1` = closed). */
  readonly layer: OgeReactiveCell<number>;
  /** `true` while this is the frontmost (active) window. */
  readonly active: OgeReactiveCell<boolean>;
  /** The running pointer gesture, for the dragging/resizing classes. */
  readonly interaction: OgeReactiveCell<'move' | 'resize' | null>;

  private attached = false;
  private unsubscribe: (() => void) | null = null;
  private gesture: OgePointerGestureHandle | null = null;
  private lastPosition: OgeWindowPosition | null | undefined = undefined;
  private placedWith: OgeWindowPlacement | undefined = undefined;

  constructor(private readonly options: OgeWindowCoreOptions) {
    const { adapter } = options;
    this.rect = adapter.cell<OgeWindowRect | null>(null);
    this.state = adapter.cell<OgeWindowState>(options.initialState ?? 'normal');
    this.layer = adapter.cell(-1);
    this.active = adapter.cell(false);
    this.interaction = adapter.cell<'move' | 'resize' | null>(null);
  }

  // --- lifecycle -----------------------------------------------------------

  /** The window opened: joins the z-order on top and listens to the viewport. */
  attach(): void {
    if (this.attached || typeof window === 'undefined') return;
    this.attached = true;
    this.unsubscribe = subscribeOgeWindows(this.syncLayer);
    registerOgeWindow(this);
    this.syncLayer();
    window.addEventListener('resize', this.onViewportResize);
  }

  /** The window closed (or unmounted): leaves the z-order, drops listeners. */
  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.gesture?.cancel();
    this.gesture = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    unregisterOgeWindow(this);
    this.layer.set(-1);
    this.active.set(false);
    window.removeEventListener('resize', this.onViewportResize);
  }

  /** `true` between {@link attach} and {@link detach}. */
  get isAttached(): boolean {
    return this.attached;
  }

  private readonly syncLayer = (): void => {
    const wasActive = this.active();
    this.layer.set(ogeWindowLayer(this));
    const active = isOgeFrontWindow(this);
    this.active.set(active);
    if (active && !wasActive && this.attached) this.options.onActivated?.();
  };

  private readonly onViewportResize = (): void => {
    const rect = this.rect();
    if (!rect) return;
    this.write(this.clamped(rect));
  };

  // --- geometry ------------------------------------------------------------

  private viewport(): Size {
    const doc = typeof document === 'undefined' ? null : document;
    return {
      width: doc?.documentElement.clientWidth || window.innerWidth,
      height: doc?.documentElement.clientHeight || window.innerHeight,
    };
  }

  private measured(): Size {
    const panel = this.options.panel();
    return {
      width: panel?.offsetWidth ?? 0,
      height: panel?.offsetHeight ?? 0,
    };
  }

  /** The rect with any content-sized dimension measured. */
  private box(rect: OgeWindowRect): OgeWindowBox {
    const size = this.measured();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width ?? size.width,
      height: rect.height ?? size.height,
    };
  }

  private titleHeight(): number {
    const header = this.options
      .panel()
      ?.querySelector<HTMLElement>('.oge-window-header');
    return header?.offsetHeight || 40;
  }

  private clamped(rect: OgeWindowRect): OgeWindowRect {
    const size = this.measured();
    const position = clampOgeWindowPosition(
      rect,
      {
        width: size.width || (rect.width ?? 0),
        height: size.height || (rect.height ?? 0),
      },
      this.viewport(),
      this.options.props().keepInViewport,
      this.titleHeight(),
    );
    return { ...rect, x: position.x, y: position.y };
  }

  private write(rect: OgeWindowRect): void {
    const current = this.rect();
    if (
      current &&
      current.x === rect.x &&
      current.y === rect.y &&
      current.width === rect.width &&
      current.height === rect.height
    ) {
      return;
    }
    this.rect.set(rect);
  }

  /**
   * Places the window after it rendered: an explicit `position` wins, then
   * the box it had when it was last closed (unless `placement` changed
   * since), then `placement`. `force` re-resolves a placement (what
   * `center()` uses).
   */
  place(force?: OgeWindowPlacement): void {
    const props = this.options.props();
    const size = this.measured();
    const previous = this.rect();
    this.lastPosition = props.position;
    const keepPrevious = previous && props.placement === this.placedWith;
    this.placedWith = props.placement;
    const panel = this.options.panel();
    const resolve = (placement: OgeWindowPlacement): OgeWindowPosition =>
      resolveOgeWindowPlacement(
        placement,
        size,
        this.viewport(),
        ogeIsRtl(panel),
      );
    const position: OgeWindowPosition = force
      ? resolve(force)
      : (props.position ??
        (keepPrevious ? previous : null) ??
        resolve(props.placement));
    this.write(
      this.clamped({
        x: position.x,
        y: position.y,
        width: previous?.width ?? null,
        height: previous?.height ?? null,
      }),
    );
  }

  /**
   * Re-applies the `position` and `placement` props when they changed since
   * the last call — the host calls it whenever its props update while open.
   * A new `position` moves the window; a new `placement` (without a
   * `position`) re-places it. Both fire `moved` with source `'api'`.
   */
  syncPosition(): void {
    const props = this.options.props();
    const position = props.position;
    const last = this.lastPosition;
    // compared by value: a render layer may pass a fresh object every render
    const samePosition =
      position === last ||
      (!!position && !!last && position.x === last.x && position.y === last.y);
    if (!samePosition) {
      this.lastPosition = position;
      if (position && this.rect()) {
        this.moveTo(position.x, position.y, 'api');
        return;
      }
    }
    if (props.placement !== this.placedWith && !position && this.rect()) {
      this.placedWith = props.placement;
      this.place(props.placement);
      const rect = this.rect();
      if (rect) this.options.onMoved?.({ x: rect.x, y: rect.y, source: 'api' });
    }
  }

  /** Moves the top-left corner (clamped) and fires `moved`. */
  moveTo(
    x: number,
    y: number,
    source: OgeWindowChangeSource = 'api',
    event?: Event,
  ): void {
    const rect = this.rect();
    if (!rect) return;
    const next = this.clamped({ ...rect, x: Math.round(x), y: Math.round(y) });
    this.write(next);
    this.options.onMoved?.({ x: next.x, y: next.y, source, event });
  }

  /** Resizes (min/max-limited, top-left fixed) and fires `resized`. */
  resizeTo(
    width: number,
    height: number,
    source: OgeWindowChangeSource = 'api',
    event?: Event,
  ): void {
    const rect = this.rect();
    if (!rect) return;
    const props = this.options.props();
    const start = this.box(rect);
    const next = resizeOgeWindowRect(
      start,
      'se',
      width - start.width,
      height - start.height,
      props,
      this.viewport(),
      props.keepInViewport,
    );
    this.write(next);
    this.options.onResized?.({
      width: next.width,
      height: next.height,
      source,
      event,
    });
  }

  /** Re-centres the window in the viewport. */
  center(): void {
    if (!this.rect()) return;
    this.place('center');
    const rect = this.rect();
    if (rect) this.options.onMoved?.({ x: rect.x, y: rect.y, source: 'api' });
  }

  // --- z-order ---------------------------------------------------------------

  /** Raises the window above the other windows (focus / press do this too). */
  bringToFront(): void {
    if (this.attached) bringOgeWindowToFront(this);
  }

  // --- state -----------------------------------------------------------------

  /** Runs the cancelable state pipeline; `false` when vetoed or unchanged. */
  setState(next: OgeWindowState): boolean {
    const previousState = this.state();
    if (next === previousState) return false;
    const changing: OgeWindowStateChangingEvent = {
      state: next,
      previousState,
      cancel: false,
    };
    this.options.onStateChanging?.(changing);
    if (changing.cancel) return false;
    this.gesture?.cancel();
    this.state.set(next);
    this.options.onStateChanged?.({ state: next, previousState });
    if (next === 'normal') {
      const rect = this.rect();
      if (rect) this.write(this.clamped(rect));
    }
    return true;
  }

  /** Collapses the window to its title bar. */
  minimize(): boolean {
    return this.setState('minimized');
  }

  /** Fills the viewport. */
  maximize(): boolean {
    return this.setState('maximized');
  }

  /** Back to the normal box. */
  restore(): boolean {
    return this.setState('normal');
  }

  /** Maximize ⇄ restore — the title bar's double-click and maximize button. */
  toggleMaximize(): boolean {
    return this.setState(this.state() === 'maximized' ? 'normal' : 'maximized');
  }

  // --- pointer -----------------------------------------------------------------

  /**
   * `pointerdown` on the title bar: raises the window and starts a drag
   * (never from a title-bar button, never while maximized). Escape during the
   * drag puts the window back.
   */
  startDrag(event: OgeWindowPointerInput): void {
    this.bringToFront();
    const props = this.options.props();
    if (event.button !== 0 || !props.draggable) return;
    if (this.state() === 'maximized') return;
    if (
      (event.target as Element | null)?.closest?.(
        'button, a, input, select, textarea',
      )
    ) {
      return;
    }
    const start = this.rect();
    const panel = this.options.panel();
    if (!start || !panel) return;
    this.focusPanel(panel);
    this.gesture?.cancel();
    this.gesture = beginPointerGesture(event, {
      source: panel,
      onMove: (dx, dy) => {
        this.interaction.set('move');
        this.write(
          this.clamped({ ...start, x: start.x + dx, y: start.y + dy }),
        );
      },
      onFinish: (commit, cancelled) => {
        this.gesture = null;
        this.interaction.set(null);
        if (cancelled) {
          this.write(start);
          return;
        }
        const rect = this.rect();
        if (commit && rect)
          this.options.onMoved?.({ x: rect.x, y: rect.y, source: 'pointer' });
      },
    });
  }

  /** `pointerdown` on a resize handle. Escape during the gesture restores the box. */
  startResize(event: OgeWindowPointerInput, edge: OgeWindowResizeEdge): void {
    this.bringToFront();
    const props = this.options.props();
    if (event.button !== 0 || !props.resizable) return;
    if (this.state() !== 'normal') return;
    const rect = this.rect();
    const panel = this.options.panel();
    if (!rect || !panel) return;
    this.focusPanel(panel);
    const start = this.box(rect);
    const viewport = this.viewport();
    this.gesture?.cancel();
    this.gesture = beginPointerGesture(event, {
      source: event.target as Element | null,
      threshold: 0,
      onMove: (dx, dy) => {
        this.interaction.set('resize');
        this.write(
          resizeOgeWindowRect(
            start,
            edge,
            dx,
            dy,
            props,
            viewport,
            props.keepInViewport,
          ),
        );
      },
      onFinish: (commit, cancelled) => {
        this.gesture = null;
        this.interaction.set(null);
        if (cancelled) {
          this.write(rect);
          return;
        }
        const next = this.rect();
        if (commit && next) {
          this.options.onResized?.({
            width: next.width ?? start.width,
            height: next.height ?? start.height,
            edge,
            source: 'pointer',
          });
        }
      },
    });
  }

  private focusPanel(panel: HTMLElement): void {
    // the gesture prevents the press's default focus move; keep keyboard
    // users' place inside the window, otherwise focus the panel (whose arrow
    // keys are the drag's twin)
    if (!panel.contains(document.activeElement))
      panel.focus({ preventScroll: true });
  }

  // --- keyboard ----------------------------------------------------------------

  /**
   * Keydown anywhere inside the window. Escape (while no popup or modal is
   * open) asks the host to close; the move / resize / state keys act only
   * on the focused panel itself, so arrows inside the content keep their
   * meaning. Returns `true` when handled (the host prevents the default).
   */
  keydown(event: OgeWindowKeyInput): boolean {
    const props = this.options.props();
    if (event.key === 'Escape') {
      if (!props.closeOnEscape || event.defaultPrevented) return false;
      if (overlayStackSize() > 0) return false;
      this.options.onEscape?.(event);
      return true;
    }
    if (event.target !== this.options.panel()) return false;
    const command = ogeWindowKeyCommand(event);
    if (!command) return false;
    const rect = this.rect();
    if (!rect) return false;
    const messages = props.messages;
    if (command.type === 'state') {
      this.setState(ogeWindowStateStep(this.state(), command.direction));
      return true;
    }
    if (command.type === 'move') {
      if (!props.draggable || this.state() === 'maximized') return false;
      this.moveTo(
        rect.x + command.dx,
        rect.y + command.dy,
        'keyboard',
        event as unknown as Event,
      );
      const next = this.rect();
      if (next) {
        this.say(
          formatPattern(ogeOverlayMessage(messages, 'windowMoved'), {
            x: String(next.x),
            y: String(next.y),
          }),
        );
      }
      return true;
    }
    if (!props.resizable || this.state() !== 'normal') return false;
    const box = this.box(rect);
    const height = box.height;
    this.resizeTo(
      box.width + command.dw,
      height + command.dh,
      'keyboard',
      event as unknown as Event,
    );
    const next = this.rect();
    if (next) {
      this.say(
        formatPattern(ogeOverlayMessage(messages, 'windowResized'), {
          width: String(next.width),
          height: String(next.height ?? height),
        }),
      );
    }
    return true;
  }

  private say(message: string): void {
    if (this.options.announce) this.options.announce(message);
    else getOgeLiveAnnouncer().announce(message);
  }
}
