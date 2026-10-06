// @oge-ui/layout/alert — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeAlert } from './alert';
export { OgeAlertActions, OgeAlertIcon } from './templates';
export {
  OGE_ALERT_CONFIG,
  OGE_DEFAULT_ALERT_CONFIG,
  OGE_DEFAULT_ALERT_MESSAGES,
  provideOgeAlertConfig,
  type OgeAlertConfig,
  type OgeAlertConfigInput,
  type OgeAlertMessages,
} from './config';
export type {
  OgeAlertClosedEvent,
  OgeAlertClosingEvent,
  OgeAlertLive,
  OgeAlertSeverity,
  OgeAlertStylingMode,
} from './alert-types';
