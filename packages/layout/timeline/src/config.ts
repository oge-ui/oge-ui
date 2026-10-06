import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_TIMELINE_CONFIG,
  resolveOgeTimelineConfig,
  type OgeTimelineConfig,
  type OgeTimelineConfigInput,
} from '@oge-ui/behavior';

// The defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`timeline-core`); this file is only the Angular DI wrapper
// around them.
export {
  OGE_DEFAULT_TIMELINE_CONFIG,
  type OgeTimelineConfig,
  type OgeTimelineConfigInput,
} from '@oge-ui/behavior';

export const OGE_TIMELINE_CONFIG = new InjectionToken<OgeTimelineConfig>(
  'OGE_TIMELINE_CONFIG',
  { factory: () => OGE_DEFAULT_TIMELINE_CONFIG },
);

/**
 * Application- or component-scoped timeline defaults:
 *
 * ```ts
 * providers: [provideOgeTimelineConfig({ align: 'alternate' })]
 * ```
 */
export function provideOgeTimelineConfig(
  config: OgeTimelineConfigInput | (() => OgeTimelineConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_TIMELINE_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeTimelineConfig(config()), computed),
      }
    : {
        provide: OGE_TIMELINE_CONFIG,
        useValue: resolveOgeTimelineConfig(config),
      };
}
