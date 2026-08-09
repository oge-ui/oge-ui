import type { OgeToolbarOverflowPolicy } from '@oge-ui/core';
import type { OgePopupCloseReason } from '@oge-ui/overlay';

/** Which of the toolbar's three groups an item belongs to. */
export type OgeToolbarItemLocation = 'before' | 'center' | 'after';

/**
 * Whether an item may move into the overflow menu. `'auto'` yields as soon as
 * the item stops fitting, `'always'` keeps it in the menu whatever the width,
 * `'never'` pins it to the toolbar. Structurally identical to core's
 * `OgeToolbarOverflowPolicy`, which the fitting math consumes.
 */
export type OgeToolbarLocateInMenu = OgeToolbarOverflowPolicy;

/**
 * Where a piece of an item's chrome (its text, its icon) is rendered:
 * `'always'` in both places, `'onBar'` only on the toolbar, `'inMenu'` only in
 * the overflow menu, `'never'` in neither.
 */
export type OgeToolbarDisplayMode = 'always' | 'onBar' | 'inMenu' | 'never';

/** What the toolbar renders for an item it owns. */
export type OgeToolbarItemType = 'button' | 'separator' | 'spacer' | 'label';

/**
 * How the toolbar reacts to more items than room: `'menu'` collapses them into
 * an overflow menu, `'scroll'` keeps one line and adds scroll buttons,
 * `'wrap'` flows onto more lines, `'extended'` hides the remainder in a second
 * row behind a toggle, `'none'` lets the row overflow.
 */
export type OgeToolbarOverflow =
  'menu' | 'scroll' | 'wrap' | 'extended' | 'none';

/** Main axis of the toolbar — drives the arrow keys and `aria-orientation`. */
export type OgeToolbarOrientation = 'horizontal' | 'vertical';

/** Density preset. */
export type OgeToolbarSize = 'sm' | 'md' | 'lg';

/** Container chrome preset. */
export type OgeToolbarStylingMode = 'outlined' | 'filled' | 'flat';

/** Emphasis of an item the toolbar renders itself. */
export type OgeToolbarItemSeverity = 'default' | 'accent' | 'danger';

/**
 * Why the overflow menu is closing — the overlay package's canonical reason
 * set, so a toolbar close reads the same as every other anchored surface.
 */
export type OgeToolbarMenuCloseReason = OgePopupCloseReason;

/**
 * One data-driven toolbar entry. The curated `type` set is what the toolbar
 * renders natively; anything richer (an editor, a button group, a chart
 * legend) arrives through `[ogeToolbarItemTemplate]` or one of the
 * `[ogeToolbarBefore]` / `[ogeToolbarCenter]` / `[ogeToolbarAfter]` slots —
 * there is deliberately no `widget` + `options` bag.
 */
export interface OgeToolbarItemData {
  /** Stable identity used by DOM ids and echoed on `itemClick`. */
  key?: string;
  /** Defaults to `'button'`. */
  type?: OgeToolbarItemType;
  /** Label; also the accessible name when the item renders icon-only. */
  text?: string;
  /** SVG path data (`d`) for a leading aria-hidden 16×16 icon. */
  icon?: string;
  /** SVG path data (`d`) for a trailing icon, rendered after the text. */
  suffixIcon?: string;
  /**
   * Class(es) for a leading icon rendered as an empty `<i>` — the hook for an
   * icon font the application already ships. `icon` (SVG path data) stays the
   * dependency-free default.
   */
  iconClass?: string;
  /** Class(es) for a trailing icon element. */
  suffixIconClass?: string;
  /** Tooltip — rendered as the native `title` attribute. */
  hint?: string;
  /** Fixed main-axis size of the item, e.g. `120` or `'8rem'`. */
  width?: number | string;
  /** Extra attributes on the item element (`data-*`, `title`, …). */
  htmlAttributes?: Readonly<Record<string, string>>;
  /** Defaults to `'before'`. */
  location?: OgeToolbarItemLocation;
  /** Defaults to `'auto'` — the toolbar collapses what does not fit. */
  locateInMenu?: OgeToolbarLocateInMenu;
  /**
   * How hard the item holds its place on the bar; higher survives longer.
   * Defaults to `0`, where items simply yield from the end of the row as in
   * every reference toolbar. Set it to keep a primary command (`Save`) on the
   * bar while a trailing secondary one (`Help`) collapses first, without
   * reordering the toolbar. Only meaningful for `locateInMenu: 'auto'`.
   */
  overflowPriority?: number;
  /** Overrides the toolbar's `showText` for this item. */
  showText?: OgeToolbarDisplayMode;
  /** Overrides the toolbar's `showIcon` for this item. */
  showIcon?: OgeToolbarDisplayMode;
  /** Disabled items are not clickable and are skipped by arrow navigation. */
  disabled?: boolean;
  /** `false` removes the item entirely. */
  visible?: boolean;
  /** Extra class on the item element. */
  cssClass?: string;
  /** Defaults to `'default'`. */
  severity?: OgeToolbarItemSeverity;
  /** Toggle-button state — renders `aria-pressed` and a checkmark in the menu. */
  active?: boolean;
  /** Arbitrary payload echoed back on `itemClick`. */
  data?: unknown;
}

/** A toolbar item was activated by pointer, keyboard or the overflow menu. */
export interface OgeToolbarItemClickEvent {
  /** Index in the merged, visible item list. */
  index: number;
  key?: string;
  /** The source `items` entry — `undefined` for declarative children. */
  item?: OgeToolbarItemData;
  /** `true` when the activation came from the overflow menu. */
  inMenu: boolean;
  event: Event;
}

/** An item was held (long press) or right-clicked. */
export interface OgeToolbarItemHoldEvent {
  index: number;
  key?: string;
  item?: OgeToolbarItemData;
  event: Event;
}

/** A toggle item's pressed state changed. */
export interface OgeToolbarItemActiveChangedEvent {
  index: number;
  key?: string;
  item?: OgeToolbarItemData;
  active: boolean;
  event: Event;
}

/** The set of items living in the overflow menu changed. */
export interface OgeToolbarOverflowChangedEvent {
  /** Ids (`key` when set) of the items now in the menu, in item order. */
  keys: readonly string[];
  count: number;
}

/** Cancelable pre-event for the overflow menu opening. */
export interface OgeToolbarMenuOpeningEvent {
  cancel: boolean;
  event?: Event;
}

/** Cancelable pre-event for the overflow menu closing. */
export interface OgeToolbarMenuClosingEvent {
  cancel: boolean;
  reason: OgeToolbarMenuCloseReason;
}

/** The overflow menu finished closing. */
export interface OgeToolbarMenuClosedEvent {
  reason: OgeToolbarMenuCloseReason;
}

/** Context of `[ogeToolbarItemTemplate]` and `[ogeToolbarMenuItemTemplate]`. */
export interface OgeToolbarItemTemplateContext {
  /** The source `items` entry — `undefined` for declarative children. */
  $implicit: OgeToolbarItemData | undefined;
  index: number;
  /** `true` when the item is being stamped inside the overflow menu. */
  inMenu: boolean;
}
