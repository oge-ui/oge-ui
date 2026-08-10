import { InjectionToken, type Provider } from '@angular/core';
import type { OgeSkeletonAnimation, OgeSkeletonShape } from './skeleton-types';

/**
 * Application-wide defaults for the skeleton. There is deliberately no
 * `messages` block: a skeleton is `aria-hidden` decoration and renders no
 * user-facing strings — the loading REGION owns the announcement
 * (`aria-busy` plus a visually-hidden status text). The moment a string
 * appears here it must move into a messages interface, per the house i18n
 * rule.
 */
export interface OgeSkeletonConfig {
  /** Default for the `shape` input. */
  shape?: OgeSkeletonShape;
  /** Default for the `animation` input. */
  animation?: OgeSkeletonAnimation;
}

export const OGE_DEFAULT_SKELETON_CONFIG: OgeSkeletonConfig = {};

export const OGE_SKELETON_CONFIG = new InjectionToken<OgeSkeletonConfig>(
  'OGE_SKELETON_CONFIG',
  {
    factory: () => OGE_DEFAULT_SKELETON_CONFIG,
  },
);

export type OgeSkeletonConfigInput = Partial<OgeSkeletonConfig>;

/** Application- or component-scoped skeleton defaults. */
export function provideOgeSkeletonConfig(
  config: OgeSkeletonConfigInput,
): Provider {
  return {
    provide: OGE_SKELETON_CONFIG,
    useValue: {
      ...OGE_DEFAULT_SKELETON_CONFIG,
      ...config,
    } satisfies OgeSkeletonConfig,
  };
}
