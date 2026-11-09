import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_PRESENTATION_CONFIG,
  resolveOgePresentationConfig,
  type OgePresentationConfig,
  type OgePresentationConfigInput,
} from '@oge-ui/spreadsheet-engine/powerpoint';

export const OGE_PRESENTATION_CONFIG =
  new InjectionToken<OgePresentationConfig>('OGE_PRESENTATION_CONFIG', {
    factory: () => OGE_DEFAULT_PRESENTATION_CONFIG,
  });

/**
 * Configures every `<oge-presentation>` below the provider. A partial
 * `messages` merges over the defaults; a function makes the config live, so
 * a signal it reads can switch the UI language without a reload.
 */
export function provideOgePresentationConfig(
  config: OgePresentationConfigInput | (() => OgePresentationConfigInput),
): Provider {
  return typeof config === 'function'
    ? {
        provide: OGE_PRESENTATION_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgePresentationConfig(config()), computed),
      }
    : {
        provide: OGE_PRESENTATION_CONFIG,
        useValue: resolveOgePresentationConfig(config),
      };
}
