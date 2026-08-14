import { resolveMenubarCompact } from '@oge-ui/core';
import type { OgePopupCloseReason } from '../overlay/anchored-panel-core';
import type { OgeMenuItem } from '../menu/menu-types';

/**
 * The framework-free half of the menubar (ADR 0001): its vocabulary, the event
 * payloads, the message catalog, the config merge rule, the item descriptor
 * and the pure decisions both render layers make — pruning, path lookup, the
 * orientation/RTL key map, the panel's items/label/placement and the
 * close-reason mapping.
 *
 * What already lives elsewhere is *used*, never re-implemented: the
 * bar-collapse decision is `@oge-ui/core`'s `resolveMenubarCompact` (re-exported
 * here so a render layer needs one import), the roving-tabindex arithmetic is
 * `stepEnabledIndex`/`edgeEnabledIndex`, the bar type-ahead is
 * `createTypeAheadBuffer`/`matchByPrefix`, and everything inside a submenu is
 * the shared menu machinery (`menuMoveIndex`, `menuEdgeIndex`,
 * `OgeMenuTypeAhead`) the menu list already runs.
 */

// --- vocabulary ------------------------------------------------------------

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
 * One menubar item — the canonical menu `OgeMenuItem` narrowed recursively,
 * plus the identity/navigation fields a menubar needs. Submenus at any depth
 * come from `items`.
 */
export interface OgeMenubarItemData<T = unknown> extends OgeMenuItem<T> {
  /** Stable identity used by `activeKey`, `open()` and event payloads. */
  key?: string;
  /**
   * Renders the item as a real link (`<a href>`) — at the bar **and** at any
   * submenu depth. The item-click event still fires first, so
   * `event.preventDefault()` hands navigation to a router. Ignored on submenu
   * parents.
   */
  url?: string;
  /** `false` removes the item (and its subtree) entirely. */
  visible?: boolean;
  /** Child items, recursively. */
  items?: readonly OgeMenubarItemData<T>[];
}

/** Payload of the menubar's item-click event. */
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
 * and only report the closed event.
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

/** What the single anchored panel currently shows. */
export type OgeMenubarPanelSource = 'bar' | 'hamburger' | null;

/** One normalized top-level entry the render layers iterate over. */
export interface OgeMenubarDescriptorCore<T = unknown> {
  readonly id: string;
  readonly item: OgeMenubarItemData<T>;
}

// --- config ----------------------------------------------------------------

/** Every user-facing string the menubar renders, including aria labels. */
export interface OgeMenubarMessages {
  /** Accessible name of the bar when the application supplies none. */
  menubar: string;
  /** Aria label of the compact hamburger button. */
  hamburger: string;
}

export const OGE_DEFAULT_MENUBAR_MESSAGES: OgeMenubarMessages = {
  menubar: 'Menu bar',
  hamburger: 'Menu',
};

export interface OgeMenubarConfig {
  messages: OgeMenubarMessages;
  /** Default for the `openMode` input. */
  openMode?: OgeMenubarOpenMode;
  /** Default for the `hoverDelay` input, in ms. */
  hoverDelay?: number;
  /** Default for the `orientation` input. */
  orientation?: OgeMenubarOrientation;
  /** Default for the `compactBelow` input. */
  compactBelow?: number;
}

export const OGE_DEFAULT_MENUBAR_CONFIG: OgeMenubarConfig = {
  messages: OGE_DEFAULT_MENUBAR_MESSAGES,
};

export type OgeMenubarConfigInput = Partial<
  Omit<OgeMenubarConfig, 'messages'>
> & {
  messages?: Partial<OgeMenubarMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeMenubarConfig(
  input: OgeMenubarConfigInput | undefined,
): OgeMenubarConfig {
  return {
    ...OGE_DEFAULT_MENUBAR_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_MENUBAR_MESSAGES, ...input?.messages },
  };
}

/** Default hover dwell before a top-level submenu opens in `'hover'` mode. */
export const OGE_MENUBAR_HOVER_DELAY = 100;

// --- pure decisions --------------------------------------------------------

/** Recursively drops `visible: false` items; leaf references are preserved. */
export function pruneHiddenMenubarItems<T>(
  items: readonly OgeMenubarItemData<T>[],
): readonly OgeMenubarItemData<T>[] {
  return items
    .filter((item) => item.visible !== false)
    .map((item) =>
      item.items?.length
        ? { ...item, items: pruneHiddenMenubarItems(item.items) }
        : item,
    );
}

/**
 * The data-driven half of the descriptor list: visible items only, each with a
 * stable id (`key`, else a per-source auto id). Render layers prepend their own
 * declarative descriptors — children first, then `items`, the house merge order.
 */
export function menubarDataDescriptors<T>(
  items: readonly OgeMenubarItemData<T>[] | undefined,
): readonly OgeMenubarDescriptorCore<T>[] {
  return (items ?? [])
    .filter((item) => item.visible !== false)
    .map((item, index) => ({ id: item.key ?? `i${index}`, item }));
}

/** Index chain of `target` (by reference) inside `items`, or `null`. */
export function findMenubarItemPath(
  items: readonly OgeMenubarItemData[],
  target: OgeMenuItem,
): number[] | null {
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (item === target) return [index];
    if (item.items?.length) {
      const sub = findMenubarItemPath(item.items, target);
      if (sub) return [index, ...sub];
    }
  }
  return null;
}

/**
 * `true` when the bar entry at `index` may not hold the roving tab stop:
 * missing, disabled, a separator — or the whole bar is disabled, in which case
 * there is no tab stop at all.
 */
export function menubarStopDisabled(
  descriptors: readonly OgeMenubarDescriptorCore[],
  index: number,
  barDisabled = false,
): boolean {
  if (barDisabled) return true;
  const d = descriptors[index];
  return !d || !!d.item.disabled || !!d.item.separator;
}

/** The arrow keys of a bar, resolved for its orientation and writing direction. */
export interface OgeMenubarBarKeys {
  /** Moves the roving focus forward along the bar. */
  next: string;
  /** Moves the roving focus backward along the bar. */
  prev: string;
  /** Opens the focused item's submenu with its first row active. */
  open: string;
  /** Opens it with the last row active — horizontal bars only. */
  openLast: string | null;
  /**
   * Leaves an open level-1 submenu the way it was entered: on a horizontal bar
   * that is the previous bar item, on a vertical one it is the bar itself.
   */
  back: string;
}

/**
 * The APG menubar key map. A horizontal bar traverses along the inline axis
 * (mirrored in RTL) and opens downward; a vertical bar traverses along the
 * block axis and opens to the inline end.
 */
export function menubarBarKeys(
  orientation: OgeMenubarOrientation,
  rtl: boolean,
): OgeMenubarBarKeys {
  const horizontal = orientation !== 'vertical';
  const inlineNext = rtl ? 'ArrowLeft' : 'ArrowRight';
  const inlinePrev = rtl ? 'ArrowRight' : 'ArrowLeft';
  return horizontal
    ? {
        next: inlineNext,
        prev: inlinePrev,
        open: 'ArrowDown',
        openLast: 'ArrowUp',
        back: inlinePrev,
      }
    : {
        next: 'ArrowDown',
        prev: 'ArrowUp',
        open: inlineNext,
        openLast: null,
        back: inlinePrev,
      };
}

/** Items the single anchored panel shows for the current open state. */
export function menubarPanelItems<T>(
  descriptors: readonly OgeMenubarDescriptorCore<T>[],
  source: OgeMenubarPanelSource,
  openIndex: number,
): readonly OgeMenubarItemData<T>[] {
  if (source === 'hamburger') {
    return pruneHiddenMenubarItems(descriptors.map((d) => d.item));
  }
  if (source !== 'bar' || openIndex < 0) return [];
  return pruneHiddenMenubarItems(descriptors[openIndex]?.item.items ?? []);
}

/** Accessible name of the open panel — APG: a submenu is named by its parent. */
export function menubarPanelLabel(
  descriptors: readonly OgeMenubarDescriptorCore[],
  source: OgeMenubarPanelSource,
  openIndex: number,
  hamburgerLabel: string,
): string | undefined {
  return source === 'hamburger'
    ? hamburgerLabel
    : descriptors[openIndex]?.item.text;
}

/** Where the panel sits: beside a vertical bar, below everything else. */
export function menubarPanelPlacement(
  source: OgeMenubarPanelSource,
  orientation: OgeMenubarOrientation,
): 'right-start' | 'bottom-start' {
  return source === 'bar' && orientation === 'vertical'
    ? 'right-start'
    : 'bottom-start';
}

/** The `item`/`key`/`path` triple every submenu event carries. */
export function menubarEventBase<T>(
  descriptors: readonly OgeMenubarDescriptorCore<T>[],
  source: OgeMenubarPanelSource,
  openIndex: number,
): { item?: OgeMenubarItemData<T>; key?: string; path: readonly number[] } {
  if (source === 'hamburger') return { path: [] };
  const item = openIndex >= 0 ? descriptors[openIndex]?.item : undefined;
  return { item, key: item?.key, path: openIndex >= 0 ? [openIndex] : [] };
}

/** The panel-level reason a menubar close reason maps onto. */
export function menubarPopupCloseReason(
  reason: OgeMenubarCloseReason,
): OgePopupCloseReason {
  switch (reason) {
    case 'escape':
    case 'select':
    case 'tab':
      return reason;
    default:
      return 'api';
  }
}

/**
 * The menubar reason a finished panel close reports: the reason the menubar
 * itself initiated the close with, else the panel's own (an outside pointer
 * down, an Escape the overlay stack handled…).
 */
export function menubarClosedReason(
  pending: OgeMenubarCloseReason | null,
  panelReason: OgePopupCloseReason,
): OgeMenubarCloseReason {
  if (pending !== null) return pending;
  return panelReason === 'outside' ||
    panelReason === 'escape' ||
    panelReason === 'select' ||
    panelReason === 'tab'
    ? panelReason
    : 'api';
}

/** DOM id of the bar entry at `index`, given the component's id prefix. */
export function menubarItemDomId(idPrefix: string, index: number): string {
  return `${idPrefix}-item-${index}`;
}

// The collapse decision itself is pure arithmetic and already lives in
// `@oge-ui/core`; re-exported so a render layer imports one package.
export {
  resolveMenubarCompact,
  type OgeMenubarCompactRequest,
  type OgeMenubarCompactResult,
} from '@oge-ui/core';

/** Convenience wrapper: `true` when the bar should render as a hamburger. */
export function isMenubarCompact(
  containerSize: number,
  compactBelow: number | undefined,
): boolean {
  return resolveMenubarCompact({ containerSize, compactBelow }).compact;
}
