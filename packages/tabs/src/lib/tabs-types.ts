import type { OgeTabItem } from '@oge-ui/behavior';

// The tabs vocabulary and event payloads live framework-free in
// `@oge-ui/behavior` (`tabs-core`), shared with the React render layer;
// re-exported here so existing imports keep working. Only the Angular
// template-slot contexts stay local — `$implicit` has no meaning elsewhere.
export type {
  OgeTabsActivation,
  OgeTabsOrientation,
  OgeTabsPosition,
  OgeTabsStylingMode,
  OgeTabsSize,
  OgeTabsNavButtonsMode,
  OgeTabsAlignment,
  OgeTabsIndicatorFit,
  OgeTabPanelAnimation,
  OgeTabCloseGuard,
  OgeTabItem,
  OgeTabSelectionChangingEvent,
  OgeTabSelectionChangedEvent,
  OgeTabClickEvent,
  OgeTabClosingEvent,
  OgeTabClosedEvent,
  OgeTabReorderingEvent,
  OgeTabReorderedEvent,
} from '@oge-ui/behavior';

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
