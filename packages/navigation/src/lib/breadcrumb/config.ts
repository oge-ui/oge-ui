import { InjectionToken, type Provider } from '@angular/core';
import type { OgeBreadcrumbCollapseMode } from './breadcrumb-types';

/** Every user-facing string the breadcrumb renders, including aria labels. */
export interface OgeBreadcrumbMessages {
  /** Accessible name of the `<nav>` landmark. */
  breadcrumb: string;
  /** Aria label of the ellipsis button opening the collapsed crumbs. */
  collapsed: string;
}

export const OGE_DEFAULT_BREADCRUMB_MESSAGES: OgeBreadcrumbMessages = {
  breadcrumb: 'Breadcrumb',
  collapsed: 'Show hidden items',
};

export interface OgeBreadcrumbConfig {
  messages: OgeBreadcrumbMessages;
  /** Default for the `collapseMode` input. */
  collapseMode?: OgeBreadcrumbCollapseMode;
}

export const OGE_DEFAULT_BREADCRUMB_CONFIG: OgeBreadcrumbConfig = {
  messages: OGE_DEFAULT_BREADCRUMB_MESSAGES,
};

export const OGE_BREADCRUMB_CONFIG = new InjectionToken<OgeBreadcrumbConfig>(
  'OGE_BREADCRUMB_CONFIG',
  {
    factory: () => OGE_DEFAULT_BREADCRUMB_CONFIG,
  },
);

export type OgeBreadcrumbConfigInput = Partial<
  Omit<OgeBreadcrumbConfig, 'messages'>
> & {
  messages?: Partial<OgeBreadcrumbMessages>;
};

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
  const { messages, ...rest } = config;
  return {
    provide: OGE_BREADCRUMB_CONFIG,
    useValue: {
      ...OGE_DEFAULT_BREADCRUMB_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_BREADCRUMB_MESSAGES, ...messages },
    } satisfies OgeBreadcrumbConfig,
  };
}
