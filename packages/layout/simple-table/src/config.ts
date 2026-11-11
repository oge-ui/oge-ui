import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_SIMPLE_TABLE_CONFIG,
  resolveOgeSimpleTableConfig,
  type OgeSimpleTableConfig,
  type OgeSimpleTableConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`simple-table-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_SIMPLE_TABLE_CONFIG,
  OGE_DEFAULT_SIMPLE_TABLE_MESSAGES,
  type OgeSimpleTableMessages,
  type OgeSimpleTableConfig,
  type OgeSimpleTableConfigInput,
} from '@oge-ui/behavior';

export const OGE_SIMPLE_TABLE_CONFIG = new InjectionToken<OgeSimpleTableConfig>(
  'OGE_SIMPLE_TABLE_CONFIG',
  { factory: () => OGE_DEFAULT_SIMPLE_TABLE_CONFIG },
);

/**
 * Application- or component-scoped simple table defaults:
 *
 * ```ts
 * providers: [provideOgeSimpleTableConfig({ pageSize: 20, compact: true })]
 * ```
 */
export function provideOgeSimpleTableConfig(
  config: OgeSimpleTableConfigInput | (() => OgeSimpleTableConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_SIMPLE_TABLE_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeSimpleTableConfig(config()), computed),
      }
    : {
        provide: OGE_SIMPLE_TABLE_CONFIG,
        useValue: resolveOgeSimpleTableConfig(config),
      };
}
