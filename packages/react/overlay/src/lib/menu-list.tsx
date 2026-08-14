'use client';

import {
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  OgeMenuTypeAhead,
  menuEdgeIndex,
  menuMoveIndex,
  type OgeMenuCloseReason,
  type OgeMenuItem,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';
import { OgePopup } from './popup';
import { useAnchoredPanel } from './use-anchored-panel';

/** Payload of `onItemClick`. */
export interface OgeMenuListItemClickEvent {
  item: OgeMenuItem;
  /** Index within the `items` prop (separators included). */
  index: number;
  event: MouseEvent | KeyboardEvent;
}

/**
 * The menu asks its owner to close it (owner decides focus handling).
 * `'back'` is emitted by a nested submenu returning to its parent item and is
 * absorbed by the parent menu — it never reaches the root owner.
 */
export interface OgeMenuCloseRequestEvent {
  reason: OgeMenuCloseReason;
  event: KeyboardEvent | MouseEvent;
}

/** Imperative handle — mirrors the Angular component's public methods. */
export interface OgeMenuListHandle {
  /** Focuses the menu container and activates the first/last enabled item. */
  focus(position?: 'first' | 'last'): void;
}

export interface OgeMenuListProps {
  items: readonly OgeMenuItem[];
  /** id of the `role="menu"` element; defaults to a generated unique id. */
  menuId?: string;
  /** Accessible name of the menu. */
  ariaLabel?: string;
  /** Replaces the default check+text item rendering (icons, badges…). */
  renderItem?: (item: OgeMenuItem, index: number) => ReactNode;
  /**
   * Set on the nested list a submenu parent opens. ArrowLeft then closes the
   * level (`'back'`) instead of bubbling to the owner.
   */
  nested?: boolean;
  /** Fires when an enabled item is activated (click, Enter or Space). */
  onItemClick?: (event: OgeMenuListItemClickEvent) => void;
  /** The menu asks its owner to close it; the owner handles focus. */
  onCloseRequest?: (event: OgeMenuCloseRequestEvent) => void;
}

/**
 * Presentational menu with full WAI-ARIA `menu` keyboard support — the React
 * render of the Angular `oge-menu-list`, over the same `@oge-ui/behavior`
 * machines (wrap/skip arithmetic, type-ahead, anchored submenu panels), the
 * same `.oge-menu-*` classes and the same stylesheet. The container holds
 * real focus (`aria-activedescendant` pattern), arrow keys wrap and skip
 * disabled items/separators, Home/End jump, printable keys type-ahead,
 * Enter/Space activate. Closing is delegated to the owner via
 * `onCloseRequest` so focus handling stays in one place.
 *
 * Items with `items` children are submenu parents: activation or ArrowRight
 * opens a nested `<OgeMenuList>` in an anchored panel of its own. The nested
 * level's `'escape'`/`'back'` close requests are absorbed here (the level
 * closes, focus returns to this list); `'select'`/`'tab'` re-emit upward so
 * the root owner still receives exactly one close request and keeps owning
 * focus restoration.
 */
// The explicit annotation breaks the type circularity a recursive component
// otherwise trips over (a submenu renders another <OgeMenuList>).
export const OgeMenuList: ForwardRefExoticComponent<
  OgeMenuListProps & RefAttributes<OgeMenuListHandle>
> = forwardRef<OgeMenuListHandle, OgeMenuListProps>(
  // Named differently from the const on purpose: a named function expression
  // shadows the outer binding inside its own body, so the recursive submenu
  // JSX would otherwise resolve to the raw (props, ref) function instead of
  // the forwardRef component.
  function OgeMenuListRender(
    {
      items,
      menuId,
      ariaLabel,
      renderItem,
      nested = false,
      onItemClick,
      onCloseRequest,
    },
    ref,
  ) {
    const config = useOgeOverlayConfig();
    const hostRef = useRef<HTMLDivElement>(null);
    const childPopupRef = useRef<HTMLDivElement>(null);
    const childListRef = useRef<OgeMenuListHandle>(null);
    const reactId = useId();
    const resolvedMenuId = menuId ?? `oge-menu-${reactId.replace(/:/g, '')}`;
    const itemId = useCallback(
      (index: number) => `${resolvedMenuId}-item-${index}`,
      [resolvedMenuId],
    );

    const [activeIndex, setActiveIndexState] = useState(-1);
    const [openChildIndex, setOpenChildIndex] = useState(-1);

    /** Resets whenever the items themselves change (async reloads etc.). */
    const [prevItems, setPrevItems] = useState(items);
    if (prevItems !== items) {
      setPrevItems(items);
      setActiveIndexState(-1);
    }

    const latest = useRef({ items, config, onItemClick, onCloseRequest });
    latest.current = { items, config, onItemClick, onCloseRequest };

    const pendingChildFocus = useRef(false);
    const hoverOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearHoverTimers = useCallback(() => {
      if (hoverOpenTimer.current !== null) {
        clearTimeout(hoverOpenTimer.current);
        hoverOpenTimer.current = null;
      }
      if (hoverCloseTimer.current !== null) {
        clearTimeout(hoverCloseTimer.current);
        hoverCloseTimer.current = null;
      }
    }, []);
    useEffect(() => clearHoverTimers, [clearHoverTimers]);

    // Shared with the Angular menu via `behavior` — buffer growth,
    // repeated-char cycling and the silence timeout are the same machine.
    const typeAheadRef = useRef<OgeMenuTypeAhead>(undefined);
    typeAheadRef.current ??= new OgeMenuTypeAhead(
      () => latest.current.config.typeAheadMs,
    );

    const openChildIndexRef = useRef(openChildIndex);
    openChildIndexRef.current = openChildIndex;

    /**
     * At most one submenu per level, so one panel instance: switching rows
     * just repoints the anchor, which makes sibling-hover switching atomic.
     * Outside clicks and Escape stay owned by the root panel / this list's
     * keydown.
     */
    const childPanel = useAnchoredPanel({
      anchor: () => {
        const index = openChildIndexRef.current;
        return index >= 0 ? document.getElementById(itemId(index)) : null;
      },
      panel: () => childPopupRef.current,
      placement: () => 'right-start',
      closeOnOutsidePointerDown: false,
      closeOnEscape: false,
      onClosed: () => setOpenChildIndex(-1),
    });
    const childPanelRef = useRef(childPanel);
    childPanelRef.current = childPanel;

    // Keyboard opens hand focus to the child list once it is measured; hover
    // opens never move focus (pendingChildFocus stays false).
    useEffect(() => {
      if (childPanel.position !== null && pendingChildFocus.current) {
        pendingChildFocus.current = false;
        childListRef.current?.focus('first');
      }
    }, [childPanel.position]);

    const setActive = useCallback(
      (index: number) => {
        // A keyboard move off the open parent row closes its submenu (APG:
        // the expanded row changed). Pointer moves go through the delayed
        // hover path.
        if (
          childPanelRef.current.isOpen &&
          index !== openChildIndexRef.current
        ) {
          closeChild();
        }
        setActiveIndexState(index);
        document.getElementById(itemId(index))?.scrollIntoView?.({
          block: 'nearest',
        });
      },
      [itemId],
    );

    const openChild = useCallback(
      (index: number, focusChild = false) => {
        clearHoverTimers();
        const panel = childPanelRef.current;
        if (index === openChildIndexRef.current && panel.isOpen) {
          if (focusChild) childListRef.current?.focus('first');
          return;
        }
        setOpenChildIndex(index);
        openChildIndexRef.current = index;
        pendingChildFocus.current = focusChild;
        if (panel.isOpen) {
          panel.updatePosition(); // switched rows: re-anchor in place
          if (focusChild) {
            pendingChildFocus.current = false;
            childListRef.current?.focus('first');
          }
        } else {
          panel.open();
        }
      },
      [clearHoverTimers],
    );

    const closeChild = useCallback(() => {
      clearHoverTimers();
      const panel = childPanelRef.current;
      if (!panel.isOpen) return;
      const popup = childPopupRef.current;
      const hadFocus = !!popup && popup.contains(document.activeElement);
      panel.close('api');
      // Never let focus fall to <body> when the focused level unmounts.
      if (hadFocus) hostRef.current?.focus({ preventScroll: true });
    }, [clearHoverTimers]);

    useImperativeHandle(
      ref,
      () => ({
        focus: (position: 'first' | 'last' = 'first') => {
          hostRef.current?.focus({ preventScroll: true });
          const index = menuEdgeIndex(latest.current.items, position);
          if (index >= 0) setActive(index);
        },
      }),
      [setActive],
    );

    const activate = useCallback(
      (
        item: OgeMenuItem,
        index: number,
        event: ReactMouseEvent | KeyboardEvent,
      ) => {
        const nativeEvent =
          'nativeEvent' in event ? (event.nativeEvent as MouseEvent) : event;
        if (item.disabled || item.separator) {
          if (item.url && 'preventDefault' in event) event.preventDefault();
          return;
        }
        if (item.items?.length) {
          const keyboard =
            !(nativeEvent instanceof MouseEvent) || nativeEvent.detail === 0;
          if (!keyboard && index === openChildIndexRef.current) {
            closeChild(); // pointer click toggles an open parent row
            return;
          }
          openChild(index, keyboard);
          return;
        }
        latest.current.onItemClick?.({ item, index, event: nativeEvent });
        item.action?.();
        latest.current.onCloseRequest?.({
          reason: 'select',
          event: nativeEvent,
        });
      },
      [closeChild, openChild],
    );

    const onChildCloseRequest = useCallback(
      (event: OgeMenuCloseRequestEvent) => {
        if (event.reason === 'escape' || event.reason === 'back') {
          // Absorb: the level closes, focus returns here — the root owner's
          // close-request contract is untouched.
          closeChild();
          return;
        }
        // 'select' | 'tab' close the whole tree: chain to the root owner.
        latest.current.onCloseRequest?.(event);
      },
      [closeChild],
    );

    const onItemHover = useCallback(
      (item: OgeMenuItem, index: number) => {
        if (item.disabled) return;
        setActiveIndexState(index);
        clearHoverTimers();
        const open = openChildIndexRef.current;
        if (index === open) return; // re-entering the open row keeps it open
        if (item.items?.length) {
          hoverOpenTimer.current = setTimeout(
            () => openChild(index),
            latest.current.config.menuShowDelayMs,
          );
        }
        if (open >= 0) {
          hoverCloseTimer.current = setTimeout(
            () => closeChild(),
            latest.current.config.menuHideDelayMs,
          );
        }
      },
      [clearHoverTimers, closeChild, openChild],
    );

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      // A nested list is a DOM descendant, so its unstopped keys (Tab, an
      // ArrowRight on a leaf…) bubble through this host — route only events
      // originating in this list.
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('.oge-menu-list') !== hostRef.current) return;
      const key = event.key;
      const native = event.nativeEvent;
      if (key === 'Tab') {
        latest.current.onCloseRequest?.({ reason: 'tab', event: native });
        return; // no preventDefault — the browser continues tabbing from the owner
      }
      if (key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        latest.current.onCloseRequest?.({ reason: 'escape', event: native });
        return;
      }
      const rtl =
        hostRef.current !== null &&
        getComputedStyle(hostRef.current).direction === 'rtl';
      if (key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
        const index = activeIndex;
        const item = items[index];
        if (item?.items?.length && !item.disabled) {
          event.preventDefault();
          event.stopPropagation();
          openChild(index, true);
        }
        // Leaf rows let the key bubble — a menubar moves to the next bar item.
        return;
      }
      if (key === (rtl ? 'ArrowRight' : 'ArrowLeft')) {
        if (nested) {
          event.preventDefault();
          event.stopPropagation();
          latest.current.onCloseRequest?.({ reason: 'back', event: native });
        }
        // Root-level lists let the key bubble — a menubar moves to the
        // previous bar item.
        return;
      }
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        const next = menuMoveIndex(
          items,
          activeIndex,
          key === 'ArrowDown' ? 1 : -1,
        );
        if (next >= 0) setActive(next);
        return;
      }
      if (key === 'Home' || key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        const index = menuEdgeIndex(items, key === 'Home' ? 'first' : 'last');
        if (index >= 0) setActive(index);
        return;
      }
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        const index = activeIndex;
        const item = items[index];
        if (!item) return;
        if (item.url && !item.items?.length && !item.disabled) {
          // Activate the real link, so navigation keeps native anchor
          // semantics — a handler's preventDefault() on the click event hands
          // it to a router, exactly like a pointer click.
          document.getElementById(itemId(index))?.click();
          return;
        }
        activate(item, index, native);
        return;
      }
      if (
        key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        const index = typeAheadRef.current!.next(
          key,
          items,
          activeIndex,
          performance.now(),
        );
        if (index >= 0) setActive(index);
      }
    };

    /**
     * One row with an icon gives every row an icon column, so labels stay on
     * a single left edge instead of stepping in and out down the menu.
     */
    const hasIcons = items.some(
      (item) => !item.separator && (item.icon || item.iconClass),
    );

    const rowContent = (item: OgeMenuItem, index: number) => (
      <>
        {renderItem ? (
          renderItem(item, index)
        ) : (
          <>
            {item.checked !== undefined && !item.items?.length && (
              <span className="oge-menu-item-check">
                {item.checked && (
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m3 8.5 3.5 3.5L13 4.5" />
                  </svg>
                )}
              </span>
            )}
            {hasIcons && (
              <span className="oge-menu-item-icon">
                {item.icon ? (
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={item.icon} />
                  </svg>
                ) : item.iconClass ? (
                  <i className={item.iconClass} aria-hidden="true" />
                ) : null}
              </span>
            )}
            <span className="oge-menu-item-text">{item.text}</span>
            {item.badge !== undefined && (
              <span className="oge-menu-item-badge">{item.badge}</span>
            )}
            {item.shortcut && (
              <span className="oge-menu-item-shortcut" aria-hidden="true">
                {item.shortcut}
              </span>
            )}
          </>
        )}
        {item.items?.length ? (
          // Outside the renderItem branch so custom renderers keep the
          // submenu affordance.
          <span className="oge-menu-item-caret" aria-hidden="true">
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 4 4 4-4 4" />
            </svg>
          </span>
        ) : null}
      </>
    );

    const ariaChecked = (item: OgeMenuItem): boolean | undefined =>
      item.checked === undefined ? undefined : item.checked;

    const childItems: readonly OgeMenuItem[] =
      openChildIndex >= 0 ? (items[openChildIndex]?.items ?? []) : [];
    /** APG: a submenu is named by its parent item. */
    const childLabel =
      openChildIndex >= 0 ? items[openChildIndex]?.text : undefined;

    return (
      <div
        ref={hostRef}
        className="oge-menu-list"
        role="menu"
        tabIndex={-1}
        id={resolvedMenuId}
        aria-label={ariaLabel}
        aria-activedescendant={
          activeIndex >= 0 ? itemId(activeIndex) : undefined
        }
        onKeyDown={onKeyDown}
      >
        {items.map((item, index) =>
          item.separator ? (
            <hr key={index} className="oge-menu-separator" role="separator" />
          ) : item.url && !item.items?.length ? (
            <a
              key={index}
              className={[
                'oge-menu-item',
                index === activeIndex && 'oge-menu-item-active',
                item.severity === 'danger' && 'oge-menu-item-danger',
                (item.disabled ?? false) && 'oge-menu-item-disabled',
              ]
                .filter(Boolean)
                .join(' ')}
              role="menuitem"
              tabIndex={-1}
              id={itemId(index)}
              href={item.url}
              aria-disabled={item.disabled ? 'true' : undefined}
              aria-keyshortcuts={item.shortcut}
              title={item.hint}
              onClick={(event) => activate(item, index, event)}
              onPointerEnter={() => onItemHover(item, index)}
            >
              {rowContent(item, index)}
            </a>
          ) : (
            <button
              key={index}
              type="button"
              className={[
                'oge-menu-item',
                index === activeIndex && 'oge-menu-item-active',
                item.severity === 'danger' && 'oge-menu-item-danger',
              ]
                .filter(Boolean)
                .join(' ')}
              tabIndex={-1}
              id={itemId(index)}
              role={
                item.checked !== undefined && !item.items?.length
                  ? 'menuitemcheckbox'
                  : 'menuitem'
              }
              aria-checked={item.items?.length ? undefined : ariaChecked(item)}
              aria-disabled={item.disabled ? 'true' : undefined}
              aria-haspopup={item.items?.length ? 'menu' : undefined}
              aria-expanded={
                item.items?.length ? index === openChildIndex : undefined
              }
              aria-keyshortcuts={item.shortcut}
              title={item.hint}
              disabled={item.disabled ?? false}
              onClick={(event) => activate(item, index, event)}
              onPointerEnter={() => onItemHover(item, index)}
            >
              {rowContent(item, index)}
            </button>
          ),
        )}
        {childItems.length > 0 && (
          <OgePopup panel={childPanel} ref={childPopupRef}>
            <OgeMenuList
              ref={childListRef}
              items={childItems}
              nested
              ariaLabel={childLabel}
              renderItem={renderItem}
              onItemClick={(event) => latest.current.onItemClick?.(event)}
              onCloseRequest={onChildCloseRequest}
            />
          </OgePopup>
        )}
      </div>
    );
  },
);
