import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_BADGE_CONFIG,
  resolveOgeBadgeConfig,
  type OgeBadgeConfig,
  type OgeBadgeConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`badge-core`); this file is only the Angular DI wrapper
// around them.
export {
  OGE_DEFAULT_BADGE_CONFIG,
  OGE_DEFAULT_BADGE_MESSAGES,
  type OgeBadgeMessages,
  type OgeBadgeConfig,
  type OgeBadgeConfigInput,
} from '@oge-ui/behavior';

export const OGE_BADGE_CONFIG = new InjectionToken<OgeBadgeConfig>(
  'OGE_BADGE_CONFIG',
  { factory: () => OGE_DEFAULT_BADGE_CONFIG },
);

/**
 * Application- or component-scoped badge defaults:
 *
 * ```ts
 * providers: [provideOgeBadgeConfig({ max: 9, messages: { dot: 'Yeni' } })]
 * ```
 */
export function provideOgeBadgeConfig(
  config: OgeBadgeConfigInput | (() => OgeBadgeConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_BADGE_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeBadgeConfig(config()), computed),
      }
    : {
        provide: OGE_BADGE_CONFIG,
        useValue: resolveOgeBadgeConfig(config),
      };
}
