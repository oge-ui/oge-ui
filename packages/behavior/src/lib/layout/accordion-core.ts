/**
 * The framework-free half of the accordion (ADR 0001): the vocabulary, the
 * event payloads, the message catalog with its merge rule, the render-layer
 * agnostic descriptor and the decision functions behind the expand / collapse
 * / render / keyboard pipelines. Both render layers feed these the same inputs
 * and get the same answers — the pipelines cannot drift.
 */

import { matchByPrefix, type OgeAsyncGuard } from '@oge-ui/core';

// The veto runner, the type-ahead buffer and the prefix matcher live in
// `@oge-ui/core`; re-exported here so the React render layer reaches them
// through its one behavior dependency. (`edgeEnabledIndex` / `stepEnabledIndex`
// are re-exported by `tabs-core` for the same reason.)
export {
  createTypeAheadBuffer,
  matchByPrefix,
  runAsyncGuard,
  type OgeAsyncGuard,
  type OgeTypeAheadBuffer,
  type OgeGuardHandlers,
} from '@oge-ui/core';

// --- vocabulary ------------------------------------------------------------

/** Where the expand/collapse chevron sits inside the header button. */
export type OgeAccordionTogglePosition = 'start' | 'end';

/** Spacing between panels: `default` gutters them, `flat` joins them into one stack. */
export type OgeAccordionDisplayMode = 'default' | 'flat';

/** Visual variant of the panels. */
export type OgeAccordionStylingMode = 'outlined' | 'filled' | 'flat';

/** Density of the header rows. */
export type OgeAccordionSize = 'sm' | 'md' | 'lg';

/**
 * Veto for a pending expand or collapse. Returning (or resolving to) `false`
 * blocks it; throwing or rejecting is also a veto. While a promise is pending
 * the panel shows a spinner and ignores further toggles (single-flight).
 */
export type OgeAccordionExpandGuard = OgeAsyncGuard;

/** Loads a panel's content the first time it expands. */
export type OgeAccordionContentLoader = () => Promise<unknown>;

/** Data-driven counterpart of a declarative panel. */
export interface OgeAccordionItemData {
  /** Stable identity — required for `expandedKeys` and for state to survive reordering. */
  key?: string;
  /** Header title. */
  title?: string;
  /**
   * Plain-text panel body, rendered when no content template is supplied.
   * The reference `html` field has no counterpart — interpolate or use a
   * template instead of injecting markup.
   */
  text?: string;
  /** Secondary line under (or beside) the title. */
  description?: string;
  /** SVG path data (`d`) rendered as a 24×24 aria-hidden icon before the title. */
  icon?: string;
  /** Pill rendered after the title. */
  badge?: string | number;
  /** Native `title` tooltip of the header button. */
  hint?: string;
  /** Blocks expanding and takes the panel out of arrow navigation. */
  disabled?: boolean;
  /** `false` removes the panel entirely. */
  visible?: boolean;
  /** Expands the panel on first render. */
  expanded?: boolean;
  /** Flags the section as failing validation — see `expandInvalid()`. */
  invalid?: boolean;
  /** Overrides the accordion's `hideToggle` for this panel. */
  hideToggle?: boolean;
  /** Overrides the accordion's `togglePosition` for this panel. */
  togglePosition?: OgeAccordionTogglePosition;
  /** Per-panel veto run before every expand and collapse. */
  expandGuard?: OgeAccordionExpandGuard;
  /** Loads this panel's content on first expand, with a skeleton while pending. */
  contentLoader?: OgeAccordionContentLoader;
}

// --- event payloads --------------------------------------------------------

/** Cancelable pre-event of an expand. */
export interface OgeAccordionExpandingEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeAccordionItemData;
  readonly event?: Event;
  /** Set to `true` to block the expand. */
  cancel: boolean;
}

/** Cancelable pre-event of a collapse. */
export interface OgeAccordionCollapsingEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeAccordionItemData;
  readonly event?: Event;
  /** Set to `true` to block the collapse. */
  cancel: boolean;
}

/** Emitted once a panel expanded. */
export interface OgeAccordionExpandedEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeAccordionItemData;
  readonly event?: Event;
}

/** Emitted once a panel collapsed. */
export interface OgeAccordionCollapsedEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeAccordionItemData;
  readonly event?: Event;
}

/** Emitted when a header button is activated, before the expand pipeline runs. */
export interface OgeAccordionItemClickEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeAccordionItemData;
  readonly event: Event;
}

/** Emitted after a panel's `contentLoader` resolved. */
export interface OgeAccordionContentLoadedEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeAccordionItemData;
  /** Whatever the loader resolved with — also passed to the content template. */
  readonly data: unknown;
}

/** Emitted after a panel's `contentLoader` rejected. */
export interface OgeAccordionContentFailedEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeAccordionItemData;
  readonly error: unknown;
}

// --- config ----------------------------------------------------------------

/**
 * Every user-facing string in the accordion — override globally through the
 * layer's config provider or per component via `messages`.
 */
export interface OgeAccordionMessages {
  /** Announced after the title of a panel flagged `invalid`. */
  invalidSection: string;
  /** Announced while an `expandGuard` promise is in flight. */
  pending: string;
  /** Shown while a panel's `contentLoader` is running. */
  loadingContent: string;
  /** Shown when a panel's `contentLoader` rejected. */
  contentLoadFailed: string;
  /** Label of the retry button on a failed content load. */
  retry: string;
  /** Shown in place of the panels when there are no visible items. */
  noData: string;
}

export const OGE_DEFAULT_ACCORDION_MESSAGES: OgeAccordionMessages = {
  invalidSection: 'section has errors',
  pending: 'working',
  loadingContent: 'Loading…',
  contentLoadFailed: 'Could not load this section.',
  retry: 'Retry',
  noData: 'No sections to display',
};

/** Application-wide defaults for the accordion. */
export interface OgeAccordionConfig {
  messages: OgeAccordionMessages;
  /** Default for the `hideToggle` input. */
  hideToggle?: boolean;
  /** Default for the `collapsedHeaderHeight` input (any CSS length). */
  collapsedHeaderHeight?: string;
  /** Default for the `expandedHeaderHeight` input (any CSS length). */
  expandedHeaderHeight?: string;
}

export const OGE_DEFAULT_ACCORDION_CONFIG: OgeAccordionConfig = {
  messages: OGE_DEFAULT_ACCORDION_MESSAGES,
};

export type OgeAccordionConfigInput = Partial<
  Omit<OgeAccordionConfig, 'messages'>
> & {
  messages?: Partial<OgeAccordionMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeAccordionConfig(
  input: OgeAccordionConfigInput | undefined,
): OgeAccordionConfig {
  return {
    ...OGE_DEFAULT_ACCORDION_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_ACCORDION_MESSAGES, ...input?.messages },
  };
}

// --- descriptors -----------------------------------------------------------

/**
 * The render-layer-agnostic half of a normalized panel. Each layer extends it
 * with its own slots (`TemplateRef` in Angular, `ReactNode` / render props in
 * React).
 */
export interface OgeAccordionDescriptorCore {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly title: string;
  /** Plain-text body used when the panel has no content slot. */
  readonly text?: string;
  readonly description?: string;
  readonly icon?: string;
  readonly badge?: string | number;
  readonly hint?: string;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly hideToggle?: boolean;
  readonly togglePosition?: OgeAccordionTogglePosition;
  /** Initially expanded — only read for panels that have no two-way model. */
  readonly initiallyExpanded: boolean;
  /** The source `items` entry — `undefined` for declarative panels. */
  readonly item?: OgeAccordionItemData;
  readonly expandGuard?: OgeAccordionExpandGuard;
  readonly contentLoader?: OgeAccordionContentLoader;
}

/** Normalizes one `items` entry into a descriptor core. */
export function accordionItemDescriptor(
  item: OgeAccordionItemData,
  index: number,
): OgeAccordionDescriptorCore {
  return {
    id: item.key ?? `i${index}`,
    key: item.key,
    title: item.title ?? '',
    text: item.text,
    description: item.description,
    icon: item.icon,
    badge: item.badge,
    hint: item.hint,
    disabled: item.disabled ?? false,
    invalid: item.invalid ?? false,
    hideToggle: item.hideToggle,
    togglePosition: item.togglePosition,
    initiallyExpanded: item.expanded ?? false,
    item,
    expandGuard: item.expandGuard,
    contentLoader: item.contentLoader,
  };
}

/** Resolves an index-or-key target against the rendered descriptors. */
export function resolveAccordionIndex(
  descriptors: readonly OgeAccordionDescriptorCore[],
  target: number | string,
): number {
  if (typeof target === 'number') {
    return target >= 0 && target < descriptors.length ? target : -1;
  }
  return descriptors.findIndex((d) => d.key === target);
}

// --- state of one panel's content loader -----------------------------------

/** State of one panel's `contentLoader`. */
export interface OgeAccordionLoadState {
  readonly status: 'loading' | 'loaded' | 'failed';
  readonly data?: unknown;
  readonly error?: unknown;
}

// --- expansion rules -------------------------------------------------------

/**
 * The expanded-id set after expanding `id`: `multiple` adds to the current
 * set, single-expand mode replaces it.
 */
export function expandedIdsAfterExpand(
  current: ReadonlySet<string>,
  id: string,
  multiple: boolean,
): ReadonlySet<string> {
  const next = multiple ? new Set(current) : new Set<string>();
  next.add(id);
  return next;
}

/** The expanded-id set after collapsing `id`. */
export function expandedIdsAfterCollapse(
  current: ReadonlySet<string>,
  id: string,
): ReadonlySet<string> {
  const next = new Set(current);
  next.delete(id);
  return next;
}

/**
 * Whether collapsing `id` is allowed: always with `collapsible`, otherwise
 * only while another panel stays expanded.
 */
export function canCollapseAccordionPanel(
  expanded: ReadonlySet<string>,
  id: string,
  collapsible: boolean,
): boolean {
  if (collapsible) return true;
  return expanded.size > 1 && expanded.has(id);
}

/**
 * APG: an expanded panel the user is not allowed to collapse is
 * `aria-disabled`, not `disabled` — it must stay focusable. `null` means the
 * attribute is omitted.
 */
export function accordionAriaDisabled(options: {
  disabled: boolean;
  expanded: boolean;
  canCollapse: boolean;
}): true | null {
  if (options.disabled) return true;
  if (!options.expanded) return null;
  return options.canCollapse ? null : true;
}

/**
 * Whether a panel's content should be instantiated: everything is rendered
 * without `deferRendering`, an expanded panel always is, and a collapsed one
 * only while `keepAlive` holds a panel that already rendered once.
 */
export function shouldRenderAccordionPanel(options: {
  deferRendering: boolean;
  keepAlive: boolean;
  expanded: boolean;
  rendered: boolean;
}): boolean {
  if (!options.deferRendering) return true;
  if (options.expanded) return true;
  return options.keepAlive && options.rendered;
}

/** Whether two id sets hold the same ids. */
export function sameAccordionIds(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

/** Whether two key lists are equal position by position. */
export function sameAccordionKeys(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

// --- keyboard --------------------------------------------------------------

/** What a header keystroke asks the accordion to do with focus. */
export type OgeAccordionNavIntent = 'next' | 'previous' | 'first' | 'last';

/**
 * The focus intent of a header keystroke, or `null` when the key is not part
 * of the APG accordion navigation map. Modified keystrokes never navigate —
 * Ctrl+PageUp/PageDown are handled separately, on the container.
 */
export function accordionNavIntent(
  key: string,
  modifiers: { ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean } = {},
): OgeAccordionNavIntent | null {
  if (modifiers.ctrlKey || modifiers.altKey || modifiers.metaKey) return null;
  switch (key) {
    case 'ArrowDown':
      return 'next';
    case 'ArrowUp':
      return 'previous';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}

/**
 * Direction of the APG-optional Ctrl+PageDown / Ctrl+PageUp shortcuts, or
 * `null` for anything else. Handled on the container so the shortcuts also
 * work from inside panel content.
 */
export function accordionPageDirection(
  key: string,
  modifiers: { ctrlKey?: boolean } = {},
): 1 | -1 | null {
  if (!modifiers.ctrlKey) return null;
  if (key === 'PageDown') return 1;
  if (key === 'PageUp') return -1;
  return null;
}

/** Whether a keystroke is a printable character that feeds the type-ahead. */
export function isAccordionTypeAheadKey(
  key: string,
  modifiers: { ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean } = {},
): boolean {
  if (modifiers.ctrlKey || modifiers.altKey || modifiers.metaKey) return false;
  return key.length === 1 && key !== ' ' && !/\s/.test(key);
}

/**
 * Index the type-ahead search starts from: a fresh single-letter search looks
 * *after* the focused header (so repeats cycle), a growing prefix re-tests the
 * focused one.
 */
export function accordionTypeAheadStart(index: number, prefix: string): number {
  return prefix.length === 1 ? index : index - 1;
}

/**
 * Index of the panel whose title matches `prefix`, or `null`. Wraps, skips
 * disabled panels and folds accents — {@link matchByPrefix} over the titles.
 */
export function matchAccordionTitle(
  descriptors: readonly OgeAccordionDescriptorCore[],
  prefix: string,
  from: number,
  isDisabled: (index: number) => boolean,
): number | null {
  return matchByPrefix(
    descriptors.map((d) => d.title),
    prefix,
    accordionTypeAheadStart(from, prefix),
    isDisabled,
  );
}
