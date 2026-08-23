'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  clampModalDrag,
  clampModalResize,
  inertModalBackground,
  isModalFocusOrphaned,
  isTopOverlay,
  lockBodyScroll,
  modalCssSize,
  pushOverlay,
  removeOverlay,
  resolveModalInitialFocus,
  runAsyncGuard,
  trackPointerGesture,
  trapTabKey,
  unlockBodyScroll,
  type OgeModalAutoFocus,
  type OgeModalClosedEvent,
  type OgeModalCloseReason,
  type OgeModalClosingEvent,
  type OgeModalOpeningEvent,
  type OgeModalPlacement,
  type OgeModalResizeEvent,
  type OgeOverlayMessages,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';

/**
 * Context handed to the `renderTitle` / `renderHeaderActions` / `renderFooter`
 * slots — the React face of Angular's `OgeModalSlotContext`.
 */
export interface OgeModalSlotContext<R = unknown> {
  /** Closes the modal (reason `'api'`); an argument becomes `closed.result`. */
  close: (result?: R) => void;
  /** `true` while an async `closeGuard` is pending — disable footer actions with it. */
  closePending: boolean;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeModalHandle<R = unknown> {
  /** Whether the modal is open right now. */
  readonly opened: boolean;
  /** `true` while an async `closeGuard` is in flight. */
  readonly closePending: boolean;
  /** Opens the modal. */
  open(): void;
  /** Closes through the full pipeline (`onClosing` → `closeGuard`); reason `'api'`. */
  close(result?: R): void;
  /** Toggles between open and closed. */
  toggle(): void;
  /** Re-applies the initial-focus resolution. No-op while closed. */
  focus(): void;
  /** Switches between windowed and full-screen (the maximize button's action). */
  toggleFullScreen(): void;
}

export interface OgeModalProps<R = unknown> {
  /** Whether the modal is open — controlled when provided. Setting it `false` closes without the guard pipeline. */
  opened?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpened?: boolean;
  /** The controlled half of `opened`. */
  onOpenedChange?: (opened: boolean) => void;
  /** Full-screen state — controlled when provided; size props are ignored while `true`. */
  fullScreen?: boolean;
  /** Uncontrolled initial full-screen state. */
  defaultFullScreen?: boolean;
  /** The controlled half of `fullScreen`. */
  onFullScreenChange?: (fullScreen: boolean) => void;
  /** Header text; also the aria-label fallback when the header is hidden. */
  title?: string;
  /** Accessible name override for headerless modals. */
  ariaLabel?: string;
  /** Panel width — number = px, string passed through. Default `min(560px, 100%)`. */
  width?: number | string;
  /** Fixed panel height — number = px, string passed through. Default: content. */
  height?: number | string;
  /** Min panel width — number = px, string passed through. */
  minWidth?: number | string;
  /** Min panel height — number = px, string passed through. */
  minHeight?: number | string;
  /** Max panel width — number = px, string passed through. Default: layer width. */
  maxWidth?: number | string;
  /** Max panel height — number = px, string passed through. Default: layer height. */
  maxHeight?: number | string;
  /** Where the panel sits: viewport center or pinned near the top. Default `'center'`. */
  placement?: OgeModalPlacement;
  /** Dims the page behind the modal. `false` keeps the backdrop transparent (still modal). Default `true`. */
  shading?: boolean;
  /** Shows the header ✕ button. Default `true`. */
  showCloseButton?: boolean;
  /** Shows a maximize/restore toggle in the header, driving `fullScreen`. Default `false`. */
  showMaximizeButton?: boolean;
  /** Lets the user drag the panel by its header. Default `false`. */
  dragEnabled?: boolean;
  /** Allows dragging the panel beyond the viewport edges. Default `false`. */
  dragOutsideBoundary?: boolean;
  /** Resets drag offset and resized size on every reopen. Default `true`. */
  restorePosition?: boolean;
  /** Shows a bottom-end resize handle. Default `false`. */
  resizeEnabled?: boolean;
  /** Marks everything outside the modal `inert` while open (opt-in). Default `false`. */
  inertBackground?: boolean;
  /** Escape closes the modal when it is the topmost overlay. Default `true`. */
  closeOnEscape?: boolean;
  /** A click that starts and ends on the backdrop closes the modal. Default `true`. */
  closeOnBackdropClick?: boolean;
  /** Locks body scroll while open (scrollbar-width compensated). Default `true`. */
  scrollLock?: boolean;
  /** Initial focus target. Default `'first-tabbable'`. */
  autoFocus?: OgeModalAutoFocus;
  /** Restores focus to the opener on close (only when focus would be lost). Default `true`. */
  restoreFocus?: boolean;
  /** Default body padding; `false` for flush content (grids, custom layouts). */
  padding?: boolean;
  /** Busy state: spinner veil, `aria-busy`, user-initiated closes blocked. */
  busy?: boolean;
  /** Veto hook run before every close in the pipeline; may be async (single-flight). */
  closeGuard?: () => boolean | Promise<boolean>;
  /** Per-instance message overrides (merged over the overlay config). */
  messages?: Partial<OgeOverlayMessages>;
  /** Rich title slot, replacing the plain `title` text — the React face of `*ogeModalTitle`. */
  renderTitle?: (context: OgeModalSlotContext<R>) => ReactNode;
  /** Extra title-bar buttons next to ✕ — the React face of `*ogeModalHeaderActions`. Presses here never start a header drag. */
  renderHeaderActions?: (context: OgeModalSlotContext<R>) => ReactNode;
  /** Footer slot — the React face of `*ogeModalFooter`; `close(result)` carries a typed result. */
  renderFooter?: (context: OgeModalSlotContext<R>) => ReactNode;
  /** Body content. */
  children?: ReactNode;
  /** Cancelable: fires before the modal opens (any open path). */
  onOpening?: (event: OgeModalOpeningEvent) => void;
  /** Cancelable: fires before any pipeline close (escape/backdrop/✕/`close()`). */
  onClosing?: (event: OgeModalClosingEvent) => void;
  /** Fires after the modal closed, with reason and optional result. */
  onClosed?: (event: OgeModalClosedEvent<R>) => void;
  /** Fires when a resize gesture starts, with the starting size. */
  onResizeStarted?: (event: OgeModalResizeEvent) => void;
  /** Fires when a resize gesture ends, with the final size. */
  onResized?: (event: OgeModalResizeEvent) => void;
  /** Fires whenever the async `closeGuard` starts or settles. */
  onClosePendingChange?: (pending: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Centered modal dialog: backdrop, focus trap, body scroll lock, Escape/
 * backdrop closing and focus restore — the React render of the Angular
 * `<oge-modal>`, over the same `@oge-ui/behavior` primitives (the shared
 * overlay Escape stack, focus trap, scroll lock, focus resolution and the
 * drag/resize arithmetic) and the same stylesheet.
 *
 * ```tsx
 * <OgeModal title="Edit row" opened={open} onOpenedChange={setOpen}
 *           renderFooter={({ close }) => <button onClick={() => close()}>Save</button>}>
 *   <form>…</form>
 * </OgeModal>
 * ```
 *
 * User gestures (Escape, backdrop, ✕) and `close()` run the full pipeline —
 * cancelable `onClosing`, then the async `closeGuard` — while flipping the
 * `opened` prop to `false` closes immediately (the app already decided). The
 * modal renders inline where declared: keep it away from `transform`ed
 * ancestors, which break `position: fixed` — or use `useOgeModals()` for a
 * body-appended one.
 */
export const OgeModal = forwardRef(function OgeModalRender<R = unknown>(
  props: OgeModalProps<R>,
  ref: ForwardedRef<OgeModalHandle<R>>,
) {
  const {
    title,
    ariaLabel,
    placement = 'center',
    shading = true,
    showCloseButton = true,
    showMaximizeButton = false,
    dragEnabled = false,
    resizeEnabled = false,
    padding = true,
    busy = false,
    renderTitle,
    renderHeaderActions,
    renderFooter,
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
  const titleId = `oge-modal-title-${reactId.replace(/:/g, '')}`;

  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // --- opened / fullScreen (controlled/uncontrolled) -----------------------

  const [uncontrolledOpened, setUncontrolledOpened] = useState(
    props.defaultOpened ?? false,
  );
  const opened = props.opened ?? uncontrolledOpened;

  const [uncontrolledFullScreen, setUncontrolledFullScreen] = useState(
    props.defaultFullScreen ?? false,
  );
  const fullScreen = props.fullScreen ?? uncontrolledFullScreen;

  const [closePending, setClosePendingState] = useState(false);
  /** Entrance-transition state; set one frame after the layer mounts. */
  const [ready, setReady] = useState(false);
  /** Drag offset applied to the panel; `null` while undragged. */
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null,
  );
  /** Explicit size set by a resize gesture; wins over the size props. */
  const [resizeSize, setResizeSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const latest = useRef({ props, opened, fullScreen });
  latest.current = { props, opened, fullScreen };

  /** Mirrors the DOM-side open state (listeners, stack, lock). */
  const shown = useRef(false);
  const closePendingRef = useRef(false);
  const holdingScrollLock = useRef(false);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const backdropPress = useRef(false);
  const activeGestureCleanup = useRef<(() => void) | null>(null);
  const releaseInert = useRef<(() => void) | null>(null);
  /** Identity this modal holds in the shared overlay stack. */
  const overlayToken = useRef({});

  const setOpened = (next: boolean): void => {
    if (latest.current.props.opened === undefined) setUncontrolledOpened(next);
    latest.current.props.onOpenedChange?.(next);
  };

  const setFullScreen = (next: boolean): void => {
    if (latest.current.props.fullScreen === undefined) {
      setUncontrolledFullScreen(next);
    }
    latest.current.props.onFullScreenChange?.(next);
  };

  const setClosePending = (pending: boolean): void => {
    closePendingRef.current = pending;
    setClosePendingState(pending);
    latest.current.props.onClosePendingChange?.(pending);
  };

  // --- focus ---------------------------------------------------------------

  const applyInitialFocus = (): void => {
    const panelEl = panelRef.current;
    if (!panelEl) return;
    resolveModalInitialFocus(
      panelEl,
      latest.current.props.autoFocus ?? 'first-tabbable',
    ).focus({ preventScroll: true });
  };

  // --- open / close pipelines ---------------------------------------------

  const onDocumentKeydown = useRef((event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    if (!isTopOverlay(overlayToken.current)) return;
    if ((latest.current.props.closeOnEscape ?? true) === false) return;
    event.stopPropagation();
    requestClose('escape');
  });

  /** Releases stack/lock/listeners; shared by close and unmount. */
  const teardown = (): void => {
    shown.current = false;
    setReady(false);
    backdropPress.current = false;
    activeGestureCleanup.current?.();
    activeGestureCleanup.current = null;
    releaseInert.current?.();
    releaseInert.current = null;
    removeOverlay(overlayToken.current);
    if (holdingScrollLock.current) {
      unlockBodyScroll();
      holdingScrollLock.current = false;
    }
    document.removeEventListener('keydown', onDocumentKeydown.current);
  };

  const doOpen = (): void => {
    if (typeof window === 'undefined') return; // SSR: nothing to show
    const opening: OgeModalOpeningEvent = { cancel: false };
    latest.current.props.onOpening?.(opening);
    if (opening.cancel) {
      if (latest.current.opened) setOpened(false);
      return;
    }
    shown.current = true;
    if (latest.current.props.restorePosition ?? true) {
      setDragOffset(null);
      setResizeSize(null);
    }
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    pushOverlay(overlayToken.current);
    if (latest.current.props.scrollLock ?? true) {
      lockBodyScroll();
      holdingScrollLock.current = true;
    }
    document.addEventListener('keydown', onDocumentKeydown.current);
    // One frame after mount: play the entrance transition and move focus.
    requestAnimationFrame(() => {
      if (!shown.current) return;
      setReady(true);
      applyInitialFocus();
      if (latest.current.props.inertBackground ?? false) {
        const layer = layerRef.current;
        if (layer) releaseInert.current = inertModalBackground(layer);
      }
    });
  };

  const finalizeClose = (reason: OgeModalCloseReason, result?: R): void => {
    if (!shown.current) return;
    const panelEl = panelRef.current;
    teardown();
    if (
      (latest.current.props.restoreFocus ?? true) &&
      previouslyFocused.current
    ) {
      // Only restore when focus would otherwise be lost — never steal the
      // user's new focus target.
      if (isModalFocusOrphaned(panelEl)) previouslyFocused.current.focus();
    }
    previouslyFocused.current = null;
    if (latest.current.opened) setOpened(false);
    latest.current.props.onClosed?.({ reason, result });
  };

  /** Runs the close pipeline for user gestures and `close()`. */
  const requestClose = (reason: OgeModalCloseReason, result?: R): void => {
    if (!shown.current || closePendingRef.current) return;
    if ((latest.current.props.busy ?? false) && reason !== 'api') return;
    const closing: OgeModalClosingEvent = { reason, cancel: false };
    latest.current.props.onClosing?.(closing);
    if (closing.cancel) return;
    runAsyncGuard(latest.current.props.closeGuard, {
      allow: () => {
        if (shown.current) finalizeClose(reason, result);
      },
      pending: (active) => setClosePending(active),
      label: 'oge-overlay modal closeGuard',
    });
  };

  // --- effects -------------------------------------------------------------

  // `opened` prop ↔ DOM-side state, loop-guarded by comparing states first.
  useEffect(() => {
    if (opened && !shown.current) doOpen();
    else if (!opened && shown.current) finalizeClose('api');
    // every other value this reads comes through `latest`
  }, [opened]);

  // StrictMode: the cleanup tears the hold down and the `opened` effect above
  // re-runs on the remount, which re-opens with the same instance.
  useEffect(
    () => () => {
      if (shown.current) teardown();
    },
    [],
  );

  // --- gestures ------------------------------------------------------------

  const trackGesture = (
    onMove: (e: PointerEvent) => void,
    onEnd?: (e: PointerEvent) => void,
  ): void => {
    activeGestureCleanup.current?.();
    const cleanup = trackPointerGesture(onMove, (e) => {
      activeGestureCleanup.current = null;
      onEnd?.(e);
    });
    activeGestureCleanup.current = () => {
      cleanup();
      activeGestureCleanup.current = null;
    };
  };

  /** Starts a header drag; buttons inside the header keep their clicks. */
  const onHeaderPointerDown = (event: ReactPointerEvent): void => {
    if (!dragEnabled || fullScreen) return;
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button')) return;
    const panelEl = panelRef.current;
    if (!panelEl) return;
    event.preventDefault(); // no text selection mid-drag
    const start = dragOffset ?? { x: 0, y: 0 };
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = panelEl.getBoundingClientRect();
    trackGesture((e) => {
      setDragOffset(
        clampModalDrag({
          start,
          dx: e.clientX - startX,
          dy: e.clientY - startY,
          rect,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          allowOutside: latest.current.props.dragOutsideBoundary ?? false,
        }),
      );
    });
  };

  /** Starts a bottom-end resize gesture. */
  const onResizeHandlePointerDown = (event: ReactPointerEvent): void => {
    if (event.button !== 0) return;
    const panelEl = panelRef.current;
    if (!panelEl) return;
    event.preventDefault();
    const start = { width: panelEl.offsetWidth, height: panelEl.offsetHeight };
    const startX = event.clientX;
    const startY = event.clientY;
    latest.current.props.onResizeStarted?.({
      ...start,
      event: event.nativeEvent,
    });
    let size = start;
    trackGesture(
      (e) => {
        size = clampModalResize({
          start,
          dx: e.clientX - startX,
          dy: e.clientY - startY,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        });
        setResizeSize(size);
      },
      (e) => latest.current.props.onResized?.({ ...size, event: e }),
    );
  };

  const onLayerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Tab') return;
    const panelEl = panelRef.current;
    if (panelEl) trapTabKey(event.nativeEvent, panelEl, panelEl);
  };

  const onLayerPointerDown = (event: ReactPointerEvent): void => {
    backdropPress.current = event.target === layerRef.current;
  };

  const onLayerClick = (event: ReactMouseEvent): void => {
    const onLayer = event.target === layerRef.current;
    // Both press and release must land on the backdrop itself — a
    // text-selection drag ending outside the panel must not close the modal.
    if (
      onLayer &&
      backdropPress.current &&
      (latest.current.props.closeOnBackdropClick ?? true)
    ) {
      requestClose('backdrop');
    }
    backdropPress.current = false;
  };

  // --- imperative surface --------------------------------------------------

  const open = (): void => setOpened(true);
  const close = (result?: R): void => requestClose('api', result);
  const toggleFullScreen = (): void =>
    setFullScreen(!latest.current.fullScreen);

  useImperativeHandle(
    ref,
    () => ({
      opened,
      closePending,
      open,
      close,
      toggle: () => {
        if (latest.current.opened) close();
        else open();
      },
      focus: () => {
        if (shown.current) applyInitialFocus();
      },
      toggleFullScreen,
    }),
    [opened, closePending],
  );

  // --- render --------------------------------------------------------------

  if (!opened) return null;

  const slot: OgeModalSlotContext<R> = { close, closePending };
  const hasHeader =
    title !== undefined ||
    renderTitle !== undefined ||
    renderHeaderActions !== undefined ||
    showCloseButton;
  const labelledBy =
    title !== undefined || renderTitle !== undefined ? titleId : undefined;
  const ariaLabelAttr = labelledBy ? undefined : (ariaLabel ?? title);

  const size = (value: number | string | undefined): string | undefined =>
    fullScreen ? undefined : (modalCssSize(value) ?? undefined);

  const panelStyle: CSSProperties = {
    width: fullScreen
      ? undefined
      : resizeSize
        ? `${resizeSize.width}px`
        : size(props.width),
    height: fullScreen
      ? undefined
      : resizeSize
        ? `${resizeSize.height}px`
        : size(props.height),
    minWidth: size(props.minWidth),
    minHeight: size(props.minHeight),
    maxWidth: size(props.maxWidth),
    maxHeight: size(props.maxHeight),
    transform:
      dragOffset && !fullScreen
        ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
        : undefined,
  };

  return (
    <div
      ref={layerRef}
      className={[
        'oge-modal-layer',
        ready && 'oge-modal-layer-ready',
        placement === 'top' && !fullScreen && 'oge-modal-layer-top',
        !shading && 'oge-modal-layer-unshaded',
        fullScreen && 'oge-modal-layer-fullscreen',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onPointerDown={onLayerPointerDown}
      onClick={onLayerClick}
      onKeyDown={onLayerKeyDown}
    >
      <div
        ref={panelRef}
        className={['oge-modal', fullScreen && 'oge-modal-fullscreen']
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={labelledBy}
        aria-label={ariaLabelAttr}
        aria-busy={busy || undefined}
        style={panelStyle}
      >
        {hasHeader && (
          <div
            className={[
              'oge-modal-header',
              dragEnabled && !fullScreen && 'oge-modal-header-draggable',
            ]
              .filter(Boolean)
              .join(' ')}
            onPointerDown={onHeaderPointerDown}
          >
            <h2 className="oge-modal-title" id={titleId}>
              {renderTitle ? renderTitle(slot) : title}
            </h2>
            {renderHeaderActions && (
              <div className="oge-modal-header-actions">
                {renderHeaderActions(slot)}
              </div>
            )}
            {showMaximizeButton && (
              <button
                type="button"
                className="oge-modal-maximize"
                aria-label={
                  fullScreen ? messages.modalRestore : messages.modalMaximize
                }
                onClick={toggleFullScreen}
              >
                {fullScreen ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                  >
                    <path
                      d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                  >
                    <path
                      d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                )}
              </button>
            )}
            {showCloseButton && (
              <button
                type="button"
                className="oge-modal-close"
                disabled={busy || closePending}
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
        )}
        <div
          className={['oge-modal-body', !padding && 'oge-modal-body-flush']
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
        {renderFooter && (
          <div className="oge-modal-footer">{renderFooter(slot)}</div>
        )}
        {busy && (
          <div className="oge-modal-busy-veil" aria-hidden="true">
            <span className="oge-modal-spinner"></span>
          </div>
        )}
        {resizeEnabled && !fullScreen && (
          // pointer-only affordance, like every reference library
          <div
            className="oge-modal-resize-handle"
            aria-hidden="true"
            onPointerDown={onResizeHandlePointerDown}
          ></div>
        )}
      </div>
    </div>
  );
}) as <R = unknown>(
  props: OgeModalProps<R> & { ref?: Ref<OgeModalHandle<R>> },
) => ReactNode;
