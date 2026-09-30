import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
  resolveOgeLoadIndicatorConfig,
  type OgeLoadIndicatorConfig,
  type OgeLoadIndicatorConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`layout-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
  OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
  type OgeLoadIndicatorMessages,
  type OgeLoadIndicatorConfig,
  type OgeLoadIndicatorConfigInput,
} from '@oge-ui/behavior';

export const OGE_LOAD_INDICATOR_CONFIG =
  new InjectionToken<OgeLoadIndicatorConfig>('OGE_LOAD_INDICATOR_CONFIG', {
    factory: () => OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
  });

/**
 * Application- or component-scoped load-indicator defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeLoadIndicatorConfig({ messages: { loading: 'Yükleniyor' } }),
 * ]
 * ```
 */
export function provideOgeLoadIndicatorConfig(
  config: OgeLoadIndicatorConfigInput | (() => OgeLoadIndicatorConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_LOAD_INDICATOR_CONFIG,
        useFactory: () =>
          ogeLiveConfig(
            () => resolveOgeLoadIndicatorConfig(config()),
            computed,
          ),
      }
    : {
        provide: OGE_LOAD_INDICATOR_CONFIG,
        useValue: resolveOgeLoadIndicatorConfig(config),
      };
}
