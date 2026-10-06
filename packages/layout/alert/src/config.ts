import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_ALERT_CONFIG,
  resolveOgeAlertConfig,
  type OgeAlertConfig,
  type OgeAlertConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`alert-core`); this file is only the Angular DI wrapper
// around them.
export {
  OGE_DEFAULT_ALERT_CONFIG,
  OGE_DEFAULT_ALERT_MESSAGES,
  type OgeAlertMessages,
  type OgeAlertConfig,
  type OgeAlertConfigInput,
} from '@oge-ui/behavior';

export const OGE_ALERT_CONFIG = new InjectionToken<OgeAlertConfig>(
  'OGE_ALERT_CONFIG',
  { factory: () => OGE_DEFAULT_ALERT_CONFIG },
);

/**
 * Application- or component-scoped alert defaults:
 *
 * ```ts
 * providers: [provideOgeAlertConfig({ stylingMode: 'outlined', messages: { dismiss: 'Kapat' } })]
 * ```
 */
export function provideOgeAlertConfig(
  config: OgeAlertConfigInput | (() => OgeAlertConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_ALERT_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeAlertConfig(config()), computed),
      }
    : {
        provide: OGE_ALERT_CONFIG,
        useValue: resolveOgeAlertConfig(config),
      };
}
