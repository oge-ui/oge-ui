// @oge-ui/layout/progress-bar — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeProgressBar } from './progress-bar';
export {
  OGE_DEFAULT_PROGRESS_BAR_CONFIG,
  OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
  OGE_PROGRESS_BAR_CONFIG,
  provideOgeProgressBarConfig,
  type OgeProgressBarConfig,
  type OgeProgressBarConfigInput,
  type OgeProgressBarMessages,
} from './config';
export type {
  OgeProgressBarCompletedEvent,
  OgeProgressBarSeverity,
} from './progress-bar-types';
