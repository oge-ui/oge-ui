import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_PIVOT_CONFIG,
  OGE_DEFAULT_PIVOT_MESSAGES,
  resolveOgePivotConfig,
  type OgePivotConfig,
  type OgePivotConfigInput,
  type OgePivotMessages,
} from '@oge-ui/pivot-engine';

// The catalog and its defaults are framework-free and live in
// `@oge-ui/pivot-engine` (ADR 0003), so the React pivot reads the same copy;
// re-exported here because both are public API of `@oge-ui/pivot`.
export {
  OGE_DEFAULT_PIVOT_CONFIG,
  OGE_DEFAULT_PIVOT_MESSAGES,
  type OgePivotConfig,
  type OgePivotConfigInput,
  type OgePivotMessages,
};

export const OGE_PIVOT_CONFIG = new InjectionToken<OgePivotConfig>(
  'OGE_PIVOT_CONFIG',
  { factory: () => OGE_DEFAULT_PIVOT_CONFIG },
);

/**
 * Application- or component-scoped pivot grid defaults — today the `locale`
 * of every pivot's cell text. A function makes the config live, like
 * `provideOgeGridConfig(() => …)`:
 *
 * ```ts
 * providers: [provideOgePivotConfig(() => ({ locale: uiLocale() }))]
 * ```
 */
export function provideOgePivotConfig(
  config: OgePivotConfigInput | (() => OgePivotConfigInput),
): Provider {
  return typeof config === 'function'
    ? {
        provide: OGE_PIVOT_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgePivotConfig(config()), computed),
      }
    : { provide: OGE_PIVOT_CONFIG, useValue: resolveOgePivotConfig(config) };
}

export const OGE_PIVOT_MESSAGES = new InjectionToken<OgePivotMessages>(
  'OGE_PIVOT_MESSAGES',
  {
    factory: () => OGE_DEFAULT_PIVOT_MESSAGES,
  },
);

/** Application- or component-scoped pivot message overrides (i18n). */
export function provideOgePivotMessages(
  messages: Partial<OgePivotMessages>,
): Provider {
  return {
    provide: OGE_PIVOT_MESSAGES,
    useValue: { ...OGE_DEFAULT_PIVOT_MESSAGES, ...messages },
  };
}
