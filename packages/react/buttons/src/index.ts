export {
  OgeButton,
  type OgeButtonProps,
  type OgeButtonHandle,
  type OgeButtonSelectedChangeEvent,
} from './lib/button';
export {
  OgeButtonGroup,
  type OgeButtonGroupProps,
  type OgeButtonGroupHandle,
  type OgeButtonGroupItem,
  type OgeButtonGroupItemClickEvent,
} from './lib/button-group';
export {
  OgeDropDownButton,
  type OgeDropDownButtonProps,
  type OgeDropDownButtonHandle,
  type OgeDropDownItemsFn,
  type OgeDropDownButtonItemClickEvent,
  type OgeDropDownSelectionChangedEvent,
} from './lib/drop-down-button';
export {
  OgeButtonsConfigProvider,
  useOgeButtonsConfig,
  OGE_DEFAULT_BUTTONS_CONFIG,
  OGE_DEFAULT_BUTTONS_MESSAGES,
  type OgeButtonsConfigProviderProps,
  type OgeButtonsConfig,
  type OgeButtonsConfigInput,
  type OgeButtonsMessages,
} from './lib/buttons-config';
// The variant vocabulary is single-sourced in `@oge-ui/behavior` — re-exported
// so consumers import it from the package they installed.
export type {
  OgeButtonStylingMode,
  OgeButtonSeverity,
  OgeButtonSize,
  OgeButtonIconPosition,
  OgeButtonGroupSelectionMode,
  OgeClickGuardOptions,
  OgeHoldToConfirmOptions,
  OgeAutoRepeatOptions,
  OgeButtonGroupSelectionChange,
  OgeMenuItem,
  OgeMenuItemSeverity,
  OgeMenuItemType,
  OgePopupPlacement,
} from '@oge-ui/behavior';
// --- floating action button + speed dial (W8a) ------------------------------
export { OgeFab, type OgeFabProps, type OgeFabHandle } from './lib/fab';
export {
  OgeSpeedDial,
  type OgeSpeedDialProps,
  type OgeSpeedDialHandle,
} from './lib/speed-dial';
export { OgeFabConfigProvider, useOgeFabConfig } from './lib/buttons-config';
export {
  OGE_DEFAULT_FAB_CONFIG,
  OGE_DEFAULT_FAB_MESSAGES,
} from '@oge-ui/behavior';
export type {
  OgeFabClickEvent,
  OgeFabConfig,
  OgeFabConfigInput,
  OgeFabMessages,
  OgeFabPosition,
  OgeFabPositionMode,
  OgeFabSeverity,
  OgeFabSize,
  OgeSpeedDialDirection,
  OgeSpeedDialItem,
  OgeSpeedDialItemClickEvent,
  OgeSpeedDialLabelMode,
  OgeSpeedDialOpenMode,
} from '@oge-ui/behavior';
