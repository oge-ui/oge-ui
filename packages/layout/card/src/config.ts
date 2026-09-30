import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_CARD_CONFIG,
  resolveOgeCardConfig,
  type OgeCardConfig,
  type OgeCardConfigInput,
} from '@oge-ui/behavior';

// The defaults and the merge rule live framework-free in `@oge-ui/behavior`
// (`layout-core`); this file is only the Angular DI wrapper around them.
export {
  OGE_DEFAULT_CARD_CONFIG,
  type OgeCardConfig,
  type OgeCardConfigInput,
} from '@oge-ui/behavior';

export const OGE_CARD_CONFIG = new InjectionToken<OgeCardConfig>(
  'OGE_CARD_CONFIG',
  { factory: () => OGE_DEFAULT_CARD_CONFIG },
);

/** Application- or component-scoped card defaults. */
export function provideOgeCardConfig(
  config: OgeCardConfigInput | (() => OgeCardConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_CARD_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeCardConfig(config()), computed),
      }
    : { provide: OGE_CARD_CONFIG, useValue: resolveOgeCardConfig(config) };
}
