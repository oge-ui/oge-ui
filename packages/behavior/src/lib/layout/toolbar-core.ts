import {
  fitToolbarItems,
  type OgeToolbarFitResult,
  type OgeToolbarOverflowPolicy,
} from '@oge-ui/core';
import type { OgeMenuItem } from '../menu/menu-types';
import type { OgePopupCloseReason } from '../overlay/anchored-panel-core';

// The fitting arithmetic itself lives in `@oge-ui/core` (`toolbar-fit`);
// re-exported here so the React render layer reaches it through its one
// behavior dependency instead of taking a second one.
export {
  fitToolbarItems,
  type OgeToolbarFitItem,
  type OgeToolbarFitOptions,
  type OgeToolbarFitResult,
  type OgeToolbarOverflowPolicy,
} from '@oge-ui/core';

/**
 * The framework-free half of the toolbar (ADR 0001): the vocabulary, the event
 * payloads, the message catalog, the normalized item descriptor and every
 * decision the two render layers must agree on — which items collapse, what a
 * menu row looks like, when a label or icon is drawn. Both layers feed these
 * the same inputs and get the same answers, so the toolbar cannot drift.
 */

// --- vocabulary ------------------------------------------------------------

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
 * Why the overflow menu is closing — the overlay substrate's canonical reason
 * set, so a toolbar close reads the same as every other anchored surface.
 */
export type OgeToolbarMenuCloseReason = OgePopupCloseReason;

/**
 * One data-driven toolbar entry. The curated `type` set is what the toolbar
 * renders natively; anything richer (an editor, a button group, a chart
 * legend) arrives through the layer's item template / render prop or one of
 * the three location slots — there is deliberately no `widget` + `options`
 * bag.
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
   * every reference toolbar. Only meaningful for `locateInMenu: 'auto'`.
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

// --- event payloads --------------------------------------------------------

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

/** Context handed to an item template / render prop in either layer. */
export interface OgeToolbarItemTemplateContextCore {
  index: number;
  /** `true` when the item is being stamped inside the overflow menu. */
  inMenu: boolean;
}

// --- config ----------------------------------------------------------------

/**
 * Every user-facing string in the toolbar — override globally through the
 * layer's config provider or per component via `messages`.
 */
export interface OgeToolbarMessages {
  /** Accessible name and tooltip of the overflow button. */
  overflowMenu: string;
  /**
   * Accessible name of the toolbar itself, used when neither `ariaLabel` nor
   * `ariaLabelledBy` is set.
   */
  toolbar: string;
  /** Accessible name of the `overflow: 'extended'` second-row toggle. */
  moreCommands: string;
  /** Accessible name of the back scroll button in `overflow: 'scroll'`. */
  scrollBackward: string;
  /** Accessible name of the forward scroll button in `overflow: 'scroll'`. */
  scrollForward: string;
  /** Shown in place of the items when there are none to display. */
  noData: string;
}

export const OGE_DEFAULT_TOOLBAR_MESSAGES: OgeToolbarMessages = {
  overflowMenu: 'More commands',
  toolbar: 'Toolbar',
  moreCommands: 'Show more commands',
  scrollBackward: 'Scroll backward',
  scrollForward: 'Scroll forward',
  noData: 'No commands to display',
};

/** Application-wide defaults for the toolbar. */
export interface OgeToolbarConfig {
  messages: OgeToolbarMessages;
  /** Default for the `size` input. */
  size?: OgeToolbarSize;
  /** Default for the `stylingMode` input. */
  stylingMode?: OgeToolbarStylingMode;
}

export const OGE_DEFAULT_TOOLBAR_CONFIG: OgeToolbarConfig = {
  messages: OGE_DEFAULT_TOOLBAR_MESSAGES,
};

export type OgeToolbarConfigInput = Partial<
  Omit<OgeToolbarConfig, 'messages'>
> & {
  messages?: Partial<OgeToolbarMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeToolbarConfig(
  input: OgeToolbarConfigInput | undefined,
): OgeToolbarConfig {
  return {
    ...OGE_DEFAULT_TOOLBAR_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_TOOLBAR_MESSAGES, ...input?.messages },
  };
}

// --- descriptors -----------------------------------------------------------

/**
 * The render-layer-agnostic half of a normalized toolbar entry. Each layer
 * extends it with its own content slot (`TemplateRef` in Angular, a render
 * prop in React).
 */
export interface OgeToolbarDescriptorCore {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly type: OgeToolbarItemType;
  readonly text?: string;
  readonly icon?: string;
  readonly suffixIcon?: string;
  readonly iconClass?: string;
  readonly suffixIconClass?: string;
  readonly hint?: string;
  readonly width?: number | string;
  readonly htmlAttributes?: Readonly<Record<string, string>>;
  readonly location: OgeToolbarItemLocation;
  readonly locateInMenu: OgeToolbarLocateInMenu;
  readonly overflowPriority?: number;
  readonly showText?: OgeToolbarDisplayMode;
  readonly showIcon?: OgeToolbarDisplayMode;
  readonly disabled: boolean;
  readonly cssClass?: string;
  readonly severity: OgeToolbarItemSeverity;
  readonly active?: boolean;
  /** Index in the merged, visible list — the value reported by `itemClick`. */
  readonly index: number;
  /** The source `items` entry — `undefined` for declarative children. */
  readonly item?: OgeToolbarItemData;
}

/**
 * Per-id patch written by the imperative `hideItem()` / `enableItem()` calls.
 * `items` stays the source of truth — this layer sits on top of it, so a
 * re-supplied array does not silently undo an imperative call.
 */
export interface OgeToolbarItemOverride {
  visible?: boolean;
  disabled?: boolean;
}

/** The override map after `patch` is merged into `key`'s entry. */
export function applyToolbarOverride(
  overrides: ReadonlyMap<string, OgeToolbarItemOverride>,
  key: string,
  patch: OgeToolbarItemOverride,
): ReadonlyMap<string, OgeToolbarItemOverride> {
  const next = new Map(overrides);
  next.set(key, { ...next.get(key), ...patch });
  return next;
}

/** Auto id of the `items` entry at `index` when it carries no `key`. */
export function toolbarItemId(item: OgeToolbarItemData, index: number): string {
  return item.key ?? `i${index}`;
}

/**
 * Normalizes the data-driven `items` entries into descriptor cores, dropping
 * the ones hidden by `visible: false` or by a `hideItem()` override. The
 * `index` field is provisional — {@link withToolbarIndexes} assigns the final
 * one once the declarative entries have been merged in front.
 */
export function toolbarDataDescriptors(
  items: readonly OgeToolbarItemData[],
  overrides: ReadonlyMap<string, OgeToolbarItemOverride> = new Map(),
): readonly OgeToolbarDescriptorCore[] {
  return items
    .map((item, index) => ({ item, id: toolbarItemId(item, index) }))
    .filter(
      ({ item, id }) => (overrides.get(id)?.visible ?? item.visible) !== false,
    )
    .map(({ item, id }, index) => ({
      id,
      key: item.key,
      type: item.type ?? 'button',
      text: item.text,
      icon: item.icon,
      suffixIcon: item.suffixIcon,
      iconClass: item.iconClass,
      suffixIconClass: item.suffixIconClass,
      hint: item.hint,
      width: item.width,
      htmlAttributes: item.htmlAttributes,
      location: item.location ?? 'before',
      locateInMenu: item.locateInMenu ?? 'auto',
      overflowPriority: item.overflowPriority,
      showText: item.showText,
      showIcon: item.showIcon,
      disabled: overrides.get(id)?.disabled ?? item.disabled ?? false,
      cssClass: item.cssClass,
      severity: item.severity ?? 'default',
      active: item.active,
      index,
      item,
    }));
}

/** Stamps the final `index` onto the merged list — the value events report. */
export function withToolbarIndexes<T>(
  descriptors: readonly T[],
): (T & { readonly index: number })[] {
  return descriptors.map((d, index) => ({ ...d, index }));
}

/**
 * The descriptors in visual order (before, then center, then after) — the
 * order the fitting math reasons about, which is not the DOM order of the
 * three sections' contents.
 */
export function orderToolbarDescriptors<
  T extends { readonly location: OgeToolbarItemLocation },
>(descriptors: readonly T[]): readonly T[] {
  return [
    ...descriptors.filter((d) => d.location === 'before'),
    ...descriptors.filter((d) => d.location === 'center'),
    ...descriptors.filter((d) => d.location === 'after'),
  ];
}

/** Only these two overflow modes take entries off the bar. */
export function toolbarCollapses(overflow: OgeToolbarOverflow): boolean {
  return overflow === 'menu' || overflow === 'extended';
}

/** Measurements {@link fitToolbarDescriptors} decides from. */
export interface OgeToolbarFitRequest {
  /** Descriptors in visual order — see {@link orderToolbarDescriptors}. */
  readonly ordered: readonly Pick<
    OgeToolbarDescriptorCore,
    'id' | 'locateInMenu' | 'overflowPriority'
  >[];
  readonly overflow: OgeToolbarOverflow;
  /** Measured main-axis size per descriptor id; a missing id counts as free. */
  readonly sizes: ReadonlyMap<string, number>;
  readonly containerSize: number;
  readonly menuButtonSize: number;
  readonly gap: number;
}

/**
 * Which entries stay on the bar and which collapse. The non-collapsing
 * overflow modes short-circuit to "everything inline" — the fitting math is
 * only consulted for `'menu'` and `'extended'`. An unmeasured item is treated
 * as free, so it renders inline once and is measured on the next frame
 * instead of being guessed at.
 */
export function fitToolbarDescriptors(
  request: OgeToolbarFitRequest,
): OgeToolbarFitResult {
  const { ordered, overflow, sizes, containerSize, menuButtonSize, gap } =
    request;
  if (!toolbarCollapses(overflow)) {
    return {
      inline: ordered.map((_, index) => index),
      inMenu: [],
      menuVisible: false,
    };
  }
  return fitToolbarItems({
    containerSize,
    items: ordered.map((d) => ({
      size: sizes.get(d.id) ?? 0,
      policy: d.locateInMenu,
      priority: d.overflowPriority,
    })),
    menuButtonSize,
    gap,
  });
}

// --- display decisions -----------------------------------------------------

type DisplayInput = Pick<OgeToolbarDescriptorCore, 'showText' | 'showIcon'> & {
  readonly text?: string;
};

/**
 * Whether an item's label is drawn. On the bar `'always'` and `'onBar'` show
 * it (and only when there is one); in the menu `'always'` and `'inMenu'` do.
 */
export function toolbarTextVisible(
  descriptor: DisplayInput,
  fallback: OgeToolbarDisplayMode,
  inMenu = false,
): boolean {
  const mode = descriptor.showText ?? fallback;
  if (inMenu) return mode === 'always' || mode === 'inMenu';
  return (
    (mode === 'always' || mode === 'onBar') && descriptor.text !== undefined
  );
}

/**
 * The icon twin of {@link toolbarTextVisible}. Without the `inMenu` arm a
 * command lost its icon the moment it collapsed into the menu.
 */
export function toolbarIconVisible(
  descriptor: DisplayInput,
  fallback: OgeToolbarDisplayMode,
  inMenu = false,
): boolean {
  const mode = descriptor.showIcon ?? fallback;
  return inMenu
    ? mode === 'always' || mode === 'inMenu'
    : mode === 'always' || mode === 'onBar';
}

/** `width` as a CSS length: a bare number is pixels. */
export function toolbarItemWidth(
  width: number | string | undefined,
): string | null {
  if (width === undefined) return null;
  return typeof width === 'number' ? `${width}px` : width;
}

/** Defaults the two display modes fall back to when an item sets neither. */
export interface OgeToolbarDisplayDefaults {
  readonly showText: OgeToolbarDisplayMode;
  readonly showIcon: OgeToolbarDisplayMode;
  /** `true` when the whole toolbar is disabled. */
  readonly disabled: boolean;
}

/**
 * The overflow menu's rows: the collapsed descriptors rendered in the shared
 * menu vocabulary, carrying the item's index as the row value.
 */
export function toolbarMenuItems(
  menuDescriptors: readonly OgeToolbarDescriptorCore[],
  defaults: OgeToolbarDisplayDefaults,
): OgeMenuItem<number>[] {
  return menuDescriptors.map((d) => ({
    text: toolbarTextVisible(d, defaults.showText, true) ? (d.text ?? '') : '',
    value: d.index,
    icon: toolbarIconVisible(d, defaults.showIcon, true) ? d.icon : undefined,
    iconClass: toolbarIconVisible(d, defaults.showIcon, true)
      ? d.iconClass
      : undefined,
    hint: d.hint,
    disabled: d.disabled || defaults.disabled,
    separator: d.type === 'separator' || d.type === 'spacer',
    severity: d.severity === 'danger' ? ('danger' as const) : undefined,
    checked: d.active,
  }));
}

/** The `overflowChanged` payload for the current menu contents. */
export function toolbarOverflowEvent(
  menuDescriptors: readonly Pick<OgeToolbarDescriptorCore, 'id'>[],
): OgeToolbarOverflowChangedEvent {
  const keys = menuDescriptors.map((d) => d.id);
  return { keys, count: keys.length };
}

// --- DOM helpers (framework-free) -----------------------------------------

/** Elements the roving tabindex may land on. */
export const OGE_TOOLBAR_STOP_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]';

/**
 * Text-entry controls keep their own arrow / Home / End behavior — the APG
 * warns against stealing them, and a search box on a toolbar is common.
 */
export function isToolbarTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return !['button', 'checkbox', 'radio', 'reset', 'submit'].includes(
    target.type,
  );
}

/** Whether a roving-tabindex stop is disabled (and so must be skipped). */
export function isToolbarStopDisabled(el: HTMLElement | undefined): boolean {
  if (!el) return true;
  if (el.getAttribute('aria-disabled') === 'true') return true;
  return (
    (el as HTMLButtonElement).disabled === true || el.hasAttribute('disabled')
  );
}

/** Style metrics the fitting math needs, read once per measure pass. */
export interface OgeToolbarStyleMetrics {
  readonly rtl: boolean;
  /** Host padding on the main axis. */
  readonly padding: number;
  /** Gap between two adjacent entries, or `null` when it is not a number. */
  readonly gap: number | null;
}

/**
 * Parses the one `getComputedStyle` read the toolbar makes. Direction,
 * padding and gap all come from custom properties that change with the
 * density presets and the writing mode — never with the container's width —
 * so this is deliberately kept off the resize path.
 */
export function readToolbarStyleMetrics(
  style: CSSStyleDeclaration,
  vertical: boolean,
): OgeToolbarStyleMetrics {
  const padding = vertical
    ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    : parseFloat(style.paddingInlineStart || style.paddingLeft) +
      parseFloat(style.paddingInlineEnd || style.paddingRight);
  const gap = parseFloat(vertical ? style.rowGap : style.columnGap);
  return {
    rtl: style.direction === 'rtl',
    padding: Number.isFinite(padding) ? padding : 0,
    gap: Number.isFinite(gap) ? gap : null,
  };
}

/** Which scroll buttons of `overflow: 'scroll'` are live. */
export interface OgeToolbarScrollState {
  readonly hasOverflow: boolean;
  readonly canScrollBack: boolean;
  readonly canScrollForward: boolean;
}

/** The scroll-position half of the measurement, from three plain numbers. */
export function toolbarScrollState(metrics: {
  readonly viewport: number;
  readonly total: number;
  readonly offset: number;
}): OgeToolbarScrollState {
  const { viewport, total, offset } = metrics;
  return {
    hasOverflow: total > viewport + 1,
    canScrollBack: offset > 1,
    canScrollForward: offset < total - viewport - 1,
  };
}

// --- remote command list ---------------------------------------------------

/**
 * The structural half of `@oge-ui/core`'s `DataSource` the toolbar needs — a
 * one-shot load plus an optional change stream. Declared structurally so the
 * React layer can accept a real `DataSource` without depending on core.
 */
export interface OgeToolbarDataSourceLike {
  load(options: object): Promise<{ readonly data: readonly unknown[] }>;
  readonly changes?: {
    subscribe(listener: () => void): { unsubscribe(): void };
  };
}

/**
 * Loads a remote command list and keeps it in sync. `load({})` is enough — a
 * toolbar has no paging, sorting or filtering to push down — and a source that
 * publishes `changes` re-loads. Returns the teardown: it stops applying a
 * late-arriving load and drops the subscription.
 */
export function loadToolbarItems(
  source: OgeToolbarDataSourceLike,
  apply: (items: readonly OgeToolbarItemData[]) => void,
): () => void {
  let stale = false;
  const reload = (): void => {
    void source.load({}).then((result) => {
      // a toolbar never groups, so the flat arm of the load result is the only
      // one that can come back here
      if (!stale) apply(result.data as readonly OgeToolbarItemData[]);
    });
  };
  reload();
  const subscription = source.changes?.subscribe(() => reload());
  return () => {
    stale = true;
    subscription?.unsubscribe();
  };
}
