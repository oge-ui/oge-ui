// @oge-ui/layout/skeleton — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeSkeleton } from './skeleton';
export {
  OGE_DEFAULT_SKELETON_CONFIG,
  OGE_SKELETON_CONFIG,
  provideOgeSkeletonConfig,
  type OgeSkeletonConfig,
  type OgeSkeletonConfigInput,
} from './config';
export type {
  OgeSkeletonAnimation,
  OgeSkeletonShape,
} from './skeleton-types';
