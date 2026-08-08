/** How keyboard focus interacts with selection (WAI-ARIA APG tabs pattern). */
export type OgeTabsActivation = 'automatic' | 'manual';

/** Layout direction of a stand-alone `oge-tabs` strip. */
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
  /** Tooltip — rendered as the native <code>title</code> attribute. */
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
  /** Originating DOM event (absent for programmatic `selectTab`). */
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
  /** Originating DOM event (absent for programmatic `closeTab`). */
  readonly event?: Event;
  /** Set `true` to veto the close synchronously. */
  cancel: boolean;
}

/**
 * Emitted after `tabClosing` and the tab's `closeGuard` both allowed the
 * close. The component does not remove tabs itself — remove the `items`
 * entry or the `<oge-tab>` child in this handler.
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

/** Context of a custom tab header template (`[ogeTabHeaderTemplate]`). */
export interface OgeTabHeaderTemplateContext {
  /** The `items` entry — `undefined` for declarative `<oge-tab>` children. */
  $implicit: OgeTabItem | undefined;
  /** Index within the rendered strip. */
  index: number;
  /** Whether the tab is currently selected. */
  selected: boolean;
  /** Resolved label text. */
  text: string;
}

/** Context of a lazy content template (`[ogeTabContentTemplate]`). */
export interface OgeTabContentTemplateContext {
  /** The `items` entry — `undefined` for declarative `<oge-tab>` children. */
  $implicit: OgeTabItem | undefined;
  /** Index within the rendered strip. */
  index: number;
}
