import { InjectionToken, type Provider } from '@angular/core';
import type {
  OgeCardOrientation,
  OgeCardSize,
  OgeCardStylingMode,
} from './card-types';

/**
 * Application-wide defaults for the card. There is deliberately no `messages`
 * block: the card renders no user-facing strings and no interactive chrome of
 * its own. The moment one appears it must move into a messages interface, per
 * the house i18n rule.
 */
export interface OgeCardConfig {
  /** Default for the `stylingMode` input. */
  stylingMode?: OgeCardStylingMode;
  /** Default for the `orientation` input. */
  orientation?: OgeCardOrientation;
  /** Default for the `size` input. */
  size?: OgeCardSize;
}

export const OGE_DEFAULT_CARD_CONFIG: OgeCardConfig = {};

export const OGE_CARD_CONFIG = new InjectionToken<OgeCardConfig>(
  'OGE_CARD_CONFIG',
  { factory: () => OGE_DEFAULT_CARD_CONFIG },
);

export type OgeCardConfigInput = Partial<OgeCardConfig>;

/**
 * Application- or component-scoped card defaults:
 *
 * ```ts
 * providers: [provideOgeCardConfig({ stylingMode: 'raised' })]
 * ```
 */
export function provideOgeCardConfig(config: OgeCardConfigInput): Provider {
  return {
    provide: OGE_CARD_CONFIG,
    useValue: { ...OGE_DEFAULT_CARD_CONFIG, ...config } satisfies OgeCardConfig,
  };
}
