import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_TILE_LAYOUT_CONFIG,
  resolveOgeTileLayoutConfig,
  type OgeTileLayoutConfig,
  type OgeTileLayoutConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`tile-layout-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_TILE_LAYOUT_CONFIG,
  OGE_DEFAULT_TILE_LAYOUT_MESSAGES,
  type OgeTileLayoutMessages,
  type OgeTileLayoutConfig,
  type OgeTileLayoutConfigInput,
} from '@oge-ui/behavior';

export const OGE_TILE_LAYOUT_CONFIG = new InjectionToken<OgeTileLayoutConfig>(
  'OGE_TILE_LAYOUT_CONFIG',
  { factory: () => OGE_DEFAULT_TILE_LAYOUT_CONFIG },
);

/**
 * Application- or component-scoped tile layout defaults:
 *
 * ```ts
 * providers: [provideOgeTileLayoutConfig({ columns: 3, messages: { layoutLabel: 'Pano' } })]
 * ```
 */
export function provideOgeTileLayoutConfig(
  config: OgeTileLayoutConfigInput | (() => OgeTileLayoutConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_TILE_LAYOUT_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeTileLayoutConfig(config()), computed),
      }
    : {
        provide: OGE_TILE_LAYOUT_CONFIG,
        useValue: resolveOgeTileLayoutConfig(config),
      };
}
