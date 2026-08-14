'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  OGE_TOOLBAR_STOP_SELECTOR,
  applyToolbarOverride,
  edgeEnabledIndex,
  fitToolbarDescriptors,
  isToolbarStopDisabled,
  isToolbarTextEntry,
  loadToolbarItems,
  orderToolbarDescriptors,
  readToolbarStyleMetrics,
  stepEnabledIndex,
  toolbarDataDescriptors,
  toolbarIconVisible,
  toolbarItemWidth,
  toolbarMenuItems,
  toolbarOverflowEvent,
  toolbarScrollState,
  toolbarTextVisible,
  withToolbarIndexes,
  type OgeToolbarDataSourceLike,
  type OgeToolbarDescriptorCore,
  type OgeToolbarDisplayMode,
  type OgeToolbarItemActiveChangedEvent,
  type OgeToolbarItemClickEvent,
  type OgeToolbarItemData,
  type OgeToolbarItemHoldEvent,
  type OgeToolbarItemLocation,
  type OgeToolbarItemOverride,
  type OgeToolbarMenuClosedEvent,
  type OgeToolbarMenuCloseReason,
  type OgeToolbarMenuClosingEvent,
  type OgeToolbarMenuOpeningEvent,
  type OgeToolbarMessages,
  type OgeToolbarOrientation,
  type OgeToolbarOverflow,
  type OgeToolbarOverflowChangedEvent,
  type OgeToolbarSize,
  type OgeToolbarStylingMode,
} from '@oge-ui/behavior';
import { OgeMenuList, OgePopup, useAnchoredPanel } from '@oge-ui/react-overlay';
import { useOgeToolbarConfig } from './layout-config';

/** Context of the `renderItem` / `renderMenuItem` render props. */
export interface OgeToolbarItemRenderContext {
  /** The source `items` entry. */
  item: OgeToolbarItemData | undefined;
  /** Index in the merged, visible item list. */
  index: number;
  /** `true` when the item is being rendered inside the overflow menu. */
  inMenu: boolean;
}

/** The public methods of `<OgeToolbar>`, reached through its `ref`. */
export interface OgeToolbarHandle {
  /** Focuses the toolbar's current roving-tabindex stop. */
  focus(): void;
  /** Opens the overflow menu, subject to `onMenuOpening`. */
  openMenu(event?: Event): void;
  /** Closes the overflow menu, subject to `onMenuClosing`. */
  closeMenu(reason?: OgeToolbarMenuCloseReason): void;
  /** Opens the overflow menu when closed, closes it otherwise. */
  toggleMenu(event?: Event): void;
  /** Re-measures the toolbar and recomputes what fits. */
  refreshOverflow(): void;
  /** Appends a runtime entry, merged after `items`. */
  addItem(item: OgeToolbarItemData): void;
  /** Removes an `addItem()` entry, or hides an `items` entry. */
  removeItem(key: string): void;
  /** Hides (or re-shows) an entry without touching the `items` array. */
  hideItem(key: string, hidden?: boolean): void;
  /** Enables (or disables) an entry without touching the `items` array. */
  enableItem(key: string, enabled?: boolean): void;
  /** Drops every `hideItem()` / `enableItem()` override. */
  clearItemOverrides(): void;
  /** Shows or hides the second row of `overflow: 'extended'`. */
  toggleExtendedRow(): void;
}

export interface OgeToolbarProps {
  /** Data-driven entries. */
  items?: readonly OgeToolbarItemData[];
  /**
   * Remote command list. Loaded once through the `@oge-ui/core` `DataSource`
   * contract (accepted structurally) and merged after `items`; a source that
   * publishes `changes` triggers a reload.
   */
  dataSource?: OgeToolbarDataSourceLike;
  /** Main axis — drives the arrow keys and `aria-orientation`. */
  orientation?: OgeToolbarOrientation;
  /**
   * What happens when the items outgrow the toolbar: `'menu'` collapses them
   * into an overflow menu, `'wrap'` flows onto more lines, `'scroll'` adds
   * scroll buttons, `'extended'` hides the remainder behind a toggle,
   * `'none'` lets the row overflow.
   */
  overflow?: OgeToolbarOverflow;
  /** Disables every item and takes the toolbar out of the Tab sequence. */
  disabled?: boolean;
  /** Density preset. */
  size?: OgeToolbarSize;
  /** Container chrome preset. */
  stylingMode?: OgeToolbarStylingMode;
  /** Default for every item's `showText`. */
  showText?: OgeToolbarDisplayMode;
  /** Default for every item's `showIcon`. */
  showIcon?: OgeToolbarDisplayMode;
  /** Whether arrow navigation wraps around the ends (APG: optional). */
  wrap?: boolean;
  /** Turns the arrow/Home/End handling off entirely. */
  keyboardNavigation?: boolean;
  /** Pixels a scroll button moves the row in `overflow: 'scroll'`. */
  scrollStep?: number;
  /** Milliseconds a pointer must rest on an item before `onItemHold` fires. */
  itemHoldTimeout?: number;
  /** Accessible name; falls back to `messages.toolbar`. */
  ariaLabel?: string;
  /** Id of a visible label — wins over `ariaLabel` when both are set. */
  ariaLabelledBy?: string;
  /** Per-instance overrides of the config strings. */
  messages?: Partial<OgeToolbarMessages>;

  // The React counterparts of the Angular projection slots — nodes instead of
  // `[ogeToolbarBefore]` / `[ogeToolbarCenter]` / `[ogeToolbarAfter]`.
  /** Content pinned to the start group; never collapses into the menu. */
  before?: ReactNode;
  /** Content pinned to the center group. */
  center?: ReactNode;
  /** Content pinned to the end group. */
  after?: ReactNode;

  /** Replaces the default rendering of every `items` entry on the bar. */
  renderItem?: (context: OgeToolbarItemRenderContext) => ReactNode;
  /** Replaces the default rendering of an item inside the overflow menu. */
  renderMenuItem?: (context: OgeToolbarItemRenderContext) => ReactNode;

  className?: string;
  style?: CSSProperties;
  id?: string;

  /** An item was activated, on the bar or from the overflow menu. */
  onItemClick?: (event: OgeToolbarItemClickEvent) => void;
  /** Cancelable — set `cancel` to keep the overflow menu closed. */
  onMenuOpening?: (event: OgeToolbarMenuOpeningEvent) => void;
  /** The overflow menu opened. */
  onMenuOpened?: () => void;
  /** Cancelable — set `cancel` to keep the overflow menu open. */
  onMenuClosing?: (event: OgeToolbarMenuClosingEvent) => void;
  /** The overflow menu closed. */
  onMenuClosed?: (event: OgeToolbarMenuClosedEvent) => void;
  /** The set of items living in the overflow menu changed. */
  onOverflowChanged?: (event: OgeToolbarOverflowChangedEvent) => void;
  /** A toggle item's pressed state changed. */
  onActiveChanged?: (event: OgeToolbarItemActiveChangedEvent) => void;
  /** An item was held for `itemHoldTimeout`. */
  onItemHold?: (event: OgeToolbarItemHoldEvent) => void;
  /** An item was right-clicked / long-pressed for a context menu. */
  onItemContextMenu?: (event: OgeToolbarItemHoldEvent) => void;
}

const hasSlot = (node: ReactNode): boolean =>
  node !== undefined && node !== null && node !== false && node !== '';

/**
 * WAI-ARIA APG toolbar: a `role="toolbar"` container with a roving tabindex,
 * three location groups and an overflow menu for the commands that stop
 * fitting — the React render of the Angular `<oge-toolbar>`, over the same
 * `@oge-ui/behavior` decisions (descriptor normalization, the fitting math,
 * the display modes, the menu rows) and the same `.oge-toolbar-*` classes.
 *
 * ```tsx
 * <OgeToolbar
 *   ariaLabel="Document actions"
 *   items={[
 *     { key: 'add', text: 'Add' },
 *     { key: 's', type: 'separator' },
 *     { key: 'export', text: 'Export', location: 'after' },
 *   ]}
 *   after={<OgeSelectBox items={views} />}
 *   onItemClick={(e) => run(e.key)}
 * />
 * ```
 *
 * Slot content (`before` / `center` / `after`) always stays on the bar — only
 * items the toolbar owns can move into the menu, because only those can be
 * re-rendered there.
 */
export const OgeToolbar = forwardRef<OgeToolbarHandle, OgeToolbarProps>(
  function OgeToolbar(props, ref) {
    const {
      items,
      dataSource,
      orientation = 'horizontal',
      overflow = 'menu',
      disabled = false,
      showText = 'always',
      showIcon = 'always',
      wrap = true,
      keyboardNavigation = true,
      scrollStep = 120,
      itemHoldTimeout = 750,
      ariaLabel,
      ariaLabelledBy,
      before,
      center,
      after,
      renderItem,
      renderMenuItem,
      className,
      style,
      id,
    } = props;

    const config = useOgeToolbarConfig();
    const size = props.size ?? config.size ?? 'md';
    const stylingMode = props.stylingMode ?? config.stylingMode ?? 'outlined';
    const messages = useMemo<OgeToolbarMessages>(
      () => ({ ...config.messages, ...props.messages }),
      [config.messages, props.messages],
    );

    const reactId = useId();
    const extendedRowId = `oge-toolbar-${reactId}-extended`;

    const hostRef = useRef<HTMLDivElement>(null);
    const sectionsRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const [loadedItems, setLoadedItems] = useState<
      readonly OgeToolbarItemData[]
    >([]);
    const [addedItems, setAddedItems] = useState<readonly OgeToolbarItemData[]>(
      [],
    );
    const [overrides, setOverrides] = useState<
      ReadonlyMap<string, OgeToolbarItemOverride>
    >(() => new Map());

    const [containerSize, setContainerSize] = useState(0);
    const [menuButtonSize, setMenuButtonSize] = useState(0);
    const [gapSize, setGapSize] = useState(0);
    const [itemSizes, setItemSizes] = useState<ReadonlyMap<string, number>>(
      () => new Map(),
    );

    const [menuOpen, setMenuOpen] = useState(false);
    const [extendedOpen, setExtendedOpen] = useState(false);
    const [scroll, setScroll] = useState({
      hasOverflow: false,
      canScrollBack: false,
      canScrollForward: false,
    });
    /** Index into the current stop list that holds the single `tabindex="0"`. */
    const [focusedStop, setFocusedStop] = useState(0);

    /** Writing direction and host padding, refreshed with the style metrics. */
    const rtlRef = useRef(false);
    const paddingRef = useRef(0);
    /** The focusable stops, cached between DOM changes (see `stops()`). */
    const stopCache = useRef<HTMLElement[] | null>(null);
    const measureFrame = useRef<number | null>(null);
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previousMenuKeys = useRef('');

    const vertical = orientation === 'vertical';

    // --- descriptors ---------------------------------------------------------

    const descriptors = useMemo<readonly OgeToolbarDescriptorCore[]>(
      () =>
        withToolbarIndexes(
          toolbarDataDescriptors(
            [...(items ?? []), ...loadedItems, ...addedItems],
            overrides,
          ),
        ),
      [items, loadedItems, addedItems, overrides],
    );

    const ordered = useMemo(
      () => orderToolbarDescriptors(descriptors),
      [descriptors],
    );

    const fit = useMemo(
      () =>
        fitToolbarDescriptors({
          ordered,
          overflow,
          sizes: itemSizes,
          containerSize,
          menuButtonSize,
          gap: gapSize,
        }),
      [ordered, overflow, itemSizes, containerSize, menuButtonSize, gapSize],
    );

    const inlineIds = useMemo(
      () => new Set(fit.inline.map((i) => ordered[i].id)),
      [fit, ordered],
    );
    const menuDescriptors = useMemo(
      () => fit.inMenu.map((i) => ordered[i]),
      [fit, ordered],
    );

    const menuVisible = overflow === 'menu' && menuDescriptors.length > 0;
    const extendedToggleVisible =
      overflow === 'extended' && menuDescriptors.length > 0;
    const scrollArrows = overflow === 'scroll' && scroll.hasOverflow;
    const isEmpty =
      descriptors.length === 0 &&
      !hasSlot(before) &&
      !hasSlot(center) &&
      !hasSlot(after);

    const inlineIn = (
      location: OgeToolbarItemLocation,
    ): readonly OgeToolbarDescriptorCore[] =>
      descriptors.filter((d) => d.location === location && inlineIds.has(d.id));

    const menuItems = useMemo(
      () => toolbarMenuItems(menuDescriptors, { showText, showIcon, disabled }),
      [menuDescriptors, showText, showIcon, disabled],
    );

    // Every callback the effects and imperative handle reach for, read through
    // one ref so they stay stable across renders (the Angular component's
    // `untracked` reads).
    const latest = useRef(props);
    latest.current = props;
    const state = useRef({
      menuOpen,
      menuVisible,
      disabled,
      vertical,
      overflow,
    });
    state.current = { menuOpen, menuVisible, disabled, vertical, overflow };

    // --- measurement ---------------------------------------------------------

    /**
     * The scroll-position half of the measurement. Scrolling cannot change an
     * item's size, so a scroll event never pays for the full pass.
     */
    const measureScroll = useCallback((): void => {
      const sections = sectionsRef.current;
      if (!sections || state.current.overflow !== 'scroll') return;
      const isVertical = state.current.vertical;
      const next = toolbarScrollState({
        viewport: isVertical ? sections.clientHeight : sections.clientWidth,
        total: isVertical ? sections.scrollHeight : sections.scrollWidth,
        offset: Math.abs(isVertical ? sections.scrollTop : sections.scrollLeft),
      });
      setScroll((current) =>
        current.hasOverflow === next.hasOverflow &&
        current.canScrollBack === next.canScrollBack &&
        current.canScrollForward === next.canScrollForward
          ? current
          : next,
      );
    }, []);

    /**
     * The cheap half, safe to run on every resize frame: the container edge, the
     * overflow button and the scroll offsets. Layout reads only, no style reads.
     */
    const measureContainer = useCallback((): void => {
      const host = hostRef.current;
      if (!host || !sectionsRef.current) return;
      const isVertical = state.current.vertical;

      const box = isVertical ? host.clientHeight : host.clientWidth;
      setContainerSize(box - paddingRef.current);

      const button = menuButtonRef.current;
      if (button) {
        const buttonSize = isVertical
          ? button.offsetHeight
          : button.offsetWidth;
        if (buttonSize > 0) setMenuButtonSize(buttonSize);
      }

      if (state.current.overflow === 'scroll') {
        measureScroll();
      } else {
        setScroll((current) =>
          current.hasOverflow ? { ...current, hasOverflow: false } : current,
        );
      }
    }, [measureScroll]);

    /**
     * The expensive half — one layout read per rendered item. An item's size is
     * independent of the container's, so this runs on content/density changes
     * only, not while the user drags a window edge.
     */
    const measureItems = useCallback((): void => {
      const sections = sectionsRef.current;
      if (!sections) return;
      const isVertical = state.current.vertical;
      setItemSizes((current) => {
        // The map is cloned only once a real change is found, so a steady
        // toolbar re-measures without allocating.
        let next: Map<string, number> | null = null;
        for (const el of sections.querySelectorAll<HTMLElement>(
          '.oge-toolbar-item[data-item-id]',
        )) {
          const itemId = el.getAttribute('data-item-id');
          if (itemId === null) continue;
          const measured = isVertical ? el.offsetHeight : el.offsetWidth;
          if (measured > 0 && current.get(itemId) !== measured) {
            next ??= new Map(current);
            next.set(itemId, measured);
          }
        }
        return next ?? current;
      });
    }, []);

    /**
     * The only `getComputedStyle` read the toolbar makes, kept off the resize
     * path: direction, padding and gap come from custom properties a width
     * change cannot move.
     */
    const measureStyleMetrics = useCallback((): void => {
      const host = hostRef.current;
      if (!host) return;
      const metrics = readToolbarStyleMetrics(
        getComputedStyle(host),
        state.current.vertical,
      );
      rtlRef.current = metrics.rtl;
      paddingRef.current = metrics.padding;
      if (metrics.gap !== null) setGapSize(metrics.gap);
    }, []);

    /** The full pass: style metrics, container box and every item's size. */
    const measure = useCallback((): void => {
      measureStyleMetrics();
      measureContainer();
      measureItems();
    }, [measureStyleMetrics, measureContainer, measureItems]);

    /** Coalesces bursts of resize notifications into one pass per frame. */
    const scheduleMeasure = useCallback((): void => {
      if (measureFrame.current !== null) return;
      if (typeof requestAnimationFrame !== 'function') {
        measureContainer();
        return;
      }
      measureFrame.current = requestAnimationFrame(() => {
        measureFrame.current = null;
        measureContainer();
      });
    }, [measureContainer]);

    useEffect(() => {
      // ResizeObserver is absent in the jsdom test environment — the toolbar
      // then simply keeps every item inline.
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => scheduleMeasure());
      if (hostRef.current) observer.observe(hostRef.current);
      return () => {
        observer.disconnect();
        if (
          measureFrame.current !== null &&
          typeof cancelAnimationFrame === 'function'
        ) {
          cancelAnimationFrame(measureFrame.current);
          measureFrame.current = null;
        }
      };
    }, [scheduleMeasure]);

    // Measurement and focus are deliberately two effects: moving the roving
    // anchor changes `focusedStop` on every arrow key, and that must not force a
    // style recalculation for a layout that cannot have changed.
    useLayoutEffect(() => {
      stopCache.current = null;
      measure();
    }, [descriptors, overflow, orientation, size, stylingMode, measure]);

    // Reporting tracks the menu contents themselves, not the inputs that happen
    // to change them: the set also moves when nothing but the container width
    // did, and a resize never re-runs the measure effect above.
    useEffect(() => {
      const payload = toolbarOverflowEvent(menuDescriptors);
      const serialized = payload.keys.join(' ');
      if (serialized === previousMenuKeys.current) return;
      previousMenuKeys.current = serialized;
      latest.current.onOverflowChanged?.(payload);
    }, [menuDescriptors]);

    // --- roving tabindex -----------------------------------------------------

    /** Focusable stops in DOM order, the overflow button last. */
    const stops = useCallback((): HTMLElement[] => {
      if (stopCache.current !== null) return stopCache.current;
      const el = sectionsRef.current;
      const inSections = el
        ? Array.from(
            el.querySelectorAll<HTMLElement>(OGE_TOOLBAR_STOP_SELECTOR),
          ).filter((node) => node.closest('.oge-popup') === null)
        : [];
      const button = menuButtonRef.current;
      stopCache.current = button ? [...inSections, button] : inSections;
      return stopCache.current;
    }, []);

    /** Clamped roving anchor, moved off a disabled stop. */
    const activeStop = useCallback(
      (list: readonly HTMLElement[], wanted: number): number => {
        if (list.length === 0) return 0;
        const clamped = Math.min(Math.max(wanted, 0), list.length - 1);
        if (!isToolbarStopDisabled(list[clamped])) return clamped;
        return (
          edgeEnabledIndex(list.length, 1, (i) =>
            isToolbarStopDisabled(list[i]),
          ) ?? 0
        );
      },
      [],
    );

    useLayoutEffect(() => {
      stopCache.current = null;
      const list = stops();
      if (list.length === 0) return;
      // With keyboard navigation off there is no roving anchor: every control
      // keeps its natural place in the Tab order.
      if (!keyboardNavigation) {
        list.forEach((el) => el.removeAttribute('tabindex'));
        return;
      }
      const active = activeStop(list, focusedStop);
      list.forEach((el, i) => {
        const value = i === active && !disabled ? '0' : '-1';
        if (el.getAttribute('tabindex') !== value) {
          el.setAttribute('tabindex', value);
        }
      });
    }, [
      focusedStop,
      disabled,
      keyboardNavigation,
      descriptors,
      inlineIds,
      menuVisible,
      before,
      center,
      after,
      stops,
      activeStop,
    ]);

    // --- remote command list -------------------------------------------------

    useEffect(() => {
      if (!dataSource) {
        setLoadedItems((current) => (current.length === 0 ? current : []));
        return;
      }
      return loadToolbarItems(dataSource, setLoadedItems);
    }, [dataSource]);

    // --- overflow menu -------------------------------------------------------

    const menuPanel = useAnchoredPanel({
      anchor: () => menuButtonRef.current,
      panel: () => popupRef.current,
      restoreFocus: () => menuButtonRef.current?.focus(),
      onClosed: (reason) => {
        setMenuOpen(false);
        latest.current.onMenuClosed?.({ reason });
      },
    });
    const menuPanelRef = useRef(menuPanel);
    menuPanelRef.current = menuPanel;

    useEffect(() => {
      const machine = menuPanelRef.current;
      if (menuOpen && !machine.isOpen) machine.open();
      else if (!menuOpen && machine.isOpen) machine.close('api');
    }, [menuOpen, menuPanel.isOpen]);

    const openMenu = useCallback((event?: Event): void => {
      const {
        menuOpen: open,
        menuVisible: visible,
        disabled: off,
      } = state.current;
      if (open || !visible || off) return;
      const pre: OgeToolbarMenuOpeningEvent = { cancel: false, event };
      latest.current.onMenuOpening?.(pre);
      if (pre.cancel) return;
      setMenuOpen(true);
      latest.current.onMenuOpened?.();
    }, []);

    const closeMenu = useCallback(
      (reason: OgeToolbarMenuCloseReason = 'api'): void => {
        if (!state.current.menuOpen) return;
        const pre: OgeToolbarMenuClosingEvent = { cancel: false, reason };
        latest.current.onMenuClosing?.(pre);
        if (pre.cancel) return;
        menuPanelRef.current.close(reason);
      },
      [],
    );

    const toggleMenu = useCallback(
      (event?: Event): void => {
        if (state.current.menuOpen) closeMenu('api');
        else openMenu(event);
      },
      [closeMenu, openMenu],
    );

    // --- imperative handle ---------------------------------------------------

    const override = useCallback(
      (key: string, patch: OgeToolbarItemOverride): void => {
        setOverrides((current) => applyToolbarOverride(current, key, patch));
      },
      [],
    );

    useImperativeHandle<OgeToolbarHandle, OgeToolbarHandle>(
      ref,
      () => ({
        focus: () => {
          const list = stops();
          list[activeStop(list, focusedStopRef.current)]?.focus();
        },
        openMenu,
        closeMenu,
        toggleMenu,
        refreshOverflow: () => {
          setItemSizes(new Map());
          measure();
        },
        addItem: (item) => setAddedItems((current) => [...current, item]),
        removeItem: (key) =>
          setAddedItems((current) => {
            if (current.some((item) => item.key === key)) {
              return current.filter((item) => item.key !== key);
            }
            override(key, { visible: false });
            return current;
          }),
        hideItem: (key, hidden = true) => override(key, { visible: !hidden }),
        enableItem: (key, enabled = true) =>
          override(key, { disabled: !enabled }),
        clearItemOverrides: () => setOverrides(new Map()),
        toggleExtendedRow: () => setExtendedOpen((open) => !open),
      }),
      [stops, activeStop, openMenu, closeMenu, toggleMenu, measure, override],
    );
    const focusedStopRef = useRef(focusedStop);
    focusedStopRef.current = focusedStop;

    // --- activation ----------------------------------------------------------

    const cancelHold = useCallback((): void => {
      if (holdTimer.current === null) return;
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }, []);

    useEffect(() => cancelHold, [cancelHold]);

    const itemEventFor = (
      d: OgeToolbarDescriptorCore,
      event: Event,
    ): OgeToolbarItemHoldEvent => ({
      index: d.index,
      key: d.key,
      item: d.item,
      event,
    });

    const onItemPointerDown = (
      d: OgeToolbarDescriptorCore,
      event: ReactPointerEvent,
    ): void => {
      cancelHold();
      if (d.disabled || disabled) return;
      const native = event.nativeEvent;
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        latest.current.onItemHold?.(itemEventFor(d, native));
      }, itemHoldTimeout);
    };

    const onItemContextMenu = (
      d: OgeToolbarDescriptorCore,
      event: ReactMouseEvent,
    ): void => {
      cancelHold();
      if (d.disabled || disabled) return;
      latest.current.onItemContextMenu?.(itemEventFor(d, event.nativeEvent));
    };

    const activate = (
      d: OgeToolbarDescriptorCore,
      event: Event,
      inMenu: boolean,
    ): void => {
      if (d.disabled || disabled) return;
      latest.current.onItemClick?.({
        index: d.index,
        key: d.key,
        item: d.item,
        inMenu,
        event,
      });
      // A defined `active` is what makes an item a toggle; every activation
      // flips it. `items` entries are data the toolbar must not mutate, so the
      // application applies the change.
      if (d.active === undefined) return;
      latest.current.onActiveChanged?.({
        index: d.index,
        key: d.key,
        item: d.item,
        active: !d.active,
        event,
      });
    };

    // --- keyboard ------------------------------------------------------------

    /** Keeps the roving anchor on whatever the user actually focused. */
    const onFocus = (event: ReactFocusEvent): void => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const list = stops();
      const index = list.findIndex(
        (el) => el === target || el.contains(target),
      );
      if (index !== -1) setFocusedStop(index);
    };

    const onKeyDown = (event: ReactKeyboardEvent): void => {
      if (disabled || !keyboardNavigation) return;
      // A text-entry control owns its arrow and Home/End keys for caret
      // movement — the APG warns against stealing them.
      if (isToolbarTextEntry(event.target)) return;
      const list = stops();
      if (list.length === 0) return;

      const rtl = rtlRef.current;
      const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
      const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
      // Real DOM focus is the anchor's source of truth: `focusedStop` trails it
      // by a render (React batches the focus event's state update), and the
      // arrow keys must never move from a stale index.
      const focused = document.activeElement as HTMLElement | null;
      const focusedIndex = focused
        ? list.findIndex((el) => el === focused || el.contains(focused))
        : -1;
      const current = activeStop(
        list,
        focusedIndex === -1 ? focusedStop : focusedIndex,
      );
      const disabledAt = (i: number) => isToolbarStopDisabled(list[i]);

      let target: number | null = null;
      if (event.key === nextKey) {
        target = stepEnabledIndex(list.length, current, 1, disabledAt, wrap);
      } else if (event.key === prevKey) {
        target = stepEnabledIndex(list.length, current, -1, disabledAt, wrap);
      } else if (event.key === 'Home') {
        target = edgeEnabledIndex(list.length, 1, disabledAt);
      } else if (event.key === 'End') {
        target = edgeEnabledIndex(list.length, -1, disabledAt);
      } else {
        return;
      }

      event.preventDefault();
      if (target === null || target === current) return;
      setFocusedStop(target);
      list[target].focus();
    };

    const scrollStepBy = (direction: 1 | -1): void => {
      const el = sectionsRef.current;
      if (!el) return;
      const amount = scrollStep * direction;
      if (vertical) el.scrollTop += amount;
      else el.scrollLeft += rtlRef.current ? -amount : amount;
      measureScroll();
    };

    // --- render --------------------------------------------------------------

    const hostClasses = [
      'oge-toolbar',
      vertical && 'oge-toolbar-vertical',
      overflow === 'wrap' && 'oge-toolbar-wrap',
      overflow === 'scroll' && 'oge-toolbar-scroll',
      overflow === 'extended' && 'oge-toolbar-extended',
      size === 'sm' && 'oge-toolbar-sm',
      size === 'lg' && 'oge-toolbar-lg',
      stylingMode === 'filled' && 'oge-toolbar-filled',
      stylingMode === 'flat' && 'oge-toolbar-flat',
      disabled && 'oge-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const chevron = (path: string): ReactNode => (
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    );

    const icon = (
      path: string | undefined,
      iconClass: string | undefined,
      suffix: boolean,
    ): ReactNode => {
      const classes = suffix
        ? 'oge-toolbar-icon oge-toolbar-icon-suffix'
        : 'oge-toolbar-icon';
      if (iconClass) {
        return <i className={`${classes} ${iconClass}`} aria-hidden="true" />;
      }
      if (!path) return null;
      return (
        <svg
          className={classes}
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={path} />
        </svg>
      );
    };

    const renderDescriptor = (d: OgeToolbarDescriptorCore): ReactNode => {
      const textShown = toolbarTextVisible(d, showText);
      const iconShown = toolbarIconVisible(d, showIcon);
      const width = toolbarItemWidth(d.width);
      const body = renderItem ? (
        renderItem({ item: d.item, index: d.index, inMenu: false })
      ) : d.type === 'separator' ? (
        <span
          className="oge-toolbar-separator"
          role="separator"
          aria-orientation={vertical ? 'horizontal' : 'vertical'}
        />
      ) : d.type === 'spacer' ? (
        <span className="oge-toolbar-gap" aria-hidden="true" />
      ) : d.type === 'label' ? (
        <span className="oge-toolbar-label">{d.text}</span>
      ) : (
        <button
          type="button"
          className={[
            'oge-toolbar-btn',
            d.severity === 'accent' && 'oge-toolbar-btn-accent',
            d.severity === 'danger' && 'oge-toolbar-btn-danger',
            !textShown && 'oge-toolbar-btn-icon-only',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={d.disabled || disabled}
          aria-pressed={d.active === undefined ? undefined : d.active}
          aria-label={textShown ? undefined : d.text}
          title={d.hint ?? (textShown ? undefined : d.text)}
          onClick={(event) => activate(d, event.nativeEvent, false)}
        >
          {iconShown && icon(d.icon, d.iconClass, false)}
          {textShown && <span className="oge-toolbar-btn-text">{d.text}</span>}
          {iconShown && icon(d.suffixIcon, d.suffixIconClass, true)}
        </button>
      );

      return (
        <div
          key={d.id}
          className={[
            'oge-toolbar-item',
            d.type === 'spacer' && 'oge-toolbar-item-spacer',
            d.type === 'separator' && 'oge-toolbar-item-separator',
            renderItem && 'oge-toolbar-item-custom',
            d.cssClass,
          ]
            .filter(Boolean)
            .join(' ')}
          data-item-id={d.id}
          style={width === null ? undefined : { inlineSize: width }}
          {...d.htmlAttributes}
          onPointerDown={(event) => onItemPointerDown(d, event)}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onContextMenu={(event) => onItemContextMenu(d, event)}
        >
          {body}
        </div>
      );
    };

    const section = (
      location: OgeToolbarItemLocation,
      slot: ReactNode,
    ): ReactNode => (
      <div className={`oge-toolbar-section oge-toolbar-section-${location}`}>
        {slot}
        {inlineIn(location).map(renderDescriptor)}
      </div>
    );

    return (
      <div
        ref={hostRef}
        id={id}
        className={hostClasses}
        style={style}
        role="toolbar"
        aria-orientation={vertical ? 'vertical' : undefined}
        aria-label={
          ariaLabelledBy ? undefined : (ariaLabel ?? messages.toolbar)
        }
        aria-labelledby={ariaLabelledBy}
        aria-disabled={disabled ? true : undefined}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
      >
        {scrollArrows && (
          <button
            type="button"
            className="oge-toolbar-scroll-btn oge-toolbar-scroll-back"
            aria-label={messages.scrollBackward}
            title={messages.scrollBackward}
            disabled={!scroll.canScrollBack || disabled}
            onClick={() => scrollStepBy(-1)}
          >
            {chevron('m10 4-4 4 4 4')}
          </button>
        )}

        <div
          ref={sectionsRef}
          className="oge-toolbar-sections"
          onScroll={measureScroll}
        >
          {section('before', before)}
          {section('center', center)}
          {section('after', after)}
          {isEmpty && (
            <div className="oge-toolbar-empty">{messages.noData}</div>
          )}
        </div>

        {scrollArrows && (
          <button
            type="button"
            className="oge-toolbar-scroll-btn oge-toolbar-scroll-forward"
            aria-label={messages.scrollForward}
            title={messages.scrollForward}
            disabled={!scroll.canScrollForward || disabled}
            onClick={() => scrollStepBy(1)}
          >
            {chevron('m6 4 4 4-4 4')}
          </button>
        )}

        {extendedToggleVisible && (
          <button
            type="button"
            className={[
              'oge-toolbar-extend-btn',
              extendedOpen && 'oge-toolbar-extend-open',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={messages.moreCommands}
            title={messages.moreCommands}
            aria-expanded={extendedOpen}
            aria-controls={extendedRowId}
            disabled={disabled}
            onClick={() => setExtendedOpen((open) => !open)}
          >
            {chevron('m4 6 4 4 4-4')}
          </button>
        )}

        {extendedToggleVisible && extendedOpen && (
          <div className="oge-toolbar-extended-row" id={extendedRowId}>
            {menuDescriptors.map(renderDescriptor)}
          </div>
        )}

        {menuVisible && (
          <>
            <button
              ref={menuButtonRef}
              type="button"
              className="oge-toolbar-menu-btn"
              aria-label={messages.overflowMenu}
              title={messages.overflowMenu}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuPanel.panelId : undefined}
              disabled={disabled}
              onClick={(event) => toggleMenu(event.nativeEvent)}
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="3" cy="8" r="1.4" />
                <circle cx="8" cy="8" r="1.4" />
                <circle cx="13" cy="8" r="1.4" />
              </svg>
            </button>
            {menuOpen && (
              <OgePopup panel={menuPanel} ref={popupRef}>
                <OgeMenuList
                  items={menuItems}
                  ariaLabel={messages.overflowMenu}
                  renderItem={
                    renderMenuItem
                      ? (_item, index) => {
                          const d = menuDescriptors[index];
                          return renderMenuItem({
                            item: d?.item,
                            index: d?.index ?? index,
                            inMenu: true,
                          });
                        }
                      : undefined
                  }
                  onItemClick={(event) => {
                    const index = event.item.value as number;
                    const d = descriptors.find(
                      (entry) => entry.index === index,
                    );
                    closeMenu('select');
                    if (d) activate(d, event.event, true);
                  }}
                  onCloseRequest={(event) => closeMenu(event.reason)}
                />
              </OgePopup>
            )}
          </>
        )}
      </div>
    );
  },
);
