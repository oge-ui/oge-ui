import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_SKELETON_CONFIG,
  resolveOgeSkeletonConfig,
  type OgeSkeletonConfig,
  type OgeSkeletonConfigInput,
} from '@oge-ui/behavior';

// The defaults and the merge rule live framework-free in `@oge-ui/behavior`
// (`layout-core`); this file is only the Angular DI wrapper around them.
export {
  OGE_DEFAULT_SKELETON_CONFIG,
  type OgeSkeletonConfig,
  type OgeSkeletonConfigInput,
} from '@oge-ui/behavior';

export const OGE_SKELETON_CONFIG = new InjectionToken<OgeSkeletonConfig>(
  'OGE_SKELETON_CONFIG',
  {
    factory: () => OGE_DEFAULT_SKELETON_CONFIG,
  },
);

/** Application- or component-scoped skeleton defaults. */
export function provideOgeSkeletonConfig(
  config: OgeSkeletonConfigInput,
): Provider {
  return {
    provide: OGE_SKELETON_CONFIG,
    useValue: resolveOgeSkeletonConfig(config),
  };
}
