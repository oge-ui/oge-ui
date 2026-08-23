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
import type { OgeMenuItem, OgeRect } from '@oge-ui/behavior';
import {
  OgeMenuList,
  type OgeMenuCloseRequestEvent,
  type OgeMenuListHandle,
  type OgeMenuListItemClickEvent,
} from './menu-list';
import { OgePopup } from './popup';
import { useAnchoredPanel } from './use-anchored-panel';

/** Imperative handle — mirrors the Angular directive's public method. */
export interface OgeContextMenuHandle {
  /** Closes the menu programmatically. */
  close(): void;
}

export interface OgeContextMenuProps {
  /** Menu items. An empty array leaves the browser's native menu in charge. */
  items: readonly OgeMenuItem[];
  /** Accessible name of the menu. */
  ariaLabel?: string;
  /** Disables the menu without detaching it. */
  disabled?: boolean;
  /** Replaces the default check+text item rendering (icons, badges…). */
  renderItem?: (item: OgeMenuItem, index: number) => ReactNode;
  /** An enabled item was activated (click, Enter or Space). */
  onItemClick?: (event: OgeMenuListItemClickEvent) => void;
  /** The menu opened (pointer or keyboard). */
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
 * ```
 *
 * The menu opens at the pointer location (or anchored to the element for
 * keyboard invocations), takes focus with full menu keyboard support, closes
 * on outside click, Escape or activation, and restores focus to the target.
 * It runs the same anchored-panel and menu machines as the Angular directive
 * and renders into `document.body`, so overflow or transformed ancestors
 * never clip it.
 */
export const OgeContextMenu = forwardRef<
  OgeContextMenuHandle,
  OgeContextMenuProps
>(function OgeContextMenuRender(
  {
    items,
    ariaLabel,
    disabled = false,
    renderItem,
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
  /** Pointer location of the last right-click; `null` for keyboard opens. */
  const point = useRef<{ x: number; y: number } | null>(null);
  const pendingMenuFocus = useRef(false);

  const latest = useRef({ items, disabled, onItemClick, onOpened, onClosed });
  latest.current = { items, disabled, onItemClick, onOpened, onClosed };

  const target = (): HTMLElement | null =>
    (wrapperRef.current?.firstElementChild as HTMLElement | null) ??
    wrapperRef.current;

  const panel = useAnchoredPanel({
    anchor: target,
    panel: () => popupRef.current,
    placement: () => 'bottom-start',
    anchorRect: (): OgeRect | null => {
      const p = point.current;
      return p ? { top: p.y, left: p.x, width: 0, height: 0 } : null;
    },
    restoreFocus: () => target()?.focus(),
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

  const canOpen = (): boolean =>
    !latest.current.disabled && latest.current.items.length > 0;

  /** Opens at the pointer location, replacing the browser's native menu. */
  const onContextMenu = (event: ReactMouseEvent): void => {
    if (!canOpen()) return;
    event.preventDefault();
    event.stopPropagation();
    // detail === 0 → keyboard-synthesized contextmenu (Menu key on some
    // platforms): anchor to the element instead of a stale pointer position.
    point.current =
      event.detail === 0 || (event.clientX === 0 && event.clientY === 0)
        ? null
        : { x: event.clientX, y: event.clientY };
    openMenu();
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    const menuKey =
      (event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu';
    if (!menuKey || !canOpen()) return;
    // Keys from inside the open menu (a DOM descendant of nothing here — it
    // is portaled) never reach this wrapper; only the target's own keys do.
    event.preventDefault();
    event.stopPropagation();
    point.current = null;
    openMenu();
  };

  useImperativeHandle(
    ref,
    () => ({ close: () => panelRef.current.close() }),
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
              items={items}
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
