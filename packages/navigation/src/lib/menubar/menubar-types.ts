import type { OgeMenuItem } from '@oge-ui/overlay';

/** Direction the bar lays its top-level items out in. */
export type OgeMenubarOrientation = 'horizontal' | 'vertical';

/**
 * How a **top-level** submenu opens: `'click'` (the desktop-menubar default)
 * or `'hover'` after `hoverDelay`. Nested levels always open on hover and on
 * ArrowRight/Enter — the reference libraries' first-vs-nested split baked in
 * as behavior rather than a second input.
 */
export type OgeMenubarOpenMode = 'click' | 'hover';

/**
 * Why a submenu closed. `'navigation'` is a Left/Right (or hover) switch to a
 * sibling top-level item.
 */
export type OgeMenubarCloseReason =
  'escape' | 'outside' | 'select' | 'tab' | 'navigation' | 'api';

/**
 * One menubar item — the canonical overlay `OgeMenuItem` narrowed recursively,
 * plus the identity/navigation fields a menubar needs. Submenus at any depth
 * come from `items`.
 */
export interface OgeMenubarItemData<T = unknown> extends OgeMenuItem<T> {
  /** Stable identity used by `activeKey`, `open()` and event payloads. */
  key?: string;
  /**
   * Renders the item as a real link (`<a href>`) — at the bar **and** at any
   * submenu depth. `itemClick` still fires first, so `event.preventDefault()`
   * hands navigation to a router. Ignored on submenu parents.
   */
  url?: string;
  /** `false` removes the item (and its subtree) entirely. */
  visible?: boolean;
  /** Child items, recursively. */
  items?: readonly OgeMenubarItemData<T>[];
}

/** Payload of `OgeMenubar.itemClick`. */
export interface OgeMenubarItemClickEvent<T = unknown> {
  item: OgeMenubarItemData<T>;
  /** The item's `key`, when it has one. */
  key?: string;
  /** Index within the item's own level (the last entry of `path`). */
  index: number;
  /** Hierarchical index chain from the bar down to the item. */
  path: readonly number[];
  event: MouseEvent | KeyboardEvent;
}

/**
 * Cancelable pre-event of a top-level submenu opening. `item` is `undefined`
 * for the compact hamburger menu (whose `path` is empty).
 */
export interface OgeMenubarSubmenuOpeningEvent<T = unknown> {
  item?: OgeMenubarItemData<T>;
  key?: string;
  path: readonly number[];
  /** Set `true` to keep the submenu closed. */
  cancel: boolean;
  event?: Event;
}

/** A top-level submenu (or the hamburger menu) finished opening. */
export interface OgeMenubarSubmenuOpenedEvent<T = unknown> {
  item?: OgeMenubarItemData<T>;
  key?: string;
  path: readonly number[];
}

/**
 * Cancelable pre-event of a submenu closing. Fires for closes the menubar
 * itself initiates (`'escape'`, `'select'`, `'navigation'`, `'api'`); pointer
 * closes owned by the overlay (`'outside'`) and `'tab'` are not interceptable
 * and only report `submenuClosed`.
 */
export interface OgeMenubarSubmenuClosingEvent<T = unknown> {
  item?: OgeMenubarItemData<T>;
  key?: string;
  path: readonly number[];
  reason: OgeMenubarCloseReason;
  /** Set `true` to keep the submenu open. */
  cancel: boolean;
}

/** A submenu finished closing. */
export interface OgeMenubarSubmenuClosedEvent<T = unknown> {
  item?: OgeMenubarItemData<T>;
  key?: string;
  path: readonly number[];
  reason: OgeMenubarCloseReason;
}

/** The bar collapsed into (or recovered from) the compact hamburger. */
export interface OgeMenubarCompactChangedEvent {
  compact: boolean;
}

/** Template context of `[ogeMenubarItemTemplate]` (top-level bar items). */
export interface OgeMenubarItemTemplateContext {
  $implicit: OgeMenubarItemData;
  index: number;
}
