import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_DRAWER_CONFIG,
  resolveOgeDrawerConfig,
  type OgeDrawerConfig,
  type OgeDrawerConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`drawer-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_DRAWER_MESSAGES,
  OGE_DEFAULT_DRAWER_CONFIG,
  type OgeDrawerMessages,
  type OgeDrawerConfig,
  type OgeDrawerConfigInput,
} from '@oge-ui/behavior';

export const OGE_DRAWER_CONFIG = new InjectionToken<OgeDrawerConfig>(
  'OGE_DRAWER_CONFIG',
  {
    factory: () => OGE_DEFAULT_DRAWER_CONFIG,
  },
);

/**
 * Application- or component-scoped drawer defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeDrawerConfig({
 *     size: 280,
 *     messages: { close: 'Kapat' },
 *   }),
 * ]
 * ```
 */
export function provideOgeDrawerConfig(
  config: OgeDrawerConfigInput | (() => OgeDrawerConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_DRAWER_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeDrawerConfig(config()), computed),
      }
    : { provide: OGE_DRAWER_CONFIG, useValue: resolveOgeDrawerConfig(config) };
}
