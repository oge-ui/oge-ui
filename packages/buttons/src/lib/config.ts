import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/behavior';
import {
  OGE_DEFAULT_BUTTONS_CONFIG,
  resolveOgeButtonsConfig,
  type OgeButtonsConfig,
  type OgeButtonsConfigInput,
} from '@oge-ui/behavior';

// The config *shape*, its defaults and the merge live in `@oge-ui/behavior` so
// the React buttons read the identical numbers and strings (ADR 0001). What
// stays here is the only Angular-shaped part: the injection token and the
// provider factory. Re-exported so `@oge-ui/buttons` consumers see no change.
export {
  OGE_DEFAULT_BUTTONS_MESSAGES,
  OGE_DEFAULT_BUTTONS_CONFIG,
  type OgeButtonsMessages,
  type OgeButtonsConfig,
  type OgeButtonsConfigInput,
} from '@oge-ui/behavior';

export const OGE_BUTTONS_CONFIG = new InjectionToken<OgeButtonsConfig>(
  'OGE_BUTTONS_CONFIG',
  {
    factory: () => OGE_DEFAULT_BUTTONS_CONFIG,
  },
);

/**
 * Application- or component-scoped button defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeButtonsConfig({
 *     clickGuardMs: 300,
 *     messages: { loading: 'Yükleniyor' },
 *   }),
 * ]
 * ```
 */
export function provideOgeButtonsConfig(
  config: OgeButtonsConfigInput | (() => OgeButtonsConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_BUTTONS_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeButtonsConfig(config()), computed),
      }
    : {
        provide: OGE_BUTTONS_CONFIG,
        useValue: resolveOgeButtonsConfig(config),
      };
}
