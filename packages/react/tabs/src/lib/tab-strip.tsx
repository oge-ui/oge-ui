'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  OGE_TAB_DRAG_THRESHOLD,
  edgeEnabledIndex,
  stepEnabledIndex,
  type OgeTabsActivation,
  type OgeTabsAlignment,
  type OgeTabsIndicatorFit,
  type OgeTabsMessages,
  type OgeTabsNavButtonsMode,
  type OgeTabsOrientation,
  type OgeTabsSize,
  type OgeTabsStylingMode,
} from '@oge-ui/behavior';
import {
  OgeMenuList,
  OgePopup,
  useAnchoredPanel,
  type OgeMenuItem,
} from '@oge-ui/react-overlay';
import type { OgeReactTabDescriptor } from './tabs-types';

export interface OgeTabStripProps {
  descriptors: readonly OgeReactTabDescriptor[];
  selectedIndex: number;
  activation?: OgeTabsActivation;
  orientation?: OgeTabsOrientation;
  disabled?: boolean;
  alignment?: OgeTabsAlignment;
  indicatorFit?: OgeTabsIndicatorFit;
  showNavButtons?: OgeTabsNavButtonsMode;
  showTabListButton?: boolean;
  allowReorder?: boolean;
  stylingMode?: OgeTabsStylingMode;
  size?: OgeTabsSize;
  messages: OgeTabsMessages;
  closePendingIds: ReadonlySet<string>;
  /** DOM id prefix of the owning component. */
  idPrefix: string;
  /** `true` when the owner renders tabpanels (`aria-controls` wiring). */
  hasPanels?: boolean;
  ariaLabel?: string;
  onActivate: (index: number, event: MouseEvent | KeyboardEvent) => void;
  onFocusSelect: (index: number, event: KeyboardEvent) => void;
  onCloseRequest: (index: number, event: Event) => void;
  onReorderRequest: (fromIndex: number, toIndex: number) => void;
  /** Receives the focus-after-close callback and the focus/scroll helpers. */
  onReady?: (api: OgeTabStripApi) => void;
}

/** Imperative surface the owning component drives the strip through. */
export interface OgeTabStripApi {
  focusActiveTab(): void;
  scrollToIndex(index: number): void;
  handleClosedFocus(closedIndex: number): void;
}

/**
 * Presentational tab strip shared by `<OgeTabs>` and `<OgeTabPanel>` — the
 * React render of the Angular `oge-tab-strip`: it renders the headers and
 * owns focus/keyboard handling, overflow scrolling, the all-tabs menu and the
 * drag-reorder gesture. Every state decision (selection, closing, order)
 * stays with the owner; the strip only reports requests. Internal — not
 * exported from the package barrel.
 */
export function OgeTabStrip(props: OgeTabStripProps) {
  const {
    descriptors,
    selectedIndex,
    activation = 'automatic',
    orientation = 'horizontal',
    disabled = false,
    alignment = 'start',
    indicatorFit = 'tab',
    showNavButtons = 'auto',
    showTabListButton = false,
    allowReorder = false,
    stylingMode = 'primary',
    size = 'md',
    messages,
    closePendingIds,
    idPrefix,
    hasPanels = false,
    ariaLabel,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const tabEls = useRef(new Map<string, HTMLDivElement>());

  const latest = useRef(props);
  latest.current = props;

  /** Id of the tab that last held focus — the roving-tabindex anchor. */
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const drag = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    fromIndex: -1,
    active: false,
    suppressClick: false,
    dropIndex: null as number | null,
  });

  const isDisabled = useCallback(
    (d: OgeReactTabDescriptor): boolean =>
      d.disabled || (latest.current.disabled ?? false),
    [],
  );

  /** The single tab participating in the page Tab sequence. */
  const focusTargetId = ((): string | null => {
    if (descriptors.length === 0) return null;
    const focusedTab = descriptors.find((d) => d.id === focusedId);
    if (focusedTab && !isDisabled(focusedTab)) return focusedTab.id;
    const selected = descriptors[selectedIndex];
    if (selected && !isDisabled(selected)) return selected.id;
    return descriptors.find((d) => !isDisabled(d))?.id ?? null;
  })();

  const navVisible =
    showNavButtons === 'never'
      ? false
      : showNavButtons === 'always'
        ? true
        : hasOverflow;

  const isRtl = (): boolean =>
    !!hostRef.current && getComputedStyle(hostRef.current).direction === 'rtl';

  // --- measurement ---------------------------------------------------------

  const measure = useCallback((): void => {
    const el = scrollerRef.current;
    if (!el) return;
    const vertical = latest.current.orientation === 'vertical';
    const viewport = vertical ? el.clientHeight : el.clientWidth;
    const total = vertical ? el.scrollHeight : el.scrollWidth;
    const offset = Math.abs(vertical ? el.scrollTop : el.scrollLeft);
    setHasOverflow(total > viewport + 1);
    setCanScrollBack(offset > 1);
    setCanScrollForward(offset < total - viewport - 1);
  }, []);

  const scrollToIndex = useCallback((index: number): void => {
    const d = latest.current.descriptors[index];
    const el = d ? tabEls.current.get(d.id) : undefined;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      measure();
      return;
    }
    const observer = new ResizeObserver(() => measure());
    const scroller = scrollerRef.current;
    if (scroller) observer.observe(scroller);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  // Re-measure and keep the selected tab visible whenever tabs or selection
  // change — the Angular `afterRenderEffect`.
  useLayoutEffect(() => {
    measure();
    scrollToIndex(selectedIndex);
  }, [descriptors, selectedIndex, measure, scrollToIndex]);

  const focusActiveTab = useCallback((): void => {
    const id = focusTargetIdRef.current;
    if (id === null) return;
    tabEls.current.get(id)?.focus();
  }, []);
  const focusTargetIdRef = useRef(focusTargetId);
  focusTargetIdRef.current = focusTargetId;

  /**
   * APG focus hand-off after a close: the following tab, or the preceding
   * one when the closed tab was last. Runs after the owner removed the tab.
   */
  const handleClosedFocus = useCallback((closedIndex: number): void => {
    setTimeout(() => {
      const ds = latest.current.descriptors;
      if (ds.length === 0) return;
      const target = Math.min(closedIndex, ds.length - 1);
      const d = ds[target];
      const el = d ? tabEls.current.get(d.id) : undefined;
      if (!el) return;
      setFocusedId(d.id);
      el.focus();
    });
  }, []);

  const onReady = props.onReady;
  useEffect(() => {
    onReady?.({ focusActiveTab, scrollToIndex, handleClosedFocus });
  }, [onReady, focusActiveTab, scrollToIndex, handleClosedFocus]);

  // --- pointer -------------------------------------------------------------

  const isCloseTarget = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest('.oge-tab-close') !== null;

  const onTabClick = (index: number, event: ReactMouseEvent): void => {
    if (drag.current.suppressClick) {
      drag.current.suppressClick = false;
      return;
    }
    const d = descriptors[index];
    if (!d || isDisabled(d)) return;
    // The ✕ is a presentational span inside the tab — resolve it from the
    // event target instead of giving it its own (nested-interactive) handler.
    if (isCloseTarget(event.target)) {
      latest.current.onCloseRequest(index, event.nativeEvent);
      return;
    }
    setFocusedId(d.id);
    latest.current.onActivate(index, event.nativeEvent);
  };

  /** Index (in the resulting order) the dragged tab would land at. */
  const computeDropIndex = (clientX: number, clientY: number): number => {
    const ds = latest.current.descriptors;
    const vertical = latest.current.orientation === 'vertical';
    const rtl = isRtl();
    for (let i = 0; i < ds.length; i++) {
      const el = tabEls.current.get(ds[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const mid = vertical
        ? rect.top + rect.height / 2
        : rect.left + rect.width / 2;
      const pos = vertical ? clientY : clientX;
      const before = vertical || !rtl ? pos < mid : pos > mid;
      if (before) return i <= drag.current.fromIndex ? i : i - 1;
    }
    return ds.length - 1;
  };

  const resetDrag = useCallback((): void => {
    drag.current.pointerId = null;
    drag.current.active = false;
    drag.current.fromIndex = -1;
    drag.current.dropIndex = null;
    setDragSourceIndex(null);
    setDropTargetIndex(null);
    document.removeEventListener('keydown', onDragKeydown, true);
    // onDragKeydown is a stable ref-bound callback
  }, []);

  const onDragKeydown = useRef((event: KeyboardEvent): void => {
    if (event.key === 'Escape' && drag.current.active) {
      event.stopPropagation();
      resetDragRef.current();
    }
  }).current;
  const resetDragRef = useRef(resetDrag);
  resetDragRef.current = resetDrag;

  useEffect(
    () => () => document.removeEventListener('keydown', onDragKeydown, true),
    [onDragKeydown],
  );

  const onPointerDown = (index: number, event: ReactPointerEvent): void => {
    if (!allowReorder || disabled || event.button !== 0) return;
    if (isCloseTarget(event.target)) return;
    drag.current.pointerId = event.pointerId;
    drag.current.startX = event.clientX;
    drag.current.startY = event.clientY;
    drag.current.fromIndex = index;
    drag.current.active = false;
  };

  const onPointerMove = (event: ReactPointerEvent): void => {
    if (drag.current.pointerId !== event.pointerId) return;
    if (!drag.current.active) {
      const dx = event.clientX - drag.current.startX;
      const dy = event.clientY - drag.current.startY;
      if (Math.hypot(dx, dy) < OGE_TAB_DRAG_THRESHOLD) return;
      drag.current.active = true;
      setDragSourceIndex(drag.current.fromIndex);
      const target = event.target as HTMLElement | null;
      if (target && typeof target.setPointerCapture === 'function') {
        try {
          target.setPointerCapture(event.pointerId);
        } catch {
          // jsdom / detached elements — capture is a progressive enhancement
        }
      }
      document.addEventListener('keydown', onDragKeydown, true);
    }
    const next = computeDropIndex(event.clientX, event.clientY);
    drag.current.dropIndex = next;
    setDropTargetIndex(next);
  };

  const onPointerUp = (event: ReactPointerEvent): void => {
    if (drag.current.pointerId !== event.pointerId) return;
    const wasDragging = drag.current.active;
    const from = drag.current.fromIndex;
    const to = drag.current.dropIndex;
    resetDrag();
    if (!wasDragging) return;
    drag.current.suppressClick = true;
    if (to !== null && to !== from) {
      latest.current.onReorderRequest(from, to);
    }
  };

  // --- keyboard ------------------------------------------------------------

  const currentFocusIndex = (): number => {
    const index = descriptors.findIndex((d) => d.id === focusedId);
    if (index !== -1) return index;
    return selectedIndex >= 0 && selectedIndex < descriptors.length
      ? selectedIndex
      : 0;
  };

  const step = (start: number, direction: 1 | -1): number | null =>
    stepEnabledIndex(descriptors.length, start, direction, (i) =>
      isDisabled(descriptors[i]),
    );

  const edgeEnabled = (direction: 1 | -1): number | null =>
    edgeEnabledIndex(descriptors.length, direction, (i) =>
      isDisabled(descriptors[i]),
    );

  const onKeydown = (event: ReactKeyboardEvent): void => {
    if (descriptors.length === 0 || disabled) return;
    const vertical = orientation === 'vertical';
    const rtl = isRtl();
    const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    const current = currentFocusIndex();

    if (event.key === 'Enter' || event.key === ' ') {
      const d = descriptors[current];
      if (d && !isDisabled(d)) {
        event.preventDefault();
        latest.current.onActivate(current, event.nativeEvent);
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const d = descriptors[current];
      if (d && d.closable && !isDisabled(d)) {
        event.preventDefault();
        latest.current.onCloseRequest(current, event.nativeEvent);
      }
      return;
    }

    let target: number | null = null;
    if (event.key === nextKey) target = step(current, 1);
    else if (event.key === prevKey) target = step(current, -1);
    else if (event.key === 'Home') target = edgeEnabled(1);
    else if (event.key === 'End') target = edgeEnabled(-1);
    if (target === null || target === current) {
      if (target !== null) event.preventDefault();
      return;
    }
    event.preventDefault();
    const d = descriptors[target];
    setFocusedId(d.id);
    tabEls.current.get(d.id)?.focus();
    scrollToIndex(target);
    if (activation === 'automatic') {
      latest.current.onFocusSelect(target, event.nativeEvent);
    }
  };

  const scrollStep = (direction: 1 | -1): void => {
    const el = scrollerRef.current;
    if (!el) return;
    const vertical = orientation === 'vertical';
    const amount =
      (vertical ? el.clientHeight : el.clientWidth) * 0.75 * direction;
    if (vertical) {
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({ top: amount, behavior: 'smooth' });
      } else {
        el.scrollTop += amount;
      }
    } else {
      const left = isRtl() ? -amount : amount;
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({ left, behavior: 'smooth' });
      } else {
        el.scrollLeft += left;
      }
    }
    measure();
  };

  // --- all-tabs menu -------------------------------------------------------

  const menuPanel = useAnchoredPanel({
    anchor: () => menuButtonRef.current,
    panel: () => popupRef.current,
    restoreFocus: () => menuButtonRef.current?.focus(),
    onClosed: () => setMenuOpen(false),
  });
  const menuPanelRef = useRef(menuPanel);
  menuPanelRef.current = menuPanel;

  useEffect(() => {
    const machine = menuPanelRef.current;
    if (menuOpen && !machine.isOpen) machine.open();
    else if (!menuOpen && machine.isOpen) machine.close('api');
  }, [menuOpen, menuPanel.isOpen]);

  const menuItems: OgeMenuItem<number>[] = descriptors.map((d, i) => ({
    text: d.text,
    value: i,
    hint: d.hint,
    disabled: isDisabled(d),
    checked: i === selectedIndex ? true : undefined,
  }));

  // --- render --------------------------------------------------------------

  const hostClasses = [
    'oge-tab-strip',
    orientation === 'vertical' && 'oge-tab-strip-vertical',
    stylingMode === 'secondary' && 'oge-tab-strip-secondary',
    size === 'sm' && 'oge-tab-strip-sm',
    size === 'lg' && 'oge-tab-strip-lg',
    indicatorFit === 'content' && 'oge-tab-strip-ink-content',
    disabled && 'oge-disabled',
  ]
    .filter(Boolean)
    .join(' ');

  const navButton = (direction: 1 | -1): ReactNode => (
    <button
      type="button"
      className={[
        'oge-tab-strip-nav',
        direction === 1
          ? 'oge-tab-strip-nav-forward'
          : 'oge-tab-strip-nav-back',
      ].join(' ')}
      aria-label={
        direction === 1 ? messages.scrollForward : messages.scrollBackward
      }
      disabled={direction === 1 ? !canScrollForward : !canScrollBack}
      onClick={() => scrollStep(direction)}
    >
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
        <path d={direction === 1 ? 'm6 4 4 4-4 4' : 'm10 4-4 4 4 4'} />
      </svg>
    </button>
  );

  const isDropTarget = (index: number): boolean =>
    dragSourceIndex !== null &&
    dropTargetIndex !== null &&
    dropTargetIndex !== dragSourceIndex &&
    dropTargetIndex === index;

  return (
    <div ref={hostRef} className={hostClasses} data-alignment={alignment}>
      {navVisible && navButton(-1)}
      <div
        ref={scrollerRef}
        className="oge-tab-strip-scroll"
        onScroll={measure}
      >
        <div
          className="oge-tab-strip-list"
          role="tablist"
          aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
          aria-label={ariaLabel}
        >
          {descriptors.map((d, i) => (
            <div
              key={d.id}
              ref={(el) => {
                if (el) tabEls.current.set(d.id, el);
                else tabEls.current.delete(d.id);
              }}
              className={[
                'oge-tab',
                i === selectedIndex && 'oge-tab-selected',
                isDisabled(d) && 'oge-tab-disabled',
                d.dirty && 'oge-tab-dirty',
                closePendingIds.has(d.id) && 'oge-tab-close-pending',
                dragSourceIndex === i && 'oge-tab-dragging',
                isDropTarget(i) && 'oge-tab-drop-target',
              ]
                .filter(Boolean)
                .join(' ')}
              role="tab"
              id={`${idPrefix}-tab-${d.id}`}
              aria-selected={i === selectedIndex}
              aria-disabled={isDisabled(d) ? true : undefined}
              aria-controls={
                hasPanels ? `${idPrefix}-panel-${d.id}` : undefined
              }
              data-tab-id={d.id}
              title={d.hint}
              aria-keyshortcuts={d.closable ? 'Delete' : undefined}
              tabIndex={d.id === focusTargetId ? 0 : -1}
              onClick={(event) => onTabClick(i, event)}
              onKeyDown={onKeydown}
              onFocus={() => setFocusedId(d.id)}
              onPointerDown={(event) => onPointerDown(i, event)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={resetDrag}
            >
              {d.renderHeader ? (
                d.renderHeader({
                  item: d.item,
                  index: i,
                  selected: i === selectedIndex,
                  text: d.text,
                })
              ) : (
                <span className="oge-tab-text">{d.text}</span>
              )}
              {d.badge !== undefined && (
                <span className="oge-tab-badge">{d.badge}</span>
              )}
              {d.dirty && (
                <span
                  className="oge-tab-dirty-dot"
                  role="img"
                  aria-label={messages.dirty}
                ></span>
              )}
              {d.closable && (
                // Deliberately a span, not a button: a focusable control
                // inside role="tab" is a nested-interactive a11y violation
                // (axe). The click is handled by the tab itself and the
                // keyboard path is Delete/Backspace, announced via
                // aria-keyshortcuts.
                <span
                  className="oge-tab-close"
                  aria-hidden="true"
                  title={messages.closeTab}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="m4 4 8 8m0-8-8 8" />
                  </svg>
                </span>
              )}
            </div>
          ))}
        </div>
        {descriptors.length === 0 && (
          <div className="oge-tab-strip-empty">{messages.noData}</div>
        )}
      </div>
      {navVisible && navButton(1)}
      {showTabListButton && (
        <>
          <button
            ref={menuButtonRef}
            type="button"
            className="oge-tab-strip-menu-btn"
            aria-label={messages.tabListMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuPanel.panelId : undefined}
            onClick={() => setMenuOpen((open) => !open)}
          >
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
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>
          {menuOpen && (
            <OgePopup panel={menuPanel} ref={popupRef}>
              <OgeMenuList
                items={menuItems}
                ariaLabel={messages.tabListMenu}
                onItemClick={(event) => {
                  menuPanelRef.current.close('select');
                  latest.current.onActivate(
                    event.item.value as number,
                    event.event as MouseEvent | KeyboardEvent,
                  );
                }}
                onCloseRequest={(event) =>
                  menuPanelRef.current.close(event.reason)
                }
              />
            </OgePopup>
          )}
        </>
      )}
    </div>
  );
}
