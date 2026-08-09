import type { OgeAsyncGuard } from '@oge-ui/core';

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

/** Data-driven counterpart of a declarative `<oge-accordion-item>`. */
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

/** Context of `[ogeAccordionHeaderTemplate]`. */
export interface OgeAccordionHeaderTemplateContext {
  $implicit: OgeAccordionItemData | undefined;
  index: number;
  expanded: boolean;
  title: string;
  description?: string;
}

/** Context of `[ogeAccordionContentTemplate]`. */
export interface OgeAccordionContentTemplateContext {
  $implicit: OgeAccordionItemData | undefined;
  index: number;
  /** Value resolved by the panel's `contentLoader`, `undefined` without one. */
  data: unknown;
}

/** Context of `[ogeAccordionToggleIconTemplate]`. */
export interface OgeAccordionToggleIconTemplateContext {
  $implicit: boolean;
  index: number;
}

/** Context of `[ogeAccordionHeaderActionsTemplate]`. */
export interface OgeAccordionHeaderActionsTemplateContext {
  $implicit: OgeAccordionItemData | undefined;
  index: number;
  expanded: boolean;
}
