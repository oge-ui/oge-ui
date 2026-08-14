import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_STEPPER_CONFIG,
  resolveOgeStepperConfig,
  type OgeStepperConfig,
  type OgeStepperConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`stepper-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_STEPPER_MESSAGES,
  OGE_DEFAULT_STEPPER_CONFIG,
  type OgeStepperMessages,
  type OgeStepperConfig,
  type OgeStepperConfigInput,
} from '@oge-ui/behavior';

export const OGE_STEPPER_CONFIG = new InjectionToken<OgeStepperConfig>(
  'OGE_STEPPER_CONFIG',
  {
    factory: () => OGE_DEFAULT_STEPPER_CONFIG,
  },
);

/**
 * Application- or component-scoped stepper defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeStepperConfig({
 *     linear: true,
 *     messages: { next: 'İleri', previous: 'Geri', finish: 'Bitir' },
 *   }),
 * ]
 * ```
 */
export function provideOgeStepperConfig(
  config: OgeStepperConfigInput,
): Provider {
  return {
    provide: OGE_STEPPER_CONFIG,
    useValue: resolveOgeStepperConfig(config),
  };
}
