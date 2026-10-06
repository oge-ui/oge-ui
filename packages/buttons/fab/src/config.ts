import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_FAB_CONFIG,
  resolveOgeFabConfig,
  type OgeFabConfig,
  type OgeFabConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`fab-core`); this file is only the Angular DI wrapper
// around them.
export {
  OGE_DEFAULT_FAB_CONFIG,
  OGE_DEFAULT_FAB_MESSAGES,
  type OgeFabMessages,
  type OgeFabConfig,
  type OgeFabConfigInput,
} from '@oge-ui/behavior';

export const OGE_FAB_CONFIG = new InjectionToken<OgeFabConfig>(
  'OGE_FAB_CONFIG',
  { factory: () => OGE_DEFAULT_FAB_CONFIG },
);

/**
 * Application- or component-scoped FAB and speed-dial defaults:
 *
 * ```ts
 * providers: [provideOgeFabConfig({ position: 'bottom-start', messages: { speedDial: 'Eylemler' } })]
 * ```
 */
export function provideOgeFabConfig(
  config: OgeFabConfigInput | (() => OgeFabConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_FAB_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeFabConfig(config()), computed),
      }
    : {
        provide: OGE_FAB_CONFIG,
        useValue: resolveOgeFabConfig(config),
      };
}
