import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_INPUTS_CONFIG,
  resolveOgeInputsConfig,
  type OgeInputsConfig,
  type OgeInputsConfigInput,
} from '@oge-ui/behavior';

// The strings and behavioral defaults are framework-free data shared with the
// React render layer, so they live in `@oge-ui/behavior` (ADR 0001) — both
// providers merge over the exact same values. Re-exported here unchanged so
// `@oge-ui/inputs` remains the Angular import path.
export {
  OGE_DEFAULT_INPUTS_CONFIG,
  OGE_DEFAULT_INPUTS_MESSAGES,
  type OgeInputsConfig,
  type OgeInputsConfigInput,
  type OgeInputsMessages,
} from '@oge-ui/behavior';

export const OGE_INPUTS_CONFIG = new InjectionToken<OgeInputsConfig>(
  'OGE_INPUTS_CONFIG',
  {
    factory: () => OGE_DEFAULT_INPUTS_CONFIG,
  },
);

/**
 * Application- or component-scoped input defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeInputsConfig({
 *     messages: { requiredError: 'Bu alan zorunludur' },
 *   }),
 * ]
 * ```
 */
export function provideOgeInputsConfig(
  config: OgeInputsConfigInput | (() => OgeInputsConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_INPUTS_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeInputsConfig(config()), computed),
      }
    : { provide: OGE_INPUTS_CONFIG, useValue: resolveOgeInputsConfig(config) };
}
