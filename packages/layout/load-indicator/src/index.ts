// @oge-ui/layout/load-indicator — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export {
  OgeLoadIndicator,
  type OgeLoadIndicatorSeverity,
} from './load-indicator';
export {
  OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
  OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
  OGE_LOAD_INDICATOR_CONFIG,
  provideOgeLoadIndicatorConfig,
  type OgeLoadIndicatorConfig,
  type OgeLoadIndicatorConfigInput,
  type OgeLoadIndicatorMessages,
} from './config';
