import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_DIFF_VIEWER_CONFIG,
  resolveOgeDiffViewerConfig,
  type OgeDiffViewerConfig,
  type OgeDiffViewerConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`diff-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_DIFF_VIEWER_CONFIG,
  OGE_DEFAULT_DIFF_VIEWER_MESSAGES,
  type OgeDiffViewerMessages,
  type OgeDiffViewerConfig,
  type OgeDiffViewerConfigInput,
} from '@oge-ui/behavior';

export const OGE_DIFF_VIEWER_CONFIG = new InjectionToken<OgeDiffViewerConfig>(
  'OGE_DIFF_VIEWER_CONFIG',
  { factory: () => OGE_DEFAULT_DIFF_VIEWER_CONFIG },
);

/**
 * Application- or component-scoped diff viewer defaults:
 *
 * ```ts
 * providers: [provideOgeDiffViewerConfig({ context: 5, messages: { oldLabel: "Vorher" } })]
 * ```
 */
export function provideOgeDiffViewerConfig(
  config: OgeDiffViewerConfigInput | (() => OgeDiffViewerConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_DIFF_VIEWER_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeDiffViewerConfig(config()), computed),
      }
    : {
        provide: OGE_DIFF_VIEWER_CONFIG,
        useValue: resolveOgeDiffViewerConfig(config),
      };
}
