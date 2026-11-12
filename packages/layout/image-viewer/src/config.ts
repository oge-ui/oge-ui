import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_IMAGE_VIEWER_CONFIG,
  resolveOgeImageViewerConfig,
  type OgeImageViewerConfig,
  type OgeImageViewerConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`image-viewer-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_IMAGE_VIEWER_CONFIG,
  OGE_DEFAULT_IMAGE_VIEWER_MESSAGES,
  type OgeImageViewerMessages,
  type OgeImageViewerConfig,
  type OgeImageViewerConfigInput,
} from '@oge-ui/behavior';

export const OGE_IMAGE_VIEWER_CONFIG = new InjectionToken<OgeImageViewerConfig>(
  'OGE_IMAGE_VIEWER_CONFIG',
  { factory: () => OGE_DEFAULT_IMAGE_VIEWER_CONFIG },
);

/**
 * Application- or component-scoped image viewer defaults:
 *
 * ```ts
 * providers: [provideOgeImageViewerConfig({ maxZoom: 4, messages: { next: "Weiter" } })]
 * ```
 */
export function provideOgeImageViewerConfig(
  config: OgeImageViewerConfigInput | (() => OgeImageViewerConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_IMAGE_VIEWER_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeImageViewerConfig(config()), computed),
      }
    : {
        provide: OGE_IMAGE_VIEWER_CONFIG,
        useValue: resolveOgeImageViewerConfig(config),
      };
}
