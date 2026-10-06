import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_LIST_VIEW_CONFIG,
  resolveOgeListViewConfig,
  type OgeListViewConfig,
  type OgeListViewConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`list-view-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_LIST_VIEW_CONFIG,
  OGE_DEFAULT_LIST_VIEW_MESSAGES,
  type OgeListViewMessages,
  type OgeListViewConfig,
  type OgeListViewConfigInput,
} from '@oge-ui/behavior';

export const OGE_LIST_VIEW_CONFIG = new InjectionToken<OgeListViewConfig>(
  'OGE_LIST_VIEW_CONFIG',
  { factory: () => OGE_DEFAULT_LIST_VIEW_CONFIG },
);

/**
 * Application- or component-scoped list view defaults:
 *
 * ```ts
 * providers: [provideOgeListViewConfig({ selectionMode: 'single', messages: { loadMore: 'Daha fazla' } })]
 * ```
 */
export function provideOgeListViewConfig(
  config: OgeListViewConfigInput | (() => OgeListViewConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_LIST_VIEW_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeListViewConfig(config()), computed),
      }
    : {
        provide: OGE_LIST_VIEW_CONFIG,
        useValue: resolveOgeListViewConfig(config),
      };
}
