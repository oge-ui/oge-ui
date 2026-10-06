// @oge-ui/layout/app-bar — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeAppBar } from './app-bar';
export { OgeAppBarCenter, OgeAppBarEnd, OgeAppBarStart } from './templates';
export {
  OGE_APP_BAR_CONFIG,
  OGE_DEFAULT_APP_BAR_CONFIG,
  provideOgeAppBarConfig,
  type OgeAppBarConfig,
  type OgeAppBarConfigInput,
} from './config';
export type {
  OgeAppBarCenterAlign,
  OgeAppBarColor,
  OgeAppBarLandmark,
  OgeAppBarPosition,
  OgeAppBarPositionMode,
  OgeAppBarSize,
} from './app-bar-types';
