import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_CHARTS_CONFIG,
  resolveOgeChartsConfig,
  type OgeChartsConfig,
  type OgeChartsConfigInput,
} from '@oge-ui/charts-engine';

// The message catalog, the config shape, its defaults and the merge rules are
// single-sourced in `@oge-ui/charts-engine` (ADR 0003), so the Angular and the
// React charts cannot drift; re-exported so `@oge-ui/charts` keeps its API.
export {
  OGE_DEFAULT_CHARTS_CONFIG,
  OGE_DEFAULT_CHARTS_MESSAGES,
  type OgeChartsAnnouncementMessages,
  type OgeChartsAriaMessages,
  type OgeChartsConfig,
  type OgeChartsConfigInput,
  type OgeChartsMessages,
  type OgeChartsValueMessages,
} from '@oge-ui/charts-engine';

export const OGE_CHARTS_CONFIG = new InjectionToken<OgeChartsConfig>(
  'OGE_CHARTS_CONFIG',
  { factory: () => OGE_DEFAULT_CHARTS_CONFIG },
);

/**
 * Configures every chart below the provider; shallow merge per top-level
 * key (a partial `messages` replaces whole nested blocks).
 */
export function provideOgeChartsConfig(
  config: OgeChartsConfigInput | (() => OgeChartsConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_CHARTS_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeChartsConfig(config()), computed),
      }
    : { provide: OGE_CHARTS_CONFIG, useValue: resolveOgeChartsConfig(config) };
}
