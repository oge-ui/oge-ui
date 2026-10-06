import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_DATA_VIEW_CONFIG,
  resolveOgeDataViewConfig,
  type OgeDataViewConfig,
  type OgeDataViewConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`data-view-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_DATA_VIEW_CONFIG,
  OGE_DEFAULT_DATA_VIEW_MESSAGES,
  type OgeDataViewMessages,
  type OgeDataViewConfig,
  type OgeDataViewConfigInput,
} from '@oge-ui/behavior';

export const OGE_DATA_VIEW_CONFIG = new InjectionToken<OgeDataViewConfig>(
  'OGE_DATA_VIEW_CONFIG',
  { factory: () => OGE_DEFAULT_DATA_VIEW_CONFIG },
);

/**
 * Application- or component-scoped data view defaults:
 *
 * ```ts
 * providers: [provideOgeDataViewConfig({ pageSize: 12, messages: { search: 'Ara' } })]
 * ```
 */
export function provideOgeDataViewConfig(
  config: OgeDataViewConfigInput | (() => OgeDataViewConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_DATA_VIEW_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeDataViewConfig(config()), computed),
      }
    : {
        provide: OGE_DATA_VIEW_CONFIG,
        useValue: resolveOgeDataViewConfig(config),
      };
}
