import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_CHIP_CONFIG,
  resolveOgeChipConfig,
  type OgeChipConfig,
  type OgeChipConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`chip-core`); this file is only the Angular DI wrapper
// around them.
export {
  OGE_DEFAULT_CHIP_CONFIG,
  OGE_DEFAULT_CHIP_MESSAGES,
  type OgeChipMessages,
  type OgeChipConfig,
  type OgeChipConfigInput,
} from '@oge-ui/behavior';

export const OGE_CHIP_CONFIG = new InjectionToken<OgeChipConfig>(
  'OGE_CHIP_CONFIG',
  { factory: () => OGE_DEFAULT_CHIP_CONFIG },
);

/**
 * Application- or component-scoped chip and chip-list defaults:
 *
 * ```ts
 * providers: [provideOgeChipConfig({ messages: { remove: '{label} öğesini kaldır' } })]
 * ```
 */
export function provideOgeChipConfig(
  config: OgeChipConfigInput | (() => OgeChipConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_CHIP_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeChipConfig(config()), computed),
      }
    : {
        provide: OGE_CHIP_CONFIG,
        useValue: resolveOgeChipConfig(config),
      };
}
