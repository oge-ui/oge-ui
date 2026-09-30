import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_TABS_CONFIG,
  resolveOgeTabsConfig,
  type OgeTabsConfig,
  type OgeTabsConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`tabs-core`), shared with the React render layer; this
// file is only the Angular DI wrapper around them.
export {
  OGE_DEFAULT_TABS_MESSAGES,
  OGE_DEFAULT_TABS_CONFIG,
  type OgeTabsMessages,
  type OgeTabsConfig,
  type OgeTabsConfigInput,
} from '@oge-ui/behavior';

export const OGE_TABS_CONFIG = new InjectionToken<OgeTabsConfig>(
  'OGE_TABS_CONFIG',
  {
    factory: () => OGE_DEFAULT_TABS_CONFIG,
  },
);

/**
 * Application- or component-scoped tabs defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeTabsConfig({
 *     messages: { closeTab: 'Sekmeyi kapat' },
 *   }),
 * ]
 * ```
 */
export function provideOgeTabsConfig(
  config: OgeTabsConfigInput | (() => OgeTabsConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_TABS_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeTabsConfig(config()), computed),
      }
    : { provide: OGE_TABS_CONFIG, useValue: resolveOgeTabsConfig(config) };
}
