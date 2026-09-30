import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_CARD_CONFIG,
  resolveOgeCardConfig,
  type OgeCardConfig,
  type OgeCardConfigInput,
} from '@oge-ui/behavior';

// The defaults and the merge rule live framework-free in `@oge-ui/behavior`
// (`layout-core`); this file is only the Angular DI wrapper around them.
export {
  OGE_DEFAULT_CARD_CONFIG,
  type OgeCardConfig,
  type OgeCardConfigInput,
} from '@oge-ui/behavior';

export const OGE_CARD_CONFIG = new InjectionToken<OgeCardConfig>(
  'OGE_CARD_CONFIG',
  { factory: () => OGE_DEFAULT_CARD_CONFIG },
);

/** Application- or component-scoped card defaults. */
export function provideOgeCardConfig(config: OgeCardConfigInput): Provider {
  return { provide: OGE_CARD_CONFIG, useValue: resolveOgeCardConfig(config) };
}
