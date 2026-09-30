import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_GRID_CONFIG,
  OGE_DEFAULT_GRID_MESSAGES,
  resolveGridConfig,
  type OgeGridConfig,
  type OgeGridConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/behavior`, so the Angular and React grids cannot drift
// (ADR 0001); re-exported so consumers keep importing one package.
export {
  OGE_DEFAULT_GRID_CONFIG,
  type OgeGridConfig,
  type OgeGridConfigInput,
  type OgeGridMessages,
} from '@oge-ui/behavior';

/** The default message catalog — `OGE_DEFAULT_GRID_MESSAGES` under its historical name. */
export const OGE_DEFAULT_MESSAGES = OGE_DEFAULT_GRID_MESSAGES;

export const OGE_GRID_CONFIG = new InjectionToken<OgeGridConfig>(
  'OGE_GRID_CONFIG',
  {
    factory: () => OGE_DEFAULT_GRID_CONFIG,
  },
);

/**
 * Application- or component-scoped grid defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeGridConfig({
 *     rowHeight: 32,
 *     messages: { noData: 'Veri yok', search: 'Ara…' },
 *   }),
 * ]
 * ```
 */
export function provideOgeGridConfig(
  config: OgeGridConfigInput | (() => OgeGridConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_GRID_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveGridConfig(config()), computed),
      }
    : { provide: OGE_GRID_CONFIG, useValue: resolveGridConfig(config) };
}

export function formatPattern(
  pattern: string,
  values: Record<string, string>,
): string {
  return pattern.replace(
    /\{(\w+)\}/g,
    (match, key: string) => values[key] ?? match,
  );
}
