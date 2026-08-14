// The roving-tabindex arithmetic lives in `@oge-ui/core` (`nav-index`);
// re-exported here so the React render layer reaches it through its one
// behavior dependency.
export { edgeEnabledIndex, stepEnabledIndex } from '@oge-ui/core';

/**
 * The framework-free half of the tabs family (ADR 0001): the vocabulary, the
 * message catalog, the normalized tab descriptor with its display-order
 * arithmetic, and the decision functions behind the selection / close /
 * reorder pipelines. Both render layers feed these the same inputs and get
 * the same answers — the pipelines cannot drift.
 */

/** How keyboard focus interacts with selection (WAI-ARIA APG tabs pattern). */
export type OgeTabsActivation = 'automatic' | 'manual';

/** Layout direction of a stand-alone tab strip. */
export type OgeTabsOrientation = 'horizontal' | 'vertical';

/** Side of the panel the tab strip is rendered on (logical, RTL-safe). */
export type OgeTabsPosition = 'top' | 'bottom' | 'start' | 'end';

/** Visual variant of the strip: underline ink (`primary`) or soft pills. */
export type OgeTabsStylingMode = 'primary' | 'secondary';

/** Density of the tab strip. */
export type OgeTabsSize = 'sm' | 'md' | 'lg';

/** When the overflow nav arrows are shown. `auto` = only while overflowing. */
export type OgeTabsNavButtonsMode = 'auto' | 'always' | 'never';

/**
 * How tabs are distributed along the strip while they fit.
 * `justify` spreads them to the edges; `stretch` gives every tab equal size.
 */
export type OgeTabsAlignment =
  'start' | 'center' | 'end' | 'justify' | 'stretch';

/** Whether the selected-tab indicator spans the whole tab or just its label. */
export type OgeTabsIndicatorFit = 'tab' | 'content';

/**
 * Transition played by the newly displayed panel. `slide` enters from the
 * direction of travel (mirrored under RTL). Both honour
 * `prefers-reduced-motion` and the `--oge-tab-panel-transition` duration.
 */
export type OgeTabPanelAnimation = 'none' | 'fade' | 'slide';

/**
 * Per-tab veto hook run before a close commits; may be async. Returning (or
 * resolving) `false` keeps the tab open; a rejection counts as a veto.
 */
export type OgeTabCloseGuard = () => boolean | Promise<boolean>;

/** One data-driven tab of the `items` input. */
export interface OgeTabItem {
  /** Stable identity used by `selectedKey`, reorder tracking and DOM ids. */
  key?: string;
  /** Tab label text. */
  text?: string;
  /** Badge rendered after the label. */
  badge?: string | number;
  /** Tooltip — rendered as the native `title` attribute. */
  hint?: string;
  /** Disabled tabs are skipped by keyboard navigation and selection. */
  disabled?: boolean;
  /** `false` removes the tab (and its panel) entirely. Default `true`. */
  visible?: boolean;
  /** Shows a close button; overrides the component-level `closable`. */
  closable?: boolean;
  /** Renders the unsaved-changes dot and announces it to screen readers. */
  dirty?: boolean;
  /** Veto hook for closing this tab — see {@link OgeTabCloseGuard}. */
  closeGuard?: OgeTabCloseGuard;
}

/** Cancelable pre-event of a user-gesture selection change. */
export interface OgeTabSelectionChangingEvent {
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly fromKey?: string;
  readonly toKey?: string;
  /** The target tab's `items` entry (data-driven tabs only). */
  readonly item?: OgeTabItem;
  /** Originating DOM event (absent for programmatic selection). */
  readonly event?: Event;
  /** Set `true` to keep the current tab selected. */
  cancel: boolean;
}

/** Emitted after the selection committed. */
export interface OgeTabSelectionChangedEvent {
  readonly index: number;
  readonly key?: string;
  readonly previousIndex: number;
  readonly previousKey?: string;
  /** The selected tab's `items` entry (data-driven tabs only). */
  readonly item?: OgeTabItem;
  /** Originating DOM event (absent for programmatic changes). */
  readonly event?: Event;
}

/** Emitted when a tab header is activated by pointer or keyboard. */
export interface OgeTabClickEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeTabItem;
  readonly event: MouseEvent | KeyboardEvent;
}

/** Cancelable pre-event of a tab close (before the async `closeGuard` runs). */
export interface OgeTabClosingEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeTabItem;
  /** Originating DOM event (absent for a programmatic close). */
  readonly event?: Event;
  /** Set `true` to veto the close synchronously. */
  cancel: boolean;
}

/**
 * Emitted after `tabClosing` and the tab's `closeGuard` both allowed the
 * close. The component does not remove tabs itself — remove the `items`
 * entry (or the declarative child) in this handler.
 */
export interface OgeTabClosedEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeTabItem;
}

/** Cancelable pre-event of a drag reorder drop. */
export interface OgeTabReorderingEvent {
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly key?: string;
  /** Set `true` to snap the tab back without reordering. */
  cancel: boolean;
}

/** Emitted after a drag reorder committed to the display order. */
export interface OgeTabReorderedEvent {
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly key?: string;
}

// --- config ----------------------------------------------------------------

/**
 * Every user-facing string in the tabs family — override globally through the
 * layer's config provider or per component via `messages`.
 */
export interface OgeTabsMessages {
  /** Aria label of a tab's close button. */
  closeTab: string;
  /** Aria label of the backward overflow arrow. */
  scrollBackward: string;
  /** Aria label of the forward overflow arrow. */
  scrollForward: string;
  /** Aria label of the all-tabs overflow menu button. */
  tabListMenu: string;
  /** Announced after a dirty tab's label (unsaved-changes indicator). */
  dirty: string;
  /** Shown in place of the strip when there are no visible tabs. */
  noData: string;
}

export const OGE_DEFAULT_TABS_MESSAGES: OgeTabsMessages = {
  closeTab: 'Close tab',
  scrollBackward: 'Scroll tabs backward',
  scrollForward: 'Scroll tabs forward',
  tabListMenu: 'Show all tabs',
  dirty: 'has unsaved changes',
  noData: 'No tabs to display',
};

/** Application-wide defaults for the tabs family. */
export interface OgeTabsConfig {
  messages: OgeTabsMessages;
}

export const OGE_DEFAULT_TABS_CONFIG: OgeTabsConfig = {
  messages: OGE_DEFAULT_TABS_MESSAGES,
};

export type OgeTabsConfigInput = Partial<Omit<OgeTabsConfig, 'messages'>> & {
  messages?: Partial<OgeTabsMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeTabsConfig(
  input: OgeTabsConfigInput | undefined,
): OgeTabsConfig {
  return {
    ...OGE_DEFAULT_TABS_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_TABS_MESSAGES, ...input?.messages },
  };
}

// --- descriptors -----------------------------------------------------------

/**
 * The render-layer-agnostic half of a normalized tab. Each layer extends it
 * with its own content slot (`TemplateRef` in Angular, `ReactNode` in React).
 */
export interface OgeTabDescriptorCore {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly text: string;
  readonly hint?: string;
  readonly badge?: string | number;
  readonly disabled: boolean;
  readonly closable: boolean;
  readonly dirty: boolean;
  /** The source `items` entry — `undefined` for declarative tabs. */
  readonly item?: OgeTabItem;
  readonly closeGuard?: OgeTabCloseGuard;
}

/**
 * Applies a saved display order (drag reorder) to the source list. Ids
 * missing from `order` (newly added tabs) keep their source position at the
 * end of the ordered block; ids in `order` that no longer exist are ignored.
 */
export function applyTabOrder<T extends { readonly id: string }>(
  source: readonly T[],
  order: readonly string[],
): readonly T[] {
  if (order.length === 0) return source;
  const position = new Map<string, number>();
  order.forEach((id, index) => position.set(id, index));
  return [...source].sort((a, b) => {
    const pa = position.get(a.id) ?? order.length + source.indexOf(a);
    const pb = position.get(b.id) ?? order.length + source.indexOf(b);
    return pa - pb;
  });
}

/** Normalizes one `items` entry into a descriptor core. */
export function tabItemDescriptor(
  item: OgeTabItem,
  index: number,
  defaultClosable: boolean,
): OgeTabDescriptorCore {
  return {
    id: item.key ?? `i${index}`,
    key: item.key,
    text: item.text ?? '',
    hint: item.hint,
    badge: item.badge,
    disabled: item.disabled ?? false,
    closable: item.closable ?? defaultClosable,
    dirty: item.dirty ?? false,
    item,
    closeGuard: item.closeGuard,
  };
}

/** Resolves an index-or-key target against the rendered descriptors. */
export function resolveTabIndex(
  descriptors: readonly OgeTabDescriptorCore[],
  target: number | string,
): number {
  if (typeof target === 'number') {
    return target >= 0 && target < descriptors.length ? target : -1;
  }
  return descriptors.findIndex((d) => d.key === target);
}

/** The id order after moving `from` to `to` — the reorder commit. */
export function reorderTabIds(
  descriptors: readonly OgeTabDescriptorCore[],
  from: number,
  to: number,
): readonly string[] {
  const ids = descriptors.map((d) => d.id);
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved);
  return ids;
}

/**
 * Whether a user gesture may move the selection to `index` — the guard both
 * layers run before emitting the cancelable `selectionChanging` event.
 */
export function canSelectTab(
  descriptors: readonly OgeTabDescriptorCore[],
  index: number,
  current: number,
  disabled: boolean,
): boolean {
  if (disabled || index === current) return false;
  const target = descriptors[index];
  return !!target && !target.disabled;
}

/** Pixels of movement before a pointerdown becomes a tab drag. */
export const OGE_TAB_DRAG_THRESHOLD = 4;
