import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_BREADCRUMB_CONFIG,
  resolveOgeBreadcrumbConfig,
  type OgeBreadcrumbConfig,
  type OgeBreadcrumbConfigInput,
} from '@oge-ui/behavior';

// The catalog, the defaults and the merge rule are framework-free and live in
// `@oge-ui/behavior` (ADR 0001) — re-exported so Angular consumers keep
// importing them from this package.
export {
  OGE_DEFAULT_BREADCRUMB_CONFIG,
  OGE_DEFAULT_BREADCRUMB_MESSAGES,
  type OgeBreadcrumbConfig,
  type OgeBreadcrumbConfigInput,
  type OgeBreadcrumbMessages,
} from '@oge-ui/behavior';

export const OGE_BREADCRUMB_CONFIG = new InjectionToken<OgeBreadcrumbConfig>(
  'OGE_BREADCRUMB_CONFIG',
  {
    factory: () => OGE_DEFAULT_BREADCRUMB_CONFIG,
  },
);

/**
 * Application- or component-scoped breadcrumb defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeBreadcrumbConfig({
 *     collapseMode: 'wrap',
 *     messages: { collapsed: 'Gizli öğeleri göster' },
 *   }),
 * ]
 * ```
 */
export function provideOgeBreadcrumbConfig(
  config: OgeBreadcrumbConfigInput,
): Provider {
  return {
    provide: OGE_BREADCRUMB_CONFIG,
    useValue: resolveOgeBreadcrumbConfig(config),
  };
}
