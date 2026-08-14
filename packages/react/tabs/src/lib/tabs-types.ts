import type { CSSProperties, ReactNode } from 'react';
import type {
  OgeTabClickEvent,
  OgeTabClosedEvent,
  OgeTabClosingEvent,
  OgeTabDescriptorCore,
  OgeTabItem,
  OgeTabReorderedEvent,
  OgeTabReorderingEvent,
  OgeTabSelectionChangedEvent,
  OgeTabSelectionChangingEvent,
  OgeTabsActivation,
  OgeTabsAlignment,
  OgeTabsIndicatorFit,
  OgeTabsMessages,
  OgeTabsNavButtonsMode,
  OgeTabsSize,
  OgeTabsStylingMode,
} from '@oge-ui/behavior';

/** Context handed to `renderTabHeader` — the React face of the Angular slot. */
export interface OgeTabHeaderContext {
  /** The `items` entry — `undefined` for `tabs`-declared entries. */
  item: OgeTabItem | undefined;
  /** Index within the rendered strip. */
  index: number;
  /** Whether the tab is currently selected. */
  selected: boolean;
  /** Resolved label text. */
  text: string;
}

/**
 * One declarative tab — the React counterpart of an `<oge-tab>` child: an
 * `OgeTabItem` plus its panel content and optional header renderer.
 */
export interface OgeTabDefinition extends OgeTabItem {
  /** Panel content rendered while the tab is displayed. */
  content?: ReactNode;
  /** Custom header rendering for this tab alone. */
  renderHeader?: (context: OgeTabHeaderContext) => ReactNode;
}

/** Normalized tab with the React content slots on top of the shared core. */
export interface OgeReactTabDescriptor extends OgeTabDescriptorCore {
  readonly content?: ReactNode;
  readonly renderHeader?: (context: OgeTabHeaderContext) => ReactNode;
}

/** Props shared by `<OgeTabs>` and `<OgeTabPanel>`. */
export interface OgeTabsSharedProps {
  /** Declarative tabs — the React counterpart of `<oge-tab>` children. */
  tabs?: readonly OgeTabDefinition[];
  /** Data-driven tabs rendered after the declarative ones. */
  items?: readonly OgeTabItem[];
  /** Index of the selected tab — controlled when provided. `-1` selects none. */
  selectedIndex?: number;
  /** Uncontrolled initial selection. */
  defaultSelectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  /** Key of the selected tab — controlled when provided. */
  selectedKey?: string;
  onSelectedKeyChange?: (key: string | undefined) => void;
  /** APG activation: arrows select immediately, or Enter/Space commits. */
  activation?: OgeTabsActivation;
  /** Disables the whole component. */
  disabled?: boolean;
  /** Default closability; overridable per tab / per item. */
  closable?: boolean;
  /** How tabs are distributed while they fit. */
  tabAlignment?: OgeTabsAlignment;
  /** Whether the indicator spans the whole tab or just its label. */
  indicatorFit?: OgeTabsIndicatorFit;
  /** Overflow nav arrows: `auto` shows them only while overflowing. */
  showNavButtons?: OgeTabsNavButtonsMode;
  /** Shows the all-tabs overflow menu button. */
  showTabListButton?: boolean;
  /** Enables drag & drop reordering of tab headers. */
  allowTabReordering?: boolean;
  /** Visual variant: underline ink (`primary`) or soft pills (`secondary`). */
  stylingMode?: OgeTabsStylingMode;
  /** Density of the tab strip. */
  size?: OgeTabsSize;
  /** Aria label of the tablist. */
  ariaLabel?: string;
  /** Per-instance overrides of the config `messages`. */
  messages?: Partial<OgeTabsMessages>;
  /** Shared header renderer for `items`-driven tabs. */
  renderTabHeader?: (context: OgeTabHeaderContext) => ReactNode;

  /** Cancelable pre-event of a user-gesture selection change. */
  onSelectionChanging?: (event: OgeTabSelectionChangingEvent) => void;
  /** Fires after the selection committed. */
  onSelectionChanged?: (event: OgeTabSelectionChangedEvent) => void;
  /** A tab header was activated by pointer or keyboard. */
  onTabClick?: (event: OgeTabClickEvent) => void;
  /** Cancelable pre-event of a tab close (before the async `closeGuard`). */
  onTabClosing?: (event: OgeTabClosingEvent) => void;
  /** Fires once a close passed `onTabClosing` and the tab's `closeGuard`. */
  onTabClosed?: (event: OgeTabClosedEvent) => void;
  /** Cancelable pre-event of a drag-reorder drop. */
  onTabReordering?: (event: OgeTabReorderingEvent) => void;
  /** Fires after a drag reorder committed to the display order. */
  onTabReordered?: (event: OgeTabReorderedEvent) => void;

  className?: string;
  style?: CSSProperties;
}

/** Imperative handle, mirroring the Angular components' public methods. */
export interface OgeTabsHandle {
  /** Focuses the active tab header. */
  focus(): void;
  /** Runs the close pipeline for the tab at an index or with a key. */
  closeTab(target: number | string): void;
  /** Scrolls the tab at an index or with a key into view. */
  scrollToTab(target: number | string): void;
}
