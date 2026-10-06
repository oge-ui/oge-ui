'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  isOgeContextMenuKey,
  ogeContextMenuApiTarget,
  ogeContextMenuPoint,
  ogeResolveContextMenuOpen,
  type OgeContextMenuOpeningEvent,
  type OgeContextMenuPoint,
  type OgeMenuItem,
  type OgeRect,
} from '@oge-ui/behavior';
import {
  OgeMenuList,
  type OgeMenuCloseRequestEvent,
  type OgeMenuListHandle,
  type OgeMenuListItemClickEvent,
} from './menu-list';
import { OgePopup } from './popup';
import { useAnchoredPanel } from './use-anchored-panel';

/** Imperative handle — mirrors the Angular directive's public methods. */
export interface OgeContextMenuHandle {
  /**
   * Opens the menu programmatically — at a viewport point (`open(x, y)`) or
   * at a pointer event's location (`open(event)`, a DOM or React mouse
   * event; a keyboard-synthesized one anchors to the target). With
   * `target`, the target is the match under the event / point. Runs
   * `onOpening` like a right-click.
   */
  open(x: number, y: number): void;
  open(event: MouseEvent | ReactMouseEvent): void;
  /** Closes the menu programmatically. */
  close(): void;
}

export interface OgeContextMenuProps {
  /**
   * Menu items. An empty array leaves the browser's native menu in charge —
   * unless an `onOpening` handler builds the items per target.
   */
  items: readonly OgeMenuItem[];
  /**
   * CSS selector delegating the menu to matching elements inside the child
   * (`closest()` from the clicked / focused element): requests outside every
   * match keep the browser menu, and the matched element becomes the menu's
   * anchor, `onOpening`'s `target` and the focus-return point. Unset: the
   * child itself is the target.
   */
  target?: string;
  /** Accessible name of the menu. */
  ariaLabel?: string;
  /** Disables the menu without detaching it. */
  disabled?: boolean;
  /** Replaces the default check+text item rendering (icons, badges…). */
  renderItem?: (item: OgeMenuItem, index: number) => ReactNode;
  /**
   * Cancelable, before every open (pointer, keyboard, `open()`): carries the
   * `target` element, the originating `event` and a writable `items` — assign
   * a new array to build the menu for this target; set `cancel` to keep it
   * closed.
   */
  onOpening?: (event: OgeContextMenuOpeningEvent) => void;
  /** An enabled item was activated (click, Enter or Space). */
  onItemClick?: (event: OgeMenuListItemClickEvent) => void;
  /** The menu opened (pointer, keyboard or `open()`). */
  onOpened?: () => void;
  /** The menu closed for any reason. */
  onClosed?: () => void;
  /** The target element — exactly one element child. */
  children?: ReactNode;
}

/**
 * Right-click (and <kbd>Shift+F10</kbd>) context menu on its child element,
 * using the canonical `OgeMenuItem` model — the React render of the Angular
 * `[ogeContextMenu]` directive:
 *
 * ```tsx
 * <OgeContextMenu items={rowMenu} onItemClick={(e) => run(e.item.value)}>
 *   <div tabIndex={0}>…</div>
 * </OgeContextMenu>
 *
 * // one menu for many rows: selector delegation + per-target items
 * <OgeContextMenu items={[]} target="li" onOpening={(e) => { e.items = menuFor(e.target); }}>
 *   <ul>…</ul>
 * </OgeContextMenu>
 * ```
 *
 * The menu opens at the pointer location (or anchored to the element for
 * keyboard invocations), takes focus with full menu keyboard support, closes
 * on outside click, Escape or activation, and restores focus to the target.
 * Target resolution and the cancelable opening pipeline are
 * `@oge-ui/behavior`'s `ogeResolveContextMenuOpen`; the menu runs the same
 * anchored-panel and menu machines as the Angular directive and renders into
 * `document.body`, so overflow or transformed ancestors never clip it.
 */
export const OgeContextMenu = forwardRef<
  OgeContextMenuHandle,
  OgeContextMenuProps
>(function OgeContextMenuRender(
  {
    items,
    target,
    ariaLabel,
    disabled = false,
    renderItem,
    onOpening,
    onItemClick,
    onOpened,
    onClosed,
    children,
  },
  ref,
) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<OgeMenuListHandle>(null);
  /** Pointer location of the open request; `null` anchors to the target. */
  const point = useRef<OgeContextMenuPoint | null>(null);
  /** The element the open menu is for (the child, or the delegated match). */
  const activeTarget = useRef<Element | null>(null);
  /** Items of the open menu (possibly built by `onOpening`). */
  const [activeItems, setActiveItems] = useState<readonly OgeMenuItem[]>(items);
  const pendingMenuFocus = useRef(false);

  const latest = useRef({
    items,
    target,
    disabled,
    onOpening,
    onItemClick,
    onOpened,
    onClosed,
  });
  latest.current = {
    items,
    target,
    disabled,
    onOpening,
    onItemClick,
    onOpened,
    onClosed,
  };

  const host = (): HTMLElement | null =>
    (wrapperRef.current?.firstElementChild as HTMLElement | null) ??
    wrapperRef.current;
  const anchor = (): HTMLElement | null =>
    (activeTarget.current as HTMLElement | null) ?? host();

  const panel = useAnchoredPanel({
    anchor,
    panel: () => popupRef.current,
    placement: () => 'bottom-start',
    anchorRect: (): OgeRect | null => {
      const p = point.current;
      return p ? { top: p.y, left: p.x, width: 0, height: 0 } : null;
    },
    restoreFocus: () => {
      const el = anchor();
      if (el && typeof el.focus === 'function') el.focus();
    },
    onClosed: () => {
      pendingMenuFocus.current = false;
      latest.current.onClosed?.();
    },
  });
  const panelRef = useRef(panel);
  panelRef.current = panel;

  // Focus the menu once the panel has rendered and been measured.
  useEffect(() => {
    if (panel.position !== null && pendingMenuFocus.current) {
      pendingMenuFocus.current = false;
      listRef.current?.focus('first');
    }
  }, [panel.position]);

  // A live `items` change replaces the open menu's items, like before
  // per-target items existed.
  useEffect(() => setActiveItems(items), [items]);

  const openMenu = (): void => {
    const current = panelRef.current;
    if (current.isOpen) {
      // Re-invoked while open (second right-click): move to the new location.
      current.updatePosition();
    } else {
      current.open();
      latest.current.onOpened?.();
    }
    pendingMenuFocus.current = true;
  };

  /** Runs an open request; `true` when the browser menu must stay closed. */
  const request = (
    eventTarget: EventTarget | null,
    at: OgeContextMenuPoint | null,
    event: Event | null,
  ): boolean => {
    const el = host();
    if (!el) return false;
    const result = ogeResolveContextMenuOpen({
      host: el,
      eventTarget,
      selector: latest.current.target,
      items: latest.current.items,
      disabled: latest.current.disabled,
      event,
      emitOpening: (opening) => latest.current.onOpening?.(opening),
    });
    if (result.kind === 'ignored') return false;
    if (result.kind === 'cancelled') return true;
    activeTarget.current = result.target;
    setActiveItems(result.items);
    point.current = at;
    openMenu();
    return true;
  };
  const requestRef = useRef(request);
  requestRef.current = request;

  /** Opens at the pointer location, replacing the browser's native menu. */
  const onContextMenu = (event: ReactMouseEvent): void => {
    if (request(event.target, ogeContextMenuPoint(event), event.nativeEvent)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (!isOgeContextMenuKey(event)) return;
    // Keys from inside the open menu (a DOM descendant of nothing here — it
    // is portaled) never reach this wrapper; only the target's own keys do.
    if (request(event.target, null, event.nativeEvent)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      open: (xOrEvent: number | MouseEvent | ReactMouseEvent, y?: number) => {
        const el = host();
        if (!el) return;
        if (typeof xOrEvent === 'number') {
          const at = { x: xOrEvent, y: y ?? 0 };
          requestRef.current(ogeContextMenuApiTarget(el, null, at), at, null);
          return;
        }
        const native: MouseEvent =
          'nativeEvent' in xOrEvent ? xOrEvent.nativeEvent : xOrEvent;
        const at = ogeContextMenuPoint(native);
        requestRef.current(
          ogeContextMenuApiTarget(el, native.target, at),
          at,
          native,
        );
      },
      close: () => panelRef.current.close(),
    }),
    [],
  );

  const [closeRequest] = useState(
    () => (request: OgeMenuCloseRequestEvent) =>
      panelRef.current.close(request.reason),
  );

  return (
    <>
      <span
        ref={wrapperRef}
        style={{ display: 'contents' }}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
      >
        {children}
      </span>
      {panel.isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <OgePopup panel={panel} ref={popupRef}>
            <OgeMenuList
              ref={listRef}
              items={activeItems}
              ariaLabel={ariaLabel}
              renderItem={renderItem}
              onItemClick={(event) => latest.current.onItemClick?.(event)}
              onCloseRequest={closeRequest}
            />
          </OgePopup>,
          document.body,
        )}
    </>
  );
});
