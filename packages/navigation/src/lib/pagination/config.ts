import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_PAGINATION_CONFIG,
  resolveOgePaginationConfig,
  type OgePaginationConfig,
  type OgePaginationConfigInput,
} from '@oge-ui/behavior';

// The catalog, the defaults and the merge rule are framework-free and live in
// `@oge-ui/behavior` (ADR 0001) — re-exported so Angular consumers keep
// importing them from this package.
export {
  OGE_DEFAULT_PAGINATION_CONFIG,
  OGE_DEFAULT_PAGINATION_MESSAGES,
  type OgePaginationConfig,
  type OgePaginationConfigInput,
  type OgePaginationMessages,
} from '@oge-ui/behavior';

export const OGE_PAGINATION_CONFIG = new InjectionToken<OgePaginationConfig>(
  'OGE_PAGINATION_CONFIG',
  {
    factory: () => OGE_DEFAULT_PAGINATION_CONFIG,
  },
);

/**
 * Application- or component-scoped pagination defaults:
 *
 * ```ts
 * providers: [
 *   provideOgePaginationConfig({
 *     maxButtons: 9,
 *     messages: { pageSizeLabel: 'Sayfa başına' },
 *   }),
 * ]
 * ```
 */
export function provideOgePaginationConfig(
  config: OgePaginationConfigInput,
): Provider {
  return {
    provide: OGE_PAGINATION_CONFIG,
    useValue: resolveOgePaginationConfig(config),
  };
}
