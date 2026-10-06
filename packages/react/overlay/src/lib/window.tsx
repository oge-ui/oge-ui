'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  OGE_WINDOW_KEY_SHORTCUTS,
  OGE_WINDOW_RESIZE_EDGES,
  OgeWindowCore,
  isModalFocusOrphaned,
  modalCssSize,
  ogeOverlayMessage,
  ogeWindowZIndex,
  resolveOgeWindowInitialFocus,
  type OgeOverlayMessages,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeWindowAutoFocus,
  type OgeWindowCloseReason,
  type OgeWindowClosedEvent,
  type OgeWindowClosingEvent,
  type OgeWindowCoreProps,
  type OgeWindowMovedEvent,
  type OgeWindowOpeningEvent,
  type OgeWindowPlacement,
  type OgeWindowPosition,
  type OgeWindowResizedEvent,
  type OgeWindowState,
  type OgeWindowStateChangedEvent,
  type OgeWindowStateChangingEvent,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeWindowHandle {
  /** Whether the window is open right now. */
  readonly opened: boolean;
  /** The current display state. */
  readonly state: OgeWindowState;
  /** Opens the window. */
  open(): void;
  /** Closes through the cancelable `onClosing`; reason `'api'`. */
  close(): void;
  /** Toggles between open and closed. */
  toggle(): void;
  /** Collapses the window to its title bar; `false` when vetoed. */
  minimize(): boolean;
  /** Fills the viewport; `false` when vetoed. */
  maximize(): boolean;
  /** Back to the normal box; `false` when vetoed or already normal. */
  restore(): boolean;
  /** Raises the window above the other open windows. */
  bringToFront(): void;
  /** Re-centres the window in the viewport (fires `onMoved`). */
  center(): void;
  /** Moves the top-left corner to `(x, y)` viewport px (clamped; fires `onMoved`). */
  moveTo(x: number, y: number): void;
  /** Resizes to `width × height` px (min/max-limited; fires `onResized`). */
  resizeTo(width: number, height: number): void;
  /** Moves focus into the window (the `autoFocus` resolution). */
  focus(): void;
}

export interface OgeWindowProps {
  /** Whether the window is open — controlled when provided. Setting it `false` closes without `onClosing`. */
  opened?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpened?: boolean;
  /** The controlled half of `opened`. */
  onOpenedChange?: (opened: boolean) => void;
  /** Display state — controlled when provided: `'normal'`, `'minimized'` (title bar only) or `'maximized'`. */
  state?: OgeWindowState;
  /** Uncontrolled initial display state. */
  defaultState?: OgeWindowState;
  /** The controlled half of `state`. */
  onStateChange?: (state: OgeWindowState) => void;
  /** Title-bar text; also the accessible name. */
  title?: string;
  /** Accessible name when there is no `title`. */
  ariaLabel?: string;
  /** Explicit top-left corner in viewport px; wins over `placement`, and moves the window when it changes. */
  position?: OgeWindowPosition | null;
  /** Where the window opens when no `position` is given (RTL-aware). Default `'center'`. */
  placement?: OgeWindowPlacement;
  /** Initial width — number = px, string passed through. Default `min(420px, 100vw - 32px)`. */
  width?: number | string;
  /** Initial height — number = px, string passed through. Default: content. */
  height?: number | string;
  /** Smallest width (px) a resize may reach. Default `200`. */
  minWidth?: number;
  /** Smallest height (px) a resize may reach. Default `120`. */
  minHeight?: number;
  /** Largest width (px). Default: the viewport. */
  maxWidth?: number;
  /** Largest height (px). Default: the viewport. */
  maxHeight?: number;
  /** Base z-index; the window's stacking layer is added to it. Default: the `--oge-z-window` token. */
  zIndex?: number;
  /** The title bar drags the window (pointer and arrow keys). Default `true`. */
  draggable?: boolean;
  /** Eight edge handles resize the window (pointer and Ctrl+arrows). Default `true`. */
  resizable?: boolean;
  /** Keeps the whole window inside the viewport; `false` lets it hang off the edges but always keeps the title bar reachable. Default `true`. */
  keepInViewport?: boolean;
  /** Shows the minimize/restore title-bar button. Default `true`. */
  showMinimizeButton?: boolean;
  /** Shows the maximize/restore title-bar button (a title-bar double-click toggles too). Default `true`. */
  showMaximizeButton?: boolean;
  /** Shows the ✕ title-bar button. Default `true`. */
  showCloseButton?: boolean;
  /** Escape closes the window while focus is inside it and no popup is open. Default `true`. */
  closeOnEscape?: boolean;
  /** Where focus lands on open; `false` leaves focus where it is. Default `'first-tabbable'`. */
  autoFocus?: OgeWindowAutoFocus;
  /** Restores focus to the opener on close (only when focus would be lost). Default `true`. */
  restoreFocus?: boolean;
  /** Default body padding; `false` for flush content. */
  padding?: boolean;
  /** Per-instance message overrides (merged over the overlay config). */
  messages?: Partial<OgeOverlayMessages>;
  /** Body content. */
  children?: ReactNode;
  /** Cancelable: fires before the window opens (any open path). */
  onOpening?: (event: OgeWindowOpeningEvent) => void;
  /** Cancelable: fires before Escape / ✕ / `close()` closes the window. */
  onClosing?: (event: OgeWindowClosingEvent) => void;
  /** Fires after the window closed, with the reason. */
  onClosed?: (event: OgeWindowClosedEvent) => void;
  /** Fires after a drag, a keyboard move, `center()` or a `position` change. */
  onMoved?: (event: OgeWindowMovedEvent) => void;
  /** Fires after a resize gesture or a keyboard resize. */
  onResized?: (event: OgeWindowResizedEvent) => void;
  /** Cancelable: fires before minimize / maximize / restore. */
  onStateChanging?: (event: OgeWindowStateChangingEvent) => void;
  /** Fires after the display state changed. */
  onStateChanged?: (event: OgeWindowStateChangedEvent) => void;
  /** Fires when the window becomes the frontmost (active) one. */
  onActivated?: () => void;
  className?: string;
  style?: CSSProperties;
}

function bumpAdapter(bump: () => void): OgeReactivityAdapter {
  return {
    cell<T>(initial: T): OgeReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeReactiveCell<T>;
      cell.set = (next) => {
        if (Object.is(next, value)) return;
        value = next;
        bump();
      };
      return cell;
    },
    derived: (compute) => compute,
  };
}

function coreProps(
  props: OgeWindowProps,
  messages: Partial<OgeOverlayMessages>,
): OgeWindowCoreProps {
  return {
    draggable: props.draggable ?? true,
    resizable: props.resizable ?? true,
    keepInViewport: props.keepInViewport ?? true,
    placement: props.placement ?? 'center',
    position: props.position,
    minWidth: props.minWidth,
    minHeight: props.minHeight,
    maxWidth: props.maxWidth,
    maxHeight: props.maxHeight,
    closeOnEscape: props.closeOnEscape ?? true,
    messages,
  };
}

/**
 * Non-modal floating window — the React render of the Angular
 * `<oge-window>`, over the same `@oge-ui/behavior` `OgeWindowCore` (geometry,
 * shared z-order, drag/resize gestures, keyboard twin, state machine) and the
 * same stylesheet. No backdrop, no focus trap, no scroll lock; several can be
 * open at once and a press or focus brings one to the front.
 *
 * ```tsx
 * <OgeWindow title="Inspector" placement="end" width={320}
 *            opened={open} onOpenedChange={setOpen} onMoved={save}>
 *   …
 * </OgeWindow>
 * ```
 *
 * Keyboard on the focused frame: arrows move by 10px, Ctrl/⌘ + arrows
 * resize, Shift makes either step 1px, Alt+↑ maximizes, Alt+↓ minimizes;
 * Escape closes while focus is inside and no popup is open.
 */
export const OgeWindow = forwardRef(function OgeWindowRender(
  props: OgeWindowProps,
  ref: ForwardedRef<OgeWindowHandle>,
) {
  const {
    title,
    ariaLabel,
    showMinimizeButton = true,
    showMaximizeButton = true,
    showCloseButton = true,
    resizable = true,
    draggable = true,
    padding = true,
    children,
    className,
    style,
  } = props;

  const config = useOgeOverlayConfig();
  const messages: OgeOverlayMessages = {
    ...config.messages,
    ...props.messages,
  };
  const reactId = useId();
  const titleId = `oge-window-title-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const [uncontrolledOpened, setUncontrolledOpened] = useState(
    props.defaultOpened ?? false,
  );
  const opened = props.opened ?? uncontrolledOpened;

  const latest = useRef({ props, opened, messages });
  latest.current = { props, opened, messages };

  const shown = useRef(false);
  const pendingFocus = useRef(false);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const actions = useRef({
    requestClose: (_reason: OgeWindowCloseReason): void => undefined,
  });

  const coreRef = useRef<OgeWindowCore | null>(null);
  if (!coreRef.current) {
    const core = new OgeWindowCore({
      adapter: bumpAdapter(bump),
      props: () => coreProps(latest.current.props, latest.current.messages),
      panel: () => panelRef.current,
      onMoved: (event) => latest.current.props.onMoved?.(event),
      onResized: (event) => latest.current.props.onResized?.(event),
      onStateChanging: (event) => latest.current.props.onStateChanging?.(event),
      onStateChanged: (event) => {
        latest.current.props.onStateChange?.(event.state);
        latest.current.props.onStateChanged?.(event);
      },
      onActivated: () => latest.current.props.onActivated?.(),
      onEscape: () => actions.current.requestClose('escape'),
      // first paint already shows the initial state — no event for it
      initialState: props.state ?? props.defaultState ?? 'normal',
    });
    coreRef.current = core;
  }
  const core = coreRef.current;

  const setOpened = (next: boolean): void => {
    if (latest.current.props.opened === undefined) setUncontrolledOpened(next);
    latest.current.props.onOpenedChange?.(next);
  };

  const focusInside = (): void => {
    const panel = panelRef.current;
    if (!panel) return;
    const mode = latest.current.props.autoFocus ?? 'first-tabbable';
    resolveOgeWindowInitialFocus(panel, mode === false ? 'panel' : mode)?.focus(
      {
        preventScroll: true,
      },
    );
  };

  const teardown = (): void => {
    shown.current = false;
    core.detach();
  };

  const doOpen = (): void => {
    if (typeof window === 'undefined') return;
    const opening: OgeWindowOpeningEvent = { cancel: false };
    latest.current.props.onOpening?.(opening);
    if (opening.cancel) {
      if (latest.current.opened) setOpened(false);
      return;
    }
    shown.current = true;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    core.attach();
    core.place();
    // the frame is `visibility: hidden` until the placed render commits, and
    // a hidden element cannot take focus — the effect below focuses after it
    pendingFocus.current =
      (latest.current.props.autoFocus ?? 'first-tabbable') !== false;
  };

  const finalizeClose = (reason: OgeWindowCloseReason): void => {
    if (!shown.current) return;
    const panel = panelRef.current;
    teardown();
    if (
      (latest.current.props.restoreFocus ?? true) &&
      previouslyFocused.current
    ) {
      if (isModalFocusOrphaned(panel)) previouslyFocused.current.focus();
    }
    previouslyFocused.current = null;
    if (latest.current.opened) setOpened(false);
    latest.current.props.onClosed?.({ reason });
  };

  const requestClose = (reason: OgeWindowCloseReason): void => {
    if (!shown.current) return;
    const closing: OgeWindowClosingEvent = { reason, cancel: false };
    latest.current.props.onClosing?.(closing);
    if (closing.cancel) return;
    finalizeClose(reason);
  };
  actions.current.requestClose = requestClose;

  // `opened` prop ↔ DOM-side state; StrictMode's cleanup → remount re-opens.
  useEffect(() => {
    if (opened && !shown.current) doOpen();
    else if (!opened && shown.current) finalizeClose('api');
  }, [opened]);

  useEffect(
    () => () => {
      if (shown.current) teardown();
    },
    [],
  );

  // initial focus, once the placed (visible) frame has committed
  useEffect(() => {
    if (!pendingFocus.current || !shown.current) return;
    if (!panelRef.current?.classList.contains('oge-window-placed')) return;
    pendingFocus.current = false;
    focusInside();
  });

  // controlled `state`: a prop change runs the cancelable pipeline
  useEffect(() => {
    const wanted = props.state;
    if (wanted === undefined || wanted === core.state()) return;
    if (!core.setState(wanted))
      latest.current.props.onStateChange?.(core.state());
  }, [props.state]);

  useEffect(() => {
    if (shown.current) core.syncPosition();
  }, [props.position?.x, props.position?.y, props.placement]);

  useImperativeHandle(
    ref,
    () => ({
      get opened() {
        return latest.current.opened;
      },
      get state() {
        return core.state();
      },
      open: () => setOpened(true),
      close: () => requestClose('api'),
      toggle: () => {
        if (latest.current.opened) requestClose('api');
        else setOpened(true);
      },
      minimize: () => core.minimize(),
      maximize: () => core.maximize(),
      restore: () => core.restore(),
      bringToFront: () => core.bringToFront(),
      center: () => core.center(),
      moveTo: (x, y) => core.moveTo(x, y),
      resizeTo: (width, height) => core.resizeTo(width, height),
      focus: focusInside,
    }),
    [],
  );

  if (!opened) return null;

  const state = core.state();
  const rect = core.rect();
  const maximized = state === 'maximized';
  const limit = (value: number | undefined): number | undefined =>
    maximized ? undefined : value;
  const panelStyle: CSSProperties = {
    ...style,
    left: rect && !maximized ? rect.x : undefined,
    top: rect && !maximized ? rect.y : undefined,
    width: maximized
      ? undefined
      : rect?.width != null
        ? `${rect.width}px`
        : (modalCssSize(props.width) ?? undefined),
    height:
      state !== 'normal'
        ? undefined
        : rect?.height != null
          ? `${rect.height}px`
          : (modalCssSize(props.height) ?? undefined),
    minWidth: limit(props.minWidth),
    minHeight: state === 'minimized' ? undefined : limit(props.minHeight),
    maxWidth: limit(props.maxWidth),
    maxHeight: limit(props.maxHeight),
    zIndex: ogeWindowZIndex(props.zIndex, core.layer()),
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (core.keydown(event.nativeEvent)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onHeaderDoubleClick = (event: ReactMouseEvent): void => {
    if (!showMaximizeButton) return;
    if ((event.target as Element).closest('button')) return;
    core.toggleMaximize();
  };

  const interaction = core.interaction();

  return (
    <div
      ref={panelRef}
      className={[
        'oge-window',
        rect !== null && 'oge-window-placed',
        core.active() && 'oge-window-active',
        state === 'minimized' && 'oge-window-minimized',
        maximized && 'oge-window-maximized',
        interaction === 'move' && 'oge-window-moving',
        interaction === 'resize' && 'oge-window-resizing',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      tabIndex={0}
      aria-labelledby={title !== undefined ? titleId : undefined}
      aria-label={title !== undefined ? undefined : ariaLabel}
      aria-keyshortcuts={OGE_WINDOW_KEY_SHORTCUTS}
      style={panelStyle}
      onPointerDown={() => core.bringToFront()}
      onFocus={() => core.bringToFront()}
      onKeyDown={onKeyDown}
    >
      <div
        className={[
          'oge-window-header',
          draggable && !maximized && 'oge-window-header-draggable',
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerDown={(event) => core.startDrag(event)}
        onDoubleClick={onHeaderDoubleClick}
      >
        <h2 className="oge-window-title" id={titleId}>
          {title}
        </h2>
        <div className="oge-window-controls">
          {showMinimizeButton && (
            <button
              type="button"
              className="oge-window-button oge-window-minimize"
              aria-label={
                state === 'minimized'
                  ? messages.modalRestore
                  : ogeOverlayMessage(messages, 'windowMinimize')
              }
              onClick={() =>
                state === 'minimized' ? core.restore() : core.minimize()
              }
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                width="14"
                height="14"
              >
                {state === 'minimized' ? (
                  <path
                    d="M3 10l5-5 5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ) : (
                  <path
                    d="M3 12h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
              </svg>
            </button>
          )}
          {showMaximizeButton && (
            <button
              type="button"
              className="oge-window-button oge-window-maximize"
              aria-label={
                maximized ? messages.modalRestore : messages.modalMaximize
              }
              onClick={() => (maximized ? core.restore() : core.maximize())}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                width="14"
                height="14"
              >
                {maximized ? (
                  <path
                    d="M5 5V3h8v8h-2M3 5h8v8H3z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ) : (
                  <rect
                    x="3"
                    y="3"
                    width="10"
                    height="10"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    fill="none"
                  />
                )}
              </svg>
            </button>
          )}
          {showCloseButton && (
            <button
              type="button"
              className="oge-window-button oge-window-close"
              aria-label={messages.modalClose}
              onClick={() => requestClose('closeButton')}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                width="14"
                height="14"
              >
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div
        className={['oge-window-body', !padding && 'oge-window-body-flush']
          .filter(Boolean)
          .join(' ')}
        hidden={state === 'minimized'}
      >
        {children}
      </div>
      {resizable &&
        state === 'normal' &&
        OGE_WINDOW_RESIZE_EDGES.map((edge) => (
          // pointer affordance; the keyboard twin is Ctrl+arrows on the frame
          <div
            key={edge}
            aria-hidden="true"
            className={`oge-window-resize oge-window-resize-${edge}`}
            onPointerDown={(event) => core.startResize(event, edge)}
          />
        ))}
    </div>
  );
});
