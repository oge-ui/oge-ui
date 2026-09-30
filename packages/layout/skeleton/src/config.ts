import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
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
  config: OgeSkeletonConfigInput | (() => OgeSkeletonConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_SKELETON_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeSkeletonConfig(config()), computed),
      }
    : {
        provide: OGE_SKELETON_CONFIG,
        useValue: resolveOgeSkeletonConfig(config),
      };
}
