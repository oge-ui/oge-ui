'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  beginOgeDrawerSwipe,
  buildOgeDrawerItems,
  ogeDrawerItemNavIndex,
  ogeDrawerPhysicalEdge,
  ogeDrawerRailTooltipPlacement,
  ogeResolveDirection,
  runOgeDrawerItemClick,
  type OgeDirection,
  type OgeDrawerItem,
  type OgeDrawerItemClickEvent,
  type OgeDrawerItemView,
  type OgeDrawerSelectionChangedEvent,
  type OgePointerGestureHandle,
  getTabbableElements,
  isTopOverlay,
  lockBodyScroll,
  pushOverlay,
  removeOverlay,
  resolveDrawerMode,
  runAsyncGuard,
  trapTabKey,
  unlockBodyScroll,
  type OgeDrawerAutoFocus,
  type OgeDrawerClosedEvent,
  type OgeDrawerCloseReason,
  type OgeDrawerClosingEvent,
  type OgeDrawerLandmark,
  type OgeDrawerMessages,
  type OgeDrawerMode,
  type OgeDrawerModeChangedEvent,
  type OgeDrawerOpeningEvent,
  type OgeDrawerPosition,
} from '@oge-ui/behavior';
import { OgeTooltip } from '@oge-ui/react-overlay';
import { useOgeDrawerConfig } from './navigation-config';

/** Context handed to `renderItem` — the React face of `ogeDrawerItemTemplate`. */
export interface OgeDrawerItemRenderContext {
  /** The entry. */
  item: OgeDrawerItem;
  /** Its selection key. */
  key: string;
  /** Whether it is the `selectedKey` entry. */
  active: boolean;
  /** Whether the drawer is a collapsed mini rail (icons only) right now. */
  rail: boolean;
  /** Position in `items`. */
  index: number;
}

/** `number` → px, everything else verbatim. */
function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeDrawerHandle {
  /** id of the panel element — the target of a trigger's `aria-controls`. */
  readonly drawerId: string;
  /** Whether the drawer is open right now. */
  readonly opened: boolean;
  /** `true` while an async `closeGuard` is in flight. */
  readonly closePending: boolean;
  /** Opens the drawer. */
  open(): void;
  /** Closes through the full pipeline (`onClosing` → `closeGuard`). */
  close(): void;
  /** Opens or closes; `force` drives it to a known state. */
  toggle(force?: boolean): void;
  /** Re-applies the initial-focus resolution. No-op unless open and modal. */
  focus(): void;
}

export interface OgeDrawerProps {
  /** Panel content — the React counterpart of the `[ogeDrawerPanel]` slot. */
  panel?: ReactNode;
  /** Everything the drawer sits next to. */
  children?: ReactNode;
  /** Whether the drawer is open — controlled when provided. */
  opened?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  /** Layout mode; also what decides whether the drawer is modal. */
  mode?: OgeDrawerMode;
  /** Edge the panel is attached to. Logical: `start`/`end` mirror in RTL. */
  position?: OgeDrawerPosition;
  /** Size of the open panel along its cross axis. `number` means px. */
  size?: number | string;
  /**
   * Size of the *closed* panel — the compact rail that keeps icons visible.
   * Only meaningful for `mode: 'side'`: a rail belongs to the layout, and a
   * modal drawer that is still partly on screen is not closed.
   */
  minSize?: number | string;
  /**
   * Below this **container** inline size the drawer downgrades to `'overlay'`
   * and closes. Measured against the drawer's own box, never the window.
   */
  compactBelow?: number;
  /** Landmark role while persistent. Ignored while modal (always `dialog`). */
  landmark?: OgeDrawerLandmark;
  /**
   * Blocks every open and close gesture — including `open()`/`close()`. A
   * drawer already open stays open and stays usable.
   */
  disabled?: boolean;
  /** Renders a close button in the panel's top corner. */
  showCloseButton?: boolean;
  /** Renders the backdrop of a modal drawer. */
  shading?: boolean;
  /** Escape closes a modal drawer. Persistent drawers never take Escape. */
  closeOnEscape?: boolean;
  /** A click on the backdrop closes a modal drawer. */
  closeOnBackdropClick?: boolean;
  /**
   * Locks **document** scroll while a modal drawer is open. Off by default:
   * a drawer is usually an in-page region.
   */
  scrollLock?: boolean;
  /** Marks the drawer's own content region `inert` while modal and open. */
  inertBackground?: boolean;
  /** Where focus lands when a modal drawer opens. */
  autoFocus?: OgeDrawerAutoFocus;
  /** Returns focus to the opener when the drawer closes. */
  restoreFocus?: boolean;
  /** Enables the open/close transition. */
  animationEnabled?: boolean;
  /** Duration of that transition, in milliseconds. */
  animationDuration?: number;
  /** Accessible name of the panel. */
  ariaLabel?: string;
  /** id of an element naming the panel; wins over `ariaLabel`. */
  ariaLabelledBy?: string;
  /**
   * Vetoes a close. Return `false`, throw, or reject to keep the drawer open;
   * a promise reports pending through the handle's `closePending`.
   */
  closeGuard?: () => boolean | Promise<boolean>;
  /** Per-instance message overrides. */
  messages?: Partial<OgeDrawerMessages>;
  /** Cancelable — set `cancel` to keep the drawer closed. */
  onOpening?: (event: OgeDrawerOpeningEvent) => void;
  /** The drawer finished opening. */
  onAfterOpened?: () => void;
  /** Cancelable — set `cancel` to keep the drawer open. */
  onClosing?: (event: OgeDrawerClosingEvent) => void;
  /** The drawer finished closing. */
  onClosed?: (event: OgeDrawerClosedEvent) => void;
  /** The resolved layout mode changed. */
  onModeChanged?: (event: OgeDrawerModeChangedEvent) => void;
  /** Fires whenever the async `closeGuard` starts or settles. */
  onClosePendingChange?: (pending: boolean) => void;
  /**
   * Built-in navigation entries rendered at the top of the panel, before
   * `panel`: links (`url`) or buttons, icons, badges and separators. In the
   * mini rail (`minSize`, closed) only the icons show and the label becomes
   * the accessible name and a tooltip.
   */
  items?: readonly OgeDrawerItem[];
  /** Key of the active entry (`aria-current="page"`) — controlled when provided. */
  selectedKey?: string;
  /** Uncontrolled initial active entry. */
  defaultSelectedKey?: string;
  onSelectedKeyChange?: (key: string) => void;
  /** An entry of `items` was activated (click, Enter or Space). */
  onItemClick?: (event: OgeDrawerItemClickEvent) => void;
  /** The active entry changed through the item list. */
  onSelectionChanged?: (event: OgeDrawerSelectionChangedEvent) => void;
  /**
   * Replaces the content of a built-in entry — the React face of
   * `ogeDrawerItemTemplate`. The drawer keeps the `<a>` / `<button>` around
   * it, so return no focusable control.
   */
  renderItem?: (context: OgeDrawerItemRenderContext) => ReactNode;
  /**
   * Touch gestures: an edge swipe opens the drawer, a swipe toward the edge
   * closes it (reason `'swipe'`, through `onClosing` and `closeGuard`). Touch
   * pointers only; off by default so existing apps keep their behaviour.
   */
  swipeEnabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A drawer: a panel attached to one edge of its content, in one of three
 * layout modes — the React render of the Angular `<oge-drawer>`.
 *
 * Like its counterpart this is **one component, not three**: the `panel` prop
 * is the drawer itself, `children` is everything it sits next to.
 *
 * ```tsx
 * <OgeDrawer
 *   opened={menuOpen}
 *   onOpenedChange={setMenuOpen}
 *   mode="side"
 *   position="start"
 *   size={260}
 *   panel={<nav>…</nav>}
 * >
 *   <main>…</main>
 * </OgeDrawer>
 * ```
 *
 * **Modality is derived from `mode`, never configured.** `'overlay'` and
 * `'push'` cover or displace the content, so they are modal: `role="dialog"`,
 * `aria-modal`, a focus trap, Escape, and `inert` on the background. `'side'`
 * is part of the layout, so it is a persistent landmark (`role` from
 * `landmark`) with none of those — an independent `modal` flag is precisely
 * what produces a panel claiming `role="complementary"` and `aria-modal` at
 * once.
 *
 * The panel content stays mounted and becomes `inert` while closed, so a
 * trigger's `aria-controls` always resolves to a real element.
 */
export const OgeDrawer = forwardRef<OgeDrawerHandle, OgeDrawerProps>(
  function OgeDrawerRender(props, ref) {
    const {
      panel,
      children,
      landmark = 'navigation',
      disabled = false,
      showCloseButton = false,
      shading = true,
      inertBackground = true,
      animationEnabled = true,
      animationDuration = 240,
      ariaLabel,
      ariaLabelledBy,
      className,
      style,
    } = props;

    const config = useOgeDrawerConfig();
    const messages: OgeDrawerMessages = {
      ...config.messages,
      ...props.messages,
    };

    const requestedMode = props.mode ?? config.mode ?? 'overlay';
    const resolvedPosition = props.position ?? config.position ?? 'start';
    const size = props.size ?? config.size ?? 260;
    const minSize = props.minSize;

    const hostRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const drawerId = `oge-drawer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

    // --- opened (controlled/uncontrolled) -----------------------------------

    const [uncontrolledOpened, setUncontrolledOpened] = useState(
      props.defaultOpened ?? false,
    );
    const opened = props.opened ?? uncontrolledOpened;

    const [closePending, setClosePendingState] = useState(false);
    const [containerSize, setContainerSize] = useState(0);

    const resolved = resolveDrawerMode({
      requestedMode,
      containerSize,
      compactBelow: props.compactBelow,
    });
    const isModal = resolved.mode !== 'side';

    const [uncontrolledSelected, setUncontrolledSelected] = useState(
      props.defaultSelectedKey,
    );
    const selectedKey =
      props.selectedKey !== undefined
        ? props.selectedKey
        : uncontrolledSelected;

    const latest = useRef({
      props,
      opened,
      isModal,
      requestedMode,
      selectedKey,
    });
    latest.current = { props, opened, isModal, requestedMode, selectedKey };

    /** Mirrors the DOM-side open state (listeners, stack, scroll lock). */
    const shown = useRef(false);
    const closePendingRef = useRef(false);
    const holdingScrollLock = useRef(false);
    const previouslyFocused = useRef<HTMLElement | null>(null);
    const backdropPress = useRef(false);
    const previousMode = useRef<OgeDrawerMode | null>(null);
    /** Identity this drawer holds in the shared overlay stack. */
    const overlayToken = useRef({});

    const setOpened = (next: boolean): void => {
      if (latest.current.props.opened === undefined) {
        setUncontrolledOpened(next);
      }
      latest.current.props.onOpenedChange?.(next);
    };

    const setClosePending = (pending: boolean): void => {
      closePendingRef.current = pending;
      setClosePendingState(pending);
      latest.current.props.onClosePendingChange?.(pending);
    };

    // --- the document-level hold a modal drawer takes ------------------------

    const onDocumentKeydown = useRef((event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      // Only the topmost surface reacts, so a popup opened inside the drawer
      // closes before the drawer does.
      if (!isTopOverlay(overlayToken.current)) return;
      if ((latest.current.props.closeOnEscape ?? true) === false) return;
      event.stopPropagation();
      requestClose('escape');
    });

    const acquireModalHold = (): void => {
      if (!latest.current.isModal) return;
      pushOverlay(overlayToken.current);
      document.addEventListener('keydown', onDocumentKeydown.current);
      if (
        (latest.current.props.scrollLock ?? false) &&
        !holdingScrollLock.current
      ) {
        lockBodyScroll();
        holdingScrollLock.current = true;
      }
    };

    const releaseModalHold = (): void => {
      removeOverlay(overlayToken.current);
      document.removeEventListener('keydown', onDocumentKeydown.current);
      if (holdingScrollLock.current) {
        unlockBodyScroll();
        holdingScrollLock.current = false;
      }
    };

    /** Releases stack/lock/listeners; shared by close and unmount. */
    const teardown = (): void => {
      shown.current = false;
      backdropPress.current = false;
      releaseModalHold();
    };

    // --- focus ---------------------------------------------------------------

    const applyInitialFocus = (): void => {
      const focusMode = latest.current.props.autoFocus ?? 'first-tabbable';
      if (focusMode === 'none') return;
      const el = panelRef.current;
      if (!el) return;
      let target: HTMLElement | null = el.querySelector('[autofocus]');
      if (!target && focusMode !== 'first-tabbable' && focusMode !== 'panel') {
        target = el.querySelector(focusMode);
      }
      if (!target && focusMode !== 'panel') {
        target = getTabbableElements(el)[0] ?? null;
      }
      (target ?? el).focus({ preventScroll: true });
    };

    /**
     * Hands focus out of the panel before it goes `inert`; restoring it to the
     * opener happens afterwards and only when focus would otherwise be lost.
     */
    const blurInside = (): void => {
      const el = panelRef.current;
      const active = el?.ownerDocument.activeElement;
      if (el && active instanceof HTMLElement && el.contains(active)) {
        active.blur();
      }
    };

    // --- open / close pipelines ---------------------------------------------

    const doOpen = (): void => {
      if (typeof window === 'undefined') return; // SSR: nothing to show
      if (latest.current.props.disabled ?? false) {
        if (latest.current.opened) setOpened(false);
        return;
      }
      const opening: OgeDrawerOpeningEvent = { cancel: false };
      latest.current.props.onOpening?.(opening);
      if (opening.cancel) {
        if (latest.current.opened) setOpened(false);
        return;
      }
      shown.current = true;
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      acquireModalHold();
      // The panel is already rendered non-`inert` in the pass this effect
      // follows, so focus can land immediately — the Angular component's
      // `afterNextRender` exists for the same reason and no transition is
      // waited on (`prefers-reduced-motion` zeroes it).
      if (latest.current.isModal) applyInitialFocus();
      latest.current.props.onAfterOpened?.();
    };

    const finalizeClose = (reason: OgeDrawerCloseReason): void => {
      if (!shown.current) return;
      // The panel is about to become `inert`; focus inside it would otherwise
      // drop to <body>. Move it out *before* the attribute lands.
      blurInside();
      teardown();
      const restore = latest.current.props.restoreFocus ?? true;
      if (restore && previouslyFocused.current) {
        // Only restore when focus would otherwise be lost — never steal the
        // user's new focus target.
        const active = document.activeElement;
        if (!active || active === document.body) {
          previouslyFocused.current.focus();
        }
      }
      previouslyFocused.current = null;
      if (latest.current.opened) setOpened(false);
      latest.current.props.onClosed?.({ reason });
    };

    /** Runs the close pipeline for user gestures and `close()`. */
    const requestClose = (reason: OgeDrawerCloseReason): void => {
      if (!shown.current || closePendingRef.current) return;
      // `compact` is the component reacting to its own container, not a user
      // gesture — a disabled drawer must still stop covering content it no
      // longer has room for.
      if ((latest.current.props.disabled ?? false) && reason !== 'compact') {
        return;
      }
      const closing: OgeDrawerClosingEvent = { reason, cancel: false };
      latest.current.props.onClosing?.(closing);
      if (closing.cancel) return;
      runAsyncGuard(latest.current.props.closeGuard, {
        allow: () => finalizeClose(reason),
        pending: (active) => setClosePending(active),
        label: 'oge-drawer closeGuard',
      });
    };

    // --- effects -------------------------------------------------------------

    // `opened` prop ↔ DOM-side state, loop-guarded by comparing states first.
    useEffect(() => {
      if (opened && !shown.current) doOpen();
      else if (!opened && shown.current) finalizeClose('api');
      // every other value this reads comes through `latest`
    }, [opened]);

    // A drawer that stops being modal must release everything a modal holds —
    // otherwise a compact→side transition leaves the body scroll locked with
    // no dialog on screen.
    useEffect(() => {
      if (!shown.current) return;
      if (isModal) acquireModalHold();
      else releaseModalHold();
    }, [isModal]);

    // StrictMode: the cleanup tears the hold down and the `opened` effect above
    // re-runs on the remount, which re-opens with the same instance.
    useEffect(
      () => () => {
        if (shown.current) teardown();
      },
      [],
    );

    // Container measurement — the drawer's own box, never the window.
    useEffect(() => {
      const el = hostRef.current;
      if (!el) return;
      const measure = (): void => setContainerSize(el.clientWidth);
      if (typeof ResizeObserver === 'undefined') {
        measure();
        return;
      }
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      measure();
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (resolved.mode === previousMode.current) return;
      const previous = previousMode.current;
      previousMode.current = resolved.mode;
      if (previous === null) return;
      latest.current.props.onModeChanged?.({
        mode: resolved.mode,
        requestedMode: latest.current.requestedMode,
        compact: resolved.compact,
      });
      // Going compact turns a laid-out drawer into an overlay covering the
      // content; leaving it open would hide the page behind a backdrop the
      // user never asked for.
      if (resolved.compact && latest.current.opened) requestClose('compact');
    }, [resolved.mode, resolved.compact]);

    // --- built-in items ------------------------------------------------------

    const itemViews = buildOgeDrawerItems(props.items, selectedKey);
    const rail = !opened && resolved.mode === 'side' && minSize !== undefined;
    const [direction, setDirection] = useState<OgeDirection>('ltr');
    useEffect(() => {
      if (hostRef.current) setDirection(ogeResolveDirection(hostRef.current));
    }, []);
    const tooltipPlacement = ogeDrawerRailTooltipPlacement(
      ogeDrawerPhysicalEdge(resolvedPosition, direction),
    );

    const onItemClick = (
      view: OgeDrawerItemView,
      event: ReactMouseEvent,
    ): void => {
      runOgeDrawerItemClick({
        view,
        selectedKey: latest.current.selectedKey,
        event: event.nativeEvent,
        emitItemClick: (click) => latest.current.props.onItemClick?.(click),
        commit: (key) => {
          latest.current.selectedKey = key;
          if (latest.current.props.selectedKey === undefined) {
            setUncontrolledSelected(key);
          }
          latest.current.props.onSelectedKeyChange?.(key);
        },
        emitSelectionChanged: (changed) =>
          latest.current.props.onSelectionChanged?.(changed),
      });
    };

    const onItemsKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target =
        event.target instanceof Element
          ? event.target.closest('[data-drawer-item]')
          : null;
      if (!target) return;
      const current = Number(target.getAttribute('data-drawer-item'));
      const next = ogeDrawerItemNavIndex(itemViews, current, event.key);
      if (next === null) return;
      event.preventDefault();
      panelRef.current
        ?.querySelector<HTMLElement>(`[data-drawer-item="${next}"]`)
        ?.focus();
    };

    // --- touch swipe (`swipeEnabled`) ------------------------------------------

    const swipe = useRef<OgePointerGestureHandle | null>(null);
    useEffect(
      () => () => {
        swipe.current?.cancel();
      },
      [],
    );

    /** Touch edge swipe — the decisions are `beginOgeDrawerSwipe`'s. */
    const onHostPointerDown = (
      event: ReactPointerEvent<HTMLDivElement>,
    ): void => {
      const current = latest.current.props;
      if (!(current.swipeEnabled ?? false) || (current.disabled ?? false)) {
        return;
      }
      const host = hostRef.current;
      const panelEl = panelRef.current;
      if (!host || !panelEl) return;
      const vertical =
        resolvedPosition === 'top' || resolvedPosition === 'bottom';
      const panelSize =
        typeof size === 'number'
          ? size
          : (vertical ? panelEl.offsetHeight : panelEl.offsetWidth) || 260;
      swipe.current?.cancel();
      swipe.current = beginOgeDrawerSwipe(event, {
        edge: ogeDrawerPhysicalEdge(
          resolvedPosition,
          ogeResolveDirection(host),
        ),
        opened: latest.current.opened,
        rect: host.getBoundingClientRect(),
        panelSize,
        onOpen: () => setOpened(true),
        onClose: () => requestClose('swipe'),
      });
    };

    // --- imperative surface --------------------------------------------------

    const open = (): void => setOpened(true);
    const close = (): void => requestClose('api');

    useImperativeHandle(
      ref,
      () => ({
        drawerId,
        opened,
        closePending,
        open,
        close,
        toggle: (force?: boolean) => {
          const next = force ?? !latest.current.opened;
          if (next) open();
          else close();
        },
        focus: () => {
          if (shown.current && latest.current.isModal) applyInitialFocus();
        },
      }),
      [drawerId, opened, closePending],
    );

    // --- render --------------------------------------------------------------

    /**
     * A closed panel is hidden from AT and Tab — except a `side` drawer with a
     * rail, which is still visible and usable.
     */
    const hidden = opened
      ? false
      : !(resolved.mode === 'side' && minSize !== undefined);

    const panelRole = isModal ? 'dialog' : landmark;
    const resolvedAriaLabel = ariaLabelledBy
      ? undefined
      : (ariaLabel ?? messages.drawer);

    const hostClassName = [
      'oge-drawer',
      opened && 'oge-drawer-opened',
      rail && 'oge-drawer-rail',
      props.swipeEnabled && 'oge-drawer-swipe',
      isModal && 'oge-drawer-modal',
      resolved.compact && 'oge-drawer-compact',
      animationEnabled && 'oge-drawer-animated',
      disabled && 'oge-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const hostStyle = {
      ...style,
      ['--oge-drawer-size']: toCssSize(size),
      ['--oge-drawer-min-size']: toCssSize(minSize) ?? '0px',
      ['--oge-drawer-duration']: animationEnabled
        ? `${animationDuration}ms`
        : '0ms',
    } as CSSProperties;

    const onPanelKeyDown = (
      event: ReactKeyboardEvent<HTMLDivElement>,
    ): void => {
      // A persistent drawer must not trap Tab: focus has to flow out into the
      // content and back, which is what makes it a landmark, not a dialog.
      if (!isModal || event.key !== 'Tab') return;
      const el = panelRef.current;
      if (!el) return;
      trapTabKey(event.nativeEvent, el, el);
    };

    return (
      <div
        ref={hostRef}
        className={hostClassName}
        style={hostStyle}
        data-mode={resolved.mode}
        data-position={resolvedPosition}
        onPointerDown={onHostPointerDown}
      >
        {isModal && shading && opened && (
          /*
            The backdrop is decorative; the keyboard path to the same action is
            Escape, handled on the document while this drawer is the topmost
            overlay.
          */
          <div
            className="oge-drawer-backdrop"
            onPointerDown={() => {
              backdropPress.current = true;
            }}
            onClick={() => {
              // Only a press that *started* on the backdrop counts, so a drag
              // ending there after starting inside the panel does not close it.
              const started = backdropPress.current;
              backdropPress.current = false;
              if (started && (props.closeOnBackdropClick ?? true)) {
                requestClose('backdrop');
              }
            }}
          />
        )}

        <div
          ref={panelRef}
          className="oge-drawer-panel"
          id={drawerId}
          role={panelRole}
          aria-modal={isModal ? true : undefined}
          aria-label={resolvedAriaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-hidden={hidden ? true : undefined}
          inert={hidden}
          tabIndex={isModal ? -1 : undefined}
          onKeyDown={onPanelKeyDown}
        >
          {showCloseButton && (
            <button
              type="button"
              className="oge-drawer-close"
              aria-label={messages.close}
              title={messages.close}
              disabled={disabled || closePending}
              onClick={close}
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          )}
          {itemViews.length > 0 && (
            // A navigation list of real links / buttons, each in the Tab
            // order (the APG disclosure-navigation shape, not a composite
            // widget); the active entry is aria-current="page". Arrow / Home
            // / End are a convenience on top. Separators are hidden from AT.
            <ul className="oge-drawer-items" onKeyDown={onItemsKeyDown}>
              {itemViews.map((view) => {
                if (view.separator) {
                  return (
                    <li
                      key={view.key}
                      className="oge-drawer-separator"
                      aria-hidden="true"
                    />
                  );
                }
                const body = props.renderItem ? (
                  props.renderItem({
                    item: view.item,
                    key: view.key,
                    active: view.active,
                    rail,
                    index: view.index,
                  })
                ) : (
                  <>
                    <span className="oge-drawer-item-icon" aria-hidden="true">
                      {view.item.icon && (
                        <svg viewBox="0 0 24 24" width="20" height="20">
                          <path
                            d={view.item.icon}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="oge-drawer-item-text">{view.text}</span>
                    {view.item.badge !== undefined &&
                      view.item.badge !== '' && (
                        <span className="oge-drawer-item-badge">
                          {view.item.badge}
                        </span>
                      )}
                  </>
                );
                const className = [
                  'oge-drawer-item',
                  view.active && 'oge-drawer-item-active',
                  view.disabled && 'oge-drawer-item-disabled',
                ]
                  .filter(Boolean)
                  .join(' ');
                const entry =
                  view.item.url !== undefined && !view.disabled ? (
                    <a
                      className={className}
                      href={view.item.url}
                      target={view.item.target}
                      aria-current={view.active ? 'page' : undefined}
                      data-drawer-item={view.index}
                      onClick={(event) => onItemClick(view, event)}
                    >
                      {body}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className={className}
                      disabled={view.disabled}
                      aria-current={view.active ? 'page' : undefined}
                      data-drawer-item={view.index}
                      onClick={(event) => onItemClick(view, event)}
                    >
                      {body}
                    </button>
                  );
                return (
                  <li key={view.key} className="oge-drawer-item-wrap">
                    <OgeTooltip
                      text={view.text}
                      disabled={!rail}
                      placement={tooltipPlacement}
                    >
                      {entry}
                    </OgeTooltip>
                  </li>
                );
              })}
            </ul>
          )}
          {panel}
        </div>

        {props.swipeEnabled && !opened && (
          // the touch strip an opening edge swipe starts in (pointer: coarse only)
          <div className="oge-drawer-swipe-zone" aria-hidden="true" />
        )}

        {/*
          Deliberately scoped to the content, not to the page: a drawer is a
          layout container that wraps the very content it covers, so inerting
          the document because a drawer nested in a card opened would disable
          the rest of the page for a panel that never covered it.
        */}
        <div
          className="oge-drawer-content"
          inert={isModal && opened && inertBackground}
        >
          {children}
        </div>
      </div>
    );
  },
);
