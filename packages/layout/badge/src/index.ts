// @oge-ui/layout/badge — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeBadge } from './badge';
export {
  OGE_BADGE_CONFIG,
  OGE_DEFAULT_BADGE_CONFIG,
  OGE_DEFAULT_BADGE_MESSAGES,
  provideOgeBadgeConfig,
  type OgeBadgeConfig,
  type OgeBadgeConfigInput,
  type OgeBadgeMessages,
} from './config';
export type {
  OgeBadgeOverlap,
  OgeBadgePosition,
  OgeBadgeSeverity,
  OgeBadgeSize,
  OgeBadgeValue,
} from './badge-types';
