import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_APP_BAR_CONFIG,
  resolveOgeAppBarConfig,
  type OgeAppBarConfig,
  type OgeAppBarConfigInput,
} from '@oge-ui/behavior';

// The defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`app-bar-core`); this file is only the Angular DI wrapper
// around them.
export {
  OGE_DEFAULT_APP_BAR_CONFIG,
  type OgeAppBarConfig,
  type OgeAppBarConfigInput,
} from '@oge-ui/behavior';

export const OGE_APP_BAR_CONFIG = new InjectionToken<OgeAppBarConfig>(
  'OGE_APP_BAR_CONFIG',
  { factory: () => OGE_DEFAULT_APP_BAR_CONFIG },
);

/**
 * Application- or component-scoped app-bar defaults:
 *
 * ```ts
 * providers: [provideOgeAppBarConfig({ color: 'primary' })]
 * ```
 */
export function provideOgeAppBarConfig(
  config: OgeAppBarConfigInput | (() => OgeAppBarConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_APP_BAR_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeAppBarConfig(config()), computed),
      }
    : {
        provide: OGE_APP_BAR_CONFIG,
        useValue: resolveOgeAppBarConfig(config),
      };
}
