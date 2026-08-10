import { InjectionToken, type Provider } from '@angular/core';

/** Every user-facing string the load indicator renders (aria labels). */
export interface OgeLoadIndicatorMessages {
  /** Accessible name when the application supplies none. */
  loading: string;
}

export const OGE_DEFAULT_LOAD_INDICATOR_MESSAGES: OgeLoadIndicatorMessages = {
  loading: 'Loading',
};

export interface OgeLoadIndicatorConfig {
  messages: OgeLoadIndicatorMessages;
}

export const OGE_DEFAULT_LOAD_INDICATOR_CONFIG: OgeLoadIndicatorConfig = {
  messages: OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
};

export const OGE_LOAD_INDICATOR_CONFIG =
  new InjectionToken<OgeLoadIndicatorConfig>('OGE_LOAD_INDICATOR_CONFIG', {
    factory: () => OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
  });

export type OgeLoadIndicatorConfigInput = {
  messages?: Partial<OgeLoadIndicatorMessages>;
};

/**
 * Application- or component-scoped load-indicator defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeLoadIndicatorConfig({ messages: { loading: 'Yükleniyor' } }),
 * ]
 * ```
 */
export function provideOgeLoadIndicatorConfig(
  config: OgeLoadIndicatorConfigInput,
): Provider {
  return {
    provide: OGE_LOAD_INDICATOR_CONFIG,
    useValue: {
      ...OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
      messages: {
        ...OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
        ...config.messages,
      },
    } satisfies OgeLoadIndicatorConfig,
  };
}
