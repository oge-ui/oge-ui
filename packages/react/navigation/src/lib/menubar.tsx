'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  createTypeAheadBuffer,
  edgeEnabledIndex,
  findMenubarItemPath,
  isMenubarCompact,
  matchByPrefix,
  menubarBarKeys,
  menubarClosedReason,
  menubarDataDescriptors,
  menubarEventBase,
  menubarItemDomId,
  menubarPanelItems,
  menubarPanelLabel,
  menubarPanelPlacement,
  menubarPopupCloseReason,
  menubarStopDisabled,
  stepEnabledIndex,
  OGE_MENUBAR_HOVER_DELAY,
  type OgeMenubarCloseReason,
  type OgeMenubarCompactChangedEvent,
  type OgeMenubarItemClickEvent,
  type OgeMenubarItemData,
  type OgeMenubarMessages,
  type OgeMenubarOpenMode,
  type OgeMenubarOrientation,
  type OgeMenubarPanelSource,
  type OgeMenubarSubmenuClosedEvent,
  type OgeMenubarSubmenuClosingEvent,
  type OgeMenubarSubmenuOpenedEvent,
  type OgeMenubarSubmenuOpeningEvent,
  type OgeMenuItem,
} from '@oge-ui/behavior';
import {
  OgeMenuList,
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
  type OgeMenuCloseRequestEvent,
  type OgeMenuListHandle,
  type OgeMenuListItemClickEvent,
  type OgePopupCloseReason,
} from '@oge-ui/react-overlay';
import { useOgeMenubarConfig } from './navigation-config';

/** Imperative handle — mirrors the Angular component's public methods. */
export interface OgeMenubarHandle {
  /** Opens the submenu of a top-level item, by index or `key`. */
  open(target: number | string): void;
  /** Closes any open submenu (cancelable, `reason: 'api'`). */
  close(): void;
  /** Focuses the bar's roving tab target (or the hamburger when compact). */
  focus(): void;
}

export interface OgeMenubarProps {
  /** Data-driven items, each nestable through `items`. */
  items?: readonly OgeMenubarItemData[];
  /** `'horizontal'` (default) or a vertical bar with swapped arrow keys. */
  orientation?: OgeMenubarOrientation;
  /** How top-level submenus open; nested levels always open on hover. */
  openMode?: OgeMenubarOpenMode;
  /** Hover dwell before a top-level submenu opens in `'hover'` mode, ms. */
  hoverDelay?: number;
  /**
   * Below this **container** inline size the bar collapses into a hamburger.
   * Measured against the menubar's own box, never the window.
   */
  compactBelow?: number;
  /** The item `key` rendered with `aria-current="page"` (router-driven). */
  activeKey?: string;
  /** Disables the whole bar: items go inert and leave the Tab sequence. */
  disabled?: boolean;
  /** Per-instance overrides of user-facing strings. */
  messages?: Partial<OgeMenubarMessages>;
  /**
   * Custom rendering for the **top-level** bar items — the React counterpart
   * of `[ogeMenubarItemTemplate]`.
   */
  renderItem?: (item: OgeMenubarItemData, index: number) => ReactNode;
  /**
   * Custom rendering for submenu rows at every depth — the shared menu-list
   * renderer, the counterpart of `[submenuItemTemplate]`.
   */
  renderSubmenuItem?: (item: OgeMenuItem, index: number) => ReactNode;
  /** Fires when a leaf item is activated, at any depth. */
  onItemClick?: (event: OgeMenubarItemClickEvent) => void;
  /** Cancelable — set `cancel` to keep the submenu closed. */
  onSubmenuOpening?: (event: OgeMenubarSubmenuOpeningEvent) => void;
  onSubmenuOpened?: (event: OgeMenubarSubmenuOpenedEvent) => void;
  /** Cancelable — set `cancel` to keep the submenu open. */
  onSubmenuClosing?: (event: OgeMenubarSubmenuClosingEvent) => void;
  onSubmenuClosed?: (event: OgeMenubarSubmenuClosedEvent) => void;
  /** The bar collapsed into (or recovered from) the compact hamburger. */
  onCompactChanged?: (event: OgeMenubarCompactChangedEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * WAI-ARIA APG menubar: a persistent bar of `role="menuitem"` entries with a
 * roving tabindex, whose submenus run on the shared overlay machinery
 * (`useAnchoredPanel` + `<OgeMenuList>`, nested levels included) — the React
 * render of the Angular `<oge-menubar>`, over the same `@oge-ui/behavior`
 * decisions and the same stylesheet:
 *
 * ```tsx
 * <OgeMenubar items={menu} onItemClick={run} />
 * ```
 *
 * Note the APG's own caveat: for plain site navigation a `<nav>` of links
 * (optionally with the disclosure pattern) is usually the better fit —
 * `role="menubar"` is for application-style command menus.
 *
 * Below `compactBelow` **container** pixels the whole bar collapses into a
 * hamburger button opening the full item tree as one nested menu.
 */
export const OgeMenubar = forwardRef<OgeMenubarHandle, OgeMenubarProps>(
  function OgeMenubar(props, ref) {
    const {
      items,
      activeKey,
      disabled = false,
      renderItem,
      renderSubmenuItem,
      className,
      style,
    } = props;

    const config = useOgeMenubarConfig();
    const overlay = useOgeOverlayConfig();

    const messages = useMemo<OgeMenubarMessages>(
      () => ({ ...config.messages, ...props.messages }),
      [config.messages, props.messages],
    );
    const orientation: OgeMenubarOrientation =
      props.orientation ?? config.orientation ?? 'horizontal';
    const openMode: OgeMenubarOpenMode =
      props.openMode ?? config.openMode ?? 'click';
    const hoverDelay =
      props.hoverDelay ?? config.hoverDelay ?? OGE_MENUBAR_HOVER_DELAY;
    const compactBelow = props.compactBelow ?? config.compactBelow;

    const reactId = useId();
    const idPrefix = `oge-menubar-${reactId.replace(/:/g, '')}`;
    const itemDomId = useCallback(
      (index: number) => menubarItemDomId(idPrefix, index),
      [idPrefix],
    );

    const hostRef = useRef<HTMLDivElement>(null);
    const hamburgerRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const menuListRef = useRef<OgeMenuListHandle>(null);

    /** Roving-tabindex anchor among the top-level items. */
    const [focusIndex, setFocusIndex] = useState(0);
    const [openSource, setOpenSourceState] =
      useState<OgeMenubarPanelSource>(null);
    /** Bar item whose submenu is open; `-1` when none (or hamburger mode). */
    const [openIndex, setOpenIndexState] = useState(-1);
    const [pendingFocus, setPendingFocus] = useState<'first' | 'last' | null>(
      null,
    );
    const [containerSize, setContainerSize] = useState(0);

    /**
     * Angular's signals settle synchronously, React state does not — a single
     * key press can decide "close the old menu, open the new one" in one go.
     * The ref is the authority every handler reads; the state exists so the
     * render follows it.
     */
    const openStateRef = useRef<{
      source: OgeMenubarPanelSource;
      index: number;
    }>({ source: null, index: -1 });
    const setOpenState = useCallback(
      (source: OgeMenubarPanelSource, index: number) => {
        openStateRef.current = { source, index };
        setOpenSourceState(source);
        setOpenIndexState(index);
      },
      [],
    );
    /** `true` once the panel machine itself is open (one render behind state). */
    const panelOpenRef = useRef(false);
    const pendingCloseReason = useRef<OgeMenubarCloseReason | null>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previousCompact = useRef<boolean | null>(null);

    const descriptors = useMemo(() => menubarDataDescriptors(items), [items]);
    const descriptorsRef = useRef(descriptors);
    descriptorsRef.current = descriptors;

    const compact = isMenubarCompact(containerSize, compactBelow);

    const panelItems = useMemo(
      () => menubarPanelItems(descriptors, openSource, openIndex),
      [descriptors, openSource, openIndex],
    );
    const panelLabel = menubarPanelLabel(
      descriptors,
      openSource,
      openIndex,
      messages.hamburger,
    );

    const latest = useRef({ ...props, disabled, orientation });
    latest.current = { ...props, disabled, orientation };

    const stopDisabled = useCallback(
      (index: number) =>
        menubarStopDisabled(
          descriptorsRef.current,
          index,
          latest.current.disabled,
        ),
      [],
    );

    const focusTarget = ((): number => {
      if (
        focusIndex >= 0 &&
        focusIndex < descriptors.length &&
        !menubarStopDisabled(descriptors, focusIndex, disabled)
      ) {
        return focusIndex;
      }
      return (
        edgeEnabledIndex(descriptors.length, 1, (i) =>
          menubarStopDisabled(descriptors, i, disabled),
        ) ?? -1
      );
    })();

    const isRtl = (): boolean =>
      !!hostRef.current &&
      getComputedStyle(hostRef.current).direction === 'rtl';

    // --- the anchored panel --------------------------------------------------

    const focusItem = useCallback(
      (index: number) => {
        setFocusIndex(index);
        document.getElementById(itemDomId(index))?.focus();
      },
      [itemDomId],
    );

    const focusPanelAnchor = useCallback(() => {
      const { source, index } = openStateRef.current;
      if (source === 'hamburger') {
        hamburgerRef.current?.focus();
        return;
      }
      if (index >= 0) focusItem(index);
    }, [focusItem]);

    /** Everything a finished close has to report and reset. */
    const finishClose = useCallback(
      (panelReason: OgePopupCloseReason) => {
        panelOpenRef.current = false;
        const { source, index } = openStateRef.current;
        if (source === null) return;
        const base = menubarEventBase(descriptorsRef.current, source, index);
        const reason = menubarClosedReason(
          pendingCloseReason.current,
          panelReason,
        );
        pendingCloseReason.current = null;
        setOpenState(null, -1);
        setPendingFocus(null);
        latest.current.onSubmenuClosed?.({ ...base, reason });
      },
      [setOpenState],
    );

    const panel = useAnchoredPanel({
      anchor: () => {
        const { source, index } = openStateRef.current;
        if (source === 'hamburger') return hamburgerRef.current;
        return index >= 0 ? document.getElementById(itemDomId(index)) : null;
      },
      panel: () => popupRef.current,
      placement: () =>
        menubarPanelPlacement(
          openStateRef.current.source,
          latest.current.orientation,
        ),
      offset: () => overlay.offset,
      viewportPadding: () => overlay.viewportPadding,
      restoreFocus: () => focusPanelAnchor(),
      onClosed: (reason) => finishClose(reason),
    });
    const panelRef = useRef(panel);
    panelRef.current = panel;

    /**
     * The popup element must exist before the machine can measure it, so the
     * open is committed here rather than in the handler that decided it —
     * the same order the Angular template's `@if` produces.
     */
    const wantsPanel = openSource !== null && panelItems.length > 0;
    useEffect(() => {
      if (!wantsPanel) return;
      if (panelOpenRef.current) {
        panelRef.current.updatePosition(); // switched siblings: re-anchor
      } else {
        panelOpenRef.current = true;
        panelRef.current.open();
      }
    }, [wantsPanel, openSource, openIndex]);

    // Keyboard opens hand focus to the menu once it is measured; pointer opens
    // leave focus on the bar item (pendingFocus stays null).
    useEffect(() => {
      if (!pendingFocus || !panel.isOpen || panel.position === null) return;
      menuListRef.current?.focus(pendingFocus);
      setPendingFocus(null);
    }, [pendingFocus, panel.isOpen, panel.position]);

    // --- open / close --------------------------------------------------------

    const clearHoverTimer = useCallback(() => {
      if (hoverTimer.current !== null) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
    }, []);
    useEffect(() => clearHoverTimer, [clearHoverTimer]);

    const closeSubmenu = useCallback(
      (reason: OgeMenubarCloseReason) => {
        const { source, index } = openStateRef.current;
        if (source === null) return;
        if (reason !== 'tab') {
          const pre: OgeMenubarSubmenuClosingEvent = {
            ...menubarEventBase(descriptorsRef.current, source, index),
            reason,
            cancel: false,
          };
          latest.current.onSubmenuClosing?.(pre);
          if (pre.cancel) return;
        }
        pendingCloseReason.current = reason;
        if (panelOpenRef.current) {
          panelRef.current.close(menubarPopupCloseReason(reason));
        } else {
          // Decided and undone before the panel ever opened.
          finishClose('api');
        }
      },
      [finishClose],
    );

    const openSubmenu = useCallback(
      (index: number, focus: 'first' | 'last' | null, event?: Event) => {
        const ds = descriptorsRef.current;
        const d = ds[index];
        if (
          !d ||
          d.item.disabled ||
          !d.item.items?.length ||
          latest.current.disabled
        ) {
          return;
        }
        clearHoverTimer();
        const { source, index: current } = openStateRef.current;
        if (source === 'bar' && current === index) {
          if (focus) setPendingFocus(focus);
          return;
        }
        const pre: OgeMenubarSubmenuOpeningEvent = {
          item: d.item,
          key: d.item.key,
          path: [index],
          cancel: false,
          event,
        };
        latest.current.onSubmenuOpening?.(pre);
        if (pre.cancel) return;
        if (source !== null) {
          // Switching siblings: the previous submenu closes without the panel
          // ever unmounting, so its events are emitted here.
          const prev = menubarEventBase(ds, source, current);
          const preClose: OgeMenubarSubmenuClosingEvent = {
            ...prev,
            reason: 'navigation',
            cancel: false,
          };
          latest.current.onSubmenuClosing?.(preClose);
          if (preClose.cancel) return;
          latest.current.onSubmenuClosed?.({ ...prev, reason: 'navigation' });
        }
        setOpenState('bar', index);
        setFocusIndex(index);
        if (focus) setPendingFocus(focus);
        latest.current.onSubmenuOpened?.({
          item: d.item,
          key: d.item.key,
          path: [index],
        });
      },
      [clearHoverTimer, setOpenState],
    );

    const openHamburger = useCallback(
      (event: Event, focus: 'first' | 'last' | null) => {
        if (latest.current.disabled) return;
        if (openStateRef.current.source === 'hamburger') {
          if (focus) setPendingFocus(focus);
          return;
        }
        const pre: OgeMenubarSubmenuOpeningEvent = {
          path: [],
          cancel: false,
          event,
        };
        latest.current.onSubmenuOpening?.(pre);
        if (pre.cancel) return;
        setOpenState('hamburger', -1);
        if (focus) setPendingFocus(focus);
        latest.current.onSubmenuOpened?.({ path: [] });
      },
      [setOpenState],
    );

    // --- measurement ---------------------------------------------------------

    const measure = useCallback(() => {
      const el = hostRef.current;
      if (el) setContainerSize(el.clientWidth);
    }, []);

    useEffect(() => {
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => measure());
      if (hostRef.current) observer.observe(hostRef.current);
      return () => observer.disconnect();
    }, [measure]);

    // Collapsing/recovering closes any open menu — the anchor is about to
    // disappear — and notifies the application.
    useEffect(() => {
      if (previousCompact.current === null) {
        previousCompact.current = compact;
        return;
      }
      if (compact === previousCompact.current) return;
      previousCompact.current = compact;
      if (panelOpenRef.current) panelRef.current.close('api');
      latest.current.onCompactChanged?.({ compact });
    }, [compact]);

    // --- imperative handle ---------------------------------------------------

    useImperativeHandle(ref, () => ({
      open: (target: number | string) => {
        const index =
          typeof target === 'number'
            ? target
            : descriptorsRef.current.findIndex((d) => d.item.key === target);
        if (index >= 0) openSubmenu(index, null);
      },
      close: () => closeSubmenu('api'),
      focus: () => {
        if (isMenubarCompact(containerSize, compactBelow)) {
          hamburgerRef.current?.focus();
          return;
        }
        if (focusTarget >= 0) focusItem(focusTarget);
      },
    }));

    // --- bar interaction -----------------------------------------------------

    const moveBarFocus = (from: number, direction: 1 | -1): void => {
      const next = stepEnabledIndex(
        descriptors.length,
        from,
        direction,
        stopDisabled,
      );
      if (next === null) return;
      focusItem(next);
      if (openStateRef.current.source === 'bar') followFocusWhileOpen(next);
    };

    /** A menu was showing: the newly focused bar item shows its own (APG). */
    const followFocusWhileOpen = (index: number): void => {
      const d = descriptors[index];
      if (d?.item.items?.length) openSubmenu(index, null);
      else closeSubmenu('navigation');
    };

    const hopBarSibling = (direction: 1 | -1): void => {
      const next = stepEnabledIndex(
        descriptors.length,
        openStateRef.current.index,
        direction,
        stopDisabled,
      );
      if (next === null) return;
      const d = descriptors[next];
      if (d.item.items?.length) {
        setFocusIndex(next);
        openSubmenu(next, 'first');
        document
          .getElementById(itemDomId(next))
          ?.focus({ preventScroll: true });
      } else {
        closeSubmenu('navigation');
        focusItem(next);
      }
    };

    const typeAheadRef =
      useRef<ReturnType<typeof createTypeAheadBuffer>>(undefined);
    typeAheadRef.current ??= createTypeAheadBuffer(overlay.typeAheadMs);
    const typeAhead = typeAheadRef.current;

    const onBarItemClick = (index: number, event: ReactMouseEvent): void => {
      const d = descriptors[index];
      if (!d || d.item.disabled || disabled) {
        event.preventDefault();
        return;
      }
      setFocusIndex(index);
      if (d.item.items?.length) {
        event.preventDefault();
        const { source, index: current } = openStateRef.current;
        if (source === 'bar' && current === index) {
          closeSubmenu('api');
        } else {
          // Keyboard-synthesized clicks (Enter/Space on the button) focus the
          // menu; pointer clicks leave focus on the bar item.
          openSubmenu(
            index,
            event.detail === 0 ? 'first' : null,
            event.nativeEvent,
          );
        }
        return;
      }
      props.onItemClick?.({
        item: d.item,
        key: d.item.key,
        index,
        path: [index],
        event: event.nativeEvent,
      });
      d.item.action?.();
      if (openStateRef.current.source !== null) closeSubmenu('select');
    };

    const onBarItemEnter = (index: number): void => {
      const d = descriptors[index];
      if (!d || d.item.disabled || d.item.separator || disabled) return;
      clearHoverTimer();
      const childful = !!d.item.items?.length;
      const { source, index: current } = openStateRef.current;
      if (source === 'bar') {
        // A menu is showing: hovering siblings switches without a click.
        if (index === current) return;
        if (childful) openSubmenu(index, null);
        else closeSubmenu('navigation');
        return;
      }
      if (openMode === 'hover' && childful) {
        hoverTimer.current = setTimeout(
          () => openSubmenu(index, null),
          hoverDelay,
        );
      }
    };

    const onBarKeydown = (event: ReactKeyboardEvent, index: number): void => {
      const key = event.key;
      const d = descriptors[index];
      const keys = menubarBarKeys(orientation, isRtl());

      if (key === keys.next || key === keys.prev) {
        event.preventDefault();
        event.stopPropagation();
        moveBarFocus(index, key === keys.next ? 1 : -1);
        return;
      }
      if (key === 'Home' || key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        const target = edgeEnabledIndex(
          descriptors.length,
          key === 'Home' ? 1 : -1,
          stopDisabled,
        );
        if (target !== null) focusItem(target);
        return;
      }
      if (
        d?.item.items?.length &&
        (key === keys.open || key === keys.openLast)
      ) {
        event.preventDefault();
        event.stopPropagation();
        openSubmenu(
          index,
          key === keys.openLast ? 'last' : 'first',
          event.nativeEvent,
        );
        return;
      }
      if (key === 'Escape') {
        if (openStateRef.current.source !== null) {
          event.preventDefault();
          event.stopPropagation();
          closeSubmenu('escape');
        }
        return;
      }
      if (key === 'Tab') {
        // Leaving the bar closes everything; no preventDefault — the browser
        // continues tabbing from here.
        if (openStateRef.current.source !== null) closeSubmenu('tab');
        return;
      }
      if (key === ' ' && !d?.item.items?.length && d?.item.url) {
        // Space activates a link menuitem too (APG); Enter is native.
        event.preventDefault();
        (event.target as HTMLElement | null)?.click();
        return;
      }
      if (
        key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const match = matchByPrefix(
          descriptors.map((desc) => desc.item.text),
          typeAhead.push(key),
          index,
          stopDisabled,
        );
        if (match !== null) {
          event.preventDefault();
          event.stopPropagation();
          focusItem(match);
          if (openStateRef.current.source === 'bar') {
            followFocusWhileOpen(match);
          }
        }
      }
    };

    /**
     * Keys the menu lists deliberately let bubble: ArrowRight on a leaf row
     * (any depth) hops to the next bar item, ArrowLeft escaping the level-1
     * list hops to the previous one — both reopening when a menu was showing
     * (APG). Only meaningful while a bar submenu is open.
     */
    const onHostKeydown = (event: ReactKeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.('.oge-menu-list')) return;
      if (openStateRef.current.source !== 'bar') return;
      const keys = menubarBarKeys(orientation, isRtl());
      if (orientation === 'vertical') {
        // Vertical bar: the level-1 list's ArrowLeft means "back to the bar".
        if (event.key === keys.back) {
          event.preventDefault();
          event.stopPropagation();
          const index = openStateRef.current.index;
          closeSubmenu('navigation');
          if (index >= 0) focusItem(index);
        }
        return;
      }
      const forward = event.key === keys.next;
      const backward = event.key === keys.prev;
      if (!forward && !backward) return;
      event.preventDefault();
      event.stopPropagation();
      hopBarSibling(forward ? 1 : -1);
    };

    // --- hamburger -----------------------------------------------------------

    const onHamburgerClick = (event: ReactMouseEvent): void => {
      if (openStateRef.current.source === 'hamburger') {
        closeSubmenu('api');
      } else {
        openHamburger(event.nativeEvent, event.detail === 0 ? 'first' : null);
      }
    };

    const onHamburgerKeydown = (event: ReactKeyboardEvent): void => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        openHamburger(
          event.nativeEvent,
          event.key === 'ArrowDown' ? 'first' : 'last',
        );
        return;
      }
      if (event.key === 'Escape' && openStateRef.current.source !== null) {
        event.preventDefault();
        event.stopPropagation();
        closeSubmenu('escape');
        return;
      }
      if (event.key === 'Tab' && openStateRef.current.source !== null) {
        closeSubmenu('tab');
      }
    };

    // --- menu callbacks ------------------------------------------------------

    const onMenuItemClick = (event: OgeMenuListItemClickEvent): void => {
      const item = event.item as OgeMenubarItemData;
      const { source, index: openAt } = openStateRef.current;
      const base = source === 'bar' ? [openAt] : [];
      const inTree = findMenubarItemPath(panelItems, item);
      const path = inTree ? [...base, ...inTree] : [...base, event.index];
      props.onItemClick?.({
        item,
        key: item.key,
        index: path[path.length - 1],
        path,
        event: event.event,
      });
    };

    const onMenuCloseRequest = (event: OgeMenuCloseRequestEvent): void => {
      if (event.reason === 'escape') {
        closeSubmenu('escape');
        return;
      }
      if (event.reason === 'select') {
        closeSubmenu('select');
        return;
      }
      if (event.reason === 'tab') {
        // Refocus the anchor before unmount so the browser tabs on from there.
        focusPanelAnchor();
        closeSubmenu('tab');
      }
      // 'back' never reaches the root: nested levels absorb it.
    };

    // --- render --------------------------------------------------------------

    const isActive = (item: OgeMenubarItemData): boolean =>
      activeKey !== undefined && item.key === activeKey;

    const barItemContent = (
      item: OgeMenubarItemData,
      index: number,
    ): ReactNode => (
      <>
        {renderItem ? (
          renderItem(item, index)
        ) : (
          <>
            {item.icon ? (
              <span className="oge-menubar-item-icon">
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d={item.icon} />
                </svg>
              </span>
            ) : item.iconClass ? (
              <span className="oge-menubar-item-icon">
                <i className={item.iconClass} aria-hidden="true" />
              </span>
            ) : null}
            <span className="oge-menubar-item-text">{item.text}</span>
            {item.badge !== undefined && (
              <span className="oge-menubar-item-badge">{item.badge}</span>
            )}
          </>
        )}
        {item.items?.length ? (
          <span className="oge-menubar-item-caret" aria-hidden="true">
            <svg
              viewBox="0 0 16 16"
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </span>
        ) : null}
      </>
    );

    const hostClasses = [
      'oge-menubar',
      orientation === 'vertical' && 'oge-menubar-vertical',
      compact && 'oge-menubar-compact',
      disabled && 'oge-menubar-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={hostRef}
        className={hostClasses}
        style={style}
        onKeyDown={onHostKeydown}
      >
        {compact ? (
          <button
            ref={hamburgerRef}
            type="button"
            className="oge-menubar-hamburger"
            aria-haspopup="menu"
            aria-expanded={openSource === 'hamburger'}
            aria-label={messages.hamburger}
            aria-controls={
              openSource === 'hamburger' ? panel.panelId : undefined
            }
            disabled={disabled}
            onClick={onHamburgerClick}
            onKeyDown={onHamburgerKeydown}
          >
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M2 4h12M2 8h12M2 12h12" />
            </svg>
          </button>
        ) : (
          <div
            className="oge-menubar-bar"
            role="menubar"
            aria-label={messages.menubar}
            aria-orientation={
              orientation === 'vertical' ? 'vertical' : undefined
            }
          >
            {descriptors.map((d, i) =>
              d.item.separator ? (
                <span
                  key={d.id}
                  className="oge-menubar-separator"
                  role="separator"
                  aria-orientation={
                    orientation === 'vertical' ? 'horizontal' : 'vertical'
                  }
                />
              ) : d.item.url && !d.item.items?.length ? (
                <a
                  key={d.id}
                  className={[
                    'oge-menubar-item',
                    isActive(d.item) && 'oge-menubar-item-active',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="menuitem"
                  id={itemDomId(i)}
                  href={d.item.url}
                  aria-current={isActive(d.item) ? 'page' : undefined}
                  aria-disabled={
                    disabled || d.item.disabled ? 'true' : undefined
                  }
                  title={d.item.hint}
                  tabIndex={i === focusTarget ? 0 : -1}
                  onClick={(event) => onBarItemClick(i, event)}
                  onKeyDown={(event) => onBarKeydown(event, i)}
                  onFocus={() => setFocusIndex(i)}
                  onPointerEnter={() => onBarItemEnter(i)}
                  onPointerLeave={clearHoverTimer}
                >
                  {barItemContent(d.item, i)}
                </a>
              ) : (
                <button
                  key={d.id}
                  type="button"
                  className={[
                    'oge-menubar-item',
                    isActive(d.item) && 'oge-menubar-item-active',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="menuitem"
                  id={itemDomId(i)}
                  aria-current={isActive(d.item) ? 'page' : undefined}
                  aria-disabled={d.item.disabled ? 'true' : undefined}
                  aria-haspopup={d.item.items?.length ? 'menu' : undefined}
                  aria-expanded={
                    d.item.items?.length
                      ? openSource === 'bar' && openIndex === i
                      : undefined
                  }
                  aria-controls={
                    openSource === 'bar' && openIndex === i
                      ? panel.panelId
                      : undefined
                  }
                  title={d.item.hint}
                  disabled={disabled || (d.item.disabled ?? false)}
                  tabIndex={i === focusTarget ? 0 : -1}
                  onClick={(event) => onBarItemClick(i, event)}
                  onKeyDown={(event) => onBarKeydown(event, i)}
                  onFocus={() => setFocusIndex(i)}
                  onPointerEnter={() => onBarItemEnter(i)}
                  onPointerLeave={clearHoverTimer}
                >
                  {barItemContent(d.item, i)}
                </button>
              ),
            )}
          </div>
        )}
        {panelItems.length > 0 && (
          <OgePopup panel={panel} ref={popupRef}>
            <OgeMenuList
              ref={menuListRef}
              items={panelItems}
              ariaLabel={panelLabel}
              renderItem={renderSubmenuItem}
              onItemClick={onMenuItemClick}
              onCloseRequest={onMenuCloseRequest}
            />
          </OgePopup>
        )}
      </div>
    );
  },
);
