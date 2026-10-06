import {
  edgeEnabledIndex,
  stepEnabledIndex,
  type OgeDrawerLayoutMode,
} from '@oge-ui/core';

/**
 * The framework-free half of the drawer (ADR 0001): its vocabulary, the event
 * payloads, the message catalog and the config merge rule. The mode
 * resolution itself (`compactBelow` downgrades, modality derivation) already
 * lives in `@oge-ui/core`'s `drawer-mode` and is shared through it.
 */

/**
 * How the drawer sits next to its content: `'overlay'` floats over it,
 * `'push'` shifts it aside without resizing it, `'side'` shrinks it so both
 * share the row.
 *
 * Modality is **derived from this**, never configured separately: `'overlay'`
 * and `'push'` displace or cover the content and are therefore modal, while
 * `'side'` is part of the layout and is therefore a persistent landmark. An
 * independent `modal` flag is exactly what lets a drawer claim
 * `role="complementary"` and `aria-modal="true"` at the same time.
 */
export type OgeDrawerMode = OgeDrawerLayoutMode;

// The mode decision itself is core arithmetic; re-exported here so a render
// layer needs only this package to build a drawer.
export {
  resolveDrawerMode,
  type OgeDrawerModeRequest,
  type OgeDrawerModeResult,
} from '@oge-ui/core';

/**
 * Edge the drawer is attached to. Logical, so `'start'` and `'end'` mirror in
 * RTL on their own — there is no `rtlEnabled` flag anywhere in this suite.
 */
export type OgeDrawerPosition = 'start' | 'end' | 'top' | 'bottom';

/**
 * Landmark role of a **persistent** (`mode: 'side'`) drawer. `'navigation'`
 * for a group of navigation links, `'complementary'` for supporting content
 * that still makes sense on its own, `'region'` as the labelled fallback.
 * Ignored while the drawer is modal, which is always `role="dialog"`.
 */
export type OgeDrawerLandmark = 'navigation' | 'complementary' | 'region';

/** Where focus goes when a modal drawer opens. */
export type OgeDrawerAutoFocus =
  'first-tabbable' | 'panel' | 'none' | (string & {});

/** Why the drawer closed. `'swipe'`: a touch swipe toward the edge (`swipeEnabled`). */
export type OgeDrawerCloseReason =
  'api' | 'escape' | 'backdrop' | 'outside' | 'compact' | 'swipe';

/** Cancelable pre-event for the drawer opening. */
export interface OgeDrawerOpeningEvent {
  cancel: boolean;
}

/** Cancelable pre-event for the drawer closing. */
export interface OgeDrawerClosingEvent {
  cancel: boolean;
  reason: OgeDrawerCloseReason;
}

/** The drawer finished closing. */
export interface OgeDrawerClosedEvent {
  reason: OgeDrawerCloseReason;
}

/** The resolved layout mode changed, usually because the container resized. */
export interface OgeDrawerModeChangedEvent {
  /** The mode actually rendering now. */
  mode: OgeDrawerMode;
  /** The mode the application asked for. */
  requestedMode: OgeDrawerMode;
  /** `true` when `compactBelow` forced the downgrade to `'overlay'`. */
  compact: boolean;
}

// --- built-in navigation items ---------------------------------------------

/**
 * One entry of the drawer's built-in navigation list (`items`). An entry
 * with `separator: true` renders a divider and nothing else.
 */
export interface OgeDrawerItem {
  /** Stable identity — what `selectedKey` holds. Defaults to `text`. */
  key?: string;
  /** Label; also the accessible name and tooltip in the mini rail. */
  text?: string;
  /** SVG path data (`d`) of a 24×24 stroke icon — shown in the rail too. */
  icon?: string;
  /** Renders the entry as a link (`<a href>`) instead of a button. */
  url?: string;
  /** `target` of the link (`url` only). */
  target?: string;
  /** Skipped by the keyboard and not selectable. */
  disabled?: boolean;
  /** Renders a divider instead of an entry. */
  separator?: boolean;
  /** Short count or status shown after the label (e.g. unread mail). */
  badge?: string | number;
}

/** One rendered entry of the item list. */
export interface OgeDrawerItemView {
  readonly item: OgeDrawerItem;
  readonly key: string;
  readonly index: number;
  readonly separator: boolean;
  readonly disabled: boolean;
  /** The entry matching `selectedKey` — `aria-current="page"`. */
  readonly active: boolean;
  readonly text: string;
}

/** Emitted when an entry of the item list is activated. */
export interface OgeDrawerItemClickEvent {
  readonly item: OgeDrawerItem;
  readonly key: string;
  readonly index: number;
  readonly event: Event;
}

/** Emitted after `selectedKey` changed through the item list. */
export interface OgeDrawerSelectionChangedEvent {
  readonly key: string;
  readonly previousKey: string | undefined;
  readonly item: OgeDrawerItem;
  readonly event?: Event;
}

/** The key an entry is selected by: `key`, else `text`, else its index. */
export function ogeDrawerItemKey(item: OgeDrawerItem, index: number): string {
  return item.key ?? item.text ?? `#${index}`;
}

/** The rendered list, with the active entry resolved from `selectedKey`. */
export function buildOgeDrawerItems(
  items: readonly OgeDrawerItem[] | undefined,
  selectedKey: string | undefined,
): readonly OgeDrawerItemView[] {
  return (items ?? []).map((item, index) => {
    const key = ogeDrawerItemKey(item, index);
    const separator = item.separator === true;
    return {
      item,
      key,
      index,
      separator,
      disabled: separator || item.disabled === true,
      active: !separator && selectedKey !== undefined && key === selectedKey,
      text: item.text ?? '',
    };
  });
}

/**
 * The entry focus moves to for an arrow / Home / End key, or `null` when the
 * key does not navigate. Entries stay individually Tab-reachable (a list of
 * links, not a composite widget); the arrows are a convenience on top, so
 * they wrap and skip separators and disabled entries.
 */
export function ogeDrawerItemNavIndex(
  views: readonly OgeDrawerItemView[],
  current: number,
  key: string,
): number | null {
  const skip = (index: number): boolean => views[index]?.disabled ?? true;
  switch (key) {
    case 'ArrowDown':
      return stepEnabledIndex(views.length, current, 1, skip);
    case 'ArrowUp':
      return stepEnabledIndex(views.length, current, -1, skip);
    case 'Home':
      return edgeEnabledIndex(views.length, 1, skip);
    case 'End':
      return edgeEnabledIndex(views.length, -1, skip);
    default:
      return null;
  }
}

/**
 * The activation pipeline both layers run: a disabled or separator entry
 * does nothing; otherwise `itemClick`, then — when the key differs — the
 * new selection is stored (`commit`) and `selectionChanged` fires. Returns
 * whether the selection changed.
 */
export function runOgeDrawerItemClick(input: {
  view: OgeDrawerItemView;
  selectedKey: string | undefined;
  event: Event;
  emitItemClick(event: OgeDrawerItemClickEvent): void;
  emitSelectionChanged(event: OgeDrawerSelectionChangedEvent): void;
  /** Stores the new `selectedKey` (before `selectionChanged` fires). */
  commit(key: string): void;
}): boolean {
  const { view } = input;
  if (view.disabled) return false;
  input.emitItemClick({
    item: view.item,
    key: view.key,
    index: view.index,
    event: input.event,
  });
  if (view.key === input.selectedKey) return false;
  input.commit(view.key);
  input.emitSelectionChanged({
    key: view.key,
    previousKey: input.selectedKey,
    item: view.item,
    event: input.event,
  });
  return true;
}

// --- config ----------------------------------------------------------------

/** Every user-facing string the drawer renders, including aria labels. */
export interface OgeDrawerMessages {
  /** Accessible name of the panel when the application supplies none. */
  drawer: string;
  /** Label and tooltip of the built-in close button. */
  close: string;
}

export const OGE_DEFAULT_DRAWER_MESSAGES: OgeDrawerMessages = {
  drawer: 'Drawer',
  close: 'Close drawer',
};

export interface OgeDrawerConfig {
  messages: OgeDrawerMessages;
  /** Default for the `mode` input. */
  mode?: OgeDrawerMode;
  /** Default for the `position` input. */
  position?: OgeDrawerPosition;
  /** Default for the `size` input. */
  size?: number | string;
}

export const OGE_DEFAULT_DRAWER_CONFIG: OgeDrawerConfig = {
  messages: OGE_DEFAULT_DRAWER_MESSAGES,
};

export type OgeDrawerConfigInput = Partial<
  Omit<OgeDrawerConfig, 'messages'>
> & {
  messages?: Partial<OgeDrawerMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeDrawerConfig(
  input: OgeDrawerConfigInput | undefined,
): OgeDrawerConfig {
  return {
    ...OGE_DEFAULT_DRAWER_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_DRAWER_MESSAGES, ...input?.messages },
  };
}
