export { OgeTabs, type OgeTabsProps } from './lib/tabs';
export { OgeTabPanel, type OgeTabPanelProps } from './lib/tab-panel';
export { OgeTabsConfigProvider, useOgeTabsConfig } from './lib/tabs-config';
export type {
  OgeTabsHandle,
  OgeTabsSharedProps,
  OgeTabDefinition,
  OgeTabHeaderContext,
} from './lib/tabs-types';
// The shared vocabulary, config and event payloads come from
// `@oge-ui/behavior` — re-exported so consumers import one package.
export {
  OGE_DEFAULT_TABS_CONFIG,
  OGE_DEFAULT_TABS_MESSAGES,
} from '@oge-ui/behavior';
export type {
  OgeTabsConfig,
  OgeTabsConfigInput,
  OgeTabsMessages,
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
