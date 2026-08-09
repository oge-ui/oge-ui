import { InjectionToken, type Provider } from '@angular/core';
import type { OgeStepperDisplay, OgeStepperOrientation } from './stepper-types';

/** Every user-facing string the stepper renders, including aria labels. */
export interface OgeStepperMessages {
  /** Accessible name of the step list when the application supplies none. */
  stepper: string;
  /** Sub-label on an optional step. */
  optional: string;
  /** Visually hidden suffix announcing a completed step. */
  completed: string;
  /** Visually hidden suffix announcing a step with errors. */
  invalid: string;
  /** Label of the built-in "back" button. */
  previous: string;
  /** Label of the built-in "next" button. */
  next: string;
  /** Label of the built-in button on the last step. */
  finish: string;
}

export const OGE_DEFAULT_STEPPER_MESSAGES: OgeStepperMessages = {
  stepper: 'Steps',
  optional: 'Optional',
  completed: 'Completed',
  invalid: 'Has errors',
  previous: 'Back',
  next: 'Next',
  finish: 'Finish',
};

export interface OgeStepperConfig {
  messages: OgeStepperMessages;
  /** Default for the `orientation` input. */
  orientation?: OgeStepperOrientation;
  /** Default for the `display` input. */
  display?: OgeStepperDisplay;
  /** Default for the `linear` input. */
  linear?: boolean;
}

export const OGE_DEFAULT_STEPPER_CONFIG: OgeStepperConfig = {
  messages: OGE_DEFAULT_STEPPER_MESSAGES,
};

export const OGE_STEPPER_CONFIG = new InjectionToken<OgeStepperConfig>(
  'OGE_STEPPER_CONFIG',
  {
    factory: () => OGE_DEFAULT_STEPPER_CONFIG,
  },
);

export type OgeStepperConfigInput = Partial<
  Omit<OgeStepperConfig, 'messages'>
> & {
  messages?: Partial<OgeStepperMessages>;
};

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
  const { messages, ...rest } = config;
  return {
    provide: OGE_STEPPER_CONFIG,
    useValue: {
      ...OGE_DEFAULT_STEPPER_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_STEPPER_MESSAGES, ...messages },
    } satisfies OgeStepperConfig,
  };
}
