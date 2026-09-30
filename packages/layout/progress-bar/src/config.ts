import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_PROGRESS_BAR_CONFIG,
  resolveOgeProgressBarConfig,
  type OgeProgressBarConfig,
  type OgeProgressBarConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`layout-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
  OGE_DEFAULT_PROGRESS_BAR_CONFIG,
  type OgeProgressBarMessages,
  type OgeProgressBarConfig,
  type OgeProgressBarConfigInput,
} from '@oge-ui/behavior';

export const OGE_PROGRESS_BAR_CONFIG = new InjectionToken<OgeProgressBarConfig>(
  'OGE_PROGRESS_BAR_CONFIG',
  {
    factory: () => OGE_DEFAULT_PROGRESS_BAR_CONFIG,
  },
);

/**
 * Application- or component-scoped progress-bar defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeProgressBarConfig({ messages: { progress: 'İlerleme' } }),
 * ]
 * ```
 */
export function provideOgeProgressBarConfig(
  config: OgeProgressBarConfigInput,
): Provider {
  return {
    provide: OGE_PROGRESS_BAR_CONFIG,
    useValue: resolveOgeProgressBarConfig(config),
  };
}
