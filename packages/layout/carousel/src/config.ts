import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_CAROUSEL_CONFIG,
  resolveOgeCarouselConfig,
  type OgeCarouselConfig,
  type OgeCarouselConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`carousel-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_CAROUSEL_CONFIG,
  OGE_DEFAULT_CAROUSEL_MESSAGES,
  type OgeCarouselMessages,
  type OgeCarouselConfig,
  type OgeCarouselConfigInput,
} from '@oge-ui/behavior';

export const OGE_CAROUSEL_CONFIG = new InjectionToken<OgeCarouselConfig>(
  'OGE_CAROUSEL_CONFIG',
  { factory: () => OGE_DEFAULT_CAROUSEL_CONFIG },
);

/**
 * Application- or component-scoped carousel defaults:
 *
 * ```ts
 * providers: [provideOgeCarouselConfig({ loop: true, messages: { next: 'Weiter' } })]
 * ```
 */
export function provideOgeCarouselConfig(
  config: OgeCarouselConfigInput | (() => OgeCarouselConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_CAROUSEL_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeCarouselConfig(config()), computed),
      }
    : {
        provide: OGE_CAROUSEL_CONFIG,
        useValue: resolveOgeCarouselConfig(config),
      };
}
