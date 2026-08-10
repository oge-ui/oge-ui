import { InjectionToken, type Provider } from '@angular/core';
import type { OgeProgressBarSeverity } from './progress-bar-types';

/** Every user-facing string the progress bar renders, including aria labels. */
export interface OgeProgressBarMessages {
  /** Accessible name of the bar when the application supplies none. */
  progress: string;
}

export const OGE_DEFAULT_PROGRESS_BAR_MESSAGES: OgeProgressBarMessages = {
  progress: 'Progress',
};

export interface OgeProgressBarConfig {
  messages: OgeProgressBarMessages;
  /** Default for the `severity` input. */
  severity?: OgeProgressBarSeverity;
  /** Default for the `showLabel` input. */
  showLabel?: boolean;
}

export const OGE_DEFAULT_PROGRESS_BAR_CONFIG: OgeProgressBarConfig = {
  messages: OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
};

export const OGE_PROGRESS_BAR_CONFIG = new InjectionToken<OgeProgressBarConfig>(
  'OGE_PROGRESS_BAR_CONFIG',
  {
    factory: () => OGE_DEFAULT_PROGRESS_BAR_CONFIG,
  },
);

export type OgeProgressBarConfigInput = Partial<
  Omit<OgeProgressBarConfig, 'messages'>
> & {
  messages?: Partial<OgeProgressBarMessages>;
};

/**
 * Application- or component-scoped progress-bar defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeProgressBarConfig({ messages: { progress: 'İlerleme' } }),
 * ]
 * ```
 */
export function provideOgeProgressBarConfig(
  config: OgeProgressBarConfigInput,
): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_PROGRESS_BAR_CONFIG,
    useValue: {
      ...OGE_DEFAULT_PROGRESS_BAR_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_PROGRESS_BAR_MESSAGES, ...messages },
    } satisfies OgeProgressBarConfig,
  };
}
